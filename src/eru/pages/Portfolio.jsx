import { useMemo, useState } from 'react';
import { Trophy, Flame, TrendingUp, Star, Heart, Download } from 'lucide-react';
import { useAuth } from '@/eru/lib/AuthContext';
import { useLanguage } from '@/eru/context/LanguageContext';
import { useRealtimeEntityList } from '@/eru/hooks/useLiveSync';
import ScenarioAnalysisPanel from '../components/portfolio/ScenarioAnalysisPanel';
import DiversificationToolsPanel from '../components/portfolio/DiversificationToolsPanel';
import PerformanceBenchmarkPanel from '../components/portfolio/PerformanceBenchmarkPanel';
import RebalancingPlanner from '../components/portfolio/RebalancingPlanner';
import InvestmentJournalPanel from '../components/portfolio/InvestmentJournalPanel';
import TargetAllocationPanel from '../components/portfolio/TargetAllocationPanel';
import { buildCombinedPortfolioData } from '../lib/portfolioRebalance';
import PullToRefresh from '../components/mobile/PullToRefresh';

export default function Portfolio() {
  const [tab, setTab] = useState('inventory');
  const { user } = useAuth();
  const { t } = useLanguage();
  const jadeQuery = useMemo(() => user?.email ? { created_by: user.email } : {}, [user?.email]);
  const buyerQuery = useMemo(() => user?.email ? { buyer_email: user.email } : {}, [user?.email]);
  const { data: jadeAssets, loading: jadeLoading } = useRealtimeEntityList('JadeAsset', { query: jadeQuery, sort: '-updated_date', limit: 100, enabled: !!user?.email });
  const { data: cards, loading: cardsLoading } = useRealtimeEntityList('Card', { query: jadeQuery, sort: '-updated_date', limit: 100, enabled: !!user?.email });
  const { data: listings, loading: listingsLoading } = useRealtimeEntityList('StorefrontListing', { query: jadeQuery, sort: '-updated_date', limit: 100, enabled: !!user?.email });
  const { data: transactions, loading: transactionsLoading } = useRealtimeEntityList('Transaction', { query: buyerQuery, sort: '-created_date', limit: 50, enabled: !!user?.email });
  const { data: reputationRows, loading: reputationLoading } = useRealtimeEntityList('Reputation', { query: jadeQuery, sort: '-updated_date', limit: 1, enabled: !!user?.email });
  const { data: walletHoldings, loading: walletHoldingsLoading } = useRealtimeEntityList('WalletHolding', { query: jadeQuery, sort: '-last_updated', limit: 200, enabled: !!user?.email });
  const reputation = reputationRows?.[0] || null;
  const loading = jadeLoading || cardsLoading || listingsLoading || transactionsLoading || reputationLoading || walletHoldingsLoading;

  if (loading) return (
    <div className="flex flex-col min-h-screen bg-background pb-20">
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    </div>
  );

  const totalValue = jadeAssets.reduce((sum, j) => sum + (j.valuation || 0), 0) + cards.length * 100;
  const stats = [
    { label: t('portfolio.jadeAssets', undefined, 'Jade Assets'), value: jadeAssets.length, icon: Flame, color: 'text-orange-400' },
    { label: t('portfolio.cards', undefined, 'Cards'), value: cards.length, icon: Star, color: 'text-yellow-400' },
    { label: t('portfolio.listed', undefined, 'Listed'), value: listings.length, icon: TrendingUp, color: 'text-green-400' },
    { label: t('portfolio.level', undefined, 'Level'), value: reputation?.level || 1, icon: Trophy, color: 'text-primary' },
  ];
  const combinedHoldings = buildCombinedPortfolioData({ walletHoldings, jadeAssets, cards, transactions });

  // Pull-to-refresh handler — emits a global refresh event other widgets can
  // listen to. Live entity hooks keep streaming on their own; the brief await
  // gives the spinner time to render.
  const handleRefresh = async () => {
    window.dispatchEvent(new CustomEvent('app:refresh', { detail: { source: 'portfolio' } }));
    await new Promise((r) => setTimeout(r, 400));
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div
      className="flex flex-col min-h-screen bg-background pb-20"
      style={{
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
      }}
    >
      {/* Header */}
      <div className="px-4 py-4 border-b border-border bg-card/50">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-lg font-bold text-primary">
            {user?.full_name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div>
            <p className="font-semibold">{user?.full_name || t('portfolio.user', undefined, 'User')}</p>
            <p className="text-xs text-muted-foreground">{user?.role === 'admin' ? `⭐ ${t('portfolio.admin', undefined, 'Admin')}` : t('portfolio.collector', undefined, 'Collector')}</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="px-4 py-3 grid grid-cols-2 gap-2">
        {stats.map((stat, i) => (
          <div key={i} className="bg-card border border-border rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <stat.icon className={`w-3.5 h-3.5 ${stat.color}`} />
              <span className="text-[10px] text-muted-foreground">{stat.label}</span>
            </div>
            <p className="text-lg font-semibold">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border px-4 gap-1">
        {[
          { id: 'inventory', label: t('portfolio.inventory', undefined, 'Inventory') },
          { id: 'analysis', label: t('portfolio.analysis', undefined, 'Analysis') },
          { id: 'journal', label: t('portfolio.journal', undefined, 'Journal') },
          { id: 'showcase', label: t('portfolio.showcase', undefined, 'Showcase') },
          { id: 'history', label: t('portfolio.history', undefined, 'History') },
          { id: 'profile', label: t('portfolio.profile', undefined, 'Profile') }
        ].map(tabItem => (
          <button
            key={tabItem.id}
            onClick={() => setTab(tabItem.id)}
            className={`py-3 px-3 text-xs font-medium whitespace-nowrap transition-colors border-b-2 ${
              tab === tabItem.id
                ? 'text-primary border-b-primary'
                : 'text-muted-foreground border-b-transparent'
            }`}>
            {tabItem.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        
        {/* INVENTORY */}
        {tab === 'inventory' && (
          <>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">{t('portfolio.jadeAssets', undefined, 'Jade Assets')} ({jadeAssets.length})</p>
              {jadeAssets.length > 0 ? (
                <div className="space-y-2">
                  {jadeAssets.map(jade => (
                    <div key={jade.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-card border border-border">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                        style={{ background: `hsl(${jade.color_type === 'imperial_green' ? '160 100% 45%' : jade.color_type === 'lavender' ? '280 70% 60%' : '220 100% 60%'} / 0.2)` }}>
                        💎
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium capitalize truncate">{jade.crafted_form} • {jade.color_type.replace('_', ' ')}</p>
                        <p className="text-[10px] text-muted-foreground">{t('portfolio.score', undefined, 'Score')}: {jade.composite_score.toFixed(0)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold">{jade.volume_kg}kg</p>
                        <p className="text-[10px] text-muted-foreground">{jade.lifecycle_state}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">{t('portfolio.noJade', undefined, 'No jade assets yet')}</p>
              )}
            </div>

            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">{t('portfolio.cards', undefined, 'Cards')} ({cards.length})</p>
              {cards.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {cards.map(card => (
                    <div key={card.id} className="flex flex-col items-center p-2 rounded-lg bg-card border border-border">
                      <div className="w-full aspect-square rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mb-1 text-2xl">
                        {card.rarity === 'mythic' ? '👑' : card.rarity === 'legendary' ? '⭐' : card.rarity === 'epic' ? '✨' : '✓'}
                      </div>
                      <p className="text-[9px] font-medium text-center line-clamp-2 leading-tight">{card.name}</p>
                      <p className="text-[8px] text-muted-foreground mt-0.5">{card.rarity}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">{t('portfolio.noCards', undefined, 'No cards yet')}</p>
              )}
            </div>
          </>
        )}

        {/* ANALYSIS */}
        {tab === 'analysis' && (
          <div className="space-y-3">
            <TargetAllocationPanel holdings={combinedHoldings} />
            <RebalancingPlanner />
            <ScenarioAnalysisPanel />
            <DiversificationToolsPanel />
            <PerformanceBenchmarkPanel />
          </div>
        )}

        {tab === 'journal' && (
          <div className="space-y-3">
            <InvestmentJournalPanel />
          </div>
        )}

        {/* SHOWCASE */}
        {tab === 'showcase' && (
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-3">{t('portfolio.featuredItems', undefined, 'Featured Items')}</p>
            {listings.length > 0 ? (
              <div className="space-y-2">
                {listings.slice(0, 5).map(list => (
                  <div key={list.id} className="flex items-center gap-3 px-3 py-3 rounded-lg bg-card border border-border/50 hover:border-primary/30">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-lg">
                      {list.asset_type === 'jade' ? '💎' : list.asset_type === 'card' ? '🎴' : '🖼️'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{list.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{list.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold text-primary">{list.base_price} {list.currency}</p>
                      <p className="text-[10px] text-muted-foreground capitalize">{list.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Heart className="w-8 h-8 text-muted-foreground/30 mb-2" />
                <p className="text-xs text-muted-foreground">{t('portfolio.noListings', undefined, 'No items listed yet')}</p>
                <p className="text-[10px] text-muted-foreground/60">{t('portfolio.noListingsHint', undefined, 'List your best assets to showcase')}</p>
              </div>
            )}
          </div>
        )}

        {/* HISTORY */}
        {tab === 'history' && (
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-3">{t('portfolio.recentTransactions', undefined, 'Recent Transactions')} ({transactions.length})</p>
            {transactions.length > 0 ? (
              <div className="space-y-2">
                {transactions.slice(0, 10).map(trans => (
                  <div key={trans.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-card border border-border">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg ${trans.status === 'verified' ? 'bg-green-400/10' : 'bg-yellow-400/10'}`}>
                      {trans.status === 'verified' ? '✓' : '⏳'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium capitalize truncate">{trans.asset_type}</p>
                      <p className="text-[10px] text-muted-foreground">{trans.currency} {trans.amount}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-xs font-medium ${trans.status === 'verified' ? 'text-green-400' : 'text-yellow-400'}`}>
                        {trans.status}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(trans.created_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">{t('portfolio.noTransactions', undefined, 'No transactions yet')}</p>
            )}
          </div>
        )}

        {/* PROFILE */}
        {tab === 'profile' && (
          <div className="space-y-3">
            <div className="bg-card border border-border rounded-lg p-4 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">{t('portfolio.email', undefined, 'Email')}</p>
                <p className="text-sm font-mono text-foreground">{user?.email}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">{t('portfolio.memberSince', undefined, 'Member Since')}</p>
                <p className="text-sm">{new Date(user?.created_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">{t('portfolio.role', undefined, 'Role')}</p>
                <p className="text-sm capitalize">{user?.role}</p>
              </div>
            </div>

            {reputation && (
              <div className="bg-card border border-border rounded-lg p-4 space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-primary" /> {t('portfolio.reputation', undefined, 'Reputation')}
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">{t('portfolio.level', undefined, 'Level')}</span>
                    <span className="text-sm font-semibold">{reputation.level}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">{t('portfolio.xp', undefined, 'XP')}</span>
                    <span className="text-sm font-semibold">{reputation.xp}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">{t('portfolio.marketplaceSales', undefined, 'Marketplace Sales')}</span>
                    <span className="text-sm font-semibold">{reputation.marketplace_sales}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex items-center gap-3">
              <Download className="w-4 h-4 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-primary">{t('portfolio.exportPortfolio', undefined, 'Export Portfolio')}</p>
                <p className="text-[10px] text-primary/70">{t('portfolio.exportDesc', undefined, 'Download your inventory & transaction history')}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </PullToRefresh>
  );
}