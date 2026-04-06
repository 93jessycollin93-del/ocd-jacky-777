import { BuildingDef, ResearchDef, TroopDef, HeroDef, ExpeditionDef, GameState, GearItem, GearRarity, GearCraftRecipe, GearUpgradeRecipe, LegendaryCreature, CraftingMaterialType } from './types';

// ── Buildings ──
// Names here are English fallbacks; UI uses i18n keys `building.{id}.name` / `building.{id}.desc`
export const BUILDINGS: BuildingDef[] = [
  // ── Core ──
  { id: 'keep', icon: '🏰', maxLevel: 50, baseCost: { wood: 100, stone: 100 }, costMultiplier: 1.35 },
  // ── Resource Production ──
  { id: 'farm', icon: '🌾', maxLevel: 50, produces: 'food', baseProduction: 5, baseCost: { wood: 50 }, costMultiplier: 1.3 },
  { id: 'lumbermill', icon: '🪓', maxLevel: 50, produces: 'wood', baseProduction: 4, baseCost: { stone: 40 }, costMultiplier: 1.3 },
  { id: 'quarry', icon: '⛏️', maxLevel: 50, produces: 'stone', baseProduction: 3, baseCost: { wood: 60 }, costMultiplier: 1.3 },
  { id: 'mine', icon: '⚒️', maxLevel: 50, produces: 'iron', baseProduction: 2, baseCost: { wood: 80, stone: 40 }, costMultiplier: 1.32, unlockRequires: { buildingId: 'keep', level: 2 } },
  { id: 'goldmine', icon: '💎', maxLevel: 50, produces: 'gold', baseProduction: 1, baseCost: { stone: 120, iron: 60 }, costMultiplier: 1.35, unlockRequires: { buildingId: 'keep', level: 6 } },
  // ── Resource Storage ──
  { id: 'granary', icon: '🏪', maxLevel: 50, baseCost: { wood: 80, stone: 40 }, costMultiplier: 1.28, unlockRequires: { buildingId: 'keep', level: 3 } },
  { id: 'warehouse', icon: '🏗️', maxLevel: 50, baseCost: { wood: 100, stone: 80 }, costMultiplier: 1.3, unlockRequires: { buildingId: 'keep', level: 4 } },
  { id: 'vault', icon: '🔐', maxLevel: 50, baseCost: { stone: 200, iron: 100, gold: 50 }, costMultiplier: 1.35, unlockRequires: { buildingId: 'keep', level: 10 } },
  // ── Military ──
  { id: 'barracks', icon: '⚔️', maxLevel: 50, baseCost: { wood: 80, stone: 60 }, costMultiplier: 1.33, unlockRequires: { buildingId: 'keep', level: 2 } },
  { id: 'academy', icon: '📜', maxLevel: 50, baseCost: { wood: 100, stone: 80, iron: 20 }, costMultiplier: 1.35, unlockRequires: { buildingId: 'keep', level: 3 } },
  { id: 'smithy', icon: '🔨', maxLevel: 50, baseCost: { stone: 100, iron: 60 }, costMultiplier: 1.35, unlockRequires: { buildingId: 'keep', level: 4 } },
  { id: 'stables', icon: '🐴', maxLevel: 50, baseCost: { wood: 120, food: 80 }, costMultiplier: 1.32, unlockRequires: { buildingId: 'barracks', level: 5 } },
  { id: 'archery_range', icon: '🏹', maxLevel: 50, baseCost: { wood: 100, iron: 40 }, costMultiplier: 1.32, unlockRequires: { buildingId: 'barracks', level: 5 } },
  { id: 'siege_workshop', icon: '🪨', maxLevel: 50, baseCost: { wood: 200, iron: 150, stone: 100 }, costMultiplier: 1.38, unlockRequires: { buildingId: 'smithy', level: 8 } },
  { id: 'war_college', icon: '🎖️', maxLevel: 50, baseCost: { gold: 200, iron: 100 }, costMultiplier: 1.4, unlockRequires: { buildingId: 'academy', level: 10 } },
  // ── Defense ──
  { id: 'watchtower', icon: '🗼', maxLevel: 50, baseCost: { stone: 80, wood: 40 }, costMultiplier: 1.3, unlockRequires: { buildingId: 'keep', level: 3 } },
  { id: 'walls', icon: '🧱', maxLevel: 50, baseCost: { stone: 150, iron: 50 }, costMultiplier: 1.35, unlockRequires: { buildingId: 'keep', level: 5 } },
  { id: 'moat', icon: '🌊', maxLevel: 50, baseCost: { stone: 200, gold: 80 }, costMultiplier: 1.33, unlockRequires: { buildingId: 'walls', level: 5 } },
  { id: 'gatehouse', icon: '🚪', maxLevel: 50, baseCost: { stone: 180, iron: 120, wood: 80 }, costMultiplier: 1.36, unlockRequires: { buildingId: 'walls', level: 10 } },
  // ── Civic ──
  { id: 'market', icon: '🏬', maxLevel: 50, baseCost: { wood: 100, gold: 50 }, costMultiplier: 1.3, unlockRequires: { buildingId: 'keep', level: 4 } },
  { id: 'hospital', icon: '🏥', maxLevel: 50, baseCost: { wood: 120, stone: 60, food: 40 }, costMultiplier: 1.32, unlockRequires: { buildingId: 'keep', level: 5 } },
  { id: 'embassy', icon: '🏛️', maxLevel: 50, baseCost: { stone: 150, gold: 100 }, costMultiplier: 1.35, unlockRequires: { buildingId: 'keep', level: 8 } },
  { id: 'temple', icon: '⛩️', maxLevel: 50, baseCost: { stone: 200, gold: 150 }, costMultiplier: 1.38, unlockRequires: { buildingId: 'keep', level: 10 } },
  { id: 'library', icon: '📚', maxLevel: 50, baseCost: { wood: 80, gold: 60 }, costMultiplier: 1.3, unlockRequires: { buildingId: 'academy', level: 5 } },
  // ── Advanced / Late-game ──
  { id: 'observatory', icon: '🔭', maxLevel: 50, baseCost: { stone: 300, iron: 200, gold: 150 }, costMultiplier: 1.4, unlockRequires: { buildingId: 'academy', level: 15 } },
  { id: 'apothecary', icon: '⚗️', maxLevel: 50, baseCost: { wood: 150, food: 100, gold: 80 }, costMultiplier: 1.33, unlockRequires: { buildingId: 'hospital', level: 8 } },
  { id: 'dragon_roost', icon: '🐉', maxLevel: 50, baseCost: { stone: 500, iron: 300, gold: 200 }, costMultiplier: 1.45, unlockRequires: { buildingId: 'keep', level: 20 } },
  { id: 'underground_vault', icon: '🕳️', maxLevel: 50, baseCost: { stone: 400, iron: 250, gold: 150 }, costMultiplier: 1.42, unlockRequires: { buildingId: 'vault', level: 10 } },
  { id: 'enchanter_tower', icon: '🌟', maxLevel: 50, baseCost: { stone: 350, gold: 300 }, costMultiplier: 1.45, unlockRequires: { buildingId: 'temple', level: 10 } },
  { id: 'harbor', icon: '⚓', maxLevel: 50, baseCost: { wood: 300, stone: 200, gold: 100 }, costMultiplier: 1.38, unlockRequires: { buildingId: 'keep', level: 12 } },
  { id: 'prison', icon: '⛓️', maxLevel: 50, baseCost: { stone: 250, iron: 180 }, costMultiplier: 1.36, unlockRequires: { buildingId: 'walls', level: 8 } },
];

