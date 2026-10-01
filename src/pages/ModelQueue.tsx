import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  QUEUE,
  PHASES,
  FLAG_LABELS,
  modelsInPhase,
  queueOrder,
  categoryOf,
  phaseOf,
  memoryTier,
  hubUrl,
  downloadCommand,
  buildManifest,
  type QueuePhase,
  type ModelCategory,
  type ModelFlag,
  type QueueModel,
} from "@/lib/model-queue";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Copy, ExternalLink, ChevronDown, ChevronRight, AlertTriangle, Search } from "lucide-react";

const CATEGORIES: { id: ModelCategory | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "text", label: "Text" },
  { id: "embeddings", label: "Embeddings" },
  { id: "audio", label: "Audio" },
  { id: "vision", label: "Vision" },
  { id: "multimodal", label: "Multimodal" },
];

const PRIORITY_STYLE: Record<QueueModel["priority"], string> = {
  essential: "bg-primary/15 text-primary border-primary/30",
  high: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  normal: "bg-muted text-muted-foreground border-border",
};

const FLAG_STYLE: Record<ModelFlag, string> = {
  gated: "text-amber-500 border-amber-500/40",
  "non-commercial": "text-red-500 border-red-500/40",
  "custom-license": "text-amber-500 border-amber-500/40",
  agpl: "text-red-500 border-red-500/40",
  "remote-code": "text-purple-500 border-purple-500/40",
  large: "text-blue-500 border-blue-500/40",
};

async function copy(text: string, what: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast({ title: `Copied ${what}` });
  } catch {
    toast({ title: "Clipboard unavailable", description: text, variant: "destructive" });
  }
}

