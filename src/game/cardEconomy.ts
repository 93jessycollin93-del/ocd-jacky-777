// ═══════════════════════════════════════════════════════════════
// CARD COLLECTION ECONOMY — Full production system
// Sets, dust, crafting, pity, codex, seasonal, archive vault
// ═══════════════════════════════════════════════════════════════

import type { CardDef, CardRarity, CardElement } from './cardEngine';

// ── Set Categories ──
export type SetCategory = 'core' | 'expansion' | 'mini_set' | 'seasonal' | 'event' | 'promo' | 'legacy';

export interface CardSet {
  id: string;
  name: string;
  icon: string;
  category: SetCategory;
  description: string;
  releaseDate: number;
  expiresAt?: number;        // undefined = permanent
  totalCards: number;
  isActive: boolean;
  isArchived: boolean;       // moved to Legacy Forge
  craftable: boolean;        // can craft with dust
  archiveCraftMultiplier: number; // 1.0 = normal, 1.5 = archived premium
}

// ── Collection State ──
export interface OwnedCard {
  cardId: string;
  copies: number;
  foil: boolean;
  animated: boolean;
  firstObtained: number;
  source: 'pack' | 'craft' | 'reward' | 'event' | 'gift' | 'archive' | 'battle';
}

export interface CollectionState {
  ownedCards: OwnedCard[];
  dust: number;
  gems: number;
  eventTokens: number;
  archiveKeys: number;
  pityCounters: Record<string, number>; // bannerId → pulls since last epic+
  totalPacks: number;
  codexMilestones: string[];            // claimed milestone IDs
  wishlist: string[];                   // card IDs
  displayCards: string[];               // showcase card IDs (max 5)
  seasonPassTier: number;
  seasonPassPremium: boolean;
}

// ── Economy Constants ──
export const DUST_VALUES: Record<CardRarity, { disenchant: number; craft: number }> = {
  common:    { disenchant: 5,    craft: 40 },
  uncommon:  { disenchant: 10,   craft: 100 },
  rare:      { disenchant: 20,   craft: 200 },
  epic:      { disenchant: 100,  craft: 800 },
  legendary: { disenchant: 400,  craft: 1600 },
  mythic:    { disenchant: 800,  craft: 3200 },
};

export const PACK_COSTS = {
  standard: { gold: 100, gems: 0 },
  premium:  { gold: 0, gems: 100 },
  mythic:   { gold: 0, gems: 300 },
  event:    { gold: 0, gems: 0, eventTokens: 50 },
} as const;

export const PITY_THRESHOLDS: Record<string, { rarity: CardRarity; pulls: number }> = {
  standard: { rarity: 'rare', pulls: 10 },
  premium:  { rarity: 'epic', pulls: 20 },
  mythic:   { rarity: 'legendary', pulls: 30 },
};

export const DROP_RATES: Record<CardRarity, number> = {
  common: 0.45, uncommon: 0.25, rare: 0.15, epic: 0.09, legendary: 0.045, mythic: 0.015,
};

export const PREMIUM_DROP_RATES: Record<CardRarity, number> = {
  common: 0.00, uncommon: 0.10, rare: 0.40, epic: 0.30, legendary: 0.15, mythic: 0.05,
};

// ── Codex Milestones ──
export interface CodexMilestone {
  id: string;
  name: string;
  description: string;
  icon: string;
  requirement: { type: 'total_unique' | 'set_complete' | 'rarity_count' | 'element_complete'; value: number; setId?: string; rarity?: CardRarity; element?: CardElement };
  reward: { dust?: number; gems?: number; archiveKeys?: number; cardId?: string; title?: string };
}