// ── Research ──
export const RESEARCH: ResearchDef[] = [
  // ════════════════════ ECONOMY (20 items) ════════════════════
  { id: 'farming', icon: '🌿', category: 'economy', maxLevel: 50, baseCost: { gold: 50, food: 100 }, costMultiplier: 1.25, effect: 'Food production', effectPerLevel: 5 },
  { id: 'logging', icon: '🌲', category: 'economy', maxLevel: 50, baseCost: { gold: 50, wood: 100 }, costMultiplier: 1.25, effect: 'Wood production', effectPerLevel: 5 },
  { id: 'masonry', icon: '🧱', category: 'economy', maxLevel: 50, baseCost: { gold: 50, stone: 100 }, costMultiplier: 1.25, effect: 'Stone production', effectPerLevel: 5 },
  { id: 'smelting', icon: '🔥', category: 'economy', maxLevel: 50, baseCost: { gold: 80, iron: 80 }, costMultiplier: 1.25, effect: 'Iron production', effectPerLevel: 5, requires: { researchId: 'masonry', level: 3 } },
  { id: 'trade', icon: '💰', category: 'economy', maxLevel: 50, baseCost: { gold: 100 }, costMultiplier: 1.28, effect: 'Gold income', effectPerLevel: 5 },
  { id: 'irrigation', icon: '💧', category: 'economy', maxLevel: 50, baseCost: { gold: 80, wood: 60 }, costMultiplier: 1.25, effect: 'Food production', effectPerLevel: 3, requires: { researchId: 'farming', level: 10 } },
  { id: 'crop_rotation', icon: '🔄', category: 'economy', maxLevel: 50, baseCost: { gold: 120, food: 200 }, costMultiplier: 1.28, effect: 'Food production', effectPerLevel: 4, requires: { researchId: 'irrigation', level: 5 } },
  { id: 'deep_mining', icon: '⛏️', category: 'economy', maxLevel: 50, baseCost: { gold: 150, iron: 120 }, costMultiplier: 1.3, effect: 'Iron production', effectPerLevel: 4, requires: { researchId: 'smelting', level: 10 } },
  { id: 'alloy_forging', icon: '⚙️', category: 'economy', maxLevel: 50, baseCost: { gold: 200, iron: 200 }, costMultiplier: 1.32, effect: 'Iron production', effectPerLevel: 3, requires: { researchId: 'deep_mining', level: 8 } },
  { id: 'taxation', icon: '📊', category: 'economy', maxLevel: 50, baseCost: { gold: 200 }, costMultiplier: 1.3, effect: 'Gold income', effectPerLevel: 4, requires: { researchId: 'trade', level: 8 } },
  { id: 'banking', icon: '🏦', category: 'economy', maxLevel: 50, baseCost: { gold: 350 }, costMultiplier: 1.35, effect: 'Gold income', effectPerLevel: 3, requires: { researchId: 'taxation', level: 10 } },
  { id: 'forestry_management', icon: '🌳', category: 'economy', maxLevel: 50, baseCost: { gold: 100, wood: 150 }, costMultiplier: 1.26, effect: 'Wood production', effectPerLevel: 3, requires: { researchId: 'logging', level: 10 } },
  { id: 'stonecutting', icon: '🪨', category: 'economy', maxLevel: 50, baseCost: { gold: 100, stone: 150 }, costMultiplier: 1.26, effect: 'Stone production', effectPerLevel: 3, requires: { researchId: 'masonry', level: 10 } },
  { id: 'aqueducts', icon: '🏛️', category: 'economy', maxLevel: 50, baseCost: { gold: 180, stone: 200 }, costMultiplier: 1.3, effect: 'Food production', effectPerLevel: 2, requires: { researchId: 'crop_rotation', level: 10 } },
  { id: 'merchant_guilds', icon: '🤝', category: 'economy', maxLevel: 50, baseCost: { gold: 300 }, costMultiplier: 1.35, effect: 'Gold income', effectPerLevel: 2, requires: { researchId: 'banking', level: 8 } },
  { id: 'caravan_routes', icon: '🐪', category: 'economy', maxLevel: 40, baseCost: { gold: 250, food: 100 }, costMultiplier: 1.33, effect: 'Gold income', effectPerLevel: 3, requires: { researchId: 'trade', level: 15 } },
  { id: 'granary_expansion', icon: '📦', category: 'economy', maxLevel: 40, baseCost: { gold: 120, wood: 200 }, costMultiplier: 1.28, effect: 'Food storage capacity', effectPerLevel: 5, requires: { researchId: 'farming', level: 5 } },
  { id: 'steel_refinement', icon: '🔩', category: 'economy', maxLevel: 30, baseCost: { gold: 400, iron: 300 }, costMultiplier: 1.38, effect: 'Iron production', effectPerLevel: 2, requires: { researchId: 'alloy_forging', level: 10 } },
  { id: 'luxury_goods', icon: '💎', category: 'economy', maxLevel: 30, baseCost: { gold: 500 }, costMultiplier: 1.4, effect: 'Gold income', effectPerLevel: 2, requires: { researchId: 'merchant_guilds', level: 10 } },
  { id: 'resource_efficiency', icon: '♻️', category: 'economy', maxLevel: 50, baseCost: { gold: 150, food: 80, wood: 80 }, costMultiplier: 1.28, effect: 'All production', effectPerLevel: 1, requires: { researchId: 'trade', level: 5 } },

  // ════════════════════ MILITARY (20 items) ════════════════════
  { id: 'attack_tactics', icon: '⚔️', category: 'military', maxLevel: 50, baseCost: { gold: 80, iron: 60 }, costMultiplier: 1.28, effect: 'Troop attack', effectPerLevel: 3 },
  { id: 'armor', icon: '🛡️', category: 'military', maxLevel: 50, baseCost: { gold: 80, iron: 80 }, costMultiplier: 1.28, effect: 'Troop defense', effectPerLevel: 3 },
  { id: 'endurance', icon: '💪', category: 'military', maxLevel: 50, baseCost: { gold: 60, food: 120 }, costMultiplier: 1.26, effect: 'Troop health', effectPerLevel: 3 },
  { id: 'march_speed', icon: '🏃', category: 'military', maxLevel: 50, baseCost: { gold: 100, food: 80 }, costMultiplier: 1.28, effect: 'March speed', effectPerLevel: 2 },
  { id: 'cavalry_charge', icon: '🐴', category: 'military', maxLevel: 50, baseCost: { gold: 120, iron: 80 }, costMultiplier: 1.3, effect: 'Cavalry attack', effectPerLevel: 4, requires: { researchId: 'attack_tactics', level: 5 } },
  { id: 'shield_wall', icon: '🪖', category: 'military', maxLevel: 50, baseCost: { gold: 120, iron: 100 }, costMultiplier: 1.3, effect: 'Infantry defense', effectPerLevel: 4, requires: { researchId: 'armor', level: 5 } },
  { id: 'marksman_training', icon: '🎯', category: 'military', maxLevel: 50, baseCost: { gold: 100, wood: 80 }, costMultiplier: 1.28, effect: 'Ranged attack', effectPerLevel: 4, requires: { researchId: 'attack_tactics', level: 5 } },
  { id: 'conscription', icon: '📋', category: 'military', maxLevel: 50, baseCost: { gold: 80, food: 150 }, costMultiplier: 1.25, effect: 'Training speed', effectPerLevel: 3 },
  { id: 'veteran_training', icon: '🎖️', category: 'military', maxLevel: 40, baseCost: { gold: 200, iron: 150 }, costMultiplier: 1.33, effect: 'Troop attack', effectPerLevel: 2, requires: { researchId: 'attack_tactics', level: 15 } },
  { id: 'fortified_armor', icon: '🏰', category: 'military', maxLevel: 40, baseCost: { gold: 200, iron: 200 }, costMultiplier: 1.35, effect: 'Troop defense', effectPerLevel: 2, requires: { researchId: 'armor', level: 15 } },
  { id: 'field_medicine', icon: '💊', category: 'military', maxLevel: 50, baseCost: { gold: 100, food: 100 }, costMultiplier: 1.28, effect: 'Wounded recovery', effectPerLevel: 3, requires: { researchId: 'endurance', level: 5 } },
  { id: 'flanking_maneuvers', icon: '🔀', category: 'military', maxLevel: 40, baseCost: { gold: 150, iron: 80 }, costMultiplier: 1.3, effect: 'Counter bonus', effectPerLevel: 2, requires: { researchId: 'cavalry_charge', level: 8 } },
  { id: 'war_drums', icon: '🥁', category: 'military', maxLevel: 30, baseCost: { gold: 100, wood: 60 }, costMultiplier: 1.25, effect: 'Troop morale', effectPerLevel: 3 },
  { id: 'night_raids', icon: '🌙', category: 'military', maxLevel: 30, baseCost: { gold: 180, iron: 100 }, costMultiplier: 1.32, effect: 'Ambush damage', effectPerLevel: 4, requires: { researchId: 'flanking_maneuvers', level: 5 } },
  { id: 'battle_formations', icon: '🗺️', category: 'military', maxLevel: 50, baseCost: { gold: 150 }, costMultiplier: 1.3, effect: 'Formation bonus', effectPerLevel: 2, requires: { researchId: 'attack_tactics', level: 10 } },
  { id: 'weapon_mastery', icon: '🗡️', category: 'military', maxLevel: 50, baseCost: { gold: 250, iron: 200 }, costMultiplier: 1.35, effect: 'Troop attack', effectPerLevel: 1, requires: { researchId: 'veteran_training', level: 10 } },
  { id: 'heavy_cavalry', icon: '🏇', category: 'military', maxLevel: 40, baseCost: { gold: 300, iron: 250, food: 200 }, costMultiplier: 1.38, effect: 'Cavalry health', effectPerLevel: 3, requires: { researchId: 'cavalry_charge', level: 15 } },
  { id: 'rapid_deployment', icon: '⚡', category: 'military', maxLevel: 30, baseCost: { gold: 200, food: 150 }, costMultiplier: 1.3, effect: 'March speed', effectPerLevel: 3, requires: { researchId: 'march_speed', level: 15 } },
  { id: 'scorched_earth', icon: '🔥', category: 'military', maxLevel: 20, baseCost: { gold: 400, iron: 300 }, costMultiplier: 1.4, effect: 'Defensive damage', effectPerLevel: 5, requires: { researchId: 'battle_formations', level: 15 } },
  { id: 'elite_guard', icon: '👑', category: 'military', maxLevel: 20, baseCost: { gold: 500, iron: 400, food: 300 }, costMultiplier: 1.45, effect: 'Elite troop stats', effectPerLevel: 3, requires: { researchId: 'weapon_mastery', level: 15 } },

  // ════════════════════ ARCANE (15 items) ════════════════════
  { id: 'oracle_attunement', icon: '🔮', category: 'arcane', maxLevel: 50, baseCost: { gold: 200, stone: 150 }, costMultiplier: 1.3, effect: 'AI Oracle insight quality', effectPerLevel: 4 },
  { id: 'mana_weaving', icon: '✨', category: 'arcane', maxLevel: 50, baseCost: { gold: 150, wood: 100 }, costMultiplier: 1.28, effect: 'Essence generation', effectPerLevel: 5, requires: { researchId: 'oracle_attunement', level: 3 } },
  { id: 'rune_mastery', icon: '🪄', category: 'arcane', maxLevel: 50, baseCost: { gold: 180, iron: 120 }, costMultiplier: 1.3, effect: 'Crafting success rate', effectPerLevel: 2, requires: { researchId: 'mana_weaving', level: 5 } },
  { id: 'arcane_fortification', icon: '🏰', category: 'arcane', maxLevel: 50, baseCost: { gold: 250, stone: 200 }, costMultiplier: 1.35, effect: 'City defense bonus', effectPerLevel: 3, requires: { researchId: 'rune_mastery', level: 5 } },
  { id: 'astral_navigation', icon: '🌌', category: 'arcane', maxLevel: 50, baseCost: { gold: 220, food: 100 }, costMultiplier: 1.3, effect: 'Expedition reward bonus', effectPerLevel: 3, requires: { researchId: 'oracle_attunement', level: 5 } },
  { id: 'elemental_binding', icon: '🌀', category: 'arcane', maxLevel: 40, baseCost: { gold: 300, iron: 150 }, costMultiplier: 1.35, effect: 'Elemental damage', effectPerLevel: 4, requires: { researchId: 'mana_weaving', level: 10 } },
  { id: 'spirit_communion', icon: '👻', category: 'arcane', maxLevel: 40, baseCost: { gold: 250, food: 200 }, costMultiplier: 1.33, effect: 'Hero XP gain', effectPerLevel: 3, requires: { researchId: 'oracle_attunement', level: 10 } },
  { id: 'ley_line_tapping', icon: '⚡', category: 'arcane', maxLevel: 30, baseCost: { gold: 400, stone: 300 }, costMultiplier: 1.4, effect: 'Mana regeneration', effectPerLevel: 5, requires: { researchId: 'elemental_binding', level: 8 } },
  { id: 'temporal_magic', icon: '⏳', category: 'arcane', maxLevel: 20, baseCost: { gold: 500, iron: 300 }, costMultiplier: 1.45, effect: 'Construction speed', effectPerLevel: 3, requires: { researchId: 'ley_line_tapping', level: 5 } },
  { id: 'void_channeling', icon: '🕳️', category: 'arcane', maxLevel: 20, baseCost: { gold: 600 }, costMultiplier: 1.5, effect: 'All arcane effects', effectPerLevel: 2, requires: { researchId: 'temporal_magic', level: 10 } },
  { id: 'celestial_alignment', icon: '⭐', category: 'arcane', maxLevel: 30, baseCost: { gold: 350, stone: 250 }, costMultiplier: 1.38, effect: 'Shard generation', effectPerLevel: 3, requires: { researchId: 'astral_navigation', level: 10 } },
  { id: 'dragon_lore', icon: '🐲', category: 'arcane', maxLevel: 30, baseCost: { gold: 500, iron: 250 }, costMultiplier: 1.42, effect: 'Creature hunt power', effectPerLevel: 4, requires: { researchId: 'spirit_communion', level: 8 } },
  { id: 'ward_inscription', icon: '🛡️', category: 'arcane', maxLevel: 40, baseCost: { gold: 200, stone: 150 }, costMultiplier: 1.3, effect: 'Shield duration', effectPerLevel: 3, requires: { researchId: 'rune_mastery', level: 8 } },
  { id: 'enchantment_mastery', icon: '💫', category: 'arcane', maxLevel: 30, baseCost: { gold: 450, iron: 200 }, costMultiplier: 1.4, effect: 'Gear enchant bonus', effectPerLevel: 3, requires: { researchId: 'ward_inscription', level: 10 } },
  { id: 'arcane_supremacy', icon: '🌟', category: 'arcane', maxLevel: 10, baseCost: { gold: 1000, iron: 500, stone: 500 }, costMultiplier: 1.6, effect: 'All arcane effects', effectPerLevel: 5, requires: { researchId: 'void_channeling', level: 10 } },

  // ════════════════════ INFRASTRUCTURE (15 items) ════════════════════
  { id: 'road_network', icon: '🛤️', category: 'infrastructure', maxLevel: 50, baseCost: { gold: 60, stone: 80 }, costMultiplier: 1.25, effect: 'March speed', effectPerLevel: 2 },
  { id: 'bridge_building', icon: '🌉', category: 'infrastructure', maxLevel: 40, baseCost: { gold: 100, wood: 120, stone: 100 }, costMultiplier: 1.3, effect: 'Trade route income', effectPerLevel: 3, requires: { researchId: 'road_network', level: 5 } },
  { id: 'city_planning', icon: '📐', category: 'infrastructure', maxLevel: 50, baseCost: { gold: 80, stone: 60 }, costMultiplier: 1.25, effect: 'Construction speed', effectPerLevel: 2 },
  { id: 'sanitation', icon: '🚿', category: 'infrastructure', maxLevel: 40, baseCost: { gold: 100, stone: 80, wood: 60 }, costMultiplier: 1.28, effect: 'Population growth', effectPerLevel: 3, requires: { researchId: 'city_planning', level: 5 } },
  { id: 'advanced_masonry', icon: '🏗️', category: 'infrastructure', maxLevel: 50, baseCost: { gold: 120, stone: 150 }, costMultiplier: 1.3, effect: 'Building durability', effectPerLevel: 3, requires: { researchId: 'city_planning', level: 8 } },
  { id: 'irrigation_canals', icon: '🏞️', category: 'infrastructure', maxLevel: 40, baseCost: { gold: 150, stone: 120, wood: 80 }, costMultiplier: 1.3, effect: 'Farm output', effectPerLevel: 3, requires: { researchId: 'sanitation', level: 5 } },
  { id: 'mining_engineering', icon: '🏔️', category: 'infrastructure', maxLevel: 40, baseCost: { gold: 180, iron: 150 }, costMultiplier: 1.33, effect: 'Mine output', effectPerLevel: 3, requires: { researchId: 'advanced_masonry', level: 5 } },
  { id: 'harbor_expansion', icon: '⚓', category: 'infrastructure', maxLevel: 30, baseCost: { gold: 250, wood: 200, stone: 150 }, costMultiplier: 1.35, effect: 'Naval trade income', effectPerLevel: 4, requires: { researchId: 'bridge_building', level: 8 } },
  { id: 'underground_tunnels', icon: '🕳️', category: 'infrastructure', maxLevel: 30, baseCost: { gold: 300, stone: 250, iron: 100 }, costMultiplier: 1.38, effect: 'Resource protection', effectPerLevel: 4, requires: { researchId: 'mining_engineering', level: 8 } },
  { id: 'architectural_mastery', icon: '🏯', category: 'infrastructure', maxLevel: 20, baseCost: { gold: 400, stone: 300 }, costMultiplier: 1.4, effect: 'All building effects', effectPerLevel: 2, requires: { researchId: 'advanced_masonry', level: 15 } },
  { id: 'supply_depots', icon: '📦', category: 'infrastructure', maxLevel: 50, baseCost: { gold: 80, wood: 100 }, costMultiplier: 1.25, effect: 'Storage capacity', effectPerLevel: 5 },
  { id: 'watchtower_network', icon: '🗼', category: 'infrastructure', maxLevel: 40, baseCost: { gold: 120, stone: 100 }, costMultiplier: 1.3, effect: 'Scouting range', effectPerLevel: 3, requires: { researchId: 'road_network', level: 8 } },
  { id: 'postal_system', icon: '📮', category: 'infrastructure', maxLevel: 30, baseCost: { gold: 150, wood: 80 }, costMultiplier: 1.3, effect: 'Communication speed', effectPerLevel: 4, requires: { researchId: 'road_network', level: 10 } },
  { id: 'flood_control', icon: '🌊', category: 'infrastructure', maxLevel: 30, baseCost: { gold: 200, stone: 200 }, costMultiplier: 1.33, effect: 'Disaster resistance', effectPerLevel: 5, requires: { researchId: 'irrigation_canals', level: 8 } },
  { id: 'monument_construction', icon: '🗿', category: 'infrastructure', maxLevel: 10, baseCost: { gold: 800, stone: 600, iron: 300 }, costMultiplier: 1.55, effect: 'Realm prestige', effectPerLevel: 10, requires: { researchId: 'architectural_mastery', level: 10 } },

  // ════════════════════ SIEGE (10 items) ════════════════════
  { id: 'battering_rams', icon: '🪵', category: 'siege', maxLevel: 40, baseCost: { gold: 120, wood: 150, iron: 80 }, costMultiplier: 1.3, effect: 'Siege attack', effectPerLevel: 4 },
  { id: 'catapult_design', icon: '🪨', category: 'siege', maxLevel: 40, baseCost: { gold: 150, wood: 120, iron: 100 }, costMultiplier: 1.32, effect: 'Siege range', effectPerLevel: 3, requires: { researchId: 'battering_rams', level: 5 } },
  { id: 'trebuchet_engineering', icon: '💥', category: 'siege', maxLevel: 30, baseCost: { gold: 250, wood: 200, iron: 180 }, costMultiplier: 1.38, effect: 'Siege damage', effectPerLevel: 5, requires: { researchId: 'catapult_design', level: 10 } },
  { id: 'siege_towers', icon: '🗼', category: 'siege', maxLevel: 30, baseCost: { gold: 200, wood: 250, iron: 120 }, costMultiplier: 1.35, effect: 'Wall bypass', effectPerLevel: 4, requires: { researchId: 'catapult_design', level: 8 } },
  { id: 'greek_fire', icon: '🔥', category: 'siege', maxLevel: 20, baseCost: { gold: 400, iron: 250 }, costMultiplier: 1.42, effect: 'Siege burn damage', effectPerLevel: 6, requires: { researchId: 'trebuchet_engineering', level: 8 } },
  { id: 'mining_sappers', icon: '⛏️', category: 'siege', maxLevel: 30, baseCost: { gold: 180, iron: 150 }, costMultiplier: 1.33, effect: 'Wall destruction', effectPerLevel: 3, requires: { researchId: 'battering_rams', level: 8 } },
  { id: 'siege_logistics', icon: '📦', category: 'siege', maxLevel: 40, baseCost: { gold: 100, food: 120 }, costMultiplier: 1.25, effect: 'Siege supply', effectPerLevel: 3 },
  { id: 'fortification_analysis', icon: '🔍', category: 'siege', maxLevel: 30, baseCost: { gold: 200, iron: 100 }, costMultiplier: 1.3, effect: 'Enemy defense reduction', effectPerLevel: 2, requires: { researchId: 'siege_towers', level: 5 } },
  { id: 'war_machines', icon: '⚙️', category: 'siege', maxLevel: 20, baseCost: { gold: 500, iron: 400, wood: 300 }, costMultiplier: 1.45, effect: 'Siege engine power', effectPerLevel: 5, requires: { researchId: 'greek_fire', level: 5 } },
  { id: 'siege_mastery', icon: '🏴', category: 'siege', maxLevel: 10, baseCost: { gold: 800, iron: 600 }, costMultiplier: 1.55, effect: 'All siege effects', effectPerLevel: 5, requires: { researchId: 'war_machines', level: 10 } },

  // ════════════════════ LOGISTICS (10 items) ════════════════════
  { id: 'supply_chain', icon: '🔗', category: 'logistics', maxLevel: 50, baseCost: { gold: 60, food: 80 }, costMultiplier: 1.25, effect: 'March carry capacity', effectPerLevel: 3 },
  { id: 'field_camps', icon: '⛺', category: 'logistics', maxLevel: 40, baseCost: { gold: 100, wood: 80, food: 60 }, costMultiplier: 1.28, effect: 'March healing', effectPerLevel: 3, requires: { researchId: 'supply_chain', level: 5 } },
  { id: 'cartography', icon: '🗺️', category: 'logistics', maxLevel: 40, baseCost: { gold: 120, wood: 50 }, costMultiplier: 1.28, effect: 'Exploration range', effectPerLevel: 4, requires: { researchId: 'supply_chain', level: 8 } },
  { id: 'war_wagons', icon: '🛞', category: 'logistics', maxLevel: 30, baseCost: { gold: 200, wood: 150, iron: 100 }, costMultiplier: 1.33, effect: 'Loot capacity', effectPerLevel: 5, requires: { researchId: 'field_camps', level: 8 } },
  { id: 'messenger_pigeons', icon: '🕊️', category: 'logistics', maxLevel: 30, baseCost: { gold: 80, food: 60 }, costMultiplier: 1.25, effect: 'Rally speed', effectPerLevel: 4 },
  { id: 'weather_reading', icon: '🌤️', category: 'logistics', maxLevel: 30, baseCost: { gold: 150, food: 100 }, costMultiplier: 1.3, effect: 'Weather penalty reduction', effectPerLevel: 5, requires: { researchId: 'cartography', level: 5 } },
  { id: 'forced_march', icon: '🏃', category: 'logistics', maxLevel: 20, baseCost: { gold: 250, food: 200 }, costMultiplier: 1.35, effect: 'Sprint march speed', effectPerLevel: 4, requires: { researchId: 'war_wagons', level: 5 } },
  { id: 'terrain_adaptation', icon: '🏔️', category: 'logistics', maxLevel: 30, baseCost: { gold: 180, stone: 120 }, costMultiplier: 1.3, effect: 'Terrain penalty reduction', effectPerLevel: 4, requires: { researchId: 'weather_reading', level: 5 } },
  { id: 'resource_scavenging', icon: '🔎', category: 'logistics', maxLevel: 40, baseCost: { gold: 100, food: 100 }, costMultiplier: 1.25, effect: 'Post-battle loot', effectPerLevel: 3 },
  { id: 'logistics_mastery', icon: '📊', category: 'logistics', maxLevel: 10, baseCost: { gold: 600, food: 400, iron: 200 }, costMultiplier: 1.5, effect: 'All logistics effects', effectPerLevel: 5, requires: { researchId: 'forced_march', level: 10 } },
];

