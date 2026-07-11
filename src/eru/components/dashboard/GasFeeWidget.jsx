import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Zap, TrendingDown } from 'lucide-react';

// Mock gas fee data
const MOCK_GAS_FEES = [
  { time: '00:00', ethereum: 45, polygon: 2.5, arbitrum: 0.8, optimism: 1.2 },
  { time: '04:00', ethereum: 38, polygon: 2.1, arbitrum: 0.7, optimism: 1.0 },
  { time: '08:00', ethereum: 52, polygon: 3.2, arbitrum: 1.1, optimism: 1.5 },
  { time: '12:00', ethereum: 68, polygon: 4.5, arbitrum: 1.5, optimism: 2.0 },
  { time: '16:00', ethereum: 75, polygon: 5.1, arbitrum: 1.8, optimism: 2.3 },
  { time: '20:00', ethereum: 62, polygon: 4.2, arbitrum: 1.4, optimism: 1.8 },
  { time: '23:59', ethereum: 48, polygon: 2.8, arbitrum: 0.9, optimism: 1.3 },
];

const CHAINS = [
  { name: 'ethereum', label: 'Ethereum', color: 'hsl(210 100% 60%)', unit: 'Gwei' },
  { name: 'polygon', label: 'Polygon', color: 'hsl(160 100% 45%)', unit: 'Gwei' },
  { name: 'arbitrum', label: 'Arbitrum', color: 'hsl(45 100% 55%)', unit: 'Gwei' },
  { name: 'optimism', label: 'Optimism', color: 'hsl(280 80% 65%)', unit: 'Gwei' },
];

export default function GasFeeWidget() {
  const [selectedChain, setSelectedChain] = useState('ethereum');
  const [optimalTime, setOptimalTime] = useState(null);

  // Find optimal time (lowest fee)
  useEffect(() => {
    const data = MOCK_GAS_FEES;
    let lowest = data[0];
    data.forEach((d) => {
      if (d[selectedChain] < lowest[selectedChain]) {
        lowest = d;
      }
    });
    setOptimalTime(lowest);
  }, [selectedChain]);

  const currentData = MOCK_GAS_FEES[MOCK_GAS_FEES.length - 1];
  const currentFee = currentData[selectedChain];
  const avgFee =
    MOCK_GAS_FEES.reduce((sum, d) => sum + d[selectedChain], 0) / MOCK_GAS_FEES.length;
  const saving = ((currentFee - (optimalTime?.[selectedChain] || 0)) / currentFee * 100).toFixed(1);

  const chainColor = CHAINS.find((c) => c.name === selectedChain)?.color || '';

  return (
    <div className="space-y-4">
      {/* Current Fee Card */}
      <div className="bg-gradient-to-br from-card to-secondary border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-500" /> Gas Fees
          </h3>
          <span className="text-[10px] text-muted-foreground">Updated live</span>
        </div>

        {/* Chain Selector */}
        <div className="flex gap-1.5 overflow-x-auto">
          {CHAINS.map((chain) => (
            <button
              key={chain.name}
              onClick={() => setSelectedChain(chain.name)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-medium whitespace-nowrap transition-all ${
                selectedChain === chain.name
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}>
              {chain.label}
            </button>
          ))}
        </div>

        {/* Current Fee */}
        <div className="flex items-end gap-2">
          <div className="text-4xl font-black" style={{ color: chainColor }}>
            {currentFee.toFixed(1)}
          </div>
          <div className="mb-1">
            <p className="text-xs text-muted-foreground">Gwei</p>
            <p className="text-xs font-semibold text-muted-foreground">Current</p>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
          <div>
            <p className="text-[10px] text-muted-foreground">24h Average</p>
            <p className="text-sm font-bold">{avgFee.toFixed(1)} Gwei</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Optimal Time</p>
            <p className="text-sm font-bold flex items-center gap-1">
              <TrendingDown className="w-3 h-3 text-green-500" />
              {optimalTime?.time}
            </p>
          </div>
        </div>

        {/* Saving Potential */}
        {saving > 0 && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-2 text-center">
            <p className="text-xs text-green-600 font-semibold">
              Save {saving}% by waiting until {optimalTime?.time}
            </p>
          </div>
        )}
      </div>

      {/* Gas Fee Trend Chart */}
      <div className="bg-card border border-border rounded-xl p-4">
        <p className="text-xs font-semibold text-muted-foreground mb-3">24h Trend</p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={MOCK_GAS_FEES}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" style={{ fontSize: '11px' }} />
            <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: '11px' }} />
            <Tooltip
              contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
              formatter={(value) => `${value.toFixed(1)} Gwei`}
            />
            <Legend wrapperStyle={{ fontSize: '11px', color: 'hsl(var(--muted-foreground))' }} />
            {selectedChain === 'ethereum' && (
              <Line type="monotone" dataKey="ethereum" stroke={CHAINS[0].color} dot={false} strokeWidth={2} />
            )}
            {selectedChain === 'polygon' && (
              <Line type="monotone" dataKey="polygon" stroke={CHAINS[1].color} dot={false} strokeWidth={2} />
            )}
            {selectedChain === 'arbitrum' && (
              <Line type="monotone" dataKey="arbitrum" stroke={CHAINS[2].color} dot={false} strokeWidth={2} />
            )}
            {selectedChain === 'optimism' && (
              <Line type="monotone" dataKey="optimism" stroke={CHAINS[3].color} dot={false} strokeWidth={2} />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Tip */}
      <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-3">
        <p className="text-xs text-yellow-600 font-semibold mb-1">💡 Pro Tip</p>
        <p className="text-xs text-muted-foreground">
          Gas fees fluctuate throughout the day. Monitor trends and execute transactions during low-fee periods to
          maximize savings on rebalancing.
        </p>
      </div>
    </div>
  );
}