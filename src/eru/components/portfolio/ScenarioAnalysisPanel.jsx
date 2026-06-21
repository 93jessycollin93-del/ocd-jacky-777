import { useMemo, useState } from 'react';
import { BarChart3 } from 'lucide-react';

const HOLDINGS = [
  { symbol: 'BTC', allocation: 35, beta: 1.4 },
  { symbol: 'ETH', allocation: 30, beta: 1.2 },
  { symbol: 'SOL', allocation: 20, beta: 1.8 },
  { symbol: 'USDC', allocation: 15, beta: 0.05 }
];

const SCENARIOS = {
  bull: { label: 'Bull Market', marketMove: 18 },
  correction: { label: 'Market Correction', marketMove: -12 },
  crash: { label: 'Crash Event', marketMove: -28 },
  recovery: { label: 'Recovery Phase', marketMove: 10 }
};

export default function ScenarioAnalysisPanel() {
  const [scenario, setScenario] = useState('correction');
  const result = useMemo(() => {
    const selected = SCENARIOS[scenario];
    const rows = HOLDINGS.map((item) => {
      const impact = (selected.marketMove * item.beta * item.allocation) / 100;
      return { ...item, impact };
    });
    const totalImpact = rows.reduce((sum, item) => sum + item.impact, 0);
    return { selected, rows, totalImpact };
  }, [scenario]);

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-4">
      <div className="flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold">Scenario Analysis</h3>
      </div>
      <select
        value={scenario}
        onChange={(e) => setScenario(e.target.value)}
        className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs"
      >
        {Object.entries(SCENARIOS).map(([key, value]) => (
          <option key={key} value={key}>{value.label}</option>
        ))}
      </select>
      <div className="bg-secondary rounded-xl p-3 border border-border/50">
        <p className="text-[10px] text-muted-foreground">Estimated portfolio move</p>
        <p className={`text-2xl font-bold mt-1 ${result.totalImpact >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {result.totalImpact >= 0 ? '+' : ''}{result.totalImpact.toFixed(1)}%
        </p>
        <p className="text-[10px] text-muted-foreground mt-1">Based on current allocations and asset sensitivity to market moves.</p>
      </div>
      <div className="space-y-2">
        {result.rows.map((item) => (
          <div key={item.symbol} className="flex items-center justify-between bg-secondary rounded-lg px-3 py-2">
            <div>
              <p className="text-xs font-medium">{item.symbol}</p>
              <p className="text-[10px] text-muted-foreground">{item.allocation}% allocation</p>
            </div>
            <p className={`text-xs font-semibold ${item.impact >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {item.impact >= 0 ? '+' : ''}{item.impact.toFixed(1)}%
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}