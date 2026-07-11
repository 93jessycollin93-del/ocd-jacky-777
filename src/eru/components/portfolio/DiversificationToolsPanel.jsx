import { PieChart } from 'lucide-react';

const ALLOCATION = [
  { symbol: 'BTC', allocation: 35 },
  { symbol: 'ETH', allocation: 30 },
  { symbol: 'SOL', allocation: 20 },
  { symbol: 'USDC', allocation: 15 }
];

export default function DiversificationToolsPanel() {
  const concentration = Math.max(...ALLOCATION.map((item) => item.allocation));
  const diversificationScore = Math.max(0, 100 - concentration + ALLOCATION.length * 4);
  const suggestions = [
    concentration > 40 ? 'Reduce the largest single holding below 40%.' : 'Largest holding is within a reasonable range.',
    ALLOCATION.length < 5 ? 'Add one more uncorrelated asset class for broader diversification.' : 'Asset count supports diversification.',
    'Set target allocation bands and rebalance monthly.'
  ];

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-4">
      <div className="flex items-center gap-2">
        <PieChart className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold">Diversification Tools</h3>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-secondary rounded-lg p-3 text-center">
          <p className="text-[10px] text-muted-foreground">Diversification Score</p>
          <p className="text-xl font-bold text-primary mt-1">{Math.round(diversificationScore)}</p>
        </div>
        <div className="bg-secondary rounded-lg p-3 text-center">
          <p className="text-[10px] text-muted-foreground">Top Holding</p>
          <p className="text-xl font-bold mt-1">{concentration}%</p>
        </div>
      </div>
      <div className="space-y-2">
        {ALLOCATION.map((item) => (
          <div key={item.symbol} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span>{item.symbol}</span>
              <span>{item.allocation}%</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: `${item.allocation}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-3">
        <p className="text-xs font-semibold text-primary mb-2">Improvement Ideas</p>
        <ul className="space-y-1">
          {suggestions.map((item) => (
            <li key={item} className="text-xs text-muted-foreground">• {item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}