import { useEffect, useMemo, useState, useCallback } from 'react';
import { base44 } from '@/eru/api/base44Client';
import { Bot, Plus, Trash2, TrendingUp, TrendingDown, Loader2, AlertTriangle, Rocket } from 'lucide-react';
import { STRATEGIES, ASSET_PRESETS, simulateBot } from '@/eru/lib/simEngine';

const STRATEGY_KEYS = Object.keys(STRATEGIES);
const ASSET_KEYS = Object.keys(ASSET_PRESETS);
const randSeed = () => Math.floor(Math.random() * 1_000_000_000);
const money = (n) => `$${Number(n || 0).toFixed(2)}`;
const pct = (n) => `${Number(n || 0) >= 0 ? '+' : ''}${Number(n || 0).toFixed(1)}%`;

// The SimBot entity is created in the Base44 Builder; guard until it exists so
// the page shows a friendly "setting up" state instead of throwing.
const botLabReady = () => typeof base44?.entities?.SimBot?.list === 'function';

// Tiny inline equity sparkline (no chart dependency in the bundle).
function Sparkline({ data = [], up }) {
  if (!data || data.length < 2) return <div className="h-8 w-24" />;
  const w = 96, h = 32, min = Math.min(...data), max = Math.max(...data);
  const span = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / span) * h}`).join(' ');
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline points={pts} fill="none" strokeWidth="1.5"
        className={up ? 'stroke-emerald-500' : 'stroke-rose-500'} />
    </svg>
  );
}

export default function SimTradingLab() {
  const [me, setMe] = useState(null);
  const [bots, setBots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [setupPending, setSetupPending] = useState(false);

  const [name, setName] = useState('');
  const [strategy, setStrategy] = useState('dca');
  const [asset, setAsset] = useState('BTC');
  const [startBalance, setStartBalance] = useState(5);
  const [horizonDays, setHorizonDays] = useState(90);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    if (!botLabReady()) {
      setSetupPending(true);
      setLoading(false);
      return;
    }
    setSetupPending(false);
    try {
      const meRes = await base44.auth.me();
      const rows = await base44.entities.SimBot.list('-created_date', 200);
      setMe(meRes);
      setBots((rows || []).filter((b) => b.created_by === meRes.email));
    } catch (err) {
      console.error('Sim lab load failed:', err);
      setError(err?.message || 'Could not load your bots.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const persistRun = async ({ botName, strat, assetSym, balance, horizon, isPublic = false }) => {
    const seed = randSeed();
    const config = { windowDays: 20, thresholdPct: 5, cadenceDays: 7, targetAllocation: 0.6 };
    const r = simulateBot({ strategy: strat, asset: assetSym, startBalance: balance, horizonDays: horizon, seed, config });
    const created = await base44.entities.SimBot.create({
      name: botName,
      strategy: strat,
      asset_symbol: assetSym,
      start_balance: balance,
      horizon_days: horizon,
      seed,
      config,
      equity_curve: r.equity,
      final_value: r.finalValue,
      return_pct: r.returnPct,
      max_drawdown_pct: r.maxDrawdownPct,
      trade_count: r.tradeCount,
      is_public: isPublic,
    });
    return {
      ...created,
      created_by: me?.email,
      equity_curve: r.equity,
      final_value: r.finalValue,
      return_pct: r.returnPct,
      max_drawdown_pct: r.maxDrawdownPct,
      trade_count: r.tradeCount,
    };
  };

  const handleCreate = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const bot = await persistRun({
        botName: name.trim() || `${STRATEGIES[strategy].label} · ${asset}`,
        strat: strategy, assetSym: asset, balance: Number(startBalance) || 5, horizon: Number(horizonDays) || 90,
      });
      setBots((prev) => [bot, ...prev]);
      setName('');
    } catch (err) {
      console.error('Create bot failed:', err);
      setError(err?.message || 'Could not run the simulation.');
    } finally {
      setBusy(false);
    }
  };

  // One-click fleet: $5 into every strategy on the selected asset.
  const handleLaunchFleet = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const created = [];
      for (const strat of STRATEGY_KEYS) {
        const bot = await persistRun({
          botName: `${STRATEGIES[strat].label} · ${asset}`,
          strat, assetSym: asset, balance: 5, horizon: Number(horizonDays) || 90,
        });
        created.push(bot);
      }
      setBots((prev) => [...created, ...prev]);
    } catch (err) {
      console.error('Fleet launch failed:', err);
      setError(err?.message || 'Could not launch the fleet.');
    } finally {
      setBusy(false);
    }
  };

  const deleteBot = async (id) => {
    if (busy) return;
    setBusy(true);
    try {
      await base44.entities.SimBot.delete(id);
      setBots((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      console.error('Delete failed:', err);
      setError(err?.message || 'Could not delete the bot.');
    } finally {
      setBusy(false);
    }
  };

  const leaderboard = useMemo(
    () => [...bots].sort((a, b) => (b.return_pct || 0) - (a.return_pct || 0)),
    [bots]
  );
  const stats = useMemo(() => {
    if (bots.length === 0) return null;
    const returns = bots.map((b) => b.return_pct || 0);
    const totalStart = bots.reduce((s, b) => s + (b.start_balance || 0), 0);
    const totalFinal = bots.reduce((s, b) => s + (b.final_value || 0), 0);
    return {
      count: bots.length,
      avg: returns.reduce((s, r) => s + r, 0) / returns.length,
      best: Math.max(...returns),
      worst: Math.min(...returns),
      totalStart, totalFinal,
    };
  }, [bots]);

  if (setupPending) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6 text-foreground">
        <header className="mb-4 flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-semibold">Bot Lab</h1>
        </header>
        <div className="rounded-2xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
          Bot Lab is being set up — check back soon.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-4 text-foreground">
      <header className="flex items-center gap-2">
        <Bot className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-semibold">Bot Lab</h1>
      </header>

      {/* Honesty banner — this is never real money. */}
      <div className="flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-amber-600 dark:text-amber-400">
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
        <p className="text-xs leading-relaxed">
          <strong>Simulation only.</strong> No real money, no live trading. Bots run a strategy over a
          synthetic price path so you can compare approaches risk-free. Results do <em>not</em> predict
          real returns — real markets are messier and you can lose money.
        </p>
      </div>

      {/* Composer */}
      <div className="rounded-2xl border border-border bg-card p-3 space-y-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <label className="col-span-2 sm:col-span-1 flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="optional"
              className="rounded-lg border border-border bg-transparent px-2 py-1.5 text-sm outline-none" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Asset</span>
            <select value={asset} onChange={(e) => setAsset(e.target.value)}
              className="rounded-lg border border-border bg-card px-2 py-1.5 text-sm outline-none">
              {ASSET_KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Strategy</span>
            <select value={strategy} onChange={(e) => setStrategy(e.target.value)}
              className="rounded-lg border border-border bg-card px-2 py-1.5 text-sm outline-none">
              {STRATEGY_KEYS.map((k) => <option key={k} value={k}>{STRATEGIES[k].label}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Start ($ sim)</span>
            <input type="number" min="1" value={startBalance} onChange={(e) => setStartBalance(e.target.value)}
              className="rounded-lg border border-border bg-transparent px-2 py-1.5 text-sm outline-none" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Days</span>
            <input type="number" min="7" max="365" value={horizonDays} onChange={(e) => setHorizonDays(e.target.value)}
              className="rounded-lg border border-border bg-transparent px-2 py-1.5 text-sm outline-none" />
          </label>
        </div>
        <p className="text-[11px] text-muted-foreground">{STRATEGIES[strategy].blurb}</p>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleCreate} disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Run bot
          </button>
          <button onClick={handleLaunchFleet} disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-xl border border-primary/40 bg-primary/10 px-3.5 py-2 text-sm font-semibold text-primary disabled:opacity-50"
            title="Run $5 into every strategy on this asset">
            <Rocket className="w-4 h-4" /> Launch $5 fleet
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={load} className="text-xs underline">Retry</button>
        </div>
      )}

      {/* Dataset summary */}
      {stats && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ['Bots', String(stats.count)],
            ['Avg return', pct(stats.avg)],
            ['Best', pct(stats.best)],
            ['Fleet value', `${money(stats.totalStart)} → ${money(stats.totalFinal)}`],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl border border-border bg-card px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{k}</p>
              <p className="text-sm font-semibold">{v}</p>
            </div>
          ))}
        </div>
      )}

      {/* Leaderboard */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : leaderboard.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
          No bots yet — run one above, or launch a $5 fleet to compare every strategy at once.
        </div>
      ) : (
        <div className="space-y-2">
          {leaderboard.map((bot, i) => {
            const up = (bot.return_pct || 0) >= 0;
            return (
              <div key={bot.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
                <span className="w-5 text-center text-xs font-mono text-muted-foreground">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{bot.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {STRATEGIES[bot.strategy]?.label || bot.strategy} · {bot.asset_symbol} · {bot.trade_count || 0} trades
                  </p>
                </div>
                <Sparkline data={bot.equity_curve} up={up} />
                <div className="w-24 text-right">
                  <p className={`inline-flex items-center gap-1 text-sm font-semibold ${up ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {up ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                    {pct(bot.return_pct)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{money(bot.start_balance)} → {money(bot.final_value)}</p>
                  <p className="text-[10px] text-muted-foreground">DD {Number(bot.max_drawdown_pct || 0).toFixed(0)}%</p>
                </div>
                <button onClick={() => deleteBot(bot.id)} disabled={busy}
                  className="text-muted-foreground hover:text-destructive disabled:opacity-50" aria-label="Delete bot">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
