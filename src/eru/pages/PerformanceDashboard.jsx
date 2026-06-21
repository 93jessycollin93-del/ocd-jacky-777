import { useState, useEffect, useRef } from 'react';
import { Activity, AlertCircle, CheckCircle, TrendingUp, RefreshCw } from 'lucide-react';
import { base44 } from '@/eru/api/base44Client';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const SERVICES = [
  'googledrive', 'dropbox', 'clickup', 'linear', 'salesforce',
  'slack', 'notion', 'github', 'hubspot', 'telegram',
];

const SERVICE_LABELS = {
  googledrive: 'Google Drive', dropbox: 'Dropbox', clickup: 'ClickUp',
  linear: 'Linear', salesforce: 'Salesforce', slack: 'Slack',
  notion: 'Notion', github: 'GitHub', hubspot: 'HubSpot', telegram: 'Telegram API',
};

function statusColor(latency, isError) {
  if (isError) return 'text-red-400';
  if (latency > 400) return 'text-orange-400';
  if (latency > 200) return 'text-yellow-400';
  return 'text-green-400';
}
function statusBg(latency, isError) {
  if (isError) return 'bg-red-400/10 border-red-400/30';
  if (latency > 400) return 'bg-orange-400/10 border-orange-400/30';
  if (latency > 200) return 'bg-yellow-400/10 border-yellow-400/30';
  return 'bg-green-400/10 border-green-400/30';
}

const SEV = {
  critical: 'text-red-400 bg-red-400/10 border-red-400/30',
  warning:  'text-orange-400 bg-orange-400/10 border-orange-400/30',
  info:     'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
};