export const CODEX_MILESTONES: CodexMilestone[] = [
  { id: 'cm01', name: 'First Steps', description: 'Own 5 unique cards', icon: '📖', requirement: { type: 'total_unique', value: 5 }, reward: { dust: 50 } },
  { id: 'cm02', name: 'Growing Collection', description: 'Own 15 unique cards', icon: '📚', requirement: { type: 'total_unique', value: 15 }, reward: { dust: 150, gems: 20 } },
  { id: 'cm03', name: 'Card Scholar', description: 'Own 30 unique cards', icon: '🎓', requirement: { type: 'total_unique', value: 30 }, reward: { dust: 300, gems: 50 } },
  { id: 'cm04', name: 'Master Collector', description: 'Own 50 unique cards', icon: '👑', requirement: { type: 'total_unique', value: 50 }, reward: { dust: 500, gems: 100, title: 'Master Collector' } },
  { id: 'cm05', name: 'Ironclad Devotee', description: 'Own all Ironclad cards', icon: '🔴', requirement: { type: 'set_complete', value: 1, setId: 'core_ironclad' }, reward: { dust: 200, archiveKeys: 1 } },
  { id: 'cm06', name: 'Tideweaver Devotee', description: 'Own all Tideweaver cards', icon: '🔵', requirement: { type: 'set_complete', value: 1, setId: 'core_tideweavers' }, reward: { dust: 200, archiveKeys: 1 } },
  { id: 'cm07', name: 'Veilborn Devotee', description: 'Own all Veilborn cards', icon: '🟣', requirement: { type: 'set_complete', value: 1, setId: 'core_veilborn' }, reward: { dust: 200, archiveKeys: 1 } },
  { id: 'cm08', name: 'Legendary Hunter', description: 'Own 3 Legendary cards', icon: '⭐', requirement: { type: 'rarity_count', value: 3, rarity: 'legendary' }, reward: { gems: 100 } },
  { id: 'cm09', name: 'Mythic Ascension', description: 'Own 1 Mythic card', icon: '💎', requirement: { type: 'rarity_count', value: 1, rarity: 'mythic' }, reward: { gems: 200, title: 'Mythic Keeper' } },
  { id: 'cm10', name: 'Elemental Mastery', description: 'Own cards from all 6 elements', icon: '🌈', requirement: { type: 'element_complete', value: 6 }, reward: { dust: 300, archiveKeys: 2 } },
];

// ── Card Sets ──
export const CARD_SETS: CardSet[] = [
  { id: 'core', name: 'Core Set', icon: '⚔', category: 'core', description: 'Foundation cards — always available', releaseDate: Date.now(), totalCards: 24, isActive: true, isArchived: false, craftable: true, archiveCraftMultiplier: 1.0 },
  { id: 'exp01', name: 'Shattered Realms', icon: '🌋', category: 'expansion', description: 'First major expansion — new mechanics, new factions', releaseDate: Date.now() + 90 * 86400000, totalCards: 40, isActive: false, isArchived: false, craftable: true, archiveCraftMultiplier: 1.0 },
  { id: 'mini01', name: 'Echoes of Frost', icon: '❄️', category: 'mini_set', description: 'Mini-set — 15 cards focused on Frost synergy', releaseDate: Date.now() + 45 * 86400000, totalCards: 15, isActive: false, isArchived: false, craftable: true, archiveCraftMultiplier: 1.0 },
  { id: 'season01', name: 'Season of Embers', icon: '🔥', category: 'seasonal', description: 'Limited seasonal cards — gameplay cards return later via Archive', releaseDate: Date.now(), expiresAt: Date.now() + 60 * 86400000, totalCards: 10, isActive: true, isArchived: false, craftable: false, archiveCraftMultiplier: 1.5 },
  { id: 'event01', name: 'Eclipse Festival', icon: '🌑', category: 'event', description: 'Event-exclusive cards — earn through event tokens', releaseDate: Date.now(), expiresAt: Date.now() + 14 * 86400000, totalCards: 6, isActive: true, isArchived: false, craftable: false, archiveCraftMultiplier: 2.0 },
  { id: 'promo01', name: 'Founder\'s Legacy', icon: '🏛️', category: 'promo', description: 'Cosmetic variants for early adopters — NEVER returns', releaseDate: Date.now(), expiresAt: Date.now() + 30 * 86400000, totalCards: 3, isActive: true, isArchived: false, craftable: false, archiveCraftMultiplier: 0 },
];

// ── Pack Opening Logic ──

export function rollRarity(rates: Record<CardRarity, number>, pityCounter: number, pityThreshold: { rarity: CardRarity; pulls: number }): CardRarity {
  // Pity guarantee
  if (pityCounter >= pityThreshold.pulls) {
    return pityThreshold.rarity;
  }

  // Escalating luck: +1% epic chance per 5 pulls without epic+
  const boostedRates = { ...rates };
  const escalation = Math.floor(pityCounter / 5) * 0.01;
  boostedRates.epic = Math.min(0.25, boostedRates.epic + escalation);
  boostedRates.common = Math.max(0.20, boostedRates.common - escalation);

  const total = Object.values(boostedRates).reduce((s, v) => s + v, 0);
  let roll = Math.random() * total;

  const rarityOrder: CardRarity[] = ['mythic', 'legendary', 'epic', 'rare', 'uncommon', 'common'];
  for (const r of rarityOrder) {
    roll -= boostedRates[r];
    if (roll <= 0) return r;
  }
  return 'common';
}

