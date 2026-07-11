import { useMemo } from 'react';
import { Activity, Bot, CheckCircle2, Timer } from 'lucide-react';

function StatCard({ icon, label, value, hint }) {
  const IconComponent = icon;

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <IconComponent className="h-4 w-4" />
        <span className="text-[11px] uppercase tracking-wider">{label}</span>
      </div>
      <p className="mt-3 text-2xl font-semibold text-foreground">{value}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
}

export default function AgentActivityDashboard({ tasks = [], runs = [] }) {
  const summary = useMemo(() => {
    const activeTasks = tasks.filter((task) => task.status === 'active').length;
    const totalRuns = runs.length;
    const successRuns = runs.filter((run) => run.status === 'success').length;
    const avgDuration = runs.length ? Math.round(runs.reduce((sum, run) => sum + (run.duration_ms || 0), 0) / runs.length) : 0;
    return { activeTasks, totalRuns, successRuns, avgDuration };
  }, [tasks, runs]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Bot} label="Custom tasks" value={tasks.length} hint="Saved task workflows" />
        <StatCard icon={Activity} label="Active now" value={summary.activeTasks} hint="Tasks currently enabled" />
        <StatCard icon={CheckCircle2} label="Successful runs" value={summary.successRuns} hint="Completed without errors" />
        <StatCard icon={Timer} label="Avg duration" value={`${summary.avgDuration}ms`} hint="Average execution speed" />
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-foreground">Recent activity</p>
            <p className="text-[11px] text-muted-foreground">Latest agent executions and workflow results</p>
          </div>
          <span className="text-[11px] text-muted-foreground">{summary.totalRuns} total runs</span>
        </div>

        <div className="mt-4 space-y-2">
          {runs.length === 0 ? (
            <div className="text-xs text-muted-foreground">No activity yet.</div>
          ) : runs.slice(0, 12).map((run) => (
            <div key={run.id} className="rounded-xl border border-border bg-background px-3 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-semibold text-foreground">{run.task_name}</p>
                <span className={`rounded-full px-2 py-0.5 text-[10px] ${run.status === 'success' ? 'bg-green-400/10 text-green-400' : run.status === 'error' ? 'bg-red-400/10 text-red-400' : 'bg-secondary text-muted-foreground'}`}>{run.status}</span>
                <span className="text-[10px] text-muted-foreground">{run.bot_name}</span>
                <span className="text-[10px] text-muted-foreground">{run.trigger_type}</span>
                <span className="text-[10px] text-muted-foreground">{run.action_type}</span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">{run.result_summary || run.details || 'No summary available.'}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}