import { Wallet } from 'lucide-react';

export default function MiniAppWalletPanel({ wallets, holdings }) {
  const totalBalance = wallets.reduce((sum, wallet) => sum + Number(wallet.total_value_usd || 0), 0);
  const topTokens = Object.values(holdings).flat().slice(0, 3);

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">Wallets</p>
        </div>
        <span className="text-[11px] text-muted-foreground">{wallets.length} linked</span>
      </div>
      <div className="rounded-xl bg-background border border-border p-3">
        <p className="text-[11px] text-muted-foreground">Total balance</p>
        <p className="mt-1 text-2xl font-semibold text-foreground">${totalBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
      </div>
      {topTokens.length > 0 ? (
        <div className="space-y-2">
          {topTokens.map((token) => (
            <div key={token.id} className="flex items-center justify-between rounded-xl bg-background border border-border px-3 py-2">
              <div>
                <p className="text-sm font-medium text-foreground">{token.token_symbol}</p>
                <p className="text-[11px] text-muted-foreground">{Number(token.balance_decimal || 0).toFixed(3)} units</p>
              </div>
              <p className="text-sm font-semibold text-primary">${Number(token.value_usd || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No wallet balances synced yet.</p>
      )}
    </div>
  );
}