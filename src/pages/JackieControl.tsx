import { useEffect, useMemo, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  ORCHESTRATOR_MODELS,
  orchestrate,
  orchestrateParallel,
  pickKind,
  pickModel,
  type TaskKind,
} from "@/lib/jackie-orchestrator";
import {
  appendAudit,
  canRun,
  getModelOverride,
  getRole,
  hydrateAudit,
  hydrateControlPrefs,
  listActions,
  loadAudit,
  runAction,
  runCommand,
  setModelOverride,
  setRole,
  subscribe,
  type AuditEntry,
  type ControlAction,
  type Role,
} from "@/lib/jackie-control";
import {
  createSwarmRemote,
  fetchSwarmsRemote,
  updateSwarmRemote,
} from "@/lib/jackie-control-sync";
import { verifyLanguages, type LangCheckResult } from "@/lib/jackie-langcheck";
import { toast } from "sonner";
import {
  ArrowLeft, Cpu, Shield, Activity, Terminal, Send, Trash2, Zap,
  Network, Loader2, Play, RefreshCw, ChevronRight, Download, Search, X,
  CheckCircle2, XCircle, HelpCircle, ShieldCheck,
} from "lucide-react";

function downloadBlob(filename: string, mime: string, content: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function auditToCsv(rows: AuditEntry[]): string {
  const header = ["timestamp", "actor", "command", "action_id", "result", "message", "args"];
  const escape = (v: unknown) => {
    const s = v === undefined || v === null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = rows.map((e) =>
    [
      new Date(e.ts).toISOString(),
      e.actor,
      e.command,
      e.actionId ?? "",
      e.result,
      e.message,
      e.args ? JSON.stringify(e.args) : "",
    ].map(escape).join(",")
  );
  return [header.join(","), ...lines].join("\n");
}

type SwarmTask = {
  id: string;
  goal: string;
  models: string[];
  status: "running" | "done" | "error";
  results: { modelId: string; output: string; error?: string }[];
  startedAt: number;
};

const TASK_KINDS: TaskKind[] = ["auto", "reasoning", "coding", "fast", "long-context"];

export default function JackieControl() {
  const [role, setRoleState] = useState<Role>(getRole());
  const [override, setOverrideState] = useState<string | null>(getModelOverride());
  const [actions, setActions] = useState<ControlAction[]>(listActions());
  const [audit, setAudit] = useState<AuditEntry[]>(loadAudit());
  const [auditQuery, setAuditQuery] = useState("");

  const filteredAudit = useMemo(() => {
    const q = auditQuery.trim().toLowerCase();
    if (!q) return audit;
    return audit.filter((e) =>
      (e.actionId ?? "").toLowerCase().includes(q) ||
      (e.message ?? "").toLowerCase().includes(q) ||
      (e.command ?? "").toLowerCase().includes(q)
    );
  }, [audit, auditQuery]);

  const [command, setCommand] = useState("");
  const [busy, setBusy] = useState(false);

  const [prompt, setPrompt] = useState("");
  const [kind, setKind] = useState<TaskKind>("auto");
  const [orchOut, setOrchOut] = useState<string>("");
  const [orchMeta, setOrchMeta] = useState<string>("");

  const [swarmGoal, setSwarmGoal] = useState("");
  const [swarmModels, setSwarmModels] = useState<string[]>([
    "google/gemini-3-flash-preview",
    "google/gemini-2.5-flash",
  ]);
  const [swarms, setSwarms] = useState<SwarmTask[]>([]);

  // Language self-check
  const [verifyInput, setVerifyInput] = useState("");
  const [verifyResults, setVerifyResults] = useState<LangCheckResult[]>([]);
  const [verifying, setVerifying] = useState(false);

  const runVerify = useCallback(async (langs: string[]) => {
    if (langs.length === 0) return;
    setVerifying(true);
    try {
      const results = await verifyLanguages(langs);
      setVerifyResults((prev) => [...results, ...prev].slice(0, 50));
      const passed = results.filter((r) => r.verdict === "pass").length;
      const failed = results.filter((r) => r.verdict === "fail").length;
      const uncertain = results.length - passed - failed;
      appendAudit({
        ts: Date.now(), actor: getRole(), command: `/verify`,
        result: failed === 0 ? "ok" : "error",
        message: `${passed} pass · ${failed} fail · ${uncertain} uncertain`,
        args: { languages: langs },
      });
      if (failed === 0) toast.success(`Verified ${passed}/${results.length} language(s)`);
      else toast.error(`${failed} of ${results.length} failed self-check`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Verify failed";
      toast.error(msg);
      appendAudit({ ts: Date.now(), actor: getRole(), command: `/verify`, result: "error", message: msg });
    } finally {
      setVerifying(false);
    }
  }, []);

  useEffect(() => {
    const unsub = subscribe(() => {
      setRoleState(getRole());
      setOverrideState(getModelOverride());
      setActions(listActions());
      setAudit(loadAudit());
    });
    // Hydrate from DB (no-op if signed out)
    void hydrateControlPrefs();
    void hydrateAudit();
    void fetchSwarmsRemote(50).then((rows) => {
      if (rows.length > 0) setSwarms(rows);
    });
    return () => { unsub(); };
  }, []);

  const activeModelLabel = useMemo(() => {
    const id = override || pickModel(kind === "auto" ? "fast" : kind).id;
    return ORCHESTRATOR_MODELS.find((m) => m.id === id)?.label || id;
  }, [override, kind]);

  const onRunCommand = useCallback(async () => {
    if (!command.trim()) return;
    setBusy(true);
    try {
      const res = await runCommand(command);
      if (res.ok) toast.success(res.message);
      else toast.error(res.message);

      // Intent commands map to orchestrator/swarm actions
      const data = res.data as { kind?: string; payload?: string | string[] } | undefined;
      if (res.ok && data?.kind === "build" && typeof data.payload === "string") {
        await runOrchestrator(`Build a concrete plan and implementation outline for: ${data.payload}`, "coding");
      } else if (res.ok && data?.kind === "analyze" && typeof data.payload === "string") {
        await runOrchestrator(`Analyze in depth: ${data.payload}`, "reasoning");
      } else if (res.ok && data?.kind === "swarm" && typeof data.payload === "string") {
        setSwarmGoal(data.payload);
        await runSwarm(data.payload);
      } else if (res.ok && data?.kind === "verify" && Array.isArray(data.payload)) {
        await runVerify(data.payload);
      }
      setCommand("");
    } finally {
      setBusy(false);
    }
  }, [command]); // eslint-disable-line react-hooks/exhaustive-deps

  const runOrchestrator = useCallback(
    async (text: string, k: TaskKind = kind) => {
      if (!text.trim()) return;
      setBusy(true);
      setOrchOut("");
      setOrchMeta("");
      try {
        const r = await orchestrate({ prompt: text, kind: k, modelOverride: override || undefined });
        setOrchOut(r.output);
        setOrchMeta(
          `model=${r.modelUsed} • kind=${r.kind} • ${r.durationMs}ms${r.attemptedFallback ? " • fallback" : ""}`
        );
        appendAudit({
          ts: Date.now(), actor: getRole(), command: `orchestrate(${k})`,
          result: "ok", message: `${r.modelUsed} in ${r.durationMs}ms`,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Orchestrate failed";
        toast.error(msg);
        appendAudit({ ts: Date.now(), actor: getRole(), command: `orchestrate(${k})`, result: "error", message: msg });
      } finally {
        setBusy(false);
      }
    },
    [kind, override]
  );

  const runSwarm = useCallback(
    async (goalArg?: string) => {
      const goal = (goalArg ?? swarmGoal).trim();
      if (!goal || swarmModels.length === 0) {
        toast.error("Provide a goal and at least one model");
        return;
      }
      const id = crypto.randomUUID();
      const task: SwarmTask = {
        id, goal, models: [...swarmModels], status: "running", results: [], startedAt: Date.now(),
      };
      setSwarms((prev) => [task, ...prev]);
      void createSwarmRemote(task);
      try {
        const results = await orchestrateParallel({ prompt: goal, models: swarmModels });
        setSwarms((prev) =>
          prev.map((s) => (s.id === id ? { ...s, status: "done", results } : s))
        );
        void updateSwarmRemote(id, { status: "done", results });
        appendAudit({
          ts: Date.now(), actor: getRole(), command: `/swarm`,
          result: "ok", message: `Swarm completed across ${results.length} models`,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Swarm failed";
        setSwarms((prev) => prev.map((s) => (s.id === id ? { ...s, status: "error" } : s)));
        void updateSwarmRemote(id, { status: "error" });
        toast.error(msg);
        appendAudit({ ts: Date.now(), actor: getRole(), command: `/swarm`, result: "error", message: msg });
      }
    },
    [swarmGoal, swarmModels]
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60 bg-card/40 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/" className="text-muted-foreground hover:text-foreground transition">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <Cpu className="h-5 w-5 text-primary" />
          <h1 className="font-mono text-lg font-bold tracking-tight">JACKIE / CONTROL</h1>
          <span className="ml-auto text-xs font-mono text-muted-foreground">
            role=<span className="text-foreground">{role}</span> • model=
            <span className="text-foreground">{activeModelLabel}</span>
          </span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: Command + Orchestrator + Swarm */}
        <section className="lg:col-span-2 space-y-6">
          {/* Command bar */}
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Terminal className="h-4 w-4 text-primary" />
              <h2 className="font-mono text-sm font-semibold">Command</h2>
              <span className="ml-auto text-[10px] font-mono text-muted-foreground">
                /control · /execute · /build · /analyze · /swarm · /verify
              </span>
            </div>
            <div className="flex gap-2">
              <input
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") onRunCommand(); }}
                placeholder="/swarm summarize project architecture"
                className="flex-1 bg-background border border-input rounded px-3 py-2 text-sm font-mono outline-none focus:ring-1 focus:ring-ring"
              />
              <button
                onClick={onRunCommand}
                disabled={busy || !command.trim()}
                className="px-3 py-2 rounded bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Run
              </button>
            </div>
          </div>

          {/* Orchestrator */}
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="h-4 w-4 text-primary" />
              <h2 className="font-mono text-sm font-semibold">Model Orchestrator</h2>
              {orchMeta && <span className="ml-auto text-[10px] font-mono text-muted-foreground">{orchMeta}</span>}
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as TaskKind)}
                className="bg-background border border-input rounded px-2 py-1.5 text-xs font-mono"
              >
                {TASK_KINDS.map((k) => (
                  <option key={k} value={k}>kind: {k}</option>
                ))}
              </select>
              <select
                value={override || ""}
                onChange={(e) => setModelOverride(e.target.value || null)}
                className="bg-background border border-input rounded px-2 py-1.5 text-xs font-mono"
              >
                <option value="">model: auto-select</option>
                {ORCHESTRATOR_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
              <span className="text-[10px] font-mono text-muted-foreground self-center">
                routing → {pickModel(kind === "auto" ? pickKind(prompt || "hello") : kind, override || undefined).label}
              </span>
            </div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ask anything. Auto-routes to the best model for the task."
              rows={4}
              className="w-full bg-background border border-input rounded px-3 py-2 text-sm font-mono outline-none focus:ring-1 focus:ring-ring resize-y"
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => runOrchestrator(prompt)}
                disabled={busy || !prompt.trim()}
                className="px-3 py-2 rounded bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                Run
              </button>
              <button
                onClick={() => { setPrompt(""); setOrchOut(""); setOrchMeta(""); }}
                className="px-3 py-2 rounded border border-border text-sm font-medium hover:bg-muted inline-flex items-center gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Reset
              </button>
            </div>
            {orchOut && (
              <pre className="mt-3 max-h-72 overflow-auto rounded bg-muted/40 p-3 text-xs whitespace-pre-wrap leading-relaxed">
                {orchOut}
              </pre>
            )}
          </div>

          {/* Swarm */}
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Network className="h-4 w-4 text-primary" />
              <h2 className="font-mono text-sm font-semibold">Multi-Model Swarm</h2>
              <span className="ml-auto text-[10px] font-mono text-muted-foreground">
                {swarmModels.length} agent(s)
              </span>
            </div>
            <input
              value={swarmGoal}
              onChange={(e) => setSwarmGoal(e.target.value)}
              placeholder="Shared goal for all agents"
              className="w-full bg-background border border-input rounded px-3 py-2 text-sm font-mono mb-2"
            />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
              {ORCHESTRATOR_MODELS.map((m) => {
                const on = swarmModels.includes(m.id);
                return (
                  <button
                    key={m.id}
                    onClick={() =>
                      setSwarmModels((prev) =>
                        on ? prev.filter((x) => x !== m.id) : [...prev, m.id]
                      )
                    }
                    className={`text-left text-xs font-mono px-2 py-1.5 rounded border transition ${
                      on
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-background text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => runSwarm()}
              disabled={busy || !swarmGoal.trim() || swarmModels.length === 0}
              className="px-3 py-2 rounded bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              <Play className="h-3.5 w-3.5" /> Dispatch swarm
            </button>

            <div className="mt-4 space-y-3">
              {swarms.length === 0 && (
                <p className="text-xs text-muted-foreground font-mono">No swarms dispatched yet.</p>
              )}
              {swarms.map((s) => (
                <div key={s.id} className="rounded border border-border bg-background/50 p-3">
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <span className={`inline-block h-2 w-2 rounded-full ${
                      s.status === "running" ? "bg-yellow-500 animate-pulse"
                      : s.status === "done" ? "bg-emerald-500" : "bg-destructive"
                    }`} />
                    <span className="truncate">{s.goal}</span>
                    <span className="ml-auto text-muted-foreground">{s.models.length} agents</span>
                  </div>
                  <div className="mt-2 grid gap-2">
                    {s.results.map((r, i) => (
                      <details key={i} className="rounded border border-border/60 bg-card/50">
                        <summary className="cursor-pointer text-[11px] font-mono px-2 py-1 flex items-center gap-1">
                          <ChevronRight className="h-3 w-3" />
                          <span className="text-foreground">{r.modelId}</span>
                          {r.error && <span className="text-destructive ml-2">error</span>}
                        </summary>
                        <pre className="px-2 pb-2 text-[11px] whitespace-pre-wrap leading-relaxed max-h-56 overflow-auto">
                          {r.error ? r.error : r.output}
                        </pre>
                      </details>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Language Self-Check */}
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <h2 className="font-mono text-sm font-semibold">Language Self-Check</h2>
              <span className="ml-auto text-[10px] font-mono text-muted-foreground">
                canonical-snippet verification before answering
              </span>
            </div>
            <div className="flex gap-2 mb-2">
              <input
                value={verifyInput}
                onChange={(e) => setVerifyInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const langs = verifyInput.split(/\s*[,|]\s*/).map((s) => s.trim()).filter(Boolean);
                    if (langs.length) { void runVerify(langs); setVerifyInput(""); }
                  }
                }}
                placeholder="python 3.12, rust 2024, postgres 16, wgsl…"
                className="flex-1 bg-background border border-input rounded px-3 py-2 text-sm font-mono outline-none focus:ring-1 focus:ring-ring"
              />
              <button
                onClick={() => {
                  const langs = verifyInput.split(/\s*[,|]\s*/).map((s) => s.trim()).filter(Boolean);
                  if (langs.length) { void runVerify(langs); setVerifyInput(""); }
                }}
                disabled={verifying || !verifyInput.trim()}
                className="px-3 py-2 rounded bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {verifying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                Verify
              </button>
            </div>
            <p className="text-[10px] font-mono text-muted-foreground mb-3">
              Comma- or pipe-separated. Each dialect must produce a runnable snippet that prints
              <code className="mx-1 px-1 rounded bg-muted text-foreground">jackie-ok</code>
              and matches idiomatic structure before full code is delivered.
            </p>

            <div className="space-y-2 max-h-80 overflow-auto">
              {verifyResults.length === 0 && (
                <p className="text-xs text-muted-foreground font-mono">No self-checks run yet.</p>
              )}
              {verifyResults.map((r, i) => {
                const Icon = r.verdict === "pass" ? CheckCircle2 : r.verdict === "fail" ? XCircle : HelpCircle;
                const tone =
                  r.verdict === "pass" ? "text-emerald-500"
                  : r.verdict === "fail" ? "text-destructive"
                  : "text-muted-foreground";
                return (
                  <details key={i} className="rounded border border-border/60 bg-background/50">
                    <summary className="cursor-pointer px-3 py-2 flex items-center gap-2 text-xs font-mono">
                      <Icon className={`h-3.5 w-3.5 ${tone}`} />
                      <span className="text-foreground">{r.language}</span>
                      {r.dialect && <span className="text-muted-foreground">/ {r.dialect}</span>}
                      <span className="ml-auto text-[10px] text-muted-foreground">
                        {r.modelUsed} · {r.durationMs}ms
                      </span>
                    </summary>
                    <div className="px-3 pb-3 space-y-2">
                      {r.reasons.length > 0 && (
                        <ul className="text-[11px] font-mono text-muted-foreground list-disc pl-4">
                          {r.reasons.map((reason, j) => <li key={j}>{reason}</li>)}
                        </ul>
                      )}
                      <pre className="rounded bg-muted/40 p-2 text-[11px] whitespace-pre-wrap leading-relaxed max-h-48 overflow-auto">
                        {r.snippet || "(no snippet returned)"}
                      </pre>
                    </div>
                  </details>
                );
              })}
            </div>
          </div>
        </section>

        {/* RIGHT: Permissions, actions, audit */}
        <aside className="space-y-6">
          {/* Role */}
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="h-4 w-4 text-primary" />
              <h2 className="font-mono text-sm font-semibold">Role</h2>
            </div>
            <div className="flex gap-2">
              {(["user", "admin", "owner"] as Role[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={`flex-1 text-xs font-mono px-2 py-1.5 rounded border transition ${
                    role === r
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-background text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[10px] font-mono text-muted-foreground">
              Higher roles unlock destructive actions. Stored locally.
            </p>
          </div>

          {/* Action registry */}
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Cpu className="h-4 w-4 text-primary" />
              <h2 className="font-mono text-sm font-semibold">Actions</h2>
              <span className="ml-auto text-[10px] font-mono text-muted-foreground">{actions.length}</span>
            </div>
            <div className="space-y-1.5 max-h-72 overflow-auto pr-1">
              {actions.map((a) => {
                const allowed = canRun(a, role);
                return (
                  <div key={a.id} className="rounded border border-border/60 bg-background/40 p-2">
                    <div className="flex items-center gap-2">
                      <code className="text-[11px] font-mono text-foreground truncate">{a.id}</code>
                      <span className="ml-auto text-[10px] font-mono text-muted-foreground">{a.minRole}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{a.description}</p>
                    <button
                      disabled={!allowed}
                      onClick={async () => {
                        try {
                          const out = await runAction(a.id);
                          toast.success(out);
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : "Failed");
                        }
                      }}
                      className="mt-1.5 text-[11px] font-mono px-2 py-0.5 rounded border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      run
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Audit */}
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="h-4 w-4 text-primary" />
              <h2 className="font-mono text-sm font-semibold">Audit Log</h2>
              <div className="ml-auto flex items-center gap-2">
                <button
                  disabled={audit.length === 0}
                  onClick={() => {
                    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
                    downloadBlob(
                      `jackie-audit-${stamp}.json`,
                      "application/json",
                      JSON.stringify(audit, null, 2),
                    );
                    toast.success(`Exported ${audit.length} entries (JSON)`);
                  }}
                  className="text-[10px] font-mono text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1"
                >
                  <Download className="h-3 w-3" /> json
                </button>
                <button
                  disabled={audit.length === 0}
                  onClick={() => {
                    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
                    downloadBlob(
                      `jackie-audit-${stamp}.csv`,
                      "text/csv;charset=utf-8",
                      auditToCsv(audit),
                    );
                    toast.success(`Exported ${audit.length} entries (CSV)`);
                  }}
                  className="text-[10px] font-mono text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1"
                >
                  <Download className="h-3 w-3" /> csv
                </button>
                <button
                  onClick={async () => {
                    try { await runAction("system.audit.clear"); }
                    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
                  }}
                  className="text-[10px] font-mono text-muted-foreground hover:text-destructive inline-flex items-center gap-1"
                >
                  <Trash2 className="h-3 w-3" /> clear
                </button>
              </div>
            </div>
            <div className="relative mb-2">
              <Search className="h-3 w-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                value={auditQuery}
                onChange={(e) => setAuditQuery(e.target.value)}
                placeholder="Search by action_id, message, command…"
                className="w-full bg-background border border-input rounded pl-7 pr-7 py-1.5 text-[11px] font-mono outline-none focus:ring-1 focus:ring-ring"
              />
              {auditQuery && (
                <button
                  onClick={() => setAuditQuery("")}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            {auditQuery && (
              <p className="mb-1 text-[10px] font-mono text-muted-foreground">
                {filteredAudit.length} of {audit.length} match
              </p>
            )}
            <div className="space-y-1 max-h-72 overflow-auto">
              {filteredAudit.length === 0 && (
                <p className="text-[11px] font-mono text-muted-foreground">
                  {audit.length === 0 ? "No events recorded." : "No matches."}
                </p>
              )}
              {filteredAudit.map((e, i) => (
                <div key={i} className="text-[11px] font-mono leading-tight border-l-2 pl-2 py-0.5"
                  style={{
                    borderColor:
                      e.result === "ok" ? "hsl(var(--primary))"
                      : e.result === "denied" ? "hsl(var(--muted-foreground))"
                      : "hsl(var(--destructive))",
                  }}
                >
                  <span className="text-muted-foreground">{new Date(e.ts).toLocaleTimeString()}</span>
                  {" "}<span className="text-foreground">{e.actor}</span>
                  {" "}<span className="text-muted-foreground">{e.command}</span>
                  <div className="text-muted-foreground truncate">{e.message}</div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
