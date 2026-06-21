import { useMemo } from 'react';
import { Sparkles } from 'lucide-react';
import { useRealPrices } from '../../hooks/useRealPrices';

const BEHAVIOR_PROFILE = {
  preferredStyle: 'momentum',
  rebalanceCadence: 'irregular'
};

const HOLDINGS = [
  { symbol: 'BTC', allocation: 35, risk: 'medium' },
  { symbol: 'ETH', allocation: 30, risk: 'medium' },
  { symbol: 'SOL', allocation: 20, risk: 'high' },
  { symbol: 'USDC', allocation: 15, risk: 'low' }
];

export default function AIInsightsWidget() {
  const { prices } = useRealPrices();

  const insights = useMemo(() => {
    const priceMap = Object.fromEntries((prices || []).map((item) => [item.symbol, item]));
    const topHolding = HOLDINGS.reduce((max, item) => item.allocation > max.allocation ? item : max, HOLDINGS[0]);
    const highRiskWeight = HOLDINGS.filter((item) => item.risk === 'high').reduce((sum, item) => sum + item.allocation, 0);
    const positiveMomentum = HOLDINGS.filter((item) => (priceMap[item.symbol]?.change || 0) > 0).sort((a, b) => (priceMap[b.symbol]?.change || 0) - (priceMap[a.symbol]?.change || 0))[0];

    return [
      `Your largest position is ${topHolding.symbol} at ${topHolding.allocation}% of the portfolio, so setting a cap near 30% could reduce concentration risk.`,
      highRiskWeight >= 20
        ? `About ${highRiskWeight}% of your portfolio is in higher-volatility assets, so pairing that with more stable holdings may smooth swings.`
        : 'Your higher-volatility exposure looks contained, which supports steadier portfolio behavior.',
      positiveMomentum
        ? `${positiveMomentum.symbol} is showing the strongest recent momentum in your tracked holdings, so consider reviewing whether to let winners run or rebalance into target weights.`
        : 'Market momentum across your tracked holdings looks mixed, so this may be a good moment to stick to allocation rules instead of reacting emotionally.',
      BEHAVIOR_PROFILE.rebalanceCadence === 'irregular'
        ? 'Your review pattern looks inconsistent, so a scheduled monthly check-in could help turn market moves into disciplined action.'
        : 'Your rebalance habit looks consistent, which is a strong sign of disciplined portfolio management.'
    ];
  }, [prices]);

  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold">AI-driven Insights</h3>
      </div>
      <div className="space-y-2 sm:space-y-3">
        {insights.map((insight) => (
          <div key={insight} className="rounded-xl bg-primary/5 border border-primary/20 px-3 py-3">
            <p className="text-xs text-foreground leading-relaxed">{insight}</p>
          </div>
        ))}
      </div>
    </div>
  );
}