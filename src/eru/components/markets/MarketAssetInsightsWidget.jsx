import { useEffect, useMemo, useState } from 'react';
import { Radio, Sparkles, Loader2, Layers } from 'lucide-react';
import { base44 } from '@/eru/api/base44Client';

/**
 * MarketAssetInsightsWidget
 * ----------------------------------------------------------------------------
 * Compact in-Markets visual dashboard for asset-related insights:
 *   - Top extraction zones (origins) ranked by surfaced asset count
 *   - Rarity trend bars across the user's recent cards
 *
 * Pure read-only — pulls scoped data via existing entities. Mobile-first,
 * fits naturally inside the Markets page rhythm (rounded card, dense type,
 * small charts). No external chart deps; uses lightweight CSS bars to keep
 * the page fast.
 *
 * Props:
 *   limit  number   Cards to scan for rarity trends. Default 200.
 */
const RARITY_ORDER = ['common', 'rare', 'epic', 'legendary', 'mythic'];
const RARITY_COLORS = {
  common: 'bg-slate-400',
  rare: 'bg-blue-400',
  epic: 'bg-purple-400',
  legendary: 'bg-yellow-400',
  mythic: 'bg-pink-400',
};
const RARITY_LABELS = {
  common: 'Common',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
  mythic: 'Mythic',
};

export default function MarketAssetInsightsWidget({ limit = 200 }) {
  const [events, setEvents] = useState([]);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      const [ev, cd] = await Promise.all([
        base44.entities.ExcavationEvent.list('-created_date', limit).catch(() => []),
        base44.entities.Card.list('-created_date', limit).catch(() => []),
      ]);
      if (!mounted) return;
      setEvents(ev || []);
      setCards(cd || []);
      setLoading(false);
    };
    load();
    return () => { mounted = false; };
  }, [limit]);

  const { topZones, rarityCounts, totalAssets, totalEvents } = useMemo(() => {
    const zones = new Map();
    let assetCount = 0;
    events.forEach((ev) => {
      if (!ev?.origin) return;
      const surfaced = (ev.card_ids || []).length || (ev.cards_surfaced_snapshot || []).length || 0;
      const cur = zones.get(ev.origin) || { origin: ev.origin, events: 0, surfaced: 0 };
      cur.events += 1;
      cur.surfaced += surfaced;
      assetCount += surfaced;
      zones.set(ev.origin, cur);
    });
    const ranked = Array.from(zones.values())
      .sort((a, b) => b.surfaced - a.surfaced || b.events - a.events)
      .slice(0, 5);

    const counts = Object.fromEntries(RARITY_ORDER.map((k) => [k, 0]));
    cards.forEach((c) => {
      if (c?.rarity && counts[c.rarity] !== undefined) counts[c.rarity] += 1;
    });

    return {
      topZones: ranked,
      rarityCounts: counts,
      totalAssets: assetCount,
      totalEvents: events.length,
    };
  }, [events, cards]);

  const rarityTotal = Object.values(rarityCounts).reduce((a, b) => a + b, 0);
  const zoneMax = topZones[0]?.surfaced || 1;

  return (
    <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground inline-flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" /> Asset insights
          </h3>
          <p className="text-xs text-muted-foreground mt-1">Top extraction zones and rarity trends from recent assets.</p>
        </div>
        <span className="rounded-full bg-primary/10 border border-primary/20 px-2.5 py-1 text-[11px] font-semibold text-primary whitespace-nowrap">
          Live
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Stat label="Events" value={totalEvents} />
        <Stat label="Surfaced" value={totalAssets} accent="text-primary" />
        <Stat label="Cards scanned" value={rarityTotal} />
      </div>

      {/* Top extraction zones */}
      <div className="space-y-2">
        <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground inline-flex items-center gap-1.5">
          <Radio className="w-3 h-3" /> Top extraction zones
        </p>
        {loading ? (
          <div className="h-24 flex items-center justify-center">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        ) : topZones.length === 0 ? (
          <p className="text-[11px] text-muted-foreground py-3 text-center">No excavation activity yet.</p>
        ) : (
          <div className="space-y-1.5">
            {topZones.map((z, i) => {
              const pct = Math.max(6, Math.round((z.surfaced / zoneMax) * 100));
              return (
                <div key={z.origin} className="rounded-xl border border-border bg-secondary/20 px-3 py-2">
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">
                      <span className="text-muted-foreground mr-1.5">#{i + 1}</span>{z.origin}
                    </p>
                    <span className="text-[11px] font-mono text-primary shrink-0">{z.surfaced} assets</span>
                  </div>
                  <div className="mt-1.5 h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">{z.events} event{z.events === 1 ? '' : 's'}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Rarity trend */}
      <div className="space-y-2">
        <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground inline-flex items-center gap-1.5">
          <Layers className="w-3 h-3" /> Rarity trend
        </p>
        {loading ? (
          <div className="h-24 flex items-center justify-center">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        ) : rarityTotal === 0 ? (
          <p className="text-[11px] text-muted-foreground py-3 text-center">No cards yet — surface some from the Excavation Events.</p>
        ) : (
          <>
            {/* Stacked share bar */}
            <div className="h-2.5 rounded-full overflow-hidden flex bg-secondary">
              {RARITY_ORDER.map((key) => {
                const v = rarityCounts[key];
                if (!v) return null;
                const pct = (v / rarityTotal) * 100;
                return (
                  <div
                    key={key}
                    className={`${RARITY_COLORS[key]} h-full`}
                    style={{ width: `${pct}%` }}
                    title={`${RARITY_LABELS[key]}: ${v}`}
                  />
                );
              })}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 pt-1">
              {RARITY_ORDER.map((key) => {
                const v = rarityCounts[key];
                const pct = rarityTotal ? Math.round((v / rarityTotal) * 100) : 0;
                return (
                  <div key={key} className="rounded-lg border border-border bg-secondary/20 px-2 py-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={`w-2 h-2 rounded-full ${RARITY_COLORS[key]} shrink-0`} />
                      <span className="text-[10px] text-muted-foreground truncate">{RARITY_LABELS[key]}</span>
                    </div>
                    <p className="text-xs font-semibold text-foreground mt-0.5">{v} <span className="text-[10px] text-muted-foreground font-normal">· {pct}%</span></p>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, accent = 'text-foreground' }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/20 px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className={`text-base font-semibold ${accent}`}>{value}</p>
    </div>
  );
}