import { useState, useMemo } from 'react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Mock historical data - replace with real data fetch
const MOCK_HISTORY = [
  { date: '2026-03-10', ETH: 2800, BTC: 48000, USDC: 1, DAI: 1, portfolio: 15800 },
  { date: '2026-03-17', ETH: 2850, BTC: 49500, USDC: 1, DAI: 1, portfolio: 16200 },
  { date: '2026-03-24', ETH: 2920, BTC: 51000, USDC: 1, DAI: 1, portfolio: 16950 },
  { date: '2026-03-31', ETH: 2750, BTC: 48500, USDC: 1, DAI: 1, portfolio: 15900 },
  { date: '2026-04-07', ETH: 2850, BTC: 50200, USDC: 1, DAI: 1, portfolio: 16500 },
  { date: '2026-04-10', ETH: 2920, BTC: 51500, USDC: 1, DAI: 1, portfolio: 17100 },
];

export default function YieldPerformance({ compact = false }) {
  const [view, setView] = useState('portfolio'); // 'portfolio' or 'assets'

  const stats = useMemo(() => {
    const first = MOCK_HISTORY[0];
    const last = MOCK_HISTORY[MOCK_HISTORY.length - 1];
    const change = last.portfolio - first.portfolio;
    const changePercent = ((change / first.portfolio) * 100).toFixed(2);

    return {
      currentValue: last.portfolio,
      totalGain: change,
      gainPercent: changePercent,
      startValue: first.portfolio,
    };
  }, []);

  const height = compact ? 250 : 350;

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-card border border-border rounded-xl p-3">
          <p className="text-xs text-muted-foreground">Current Value</p>
          <p className="text-lg font-bold text-primary">${stats.currentValue.toLocaleString()}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3">
          <p className="text-xs text-muted-foreground">Total Gain</p>
          <p className={`text-lg font-bold ${stats.totalGain >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {stats.totalGain >= 0 ? '+' : ''}{stats.totalGain.toFixed(0)} ({stats.gainPercent}%)
          </p>
        </div>
      </div>

      {/* View Toggle */}
      {!compact && (
        <div className="flex gap-2 p-1 bg-secondary rounded-lg">
          <button
            onClick={() => setView('portfolio')}
            className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors ${
              view === 'portfolio' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
            }`}>
            Portfolio
          </button>
          <button
            onClick={() => setView('assets')}
            className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors ${
              view === 'assets' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
            }`}>
            Assets
          </button>
        </div>
      )}

      {/* Charts */}
      {view === 'portfolio' ? (
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={MOCK_HISTORY}>
            <defs>
              <linearGradient id="colorPortfolio" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(160 100% 45%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(160 100% 45%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" style={{ fontSize: '12px' }} />
            <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: '12px' }} />
            <Tooltip
              contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
              formatter={(value) => `$${value.toLocaleString()}`}
            />
            <Area
              type="monotone"
              dataKey="portfolio"
              stroke="hsl(160 100% 45%)"
              fillOpacity={1}
              fill="url(#colorPortfolio)"
              name="Portfolio Value"
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={MOCK_HISTORY}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" style={{ fontSize: '12px' }} />
            <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: '12px' }} />
            <Tooltip
              contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
              formatter={(value) => `$${value.toLocaleString()}`}
            />
            <Legend wrapperStyle={{ fontSize: '12px', color: 'hsl(var(--muted-foreground))' }} />
            <Line type="monotone" dataKey="ETH" stroke="hsl(210 100% 60%)" dot={false} />
            <Line type="monotone" dataKey="BTC" stroke="hsl(45 100% 55%)" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}