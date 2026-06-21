import { useState, useMemo, useEffect } from 'react';
import { X, Coins, CreditCard, Wallet, ShieldCheck, AlertTriangle, Loader2, CheckCircle2 } from 'lucide-react';
import TonPaymentPanel from './TonPaymentPanel';
import { FALLBACK_TON_USD } from '@/eru/lib/tonConfig';

/**
 * BazarCheckoutDialog
 * ------------------------------------------------------------------
 * Mobile-first checkout sheet for Bazar packs.
 * Drives the payment-method choice and surfaces verification state
 * coming from the parent (BazarStand). All real money flow goes
 * through the order/transaction guards in lib/paymentGuards.js —
 * this component is presentation + intent only.
 *
 * Props:
 *   product        — selected BazarProduct (DEFAULT_PRODUCTS shape)
 *   walletGold     — current user GOLD balance
 *   onClose()      — close the sheet
 *   onConfirm({ method }) — caller submits the actual order; returns
 *                           { ok, message } or throws.
 */

const PAYMENT_METHODS = [
  {
    id: 'wallet',
    label: 'Wallet (GOLD)',
    description: 'Instant — paid from your in-app GOLD balance.',
    icon: Wallet,
    instant: true,
  },
  {
    id: 'card',
    label: 'Credit / Debit Card',
    description: 'Securely charge a card. Order is verified before delivery.',
    icon: CreditCard,
    instant: false,
  },
  {
    id: 'crypto',
    label: 'Crypto (TON)',
    description: 'Pay on-chain. Asset is delivered after the transaction is verified.',
    icon: Coins,
    instant: false,
  },
];

// Conversion rate for in-app wallet purchases ($1 USD = 100 GOLD).
// Kept as a simple constant so it's easy to find and tune later.
export const GOLD_PER_USD = 100;

export function priceInGold(priceUsd) {
  return Math.max(0, Math.round(Number(priceUsd || 0) * GOLD_PER_USD));
}

export default function BazarCheckoutDialog({ product, walletGold = 0, onClose, onConfirm }) {
  const [method, setMethod] = useState('wallet');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null); // { ok, message }

  const goldCost = useMemo(() => priceInGold(product?.price_usd), [product]);
  const canAffordWallet = walletGold >= goldCost;

  const tonAmount = useMemo(() => {
    const usd = Number(product?.price_usd || 0);
    return Number((usd / FALLBACK_TON_USD).toFixed(4));
  }, [product]);

  // Auto-fall back to card when wallet balance is too low
  useEffect(() => {
    if (method === 'wallet' && !canAffordWallet) setMethod('card');
  }, [method, canAffordWallet]);

  if (!product) return null;

  const submit = async () => {
    setSubmitting(true);
    setResult(null);
    try {
      const res = await onConfirm({ method });
      setResult(res || { ok: true });
    } catch (err) {
      setResult({ ok: false, message: err?.message || 'Payment failed.' });
    } finally {
      setSubmitting(false);
    }
  };

  // TON crypto flow: result includes { tonPayment: { transactionId, paymentRef, amountTon } }
  const tonPayment = result?.ok && method === 'crypto' ? result.tonPayment : null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div
        className="flex w-full max-w-md flex-col rounded-t-2xl border border-border bg-card text-foreground shadow-2xl sm:rounded-2xl"
        style={{ maxHeight: 'min(92dvh, 760px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">Secure Checkout</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Actions — pinned at the top under the header so Pay/Cancel are always reachable */}
        <div className="flex flex-shrink-0 gap-2 border-b border-border bg-card px-4 py-3">
          <button onClick={onClose} className="flex-1 rounded-xl border border-border bg-secondary py-3 text-sm font-medium">
            {result?.ok ? 'Close' : 'Cancel'}
          </button>
          {!result?.ok && (
            <button
              onClick={submit}
              disabled={submitting || (method === 'wallet' && !canAffordWallet)}
              className="flex-1 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {submitting ? (
                <span className="inline-flex items-center justify-center gap-1.5"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Processing…</span>
              ) : method === 'wallet' ? `Pay ${goldCost.toLocaleString()} GOLD` : `Pay $${Number(product.price_usd || 0).toFixed(2)}`}
            </button>
          )}
        </div>

        {/* Product summary — scrollable */}
        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
             style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}>
          <div className="rounded-xl border border-border bg-secondary/30 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold">{product.tier_label} — {product.title}</p>
                <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{product.description}</p>
              </div>
              <p className="font-mono text-base font-semibold text-primary">${Number(product.price_usd || 0).toFixed(2)}</p>
            </div>
          </div>

          {/* Wallet balance hint */}
          <div className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-xs">
            <span className="text-muted-foreground">Wallet balance</span>
            <span className="font-mono text-yellow-400">{walletGold.toLocaleString()} GOLD</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Wallet cost: <span className="font-mono text-foreground">{goldCost.toLocaleString()} GOLD</span>
          </p>

          {/* Payment methods */}
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Payment method</p>
            {PAYMENT_METHODS.map((m) => {
              const Icon = m.icon;
              const disabled = m.id === 'wallet' && !canAffordWallet;
              const active = method === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => !disabled && setMethod(m.id)}
                  disabled={disabled}
                  className={`flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                    active
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-background hover:border-primary/40'
                  } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Icon className={`mt-0.5 h-4 w-4 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold">{m.label}</p>
                      {m.instant && <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-semibold text-emerald-400">Instant</span>}
                      {disabled && <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[9px] text-destructive">Low balance</span>}
                    </div>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">{m.description}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Verification notice */}
          <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary" />
            <p className="text-[10px] text-muted-foreground">
              Assets are only delivered after the transaction is verified. Card and crypto orders may briefly show as <span className="text-foreground">pending verification</span>.
            </p>
          </div>

          {/* Result */}
          {result && (
            <div className={`flex items-start gap-2 rounded-lg border px-3 py-2 ${result.ok ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-destructive/30 bg-destructive/5'}`}>
              {result.ok ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-emerald-400" /> : <AlertTriangle className="mt-0.5 h-3.5 w-3.5 text-destructive" />}
              <p className={`text-[11px] ${result.ok ? 'text-emerald-300' : 'text-destructive'}`}>
                {result.message || (result.ok ? 'Payment verified — rewards delivered.' : 'Payment could not be completed.')}
              </p>
            </div>
          )}

          {/* TON payment instructions — shown after order is placed and crypto was selected */}
          {tonPayment && (
            <TonPaymentPanel
              amountTon={tonPayment.amountTon || tonAmount}
              paymentRef={tonPayment.paymentRef}
              transactionId={tonPayment.transactionId}
              onVerified={() => setResult({ ok: true, message: 'Payment verified on-chain — rewards will be delivered shortly.' })}
            />
          )}
        </div>

      </div>
    </div>
  );
}