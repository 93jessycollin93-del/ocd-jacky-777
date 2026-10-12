// Fruit Slash rules: fruit and bombs thrown in arcs, a swipe that slices whatever it crosses, combos,
// misses, power fruit and the two modes. Pure and seeded so every rule can be tested. Units are canvas
// pixels; the world is w by h with y growing downwards.
import { mulberry32, type Rng } from "../../kit/rng";

export type Mode = "classic" | "arcade";

export const FRUIT_KINDS = [
  "apple", "orange", "watermelon", "banana", "pineapple", "kiwi", "strawberry", "lemon", "coconut", "grapes",
] as const;
export type FruitKind = (typeof FRUIT_KINDS)[number];
export type PowerKind = "freeze" | "frenzy" | "double";
export const POWER_KINDS: PowerKind[] = ["freeze", "frenzy", "double"];

export type ThingType = "fruit" | "bomb" | "power";

export interface Thing {
  id: number;
  type: ThingType;
  /** Fruit kind, power kind, or "bomb". */
  kind: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  rot: number;
  spin: number;
  sliced: boolean;
  /** Has it risen into view yet (so falling back below the screen counts as a miss)? */
  seen: boolean;
}

/** One side of a sliced fruit. `side` is +1 or -1: which side of the cut it is on. */
export interface Half {
  id: number;
  kind: string;
  type: ThingType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  rot: number;
  spin: number;
  /** Direction of the cut, in radians, and the fruit's rotation when it was cut. */
  cut: number;
  cutRot: number;
  side: 1 | -1;
  age: number;
}

export type GameEvent =
  | { type: "slice"; thing: Thing; angle: number; points: number; x: number; y: number }
  | { type: "combo"; hits: number; bonus: number; x: number; y: number }
  | { type: "miss"; thing: Thing; misses: number }
  | { type: "bomb"; thing: Thing; angle: number }
  | { type: "power"; kind: PowerKind; x: number; y: number }
  | { type: "over"; reason: "bomb" | "misses" | "time" };

export interface World {
  w: number;
  h: number;
  mode: Mode;
  rng: Rng;
  things: Thing[];
  halves: Half[];
  score: number;
  misses: number;
  /** Arcade: seconds left. */
  timeLeft: number;
  elapsed: number;
  waves: number;
  spawnTimer: number;
  nextId: number;
  over: boolean;
  reason: "bomb" | "misses" | "time" | null;
  /** Seconds of each power left. */
  freeze: number;
  frenzy: number;
  double: number;
  /** Fruit sliced in the current swipe, and when the last one was. */
  swipeHits: number;
  swipeLast: number;
  swipeX: number;
  swipeY: number;
  powerTimer: number;
}

export const MAX_MISSES = 3;
export const ARCADE_SECONDS = 60;
export const COMBO_MIN = 3;
export const COMBO_GAP = 0.4;
export const FREEZE_SECONDS = 5;
export const FRENZY_SECONDS = 5;
export const DOUBLE_SECONDS = 8;
export const FREEZE_SCALE = 0.3;

/** Fruit size follows the screen, so it is as easy to hit on a phone as on a desktop. */
export const fruitRadius = (w: number, h: number) => Math.max(18, Math.min(0.075 * w, 0.085 * h));
export const gravityFor = (h: number) => 1.55 * h;

export function newWorld(mode: Mode, seed: number, w: number, h: number): World {
  return {
    w, h, mode, rng: mulberry32(seed), things: [], halves: [], score: 0, misses: 0, timeLeft: ARCADE_SECONDS, elapsed: 0, waves: 0,
    spawnTimer: 0.6, nextId: 1, over: false, reason: null, freeze: 0, frenzy: 0, double: 0, swipeHits: 0, swipeLast: -9, swipeX: 0, swipeY: 0,
    powerTimer: 9,
  };
}

// ---------------------------------------------------------------------------------------------- slicing

/** Does the segment from (ax, ay) to (bx, by) pass within r of the point (cx, cy)? */
export function segmentHitsCircle(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, r: number): boolean {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = 0;
  if (len2 > 0) t = Math.max(0, Math.min(1, ((cx - ax) * dx + (cy - ay) * dy) / len2));
  const px = ax + dx * t;
  const py = ay + dy * t;
  return (cx - px) ** 2 + (cy - py) ** 2 <= r * r;
}