// ── Troops ──
export const TROOPS: TroopDef[] = [
  { id: 'militia', icon: '🗡️', troopClass: 'infantry', tier: 1,
    attack: 10, defense: 12, health: 100, speed: 5, trainTime: 15,
    cost: { food: 20, iron: 5 } },
  { id: 'swordsman', icon: '⚔️', troopClass: 'infantry', tier: 2,
    attack: 22, defense: 25, health: 200, speed: 5, trainTime: 30,
    cost: { food: 50, iron: 20 },
    unlockRequires: { buildingId: 'barracks', level: 4 } },
  { id: 'guardian', icon: '🛡️', troopClass: 'infantry', tier: 3,
    attack: 40, defense: 50, health: 400, speed: 4, trainTime: 60,
    cost: { food: 100, iron: 50 },
    unlockRequires: { buildingId: 'smithy', level: 3 } },
  { id: 'scout', icon: '🐴', troopClass: 'cavalry', tier: 1,
    attack: 14, defense: 8, health: 80, speed: 10, trainTime: 20,
    cost: { food: 30, wood: 10 } },
  { id: 'knight', icon: '🏇', troopClass: 'cavalry', tier: 2,
    attack: 30, defense: 18, health: 160, speed: 9, trainTime: 40,
    cost: { food: 70, iron: 30 },
    unlockRequires: { buildingId: 'barracks', level: 5 } },
  { id: 'lancer', icon: '🎠', troopClass: 'cavalry', tier: 3,
    attack: 55, defense: 30, health: 320, speed: 8, trainTime: 75,
    cost: { food: 140, iron: 70 },
    unlockRequires: { buildingId: 'smithy', level: 5 } },
  { id: 'archer', icon: '🏹', troopClass: 'ranged', tier: 1,
    attack: 12, defense: 6, health: 70, speed: 6, trainTime: 18,
    cost: { food: 15, wood: 15 } },
  { id: 'crossbow', icon: '🎯', troopClass: 'ranged', tier: 2,
    attack: 28, defense: 14, health: 140, speed: 6, trainTime: 35,
    cost: { food: 40, wood: 30, iron: 10 },
    unlockRequires: { buildingId: 'barracks', level: 4 } },
  { id: 'ballisteer', icon: '💥', troopClass: 'ranged', tier: 3,
    attack: 50, defense: 22, health: 280, speed: 4, trainTime: 70,
    cost: { food: 80, wood: 60, iron: 40 },
    unlockRequires: { buildingId: 'smithy', level: 4 } },
];

