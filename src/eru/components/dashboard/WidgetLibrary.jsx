import { useEffect, useMemo, useRef, useState } from 'react';
import { base44 } from '@/eru/api/base44Client';
import { Bot, Pin, Zap, Plus, Check, Activity, RefreshCw, Pause, Play, Square } from 'lucide-react';
import { Link } from 'react-router-dom';
import NewsFeedWidget from './NewsFeedWidget';
import AIInsightsWidget from './AIInsightsWidget';

const QUICK_ACTIONS = [
  { label: 'AI Lab', to: '/ailab' },
  { label: 'Markets', to: '/markets' },
  { label: 'Trade', to: '/trade' },
  { label: 'Portfolio', to: '/portfolio' },
];

const DEFAULT_METRICS = ['BTC', 'ETH', 'SOL'];

function SectionHeader({ icon: HeaderIcon, title, action }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <HeaderIcon className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      {action}
    </div>
  );
}

function BotStatusWidget() {
  const [bots, setBots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [batchLoading, setBatchLoading] = useState(false);
  const [selectedBotIds, setSelectedBotIds] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const isLoadingRef = useRef(false);

  const mergeBot = (prev, nextBot) => {
    const withoutCurrent = prev.filter((item) => item.id !== nextBot.id);
    return [nextBot, ...withoutCurrent]
      .sort((a, b) => new Date(b.updated_date || b.created_date || 0) - new Date(a.updated_date || a.created_date || 0))
      .slice(0, 8);
  };

  const loadBots = async () => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    setLoading(true);

    try {
      const data = await base44.entities.UserBot.list('-updated_date', 8);
      setBots(data || []);
      setLastUpdated(new Date());
    } catch (error) {
      if (error?.status !== 429) {
        throw error;
      }
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  };

  useEffect(() => {
    loadBots().catch(() => {});
    const unsubscribe = base44.entities.UserBot.subscribe((event) => {
      if (event.type === 'create' || event.type === 'update') {
        setBots((prev) => mergeBot(prev, event.data));
      }
      if (event.type === 'delete') {
        setBots((prev) => prev.filter((item) => item.id !== event.id));
      }
      setLastUpdated(new Date());
    });
    return unsubscribe;
  }, []);

  const toggleSelection = (botId) => {
    setSelectedBotIds((prev) => prev.includes(botId) ? prev.filter((id) => id !== botId) : [...prev, botId]);
  };

  const toggleSelectAll = () => {
    setSelectedBotIds((prev) => prev.length === bots.length ? [] : bots.map((bot) => bot.id));
  };

  const runBulkAction = async (nextStatus) => {
    if (selectedBotIds.length === 0 || batchLoading) return;
    setBatchLoading(true);
    setBots((prev) => prev.map((item) => selectedBotIds.includes(item.id) ? { ...item, status: nextStatus } : item));
    await Promise.all(selectedBotIds.map((botId) => base44.entities.UserBot.update(botId, { status: nextStatus }).catch(() => null)));
    setSelectedBotIds([]);
    setBatchLoading(false);
    setLastUpdated(new Date());
  };

  const toggleStatus = async (bot) => {
    const nextStatus = bot.status === 'active' ? 'inactive' : 'active';
    setBots((prev) => prev.map((item) => item.id === bot.id ? { ...item, status: nextStatus } : item));
    await base44.entities.UserBot.update(bot.id, { status: nextStatus }).catch(() => {});
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <SectionHeader
        icon={Bot}
        title="Bot Status"
        action={<button onClick={loadBots} className="p-1 rounded hover:bg-secondary"><RefreshCw className={`w-3.5 h-3.5 text-muted-foreground ${loading ? 'animate-spin' : ''}`} /></button>}
      />
      {lastUpdated && <p className="text-[10px] text-muted-foreground mb-3">Live · Updated {lastUpdated.toLocaleTimeString()}</p>}
      {bots.length > 0 && (
        <div className="mb-3 rounded-xl border border-border bg-secondary/30 p-2.5 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button onClick={toggleSelectAll} disabled={batchLoading} className="text-[10px] px-2.5 py-1 rounded-lg border border-border bg-card text-muted-foreground disabled:opacity-50">
              {selectedBotIds.length === bots.length ? 'Clear all' : 'Select all'}
            </button>
            <span className="text-[10px] text-muted-foreground">{selectedBotIds.length} selected</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button onClick={() => runBulkAction('active')} disabled={selectedBotIds.length === 0 || batchLoading} className="inline-flex items-center justify-center gap-1 rounded-lg border border-green-400/20 bg-green-400/10 px-2.5 py-2 text-[10px] font-medium text-green-400 disabled:opacity-50">
              <Play className="w-3 h-3" /> Start
            </button>
            <button onClick={() => runBulkAction('paused')} disabled={selectedBotIds.length === 0 || batchLoading} className="inline-flex items-center justify-center gap-1 rounded-lg border border-yellow-400/20 bg-yellow-400/10 px-2.5 py-2 text-[10px] font-medium text-yellow-300 disabled:opacity-50">
              <Pause className="w-3 h-3" /> Pause
            </button>
            <button onClick={() => runBulkAction('inactive')} disabled={selectedBotIds.length === 0 || batchLoading} className="inline-flex items-center justify-center gap-1 rounded-lg border border-border bg-card px-2.5 py-2 text-[10px] font-medium text-muted-foreground disabled:opacity-50">
              <Square className="w-3 h-3" /> Stop
            </button>
          </div>
          {batchLoading && (
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <RefreshCw className="w-3 h-3 animate-spin" /> Updating selected bots...
            </div>
          )}
        </div>
      )}
      <div className="space-y-2">
        {bots.length === 0 ? (
          <p className="text-xs text-muted-foreground">No bots found.</p>
        ) : bots.map((bot) => (
          <div key={bot.id} className="flex items-center gap-2 sm:gap-3 rounded-xl bg-secondary/50 border border-border px-3 py-2.5">
            <input
              type="checkbox"
              checked={selectedBotIds.includes(bot.id)}
              onChange={() => toggleSelection(bot.id)}
              disabled={batchLoading}
              className="h-4 w-4 rounded border-border bg-card"
            />
            <div className={`w-2 h-2 rounded-full ${bot.status === 'active' ? 'bg-green-400' : bot.status === 'paused' ? 'bg-yellow-300' : 'bg-muted-foreground'}`} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{bot.name}</p>
              <p className="text-[10px] text-muted-foreground capitalize">{bot.role || 'bot'} · {bot.status || 'inactive'}</p>
            </div>
            <button
              onClick={() => toggleStatus(bot)}
              disabled={batchLoading}
              className={`text-[10px] px-2 py-1 rounded-lg border whitespace-nowrap disabled:opacity-50 ${bot.status === 'active' ? 'border-green-400/20 bg-green-400/10 text-green-400' : 'border-border bg-card text-muted-foreground'}`}
            >
              {bot.status === 'active' ? 'Disable' : 'Enable'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function MarketPinsWidget({ prices }) {
  const [pinnedMetrics, setPinnedMetrics] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('dashboard_pinned_market_metrics') || 'null');
      return stored?.length ? stored : DEFAULT_METRICS;
    } catch {
      return DEFAULT_METRICS;
    }
  });

  const savePins = (next) => {
    setPinnedMetrics(next);
    localStorage.setItem('dashboard_pinned_market_metrics', JSON.stringify(next));
  };

  const available = useMemo(() => prices.filter((item) => item?.symbol), [prices]);
  const visible = available.filter((item) => pinnedMetrics.includes(item.symbol));

  const toggleMetric = (symbol) => {
    const next = pinnedMetrics.includes(symbol)
      ? pinnedMetrics.filter((item) => item !== symbol)
      : [...pinnedMetrics, symbol].slice(-4);
    savePins(next);
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <SectionHeader icon={Pin} title="Pinned Market Metrics" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
        {visible.length === 0 ? (
          <p className="text-xs text-muted-foreground sm:col-span-3">Pin live metrics below.</p>
        ) : visible.map((item) => (
          <div key={item.symbol} className="rounded-xl bg-secondary/50 border border-border px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold">{item.symbol}</p>
              <span className={`text-[10px] ${item.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {item.change >= 0 ? '▲' : '▼'} {Math.abs(item.change || 0).toFixed(2)}%
              </span>
            </div>
            <p className="text-sm font-mono mt-1">${(item.price || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5 sm:gap-2">
        {available.slice(0, 8).map((item) => {
          const active = pinnedMetrics.includes(item.symbol);
          return (
            <button
              key={item.symbol}
              onClick={() => toggleMetric(item.symbol)}
              className={`text-[10px] px-2.5 py-1 rounded-full border ${active ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-secondary text-muted-foreground'}`}
            >
              {active ? <Check className="w-3 h-3 inline mr-1" /> : <Plus className="w-3 h-3 inline mr-1" />}
              {item.symbol}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DashboardActionsWidget() {
  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <SectionHeader icon={Zap} title="Quick Actions" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {QUICK_ACTIONS.map((action) => (
          <Link
            key={action.label}
            to={action.to}
            className="rounded-xl border border-border bg-secondary/50 hover:border-primary/30 transition-colors px-3 py-3 text-center"
          >
            <div className="flex items-center justify-center gap-1 text-primary mb-1">
              <Activity className="w-3.5 h-3.5" />
            </div>
            <p className="text-xs font-medium">{action.label}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}


export default function WidgetLibrary({ prices = [], sections = ['bot-status', 'market-pins', 'news-feed', 'ai-insights', 'dashboard-actions'] }) {
  return (
    <div className="space-y-4">
      {sections.includes('bot-status') && <BotStatusWidget />}
      {sections.includes('market-pins') && <MarketPinsWidget prices={prices} />}
      {sections.includes('news-feed') && <NewsFeedWidget />}
      {sections.includes('ai-insights') && <AIInsightsWidget />}
      {sections.includes('dashboard-actions') && <DashboardActionsWidget />}
    </div>
  );
}