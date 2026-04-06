// ── Creature System Types & Logic ──

export type CreatureSpecies = 'dragon' | 'phoenix' | 'serpent' | 'wolf' | 'eagle' | 'panther' | 'bear' | 'stag' | 'hawk' | 'rex';

export type CreatureRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';

export interface CreatureStats {
  strength: number;    // 1-100
  agility: number;
  intelligence: number;
  endurance: number;
  charisma: number;
  luck: number;
}

export interface CreatureColor {
  primary: string;   // HSL
  secondary: string;
  accent: string;
  eyeColor: string;
  pattern: 'solid' | 'striped' | 'spotted' | 'gradient' | 'crystalline' | 'ethereal';
}

export interface CreatureMutation {
  id: string;
  name: string;
  description: string;
  statModifier: Partial<CreatureStats>;
  rarity: CreatureRarity;
  visual: string; // CSS effect descriptor
  generation: number;
}

export interface CreatureLineage {
  parentA?: string; // creature ID
  parentB?: string;
  generation: number;
  birthDate: number;
  breeder?: string;
}

export interface Creature {
  id: string;
  name: string;
  species: CreatureSpecies;
  rarity: CreatureRarity;
  stats: CreatureStats;
  colors: CreatureColor;
  mutations: CreatureMutation[];
  lineage: CreatureLineage;
  level: number;
  experience: number;
  bond: number; // 0-100, emotional attachment
  isRetired: boolean;
  retiredAt?: number;
  legacyNftId?: string;
  biography: string[];
  achievements: string[];
  createdAt: number;
}

export interface BreedingResult {
  child: Creature;
  inheritedMutations: CreatureMutation[];
  newMutations: CreatureMutation[];
  dominantParent: 'A' | 'B';
}

// ── Species metadata ──
export const SPECIES_META: Record<CreatureSpecies, { label: string; icon: string; baseStats: CreatureStats; description: string }> = {
  dragon: { label: 'Dragon', icon: '🐉', description: 'Ancient fire-breather', baseStats: { strength: 80, agility: 50, intelligence: 70, endurance: 75, charisma: 60, luck: 40 } },
  phoenix: { label: 'Phoenix', icon: '🔥', description: 'Eternal flame spirit', baseStats: { strength: 50, agility: 70, intelligence: 80, endurance: 60, charisma: 80, luck: 55 } },
  serpent: { label: 'Serpent', icon: '🐍', description: 'Venomous wisdom keeper', baseStats: { strength: 55, agility: 85, intelligence: 75, endurance: 50, charisma: 45, luck: 60 } },
  wolf: { label: 'Wolf', icon: '🐺', description: 'Pack alpha predator', baseStats: { strength: 70, agility: 75, intelligence: 60, endurance: 80, charisma: 55, luck: 45 } },
  eagle: { label: 'Eagle', icon: '🦅', description: 'Sky sovereign', baseStats: { strength: 55, agility: 90, intelligence: 65, endurance: 55, charisma: 70, luck: 50 } },
  panther: { label: 'Panther', icon: '🐆', description: 'Shadow stalker', baseStats: { strength: 65, agility: 90, intelligence: 55, endurance: 60, charisma: 65, luck: 50 } },
  bear: { label: 'Bear', icon: '🐻', description: 'Mountain guardian', baseStats: { strength: 90, agility: 35, intelligence: 50, endurance: 95, charisma: 40, luck: 35 } },
  stag: { label: 'Stag', icon: '🦌', description: 'Forest noble', baseStats: { strength: 50, agility: 70, intelligence: 55, endurance: 65, charisma: 85, luck: 60 } },
  hawk: { label: 'Hawk', icon: '🦅', description: 'Precision hunter', baseStats: { strength: 45, agility: 95, intelligence: 70, endurance: 45, charisma: 55, luck: 65 } },
  rex: { label: 'Rex', icon: '🦖', description: 'Prehistoric apex', baseStats: { strength: 95, agility: 30, intelligence: 35, endurance: 90, charisma: 50, luck: 30 } },
};