export default function PerformanceDashboard({ embedded = false }) {
  const [rawMetrics, setRawMetrics] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [autoRefresh, setAutoRefresh] = useState(false);
  const intervalRef = useRef(null);

  const load = async () => {
    const [metrics, logs] = await Promise.all([
      base44.entities.PerformanceMetric.list('-timestamp', 200),
      base44.entities.AuditLog.filter({ severity: 'warning' }, '-created_date', 50)
        .catch(() => []),
    ]);
    setRawMetrics(metrics);
    setAuditLogs(logs);
    setLastUpdate(new Date());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    clearInterval(intervalRef.current);
    if (!autoRefresh) {
      return undefined;
    }
    intervalRef.current = setInterval(load, 60000);
    return () => clearInterval(intervalRef.current);
  }, [autoRefresh]);

  // Aggregate per-service from real records
  const serviceMetrics = SERVICES.map(svc => {
    const records = rawMetrics.filter(m => m.service === svc);
    if (records.length === 0) return { id: svc, name: SERVICE_LABELS[svc], latency: null, isError: false, uptime: null, count: 0 };
    const avg = Math.round(records.reduce((s, m) => s + m.latency_ms, 0) / records.length);
    const errors = records.filter(m => !m.success).length;
    const uptime = (((records.length - errors) / records.length) * 100).toFixed(1);
    return { id: svc, name: SERVICE_LABELS[svc], latency: avg, isError: errors > records.length * 0.5, uptime: parseFloat(uptime), count: records.length };
  }).filter(s => s.count > 0);

  // History — group records by 2-min buckets
  const historyMap = {};
  rawMetrics.forEach(m => {
    const t = new Date(m.timestamp || m.created_date);
    const bucket = new Date(Math.floor(t.getTime() / 120000) * 120000);
    const key = bucket.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
    if (!historyMap[key]) historyMap[key] = { time: key, latencies: [], errors: 0 };
    historyMap[key].latencies.push(m.latency_ms);
    if (!m.success) historyMap[key].errors++;
  });
  const history = Object.values(historyMap)
    .map(b => ({ time: b.time, avgLatency: Math.round(b.latencies.reduce((s, v) => s + v, 0) / b.latencies.length), errors: b.errors }))
    .slice(-30);

  const healthy = serviceMetrics.filter(m => !m.isError && m.latency <= 200).length;
  const degraded = serviceMetrics.filter(m => !m.isError && m.latency > 200).length;
  const down = serviceMetrics.filter(m => m.isError).length;
  const avgLatency = serviceMetrics.length ? Math.round(serviceMetrics.reduce((s, m) => s + (m.latency || 0), 0) / serviceMetrics.length) : 0;

  const criticalLogs = auditLogs.filter(l => l.severity === 'critical' || l.severity === 'warning');

  return (
    <div className={`flex flex-col ${embedded ? 'min-h-0 bg-transparent pb-0' : 'min-h-screen bg-background pb-24'}`}>
      <div className={`px-4 py-3 border-b border-border flex items-center justify-between flex-shrink-0 ${embedded ? 'bg-card' : ''}`}>
        <div>
          <h2 className="text-base font-bold flex items-center gap-2"><Activity className="w-4 h-4 text-primary" /> Performance Monitor</h2>
          <p className="text-[10px] text-muted-foreground">Updated {lastUpdate.toLocaleTimeString()}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setAutoRefresh(a => !a)}
            className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${autoRefresh ? 'text-primary border-primary/30 bg-primary/10' : 'text-muted-foreground border-border'}`}>
            {autoRefresh ? '● Live' : '○ Manual'}
          </button>
          <button onClick={load} className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex border-b border-border flex-shrink-0">
        {[['overview','Overview'],['services','Services'],['crashes','Audit Alerts'],['latency','Latency']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex-1 py-2.5 text-xs font-medium transition-colors ${tab === id ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

        {loading && (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && rawMetrics.length === 0 && tab === 'overview' && (
          <div className="text-center py-12 text-muted-foreground">
            <Activity className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No performance data yet</p>
            <p className="text-xs mt-1">Data will appear here once services start logging metrics to the PerformanceMetric entity.</p>
          </div>
        )}

        {!loading && tab === 'overview' && rawMetrics.length > 0 && (
          <>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Healthy', val: healthy, color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/20' },
                { label: 'Degraded', val: degraded, color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/20' },
                { label: 'Down', val: down, color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/20' },
                { label: 'Avg ms', val: avgLatency, color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/20' },
              ].map(({ label, val, color, bg }) => (
                <div key={label} className={`rounded-xl border p-2 text-center ${bg}`}>
                  <p className={`text-lg font-bold ${color}`}>{val}</p>
                  <p className={`text-[9px] font-semibold ${color}`}>{label}</p>
                </div>
              ))}
            </div>

            {history.length > 1 && (
              <div className="bg-card border border-border rounded-2xl p-4">
                <p className="text-xs font-semibold mb-3 flex items-center gap-2"><TrendingUp className="w-3.5 h-3.5 text-primary" /> Avg Latency over time</p>
                <ResponsiveContainer width="100%" height={120}>
                  <AreaChart data={history}>
                    <defs>
                      <linearGradient id="latGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(160 100% 45%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(160 100% 45%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="time" tick={{ fontSize: 8, fill: '#666' }} interval={9} />
                    <YAxis tick={{ fontSize: 8, fill: '#666' }} width={28} />
                    <Tooltip contentStyle={{ background: 'hsl(230 22% 9%)', border: '1px solid hsl(230 18% 16%)', borderRadius: 8, fontSize: 11 }} />
                    <Area type="monotone" dataKey="avgLatency" stroke="hsl(160 100% 45%)" fill="url(#latGrad)" strokeWidth={1.5} name="Latency ms" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {history.length > 1 && (
              <div className="bg-card border border-border rounded-2xl p-4">
                <p className="text-xs font-semibold mb-3 flex items-center gap-2"><AlertCircle className="w-3.5 h-3.5 text-red-400" /> Error Count over time</p>
                <ResponsiveContainer width="100%" height={100}>
                  <BarChart data={history.slice(-15)}>
                    <XAxis dataKey="time" tick={{ fontSize: 7, fill: '#666' }} interval={4} />
                    <Tooltip contentStyle={{ background: 'hsl(230 22% 9%)', border: '1px solid hsl(230 18% 16%)', borderRadius: 8, fontSize: 11 }} />
                    <Bar dataKey="errors" fill="hsl(350 100% 60%)" radius={[2,2,0,0]} name="Errors" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {serviceMetrics.length > 0 && (
              <div className="bg-card border border-border rounded-2xl p-3">
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-muted-foreground font-medium">System Health</span>
                  <span className="text-primary font-bold">{((healthy / serviceMetrics.length) * 100).toFixed(0)}%</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div className="h-2 rounded-full bg-primary transition-all duration-500" style={{ width: `${(healthy / serviceMetrics.length) * 100}%` }} />
                </div>
              </div>
            )}
          </>
        )}

        {!loading && tab === 'services' && (
          <div className="space-y-2">
            {serviceMetrics.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-sm">No service data recorded yet.</p>
              </div>
            )}
            {serviceMetrics.map(s => (
              <div key={s.id} className={`rounded-xl border p-3 flex items-center gap-3 ${statusBg(s.latency, s.isError)}`}>
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${s.isError ? 'bg-red-400' : s.latency > 200 ? 'bg-yellow-400' : 'bg-green-400'} ${!s.isError ? 'animate-pulse' : ''}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{s.name}</p>
                  <p className="text-[10px] text-muted-foreground">Uptime {s.uptime}% · {s.count} samples</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-sm font-bold ${statusColor(s.latency, s.isError)}`}>
                    {s.isError ? 'ERROR' : `${s.latency}ms`}
                  </p>
                  <p className="text-[9px] text-muted-foreground">{s.isError ? 'Degraded' : s.latency > 400 ? 'Slow' : s.latency > 200 ? 'Degraded' : 'Healthy'}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && tab === 'crashes' && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">{criticalLogs.length} audit alerts</p>
            {criticalLogs.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <CheckCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">No alerts recorded</p>
                <p className="text-xs mt-1">Warning and critical events from the AuditLog will appear here.</p>
              </div>
            )}
            {criticalLogs.map(log => (
              <div key={log.id} className={`rounded-xl border p-3 space-y-1.5 ${SEV[log.severity] || SEV.info}`}>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-medium leading-tight flex-1">{log.action} — {log.source_app || log.platform || log.action_type}</p>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0 ${SEV[log.severity]}`}>{log.severity}</span>
                </div>
                {log.detail && <p className="text-[10px] text-muted-foreground">{log.detail}</p>}
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-muted-foreground">{new Date(log.created_date).toLocaleTimeString()}</span>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-medium ${log.status === 'failed' ? 'bg-red-400/10 text-red-400 border border-red-400/30' : 'bg-secondary text-muted-foreground'}`}>{log.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && tab === 'latency' && (
          <div className="space-y-3">
            {serviceMetrics.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-sm">No latency data recorded yet.</p>
              </div>
            )}
            {[...serviceMetrics].sort((a, b) => b.latency - a.latency).map(s => (
              <div key={s.id} className="bg-card border border-border rounded-xl p-3">
                <div className="flex justify-between mb-1.5">
                  <p className="text-xs font-medium">{s.name}</p>
                  <p className={`text-xs font-bold ${statusColor(s.latency, s.isError)}`}>{s.isError ? 'ERR' : `${s.latency}ms`}</p>
                </div>
                <div className="w-full bg-secondary rounded-full h-1.5">
                  <div className={`h-1.5 rounded-full transition-all duration-700 ${s.isError ? 'bg-red-400' : s.latency > 400 ? 'bg-orange-400' : s.latency > 200 ? 'bg-yellow-400' : 'bg-green-400'}`}
                    style={{ width: `${Math.min(100, ((s.latency || 0) / 500) * 100)}%` }} />
                </div>
                <p className="text-[9px] text-muted-foreground mt-1">P95 est: {Math.round((s.latency || 0) * 1.4)}ms · {s.count} samples</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}