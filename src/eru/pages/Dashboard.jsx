import { useMemo } from 'react';
import { PanelsTopLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import WidgetRulesPanel from '../components/dashboard/WidgetRulesPanel';
import { DashboardEventsProvider } from '../context/DashboardEventsContext';
import WidgetLibrary from '../components/dashboard/WidgetLibrary';
import LanguageSwitcher from '../components/LanguageSwitcher';
import ThemeToggle from '../components/ThemeToggle';
import { useLanguage } from '@/eru/context/LanguageContext';
import AppDock from '../components/dashboard/AppDock';
import FinanceModule from '../components/dashboard/FinanceModule';
import PortfolioSummary from '../components/dashboard/PortfolioSummary';
import QuickActions from '../components/dashboard/QuickActions';
import CollectorLeaderboard from '../components/dashboard/CollectorLeaderboard';
import SharedDashboardCollabBar from '../components/dashboard/SharedDashboardCollabBar';
import SharedDashboardPresence from '../components/dashboard/SharedDashboardPresence';
import SharedDashboardComments from '../components/dashboard/SharedDashboardComments';
import CollectorRewardsPanel from '../components/dashboard/CollectorRewardsPanel';
import DashboardPanelManager from '../components/dashboard/DashboardPanelManager';
import AlertManager from '../components/AlertManager';
import ExportButton from '../components/dashboard/ExportButton';
import NotificationCenter from '../components/notifications/NotificationCenter';
import TelegramFirstBanner from '../components/telegram/TelegramFirstBanner';
import EruHero from '../components/dashboard/EruHero';
import InstalledModulesRenderer from '../components/appstore/InstalledModulesRenderer';
import { useFeatureTracking } from '../hooks/useFeatureTracking';
import { useRealPrices } from '../hooks/useRealPrices';
import { useRealtimeEntityList } from '@/eru/hooks/useLiveSync';
import PullToRefresh from '../components/mobile/PullToRefresh';
import TelegramRevenuePanel from '../components/dashboard/TelegramRevenuePanel';
import TelegramKnowledgeGapPanel from '../components/dashboard/TelegramKnowledgeGapPanel';
export default function Dashboard() {
  useFeatureTracking('Dashboard');
  const { t } = useLanguage();
  const { prices } = useRealPrices();
  const { data: alerts } = useRealtimeEntityList('PriceAlert', { sort: '-created_date', limit: 50 });
  const { data: notifications } = useRealtimeEntityList('AppNotification', { sort: '-created_date', limit: 50 });
  const { data: telegramBots } = useRealtimeEntityList('TelegramBot', { sort: '-updated_date', limit: 100 });
  const { data: telegramLogs } = useRealtimeEntityList('TelegramBotLog', { sort: '-created_date', limit: 200 });
  const { data: topupOrders } = useRealtimeEntityList('IntegrationTopupOrder', { sort: '-created_date', limit: 200 });
  const { data: telegramKnowledgeGaps } = useRealtimeEntityList('TelegramKnowledgeGap', { sort: '-created_date', limit: 100 });

  // Pull-to-refresh: brief await so the spinner is visible, then dispatch a
  // global "refresh" event other widgets can listen to. The live websocket
  // hook keeps streaming on its own.
  const handleRefresh = async () => {
    window.dispatchEvent(new CustomEvent('app:refresh', { detail: { source: 'dashboard' } }));
    await new Promise((r) => setTimeout(r, 400));
  };

  const portfolioData = useMemo(() => ({
    totalBalance: 15250.50,
    totalInvested: 12000,
    netGainLoss: 3250.50,
    roi: 27.09,
  }), []);

  const appData = {
    portfolioData,
    marketData: prices,
    alerts,
    notifications,
  };

  return (
    <DashboardEventsProvider>
      <PullToRefresh onRefresh={handleRefresh}>
      <div
        className="flex flex-col min-h-screen bg-background pb-24 md:pb-8"
        style={{
          paddingLeft: 'env(safe-area-inset-left, 0px)',
          paddingRight: 'env(safe-area-inset-right, 0px)',
        }}
      >
        <div className="px-4 py-3 border-b border-border bg-card/80 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">{t('dashboard.title', undefined, 'Dashboard')}</h2>
          <ExportButton appData={appData} />
        </div>
        <div className="px-4 py-2 flex justify-end gap-2 bg-background">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('toggle-mini-browser'))}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-foreground hover:border-primary/40"
          >
            <PanelsTopLeft className="w-3.5 h-3.5 text-primary" />
            {t('dashboard.miniBrowser', undefined, 'Mini Browser')}
          </button>
          <ThemeToggle />
          <LanguageSwitcher />
        </div>
        <div className="px-4 pt-4 space-y-4">
          <EruHero />
        </div>
        <PortfolioSummary />
        <QuickActions />
        <div className="px-4 mt-4 space-y-4 pb-4 eru-enter eru-enter-delay-1">
          <TelegramFirstBanner />
          <SharedDashboardCollabBar />
          <SharedDashboardPresence />
          <WidgetRulesPanel />
          <DashboardPanelManager
            collectorRewards={<CollectorRewardsPanel />}
            activeBots={<WidgetLibrary prices={prices} sections={['bot-status']} />}
            quickStats={
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{t('dashboard.analyticsMoved', undefined, 'Analytics moved to a dedicated hub')}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{t('dashboard.analyticsMovedDesc', undefined, 'Open the full analytics page for performance monitoring, trends, and usage insights.')}</p>
                  </div>
                  <Link to="/analytics" className="rounded-xl bg-primary px-3 py-2 text-xs font-medium text-primary-foreground">
                    {t('dashboard.openAnalytics', undefined, 'Open Analytics')}
                  </Link>
                </div>
              </div>
            }
            telegramRevenue={<TelegramRevenuePanel bots={telegramBots || []} orders={topupOrders || []} logs={telegramLogs || []} />}
            knowledgeGaps={<TelegramKnowledgeGapPanel gaps={telegramKnowledgeGaps || []} bots={telegramBots || []} />}
          />
          <WidgetLibrary prices={prices} sections={['market-pins', 'news-feed', 'ai-insights', 'dashboard-actions']} />
          <InstalledModulesRenderer />
          <AppDock />
          <NotificationCenter />
          <AlertManager />
          <CollectorLeaderboard />
          <SharedDashboardComments />
          <FinanceModule />
        </div>
      </div>
      </PullToRefresh>
    </DashboardEventsProvider>
  );
}