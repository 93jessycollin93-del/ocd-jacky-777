import { useEffect, useState } from 'react';
import { RefreshCw, Clock, Coins, Loader2 } from 'lucide-react';
import {
  getRefreshStatus,
  consumeFreeRefresh,
  recordPaidRefresh,
  formatCountdown,
  logRefresh,
  PAID_REFRESH_USD,
} from '@/eru/lib/jadeRefresh';

/**
 * JTARefreshControls
 * ------------------------------------------------------------------
 * Reusable refresh widget for the Monolith mystery box (and any other
 * jade surface that needs the same shop/pack/offer reroll affordance).
 *
 * Renders:
 *   - free refresh button (disabled with countdown when on cooldown)
 *   - paid refresh button (disabled when no payment method connected)
 *   - subtle ERU signal-distortion overlay during the refresh animation
 *
 * Props:
 *   scope          — 'shop' | 'pack' | 'offer' | 'monolith' (audit tag)
 *   onRefresh()    — async () => void; called after refresh is authorized
 *   paymentReady   — bool; if false, paid refresh is disabled with hint
 *   paymentLabel   — short string describing how the paid refresh is charged
 *                    (e.g. "USD / TON / Stars")
 */

export default function JTARefreshControls({ scope = 'monolith', onRefresh, paymentReady = true, paymentLabel = 'USD' }) {
  const [status, setStatus] = useState(() => getRefreshStatus());
  const [busy, setBusy] = useState(false);
  const [pulse, setPulse] = useState(false);

  // Countdown tick — only run when there's actually time left to count.
  useEffect(() => {
    if (status.freeAvailable) return;
    const id = setInterval(() => setStatus(getRefreshStatus()), 1000);
    return () => clearInterval(id);
  }, [status.freeAvailable]);

  const triggerAnimation = () => {
    setPulse(true);
    setTimeout(() => setPulse(false), 700);
  };

  const runFreeRefresh = async () => {
    if (busy) return;
    if (!consumeFreeRefresh()) {
      setStatus(getRefreshStatus());
      return;
    }
    setBusy(true);
    triggerAnimation();
    await logRefresh({ kind: 'free', scope });
    try { await onRefresh?.(); } finally {
      setStatus(getRefreshStatus());
      setBusy(false);
    }
  };

  const runPaidRefresh = async () => {
    if (busy || !paymentReady) return;
    if (!recordPaidRefresh()) return; // anti-spam
    setBusy(true);
    triggerAnimation();
    await logRefresh({ kind: 'paid', scope, currency: paymentLabel, amount: PAID_REFRESH_USD });
    try { await onRefresh?.(); } finally {
      setStatus(getRefreshStatus());
      setBusy(false);
    }
  };

  return (
    <div className="relative rounded-xl border border-border bg-card/60 p-3 space-y-2.5 overflow-hidden">
      {/* Subtle ERU signal-distortion overlay during refresh */}
      {pulse && <div className="lore-distort-soft absolute inset-0 pointer-events-none" aria-hidden="true" />}

      <div className="flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <RefreshCw className={`w-3.5 h-3.5 ${pulse ? 'animate-spin text-primary' : ''}`} />
          <span className="font-semibold">Refresh</span>
        </div>
        <div className="flex items-center gap-1 font-mono text-muted-foreground">
          <Clock className="w-3 h-3" />
          {status.freeAvailable ? (
            <span className="text-emerald-400">Free ready</span>
          ) : (
            <span>{formatCountdown(status.msUntilFree)}</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={runFreeRefresh}
          disabled={!status.freeAvailable || busy}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-emerald-700/40 bg-emerald-900/20 px-2 py-2 text-[11px] font-semibold text-emerald-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-emerald-900/40 transition-colors"
        >
          {busy && status.freeAvailable === false ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          {status.freeAvailable ? 'Free Refresh' : 'On Cooldown'}
        </button>

        <button
          type="button"
          onClick={runPaidRefresh}
          disabled={!paymentReady || busy}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-yellow-600/40 bg-yellow-900/20 px-2 py-2 text-[11px] font-semibold text-yellow-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-yellow-900/40 transition-colors"
          title={paymentReady ? `Paid refresh — $${PAID_REFRESH_USD.toFixed(2)} (${paymentLabel})` : 'No payment method connected'}
        >
          <Coins className="w-3.5 h-3.5" />
          {paymentReady ? `$${PAID_REFRESH_USD.toFixed(2)} Refresh` : 'Not Connected'}
        </button>
      </div>

      <p className="text-[10px] text-muted-foreground">
        1 free refresh every 24h. Paid refreshes ($1 USD or equivalent in TON / Stars) apply to shop, packs, and offer rerolls.
      </p>
    </div>
  );
}