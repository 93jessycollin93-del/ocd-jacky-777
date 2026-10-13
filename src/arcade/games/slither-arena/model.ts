// Shared constants, types and small maths for Slither Arena. No React, no DOM.

export const WORLD_R = 2400;
export const START_MASS = 10;
export const MIN_BOOST_MASS = 14;
export const BASE_SPEED = 165;
export const BOOST_MULT = 2;
export const MAX_SEGS = 900;
export const MAX_WORMS = 40;
export const BOT_COUNT = 25;
export const CELL = 96;
export const AMBIENT_ORBS = 1150;
export const ORB_CAP = 3400;
/** Share of boosted mass that is dropped behind you as orbs (the rest is burned). */
export const BOOST_RETURN = 0.7;
/** Share of a dead worm's mass that bursts out as orbs. */
export const DEATH_RETURN = 0.85;
export const SHIELD_TIME = 1.4;
export const HEAD_HIT = 0.62;
export const BODY_HIT = 0.88;

export const ORB_COLORS = ["#fb7185", "#fb923c", "#facc15", "#4ade80", "#22d3ee", "#60a5fa", "#a78bfa", "#f472b6"];

/** Body radius for a worm of this mass. */
export const girth = (m: number) => 4.5 + 1.1 * Math.pow(Math.max(1, m), 0.45);
/** Distance between neighbouring body segments. */
export const segSpacing = (m: number) => 0.5 * girth(m) + 1.2;
/** How many body segments a worm of this mass has (head included). */
export const segCount = (m: number) => Math.min(MAX_SEGS, Math.floor(14 + 0.5 * Math.pow(Math.max(1, m), 0.8)));
/** Maximum turning speed in radians per second: fat worms turn a little wider. */
export const turnRate = (m: number) => 4.0 / (1 + 0.025 * (girth(m) - 7.6));
/** Mass drained per second of boosting. */
export const boostDrain = (m: number) => 2.4 + 0.015 * m;

export const TAU = Math.PI * 2;
/** Smallest signed difference b - a, wrapped to (-PI, PI]. */
export function angDiff(a: number, b: number): number {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  else if (d <= -Math.PI) d += TAU;
  return d;
}
export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export interface Brain {
  /** 0..1: how well it dodges and aims. */
  skill: number;
  /** 0..1: how often it hunts instead of just eating. */
  aggr: number;
  thinkIn: number;
  thinkEvery: number;
  wanderX: number;
  wanderY: number;
  wanderT: number;
  /** Index into worms of the worm it is hunting, or -1. */
  prey: number;
  preyT: number;
  circleDir: 1 | -1;
  /** "forage" | "hunt" | "circle" | "flee": what it did last think, for the HUD/tests. */
  mode: string;
  /** Danger of the arc it chose at its last think (0..1), for tests and debugging. */
  danger: number;
}

export interface Worm {
  id: number;
  name: string;
  skin: number;
  isPlayer: boolean;
  alive: boolean;
  x: number;
  y: number;
  ang: number;
  targetAng: number;
  wantBoost: boolean;
  boosting: boolean;
  mass: number;
  /** Cached body radius (girth of the current mass). */
  g: number;
  /** Live segment count; segment 0 is the head. */
  n: number;
  sx: Float32Array;
  sy: Float32Array;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  kills: number;
  peak: number;
  shield: number;
  dropAcc: number;
  /** For the death screen. */
  killedBy: string;
  deadFor: number;
  brain: Brain;
}

export interface Orb {
  x: number;
  y: number;
  v: number;
  c: number;
  r: number;
  ph: number;
  amb: boolean;
  cell: number;
  slot: number;
  alive: boolean;
}

export type SlitherEvent =
  | { type: "eat"; wormId: number; x: number; y: number; c: number; v: number }
  | { type: "kill"; killer: number; victim: number; x: number; y: number }
  | { type: "death"; wormId: number; x: number; y: number; cause: "body" | "edge"; by: string }
  | { type: "boost-drop"; wormId: number; x: number; y: number }
  | { type: "spawn"; wormId: number; x: number; y: number };
