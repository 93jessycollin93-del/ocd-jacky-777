// ── Resource types ──
export type ResourceType = 'food' | 'wood' | 'stone' | 'iron' | 'gold' | 'diamonds';

export interface Resources {
  food: number;
  wood: number;
  stone: number;
  iron: number;
  gold: number;
  diamonds: number;
}

// ── Buildings ──
export interface BuildingDef {
  id: string;
  icon: string;
  maxLevel: number;
  produces?: ResourceType;
  baseProduction?: number;
  baseCost: Partial<Resources>;
  costMultiplier: number;
  unlockRequires?: { buildingId: string; level: number };
}

export interface BuildingState {
  id: string;
  level: number;
  upgrading: boolean;
  upgradeEndTime?: number;
}

// ── Research ──
export type ResearchCategory = 'economy' | 'military' | 'arcane' | 'infrastructure' | 'siege' | 'logistics';

export interface ResearchDef {
  id: string;
  icon: string;
  category: ResearchCategory;
  maxLevel: number;
  baseCost: Partial<Resources>;
  costMultiplier: number;
  effect: string;
  effectPerLevel: number;
  requires?: { researchId: string; level: number };
}

export interface ResearchState {
  id: string;
  level: number;
  researching: boolean;
  researchEndTime?: number;
}

// ── Troops ──
export type TroopClass = 'infantry' | 'cavalry' | 'ranged';

export interface TroopDef {
  id: string;
  icon: string;
  troopClass: TroopClass;
  tier: number;
  attack: number;
  defense: number;
  health: number;
  speed: number;
  trainTime: number;
  cost: Partial<Resources>;
  unlockRequires?: { buildingId: string; level: number };
}

export interface TroopState {
  id: string;
  count: number;
  training: number;
  trainingEndTime?: number;
}

// ── Equipment ──
export type GearSlot = 'weapon' | 'armor' | 'accessory';
export type GearRarity = 'common' | 'uncommon' | 'rare' | 'ultra_rare' | 'legendary' | 'mythic';

export type CraftingMaterialType =
  | 'hide' | 'timber' | 'ore' | 'crystal'
  | 'phoenix_feather' | 'wyrm_fang' | 'titan_heart'
  | 'void_shard' | 'starfire_ingot' | 'primordial_core';

export interface GearItem {
  id: string;
  name: string;
  slot: GearSlot;
  rarity: GearRarity;
  icon: string;
  bonuses: { type: 'attack' | 'defense' | 'health' | 'speed' | 'gathering'; value: number }[];
  sourceExpedition?: string;
}

export interface GearCraftRecipe {
  gearName: string;
  slot: GearSlot;
  rarity: GearRarity;
  icon: string;
  materials: Partial<Record<CraftingMaterialType, number>>;
  resourceCost: Partial<Resources>;
  bonuses: { type: 'attack' | 'defense' | 'health' | 'speed' | 'gathering'; value: number }[];
}

export interface GearUpgradeRecipe {
  fromRarity: GearRarity;
  toRarity: GearRarity;
  materials: Partial<Record<CraftingMaterialType, number>>;
  resourceCost: Partial<Resources>;
  statMultiplier: number;
}

export interface LegendaryCreature {
  id: string;
  icon: string;
  power: number;
  duration: number;
  materialDrops: { type: CraftingMaterialType; amount: number; chance: number }[];
  x: number;
  y: number;
}

export interface CreatureHunt {
  creatureId: string;
  troops: { troopId: string; count: number }[];
  heroId?: string;
  startTime: number;
  endTime: number;
  completed: boolean;
  result?: {
    victory: boolean;
    materialsGained: { type: CraftingMaterialType; amount: number }[];
    losses: { troopId: string; lost: number }[];
  };
}

// ── Heroes ──
export interface HeroDef {
  id: string;
  icon: string;
  bonus: {
    type: 'attack' | 'defense' | 'health' | 'speed' | 'gathering' | 'training';
    value: number;
  };
}

// ── Expeditions ──
export type ExpeditionType = 'clear_camp' | 'gather' | 'defend';

export interface ExpeditionDef {
  id: string;
  type: ExpeditionType;
  difficulty: number;
  enemyPower: number;
  duration: number;
  rewards: Partial<Resources>;
  icon: string;
}

export type MarchSpeed = 'cautious' | 'standard' | 'forced' | 'sprint';
export type MarchFormation = 'line' | 'wedge' | 'shield_wall' | 'scattered';

export interface March {
  id: string;
  expeditionId: string;
  heroId?: string;
  troops: { troopId: string; count: number }[];
  speed: MarchSpeed;
  formation: MarchFormation;
  startTime: number;
  endTime: number;
  completed: boolean;
  result?: BattleReport;
}

// ── Combat ──
export interface BattleReport {
  victory: boolean;
  playerPower: number;
  enemyPower: number;
  losses: { troopId: string; lost: number }[];
  rewards: Partial<Resources>;
  modifiers: { source: string; value: number }[];
}

// ── Diplomacy ──
export type FactionId = 'edain' | 'eldari' | 'khazari';
export type AllianceLevel = 'neutral' | 'friendly' | 'allied' | 'bonded';

export interface FactionState {
  id: FactionId;
  standing: number;
  allianceLevel: AllianceLevel;
  tradeRouteActive: boolean;
}

// ── Bag System ──
export type BagCategory = 'speedups' | 'resources' | 'nfts' | 'boosts' | 'equipment' | 'shields' | 'notes' | 'teleports' | 'scouting' | 'healing' | 'war' | 'vip' | 'talents' | 'cosmetics' | 'guild' | 'special';

export interface BagItem {
  id: string;
  name: string;
  icon: string;
  category: BagCategory;
  rarity: GearRarity;
  quantity: number;
  description: string;
  value?: number;
  resourceType?: string;
  duration?: number;
  obtainedAt?: number;
  nftTokenId?: string;
}

