import { Gauge } from 'lucide-react';

const PORTFOLIO_RETURN = 14.8;
const BENCHMARKS = [
  { name: 'S&P 500', value: 11.2 },
  { name: 'Nasdaq 100', value: 13.6 },
  { name: '60/40 Portfolio', value: 8.4 },
  { name: 'Crypto Large Cap', value: 18.9 }
];

export default function PerformanceBenchmarkPanel() {
  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Gauge className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold">Performance Benchmarking</h3>
      </div>
      <div className="bg-secondary rounded-xl p-3 border border-border/50">
        <p className="text-[10px] text-muted-foreground">Your portfolio return</p>
        <p className="text-2xl font-bold text-primary mt-1">+{PORTFOLIO_RETURN}%</p>
        <p className="text-[10px] text-muted-foreground mt-1">Trailing performance compared with common benchmarks.</p>
      </div>
      <div className="space-y-2">
        {BENCHMARKS.map((item) => {
          const delta = PORTFOLIO_RETURN - item.value;
          return (
            <div key={item.name} className="flex items-center justify-between bg-secondary rounded-lg px-3 py-2">
              <div>
                <p className="text-xs font-medium">{item.name}</p>
                <p className="text-[10px] text-muted-foreground">Benchmark: +{item.value}%</p>
              </div>
              <p className={`text-xs font-semibold ${delta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {delta >= 0 ? '+' : ''}{delta.toFixed(1)}%
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}