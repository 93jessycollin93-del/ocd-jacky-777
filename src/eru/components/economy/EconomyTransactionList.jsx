import { ArrowDownLeft, ArrowUpRight, ExternalLink } from 'lucide-react';

export default function EconomyTransactionList({ items, currentAddress, symbol, explorerBaseUrl }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div>
        <p className="text-sm font-semibold text-foreground">Recent {symbol || 'token'} activity</p>
        <p className="mt-1 text-xs text-muted-foreground">Live transaction history from your saved token records.</p>
      </div>
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">No token transactions found yet.</div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const outgoing = currentAddress && item.from_address?.toLowerCase() === currentAddress.toLowerCase();
            const hash = item.tx_hash || item.metadata?.tx_hash || item.metadata?.transaction_hash;
            return (
              <div key={item.id} className="rounded-xl border border-border bg-background p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`mt-0.5 rounded-xl p-2 ${outgoing ? 'bg-red-500/10 text-red-400' : 'bg-primary/10 text-primary'}`}>
                      {outgoing ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground">{outgoing ? 'Sent' : 'Received'} {item.amount} {item.symbol || symbol || 'TOKEN'}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground font-mono truncate">{outgoing ? item.to_address : item.from_address}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">{item.status || 'confirmed'} · {item.network || `Chain ${item.chain_id || '—'}`}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[11px] text-muted-foreground">{item.created_date ? new Date(item.created_date).toLocaleString() : 'Recent'}</p>
                    {hash && explorerBaseUrl ? (
                      <a href={`${explorerBaseUrl}${hash}`} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-[11px] text-primary">
                        View <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}