// Pocket AI engine: llama.cpp compiled to WebAssembly (wllama) running GGUF models entirely in the browser,
// on the GPU through WebGPU where available and on the CPU otherwise. Models are downloaded once into the
// browser's private file storage (OPFS) and work offline after that. Nothing typed into a chat leaves the device.
import { Wllama, ModelValidationStatus, type Model } from "@wllama/wllama/esm/index.js";
import wasmUrl from "@wllama/wllama/esm/wasm/wllama.wasm?url";
import type { PocketModel, Sampling } from "./catalog";
import { stripThinking } from "./text";

export type PocketErrorCode = "storage" | "download" | "size-mismatch" | "hash-mismatch" | "not-downloaded" | "load" | "aborted" | "chat";

export class PocketError extends Error {
  constructor(public code: PocketErrorCode, message: string) {
    super(message);
  }
}

export interface LoadedInfo {
  url: string;
  gpu: boolean;
  threads: number;
  nCtx: number;
}

export interface CachedInfo {
  size: number;
  valid: boolean;
}

export interface ChatTurn {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatResult {
  text: string;
  tokens: number;
  tokensPerSecond: number;
  stopped: boolean;
}

let instance: Wllama | null = null;
let loaded: LoadedInfo | null = null;
let queue: Promise<unknown> = Promise.resolve();

const create = () => new Wllama({ default: wasmUrl }, { allowOffline: true, suppressNativeLog: true, parallelDownloads: 3 });
const engine = () => (instance ??= create());

/** Runs engine work one job at a time: wllama serves a single request at once. */
function exclusive<T>(job: () => Promise<T>): Promise<T> {
  const run = queue.then(job, job);
  queue = run.catch(() => undefined);
  return run;
}

export const webGpuAvailable = () => typeof navigator !== "undefined" && "gpu" in navigator;
export const loadedModel = () => loaded;

async function findCached(url: string): Promise<Model | undefined> {
  const models = await engine().modelManager.getModels({ includeInvalid: true });
  return models.find((m) => m.url === url);
}

/** Every model in the device cache, keyed by URL. */
export async function cachedModels(): Promise<Map<string, CachedInfo>> {
  const models = await engine().modelManager.getModels({ includeInvalid: true });
  return new Map(models.map((m) => [m.url, { size: m.size, valid: m.validate() === ModelValidationStatus.VALID }]));
}

/** Free space the browser will give this site, in bytes (null if the browser won't say). */
export async function freeSpace(): Promise<number | null> {
  try {
    const est = await navigator.storage?.estimate?.();
    if (!est?.quota) return null;
    return est.quota - (est.usage ?? 0);
  } catch {
    return null;
  }
}

async function sha256Hex(blob: Blob): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

const verifiedKey = (url: string) => `pocket:verified:${url}`;
export const isVerified = (m: PocketModel) => !!m.sha256 && localStorage.getItem(verifiedKey(m.url)) === m.sha256;

/**
 * Downloads a model into the device cache, then checks it: exact size always, and SHA-256 when the catalog
 * publishes one (files up to 1.2 GB, so the check never needs more memory than loading the model would).
 * A file that fails a check is deleted instead of being kept.
 */
export async function downloadModel(
  m: PocketModel,
  onProgress: (loaded: number, total: number) => void,
  signal: AbortSignal,
): Promise<void> {
  const space = await freeSpace();
  if (m.bytes && space !== null && space < m.bytes * 1.05) {
    throw new PocketError("storage", "Not enough free space in this browser for that model. Delete a model or free up space on the device.");
  }
  let model: Model;
  try {
    model = await engine().modelManager.downloadModel(m.url, {
      signal,
      progressCallback: ({ loaded: done, total }) => onProgress(done, total || m.bytes || 0),
    });
  } catch (e) {
    await (await findCached(m.url))?.remove().catch(() => undefined);
    if (signal.aborted) throw new PocketError("aborted", "Download cancelled.");
    const msg = e instanceof Error ? e.message : String(e);
    throw new PocketError("download", `Download failed: ${msg}. Check your connection and try again.`);
  }
  if (m.bytes && model.size !== m.bytes) {
    await model.remove().catch(() => undefined);
    throw new PocketError("size-mismatch", `The downloaded file is the wrong size (${model.size} bytes, expected ${m.bytes}), so it was deleted.`);
  }
  if (m.sha256 && m.bytes && m.bytes <= 1.2e9 && crypto?.subtle) {
    const [blob] = await model.open();
    let hash: string | null = null;
    try {
      hash = await sha256Hex(blob);
    } catch {
      hash = null; // Not enough memory to hash it here; the size check above still passed.
    }
    if (hash && hash !== m.sha256) {
      await model.remove().catch(() => undefined);
      throw new PocketError("hash-mismatch", "The downloaded file doesn't match the published checksum, so it was deleted.");
    }
    if (hash) localStorage.setItem(verifiedKey(m.url), hash);
  }
}

export async function deleteModel(url: string): Promise<void> {
  await exclusive(async () => {
    if (loaded?.url === url) await unloadNow();
    await (await findCached(url))?.remove();
    localStorage.removeItem(verifiedKey(url));
  });
}

async function unloadNow() {
  if (!instance) return;
  await instance.exit().catch(() => undefined);
  instance = null;
  loaded = null;
}

export const unloadModel = () => exclusive(unloadNow);

/**
 * Loads a downloaded model. With WebGPU it offloads every layer to the GPU; if that fails (old driver, not
 * enough video memory) it reloads on the CPU, which works everywhere WebAssembly does.
 */
export function loadModel(m: PocketModel, opts: { preferGpu: boolean; nCtx?: number }): Promise<LoadedInfo> {
  return exclusive(async () => {
    const nCtx = opts.nCtx ?? m.nCtx;
    const gpu = opts.preferGpu && webGpuAvailable();
    if (loaded && loaded.url === m.url && loaded.nCtx === nCtx && (loaded.gpu || !gpu)) return loaded;
    await unloadNow();
    const cached = await findCached(m.url);
    if (!cached || cached.validate() !== ModelValidationStatus.VALID) {
      throw new PocketError("not-downloaded", "Download this model first.");
    }
    const attempt = async (useGpu: boolean) => {
      const w = engine();
      await w.loadModel(cached, { n_ctx: nCtx, n_gpu_layers: useGpu ? 999 : 0, jinja: true });
      loaded = { url: m.url, gpu: useGpu, threads: w.getNumThreads(), nCtx };
      return loaded;
    };
    try {
      return await attempt(gpu);
    } catch (first) {
      await unloadNow();
      if (!gpu) throw new PocketError("load", loadMessage(first));
      try {
        return await attempt(false);
      } catch (second) {
        await unloadNow();
        throw new PocketError("load", loadMessage(second));
      }
    }
  });
}

function loadMessage(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/memory|alloc|OOM|RangeError/i.test(msg)) return "This device ran out of memory loading the model. Try a smaller model or close other tabs.";
  return `Couldn't load the model: ${msg}`;
}