// ── Heroes ──
export const HEROES: HeroDef[] = [
  {
    id: 'aelindra', icon: '👑',
    bonus: { type: 'defense', value: 15 },
  },
  {
    id: 'thormund', icon: '⚒️',
    bonus: { type: 'attack', value: 12 },
  },
  {
    id: 'kael', icon: '🗡️',
    bonus: { type: 'speed', value: 20 },
  },
  {
    id: 'mireth', icon: '🌿',
    bonus: { type: 'gathering', value: 25 },
  },
];

// ── Expeditions ──
export const EXPEDITIONS: ExpeditionDef[] = [
  { id: 'goblin_camp', type: 'clear_camp', difficulty: 1, enemyPower: 200, duration: 60,
    rewards: { gold: 50, food: 100 }, icon: '⛺' },
  { id: 'bandit_hold', type: 'clear_camp', difficulty: 2, enemyPower: 500, duration: 120,
    rewards: { gold: 120, iron: 40, food: 80 }, icon: '🏚️' },
  { id: 'ancient_ruins', type: 'clear_camp', difficulty: 3, enemyPower: 1200, duration: 180,
    rewards: { gold: 300, iron: 100, stone: 80 }, icon: '🏛️' },
  { id: 'dark_fortress', type: 'clear_camp', difficulty: 5, enemyPower: 3000, duration: 300,
    rewards: { gold: 800, iron: 200, food: 300 }, icon: '🏴' },
  { id: 'forest_gather', type: 'gather', difficulty: 1, enemyPower: 0, duration: 90,
    rewards: { wood: 200, food: 50 }, icon: '🌳' },
  { id: 'mine_gather', type: 'gather', difficulty: 1, enemyPower: 50, duration: 120,
    rewards: { iron: 80, stone: 120 }, icon: '⛏️' },
  { id: 'village_defend', type: 'defend', difficulty: 2, enemyPower: 600, duration: 90,
    rewards: { gold: 150, food: 200 }, icon: '🏘️' },
  { id: 'outpost_defend', type: 'defend', difficulty: 4, enemyPower: 2000, duration: 150,
    rewards: { gold: 500, iron: 150 }, icon: '🗼' },
];

