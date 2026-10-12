// Pulse Dash rules: a rhythm auto-runner. Pure so it can be tested and solved by a bot. Distances are in blocks,
// time in seconds, y points up (0 is the floor, CEIL the ceiling). A jump lasts exactly one beat, so the level
// geometry lines up with the music: one beat is four blocks at normal speed.

/** Fixed simulation step (seconds). */
export const STEP = 1 / 120;
export const CEIL = 9;
/** How high a jump goes (blocks). A jump always takes one beat to land again. */
export const JUMP_H = 2.2;
/** Jump pads throw you this much harder than a jump. */
export const PAD_MULT = 1.5;
/** A press this recent still counts when you touch down or reach an orb (seconds). */
export const PRESS_BUFFER = 0.09;
/** Landing on a block top is forgiven if you are this far (blocks) into it. */
export const LAND_TOL = 0.25;
/** At 1x speed one beat is this many blocks. */
export const BLOCKS_PER_BEAT = 4;

export type Obj =
  | { t: "spike"; x: number; y: number; down?: boolean }
  | { t: "block"; x: number; y: number; w: number; h: number }
  | { t: "pad"; x: number; y: number; down?: boolean }
  | { t: "orb"; x: number; y: number }
  /** Passing through sets gravity: 1 = normal (down), -1 = inverted (up). */
  | { t: "grav"; x: number; y: number; dir: 1 | -1 }
  /** Passing through sets the speed multiplier. */
  | { t: "speed"; x: number; m: number };

export interface Theme {
  /** Page colours: sky top and bottom, the accent for blocks and the ground line, and a second colour for the cube. */
  top: string;
  bottom: string;
  accent: string;
  accent2: string;
  spike: string;
}

export interface Level {
  id: string;
  name: string;
  difficulty: "Easy" | "Medium" | "Hard";
  bpm: number;
  /** Where the finish line is. */
  endX: number;
  /** Length of the level in beats (to the finish line). */
  endBeats: number;
  objects: Obj[];
  /** Speed changes: from this beat on, the multiplier applies (for placing things and for the music). */
  zones: { beat: number; m: number }[];
  theme: Theme;
}

export const spb = (level: Level) => 60 / level.bpm;
/** Level length in seconds. */
export const durationOf = (level: Level) => level.endBeats * spb(level);
/** Blocks per second at speed multiplier m. */
export const speedOf = (level: Level, m: number) => (BLOCKS_PER_BEAT * m * level.bpm) / 60;
/** Gravity and jump speed for a level: tuned so a jump takes one beat and reaches JUMP_H. */
export function physics(level: Level) {
  const T = spb(level);
  return { g: (8 * JUMP_H) / (T * T), v0: (4 * JUMP_H) / T };
}

/** Width of an object in blocks. */
export const widthOf = (o: Obj) => (o.t === "block" ? o.w : o.t === "grav" ? 0.5 : 1);

export type PulseEvent = "jump" | "land" | "pad" | "orb" | "grav" | "speed" | "die" | "win";

export interface PulseState {
  level: Level;
  g: number;
  v0: number;
  t: number;
  /** Left edge of the cube, and its bottom. */
  x: number;
  y: number;
  vy: number;
  grav: 1 | -1;
  speedM: number;
  onGround: boolean;
  held: boolean;
  pressBuf: number;
  alive: boolean;
  won: boolean;
  /** Rotation in radians; free in the air, snapped to a quarter turn on landing. */
  rot: number;
  /** Indices of pads, orbs and portals already used in this pass (pruned as they fall behind). */
  used: number[];
  lo: number;
  acc: number;
  events: PulseEvent[];
}

export function newRun(level: Level): PulseState {
  const { g, v0 } = physics(level);
  return {
    level, g, v0, t: 0, x: 0, y: 0, vy: 0, grav: 1, speedM: 1, onGround: true, held: false, pressBuf: 0, alive: true, won: false, rot: 0,
    used: [], lo: 0, acc: 0, events: [],
  };
}

/** Copy of the parts of the state that matter, for the bot's search. */
export function cloneRun(s: PulseState): PulseState {
  return { ...s, used: s.used.slice(), events: [] };
}

/** The jump button went down. */
export function press(s: PulseState) {
  s.held = true;
  s.pressBuf = PRESS_BUFFER;
}
/** The jump button came up. */
export function release(s: PulseState) {
  s.held = false;
}

