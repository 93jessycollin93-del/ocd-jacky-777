export default function SellerOrderTable({ orders = [] }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div>
        <p className="text-sm font-semibold text-foreground">Order management</p>
        <p className="text-[11px] text-muted-foreground">Track buyer orders tied to your listed assets.</p>
      </div>
      {orders.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-4 text-xs text-muted-foreground">No seller orders yet.</div>
      ) : (
        <div className="space-y-2">
          {orders.map((order) => (
            <div key={order.id} className="rounded-xl border border-border bg-secondary/20 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{order.order_number}</p>
                  <p className="text-[11px] text-muted-foreground">Buyer: {order.buyer_email}</p>
                </div>
                <span className="rounded-full bg-secondary px-2 py-1 text-[10px] capitalize text-muted-foreground">{order.status.replaceAll('_', ' ')}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                <span>{order.asset_type}</span>
                <span>{order.base_price} {order.currency}</span>
                <span>Qty {order.quantity || 1}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}