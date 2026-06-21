import { useState } from 'react';
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { base44 } from '@/eru/api/base44Client';
import BottomSheet from '../mobile/BottomSheet';

/**
 * DeleteAccountButton — destructive control that calls the existing
 * `deleteMyData` backend function. Confirmation requires typing the literal
 * word DELETE to avoid accidental taps. Shown inside the Settings page.
 */
export default function DeleteAccountButton() {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const canDelete = confirmText.trim().toUpperCase() === 'DELETE' && !submitting;

  const handleDelete = async () => {
    if (!canDelete) return;
    setSubmitting(true);
    setError('');
    try {
      await base44.functions.invoke('deleteMyData', {});
      // Backend deleted the user — log out and reload.
      try { await base44.auth.logout('/'); } catch { window.location.assign('/'); }
    } catch (err) {
      setError(err?.message || 'Account deletion failed. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => { setOpen(true); setConfirmText(''); setError(''); }}
        className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/5 py-3 text-sm font-semibold text-red-400 hover:bg-red-500/10"
      >
        <Trash2 className="h-4 w-4" />
        Delete account
      </button>

      <BottomSheet open={open} onClose={() => !submitting && setOpen(false)} title="Delete your account?">
        <div className="space-y-3">
          <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/5 p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />
            <p className="text-xs text-red-200">
              This permanently deletes your account, orders, transactions, jade assets and audit logs. This cannot be undone.
            </p>
          </div>
          <label className="block text-xs font-medium text-muted-foreground">
            Type <span className="font-mono text-foreground">DELETE</span> to confirm
          </label>
          <input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETE"
            disabled={submitting}
            className="min-h-[44px] w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-red-500/50"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck="false"
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setOpen(false)}
              disabled={submitting}
              className="flex-1 min-h-[44px] rounded-xl border border-border bg-secondary text-sm font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={!canDelete}
              className="flex-1 min-h-[44px] rounded-xl bg-red-500 text-sm font-semibold text-white disabled:opacity-50"
            >
              {submitting ? (
                <span className="inline-flex items-center justify-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Deleting…
                </span>
              ) : (
                'Permanently delete'
              )}
            </button>
          </div>
        </div>
      </BottomSheet>
    </>
  );
}