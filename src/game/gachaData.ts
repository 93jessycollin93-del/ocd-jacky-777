import { GachaBanner, GachaBannerItem } from './types';
import { GearRarity } from './types';

// ══════════════════════════════════════════════════════════
// DROP RATES — Modeled after Lords Mobile official rates
// Standard (Rare Chest):   Common 50%, Uncommon 40%, Rare 10%
// Premium (Legendary Chest): Common 65%, Uncommon 14%, Rare 15%, Epic 5%, Legendary 1%
// Limited Banner: Same as Premium with limited-edition items
// ══════════════════════════════════════════════════════════

// ── Consumable Pool (mirrors LM supply items) ──
export const CONSUMABLE_POOL: GachaBannerItem[] = [
  // Common — resource crates, speed-ups, shields (bulk of drops)
  { name: 'Food Supply Crate', icon: '🌾', category: 'consumable', rarity: 'common', description: 'Instantly grants +500 food', effect: { type: 'instant_resource', value: 500, target: 'food' }, weight: 65 },
  { name: 'Lumber Supply Crate', icon: '🪵', category: 'consumable', rarity: 'common', description: 'Instantly grants +500 wood', effect: { type: 'instant_resource', value: 500, target: 'wood' }, weight: 65 },
  { name: 'Iron Supply Crate', icon: '⛏️', category: 'consumable', rarity: 'common', description: 'Instantly grants +200 iron', effect: { type: 'instant_resource', value: 200, target: 'iron' }, weight: 55 },
  { name: 'Stone Supply Crate', icon: '🪨', category: 'consumable', rarity: 'common', description: 'Instantly grants +400 stone', effect: { type: 'instant_resource', value: 400, target: 'stone' }, weight: 55 },
  { name: '5-Min Speed Up', icon: '⏱️', category: 'consumable', rarity: 'common', description: 'Reduces current timer by 5 minutes', effect: { type: 'speed_buff', value: 5, duration: 300 }, weight: 60 },
  { name: 'Ration Pack', icon: '🍞', category: 'consumable', rarity: 'common', description: 'Instantly grants +300 food', effect: { type: 'instant_resource', value: 300, target: 'food' }, weight: 50 },
  // Uncommon — better speed-ups, buffs (LM Green items)
  { name: '30-Min Speed Up', icon: '⏳', category: 'consumable', rarity: 'uncommon', description: 'Reduces current timer by 30 minutes', effect: { type: 'speed_buff', value: 30, duration: 1800 }, weight: 14 },
  { name: 'War Horn', icon: '📯', category: 'consumable', rarity: 'uncommon', description: '30min attack +20%', effect: { type: 'attack_buff', value: 20, duration: 1800 }, weight: 14 },
  { name: 'Iron Shield Tonic', icon: '🛡️', category: 'consumable', rarity: 'uncommon', description: '30min defense +20%', effect: { type: 'defense_buff', value: 20, duration: 1800 }, weight: 14 },
  { name: 'Gatherer\'s Blessing', icon: '🍀', category: 'consumable', rarity: 'uncommon', description: '1hr gathering +30%', effect: { type: 'gathering_buff', value: 30, duration: 3600 }, weight: 14 },
  { name: 'Training Speed Up', icon: '🏋️', category: 'consumable', rarity: 'uncommon', description: '30min training speed +50%', effect: { type: 'speed_buff', value: 50, duration: 1800 }, weight: 12 },
  // Rare — high-value items (LM Blue items)
  { name: 'Gold Coffer', icon: '💰', category: 'consumable', rarity: 'rare', description: 'Instantly grants +1000 gold', effect: { type: 'instant_resource', value: 1000, target: 'gold' }, weight: 15 },
  { name: 'Mega Resource Pack', icon: '🎁', category: 'consumable', rarity: 'rare', description: '+2000 of each basic resource', effect: { type: 'instant_resource', value: 2000 }, weight: 5 },
  { name: 'Peace Shield (8hr)', icon: '🔰', category: 'consumable', rarity: 'rare', description: '8-hour peace shield', effect: { type: 'shield', value: 8, duration: 28800 }, weight: 5 },
  { name: '3-Hour Speed Up', icon: '⚡', category: 'consumable', rarity: 'rare', description: 'Reduces current timer by 3 hours', effect: { type: 'speed_buff', value: 180, duration: 10800 }, weight: 4 },
  { name: 'XP Tome', icon: '📖', category: 'consumable', rarity: 'rare', description: '1hr XP boost +100%', effect: { type: 'xp_boost', value: 100, duration: 3600 }, weight: 5 },
  // Ultra Rare / Epic (LM Purple items)
  { name: 'Grand War Elixir', icon: '⚗️', category: 'consumable', rarity: 'ultra_rare', description: '2hr all combat stats +30%', effect: { type: 'attack_buff', value: 30, duration: 7200 }, weight: 3 },
  { name: 'Teleport Scroll', icon: '🌀', category: 'consumable', rarity: 'ultra_rare', description: 'Instant map teleport to any location', effect: { type: 'teleport', value: 1 }, weight: 2 },
  { name: 'Peace Shield (24hr)', icon: '🛡️✨', category: 'consumable', rarity: 'ultra_rare', description: '24-hour peace shield', effect: { type: 'shield', value: 24, duration: 86400 }, weight: 1.5 },
  { name: 'Talent Reset Scroll', icon: '📜', category: 'consumable', rarity: 'ultra_rare', description: 'Reset all hero talents', effect: { type: 'xp_boost', value: 500, duration: 0 }, weight: 1.5 },
  // Legendary (LM Gold items — ~1%)
  { name: 'Realm Reset Scroll', icon: '🌟', category: 'consumable', rarity: 'legendary', description: 'Reset all research cooldowns instantly', effect: { type: 'xp_boost', value: 999, duration: 0 }, weight: 0.5 },
  { name: 'Dragon\'s Feast', icon: '🐲', category: 'consumable', rarity: 'legendary', description: '+10000 of all resources', effect: { type: 'instant_resource', value: 10000 }, weight: 0.3 },
  { name: 'Warlord\'s Mandate', icon: '👑', category: 'consumable', rarity: 'legendary', description: 'Instant train 500 T3 troops', effect: { type: 'instant_resource', value: 500 }, weight: 0.2 },
];

