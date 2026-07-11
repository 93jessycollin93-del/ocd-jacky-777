import { ExternalLink, BookOpen, ChevronRight } from 'lucide-react';
import IntegrationStatusBadge from './IntegrationStatusBadge';
import { getCategoryLabel } from '@/eru/lib/integrationRegistry';

/**
 * IntegrationCard — generic, honest provider tile used by the hub grid.
 * Surfaces required secrets, what it enables, and links to the focused
 * setup panel or the provider's docs. Never claims a connection it can't
 * prove.
 */
export default function IntegrationCard({ entry, onOpen }) {
  const required = entry.requiresSecrets || [];
  const lastVerified = entry.lastVerifiedAt
    ? new Date(entry.lastVerifiedAt).toLocaleString()
    : null;
  return (
    <article className="rounded-2xl border border-border bg-card p-3 flex flex-col gap-2">
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {getCategoryLabel(entry.category)}
          </p>
          <h3 className="text-sm font-semibold text-foreground leading-tight truncate">{entry.name}</h3>
        </div>
        <IntegrationStatusBadge status={entry.status} />
      </header>

      {entry.enables && (
        <p className="text-[11px] text-muted-foreground leading-snug">{entry.enables}</p>
      )}

      {required.length > 0 && (
        <div className="rounded-xl border border-dashed border-border bg-secondary/30 px-2 py-1.5">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Required secrets</p>
          <p className="mt-0.5 text-[10px] font-mono text-foreground/80 break-all">
            {required.join(' · ')}
          </p>
        </div>
      )}

      {entry.requiresWebhook && (
        <p className="text-[10px] text-yellow-300">Requires a verified webhook before use.</p>
      )}

      {entry.lastError && (
        <p className="text-[10px] text-destructive truncate" title={entry.lastError}>
          Last error: {entry.lastError}
        </p>
      )}
      {lastVerified && (
        <p className="text-[10px] text-muted-foreground">Last verified: {lastVerified}</p>
      )}

      <footer className="mt-auto flex flex-wrap gap-1.5 pt-1">
        <button
          type="button"
          onClick={() => onOpen?.(entry)}
          className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-2 py-1.5 text-[11px] font-medium text-primary"
        >
          Setup <ChevronRight className="h-3 w-3" />
        </button>
        {entry.docsUrl && (
          <a
            href={entry.docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1 rounded-lg border border-border bg-card px-2 py-1.5 text-[11px] text-muted-foreground hover:text-foreground"
          >
            <BookOpen className="h-3 w-3" /> Docs
          </a>
        )}
        {entry.setupUrl && /^https?:/i.test(entry.setupUrl) && (
          <a
            href={entry.setupUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1 rounded-lg border border-border bg-card px-2 py-1.5 text-[11px] text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="h-3 w-3" /> Console
          </a>
        )}
      </footer>
    </article>
  );
}