// ── Helpers ──
export function getBuildingCost(def: BuildingDef, level: number): Partial<Record<string, number>> {
  const result: Record<string, number> = {};
  for (const [key, val] of Object.entries(def.baseCost)) {
    result[key] = Math.floor((val as number) * Math.pow(def.costMultiplier, level));
  }
  return result;
}

export function getResearchCost(def: ResearchDef, level: number): Partial<Record<string, number>> {
  const result: Record<string, number> = {};
  for (const [key, val] of Object.entries(def.baseCost)) {
    result[key] = Math.floor((val as number) * Math.pow(def.costMultiplier, level));
  }
  return result;
}

export function getUpgradeTime(level: number): number {
  // Gentle curve: ~30s at lv1, ~3min at lv10, ~30min at lv20, ~5h at lv30, ~2d at lv40, ~16d at lv50
  return Math.floor(20 * Math.pow(1.25, level));
}

export function getMaxMarchSize(keepLevel: number): number {
  return 50 + keepLevel * 30;
}

export function getProductionRate(def: BuildingDef, level: number, researchBonus: number): number {
  if (!def.baseProduction || level === 0) return 0;
  return def.baseProduction * level * (1 + researchBonus / 100);
}

export function getCounterMultiplier(attacker: string, defender: string): number {
  if (attacker === 'infantry' && defender === 'cavalry') return 1.3;
  if (attacker === 'cavalry' && defender === 'ranged') return 1.3;
  if (attacker === 'ranged' && defender === 'infantry') return 1.3;
  if (attacker === 'infantry' && defender === 'ranged') return 0.8;
  if (attacker === 'cavalry' && defender === 'infantry') return 0.8;
  if (attacker === 'ranged' && defender === 'cavalry') return 0.8;
  return 1.0;
}

