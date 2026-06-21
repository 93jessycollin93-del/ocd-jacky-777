import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { buildRoster } from "@/marvels/lib/roster";
import { Racer, RaceResult } from "@/marvels/lib/raceEngine";
import { RaceArena } from "@/marvels/components/RaceArena";
import { RacerCard } from "@/marvels/components/RacerCard";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Dna, Hexagon, Minus, Plus, Shuffle, Trophy, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const SCOPED_CSS = `
.mm-scope { --mm-bio-1:168 90% 52%; --mm-bio-2:315 85% 60%; --mm-bio-3:265 85% 65%; }
.mm-scope .mm-display { font-family: 'Orbitron', 'JetBrains Mono', system-ui, sans-serif; letter-spacing: 0.02em; }
.mm-scope .mm-glass { background: hsl(222 40% 9% / 0.6); backdrop-filter: blur(14px); border: 1px solid hsl(200 30% 30% / 0.25); }
.mm-scope .mm-gradient { background-clip: text; -webkit-background-clip: text; color: transparent; background-image: linear-gradient(135deg, hsl(var(--mm-bio-1)), hsl(var(--mm-bio-3)) 50%, hsl(var(--mm-bio-2))); }
.mm-scope .mm-track { background-image: linear-gradient(160deg, hsl(222 40% 9%), hsl(222 47% 5%)), linear-gradient(hsl(168 90% 52% / 0.06) 1px, transparent 1px), linear-gradient(90deg, hsl(168 90% 52% / 0.06) 1px, transparent 1px); background-size: cover, 32px 32px, 32px 32px; box-shadow: 0 20px 50px -20px hsl(168 90% 52% / 0.35); }
.mm-scope .mm-card-selected { border-color: hsl(var(--mm-bio-1)); background: hsl(var(--mm-bio-1) / 0.1); box-shadow: 0 0 28px hsl(var(--mm-bio-1) / 0.5); }
`;

export default function MarvelsRace() {
  const [roster, setRoster] = useState<Racer[]>(() => buildRoster(6));
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e9));
  const [pick, setPick] = useState<string | null>(null);
  const [betAmount, setBetAmount] = useState(50);
  const [balance, setBalance] = useState(1000);
  const [activeBet, setActiveBet] = useState<{ id: string; amount: number } | null>(null);
  const [raceKey, setRaceKey] = useState(0);
  const [wins, setWins] = useState(0);
  const [races, setRaces] = useState(0);

  const placeBet = useCallback(() => {
    if (!pick) return toast({ title: "Pick a racer first" });
    if (betAmount > balance) return toast({ title: "Insufficient credits", variant: "destructive" });
    setBalance((b) => b - betAmount);
    setActiveBet({ id: pick, amount: betAmount });
    setRaceKey((k) => k + 1);
  }, [pick, betAmount, balance]);

  const newSeason = () => {
    setRoster(buildRoster(6));
    setSeed(Math.floor(Math.random() * 1e9));
    setPick(null);
    setActiveBet(null);
  };

  const onFinish = useCallback((result: RaceResult) => {
    setRaces((r) => r + 1);
    if (activeBet) {
      if (result.winnerId === activeBet.id) {
        setBalance((b) => b + activeBet.amount * 2);
        setWins((w) => w + 1);
        toast({ title: "🏆 You won!", description: `+${activeBet.amount * 2} ⬡` });
      } else {
        toast({ title: "Your racer didn't win" });
      }
      setActiveBet(null);
    }
  }, [activeBet]);

  const bets = activeBet ? { [activeBet.id]: activeBet.amount } : undefined;

  return (
    <div className="mm-scope min-h-screen bg-background text-foreground">
      <style>{SCOPED_CSS}</style>
      <header className="sticky top-0 z-30 border-b border-border mm-glass">
        <div className="container flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /></Link>
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/20">
              <Dna className="h-5 w-5 text-primary" />
            </span>
            <div className="leading-tight">
              <h1 className="mm-display text-base tracking-wider mm-gradient">MICROSCOPIC MARVELS</h1>
              <p className="text-[10px] text-muted-foreground">Reference simulation · Virtual credits</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5">
            <Hexagon className="h-4 w-4 text-primary" />
            <span className="mm-display text-sm text-primary">{balance}</span>
          </div>
        </div>
      </header>

      <section className="container py-6 text-center">
        <motion.h2 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mm-display text-2xl sm:text-3xl">
          Back a <span className="mm-gradient">Champion Cell</span>
        </motion.h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Procedurally generated courses, live commentary, virtual credits only — pure science-fueled simulation.
        </p>
        <div className="mx-auto mt-4 flex max-w-md items-center justify-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Trophy className="h-3 w-3 text-primary" /> {wins} wins</span>
          <span>·</span><span>{races} races run</span>
        </div>
      </section>

      <main className="container space-y-6 pb-16">
        <RaceArena key={raceKey} racers={roster} seed={seed + raceKey} bets={bets} onFinish={onFinish} />

        <div className="mm-glass rounded-2xl p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="mm-display text-sm tracking-wide">PLACE YOUR BET</h3>
            <Button variant="ghost" size="sm" onClick={newSeason}><Shuffle className="h-4 w-4" /> New Lineup</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 p-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setBetAmount((a) => Math.max(10, a - 10))}><Minus className="h-4 w-4" /></Button>
              <span className="w-16 text-center mm-display text-sm">{betAmount} ⬡</span>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setBetAmount((a) => Math.min(balance, a + 10))}><Plus className="h-4 w-4" /></Button>
            </div>
            <Button onClick={placeBet} disabled={!!activeBet}>{activeBet ? "Bet Active" : "Place Bet & Race"}</Button>
          </div>
        </div>

        <section>
          <h3 className="mb-3 mm-display text-sm tracking-wide text-muted-foreground">THE LINEUP — tap to back a racer</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {roster.map((r) => (
              <RacerCard key={r.id} racer={r} selected={pick === r.id} bet={activeBet?.id === r.id ? activeBet.amount : undefined} onClick={() => setPick(r.id)} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