// ── Enhancement / Jewel Pool (mirrors LM Jewels & Gems) ──
export const ENHANCEMENT_POOL: GachaBannerItem[] = [
  // Uncommon Jewels
  { name: 'Attack Jewel I', icon: '🔴', category: 'enhancement', rarity: 'uncommon', description: 'Permanent +2% troop attack', effect: { type: 'attack_buff', value: 2 }, weight: 14 },
  { name: 'Defense Jewel I', icon: '🔵', category: 'enhancement', rarity: 'uncommon', description: 'Permanent +2% troop defense', effect: { type: 'defense_buff', value: 2 }, weight: 14 },
  { name: 'Speed Jewel I', icon: '🟢', category: 'enhancement', rarity: 'uncommon', description: 'Permanent +3% march speed', effect: { type: 'speed_buff', value: 3 }, weight: 14 },
  { name: 'HP Jewel I', icon: '🩷', category: 'enhancement', rarity: 'uncommon', description: 'Permanent +2% troop HP', effect: { type: 'defense_buff', value: 2 }, weight: 12 },
  // Rare Jewels  
  { name: 'Attack Jewel II', icon: '❤️‍🔥', category: 'enhancement', rarity: 'rare', description: 'Permanent +5% troop attack', effect: { type: 'attack_buff', value: 5 }, weight: 5 },
  { name: 'Defense Jewel II', icon: '💙', category: 'enhancement', rarity: 'rare', description: 'Permanent +5% troop defense', effect: { type: 'defense_buff', value: 5 }, weight: 5 },
  { name: 'Gathering Jewel', icon: '🟡', category: 'enhancement', rarity: 'rare', description: 'Permanent +8% gathering', effect: { type: 'gathering_buff', value: 8 }, weight: 5 },
  // Epic Jewels
  { name: 'War Jewel III', icon: '💎', category: 'enhancement', rarity: 'ultra_rare', description: 'Permanent +8% attack & defense', effect: { type: 'attack_buff', value: 8 }, weight: 3 },
  { name: 'Champion\'s Signet', icon: '💍', category: 'enhancement', rarity: 'ultra_rare', description: 'Permanent +6% all stats', effect: { type: 'attack_buff', value: 6 }, weight: 2 },
  // Legendary
  { name: 'Titan Gem', icon: '🟣', category: 'enhancement', rarity: 'legendary', description: 'Permanent +10% all stats', effect: { type: 'attack_buff', value: 10 }, weight: 1 },
];

