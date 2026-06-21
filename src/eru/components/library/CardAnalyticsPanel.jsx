import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Loader2, Trophy, TrendingUp, TrendingDown, Search, Sword, Filter } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line, CartesianGrid } from 'recharts';
import { base44 } from '@/eru/api/base44Client';

const MODE_OPTIONS = [
  { id: 'all',         label: 'All Modes' },
  { id: 'tournament',  label: 'Tournament' },
  { id: 'pvp_ladder',  label: 'PvP Ladder' },
  { id: 'ai_campaign', label: 'AI Campaign' },
  { id: 'jackie_ai',   label: 'Jackie AI' },
  { id: 'training',    label: 'Training' },
  { id: 'tutorial',    label: 'Tutorial' },
  { id: 'quick_match', label: 'Quick Match' },
];

const SORT_OPTIONS = [
  { id: 'winrate', label: 'Win rate' },
  { id: 'wins',    label: 'Most wins' },
  { id: 'plays',   label: 'Most played' },
];

/**
 * CardAnalyticsPanel
 * --------------------------------------------------------------------------
 * Personal card performance dashboard powered by CardUsageHistory.
 * Shows win/loss rates per card, mode breakdowns, top performers, and a
 * recent win-rate trend. RLS already scopes records to the current user, so
 * no email filtering needed.
 */
