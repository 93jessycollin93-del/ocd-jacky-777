import { BadgeDollarSign, Clock3, Package, ShoppingBag } from 'lucide-react';

const CARDS = [
  { key: 'activeListings', label: 'Active listings', icon: Package, color: 'text-primary' },
  { key: 'orders', label: 'Orders', icon: ShoppingBag, color: 'text-blue-400' },
  { key: 'earnedFunds', label: 'Earned funds', icon: BadgeDollarSign, color: 'text-green-400' },
  { key: 'pendingEscrow', label: 'Pending escrow', icon: Clock3, color: 'text-yellow-400' },
];

export default function SellerDashboardSummary({ stats }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {CARDS.map(({ key, label, icon: Icon, color }) => (
        <div key={key} className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <Icon className={`h-4 w-4 ${color}`} />
            <p className="text-[11px] text-muted-foreground">{label}</p>
          </div>
          <p className={`mt-3 text-2xl font-bold ${color}`}>{stats[key]}</p>
        </div>
      ))}
    </div>
  );
}