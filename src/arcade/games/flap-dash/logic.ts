// Flap Dash rules: a one-tap flapper. Pure and seeded so it can be tested. The world scrolls by moving the
// bird right at a steady pace; pillars sit at fixed world x positions.
import { mulberry32, type Rng } from "../../kit/rng";

/** Fixed simulation step (seconds). */
export const STEP = 1 / 120;
/** The world is always this tall; only its width follows the screen. */
export const VIEW_H = 640;
export const GROUND_Y = 552;
export const BIRD_R = 14;
export const GRAVITY = 1150;
/** Upward speed a flap sets (a flap replaces the current velocity, it doesn't add to it). */
export const FLAP_V = 350;
export const MAX_FALL = 760;
export const PILLAR_W = 66;
/** Distance from the bird's start to the first pillar. */
export const START_LEAD = 430;
const TOP_MARGIN = 70;
const BOTTOM_MARGIN = 64;
/** Biggest sideways jump in gap height between two pillars in a row. */
export const MAX_SHIFT = 128;

export const MEDALS = [
  { name: "bronze", at: 10 },
  { name: "silver", at: 20 },
  { name: "gold", at: 30 },
  { name: "platinum", at: 40 },
] as const;
export type MedalName = (typeof MEDALS)[number]["name"];

export function medalFor(score: number): MedalName | null {
  let m: MedalName | null = null;
  for (const x of MEDALS) if (score >= x.at) m = x.name;
  return m;
}

export function nextMedal(score: number) {
  return MEDALS.find((m) => score < m.at) ?? null;
}

const ease = (score: number) => Math.min(1, Math.max(0, score) / 40);
/** Vertical opening of the pillar with this index. Starts roomy, tightens gently, then holds. */
export const gapFor = (index: number) => Math.round(172 - 44 * ease(index));
/** Distance from one pillar to the next. */
export const spacingFor = (index: number) => Math.round(244 - 36 * ease(index));
/** Scroll speed in pixels per second. */
export const speedFor = (score: number) => 150 + 24 * ease(score);

export interface Pillar {
  /** Centre x in world units. */
  x: number;
  /** Centre of the opening. */
  gapY: number;
  gap: number;
  index: number;
  scored: boolean;
}

export type FlapEvent = "flap" | "score" | "hit" | "land";

export interface FlapState {
  /** ready = "get ready", before the first tap. */
  phase: "ready" | "playing" | "dead";
  /** Seconds of play so far. */
  t: number;
  x: number;
  y: number;
  vy: number;
  score: number;
  pillars: Pillar[];
  nextX: number;
  nextIndex: number;
  lastGapY: number;
  /** Seconds since the last flap (drives the wing animation). */
  sinceFlap: number;
  /** What ended the run. */
  cause: "pillar" | "ground" | null;
  grounded: boolean;
  acc: number;
  /** Time spent bobbing in "get ready". */
  bob: number;
  rng: Rng;
  events: FlapEvent[];
}

export const READY_Y = 270;

export function newGame(seed = 1): FlapState {
  const s: FlapState = {
    phase: "ready", t: 0, x: 0, y: READY_Y, vy: 0, score: 0, pillars: [], nextX: START_LEAD, nextIndex: 0,
    lastGapY: (TOP_MARGIN + GROUND_Y - BOTTOM_MARGIN) / 2, sinceFlap: 9, cause: null, grounded: false, acc: 0, bob: 0,
    rng: mulberry32(seed), events: [],
  };
  ensurePillars(s);
  return s;
}

/** Make pillars for as far ahead as anyone can see. Each opening is within reach of the one before. */
export function ensurePillars(s: FlapState) {
  while (s.nextX < s.x + 1100) {
    const gap = gapFor(s.nextIndex);
    const lo = TOP_MARGIN + gap / 2;
    const hi = GROUND_Y - BOTTOM_MARGIN - gap / 2;
    const shift = (s.rng() * 2 - 1) * MAX_SHIFT;
    const gapY = Math.min(hi, Math.max(lo, s.lastGapY + shift));
    s.pillars.push({ x: s.nextX, gapY, gap, index: s.nextIndex, scored: false });
    s.lastGapY = gapY;
    s.nextX += spacingFor(s.nextIndex);
    s.nextIndex++;
  }
  while (s.pillars.length && s.pillars[0].x < s.x - 400) s.pillars.shift();
}