const overlaps = (ax0: number, ax1: number, ay0: number, ay1: number, bx0: number, bx1: number, by0: number, by1: number) =>
  ax0 < bx1 && ax1 > bx0 && ay0 < by1 && ay1 > by0;

/** The cube's inner hitbox for spikes (smaller than the cube, so grazes are forgiven). */
const HAZ = 0.25;
/** Spike hitbox: narrow and short, centred on the spike. */
const SPIKE_HALF = 0.15;
const SPIKE_H = 0.45;

function land(s: PulseState, wasGround: boolean) {
  s.onGround = true;
  s.vy = 0;
  if (!wasGround) {
    s.events.push("land");
    const q = Math.PI / 2;
    s.rot = Math.round(s.rot / q) * q;
  }
}

/** Advance exactly one fixed step. */
export function tick(s: PulseState) {
  if (!s.alive || s.won) return;
  const L = s.level;
  const objs = L.objects;
  const dt = STEP;
  s.t += dt;
  const gdir = s.grav === 1 ? -1 : 1; // which way gravity pulls (in y)
  const up = -gdir; // the jump direction
  if (s.pressBuf > 0) s.pressBuf = Math.max(0, s.pressBuf - dt);
  const wasGround = s.onGround;
  s.onGround = false;

  // Jump: from the ground you can hold the button (jump again each landing) or tap just before landing.
  if (wasGround && (s.held || s.pressBuf > 0)) {
    s.vy = up * s.v0;
    s.pressBuf = 0;
    s.events.push("jump");
  }

  // Skip the objects that are well behind.
  while (s.lo < objs.length && objs[s.lo].x + widthOf(objs[s.lo]) < s.x - 1) s.lo++;
  const reachX = s.x + 3;

  // Pads and orbs act on the velocity before this step's movement.
  for (let i = s.lo; i < objs.length; i++) {
    const o = objs[i];
    if (o.x > reachX) break;
    if (o.t === "pad") {
      if (s.used.includes(i)) continue;
      const y0 = o.down ? o.y + 0.7 : o.y;
      const y1 = o.down ? o.y + 1 : o.y + 0.3;
      if (overlaps(s.x, s.x + 1, s.y, s.y + 1, o.x + 0.1, o.x + 0.9, y0, y1)) {
        s.vy = (o.down ? -1 : 1) * s.v0 * PAD_MULT;
        s.used.push(i);
        s.events.push("pad");
      }
    } else if (o.t === "orb") {
      if (s.used.includes(i) || s.pressBuf <= 0) continue;
      if (overlaps(s.x, s.x + 1, s.y, s.y + 1, o.x + 0.1, o.x + 0.9, o.y + 0.1, o.y + 0.9)) {
        s.vy = up * s.v0;
        s.pressBuf = 0;
        s.used.push(i);
        s.events.push("orb");
      }
    }
  }

  // Gravity and movement.
  const vmax = 2.3 * s.v0;
  s.vy = Math.max(-vmax, Math.min(vmax, s.vy + gdir * s.g * dt));
  s.y += s.vy * dt;
  if (!wasGround || s.vy * up > 0) s.rot += (Math.PI / spb(L)) * dt * s.grav;

  // Landing: on the floor or ceiling, or on top of a block. (Hitting a block any other way is checked below.)
  let landed = false;
  if (s.y <= 0) {
    s.y = 0;
    if (gdir === -1) landed = true;
    else if (s.vy < 0) s.vy = 0;
  }
  if (s.y + 1 >= CEIL) {
    s.y = CEIL - 1;
    if (gdir === 1) landed = true;
    else if (s.vy > 0) s.vy = 0;
  }
  const falling = gdir === -1 ? s.vy <= 0 : s.vy >= 0;
  // Falling fast covers more ground in one step, so the forgiveness grows with speed.
  const tol = LAND_TOL + Math.abs(s.vy) * dt;
  if (falling && !landed) {
    for (let i = s.lo; i < objs.length; i++) {
      const o = objs[i];
      if (o.x > reachX) break;
      if (o.t !== "block" || !(s.x < o.x + o.w && s.x + 1 > o.x)) continue;
      if (gdir === -1) {
        const top = o.y + o.h;
        const depth = top - s.y;
        if (depth > 0 && depth <= tol) {
          s.y = top;
          landed = true;
          break;
        }
      } else {
        const depth = s.y + 1 - o.y;
        if (depth > 0 && depth <= tol) {
          s.y = o.y - 1;
          landed = true;
          break;
        }
      }
    }
  }
  if (landed) land(s, wasGround);

  s.x += speedOf(L, s.speedM) * dt;

  // Death: block sides and undersides, and spikes.
  for (let i = s.lo; i < objs.length; i++) {
    const o = objs[i];
    if (o.x > reachX) break;
    if (o.t === "block") {
      if (overlaps(s.x, s.x + 1, s.y, s.y + 1, o.x, o.x + o.w, o.y, o.y + o.h) && s.x + 1 - o.x > 1e-6 && o.x + o.w - s.x > 1e-6 && s.y + 1 - o.y > 1e-6 && o.y + o.h - s.y > 1e-6) {
        return die(s);
      }
    } else if (o.t === "spike") {
      const y0 = o.down ? o.y + 1 - SPIKE_H : o.y;
      const y1 = o.down ? o.y + 1 : o.y + SPIKE_H;
      if (overlaps(s.x + HAZ, s.x + 1 - HAZ, s.y + HAZ, s.y + 1 - HAZ, o.x + 0.5 - SPIKE_HALF, o.x + 0.5 + SPIKE_HALF, y0, y1)) return die(s);
    }
  }

  // Portals.
  for (let i = s.lo; i < objs.length; i++) {
    const o = objs[i];
    if (o.x > reachX) break;
    if (o.t === "grav") {
      if (s.used.includes(i)) continue;
      if (overlaps(s.x, s.x + 1, s.y, s.y + 1, o.x, o.x + 0.5, o.y, o.y + 3)) {
        s.used.push(i);
        s.grav = o.dir;
        s.events.push("grav");
      }
    } else if (o.t === "speed") {
      if (s.used.includes(i)) continue;
      if (s.x + 1 >= o.x) {
        s.used.push(i);
        s.speedM = o.m;
        s.events.push("speed");
      }
    }
  }
  // Forget used things that are far behind.
  if (s.used.length > 6) s.used = s.used.filter((i) => objs[i].x + 1 > s.x - 3);

  if (s.x >= L.endX) {
    s.won = true;
    s.events.push("win");
  }
}

