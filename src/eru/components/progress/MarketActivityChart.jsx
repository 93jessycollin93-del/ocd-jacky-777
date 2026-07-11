import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Coins, Loader2 } from 'lucide-react';

/**
 * MarketActivityChart
 * ----------------------------------------------------------------------------
 * Plots daily market activity for the current player: listings created and
 * verified transactions over the last N days. Pure presentation — caller
 * passes the raw entity arrays and we bucket them locally.
 *
 * Props:
 *  - listings       CardListing[]
 *  - transactions   Transaction[]
 *  - loading        boolean
 *  - days           number          Default 14.
 */
export default function MarketActivityChart({ listings = [], transactions = [], loading = false, days = 14 }) {
  const { chartData, totalListings, totalTrades, totalVolume } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const buckets = Array.from({ length: days }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (days - 1 - i));
      return {
        key: d.toISOString().slice(0, 10),
        label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        listings: 0,
        trades: 0,
      };
    });
    const byKey = new Map(buckets.map((b) => [b.key, b]));

    let lTotal = 0;
    listings.forEach((item) => {
      const ts = item.created_date;
      if (!ts) return;
      lTotal += 1;
      const key = new Date(ts).toISOString().slice(0, 10);
      const bucket = byKey.get(key);
      if (bucket) bucket.listings += 1;
    });

    let tTotal = 0;
    let volume = 0;
    transactions.forEach((item) => {
      if (item.status !== 'verified') return;
      tTotal += 1;
      volume += Number(item.amount || 0);
      const ts = item.verified_at || item.created_date;
      if (!ts) return;
      const key = new Date(ts).toISOString().slice(0, 10);
      const bucket = byKey.get(key);
      if (bucket) bucket.trades += 1;
    });

    return {
      chartData: buckets,
      totalListings: lTotal,
      totalTrades: tTotal,
      totalVolume: volume,
    };
  }, [listings, transactions, days]);

  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Coins className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Market activity</h3>
        </div>
        <span className="rounded-full bg-primary/10 border border-primary/20 px-2.5 py-1 text-[11px] font-semibold text-primary whitespace-nowrap">
          {days}d
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <Stat label="Listings" value={totalListings} accent="text-foreground" />
        <Stat label="Trades" value={totalTrades} accent="text-primary" />
        <Stat label="Volume" value={Math.round(totalVolume).toLocaleString()} accent="text-foreground" />
      </div>

      {loading ? (
        <div className="h-[200px] flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : totalListings + totalTrades === 0 ? (
        <p className="text-[11px] text-muted-foreground py-6 text-center">
          No market activity yet — list a card or make a trade to see your trend.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
            <Tooltip
              contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="listings" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} name="Listings" />
            <Line type="monotone" dataKey="trades" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="Trades" />
          </LineChart>
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