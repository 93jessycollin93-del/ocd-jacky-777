import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, AlertCircle } from 'lucide-react';

// Mock health score history
const MOCK_SCORES = [
  { date: '2026-03-10', score: 62, diversification: 65, volatility: 58, stablecoin: 62 },
  { date: '2026-03-17', score: 68, diversification: 70, volatility: 62, stablecoin: 70 },
  { date: '2026-03-24', score: 75, diversification: 78, volatility: 68, stablecoin: 78 },
  { date: '2026-03-31', score: 71, diversification: 72, volatility: 65, stablecoin: 75 },
  { date: '2026-04-07', score: 78, diversification: 80, volatility: 72, stablecoin: 82 },
  { date: '2026-04-10', score: 82, diversification: 85, volatility: 76, stablecoin: 85 },
];

export default function PortfolioHealthScore() {
  const metrics = useMemo(() => {
    const latest = MOCK_SCORES[MOCK_SCORES.length - 1];
    const previous = MOCK_SCORES[MOCK_SCORES.length - 2];
    const scoreChange = latest.score - previous.score;

    return {
      score: latest.score,
      scoreChange,
      diversification: latest.diversification,
      volatility: latest.volatility,
      stablecoin: latest.stablecoin,
      rating: latest.score >= 80 ? 'Excellent' : latest.score >= 60 ? 'Good' : 'Fair',
      ratingColor: latest.score >= 80 ? 'text-green-500' : latest.score >= 60 ? 'text-blue-500' : 'text-yellow-500',
    };
  }, []);

  const pieData = [
    { name: 'Diversification', value: metrics.diversification, fill: 'hsl(210 100% 60%)' },
    { name: 'Volatility Management', value: metrics.volatility, fill: 'hsl(160 100% 45%)' },
    { name: 'Stablecoin %', value: metrics.stablecoin, fill: 'hsl(45 100% 55%)' },
  ];

  const getHealthReason = () => {
    const issues = [];
    if (metrics.diversification < 60) issues.push('Low diversification');
    if (metrics.volatility < 50) issues.push('High volatility exposure');
    if (metrics.stablecoin < 20) issues.push('Insufficient stablecoins');
    return issues.length > 0 ? issues.join(', ') : 'Well-balanced portfolio';
  };

  return (
    <div className="space-y-4">
      {/* Main Score Card */}
      <div className="bg-gradient-to-br from-card to-secondary border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" /> Health Score
          </h3>
          <span className={`text-xs font-bold px-2 py-1 rounded-full ${metrics.ratingColor} ${metrics.score >= 80 ? 'bg-green-500/10' : metrics.score >= 60 ? 'bg-blue-500/10' : 'bg-yellow-500/10'}`}>
            {metrics.rating}
          </span>
        </div>

        {/* Large Score Display */}
        <div className="flex items-end gap-2">
          <div className="text-5xl font-black text-primary">{metrics.score}</div>
          <div className="mb-1">
            <div className="text-xs text-muted-foreground">/100</div>
            <div className={`text-xs font-bold ${metrics.scoreChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {metrics.scoreChange >= 0 ? '+' : ''}{metrics.scoreChange}
            </div>
          </div>
        </div>

        {/* Health Status */}
        <div className="flex items-center gap-2 px-3 py-2 bg-card rounded-lg border border-border">
          <AlertCircle className="w-4 h-4 text-blue-500" />
          <span className="text-xs text-muted-foreground">{getHealthReason()}</span>
        </div>

        {/* Metrics Breakdown */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border">
          {[
            { label: 'Diversification', value: metrics.diversification, color: 'hsl(210 100% 60%)' },
            { label: 'Volatility', value: metrics.volatility, color: 'hsl(160 100% 45%)' },
            { label: 'Stablecoins', value: metrics.stablecoin, color: 'hsl(45 100% 55%)' },
          ].map((m) => (
            <div key={m.label} className="space-y-1">
              <p className="text-xs text-muted-foreground">{m.label}</p>
              <div className="flex items-end gap-1">
                <span className="text-sm font-bold text-foreground">{m.value}</span>
                <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${m.value}%`, backgroundColor: m.color }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Trend Chart */}
      <div className="bg-card border border-border rounded-xl p-4">
        <p className="text-xs font-semibold text-muted-foreground mb-3">Score History (30 Days)</p>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={MOCK_SCORES}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" style={{ fontSize: '11px' }} />
            <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: '11px' }} domain={[0, 100]} />
            <Tooltip
              contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
              formatter={(value) => `${value}/100`}
            />
            <Line type="monotone" dataKey="score" stroke="hsl(160 100% 45%)" dot={false} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Recommendations */}
      <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-3 space-y-2">
        <p className="text-xs font-semibold text-blue-500">💡 Recommendations</p>
        <ul className="text-xs text-muted-foreground space-y-1">
          {metrics.diversification < 70 && <li>• Increase asset diversification</li>}
          {metrics.volatility < 70 && <li>• Consider more stable assets</li>}
          {metrics.stablecoin < 30 && <li>• Increase stablecoin allocation</li>}
          {metrics.score >= 80 && <li>• Maintain current allocation</li>}
        </ul>
      </div>
    </div>
  );
}