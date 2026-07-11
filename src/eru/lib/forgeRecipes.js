// ----------------------------------------------------------------------------
// Forge Recipes
// ----------------------------------------------------------------------------
// Strategic, deterministic crafting recipes that go beyond random transmutation.
// Each recipe defines:
//   - id            : stable identifier
//   - name / desc   : display copy
//   - inputs        : array of slot requirements { count, rarity?, element?, faction?, ability? }
//   - reward        : a deterministic reward seed (a starter card template) granted as the
//                     forged card. Lore source = 'origin' (forged).
//
// Recipes consume cards (best-effort delete) and create the reward via
// createCardWithLore so provenance + history stay consistent.
// ----------------------------------------------------------------------------
import { base44 } from '@/eru/api/base44Client';
import { STARTER_CARDS } from '@/eru/components/cards/StarterCards';
import { createCardWithLore } from '@/eru/lib/cardLore';

const findSeed = (predicate) => STARTER_CARDS.find(predicate);

/**
 * Recipe definitions. Each `inputs` slot must be matched by a DISTINCT card
 * from the player's collection (no card is used twice in one craft).
 * Reward seeds are picked from STARTER_CARDS so the catalogue stays consistent
 * with the rest of the lore/economy.
 */
export const FORGE_RECIPES = [
  {
    id: 'inferno_pact',
    name: 'Inferno Pact',
    description: 'Bind 3 Fire cards (any rarity ≥ rare) to forge an Ashborn Titan.',
    rewardLabel: 'Ashborn Titan · Legendary',
    inputs: [
      { count: 3, element: 'fire', minRarity: 'rare', label: '3 Fire (Rare+)' },
    ],
    rewardSeed: () => findSeed((c) => c.name === 'Ashborn Titan'),
  },
  {
    id: 'tidal_oracle',
    name: 'Tidal Oracle Rite',
    description: 'Combine a Coral Defender, a Storm Leviathan, and any Light card to summon the Abyssal Oracle.',
    rewardLabel: 'Abyssal Oracle · Legendary',
    inputs: [
      { count: 1, name: 'Coral Defender', label: 'Coral Defender' },
      { count: 1, name: 'Storm Leviathan', label: 'Storm Leviathan' },
      { count: 1, element: 'light', label: 'Any Light card' },
    ],
    rewardSeed: () => findSeed((c) => c.name === 'Abyssal Oracle'),
  },
  {
    id: 'world_shaper_ritual',
    name: "World Shaper's Ritual",
    description: 'Sacrifice 2 Earth Epic cards + 1 Earth Rare to ascend a World Shaper.',
    rewardLabel: 'World Shaper · Legendary',
    inputs: [
      { count: 2, element: 'earth', rarity: 'epic', label: '2 Earth Epic' },
      { count: 1, element: 'earth', rarity: 'rare', label: '1 Earth Rare' },
    ],
    rewardSeed: () => findSeed((c) => c.name === 'World Shaper'),
  },
  {
    id: 'tempest_ascension',
    name: 'Tempest Ascension',
    description: 'Channel 4 Wind cards (any rarity) into a Tempest Lord.',
    rewardLabel: 'Tempest Lord · Legendary',
    inputs: [
      { count: 4, element: 'wind', label: '4 Wind cards' },
    ],
    rewardSeed: () => findSeed((c) => c.name === 'Tempest Lord'),
  },
  {
    id: 'shadow_sovereign',
    name: 'Shadow Sovereign Pact',
    description: '3 Shadow cards including at least 1 Epic forge a Darkness Sovereign.',
    rewardLabel: 'Darkness Sovereign · Legendary',
    inputs: [
      { count: 1, element: 'shadow', minRarity: 'epic', label: '1 Shadow Epic+' },
      { count: 2, element: 'shadow', label: '2 Shadow (any)' },
    ],
    rewardSeed: () => findSeed((c) => c.name === 'Darkness Sovereign'),
  },
  {
    id: 'celestial_arbiter_rite',
    name: 'Celestial Arbiter Rite',
    description: 'A Sacred Knight + a Radiant Seraph + 1 Heal-ability card crowns the Celestial Arbiter.',
    rewardLabel: 'Celestial Arbiter · Legendary',
    inputs: [
      { count: 1, name: 'Sacred Knight', label: 'Sacred Knight' },
      { count: 1, name: 'Radiant Seraph', label: 'Radiant Seraph' },
      { count: 1, ability: 'heal', label: 'Any Heal card' },
    ],
    rewardSeed: () => findSeed((c) => c.name === 'Celestial Arbiter'),
  },
];

