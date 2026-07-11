// eYe Pod Engine — 24 compression pods, native CompressionStream (gzip),
// SHA-256 integrity fingerprint, IndexedDB persistence.
// Non-destructive: pods are an archival/compression layer on top of live data.

const DB_NAME = "eye-pods-v1";
const STORE = "pods";
const DB_VERSION = 1;

export type PodStatus =
  | "empty"       // white  — standby, nothing stored
  | "sealed"      // green  — compressed, integrity verified
  | "open"        // yellow — decompressed in RAM, awaiting reseal
  | "corrupt"     // red    — integrity check failed
  | "offline";    // black  — pod slot disabled / unreachable

export interface PodMeta {
  id: string;
  slot: number;              // 1..24
  name: string;
  domain: string;            // "chats" | "memory" | "vault" | ...
  status: PodStatus;
  bytesRaw: number;
  bytesCompressed: number;
  ratio: number;             // 0..1 lower is better
  itemCount: number;
  fingerprint: string;       // sha-256 hex of raw payload
  sealedAt: string | null;
  openedAt: string | null;
  version: number;
}

export interface PodRecord extends PodMeta {
  blob: Blob | null;         // compressed gzip blob when sealed
}

// ── IndexedDB helpers ─────────────────────────────────────────────────────

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(id: string): Promise<PodRecord | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(id);
    req.onsuccess = () => resolve((req.result as PodRecord) ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(rec: PodRecord): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(rec);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbAll(): Promise<PodRecord[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve((req.result as PodRecord[]) ?? []);
    req.onerror = () => reject(req.error);
  });
}

