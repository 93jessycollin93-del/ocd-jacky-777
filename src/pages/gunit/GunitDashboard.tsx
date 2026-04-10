import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Activity, Bot, Cpu, TrendingUp } from "lucide-react";
import { format } from "date-fns";

interface Improvement {
  id: string;
  goal: string;
  improvement: string;
  score: number;
  created_at: string;
}

export default function GunitDashboard() {
  const { user } = useAuth();
  const [improvements, setImprovements] = useState<Improvement[]>([]);
  const [stats, setStats] = useState({ bots: 0, agents: 0, avgScore: 0, activeAgents: 0 });

  const fetchData = async () => {
    if (!user) return;

    const [botsRes, agentsRes, improvRes] = await Promise.all([
      supabase.from("gunit_bots").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("gunit_agents").select("id, status").eq("user_id", user.id),
      supabase.from("gunit_improvements").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
    ]);

    const agents = agentsRes.data || [];
    const improv = (improvRes.data || []) as Improvement[];
    const avg = improv.length > 0 ? improv.reduce((s, i) => s + i.score, 0) / improv.length : 0;

    setStats({
      bots: botsRes.count || 0,
      agents: agents.length,
      avgScore: Math.round(avg * 10) / 10,
      activeAgents: agents.filter((a: any) => a.status === "active").length,
    });
    setImprovements(improv);
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [user]);

  const statCards = [
    { label: "TOTAL BOTS", value: stats.bots, icon: Bot, color: "#00ff88" },
    { label: "AGENTS", value: stats.agents, icon: Cpu, color: "#00e5ff" },
    { label: "AVG SCORE", value: stats.avgScore, icon: TrendingUp, color: "#ffaa00" },
    { label: "ACTIVE", value: stats.activeAgents, icon: Activity, color: "#ff5555" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-[#00ff88] animate-pulse" />
        <h2 className="font-mono text-sm tracking-widest text-[#00ff88]">COMMAND CENTER</h2>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((s) => (
          <div key={s.label} className="bg-[#0a0a0f] border border-[#ffffff10] rounded p-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[1px]" style={{ background: `linear-gradient(90deg, transparent, ${s.color}40, transparent)` }} />
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-[10px] tracking-widest text-[#808080]">{s.label}</span>
              <s.icon className="w-3.5 h-3.5" style={{ color: s.color }} />
            </div>
            <p className="font-mono text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Activity Feed */}
      <div className="bg-[#0a0a0f] border border-[#ffffff10] rounded">
        <div className="px-4 py-3 border-b border-[#ffffff08]">
          <h3 className="font-mono text-xs tracking-widest text-[#00e5ff]">AGENT ACTIVITY FEED</h3>
        </div>
        {improvements.length === 0 ? (
          <div className="p-8 text-center font-mono text-xs text-[#808080]">
            No improvement cycles yet. Run an agent to see results.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#ffffff08]">
                  <th className="text-left px-4 py-2 font-mono text-[10px] tracking-widest text-[#808080]">GOAL</th>
                  <th className="text-left px-4 py-2 font-mono text-[10px] tracking-widest text-[#808080]">RESULT</th>
                  <th className="text-center px-4 py-2 font-mono text-[10px] tracking-widest text-[#808080]">SCORE</th>
                  <th className="text-right px-4 py-2 font-mono text-[10px] tracking-widest text-[#808080]">TIME</th>
                </tr>
              </thead>
              <tbody>
                {improvements.map((imp) => (
                  <tr key={imp.id} className="border-b border-[#ffffff05] hover:bg-[#00ff8805] transition-colors">
                    <td className="px-4 py-2.5 font-mono text-xs text-[#c0c0c0] max-w-[200px] truncate">{imp.goal}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-[#808080] max-w-[300px] truncate">{imp.improvement}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`font-mono text-xs font-bold ${imp.score >= 7 ? "text-[#00ff88]" : imp.score >= 4 ? "text-[#ffaa00]" : "text-[#ff5555]"}`}>
                        {imp.score}/10
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-[10px] text-[#808080]">
                      {format(new Date(imp.created_at), "HH:mm:ss")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
