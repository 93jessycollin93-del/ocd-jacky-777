// JackyLive — native Jackie surface for the real Jacky engine (Fleet Parity Wave 2).
//
// Reads live GPU/CPU/RAM telemetry + routing verdict via the jacky-proxy edge
// function and routes orders through /api/ask. Falls back to a clearly-labelled
// demo when the backend isn't linked (JACKY_API_BASE unset / unreachable).
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Activity, Cpu, Thermometer, Send, Zap, Radio, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { jacky, type JackyStatus, type JackyAssessment } from "@/lib/jackyClient";

type Sit = { gpu: number; cpu: number; ram: number; vram: number };
type Msg = { who: "you" | "jackie" | "system"; text: string };

const HARD_STOP = 75;

function tierFor(gpu: number, cpu: number, ram: number): { label: string; tone: string } {
  if (gpu >= HARD_STOP) return { label: "THERMAL HALT", tone: "text-rose-400" };
  if (gpu >= 70) return { label: "FREE CLOUD", tone: "text-amber-400" };
  if (cpu >= 90 || ram >= 92) return { label: "OFFLOAD · PAID", tone: "text-cyan-300" };
  return { label: "LOCAL FIRST", tone: "text-emerald-400" };
}

function gpuTone(t: number): string {
  return t >= HARD_STOP ? "text-rose-400" : t >= 70 ? "text-amber-400" : "text-emerald-400";
}