async function idbDelete(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ── Compression (native, no deps) ──────────────────────────────────────────

async function gzip(bytes: Uint8Array): Promise<Blob> {
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(
    new (globalThis as any).CompressionStream("gzip")
  );
  return new Response(stream).blob();
}

async function gunzip(blob: Blob): Promise<Uint8Array> {
  const stream = blob.stream().pipeThrough(
    new (globalThis as any).DecompressionStream("gzip")
  );
  const buf = await new Response(stream).arrayBuffer();
  return new Uint8Array(buf);
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", bytes as BufferSource);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const enc = new TextEncoder();
const dec = new TextDecoder();

// ── Public API ─────────────────────────────────────────────────────────────

export const POD_CAPACITY_BYTES = 50 * 1024 * 1024; // 50 MB per pod
export const POD_PAYLOAD_LIMIT = 30 * 1024 * 1024;  // 30 MB reserved for payload

export async function initPod(meta: {
  id: string;
  slot: number;
  name: string;
  domain: string;
}): Promise<PodRecord> {
  const existing = await idbGet(meta.id);
  if (existing) return existing;
  const rec: PodRecord = {
    ...meta,
    status: "empty",
    bytesRaw: 0,
    bytesCompressed: 0,
    ratio: 0,
    itemCount: 0,
    fingerprint: "",
    sealedAt: null,
    openedAt: null,
    version: 0,
    blob: null,
  };
  await idbPut(rec);
  return rec;
}

export async function listPods(): Promise<PodRecord[]> {
  const all = await idbAll();
  return all.sort((a, b) => a.slot - b.slot);
}

export async function getPod(id: string): Promise<PodRecord | null> {
  return idbGet(id);
}

/** Compress an arbitrary JSON-serializable payload into a pod. */
export async function sealPod(id: string, payload: unknown): Promise<PodRecord> {
  const rec = await idbGet(id);
  if (!rec) throw new Error(`Pod ${id} not found`);

  const json = JSON.stringify(payload);
  const raw = enc.encode(json);

  if (raw.byteLength > POD_PAYLOAD_LIMIT) {
    throw new Error(
      `Payload ${(raw.byteLength / 1024 / 1024).toFixed(1)} MB exceeds pod payload limit ${POD_PAYLOAD_LIMIT / 1024 / 1024} MB`
    );
  }

  const fp = await sha256Hex(raw);
  const blob = await gzip(raw);

  if (blob.size > POD_CAPACITY_BYTES) {
    throw new Error(
      `Compressed ${(blob.size / 1024 / 1024).toFixed(1)} MB exceeds pod capacity ${POD_CAPACITY_BYTES / 1024 / 1024} MB`
    );
  }

  const itemCount = Array.isArray(payload)
    ? payload.length
    : payload && typeof payload === "object"
    ? Object.keys(payload as object).length
    : 1;

  const next: PodRecord = {
    ...rec,
    status: "sealed",
    bytesRaw: raw.byteLength,
    bytesCompressed: blob.size,
    ratio: raw.byteLength === 0 ? 0 : blob.size / raw.byteLength,
    itemCount,
    fingerprint: fp,
    sealedAt: new Date().toISOString(),
    openedAt: null,
    version: rec.version + 1,
    blob,
  };
  await idbPut(next);
  return next;
}

/** Decompress a pod payload and verify integrity. */
export async function openPod<T = unknown>(id: string): Promise<{ pod: PodRecord; payload: T }> {
  const rec = await idbGet(id);
  if (!rec) throw new Error(`Pod ${id} not found`);
  if (!rec.blob || rec.status === "empty") {
    throw new Error(`Pod ${id} is empty`);
  }

  const raw = await gunzip(rec.blob);
  const fp = await sha256Hex(raw);

  if (fp !== rec.fingerprint) {
    const corrupted: PodRecord = { ...rec, status: "corrupt", openedAt: new Date().toISOString() };
    await idbPut(corrupted);
    throw new Error(`Pod ${id} integrity check FAILED (fingerprint mismatch)`);
  }

  const payload = JSON.parse(dec.decode(raw)) as T;
  const opened: PodRecord = { ...rec, status: "open", openedAt: new Date().toISOString() };
  await idbPut(opened);
  return { pod: opened, payload };
}

/** Verify a pod's integrity without leaving it open. */
export async function verifyPod(id: string): Promise<boolean> {
  const rec = await idbGet(id);
  if (!rec || !rec.blob) return true;
  try {
    const raw = await gunzip(rec.blob);
    const fp = await sha256Hex(raw);
    const ok = fp === rec.fingerprint;
    if (!ok) await idbPut({ ...rec, status: "corrupt" });
    else if (rec.status === "corrupt") await idbPut({ ...rec, status: "sealed" });
    return ok;
  } catch {
    await idbPut({ ...rec, status: "corrupt" });
    return false;
  }
}

/** Mark pod offline (won't respond until re-enabled). */
export async function setPodOffline(id: string, offline: boolean): Promise<void> {
  const rec = await idbGet(id);
  if (!rec) return;
  await idbPut({
    ...rec,
    status: offline ? "offline" : rec.blob ? "sealed" : "empty",
  });
}

export async function purgePod(id: string): Promise<void> {
  const rec = await idbGet(id);
  if (!rec) return;
  await idbPut({
    ...rec,
    status: "empty",
    bytesRaw: 0,
    bytesCompressed: 0,
    ratio: 0,
    itemCount: 0,
    fingerprint: "",
    sealedAt: null,
    openedAt: null,
    blob: null,
  });
}

/** Export a pod as a downloadable .pod file (gzip blob + json header). */
export async function exportPod(id: string): Promise<Blob> {
  const rec = await idbGet(id);
  if (!rec) throw new Error(`Pod ${id} not found`);
  const header = JSON.stringify({
    magic: "EYE-POD-1",
    slot: rec.slot,
    name: rec.name,
    domain: rec.domain,
    bytesRaw: rec.bytesRaw,
    bytesCompressed: rec.bytesCompressed,
    fingerprint: rec.fingerprint,
    sealedAt: rec.sealedAt,
    version: rec.version,
  });
  const headerBytes = enc.encode(header);
  const lenBytes = new Uint8Array(4);
  new DataView(lenBytes.buffer).setUint32(0, headerBytes.byteLength, false);
  const parts: BlobPart[] = [
    enc.encode("EYE1") as BlobPart,
    lenBytes as BlobPart,
    headerBytes as BlobPart,
  ];
  if (rec.blob) parts.push(rec.blob);
  return new Blob(parts, { type: "application/octet-stream" });
}

export async function importPod(id: string, file: Blob): Promise<PodRecord> {
  const rec = await idbGet(id);
  if (!rec) throw new Error(`Pod ${id} not found`);
  const buf = new Uint8Array(await file.arrayBuffer());
  const magic = dec.decode(buf.slice(0, 4));
  if (magic !== "EYE1") throw new Error("Not a valid .pod file");
  const headerLen = new DataView(buf.buffer).getUint32(4, false);
  const header = JSON.parse(dec.decode(buf.slice(8, 8 + headerLen)));
  const blob = new Blob([buf.slice(8 + headerLen) as BlobPart]);

  // Verify fingerprint
  const raw = await gunzip(blob);
  const fp = await sha256Hex(raw);
  if (fp !== header.fingerprint) throw new Error("Imported pod failed integrity check");

  const next: PodRecord = {
    ...rec,
    status: "sealed",
    bytesRaw: header.bytesRaw,
    bytesCompressed: blob.size,
    ratio: header.bytesRaw === 0 ? 0 : blob.size / header.bytesRaw,
    itemCount: 0,
    fingerprint: header.fingerprint,
    sealedAt: header.sealedAt ?? new Date().toISOString(),
    openedAt: null,
    version: rec.version + 1,
    blob,
  };
  await idbPut(next);
  return next;
}