export function createInitialState(realmName: string): GameState {
  return {
    realmName,
    resources: { food: 500, wood: 500, stone: 300, iron: 100, gold: 200, diamonds: 50 },
    buildings: BUILDINGS.map(b => ({ id: b.id, level: b.id === 'keep' ? 1 : 0, upgrading: false })),
    research: RESEARCH.map(r => ({ id: r.id, level: 0, researching: false })),
    troops: TROOPS.map(t => ({ id: t.id, count: 0, training: 0 })),
    marches: [],
    unlockedHeroes: ['aelindra'],
    tutorialStep: 0,
    lastTick: Date.now(),
    shards: { light: 0, dark: 0, balance: 0 },
    reputation: 0,
    loyalty: 100,
    factions: [
      { id: 'edain', standing: 0, allianceLevel: 'neutral', tradeRouteActive: false },
      { id: 'eldari', standing: 0, allianceLevel: 'neutral', tradeRouteActive: false },
      { id: 'khazari', standing: 0, allianceLevel: 'neutral', tradeRouteActive: false },
    ],
    mithrilBoostLevel: 0,
    eliteUnlocked: false,
    essenceResearchBonus: 0,
  };
}

export const RESOURCE_ICONS: Record<string, string> = {
  food: '🌾', wood: '🪵', stone: '🪨', iron: '⚙️', gold: '💰', diamonds: '💎',
};

// ── Gear Loot Tables ──
export const GEAR_POOL: Omit<GearItem, 'id'>[] = [
  // Weapons
  { name: 'gear.rusty_sword', slot: 'weapon', rarity: 'common', icon: '🗡️', bonuses: [{ type: 'attack', value: 3 }] },
  { name: 'gear.iron_blade', slot: 'weapon', rarity: 'uncommon', icon: '⚔️', bonuses: [{ type: 'attack', value: 6 }] },
  { name: 'gear.flamebrand', slot: 'weapon', rarity: 'rare', icon: '🔥', bonuses: [{ type: 'attack', value: 10 }, { type: 'speed', value: 3 }] },
  { name: 'gear.shadow_cleaver', slot: 'weapon', rarity: 'ultra_rare', icon: '🌑', bonuses: [{ type: 'attack', value: 15 }, { type: 'health', value: 5 }] },
  { name: 'gear.worldender', slot: 'weapon', rarity: 'legendary', icon: '⚡', bonuses: [{ type: 'attack', value: 25 }, { type: 'speed', value: 8 }] },
  { name: 'gear.godslayer', slot: 'weapon', rarity: 'mythic', icon: '🌟', bonuses: [{ type: 'attack', value: 40 }, { type: 'speed', value: 15 }, { type: 'health', value: 10 }] },
  // Armor
  { name: 'gear.leather_vest', slot: 'armor', rarity: 'common', icon: '🧥', bonuses: [{ type: 'defense', value: 3 }] },
  { name: 'gear.chainmail', slot: 'armor', rarity: 'uncommon', icon: '🛡️', bonuses: [{ type: 'defense', value: 6 }, { type: 'health', value: 2 }] },
  { name: 'gear.dragon_plate', slot: 'armor', rarity: 'rare', icon: '🐉', bonuses: [{ type: 'defense', value: 10 }, { type: 'health', value: 5 }] },
  { name: 'gear.void_aegis', slot: 'armor', rarity: 'ultra_rare', icon: '🌀', bonuses: [{ type: 'defense', value: 18 }, { type: 'health', value: 8 }] },
  { name: 'gear.eternal_bulwark', slot: 'armor', rarity: 'legendary', icon: '🏛️', bonuses: [{ type: 'defense', value: 25 }, { type: 'health', value: 15 }] },
  { name: 'gear.celestial_aegis', slot: 'armor', rarity: 'mythic', icon: '✨', bonuses: [{ type: 'defense', value: 40 }, { type: 'health', value: 25 }, { type: 'speed', value: 5 }] },
  // Accessories
  { name: 'gear.lucky_charm', slot: 'accessory', rarity: 'common', icon: '🍀', bonuses: [{ type: 'gathering', value: 5 }] },
  { name: 'gear.war_pendant', slot: 'accessory', rarity: 'uncommon', icon: '📿', bonuses: [{ type: 'attack', value: 3 }, { type: 'defense', value: 3 }] },
  { name: 'gear.swiftwind_ring', slot: 'accessory', rarity: 'rare', icon: '💍', bonuses: [{ type: 'speed', value: 10 }] },
  { name: 'gear.bloodstone_amulet', slot: 'accessory', rarity: 'ultra_rare', icon: '🔴', bonuses: [{ type: 'attack', value: 8 }, { type: 'health', value: 8 }] },
  { name: 'gear.crown_of_ages', slot: 'accessory', rarity: 'legendary', icon: '👑', bonuses: [{ type: 'attack', value: 10 }, { type: 'defense', value: 10 }, { type: 'health', value: 10 }] },
  { name: 'gear.nexus_eye', slot: 'accessory', rarity: 'mythic', icon: '🔮', bonuses: [{ type: 'attack', value: 15 }, { type: 'defense', value: 15 }, { type: 'health', value: 15 }, { type: 'gathering', value: 20 }] },
];

