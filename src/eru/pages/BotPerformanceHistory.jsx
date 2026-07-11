import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/eru/api/base44Client';
import { Activity, Bot, Clock3, TrendingUp } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

function dayKey(value) {
  const date = new Date(value);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function buildDailyRange(days = 14) {
  const items = [];
  for (let index = days - 1; index >= 0; index -= 1) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - index);
    items.push({ key: dayKey(date), date });
  }
  return items;
}

function StatCard({ label, value, hint, icon: IconComponent, color }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <IconComponent className={`w-4 h-4 mb-2 ${color}`} />
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs font-semibold text-foreground">{label}</p>
      <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>
    </div>
  );
}

export default function BotPerformanceHistory() {
  const [bots, setBots] = useState([]);
  const [testRuns, setTestRuns] = useState([]);
  const [memoryChunks, setMemoryChunks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.UserBot.list('-updated_date', 100),
      base44.entities.BotTestRun.list('-created_date', 500),
      base44.entities.BotMemoryChunk.list('-created_date', 500).catch(() => []),
    ]).then(([botRows, runRows, memoryRows]) => {
      setBots(botRows || []);
      setTestRuns(runRows || []);
      setMemoryChunks(memoryRows || []);
      setLoading(false);
    });
  }, []);

  const leaderboard = useMemo(() => {
    return bots.map((bot) => {
      const botRuns = testRuns.filter((run) => run.bot_id === bot.id);
      const passes = botRuns.filter((run) => run.passed).length;
      const successRate = botRuns.length ? Math.round((passes / botRuns.length) * 100) : 0;
      const activeMinutes = memoryChunks
        .filter((chunk) => chunk.bot_id === bot.id)
        .reduce((sum, chunk) => sum + Number(chunk.message_count || 0), 0) * 2;
      const roiScore = (bot.xp || 0) + (successRate * 8) + activeMinutes;

      return {
        id: bot.id,
        name: bot.name,
        xp: bot.xp || 0,
        usage: bot.usage_count || 0,
        successRate,
        activeMinutes,
        roiScore,
        level: bot.level || 1,
        status: bot.status || 'inactive',
      };
    }).sort((a, b) => b.roiScore - a.roiScore);
  }, [bots, testRuns, memoryChunks]);

  const xpChart = useMemo(() => leaderboard.slice(0, 8).map((bot) => ({
    name: bot.name.length > 12 ? `${bot.name.slice(0, 12)}…` : bot.name,
    xp: bot.xp,
    roi: bot.roiScore,
  })), [leaderboard]);

  const successChart = useMemo(() => leaderboard.slice(0, 8).map((bot) => ({
    name: bot.name.length > 12 ? `${bot.name.slice(0, 12)}…` : bot.name,
    successRate: bot.successRate,
    usage: bot.usage,
  })), [leaderboard]);

  const activitySeries = useMemo(() => {
    const range = buildDailyRange(14);

    return range.map((entry) => {
      const dayRuns = testRuns.filter((run) => dayKey(run.created_date || run.updated_date) === entry.key);
      const dayMemories = memoryChunks.filter((chunk) => dayKey(chunk.created_date || chunk.updated_date) === entry.key);
      const activeMinutes = dayMemories.reduce((sum, chunk) => sum + (Number(chunk.message_count || 0) * 2), 0);
      const successRate = dayRuns.length
        ? Math.round((dayRuns.filter((run) => run.passed).length / dayRuns.length) * 100)
        : 0;

      return {
        date: entry.key,
        activeMinutes,
        testRuns: dayRuns.length,
        successRate,
      };
    });
  }, [testRuns, memoryChunks]);

  const totals = useMemo(() => {
    const totalXP = leaderboard.reduce((sum, bot) => sum + bot.xp, 0);
    const avgSuccess = leaderboard.length ? Math.round(leaderboard.reduce((sum, bot) => sum + bot.successRate, 0) / leaderboard.length) : 0;
    const totalActiveMinutes = leaderboard.reduce((sum, bot) => sum + bot.activeMinutes, 0);
    return { totalXP, avgSuccess, totalActiveMinutes };
  }, [leaderboard]);

  if (loading) {
    return <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="px-4 py-3 border-b border-border">
        <h1 className="text-lg font-semibold flex items-center gap-2"><Bot className="w-5 h-5 text-primary" /> Bot Performance History</h1>
        <p className="text-xs text-muted-foreground">Track XP growth, success rates, and active bot time to compare ROI across your deployed bots.</p>
      </div>

      <div className="px-4 py-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatCard label="Total Bot XP" value={totals.totalXP} hint="Combined XP across your bot fleet" icon={TrendingUp} color="text-primary" />
          <StatCard label="Avg Success Rate" value={`${totals.avgSuccess}%`} hint="Based on saved bot test runs" icon={Activity} color="text-blue-400" />
          <StatCard label="Active Minutes" value={totals.totalActiveMinutes} hint="Estimated from bot memory activity" icon={Clock3} color="text-amber-400" />
        </div>

        {xpChart.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-sm font-semibold mb-3">XP growth and ROI ranking</p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={xpChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                <Legend />
                <Bar dataKey="xp" fill="hsl(var(--primary))" name="XP" radius={[4, 4, 0, 0]} />
                <Bar dataKey="roi" fill="hsl(var(--chart-2))" name="ROI Score" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {successChart.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-sm font-semibold mb-3">Task success rate by bot</p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={successChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                <Legend />
                <Bar dataKey="successRate" fill="hsl(var(--chart-3))" name="Success Rate %" radius={[4, 4, 0, 0]} />
                <Bar dataKey="usage" fill="hsl(var(--chart-4))" name="Usage Count" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {activitySeries.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-sm font-semibold mb-3">Active time-series</p>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={activitySeries}>
                <defs>
                  <linearGradient id="activeMinutesFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                <Legend />
                <Area type="monotone" dataKey="activeMinutes" stroke="hsl(var(--primary))" fill="url(#activeMinutesFill)" name="Active Minutes" strokeWidth={2} />
                <Area type="monotone" dataKey="testRuns" stroke="hsl(var(--chart-2))" fillOpacity={0} name="Test Runs" strokeWidth={2} />
                <Area type="monotone" dataKey="successRate" stroke="hsl(var(--chart-3))" fillOpacity={0} name="Success Rate %" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-sm font-semibold mb-3">Best ROI bots</p>
          <div className="space-y-2">
            {leaderboard.length === 0 && <p className="text-xs text-muted-foreground">No bot performance data yet.</p>}
            {leaderboard.slice(0, 10).map((bot, index) => (
              <div key={bot.id} className="rounded-xl border border-border bg-secondary/30 px-3 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">#{index + 1} {bot.name}</p>
                  <p className="text-[11px] text-muted-foreground">Lv.{bot.level} · {bot.status} · {bot.activeMinutes} active min · {bot.successRate}% success</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-primary">{Math.round(bot.roiScore)}</p>
                  <p className="text-[10px] text-muted-foreground">ROI score</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}