function makeHalves(w: World, t: Thing, angle: number) {
  // The two halves leave sideways from the cut, keep the fruit's own motion and spin apart.
  const nx = -Math.sin(angle);
  const ny = Math.cos(angle);
  for (const side of [1, -1] as const) {
    w.halves.push({
      id: w.nextId++, kind: t.kind, type: t.type, x: t.x, y: t.y, vx: t.vx * 0.6 + nx * side * (90 + w.rng() * 60),
      vy: t.vy * 0.5 + ny * side * (90 + w.rng() * 60) - 40, r: t.r, rot: t.rot, spin: t.spin + side * (1.5 + w.rng() * 2.5), cut: angle, cutRot: t.rot,
      side, age: 0,
    });
  }
}

const multiplier = (w: World) => (w.double > 0 ? 2 : 1);

function flushSwipe(w: World, events: GameEvent[]) {
  if (w.swipeHits >= COMBO_MIN) {
    const bonus = w.swipeHits * multiplier(w);
    w.score += bonus;
    events.push({ type: "combo", hits: w.swipeHits, bonus, x: w.swipeX, y: w.swipeY });
  }
  w.swipeHits = 0;
}

function activate(w: World, kind: PowerKind) {
  if (kind === "freeze") w.freeze = FREEZE_SECONDS;
  else if (kind === "frenzy") w.frenzy = FRENZY_SECONDS;
  else w.double = DOUBLE_SECONDS;
}

/**
 * A swipe segment from (ax, ay) to (bx, by): slice everything it crosses. Fruit scores (and counts
 * towards a combo), bombs end a Classic run, power fruit switch their power on.
 */
export function slice(w: World, ax: number, ay: number, bx: number, by: number): GameEvent[] {
  const events: GameEvent[] = [];
  if (w.over) return events;
  const angle = Math.atan2(by - ay, bx - ax);
  for (const t of w.things) {
    if (t.sliced || !segmentHitsCircle(ax, ay, bx, by, t.x, t.y, t.r)) continue;
    t.sliced = true;
    if (t.type === "bomb") {
      events.push({ type: "bomb", thing: t, angle });
      makeHalves(w, t, angle);
      if (w.mode === "classic") {
        w.over = true;
        w.reason = "bomb";
        events.push({ type: "over", reason: "bomb" });
        return events;
      }
      w.score = Math.max(0, w.score - 10);
      flushSwipe(w, events);
      continue;
    }
    makeHalves(w, t, angle);
    if (t.type === "power") {
      activate(w, t.kind as PowerKind);
      events.push({ type: "power", kind: t.kind as PowerKind, x: t.x, y: t.y });
    }
    // Hits within a short gap belong to the same combo.
    if (w.elapsed - w.swipeLast > COMBO_GAP) flushSwipe(w, events);
    const points = multiplier(w);
    w.score += points;
    w.swipeHits++;
    w.swipeLast = w.elapsed;
    w.swipeX = t.x;
    w.swipeY = t.y;
    events.push({ type: "slice", thing: t, angle, points, x: t.x, y: t.y });
  }
  w.things = w.things.filter((t) => !t.sliced);
  return events;
}

/** The finger lifted: pay out any combo. */
export function endSwipe(w: World): GameEvent[] {
  const events: GameEvent[] = [];
  flushSwipe(w, events);
  return events;
}

// ---------------------------------------------------------------------------------------------- spawning

const FIRST_BOMB_WAVE = 3;

/** Chance that a thrown item is a bomb: none at first, rising with the waves to about one in five. */
export const bombChance = (waves: number) => (waves < FIRST_BOMB_WAVE ? 0 : Math.min(0.2, 0.05 + (waves - FIRST_BOMB_WAVE) * 0.006));

/** Throw one thing from below the screen along an arc that peaks inside it. */
export function throwThing(w: World, type: ThingType, kind: string): Thing {
  const r = fruitRadius(w.w, w.h);
  const g = gravityFor(w.h);
  const x = w.w * (0.12 + w.rng() * 0.76);
  const apex = w.h * (0.5 + w.rng() * 0.38);
  const vy = -Math.sqrt(2 * g * apex);
  // Aim the sideways speed towards the middle of the screen so fruit stays in view.
  const toMiddle = (w.w / 2 - x) / w.w;
  const vx = (toMiddle * 0.9 + (w.rng() - 0.5) * 0.35) * w.w * 0.45;
  const t: Thing = {
    id: w.nextId++, type, kind, x, y: w.h + r, vx, vy, r, rot: w.rng() * Math.PI * 2, spin: (w.rng() - 0.5) * 7, sliced: false, seen: false,
  };
  w.things.push(t);
  return t;
}

