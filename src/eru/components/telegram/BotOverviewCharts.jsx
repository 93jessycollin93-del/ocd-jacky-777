import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
  Legend,
} from 'recharts';

const STATUS_COLORS = {
  active: '#22c55e',
  draft: '#64748b',
  offline: '#f59e0b',
  error: '#ef4444',
};

const getDayLabel = (value) => new Date(value).toLocaleDateString([], { month: 'short', day: 'numeric' });

export default function BotOverviewCharts({ bots = [], messages = [], logs = [], comparisons = [] }) {
  const statusData = Object.entries(
    bots.reduce((acc, bot) => {
      acc[bot.status || 'draft'] = (acc[bot.status || 'draft'] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  const modeData = [
    { name: 'Independent', value: bots.filter((bot) => !bot.swarm_enabled).length },
    { name: 'Swarm', value: bots.filter((bot) => !!bot.swarm_enabled).length }
  ].filter((item) => item.value > 0);

  const botVolumeData = bots.map((bot) => {
    const botMessages = messages.filter((message) => message.bot_id === bot.id);
    const sessions = new Set(botMessages.map((message) => message.telegram_chat_id).filter(Boolean)).size;
    return {
      name: bot.name?.slice(0, 12) || 'Bot',
      incoming: botMessages.filter((message) => message.direction === 'incoming').length,
      outgoing: botMessages.filter((message) => message.direction === 'outgoing').length,
      engagement: sessions ? Number((botMessages.length / sessions).toFixed(1)) : 0,
    };
  });

  const volumeOverTimeMap = messages.reduce((acc, message) => {
    const key = getDayLabel(message.created_date || new Date().toISOString());
    if (!acc[key]) acc[key] = { name: key, total: 0, incoming: 0, outgoing: 0 };
    acc[key].total += 1;
    if (message.direction === 'incoming') acc[key].incoming += 1;
    if (message.direction === 'outgoing') acc[key].outgoing += 1;
    return acc;
  }, {});
  const volumeOverTimeData = Object.values(volumeOverTimeMap).slice(-7);

  const activityData = messages
    .slice()
    .reverse()
    .slice(-7)
    .map((message, index) => ({
      name: `${index + 1}`,
      latency: typeof message.latency_ms === 'number' ? message.latency_ms : 0,
      errors: logs.filter((log) => log.bot_id === message.bot_id && log.level === 'error').length,
    }));

  const commandFlowMap = messages.reduce((acc, message) => {
    const key = message.message_type === 'command'
      ? message.content?.split(' ')[0]
      : message.message_type === 'callback'
      ? `flow:${message.content?.slice(0, 18) || 'callback'}`
      : null;
    if (!key) return acc;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const topCommandsFlows = Object.entries(commandFlowMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const accuracyData = comparisons.map((item) => ({
    name: item.bot_name?.slice(0, 12) || 'Bot',
    versionA: item.accuracy_a || 0,
    versionB: item.accuracy_b || 0,
  }));

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <p className="text-sm font-semibold">Bot status mix</p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={3}>
                {statusData.map((entry) => (
                  <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || '#14b8a6'} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <p className="text-sm font-semibold">Bot mode mix</p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={modeData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={3}>
                {modeData.map((entry) => (
                  <Cell key={entry.name} fill={entry.name === 'Swarm' ? '#14b8a6' : '#6366f1'} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-3 xl:col-span-1">
        <p className="text-sm font-semibold">Message volume by bot</p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={botVolumeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip />
              <Legend />
              <Bar dataKey="incoming" fill="#14b8a6" radius={[6, 6, 0, 0]} />
              <Bar dataKey="outgoing" fill="#6366f1" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-3 xl:col-span-2">
        <p className="text-sm font-semibold">Message volume over time</p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={volumeOverTimeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="total" stroke="#14b8a6" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="incoming" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="outgoing" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <p className="text-sm font-semibold">Engagement rate by bot</p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={botVolumeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip />
              <Bar dataKey="engagement" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-3 xl:col-span-2">
        <p className="text-sm font-semibold">Recent latency and error trend</p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={activityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="latency" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="errors" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <p className="text-sm font-semibold">Top commands and flows</p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topCommandsFlows} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
              <XAxis type="number" stroke="#94a3b8" fontSize={12} />
              <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={12} width={90} />
              <Tooltip />
              <Bar dataKey="count" fill="#f59e0b" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {accuracyData.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3 xl:col-span-3">
          <p className="text-sm font-semibold">Accuracy by bot version</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={accuracyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip />
                <Legend />
                <Bar dataKey="versionA" fill="#06b6d4" radius={[6, 6, 0, 0]} />
                <Bar dataKey="versionB" fill="#ec4899" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}