import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/eru/api/base44Client';
import { Store } from 'lucide-react';
import SellerDashboardSummary from '@/eru/components/storefront/SellerDashboardSummary';
import SellerOrderTable from '@/eru/components/storefront/SellerOrderTable';
import SellerInventoryPanel from '@/eru/components/storefront/SellerInventoryPanel';
import SellerSalesAnalytics from '@/eru/components/storefront/SellerSalesAnalytics';
import SellerEscrowPanel from '@/eru/components/storefront/SellerEscrowPanel';

export default function SellerDashboard() {
  const [listings, setListings] = useState([]);
  const [orders, setOrders] = useState([]);
  const [escrows, setEscrows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const me = await base44.auth.me();
    const [listingRows, orderRows, escrowRows] = await Promise.all([
      base44.entities.StorefrontListing.list('-updated_date', 200),
      base44.entities.Order.list('-created_date', 200),
      base44.entities.Escrow.list('-updated_date', 200).catch(() => []),
    ]);

    const sellerListings = (listingRows || []).filter((item) => item.created_by === me.email);
    const listingIds = new Set(sellerListings.map((item) => item.asset_id));
    const sellerOrders = (orderRows || []).filter((item) => listingIds.has(item.asset_id));
    const sellerEscrows = (escrowRows || []).filter((item) => item.seller_email === me.email);

    setListings(sellerListings);
    setOrders(sellerOrders);
    setEscrows(sellerEscrows);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const stats = useMemo(() => {
    const earnedFunds = orders.filter((item) => item.status === 'paid').reduce((sum, item) => sum + Number(item.amount_paid || item.base_price || 0), 0)
      + escrows.filter((item) => item.status === 'completed').reduce((sum, item) => sum + Number(item.price || 0), 0);
    const pendingEscrow = escrows.filter((item) => !['completed', 'cancelled'].includes(item.status)).reduce((sum, item) => sum + Number(item.price || 0), 0);
    return {
      activeListings: listings.filter((item) => item.status === 'active').length,
      orders: orders.length,
      earnedFunds,
      pendingEscrow,
    };
  }, [listings, orders, escrows]);

  const analyticsData = useMemo(() => ([
    {
      label: 'Orders',
      earned: orders.filter((item) => item.status === 'paid').reduce((sum, item) => sum + Number(item.amount_paid || item.base_price || 0), 0),
      pending: orders.filter((item) => ['pending', 'pending_payment', 'pending_verification'].includes(item.status)).reduce((sum, item) => sum + Number(item.base_price || 0), 0),
    },
    {
      label: 'Escrow',
      earned: escrows.filter((item) => item.status === 'completed').reduce((sum, item) => sum + Number(item.price || 0), 0),
      pending: escrows.filter((item) => !['completed', 'cancelled'].includes(item.status)).reduce((sum, item) => sum + Number(item.price || 0), 0),
    },
  ]), [orders, escrows]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" /></div>;
  }

  return (
    <div className="min-h-screen bg-background px-4 py-4 pb-24 space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <Store className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold text-foreground">Seller Dashboard</h1>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Manage seller orders, inventory, performance, and escrow settlement visibility in one place.</p>
      </div>

      <SellerDashboardSummary stats={stats} />
      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <SellerOrderTable orders={orders} />
        <SellerInventoryPanel listings={listings} onChanged={load} />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <SellerSalesAnalytics data={analyticsData} />
        <SellerEscrowPanel escrows={escrows} />
      </div>
    </div>
  );
}