// ── Hero Medals / Skins (mirrors LM Hero stages & appearances) ──
export const HERO_SKIN_POOL: GachaBannerItem[] = [
  // Rare skins
  { name: 'Aragorn — War Marshal', icon: '⚔️👤', category: 'hero_skin', rarity: 'rare', description: 'Battle-worn plate armor variant for Aragorn', effect: { type: 'hero_appearance', value: 1, target: 'aragorn' }, weight: 15, isLimited: false },
  { name: 'Legolas — Starlight Archer', icon: '🏹✨', category: 'hero_skin', rarity: 'rare', description: 'Moonlit forest garb for Legolas', effect: { type: 'hero_appearance', value: 1, target: 'legolas' }, weight: 15, isLimited: false },
  { name: 'Eowyn — Shieldmaiden', icon: '🛡️👸', category: 'hero_skin', rarity: 'rare', description: 'Rohirrim battle armor for Eowyn', effect: { type: 'hero_appearance', value: 1, target: 'eowyn' }, weight: 12, isLimited: false },
  // Epic skins
  { name: 'Gimli — Mithril Guardian', icon: '🪓🏔️', category: 'hero_skin', rarity: 'ultra_rare', description: 'Mithril-forged Khazad armor for Gimli', effect: { type: 'hero_appearance', value: 1, target: 'gimli' }, weight: 5, isLimited: true },
  { name: 'Gandalf — Arcane Sovereign', icon: '🔮👑', category: 'hero_skin', rarity: 'ultra_rare', description: 'Cosmic robes of the Istari for Gandalf', effect: { type: 'hero_appearance', value: 1, target: 'gandalf' }, weight: 5, isLimited: true },
  // Legendary skins
  { name: 'Aragorn — High King', icon: '👑⚔️', category: 'hero_skin', rarity: 'legendary', description: 'Elessar crowned regalia with Anduril reforged', effect: { type: 'hero_appearance', value: 1, target: 'aragorn' }, weight: 1, isLimited: true },
  { name: 'Gandalf — The White Flame', icon: '🌟🧙', category: 'hero_skin', rarity: 'legendary', description: 'Gandalf the White radiant form', effect: { type: 'hero_appearance', value: 1, target: 'gandalf' }, weight: 0.5, isLimited: true },
];

