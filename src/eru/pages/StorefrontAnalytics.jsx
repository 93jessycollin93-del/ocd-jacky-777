import { useState, useEffect } from 'react';
import { base44 } from '@/eru/api/base44Client';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import { BarChart2, TrendingUp, Wifi, Loader2, RefreshCw, Activity, Store, Plug } from 'lucide-react';
import { subDays, format } from 'date-fns';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="text-muted-foreground mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: <span className="font-mono font-medium">{p.value}</span></p>
      ))}
    </div>
  );
};

function StatCard({ label, value, sub, color = 'text-primary' }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex-1">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-2xl font-bold font-mono ${color}`}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

export default function StorefrontAnalytics() {
  const [listings, setListings] = useState([]);
  const [connectors, setConnectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const [l, c] = await Promise.all([
      base44.entities.StorefrontListing.list('-created_date', 200),
      base44.entities.MarketConnector.list('-created_date', 50).catch(() => []),
    ]);
    setListings(l);
    setConnectors(c);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { load(); }, []);

  // ── Build 30-day series from real listing data ──────────────────────────────
  const days30 = Array.from({ length: 30 }, (_, i) => {
    const d = subDays(new Date(), 29 - i);
    const label = format(d, 'MMM d');
    const dateStr = format(d, 'yyyy-MM-dd');

    const dayListings = listings.filter(l =>
      l.created_date && l.created_date.startsWith(dateStr)
    );
    const activeOnDay = listings.filter(l =>
      l.status === 'active' && l.created_date && l.created_date <= dateStr + 'T23:59:59'
    ).length;

    const syncs = dayListings.reduce((sum, l) =>
      sum + (l.external_syndications || []).filter(s => s.sync_status === 'synced').length, 0);
    const syncAttempts = dayListings.reduce((sum, l) =>
      sum + (l.external_syndications || []).length, 0);

    // trade volume: sum of base_price of listings created that day
    const volume = dayListings.reduce((sum, l) => sum + (l.base_price || 0), 0);

    return {
      date: label,
      volume: Math.round(volume),
      active_listings: activeOnDay,
      sync_success: syncAttempts > 0 ? Math.round((syncs / syncAttempts) * 100) : 0,
      new_listings: dayListings.length,
    };
  });

  // ── Connector sync breakdown ────────────────────────────────────────────────
  const connectorStats = connectors.map(c => {
    const allSyncs = listings.flatMap(l => (l.external_syndications || []).filter(s => s.connector_id === c.id));
    const synced = allSyncs.filter(s => s.sync_status === 'synced').length;
    const failed = allSyncs.filter(s => s.sync_status === 'failed').length;
    const pending = allSyncs.filter(s => s.sync_status === 'pending').length;
    const total = allSyncs.length;
    return { name: c.name, synced, failed, pending, total, rate: total > 0 ? Math.round((synced / total) * 100) : 0 };
  });

  const totalVolume = listings.reduce((s, l) => s + (l.base_price || 0), 0);
  const activeCount = listings.filter(l => l.status === 'active').length;
  const totalSynced = listings.reduce((s, l) => s + (l.external_syndications || []).filter(x => x.sync_status === 'synced').length, 0);
  const avgSyncRate = connectorStats.length > 0
    ? Math.round(connectorStats.reduce((s, c) => s + c.rate, 0) / connectorStats.length)
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-card/90 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Storefront Analytics</h2>
          <button onClick={() => { setRefreshing(true); load(); }} className="ml-auto p-1.5 rounded-lg bg-secondary hover:bg-border transition-colors">
            <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">Last 30 days · live data</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24 space-y-5">
        {/* KPI row */}
        <div className="flex gap-2">
          <StatCard label="Total Volume" value={`${totalVolume.toLocaleString()}`} sub="GOLD across all listings" color="text-primary" />
          <StatCard label="Active" value={activeCount} sub={`of ${listings.length} listings`} color="text-green-400" />
        </div>
        <div className="flex gap-2">
          <StatCard label="Ext. Synced" value={totalSynced} sub="external markets" color="text-blue-400" />
          <StatCard label="Avg Sync Rate" value={`${avgSyncRate}%`} sub={`${connectors.length} connectors`} color={avgSyncRate >= 80 ? 'text-green-400' : avgSyncRate >= 50 ? 'text-yellow-400' : 'text-red-400'} />
        </div>

        {/* Trade Volume */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <p className="text-sm font-semibold">Trade Volume (30d)</p>
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={days30} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(160 100% 45%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(160 100% 45%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(230 18% 16%)" />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'hsl(220 12% 50%)' }} interval={6} />
              <YAxis tick={{ fontSize: 9, fill: 'hsl(220 12% 50%)' }} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="volume" name="Volume" stroke="hsl(160 100% 45%)" fill="url(#volGrad)" strokeWidth={1.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Active Listing Trends */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Store className="w-4 h-4 text-blue-400" />
            <p className="text-sm font-semibold">Active Listing Trends (30d)</p>
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={days30} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(230 18% 16%)" />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'hsl(220 12% 50%)' }} interval={6} />
              <YAxis tick={{ fontSize: 9, fill: 'hsl(220 12% 50%)' }} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="active_listings" name="Active" stroke="hsl(210 100% 60%)" strokeWidth={1.5} dot={false} />
              <Line type="monotone" dataKey="new_listings" name="New" stroke="hsl(280 80% 65%)" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Connector Sync Success Rate */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Wifi className="w-4 h-4 text-green-400" />
            <p className="text-sm font-semibold">Connector Sync Rate (30d)</p>
          </div>
          <ResponsiveContainer width="100%" height={130}>
            <AreaChart data={days30} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="syncGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(160 100% 45%)" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="hsl(160 100% 45%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(230 18% 16%)" />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'hsl(220 12% 50%)' }} interval={6} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: 'hsl(220 12% 50%)' }} unit="%" />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="sync_success" name="Success %" stroke="hsl(160 100% 45%)" fill="url(#syncGrad)" strokeWidth={1.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Per-connector breakdown */}
        {connectorStats.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Plug className="w-4 h-4 text-purple-400" />
              <p className="text-sm font-semibold">Connector Breakdown</p>
            </div>
            <ResponsiveContainer width="100%" height={connectorStats.length * 50 + 30}>
              <BarChart data={connectorStats} layout="vertical" margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(230 18% 16%)" />
                <XAxis type="number" tick={{ fontSize: 9, fill: 'hsl(220 12% 50%)' }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: 'hsl(220 12% 50%)' }} width={80} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="synced" name="Synced" fill="hsl(160 100% 45%)" radius={[0, 3, 3, 0]} />
                <Bar dataKey="failed" name="Failed" fill="hsl(350 100% 60%)" radius={[0, 3, 3, 0]} />
                <Bar dataKey="pending" name="Pending" fill="hsl(45 100% 55%)" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="space-y-2 pt-1 border-t border-border">
              {connectorStats.map(c => (
                <div key={c.name} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground truncate flex-1">{c.name}</span>
                  <div className="flex items-center gap-2 ml-2">
                    <span className="text-muted-foreground">{c.total} total</span>
                    <span className={`font-medium ${c.rate >= 80 ? 'text-green-400' : c.rate >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>{c.rate}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {connectorStats.length === 0 && (
          <div className="text-center py-6 space-y-2">
            <Activity className="w-6 h-6 text-muted-foreground mx-auto" />
            <p className="text-xs text-muted-foreground">No connector data yet — add connectors in the Storefront Hub</p>
          </div>
        )}
      </div>
    </div>
  );
}