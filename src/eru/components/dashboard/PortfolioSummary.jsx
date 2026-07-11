import { useEffect, useMemo, useState } from 'react';
import { useRealPriceMap } from '../../hooks/useRealPrices';
import { useWallet } from '../../hooks/useWallet';
import { Wallet, WifiOff, Loader2, ExternalLink, TrendingUp } from 'lucide-react';
import { useDashboardEvents } from '@/eru/context/DashboardEventsContext';

export default function PortfolioSummary() {
  const { map, status, lastUpdated } = useRealPriceMap();
  const wallet = useWallet();
  const { subscribe, rules } = useDashboardEvents();
  const [pulse, setPulse] = useState(false);

  const activeRules = useMemo(() => rules.filter((rule) => rule.enabled && rule.target === 'portfolio'), [rules]);

  useEffect(() => {
    const unsubscribe = subscribe('portfolio-summary', (dashboardEvent) => {
      const matched = activeRules.some((rule) => rule.source === dashboardEvent.source && rule.event === dashboardEvent.event);
      if (!matched) return;
      setPulse(true);
      window.setTimeout(() => setPulse(false), 1200);
    });
    return unsubscribe;
  }, [subscribe, activeRules]);

  if (wallet.status === 'disconnected' || wallet.status === 'unavailable') {
    return (
      <div className="mx-4 mt-3 bg-card border border-border rounded-xl p-4 flex flex-col items-center gap-3">
        <Wallet className="w-8 h-8 text-muted-foreground/40" />
        <div className="text-center">
          <p className="text-sm font-semibold text-muted-foreground">Wallet Not Connected</p>
          <p className="text-xs text-muted-foreground/60 mt-0.5">
            {wallet.status === 'unavailable' ? 'No Web3 wallet detected. Install MetaMask to continue.' : 'Connect your wallet to view your portfolio.'}
          </p>
        </div>
        {wallet.status !== 'unavailable' && (
          <button onClick={wallet.connect}
            className="flex items-center gap-2 bg-primary text-primary-foreground rounded-xl px-4 py-2 text-xs font-semibold">
            <Wallet className="w-3 h-3" /> Connect Wallet
          </button>
        )}
        {wallet.status === 'unavailable' && (
          <a href="https://metamask.io/download/" target="_blank" rel="noreferrer"
            className="flex items-center gap-2 bg-secondary border border-border rounded-xl px-4 py-2 text-xs font-medium text-muted-foreground">
            <ExternalLink className="w-3 h-3" /> Get MetaMask
          </a>
        )}
      </div>
    );
  }

  if (wallet.status === 'connecting') {
    return (
      <div className="mx-4 mt-3 bg-card border border-border rounded-xl p-4 flex items-center justify-center gap-2">
        <Loader2 className="w-4 h-4 text-primary animate-spin" />
        <span className="text-sm text-muted-foreground">Connecting wallet…</span>
      </div>
    );
  }

  return (
    <div className={`mx-4 mt-3 bg-card border rounded-xl p-4 transition-all ${pulse ? 'border-primary shadow-[0_0_0_1px_hsl(var(--primary))]' : 'border-border'}`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest">Connected Wallet</p>
          <p className="text-sm font-mono font-semibold text-foreground mt-0.5">{wallet.shortAddress}</p>
          <div className="flex items-center gap-2 mt-0.5">
            {wallet.networkName && (
              <p className="text-[10px] text-primary">● {wallet.networkName}</p>
            )}
            {lastUpdated && (
              <p className="text-[10px] text-muted-foreground">Live {lastUpdated.toLocaleTimeString()}</p>
            )}
          </div>
        </div>
        <button onClick={wallet.disconnect}
          className="text-[10px] text-muted-foreground border border-border rounded-lg px-2 py-1">
          Disconnect
        </button>
      </div>

      <div className="bg-secondary/60 rounded-xl p-3 text-center">
        {status === 'loading' ? (
          <div className="flex items-center justify-center gap-1.5">
            <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin" />
            <span className="text-xs text-muted-foreground">Fetching market data…</span>
          </div>
        ) : status === 'error' ? (
          <div className="flex items-center justify-center gap-1.5">
            <WifiOff className="w-3.5 h-3.5 text-red-400" />
            <span className="text-xs text-red-400">Market data unavailable</span>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <TrendingUp className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs text-primary">Live market sync active</span>
            </div>
            <p className="text-xs text-muted-foreground">Portfolio pricing updates automatically from live market data</p>
            <p className="text-xs text-muted-foreground/60 mt-0.5">Connect RPC later to add live on-chain balances</p>
          </div>
        )}
      </div>

      {status === 'live' && (
        <div className="flex gap-2 mt-3">
          {['BTC', 'ETH', 'SOL'].map(sym => {
            const p = map[sym];
            if (!p) return null;
            return (
              <div key={sym} className="flex-1 bg-secondary rounded-lg px-2 py-2 text-center">
                <p className="text-[10px] text-muted-foreground">{sym}</p>
                <p className="text-xs font-mono font-semibold text-foreground">
                  ${(p.price ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
                <p className={`text-[9px] ${p.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {p.change >= 0 ? '▲' : '▼'}{Math.abs(p.change ?? 0).toFixed(2)}%
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}