export function selectCardFromPool(pool: CardDef[], rarity: CardRarity, owned: OwnedCard[]): CardDef {
  const candidates = pool.filter(c => c.rarity === rarity);
  if (candidates.length === 0) {
    // fallback to any card of lower rarity
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // Duplicate protection: prefer unowned cards (70% weight)
  const ownedIds = new Set(owned.map(o => o.cardId));
  const unowned = candidates.filter(c => !ownedIds.has(c.id));

  if (unowned.length > 0 && Math.random() < 0.7) {
    return unowned[Math.floor(Math.random() * unowned.length)];
  }

  return candidates[Math.floor(Math.random() * candidates.length)];
}

export interface PackResult {
  cards: CardDef[];
  pityReset: boolean;
  isNewCard: boolean[];
  dust: number; // auto-dust for excess copies
}

export function openPack(
  pool: CardDef[],
  owned: OwnedCard[],
  packType: 'standard' | 'premium' | 'mythic',
  pityCounter: number,
  cardsPerPack = 5,
): PackResult {
  const rates = packType === 'premium' ? PREMIUM_DROP_RATES : DROP_RATES;
  const pity = PITY_THRESHOLDS[packType];
  const cards: CardDef[] = [];
  const isNewCard: boolean[] = [];
  let dust = 0;
  let pityReset = false;
  const ownedIds = new Set(owned.map(o => o.cardId));

  for (let i = 0; i < cardsPerPack; i++) {
    const rarity = rollRarity(rates, pityCounter + i, pity);
    if (rarity === pity.rarity || ['epic', 'legendary', 'mythic'].includes(rarity)) {
      pityReset = true;
    }
    const card = selectCardFromPool(pool, rarity, owned);
    cards.push(card);

    const isNew = !ownedIds.has(card.id);
    isNewCard.push(isNew);

    if (!isNew) {
      // Auto-dust excess (3+ copies)
      const existing = owned.find(o => o.cardId === card.id);
      if (existing && existing.copies >= 2) {
        dust += DUST_VALUES[card.rarity].disenchant;
      }
    }
    ownedIds.add(card.id);
  }

  return { cards, pityReset, isNewCard, dust };
}

// ── Crafting ──

export function canCraft(rarity: CardRarity, dust: number, isArchived: boolean, archiveMultiplier: number): boolean {
  const cost = Math.round(DUST_VALUES[rarity].craft * (isArchived ? archiveMultiplier : 1));
  return dust >= cost;
}

export function craftCost(rarity: CardRarity, isArchived: boolean, archiveMultiplier: number): number {
  return Math.round(DUST_VALUES[rarity].craft * (isArchived ? archiveMultiplier : 1));
}

export function disenchantValue(rarity: CardRarity): number {
  return DUST_VALUES[rarity].disenchant;
}

// ── Collection Progress ──

export function collectionProgress(owned: OwnedCard[], totalCards: number): { owned: number; total: number; percent: number } {
  const uniqueOwned = owned.length;
  return { owned: uniqueOwned, total: totalCards, percent: totalCards > 0 ? Math.round((uniqueOwned / totalCards) * 100) : 0 };
}

export function checkMilestone(milestone: CodexMilestone, owned: OwnedCard[], allCards: CardDef[]): boolean {
  switch (milestone.requirement.type) {
    case 'total_unique':
      return owned.length >= milestone.requirement.value;
    case 'rarity_count': {
      const ownedIds = new Set(owned.map(o => o.cardId));
      const matching = allCards.filter(c => ownedIds.has(c.id) && c.rarity === milestone.requirement.rarity);
      return matching.length >= milestone.requirement.value;
    }
    case 'element_complete': {
      const ownedIds = new Set(owned.map(o => o.cardId));
      const elements = new Set(allCards.filter(c => ownedIds.has(c.id)).map(c => c.element));
      return elements.size >= milestone.requirement.value;
    }
    case 'set_complete': {
      const ownedIds = new Set(owned.map(o => o.cardId));
      const setCards = allCards.filter(c => c.faction === milestone.requirement.setId?.replace('core_', ''));
      return setCards.every(c => ownedIds.has(c.id));
    }
    default:
      return false;
  }
}

// ── Season Pass Rewards ──

export interface SeasonPassTier {
  tier: number;
  freeReward: { type: 'dust' | 'gems' | 'pack' | 'card' | 'cosmetic' | 'archiveKey'; value: number; label: string };
  premiumReward: { type: 'dust' | 'gems' | 'pack' | 'card' | 'cosmetic' | 'archiveKey' | 'animated' | 'title'; value: number; label: string };
  xpRequired: number;
}

export const SEASON_PASS: SeasonPassTier[] = Array.from({ length: 30 }, (_, i) => ({
  tier: i + 1,
  xpRequired: 100 + i * 25,
  freeReward: (() => {
    if ((i + 1) % 10 === 0) return { type: 'pack' as const, value: 1, label: 'Premium Pack' };
    if ((i + 1) % 5 === 0) return { type: 'gems' as const, value: 20, label: '20 Gems' };
    if ((i + 1) % 3 === 0) return { type: 'dust' as const, value: 50, label: '50 Dust' };
    return { type: 'dust' as const, value: 25, label: '25 Dust' };
  })(),
  premiumReward: (() => {
    if (i + 1 === 30) return { type: 'animated' as const, value: 1, label: 'Animated Legendary' };
    if (i + 1 === 25) return { type: 'title' as const, value: 1, label: 'Season Champion' };
    if ((i + 1) % 10 === 0) return { type: 'pack' as const, value: 2, label: '2 Mythic Packs' };
    if ((i + 1) % 5 === 0) return { type: 'gems' as const, value: 50, label: '50 Gems' };
    if ((i + 1) % 3 === 0) return { type: 'archiveKey' as const, value: 1, label: 'Archive Key' };
    return { type: 'dust' as const, value: 40, label: '40 Dust' };
  })(),
}));

// ── Battle Rewards ──

export interface BattleRewards {
  gold: number;
  dust: number;
  xp: number;
  cardChance: number; // 0-1 probability of bonus card drop
}

export function calculateBattleRewards(won: boolean, roundsPlayed: number, enemyDifficulty: number): BattleRewards {
  const baseGold = won ? 30 : 10;
  const baseDust = won ? 15 : 5;
  const baseXp = won ? 25 : 10;

  return {
    gold: Math.round(baseGold * (1 + enemyDifficulty * 0.2) * (roundsPlayed / 3)),
    dust: Math.round(baseDust * (1 + enemyDifficulty * 0.1)),
    xp: Math.round(baseXp * (1 + roundsPlayed * 0.1)),
    cardChance: won ? Math.min(0.30, 0.10 + enemyDifficulty * 0.05) : 0.05,
  };
}

// ── Year-One Roadmap ──
export const YEAR_ONE_ROADMAP = [
  { month: 1, event: 'Launch — Core Set (24 cards), Season 1 begins', type: 'launch' },
  { month: 1, event: 'Founder\'s Legacy promo (3 cosmetic cards)', type: 'promo' },
  { month: 2, event: 'Eclipse Festival event (6 event cards)', type: 'event' },
  { month: 2, event: 'Mini-Set: Echoes of Frost (15 cards)', type: 'mini_set' },
  { month: 3, event: 'Season 1 ends → Season 2 begins', type: 'season' },
  { month: 4, event: 'Expansion 1: Shattered Realms (40 cards)', type: 'expansion' },
  { month: 5, event: 'Event: Dragon\'s Rift (8 event cards)', type: 'event' },
  { month: 6, event: 'Mini-Set: Tides of War (15 cards)', type: 'mini_set' },
  { month: 6, event: 'Season 2 ends → Season 3', type: 'season' },
  { month: 7, event: 'Archive Vault opens — Season 1 cards craftable', type: 'archive' },
  { month: 8, event: 'Event: Celestial Convergence (8 cards)', type: 'event' },
  { month: 9, event: 'Expansion 2: Veil of Shadows (40 cards)', type: 'expansion' },
  { month: 9, event: 'Season 3 ends → Season 4', type: 'season' },
  { month: 10, event: 'Mini-Set: Iron Requiem (15 cards)', type: 'mini_set' },
  { month: 11, event: 'Anniversary Event + Rerun banners', type: 'event' },
  { month: 12, event: 'Year 2 teaser + Catch-up mega bundle', type: 'expansion' },
];

// ── Design Rules (Top 10 — Never Violate) ──
export const DESIGN_RULES = [
  '1. Core gameplay cards must eventually be obtainable — no permanent lock behind missed events',
  '2. Rarity ≠ raw power. Higher rarity = more unique/complex mechanics, not better stats per cost',
  '3. Cosmetic exclusivity can be aggressive; gameplay exclusivity cannot',
  '4. Transparent drop rates displayed in-app at all times',
  '5. Pity system active on every banner — no infinite bad luck',
  '6. Duplicate protection: 70% weight toward unowned cards',
  '7. New players get a full starter deck per faction for free',
  '8. Returning players get catch-up bundles at discounted rates',
  '9. No single card should ever be "required" for competitive play',
  '10. Archive Vault opens 2 seasons after content expires — nothing gameplay-relevant stays locked forever',
];
