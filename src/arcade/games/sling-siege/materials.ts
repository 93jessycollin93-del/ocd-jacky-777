// What things are made of in Sling Siege: block materials, the pebble critters you launch and the
// grumblers you are after. Numbers are tuned together with physics.ts (metres, seconds, kg per m²).

export type MatId = "wood" | "stone" | "glass" | "ice" | "tnt" | "rock";

export interface Material {
  id: MatId;
  name: string;
  /** kg per square metre; 0 for indestructible scenery. */
  density: number;
  friction: number;
  restitution: number;
  /** Hit points of a 0.6 m² piece (a typical plank); bigger pieces scale up. */
  hp: number;
  /** Impact impulse below which nothing happens. */
  tough: number;
  /** Score for smashing it. */
  points: number;
  /** How much explosions hurt it (1 = normal). */
  blast: number;
}

export const MATERIALS: Record<MatId, Material> = {
  wood: { id: "wood", name: "Wood", density: 1, friction: 0.7, restitution: 0.08, hp: 9, tough: 2, points: 500, blast: 1 },
  stone: { id: "stone", name: "Stone", density: 2.5, friction: 0.8, restitution: 0.04, hp: 30, tough: 7, points: 800, blast: 0.45 },
  glass: { id: "glass", name: "Glass", density: 0.7, friction: 0.35, restitution: 0.1, hp: 2.2, tough: 0.5, points: 250, blast: 3 },
  ice: { id: "ice", name: "Ice", density: 0.9, friction: 0.06, restitution: 0.05, hp: 5.5, tough: 1.6, points: 400, blast: 1.6 },
  tnt: { id: "tnt", name: "TNT", density: 1.3, friction: 0.6, restitution: 0.05, hp: 4, tough: 1.5, points: 800, blast: 3 },
  rock: { id: "rock", name: "Rock", density: 0, friction: 0.9, restitution: 0.02, hp: Infinity, tough: Infinity, points: 0, blast: 0 },
};

export type CritterKind = "basic" | "splitter" | "dasher" | "bomber" | "heavy";

export interface CritterSpec {
  kind: CritterKind;
  name: string;
  r: number;
  density: number;
  color: string;
  dark: string;
  /** What a tap does in flight. */
  ability: string;
  /** Damage multiplier against stone. */
  stoneBonus: number;
}

export const CRITTERS: Record<CritterKind, CritterSpec> = {
  basic: { kind: "basic", name: "Pebble", r: 0.5, density: 2.5, color: "#94a3b8", dark: "#475569", ability: "No trick: just aim true", stoneBonus: 1 },
  splitter: { kind: "splitter", name: "Trio", r: 0.5, density: 2.5, color: "#fb923c", dark: "#c2410c", ability: "Tap to split into three", stoneBonus: 1 },
  dasher: { kind: "dasher", name: "Zippy", r: 0.46, density: 2.8, color: "#facc15", dark: "#a16207", ability: "Tap for a speed boost", stoneBonus: 1.2 },
  bomber: { kind: "bomber", name: "Boomer", r: 0.52, density: 2.4, color: "#475569", dark: "#0f172a", ability: "Tap to explode", stoneBonus: 1 },
  heavy: { kind: "heavy", name: "Boulder", r: 0.6, density: 6, color: "#a8a29e", dark: "#57534e", ability: "Tap to slam down; smashes stone", stoneBonus: 2.6 },
};

export type GrumblerKind = "small" | "normal" | "helmet" | "king";

export interface GrumblerSpec {
  kind: GrumblerKind;
  r: number;
  density: number;
  hp: number;
  tough: number;
  points: number;
}

export const GRUMBLERS: Record<GrumblerKind, GrumblerSpec> = {
  small: { kind: "small", r: 0.38, density: 1, hp: 4.5, tough: 1.5, points: 4000 },
  normal: { kind: "normal", r: 0.5, density: 1, hp: 7, tough: 2, points: 5000 },
  helmet: { kind: "helmet", r: 0.5, density: 1.3, hp: 16, tough: 3.5, points: 6000 },
  king: { kind: "king", r: 0.78, density: 1, hp: 24, tough: 3, points: 10000 },
};

/** Where the slingshot stands (metres; y points down, the ground is y = 0). */
export const SLING = { x: 4, y: -3.3, maxPull: 3.2, minPull: 0.55, power: 7.6 };

/** Points for every critter you did not need. */
export const LEFTOVER_BONUS = 10000;

export const WORLDS = [
  { name: "Meadow Mischief", short: "Meadow", sky: ["#7dd3fc", "#e0f2fe"], accent: "#65a30d" },
  { name: "Dusty Canyon", short: "Canyon", sky: ["#fdba74", "#fef3c7"], accent: "#ea580c" },
  { name: "Frostbite Peaks", short: "Frost", sky: ["#a5b4fc", "#e0f2fe"], accent: "#0ea5e9" },
] as const;
