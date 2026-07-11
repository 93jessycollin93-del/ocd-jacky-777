import { BrainCircuit, ShieldAlert, Wrench, RefreshCw } from 'lucide-react';
import { getPredictiveBotInsight, getPredictiveSquadInsight } from './BotFarmPredictiveUtils';

function tone(action) {
  if (action === 'quarantine') return 'border-red-500/20 bg-red-500/10 text-red-300';
  if (action === 'repair') return 'border-orange-500/20 bg-orange-500/10 text-orange-300';
  if (action === 'rest') return 'border-yellow-500/20 bg-yellow-500/10 text-yellow-300';
  if (action === 'reallocate') return 'border-blue-500/20 bg-blue-500/10 text-blue-300';
  return 'border-primary/20 bg-primary/10 text-primary';
}

export default function BotFarmOptimizationPanel({ bots, squads, tasks, maintenanceLogs, onAutoOptimize, optimizing }) {
  const botInsights = bots
    .map((bot) => ({ bot, insight: getPredictiveBotInsight(bot, maintenanceLogs, tasks, squads) }))
    .sort((a, b) => (b.insight.failureRisk + b.insight.inefficiencyRisk) - (a.insight.failureRisk + a.insight.inefficiencyRisk))
    .slice(0, 6);

  const squadInsights = squads
    .filter((squad) => squad.role_type === 'task')
    .map((squad) => ({ squad, insight: getPredictiveSquadInsight(squad, bots, tasks, maintenanceLogs) }))
    .sort((a, b) => b.insight.projectedOverload - a.insight.projectedOverload)
    .slice(0, 4);

  return (
    <section className="rounded-2xl border border-border bg-card p-4 space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <BrainCircuit className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">Predictive Optimization Center</p>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">AI-style forecasting surfaces likely failures, low-capacity bots, and squad bottlenecks before they hit active missions.</p>
        </div>
        <button
          onClick={onAutoOptimize}
          disabled={optimizing}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-40"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${optimizing ? 'animate-spin' : ''}`} /> Auto Optimize Now
        </button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr,0.9fr]">
        <div className="space-y-3">
          <p className="text-xs font-semibold text-foreground">Highest-risk bots</p>
          {botInsights.map(({ bot, insight }) => (
            <div key={bot.id} className="rounded-xl border border-border bg-background p-3 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-foreground">{bot.name}</p>
                  <p className="text-[10px] text-muted-foreground">{insight.squadName} · {insight.assignedTaskCount} active tasks</p>
                </div>
                <div className={`rounded-full border px-2 py-1 text-[10px] font-medium ${tone(insight.recommendedAction)}`}>
                  {insight.recommendedAction}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground sm:grid-cols-4">
                <div className="rounded-lg border border-border px-2 py-2">Failure risk <span className="text-foreground">{insight.failureRisk}</span></div>
                <div className="rounded-lg border border-border px-2 py-2">Inefficiency <span className="text-foreground">{insight.inefficiencyRisk}</span></div>
                <div className="rounded-lg border border-border px-2 py-2">Capacity <span className="text-foreground">{insight.projectedCapacity}%</span></div>
                <div className="rounded-lg border border-border px-2 py-2">Errors <span className="text-foreground">{insight.errorRate}</span></div>
              </div>
              <div className="rounded-xl border border-border bg-card p-3 text-[11px] text-muted-foreground">
                {insight.summary}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold text-foreground">Squad optimization proposals</p>
          {squadInsights.map(({ squad, insight }) => (
            <div key={squad.id} className="rounded-xl border border-border bg-background p-3 space-y-2">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-primary" />
                <p className="text-xs font-semibold text-foreground">{squad.name}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground">
                <div className="rounded-lg border border-border px-2 py-2">Projected overload <span className="text-foreground">{insight.projectedOverload}</span></div>
                <div className="rounded-lg border border-border px-2 py-2">At-risk bots <span className="text-foreground">{insight.atRiskBots}</span></div>
                <div className="rounded-lg border border-border px-2 py-2">Capacity <span className="text-foreground">{insight.avgCapacity}%</span></div>
                <div className="rounded-lg border border-border px-2 py-2">Failure avg <span className="text-foreground">{insight.avgFailureRisk}</span></div>
              </div>
              <div className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-[11px] text-muted-foreground">
                <Wrench className="h-3.5 w-3.5 text-primary" /> {insight.recommendation}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}