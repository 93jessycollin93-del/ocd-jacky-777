import { useEffect, useState } from "react";
import {
  POD_CAPACITY_BYTES,
  initPod,
  listPods,
  sealPod,
  openPod,
  verifyPod,
  purgePod,
  setPodOffline,
  exportPod,
  importPod,
  type PodRecord,
  type PodStatus,
} from "@/lib/pods/podEngine";
import { POD_SLOTS } from "@/lib/pods/podRegistry";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { ArrowLeft, Download, Upload, Lock, Unlock, ShieldCheck, Trash2, Power } from "lucide-react";

const STATUS_STYLE: Record<PodStatus, { dot: string; label: string }> = {
  empty:   { dot: "bg-muted",           label: "Standby" },
  sealed:  { dot: "bg-emerald-500",     label: "Sealed" },
  open:    { dot: "bg-amber-400",       label: "Open" },
  corrupt: { dot: "bg-red-500",         label: "Corrupt" },
  offline: { dot: "bg-neutral-800 border border-border", label: "Offline" },
};

function fmtBytes(n: number): string {
  if (!n) return "0 B";
  const u = ["B", "KB", "MB", "GB"];
  const i = Math.min(u.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  return `${(n / Math.pow(1024, i)).toFixed(i ? 1 : 0)} ${u[i]}`;
}

export default function PodStation() {
  const [pods, setPods] = useState<PodRecord[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  async function refresh() {
    // Ensure all 24 slots exist
    await Promise.all(
      POD_SLOTS.map((s) => initPod({ id: s.id, slot: s.slot, name: s.name, domain: s.domain }))
    );
    setPods(await listPods());
  }

  useEffect(() => { void refresh(); }, []);

  const registryFor = (id: string) => POD_SLOTS.find((s) => s.id === id);

  async function withPod(id: string, label: string, fn: () => Promise<void>) {
    setBusy(id);
    try {
      await fn();
      toast({ title: `${label} · ${registryFor(id)?.name}` });
    } catch (e: any) {
      toast({ title: `${label} failed`, description: e?.message ?? String(e), variant: "destructive" });
    } finally {
      setBusy(null);
      await refresh();
    }
  }

  async function handleSeal(id: string) {
    const slot = registryFor(id);
    await withPod(id, "Sealed", async () => {
      const payload = slot?.harvest ? await slot.harvest() : { note: "empty pod sealed", at: new Date().toISOString() };
      await sealPod(id, payload);
    });
  }

  async function handleOpen(id: string) {
    await withPod(id, "Opened", async () => {
      const { payload } = await openPod(id);
      console.info(`[pod:${id}]`, payload);
    });
  }

  async function handleVerify(id: string) {
    await withPod(id, "Verified", async () => {
      const ok = await verifyPod(id);
      if (!ok) throw new Error("Integrity check failed");
    });
  }

  async function handleExport(id: string) {
    const blob = await exportPod(id);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${id}.pod`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(id: string, file: File) {
    await withPod(id, "Imported", async () => { await importPod(id, file); });
  }

  const totalRaw = pods.reduce((s, p) => s + p.bytesRaw, 0);
  const totalCompressed = pods.reduce((s, p) => s + p.bytesCompressed, 0);
  const capacity = 24 * POD_CAPACITY_BYTES;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/50 sticky top-0 z-10 bg-background/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link to="/" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="font-mono text-sm tracking-widest">eYe · POD STATION</h1>
            <p className="text-[10px] text-muted-foreground">
              24 compression pods · gzip · SHA-256 integrity · offline-safe
            </p>
          </div>
          <div className="ml-auto text-right text-[10px] font-mono text-muted-foreground">
            <div>{fmtBytes(totalCompressed)} / {fmtBytes(capacity)}</div>
            <div>raw {fmtBytes(totalRaw)} · ratio {totalRaw ? ((totalCompressed / totalRaw) * 100).toFixed(1) : "0.0"}%</div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {pods.map((p) => {
          const style = STATUS_STYLE[p.status];
          const meta = registryFor(p.id);
          const usage = p.bytesCompressed / POD_CAPACITY_BYTES;
          const isSelected = selected === p.id;
          return (
            <button
              key={p.id}
              onClick={() => setSelected(isSelected ? null : p.id)}
              className={`text-left border rounded-md p-3 bg-card/40 hover:bg-card/70 transition-colors ${
                isSelected ? "border-primary" : "border-border"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[10px] text-muted-foreground">
                  POD {String(p.slot).padStart(2, "0")}
                </span>
                <span className={`w-2 h-2 rounded-full ${style.dot}`} title={style.label} />
              </div>
              <div className="font-medium text-sm truncate">{p.name}</div>
              <div className="text-[10px] text-muted-foreground truncate">{meta?.domain}</div>
              <div className="mt-2 h-1 bg-muted/40 rounded">
                <div
                  className="h-full bg-primary/60 rounded"
                  style={{ width: `${Math.min(100, usage * 100).toFixed(1)}%` }}
                />
              </div>
              <div className="mt-1 flex justify-between text-[10px] font-mono text-muted-foreground">
                <span>{fmtBytes(p.bytesCompressed)}</span>
                <span>{p.ratio ? `${(p.ratio * 100).toFixed(0)}%` : "—"}</span>
              </div>
            </button>
          );
        })}
      </main>

      {selected && (() => {
        const p = pods.find((x) => x.id === selected);
        const meta = registryFor(selected);
        if (!p || !meta) return null;
        const disabled = busy === selected;
        return (
          <section className="fixed bottom-0 left-0 right-0 border-t border-border bg-card/95 backdrop-blur">
            <div className="max-w-7xl mx-auto p-4 grid md:grid-cols-3 gap-4">
              <div>
                <div className="font-mono text-[10px] text-muted-foreground">POD {String(p.slot).padStart(2, "0")}</div>
                <div className="text-lg font-medium">{p.name}</div>
                <div className="text-xs text-muted-foreground">{meta.description}</div>
                <div className="mt-2 text-[11px] font-mono text-muted-foreground">
                  status <span className="text-foreground">{p.status}</span> · v{p.version}
                  {p.sealedAt && <> · sealed {new Date(p.sealedAt).toLocaleString()}</>}
                </div>
                {p.fingerprint && (
                  <div className="mt-1 text-[10px] font-mono text-muted-foreground truncate">
                    sha256 {p.fingerprint.slice(0, 32)}…
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-start gap-2">
                <Button size="sm" variant="secondary" disabled={disabled} onClick={() => handleSeal(p.id)}>
                  <Lock className="w-3 h-3 mr-1" /> Seal
                </Button>
                <Button size="sm" variant="secondary" disabled={disabled || p.status === "empty"} onClick={() => handleOpen(p.id)}>
                  <Unlock className="w-3 h-3 mr-1" /> Open
                </Button>
                <Button size="sm" variant="outline" disabled={disabled || p.status === "empty"} onClick={() => handleVerify(p.id)}>
                  <ShieldCheck className="w-3 h-3 mr-1" /> Verify
                </Button>
                <Button size="sm" variant="outline" disabled={disabled || p.status === "empty"} onClick={() => handleExport(p.id)}>
                  <Download className="w-3 h-3 mr-1" /> Export
                </Button>
                <label className="inline-flex">
                  <Button size="sm" variant="outline" disabled={disabled} asChild>
                    <span><Upload className="w-3 h-3 mr-1" /> Import</span>
                  </Button>
                  <input
                    type="file"
                    accept=".pod,application/octet-stream"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void handleImport(p.id, f);
                      e.target.value = "";
                    }}
                  />
                </label>
                <Button size="sm" variant="ghost" disabled={disabled} onClick={() => withPod(p.id, p.status === "offline" ? "Enabled" : "Disabled", () => setPodOffline(p.id, p.status !== "offline"))}>
                  <Power className="w-3 h-3 mr-1" /> {p.status === "offline" ? "Enable" : "Disable"}
                </Button>
                <Button size="sm" variant="ghost" className="text-destructive" disabled={disabled || p.status === "empty"} onClick={() => withPod(p.id, "Purged", () => purgePod(p.id))}>
                  <Trash2 className="w-3 h-3 mr-1" /> Purge
                </Button>
              </div>
              <div className="text-[11px] font-mono text-muted-foreground leading-relaxed">
                <div>capacity {fmtBytes(POD_CAPACITY_BYTES)} · payload cap 30 MB</div>
                <div>raw {fmtBytes(p.bytesRaw)}</div>
                <div>compressed {fmtBytes(p.bytesCompressed)}</div>
                <div>items {p.itemCount}</div>
                <div className="mt-2 text-muted-foreground/70">
                  Sealing is non-destructive · live data remains intact · integrity
                  is verified on every open.
                </div>
              </div>
            </div>
          </section>
        );
      })()}
    </div>
  );
}
