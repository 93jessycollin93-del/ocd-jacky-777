import { useState, useEffect } from 'react';
import { BarChart2, Users, Zap, TrendingUp, Award } from 'lucide-react';
import { base44 } from '@/eru/api/base44Client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import SwarmCycleAnalyticsDashboard from './SwarmCycleAnalyticsDashboard';

export default function LabAnalytics({ bots }) {
  const [memories, setMemories] = useState([]);
  const [improvements, setImprovements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [m, i] = await Promise.all([
        base44.entities.BotMemory.list('-created_date', 500),
        base44.entities.BotImprovement.list('-created_date', 50),
      ]);
      setMemories(m);
      setImprovements(i);
      setLoading(false);
    };
    load();
  }, []);

  const totalXP = bots?.reduce((s, b) => s + (b.xp || 0), 0) || 0;
  const totalUsage = bots?.reduce((s, b) => s + (b.usage_count || 0), 0) || 0;
  const avgScore = improvements.length
    ? (improvements.reduce((s, i) => s + (i.score || 0), 0) / improvements.length).toFixed(1)
    : 0;

  // Per-bot usage chart data
  const botChartData = bots?.map(b => ({
    name: b.name.slice(0, 10),
    usage: b.usage_count || 0,
    xp: b.xp || 0,
  })) || [];

  // Improvement score trend
  const scoreTrend = improvements.slice().reverse().map((imp, i) => ({
    cycle: i + 1,
    score: imp.score || 0,
  }));

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-3">
        <p className="text-xs font-semibold text-primary mb-1">📊 Platform Analytics</p>
        <p className="text-[10px] text-muted-foreground">Real-time metrics across your entire bot ecosystem.</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: 'Active Bots', val: bots?.filter(b => b.status === 'active').length || 0, icon: Users, color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/20' },
          { label: 'Total Interactions', val: totalUsage, icon: Zap, color: 'text-primary', bg: 'bg-primary/10 border-primary/20' },
          { label: 'Memories Stored', val: memories.length, icon: BarChart2, color: 'text-purple-400', bg: 'bg-purple-400/10 border-purple-400/20' },
          { label: 'Avg Agent Score', val: avgScore + '/10', icon: Award, color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/20' },
        ].map(({ label, val, icon: Icon, color, bg }) => (
          <div key={label} className={`rounded-xl border p-3 ${bg}`}>
            <Icon className={`w-4 h-4 ${color} mb-1`} />
            <p className={`text-xl font-bold ${color}`}>{val}</p>
            <p className={`text-[9px] font-semibold ${color}`}>{label}</p>
          </div>
        ))}
      </div>

      {/* Total XP */}
      <div className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
        <TrendingUp className="w-8 h-8 text-primary" />
        <div>
          <p className="text-2xl font-bold text-primary">{totalXP.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Total XP earned across all bots</p>
        </div>
      </div>

      {/* Bot usage chart */}
      {botChartData.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs font-semibold mb-3">Bot Usage</p>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={botChartData}>
              <XAxis dataKey="name" tick={{ fontSize: 8, fill: '#666' }} />
              <YAxis tick={{ fontSize: 8, fill: '#666' }} width={24} />
              <Tooltip contentStyle={{ background: 'hsl(230 22% 9%)', border: '1px solid hsl(230 18% 16%)', borderRadius: 8, fontSize: 10 }} />
              <Bar dataKey="usage" fill="hsl(160 100% 45%)" radius={[3, 3, 0, 0]} name="Interactions" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Agent improvement trend */}
      {scoreTrend.length > 1 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs font-semibold mb-3">Agent Improvement Score Trend</p>
          <ResponsiveContainer width="100%" height={100}>
            <BarChart data={scoreTrend}>
              <XAxis dataKey="cycle" tick={{ fontSize: 8, fill: '#666' }} />
              <YAxis domain={[0, 10]} tick={{ fontSize: 8, fill: '#666' }} width={20} />
              <Tooltip contentStyle={{ background: 'hsl(230 22% 9%)', border: '1px solid hsl(230 18% 16%)', borderRadius: 8, fontSize: 10 }} />
              <Bar dataKey="score" fill="hsl(45 100% 55%)" radius={[3, 3, 0, 0]} name="Score" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top bots leaderboard */}
      {bots?.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Bot Leaderboard</p>
          {[...bots].sort((a, b) => (b.xp || 0) - (a.xp || 0)).slice(0, 5).map((bot, i) => (
            <div key={bot.id} className="flex items-center gap-3 bg-card border border-border rounded-xl px-3 py-2.5">
              <span className={`text-xs font-bold w-5 text-center ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-orange-400' : 'text-muted-foreground'}`}>#{i + 1}</span>
              <div className="flex-1">
                <p className="text-xs font-medium">{bot.name}</p>
                <p className="text-[9px] text-muted-foreground">Lv.{bot.level || 1} · {bot.usage_count || 0} interactions</p>
              </div>
              <span className="text-xs font-bold text-primary">{bot.xp || 0} XP</span>
            </div>
          ))}
        </div>
      )}

      <SwarmCycleAnalyticsDashboard />
    </div>
  );
}