import { useMemo, useState } from 'react';
import { Activity, BarChart3, LayoutDashboard, Sparkles } from 'lucide-react';
import AnalyticsWidget from '@/eru/components/dashboard/AnalyticsWidget';
import AIInsightsWidget from '@/eru/components/dashboard/AIInsightsWidget';
import AnalyticsHubOverview from '@/eru/components/analytics/AnalyticsHubOverview';
import AnalyticsHubPerformancePanel from '@/eru/components/analytics/AnalyticsHubPerformancePanel';
import Bot24hAISummaryPanel from '@/eru/components/analytics/Bot24hAISummaryPanel';

const TABS = [
  { id: 'overview', label: 'Overview', Icon: LayoutDashboard },
  { id: 'performance', label: 'Performance', Icon: Activity },
  { id: 'usage', label: 'Usage', Icon: BarChart3 },
  { id: 'bot-summary', label: 'Bot Summary', Icon: Sparkles },
];

export default function AnalyticsHub() {
  const [tab, setTab] = useState('overview');

  const summary = useMemo(() => ({
    avgLoadTime: 284,
    avgApiResponse: 198,
    avgRenderTime: 42,
    resourceUtilization: 67,
    latencyTrend: 'Stable',
    renderTrend: 'Improving',
    issueDetection: '2 warnings flagged',
    healthyServices: 8,
    degradedServices: 2,
    criticalAlerts: 1,
    healthScore: 81,
  }), []);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="border-b border-border bg-card/80 px-4 py-4 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold text-foreground">Analytics Hub</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">A dedicated space for performance monitoring, usage analytics, trends, and proactive issue detection.</p>
      </div>

      <div className="border-b border-border bg-card/40">
        <div className="flex min-w-max overflow-x-auto px-2">
          {TABS.map(({ id, label, Icon: TabIcon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-medium transition-colors ${tab === id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            >
              <TabIcon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4 px-4 py-4">
        {tab === 'overview' && <AnalyticsHubOverview summary={summary} />}

        {tab === 'performance' && <AnalyticsHubPerformancePanel />}

        {tab === 'usage' && (
          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <AnalyticsWidget />
            <AIInsightsWidget />
          </div>
        )}

        {tab === 'bot-summary' && <Bot24hAISummaryPanel />}
      </div>
    </div>
  );
}