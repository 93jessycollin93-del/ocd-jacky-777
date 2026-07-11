import { Coins, Wallet } from 'lucide-react';

export default function EconomyBalanceCard({ wallet, holding, symbol }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">Primary wallet</p>
          <p className="text-sm font-semibold text-foreground truncate">{wallet?.label || 'No wallet selected'}</p>
        </div>
        <div className="rounded-xl bg-primary/10 p-2 text-primary">
          <Wallet className="w-4 h-4" />
        </div>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Token balance</p>
        <div className="mt-1 flex items-end gap-2">
          <p className="text-3xl font-bold text-foreground">{holding ? Number(holding.balance_decimal || 0).toLocaleString(undefined, { maximumFractionDigits: 6 }) : '0'}</p>
          <span className="pb-1 text-sm font-medium text-primary flex items-center gap-1"><Coins className="w-4 h-4" />{symbol || 'TOKEN'}</span>
        </div>
        {holding?.value_usd ? <p className="mt-1 text-xs text-muted-foreground">≈ ${Number(holding.value_usd).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p> : null}
      </div>
      <p className="text-[11px] text-muted-foreground font-mono break-all">{wallet?.wallet_address || 'Connect a wallet to load a live token balance.'}</p>
    </div>
  );
}