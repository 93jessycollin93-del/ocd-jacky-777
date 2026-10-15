// Garden Defense: the rules tables. Plants, gnomes, the grid size and the constants everything else shares.

export const LANES = 5;
export const COLS = 9;

export type PlantId = "pea" | "sun" | "nut" | "cherry" | "frost" | "twin" | "mine" | "lobber";
export type GnomeKind = "basic" | "cone" | "bucket" | "runner" | "vaulter" | "flag" | "gate";

export interface PlantDef {
  id: PlantId;
  name: string;
  cost: number;
  /** Seconds before the same seed can be planted again. */
  cooldown: number;
  /** Fraction of the cooldown still to wait when a level starts (the big seeds start half charged). */
  startCool: number;
  hp: number;
  blurb: string;
}

export const PLANT_ORDER: PlantId[] = ["pea", "sun", "nut", "cherry", "frost", "twin", "mine", "lobber"];

export const PLANTS: Record<PlantId, PlantDef> = {
  pea: { id: "pea", name: "Pea Pod", cost: 100, cooldown: 5, startCool: 0, hp: 300, blurb: "Fires a pea down its lane." },
  sun: { id: "sun", name: "Sunbloom", cost: 50, cooldown: 5, startCool: 0, hp: 300, blurb: "Makes 25 sun every so often." },
  nut: { id: "nut", name: "Walnut Wall", cost: 50, cooldown: 18, startCool: 0.3, hp: 4000, blurb: "A tough wall that gnomes chew on." },
  cherry: { id: "cherry", name: "Boom Cherry", cost: 150, cooldown: 35, startCool: 0.6, hp: 300, blurb: "Blows up everything in a 3x3 area." },
  frost: { id: "frost", name: "Frost Pod", cost: 175, cooldown: 5, startCool: 0.3, hp: 300, blurb: "Frosty peas slow gnomes down." },
  twin: { id: "twin", name: "Twin Pod", cost: 200, cooldown: 5, startCool: 0.3, hp: 300, blurb: "Fires two peas at a time." },
  mine: { id: "mine", name: "Spud Mine", cost: 25, cooldown: 20, startCool: 0.5, hp: 300, blurb: "Arms after a few seconds, then blows up under a gnome." },
  lobber: { id: "lobber", name: "Lobber", cost: 100, cooldown: 5, startCool: 0, hp: 300, blurb: "Lobs cabbages over gates and shields." },
};

export const SUN_VALUE = 25;
export const MAX_SUN = 9990;
export const PEA_DMG = 20;
export const LOB_DMG = 40;
export const PEA_SPEED = 6.5;
export const FIRE_EVERY = 1.5;
export const LOB_EVERY = 2.8;
export const LOB_TIME = 1.0;
export const SUN_EVERY = 22;
export const SUN_FIRST = 6;
export const SUN_LINGER = 9;
export const CHERRY_FUSE = 0.9;
export const MINE_ARM = 12;
export const BLAST_DMG = 1800;
export const BITE_DPS = 100;
export const SLOW_TIME = 4;
export const MOWER_SPEED = 7;
export const VAULT_TIME = 1.0;
/** How far in front of a gnome's centre it reaches to bite (columns). */
export const REACH = 0.3;

export interface GnomeDef {
  kind: GnomeKind;
  name: string;
  hp: number;
  /** Hat points: a cone or bucket soaks this much damage first, and then falls off. */
  armor: number;
  /** A front-only shield: straight peas are stopped by it, lobbed cabbages and blasts are not. */
  shield: number;
  speed: number;
  blurb: string;
}

export const GNOME_ORDER: GnomeKind[] = ["basic", "flag", "cone", "runner", "bucket", "vaulter", "gate"];

export const GNOMES: Record<GnomeKind, GnomeDef> = {
  basic: { kind: "basic", name: "Gnome", hp: 200, armor: 0, shield: 0, speed: 0.24, blurb: "Just a goofy gnome out for a stroll." },
  flag: { kind: "flag", name: "Flag Gnome", hp: 200, armor: 0, shield: 0, speed: 0.3, blurb: "Waves a flag: a huge wave follows him." },
  cone: { kind: "cone", name: "Cone Gnome", hp: 200, armor: 370, shield: 0, speed: 0.24, blurb: "A traffic cone for a hat soaks up damage." },
  runner: { kind: "runner", name: "Sprinter", hp: 150, armor: 0, shield: 0, speed: 0.5, blurb: "In a hurry. Twice as fast, a bit softer." },
  bucket: { kind: "bucket", name: "Bucket Gnome", hp: 200, armor: 1100, shield: 0, speed: 0.24, blurb: "A bucket on his head: very tanky." },
  vaulter: { kind: "vaulter", name: "Pole Vaulter", hp: 340, armor: 0, shield: 0, speed: 0.52, blurb: "Hops over the first plant in his way." },
  gate: { kind: "gate", name: "Gate Gnome", hp: 200, armor: 0, shield: 800, speed: 0.24, blurb: "Hides behind a garden gate. Lob over it!" },
};
