import { useState } from 'react';
import { Lightbulb, Loader } from 'lucide-react';

export default function StrategyRecommendations({ walletId }) {
  const [strategy, setStrategy] = useState(null);
  const [riskTolerance, setRiskTolerance] = useState('moderate');
  const [horizon, setHorizon] = useState('12-months');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchStrategy = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/generateStrategyRecommendations', {
        method: 'POST',
        body: JSON.stringify({
          walletId,
          riskTolerance,
          investmentHorizon: horizon,
        }),
      });
      const data = await res.json();
      if (data.strategy) {
        setStrategy(data.strategy);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-primary" /> Strategy
        </h3>
        <button
          onClick={fetchStrategy}
          disabled={loading}
          className="text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity">
          {loading ? <Loader className="w-3 h-3 animate-spin inline mr-1" /> : 'Generate'}
        </button>
      </div>

      {/* Input Controls */}
      <div className="space-y-2">
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Risk Tolerance</label>
          <select
            value={riskTolerance}
            onChange={(e) => setRiskTolerance(e.target.value)}
            className="w-full text-xs px-3 py-1.5 bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
            <option value="conservative">Conservative</option>
            <option value="moderate">Moderate</option>
            <option value="aggressive">Aggressive</option>
          </select>
        </div>

        <div>
          <label className="text-xs text-muted-foreground block mb-1">Investment Horizon</label>
          <select
            value={horizon}
            onChange={(e) => setHorizon(e.target.value)}
            className="w-full text-xs px-3 py-1.5 bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
            <option value="3-months">3 Months</option>
            <option value="6-months">6 Months</option>
            <option value="12-months">12 Months</option>
            <option value="long-term">Long Term (2+ Years)</option>
          </select>
        </div>
      </div>

      {error && <div className="text-xs text-red-500 bg-red-500/10 p-2 rounded-lg">{error}</div>}

      {strategy ? (
        <div className="space-y-3">
          {/* Strategy Name */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h4 className="font-bold text-sm">{strategy.strategy_name}</h4>
            <p className="text-xs text-muted-foreground mt-1">{strategy.strategy_description}</p>
          </div>

          {/* Target Allocation */}
          {strategy.target_allocation && (
            <div className="bg-card border border-border rounded-xl p-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">Target Allocation</p>
              {Object.entries(strategy.target_allocation).map(([asset, percent]) => (
                <div key={asset} className="flex items-center justify-between text-xs">
                  <span>{asset}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${Math.min(percent, 100)}%` }}
                      />
                    </div>
                    <span className="font-bold w-10 text-right">{percent.toFixed(0)}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Rebalancing Rules */}
          {strategy.rebalancing_rules && (
            <div className="bg-card border border-border rounded-xl p-3">
              <p className="text-xs font-semibold text-muted-foreground mb-2">Rebalancing Rules</p>
              <p className="text-xs text-foreground mb-1">
                Frequency: <span className="font-bold">{strategy.rebalancing_rules.frequency}</span>
              </p>
              <p className="text-xs text-foreground mb-2">
                Threshold: <span className="font-bold">{strategy.rebalancing_rules.threshold_percent}%</span>
              </p>
              {strategy.rebalancing_rules.rules && (
                <ul className="space-y-1">
                  {strategy.rebalancing_rules.rules.map((rule, i) => (
                    <li key={i} className="text-xs text-muted-foreground">
                      • {rule}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Action Plan */}
          {strategy.action_plan?.length > 0 && (
            <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-3">
              <p className="text-xs font-semibold text-green-600 mb-2">Action Plan (Next 3 Months)</p>
              <ol className="space-y-1">
                {strategy.action_plan.map((action, i) => (
                  <li key={i} className="text-xs text-muted-foreground">
                    {i + 1}. {action}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* KPIs */}
          {strategy.kpis?.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-3">
              <p className="text-xs font-semibold text-muted-foreground mb-2">Success Metrics (KPIs)</p>
              <ul className="space-y-1">
                {strategy.kpis.map((kpi, i) => (
                  <li key={i} className="text-xs text-muted-foreground">
                    • {kpi}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl p-4 text-center text-muted-foreground text-sm">
          Select your profile and click "Generate" for personalized recommendations
        </div>
      )}
    </div>
  );
}