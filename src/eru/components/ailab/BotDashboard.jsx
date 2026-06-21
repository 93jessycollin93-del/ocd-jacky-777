import { BarChart2, Zap, Star, Clock, TrendingUp } from 'lucide-react';
import { useRealtimeEntityList } from '@/eru/hooks/useLiveSync';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import BotSkillTreePanel from './BotSkillTreePanel';

const COLORS = ['hsl(160 100% 45%)', 'hsl(210 100% 60%)', 'hsl(50 100% 55%)', 'hsl(280 80% 65%)', 'hsl(350 100% 60%)'];

export default function BotDashboard({ bots }) {
  const { data: automations, loading: automationsLoading } = useRealtimeEntityList('BotAutomation', { sort: '-created_date', limit: 50 });
  const { data: memories, loading: memoriesLoading } = useRealtimeEntityList('BotMemory', { sort: '-created_date', limit: 200 });
  const { data: improvements, loading: improvementsLoading } = useRealtimeEntityList('BotImprovement', { sort: '-created_date', limit: 50 });
  const { data: squads, loading: squadsLoading } = useRealtimeEntityList('BotSquad', { sort: '-updated_date', limit: 100 });
  const loading = automationsLoading || memoriesLoading || improvementsLoading || squadsLoading;

  // XP per bot
  const xpData = [...bots].sort((a, b) => (b.xp || 0) - (a.xp || 0)).slice(0, 8).map(b => ({
    name: b.name.length > 10 ? b.name.slice(0, 10) + '…' : b.name,
    xp: b.xp || 0,
    level: b.level || 1,
  }));

  // Interactions per bot (count from memory)
  const interactionMap = {};
  memories.forEach(m => { interactionMap[m.bot_id] = (interactionMap[m.bot_id] || 0) + 1; });
  const interactionData = bots.map(b => ({ name: b.name.slice(0, 10), msgs: interactionMap[b.id] || 0 }))
    .filter(b => b.msgs > 0).sort((a, b) => b.msgs - a.msgs).slice(0, 8);

  // Improvement scores over time
  const scoreData = improvements.slice(-15).map((imp, i) => ({
    run: i + 1,
    score: imp.score || 0,
    label: imp.goal?.slice(0, 20) || `Run ${i + 1}`,
  }));

  // Automation pie
  const autoActive = automations.filter(a => a.status === 'active').length;
  const autoPaused = automations.length - autoActive;
  const autoPie = [
    { name: 'Active', value: autoActive },
    { name: 'Paused', value: autoPaused },
  ].filter(d => d.value > 0);

  // Summary stats
  const totalXP = bots.reduce((s, b) => s + (b.xp || 0), 0);
  const totalUsage = bots.reduce((s, b) => s + (b.usage_count || 0), 0);
  const totalRuns = automations.reduce((s, a) => s + (a.run_count || 0), 0);
  const avgScore = improvements.length ? (improvements.reduce((s, i) => s + (i.score || 0), 0) / improvements.length).toFixed(1) : '—';

  if (loading) return <div className="flex justify-center py-16"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Total XP', val: totalXP, icon: Star, color: 'text-yellow-400' },
          { label: 'Interactions', val: memories.length, icon: TrendingUp, color: 'text-primary' },
          { label: 'Auto Runs', val: totalRuns, icon: Zap, color: 'text-blue-400' },
          { label: 'Avg Score', val: avgScore, icon: BarChart2, color: 'text-purple-400' },
        ].map((item) => (
          <div key={item.label} className="bg-card border border-border rounded-xl p-2 text-center">
            <item.icon className={`w-3.5 h-3.5 ${item.color} mx-auto mb-1`} />
            <p className={`text-base font-bold ${item.color}`}>{item.val}</p>
            <p className="text-[9px] text-muted-foreground">{item.label}</p>
          </div>
        ))}
      </div>

      {/* XP Bar Chart */}
      {xpData.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-xs font-semibold mb-3 flex items-center gap-2"><Star className="w-3.5 h-3.5 text-yellow-400" /> Bot XP Rankings</p>
          <ResponsiveContainer width="100%" height={130}>
            <BarChart data={xpData}>
              <XAxis dataKey="name" tick={{ fontSize: 8, fill: '#666' }} />
              <YAxis tick={{ fontSize: 8, fill: '#666' }} width={28} />
              <Tooltip contentStyle={{ background: 'hsl(230 22% 9%)', border: '1px solid hsl(230 18% 16%)', borderRadius: 8, fontSize: 11 }} />
              <Bar dataKey="xp" name="XP" radius={[3, 3, 0, 0]}>
                {xpData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Interactions */}
      {interactionData.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-xs font-semibold mb-3 flex items-center gap-2"><TrendingUp className="w-3.5 h-3.5 text-primary" /> Bot Interactions</p>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={interactionData}>
              <XAxis dataKey="name" tick={{ fontSize: 8, fill: '#666' }} />
              <YAxis tick={{ fontSize: 8, fill: '#666' }} width={24} />
              <Tooltip contentStyle={{ background: 'hsl(230 22% 9%)', border: '1px solid hsl(230 18% 16%)', borderRadius: 8, fontSize: 11 }} />
              <Bar dataKey="msgs" name="Messages" fill="hsl(160 100% 45%)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Improvement Scores */}
      {scoreData.length > 1 && (
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-xs font-semibold mb-3 flex items-center gap-2"><Zap className="w-3.5 h-3.5 text-purple-400" /> Orchestrator Performance Scores</p>
          <ResponsiveContainer width="100%" height={110}>
            <AreaChart data={scoreData}>
              <defs>
                <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(280 80% 65%)" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="hsl(280 80% 65%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="run" tick={{ fontSize: 8, fill: '#666' }} />
              <YAxis domain={[0, 10]} tick={{ fontSize: 8, fill: '#666' }} width={20} />
              <Tooltip contentStyle={{ background: 'hsl(230 22% 9%)', border: '1px solid hsl(230 18% 16%)', borderRadius: 8, fontSize: 11 }} />
              <Area type="monotone" dataKey="score" stroke="hsl(280 80% 65%)" fill="url(#scoreGrad)" strokeWidth={2} name="Score" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Automation Status Pie */}
      {autoPie.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4">
          <div>
            <p className="text-xs font-semibold mb-2 flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-blue-400" /> Automations</p>
            <PieChart width={90} height={90}>
              <Pie data={autoPie} cx={45} cy={45} innerRadius={25} outerRadius={40} dataKey="value">
                {autoPie.map((_, i) => <Cell key={i} fill={i === 0 ? 'hsl(160 100% 45%)' : 'hsl(230 18% 20%)'} />)}
              </Pie>
            </PieChart>
          </div>
          <div className="space-y-2">
            <div><p className="text-xl font-bold text-primary">{autoActive}</p><p className="text-[9px] text-muted-foreground">Active</p></div>
            <div><p className="text-xl font-bold text-muted-foreground">{autoPaused}</p><p className="text-[9px] text-muted-foreground">Paused</p></div>
            <div><p className="text-xl font-bold text-blue-400">{totalRuns}</p><p className="text-[9px] text-muted-foreground">Total Runs</p></div>
          </div>
        </div>
      )}

      {bots.length > 0 && <BotSkillTreePanel bots={bots} squads={squads} />}

      {xpData.length === 0 && interactionData.length === 0 && bots.length === 0 && (
        <div className="text-center py-10 text-muted-foreground">
          <BarChart2 className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm">No data yet</p>
          <p className="text-xs mt-1">Interact with your bots to see stats here</p>
        </div>
      )}
    </div>
  );
}