/** A flap: starts the run from "get ready", otherwise gives the bird a fresh upward kick. */
export function flap(s: FlapState) {
  if (s.phase === "dead") return false;
  s.phase = "playing";
  s.vy = -FLAP_V;
  s.sinceFlap = 0;
  s.events.push("flap");
  return true;
}

/** Circle against rectangle. */
export function circleHitsRect(cx: number, cy: number, r: number, x0: number, y0: number, x1: number, y1: number) {
  const nx = Math.max(x0, Math.min(cx, x1));
  const ny = Math.max(y0, Math.min(cy, y1));
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy < r * r;
}

export function hitsPillar(bx: number, by: number, r: number, p: Pillar) {
  const x0 = p.x - PILLAR_W / 2;
  const x1 = p.x + PILLAR_W / 2;
  return (
    circleHitsRect(bx, by, r, x0, -1000, x1, p.gapY - p.gap / 2) ||
    circleHitsRect(bx, by, r, x0, p.gapY + p.gap / 2, x1, GROUND_Y + 1000)
  );
}

function die(s: FlapState, cause: "pillar" | "ground") {
  s.phase = "dead";
  s.cause = cause;
  s.events.push("hit");
  if (cause === "pillar") s.vy = Math.max(s.vy, 0) * 0.3;
}

/** Advance exactly one fixed step. */
export function step(s: FlapState) {
  s.sinceFlap += STEP;
  if (s.phase === "ready") {
    // Hover and bob until the first tap; the clock only runs once you are flying.
    s.bob += STEP;
    s.y = READY_Y + Math.sin(s.bob * 4.2) * 7;
    return;
  }
  if (s.phase === "dead") {
    if (s.grounded) return;
    s.vy = Math.min(MAX_FALL, s.vy + GRAVITY * STEP);
    s.y += s.vy * STEP;
    if (s.y + BIRD_R >= GROUND_Y) {
      s.y = GROUND_Y - BIRD_R;
      s.grounded = true;
      s.vy = 0;
      s.events.push("land");
    }
    return;
  }
  s.t += STEP;
  s.vy = Math.min(MAX_FALL, s.vy + GRAVITY * STEP);
  s.y += s.vy * STEP;
  s.x += speedFor(s.score) * STEP;
  if (s.y < BIRD_R) {
    s.y = BIRD_R;
    if (s.vy < 0) s.vy = 0;
  }
  ensurePillars(s);
  for (const p of s.pillars) {
    if (Math.abs(p.x - s.x) < PILLAR_W / 2 + BIRD_R + 2 && hitsPillar(s.x, s.y, BIRD_R, p)) {
      die(s, "pillar");
      return;
    }
    if (!p.scored && s.x > p.x) {
      p.scored = true;
      s.score++;
      s.events.push("score");
    }
  }
  if (s.y + BIRD_R >= GROUND_Y) {
    s.y = GROUND_Y - BIRD_R;
    die(s, "ground");
    s.grounded = true;
    s.vy = 0;
  }
}

/** Advance by real time using fixed steps. Returns the events that happened (the array is reused). */
export function update(s: FlapState, dt: number): FlapEvent[] {
  s.events.length = 0;
  s.acc += dt;
  let n = 0;
  while (s.acc >= STEP && n < 12) {
    step(s);
    s.acc -= STEP;
    n++;
  }
  if (n >= 12) s.acc = 0;
  return s.events;
}

/** 0 = full day, 1 = full night. A smooth cycle that is day at the start and night about 35 s later. */
export const DAY_LENGTH = 72;
export function nightAmount(t: number) {
  const raw = 0.5 - 0.5 * Math.cos((t / DAY_LENGTH) * Math.PI * 2);
  const k = Math.min(1, Math.max(0, (raw - 0.12) / 0.76));
  return k * k * (3 - 2 * k);
}