const RARITY_WEIGHTS: Record<GearRarity, number> = {
  common: 50, uncommon: 30, rare: 14, ultra_rare: 4, legendary: 1.5, mythic: 0.5,
};

export function rollGearDrop(difficulty: number): GearItem | null {
  const dropChance = 0.2 + difficulty * 0.1;
  if (Math.random() > dropChance) return null;

  const weights = { ...RARITY_WEIGHTS };
  weights.common = Math.max(10, weights.common - difficulty * 8);
  weights.uncommon += difficulty * 2;
  weights.rare += difficulty * 3;
  weights.ultra_rare += difficulty * 2;
  weights.legendary += difficulty;
  weights.mythic += difficulty * 0.3;

  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  let selectedRarity: GearRarity = 'common';
  for (const [rarity, weight] of Object.entries(weights) as [GearRarity, number][]) {
    roll -= weight;
    if (roll <= 0) { selectedRarity = rarity; break; }
  }

  const candidates = GEAR_POOL.filter(g => g.rarity === selectedRarity);
  if (candidates.length === 0) return null;
  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  return { ...pick, id: `gear_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` };
}

// ── Gear Crafting Recipes ──
// Each tier requires specific materials; costs scale 5x per tier
export const GEAR_CRAFT_RECIPES: GearCraftRecipe[] = [
  // Common weapons/armor/accessories — basic materials only
  { gearName: 'gear.rusty_sword', slot: 'weapon', rarity: 'common', icon: '🗡️',
    materials: { hide: 2, ore: 3 }, resourceCost: { iron: 50, gold: 20 },
    bonuses: [{ type: 'attack', value: 3 }] },
  { gearName: 'gear.leather_vest', slot: 'armor', rarity: 'common', icon: '🧥',
    materials: { hide: 4, timber: 2 }, resourceCost: { wood: 60, gold: 20 },
    bonuses: [{ type: 'defense', value: 3 }] },
  { gearName: 'gear.lucky_charm', slot: 'accessory', rarity: 'common', icon: '🍀',
    materials: { crystal: 2 }, resourceCost: { gold: 30 },
    bonuses: [{ type: 'gathering', value: 5 }] },
  // Uncommon — 5x base
  { gearName: 'gear.iron_blade', slot: 'weapon', rarity: 'uncommon', icon: '⚔️',
    materials: { ore: 15, crystal: 5 }, resourceCost: { iron: 250, gold: 100 },
    bonuses: [{ type: 'attack', value: 6 }] },
  { gearName: 'gear.chainmail', slot: 'armor', rarity: 'uncommon', icon: '🛡️',
    materials: { hide: 10, ore: 10 }, resourceCost: { iron: 200, gold: 80 },
    bonuses: [{ type: 'defense', value: 6 }, { type: 'health', value: 2 }] },
  { gearName: 'gear.war_pendant', slot: 'accessory', rarity: 'uncommon', icon: '📿',
    materials: { crystal: 10, ore: 5 }, resourceCost: { gold: 150 },
    bonuses: [{ type: 'attack', value: 3 }, { type: 'defense', value: 3 }] },
  // Rare — 25x base, needs creature drops
  { gearName: 'gear.flamebrand', slot: 'weapon', rarity: 'rare', icon: '🔥',
    materials: { ore: 40, crystal: 20, phoenix_feather: 2 }, resourceCost: { iron: 600, gold: 300 },
    bonuses: [{ type: 'attack', value: 10 }, { type: 'speed', value: 3 }] },
  { gearName: 'gear.dragon_plate', slot: 'armor', rarity: 'rare', icon: '🐉',
    materials: { hide: 30, ore: 25, wyrm_fang: 2 }, resourceCost: { iron: 500, gold: 250 },
    bonuses: [{ type: 'defense', value: 10 }, { type: 'health', value: 5 }] },
  { gearName: 'gear.swiftwind_ring', slot: 'accessory', rarity: 'rare', icon: '💍',
    materials: { crystal: 30, phoenix_feather: 1 }, resourceCost: { gold: 400 },
    bonuses: [{ type: 'speed', value: 10 }] },
  // Ultra Rare — 125x base
  { gearName: 'gear.shadow_cleaver', slot: 'weapon', rarity: 'ultra_rare', icon: '🌑',
    materials: { ore: 80, crystal: 40, wyrm_fang: 5, titan_heart: 1 }, resourceCost: { iron: 1500, gold: 800 },
    bonuses: [{ type: 'attack', value: 15 }, { type: 'health', value: 5 }] },
  { gearName: 'gear.void_aegis', slot: 'armor', rarity: 'ultra_rare', icon: '🌀',
    materials: { hide: 60, ore: 50, titan_heart: 2 }, resourceCost: { iron: 1200, gold: 600 },
    bonuses: [{ type: 'defense', value: 18 }, { type: 'health', value: 8 }] },
  { gearName: 'gear.bloodstone_amulet', slot: 'accessory', rarity: 'ultra_rare', icon: '🔴',
    materials: { crystal: 60, wyrm_fang: 3, phoenix_feather: 3 }, resourceCost: { gold: 1000 },
    bonuses: [{ type: 'attack', value: 8 }, { type: 'health', value: 8 }] },
  // Legendary — 625x base
  { gearName: 'gear.worldender', slot: 'weapon', rarity: 'legendary', icon: '⚡',
    materials: { ore: 150, crystal: 80, titan_heart: 3, void_shard: 2 }, resourceCost: { iron: 4000, gold: 2000 },
    bonuses: [{ type: 'attack', value: 25 }, { type: 'speed', value: 8 }] },
  { gearName: 'gear.eternal_bulwark', slot: 'armor', rarity: 'legendary', icon: '🏛️',
    materials: { hide: 120, ore: 100, titan_heart: 3, starfire_ingot: 2 }, resourceCost: { iron: 3500, gold: 1800 },
    bonuses: [{ type: 'defense', value: 25 }, { type: 'health', value: 15 }] },
  { gearName: 'gear.crown_of_ages', slot: 'accessory', rarity: 'legendary', icon: '👑',
    materials: { crystal: 100, phoenix_feather: 5, void_shard: 1 }, resourceCost: { gold: 3000 },
    bonuses: [{ type: 'attack', value: 10 }, { type: 'defense', value: 10 }, { type: 'health', value: 10 }] },
  // Mythic — 3125x base
  { gearName: 'gear.godslayer', slot: 'weapon', rarity: 'mythic', icon: '🌟',
    materials: { ore: 300, crystal: 150, titan_heart: 5, void_shard: 5, primordial_core: 3 }, resourceCost: { iron: 10000, gold: 5000 },
    bonuses: [{ type: 'attack', value: 40 }, { type: 'speed', value: 15 }, { type: 'health', value: 10 }] },
  { gearName: 'gear.celestial_aegis', slot: 'armor', rarity: 'mythic', icon: '✨',
    materials: { hide: 250, ore: 200, titan_heart: 5, starfire_ingot: 5, primordial_core: 3 }, resourceCost: { iron: 8000, gold: 4000 },
    bonuses: [{ type: 'defense', value: 40 }, { type: 'health', value: 25 }, { type: 'speed', value: 5 }] },
  { gearName: 'gear.nexus_eye', slot: 'accessory', rarity: 'mythic', icon: '🔮',
    materials: { crystal: 200, phoenix_feather: 8, void_shard: 3, primordial_core: 2 }, resourceCost: { gold: 8000 },
    bonuses: [{ type: 'attack', value: 15 }, { type: 'defense', value: 15 }, { type: 'health', value: 15 }, { type: 'gathering', value: 20 }] },
];

