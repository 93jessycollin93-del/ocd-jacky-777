import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/eru/api/base44Client';
import { AlertTriangle, Brain, Gauge, HeartHandshake, ShieldAlert, TrendingUp } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, CartesianGrid, LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

function bucketDay(value) {
  const date = new Date(value);
  return `${date.getUTCMonth() + 1}/${date.getUTCDate()}`;
}

function average(items, key) {
  if (!items.length) return 0;
  return items.reduce((sum, item) => sum + Number(item?.[key] || 0), 0) / items.length;
}

function buildTimeline({ bots, ratings, testRuns, metrics }) {
  const map = {};

  testRuns.forEach((item) => {
    const key = bucketDay(item.created_date || new Date().toISOString());
    if (!map[key]) map[key] = { day: key, usage: 0, successRate: 0, errors: 0, satisfaction: 0, resource: 0, _runs: [], _ratings: [], _metrics: [] };
    map[key].usage += 1;
    map[key]._runs.push(item);
  });

  ratings.forEach((item) => {
    const key = bucketDay(item.created_date || new Date().toISOString());
    if (!map[key]) map[key] = { day: key, usage: 0, successRate: 0, errors: 0, satisfaction: 0, resource: 0, _runs: [], _ratings: [], _metrics: [] };
    map[key]._ratings.push(item);
  });

  metrics.forEach((item) => {
    const key = bucketDay(item.timestamp || item.created_date || new Date().toISOString());
    if (!map[key]) map[key] = { day: key, usage: 0, successRate: 0, errors: 0, satisfaction: 0, resource: 0, _runs: [], _ratings: [], _metrics: [] };
    map[key]._metrics.push(item);
  });

  if (Object.keys(map).length === 0) {
    const fallbackKey = bucketDay(new Date().toISOString());
    map[fallbackKey] = { day: fallbackKey, usage: bots.reduce((sum, bot) => sum + Number(bot.usage_count || 0), 0), successRate: 0, errors: 0, satisfaction: 0, resource: 0, _runs: [], _ratings: [], _metrics: [] };
  }

  return Object.values(map).map((entry) => {
    const passRate = entry._runs.length ? Math.round((entry._runs.filter((run) => run.passed).length / entry._runs.length) * 100) : 0;
    const errors = entry._runs.filter((run) => run.regression_flag || !run.passed).length + entry._metrics.filter((item) => item.success === false).length;
    const satisfaction = entry._ratings.length ? Number(average(entry._ratings, 'rating').toFixed(1)) : 0;
    const resource = entry._metrics.length ? Math.round(average(entry._metrics, 'latency_ms') / 10) : 0;
    return {
      day: entry.day,
      usage: entry.usage,
      successRate: passRate,
      errors,
      satisfaction,
      resource,
    };
  }).sort((a, b) => new Date(`2026/${a.day}`) - new Date(`2026/${b.day}`)).slice(-10);
}

