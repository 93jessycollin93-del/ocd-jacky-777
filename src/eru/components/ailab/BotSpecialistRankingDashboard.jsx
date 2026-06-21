import { useMemo } from 'react';
import { Award, BarChart3, Users } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, LineChart, Line } from 'recharts';

function StatCard({ icon: IconComponent, label, value }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <IconComponent className="w-4 h-4 text-primary mb-2" />
      <p className="text-xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export default function BotSpecialistRankingDashboard({ bots = [], squads = [] }) {
  const analytics = useMemo(() => {
    const runs = squads.flatMap((squad) => (squad.execution_history || []).map((entry) => ({
      squadName: squad.name,
      goal: entry.goal,
      successRate: entry.success_rate || 0,
      estimatedRoi: entry.estimated_roi || 0,
      botIds: entry.successful_bot_ids || [],
      createdAt: entry.created_at,
    })));

    const rankedBots = bots.map((bot) => {
      const contributions = runs.filter((run) => run.botIds.includes(bot.id));
      const contributionCount = contributions.length;
      const avgSuccess = contributionCount ? Math.round(contributions.reduce((sum, run) => sum + run.successRate, 0) / contributionCount) : 0;
      const avgRoi = contributionCount ? Math.round(contributions.reduce((sum, run) => sum + run.estimatedRoi, 0) / contributionCount) : 0;
      const specialistScore = (contributionCount * 10) + avgSuccess + Math.round(avgRoi / 2);

      return {
        id: bot.id,
        name: bot.name,
        role: bot.role,
        contributionCount,
        avgSuccess,
        avgRoi,
        specialistScore,
      };
    }).sort((a, b) => b.specialistScore - a.specialistScore || b.contributionCount - a.contributionCount);

    const chartRows = rankedBots.slice(0, 8).map((bot) => ({
      name: bot.name.length > 12 ? `${bot.name.slice(0, 12)}…` : bot.name,
      contributions: bot.contributionCount,
      success: bot.avgSuccess,
    }));

    const trendRows = rankedBots.slice(0, 5).map((bot) => ({
      name: bot.name.length > 12 ? `${bot.name.slice(0, 12)}…` : bot.name,
      roi: bot.avgRoi,
      score: bot.specialistScore,
    }));

    return {
      rankedBots,
      chartRows,
      trendRows,
      totalRuns: runs.length,
      activeSpecialists: rankedBots.filter((bot) => bot.contributionCount > 0).length,
    };
  }, [bots, squads]);

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
        <p className="text-sm font-semibold text-foreground">Bot Specialist Ranking</p>
        <p className="mt-1 text-xs text-muted-foreground">Rank bots by historical contribution frequency and success across all squad runs.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <StatCard icon={Users} label="Total squad runs" value={analytics.totalRuns} />
        <StatCard icon={Award} label="Contributing specialists" value={analytics.activeSpecialists} />
        <StatCard icon={BarChart3} label="Tracked bots" value={analytics.rankedBots.length} />
      </div>

      {analytics.chartRows.length > 0 && (
        <div className="grid gap-4 xl:grid-cols-[1.2fr,1fr]">
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="mb-3 text-sm font-semibold text-foreground">Contribution frequency vs success rate</p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={analytics.chartRows}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                <Bar dataKey="contributions" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Contributions" />
                <Bar dataKey="success" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} name="Avg success %" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="mb-3 text-sm font-semibold text-foreground">Top specialist scores</p>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={analytics.trendRows}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={3} name="Specialist score" />
                <Line type="monotone" dataKey="roi" stroke="hsl(var(--chart-3))" strokeWidth={3} name="Avg ROI" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="mb-3 text-sm font-semibold text-foreground">Specialist leaderboard</p>
        <div className="space-y-2">
          {analytics.rankedBots.length === 0 && <p className="text-xs text-muted-foreground">No squad history yet.</p>}
          {analytics.rankedBots.map((bot, index) => (
            <div key={bot.id} className="rounded-xl border border-border bg-secondary/30 px-3 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">#{index + 1} {bot.name}</p>
                <p className="text-[11px] text-muted-foreground capitalize">{bot.role} · {bot.contributionCount} contributions · {bot.avgSuccess}% success · {bot.avgRoi}% ROI</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-primary">{bot.specialistScore}</p>
                <p className="text-[10px] text-muted-foreground">score</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}