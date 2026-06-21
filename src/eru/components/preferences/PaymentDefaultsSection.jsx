import { Coins, Wallet } from 'lucide-react';

/**
 * PaymentDefaultsSection
 * ----------------------------------------------------------------------------
 * Lets the user pick their default payment currency and fallback method for
 * checkout flows (escrow, marketplace, bazar). Pure controlled UI — parent
 * persists `payment_preferences` on the user record via base44.auth.updateMe.
 *
 * Props:
 *  - prefs    { default_currency, fallback_method, auto_confirm_under }
 *  - onChange (next) => void
 */
const CURRENCIES = [
  { value: 'GOLD', label: 'Gold', hint: 'In-app currency' },
  { value: 'TON', label: 'TON', hint: 'Telegram-native crypto' },
  { value: 'TELEGRAM_STARS', label: 'Stars', hint: 'Telegram Stars' },
  { value: 'CRYPTO', label: 'Crypto', hint: 'Other tokens' },
];

const METHODS = [
  { value: 'wallet', label: 'Wallet balance' },
  { value: 'stripe', label: 'Card (Stripe)' },
  { value: 'crypto', label: 'Crypto wallet' },
  { value: 'telegram_stars', label: 'Telegram Stars' },
];

export default function PaymentDefaultsSection({ prefs, onChange }) {
  const setField = (key, value) => onChange({ ...prefs, [key]: value });

  return (
    <section className="bg-card border border-border rounded-2xl p-4 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground inline-flex items-center gap-2">
          <Wallet className="w-4 h-4 text-primary" /> Payment defaults
        </h3>
        <p className="text-xs text-muted-foreground mt-1">Pre-fill checkout flows with your preferred currency and method.</p>
      </div>

      <div className="space-y-2">
        <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground inline-flex items-center gap-1.5">
          <Coins className="w-3 h-3" /> Default currency
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {CURRENCIES.map((c) => {
            const active = prefs.default_currency === c.value;
            return (
              <button
                key={c.value}
                type="button"
                onClick={() => setField('default_currency', c.value)}
                className={`h-auto py-2.5 px-2 rounded-xl border text-xs font-medium flex flex-col items-center justify-center gap-0.5 transition-colors ${
                  active ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-secondary/20 text-foreground hover:border-primary/30'
                }`}
              >
                <span className="text-sm font-semibold">{c.label}</span>
                <span className={`text-[10px] ${active ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>{c.hint}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Default payment method</p>
        <div className="grid grid-cols-2 gap-2">
          {METHODS.map((m) => {
            const active = prefs.fallback_method === m.value;
            return (
              <button
                key={m.value}
                type="button"
                onClick={() => setField('fallback_method', m.value)}
                className={`h-11 rounded-xl border text-xs font-medium transition-colors ${
                  active ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-secondary/20 text-foreground hover:border-primary/30'
                }`}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      <label className="block space-y-1.5">
        <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Auto-confirm purchases under (Gold)</span>
        <input
          type="number"
          min={0}
          max={10000}
          value={prefs.auto_confirm_under ?? 0}
          onChange={(e) => setField('auto_confirm_under', Math.max(0, Number(e.target.value) || 0))}
          className="w-full h-11 rounded-xl border border-border bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <span className="block text-[10px] text-muted-foreground">Set to 0 to always require confirmation. Only applies to in-app GOLD purchases.</span>
      </label>
    </section>
  );
}