// ----------------------------------------------------------------------------
// Card Leveling
// ----------------------------------------------------------------------------
// Players invest gold OR duplicate copies of a card to raise its level (1-10).
// Each level grants +1 power and +1 guard on top of the card's base stats.
// All math is pure — `runLevelUp` orchestrates the I/O against base44.
// ----------------------------------------------------------------------------
import { base44 } from '@/eru/api/base44Client';

export const MAX_LEVEL = 10;
export const POWER_PER_LEVEL = 1;
export const GUARD_PER_LEVEL = 1;

// Rarity-tier multiplier for gold cost. Higher rarities cost more gold to level.
const RARITY_GOLD_MULT = { common: 1, rare: 1.6, epic: 2.4, legendary: 3.5, mythic: 5 };
// Duplicate count required scales modestly with level (and uses 1 copy minimum).
const DUPLICATE_BASE = 1;

export function nextLevel(card) {
  const lvl = Math.max(1, Math.min(MAX_LEVEL, Number(card?.level || 1)));
  return lvl >= MAX_LEVEL ? null : lvl + 1;
}

export function isMaxLevel(card) {
  return Number(card?.level || 1) >= MAX_LEVEL;
}

/**
 * Gold cost for the NEXT level-up. Quadratic-ish curve so late levels feel meaningful.
 * Level 1→2 of a common = ~50g, level 9→10 of a legendary = ~1750g.
 */
export function goldCostForNext(card) {
  const target = nextLevel(card);
  if (!target) return null;
  const mult = RARITY_GOLD_MULT[card?.rarity] || 1;
  return Math.round(50 * target * mult);
}

/**
 * Number of duplicate copies required for the NEXT level. Cheap at low levels,
 * scales linearly afterwards.
 */
export function duplicatesForNext(card) {
  const target = nextLevel(card);
  if (!target) return null;
  return DUPLICATE_BASE + Math.floor((target - 1) / 2); // 1, 1, 2, 2, 3, 3, 4, 4, 5
}

/** Returns the bonus stats granted by leveling alone. */
export function levelBonus(level) {
  const lvl = Math.max(1, Math.min(MAX_LEVEL, Number(level || 1)));
  return {
    power: (lvl - 1) * POWER_PER_LEVEL,
    guard: (lvl - 1) * GUARD_PER_LEVEL,
  };
}

/**
 * Ensures a card has base_power / base_guard stamped (back-compat for cards
 * created before leveling existed). Returns the resolved values.
 */
export function resolveBaseStats(card) {
  const basePower = Number.isFinite(card?.base_power) ? card.base_power : Number(card?.power || 0);
  const baseGuard = Number.isFinite(card?.base_guard) ? card.base_guard : Number(card?.guard || 0);
  return { basePower, baseGuard };
}

/** Compute current power/guard given base + level. Pure. */
export function computeStatsForLevel(card, level) {
  const { basePower, baseGuard } = resolveBaseStats(card);
  const bonus = levelBonus(level);
  return {
    power: basePower + bonus.power,
    guard: baseGuard + bonus.guard,
  };
}

/**
 * Find duplicate cards (same name, same rarity) eligible to be consumed.
 * The card being leveled is excluded.
 */
export function findDuplicateCandidates(card, ownedCards = []) {
  if (!card?.id || !card.name) return [];
  return ownedCards.filter(
    (c) => c?.id && c.id !== card.id && c.name === card.name && c.rarity === card.rarity,
  );
}

/**
 * Run a level-up.
 *  - method='gold'      → gold is debited via the supplied debiter callback.
 *  - method='duplicate' → consumes N duplicate cards (deletes them).
 *
 * Caller is responsible for providing the up-to-date gold balance and a debit
 * callback (so this lib stays I/O-light and reuses the existing economy API).
 *
 * Returns `{ ok, card, error, newLevel, goldSpent, consumedIds }`.
 */
export async function runLevelUp(card, options) {
  const { method, gold = 0, debitGold, ownedCards = [] } = options || {};
  if (!card?.id) return { ok: false, error: 'Card not found.' };
  if (isMaxLevel(card)) return { ok: false, error: 'Already at max level.' };
  const target = nextLevel(card);

  let goldSpent = 0;
  let consumedIds = [];

  if (method === 'gold') {
    const cost = goldCostForNext(card);
    if (!cost) return { ok: false, error: 'No upgrade available.' };
    if (gold < cost) return { ok: false, error: 'Not enough gold.' };
    if (typeof debitGold !== 'function') return { ok: false, error: 'Gold debit unavailable.' };
    try {
      await debitGold(cost, `Leveled up ${card.name} to L${target}`);
      goldSpent = cost;
    } catch (err) {
      return { ok: false, error: 'Gold transaction failed.' };
    }
  } else if (method === 'duplicate') {
    const need = duplicatesForNext(card);
    const candidates = findDuplicateCandidates(card, ownedCards).slice(0, need);
    if (candidates.length < need) {
      return { ok: false, error: `Need ${need} duplicate copy${need === 1 ? '' : 'ies'}.` };
    }
    consumedIds = candidates.map((c) => c.id);
    await Promise.all(consumedIds.map((id) => base44.entities.Card.delete(id).catch(() => null)));
  } else {
    return { ok: false, error: 'Unknown level-up method.' };
  }

  // Apply stat changes against the resolved base stats so leveling is idempotent.
  const { basePower, baseGuard } = resolveBaseStats(card);
  const newStats = computeStatsForLevel({ ...card, base_power: basePower, base_guard: baseGuard }, target);

  const historyEntry = {
    level: target,
    method,
    cost: method === 'gold' ? goldSpent : consumedIds.length,
    consumed_card_ids: consumedIds,
    timestamp: new Date().toISOString(),
  };

  await base44.entities.Card.update(card.id, {
    level: target,
    base_power: basePower,
    base_guard: baseGuard,
    power: newStats.power,
    guard: newStats.guard,
    level_history: [...(card.level_history || []), historyEntry],
  });

  return {
    ok: true,
    card: { ...card, level: target, base_power: basePower, base_guard: baseGuard, power: newStats.power, guard: newStats.guard, level_history: [...(card.level_history || []), historyEntry] },
    newLevel: target,
    goldSpent,
    consumedIds,
  };
}