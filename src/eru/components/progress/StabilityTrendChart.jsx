import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Activity, Loader2 } from 'lucide-react';

/**
 * StabilityTrendChart
 * ----------------------------------------------------------------------------
 * Plots the player's collection stability over time using each card's visible
 * stability rating, ordered by acquisition date. Caps to most recent N points
 * for readability on mobile.
 *
 * Props:
 *  - cards      Card[]   Player's cards (any order).
 *  - loading    boolean
 *  - maxPoints  number   Default 30.
 */
export default function StabilityTrendChart({ cards = [], loading = false, maxPoints = 30 }) {
  const { chartData, average, latest, phase } = useMemo(() => {
    const points = cards
      .filter((c) => typeof c.stability_visible === 'number')
      .map((c) => ({
        ts: c.created_date || c.updated_date || new Date().toISOString(),
        stability: Number(c.stability_visible) || 0,
        name: c.name || 'Card',
      }))
      .sort((a, b) => new Date(a.ts) - new Date(b.ts))
      .slice(-maxPoints)
      .map((p, i) => ({
        index: i + 1,
        label: new Date(p.ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        stability: p.stability,
        name: p.name,
      }));

    const sum = points.reduce((acc, p) => acc + p.stability, 0);
    const avg = points.length ? Math.round(sum / points.length) : 0;
    const last = points.length ? points[points.length - 1].stability : 0;
    let p = 'calm';
    if (avg < 30) p = 'fracturing';
    else if (avg < 50) p = 'unstable';
    else if (avg < 70) p = 'humming';
    else p = 'calm';

    return { chartData: points, average: avg, latest: last, phase: p };
  }, [cards, maxPoints]);

  const phaseColor = {
    calm: 'text-primary',
    humming: 'text-blue-400',
    unstable: 'text-yellow-400',
    fracturing: 'text-red-400',
  }[phase];

  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Collection stability</h3>
        </div>
        <span className={`rounded-full bg-secondary border border-border px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap ${phaseColor}`}>
          {phase}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <Stat label="Average" value={`${average}`} suffix="/100" />
        <Stat label="Latest" value={`${latest}`} suffix="/100" />
      </div>

      {loading ? (
        <div className="h-[200px] flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : chartData.length === 0 ? (
        <p className="text-[11px] text-muted-foreground py-6 text-center">
          No stability data yet — surface some cards from excavation events.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="stabilityFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.45} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
            <Tooltip
              contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
              formatter={(value, _, item) => [`${value}/100`, item?.payload?.name || 'Stability']}
            />
            <ReferenceLine y={50} stroke="hsl(var(--border))" strokeDasharray="4 4" />
            <Area type="monotone" dataKey="stability" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#stabilityFill)" />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function Stat({ label, value, suffix }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/20 px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="text-base font-semibold text-foreground">
        {value}<span className="text-xs text-muted-foreground ml-1">{suffix}</span>
      </p>
    </div>
  );
}