const RARITY_ORDER: CreatureRarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];
export const RARITY_CONFIG: Record<CreatureRarity, { label: string; color: string; glow: string }> = {
  common: { label: 'Common', color: 'hsl(0, 0%, 60%)', glow: 'none' },
  uncommon: { label: 'Uncommon', color: 'hsl(120, 40%, 50%)', glow: '0 0 8px hsl(120,40%,50%/0.3)' },
  rare: { label: 'Rare', color: 'hsl(210, 70%, 55%)', glow: '0 0 12px hsl(210,70%,55%/0.4)' },
  epic: { label: 'Epic', color: 'hsl(280, 60%, 55%)', glow: '0 0 16px hsl(280,60%,55%/0.5)' },
  legendary: { label: 'Legendary', color: 'hsl(45, 90%, 55%)', glow: '0 0 24px hsl(45,90%,55%/0.5)' },
  mythic: { label: 'Mythic', color: 'hsl(0, 80%, 60%)', glow: '0 0 30px hsl(0,80%,60%/0.6)' },
};

// ── Possible mutations ──
const MUTATION_POOL: Omit<CreatureMutation, 'id' | 'generation'>[] = [
  { name: 'Iron Hide', description: 'Toughened exterior plating', statModifier: { endurance: 15, agility: -5 }, rarity: 'uncommon', visual: 'metallic-sheen' },
  { name: 'Shadow Veil', description: 'Near-invisible in darkness', statModifier: { agility: 12, charisma: -3 }, rarity: 'rare', visual: 'shadow-pulse' },
  { name: 'Crystal Eyes', description: 'Enhanced perception', statModifier: { intelligence: 10, luck: 5 }, rarity: 'rare', visual: 'crystal-glow' },
  { name: 'Ember Blood', description: 'Internal fire resistance', statModifier: { strength: 8, endurance: 8 }, rarity: 'epic', visual: 'ember-veins' },
  { name: 'Void Touch', description: 'Reality-bending presence', statModifier: { intelligence: 15, charisma: 10, endurance: -8 }, rarity: 'legendary', visual: 'void-aura' },
  { name: 'Star Marrow', description: 'Cosmic energy infusion', statModifier: { strength: 12, intelligence: 12, luck: 10 }, rarity: 'mythic', visual: 'star-particles' },
  { name: 'Jade Core', description: 'Sacred jade crystallization', statModifier: { endurance: 20, charisma: 15, agility: -10 }, rarity: 'legendary', visual: 'jade-pulse' },
  { name: 'Storm Nerves', description: 'Lightning-fast reflexes', statModifier: { agility: 18, luck: 5, endurance: -5 }, rarity: 'epic', visual: 'electric-arcs' },
];

// ── Breeding logic ──
function clampStat(val: number): number { return Math.max(1, Math.min(100, Math.round(val))); }

function generateColor(parentA?: CreatureColor, parentB?: CreatureColor): CreatureColor {
  if (!parentA || !parentB) {
    const hue = Math.random() * 360;
    return {
      primary: `hsl(${hue}, ${50 + Math.random() * 30}%, ${40 + Math.random() * 20}%)`,
      secondary: `hsl(${(hue + 30 + Math.random() * 60) % 360}, ${40 + Math.random() * 30}%, ${35 + Math.random() * 20}%)`,
      accent: `hsl(${(hue + 120 + Math.random() * 60) % 360}, ${60 + Math.random() * 30}%, ${50 + Math.random() * 20}%)`,
      eyeColor: `hsl(${Math.random() * 360}, 80%, 55%)`,
      pattern: (['solid', 'striped', 'spotted', 'gradient', 'crystalline', 'ethereal'] as const)[Math.floor(Math.random() * 6)],
    };
  }
  // Inherit with slight mutation
  const mix = (a: string, b: string) => Math.random() > 0.5 ? a : b;
  return {
    primary: mix(parentA.primary, parentB.primary),
    secondary: mix(parentA.secondary, parentB.secondary),
    accent: Math.random() > 0.9 ? `hsl(${Math.random() * 360}, 70%, 55%)` : mix(parentA.accent, parentB.accent),
    eyeColor: Math.random() > 0.8 ? `hsl(${Math.random() * 360}, 80%, 55%)` : mix(parentA.eyeColor, parentB.eyeColor),
    pattern: Math.random() > 0.85
      ? (['solid', 'striped', 'spotted', 'gradient', 'crystalline', 'ethereal'] as const)[Math.floor(Math.random() * 6)]
      : mix(parentA.pattern, parentB.pattern) as CreatureColor['pattern'],
  };
}

