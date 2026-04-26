import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  ArrowLeft, Bot, Sparkles, Play, Pause, Plus, Check, Loader2,
  Network, Activity, Trash2, Wand2, Zap,
} from "lucide-react";

type UserBot = {
  id: string;
  name: string;
  purpose: string;
  platform: string;
  language: string;
  status: string;
  created_at: string;
};

type Swarm = {
  id: string;
  name: string;
  goal: string;
  botIds: string[];
  status: "idle" | "running" | "paused" | "done";
  createdAt: number;
  log: SwarmEvent[];
};

type SwarmEvent = {
  ts: number;
  botId: string;
  botName: string;
  message: string;
  kind: "info" | "success" | "warn";
};

const SWARM_KEY = "jackie.swarms.v1";

function loadSwarms(): Swarm[] {
  try {
    const raw = localStorage.getItem(SWARM_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function saveSwarms(s: Swarm[]) {
  try { localStorage.setItem(SWARM_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

export default function BotSwarm() {
  const { user } = useAuth();
  const [bots, setBots] = useState<UserBot[]>([]);
  const [loadingBots, setLoadingBots] = useState(true);
  const [swarms, setSwarms] = useState<Swarm[]>(loadSwarms);
  const [activeSwarmId, setActiveSwarmId] = useState<string | null>(null);

  // builder state
  const [newName, setNewName] = useState("");
  const [newGoal, setNewGoal] = useState("");
  const [selectedBots, setSelectedBots] = useState<Set<string>>(new Set());

  useEffect(() => { saveSwarms(swarms); }, [swarms]);

  // Load user's bots
  useEffect(() => {
    if (!user) { setLoadingBots(false); return; }
    (async () => {
      const { data, error } = await supabase
        .from("user_bots" as any)
        .select("id, name, purpose, platform, language, status, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) {
        toast.error("Failed to load bots");
      } else {
        setBots((data as any) ?? []);
      }
      setLoadingBots(false);
    })();
  }, [user]);

  const activeSwarm = useMemo(
    () => swarms.find(s => s.id === activeSwarmId) ?? null,
    [swarms, activeSwarmId]
  );

  const updateSwarm = useCallback((id: string, patch: Partial<Swarm> | ((s: Swarm) => Swarm)) => {
    setSwarms(prev => prev.map(s => {
      if (s.id !== id) return s;
      return typeof patch === "function" ? patch(s) : { ...s, ...patch };
    }));
  }, []);

  const createSwarm = useCallback(() => {
    if (!newName.trim()) { toast.error("Name your swarm"); return; }
    if (!newGoal.trim()) { toast.error("Set a goal"); return; }
    if (selectedBots.size < 2) { toast.error("Pick at least 2 bots"); return; }
    const swarm: Swarm = {
      id: crypto.randomUUID(),
      name: newName.trim(),
      goal: newGoal.trim(),
      botIds: Array.from(selectedBots),
      status: "idle",
      createdAt: Date.now(),
      log: [],
    };
    setSwarms(prev => [swarm, ...prev]);
    setActiveSwarmId(swarm.id);
    setNewName(""); setNewGoal(""); setSelectedBots(new Set());
    toast.success(`Swarm "${swarm.name}" created`);
  }, [newName, newGoal, selectedBots]);

  const deleteSwarm = useCallback((id: string) => {
    setSwarms(prev => prev.filter(s => s.id !== id));
    if (activeSwarmId === id) setActiveSwarmId(null);
  }, [activeSwarmId]);

  // Real swarm orchestration: dispatch goal to each bot via edge function, stream progress
  const dispatchedRef = useMemo(() => new Set<string>(), []);

  const appendEvent = useCallback((swarmId: string, ev: SwarmEvent) => {
    updateSwarm(swarmId, s => ({ ...s, log: [ev, ...s.log].slice(0, 300) }));
  }, [updateSwarm]);

  const runBotInSwarm = useCallback(async (swarm: Swarm, bot: UserBot) => {
    const stamp = (message: string, kind: SwarmEvent["kind"] = "info") =>
      appendEvent(swarm.id, { ts: Date.now(), botId: bot.id, botName: bot.name, message, kind });

    stamp(`Dispatching goal → ${bot.platform}/${bot.language}`, "info");
    try {
      const goalForBot = `[Bot role: ${bot.name} — ${bot.purpose || "general assistant"}]\nShared swarm goal: ${swarm.goal}`;
      const { data, error } = await supabase.functions.invoke("gunit-agent-cycle", {
        body: { goal: goalForBot },
      });
      if (error) throw error;
      if (data?.plan) stamp(`Plan ready (${String(data.plan).length} chars)`, "info");
      if (data?.execution) stamp(`Execution complete`, "success");
      if (data?.analysis) stamp(`Analysis posted`, "info");
      if (typeof data?.score === "number") {
        stamp(`Final score: ${data.score}/10`, data.score >= 7 ? "success" : "warn");
      }
    } catch (e: any) {
      const msg = e?.message || "Bot run failed";
      stamp(msg.includes("429") ? "Rate limited — backing off" : `Error: ${msg}`, "warn");
    }
  }, [appendEvent]);

  useEffect(() => {
    const running = swarms.filter(s => s.status === "running");
    running.forEach(swarm => {
      const swarmBots = swarm.botIds.map(id => bots.find(b => b.id === id)).filter(Boolean) as UserBot[];
      swarmBots.forEach(bot => {
        const key = `${swarm.id}:${bot.id}`;
        if (dispatchedRef.has(key)) return;
        dispatchedRef.add(key);
        appendEvent(swarm.id, {
          ts: Date.now(), botId: bot.id, botName: bot.name,
          message: "Joining swarm coordinator", kind: "info",
        });
        runBotInSwarm(swarm, bot).finally(() => {
          // allow re-dispatch on next Start
          setTimeout(() => dispatchedRef.delete(key), 500);
        });
      });
    });
  }, [swarms, bots, runBotInSwarm, appendEvent, dispatchedRef]);

  const setStatus = (id: string, status: Swarm["status"]) => {
    updateSwarm(id, { status });
    toast.success(`Swarm ${status}`);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-md px-4 py-3 flex items-center gap-3">
        <a href="/" className="p-2 rounded-md hover:bg-secondary transition-colors">
          <ArrowLeft size={16} className="text-muted-foreground" />
        </a>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Network size={20} className="text-primary" />
            <Sparkles size={10} className="absolute -top-1 -right-1 text-primary animate-pulse" />
          </div>
          <h1 className="font-mono text-sm font-bold tracking-wide">Bot Swarm</h1>
          <span className="px-1.5 py-0.5 rounded-sm bg-primary/15 text-primary font-mono text-[9px] tracking-widest">
            ORCHESTRATE
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <a
            href="/bots"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-secondary hover:bg-secondary/80 font-mono text-[11px] transition-colors"
          >
            <Wand2 size={12} /> Forge a Bot
          </a>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">

          {/* Hero */}
          <div className="text-center space-y-2">
            <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight">
              Coordinate <span className="text-primary">a swarm</span> of your bots.
            </h2>
            <p className="text-sm text-muted-foreground max-w-xl mx-auto">
              Group bots together, give them a shared goal, and watch them collaborate in real time.
            </p>
          </div>

          {/* Builder */}
          <section className="rounded-xl border border-border bg-gradient-to-b from-secondary/40 to-secondary/10 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Plus size={14} className="text-primary" />
              <h3 className="font-mono text-xs font-bold tracking-widest">NEW SWARM</h3>
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                maxLength={60}
                placeholder="Swarm name (e.g. Market Scrapers)"
                className="px-3 py-2 rounded-md bg-background/60 border border-border font-mono text-sm focus:outline-none focus:border-primary/60"
              />
              <input
                value={newGoal}
                onChange={e => setNewGoal(e.target.value)}
                maxLength={200}
                placeholder="Shared goal (e.g. Aggregate prices every 5 min)"
                className="px-3 py-2 rounded-md bg-background/60 border border-border font-mono text-sm focus:outline-none focus:border-primary/60"
              />
            </div>

            <div className="space-y-2">
              <div className="font-mono text-[10px] tracking-widest text-muted-foreground">
                PICK BOTS · {selectedBots.size} selected
              </div>
              {loadingBots ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                  <Loader2 size={12} className="animate-spin" /> Loading your bots...
                </div>
              ) : bots.length === 0 ? (
                <div className="rounded-md border border-dashed border-border p-6 text-center space-y-2">
                  <Bot size={18} className="mx-auto text-muted-foreground" />
                  <p className="font-mono text-xs text-muted-foreground">No bots yet — forge some first.</p>
                  <a href="/bots" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground font-mono text-[11px] font-bold hover:bg-primary/90">
                    <Wand2 size={12} /> Open Bot Foundry
                  </a>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-72 overflow-y-auto pr-1">
                  {bots.map(b => {
                    const sel = selectedBots.has(b.id);
                    return (
                      <button
                        key={b.id}
                        onClick={() => {
                          setSelectedBots(prev => {
                            const next = new Set(prev);
                            next.has(b.id) ? next.delete(b.id) : next.add(b.id);
                            return next;
                          });
                        }}
                        className={`text-left p-3 rounded-md border transition-all ${
                          sel
                            ? "bg-primary/15 border-primary/60"
                            : "bg-secondary/30 border-border hover:border-primary/40"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-mono text-xs font-bold truncate">{b.name}</div>
                            <div className="font-mono text-[10px] text-muted-foreground truncate">{b.platform} · {b.language}</div>
                          </div>
                          {sel && <Check size={14} className="text-primary shrink-0" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <button
              onClick={createSwarm}
              disabled={selectedBots.size < 2 || !newName.trim() || !newGoal.trim()}
              className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground font-mono text-xs font-bold hover:bg-primary/90 disabled:opacity-40 transition-all"
            >
              <Zap size={14} /> Form Swarm
            </button>
          </section>

          {/* Swarms list */}
          {swarms.length > 0 && (
            <section className="space-y-3">
              <div className="font-mono text-[10px] tracking-widest text-muted-foreground">YOUR SWARMS · {swarms.length}</div>
              <div className="grid md:grid-cols-2 gap-3">
                {swarms.map(s => {
                  const isActive = s.id === activeSwarmId;
                  return (
                    <div
                      key={s.id}
                      className={`rounded-md border p-3 transition-all cursor-pointer ${
                        isActive ? "border-primary/60 bg-primary/5" : "border-border bg-secondary/20 hover:border-primary/30"
                      }`}
                      onClick={() => setActiveSwarmId(s.id)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              s.status === "running" ? "bg-emerald-400 animate-pulse" :
                              s.status === "paused" ? "bg-amber-400" :
                              s.status === "done" ? "bg-blue-400" : "bg-muted-foreground/50"
                            }`} />
                            <span className="font-mono text-xs font-bold truncate">{s.name}</span>
                          </div>
                          <div className="font-mono text-[10px] text-muted-foreground mt-1 truncate">{s.goal}</div>
                          <div className="font-mono text-[10px] text-muted-foreground mt-1">
                            {s.botIds.length} bots · {s.status}
                          </div>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteSwarm(s.id); }}
                          className="p-1 rounded hover:bg-destructive/15 text-muted-foreground hover:text-destructive transition-colors"
                          aria-label="Delete swarm"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Active swarm console */}
          {activeSwarm && (
            <section className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <div className="font-mono text-[10px] tracking-widest text-primary">LIVE CONSOLE</div>
                  <h3 className="font-display text-lg font-bold">{activeSwarm.name}</h3>
                  <p className="font-mono text-xs text-muted-foreground">{activeSwarm.goal}</p>
                </div>
                <div className="flex items-center gap-2">
                  {activeSwarm.status !== "running" ? (
                    <button
                      onClick={() => setStatus(activeSwarm.id, "running")}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground font-mono text-[11px] font-bold hover:bg-primary/90"
                    >
                      <Play size={12} /> Start
                    </button>
                  ) : (
                    <button
                      onClick={() => setStatus(activeSwarm.id, "paused")}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-secondary font-mono text-[11px] font-bold hover:bg-secondary/80"
                    >
                      <Pause size={12} /> Pause
                    </button>
                  )}
                  <button
                    onClick={() => setStatus(activeSwarm.id, "done")}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-secondary font-mono text-[11px] hover:bg-secondary/80"
                  >
                    Stop
                  </button>
                </div>
              </div>

              {/* Bot grid */}
              <div className="flex flex-wrap gap-1.5">
                {activeSwarm.botIds.map(id => {
                  const b = bots.find(x => x.id === id);
                  return (
                    <span key={id} className="px-2 py-0.5 rounded-sm font-mono text-[10px] bg-secondary border border-border">
                      {b?.name ?? "(removed)"}
                    </span>
                  );
                })}
              </div>

              {/* Log */}
              <div className="rounded-md border border-border bg-background/60 max-h-72 overflow-y-auto">
                <div className="px-3 py-1.5 border-b border-border flex items-center gap-2">
                  <Activity size={12} className="text-primary" />
                  <span className="font-mono text-[10px] tracking-widest text-muted-foreground">EVENT STREAM</span>
                </div>
                {activeSwarm.log.length === 0 ? (
                  <div className="p-4 text-center font-mono text-[11px] text-muted-foreground">
                    {activeSwarm.status === "running" ? "Waiting for first event..." : "Press Start to launch the swarm."}
                  </div>
                ) : (
                  <ul className="divide-y divide-border/50">
                    {activeSwarm.log.map((e, i) => (
                      <li key={i} className="px-3 py-1.5 flex items-start gap-2 font-mono text-[11px]">
                        <span className="text-muted-foreground">{new Date(e.ts).toLocaleTimeString()}</span>
                        <span className={`font-bold ${
                          e.kind === "warn" ? "text-amber-400" :
                          e.kind === "success" ? "text-emerald-400" : "text-primary"
                        }`}>
                          {e.botName}
                        </span>
                        <span className="text-muted-foreground flex-1 truncate">{e.message}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
