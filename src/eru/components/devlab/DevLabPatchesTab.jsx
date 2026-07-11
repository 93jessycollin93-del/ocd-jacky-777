import { useState } from 'react';
import { Copy, ShieldCheck, AlertTriangle, CheckCircle2 } from 'lucide-react';
import ConfirmDialog from '@/eru/components/ConfirmDialog';

const RISK_TONE = {
  safe:     'bg-secondary text-muted-foreground border-border',
  medium:   'bg-amber-500/10 text-amber-300 border-amber-500/30',
  high:     'bg-orange-500/10 text-orange-300 border-orange-500/30',
  critical: 'bg-destructive/10 text-destructive border-destructive/30',
};
const STATUS_TONE = {
  draft:             'bg-secondary text-muted-foreground border-border',
  ready:             'bg-blue-500/10 text-blue-300 border-blue-500/30',
  approved:          'bg-green-500/10 text-green-400 border-green-500/30',
  rejected:          'bg-destructive/10 text-destructive border-destructive/30',
  manually_applied:  'bg-purple-500/10 text-purple-300 border-purple-500/30',
};

/**
 * DevLabPatchesTab — copyable manual patches. High/critical risk requires
 * an explicit confirmation before approving.
 */
export default function DevLabPatchesTab({ patches = [], onUpdateStatus, isOwner }) {
  const [pendingApprove, setPendingApprove] = useState(null);

  if (!patches.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center">
        <ShieldCheck className="mx-auto h-8 w-8 text-muted-foreground/40" />
        <p className="mt-2 text-sm font-medium text-foreground">No patches yet</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Export a patch from any task in the Queue tab — it will land here, ready to copy.
        </p>
      </div>
    );
  }

  const copy = (text) => navigator.clipboard?.writeText(text || '').catch(() => {});

  const requestApprove = (patch) => {
    if (['high', 'critical'].includes(patch.risk_level)) {
      setPendingApprove(patch);
    } else {
      onUpdateStatus(patch, 'approved');
    }
  };

  return (
    <div className="space-y-3">
      {patches.map((p) => (
        <article key={p.id} className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{p.title}</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                <span className={`rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-wide ${RISK_TONE[p.risk_level] || RISK_TONE.safe}`}>
                  risk: {p.risk_level}
                </span>
                <span className={`rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-wide ${STATUS_TONE[p.status] || STATUS_TONE.draft}`}>
                  {p.status?.replace('_', ' ')}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => copy(p.diff_text || '')}
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-secondary px-2.5 py-1.5 text-[11px] text-foreground"
              >
                <Copy className="h-3 w-3" /> Copy
              </button>
              {isOwner && p.status !== 'approved' && p.status !== 'manually_applied' && (
                <button
                  onClick={() => requestApprove(p)}
                  className="inline-flex items-center gap-1 rounded-lg bg-primary/10 border border-primary/30 px-2.5 py-1.5 text-[11px] font-semibold text-primary"
                >
                  <CheckCircle2 className="h-3 w-3" /> Approve
                </button>
              )}
              {isOwner && p.status === 'approved' && (
                <button
                  onClick={() => onUpdateStatus(p, 'manually_applied')}
                  className="inline-flex items-center gap-1 rounded-lg bg-secondary border border-border px-2.5 py-1.5 text-[11px] text-foreground"
                >
                  Mark applied
                </button>
              )}
            </div>
          </div>

          {p.affected_files?.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Affected files</p>
              <ul className="mt-1 space-y-0.5">
                {p.affected_files.map((f) => (
                  <li key={f} className="font-mono text-[11px] text-foreground/80 break-all">— {f}</li>
                ))}
              </ul>
            </div>
          )}

          <pre className="overflow-x-auto rounded-xl border border-border bg-background p-3 text-[11px] font-mono leading-relaxed text-muted-foreground whitespace-pre-wrap break-words">
            {p.diff_text || '— empty —'}
          </pre>

          {p.rollback_notes && (
            <p className="rounded-xl border border-border bg-secondary/40 p-2.5 text-[11px] text-muted-foreground">
              <span className="font-semibold text-foreground">Rollback:</span> {p.rollback_notes}
            </p>
          )}
        </article>
      ))}

      <p className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-200/90">
        <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 text-amber-400 mt-0.5" />
        Patches are copyable instructions — nothing here auto-applies until a real execution sandbox is connected.
      </p>

      <ConfirmDialog
        open={!!pendingApprove}
        title={`Approve ${pendingApprove?.risk_level} risk patch?`}
        description={`"${pendingApprove?.title}" is marked ${pendingApprove?.risk_level}. Approving signals you accept the risk and will apply it manually.`}
        confirmLabel="Approve"
        tone="danger"
        onCancel={() => setPendingApprove(null)}
        onConfirm={async () => {
          await onUpdateStatus(pendingApprove, 'approved');
          setPendingApprove(null);
        }}
      />
    </div>
  );
}