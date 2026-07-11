import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ScrollText, Loader2 } from 'lucide-react';

/**
 * LorePopularityChart
 * ----------------------------------------------------------------------------
 * Bar chart of the most popular card lore tags (fallback: lore_origin) across
 * the player's collection. Pure presentation — caller passes the Card list.
 *
 * Props:
 *  - cards    Card[]
 *  - loading  boolean
 *  - topN     number   Default 6.
 */
const PALETTE = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--chart-1))',
];

function humanize(value) {
  if (!value) return 'Unknown';
  return String(value).replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
}

export default function LorePopularityChart({ cards = [], loading = false, topN = 6 }) {
  const { chartData, totalTagged, distinctTags } = useMemo(() => {
    const counts = new Map();
    let tagged = 0;
    cards.forEach((c) => {
      const key = c.lore_tag || c.lore_origin;
      if (!key) return;
      tagged += 1;
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    const arr = Array.from(counts.entries())
      .map(([key, count]) => ({ key, name: humanize(key), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, topN);
    return { chartData: arr, totalTagged: tagged, distinctTags: counts.size };
  }, [cards, topN]);

  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <ScrollText className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Popular lore types</h3>
        </div>
        <span className="rounded-full bg-primary/10 border border-primary/20 px-2.5 py-1 text-[11px] font-semibold text-primary whitespace-nowrap">
          {distinctTags} unique
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <Stat label="Tagged cards" value={totalTagged} />
        <Stat label="Top tag" value={chartData[0]?.name || '—'} truncate />
      </div>

      {loading ? (
        <div className="h-[220px] flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : chartData.length === 0 ? (
        <p className="text-[11px] text-muted-foreground py-6 text-center">
          No lore tags yet — cards surfaced from excavations carry lore tags automatically.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 12, left: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={110} />
            <Tooltip
              contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
              cursor={{ fill: 'hsl(var(--secondary))', opacity: 0.5 }}
            />
            <Bar dataKey="count" radius={[0, 6, 6, 0]}>
              {chartData.map((_, i) => (
                <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function Stat({ label, value, truncate = false }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/20 px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className={`text-base font-semibold text-foreground ${truncate ? 'truncate' : ''}`}>{value}</p>
    </div>
  );
}