// ── Hero Medal Pool (mirrors LM Hero Medal drops) ──
export const HERO_MEDAL_POOL: GachaBannerItem[] = [
  { name: 'Aragorn Medal ×5', icon: '🎖️⚔️', category: 'enhancement', rarity: 'uncommon', description: '5 medals toward upgrading Aragorn', effect: { type: 'attack_buff', value: 1, target: 'aragorn' }, weight: 14 },
  { name: 'Legolas Medal ×5', icon: '🎖️🏹', category: 'enhancement', rarity: 'uncommon', description: '5 medals toward upgrading Legolas', effect: { type: 'speed_buff', value: 1, target: 'legolas' }, weight: 14 },
  { name: 'Gimli Medal ×5', icon: '🎖️🪓', category: 'enhancement', rarity: 'uncommon', description: '5 medals toward upgrading Gimli', effect: { type: 'defense_buff', value: 1, target: 'gimli' }, weight: 14 },
  { name: 'Gandalf Medal ×5', icon: '🎖️🧙', category: 'enhancement', rarity: 'rare', description: '5 medals toward upgrading Gandalf', effect: { type: 'attack_buff', value: 1, target: 'gandalf' }, weight: 8 },
  { name: 'Eowyn Medal ×5', icon: '🎖️👸', category: 'enhancement', rarity: 'uncommon', description: '5 medals toward upgrading Eowyn', effect: { type: 'gathering_buff', value: 1, target: 'eowyn' }, weight: 14 },
  { name: 'Faramir Medal ×5', icon: '🎖️🏰', category: 'enhancement', rarity: 'uncommon', description: '5 medals toward upgrading Faramir', effect: { type: 'speed_buff', value: 1, target: 'faramir' }, weight: 14 },
  { name: 'Legendary Hero Medal ×10', icon: '🏆🎖️', category: 'enhancement', rarity: 'legendary', description: '10 medals for any hero', effect: { type: 'attack_buff', value: 5 }, weight: 1 },
];

// ── Collectibles (Limited-time themed sets) ──
export const COLLECTIBLE_POOL_VOID: GachaBannerItem[] = [
  { name: 'Void Fragment', icon: '🌌', category: 'collectible', rarity: 'common', description: 'A shard from beyond the veil', weight: 65 },
  { name: 'Abyssal Sigil', icon: '🕳️', category: 'collectible', rarity: 'uncommon', description: 'Symbol of the void merchants', weight: 14 },
  { name: 'Rift Crystal', icon: '💜', category: 'collectible', rarity: 'rare', description: 'Crystallized void energy', weight: 15, isLimited: true },
  { name: 'Void Lord\'s Medallion', icon: '🪬', category: 'collectible', rarity: 'ultra_rare', description: 'Bearer commands the abyss', weight: 5, isLimited: true },
  { name: 'The Nexus Key', icon: '🔑', category: 'collectible', rarity: 'legendary', description: 'Opens pathways between realms', weight: 1, isLimited: true },
];

export const COLLECTIBLE_POOL_DRAGON: GachaBannerItem[] = [
  { name: 'Dragon Scale Fragment', icon: '🐉', category: 'collectible', rarity: 'common', description: 'A fallen dragon\'s remnant', weight: 65 },
  { name: 'Wyrm Tooth', icon: '🦷', category: 'collectible', rarity: 'uncommon', description: 'Sharp as obsidian, old as time', weight: 14 },
  { name: 'Dragon Heart Ember', icon: '🔥', category: 'collectible', rarity: 'rare', description: 'Still warm after centuries', weight: 15, isLimited: true },
  { name: 'Elder Drake Crest', icon: '🏅', category: 'collectible', rarity: 'ultra_rare', description: 'Worn by dragonriders of old', weight: 5, isLimited: true },
  { name: 'Primordial Egg', icon: '🥚', category: 'collectible', rarity: 'legendary', description: 'Something stirs within...', weight: 1, isLimited: true },
];

export const COLLECTIBLE_POOL_CELESTIAL: GachaBannerItem[] = [
  { name: 'Star Dust', icon: '✨', category: 'collectible', rarity: 'common', description: 'Fallen starlight crystallized', weight: 65 },
  { name: 'Moon Shard', icon: '🌙', category: 'collectible', rarity: 'uncommon', description: 'Fragment of the silver moon', weight: 14 },
  { name: 'Solar Prism', icon: '☀️', category: 'collectible', rarity: 'rare', description: 'Captures and refracts sunfire', weight: 15, isLimited: true },
  { name: 'Constellation Map', icon: '🗺️', category: 'collectible', rarity: 'ultra_rare', description: 'Charts the heavens and their power', weight: 5, isLimited: true },
  { name: 'Astral Crown', icon: '👑✨', category: 'collectible', rarity: 'legendary', description: 'Crown of the celestial warden', weight: 1, isLimited: true },
];