const randomFruit = (w: World) => FRUIT_KINDS[Math.floor(w.rng() * FRUIT_KINDS.length)];

/** Launch a wave of fruit, with the occasional bomb (and, in Arcade, a power fruit). */
export function spawnWave(w: World): Thing[] {
  const out: Thing[] = [];
  const level = Math.min(4, Math.floor(w.waves / 4));
  const count = w.frenzy > 0 ? 1 + Math.floor(w.rng() * 2) : 1 + Math.floor(w.rng() * (2 + level));
  for (let i = 0; i < count; i++) {
    if (w.frenzy <= 0 && w.rng() < bombChance(w.waves)) out.push(throwThing(w, "bomb", "bomb"));
    else out.push(throwThing(w, "fruit", randomFruit(w)));
  }
  if (w.mode === "arcade" && w.frenzy <= 0 && w.waves >= 2 && w.powerTimer <= 0) {
    out.push(throwThing(w, "power", POWER_KINDS[Math.floor(w.rng() * POWER_KINDS.length)]));
    w.powerTimer = 9 + w.rng() * 5;
  }
  w.waves++;
  return out;
}

/** Seconds until the next wave: quicker as the run goes on, and very quick in a frenzy. */
export const waveGap = (w: World) => (w.frenzy > 0 ? 0.22 : Math.max(0.55, 1.5 - w.waves * 0.025));

// ---------------------------------------------------------------------------------------------- the clock

/** Advance the world by dt seconds. Returns misses and the end of the run. */
export function step(w: World, dt: number): GameEvent[] {
  const events: GameEvent[] = [];
  if (w.over) return events;
  w.elapsed += dt;
  const scale = w.freeze > 0 ? FREEZE_SCALE : 1;
  const sdt = dt * scale;
  const g = gravityFor(w.h);

  if (w.freeze > 0) w.freeze = Math.max(0, w.freeze - dt);
  if (w.frenzy > 0) w.frenzy = Math.max(0, w.frenzy - dt);
  if (w.double > 0) w.double = Math.max(0, w.double - dt);
  w.powerTimer -= dt;

  if (w.mode === "arcade") {
    w.timeLeft = Math.max(0, w.timeLeft - dt);
    if (w.timeLeft <= 0) {
      flushSwipe(w, events);
      w.over = true;
      w.reason = "time";
      events.push({ type: "over", reason: "time" });
      return events;
    }
  }

  // Throwing is paused while time is frozen.
  if (w.freeze <= 0) {
    w.spawnTimer -= dt;
    if (w.spawnTimer <= 0) {
      spawnWave(w);
      w.spawnTimer = waveGap(w);
    }
  }

  for (const t of w.things) {
    t.vy += g * sdt;
    t.x += t.vx * sdt;
    t.y += t.vy * sdt;
    t.rot += t.spin * sdt;
    if (t.y < w.h - t.r * 0.2) t.seen = true;
  }
  for (const t of w.things) {
    if (t.y > w.h + t.r * 1.2 && t.vy > 0 && t.seen) t.sliced = true; // gone: mark so it is removed below
  }
  const gone = w.things.filter((t) => t.sliced);
  w.things = w.things.filter((t) => !t.sliced);
  for (const t of gone) {
    if (t.type === "fruit" && w.mode === "classic") {
      w.misses++;
      events.push({ type: "miss", thing: t, misses: w.misses });
      if (w.misses >= MAX_MISSES && !w.over) {
        w.over = true;
        w.reason = "misses";
        events.push({ type: "over", reason: "misses" });
      }
    }
  }
  for (const h of w.halves) {
    h.vy += g * sdt;
    h.x += h.vx * sdt;
    h.y += h.vy * sdt;
    h.rot += h.spin * sdt;
    h.age += dt;
  }
  w.halves = w.halves.filter((h) => h.y < w.h + h.r * 2 && h.age < 4);
  if (w.swipeHits > 0 && w.elapsed - w.swipeLast > COMBO_GAP * 2) flushSwipe(w, events);
  return events;
}
