import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { TrendingUp, Trophy, Coins } from 'lucide-react';

function formatDateLabel(value) {
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function SquadPerformanceDashboard({ squads }) {
  const analytics = useMemo(() => {
    const runs = squads.flatMap((squad) =>
      (squad.execution_history || []).map((entry, index) => ({
        id: `${squad.id}_${index}`,
        squadName: squad.name,
        created_at: entry.created_at,
        successRate: entry.success_rate || 0,
        estimatedRoi: entry.estimated_roi || 0,
        comboKey: (entry.successful_bot_ids || []).slice().sort().join(' + ') || 'Solo',
      }))
    ).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    const trend = runs.map((run) => ({
      date: formatDateLabel(run.created_at),
      successRate: Math.round(run.successRate),
      estimatedRoi: Math.round(run.estimatedRoi),
    }));

    const comboMap = {};
    runs.forEach((run) => {
      if (!comboMap[run.comboKey]) {
        comboMap[run.comboKey] = { combo: run.comboKey, runs: 0, totalSuccess: 0 };
      }
      comboMap[run.comboKey].runs += 1;
      comboMap[run.comboKey].totalSuccess += run.successRate;
    });

    const combos = Object.values(comboMap)
      .map((item) => ({ ...item, averageSuccess: Math.round(item.totalSuccess / item.runs) }))
      .sort((a, b) => b.averageSuccess - a.averageSuccess)
      .slice(0, 5);

    const averageRoi = runs.length ? Math.round(runs.reduce((sum, run) => sum + run.estimatedRoi, 0) / runs.length) : 0;
    const averageSuccess = runs.length ? Math.round(runs.reduce((sum, run) => sum + run.successRate, 0) / runs.length) : 0;

    return { trend, combos, averageRoi, averageSuccess, totalRuns: runs.length };
  }, [squads]);

  if (!analytics.totalRuns) {
    return <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No squad performance data yet.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-primary"><TrendingUp className="w-4 h-4" /><p className="text-xs font-semibold">Average success</p></div>
          <p className="mt-3 text-2xl font-bold text-foreground">{analytics.averageSuccess}%</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-primary"><Coins className="w-4 h-4" /><p className="text-xs font-semibold">Average ROI</p></div>
          <p className="mt-3 text-2xl font-bold text-foreground">{analytics.averageRoi}%</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-primary"><Trophy className="w-4 h-4" /><p className="text-xs font-semibold">Total runs</p></div>
          <p className="mt-3 text-2xl font-bold text-foreground">{analytics.totalRuns}</p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr,1fr]">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="mb-3 text-sm font-semibold text-foreground">Success rate and ROI over time</p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics.trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip />
                <Line type="monotone" dataKey="successRate" stroke="hsl(var(--primary))" strokeWidth={3} dot={false} />
                <Line type="monotone" dataKey="estimatedRoi" stroke="hsl(var(--chart-2))" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="mb-3 text-sm font-semibold text-foreground">Top bot combinations</p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.combos} layout="vertical" margin={{ left: 12, right: 12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis dataKey="combo" type="category" stroke="hsl(var(--muted-foreground))" fontSize={10} width={120} />
                <Tooltip />
                <Bar dataKey="averageSuccess" radius={[0, 6, 6, 0]}>
                  {analytics.combos.map((entry) => (
                    <Cell key={entry.combo} fill="hsl(var(--primary))" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}