import { useEffect, useMemo, useState } from 'react';
import { FlaskConical, Play, PauseCircle, Trophy, BarChart3 } from 'lucide-react';
import { base44 } from '@/eru/api/base44Client';
import { getVariantMetrics, getWinningVariant } from './telegramExperimentUtils';

const DEFAULT_FORM = {
  name: '',
  optimization_metric: 'engagement_rate',
  traffic_source: 'live_plus_sandbox',
  variant_a_label: 'Variant A',
  variant_b_label: 'Variant B',
  variant_a_prompt: '',
  variant_b_prompt: '',
  minimum_sample_size: 20,
  engagement_threshold_messages: 2,
  auto_deploy_winner: false,
  conversion_keywords: ['buy', 'purchase', 'checkout', 'book', 'schedule', 'order', 'pay', 'sign up'],
  notes: '',
};

export default function TelegramABTestingPanel({ bot, sessions = [] }) {
  const [experiments, setExperiments] = useState([]);
  const [runs, setRuns] = useState([]);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [simulating, setSimulating] = useState(false);

  const load = async () => {
    if (!bot?.id) return;
    const [experimentRows, runRows] = await Promise.all([
      base44.entities.TelegramBotExperiment.filter({ bot_id: bot.id }, '-updated_date', 20),
      base44.entities.TelegramBotExperimentRun.filter({ bot_id: bot.id }, '-created_date', 400),
    ]);
    setExperiments(experimentRows);
    setRuns(runRows);
  };

  useEffect(() => { load(); }, [bot?.id]);

  const activeExperiment = experiments.find((item) => item.status === 'running') || experiments[0] || null;
  const activeRuns = useMemo(() => runs.filter((run) => run.experiment_id === activeExperiment?.id), [runs, activeExperiment?.id]);
  const result = useMemo(() => getWinningVariant(activeExperiment, activeRuns), [activeExperiment, activeRuns]);
  const aMetrics = getVariantMetrics(activeRuns, 'a');
  const bMetrics = getVariantMetrics(activeRuns, 'b');

  const createExperiment = async () => {
    if (!bot?.id) return;
    setSaving(true);
    await base44.entities.TelegramBotExperiment.create({
      ...form,
      bot_id: bot.id,
      bot_name: bot.name,
      status: 'draft',
    });
    setForm({ ...DEFAULT_FORM, variant_a_prompt: bot.system_prompt || '', variant_b_prompt: bot.system_prompt || '' });
    setSaving(false);
    load();
  };

  const updateExperimentStatus = async (experiment, status) => {
    const payload = { status };
    const winning = getWinningVariant(experiment, runs.filter((run) => run.experiment_id === experiment.id));

    if (status === 'completed') {
      payload.winner_variant = winning.winner;
      payload.winner_declared_at = new Date().toISOString();

      if (experiment.auto_deploy_winner && winning.winner !== 'none') {
        await base44.entities.TelegramBot.update(bot.id, {
          system_prompt: winning.winner === 'a' ? experiment.variant_a_prompt : experiment.variant_b_prompt
        });
      }
    }

    await base44.entities.TelegramBotExperiment.update(experiment.id, payload);
    load();
  };

  const simulateSandboxRound = async () => {
    if (!activeExperiment || !bot?.id) return;
    setSimulating(true);

    const sampleText = sessions[0]?.last_user_message || 'Tell me how this bot can help me and what I should do next.';
    const variants = [
      { key: 'a', prompt: activeExperiment.variant_a_prompt },
      { key: 'b', prompt: activeExperiment.variant_b_prompt },
    ];

    for (const variant of variants) {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a Telegram bot.
System prompt:\n${variant.prompt}\n\nUser message:\n${sampleText}\n\nWrite a concise Telegram-ready reply that aims for ${activeExperiment.optimization_metric === 'conversion_rate' ? 'conversion' : 'engagement'}.`
      });
      const output = typeof response === 'string' ? response : String(response);
      const conversionKeywords = activeExperiment.conversion_keywords || [];
      const converted = conversionKeywords.some((keyword) => output.toLowerCase().includes(String(keyword).toLowerCase()));
      const engaged = output.length > 120 || /\?|next step|option|choose|reply/i.test(output);

      await base44.entities.TelegramBotExperimentRun.create({
        experiment_id: activeExperiment.id,
        bot_id: bot.id,
        variant: variant.key,
        source: 'sandbox',
        session_id: sessions[0]?.id || '',
        input_message: sampleText,
        output_message: output,
        engaged,
        converted,
        score_snapshot: {
          output_length: output.length,
          optimization_metric: activeExperiment.optimization_metric
        }
      });
    }

    setSimulating(false);
    load();
  };

  if (!bot) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4">
      <div className="flex items-center gap-2">
        <FlaskConical className="w-4 h-4 text-primary" />
        <p className="text-sm font-semibold text-foreground">A/B prompt testing</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Experiment name" className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground outline-none" />
        <select value={form.optimization_metric} onChange={(e) => setForm((prev) => ({ ...prev, optimization_metric: e.target.value }))} className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground outline-none">
          <option value="engagement_rate">Optimize engagement</option>
          <option value="conversion_rate">Optimize conversion</option>
        </select>
        <textarea value={form.variant_a_prompt} onChange={(e) => setForm((prev) => ({ ...prev, variant_a_prompt: e.target.value }))} placeholder="Variant A prompt" className="min-h-[130px] w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground outline-none" />
        <textarea value={form.variant_b_prompt} onChange={(e) => setForm((prev) => ({ ...prev, variant_b_prompt: e.target.value }))} placeholder="Variant B prompt" className="min-h-[130px] w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground outline-none" />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <input type="number" value={form.minimum_sample_size} onChange={(e) => setForm((prev) => ({ ...prev, minimum_sample_size: Number(e.target.value || 20) }))} placeholder="Min sample size" className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground outline-none" />
        <input type="number" value={form.engagement_threshold_messages} onChange={(e) => setForm((prev) => ({ ...prev, engagement_threshold_messages: Number(e.target.value || 2) }))} placeholder="Engagement threshold" className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground outline-none" />
        <label className="flex items-center gap-2 rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground">
          <input type="checkbox" checked={form.auto_deploy_winner} onChange={(e) => setForm((prev) => ({ ...prev, auto_deploy_winner: e.target.checked }))} className="accent-primary" />
          Auto deploy winning prompt
        </label>
      </div>

      <button onClick={createExperiment} disabled={!form.name || !form.variant_a_prompt || !form.variant_b_prompt || saving} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-40">
        <BarChart3 className="w-3.5 h-3.5" /> {saving ? 'Saving...' : 'Create experiment'}
      </button>

      {activeExperiment && (
        <div className="space-y-3 rounded-xl border border-border bg-background p-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-sm font-semibold text-foreground">{activeExperiment.name}</p>
              <p className="text-[11px] text-muted-foreground">Live traffic plus sandbox · optimizing {activeExperiment.optimization_metric === 'conversion_rate' ? 'conversion' : 'engagement'}</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => updateExperimentStatus(activeExperiment, 'running')} className="inline-flex items-center gap-1 rounded-lg border border-primary/20 bg-primary/10 px-2.5 py-1.5 text-[11px] font-medium text-primary">
                <Play className="w-3.5 h-3.5" /> Run
              </button>
              <button onClick={() => updateExperimentStatus(activeExperiment, 'paused')} className="inline-flex items-center gap-1 rounded-lg border border-border bg-secondary px-2.5 py-1.5 text-[11px] font-medium text-foreground">
                <PauseCircle className="w-3.5 h-3.5" /> Pause
              </button>
              <button onClick={simulateSandboxRound} disabled={simulating || activeExperiment.status !== 'running'} className="inline-flex items-center gap-1 rounded-lg border border-border bg-secondary px-2.5 py-1.5 text-[11px] font-medium text-foreground disabled:opacity-40">
                <FlaskConical className="w-3.5 h-3.5" /> {simulating ? 'Running...' : 'Add sandbox round'}
              </button>
              <button onClick={() => updateExperimentStatus(activeExperiment, 'completed')} className="inline-flex items-center gap-1 rounded-lg border border-amber-500/20 bg-amber-500/10 px-2.5 py-1.5 text-[11px] font-medium text-amber-300">
                <Trophy className="w-3.5 h-3.5" /> Declare winner
              </button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-3">
              <p className="text-xs font-semibold text-foreground">{activeExperiment.variant_a_label}</p>
              <p className="mt-2 text-[11px] text-muted-foreground">Samples {aMetrics.samples} · Engagement {aMetrics.engagementRate}% · Conversion {aMetrics.conversionRate}%</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-3">
              <p className="text-xs font-semibold text-foreground">{activeExperiment.variant_b_label}</p>
              <p className="mt-2 text-[11px] text-muted-foreground">Samples {bMetrics.samples} · Engagement {bMetrics.engagementRate}% · Conversion {bMetrics.conversionRate}%</p>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-3 text-xs text-muted-foreground">
            {result.winner === 'none' ? 'No winner yet. More balanced traffic or more samples are needed.' : `Current winner: ${result.winner === 'a' ? activeExperiment.variant_a_label : activeExperiment.variant_b_label}`}
          </div>
        </div>
      )}
    </div>
  );
}