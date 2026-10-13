// Shared constants, types and small maths for Blob Arena. No React, no DOM.

export const WORLD = 5000;
export const HALF = WORLD / 2;
export const START_MASS = 20;
export const PELLET_TARGET = 1500;
export const MAX_CELLS = 16;
export const SPLIT_MIN = 35;
export const EJECT_MIN = 32;
export const EJECT_MASS = 12;
/** A blob must be this many times heavier to eat another. */
export const EAT_RATIO = 1.25;
export const THORN_MASS = 120;
export const THORN_FEEDS = 7;
export const THORN_TARGET = 22;
export const THORN_MAX = 34;
/** How much heavier than a thorn a cell must be to be popped by it. */
export const THORN_POP_RATIO = 1.1;
export const BOT_COUNT = 20;
export const DRAG = 4.2;
export const CELL_SIZE = 160;

export const PLAYER_COLOR = "#38bdf8";
export const BOT_COLORS = [
  "#f87171", "#fb923c", "#fbbf24", "#a3e635", "#4ade80", "#2dd4bf", "#818cf8", "#a78bfa", "#e879f9", "#f472b6", "#fb7185", "#facc15",
  "#34d399", "#c084fc", "#f97316",
];
export const PELLET_COLORS = ["#fda4af", "#fdba74", "#fde68a", "#bef264", "#86efac", "#5eead4", "#93c5fd", "#c4b5fd", "#f0abfc"];

/** Radius of a blob of this mass. */
export const radiusOf = (m: number) => 4 * Math.sqrt(Math.max(0, m));
/** Top speed in px/s: heavier blobs are slower. */
export const speedOf = (m: number) => Math.max(45, 300 * Math.pow(Math.max(m, 1) / 20, -0.28));
/** Seconds before split pieces can merge again. */
export const mergeCooldown = (m: number) => 8 + m * 0.012;
/** Mass lost per second by a blob of this mass (nothing until it is big). */
export const decayPerSec = (m: number) => (m > 100 ? (m - 100) * 0.002 : 0);

/**
 * Can a blob of mass `mA` swallow a blob of mass `mB` whose centre is `d` away?
 * It must be at least 1.25x heavier and cover the other's centre with room to spare.
 */
export function canEat(mA: number, mB: number, d: number): boolean {
  if (mA < EAT_RATIO * mB) return false;
  return d < radiusOf(mA) - radiusOf(mB) * 0.4;
}

/** Camera zoom for a player: bigger (or more spread out) means zoomed further out. */
export function zoomFor(totalMass: number, extent: number, viewMin: number): number {
  const equivalent = radiusOf(totalMass);
  const span = 220 + Math.max(equivalent * 3, extent * 1.5);
  return Math.min(1.6, Math.max(0.12, viewMin / 2 / span));
}

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export interface Cell {
  id: number;
  owner: number;
  x: number;
  y: number;
  /** Launch velocity from a split or burst; fades with drag. */
  vx: number;
  vy: number;
  /** Real movement last step (for bots to predict where blobs are going). */
  mx: number;
  my: number;
  mass: number;
  /** Seconds until this piece may merge with its siblings. */
  merge: number;
  age: number;
  alive: boolean;
}

export interface Brain {
  skill: number;
  aggr: number;
  thinkIn: number;
  thinkEvery: number;
  wanderX: number;
  wanderY: number;
  wanderT: number;
  splitCd: number;
  mode: string;
}

export interface Player {
  id: number;
  name: string;
  color: string;
  isPlayer: boolean;
  alive: boolean;
  cells: Cell[];
  aimX: number;
  aimY: number;
  /** 0..1 fraction of full speed (joystick deflection). */
  aimMag: number;
  wantSplit: boolean;
  ejectCd: number;
  peak: number;
  eaten: number;
  eatenBy: string;
  born: number;
  respawn: number;
  /** Where its last cell was eaten (for the death burst). */
  lx: number;
  ly: number;
  brain: Brain;
}

export interface Pellet {
  x: number;
  y: number;
  m: number;
  c: number;
  r: number;
  cell: number;
  slot: number;
  alive: boolean;
}

export interface Ejected {
  x: number;
  y: number;
  vx: number;
  vy: number;
  mass: number;
  owner: number;
  color: string;
  age: number;
}

export interface Thorn {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  mass: number;
  feeds: number;
  /** Direction of the last mass fed to it: the way a new thorn will be shot. */
  fx: number;
  fy: number;
  /** Bumped when fed, for a little squash animation. */
  pulse: number;
}

export type BlobEvent =
  | { type: "pellet"; owner: number; x: number; y: number; m: number }
  | { type: "eat"; eater: number; victim: number; x: number; y: number; mass: number }
  | { type: "split"; owner: number; x: number; y: number }
  | { type: "eject"; owner: number; x: number; y: number }
  | { type: "burst"; owner: number; x: number; y: number; pieces: number }
  | { type: "thorn-fed"; x: number; y: number }
  | { type: "thorn-shot"; x: number; y: number }
  | { type: "merge"; owner: number; x: number; y: number }
  | { type: "death"; owner: number; x: number; y: number; by: string };
