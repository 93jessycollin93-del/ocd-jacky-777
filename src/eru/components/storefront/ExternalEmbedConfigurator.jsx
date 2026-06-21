import { useState } from 'react';
import { Settings2, Check, X, ShieldAlert } from 'lucide-react';
import { isSafeEmbedUrl } from '@/eru/lib/safeUrl';
import { canManageExternalPortals } from '@/eru/lib/permissions';
import { logAuditEvent } from '@/eru/lib/auditEvents';

/**
 * ExternalEmbedConfigurator
 * ----------------------------------------------------------------------------
 * Reusable owner/admin-only inline configurator for any external embed URL.
 * Validates https, blocks dangerous schemes (delegated to isSafeEmbedUrl),
 * audit-logs every save/clear, and shows a clear external-content warning.
 *
 * It deliberately does NOT render the iframe itself — the host page wires the
 * resulting URL into <LovableEmbed /> or any other safe embed component.
 *
 * Props:
 *   user            – current user (from useAuth)
 *   portalId        – stable id used for audit/storage namespace
 *   currentUrl      – current URL to display
 *   onSave(url)     – called with the validated trimmed URL ('' to clear)
 *   showWarning?    – render the "external content" notice (default true)
 * --------------------------------------------------------------------------*/
export default function ExternalEmbedConfigurator({
  user,
  portalId,
  currentUrl = '',
  onSave,
  showWarning = true,
}) {
  const canManage = canManageExternalPortals(user);
  const [editing, setEditing] = useState(!currentUrl);
  const [draft, setDraft] = useState(currentUrl || '');
  const [error, setError] = useState('');

  if (!canManage) return null;

  const submit = () => {
    const trimmed = draft.trim();
    if (trimmed && !isSafeEmbedUrl(trimmed)) {
      setError('URL must start with https:// and use a safe scheme.');
      return;
    }
    logAuditEvent(user, {
      action: 'external_portal.update',
      target_type: 'ExternalPortal',
      target_id: portalId,
      before: { url: currentUrl || null },
      after: { url: trimmed || null },
    });
    setError('');
    setEditing(false);
    onSave?.(trimmed);
  };

  const clear = () => {
    logAuditEvent(user, {
      action: 'external_portal.clear',
      target_type: 'ExternalPortal',
      target_id: portalId,
      before: { url: currentUrl || null },
      after: { url: null },
    });
    setDraft('');
    setError('');
    setEditing(true);
    onSave?.('');
  };

  return (
    <div className="rounded-2xl border border-border bg-secondary/30 p-3 sm:p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Settings2 className="w-3.5 h-3.5 text-primary flex-shrink-0" />
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">External embed URL</p>
      </div>

      {!editing && currentUrl ? (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <p className="flex-1 min-w-0 truncate font-mono text-[11px] text-foreground/80 bg-card border border-border rounded-xl px-3 py-2">
            {currentUrl}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => { setDraft(currentUrl); setEditing(true); }}
              className="h-9 px-3 rounded-xl border border-border text-xs font-medium text-foreground"
            >
              Change
            </button>
            <button
              onClick={clear}
              className="h-9 px-3 rounded-xl border border-destructive/30 text-xs font-medium text-destructive"
            >
              Clear
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={draft}
            onChange={(e) => { setDraft(e.target.value); setError(''); }}
            placeholder="https://your-portal.example.com"
            className="flex-1 h-10 rounded-xl border border-border bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <div className="flex gap-2">
            <button
              onClick={submit}
              className="h-10 px-3 rounded-xl bg-primary text-primary-foreground text-xs font-semibold inline-flex items-center justify-center gap-1"
            >
              <Check className="w-3.5 h-3.5" /> Save
            </button>
            {currentUrl && (
              <button
                onClick={() => { setDraft(currentUrl); setEditing(false); setError(''); }}
                className="h-10 px-3 rounded-xl border border-border text-xs font-medium text-muted-foreground inline-flex items-center justify-center gap-1"
              >
                <X className="w-3.5 h-3.5" /> Cancel
              </button>
            )}
          </div>
        </div>
      )}

      {error && <p className="text-[11px] text-destructive">{error}</p>}

      {showWarning && (
        <div className="flex items-start gap-2 text-[11px] text-muted-foreground">
          <ShieldAlert className="w-3 h-3 mt-0.5 text-yellow-400 flex-shrink-0" />
          <p>
            External content runs in a sandboxed iframe and may have separate privacy & security behavior. Tokens, wallet keys, and session credentials are never passed to the embed.
          </p>
        </div>
      )}
    </div>
  );
}