export const COLLECTIBLE_POOL_SHADOW: GachaBannerItem[] = [
  { name: 'Shadow Essence', icon: '🖤', category: 'collectible', rarity: 'common', description: 'Concentrated darkness', weight: 65 },
  { name: 'Night Rune', icon: '🌑', category: 'collectible', rarity: 'uncommon', description: 'Ancient script of shadow weavers', weight: 14 },
  { name: 'Wraith Chain', icon: '⛓️', category: 'collectible', rarity: 'rare', description: 'Binds spirits to the mortal plane', weight: 15, isLimited: true },
  { name: 'Nazgûl Shroud', icon: '🦇', category: 'collectible', rarity: 'ultra_rare', description: 'Cloak of the nine ringwraiths', weight: 5, isLimited: true },
  { name: 'The One Ring Shard', icon: '💍', category: 'collectible', rarity: 'legendary', description: 'A fragment of ultimate power', weight: 1, isLimited: true },
];

// ── Fragment Recipes (fragment assembly crafting) ──
export interface FragmentRecipe {
  id: string;
  name: string;
  icon: string;
  description: string;
  rarity: GearRarity;
  fragments: { name: string; icon: string; requiredCount: number }[];
  result: GachaBannerItem;
}

export const FRAGMENT_RECIPES: FragmentRecipe[] = [
  {
    id: 'void_blade', name: 'Void Blade Assembly', icon: '⚔️',
    description: 'Combine 5 Void Fragments and 2 Rift Crystals to forge the Void Blade',
    rarity: 'legendary',
    fragments: [{ name: 'Void Fragment', icon: '🌌', requiredCount: 5 }, { name: 'Rift Crystal', icon: '💜', requiredCount: 2 }],
    result: { name: 'Void Blade', icon: '🗡️🌌', category: 'enhancement', rarity: 'legendary', description: 'Permanent +15% attack', effect: { type: 'attack_buff', value: 15 }, weight: 0 },
  },
  {
    id: 'dragon_crown', name: 'Dragon Crown Assembly', icon: '👑',
    description: 'Combine 5 Dragon Scales and 2 Dragon Heart Embers',
    rarity: 'legendary',
    fragments: [{ name: 'Dragon Scale Fragment', icon: '🐉', requiredCount: 5 }, { name: 'Dragon Heart Ember', icon: '🔥', requiredCount: 2 }],
    result: { name: 'Dragon Crown', icon: '👑🐲', category: 'enhancement', rarity: 'legendary', description: 'Permanent +12% defense, +8% health', effect: { type: 'defense_buff', value: 12 }, weight: 0 },
  },
  {
    id: 'nexus_staff', name: 'Nexus Staff Assembly', icon: '🔮',
    description: 'Combine 1 Nexus Key, 3 Abyssal Sigils, and 1 Void Lord\'s Medallion',
    rarity: 'mythic',
    fragments: [{ name: 'The Nexus Key', icon: '🔑', requiredCount: 1 }, { name: 'Abyssal Sigil', icon: '🕳️', requiredCount: 3 }, { name: 'Void Lord\'s Medallion', icon: '🪬', requiredCount: 1 }],
    result: { name: 'Nexus Staff', icon: '🔮✨', category: 'enhancement', rarity: 'mythic', description: 'Permanent +20% all stats', effect: { type: 'attack_buff', value: 20 }, weight: 0 },
  },
  {
    id: 'primordial_armor', name: 'Primordial Armor Assembly', icon: '🛡️',
    description: 'Combine 1 Primordial Egg, 3 Wyrm Teeth, and 1 Elder Drake Crest',
    rarity: 'mythic',
    fragments: [{ name: 'Primordial Egg', icon: '🥚', requiredCount: 1 }, { name: 'Wyrm Tooth', icon: '🦷', requiredCount: 3 }, { name: 'Elder Drake Crest', icon: '🏅', requiredCount: 1 }],
    result: { name: 'Primordial Armor', icon: '🛡️🐲', category: 'enhancement', rarity: 'mythic', description: 'Permanent +25% defense, +10% health', effect: { type: 'defense_buff', value: 25 }, weight: 0 },
  },
  {
    id: 'celestial_bow', name: 'Celestial Bow Assembly', icon: '🏹',
    description: 'Combine 5 Star Dust, 2 Solar Prisms, and 1 Constellation Map',
    rarity: 'legendary',
    fragments: [{ name: 'Star Dust', icon: '✨', requiredCount: 5 }, { name: 'Solar Prism', icon: '☀️', requiredCount: 2 }, { name: 'Constellation Map', icon: '🗺️', requiredCount: 1 }],
    result: { name: 'Celestial Bow', icon: '🏹✨', category: 'enhancement', rarity: 'legendary', description: 'Permanent +12% ranged attack, +8% speed', effect: { type: 'attack_buff', value: 12 }, weight: 0 },
  },
  {
    id: 'shadow_cloak', name: 'Shadow Cloak Assembly', icon: '🧥',
    description: 'Combine 5 Shadow Essence, 2 Wraith Chains, and 1 Nazgûl Shroud',
    rarity: 'legendary',
    fragments: [{ name: 'Shadow Essence', icon: '🖤', requiredCount: 5 }, { name: 'Wraith Chain', icon: '⛓️', requiredCount: 2 }, { name: 'Nazgûl Shroud', icon: '🦇', requiredCount: 1 }],
    result: { name: 'Shadow Cloak', icon: '🧥🌑', category: 'enhancement', rarity: 'legendary', description: 'Permanent +10% speed, +10% defense', effect: { type: 'speed_buff', value: 10 }, weight: 0 },
  },
];

