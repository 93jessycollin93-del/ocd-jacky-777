import { useState, useEffect, useMemo } from 'react';
import { Network, ChevronRight, Loader2, Star, GitBranch, MessageSquareShare, Wrench, BrainCircuit } from 'lucide-react';
import { base44 } from '@/eru/api/base44Client';
import { useAuth } from '@/eru/lib/AuthContext';
import CollaborationWorkspace from './CollaborationWorkspace';
import OrchestratorBotSetupPanel from './OrchestratorBotSetupPanel';
import OrchestratorStateBoard from './OrchestratorStateBoard';
import OrchestratorFeedbackPanel from './OrchestratorFeedbackPanel';
import { analyzeNetworkImprovements, createDecisionPlan, resolveFindingConflicts } from './orchestrationDecisioning';

const STAGES = ['plan', 'delegation', 'execution', 'feedback', 'improvement'];
const STAGE_LABELS = { plan: '🗺️ Plan', delegation: '🔀 Delegate', execution: '⚡ Execute', feedback: '💬 Feedback', improvement: '📈 Improve' };

async function runSubAgentWithSelfHealing({ bot, goal, assignment, sharedContext }) {
  const basePrompt = `You are ${bot.name}, a ${bot.role} bot.
Instructions: ${bot.instructions || ''}
Goal: "${goal}"
Your delegated task: ${assignment}
Current team findings:
${sharedContext || 'No shared findings yet.'}

Complete your assignment and share your findings in a concise but useful way for other bots.`;

  try {
    const finding = await base44.integrations.Core.InvokeLLM({ prompt: basePrompt });
    return { finding, recovered: false, retryUsed: false, healingNotes: '' };
  } catch (error) {
    const errorStack = error?.message || String(error);
    const healingResponse = await base44.integrations.Core.InvokeLLM({
      prompt: `You are the master orchestration agent.
A sub-agent failed while trying to complete a delegated task.

Sub-agent: ${bot.name} (${bot.role})
Original instructions: ${bot.instructions || 'None'}
Goal: ${goal}
Delegated task: ${assignment}
Error stack or message: ${errorStack}
Shared team context: ${sharedContext || 'No shared findings yet.'}

Return a JSON object with:
- revised_instruction: a short corrected instruction block that helps the sub-agent avoid this failure
- retry_focus: one short sentence describing what to change on the retry`,
      response_json_schema: {
        type: 'object',
        properties: {
          revised_instruction: { type: 'string' },
          retry_focus: { type: 'string' }
        },
        required: ['revised_instruction', 'retry_focus']
      }
    });

    const retryPrompt = `You are ${bot.name}, a ${bot.role} bot.
Original instructions: ${bot.instructions || ''}
Revised master instructions: ${healingResponse.revised_instruction}
Retry focus: ${healingResponse.retry_focus}
Goal: "${goal}"
Your delegated task: ${assignment}
Current team findings:
${sharedContext || 'No shared findings yet.'}

This is a single retry after a failure. Complete the task clearly and avoid the previous error.`;

    try {
      const retryFinding = await base44.integrations.Core.InvokeLLM({ prompt: retryPrompt });
      return {
        finding: retryFinding,
        recovered: true,
        retryUsed: true,
        healingNotes: `Recovered after retry. Error: ${errorStack}. Fix: ${healingResponse.retry_focus}`,
      };
    } catch (retryError) {
      return {
        finding: `Sub-agent failed after retry. Initial error: ${errorStack}. Retry error: ${retryError?.message || String(retryError)}`,
        recovered: false,
        retryUsed: true,
        healingNotes: `Retry failed. Initial error: ${errorStack}`,
      };
    }
  }
}

