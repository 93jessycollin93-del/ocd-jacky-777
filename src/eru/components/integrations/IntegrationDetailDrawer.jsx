import { X, ShieldAlert, ExternalLink, BookOpen, ScrollText } from 'lucide-react';
import IntegrationStatusBadge from './IntegrationStatusBadge';
import { getCategoryLabel, STATUS } from '@/eru/lib/integrationRegistry';

/**
 * IntegrationDetailDrawer — focused mobile-first sheet showing the honest
 * setup checklist for a single provider. The actual credential rotation,
 * webhook registration, and verification happen via secure backend setup —
 * this drawer never accepts secret values from the browser.
 */
export default function IntegrationDetailDrawer({ entry, onClose, isAdmin }) {
  if (!entry) return null;
  const required = entry.requiresSecrets || [];
  const isConnected = entry.status === STATUS.CONNECTED;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="flex max-h-[85dvh] w-full max-w-2xl flex-col rounded-t-2xl border-t border-border bg-card text-foreground"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {getCategoryLabel(entry.category)}
            </p>
            <h2 className="text-base font-semibold text-foreground leading-tight">{entry.name}</h2>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <IntegrationStatusBadge status={entry.status} />
              {entry.requiresWebhook && (
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">
                  Webhook required
                </span>
              )}
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                {entry.authType?.replace('_', ' ') || 'unknown auth'}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-border bg-secondary p-1.5 text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {/* No fake connections banner */}
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
            <div className="flex items-start gap-2">
              <ShieldAlert className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
              <p className="text-[11px] leading-snug text-muted-foreground">
                ERU never marks this integration "Connected" until secrets are present server-side
                {entry.requiresWebhook ? ' and the webhook is verified' : ''}.
                Secret values are <span className="text-foreground font-medium">never</span> stored in the browser or
                transmitted from this UI.
              </p>
            </div>
          </div>

          {entry.enables && (
            <section>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">What this enables</p>
              <p className="mt-1 text-sm text-foreground">{entry.enables}</p>
            </section>
          )}

          {/* Setup checklist */}
          <section>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Setup checklist</p>
            <ol className="mt-2 space-y-2 text-sm">
              {required.length > 0 && (
                <li className="rounded-xl border border-border bg-secondary/30 p-3">
                  <p className="font-medium text-foreground">Add server-side secrets</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Configure these names in app secrets (Dashboard → Code → Secrets):
                  </p>
                  <ul className="mt-1.5 space-y-0.5 text-[11px] font-mono text-foreground/80">
                    {required.map((s) => <li key={s}>• {s}</li>)}
                  </ul>
                </li>
              )}
              {entry.authType === 'oauth' && (
                <li className="rounded-xl border border-border bg-secondary/30 p-3">
                  <p className="font-medium text-foreground">Authorize OAuth connector</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Grant this app access via the OAuth connector for{' '}
                    <span className="font-mono">{entry.oauthConnector || entry.providerType}</span>.
                  </p>
                </li>
              )}
              {entry.requiresWebhook && (
                <li className="rounded-xl border border-border bg-secondary/30 p-3">
                  <p className="font-medium text-foreground">Register and verify webhook</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Point the provider's webhook URL at the matching backend function and confirm a verified event was received.
                  </p>
                </li>
              )}
              <li className="rounded-xl border border-border bg-secondary/30 p-3">
                <p className="font-medium text-foreground">Run a verification call</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  ERU will only flip to <span className="font-mono">Connected</span> after a real round-trip succeeds.
                </p>
              </li>
            </ol>
          </section>

          {entry.lastError && (
            <section className="rounded-xl border border-destructive/40 bg-destructive/10 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-destructive">Last error</p>
              <p className="mt-1 text-[11px] text-destructive break-words">{entry.lastError}</p>
            </section>
          )}

          {/* Quick links */}
          <section className="flex flex-wrap gap-2">
            {entry.docsUrl && (
              <a
                href={entry.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs text-foreground"
              >
                <BookOpen className="h-3.5 w-3.5" /> Provider docs
              </a>
            )}
            {entry.setupUrl && /^https?:/i.test(entry.setupUrl) && (
              <a
                href={entry.setupUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs text-foreground"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Provider console
              </a>
            )}
            {entry.setupUrl && /^\//.test(entry.setupUrl) && (
              <a
                href={entry.setupUrl}
                className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-medium text-primary"
              >
                <ScrollText className="h-3.5 w-3.5" /> Open ERU setup page
              </a>
            )}
          </section>

          {!isAdmin && (
            <p className="text-[10px] text-muted-foreground">
              You're viewing read-only status. Only admins can change credentials or run verification.
            </p>
          )}

          {isConnected && (
            <p className="text-[10px] text-primary">Connection verified. Audit history is available in the audit log.</p>
          )}
        </div>
      </div>
    </div>
  );
}