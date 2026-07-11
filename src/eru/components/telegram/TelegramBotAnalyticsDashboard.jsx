import { useMemo } from 'react';
import { Activity, AlertTriangle, Brain, Clock3, MessageSquare, Users } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const PIE_COLORS = ['#14b8a6', '#6366f1', '#f59e0b', '#ef4444'];

function getDayLabel(value) {
  return new Date(value).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function formatDuration(seconds) {
  if (!seconds) return '0m';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return `${hours}h ${remaining}m`;
}

export default function TelegramBotAnalyticsDashboard({ bot, messages = [], logs = [], sessions = [], comparisons = [] }) {
  const metrics = useMemo(() => {
    const incoming = messages.filter((message) => message.direction === 'incoming');
    const outgoing = messages.filter((message) => message.direction === 'outgoing');
    const errors = logs.filter((log) => log.level === 'error');
    const uniqueUsers = new Set(sessions.map((session) => session.telegram_user_id || session.telegram_chat_id).filter(Boolean)).size;
    const avgLatencyValues = messages.filter((message) => typeof message.latency_ms === 'number').map((message) => message.latency_ms);
    const avgLatency = avgLatencyValues.length ? Math.round(avgLatencyValues.reduce((sum, value) => sum + value, 0) / avgLatencyValues.length) : 0;
    const sessionDurations = sessions.map((session) => {
      const start = new Date(session.created_date || session.last_message_at || Date.now()).getTime();
      const end = new Date(session.last_message_at || session.updated_date || Date.now()).getTime();
      return Math.max(0, Math.round((end - start) / 1000));
    });
    const avgSessionDuration = sessionDurations.length ? Math.round(sessionDurations.reduce((sum, value) => sum + value, 0) / sessionDurations.length) : 0;
    const engagementRate = sessions.length ? Number((messages.length / sessions.length).toFixed(1)) : 0;
    const containmentRate = incoming.length ? Math.max(0, Math.min(100, Math.round((outgoing.length / incoming.length) * 100))) : 0;
    const errorRate = messages.length ? Number(((errors.length / messages.length) * 100).toFixed(1)) : 0;

    return {
      incoming: incoming.length,
      outgoing: outgoing.length,
      totalMessages: messages.length,
      errors: errors.length,
      uniqueUsers,
      avgLatency,
      avgSessionDuration,
      engagementRate,
      containmentRate,
      errorRate,
    };
  }, [messages, logs, sessions]);

  const volumeTrend = useMemo(() => {
    const map = messages.reduce((acc, message) => {
      const key = getDayLabel(message.created_date || new Date().toISOString());
      if (!acc[key]) acc[key] = { name: key, incoming: 0, outgoing: 0, total: 0 };
      acc[key].total += 1;
      if (message.direction === 'incoming') acc[key].incoming += 1;
      if (message.direction === 'outgoing') acc[key].outgoing += 1;
      return acc;
    }, {});
    return Object.values(map).slice(-7);
  }, [messages]);

  const errorTrend = useMemo(() => {
    const map = logs.reduce((acc, log) => {
      const key = getDayLabel(log.created_date || new Date().toISOString());
      if (!acc[key]) acc[key] = { name: key, error: 0, warn: 0, info: 0 };
      if (log.level === 'error') acc[key].error += 1;
      if (log.level === 'warn') acc[key].warn += 1;
      if (log.level === 'info') acc[key].info += 1;
      return acc;
    }, {});
    return Object.values(map).slice(-7);
  }, [logs]);

  const sessionDistribution = useMemo(() => {
    const short = sessions.filter((session) => Number(session.message_count || 0) <= 3).length;
    const medium = sessions.filter((session) => Number(session.message_count || 0) > 3 && Number(session.message_count || 0) <= 10).length;
    const long = sessions.filter((session) => Number(session.message_count || 0) > 10).length;
    return [
      { name: 'Short', value: short },
      { name: 'Medium', value: medium },
      { name: 'Long', value: long },
    ].filter((item) => item.value > 0);
  }, [sessions]);

  const commandUsage = useMemo(() => {
    const map = messages.reduce((acc, message) => {
      if (message.message_type !== 'command') return acc;
      const key = message.content?.split(' ')[0] || 'command';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(map).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 6);
  }, [messages]);

  const aiInsights = useMemo(() => {
    const comparison = comparisons.find((item) => item.bot_id === bot?.id || item.bot_name === bot?.name);
    return [
      {
        label: 'Response coverage',
        value: `${metrics.containmentRate}%`,
        note: metrics.containmentRate >= 90 ? 'Strong reply coverage across inbound requests.' : 'Consider refining prompts or adding more structured knowledge.'
      },
      {
        label: 'Operational reliability',
        value: `${Math.max(0, 100 - metrics.errorRate).toFixed(1)}%`,
        note: metrics.errorRate <= 5 ? 'Low error pressure.' : 'Errors are noticeable and worth checking in recent logs.'
      },
      {
        label: 'Version accuracy',
        value: comparison ? `${Math.max(comparison.accuracy_a || 0, comparison.accuracy_b || 0)}%` : 'N/A',
        note: comparison ? 'Pulled from saved bot comparison history.' : 'No comparison baseline has been recorded yet.'
      }
    ];
  }, [comparisons, bot, metrics]);

  const cards = [
    { label: 'Message volume', value: metrics.totalMessages, hint: `${metrics.incoming} in / ${metrics.outgoing} out`, Icon: MessageSquare },
    { label: 'User engagement', value: metrics.engagementRate, hint: 'messages per session', Icon: Users },
    { label: 'Error rate', value: `${metrics.errorRate}%`, hint: `${metrics.errors} error logs`, Icon: AlertTriangle },
    { label: 'Session duration', value: formatDuration(metrics.avgSessionDuration), hint: 'average active window', Icon: Clock3 },
    { label: 'Active sessions', value: sessions.length, hint: `${metrics.uniqueUsers} unique users`, Icon: Activity },
    { label: 'AI latency', value: `${metrics.avgLatency}ms`, hint: 'average measured response time', Icon: Brain },
  ];

  if (!bot) return null;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4 space-y-2">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="text-sm font-semibold text-foreground">{bot.name} performance dashboard</p>
            <p className="text-[11px] text-muted-foreground">Monitor message volume, engagement, reliability, session health, and AI performance for this Telegram bot.</p>
          </div>
          <div className="rounded-full border border-border bg-secondary px-3 py-1 text-[10px] uppercase text-muted-foreground">
            {bot.swarm_enabled ? 'Swarm bot' : 'Independent bot'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
        {cards.map(({ label, value, hint, Icon: StatIcon }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <StatIcon className="w-4 h-4" />
              <span className="text-[10px] uppercase">{label}</span>
            </div>
            <p className="text-2xl font-semibold text-foreground">{value}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 space-y-3 xl:col-span-2">
          <p className="text-sm font-semibold text-foreground">Message trend</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={volumeTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip />
                <Line type="monotone" dataKey="total" stroke="#14b8a6" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="incoming" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="outgoing" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <p className="text-sm font-semibold text-foreground">Session depth</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={sessionDistribution} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={4}>
                  {sessionDistribution.map((entry, index) => (
                    <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 space-y-3 xl:col-span-2">
          <p className="text-sm font-semibold text-foreground">Error and warning trend</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={errorTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip />
                <Bar dataKey="error" fill="#ef4444" radius={[6, 6, 0, 0]} />
                <Bar dataKey="warn" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                <Bar dataKey="info" fill="#14b8a6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <p className="text-sm font-semibold text-foreground">Top commands</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={commandUsage} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                <XAxis type="number" stroke="#94a3b8" fontSize={12} />
                <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={12} width={80} />
                <Tooltip />
                <Bar dataKey="count" fill="#8b5cf6" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">AI performance insights</p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {aiInsights.map((insight) => (
            <div key={insight.label} className="rounded-xl border border-border bg-background p-3">
              <p className="text-[10px] uppercase text-muted-foreground">{insight.label}</p>
              <p className="mt-2 text-xl font-semibold text-foreground">{insight.value}</p>
              <p className="mt-2 text-[11px] text-muted-foreground">{insight.note}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}