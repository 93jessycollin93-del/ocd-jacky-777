import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pickaxe, Radio, Sparkles, Lock, X, Coins } from 'lucide-react';
import { base44 } from '@/eru/api/base44Client';
import { awardGold, fetchUserGold } from '@/eru/lib/economyApi';
import { EXCAVATION_PACKS, bumpPressure, isHighPowerCard, createCardWithLore } from '@/eru/lib/cardLore';
import { STARTER_CARDS, RARITY_STYLES } from './StarterCards';
import CardDisplay from './CardDisplay';
import CardLorePanel from './CardLorePanel';

/**
 * ExcavationPackPanel
 * ------------------------------------------------------------------
 * "Packs" reframed as Excavation Events. Each event has:
 *   - origin (signal source)
 *   - rarity bias (minimum rarity floor)
 *   - lore tag (narrative metadata stamped on every surfaced card)
 *
 * Mobile-first, dark cosmic, expandable. Spends the player's GOLD via the
 * existing economy API (awardGold with a negative amount when affordable).
 *
 * Props:
 *   gold          — current player gold
 *   onGoldChange  — (newGold) => void
 *   ownedCards    — current collection (for de-dupe / awareness)
 *   onCardsAdded  — (newCards[]) => void  (parent merges into state)
 */
const RARITY_RANK = ['common', 'rare', 'epic', 'legendary', 'mythic'];

function rollFromBias(bias) {
  const minIdx = Math.max(0, RARITY_RANK.indexOf(bias));
  const r = Math.random();
  // Weighted roll above the floor: 60% floor, 25% +1, 12% +2, 3% +3
  let bump = 0;
  if (r > 0.97) bump = 3;
  else if (r > 0.85) bump = 2;
  else if (r > 0.60) bump = 1;
  const idx = Math.min(RARITY_RANK.length - 1, minIdx + bump);
  return RARITY_RANK[idx];
}

function pickCardForRarity(rarity, ownedNames) {
  const exact = STARTER_CARDS.filter((c) => c.rarity === rarity);
  const fallback = STARTER_CARDS.filter((c) => RARITY_RANK.indexOf(c.rarity) >= RARITY_RANK.indexOf(rarity));
  const pool = exact.length ? exact : fallback;
  // Prefer not-yet-owned; fall back to any.
  const fresh = pool.filter((c) => !ownedNames.has(c.name));
  const picks = fresh.length ? fresh : pool;
  return picks[Math.floor(Math.random() * picks.length)];
}

