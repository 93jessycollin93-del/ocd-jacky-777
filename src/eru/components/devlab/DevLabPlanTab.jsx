import { useState } from 'react';
import { CheckCircle2, Copy, Archive, Edit3, FileText, ShieldCheck, AlertTriangle } from 'lucide-react';
import ConfirmDialog from '@/eru/components/ConfirmDialog';

const SECTIONS = [
  { key: 'goal', label: 'Goal' },
  { key: 'assumptions', label: 'Assumptions' },
  { key: 'required_files', label: 'Required Files' },
  { key: 'data_models', label: 'Data Models' },
  { key: 'ui_changes', label: 'UI Changes' },
  { key: 'backend_changes', label: 'Backend Changes' },
  { key: 'security_risks', label: 'Security Risks' },
  { key: 'testing_plan', label: 'Testing Plan' },
  { key: 'rollback_plan', label: 'Rollback Plan' },
];

/**
 * DevLabPlanTab — renders the current plan as readable structured cards plus
 * full markdown copy/export. Honest source label so users always know if a
 * plan came from a template or a real AI provider.
 */
export default function DevLabPlanTab({
  plan,
  plans = [],
  onSelectPlan,
  onApprove,
  onConvertToTasks,
  onArchive,
  onUpdateField,
  isOwner,
}) {
  const [confirmConvert, setConfirmConvert] = useState(false);

  if (!plan) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center">
        <FileText className="mx-auto h-8 w-8 text-muted-foreground/40" />
        <p className="mt-2 text-sm font-medium text-foreground">No plan yet</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Type a goal in the prompt bar below — Plan Mode will draft a structured plan.
        </p>
      </div>
    );
  }

  const copy = (text) => navigator.clipboard?.writeText(text || '').catch(() => {});
  const sourceLabel = plan.source === 'ai_generated' ? 'AI-generated' : plan.source === 'manual' ? 'Manual entry' : 'Template (no AI provider)';

  return (
    <div className="space-y-3">
      {/* Plan header card */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Current plan · v{plan.version_number || 1}</p>
            <h3 className="mt-1 text-base font-semibold text-foreground truncate">{plan.title}</h3>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Source: <span className="font-mono">{sourceLabel}</span>
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
              plan.approval_status === 'approved'
                ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                : plan.approval_status === 'rejected'
                  ? 'bg-destructive/10 text-destructive border border-destructive/30'
                  : 'bg-secondary text-muted-foreground border border-border'
            }`}
          >
            <ShieldCheck className="h-3 w-3" />
            {plan.approval_status || 'draft'}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {plan.approval_status !== 'approved' && isOwner && (
            <button
              onClick={() => onApprove(plan)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> Approve plan
            </button>
          )}
          {plan.approval_status === 'approved' && (
            <button
              onClick={() => setConfirmConvert(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
            >
              Convert to task queue
            </button>
          )}
          <button
            onClick={() => copy(plan.raw_markdown || '')}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground"
          >
            <Copy className="h-3.5 w-3.5" /> Copy markdown
          </button>
          {isOwner && (
            <button
              onClick={() => onArchive(plan)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-muted-foreground"
            >
              <Archive className="h-3.5 w-3.5" /> Archive
            </button>
          )}
        </div>
      </div>

      {/* Per-section cards (editable inline by owner) */}
      {SECTIONS.map(({ key, label }) => (
        <PlanSection
          key={key}
          label={label}
          value={plan[key] || ''}
          editable={isOwner}
          onChange={(next) => onUpdateField(plan, key, next)}
        />
      ))}

      {/* Plan history */}
      {plans.length > 1 && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs font-semibold text-foreground">Plan history</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Older plans for this session.</p>
          <ul className="mt-3 space-y-1.5">
            {plans
              .filter((p) => p.id !== plan.id)
              .slice(0, 8)
              .map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => onSelectPlan(p)}
                    className="w-full text-left flex items-center justify-between gap-3 rounded-xl border border-border bg-secondary/40 px-3 py-2 hover:border-primary/30"
                  >
                    <span className="min-w-0 flex-1 truncate text-xs text-foreground">{p.title}</span>
                    <span className="text-[10px] text-muted-foreground capitalize">{p.approval_status}</span>
                  </button>
                </li>
              ))}
          </ul>
        </div>
      )}

      <p className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-200/90">
        <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 text-amber-400 mt-0.5" />
        Plans are planning artifacts. Nothing in your codebase changes until you (or a connected agent) apply the resulting patches.
      </p>

      <ConfirmDialog
        open={confirmConvert}
        title="Convert this plan into a task queue?"
        description="This creates sequential tasks under the Queue tab. You can edit or remove them after."
        confirmLabel="Create tasks"
        onCancel={() => setConfirmConvert(false)}
        onConfirm={async () => {
          await onConvertToTasks(plan);
          setConfirmConvert(false);
        }}
      />
    </div>
  );
}

function PlanSection({ label, value, editable, onChange }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-foreground">{label}</p>
        {editable && !editing && (
          <button
            onClick={() => { setDraft(value); setEditing(true); }}
            className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary"
          >
            <Edit3 className="h-3 w-3" /> Edit
          </button>
        )}
      </div>
      {editing ? (
        <div className="mt-2 space-y-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={6}
            className="w-full resize-y rounded-xl border border-border bg-background px-3 py-2 text-xs font-mono text-foreground outline-none"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setEditing(false)}
              className="rounded-lg border border-border bg-secondary px-3 py-1.5 text-[11px] text-muted-foreground"
            >
              Cancel
            </button>
            <button
              onClick={() => { onChange(draft); setEditing(false); }}
              className="rounded-lg bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground"
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <pre className="mt-2 whitespace-pre-wrap break-words text-[11px] leading-relaxed text-muted-foreground font-mono">
          {value || '— empty —'}
        </pre>
      )}
    </div>
  );
}