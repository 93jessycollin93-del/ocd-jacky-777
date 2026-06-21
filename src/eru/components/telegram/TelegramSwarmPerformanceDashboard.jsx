import { useMemo } from 'react';
import { Activity, Clock3, GitBranch, Network } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  Cell,
} from 'recharts';

const COLORS = ['#14b8a6', '#6366f1', '#22c55e', '#f59e0b', '#ec4899', '#8b5cf6'];

function estimateLatency(item) {
  const promptSize = (item.prompt_context || '').length;
  const resultSize = (item.result || '').length;
  return Math.max(80, Math.round((promptSize + resultSize) / 12));
}

export default function TelegramSwarmPerformanceDashboard({ bot, sessions = [] }) {
  const metrics = useMemo(() => {
    const specialistMap = {};
    const delegationMap = {};
    const runTrendMap = {};
    let totalRuns = 0;
    let totalSpecialistCalls = 0;

    sessions.forEach((session) => {
      (session.swarm_history || []).forEach((run) => {
        totalRuns += 1;
        const dayKey = new Date(run.created_at || session.updated_date || new Date().toISOString()).toLocaleDateString([], { month: 'short', day: 'numeric' });
        if (!runTrendMap[dayKey]) {
          runTrendMap[dayKey] = { name: dayKey, requests: 0, specialistCalls: 0 };
        }
        runTrendMap[dayKey].requests += 1;

        (run.specialist_contexts || []).forEach((item) => {
          totalSpecialistCalls += 1;
          runTrendMap[dayKey].specialistCalls += 1;
          const specialistKey = item.bot_id || item.bot_name || 'unknown';
          if (!specialistMap[specialistKey]) {
            specialistMap[specialistKey] = {
              name: item.bot_name || 'Specialist',
              activity: 0,
              totalLatency: 0,
              avgLatency: 0,
            };
          }
          const latency = estimateLatency(item);
          specialistMap[specialistKey].activity += 1;
          specialistMap[specialistKey].totalLatency += latency;
          specialistMap[specialistKey].avgLatency = Math.round(specialistMap[specialistKey].totalLatency / specialistMap[specialistKey].activity);

          const routeKey = `${run.router_bot_name || bot?.name || 'Router'} → ${item.bot_name || 'Specialist'}`;
          delegationMap[routeKey] = (delegationMap[routeKey] || 0) + 1;
        });
      });
    });

    return {
      totalRuns,
      totalSpecialistCalls,
      avgSpecialistsPerRun: totalRuns ? Number((totalSpecialistCalls / totalRuns).toFixed(1)) : 0,
      specialistActivity: Object.values(specialistMap).sort((a, b) => b.activity - a.activity).slice(0, 8),
      delegationPatterns: Object.entries(delegationMap)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8),
      runTrend: Object.values(runTrendMap).slice(-7),
    };
  }, [sessions, bot?.name]);

  if (!bot?.swarm_enabled) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Network className="w-4 h-4 text-primary" />
            <p className="text-sm font-semibold">Swarm performance dashboard</p>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">See which specialists are most active, how fast they respond, and which delegation routes are working most often.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="rounded-lg border border-border bg-background p-3">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><Activity className="w-3.5 h-3.5" /><span className="text-[10px] uppercase">Swarm runs</span></div>
          <p className="text-lg font-semibold">{metrics.totalRuns}</p>
        </div>
        <div className="rounded-lg border border-border bg-background p-3">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><Network className="w-3.5 h-3.5" /><span className="text-[10px] uppercase">Specialist calls</span></div>
          <p className="text-lg font-semibold">{metrics.totalSpecialistCalls}</p>
        </div>
        <div className="rounded-lg border border-border bg-background p-3">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><GitBranch className="w-3.5 h-3.5" /><span className="text-[10px] uppercase">Delegation routes</span></div>
          <p className="text-lg font-semibold">{metrics.delegationPatterns.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-background p-3">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><Clock3 className="w-3.5 h-3.5" /><span className="text-[10px] uppercase">Avg specialists/run</span></div>
          <p className="text-lg font-semibold">{metrics.avgSpecialistsPerRun}</p>
        </div>
      </div>

      {metrics.totalRuns === 0 ? (
        <div className="rounded-xl border border-border bg-background p-4 text-xs text-muted-foreground">
          No swarm runs recorded yet for this bot.
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="rounded-xl border border-border bg-background p-3 space-y-3 xl:col-span-1">
            <p className="text-sm font-semibold">Most active specialists</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.specialistActivity}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="activity" radius={[6, 6, 0, 0]}>
                    {metrics.specialistActivity.map((entry, index) => <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-background p-3 space-y-3 xl:col-span-1">
            <p className="text-sm font-semibold">Average specialist latency</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.specialistActivity}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip formatter={(value) => [`${value} ms`, 'Avg latency']} />
                  <Bar dataKey="avgLatency" fill="#22c55e" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-background p-3 space-y-3 xl:col-span-1">
            <p className="text-sm font-semibold">Top delegation patterns</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.delegationPatterns} layout="vertical" margin={{ left: 12, right: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                  <XAxis type="number" stroke="#94a3b8" fontSize={12} />
                  <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={11} width={120} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#f59e0b" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-background p-3 space-y-3 xl:col-span-3">
            <p className="text-sm font-semibold">Swarm request trend</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metrics.runTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip />
                  <Line type="monotone" dataKey="requests" stroke="#14b8a6" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="specialistCalls" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}