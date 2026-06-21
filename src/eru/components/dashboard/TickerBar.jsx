import { useEffect, useRef } from 'react';
import { useRealPrices } from '../../hooks/useRealPrices';
import { WifiOff, Loader2 } from 'lucide-react';
import { useDashboardEvents } from '@/eru/context/DashboardEventsContext';

export default function TickerBar() {
  const { prices, status } = useRealPrices();
  const { emit } = useDashboardEvents();
  const previousRef = useRef('');

  useEffect(() => {
    if (status !== 'live' || prices.length === 0) return;
    const signature = JSON.stringify(prices.map((item) => ({
      symbol: item.symbol,
      price: Number((item.price ?? 0).toFixed(2)),
      change: Number((item.change ?? 0).toFixed(2))
    })));
    if (signature !== previousRef.current) {
      previousRef.current = signature;
      emit('market', 'priceChange', { prices });
    }
  }, [prices, status, emit]);

  // NOTE: sticky positioning is owned by the parent shell (Layout's StickyShell)
  // so the ticker and nav move as ONE unit on scroll. Don't add `sticky top-0`
  // here — it would create two competing sticky layers on small viewports.
  if (status === 'loading') {
    return (
      <div id="app-ticker-bar" className="eru-skin-ticker-bar bg-card border-b border-border flex items-center gap-2 px-4 py-2">
        <Loader2 className="w-3 h-3 text-muted-foreground animate-spin" />
        <span className="text-xs text-muted-foreground font-mono">Fetching live prices…</span>
      </div>
    );
  }

  if (status === 'error' || prices.length === 0) {
    return (
      <div id="app-ticker-bar" className="eru-skin-ticker-bar bg-card border-b border-border flex items-center gap-2 px-4 py-2">
        <WifiOff className="w-3 h-3 text-red-400" />
        <span className="text-xs text-red-400 font-mono">Market data unavailable — no data source connected</span>
      </div>
    );
  }

  const items = [...prices, ...prices];
  return (
    <div id="app-ticker-bar" className="eru-skin-ticker-bar bg-card border-b border-border overflow-hidden">
      <div className="flex ticker-track whitespace-nowrap">
        {items.map((p, i) => (
          <span key={i} className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-mono">
            <span className="text-muted-foreground">{p.symbol}</span>
            <span className="text-foreground font-medium">
              ${(p.price ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className={p.change >= 0 ? 'text-green-400' : 'text-red-400'}>
              {p.change >= 0 ? '▲' : '▼'} {Math.abs(p.change ?? 0).toFixed(2)}%
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}