function ModelRow({ model, position }: { model: QueueModel; position: number }) {
  const [open, setOpen] = useState(false);
  const manifest = useMemo(() => JSON.stringify(buildManifest(model), null, 2), [model]);
  const url = hubUrl(model);

  return (
    <Card className="p-3 md:p-4">
      <div className="flex items-start gap-3">
        <span className="font-mono text-xs text-muted-foreground w-7 shrink-0 pt-0.5 text-right">{position}</span>
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-sm">{model.name}</h3>
            {model.params && <Badge variant="outline" className="text-[10px] font-mono">{model.params}</Badge>}
            <span className={`text-[10px] px-1.5 py-0.5 rounded border uppercase tracking-wide ${PRIORITY_STYLE[model.priority]}`}>
              {model.priority}
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">
              {phaseOf(model) === "backlog" ? "backlog" : `phase ${phaseOf(model)}`} · {memoryTier(model)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">{model.task}</p>
          {url && (
            <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-mono text-[11px] text-primary hover:underline break-all">
              {model.repo ?? url} <ExternalLink className="w-3 h-3 shrink-0" />
            </a>
          )}
          {model.requested_as && (
            <p className="flex items-start gap-1.5 text-[11px] text-amber-500">
              <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
              <span>Corrected from <code className="font-mono">{model.requested_as}</code></span>
            </p>
          )}
          <div className="flex flex-wrap gap-1">
            {model.formats.map((f) => (
              <span key={f} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground">{f}</span>
            ))}
            {(model.flags ?? []).map((f) => (
              <span key={f} title={FLAG_LABELS[f]} className={`text-[10px] px-1.5 py-0.5 rounded border ${FLAG_STYLE[f]}`}>{f}</span>
            ))}
          </div>
        </div>
        <Button variant="ghost" size="icon" className="shrink-0" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={`Details for ${model.name}`}>
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </Button>
      </div>

      {open && (
        <div className="mt-3 pl-10 space-y-3">
          {model.note && <p className="text-xs leading-relaxed">{model.note}</p>}
          <div className="grid sm:grid-cols-2 gap-2 text-[11px] font-mono text-muted-foreground">
            <div>folder: <span className="text-foreground">{model.folder}/{model.id}</span></div>
            {model.fallbacks?.length ? (
              <div>fallbacks: <span className="text-foreground">{model.fallbacks.join(", ")}</span></div>
            ) : null}
            {Object.entries(model.variants ?? {}).map(([fmt, v]) => (
              <div key={fmt}>{fmt}: <span className="text-foreground">{v?.repo}{v?.quant ? ` (${v.quant})` : ""}</span></div>
            ))}
          </div>
          <pre className="rounded-md border border-border bg-secondary/40 p-3 text-[11px] overflow-x-auto">{manifest}</pre>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => copy(downloadCommand(model), "download command")}>
              <Copy className="w-3.5 h-3.5" /> Download command
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => copy(manifest, "manifest")}>
              <Copy className="w-3.5 h-3.5" /> Manifest JSON
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

export default function ModelQueue() {
  const [phase, setPhase] = useState<QueuePhase | "all">("1");
  const [category, setCategory] = useState<ModelCategory | "all">("all");
  const [query, setQuery] = useState("");
  const [showCorrections, setShowCorrections] = useState(false);

  const models = useMemo(() => {
    const base = phase === "all" ? queueOrder() : modelsInPhase(phase);
    const q = query.trim().toLowerCase();
    return base.filter(
      (m) =>
        (category === "all" || categoryOf(m) === category) &&
        (!q || [m.id, m.name, m.repo, m.task, m.requested_as].some((v) => v?.toLowerCase().includes(q))),
    );
  }, [phase, category, query]);

  const corrections = QUEUE.models.filter((m) => m.requested_as);
  const flagged = QUEUE.models.filter((m) => m.flags?.some((f) => f === "non-commercial" || f === "agpl"));
  const phaseCommand = phase === "all" ? "--check" : `--check --phase ${phase}`;

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/"><Button variant="ghost" size="icon" aria-label="Back"><ArrowLeft className="w-4 h-4" /></Button></Link>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Model Queue</h1>
            <p className="text-sm text-muted-foreground">
              Compact on-device models for offline Jackie, deduplicated, with bad Hub IDs corrected. Downloads run on your PC.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="p-3"><div className="text-2xl font-bold tabular-nums">{QUEUE.models.length}</div><div className="text-xs text-muted-foreground">unique models</div></Card>
          <Card className="p-3"><div className="text-2xl font-bold tabular-nums">{modelsInPhase("1").length}</div><div className="text-xs text-muted-foreground">in Phase 1</div></Card>
          <Card className="p-3"><div className="text-2xl font-bold tabular-nums text-amber-500">{corrections.length}</div><div className="text-xs text-muted-foreground">IDs corrected</div></Card>
          <Card className="p-3"><div className="text-2xl font-bold tabular-nums text-red-500">{flagged.length}</div><div className="text-xs text-muted-foreground">non-commercial / AGPL</div></Card>
        </div>

        <Card className="p-3 flex flex-wrap items-center gap-2 justify-between">
          <code className="font-mono text-xs break-all">python scripts/download_models.py {phaseCommand}</code>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => copy(`python scripts/download_models.py ${phaseCommand}`, "command")}>
            <Copy className="w-3.5 h-3.5" /> Copy
          </Button>
        </Card>

        <div className="space-y-3">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Phase">
            {[...PHASES, { id: "all" as const, label: "All", blurb: "Full queue order" }].map((p) => (
              <Button key={p.id} size="sm" variant={phase === p.id ? "default" : "outline"} onClick={() => setPhase(p.id)} title={p.blurb}>
                {p.label}
                <span className="ml-1.5 text-[10px] opacity-70">{p.id === "all" ? QUEUE.models.length : modelsInPhase(p.id).length}</span>
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Category">
            {CATEGORIES.map((c) => (
              <Button key={c.id} size="sm" variant={category === c.id ? "secondary" : "ghost"} onClick={() => setCategory(c.id)}>
                {c.label}
              </Button>
            ))}
            <div className="relative ml-auto w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search id, repo, task…" className="pl-8 h-9 text-sm" />
            </div>
          </div>
          {phase !== "all" && (
            <p className="text-xs text-muted-foreground">{PHASES.find((p) => p.id === phase)?.blurb}</p>
          )}
        </div>

        <div className="space-y-2">
          {models.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No models match.</p>
          ) : (
            models.map((m, i) => <ModelRow key={m.id} model={m} position={i + 1} />)
          )}
        </div>

        <Card className="p-4">
          <button type="button" className="w-full flex items-center gap-2 text-left" onClick={() => setShowCorrections((s) => !s)} aria-expanded={showCorrections}>
            {showCorrections ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <h2 className="font-semibold text-sm">Corrections to the original list ({corrections.length})</h2>
          </button>
          {showCorrections && (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-left text-muted-foreground">
                  <tr><th className="py-1.5 pr-3 font-medium">Requested</th><th className="py-1.5 pr-3 font-medium">Now</th><th className="py-1.5 font-medium">Why</th></tr>
                </thead>
                <tbody>
                  {corrections.map((m) => (
                    <tr key={m.id} className="border-t border-border align-top">
                      <td className="py-1.5 pr-3 font-mono text-amber-500 break-all">{m.requested_as}</td>
                      <td className="py-1.5 pr-3 font-mono break-all">{m.repo ?? m.url}</td>
                      <td className="py-1.5 text-muted-foreground">{m.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