export default function MultiAgentOrchestrator({ bots }) {
  const { currentUser } = useAuth();
  const [goal, setGoal] = useState('');
  const [running, setRunning] = useState(false);
  const [stage, setStage] = useState(null);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [routerBotId, setRouterBotId] = useState('');
  const [specialistBotIds, setSpecialistBotIds] = useState([]);

  const routerBot = useMemo(() => bots.find((bot) => bot.id === routerBotId) || null, [bots, routerBotId]);
  const specialistBots = useMemo(() => bots.filter((bot) => specialistBotIds.includes(bot.id) && bot.id !== routerBotId), [bots, specialistBotIds, routerBotId]);

  const loadHistory = async () => {
    setLoadingHistory(true);
    const data = await base44.entities.BotImprovement.list('-created_date', 10);
    setHistory(data);
    setLoadingHistory(false);
  };

  useEffect(() => { loadHistory(); }, []);

  useEffect(() => {
    if (!routerBotId && bots.length > 0) {
      setRouterBotId(bots[0].id);
    }
    if (specialistBotIds.length === 0 && bots.length > 1) {
      setSpecialistBotIds(bots.slice(1, 4).map((bot) => bot.id));
    }
  }, [bots, routerBotId, specialistBotIds.length]);

  const toggleSpecialistBot = (botId) => {
    setSpecialistBotIds((prev) => prev.includes(botId) ? prev.filter((id) => id !== botId) : [...prev, botId]);
  };

  const runCycle = async () => {
    if (!goal.trim() || running || !routerBot || specialistBots.length === 0) return;
    setRunning(true);
    setResult(null);
    const cycleResult = { delegations: [], findings: [], feedback: [], healing_events: [], communication_bridges: [], conflict_risks: [], redundancy_risks: [], efficiency_notes: [], router_bot_id: routerBot.id, specialist_bot_ids: specialistBots.map((bot) => bot.id) };

    setStage('plan');
    const decisionPlan = await createDecisionPlan({ goal, bots: [routerBot, ...specialistBots] });
    const selectedBots = [routerBot, ...specialistBots].filter((bot) => (decisionPlan.selected_bot_ids || []).includes(bot.id) || specialistBots.some((item) => item.id === bot.id)).slice(0, 6);
    cycleResult.plan = await base44.integrations.Core.InvokeLLM({
      prompt: `You are ${routerBot.name}, the master router bot coordinating specialist agents.
Goal: "${goal}"
Router bot: ${routerBot.name} (${routerBot.role})
Specialist bots: ${selectedBots.filter((bot) => bot.id !== routerBot.id).map((bot) => `${bot.name} (${bot.role})`).join(', ')}
Decision notes: ${(decisionPlan.efficiency_notes || []).join(' | ')}

Create a short collaboration plan describing how the router should delegate work, manage shared state, and close feedback loops between specialists.`,
    });

    setStage('delegation');
    cycleResult.delegations = (decisionPlan.delegations || []).filter((item) => selectedBots.some((bot) => bot.id === item.bot_id));
    cycleResult.communication_bridges = decisionPlan.communication_bridges || [];
    cycleResult.conflict_risks = decisionPlan.conflict_risks || [];
    cycleResult.redundancy_risks = decisionPlan.redundancy_risks || [];
    cycleResult.efficiency_notes = decisionPlan.efficiency_notes || [];

    setStage('execution');
    for (const delegation of cycleResult.delegations) {
      const bot = selectedBots.find((item) => item.id === delegation.bot_id);
      if (!bot) continue;
      const sharedContext = cycleResult.findings.map((item) => `${bots.find((b) => b.id === item.bot_id)?.name || 'Bot'}: ${item.finding}`).join('\n');
      const dependencyContext = (delegation.dependencies || []).map((dependencyId) => {
        const dependencyFinding = cycleResult.findings.find((item) => item.bot_id === dependencyId);
        return dependencyFinding ? `${bots.find((b) => b.id === dependencyId)?.name || dependencyId}: ${dependencyFinding.finding}` : null;
      }).filter(Boolean).join('\n');
      const executionResult = await runSubAgentWithSelfHealing({
        bot,
        goal,
        assignment: `${delegation.assignment}\nReason for selection: ${delegation.reason || 'Best fit for task'}${dependencyContext ? `\nRequired prior context:\n${dependencyContext}` : ''}`,
        sharedContext: `${sharedContext}${cycleResult.communication_bridges.length ? `\n\nCommunication bridges:\n${cycleResult.communication_bridges.join('\n')}` : ''}`,
      });
      cycleResult.findings.push({
        bot_id: bot.id,
        finding: executionResult.finding,
        retry_used: executionResult.retryUsed,
        recovered: executionResult.recovered,
        healing_notes: executionResult.healingNotes,
      });
      if (executionResult.retryUsed) {
        cycleResult.healing_events.push({
          bot_id: bot.id,
          bot_name: bot.name,
          recovered: executionResult.recovered,
          notes: executionResult.healingNotes,
        });
      }
      await base44.entities.UserBot.update(bot.id, { xp: (bot.xp || 0) + 8, usage_count: (bot.usage_count || 0) + 1 }).catch(() => {});
    }

    setStage('feedback');
    for (let i = 0; i < cycleResult.findings.length; i += 1) {
      const current = cycleResult.findings[i];
      const reviewer = selectedBots.find((bot) => bot.id !== current.bot_id);
      if (!reviewer) continue;
      const feedback = await base44.integrations.Core.InvokeLLM({
        prompt: `You are ${reviewer.name}, reviewing another bot's work.
Goal: "${goal}"
Bot finding to review:
${current.finding}

Give short feedback that improves accuracy, catches gaps, or suggests a better next step.`,
      });
      cycleResult.feedback.push({ from_bot_id: reviewer.id, to_bot_id: current.bot_id, feedback });
    }

    const conflictResolution = await resolveFindingConflicts({
      goal,
      findings: cycleResult.findings.map((item) => ({ ...item, bot_name: bots.find((b) => b.id === item.bot_id)?.name || item.bot_id })),
      feedback: cycleResult.feedback.map((item) => ({ ...item, reviewer_bot_name: bots.find((b) => b.id === item.from_bot_id)?.name || item.from_bot_id }))
    });

    setStage('improvement');
    const finalResponse = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a lead orchestration AI creating the final team answer.
Goal: "${goal}"
Plan: ${cycleResult.plan}
Delegations: ${cycleResult.delegations.map((item) => `${bots.find((b) => b.id === item.bot_id)?.name || item.bot_id}: ${item.assignment}`).join('\n')}
Findings: ${cycleResult.findings.map((item) => `${bots.find((b) => b.id === item.bot_id)?.name || item.bot_id}: ${item.finding}${item.retry_used ? ` [retry used: ${item.recovered ? 'recovered' : 'failed'}]` : ''}`).join('\n\n')}
Feedback: ${cycleResult.feedback.map((item) => `${bots.find((b) => b.id === item.from_bot_id)?.name || item.from_bot_id} on ${bots.find((b) => b.id === item.to_bot_id)?.name || item.to_bot_id}: ${item.feedback}`).join('\n')}
Conflict resolution summary: ${conflictResolution.resolved_summary}
Conflict actions: ${(conflictResolution.actions || []).join(' | ')}
Winning findings: ${(conflictResolution.winning_findings || []).join(' | ')}
Self-healing events: ${cycleResult.healing_events.length > 0 ? cycleResult.healing_events.map((item) => `${item.bot_name}: ${item.notes}`).join('\n') : 'None'}

Produce:
1. A final synthesized answer
2. A short improvement summary
3. On the last line only, a score from 1-10`
    });

    const lines = finalResponse.split('\n').filter(Boolean);
    const scoreMatch = finalResponse.match(/\b([0-9]|10)\b/g);
    const score = scoreMatch ? parseInt(scoreMatch[scoreMatch.length - 1]) : 7;
    cycleResult.final = lines.slice(0, -1).join('\n') || finalResponse;
    cycleResult.improvement = lines.slice(0, -1).slice(-2).join('\n') || 'Team collaboration completed.';
    cycleResult.execution = cycleResult.findings.map((item) => `${bots.find((b) => b.id === item.bot_id)?.name || item.bot_id}: ${item.finding}`).join('\n\n');
    cycleResult.analysis = cycleResult.feedback.map((item) => `${bots.find((b) => b.id === item.from_bot_id)?.name || item.from_bot_id} → ${bots.find((b) => b.id === item.to_bot_id)?.name || item.to_bot_id}: ${item.feedback}`).join('\n');
    cycleResult.conflict_resolution = conflictResolution;
    cycleResult.score = score;
    cycleResult.network_insights = await analyzeNetworkImprovements({ bots: selectedBots, result: cycleResult });

    await base44.entities.BotImprovement.create({
      goal,
      plan: cycleResult.plan,
      execution: cycleResult.execution,
      analysis: cycleResult.analysis,
      improvement: cycleResult.improvement,
      score: cycleResult.score,
      user_email: currentUser?.email,
    });

    setResult(cycleResult);
    setStage(null);
    setRunning(false);
    loadHistory();
  };

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="bg-orange-400/5 border border-orange-400/20 rounded-xl p-3 space-y-2">
        <p className="text-xs font-semibold text-orange-400 mb-1">🌐 Multi-Agent Orchestrator</p>
        <p className="text-[10px] text-muted-foreground">Bots now collaborate on complex tasks through delegation, shared findings, peer feedback, and final synthesis.</p>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1 rounded-full border border-orange-400/20 bg-orange-400/10 px-2 py-1 text-[10px] text-orange-300"><GitBranch className="w-3 h-3" /> Delegate work</span>
          <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-1 text-[10px] text-primary"><Network className="w-3 h-3" /> Share findings</span>
          <span className="inline-flex items-center gap-1 rounded-full border border-blue-400/20 bg-blue-400/10 px-2 py-1 text-[10px] text-blue-300"><MessageSquareShare className="w-3 h-3" /> Peer feedback</span>
          <span className="inline-flex items-center gap-1 rounded-full border border-yellow-400/20 bg-yellow-400/10 px-2 py-1 text-[10px] text-yellow-300"><Wrench className="w-3 h-3" /> Self-heal retry</span>
        </div>
      </div>

      <OrchestratorBotSetupPanel
        bots={bots}
        routerBotId={routerBotId}
        specialistBotIds={specialistBotIds}
        onRouterChange={setRouterBotId}
        onToggleSpecialist={toggleSpecialistBot}
      />

      <OrchestratorStateBoard routerBot={routerBot} specialists={specialistBots} result={result} />

      {/* Goal input */}
      <div className="space-y-2">
        <label className="text-xs text-muted-foreground">Define your goal</label>
        <textarea value={goal} onChange={e => setGoal(e.target.value)}
          placeholder="e.g. Increase portfolio ROI by 15% through diversification and automated rebalancing..."
          className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm outline-none resize-none min-h-[80px] text-foreground" />
        <button onClick={runCycle} disabled={!goal.trim() || running || !routerBot || specialistBots.length === 0}
          className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-400 text-white rounded-xl py-3 font-semibold text-sm disabled:opacity-40 transition-all">
          {running ? <><Loader2 className="w-4 h-4 animate-spin" /> Running orchestrator…</> : <><Network className="w-4 h-4" /> Run master router</>}
        </button>
      </div>

      {/* Stage progress */}
      {running && (
        <div className="flex items-center gap-1">
          {STAGES.map((s, i) => (
            <div key={s} className="flex items-center flex-1">
              <div className={`flex-1 h-1.5 rounded-full transition-all duration-500 ${stage === s ? 'bg-orange-400 animate-pulse' : STAGES.indexOf(stage) > i ? 'bg-primary' : 'bg-secondary'}`} />
              {i < STAGES.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />}
            </div>
          ))}
        </div>
      )}
      {running && stage && (
        <p className="text-xs text-center text-orange-400 font-medium">{STAGE_LABELS[stage]} in progress…</p>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold">Cycle Complete</p>
            <div className="flex items-center gap-1">
              {Array.from({ length: result.score }).map((_, i) => (
                <Star key={i} className="w-3 h-3 text-yellow-400 fill-yellow-400" />
              ))}
              <span className="text-xs text-muted-foreground ml-1">{result.score}/10</span>
            </div>
          </div>
          <CollaborationWorkspace result={result} bots={bots} />
          <OrchestratorFeedbackPanel result={result} bots={bots} />
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <BrainCircuit className="w-4 h-4 text-primary" />
              <p className="text-xs font-semibold text-foreground">AI network insights</p>
            </div>
            <p className="text-[11px] text-muted-foreground">{result.network_insights?.monitoring_summary}</p>
            <div className="grid gap-2 sm:grid-cols-2 text-[11px]">
              <div className="rounded-lg border border-border bg-background p-3">
                <p className="text-[10px] font-semibold text-foreground">Structure improvements</p>
                <div className="mt-1 space-y-1">{(result.network_insights?.network_improvements || []).map((item) => <p key={item} className="text-muted-foreground">• {item}</p>)}</div>
              </div>
              <div className="rounded-lg border border-border bg-background p-3">
                <p className="text-[10px] font-semibold text-foreground">Handoff improvements</p>
                <div className="mt-1 space-y-1">{(result.network_insights?.handoff_improvements || []).map((item) => <p key={item} className="text-muted-foreground">• {item}</p>)}</div>
              </div>
            </div>
          </div>

          <details className="bg-card border border-border rounded-xl overflow-hidden">
            <summary className="px-3 py-2.5 text-xs font-medium cursor-pointer flex items-center gap-2 hover:bg-secondary/40">
              Full collaboration trace
            </summary>
            <div className="px-3 pb-3 text-[10px] text-muted-foreground leading-relaxed border-t border-border/50 pt-2 space-y-3">
              <div>
                <p className="font-semibold text-foreground mb-1">Plan</p>
                <p>{result.plan}</p>
              </div>
              <div>
                <p className="font-semibold text-foreground mb-1">Execution</p>
                <p>{result.execution}</p>
              </div>
              <div>
                <p className="font-semibold text-foreground mb-1">Feedback</p>
                <p>{result.analysis}</p>
              </div>
              <div>
                <p className="font-semibold text-foreground mb-1">Improvement</p>
                <p>{result.improvement}</p>
              </div>
              <div>
                <p className="font-semibold text-foreground mb-1">Conflict resolution</p>
                <p>{result.conflict_resolution?.resolved_summary}</p>
                <div className="mt-1 space-y-1">{(result.conflict_resolution?.actions || []).map((item) => <p key={item}>• {item}</p>)}</div>
              </div>
              {result.healing_events?.length > 0 && (
                <div>
                  <p className="font-semibold text-foreground mb-1">Self-healing retries</p>
                  <div className="space-y-2">
                    {result.healing_events.map((item, index) => (
                      <div key={`${item.bot_id}_${index}`} className="rounded-lg border border-yellow-400/20 bg-yellow-400/5 p-2">
                        <p className="text-foreground">{item.bot_name} · {item.recovered ? 'Recovered' : 'Retry failed'}</p>
                        <p>{item.notes}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </details>
        </div>
      )}

      {/* History */}
      <div className="space-y-2">
        <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Improvement History</p>
        {loadingHistory ? (
          <div className="flex justify-center py-4"><div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : history.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No cycles run yet</p>
        ) : (
          history.map(h => (
            <div key={h.id} className="bg-card border border-border rounded-xl p-3 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-orange-400/10 border border-orange-400/20 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-orange-400">{h.score || '?'}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{h.goal}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{h.improvement?.slice(0, 100)}…</p>
                <p className="text-[9px] text-muted-foreground mt-1">{new Date(h.created_date).toLocaleDateString()}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}