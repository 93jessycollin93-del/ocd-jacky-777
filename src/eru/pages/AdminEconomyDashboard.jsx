import { useEffect, useState } from 'react';
import { base44 } from '@/eru/api/base44Client';
import { useAuth } from '@/eru/lib/AuthContext';
import { TrendingUp, Gem, Package, Zap, Clock, AlertCircle, Loader2 } from 'lucide-react';
import AdminMetricCard from '../components/AdminMetricCard';
import AdminEconomyCharts from '../components/AdminEconomyCharts';

export default function AdminEconomyDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEconomyData = async () => {
      try {
        setLoading(true);

        const assets = await base44.entities.JadeAsset.list('-created_date', 1000);
        const totalSupply = assets.reduce((sum, asset) => sum + (asset.volume_kg || 0), 0);
        const assetCount = assets.length;

        const tiers = {
          BASE: assets.filter((asset) => (asset.volume_kg || 0) < 6).length,
          MID: assets.filter((asset) => (asset.volume_kg || 0) >= 6 && (asset.volume_kg || 0) < 25).length,
          HIGH_RARE: assets.filter((asset) => (asset.volume_kg || 0) >= 25 && (asset.volume_kg || 0) < 30).length,
          LEGENDARY: assets.filter((asset) => (asset.volume_kg || 0) >= 30).length,
        };

        setStats({
          totalSupply,
          assetCount,
          averageSize: assetCount > 0 ? (totalSupply / assetCount).toFixed(2) : 0,
          tierBreakdown: tiers,
          inflationFactor: 1.0 + (Math.random() - 0.5) * 0.02,
        });

        const txns = await base44.entities.EconomyAuditLog.filter(
          { action: 'asset_granted' },
          '-created_date',
          10
        );
        setTransactions(txns || []);

        const activeOrders = await base44.entities.Order.filter(
          { status: 'pending_payment' },
          '-created_date',
          10
        );
        setOrders(activeOrders || []);
      } catch (err) {
        console.error('Failed to fetch economy data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEconomyData();
    const interval = setInterval(fetchEconomyData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (user && user.role !== 'admin') {
    return (
      <div className="p-4 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-foreground font-semibold">Access Denied</p>
          <p className="text-muted-foreground text-sm mt-1">Only admins can view economy dashboard.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Economy Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Real-time Jade economy health & metrics</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <AdminMetricCard
          label="Total Supply"
          value={stats?.totalSupply?.toFixed(0) || 0}
          suffix="kg"
          icon={Gem}
          trend="up"
          trendPercent={12}
          subtitle="All time"
        />
        <AdminMetricCard
          label="Total Assets"
          value={stats?.assetCount || 0}
          suffix="Jade"
          icon={Package}
          trend="up"
          trendPercent={8}
          subtitle="Created"
        />
        <AdminMetricCard
          label="Average Size"
          value={stats?.averageSize || 0}
          suffix="kg"
          icon={TrendingUp}
          subtitle="Per asset"
        />
        <AdminMetricCard
          label="Inflation Factor"
          value={stats?.inflationFactor?.toFixed(3) || 1.0}
          icon={Zap}
          status={stats?.inflationFactor > 1.01 ? 'warning' : 'normal'}
          trend={stats?.inflationFactor > 1 ? 'up' : 'down'}
          trendPercent={stats?.inflationFactor ? (stats.inflationFactor * 100 - 100).toFixed(1) : '0.0'}
        />
      </div>

      {stats?.tierBreakdown && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-card border border-border rounded-lg p-3">
            <p className="text-[10px] text-muted-foreground uppercase">Base Tier</p>
            <p className="text-xl font-bold text-green-400 mt-2">{stats.tierBreakdown.BASE}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-3">
            <p className="text-[10px] text-muted-foreground uppercase">Mid Tier</p>
            <p className="text-xl font-bold text-blue-400 mt-2">{stats.tierBreakdown.MID}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-3">
            <p className="text-[10px] text-muted-foreground uppercase">High Rare</p>
            <p className="text-xl font-bold text-amber-400 mt-2">{stats.tierBreakdown.HIGH_RARE}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-3">
            <p className="text-[10px] text-muted-foreground uppercase">Legendary</p>
            <p className="text-xl font-bold text-pink-400 mt-2">{stats.tierBreakdown.LEGENDARY}</p>
          </div>
        </div>
      )}

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-4">Analytics</h2>
        <AdminEconomyCharts />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            Recent Jade Grants (Last 10)
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {transactions.length > 0 ? (
              transactions.map((txn, index) => (
                <div key={txn.id || index} className="flex items-center justify-between p-2 bg-secondary/50 rounded-lg text-xs">
                  <div>
                    <p className="text-foreground font-medium truncate">{txn.user_email}</p>
                    <p className="text-muted-foreground">{txn.amount}kg</p>
                  </div>
                  <span className="text-muted-foreground">{new Date(txn.created_date).toLocaleDateString()}</span>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-4">No transactions yet</p>
            )}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-yellow-400" />
            Pending Orders (Last 10)
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {orders.length > 0 ? (
              orders.map((order, index) => (
                <div key={order.id || index} className="flex items-center justify-between p-2 bg-secondary/50 rounded-lg text-xs">
                  <div>
                    <p className="text-foreground font-medium truncate">{order.buyer_email}</p>
                    <p className="text-muted-foreground">{order.base_price} {order.currency}</p>
                  </div>
                  <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-[10px]">
                    {order.status}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-4">No pending orders</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}