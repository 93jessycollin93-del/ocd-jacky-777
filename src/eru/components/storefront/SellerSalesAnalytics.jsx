import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';

export default function SellerSalesAnalytics({ data = [] }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div>
        <p className="text-sm font-semibold text-foreground">Sales analytics</p>
        <p className="text-[11px] text-muted-foreground">Recent seller performance from paid orders and completed escrow.</p>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
          <Bar dataKey="earned" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          <Bar dataKey="pending" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}