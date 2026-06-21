import { useState } from 'react';
import { AlertTriangle, Loader } from 'lucide-react';

const RISK_COLORS = {
  1: 'text-green-600',
  2: 'text-green-500',
  3: 'text-blue-600',
  4: 'text-blue-500',
  5: 'text-yellow-600',
  6: 'text-yellow-500',
  7: 'text-orange-600',
  8: 'text-red-600',
  9: 'text-red-500',
  10: 'text-red-700',
};

const RISK_LABELS = {
  1: 'Minimal',
  2: 'Very Low',
  3: 'Low',
  4: 'Low-Medium',
  5: 'Medium',
  6: 'Medium-High',
  7: 'High',
  8: 'Very High',
  9: 'Extreme',
  10: 'Catastrophic',
};

export default function RiskAssessment({ walletId }) {
  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAssessment = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/assessPortfolioRisk', {
        method: 'POST',
        body: JSON.stringify({ walletId }),
      });
      const data = await res.json();
      if (data.risk_assessment) {
        setAssessment(data.risk_assessment);
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
          <AlertTriangle className="w-4 h-4 text-yellow-500" /> Risk Assessment
        </h3>
        <button
          onClick={fetchAssessment}
          disabled={loading}
          className="text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity">
          {loading ? <Loader className="w-3 h-3 animate-spin inline mr-1" /> : 'Assess'}
        </button>
      </div>

      {error && <div className="text-xs text-red-500 bg-red-500/10 p-2 rounded-lg">{error}</div>}

      {assessment ? (
        <div className="space-y-3">
          {/* Risk Score */}
          <div className="bg-gradient-to-br from-card to-secondary border border-border rounded-xl p-4 space-y-3">
            <div className="flex items-end gap-3">
              <div className={`text-4xl font-black ${RISK_COLORS[assessment.overall_risk_score]}`}>
                {assessment.overall_risk_score}
              </div>
              <div className="mb-1">
                <p className="text-xs text-muted-foreground">/10</p>
                <p className={`text-xs font-bold ${RISK_COLORS[assessment.overall_risk_score]}`}>
                  {RISK_LABELS[assessment.overall_risk_score]}
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{assessment.recommendation}</p>
          </div>

          {/* Risk Metrics */}
          {assessment.metrics && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">Risk Components</p>
              {Object.entries(assessment.metrics).map(([key, value]) => (
                <div key={key} className="bg-card border border-border rounded-lg p-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</span>
                    <span className="text-xs font-bold">{value}/10</span>
                  </div>
                  <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        value <= 3
                          ? 'bg-green-500'
                          : value <= 6
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                      }`}
                      style={{ width: `${(value / 10) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Mitigation Strategies */}
          {assessment.mitigation_strategies?.length > 0 && (
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-3">
              <p className="text-xs font-semibold text-blue-600 mb-2">Mitigation Strategies</p>
              <ul className="space-y-1">
                {assessment.mitigation_strategies.map((strategy, i) => (
                  <li key={i} className="text-xs text-muted-foreground">
                    • {strategy}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl p-4 text-center text-muted-foreground text-sm">
          Click "Assess" to analyze your portfolio's risk profile
        </div>
      )}
    </div>
  );
}