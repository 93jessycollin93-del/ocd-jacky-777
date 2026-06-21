import { Coins, Gem } from 'lucide-react';

const padValue = (value) => String(Math.max(0, Number(value || 0))).padStart(6, '0');

export default function BazarBalanceCard({ gold, jadeite }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-4">
        <div className="flex items-center gap-2 text-yellow-400">
          <Coins className="h-4 w-4" />
          <p className="text-xs font-semibold uppercase tracking-wider">GOLD</p>
        </div>
        <p className="mt-3 font-mono text-2xl font-bold text-foreground">{padValue(gold)}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">Gold Nugget balance</p>
      </div>
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
        <div className="flex items-center gap-2 text-emerald-400">
          <Gem className="h-4 w-4" />
          <p className="text-xs font-semibold uppercase tracking-wider">JADEITE</p>
        </div>
        <p className="mt-3 font-mono text-2xl font-bold text-foreground">{padValue(jadeite)}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">Jadeite Chunk balance</p>
      </div>
    </div>
  );
}