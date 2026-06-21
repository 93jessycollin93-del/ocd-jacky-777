// ----------------------------------------------------------------------------
// Transmutation
// ----------------------------------------------------------------------------
// Burn 7 duplicate cards of the same rarity → receive 1 random card of the
// next higher rarity. Pure helpers + a single orchestrator (`runTransmutation`).
//
// Rules (kept simple, extensible):
//  - Inputs MUST share the same rarity.
//  - Inputs MUST NOT include the highest tier ('mythic') — nothing above it.
//  - Exactly TRANSMUTE_COUNT (7) cards are consumed.
//  - The reward pool is drawn from STARTER_CARDS at the next rarity, biased
//    toward the dominant element among the burned cards. Falls back to a
//    cross-element pool if no match.
//  - The new card is created via createCardWithLore() so lore + history is
//    consistent with every other card source. The burned cards are deleted
//    (or quantity-decremented if quantity > 1 in the future — kept simple now).
// ----------------------------------------------------------------------------
import { base44 } from '@/eru/api/base44Client';
import { STARTER_CARDS, RARITY_STYLES } from '@/eru/components/cards/StarterCards';
import { createCardWithLore } from '@/eru/lib/cardLore';

export const TRANSMUTE_COUNT = 7;

export const RARITY_LADDER = ['common', 'rare', 'epic', 'legendary', 'mythic'];

export function nextRarity(rarity) {
  const i = RARITY_LADDER.indexOf(rarity);
  if (i < 0 || i >= RARITY_LADDER.length - 1) return null;
  return RARITY_LADDER[i + 1];
}

export function isTransmutable(rarity) {
  return nextRarity(rarity) !== null;
}

/**
 * Group a player's collection by `${rarity}::${name}` so we can find true
 * duplicates (same card, same rarity). Returns an array sorted by group size
 * descending to make discovery easy in the UI.
 */
export function groupDuplicates(cards = []) {
  const map = new Map();
  cards.forEach((c) => {
    if (!c?.id || !c.rarity || !c.name) return;
    if (!isTransmutable(c.rarity)) return; // mythic excluded
    const key = `${c.rarity}::${c.name.toLowerCase()}`;
    if (!map.has(key)) {
      map.set(key, { name: c.name, rarity: c.rarity, element: c.element, faction: c.faction, cards: [] });
    }
    map.get(key).cards.push(c);
  });
  return Array.from(map.values())
    .filter((g) => g.cards.length >= 2)
    .sort((a, b) => b.cards.length - a.cards.length);
}

/**
 * Available rarities the player can transmute right now (≥7 duplicates of
 * any single card at that rarity OR ≥7 cards of that rarity total — we pick
 * the inclusive rule: the player just needs 7 of the same rarity, since
 * "duplicates of the same rarity" is the design.
 */
export function transmutableRarities(cards = []) {
  const counts = new Map();
  cards.forEach((c) => {
    if (!c?.rarity || !isTransmutable(c.rarity)) return;
    counts.set(c.rarity, (counts.get(c.rarity) || 0) + 1);
  });
  return RARITY_LADDER
    .filter((r) => isTransmutable(r))
    .map((r) => ({ rarity: r, count: counts.get(r) || 0, ready: (counts.get(r) || 0) >= TRANSMUTE_COUNT, label: RARITY_STYLES[r]?.label || r }));
}

/**
 * Pick a reward card from STARTER_CARDS at the target rarity, biased toward
 * the dominant element among the burned cards. Pure — no I/O.
 */
export function pickRewardSeed(burnedCards, targetRarity) {
  // Element bias: pick the most-represented element among the burned cards.
  const elementCounts = new Map();
  burnedCards.forEach((c) => {
    if (!c?.element) return;
    elementCounts.set(c.element, (elementCounts.get(c.element) || 0) + 1);
  });
  const dominantElement = Array.from(elementCounts.entries())
    .sort((a, b) => b[1] - a[1])[0]?.[0];

  const tierPool = STARTER_CARDS.filter((c) => c.rarity === targetRarity);
  const elementPool = dominantElement ? tierPool.filter((c) => c.element === dominantElement) : [];
  const pool = elementPool.length > 0 ? elementPool : tierPool;

  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Run the full transmutation flow:
 *  1. Validate inputs (count, same rarity, transmutable rarity).
 *  2. Pick a reward seed.
 *  3. Create the new card with lore + transmutation provenance.
 *  4. Delete the burned cards.
 *
 * Returns `{ ok, card, error }`. Caller is responsible for UI feedback.
 */
export async function runTransmutation(burnedCards) {
  if (!Array.isArray(burnedCards) || burnedCards.length !== TRANSMUTE_COUNT) {
    return { ok: false, error: `Select exactly ${TRANSMUTE_COUNT} cards.` };
  }
  const rarity = burnedCards[0]?.rarity;
  if (!rarity || !isTransmutable(rarity)) {
    return { ok: false, error: 'Selection has no valid upgrade tier.' };
  }
  if (!burnedCards.every((c) => c?.rarity === rarity)) {
    return { ok: false, error: 'All cards must share the same rarity.' };
  }
  const target = nextRarity(rarity);
  const seed = pickRewardSeed(burnedCards, target);
  if (!seed) return { ok: false, error: 'No reward card available for that tier.' };

  const burnedIds = burnedCards.map((c) => c.id).filter(Boolean);
  const created = await createCardWithLore(seed, {
    source: 'origin',
    summary: `Forged via transmutation from ${TRANSMUTE_COUNT} ${rarity} cards.`,
    actor: 'transmutation',
    metadata: {
      transmutation: true,
      source_rarity: rarity,
      target_rarity: target,
      burned_card_ids: burnedIds,
      burned_card_names: burnedCards.map((c) => c.name),
    },
  });
  if (!created) return { ok: false, error: 'Failed to forge new card.' };

  // Stamp provenance fields on the freshly-created card.
  await base44.entities.Card.update(created.id, {
    is_transmuted: true,
    transmuted_from_card_ids: burnedIds,
  }).catch(() => null);

  // Delete burned cards (best-effort; failures don't block the reward).
  await Promise.all(burnedIds.map((id) => base44.entities.Card.delete(id).catch(() => null)));

  return { ok: true, card: { ...created, is_transmuted: true, transmuted_from_card_ids: burnedIds }, sourceRarity: rarity, targetRarity: target };
}