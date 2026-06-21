import { useMemo } from 'react';
import { DollarSign, Coins, Star, AlertTriangle } from 'lucide-react';
import { useLivePriceMap } from '@/eru/hooks/useLiveSync';

/**
 * JTAPriceConverter
 * ------------------------------------------------------------------
 * Multi-currency selector + indicative converted amount for the Mystery Box.
 * If a live conversion isn't available (TON live feed offline, Stars API
 * not connected) the corresponding option is disabled with "Not Connected".
 *
 * Telegram Stars → 1 USD ≈ 50 stars (Telegram's published rate, approximate).
 * Stars are only enabled when running inside the Telegram Mini App webview
 * (window.Telegram?.WebApp), so we expose a simple capability check here.
 *
 * Props:
 *   priceUsd  — base USD price
 *   value     — currently selected currency ('USD' | 'TON' | 'STARS')
 *   onChange  — (currency) => void
 *   compact   — render a tighter pill row (used inside refresh controls)
 */

const STARS_PER_USD = 50;

function isTelegramStarsAvailable() {
  try { return Boolean(window?.Telegram?.WebApp?.initData); } catch { return false; }
}

export default function JTAPriceConverter({ priceUsd = 0, value = 'USD', onChange, compact = false }) {
  const { map, status } = useLivePriceMap();
  const tonPrice = map?.TON?.price || 0;
  const tonLive = status === 'live' && tonPrice > 0;
  const starsAvailable = isTelegramStarsAvailable();

  const options = useMemo(() => {
    const tonAmount = tonLive ? (priceUsd / tonPrice) : null;
    const starsAmount = starsAvailable ? Math.round(priceUsd * STARS_PER_USD) : null;
    return [
      {
        id: 'USD',
        label: 'USD',
        Icon: DollarSign,
        amount: priceUsd.toFixed(2),
        unit: 'USD',
        enabled: true,
        note: null,
      },
      {
        id: 'TON',
        label: 'TON',
        Icon: Coins,
        amount: tonAmount != null ? tonAmount.toFixed(3) : '—',
        unit: 'TON',
        enabled: tonLive,
        note: tonLive ? null : 'Not Connected',
      },
      {
        id: 'STARS',
        label: 'Stars',
        Icon: Star,
        amount: starsAmount != null ? starsAmount.toLocaleString() : '—',
        unit: '⭐',
        enabled: starsAvailable,
        note: starsAvailable ? null : 'Not Connected',
      },
    ];
  }, [priceUsd, tonPrice, tonLive, starsAvailable]);

  const selected = options.find((o) => o.id === value) || options[0];

  return (
    <div className={compact ? 'space-y-1.5' : 'space-y-2'}>
      <div className={`grid grid-cols-3 gap-1.5 ${compact ? '' : 'rounded-xl bg-secondary/50 p-1'}`}>
        {options.map((opt) => {
          const Icon = opt.Icon;
          const active = opt.id === value;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => opt.enabled && onChange?.(opt.id)}
              disabled={!opt.enabled}
              className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-semibold transition-colors ${
                active
                  ? 'bg-primary text-primary-foreground'
                  : opt.enabled
                    ? 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                    : 'text-muted-foreground/50 cursor-not-allowed'
              }`}
              title={opt.note || `Pay in ${opt.label}`}
            >
              <Icon className="w-3 h-3" />
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-[11px]">
        <span className="text-muted-foreground">Total</span>
        <span className="font-mono font-semibold">
          {selected.amount} <span className="text-muted-foreground">{selected.unit}</span>
        </span>
      </div>

      {selected.note && (
        <div className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/5 px-2 py-1.5 text-[10px] text-amber-300">
          <AlertTriangle className="w-3 h-3 flex-shrink-0" />
          {selected.label} payment unavailable — {selected.note}.
        </div>
      )}
    </div>
  );
}