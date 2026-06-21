import { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Zap, Users } from 'lucide-react';

export default function BlockchainMetrics({ compact = false }) {
  const [txData, setTxData] = useState([]);
  const [gasData, setGasData] = useState([]);
  const [walletData, setWalletData] = useState([]);

  useEffect(() => {
    // Generate mock blockchain data
    const mockTxData = Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toLocaleDateString(),
      volume: Math.floor(Math.random() * 5000) + 1000,
      count: Math.floor(Math.random() * 300) + 50,
    }));

    const mockGasData = Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toLocaleDateString(),
      gwei: Math.floor(Math.random() * 150) + 20,
      avgGwei: Math.floor(Math.random() * 100) + 30,
    }));

    const mockWalletData = Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toLocaleDateString(),
      active: Math.floor(Math.random() * 500) + 100,
      new: Math.floor(Math.random() * 50) + 10,
    }));

    setTxData(mockTxData);
    setGasData(mockGasData);
    setWalletData(mockWalletData);
  }, []);

  const metrics = [
    {
      label: 'Total Volume',
      value: '$45.2M',
      change: '+12.5%',
      positive: true,
      icon: DollarSign,
    },
    {
      label: 'Avg Gas Fee',
      value: '67 Gwei',
      change: '-8.3%',
      positive: true,
      icon: Zap,
    },
    {
      label: 'Active Wallets',
      value: '2,847',
      change: '+23.1%',
      positive: true,
      icon: Users,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {metrics.map(({ label, value, change, positive, icon: Icon }) => (
          <div
            key={label}
            className="bg-card border border-border rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{label}</span>
              <Icon className="w-4 h-4 text-primary" />
            </div>
            <p className="text-lg font-semibold">{value}</p>
            <div className="flex items-center gap-1">
              {positive ? (
                <TrendingUp className="w-3.5 h-3.5 text-green-500" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 text-red-500" />
              )}
              <span className={positive ? 'text-xs text-green-500' : 'text-xs text-red-500'}>
                {change}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Transaction Volume Chart */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="text-sm font-semibold mb-4">Transaction Volume (30 days)</h3>
        <ResponsiveContainer width="100%" height={compact ? 250 : 300}>
          <AreaChart data={txData}>
            <defs>
              <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(160 100% 45%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(160 100% 45%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
              }}
              formatter={(value) => `$${value.toLocaleString()}`}
            />
            <Area
              type="monotone"
              dataKey="volume"
              stroke="hsl(160 100% 45%)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorVolume)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Gas Fee Trends */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="text-sm font-semibold mb-4">Gas Fee Trends</h3>
        <ResponsiveContainer width="100%" height={compact ? 250 : 300}>
          <LineChart data={gasData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
              }}
              formatter={(value) => `${value} Gwei`}
            />
            <Line
              type="monotone"
              dataKey="gwei"
              stroke="hsl(210 100% 60%)"
              strokeWidth={2}
              name="Max"
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="avgGwei"
              stroke="hsl(50 100% 55%)"
              strokeWidth={2}
              name="Avg"
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Wallet Activity */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="text-sm font-semibold mb-4">Wallet Activity</h3>
        <ResponsiveContainer width="100%" height={compact ? 250 : 300}>
          <BarChart data={walletData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
              }}
            />
            <Bar dataKey="active" fill="hsl(160 100% 45%)" name="Active" />
            <Bar dataKey="new" fill="hsl(280 80% 65%)" name="New" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}