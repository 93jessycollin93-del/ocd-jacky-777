import { AlertTriangle, X } from 'lucide-react';

/**
 * ConfirmDialog
 * ----------------------------------------------------------------------------
 * Lightweight confirmation modal used to gate high-risk actions (delete,
 * unpublish, transfer, mint, list-for-sale, edit-price, role change, embed
 * enablement, etc). Mobile-first, dismiss-on-backdrop, irreversible flows
 * surface a danger tone.
 *
 * Usage:
 *   const [pending, setPending] = useState(null);
 *   <button onClick={() => setPending({ id, label: 'Delete listing?' })}>Delete</button>
 *   <ConfirmDialog
 *     open={!!pending}
 *     title={pending?.label}
 *     description="This cannot be undone."
 *     confirmLabel="Delete"
 *     tone="danger"
 *     onCancel={() => setPending(null)}
 *     onConfirm={async () => { await doDelete(pending.id); setPending(null); }}
 *   />
 * --------------------------------------------------------------------------*/
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'default', // 'default' | 'danger'
  onConfirm,
  onCancel,
  busy = false,
}) {
  if (!open) return null;

  const isDanger = tone === 'danger';
  const confirmClass = isDanger
    ? 'bg-destructive text-destructive-foreground'
    : 'bg-primary text-primary-foreground';

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-border bg-card text-foreground shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-start gap-3 p-4 border-b border-border">
          <div
            className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
              isDanger ? 'bg-destructive/10 text-destructive border border-destructive/30' : 'bg-primary/10 text-primary border border-primary/30'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p id="confirm-dialog-title" className="text-sm font-semibold text-foreground">{title}</p>
            {description && <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>}
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex-shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex flex-col-reverse sm:flex-row gap-2 p-4">
          <button
            onClick={onCancel}
            disabled={busy}
            className="flex-1 rounded-xl border border-border bg-secondary text-foreground py-2.5 text-sm font-medium disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className={`flex-1 rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50 ${confirmClass}`}
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}