/**
 * Streams a reply from the loaded model. `onText` receives the whole visible reply so far. Stopping through
 * `signal` keeps what was generated.
 */
export function chat(
  turns: ChatTurn[],
  opts: { sampling: Sampling; maxTokens: number; signal: AbortSignal; onText: (text: string) => void },
): Promise<ChatResult> {
  return exclusive(async () => {
    if (!instance || !loaded) throw new PocketError("not-downloaded", "Load a model first.");
    let raw = "";
    let tokens = 0;
    let tokensPerSecond = 0;
    let stopped = false;
    const started = performance.now();
    try {
      const stream = await instance.createChatCompletion({
        messages: turns,
        stream: true,
        abortSignal: opts.signal,
        max_tokens: opts.maxTokens,
        temperature: opts.sampling.temperature,
        top_p: opts.sampling.top_p,
        top_k: opts.sampling.top_k,
        min_p: opts.sampling.min_p,
        chat_template_kwargs: { enable_thinking: false },
      });
      for await (const chunk of stream) {
        const piece = chunk.choices[0]?.delta?.content;
        if (piece) {
          raw += piece;
          tokens++;
          opts.onText(stripThinking(raw));
        }
        if (chunk.timings?.predicted_per_second) tokensPerSecond = chunk.timings.predicted_per_second;
        if (chunk.timings?.predicted_n) tokens = chunk.timings.predicted_n;
      }
    } catch (e) {
      if (opts.signal.aborted) stopped = true;
      else throw new PocketError("chat", e instanceof Error ? e.message : String(e));
    }
    if (!tokensPerSecond && tokens) tokensPerSecond = tokens / ((performance.now() - started) / 1000);
    return { text: stripThinking(raw), tokens, tokensPerSecond, stopped };
  });
}
