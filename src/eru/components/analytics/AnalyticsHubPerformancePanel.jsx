import PerformanceDashboard from '@/pages/PerformanceDashboard';

export default function AnalyticsHubPerformancePanel() {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <PerformanceDashboard embedded />
    </div>
  );
}