// ── Gear Upgrade Recipes (each tier costs 5x the previous) ──
export const GEAR_UPGRADE_RECIPES: GearUpgradeRecipe[] = [
  { fromRarity: 'common', toRarity: 'uncommon',
    materials: { hide: 5, ore: 5, timber: 5 }, resourceCost: { gold: 100 }, statMultiplier: 2 },
  { fromRarity: 'uncommon', toRarity: 'rare',
    materials: { ore: 25, crystal: 15, phoenix_feather: 1 }, resourceCost: { gold: 500 }, statMultiplier: 1.7 },
  { fromRarity: 'rare', toRarity: 'ultra_rare',
    materials: { ore: 60, crystal: 40, wyrm_fang: 3, titan_heart: 1 }, resourceCost: { gold: 2500 }, statMultiplier: 1.5 },
  { fromRarity: 'ultra_rare', toRarity: 'legendary',
    materials: { crystal: 80, titan_heart: 3, void_shard: 2, starfire_ingot: 1 }, resourceCost: { gold: 12500 }, statMultiplier: 1.4 },
  { fromRarity: 'legendary', toRarity: 'mythic',
    materials: { crystal: 150, titan_heart: 5, void_shard: 5, starfire_ingot: 3, primordial_core: 2 }, resourceCost: { gold: 62500 }, statMultiplier: 1.6 },
];

// ── Legendary Creatures (huntable on world map) ──
export const LEGENDARY_CREATURES: LegendaryCreature[] = [
  { id: 'phoenix', icon: '🔥', power: 1500, duration: 180,
    materialDrops: [
      { type: 'phoenix_feather', amount: 2, chance: 0.8 },
      { type: 'crystal', amount: 10, chance: 1.0 },
      { type: 'void_shard', amount: 1, chance: 0.15 },
    ], x: 120, y: 150 },
  { id: 'wyrm', icon: '🐲', power: 3000, duration: 240,
    materialDrops: [
      { type: 'wyrm_fang', amount: 3, chance: 0.7 },
      { type: 'ore', amount: 20, chance: 1.0 },
      { type: 'starfire_ingot', amount: 1, chance: 0.2 },
    ], x: 680, y: 120 },
  { id: 'titan', icon: '🗿', power: 5000, duration: 300,
    materialDrops: [
      { type: 'titan_heart', amount: 2, chance: 0.6 },
      { type: 'hide', amount: 30, chance: 1.0 },
      { type: 'primordial_core', amount: 1, chance: 0.1 },
    ], x: 650, y: 450 },
  { id: 'void_wraith', icon: '👻', power: 8000, duration: 360,
    materialDrops: [
      { type: 'void_shard', amount: 2, chance: 0.5 },
      { type: 'primordial_core', amount: 1, chance: 0.25 },
      { type: 'crystal', amount: 25, chance: 1.0 },
    ], x: 150, y: 480 },
  { id: 'celestial_drake', icon: '🌌', power: 12000, duration: 420,
    materialDrops: [
      { type: 'starfire_ingot', amount: 3, chance: 0.6 },
      { type: 'primordial_core', amount: 2, chance: 0.3 },
      { type: 'void_shard', amount: 3, chance: 0.5 },
    ], x: 400, y: 80 },
];

// ── Quest material drops from expeditions ──
export const EXPEDITION_MATERIAL_DROPS: Record<string, { type: CraftingMaterialType; amount: number; chance: number }[]> = {
  goblin_camp: [{ type: 'hide', amount: 3, chance: 0.8 }, { type: 'ore', amount: 2, chance: 0.6 }],
  bandit_hold: [{ type: 'hide', amount: 5, chance: 0.9 }, { type: 'timber', amount: 4, chance: 0.7 }, { type: 'ore', amount: 3, chance: 0.5 }],
  ancient_ruins: [{ type: 'crystal', amount: 5, chance: 0.7 }, { type: 'ore', amount: 8, chance: 0.8 }],
  dark_fortress: [{ type: 'crystal', amount: 10, chance: 0.8 }, { type: 'ore', amount: 12, chance: 0.9 }, { type: 'phoenix_feather', amount: 1, chance: 0.15 }],
  forest_gather: [{ type: 'timber', amount: 5, chance: 1.0 }, { type: 'hide', amount: 2, chance: 0.5 }],
  mine_gather: [{ type: 'ore', amount: 8, chance: 1.0 }, { type: 'crystal', amount: 2, chance: 0.3 }],
  village_defend: [{ type: 'hide', amount: 4, chance: 0.7 }, { type: 'timber', amount: 3, chance: 0.6 }],
  outpost_defend: [{ type: 'ore', amount: 10, chance: 0.8 }, { type: 'crystal', amount: 6, chance: 0.6 }, { type: 'wyrm_fang', amount: 1, chance: 0.1 }],
};

export const CRAFTING_MATERIAL_ICONS: Record<CraftingMaterialType, string> = {
  hide: '🦴', timber: '🪵', ore: '⛏️', crystal: '💎',
  phoenix_feather: '🪶', wyrm_fang: '🦷', titan_heart: '💜',
  void_shard: '🌑', starfire_ingot: '⭐', primordial_core: '🔮',
};

export const RARITY_ORDER: GearRarity[] = ['common', 'uncommon', 'rare', 'ultra_rare', 'legendary', 'mythic'];