// ── Banner Generator (Lords Mobile rotation style) ──
// LM has: Always-available Standard & Premium chests + rotating limited events
export function generateActiveBanners(): GachaBanner[] {
  const now = Date.now();
  const dayMs = 86400000;
  const weekMs = dayMs * 7;
  const weekNumber = Math.floor(now / weekMs);
  const rotationIndex = weekNumber % 4; // 4-week rotation cycle
  const banners: GachaBanner[] = [];

  // ═══════ PERMANENT BANNERS ═══════

  // 1. Standard "Rare Chest" (Gold) — LM Rare Chest rates: ~50/40/10
  banners.push({
    id: 'standard',
    name: 'Supply Chest',
    icon: '📦',
    description: 'Standard supply chest. Contains resources, speed-ups, and basic gear. Affordable with gold.',
    theme: 'standard',
    pool: [
      ...CONSUMABLE_POOL.filter(c => ['common', 'uncommon', 'rare'].includes(c.rarity)),
      ...ENHANCEMENT_POOL.filter(e => e.rarity === 'uncommon'),
    ],
    costType: 'diamonds',
    costSingle: 50,
    costMulti: 450,
    pityThreshold: 50,
    pityItem: { name: 'Gold Coffer', icon: '💰', category: 'consumable', rarity: 'rare', description: 'Guaranteed rare reward', effect: { type: 'instant_resource', value: 1000, target: 'gold' }, weight: 1 },
    startsAt: 0,
    endsAt: Infinity,
    featured: false,
  });

  // 2. Premium "Legendary Chest" (Stars) — LM Legendary Chest rates: 65/14/15/5/1
  banners.push({
    id: 'premium',
    name: 'Arcane Vault',
    icon: '🏛️',
    description: 'Premium vault containing hero skins, top-tier jewels, and exclusive items. Rates: Common 65%, Uncommon 14%, Rare 15%, Epic 5%, Legendary 1%.',
    theme: 'premium',
    pool: [...HERO_SKIN_POOL, ...ENHANCEMENT_POOL, ...CONSUMABLE_POOL.filter(c => c.rarity !== 'common')],
    costType: 'stars',
    costSingle: 50,
    costMulti: 450,
    pityThreshold: 30,
    pityItem: { name: 'Titan Gem', icon: '🟣', category: 'enhancement', rarity: 'legendary', description: 'Guaranteed legendary enhancement', effect: { type: 'attack_buff', value: 10 }, weight: 1 },
    startsAt: 0,
    endsAt: Infinity,
    featured: true,
  });

  // 3. Heroes Chest (Stars) — like LM's "Hero Chest" focused on hero medals
  banners.push({
    id: 'heroes',
    name: 'Hero\'s Call',
    icon: '🎖️',
    description: 'Focused hero medal drops. Upgrade your heroes faster with dedicated medal pulls.',
    theme: 'heroes',
    pool: [...HERO_MEDAL_POOL, ...HERO_SKIN_POOL.filter(s => s.rarity === 'rare'), ...CONSUMABLE_POOL.filter(c => c.rarity === 'rare')],
    costType: 'stars',
    costSingle: 30,
    costMulti: 270,
    pityThreshold: 40,
    pityItem: { name: 'Legendary Hero Medal ×10', icon: '🏆🎖️', category: 'enhancement', rarity: 'legendary', description: 'Guaranteed legendary medals', effect: { type: 'attack_buff', value: 5 }, weight: 1 },
    startsAt: 0,
    endsAt: Infinity,
    featured: false,
  });

  // ═══════ LIMITED ROTATING BANNERS (weekly, like LM events) ═══════

  const limitedEnd = (weekNumber + 1) * weekMs;
  const limitedStart = weekNumber * weekMs;
  const daysLeft = Math.max(0, Math.ceil((limitedEnd - now) / dayMs));

  const limitedBannerConfigs = [
    {
      id: `void_${weekNumber}`, name: '⏳ Void Rift Event', icon: '🌌', theme: 'void',
      description: `Limited void-themed banner! ${daysLeft} days left. Collect Void Fragments for the Nexus Staff.`,
      pool: [...COLLECTIBLE_POOL_VOID, ...CONSUMABLE_POOL.filter(c => c.rarity === 'rare' || c.rarity === 'ultra_rare'), ...HERO_SKIN_POOL.filter(s => s.rarity === 'ultra_rare')],
      pityItem: { name: 'The Nexus Key', icon: '🔑', category: 'collectible' as const, rarity: 'legendary' as const, description: 'Guaranteed void legendary', weight: 1, isLimited: true },
    },
    {
      id: `dragon_${weekNumber}`, name: '⏳ Dragon\'s Hoard Event', icon: '🐉', theme: 'dragon',
      description: `Limited dragon-themed banner! ${daysLeft} days left. Collect Dragon Scales for the Primordial Armor.`,
      pool: [...COLLECTIBLE_POOL_DRAGON, ...CONSUMABLE_POOL.filter(c => c.rarity === 'rare' || c.rarity === 'ultra_rare'), ...HERO_SKIN_POOL.filter(s => s.name.includes('Inferno') || s.name.includes('Mithril'))],
      pityItem: { name: 'Primordial Egg', icon: '🥚', category: 'collectible' as const, rarity: 'legendary' as const, description: 'Guaranteed dragon legendary', weight: 1, isLimited: true },
    },
    {
      id: `celestial_${weekNumber}`, name: '⏳ Celestial Ascension', icon: '🌟', theme: 'seasonal',
      description: `Limited celestial-themed banner! ${daysLeft} days left. Collect Star Dust for the Celestial Bow.`,
      pool: [...COLLECTIBLE_POOL_CELESTIAL, ...CONSUMABLE_POOL.filter(c => c.rarity === 'rare' || c.rarity === 'ultra_rare'), ...HERO_SKIN_POOL.filter(s => s.rarity === 'legendary')],
      pityItem: { name: 'Astral Crown', icon: '👑✨', category: 'collectible' as const, rarity: 'legendary' as const, description: 'Guaranteed celestial legendary', weight: 1, isLimited: true },
    },
    {
      id: `shadow_${weekNumber}`, name: '⏳ Shadow War', icon: '🦇', theme: 'void',
      description: `Limited shadow-themed banner! ${daysLeft} days left. Collect Shadow Essence for the Shadow Cloak.`,
      pool: [...COLLECTIBLE_POOL_SHADOW, ...CONSUMABLE_POOL.filter(c => c.rarity === 'rare' || c.rarity === 'ultra_rare'), ...HERO_SKIN_POOL.filter(s => s.rarity === 'ultra_rare')],
      pityItem: { name: 'The One Ring Shard', icon: '💍', category: 'collectible' as const, rarity: 'legendary' as const, description: 'Guaranteed shadow legendary', weight: 1, isLimited: true },
    },
  ];

  const currentLimited = limitedBannerConfigs[rotationIndex];
  banners.push({
    ...currentLimited,
    costType: 'ton',
    costSingle: 5000000,   // 0.005 TON
    costMulti: 45000000,   // 0.045 TON
    pityThreshold: 20,
    startsAt: limitedStart,
    endsAt: limitedEnd,
    featured: true,
  });

  return banners;
}