export default function BotPerformanceAnalyticsPanel({ bots }) {
  const [ratings, setRatings] = useState([]);
  const [testRuns, setTestRuns] = useState([]);
  const [metrics, setMetrics] = useState([]);
  const [aiInsight, setAiInsight] = useState(null);
  const [loadingInsight, setLoadingInsight] = useState(false);

  const load = async () => {
    const [ratingRows, runRows, metricRows] = await Promise.all([
      base44.entities.BotRating.list('-created_date', 300),
      base44.entities.BotTestRun.list('-created_date', 400),
      base44.entities.PerformanceMetric.list('-created_date', 300),
    ]);
    setRatings(ratingRows);
    setTestRuns(runRows);
    setMetrics(metricRows);
  };

  useEffect(() => { load(); }, []);

  const timeline = useMemo(() => buildTimeline({ bots, ratings, testRuns, metrics }), [bots, ratings, testRuns, metrics]);

  const summary = useMemo(() => {
    const usage = bots.reduce((sum, bot) => sum + Number(bot.usage_count || 0), 0);
    const successRate = testRuns.length ? Math.round((testRuns.filter((run) => run.passed).length / testRuns.length) * 100) : 0;
    const errorRate = testRuns.length ? Math.round((testRuns.filter((run) => run.regression_flag || !run.passed).length / testRuns.length) * 100) : 0;
    const satisfaction = ratings.length ? Number(average(ratings, 'rating').toFixed(1)) : 0;
    const resourceLoad = metrics.length ? Math.round(average(metrics, 'latency_ms')) : 0;
    return { usage, successRate, errorRate, satisfaction, resourceLoad };
  }, [bots, ratings, testRuns, metrics]);

  const anomalies = useMemo(() => {
    if (timeline.length < 2) return [];
    const avgErrors = average(timeline, 'errors');
    const avgResource = average(timeline, 'resource');
    const latest = timeline[timeline.length - 1];
    return [
      latest.errors > avgErrors * 1.5 ? { label: 'Error spike', detail: `${latest.errors} errors vs avg ${avgErrors.toFixed(1)}` } : null,
      latest.resource > avgResource * 1.35 ? { label: 'Resource spike', detail: `${latest.resource} load vs avg ${avgResource.toFixed(1)}` } : null,
      latest.successRate < 70 ? { label: 'Success drop', detail: `${latest.successRate}% success rate in latest period` } : null,
      latest.satisfaction > 0 && latest.satisfaction < 3.5 ? { label: 'Satisfaction drop', detail: `${latest.satisfaction}/5 user rating in latest period` } : null,
    ].filter(Boolean);
  }, [timeline]);

  const generateInsights = async () => {
    setLoadingInsight(true);
    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an AI performance analyst for a bot operations dashboard.

Analyze these bot performance metrics and provide concise operational guidance.

Summary:
${JSON.stringify(summary, null, 2)}

Timeline:
${JSON.stringify(timeline, null, 2)}

Anomalies:
${JSON.stringify(anomalies, null, 2)}

Return:
- headline
- insights (3 to 5 short bullets)
- risk_level (low|medium|high)
- next_actions (3 short actions)`,
      response_json_schema: {
        type: 'object',
        properties: {
          headline: { type: 'string' },
          insights: { type: 'array', items: { type: 'string' } },
          risk_level: { type: 'string' },
          next_actions: { type: 'array', items: { type: 'string' } }
        },
        required: ['headline', 'insights', 'risk_level', 'next_actions']
      }
    });
    setAiInsight(response);
    setLoadingInsight(false);
  };

  return (
    <div className="space-y-4 px-4 py-4">
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">Advanced bot performance analytics</p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Track usage, success rates, error patterns, user satisfaction, resource load, anomaly signals, and AI-guided next steps.</p>
          </div>
          <button onClick={generateInsights} disabled={loadingInsight} className="inline-flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary disabled:opacity-40">
            <Brain className={`h-3.5 w-3.5 ${loadingInsight ? 'animate-pulse' : ''}`} /> {loadingInsight ? 'Generating...' : 'Generate AI insights'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <div className="rounded-xl border border-border bg-card p-3"><p className="text-[10px] text-muted-foreground">Usage</p><p className="mt-2 text-xl font-bold text-foreground">{summary.usage}</p></div>
        <div className="rounded-xl border border-border bg-card p-3"><p className="text-[10px] text-muted-foreground">Success rate</p><p className="mt-2 text-xl font-bold text-green-400">{summary.successRate}%</p></div>
        <div className="rounded-xl border border-border bg-card p-3"><p className="text-[10px] text-muted-foreground">Error rate</p><p className="mt-2 text-xl font-bold text-red-400">{summary.errorRate}%</p></div>
        <div className="rounded-xl border border-border bg-card p-3"><p className="text-[10px] text-muted-foreground">Satisfaction</p><p className="mt-2 text-xl font-bold text-yellow-400">{summary.satisfaction || 0}</p></div>
        <div className="rounded-xl border border-border bg-card p-3"><p className="text-[10px] text-muted-foreground">Resource load</p><p className="mt-2 text-xl font-bold text-blue-400">{summary.resourceLoad}ms</p></div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <Gauge className="h-4 w-4 text-blue-400" />
            <p className="text-xs font-semibold text-foreground">Usage and resource consumption over time</p>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={timeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
              <Area type="monotone" dataKey="usage" stroke="hsl(var(--primary))" fill="rgba(16, 185, 129, 0.18)" strokeWidth={2} />
              <Area type="monotone" dataKey="resource" stroke="hsl(var(--chart-2))" fill="rgba(59, 130, 246, 0.16)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <HeartHandshake className="h-4 w-4 text-yellow-400" />
            <p className="text-xs font-semibold text-foreground">Success and satisfaction trends</p>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={timeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
              <Line type="monotone" dataKey="successRate" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="satisfaction" stroke="hsl(var(--chart-3))" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr,0.85fr]">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-red-400" />
            <p className="text-xs font-semibold text-foreground">Error patterns and anomaly detection</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={timeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
              <Bar dataKey="errors" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-400" />
            <p className="text-xs font-semibold text-foreground">Detected anomalies</p>
          </div>
          {anomalies.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">No anomaly spikes detected in the latest trend window.</div>
          ) : anomalies.map((item) => (
            <div key={item.label} className="rounded-xl border border-orange-400/20 bg-orange-400/10 p-3">
              <p className="text-xs font-semibold text-orange-300">{item.label}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{item.detail}</p>
            </div>
          ))}

          {aiInsight && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" />
                <p className="text-xs font-semibold text-foreground">{aiInsight.headline}</p>
              </div>
              <p className="text-[10px] uppercase tracking-wide text-primary">Risk: {aiInsight.risk_level}</p>
              <div className="space-y-1">
                {(aiInsight.insights || []).map((item) => <p key={item} className="text-[11px] text-muted-foreground">• {item}</p>)}
              </div>
              <div className="space-y-1 pt-1">
                <p className="text-[10px] font-semibold text-foreground">Next actions</p>
                {(aiInsight.next_actions || []).map((item) => <p key={item} className="text-[11px] text-muted-foreground">• {item}</p>)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}