export default function CardAnalyticsPanel() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('all');
  const [sort, setSort] = useState('winrate');
  const [query, setQuery] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      // Pull a generous window so analytics cover historical play.
      const data = await base44.entities.CardUsageHistory.list('-created_date', 1000).catch(() => []);
      if (mounted) {
        setRows(data || []);
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const filtered = useMemo(
    () => (mode === 'all' ? rows : rows.filter((r) => r.mode === mode)),
    [rows, mode],
  );

  // Per-card aggregation
  const cardStats = useMemo(() => aggregateByCard(filtered), [filtered]);

  const sorted = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = q ? cardStats.filter((c) => c.name.toLowerCase().includes(q)) : cardStats;
    list = [...list];
    if (sort === 'winrate') list.sort((a, b) => b.winRate - a.winRate || b.plays - a.plays);
    if (sort === 'wins')    list.sort((a, b) => b.wins - a.wins);
    if (sort === 'plays')   list.sort((a, b) => b.plays - a.plays);
    return list;
  }, [cardStats, sort, query]);

  const summary = useMemo(() => summarize(filtered), [filtered]);
  const topPerformers = useMemo(
    () => [...cardStats]
      .filter((c) => c.plays >= 3)
      .sort((a, b) => b.winRate - a.winRate || b.plays - a.plays)
      .slice(0, 8),
    [cardStats],
  );
  const winRateTrend = useMemo(() => buildTrend(filtered), [filtered]);
  const modeBreakdown = useMemo(() => buildModeBreakdown(rows), [rows]);

  if (loading) {
    return (
      <div className="h-40 flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-primary animate-spin" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-secondary/10 p-8 text-center text-sm text-muted-foreground">
        <Sword className="w-6 h-6 mx-auto mb-2 opacity-40" />
        No battle data yet. Play a match in Card Arena to start tracking card performance.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Stat label="Battles" value={summary.battles} />
        <Stat label="Win rate" value={`${summary.winRate}%`} accent={summary.winRate >= 50 ? 'positive' : 'negative'} />
        <Stat label="Cards used" value={cardStats.length} />
        <Stat label="Best streak" value={summary.bestStreak} icon={Trophy} />
      </div>

      {/* Mode + Sort filters */}
      <div className="bg-card border border-border rounded-2xl p-3 space-y-3">
        <FilterGroup label="Mode" value={mode} onChange={setMode}
          options={MODE_OPTIONS.map((m) => ({ id: m.id, label: m.label }))} />
        <FilterGroup label="Sort by" value={sort} onChange={setSort}
          options={SORT_OPTIONS.map((s) => ({ id: s.id, label: s.label }))} />
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter cards by name…"
            className="w-full h-10 pl-9 pr-3 rounded-xl border border-border bg-background text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>

      {/* Top performers chart */}
      {topPerformers.length > 0 && (
        <ChartCard
          title="Top performers"
          subtitle="Win rate by card (min. 3 plays)"
          icon={Trophy}
        >
          <ResponsiveContainer width="100%" height={Math.max(180, topPerformers.length * 28)}>
            <BarChart data={topPerformers} layout="vertical" margin={{ top: 4, right: 12, bottom: 4, left: 4 }}>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 10, fill: 'hsl(var(--foreground))' }} />
              <Tooltip
                cursor={{ fill: 'hsl(var(--secondary))' }}
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }}
                formatter={(v, _k, ctx) => [`${v}% · ${ctx.payload.wins}W/${ctx.payload.losses}L`, 'Win rate']}
              />
              <Bar dataKey="winRate" radius={[0, 4, 4, 0]}>
                {topPerformers.map((entry, i) => (
                  <Cell key={i} fill={winRateColor(entry.winRate)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Win rate trend */}
      {winRateTrend.length > 1 && (
        <ChartCard
          title="Win rate trend"
          subtitle={mode === 'all' ? 'Last 20 matches' : `Last 20 ${MODE_OPTIONS.find((m) => m.id === mode)?.label || mode} matches`}
          icon={TrendingUp}
        >
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={winRateTrend} margin={{ top: 8, right: 12, bottom: 4, left: -10 }}>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
              <XAxis dataKey="idx" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }}
                formatter={(v) => [`${v}%`, 'Rolling win rate']}
              />
              <Line type="monotone" dataKey="winRate" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Mode breakdown */}
      {modeBreakdown.length > 0 && (
        <ChartCard
          title="Performance by mode"
          subtitle="Across all cards"
          icon={BarChart3}
        >
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={modeBreakdown} margin={{ top: 4, right: 12, bottom: 4, left: -10 }}>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} interval={0} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip
                cursor={{ fill: 'hsl(var(--secondary))' }}
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }}
                formatter={(v, _k, ctx) => [`${v}% · ${ctx.payload.wins}W/${ctx.payload.losses}L`, 'Win rate']}
              />
              <Bar dataKey="winRate" radius={[4, 4, 0, 0]}>
                {modeBreakdown.map((entry, i) => (
                  <Cell key={i} fill={winRateColor(entry.winRate)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Card list */}
      <div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground px-1 mb-2">
          <Filter className="w-3 h-3" />
          <span>{sorted.length} card{sorted.length === 1 ? '' : 's'} tracked</span>
        </div>
        {sorted.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-secondary/10 p-6 text-center text-xs text-muted-foreground">
            No cards match your filters.
          </div>
        ) : (
          <div className="space-y-1.5">
            {sorted.map((c) => (
              <CardStatRow key={c.name} card={c} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────
function Stat({ label, value, accent, icon: Icon }) {
  const tone =
    accent === 'positive' ? 'text-emerald-400' :
    accent === 'negative' ? 'text-red-400' : 'text-foreground';
  return (
    <div className="bg-card border border-border rounded-xl p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
        {Icon && <Icon className="w-3 h-3" />} {label}
      </p>
      <p className={`text-lg font-semibold mt-0.5 ${tone}`}>{value}</p>
    </div>
  );
}

function ChartCard({ title, subtitle, icon: Icon, children }) {
  return (
    <section className="bg-card border border-border rounded-2xl p-3">
      <div className="flex items-center gap-2 mb-2">
        {Icon && <Icon className="w-3.5 h-3.5 text-primary" />}
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {subtitle && <span className="text-[11px] text-muted-foreground">· {subtitle}</span>}
      </div>
      {children}
    </section>
  );
}

function CardStatRow({ card }) {
  const trendIcon = card.winRate >= 50 ? TrendingUp : TrendingDown;
  const Trend = trendIcon;
  const trendColor = card.winRate >= 50 ? 'text-emerald-400' : 'text-red-400';
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2.5">
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{card.name}</p>
          <p className="text-[10px] text-muted-foreground">
            {card.plays} play{card.plays === 1 ? '' : 's'} · {card.wins}W / {card.losses}L
          </p>
        </div>
        <div className={`text-sm font-semibold inline-flex items-center gap-1 ${trendColor}`}>
          <Trend className="w-3.5 h-3.5" />
          {card.winRate}%
        </div>
      </div>
      <div className="mt-1.5 h-1.5 rounded-full bg-secondary overflow-hidden">
        <div
          className="h-full transition-all"
          style={{ width: `${card.winRate}%`, background: winRateColor(card.winRate) }}
        />
      </div>
    </div>
  );
}

function FilterGroup({ label, value, onChange, options }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-1.5">{label}</p>
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {options.map((opt) => (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-medium border whitespace-nowrap transition-colors ${
              value === opt.id
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-secondary border-border text-muted-foreground hover:border-primary/30'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Pure aggregation helpers ────────────────────────────────────────────────
function aggregateByCard(rows) {
  const map = new Map();
  rows.forEach((r) => {
    const name = r.card_name;
    if (!name) return;
    if (!map.has(name)) map.set(name, { name, wins: 0, losses: 0 });
    const slot = map.get(name);
    if (r.result === 'win') slot.wins += 1;
    else if (r.result === 'loss') slot.losses += 1;
  });
  return Array.from(map.values()).map((s) => ({
    ...s,
    plays: s.wins + s.losses,
    winRate: pct(s.wins, s.wins + s.losses),
  }));
}

function summarize(rows) {
  // CardUsageHistory has one row per card-per-battle, so we de-dup by battle_history_id
  // (or fall back to a synthetic key) to count actual battles, not card-events.
  const battleResults = new Map();
  rows.forEach((r) => {
    const key = r.battle_history_id || `${r.created_date}-${r.opponent_name}-${r.mode}`;
    if (!battleResults.has(key)) battleResults.set(key, r.result);
  });
  let wins = 0, losses = 0;
  battleResults.forEach((res) => { if (res === 'win') wins += 1; else if (res === 'loss') losses += 1; });
  // Best win streak — iterate by created_date ascending.
  const ordered = Array.from(battleResults.entries()).reverse(); // rows came -created_date, so reverse to get asc
  let streak = 0, best = 0;
  ordered.forEach(([, res]) => {
    if (res === 'win') { streak += 1; if (streak > best) best = streak; }
    else streak = 0;
  });
  return {
    battles: wins + losses,
    winRate: pct(wins, wins + losses),
    bestStreak: best,
  };
}

function buildTrend(rows) {
  const battleResults = new Map();
  rows.forEach((r) => {
    const key = r.battle_history_id || `${r.created_date}-${r.opponent_name}-${r.mode}`;
    if (!battleResults.has(key)) battleResults.set(key, { result: r.result, date: r.created_date });
  });
  // Reverse to chronological order, take last 20.
  const chronological = Array.from(battleResults.values()).reverse().slice(-20);
  // Rolling win-rate (cumulative across the window).
  let wins = 0;
  return chronological.map((b, i) => {
    if (b.result === 'win') wins += 1;
    return { idx: i + 1, winRate: pct(wins, i + 1) };
  });
}

function buildModeBreakdown(rows) {
  const map = new Map();
  rows.forEach((r) => {
    const key = r.battle_history_id || `${r.created_date}-${r.opponent_name}-${r.mode}`;
    if (!map.has(r.mode)) map.set(r.mode, { mode: r.mode, seen: new Set(), wins: 0, losses: 0 });
    const slot = map.get(r.mode);
    if (slot.seen.has(key)) return;
    slot.seen.add(key);
    if (r.result === 'win') slot.wins += 1;
    else if (r.result === 'loss') slot.losses += 1;
  });
  return Array.from(map.values())
    .map((s) => ({
      mode: s.mode,
      label: MODE_OPTIONS.find((o) => o.id === s.mode)?.label || s.mode,
      wins: s.wins,
      losses: s.losses,
      winRate: pct(s.wins, s.wins + s.losses),
    }))
    .filter((m) => m.wins + m.losses > 0)
    .sort((a, b) => (b.wins + b.losses) - (a.wins + a.losses));
}

function pct(n, d) {
  if (!d) return 0;
  return Math.round((n / d) * 100);
}

function winRateColor(rate) {
  if (rate >= 70) return 'hsl(160 100% 45%)'; // strong green
  if (rate >= 50) return 'hsl(160 80% 50%)';  // green
  if (rate >= 35) return 'hsl(45 100% 55%)';  // gold
  return 'hsl(350 100% 60%)';                 // red
}