function rollMutations(generation: number): CreatureMutation[] {
  const mutations: CreatureMutation[] = [];
  // Mutations are EXTREMELY rare — players need hundreds of breeding cycles
  // Base chance starts at 0.3% per mutation slot, scaling very slowly with generation
  // Even at gen 50+, max chance per slot is only ~3% for common mutations
  const baseMutChance = Math.min(0.03, 0.003 + generation * 0.0005);
  
  // Rarity multipliers make higher-tier mutations astronomically rare
  const RARITY_MULT: Record<string, number> = {
    uncommon: 1.0,      // full base chance
    rare: 0.4,          // 40% of base
    epic: 0.12,         // 12% of base
    legendary: 0.03,    // 3% of base  
    mythic: 0.008,      // 0.8% of base — truly mythic
  };

  for (const m of MUTATION_POOL) {
    const rarityMult = RARITY_MULT[m.rarity] ?? 0.5;
    const chance = baseMutChance * rarityMult;
    if (Math.random() < chance) {
      mutations.push({ ...m, id: `mut_${Date.now()}_${Math.random().toString(36).slice(2)}`, generation });
    }
  }
  return mutations.slice(0, 2); // Max 2 new mutations per breed
}

function determineRarity(stats: CreatureStats, mutations: CreatureMutation[]): CreatureRarity {
  const total = Object.values(stats).reduce((a, b) => a + b, 0);
  const mutBonus = mutations.length * 50;
  const score = total + mutBonus;
  if (score > 550) return 'mythic';
  if (score > 480) return 'legendary';
  if (score > 400) return 'epic';
  if (score > 340) return 'rare';
  if (score > 280) return 'uncommon';
  return 'common';
}

export function createCreature(species: CreatureSpecies, name: string): Creature {
  const base = SPECIES_META[species].baseStats;
  const stats: CreatureStats = {
    strength: clampStat(base.strength + (Math.random() - 0.5) * 20),
    agility: clampStat(base.agility + (Math.random() - 0.5) * 20),
    intelligence: clampStat(base.intelligence + (Math.random() - 0.5) * 20),
    endurance: clampStat(base.endurance + (Math.random() - 0.5) * 20),
    charisma: clampStat(base.charisma + (Math.random() - 0.5) * 20),
    luck: clampStat(base.luck + (Math.random() - 0.5) * 20),
  };
  const mutations = rollMutations(0);
  for (const m of mutations) {
    for (const [k, v] of Object.entries(m.statModifier)) {
      stats[k as keyof CreatureStats] = clampStat(stats[k as keyof CreatureStats] + (v ?? 0));
    }
  }
  return {
    id: `creature_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name,
    species,
    rarity: determineRarity(stats, mutations),
    stats,
    colors: generateColor(),
    mutations,
    lineage: { generation: 0, birthDate: Date.now() },
    level: 1,
    experience: 0,
    bond: 10,
    isRetired: false,
    biography: [`Born in the wilds as a ${species}. A new journey begins.`],
    achievements: [],
    createdAt: Date.now(),
  };
}

export function breedCreatures(parentA: Creature, parentB: Creature): BreedingResult {
  const gen = Math.max(parentA.lineage.generation, parentB.lineage.generation) + 1;
  const dominant = Math.random() > 0.5 ? 'A' : 'B';
  const dom = dominant === 'A' ? parentA : parentB;
  const rec = dominant === 'A' ? parentB : parentA;

  const stats: CreatureStats = {
    strength: clampStat(dom.stats.strength * 0.6 + rec.stats.strength * 0.4 + (Math.random() - 0.5) * 15),
    agility: clampStat(dom.stats.agility * 0.6 + rec.stats.agility * 0.4 + (Math.random() - 0.5) * 15),
    intelligence: clampStat(dom.stats.intelligence * 0.6 + rec.stats.intelligence * 0.4 + (Math.random() - 0.5) * 15),
    endurance: clampStat(dom.stats.endurance * 0.6 + rec.stats.endurance * 0.4 + (Math.random() - 0.5) * 15),
    charisma: clampStat(dom.stats.charisma * 0.6 + rec.stats.charisma * 0.4 + (Math.random() - 0.5) * 15),
    luck: clampStat(dom.stats.luck * 0.6 + rec.stats.luck * 0.4 + (Math.random() - 0.5) * 15),
  };

  // Mutation inheritance is rare — only ~15% chance per parent mutation carries forward
  // This means even established mutation lines can be lost, requiring careful multi-gen breeding
  const inherited = [...parentA.mutations, ...parentB.mutations]
    .filter(() => Math.random() < 0.15)
    .slice(0, 1); // Max 1 inherited mutation per breed
  const newMuts = rollMutations(gen);
  const allMuts = [...inherited, ...newMuts];

  for (const m of allMuts) {
    for (const [k, v] of Object.entries(m.statModifier)) {
      stats[k as keyof CreatureStats] = clampStat(stats[k as keyof CreatureStats] + (v ?? 0));
    }
  }

  const child: Creature = {
    id: `creature_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: `${parentA.name.slice(0, 3)}${parentB.name.slice(-3)}`,
    species: Math.random() > 0.5 ? parentA.species : parentB.species,
    rarity: determineRarity(stats, allMuts),
    stats,
    colors: generateColor(parentA.colors, parentB.colors),
    mutations: allMuts,
    lineage: { parentA: parentA.id, parentB: parentB.id, generation: gen, birthDate: Date.now() },
    level: 1,
    experience: 0,
    bond: 5,
    isRetired: false,
    biography: [`Born from the union of ${parentA.name} and ${parentB.name}. Generation ${gen}.`],
    achievements: [],
    createdAt: Date.now(),
  };

  return { child, inheritedMutations: inherited, newMutations: newMuts, dominantParent: dominant };
}

