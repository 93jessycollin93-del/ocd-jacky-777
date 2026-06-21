import { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Lightbulb, Loader2 } from 'lucide-react';
import { base44 } from '@/eru/api/base44Client';
import { useDashboardEvents } from '@/eru/context/DashboardEventsContext';

const COLORS = ['#00e676', '#2196f3', '#7c4dff', '#ff9800', '#e91e63'];

export default function AnalyticsWidget() {
  const [analytics, setAnalytics] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [pulse, setPulse] = useState(false);
  const { subscribe, rules } = useDashboardEvents();
  const activeRules = useMemo(() => rules.filter((rule) => rule.enabled && rule.target === 'analytics'), [rules]);

  useEffect(() => {
    fetchAnalytics();
    const unsubscribe = base44.entities.FeatureAnalytics.subscribe((event) => {
      if (event.type === 'create') {
        setAnalytics((prev) => [event.data, ...prev].slice(0, 10));
      } else if (event.type === 'update') {
        setAnalytics((prev) => prev.map((item) => item.id === event.id ? event.data : item));
      } else if (event.type === 'delete') {
        setAnalytics((prev) => prev.filter((item) => item.id !== event.id));
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const syncTimeout = window.setTimeout(() => {
      fetchAnalytics();
    }, 1400);

    return () => window.clearTimeout(syncTimeout);
  }, []);

  useEffect(() => {
    const unsubscribe = subscribe('analytics-widget', (dashboardEvent) => {
      const matched = activeRules.some((rule) => rule.source === dashboardEvent.source && rule.event === dashboardEvent.event);
      if (!matched) return;
      setPulse(true);
      window.setTimeout(() => setPulse(false), 1200);
    });
    return unsubscribe;
  }, [subscribe, activeRules]);

  const fetchAnalytics = async () => {
    try {
      const user = await base44.auth.me();
      if (!user) {
        setLoading(false);
        return;
      }

      const data = await base44.entities.FeatureAnalytics.filter(
        { created_by: user.email },
        '-interaction_count',
        10
      );

      setAnalytics(data || []);
      setLoading(false);
    } catch (error) {
      console.error('Analytics fetch error:', error);
      setLoading(false);
    }
  };

  const generateRecommendations = async () => {
    if (loadingRecs) return;
    setLoadingRecs(true);
    try {
      const response = await base44.functions.invoke('generateSmartRecommendations', {});
      setRecommendations(response.data?.recommendations || []);
    } catch (error) {
      console.error('Recommendation error:', error);
    } finally {
      setLoadingRecs(false);
    }
  };

  const chartData = analytics.map(a => ({
    name: a.feature_name,
    interactions: a.interaction_count || 0,
    time: Math.round((a.time_spent_seconds || 0) / 60) // minutes
  }));

  if (loading) {
    return (
      <div className="p-4 bg-card border border-border rounded-xl flex items-center justify-center h-40">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Usage Chart */}
      {chartData.length > 0 && (
        <div className={`bg-card border rounded-xl p-4 transition-all ${pulse ? 'border-primary shadow-[0_0_0_1px_hsl(var(--primary))]' : 'border-border'}`}>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">Feature Usage</h3>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip 
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Bar dataKey="interactions" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Smart Recommendations */}
      <div className={`bg-card border rounded-xl p-4 transition-all ${pulse ? 'border-primary shadow-[0_0_0_1px_hsl(var(--primary))]' : 'border-border'}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold">Smart Recommendations</h3>
          </div>
          <button
            onClick={generateRecommendations}
            disabled={loadingRecs}
            className="text-[10px] px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-50"
          >
            {loadingRecs ? 'Generating...' : 'Refresh'}
          </button>
        </div>

        {loadingRecs ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        ) : recommendations.length > 0 ? (
          <div className="space-y-3">
            {recommendations.map((rec, i) => (
              <div key={i} className="p-3 bg-secondary rounded-lg border border-border/50">
                <p className="text-xs font-semibold text-primary mb-1">{rec.title}</p>
                <p className="text-[10px] text-muted-foreground mb-2">{rec.description}</p>
                <button className="text-[9px] px-2 py-1 rounded bg-primary/20 text-primary hover:bg-primary/30">
                  {rec.action}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-4">
            Tap refresh to generate personalized recommendations
          </p>
        )}
      </div>

      {/* Stats */}
      {chartData.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-secondary border border-border rounded-lg p-3">
            <p className="text-[10px] text-muted-foreground">Total Interactions</p>
            <p className="text-lg font-bold text-primary">
              {chartData.reduce((sum, d) => sum + d.interactions, 0)}
            </p>
          </div>
          <div className="bg-secondary border border-border rounded-lg p-3">
            <p className="text-[10px] text-muted-foreground">Time Spent</p>
            <p className="text-lg font-bold text-primary">
              {Math.round(chartData.reduce((sum, d) => sum + d.time, 0))}m
            </p>
          </div>
        </div>
      )}
    </div>
  );
}