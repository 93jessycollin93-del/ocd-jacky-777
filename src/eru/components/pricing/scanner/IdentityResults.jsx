import { CheckCircle2, HelpCircle } from 'lucide-react';
import { isHighConfidence } from '@/eru/lib/zeroFakeData';

/**
 * IdentityResults — renders identification candidates separately from price.
 * If no real identification source has been wired, the parent passes an empty
 * candidates array and we render an honest empty state.
 */
export default function IdentityResults({ candidates = [], selectedId, onSelect, identityConnected }) {
  if (!identityConnected) {
    return (
      <section className="rounded-2xl border border-dashed border-border bg-card p-4 text-center">
        <HelpCircle className="mx-auto h-8 w-8 text-muted-foreground/40" />
        <p className="mt-2 text-sm font-medium text-foreground">Identification source not connected</p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Connect a Pokémon card identification provider in Settings to see candidate matches.
          Manual identity entry stays available below.
        </p>
      </section>
    );
  }
  if (!candidates.length) {
    return (
      <section className="rounded-2xl border border-dashed border-border bg-card p-4 text-center">
        <p className="text-sm font-medium text-foreground">No candidates returned</p>
        <p className="mt-1 text-[11px] text-muted-foreground">The identification source returned no usable matches for this scan.</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div>
        <p className="text-xs font-semibold text-foreground">Identification candidates</p>
        <p className="text-[11px] text-muted-foreground">Pick the correct match. Identity is independent from pricing.</p>
      </div>
      <ul className="space-y-2">
        {candidates.map((c) => {
          const high = isHighConfidence(c);
          const active = selectedId === c.candidate_id;
          return (
            <li key={c.candidate_id}>
              <button
                type="button"
                onClick={() => onSelect?.(c.candidate_id)}
                className={`w-full text-left rounded-xl border px-3 py-2.5 transition-colors ${
                  active
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-secondary/40 hover:border-primary/30'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{c.card_name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {[c.set_name, c.card_number, c.year].filter(Boolean).join(' · ') || 'Set / number unknown'}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {c.variant && (
                        <span className="rounded-full border border-border bg-card px-2 py-0.5 text-[9px] uppercase tracking-wide text-muted-foreground">
                          {c.variant.replace('_', ' ')}
                        </span>
                      )}
                      {c.language && (
                        <span className="rounded-full border border-border bg-card px-2 py-0.5 text-[9px] uppercase tracking-wide text-muted-foreground">
                          {c.language}
                        </span>
                      )}
                      <span className={`rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-wide ${
                        high ? 'border-primary/30 bg-primary/10 text-primary' : 'border-yellow-400/30 bg-yellow-400/10 text-yellow-300'
                      }`}>
                        {high ? `High confidence · ${c.confidence}%` : `Low confidence · ${c.confidence ?? '–'}%`}
                      </span>
                    </div>
                    {!high && c.uncertainty_reason && (
                      <p className="mt-1 text-[10px] text-yellow-300/80">Reason: {c.uncertainty_reason}</p>
                    )}
                  </div>
                  {active && <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}