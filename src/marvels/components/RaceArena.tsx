import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Racer, simulateRace, generateCourse, RaceResult } from "@/marvels/lib/raceEngine";
import { makeCommentary, rankSuffix } from "@/marvels/lib/commentary";
import { SpermCell } from "./SpermCell";
import { ParticleField } from "./ParticleField";
import { Button } from "@/components/ui/button";
import { Trophy, Play, RotateCcw, Zap } from "lucide-react";

interface RaceArenaProps {
  racers: Racer[];
  seed: number;
  bets?: Record<string, number>;
  onFinish?: (result: RaceResult) => void;
}

export const RaceArena = ({ racers, seed, bets, onFinish }: RaceArenaProps) => {
  const [course] = useState(() => generateCourse(seed));
  const [result, setResult] = useState<RaceResult | null>(null);
  const [tick, setTick] = useState(0);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [commentary, setCommentary] = useState("Tap Start to begin the swim!");
  const leaderRef = useRef<string | null>(null);
  const finishedRef = useRef<Set<string>>(new Set());
  const rafRef = useRef<number>(0);

  const start = useCallback(() => {
    const res = simulateRace(racers, course);
    setResult(res);
    setTick(0);
    setDone(false);
    setRunning(true);
    leaderRef.current = null;
    finishedRef.current = new Set();
  }, [racers, course]);

  useEffect(() => {
    if (!running || !result) return;
    let last = performance.now();
    const acc = { t: 0 };
    const step = (now: number) => {
      const dt = now - last;
      last = now;
      acc.t += dt;
      if (acc.t > 28) {
        acc.t = 0;
        setTick((prev) => {
          const next = prev + 1;
          if (next >= result.totalTicks) {
            setRunning(false);
            setDone(true);
            onFinish?.(result);
            return result.totalTicks - 1;
          }
          return next;
        });
      }
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [running, result, onFinish]);

  useEffect(() => {
    if (!result || !running) return;
    const frame = result.frames[tick];
    if (!frame) return;
    const standings = result.states
      .map((s) => {
        const idx = racers.findIndex((r) => r.id === s.racer.id);
        return { id: s.racer.id, name: s.racer.name, progress: frame[idx].progress };
      })
      .sort((a, b) => b.progress - a.progress);

    const newlyFinished: string[] = [];
    standings.forEach((s) => {
      if (s.progress >= 100 && !finishedRef.current.has(s.id)) {
        finishedRef.current.add(s.id);
        newlyFinished.push(s.name);
      }
    });

    if (tick % 6 === 0 || newlyFinished.length) {
      const { text, leaderId } = makeCommentary(standings, leaderRef.current, newlyFinished);
      leaderRef.current = leaderId;
      setCommentary(text);
    }
  }, [tick, result, running, racers]);

  const frame = result?.frames[tick];
  const leadProgress = frame ? Math.max(...frame.map((f) => f.progress)) : 0;

  return (
    <div className="space-y-4">
      <div className="mm-glass flex items-center gap-3 rounded-xl px-4 py-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary/20 text-secondary">
          <Zap className="h-4 w-4" />
        </span>
        <AnimatePresence mode="wait">
          <motion.p key={commentary} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="text-sm font-medium text-foreground/90">
            {commentary}
          </motion.p>
        </AnimatePresence>
      </div>

      <div className="mm-track relative overflow-hidden rounded-2xl border border-border">
        <ParticleField active={running} />
        <div className="pointer-events-none absolute right-[5%] top-0 z-10 h-full w-1 bg-gradient-to-b from-primary via-secondary to-accent opacity-80" />
        <span className="pointer-events-none absolute right-[5%] top-2 z-10 -translate-x-1/2 text-[10px] mm-display tracking-widest text-primary">FINISH</span>

        <div className="relative z-[5] flex flex-col justify-around py-4" style={{ minHeight: racers.length * 58 + 16 }}>
          {racers.map((r, i) => {
            const fp = frame ? frame[i] : { progress: 0, lane: 0 };
            const left = 4 + (fp.progress / 100) * 86;
            const finishedHere = fp.progress >= 100;
            return (
              <div key={r.id} className="relative h-12">
                <div className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] mm-display text-muted-foreground">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <motion.div className="absolute top-1/2" style={{ left: `${left}%` }} animate={{ y: fp.lane * 14 - 8 }} transition={{ type: "tween", duration: 0.05 }}>
                  <SpermCell bodyColor={r.color} tailColor={r.tailColor} swimming={running && !finishedHere} />
                </motion.div>
              </div>
            );
          })}
        </div>

        {running && (
          <div className="pointer-events-none absolute inset-y-0 z-0 w-40 bg-gradient-to-r from-transparent via-primary/10 to-transparent blur-xl" style={{ left: `${leadProgress}%` }} />
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {!running && !done && (
          <Button size="lg" onClick={start}>
            <Play className="h-4 w-4" /> Start Race
          </Button>
        )}
        {done && (
          <Button size="lg" variant="secondary" onClick={start}>
            <RotateCcw className="h-4 w-4" /> Replay
          </Button>
        )}
      </div>

      <AnimatePresence>
        {done && result && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mm-glass rounded-2xl p-4">
            <h3 className="mb-3 flex items-center gap-2 mm-display text-lg mm-gradient">
              <Trophy className="h-5 w-5 text-primary" /> Final Standings
            </h3>
            <ul className="space-y-2">
              {result.states.map((s) => {
                const won = bets?.[s.racer.id];
                return (
                  <li key={s.racer.id} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                    <span className="flex items-center gap-3">
                      <span className={`flex h-6 w-9 items-center justify-center rounded mm-display text-xs ${s.rank === 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                        {rankSuffix(s.rank!)}
                      </span>
                      <span className="h-3 w-3 rounded-full" style={{ background: `hsl(${s.racer.color})` }} />
                      <span className="text-sm font-medium">{s.racer.name}</span>
                    </span>
                    {won && s.rank === 1 && <span className="text-xs font-semibold text-primary">+{won * 2} ⬡</span>}
                  </li>
                );
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
