import { Activity, BarChart3, Clock3, Cpu, Gauge, TrendingUp } from 'lucide-react';

function StatCard({ icon: IconComponent, label, value, hint, tone = 'primary' }) {
  const toneMap = {
    primary: 'text-primary bg-primary/10 border-primary/20',
    blue: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    yellow: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
    red: 'text-red-400 bg-red-400/10 border-red-400/20',
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        </div>
        <div className={`rounded-xl border p-2 ${toneMap[tone] || toneMap.primary}`}>
          <IconComponent className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsHubOverview({ summary }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Clock3} label="Load Time" value={`${summary.avgLoadTime}ms`} hint="Average app and screen loading speed" />
        <StatCard icon={Gauge} label="API Response" value={`${summary.avgApiResponse}ms`} hint="Average backend and connector response time" tone="blue" />
        <StatCard icon={BarChart3} label="Render Cost" value={`${summary.avgRenderTime}ms`} hint="UI rendering performance trend" tone="yellow" />
        <StatCard icon={Cpu} label="Resource Use" value={`${summary.resourceUtilization}%`} hint="Estimated utilization across tracked services" tone="red" />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-4 md:col-span-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Proactive trend analysis</h3>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-secondary/40 p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Latency trend</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{summary.latencyTrend}</p>
            </div>
            <div className="rounded-xl border border-border bg-secondary/40 p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Rendering trend</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{summary.renderTrend}</p>
            </div>
            <div className="rounded-xl border border-border bg-secondary/40 p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Issue detection</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{summary.issueDetection}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Health snapshot</h3>
          </div>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Healthy services</span>
              <span className="font-semibold text-green-400">{summary.healthyServices}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Degraded services</span>
              <span className="font-semibold text-yellow-400">{summary.degradedServices}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Critical alerts</span>
              <span className="font-semibold text-red-400">{summary.criticalAlerts}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-secondary">
              <div className="h-full rounded-full bg-primary" style={{ width: `${summary.healthScore}%` }} />
            </div>
            <p className="text-xs text-muted-foreground">Overall health score: {summary.healthScore}% based on live telemetry and historical alerts.</p>
          </div>
        </div>
      </div>
    </div>
  );
}