export default function ExcavationPackPanel({ gold = 0, onGoldChange, ownedCards = [], onCardsAdded }) {
  const [openingPack, setOpeningPack] = useState(null);
  const [surfaced, setSurfaced] = useState(null); // { pack, cards: [...] }
  const [busy, setBusy] = useState(false);

  const ownedNames = new Set(ownedCards.map((c) => c.name));

  const startExcavation = async (pack) => {
    if (busy) return;
    if (gold < pack.cost_gold) return;
    setBusy(true);
    setOpeningPack(pack.id);

    try {
      // Charge gold via existing economy backend (pass negative amount).
      const newGold = await awardGold(-pack.cost_gold, `Excavation: ${pack.name}`, {
        excavation_pack: pack.id,
        origin: pack.origin,
        lore_tag: pack.lore_tag,
      }).catch(async () => {
        // Fall back to a fresh fetch if the spend endpoint rejects (treat as no-op refresh).
        return await fetchUserGold().catch(() => gold - pack.cost_gold);
      });
      if (typeof newGold === 'number') onGoldChange?.(newGold);

      // Roll N cards. Rarity bias enforces the floor.
      const rolls = Array.from({ length: pack.pulls }).map(() => {
        const rarity = rollFromBias(pack.rarity_bias);
        const seed = pickCardForRarity(rarity, ownedNames);
        return { ...seed, rarity };
      });

      // Persist each card via the centralized lore helper so every newly
      // minted card across the app gets the same lore guarantees.
      const created = [];
      for (const seed of rolls) {
        const saved = await createCardWithLore(seed, {
          source: 'pack',
          summary: `Surfaced from ${pack.name} (${pack.origin}).`,
          actor: 'excavation',
          origin: pack.origin,
          lore_tag: pack.lore_tag,
          metadata: { pack_id: pack.id, rarity_bias: pack.rarity_bias },
        });
        if (saved) created.push(saved);
      }

      // Create the ExcavationEvent record.
      const me = await base44.auth.me().catch(() => null);
      let stabilityDrift = 0;
      created.forEach((c) => { if (isHighPowerCard(c)) stabilityDrift += 3; });
      await base44.entities.ExcavationEvent.create({
        user_email: me?.email,
        pack_name: pack.name,
        origin: pack.origin,
        lore_tag: pack.lore_tag,
        rarity_bias: pack.rarity_bias,
        card_ids: created.map((c) => c.id),
        cards_surfaced_snapshot: created.map((c) => ({ id: c.id, name: c.name, rarity: c.rarity, element: c.element })),
        stability_drift: stabilityDrift,
      }).catch(() => null);

      // Bump pressure once, summarising the event.
      if (stabilityDrift > 0) {
        const updated = await bumpPressure({ amount: stabilityDrift, summary: `${pack.name} surfaced ${created.length} cards` });
        if (updated) window.dispatchEvent(new CustomEvent('reality-pressure-changed', { detail: updated }));
      }

      onCardsAdded?.(created);
      setSurfaced({ pack, cards: created });
    } finally {
      setBusy(false);
      setOpeningPack(null);
    }
  };

  return (
    <>
      <div className="space-y-3">
        <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-[#06070d] via-[#0a0d1a] to-[#06070d] p-4">
          <div className="flex items-center gap-2">
            <Pickaxe className="h-4 w-4 text-cyan-300" />
            <h3 className="text-sm font-semibold text-cyan-100">Excavation Events</h3>
          </div>
          <p className="mt-1 text-[11px] text-white/55">
            Dig sites with a known origin and rarity floor. Lore tags carry over to every card surfaced.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {EXCAVATION_PACKS.map((pack) => {
            const affordable = gold >= pack.cost_gold;
            const opening = openingPack === pack.id;
            const rarStyle = RARITY_STYLES[pack.rarity_bias];
            return (
              <div key={pack.id} className="relative overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_30%_-10%,rgba(120,80,255,0.18),transparent_60%),#06070d] p-4">
                <div className="pointer-events-none absolute inset-0 lore-distort-faint" aria-hidden="true" />
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-white/90">{pack.name}</p>
                    <span className={`text-[9px] uppercase tracking-[0.18em] ${rarStyle?.color || 'text-white/60'}`}>{pack.rarity_bias}+</span>
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-[11px] text-cyan-200/80">
                    <Radio className="h-3 w-3" /> {pack.origin}
                  </div>
                  <p className="mt-2 text-[11px] leading-snug text-white/55">{pack.description}</p>

                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-[11px] text-yellow-300">
                      <Coins className="h-3 w-3" /> {pack.cost_gold}
                    </div>
                    <button
                      type="button"
                      disabled={!affordable || busy}
                      onClick={() => startExcavation(pack)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                        affordable
                          ? 'bg-cyan-500/15 text-cyan-200 hover:bg-cyan-500/25 border border-cyan-400/30'
                          : 'bg-white/5 text-white/40 border border-white/10'
                      } ${opening ? 'opacity-60' : ''}`}
                    >
                      {affordable ? <Sparkles className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                      {opening ? 'Excavating…' : affordable ? 'Excavate' : 'Locked'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Surfaced results modal — also dark cosmic, with lore panels per card. */}
      <AnimatePresence>
        {surfaced && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setSurfaced(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 12 }}
              transition={{ duration: 0.22 }}
              className="relative w-full max-w-md overflow-hidden rounded-2xl border border-cyan-500/20 bg-[#06070d]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="pointer-events-none absolute inset-0 lore-distort-soft" aria-hidden="true" />
              <div className="relative max-h-[80vh] overflow-y-auto p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-300">{surfaced.pack.lore_tag.replace(/_/g, ' ')}</p>
                    <h4 className="text-base font-semibold text-white">{surfaced.pack.name}</h4>
                    <p className="mt-0.5 text-[11px] text-cyan-200/80">Origin · {surfaced.pack.origin}</p>
                  </div>
                  <button onClick={() => setSurfaced(null)} className="rounded-full p-1.5 text-white/60 hover:bg-white/5 hover:text-white">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {surfaced.cards.length === 0 ? (
                  <p className="text-[11px] text-white/55">Nothing surfaced. The signal collapsed.</p>
                ) : (
                  <div className="space-y-3">
                    {surfaced.cards.map((card) => (
                      <div key={card.id} className="flex gap-3">
                        <div className="flex-shrink-0">
                          <CardDisplay card={card} size="sm" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-white truncate">{card.name}</p>
                          <p className="text-[10px] text-white/50">{card.faction} · {card.rarity}</p>
                          <CardLorePanel card={card} compact />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}