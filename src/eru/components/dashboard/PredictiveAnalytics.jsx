import { useState } from 'react';
import { TrendingUp, Loader } from 'lucide-react';

export default function PredictiveAnalytics({ walletId }) {
  const [predictions, setPredictions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPredictions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/predictAssetPerformance', {
        method: 'POST',
        body: JSON.stringify({ walletId }),
      });
      const data = await res.json();
      if (data.predictions) {
        setPredictions(data.predictions);
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
          <TrendingUp className="w-4 h-4 text-primary" /> Predictive Analytics
        </h3>
        <button
          onClick={fetchPredictions}
          disabled={loading}
          className="text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity">
          {loading ? <Loader className="w-3 h-3 animate-spin inline mr-1" /> : 'Analyze'}
        </button>
      </div>

      {error && <div className="text-xs text-red-500 bg-red-500/10 p-2 rounded-lg">{error}</div>}

      {predictions ? (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">Market Outlook: {predictions.market_outlook}</p>

          {predictions.predictions?.map((pred) => (
            <div key={pred.symbol} className="bg-card border border-border rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm">{pred.symbol}</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    pred.prediction_direction === 'bullish'
                      ? 'bg-green-500/10 text-green-600'
                      : pred.prediction_direction === 'bearish'
                        ? 'bg-red-500/10 text-red-600'
                        : 'bg-blue-500/10 text-blue-600'
                  }`}>
                  {pred.prediction_direction}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div>
                  <p>Target Price</p>
                  <p className="font-bold text-foreground">${pred.target_price.toLocaleString()}</p>
                </div>
                <div>
                  <p>Confidence</p>
                  <p className="font-bold text-foreground">{pred.confidence}%</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1">Volatility: {pred.volatility_forecast}</p>
                <p className="text-xs text-muted-foreground mb-1">
                  Recommendation:{' '}
                  <span className="font-semibold text-foreground">{pred.recommendation}</span>
                </p>
                {pred.catalysts?.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    Key Catalysts: {pred.catalysts.join(', ')}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl p-4 text-center text-muted-foreground text-sm">
          Click "Analyze" to generate AI-powered predictions for your portfolio
        </div>
      )}
    </div>
  );
}