// ── Creature → Card Conversion ──
// Maps creature species to card element
const SPECIES_ELEMENT: Record<CreatureSpecies, string> = {
  dragon: 'fire', phoenix: 'fire', serpent: 'water', wolf: 'shadow',
  eagle: 'air', panther: 'shadow', bear: 'earth', stag: 'light',
  hawk: 'air', rex: 'earth',
};

const CREATURE_RARITY_TO_CARD: Record<CreatureRarity, string> = {
  common: 'common', uncommon: 'uncommon', rare: 'rare',
  epic: 'epic', legendary: 'legendary', mythic: 'mythic',
};

/**
 * Convert a Creature into a CardDef for the Card Arena.
 * Stats map: strength→power, endurance→guard, intelligence→abilityValue
 * Mutations become keywords. Element derived from species.
 */
export function creatureToCard(creature: Creature): {
  id: string; name: string; type: 'unit'; element: string; rarity: string;
  cost: number; power: number; guard: number; ability: string; abilityDesc: string;
  abilityValue: number; art: string; lane: string; keywords: string[]; faction: string;
} {
  const totalStats = Object.values(creature.stats).reduce((a, b) => a + b, 0);
  const cost = Math.max(1, Math.min(10, Math.round(totalStats / 80)));
  const power = Math.max(1, Math.round(creature.stats.strength / 12));
  const guard = Math.max(1, Math.round(creature.stats.endurance / 15));
  const abilityValue = Math.round(creature.stats.intelligence / 20);

  const keywords: string[] = [];
  const abilityParts: string[] = [];

  if (creature.stats.agility > 70) { keywords.push('swift'); abilityParts.push('Swift strike'); }
  if (creature.stats.charisma > 70) { keywords.push('inspire'); abilityParts.push('+1P to adjacent allies'); }
  if (creature.stats.luck > 60) { keywords.push('lucky'); abilityParts.push('+10% crit'); }
  for (const m of creature.mutations.slice(0, 2)) {
    keywords.push(m.name.toLowerCase().replace(/\s/g, '_'));
    abilityParts.push(m.description);
  }

  const lane = creature.stats.strength > creature.stats.agility ? 'front'
    : creature.stats.intelligence > creature.stats.agility ? 'back' : 'mid';

  const abilityName = creature.mutations.length > 0
    ? creature.mutations[0].name
    : `${SPECIES_META[creature.species].label} Instinct`;

  return {
    id: `bred_${creature.id}`,
    name: creature.name,
    type: 'unit',
    element: SPECIES_ELEMENT[creature.species],
    rarity: CREATURE_RARITY_TO_CARD[creature.rarity],
    cost,
    power,
    guard,
    ability: abilityName,
    abilityDesc: abilityParts.join('. ') || 'No special ability',
    abilityValue,
    art: SPECIES_META[creature.species].icon,
    lane,
    keywords,
    faction: 'Bred',
  };
}
