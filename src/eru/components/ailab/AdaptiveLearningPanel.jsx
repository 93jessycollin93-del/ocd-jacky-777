import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/eru/api/base44Client';
import { Brain, RefreshCw, TrendingUp } from 'lucide-react';

export default function AdaptiveLearningPanel({ bots, onBotsUpdated }) {
  const [improvements, setImprovements] = useState([]);
  const [runs, setRuns] = useState([]);
  const [learning, setLearning] = useState(false);

  const load = async () => {
    const [improvementRows, runRows] = await Promise.all([
      base44.entities.BotImprovement.list('-created_date', 100),
      base44.entities.BotTestRun.list('-created_date', 200),
    ]);
    setImprovements(improvementRows);
    setRuns(runRows);
  };

  useEffect(() => {
    load();
  }, []);

  const summaries = useMemo(() => bots.map((bot) => {
    const botRuns = runs.filter((item) => item.bot_id === bot.id).slice(0, 12);
    const botImprovements = improvements.filter((item) => item.bot_id === bot.id).slice(0, 3);
    const passRate = botRuns.length ? Math.round((botRuns.filter((item) => item.passed).length / botRuns.length) * 100) : 0;
    const regressions = botRuns.filter((item) => item.regression_flag).length;
    return {
      id: bot.id,
      name: bot.name,
      passRate,
      regressions,
      latestImprovement: botImprovements[0],
    };
  }), [bots, runs, improvements]);

  const triggerLearning = async () => {
    setLearning(true);
    await base44.functions.invoke('adaptBotStrategyFromPerformance', {});
    await load();
    onBotsUpdated?.();
    setLearning(false);
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">Adaptive learning loop</p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Bots learn from recent wins, failures, regressions, and past improvement notes to refine future strategy and effort allocation.</p>
        </div>
        <button onClick={triggerLearning} disabled={learning} className="inline-flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary disabled:opacity-40">
          <RefreshCw className={`w-3.5 h-3.5 ${learning ? 'animate-spin' : ''}`} /> {learning ? 'Learning...' : 'Run adaptive learning'}
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {summaries.map((item) => (
          <div key={item.id} className="rounded-xl border border-border bg-background p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-foreground">{item.name}</p>
              <span className="text-[10px] text-primary">{item.passRate}% pass</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="rounded-lg bg-secondary p-2 text-muted-foreground">Pass rate <span className="font-semibold text-foreground">{item.passRate}%</span></div>
              <div className="rounded-lg bg-secondary p-2 text-muted-foreground">Regressions <span className="font-semibold text-foreground">{item.regressions}</span></div>
            </div>
            {item.latestImprovement ? (
              <div className="rounded-lg border border-border bg-card p-2">
                <div className="flex items-center gap-1 text-[11px] font-medium text-foreground">
                  <TrendingUp className="w-3.5 h-3.5 text-primary" /> Latest learning
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">{item.latestImprovement.improvement}</p>
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground">No adaptive learning update yet.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}