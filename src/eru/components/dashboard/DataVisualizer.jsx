import { useState, useEffect } from 'react';
import { base44 } from '@/eru/api/base44Client';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  RadialBarChart, RadialBar, XAxis, Tooltip, ResponsiveContainer
} from 'recharts';
import { BarChart2, TrendingUp, CheckCircle2, Cpu, RefreshCw, Layers } from 'lucide-react';

const COLORS = ['hsl(160,100%,45%)', 'hsl(210,100%,60%)', 'hsl(50,100%,55%)', 'hsl(280,80%,65%)', 'hsl(350,100%,60%)'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-2.5 py-1.5 text-xs shadow-xl">
      {label && <p className="text-muted-foreground mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || p.fill }} className="font-semibold">{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

export default function DataVisualizer() {
  const [progress, setProgress] = useState([]);
  const [reputation, setReputation] = useState(null);
  const [bots, setBots] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeMetric, setActiveMetric] = useState('velocity');

  const load = async () => {
    setLoading(true);
    const [prog, rep, b, a] = await Promise.all([
      base44.entities.UserProgress.list('-updated_date', 50),
      base44.entities.Reputation.list('-created_date', 1),
      base44.entities.UserBot.list('-created_date', 20),
      base44.entities.JackieSaved.list('-created_date', 30),
    ]);
    setProgress(prog);
    setReputation(rep[0] || null);
    setBots(b);
    setAssets(a);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Derived metrics
  const completed = progress.filter(p => p.status === 'completed').length;
  const inProgress = progress.filter(p => p.status === 'in_progress').length;
  const notStarted = progress.filter(p => p.status === 'not_started').length;
  const total = progress.length || 1;
  const completionRate = Math.round((completed / total) * 100);

  // Velocity: completion % per module over time (mock 7 days from actual data)
  const velocityData = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(); day.setDate(day.getDate() - (6 - i));
    const label = day.toLocaleDateString('en', { weekday: 'short' });
    const done = progress.filter(p => {
      if (!p.completed_date) return false;
      const d = new Date(p.completed_date);
      return d.toDateString() === day.toDateString();
    }).length;
    return { label, completions: done, xp: done * 50 };
  });

  // Task status pie
  const statusData = [
    { name: 'Done', value: completed },
    { name: 'Active', value: inProgress },
    { name: 'Queue', value: notStarted },
  ].filter(d => d.value > 0);

  // Asset tag breakdown
  const tagMap = {};
  assets.forEach(a => { const t = a.tag || 'general'; tagMap[t] = (tagMap[t] || 0) + 1; });
  const assetData = Object.entries(tagMap).map(([name, value]) => ({ name, value }));

  // Bot status
  const activeBots = bots.filter(b => b.status === 'active').length;
  const inactiveBots = bots.filter(b => b.status === 'inactive').length;

  // Radial health score
  const healthScore = Math.min(100, Math.round(
    (completionRate * 0.4) +
    (Math.min(assets.length, 20) / 20 * 100 * 0.3) +
    (Math.min(activeBots, 5) / 5 * 100 * 0.3)
  ));
  const radialData = [{ name: 'Health', value: healthScore, fill: 'hsl(160,100%,45%)' }];

  const METRICS = [
    { id: 'velocity', label: 'Velocity', icon: TrendingUp },
    { id: 'tasks', label: 'Tasks', icon: CheckCircle2 },
    { id: 'assets', label: 'Assets', icon: Layers },
    { id: 'health', label: 'Health', icon: Cpu },
  ];

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-2xl">
      {/* Title bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-secondary/60">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-3.5 h-3.5 text-primary" />
          <p className="text-xs font-semibold text-primary">Data Analysis</p>
        </div>
        <button onClick={load} className="p-1 rounded hover:bg-border transition-colors">
          <RefreshCw className={`w-3 h-3 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Metric tabs */}
      <div className="flex border-b border-border">
        {METRICS.map(m => (
          <button key={m.id} onClick={() => setActiveMetric(m.id)}
            className={`flex-1 flex items-center justify-center gap-1 py-2 text-[10px] font-medium transition-colors border-b-2 ${activeMetric === m.id ? 'text-primary border-primary' : 'text-muted-foreground border-transparent'}`}>
            <m.icon className="w-3 h-3" />{m.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="h-48 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="px-3 py-3">
          {/* VELOCITY */}
          {activeMetric === 'velocity' && (
            <div className="space-y-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">7-Day Completion Velocity</p>
              <ResponsiveContainer width="100%" height={120}>
                <AreaChart data={velocityData}>
                  <defs>
                    <linearGradient id="vGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(160,100%,45%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(160,100%,45%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'hsl(220,12%,50%)' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="completions" name="Completions" stroke="hsl(160,100%,45%)" fill="url(#vGrad)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-3 gap-2 mt-1">
                <div className="bg-secondary/60 rounded-xl p-2 text-center">
                  <p className="text-base font-bold text-primary">{completed}</p>
                  <p className="text-[9px] text-muted-foreground">Completed</p>
                </div>
                <div className="bg-secondary/60 rounded-xl p-2 text-center">
                  <p className="text-base font-bold text-blue-400">{inProgress}</p>
                  <p className="text-[9px] text-muted-foreground">In Progress</p>
                </div>
                <div className="bg-secondary/60 rounded-xl p-2 text-center">
                  <p className="text-base font-bold text-muted-foreground">{notStarted}</p>
                  <p className="text-[9px] text-muted-foreground">Queued</p>
                </div>
              </div>
            </div>
          )}

          {/* TASKS */}
          {activeMetric === 'tasks' && (
            <div className="space-y-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Task Completion Rate · {completionRate}%</p>
              <div className="flex items-center gap-4">
                <ResponsiveContainer width={110} height={110}>
                  <PieChart>
                    <Pie data={statusData.length ? statusData : [{ name: 'Empty', value: 1 }]}
                      cx="50%" cy="50%" innerRadius={32} outerRadius={50}
                      dataKey="value" stroke="none">
                      {(statusData.length ? statusData : [{ name: 'Empty' }]).map((_, i) => (
                        <Cell key={i} fill={statusData.length ? COLORS[i] : 'hsl(230,18%,16%)'} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {[{ label: 'Done', val: completed, color: COLORS[0] }, { label: 'Active', val: inProgress, color: COLORS[1] }, { label: 'Queue', val: notStarted, color: 'hsl(220,12%,50%)' }].map(s => (
                    <div key={s.label}>
                      <div className="flex justify-between text-[10px] mb-0.5">
                        <span className="text-muted-foreground">{s.label}</span>
                        <span className="font-medium" style={{ color: s.color }}>{s.val}</span>
                      </div>
                      <div className="h-1 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${total > 0 ? (s.val / total) * 100 : 0}%`, background: s.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ASSETS */}
          {activeMetric === 'assets' && (
            <div className="space-y-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Jackie Asset Library · {assets.length} saved</p>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={assetData.length ? assetData : [{ name: 'No data', value: 0 }]} barSize={20}>
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'hsl(220,12%,50%)' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Assets" radius={[4, 4, 0, 0]}>
                    {assetData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-secondary/60 rounded-xl p-2 text-center">
                  <p className="text-base font-bold text-cyan-400">{activeBots}</p>
                  <p className="text-[9px] text-muted-foreground">Active Bots</p>
                </div>
                <div className="bg-secondary/60 rounded-xl p-2 text-center">
                  <p className="text-base font-bold text-muted-foreground">{inactiveBots}</p>
                  <p className="text-[9px] text-muted-foreground">Inactive Bots</p>
                </div>
              </div>
            </div>
          )}

          {/* HEALTH */}
          {activeMetric === 'health' && (
            <div className="space-y-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Project Health Score</p>
              <div className="flex items-center gap-4">
                <ResponsiveContainer width={110} height={110}>
                  <RadialBarChart cx="50%" cy="50%" innerRadius={28} outerRadius={50}
                    data={[{ ...radialData[0], value: healthScore }]} startAngle={90} endAngle={-270}>
                    <RadialBar dataKey="value" cornerRadius={8} background={{ fill: 'hsl(230,18%,14%)' }} />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2.5">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-primary">{healthScore}</p>
                    <p className="text-[10px] text-muted-foreground">/ 100</p>
                  </div>
                  <div className={`text-xs font-semibold text-center px-3 py-1 rounded-full ${healthScore >= 70 ? 'bg-green-400/10 text-green-400' : healthScore >= 40 ? 'bg-yellow-400/10 text-yellow-400' : 'bg-red-400/10 text-red-400'}`}>
                    {healthScore >= 70 ? '● Healthy' : healthScore >= 40 ? '● Moderate' : '● Needs Work'}
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                {[
                  { label: 'Task Completion', val: completionRate },
                  { label: 'Asset Coverage', val: Math.min(100, Math.round(assets.length / 20 * 100)) },
                  { label: 'Bot Deployment', val: Math.min(100, Math.round(activeBots / 5 * 100)) },
                ].map(f => (
                  <div key={f.label}>
                    <div className="flex justify-between text-[9px] mb-0.5">
                      <span className="text-muted-foreground">{f.label}</span>
                      <span className="text-primary font-medium">{f.val}%</span>
                    </div>
                    <div className="h-1 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${f.val}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}