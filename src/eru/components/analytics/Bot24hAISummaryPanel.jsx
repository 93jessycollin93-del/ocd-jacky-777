import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/eru/api/base44Client';
import { Bot, RefreshCw, Sparkles, TrendingUp, Trophy, Lightbulb } from 'lucide-react';

function MetricCard({ icon: Icon, label, value, hint, tone }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className={`mt-2 text-2xl font-bold ${tone}`}>{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        </div>
        <div className="rounded-xl border border-border bg-secondary/50 p-2">
          <Icon className={`h-4 w-4 ${tone}`} />
        </div>
      </div>
    </div>
  );
}

export default function Bot24hAISummaryPanel() {
  const [bots, setBots] = useState([]);
  const [outputLogs, setOutputLogs] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [testRuns, setTestRuns] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const cutoff = useMemo(() => Date.now() - (24 * 60 * 60 * 1000), []);

  const load = async (withRefresh = false) => {
    if (withRefresh) setRefreshing(true);
    else setLoading(true);

    const [botRows, outputRows, activityRows, runRows] = await Promise.all([
      base44.entities.UserBot.list('-updated_date', 100),
      base44.entities.BotFarmOutputLog.list('-created_date', 300).catch(() => []),
      base44.entities.BotFarmActivityHistory.list('-created_date', 300).catch(() => []),
      base44.entities.BotTestRun.list('-created_date', 300).catch(() => []),
    ]);

    const activeBots = (botRows || []).filter((bot) => bot.status === 'active');
    const recentOutputs = (outputRows || []).filter((item) => new Date(item.created_date || item.updated_date).getTime() >= cutoff);
    const recentActivity = (activityRows || []).filter((item) => new Date(item.created_date || item.updated_date).getTime() >= cutoff);
    const recentRuns = (runRows || []).filter((item) => new Date(item.created_date || item.updated_date).getTime() >= cutoff);

    setBots(activeBots);
    setOutputLogs(recentOutputs);
    setActivityLogs(recentActivity);
    setTestRuns(recentRuns);

    const botStats = activeBots.map((bot) => {
      const botOutputs = recentOutputs.filter((item) => item.bot_id === bot.id);
      const botRuns = recentRuns.filter((item) => item.bot_id === bot.id);
      const botEvents = recentActivity.filter((item) => item.actor_id === bot.id || item.actor_type === 'bot' && item.actor_id === bot.id);
      const winRate = botRuns.length ? Math.round((botRuns.filter((item) => item.passed).length / botRuns.length) * 100) : 0;
      const roiScore = Math.round(
        botOutputs.reduce((sum, item) => sum + Number(item.value_score || 0), 0) +
        botOutputs.reduce((sum, item) => sum + Number(item.quality_score || 0), 0) * 0.35 +
        botEvents.reduce((sum, item) => sum + Number(item.impact_score || 0), 0) * 0.5
      );

      return {
        id: bot.id,
        name: bot.name,
        role: bot.role || 'bot',
        outputs: botOutputs.length,
        events: botEvents.length,
        winRate,
        roiScore,
        averageValue: botOutputs.length ? Math.round(botOutputs.reduce((sum, item) => sum + Number(item.value_score || 0), 0) / botOutputs.length) : 0,
        summaries: botOutputs.slice(0, 5).map((item) => item.summary).filter(Boolean),
      };
    }).filter((item) => item.outputs > 0 || item.events > 0 || item.winRate > 0);

    const fleetRoi = botStats.reduce((sum, item) => sum + item.roiScore, 0);
    const avgWinRate = botStats.length ? Math.round(botStats.reduce((sum, item) => sum + item.winRate, 0) / botStats.length) : 0;
    const bestBot = [...botStats].sort((a, b) => b.roiScore - a.roiScore)[0] || null;

    let aiSummary = null;
    if (botStats.length > 0) {
      aiSummary = await base44.integrations.Core.InvokeLLM({
        prompt: `You are analyzing the last 24 hours of active AI bot operations for an internal analytics dashboard.\n\nActive bot stats:\n${JSON.stringify(botStats, null, 2)}\n\nReturn JSON with:\n- executive_summary: short paragraph\n- roi_assessment: short paragraph\n- win_rate_assessment: short paragraph\n- strategy_improvements: array of 3 concise recommendations\n- strongest_bot: bot name\n- risk_flag: short phrase\n`,
        response_json_schema: {
          type: 'object',
          properties: {
            executive_summary: { type: 'string' },
            roi_assessment: { type: 'string' },
            win_rate_assessment: { type: 'string' },
            strategy_improvements: { type: 'array', items: { type: 'string' } },
            strongest_bot: { type: 'string' },
            risk_flag: { type: 'string' }
          },
          required: ['executive_summary', 'roi_assessment', 'win_rate_assessment', 'strategy_improvements', 'strongest_bot', 'risk_flag']
        }
      });
    }

    setSummary({
      fleetRoi,
      avgWinRate,
      bestBot,
      activeBotCount: activeBots.length,
      analyzedBotCount: botStats.length,
      totalOutputs: recentOutputs.length,
      totalEvents: recentActivity.length,
      botStats,
      aiSummary,
    });

    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return <div className="flex justify-center py-16"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">24h AI bot summary</h3>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">AI review of the last 24 hours across your active bots, with ROI, win rate, and strategy guidance.</p>
          </div>
          <button onClick={() => load(true)} className="rounded-xl border border-border bg-secondary px-3 py-2 text-xs font-medium text-foreground">
            <span className="inline-flex items-center gap-2"> <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Refresh</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <MetricCard icon={TrendingUp} label="Fleet ROI" value={summary?.fleetRoi ?? 0} hint="Combined 24h value and impact score across active bots" tone="text-primary" />
        <MetricCard icon={Trophy} label="Avg Win Rate" value={`${summary?.avgWinRate ?? 0}%`} hint="Average saved test win rate over the last 24 hours" tone="text-yellow-400" />
        <MetricCard icon={Bot} label="Active Bots" value={summary?.analyzedBotCount ?? 0} hint={`${summary?.activeBotCount ?? 0} active bots, ${summary?.totalOutputs ?? 0} outputs analyzed`} tone="text-blue-400" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
          <div>
            <p className="text-sm font-semibold text-foreground">AI executive readout</p>
            <p className="mt-2 text-sm text-muted-foreground">{summary?.aiSummary?.executive_summary || 'No recent active bot data was found in the last 24 hours.'}</p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-border bg-secondary/30 p-3">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">ROI assessment</p>
              <p className="mt-2 text-sm text-foreground">{summary?.aiSummary?.roi_assessment || 'No ROI insight available yet.'}</p>
            </div>
            <div className="rounded-xl border border-border bg-secondary/30 p-3">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Win rate assessment</p>
              <p className="mt-2 text-sm text-foreground">{summary?.aiSummary?.win_rate_assessment || 'No win-rate insight available yet.'}</p>
            </div>
          </div>

          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Top bot + risk flag</p>
            <p className="mt-2 text-sm text-foreground"><span className="font-semibold text-primary">{summary?.aiSummary?.strongest_bot || summary?.bestBot?.name || 'N/A'}</span> is leading the last 24h window.</p>
            <p className="mt-1 text-xs text-muted-foreground">Risk flag: {summary?.aiSummary?.risk_flag || 'No major risk flagged.'}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">Strategy improvements</p>
          </div>
          <div className="mt-4 space-y-3">
            {(summary?.aiSummary?.strategy_improvements || []).length === 0 && (
              <p className="text-sm text-muted-foreground">No recommendations yet.</p>
            )}
            {(summary?.aiSummary?.strategy_improvements || []).map((item, index) => (
              <div key={`${item}-${index}`} className="rounded-xl border border-border bg-secondary/30 p-3">
                <p className="text-sm text-foreground">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-sm font-semibold text-foreground">Active bot breakdown</p>
        <div className="mt-3 space-y-2">
          {(summary?.botStats || []).length === 0 && <p className="text-sm text-muted-foreground">No active bot logs in the last 24 hours.</p>}
          {(summary?.botStats || []).map((bot) => (
            <div key={bot.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-secondary/30 px-3 py-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{bot.name}</p>
                <p className="text-[11px] text-muted-foreground">{bot.role} · {bot.outputs} outputs · {bot.events} events · {bot.averageValue} avg value</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-primary">ROI {bot.roiScore}</p>
                <p className="text-[11px] text-muted-foreground">Win {bot.winRate}%</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}