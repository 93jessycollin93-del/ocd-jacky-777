import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Trophy, Loader2 } from 'lucide-react';

/**
 * CardWinsChart
 * ----------------------------------------------------------------------------
 * Read-only chart of the player's last N battles, bucketed into wins vs losses
 * over time. Pure presentation — receives the raw battle history list and
 * derives daily buckets locally.
 *
 * Props:
 *  - battles    CardBattleHistory[]   Most-recent-first list.
 *  - loading    boolean
 *  - days       number                How many days back to bucket. Default 14.
 */
export default function CardWinsChart({ battles = [], loading = false, days = 14 }) {
  const { chartData, totalWins, totalLosses, winRate } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const buckets = Array.from({ length: days }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (days - 1 - i));
      return {
        key: d.toISOString().slice(0, 10),
        label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        wins: 0,
        losses: 0,
      };
    });
    const byKey = new Map(buckets.map((b) => [b.key, b]));

    let w = 0;
    let l = 0;
    battles.forEach((b) => {
      const ts = b.created_date || b.updated_date;
      if (!ts) return;
      const key = new Date(ts).toISOString().slice(0, 10);
      const bucket = byKey.get(key);
      if (b.result === 'win') w += 1;
      else if (b.result === 'loss') l += 1;
      if (!bucket) return;
      if (b.result === 'win') bucket.wins += 1;
      else if (b.result === 'loss') bucket.losses += 1;
    });

    const total = w + l;
    return {
      chartData: buckets,
      totalWins: w,
      totalLosses: l,
      winRate: total > 0 ? Math.round((w / total) * 100) : 0,
    };
  }, [battles, days]);

  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Card battle wins</h3>
        </div>
        <span className="rounded-full bg-primary/10 border border-primary/20 px-2.5 py-1 text-[11px] font-semibold text-primary whitespace-nowrap">
          {winRate}% win rate
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <Stat label="Wins" value={totalWins} accent="text-primary" />
        <Stat label="Losses" value={totalLosses} accent="text-red-400" />
        <Stat label="Battles" value={totalWins + totalLosses} accent="text-foreground" />
      </div>

      {loading ? (
        <div className="h-[200px] flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : totalWins + totalLosses === 0 ? (
        <p className="text-[11px] text-muted-foreground py-6 text-center">
          No battles yet — head to the Arena to start your record.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
            <Tooltip
              contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="wins" stackId="a" fill="hsl(var(--primary))" name="Wins" />
            <Bar dataKey="losses" stackId="a" fill="hsl(var(--destructive))" name="Losses" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/20 px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className={`text-base font-semibold ${accent}`}>{value}</p>
    </div>
  );
}