import { useState, useEffect } from 'react';
import { useAuth } from '@/eru/lib/AuthContext';
import { base44 } from '@/eru/api/base44Client';
import RoleGate from '@/eru/components/RoleGate';
import BlockchainMetrics from '@/eru/components/BlockchainMetrics';
import { BarChart3, Target, AlertCircle, Plus } from 'lucide-react';

export default function BlockchainAnalytics() {
  const { currentUser } = useAuth();
  const [weightings, setWeightings] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showWeightingForm, setShowWeightingForm] = useState(false);

  useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [currentUser]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch portfolio weightings
      const w = await base44.entities.PortfolioWeighting.filter(
        { user_email: currentUser.email, is_active: true },
        null,
        100
      );
      setWeightings(w || []);

      // Fetch rebalancing suggestions
      const s = await base44.entities.RebalancingSuggestion.filter(
        { user_email: currentUser.email, status: 'pending' },
        '-created_date',
        50
      );
      setSuggestions(s || []);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const executeSuggestion = async (suggestionId) => {
    try {
      await base44.entities.RebalancingSuggestion.update(suggestionId, {
        status: 'executed',
        executed_date: new Date().toISOString(),
      });
      setSuggestions(suggestions.filter((s) => s.id !== suggestionId));
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const dismissSuggestion = async (suggestionId) => {
    try {
      await base44.entities.RebalancingSuggestion.update(suggestionId, {
        status: 'dismissed',
      });
      setSuggestions(suggestions.filter((s) => s.id !== suggestionId));
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border sticky top-0 z-10 bg-background">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" /> Blockchain Analytics
        </h2>
        <p className="text-xs text-muted-foreground mt-1">Real-time blockchain metrics & portfolio rebalancing</p>
      </div>

      <div className="flex-1 px-4 py-4 space-y-6 overflow-y-auto">
        {/* Blockchain Metrics */}
        <RoleGate permission="view_economy_logs">
          <div>
            <h3 className="text-sm font-semibold mb-4">On-Chain Metrics</h3>
            <BlockchainMetrics />
          </div>
        </RoleGate>

        {/* Rebalancing Suggestions */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-500" /> Rebalancing Suggestions
            </h3>
            {suggestions.length > 0 && (
              <span className="text-xs bg-yellow-500/10 text-yellow-600 px-2 py-0.5 rounded-full font-medium">
                {suggestions.length}
              </span>
            )}
          </div>

          {loading ? (
            <div className="text-center py-6 text-muted-foreground">
              <div className="w-5 h-5 border-2 border-muted-foreground/20 border-t-primary rounded-full animate-spin mx-auto" />
            </div>
          ) : suggestions.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-4 text-center text-sm text-muted-foreground">
              No pending rebalancing suggestions. Your portfolio is balanced.
            </div>
          ) : (
            <div className="space-y-2">
              {suggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className={`bg-card border rounded-xl p-4 space-y-3 ${
                    suggestion.priority === 'high' ? 'border-red-500/30' : 'border-border'
                  }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm">
                          Deviation: {suggestion.total_deviation.toFixed(1)}%
                        </p>
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            suggestion.priority === 'high'
                              ? 'bg-red-500/10 text-red-600'
                              : suggestion.priority === 'medium'
                                ? 'bg-yellow-500/10 text-yellow-600'
                                : 'bg-green-500/10 text-green-600'
                          }`}>
                          {suggestion.priority.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {suggestion.triggered_by_assets.join(', ')}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-2">
                    {suggestion.actions.map((action) => (
                      <div key={action.asset} className="flex items-center justify-between bg-secondary/50 rounded-lg p-2.5 text-sm">
                        <div>
                          <p className="font-medium">{action.asset}</p>
                          <p className="text-xs text-muted-foreground">
                            {action.current_percentage.toFixed(1)}% → {action.target_percentage.toFixed(1)}%
                          </p>
                        </div>
                        <span
                          className={`text-xs font-bold px-2 py-1 rounded ${
                            action.action === 'buy'
                              ? 'bg-green-500/10 text-green-600'
                              : action.action === 'sell'
                                ? 'bg-red-500/10 text-red-600'
                                : 'bg-gray-500/10 text-gray-600'
                          }`}>
                          {action.action.toUpperCase()}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Actions buttons */}
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => executeSuggestion(suggestion.id)}
                      className="flex-1 py-2 bg-green-600 text-white rounded-lg text-xs font-medium hover:opacity-90 transition-opacity">
                      Execute
                    </button>
                    <button
                      onClick={() => dismissSuggestion(suggestion.id)}
                      className="flex-1 py-2 bg-secondary text-muted-foreground rounded-lg text-xs font-medium hover:text-foreground transition-colors">
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Portfolio Weightings */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" /> Target Weightings
            </h3>
            <button
              onClick={() => setShowWeightingForm(true)}
              className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors">
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          </div>

          {weightings.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-4 text-center text-sm text-muted-foreground">
              No weightings defined. Create one to enable portfolio rebalancing.
            </div>
          ) : (
            <div className="space-y-2">
              {weightings.map((weighting) => (
                <div key={weighting.id} className="bg-card border border-border rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm">{weighting.asset_symbol}</p>
                    <div className="text-right">
                      <p className="text-xs font-bold text-primary">
                        {weighting.current_percentage?.toFixed(1) || '0.0'}%
                      </p>
                      <p className="text-xs text-muted-foreground">Target: {weighting.target_percentage}%</p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="relative h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className={`h-full ${weighting.current_percentage > weighting.target_percentage ? 'bg-red-500' : 'bg-green-500'}`}
                      style={{
                        width: `${Math.min(100, (weighting.current_percentage || 0))}%`,
                      }}
                    />
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Range: {(weighting.min_threshold || 0).toFixed(1)}% - {(weighting.max_threshold || 0).toFixed(1)}%
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Weighting Form Modal Placeholder */}
      {showWeightingForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl max-w-sm w-full p-6">
            <h3 className="font-semibold mb-4">Add Target Weighting</h3>
            <p className="text-sm text-muted-foreground mb-4">Weighting form coming soon</p>
            <button
              onClick={() => setShowWeightingForm(false)}
              className="w-full py-2 bg-secondary rounded-lg font-medium hover:opacity-80 transition-opacity">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}