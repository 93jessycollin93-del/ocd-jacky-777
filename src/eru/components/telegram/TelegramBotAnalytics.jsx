import { Activity, AlertTriangle, Clock3, MessageSquare } from 'lucide-react';

export default function TelegramBotAnalytics({ bot, messages = [], logs = [], sessions = [] }) {
  if (!bot) return null;

  const incoming = messages.filter((message) => message.direction === 'incoming').length;
  const outgoing = messages.filter((message) => message.direction === 'outgoing').length;
  const errors = logs.filter((log) => log.level === 'error').length;
  const latencyValues = messages.filter((message) => typeof message.latency_ms === 'number').map((message) => message.latency_ms);
  const avgLatency = latencyValues.length ? Math.round(latencyValues.reduce((sum, value) => sum + value, 0) / latencyValues.length) : 0;

  const stats = [
    { label: 'Messages', value: messages.length, Icon: MessageSquare },
    { label: 'Sessions', value: sessions.length, Icon: Activity },
    { label: 'Errors', value: errors, Icon: AlertTriangle },
    { label: 'Avg Latency', value: `${avgLatency}ms`, Icon: Clock3 },
  ];

  const modeLabel = bot.swarm_enabled ? 'Swarm routing' : 'Independent bot';

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{bot.name} analytics</p>
          <p className="text-[11px] text-muted-foreground">Detailed activity snapshot for this bot · {modeLabel}</p>
        </div>
        <div className="text-right text-[11px] text-muted-foreground">
          <p>In {incoming}</p>
          <p>Out {outgoing}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {stats.map(({ label, value, Icon: StatIcon }) => (
          <div key={label} className="rounded-lg bg-secondary/60 border border-border p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <StatIcon className="w-3.5 h-3.5" />
              <span className="text-[10px] uppercase">{label}</span>
            </div>
            <p className="text-lg font-semibold">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}