import { PRICING_PROVIDERS, getPricingProviderStatus, setPricingProviderStatus } from '@/eru/lib/zeroFakeData';
import { WifiOff, CheckCircle2 } from 'lucide-react';

/**
 * PricingProviderStatus — admin-visible panel showing which real pricing
 * sources are wired. Defaults every provider to "Not Connected" and refuses
 * to surface fake data from unconnected sources.
 */
export default function PricingProviderStatus({ isAdmin }) {
  const status = getPricingProviderStatus();
  return (
    <section className="rounded-2xl border border-border bg-card p-4 space-y-2">
      <div>
        <p className="text-xs font-semibold text-foreground">Pricing data sources</p>
        <p className="text-[11px] text-muted-foreground">
          Only connected sources return prices. Disconnected ones show "Not Connected."
        </p>
      </div>
      <ul className="space-y-1.5">
        {PRICING_PROVIDERS.map((prov) => {
          const connected = status[prov.key] === 'connected';
          return (
            <li key={prov.key} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-secondary/40 px-3 py-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{prov.label}</p>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{prov.type.replace('_', ' ')}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                  connected
                    ? 'border-primary/30 bg-primary/10 text-primary'
                    : 'border-border bg-secondary text-muted-foreground'
                }`}>
                  {connected ? <><CheckCircle2 className="h-3 w-3" /> Connected</> : <><WifiOff className="h-3 w-3" /> Not Connected</>}
                </span>
                {isAdmin && (
                  <button
                    onClick={() => {
                      setPricingProviderStatus(prov.key, connected ? 'not_connected' : 'connected', { actorRole: 'admin' });
                      window.location.reload();
                    }}
                    className="rounded-lg border border-border bg-card px-2 py-1 text-[10px] text-muted-foreground"
                  >
                    {connected ? 'Unmark' : 'Mark wired'}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {!Object.values(status).includes('connected') && (
        <p className="rounded-xl border border-dashed border-border bg-secondary/20 p-3 text-[11px] text-muted-foreground text-center">
          No pricing sources are connected. Pricing surfaces will show "Not Connected" until a real source is wired.
        </p>
      )}
    </section>
  );
}