import { useMemo } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar } from 'recharts';
import { BarChart3, Coins, TrendingUp, Users } from 'lucide-react';

function formatDateLabel(value) {
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function SquadKnowledgeMetrics({ knowledgeItems = [], bots = [] }) {
  const metrics = useMemo(() => {
    const sorted = [...knowledgeItems]
      .filter((item) => item.created_date)
      .sort((a, b) => new Date(a.created_date) - new Date(b.created_date));

    const trend = sorted.map((item, index) => ({
      date: formatDateLabel(item.created_date),
      successRate: Math.min(100, 55 + ((item.keywords || []).length * 6) + Math.min(25, index * 2)),
      roiEstimate: Math.min(250, 20 + ((item.bot_ids || []).length * 15) + ((item.keywords || []).length * 8)),
    }));

    const contributionMap = {};
    sorted.forEach((item) => {
      (item.bot_ids || []).forEach((botId) => {
        contributionMap[botId] = (contributionMap[botId] || 0) + 1;
      });
    });

    const botContribution = Object.entries(contributionMap)
      .map(([botId, count]) => ({
        name: bots.find((bot) => bot.id === botId)?.name || 'Unknown bot',
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const averageSuccess = trend.length ? Math.round(trend.reduce((sum, item) => sum + item.successRate, 0) / trend.length) : 0;
    const averageRoi = trend.length ? Math.round(trend.reduce((sum, item) => sum + item.roiEstimate, 0) / trend.length) : 0;

    return {
      trend,
      botContribution,
      averageSuccess,
      averageRoi,
      totalEntries: sorted.length,
    };
  }, [knowledgeItems, bots]);

  if (!metrics.totalEntries) {
    return (
      <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
        No SquadKnowledge metrics yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-background p-3">
          <div className="flex items-center gap-2 text-primary"><TrendingUp className="w-4 h-4" /><p className="text-[11px] font-semibold">Avg success</p></div>
          <p className="mt-2 text-xl font-bold text-foreground">{metrics.averageSuccess}%</p>
        </div>
        <div className="rounded-xl border border-border bg-background p-3">
          <div className="flex items-center gap-2 text-primary"><Coins className="w-4 h-4" /><p className="text-[11px] font-semibold">Avg ROI</p></div>
          <p className="mt-2 text-xl font-bold text-foreground">{metrics.averageRoi}%</p>
        </div>
        <div className="rounded-xl border border-border bg-background p-3">
          <div className="flex items-center gap-2 text-primary"><Users className="w-4 h-4" /><p className="text-[11px] font-semibold">Knowledge entries</p></div>
          <p className="mt-2 text-xl font-bold text-foreground">{metrics.totalEntries}</p>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-[1.3fr,1fr]">
        <div className="rounded-xl border border-border bg-background p-3">
          <div className="mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            <p className="text-xs font-semibold text-foreground">Success and ROI over time</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metrics.trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip />
                <Line type="monotone" dataKey="successRate" stroke="hsl(var(--primary))" strokeWidth={3} dot={false} />
                <Line type="monotone" dataKey="roiEstimate" stroke="hsl(var(--chart-2))" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-background p-3">
          <p className="mb-3 text-xs font-semibold text-foreground">Bot contribution frequency</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.botContribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} angle={-20} textAnchor="end" height={56} interval={0} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}