export interface BattlePlanNote {
  id: string;
  title: string;
  content: string;
  color: string;
  layout: 'simple' | 'checklist' | 'grid';
  createdAt: number;
  updatedAt: number;
  isShared: boolean;
}

// ── Game State ──
export interface RareMaterials {
  essence: number;
  arcane_dust: number;
  mithril: number;
  dragon_scale: number;
}

export interface AIEventLog {
  id: string;
  title: string;
  description: string;
  effect: string;
  resourceChanges?: Partial<Resources>;
  timestamp: number;
}

export interface GameState {
  realmName: string;
  resources: Resources;
  buildings: BuildingState[];
  research: ResearchState[];
  troops: TroopState[];
  marches: March[];
  unlockedHeroes: string[];
  tutorialStep: number;
  lastTick: number;
  shards?: { light: number; dark: number; balance: number };
  reputation?: number;
  loyalty?: number;
  rareMaterials?: RareMaterials;
  factions?: FactionState[];
  mithrilBoostLevel?: number;
  eliteUnlocked?: boolean;
  essenceResearchBonus?: number;
  gearInventory?: GearItem[];
  heroEquipment?: Record<string, { weapon?: string; armor?: string; accessory?: string }>;
  craftingMaterials?: Partial<Record<CraftingMaterialType, number>>;
  creatureHunts?: CreatureHunt[];
  musicTiers?: Record<string, string>;
  aiEventLog?: AIEventLog[];
  gachaInventory?: GachaItem[];
  gachaPity?: Record<string, number>;
  gachaHistory?: GachaPull[];
  telegramStars?: number;
  lastFreePull?: number;
  battlePass?: BattlePassState;
  bag?: BagItem[];
  battlePlans?: BattlePlanNote[];
  guildBank?: GuildBankState;
  actionHistory?: ActionRecord[];
  aiAdaptation?: AIAdaptation;
}

// ── AI Adaptation System ──
export type PlayerActionType =
  | 'upgrade_building' | 'start_research' | 'train_troops'
  | 'send_march' | 'craft_resources' | 'exchange_resources'
  | 'gift_faction' | 'craft_gear' | 'upgrade_gear'
  | 'creature_hunt' | 'gacha_pull' | 'stability_invest';

export interface ActionRecord {
  type: PlayerActionType;
  timestamp: number;
}

export interface AIAdaptation {
  level: number;
  counterStrategyBias: number;
  reactionSpeed: number;
  aggressionModifier: number;
}

// ── Guild Roles ──
export type GuildRole = 'leader' | 'steward' | 'strategist' | 'builder' | 'quartermaster' | 'member';

export interface GuildMember {
  id: string;
  name: string;
  role: GuildRole;
  joinedAt: number;
  lastActive: number;
  stabilityContribution: number;
}

export interface StabilityBeacon {
  level: number;
  progress: number;
  contributors: { memberId: string; amount: number }[];
  collectiveBonus: number;
}

export interface GuildBankState {
  funds: Partial<Resources>;
  taxRate: number;
  boosts: GuildBoost[];
  isLeader: boolean;
  playerRole: GuildRole;
  members: GuildMember[];
  stabilityBeacon: StabilityBeacon;
  log: GuildBankLog[];
}

export interface GuildBoost {
  id: string;
  name: string;
  description: string;
  cost: Partial<Resources>;
  effect: string;
  duration: number;
  activeUntil?: number;
}

export interface GuildBankLog {
  id: string;
  type: 'deposit' | 'withdraw' | 'boost' | 'tax';
  amount: Partial<Resources>;
  description: string;
  timestamp: number;
}

// ── Gacha System ──
export type GachaItemCategory = 'collectible' | 'consumable' | 'hero_skin' | 'enhancement' | 'currency';

export interface GachaItem {
  id: string;
  name: string;
  icon: string;
  category: GachaItemCategory;
  rarity: GearRarity;
  description: string;
  effect?: GachaEffect;
  quantity: number;
  obtainedAt: number;
  bannerId?: string;
  isLimited?: boolean;
  expiresAt?: number;
}

export interface GachaEffect {
  type: 'resource_boost' | 'attack_buff' | 'defense_buff' | 'speed_buff' | 'gathering_buff' 
    | 'xp_boost' | 'shield' | 'teleport' | 'instant_resource' | 'hero_appearance' | 'cosmetic';
  value: number;
  duration?: number;
  target?: string;
}

export interface GachaBanner {
  id: string;
  name: string;
  icon: string;
  description: string;
  theme: string;
  pool: GachaBannerItem[];
  costType: 'gold' | 'ton' | 'stars' | 'diamonds';
  costSingle: number;
  costMulti: number;
  pityThreshold: number;
  pityItem: GachaBannerItem;
  startsAt: number;
  endsAt: number;
  featured: boolean;
}

export interface GachaBannerItem {
  name: string;
  icon: string;
  category: GachaItemCategory;
  rarity: GearRarity;
  description: string;
  effect?: GachaEffect;
  weight: number;
  isLimited?: boolean;
}

export interface GachaPull {
  id: string;
  bannerId: string;
  item: GachaItem;
  timestamp: number;
  pityCount: number;
}

// ── Battle Pass ──
export interface BattlePassReward {
  tier: number;
  name: string;
  icon: string;
  description: string;
  type: 'free' | 'premium';
  effect?: GachaEffect;
  category: GachaItemCategory;
  rarity: GearRarity;
}

export interface BattlePassState {
  season: number;
  xp: number;
  tier: number;
  isPremium: boolean;
  claimedFree: number[];
  claimedPremium: number[];
  seasonStartedAt: number;
}
