import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Cpu, Play, Plus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Agent {
  id: string;
  name: string;
  status: string;
  last_run_at: string | null;
  created_at: string;
}

interface CycleResult {
  plan: string;
  execution: string;
  analysis: string;
  improvement: string;
  score: number;
}

export default function GunitAgents() {
  const { user } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [newName, setNewName] = useState("");
  const [goal, setGoal] = useState("");
  const [runningId, setRunningId] = useState<string | null>(null);
  const [result, setResult] = useState<CycleResult | null>(null);

  const fetchAgents = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("gunit_agents")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setAgents((data || []) as Agent[]);
  };

  useEffect(() => { fetchAgents(); }, [user]);

  const addAgent = async () => {
    if (!newName.trim() || !user) return;
    await supabase.from("gunit_agents").insert({ user_id: user.id, name: newName.trim() });
    setNewName("");
    fetchAgents();
  };

  const deleteAgent = async (id: string) => {
    await supabase.from("gunit_agents").delete().eq("id", id);
    fetchAgents();
  };

  const runCycle = async (agentId: string) => {
    if (!goal.trim()) {
      toast.error("Enter a goal first");
      return;
    }
    setRunningId(agentId);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("gunit-agent-cycle", {
        body: { goal: goal.trim(), agentId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult(data as CycleResult);
      toast.success(`Cycle complete — Score: ${data.score}/10`);
      fetchAgents();
    } catch (e: any) {
      toast.error(e.message || "Cycle failed");
    } finally {
      setRunningId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-2">
        <Cpu className="w-4 h-4 text-[#00e5ff]" />
        <h2 className="font-mono text-sm tracking-widest text-[#00e5ff]">AGENT CONTROL PANEL</h2>
      </div>

      {/* Add Agent */}
      <div className="flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Agent name..."
          className="flex-1 bg-[#0a0a0f] border border-[#ffffff10] rounded px-3 py-2 font-mono text-xs text-[#c0c0c0] placeholder:text-[#404040] focus:outline-none focus:border-[#00e5ff30]"
        />
        <button onClick={addAgent} disabled={!newName.trim()} className="px-3 py-2 bg-[#00e5ff15] border border-[#00e5ff30] rounded font-mono text-xs text-[#00e5ff] hover:bg-[#00e5ff25] disabled:opacity-30 flex items-center gap-1">
          <Plus className="w-3 h-3" /> ADD
        </button>
      </div>

      {/* Goal Input */}
      <div className="bg-[#0a0a0f] border border-[#ffffff10] rounded p-3">
        <label className="font-mono text-[10px] tracking-widest text-[#808080] block mb-2">CYCLE GOAL</label>
        <input
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="Optimize user onboarding flow for higher conversion..."
          className="w-full bg-[#050508] border border-[#ffffff10] rounded px-3 py-2 font-mono text-xs text-[#c0c0c0] placeholder:text-[#404040] focus:outline-none focus:border-[#00ff8830]"
        />
      </div>

      {/* Agent List */}
      <div className="space-y-2">
        {agents.map((agent) => (
          <div key={agent.id} className="bg-[#0a0a0f] border border-[#ffffff10] rounded p-3 flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${agent.status === "active" ? "bg-[#00ff88] animate-pulse" : "bg-[#404040]"}`} />
            <div className="flex-1 min-w-0">
              <p className="font-mono text-xs text-[#c0c0c0]">{agent.name}</p>
              <p className="font-mono text-[10px] text-[#808080]">
                {agent.status.toUpperCase()} • {agent.last_run_at ? `Last: ${format(new Date(agent.last_run_at), "MMM d HH:mm")}` : "Never run"}
              </p>
            </div>
            <button
              onClick={() => runCycle(agent.id)}
              disabled={!!runningId}
              className="px-3 py-1.5 bg-[#00ff8815] border border-[#00ff8830] rounded font-mono text-[10px] text-[#00ff88] hover:bg-[#00ff8825] disabled:opacity-30 flex items-center gap-1"
            >
              {runningId === agent.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
              RUN CYCLE
            </button>
            <button onClick={() => deleteAgent(agent.id)} className="p-1.5 text-[#404040] hover:text-red-400 transition-colors">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
        {agents.length === 0 && (
          <div className="text-center py-8 font-mono text-xs text-[#404040]">No agents. Create one above.</div>
        )}
      </div>

      {/* Cycle Result */}
      {result && (
        <div className="bg-[#0a0a0f] border border-[#00ff8820] rounded space-y-0">
          <div className="px-4 py-2 border-b border-[#ffffff08] flex items-center justify-between">
            <span className="font-mono text-[10px] tracking-widest text-[#00ff88]">CYCLE RESULT</span>
            <span className={`font-mono text-sm font-bold ${result.score >= 7 ? "text-[#00ff88]" : result.score >= 4 ? "text-[#ffaa00]" : "text-[#ff5555]"}`}>
              {result.score}/10
            </span>
          </div>
          {(["plan", "execution", "analysis", "improvement"] as const).map((key) => (
            <div key={key} className="px-4 py-3 border-b border-[#ffffff05]">
              <p className="font-mono text-[10px] tracking-widest text-[#00e5ff50] mb-1">{key.toUpperCase()}</p>
              <p className="font-mono text-xs text-[#c0c0c0] whitespace-pre-wrap">{result[key]}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
