export default function SellerEscrowPanel({ escrows = [] }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div>
        <p className="text-sm font-semibold text-foreground">Funds vs escrow settlements</p>
        <p className="text-[11px] text-muted-foreground">Separate completed earnings from active escrow that is still waiting to clear.</p>
      </div>
      {escrows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-4 text-xs text-muted-foreground">No escrow settlements yet.</div>
      ) : (
        <div className="space-y-2">
          {escrows.map((escrow) => (
            <div key={escrow.id} className="rounded-xl border border-border bg-secondary/20 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{escrow.asset_label || escrow.asset_id}</p>
                  <p className="text-[11px] text-muted-foreground">Buyer: {escrow.buyer_email}</p>
                </div>
                <span className="rounded-full bg-secondary px-2 py-1 text-[10px] capitalize text-muted-foreground">{escrow.status.replaceAll('_', ' ')}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                <span>{escrow.price} {escrow.currency}</span>
                <span>{escrow.completed_at ? 'Cleared' : 'Pending settlement'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}