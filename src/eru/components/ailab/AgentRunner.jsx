import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Play, Square, Clock, Plus, ArrowRight } from 'lucide-react';
import { base44 } from '@/eru/api/base44Client';
import { useRealtimeAgentStatus } from '@/eru/hooks/useLiveSync';
import { runCustomAgentTask } from './agentTaskUtils';

const PRESET_TASKS = [
  { id: 'market_watch', label: 'Market Watcher', interval: 60, description: 'Monitor crypto prices and log significant movements' },
  { id: 'portfolio_audit', label: 'Portfolio Auditor', interval: 300, description: 'Audit portfolio health and generate recommendations' },
  { id: 'news_digest', label: 'News Digester', interval: 120, description: 'Summarize latest market and crypto news' },
];

export default function AgentRunner({ bots, globalPolicy = null }) {
  const [runningAgents, setRunningAgents] = useState({});
  const [logs, setLogs] = useState([]);
  const [selectedBot, setSelectedBot] = useState(null);
  const [customTasks, setCustomTasks] = useState([]);
  const agentStatus = useRealtimeAgentStatus(bots);
  const intervals = useRef({});
  const logBottom = useRef(null);

  useEffect(() => {
    if (bots?.length > 0 && !selectedBot) setSelectedBot(bots[0]);
  }, [bots, selectedBot]);

  useEffect(() => {
    base44.entities.AgentTask.list('-updated_date', 100).then(setCustomTasks).catch(() => setCustomTasks([]));
  }, []);

  useEffect(() => {
    logBottom.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Cleanup on unmount
  useEffect(() => {
    return () => Object.values(intervals.current).forEach(clearInterval);
  }, []);

  const addLog = (agentId, message, type = 'info') => {
    setLogs(prev => [...prev.slice(-49), {
      id: Date.now(),
      agentId,
      message,
      type,
      time: new Date().toLocaleTimeString(),
    }]);
  };

  const runAgentCycle = async (task, bot) => {
    if (!bot) return;
    addLog(task.id, `Running: ${task.description}`, 'running');

    const policyBlock = globalPolicy?.is_active ? `\nGlobal instructions: ${globalPolicy.shared_instructions || 'None'}\nSafety guardrails: ${globalPolicy.safety_guardrails || 'None'}\nDefault max response length: ${globalPolicy.max_response_length || 1200} characters\n${globalPolicy.require_caution_for_security ? 'Apply extra caution on security-sensitive topics.\n' : ''}${globalPolicy.require_human_review ? 'Advise human review before risky or irreversible actions.\n' : ''}` : '';
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are ${bot.name} agent. ${bot.instructions || ''}${policyBlock}\n\nAutonomous task: ${task.description}\n\nExecute this task and provide a brief status report (2-3 sentences max). Be direct and factual.`,
    });

    addLog(task.id, res, 'success');
  };

  const runCustomTask = async (task) => {
    const bot = bots.find((item) => item.id === task.bot_id) || selectedBot;
    if (!bot) return;
    addLog(task.id, `Running custom task: ${task.name}`, 'running');
    const result = await runCustomAgentTask(task, bot, globalPolicy);
    addLog(task.id, typeof result.output === 'string' ? result.output : 'Custom task completed.', 'success');
  };

  const startAgent = (task) => {
    if (runningAgents[task.id]) return;
    const bot = selectedBot;
    setRunningAgents(prev => ({ ...prev, [task.id]: true }));
    addLog(task.id, `Agent started — interval: ${task.interval}s`, 'system');

    // Run immediately then on interval
    runAgentCycle(task, bot);
    intervals.current[task.id] = setInterval(() => runAgentCycle(task, bot), task.interval * 1000);
  };

  const stopAgent = (taskId) => {
    clearInterval(intervals.current[taskId]);
    delete intervals.current[taskId];
    setRunningAgents(prev => { const n = { ...prev }; delete n[taskId]; return n; });
    addLog(taskId, 'Agent stopped.', 'system');
  };

  const LOG_COLORS = {
    running: 'text-blue-400',
    success: 'text-green-400',
    system: 'text-muted-foreground',
    error: 'text-red-400',
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-400/5 border border-blue-400/20 rounded-xl p-3 space-y-3">
        <div>
          <p className="text-xs font-semibold text-blue-400 mb-1">🤖 Autonomous Agent Runner</p>
          <p className="text-[10px] text-muted-foreground">Agents run on a timer — executing tasks without waiting for commands.</p>
        </div>
        <Link to="/agent-operations" className="inline-flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary">
          <Plus className="w-3.5 h-3.5" /> Open custom task dashboard <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Bot selector */}
      {bots?.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Assign Bot</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {bots.map(b => (
              <button key={b.id} onClick={() => setSelectedBot(b)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${selectedBot?.id === b.id ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-secondary text-muted-foreground'}`}>
                {b.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Agent tasks */}
      <div className="space-y-2">
        <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Preset Agent Tasks</p>
        {PRESET_TASKS.map(task => {
          const running = !!runningAgents[task.id];
          return (
            <div key={task.id} className={`rounded-xl border p-3 transition-all ${running ? 'border-green-400/30 bg-green-400/5' : 'border-border bg-card'}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${running ? 'bg-green-400 animate-pulse' : 'bg-secondary'}`} />
                    <p className="text-xs font-semibold">{task.label}</p>
                    <span className="text-[9px] text-muted-foreground flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{task.interval}s</span>
                    {selectedBot && agentStatus[selectedBot.id] && (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${agentStatus[selectedBot.id].status === 'active' ? 'border-green-400/30 bg-green-400/10 text-green-400' : 'border-border bg-secondary text-muted-foreground'}`}>
                        {agentStatus[selectedBot.id].status}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground ml-4">{task.description}</p>
                </div>
                <button onClick={() => running ? stopAgent(task.id) : startAgent(task)}
                  disabled={!selectedBot}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-40 ${running ? 'bg-red-400/10 text-red-400 border border-red-400/20' : 'bg-primary/10 text-primary border border-primary/20'}`}>
                  {running ? <><Square className="w-3 h-3" /> Stop</> : <><Play className="w-3 h-3" /> Start</>}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Custom Tasks</p>
          <span className="text-[10px] text-muted-foreground">{customTasks.length} saved</span>
        </div>
        {customTasks.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-3 text-[10px] text-muted-foreground">No custom tasks yet — create them from the custom task dashboard.</div>
        ) : customTasks.slice(0, 4).map((task) => (
          <div key={task.id} className="rounded-xl border border-border bg-card p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-xs font-semibold text-foreground">{task.name}</p>
                  <span className="text-[9px] text-muted-foreground">{task.trigger_type}</span>
                  <span className="text-[9px] text-muted-foreground">{task.action_type}</span>
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground">{task.description || 'Custom workflow task'}</p>
              </div>
              <button onClick={() => runCustomTask(task)} className="flex items-center gap-1 rounded-lg border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
                <Play className="w-3 h-3" /> Run
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Live log */}
      {logs.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Live Agent Log</p>
            <button onClick={() => setLogs([])} className="text-[9px] text-muted-foreground">Clear</button>
          </div>
          <div className="bg-card border border-border rounded-xl p-3 max-h-48 min-h-0 overflow-y-auto overscroll-contain touch-pan-y [-webkit-overflow-scrolling:touch] space-y-1.5">
            {logs.map(log => (
              <div key={log.id} className="flex gap-2 text-[10px]">
                <span className="text-muted-foreground flex-shrink-0">{log.time}</span>
                <span className={`flex-1 leading-relaxed ${LOG_COLORS[log.type] || 'text-foreground'}`}>{log.message}</span>
              </div>
            ))}
            <div ref={logBottom} />
          </div>
        </div>
      )}
    </div>
  );
}