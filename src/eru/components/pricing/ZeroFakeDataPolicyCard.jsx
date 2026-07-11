import { ShieldCheck, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * ZeroFakeDataPolicyCard — visible product-law banner shown on every pricing-
 * adjacent surface. Compact by default; expand={true} renders the full rules.
 */
export default function ZeroFakeDataPolicyCard({ mode = 'on', expand = false, settingsPath = '/settings' }) {
  const isDemoMode = mode === 'off';
  return (
    <section
      className={`rounded-2xl border p-4 ${
        isDemoMode
          ? 'border-destructive/40 bg-destructive/10'
          : 'border-primary/30 bg-primary/5'
      }`}
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${
          isDemoMode ? 'bg-destructive/20 text-destructive' : 'bg-primary/15 text-primary'
        }`}>
          {isDemoMode ? <AlertTriangle className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${
            isDemoMode ? 'text-destructive' : 'text-primary'
          }`}>
            {isDemoMode ? 'Demo / Test Mode Active' : 'Verified Pricing Only'}
          </p>
          <p className="mt-0.5 text-sm font-bold text-foreground">
            {isDemoMode
              ? 'Zero Fake Data Mode is OFF — every price is labeled Demo / Test Only.'
              : 'Zero Fake Data Mode is ON.'}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
            ERU never invents prices, sold comps, market averages, grading values, or charts.
            If a real source is missing or stale, the UI shows Not Connected, No Verified Price,
            Stale, or Needs Review — never a fake number.
          </p>
          {expand && (
            <ul className="mt-2 space-y-0.5 text-[11px] text-muted-foreground leading-relaxed">
              <li>• Card identity and price are tracked separately. Identity may exist without price.</li>
              <li>• Manual prices are labeled <span className="font-mono">Owner Manual Price</span> and never blended into market averages.</li>
              <li>• Condition defaults to <span className="font-mono">Unknown</span>. Graded values appear only when a real grade is set.</li>
              <li>• Charts only render real data points. No decorative fake lines.</li>
              <li>• Default display currency is CAD. Conversion only when a real FX source is set.</li>
            </ul>
          )}
          {isDemoMode && (
            <Link
              to={settingsPath}
              className="mt-3 inline-flex items-center gap-1 rounded-lg border border-destructive/40 bg-destructive/15 px-3 py-1.5 text-[11px] font-semibold text-destructive"
            >
              Re-enable Zero Fake Data Mode
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}