function die(s: PulseState) {
  s.alive = false;
  s.events.push("die");
}

/** Advance by real time using fixed steps. Returns the events (the array is reused between calls). */
export function advance(s: PulseState, dt: number): PulseEvent[] {
  s.events.length = 0;
  s.acc += dt;
  let n = 0;
  while (s.acc >= STEP && n < 40) {
    tick(s);
    s.acc -= STEP;
    n++;
    if (!s.alive || s.won) {
      s.acc = 0;
      break;
    }
  }
  if (n >= 40) s.acc = 0;
  return s.events;
}

/** Run until the game clock reaches time `target` (used when the audio clock drives the game). */
export function advanceTo(s: PulseState, target: number): PulseEvent[] {
  s.events.length = 0;
  let n = 0;
  while (s.t + STEP <= target + 1e-9 && n < 60 && s.alive && !s.won) {
    tick(s);
    n++;
  }
  return s.events;
}

/** Progress through the level, 0 to 100 (whole numbers; 100 only for a finished level). */
export function percent(s: PulseState) {
  if (s.won) return 100;
  return Math.max(0, Math.min(99, Math.floor((s.x / s.level.endX) * 100)));
}

// ---------------------------------------------------------------- progress and score

export interface Progress {
  /** Best percent per level (0 = never attempted). */
  best: number[];
  /** Whether each level has been completed. */
  done: boolean[];
  attempts: number[];
}

export const emptyProgress = (levels: number): Progress => ({
  best: new Array<number>(levels).fill(0), done: new Array<boolean>(levels).fill(false), attempts: new Array<number>(levels).fill(0),
});

/** Score = levels completed x 100 + best percent on the hardest level attempted. */
export function scoreOf(p: Progress): number {
  const completed = p.done.filter(Boolean).length;
  let hardest = -1;
  for (let i = 0; i < p.best.length; i++) if (p.best[i] > 0 || p.attempts[i] > 0 || p.done[i]) hardest = i;
  return completed * 100 + (hardest >= 0 ? p.best[hardest] : 0);
}

/** Record the end of an attempt. Returns the updated progress (a new object). */
export function recordAttempt(p: Progress, index: number, percentReached: number, completed: boolean): Progress {
  const next: Progress = { best: p.best.slice(), done: p.done.slice(), attempts: p.attempts.slice() };
  next.attempts[index]++;
  next.best[index] = Math.max(next.best[index], completed ? 100 : percentReached);
  if (completed) next.done[index] = true;
  return next;
}
