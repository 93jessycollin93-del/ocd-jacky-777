import { useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Brain, GripVertical, Sparkles, Target, X } from 'lucide-react';

const CHANGE_LIBRARY = [
  { id: 'clarity', label: 'More clarity', impact: 8, risk: -2, note: 'Tightens instruction wording and reduces ambiguity.' },
  { id: 'structure', label: 'More structure', impact: 6, risk: -1, note: 'Pushes the bot toward clearer step-by-step answers.' },
  { id: 'strictness', label: 'Higher strictness', impact: 4, risk: 3, note: 'Improves policy discipline but may reduce flexibility.' },
  { id: 'creativity', label: 'More creativity', impact: 3, risk: 4, note: 'Can raise quality on open-ended tasks but add variance.' },
  { id: 'data_usage', label: 'Stronger data use', impact: 7, risk: 1, note: 'Encourages better use of connected sources and evidence.' },
  { id: 'brevity', label: 'Shorter answers', impact: 2, risk: 2, note: 'Speeds responses but may miss nuanced details.' },
];

function reorder(items, fromIndex, toIndex) {
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function buildSimulationData(basePassRate, changes) {
  let current = basePassRate;
  return changes.map((change, index) => {
    const sequenceBoost = Math.max(0, 3 - index);
    current = clamp(current + change.impact - change.risk + sequenceBoost, 0, 100);
    return {
      step: `Step ${index + 1}`,
      label: change.label,
      projected: current,
    };
  });
}

export default function BotStrategySimulationOverlay({ open, onClose, selectedBot, testCases = [], results = [], candidateInstructions = '' }) {
  const [queuedChanges, setQueuedChanges] = useState(CHANGE_LIBRARY.slice(0, 3));
  const [dragIndex, setDragIndex] = useState(null);

  const baselinePassRate = useMemo(() => {
    if (results.length > 0) {
      return Math.round((results.filter((item) => item.currentScore >= item.minScore).length / results.length) * 100);
    }
    if (testCases.length > 0) return 68;
    return 0;
  }, [results, testCases]);

  const candidatePassRate = useMemo(() => {
    if (results.length > 0) {
      return Math.round((results.filter((item) => item.candidateScore >= item.minScore).length / results.length) * 100);
    }
    return clamp(baselinePassRate + (candidateInstructions.trim() ? 7 : 0), 0, 100);
  }, [results, baselinePassRate, candidateInstructions]);

  const simulationData = useMemo(() => buildSimulationData(candidatePassRate || baselinePassRate, queuedChanges), [candidatePassRate, baselinePassRate, queuedChanges]);
  const finalProjection = simulationData[simulationData.length - 1]?.projected ?? candidatePassRate ?? baselinePassRate;
  const riskLevel = useMemo(() => {
    const totalRisk = queuedChanges.reduce((sum, item) => sum + item.risk, 0);
    if (totalRisk >= 9) return 'high';
    if (totalRisk >= 5) return 'medium';
    return 'low';
  }, [queuedChanges]);

  const addChange = (change) => {
    if (queuedChanges.some((item) => item.id === change.id)) return;
    setQueuedChanges((prev) => [...prev, change]);
  };

  const removeChange = (id) => setQueuedChanges((prev) => prev.filter((item) => item.id !== id));

  const handleDrop = (dropIndex) => {
    if (dragIndex === null || dragIndex === dropIndex) return;
    setQueuedChanges((prev) => reorder(prev, dragIndex, dropIndex));
    setDragIndex(null);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 sm:items-center sm:p-6">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-3xl border border-border bg-background shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-border bg-background/95 px-4 py-4 backdrop-blur sm:px-6">
          <div>
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">Instruction strategy simulator</p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Drag changes to model how instruction updates may shift historical performance before you publish them.</p>
          </div>
          <button onClick={onClose} className="rounded-xl border border-border bg-card p-2 text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-4 py-4 sm:px-6 sm:py-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-[11px] text-muted-foreground">Historical baseline</p>
              <p className="mt-2 text-2xl font-bold text-foreground">{baselinePassRate}%</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-[11px] text-muted-foreground">Current draft estimate</p>
              <p className="mt-2 text-2xl font-bold text-primary">{candidatePassRate}%</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-[11px] text-muted-foreground">Projected after sequence</p>
              <p className="mt-2 text-2xl font-bold text-green-400">{finalProjection}%</p>
              <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">Risk {riskLevel}</p>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold text-foreground">Drag-and-drop change stack</p>
                </div>
                <div className="space-y-2">
                  {queuedChanges.map((change, index) => (
                    <div
                      key={change.id}
                      draggable
                      onDragStart={() => setDragIndex(index)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => handleDrop(index)}
                      className="flex items-start gap-3 rounded-2xl border border-border bg-background p-3"
                    >
                      <button className="mt-0.5 text-muted-foreground">
                        <GripVertical className="h-4 w-4" />
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-foreground">{change.label}</p>
                          <button onClick={() => removeChange(change.id)} className="text-[11px] text-muted-foreground">Remove</button>
                        </div>
                        <p className="mt-1 text-[11px] text-muted-foreground">{change.note}</p>
                        <p className="mt-2 text-[10px] text-primary">Projected effect: +{change.impact}% · Risk: {change.risk}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold text-foreground">Available changes</p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {CHANGE_LIBRARY.map((change) => (
                    <button key={change.id} onClick={() => addChange(change)} disabled={queuedChanges.some((item) => item.id === change.id)} className="rounded-2xl border border-border bg-background p-3 text-left disabled:opacity-40">
                      <p className="text-sm font-semibold text-foreground">{change.label}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">{change.note}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Brain className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold text-foreground">Projected performance curve</p>
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={[{ step: 'Baseline', projected: baselinePassRate }, { step: 'Draft', projected: candidatePassRate }, ...simulationData]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="step" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                    <Area type="monotone" dataKey="projected" stroke="hsl(var(--primary))" fill="rgba(16,185,129,0.18)" strokeWidth={2.5} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
                <p className="text-sm font-semibold text-foreground">Simulation feedback</p>
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-[11px] text-muted-foreground">
                  For <span className="font-semibold text-foreground">{selectedBot?.name || 'this bot'}</span>, this change sequence suggests a move from <span className="font-semibold text-foreground">{baselinePassRate}%</span> historical pass rate to about <span className="font-semibold text-green-400">{finalProjection}%</span> if applied in the shown order.
                </div>
                <div className="space-y-2">
                  {queuedChanges.map((change, index) => (
                    <div key={change.id} className="rounded-xl border border-border bg-background p-3">
                      <p className="text-xs font-semibold text-foreground">{index + 1}. {change.label}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">{change.note}</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-xl border border-dashed border-border p-3 text-[11px] text-muted-foreground">
                  This overlay is a safe pre-apply simulator based on your historical test signal and draft strategy shape. It does not change the bot until you publish normally.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}