import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Download, Gauge, Smile, Timer, Trophy } from 'lucide-react';
import BotResourceManagementPanel from './BotResourceManagementPanel';
import AdaptiveLearningPanel from './AdaptiveLearningPanel';
import { base44 } from '@/eru/api/base44Client';
import { BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const METRIC_META = {
  response_time: { label: 'Response Time', icon: Timer, color: 'text-blue-400' },
  accuracy: { label: 'Accuracy', icon: Trophy, color: 'text-green-400' },
  resource_utilization: { label: 'Resource Use', icon: Gauge, color: 'text-orange-400' },
  satisfaction: { label: 'Satisfaction', icon: Smile, color: 'text-yellow-400' },
};

const DEFAULT_ALERT = {
  bot_id: '',
  metric: 'response_time',
  threshold: 500,
  direction: 'above',
};

function estimateBotMetrics(bot, ratings, improvements) {
  const botRatings = ratings.filter((item) => item.bot_id === bot.id);
  const botRuns = improvements.filter((item) => (item.goal || '').toLowerCase().includes((bot.name || '').toLowerCase()));
  const satisfaction = botRatings.length ? Number((botRatings.reduce((sum, item) => sum + (item.rating || 0), 0) / botRatings.length).toFixed(1)) : 0;
  const accuracy = botRuns.length ? Number((botRuns.reduce((sum, item) => sum + (item.score || 0), 0) / botRuns.length * 10).toFixed(1)) : Math.min(100, 55 + ((bot.level || 1) * 6));
  const responseTime = Math.max(120, 900 - ((bot.level || 1) * 45) - ((bot.usage_count || 0) * 3));
  const resourceUtilization = Math.min(100, 20 + ((bot.usage_count || 0) * 2) + ((bot.connected_bot_ids || []).length * 8));
  return {
    bot_id: bot.id,
    bot_name: bot.name,
    response_time: Math.round(responseTime),
    accuracy: Math.round(accuracy),
    resource_utilization: Math.round(resourceUtilization),
    satisfaction,
  };
}

export default function BotMonitoringDashboard({ bots, onBotsUpdated }) {
  const [ratings, setRatings] = useState([]);
  const [improvements, setImprovements] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [alertForm, setAlertForm] = useState(DEFAULT_ALERT);

  const load = async () => {
    const [ratingRows, improvementRows, alertRows] = await Promise.all([
      base44.entities.BotRating.list('-created_date', 200),
      base44.entities.BotImprovement.list('-created_date', 100),
      base44.entities.BotPerformanceAlert.list('-created_date', 100),
    ]);
    setRatings(ratingRows);
    setImprovements(improvementRows);
    setAlerts(alertRows);
  };

  useEffect(() => { load(); }, []);

  const metrics = useMemo(() => bots.map((bot) => estimateBotMetrics(bot, ratings, improvements)), [bots, ratings, improvements]);

  const activeAnomalies = useMemo(() => alerts.filter((alert) => {
    const row = metrics.find((item) => item.bot_id === alert.bot_id);
    if (!row || !alert.is_active) return false;
    const value = row[alert.metric];
    return alert.direction === 'above' ? value > alert.threshold : value < alert.threshold;
  }), [alerts, metrics]);

  const chartData = metrics.map((item) => ({
    name: item.bot_name?.slice(0, 10) || 'Bot',
    accuracy: item.accuracy,
    satisfaction: item.satisfaction,
  }));

  const saveAlert = async () => {
    const bot = bots.find((item) => item.id === alertForm.bot_id);
    if (!bot) return;
    await base44.entities.BotPerformanceAlert.create({
      ...alertForm,
      bot_name: bot.name,
      threshold: Number(alertForm.threshold),
    });
    setAlertForm(DEFAULT_ALERT);
    load();
  };

  const exportReport = async () => {
    const content = JSON.stringify({ generated_at: new Date().toISOString(), metrics, active_anomalies: activeAnomalies, alerts }, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'bot-performance-report.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="rounded-xl border border-border bg-card p-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Bot Monitoring Dashboard</p>
          <p className="text-xs text-muted-foreground mt-1">Track bot KPIs, flag anomalies, and export performance reports.</p>
        </div>
        <button onClick={exportReport} className="inline-flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary">
          <Download className="w-3.5 h-3.5" /> Export report
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {Object.entries(METRIC_META).map(([key, meta]) => {
          const Icon = meta.icon;
          const avg = metrics.length ? (metrics.reduce((sum, item) => sum + (item[key] || 0), 0) / metrics.length) : 0;
          return (
            <div key={key} className="rounded-xl border border-border bg-card p-3">
              <Icon className={`w-4 h-4 ${meta.color} mb-2`} />
              <p className={`text-lg font-bold ${meta.color}`}>{key === 'satisfaction' ? avg.toFixed(1) : Math.round(avg)}</p>
              <p className="text-[10px] text-muted-foreground">Avg {meta.label}</p>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-xs font-semibold mb-3 text-foreground">Accuracy vs satisfaction</p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData}>
            <XAxis dataKey="name" tick={{ fontSize: 8, fill: '#666' }} />
            <YAxis tick={{ fontSize: 8, fill: '#666' }} width={24} />
            <Tooltip contentStyle={{ background: 'hsl(230 22% 9%)', border: '1px solid hsl(230 18% 16%)', borderRadius: 8, fontSize: 11 }} />
            <Bar dataKey="accuracy" fill="hsl(160 100% 45%)" radius={[3, 3, 0, 0]} />
            <Bar dataKey="satisfaction" fill="hsl(45 100% 55%)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <p className="text-xs font-semibold text-foreground">Bot KPIs</p>
        {metrics.map((item) => (
          <div key={item.bot_id} className="rounded-xl border border-border bg-background p-3 space-y-2">
            <p className="text-xs font-semibold text-foreground">{item.bot_name}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
              <div className="rounded-lg bg-secondary p-2 text-muted-foreground">Response: <span className="text-blue-400 font-semibold">{item.response_time}ms</span></div>
              <div className="rounded-lg bg-secondary p-2 text-muted-foreground">Accuracy: <span className="text-green-400 font-semibold">{item.accuracy}%</span></div>
              <div className="rounded-lg bg-secondary p-2 text-muted-foreground">Resource: <span className="text-orange-400 font-semibold">{item.resource_utilization}%</span></div>
              <div className="rounded-lg bg-secondary p-2 text-muted-foreground">Satisfaction: <span className="text-yellow-400 font-semibold">{item.satisfaction}</span></div>
            </div>
          </div>
        ))}
      </div>

      <AdaptiveLearningPanel bots={bots} onBotsUpdated={onBotsUpdated} />

      <BotResourceManagementPanel bots={bots} onBotsUpdated={onBotsUpdated} />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <p className="text-xs font-semibold text-foreground">Performance alerts</p>
          <select value={alertForm.bot_id} onChange={(e) => setAlertForm((prev) => ({ ...prev, bot_id: e.target.value }))} className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground outline-none">
            <option value="">Choose bot</option>
            {bots.map((bot) => <option key={bot.id} value={bot.id}>{bot.name}</option>)}
          </select>
          <div className="grid grid-cols-3 gap-2">
            <select value={alertForm.metric} onChange={(e) => setAlertForm((prev) => ({ ...prev, metric: e.target.value }))} className="rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground outline-none">
              {Object.entries(METRIC_META).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}
            </select>
            <select value={alertForm.direction} onChange={(e) => setAlertForm((prev) => ({ ...prev, direction: e.target.value }))} className="rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground outline-none">
              <option value="above">Above</option>
              <option value="below">Below</option>
            </select>
            <input type="number" value={alertForm.threshold} onChange={(e) => setAlertForm((prev) => ({ ...prev, threshold: e.target.value }))} className="rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground outline-none" />
          </div>
          <button onClick={saveAlert} disabled={!alertForm.bot_id} className="w-full rounded-xl bg-primary py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-40">Save alert</button>
          <div className="space-y-2">
            {alerts.map((alert) => (
              <div key={alert.id} className="rounded-xl border border-border bg-background px-3 py-2 text-[11px] text-muted-foreground">
                {alert.bot_name}: {METRIC_META[alert.metric]?.label} {alert.direction} {alert.threshold}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-400" />
            <p className="text-xs font-semibold text-foreground">Active anomalies</p>
          </div>
          {activeAnomalies.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No active anomalies right now.</div>
          ) : activeAnomalies.map((alert) => (
            <div key={alert.id} className="rounded-xl border border-orange-400/20 bg-orange-400/10 p-3">
              <p className="text-xs font-semibold text-orange-300">{alert.bot_name}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{METRIC_META[alert.metric]?.label} crossed the {alert.direction} {alert.threshold} threshold.</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}