// ── Pull Logic ──
export function performGachaPull(
  pool: GachaBannerItem[],
  pityCount: number,
  pityThreshold: number,
  pityItem: GachaBannerItem,
): GachaBannerItem {
  if (pityCount >= pityThreshold) {
    return pityItem;
  }

  // Soft pity after 60% of threshold (mirrors LM increasing rates)
  const softPityStart = Math.floor(pityThreshold * 0.6);
  let adjustedPool = pool;
  if (pityCount >= softPityStart) {
    const boost = (pityCount - softPityStart) / (pityThreshold - softPityStart);
    adjustedPool = pool.map(item => {
      const rarityBoost: Record<string, number> = { legendary: 5, ultra_rare: 3, mythic: 8 };
      const mult = rarityBoost[item.rarity] || 1;
      return { ...item, weight: item.weight * (1 + boost * mult) };
    });
  }

  const totalWeight = adjustedPool.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * totalWeight;

  for (const item of adjustedPool) {
    roll -= item.weight;
    if (roll <= 0) return item;
  }

  return adjustedPool[adjustedPool.length - 1];
}

// ── Rarity display helpers ──
export const GACHA_RARITY_COLORS: Record<string, string> = {
  common: 'text-muted-foreground border-border',
  uncommon: 'text-green-400 border-green-500/40',
  rare: 'text-blue-400 border-blue-500/40',
  ultra_rare: 'text-purple-400 border-purple-500/40',
  legendary: 'text-yellow-400 border-yellow-500/40',
  mythic: 'text-red-400 border-red-500/40',
};

export const GACHA_RARITY_BG: Record<string, string> = {
  common: 'bg-card',
  uncommon: 'bg-green-950/20',
  rare: 'bg-blue-950/20',
  ultra_rare: 'bg-purple-950/20',
  legendary: 'bg-yellow-950/20',
  mythic: 'bg-red-950/30',
};

export const GACHA_RARITY_LABELS: Record<string, string> = {
  common: '★', uncommon: '★★', rare: '★★★', ultra_rare: '★★★★', legendary: '★★★★★', mythic: '✦✦✦✦✦',
};
