import { TRUST_LABELS, formatPriceHonest, summarizePricingResults } from '@/eru/lib/zeroFakeData';
import PricingTrustBadge from './PricingTrustBadge';

/**
 * VerifiedPriceDisplay — universal honest price renderer.
 * Pass it the full pricing_results array from a scan / listing / card. It
 * NEVER invents a number. It either:
 *   - shows the verified amount(s) with the correct trust badge,
 *   - or shows an honest empty/setup-required/stale/needs-review state.
 *
 * Use this everywhere the app would otherwise show a price.
 *
 * Props:
 *   results          — array of source attempts (matches CardScanSession.pricing_results)
 *   demoMode         — boolean; when true, every price is overlaid with "Demo / Test Only"
 *   compact          — render in a single line (for list rows / tickers)
 *   displayCurrency  — defaults to CAD
 */
export default function VerifiedPriceDisplay({ results = [], demoMode = false, compact = false, displayCurrency = 'CAD' }) {
  const summary = summarizePricingResults(results);
  const verified = results.filter((r) => r.user_label_shown === TRUST_LABELS.VERIFIED);

  // Demo mode: never show prices as if they're real.
  if (demoMode) {
    return (
      <div className={`rounded-xl border border-destructive/40 bg-destructive/10 p-3 ${compact ? 'flex items-center gap-2' : ''}`}>
        <PricingTrustBadge kind="demo" />
        <p className={`text-[11px] text-destructive ${compact ? '' : 'mt-1'}`}>
          Zero Fake Data Mode is OFF — values shown are not real market prices.
        </p>
      </div>
    );
  }

  // No verified data — show honest empty state, no number rendered.
  if (verified.length === 0) {
    return (
      <div className={`rounded-xl border border-border bg-secondary/40 ${compact ? 'flex items-center gap-2 px-3 py-1.5' : 'p-3 space-y-1'}`}>
        <PricingTrustBadge kind={summary.badge} label={summary.label} />
        {!compact && (
          <p className="text-[11px] text-muted-foreground">
            {summary.label === TRUST_LABELS.NOT_CONNECTED
              ? 'Connect a real pricing source to see verified data.'
              : summary.label === TRUST_LABELS.STALE
                ? 'Pricing data exceeds the freshness window. Refresh required.'
                : summary.label === TRUST_LABELS.NEEDS_REVIEW
                  ? 'Identity, condition, or variant is uncertain — please review before pricing.'
                  : 'No real source returned a usable price for this item.'}
          </p>
        )}
      </div>
    );
  }

  // Verified — render the actual numbers, each with its own row.
  return (
    <div className={compact ? 'flex flex-wrap items-center gap-2' : 'space-y-2'}>
      <div className="flex items-center gap-2 flex-wrap">
        <PricingTrustBadge kind={summary.badge} label={summary.label} />
        <span className="text-[10px] text-muted-foreground">{verified.length} source{verified.length === 1 ? '' : 's'}</span>
      </div>
      <ul className={compact ? 'flex flex-wrap gap-2' : 'space-y-1.5'}>
        {verified.map((r, i) => {
          const fmt = formatPriceHonest({
            amount: r.returned_value,
            sourceCurrency: r.currency,
            displayCurrency,
          });
          return (
            <li
              key={`${r.source}-${i}`}
              className={`rounded-lg border border-border bg-card ${compact ? 'px-2 py-1' : 'px-3 py-2'}`}
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-foreground truncate">
                    {r.source} · <span className="text-muted-foreground capitalize">{(r.source_type || '').replace('_', ' ')}</span>
                  </p>
                  {r.condition_basis && r.condition_basis !== 'unknown' && (
                    <p className="text-[10px] text-muted-foreground">
                      Condition: <span className="font-mono">{r.condition_basis}</span>
                      {r.grade ? ` · Grade: ${r.grade}` : ''}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-foreground">{fmt.displayed || '—'}</p>
                  {fmt.note && <p className="text-[10px] text-muted-foreground">{fmt.note}</p>}
                </div>
              </div>
              {r.last_updated && (
                <p className="mt-0.5 text-[9px] text-muted-foreground">
                  Last updated {new Date(r.last_updated).toLocaleString()}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}