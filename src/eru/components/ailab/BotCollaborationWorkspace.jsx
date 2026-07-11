import { useEffect, useMemo, useState } from 'react';
import { BrainCircuit, CheckSquare, Loader2, MessageSquareShare, Square, Users, GitBranch } from 'lucide-react';
import SpeechToTextInput from './SpeechToTextInput.jsx';
import CollaborationLiveRoom from './CollaborationLiveRoom.jsx';
import { base44 } from '@/eru/api/base44Client';
import { analyzeNetworkImprovements, createDecisionPlan, resolveFindingConflicts } from './orchestrationDecisioning';

export default function BotCollaborationWorkspace({ bots }) {
  const [title, setTitle] = useState('');
  const [goal, setGoal] = useState('');
  const [selectedBotIds, setSelectedBotIds] = useState([]);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [liveMessages, setLiveMessages] = useState([]);
  const [guidance, setGuidance] = useState('');
  const [guidanceNotes, setGuidanceNotes] = useState([]);

  const selectedBots = useMemo(() => bots.filter((bot) => selectedBotIds.includes(bot.id)), [bots, selectedBotIds]);

  const loadSessions = async () => {
    const rows = await base44.entities.BotCollaborationSession.list('-created_date', 12);
    setSessions(rows);
  };

  useEffect(() => { loadSessions(); }, []);

  const toggleBot = (botId) => {
    setSelectedBotIds((prev) => prev.includes(botId) ? prev.filter((id) => id !== botId) : [...prev, botId]);
  };

  const runCollaboration = async () => {
    if (!goal.trim() || selectedBots.length < 2 || running) return;
    setRunning(true);
    setResult(null);
    setGuidance('');
    setGuidanceNotes([]);
    setLiveMessages([{ role: 'system', label: 'Session started', content: `Starting collaboration for: ${goal}` }]);

    const decisionPlan = await createDecisionPlan({ goal, bots: selectedBots, userGuidance: guidanceNotes });
    const delegationPlan = (decisionPlan.delegations || []).map((item) => {
      const bot = selectedBots.find((entry) => entry.id === item.bot_id);
      return {
        bot_id: item.bot_id,
        bot_name: bot?.name || 'Unknown bot',
        task: item.assignment,
        reason: item.reason,
        dependencies: item.dependencies || []
      };
    });

    setLiveMessages((prev) => [...prev, {
      role: 'system',
      label: 'Delegation plan',
      content: delegationPlan.map((item) => `${item.bot_name}: ${item.task} (${item.reason})`).join('\n')
    }]);

    const findings = [];
    for (const item of delegationPlan) {
      const bot = selectedBots.find((entry) => entry.id === item.bot_id);
      const currentGuidance = guidanceNotes.length > 0 ? `\nLive guidance from the user:\n${guidanceNotes.map((note) => `- ${note}`).join('\n')}` : '';
      const dependencyContext = (item.dependencies || []).map((dependencyId) => {
        const dependencyFinding = findings.find((entry) => entry.bot_id === dependencyId);
        return dependencyFinding ? `${dependencyFinding.bot_name}: ${dependencyFinding.finding}` : null;
      }).filter(Boolean).join('\n');
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are ${bot.name}. ${bot.instructions || ''}
Role: ${bot.role}
Task goal: ${goal}
Your delegated task: ${item.task}
Reason you were selected: ${item.reason || 'Best fit'}${currentGuidance}${dependencyContext ? `\nDependency context:\n${dependencyContext}` : ''}

Produce your best finding for the team. Be concrete, useful, and concise.`
      });
      findings.push({ ...item, finding: response });
      setLiveMessages((prev) => [...prev, { role: 'bot', label: `${bot.name} finding`, content: response }]);
    }

    const feedback = [];
    for (const reviewer of selectedBots) {
      const peerSummary = findings.filter((item) => item.bot_id !== reviewer.id).map((item) => `${item.bot_name}: ${item.finding}`).join('\n\n');
      const currentGuidance = guidanceNotes.length > 0 ? `\nUser guidance to consider:\n${guidanceNotes.map((note) => `- ${note}`).join('\n')}` : '';
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are ${reviewer.name}. ${reviewer.instructions || ''}
Goal: ${goal}
Other bots shared these findings:
${peerSummary}${currentGuidance}

Give short peer feedback that improves quality, catches gaps, and increases accuracy.`
      });
      feedback.push({
        reviewer_bot_id: reviewer.id,
        reviewer_bot_name: reviewer.name,
        feedback: response,
      });
      setLiveMessages((prev) => [...prev, { role: 'bot', label: `${reviewer.name} feedback`, content: response }]);
    }

    const conflictResolution = await resolveFindingConflicts({ goal, findings, feedback });

    const finalOutput = await base44.integrations.Core.InvokeLLM({
      prompt: `Synthesize this collaborative bot work into one final answer.
Goal: ${goal}
Delegation plan:
${delegationPlan.map((item) => `${item.bot_name}: ${item.task}`).join('\n')}

Findings:
${findings.map((item) => `${item.bot_name}: ${item.finding}`).join('\n\n')}

Peer feedback:
${feedback.map((item) => `${item.reviewer_bot_name}: ${item.feedback}`).join('\n\n')}

Conflict resolution:
${conflictResolution.resolved_summary}
Actions:
${(conflictResolution.actions || []).join('\n')}

Live user guidance:
${guidanceNotes.length > 0 ? guidanceNotes.map((note) => `- ${note}`).join('\n') : 'None'}

Return the best final answer with clear sections: Summary, Key Findings, Recommended Next Step.`
    });
    setLiveMessages((prev) => [...prev, { role: 'system', label: 'Final synthesis', content: finalOutput }]);

    const networkInsights = await analyzeNetworkImprovements({
      bots: selectedBots,
      result: {
        delegation_plan: delegationPlan,
        findings,
        feedback,
        final_output: finalOutput,
        conflict_resolution: conflictResolution,
        communication_bridges: decisionPlan.communication_bridges || [],
        efficiency_notes: decisionPlan.efficiency_notes || []
      }
    });

    const payload = {
      title: title.trim() || 'Bot Collaboration Session',
      goal,
      status: 'completed',
      selected_bot_ids: selectedBotIds,
      delegation_plan: delegationPlan,
      findings,
      feedback,
      final_output: finalOutput,
      conflict_resolution: conflictResolution,
      communication_bridges: decisionPlan.communication_bridges || [],
      efficiency_notes: decisionPlan.efficiency_notes || [],
      network_insights: networkInsights,
    };

    await base44.entities.BotCollaborationSession.create(payload);
    setResult(payload);
    setTitle('');
    setGoal('');
    setSelectedBotIds([]);
    setRunning(false);
    loadSessions();
  };

  const sendGuidance = () => {
    if (!guidance.trim() || !running) return;
    const note = guidance.trim();
    setGuidanceNotes((prev) => [...prev, note]);
    setLiveMessages((prev) => [...prev, { role: 'user', label: 'User guidance', content: note }]);
    setGuidance('');
  };

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
        <p className="text-xs font-semibold text-primary mb-1">🤝 Bot Collaboration Workspace</p>
        <p className="text-[10px] text-muted-foreground">Bots can split work, share findings, review each other, and produce a stronger final answer together.</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Session title"
          className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-sm outline-none text-foreground"
        />
        <SpeechToTextInput
          value={goal}
          onChange={setGoal}
          placeholder="Describe the complex task you want the bots to solve together..."
          multiline
          minHeightClass="min-h-[90px]"
        />
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Choose collaborating bots</p>
          <div className="space-y-2">
            {bots.map((bot) => (
              <button
                key={bot.id}
                onClick={() => toggleBot(bot.id)}
                className={`w-full rounded-xl border px-3 py-2.5 text-left ${selectedBotIds.includes(bot.id) ? 'border-primary bg-primary/10' : 'border-border bg-secondary'}`}
              >
                <div className="flex items-center gap-2">
                  {selectedBotIds.includes(bot.id) ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4 text-muted-foreground" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground">{bot.name}</p>
                    <p className="text-[10px] text-muted-foreground">{bot.role} · {bot.response_style || 'detailed'}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={runCollaboration}
          disabled={!goal.trim() || selectedBotIds.length < 2 || running}
          className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-40"
        >
          {running ? 'Running collaboration…' : 'Run collaborative task'}
        </button>
      </div>

      {running && (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin text-primary" /> Bots are delegating, sharing findings, and reviewing each other.
        </div>
      )}

      <CollaborationLiveRoom
        messages={liveMessages}
        guidance={guidance}
        setGuidance={setGuidance}
        onSendGuidance={sendGuidance}
        running={running}
      />

      {result && (
        <div className="space-y-3">
          <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
            <div className="flex items-center gap-2">
              <BrainCircuit className="w-4 h-4 text-primary" />
              <p className="text-sm font-semibold">Final collaborative result</p>
            </div>
            <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">{result.final_output}</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <p className="text-sm font-semibold">Delegation and findings</p>
            </div>
            {result.findings.map((item) => (
              <div key={item.bot_id} className="rounded-xl border border-border bg-secondary p-3 space-y-1.5">
                <p className="text-xs font-semibold text-foreground">{item.bot_name}</p>
                <p className="text-[10px] text-primary">Task: {item.task}</p>
                {item.reason && <p className="text-[10px] text-muted-foreground">Why selected: {item.reason}</p>}
                <p className="text-[11px] text-muted-foreground whitespace-pre-wrap leading-relaxed">{item.finding}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-primary" />
              <p className="text-sm font-semibold">AI coordination insights</p>
            </div>
            <div className="space-y-2 text-[11px] text-muted-foreground">
              {(result.communication_bridges || []).map((item) => <p key={item}>• {item}</p>)}
            </div>
            {result.conflict_resolution?.resolved_summary && (
              <div className="rounded-xl border border-border bg-secondary p-3">
                <p className="text-xs font-semibold text-foreground">Conflict resolution</p>
                <p className="mt-1 text-[11px] text-muted-foreground whitespace-pre-wrap leading-relaxed">{result.conflict_resolution.resolved_summary}</p>
              </div>
            )}
            {result.network_insights?.monitoring_summary && (
              <div className="rounded-xl border border-border bg-secondary p-3 space-y-2">
                <p className="text-xs font-semibold text-foreground">Efficiency monitor</p>
                <p className="text-[11px] text-muted-foreground">{result.network_insights.monitoring_summary}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <p className="text-[10px] font-semibold text-foreground">Network improvements</p>
                    {(result.network_insights.network_improvements || []).map((item) => <p key={item} className="text-[11px] text-muted-foreground">• {item}</p>)}
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-foreground">Handoff improvements</p>
                    {(result.network_insights.handoff_improvements || []).map((item) => <p key={item} className="text-[11px] text-muted-foreground">• {item}</p>)}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <MessageSquareShare className="w-4 h-4 text-primary" />
              <p className="text-sm font-semibold">Peer feedback</p>
            </div>
            {result.feedback.map((item) => (
              <div key={item.reviewer_bot_id} className="rounded-xl border border-border bg-secondary p-3">
                <p className="text-xs font-semibold text-foreground">{item.reviewer_bot_name}</p>
                <p className="mt-1 text-[11px] text-muted-foreground whitespace-pre-wrap leading-relaxed">{item.feedback}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Recent collaboration sessions</p>
        {sessions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No collaboration sessions yet.</div>
        ) : sessions.map((session) => (
          <div key={session.id} className="rounded-xl border border-border bg-card p-3">
            <p className="text-xs font-semibold text-foreground">{session.title}</p>
            <p className="mt-1 text-[10px] text-muted-foreground line-clamp-2">{session.goal}</p>
          </div>
        ))}
      </div>
    </div>
  );
}