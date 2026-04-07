// ── Jade Economy Types ──

export type JadeRarity = 'rough' | 'polished' | 'refined' | 'gilded' | 'sovereign' | 'imperial' | 'singularity';

export type JadeStoreCategory =
  | 'vault_packs'
  | 'sovereign_packs'
  | 'artisan_tools'
  | 'atelier_access'
  | 'blueprint_packs'
  | 'prestige_cosmetics'
  | 'fractional_ownership'
  | 'event_packs'
  | 'whale_packs'
  | 'beginner_packs'
  | 'utility_packs'
  | 'subscription_passes'
  | 'sculpting_accessories'
  | 'master_materials'
  | 'guild_packs'
  | 'prestige_titles';

export type PriceTier = 'micro' | 'entry' | 'core' | 'mid' | 'elite' | 'whale' | 'absurd';

export type CurrencyType = 'diamonds' | 'jade_dust' | 'ton' | 'stars' | 'usd';

export interface JadePackReward {
  name: string;
  icon: string;
  rarity: JadeRarity;
  quantity: number;
  guaranteed: boolean;
  /** Weight for chance-based items (0-100) */
  weight?: number;
}

export interface JadePackScores {
  visual_desirability: number;
  perceived_value: number;
  real_margin: number;
  beginner_friendliness: number;
  collector_appeal: number;
  whale_appeal: number;
  urgency_strength: number;
  prestige_strength: number;
  retention_contribution: number;
  overall_attractiveness: number;
}

export interface JadePack {
  id: string;
  name: string;
  subtitle: string;
  category: JadeStoreCategory;
  rarity: JadeRarity;
  priceTier: PriceTier;
  /** Display price in diamonds (premium currency) */
  priceDiamonds: number;
  /** Optional USD equivalent for premium packs */
  priceUsd?: number;
  icon: string;
  visualTheme: string;
  coreRewards: JadePackReward[];
  bonusRewards?: JadePackReward[];
  pityContribution: number;
  targetSegment: string;
  purchaseLimit?: number;
  rotationType: 'permanent' | 'weekly' | 'event' | 'seasonal' | 'flash';
  availabilityHours?: number;
  // Admin flags
  bestValue: boolean;
  mostPopular: boolean;
  featured: boolean;
  isLimited: boolean;
  isNew: boolean;
  seasonal?: string;
  scores: JadePackScores;
  emotionalHook: string;
  adminNotes: string;
}

export interface PityState {
  totalPulls: number;
  pullsSinceLastElite: number;
  pullsSinceLastSovereign: number;
  /** Pity guarantees elite at this threshold */
  elitePityThreshold: number;
  /** Pity guarantees sovereign at this threshold */
  sovereignPityThreshold: number;
}

export const JADE_RARITY_CONFIG: Record<JadeRarity, { label: string; color: string; glow: string; bgClass: string }> = {
  rough: { label: 'Rough', color: 'hsl(120,15%,50%)', glow: 'none', bgClass: 'bg-muted/60' },
  polished: { label: 'Polished', color: 'hsl(140,30%,55%)', glow: '0 0 6px hsl(140,30%,55%/0.3)', bgClass: 'bg-emerald-900/30' },
  refined: { label: 'Refined', color: 'hsl(155,50%,50%)', glow: '0 0 12px hsl(155,50%,50%/0.4)', bgClass: 'bg-emerald-800/40' },
  gilded: { label: 'Gilded', color: 'hsl(45,80%,55%)', glow: '0 0 16px hsl(45,80%,55%/0.5)', bgClass: 'bg-amber-900/30' },
  sovereign: { label: 'Sovereign', color: 'hsl(35,90%,60%)', glow: '0 0 24px hsl(35,90%,60%/0.5)', bgClass: 'bg-amber-800/40' },
  imperial: { label: 'Imperial', color: 'hsl(280,60%,65%)', glow: '0 0 30px hsl(280,60%,65%/0.5)', bgClass: 'bg-purple-900/40' },
  singularity: { label: 'Singularity', color: 'hsl(200,80%,70%)', glow: '0 0 40px hsl(200,80%,70%/0.6)', bgClass: 'bg-cyan-900/30' },
};

export const CATEGORY_META: Record<JadeStoreCategory, { label: string; icon: string; description: string }> = {
  vault_packs: { label: 'Jade Vault', icon: '🏛️', description: 'Core jade block reveals and vault keys' },
  sovereign_packs: { label: 'Sovereign Reserve', icon: '👑', description: 'Reserve-backed prestige bundles' },
  artisan_tools: { label: 'Artisan Tools', icon: '⚒️', description: 'Carving precision and polish enhancers' },
  atelier_access: { label: 'Atelier Access', icon: '🎨', description: 'Premium workshop and studio unlocks' },
  blueprint_packs: { label: 'Blueprints', icon: '📐', description: 'Design rights and reproduction passes' },
  prestige_cosmetics: { label: 'Prestige', icon: '✨', description: 'Exclusive cosmetics and status effects' },
  fractional_ownership: { label: 'Fractional', icon: '📊', description: 'Share-based exposure to elite jade' },
  event_packs: { label: 'Events', icon: '🔥', description: 'Limited-time seasonal offerings' },
  whale_packs: { label: 'Collector Reserve', icon: '🐋', description: 'Ultra-premium prestige packages' },
  beginner_packs: { label: 'Welcome', icon: '🌱', description: 'First-timer onboarding offers' },
  utility_packs: { label: 'Recovery', icon: '🔧', description: 'Fracture repair and session recovery' },
  subscription_passes: { label: 'Passes', icon: '🎫', description: 'Recurring membership and stipends' },
  sculpting_accessories: { label: 'Sculpting Gear', icon: '🪚', description: 'Specialized sculpting accessories and attachments' },
  master_materials: { label: 'Master Materials', icon: '🧱', description: 'Rare raw materials for advanced crafting' },
  guild_packs: { label: 'Guild Packs', icon: '⚔️', description: 'Group benefits and guild treasury items' },
  prestige_titles: { label: 'Titles & Ranks', icon: '🏆', description: 'Exclusive titles, ranks, and status markers' },
};