// Rarity ladder reused for "minRarity" gating (kept local to avoid extra imports).
const RARITY_RANK = { common: 1, rare: 2, epic: 3, legendary: 4, mythic: 5 };

/**
 * Returns true if a candidate card matches a slot requirement.
 * Any of: name (exact), element, faction, rarity (exact), minRarity, ability.
 */
function cardMatchesSlot(card, slot) {
  if (!card) return false;
  if (slot.name && card.name !== slot.name) return false;
  if (slot.element && card.element !== slot.element) return false;
  if (slot.faction && card.faction !== slot.faction) return false;
  if (slot.rarity && card.rarity !== slot.rarity) return false;
  if (slot.minRarity) {
    const need = RARITY_RANK[slot.minRarity] || 0;
    const got = RARITY_RANK[card.rarity] || 0;
    if (got < need) return false;
  }
  if (slot.ability && card.ability !== slot.ability) return false;
  return true;
}

/**
 * Greedy slot allocator: walks the slots in order and assigns distinct cards
 * from `available` that satisfy each. Stricter slots first improves match
 * rate; we sort slots by specificity (more constraints → earlier).
 */
function allocateSlots(recipe, ownedCards) {
  const pool = ownedCards.filter((c) => c?.id).slice();
  const usedIds = new Set();

  // Sort slots by specificity (more constraints first) for better packing.
  const sortedSlots = [...recipe.inputs].sort((a, b) => Object.keys(b).length - Object.keys(a).length);

  const assignments = [];
  for (const slot of sortedSlots) {
    const matched = [];
    for (const card of pool) {
      if (matched.length >= slot.count) break;
      if (usedIds.has(card.id)) continue;
      if (cardMatchesSlot(card, slot)) {
        matched.push(card);
        usedIds.add(card.id);
      }
    }
    assignments.push({ slot, matched, satisfied: matched.length >= slot.count });
  }
  return assignments;
}

/**
 * Returns a UI-ready status object for a recipe given the player's cards:
 *   { recipe, slots: [{ slot, have, need, satisfied, candidates }], ready, consumed }
 */
export function evaluateRecipe(recipe, ownedCards) {
  const assignments = allocateSlots(recipe, ownedCards);
  const slots = assignments.map(({ slot, matched }) => ({
    slot,
    label: slot.label,
    have: matched.length,
    need: slot.count,
    satisfied: matched.length >= slot.count,
    candidates: matched.slice(0, slot.count),
  }));
  const ready = slots.every((s) => s.satisfied);
  const consumed = slots.flatMap((s) => s.candidates);
  return { recipe, slots, ready, consumed };
}

/**
 * Run a recipe craft:
 *  1. Re-evaluate against the latest cards (defensive).
 *  2. Create the reward card via createCardWithLore.
 *  3. Stamp recipe provenance on the new card.
 *  4. Best-effort delete consumed cards.
 *
 * Returns `{ ok, card, error, recipe }`.
 */
export async function runRecipeCraft(recipe, ownedCards) {
  const evalResult = evaluateRecipe(recipe, ownedCards);
  if (!evalResult.ready) return { ok: false, error: 'Missing required cards.', recipe };

  const seed = recipe.rewardSeed();
  if (!seed) return { ok: false, error: 'Recipe reward unavailable.', recipe };

  const consumedIds = evalResult.consumed.map((c) => c.id).filter(Boolean);
  const consumedNames = evalResult.consumed.map((c) => c.name);

  const created = await createCardWithLore(seed, {
    source: 'origin',
    summary: `Crafted via recipe: ${recipe.name}.`,
    actor: 'forge_recipe',
    metadata: {
      recipe_id: recipe.id,
      recipe_name: recipe.name,
      consumed_card_ids: consumedIds,
      consumed_card_names: consumedNames,
    },
  });
  if (!created) return { ok: false, error: 'Failed to forge recipe reward.', recipe };

  // Stamp provenance — reuse `is_transmuted` + `transmuted_from_card_ids` so
  // existing UI badges that detect forged cards keep working.
  await base44.entities.Card.update(created.id, {
    is_transmuted: true,
    transmuted_from_card_ids: consumedIds,
  }).catch(() => null);

  await Promise.all(consumedIds.map((id) => base44.entities.Card.delete(id).catch(() => null)));

  return { ok: true, card: { ...created, is_transmuted: true, transmuted_from_card_ids: consumedIds }, recipe };
}