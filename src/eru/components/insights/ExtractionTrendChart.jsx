import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Pickaxe, Loader2 } from 'lucide-react';

/**
 * ExtractionTrendChart
 * ----------------------------------------------------------------------------
 * Area chart of recent asset extraction events bucketed per day, plus the
 * count of cards surfaced. Pure presentation — caller passes the
 * ExcavationEvent list.
 *
 * Props:
 *  - events   ExcavationEvent[]
 *  - loading  boolean
 *  - days     number   Default 14.
 */
export default function ExtractionTrendChart({ events = [], loading = false, days = 14 }) {
  const { chartData, totalEvents, totalCards, topOrigin } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const buckets = Array.from({ length: days }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (days - 1 - i));
      return {
        key: d.toISOString().slice(0, 10),
        label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        events: 0,
        cards: 0,
      };
    });
    const byKey = new Map(buckets.map((b) => [b.key, b]));

    let evCount = 0;
    let cardCount = 0;
    const originCounts = new Map();
    events.forEach((ev) => {
      const ts = ev.created_date;
      const cards = (ev.card_ids || []).length || (ev.cards_surfaced_snapshot || []).length;
      evCount += 1;
      cardCount += cards;
      if (ev.origin) originCounts.set(ev.origin, (originCounts.get(ev.origin) || 0) + 1);
      if (!ts) return;
      const key = new Date(ts).toISOString().slice(0, 10);
      const bucket = byKey.get(key);
      if (!bucket) return;
      bucket.events += 1;
      bucket.cards += cards;
    });

    let top = '—';
    let topVal = 0;
    originCounts.forEach((v, k) => {
      if (v > topVal) {
        top = k;
        topVal = v;
      }
    });

    return { chartData: buckets, totalEvents: evCount, totalCards: cardCount, topOrigin: top };
  }, [events, days]);

  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Pickaxe className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Extraction trends</h3>
        </div>
        <span className="rounded-full bg-primary/10 border border-primary/20 px-2.5 py-1 text-[11px] font-semibold text-primary whitespace-nowrap">
          {days}d
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <Stat label="Events" value={totalEvents} />
        <Stat label="Cards surfaced" value={totalCards} accent="text-primary" />
        <Stat label="Top origin" value={topOrigin} truncate />
      </div>

      {loading ? (
        <div className="h-[220px] flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : totalEvents === 0 ? (
        <p className="text-[11px] text-muted-foreground py-6 text-center">
          No extractions yet — start an Excavation Event to see your trend here.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="extractionEventsFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--chart-2))" stopOpacity={0.4} />
                <stop offset="100%" stopColor="hsl(var(--chart-2))" stopOpacity={0.04} />
              </linearGradient>
              <linearGradient id="extractionCardsFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.45} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
            <Tooltip
              contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
            />
            <Area type="monotone" dataKey="cards" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#extractionCardsFill)" name="Cards surfaced" />
            <Area type="monotone" dataKey="events" stroke="hsl(var(--chart-2))" strokeWidth={2} fill="url(#extractionEventsFill)" name="Events" />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function Stat({ label, value, accent = 'text-foreground', truncate = false }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/20 px-3 py-2 min-w-0">
      <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className={`text-base font-semibold ${accent} ${truncate ? 'truncate' : ''}`}>{value}</p>
    </div>
  );
}