export default function JackyLive() {
  const [sit, setSit] = useState<Sit>({ gpu: 54, cpu: 32, ram: 47, vram: 61 });
  const [live, setLive] = useState(false);
  const [verdict, setVerdict] = useState<string>("");
  const [prompt, setPrompt] = useState("");
  const [asking, setAsking] = useState(false);
  const [squadBusy, setSquadBusy] = useState(false);
  const [log, setLog] = useState<Msg[]>([
    { who: "system", text: "Jacky Live console — link the backend (JACKY_API_BASE secret) to go live." },
  ]);
  const logEnd = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let alive = true;
    async function poll() {
      try {
        const [s, a] = await Promise.all([
          jacky.getStatus(),
          jacky.getAssessment().catch(() => null as JackyAssessment | null),
        ]);
        if (!alive) return;
        applyStatus(s);
        setLive(true);
        if (a?.badge) setVerdict(String(a.badge));
      } catch {
        if (!alive) return;
        setLive(false);
        drift();
      }
    }
    function applyStatus(s: JackyStatus) {
      const g = s.gpu || { available: false };
      setSit((prev) => ({
        gpu: g.available && typeof g.temp_c === "number" ? g.temp_c : prev.gpu,
        cpu: typeof s.cpu === "number" ? s.cpu : prev.cpu,
        ram: typeof s.memory === "number" ? s.memory : prev.ram,
        vram:
          g.available && g.mem_used_mb && g.mem_total_mb
            ? Math.round((g.mem_used_mb / g.mem_total_mb) * 100)
            : prev.vram,
      }));
    }
    function drift() {
      setSit((p) => {
        const d = (v: number, lo: number, hi: number, step: number) =>
          Math.max(lo, Math.min(hi, v + (Math.random() - 0.5) * step));
        return { gpu: d(p.gpu, 42, 78, 3.2), cpu: d(p.cpu, 12, 96, 9), ram: d(p.ram, 30, 90, 5), vram: d(p.vram, 40, 94, 4) };
      });
    }
    poll();
    const id = setInterval(poll, 4000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    logEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [log]);

  async function dispatchSquad(squad: string) {
    const text = prompt.trim();
    if (!text || squadBusy) return;
    setLog((l) => [...l, { who: "you", text: `[${squad}] ${text}` }]);
    setSquadBusy(true);
    try {
      const r = await jacky.askSquad(squad, text);
      setLog((l) => [
        ...l,
        { who: "jackie", text: r.response || "(no response)" },
        { who: "system", text: `↳ ${squad} squad lead${r.model ? " · " + r.model : ""}` },
      ]);
      setLive(true);
    } catch (e) {
      setLog((l) => [...l, { who: "system", text: `⚠ ${squad} squad unreachable (${(e as Error).message})` }]);
      setLive(false);
    } finally {
      setSquadBusy(false);
    }
  }

  const tier = tierFor(sit.gpu, sit.cpu, sit.ram);

  async function send() {
    const text = prompt.trim();
    if (!text || asking) return;
    setPrompt("");
    setLog((l) => [...l, { who: "you", text }]);
    setAsking(true);
    try {
      const r = await jacky.ask(text);
      setLog((l) => [
        ...l,
        { who: "jackie", text: r.response || "(no response)" },
        { who: "system", text: `↳ ${r.route || r.engine || "routed"}${r.model ? " · " + r.model : ""}` },
      ]);
      setLive(true);
    } catch (e) {
      setLog((l) => [
        ...l,
        { who: "system", text: `⚠ backend unreachable (${(e as Error).message}) — offline.` },
      ]);
      setLive(false);
    } finally {
      setAsking(false);
    }
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 text-foreground">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="flex items-center gap-3">
          <Radio className="h-6 w-6 text-cyan-400" />
          <div>
            <h1 className="text-xl font-bold tracking-widest uppercase">Jacky Live</h1>
            <p className="text-xs text-muted-foreground tracking-wider">Real engine telemetry · situation-aware routing</p>
          </div>
          <Badge
            variant="outline"
            className={cn("ml-auto font-mono tracking-widest", live ? "border-emerald-500/40 text-emerald-400" : "border-amber-500/40 text-amber-400")}
          >
            {live ? "● LIVE" : "● DEMO"}
          </Badge>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="p-4">
            <div className="flex items-center justify-between text-xs uppercase tracking-widest text-muted-foreground">
              <span>GPU · RTX 3090</span>
              <Thermometer className="h-4 w-4" />
            </div>
            <div className={cn("mt-2 font-mono text-3xl font-bold", gpuTone(sit.gpu))}>
              {Math.round(sit.gpu)}°C
            </div>
            <div className="mt-1 text-[10px] text-muted-foreground">hard stop {HARD_STOP}°C</div>
          </Card>
          <StatCard icon={<Cpu className="h-4 w-4" />} label="CPU Load" value={sit.cpu} />
          <StatCard icon={<Activity className="h-4 w-4" />} label="Memory" value={sit.ram} />
          <StatCard icon={<Zap className="h-4 w-4" />} label="VRAM" value={sit.vram} />
        </div>

        <Card className="flex items-center gap-3 p-4">
          <span className="text-xs uppercase tracking-widest text-muted-foreground">Routing Tier</span>
          <span className={cn("font-mono text-sm font-bold tracking-wider", tier.tone)}>{tier.label}</span>
          {verdict && <span className="ml-auto text-xs text-muted-foreground">assessor: {verdict}</span>}
        </Card>

        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
            <Send className="h-4 w-4" /> Ask Jackie
          </div>
          <div className="max-h-72 space-y-2 overflow-y-auto rounded-md bg-muted/30 p-3 text-sm">
            {log.map((m, i) => (
              <p key={i} className={cn("whitespace-pre-wrap break-words", m.who === "system" && "italic text-muted-foreground", m.who === "jackie" && "text-cyan-300", m.who === "you" && "text-amber-300")}>
                {m.who !== "system" && <span className="mr-1 font-mono text-xs opacity-70">{m.who === "you" ? "commander:" : "jackie:"}</span>}
                {m.text}
              </p>
            ))}
            <div ref={logEnd} />
          </div>
          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <Input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="issue an order — routed local→free→paid by the 3090's temp…"
              disabled={asking}
            />
            <Button type="submit" disabled={asking || !prompt.trim()}>
              {asking ? "…" : "Send"}
            </Button>
          </form>
        </Card>

        <Card className="p-4">
          <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
            <Users className="h-4 w-4" /> Dispatch to Squad
          </div>
          <div className="flex flex-wrap gap-2">
            {["coding", "security", "archivist"].map((sq) => (
              <Button key={sq} variant="outline" size="sm" disabled={squadBusy || !prompt.trim()} onClick={() => dispatchSquad(sq)}>
                {sq}
              </Button>
            ))}
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground">Sends the box above to the squad lead (memory-aware) via /api/squads.</p>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between text-xs uppercase tracking-widest text-muted-foreground">
        <span>{label}</span>
        {icon}
      </div>
      <div className="mt-2 font-mono text-3xl font-bold">{Math.round(value)}%</div>
      <Progress value={Math.round(value)} className="mt-2 h-1.5" />
    </Card>
  );
}
