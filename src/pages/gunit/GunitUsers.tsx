import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Users, Shield } from "lucide-react";

// Note: This is a self-service view. Full admin user management requires a user_roles table.
// For now, this shows the current user's own stats.

export default function GunitUsers() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ messages: 0, bots: 0, improvements: 0, agents: 0, apiKeys: 0 });

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("gunit_memory").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("gunit_bots").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("gunit_improvements").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("gunit_agents").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("api_keys").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    ]).then(([mem, bots, imp, ag, keys]) => {
      setStats({
        messages: mem.count || 0,
        bots: bots.count || 0,
        improvements: imp.count || 0,
        agents: ag.count || 0,
        apiKeys: keys.count || 0,
      });
    });
  }, [user]);

  const totalRequests = stats.messages + stats.bots + stats.improvements;
  const requestCap = 50;
  const pct = Math.min(100, (totalRequests / requestCap) * 100);

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4 text-[#ffaa00]" />
        <h2 className="font-mono text-sm tracking-widest text-[#ffaa00]">USER MANAGEMENT</h2>
      </div>

      {/* Current User */}
      <div className="bg-[#0a0a0f] border border-[#ffffff10] rounded p-4 space-y-4">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-[#00ff88]" />
          <div>
            <p className="font-mono text-xs text-[#c0c0c0]">{user?.email}</p>
            <p className="font-mono text-[10px] text-[#808080]">{user?.id?.slice(0, 8)}...</p>
          </div>
          <span className="ml-auto px-2 py-0.5 bg-[#00ff8815] border border-[#00ff8830] rounded font-mono text-[10px] text-[#00ff88]">
            ACTIVE
          </span>
        </div>

        {/* Request Usage */}
        <div>
          <div className="flex justify-between mb-1">
            <span className="font-mono text-[10px] text-[#808080]">REQUEST USAGE</span>
            <span className="font-mono text-[10px] text-[#c0c0c0]">{totalRequests} / {requestCap}</span>
          </div>
          <div className="h-2 bg-[#ffffff08] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${pct}%`,
                background: pct > 80 ? "#ff5555" : pct > 50 ? "#ffaa00" : "#00ff88",
              }}
            />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {[
            { label: "Messages", value: stats.messages },
            { label: "Bots", value: stats.bots },
            { label: "Cycles", value: stats.improvements },
            { label: "Agents", value: stats.agents },
            { label: "API Keys", value: stats.apiKeys },
          ].map((s) => (
            <div key={s.label} className="bg-[#050508] rounded p-2 text-center">
              <p className="font-mono text-lg font-bold text-[#00e5ff]">{s.value}</p>
              <p className="font-mono text-[9px] text-[#808080] tracking-wider">{s.label.toUpperCase()}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
