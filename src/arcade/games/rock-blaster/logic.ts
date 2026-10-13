// Rock Blaster rules: pure and seeded, so they can be tested. The playfield wraps on both axes; the ship has
// inertia and a little friction; rocks split in two until they are small; saucers shoot back.
import { mulberry32, type Rng } from "../../kit/rng";

export const ROCK_RADIUS = [46, 26, 13] as const;
export const ROCK_SCORE = [20, 50, 100] as const;
export const SAUCER_SCORE = { big: 200, small: 1000 } as const;
export const SAUCER_RADIUS = { big: 22, small: 13 } as const;
export const SHIP_RADIUS = 11;
export const START_LIVES = 3;
export const EXTRA_LIFE_EVERY = 10_000;
export const MAX_SHIP_BULLETS = 4;
export const ROTATE_SPEED = 4.6;
export const THRUST = 310;
/** Per-second velocity decay: a very little friction, so the ship drifts a long way. */
export const FRICTION = 0.32;
export const MAX_SPEED = 430;
export const BULLET_SPEED = 640;
export const BULLET_LIFE = 0.95;
export const FIRE_COOLDOWN = 0.14;
export const INVULN_TIME = 2.6;
export const RESPAWN_DELAY = 1.8;
export const HYPER_COOLDOWN = 1.2;
export const WAVE_DELAY = 2;
const TAU = Math.PI * 2;

export type RockSize = 0 | 1 | 2;

export interface Rock {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: RockSize;
  angle: number;
  spin: number;
  /** Radius multiplier at each corner, which makes every rock lumpy and different. */
  shape: number[];
}

export interface Ship {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Heading in radians; 0 points up. */
  angle: number;
  alive: boolean;
  thrusting: boolean;
  /** Seconds of protection left after (re)appearing. */
  invuln: number;
  /** Seconds until a new ship appears, while waiting. */
  respawn: number;
  fireCooldown: number;
  hyperCooldown: number;
}

export interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  enemy: boolean;
}

export interface Saucer {
  x: number;
  y: number;
  vx: number;
  vy: number;
  kind: "big" | "small";
  turnTimer: number;
  fireTimer: number;
}

export type Phase = "play" | "over";

export interface RockState {
  w: number;
  h: number;
  score: number;
  lives: number;
  wave: number;
  nextLife: number;
  rocks: Rock[];
  bullets: Bullet[];
  saucer: Saucer | null;
  saucerTimer: number;
  ship: Ship;
  waveDelay: number;
  phase: Phase;
  /** Seconds since the game began, for the beat tempo and effects. */
  time: number;
  /** Time until the game-over event after the last ship is lost. */
  overTimer: number;
  rng: Rng;
}

export type RockEventType =
  | "shoot" | "rock" | "ship-die" | "saucer-spawn" | "saucer-die" | "saucer-shoot" | "extra-life" | "wave" | "hyper"
  | "hyper-fail" | "respawn" | "over";

export interface RockEvent {
  type: RockEventType;
  x: number;
  y: number;
  size?: RockSize;
  points?: number;
  big?: boolean;
}

const ev = (type: RockEventType, x = 0, y = 0, extra: Partial<RockEvent> = {}): RockEvent => ({ type, x, y, ...extra });

// ------------------------------------------------------------------ helpers

export const wrap = (v: number, size: number) => ((v % size) + size) % size;

/** The shortest signed gap from b to a on a wrapping axis. */
export function wrapDelta(a: number, b: number, size: number) {
  let d = a - b;
  if (d > size / 2) d -= size;
  else if (d < -size / 2) d += size;
  return d;
}

export const rockRadius = (r: Rock) => ROCK_RADIUS[r.size];

/** How far the rock's outline is from its centre in the given direction (world angle). */
export function rockEdgeAt(r: Rock, worldAngle: number): number {
  const n = r.shape.length;
  const a = wrap(worldAngle - r.angle, TAU);
  const f = (a / TAU) * n;
  const i = Math.floor(f) % n;
  const t = f - Math.floor(f);
  return rockRadius(r) * (r.shape[i] * (1 - t) + r.shape[(i + 1) % n] * t);
}

/** Does a circle at (x, y) with radius pad overlap the rock's lumpy outline? */
export function hitsRock(s: RockState, r: Rock, x: number, y: number, pad = 0): boolean {
  const dx = wrapDelta(x, r.x, s.w);
  const dy = wrapDelta(y, r.y, s.h);
  const d = Math.hypot(dx, dy);
  const max = rockRadius(r) * 1.25 + pad;
  if (d > max) return false;
  return d <= rockEdgeAt(r, Math.atan2(dy, dx)) + pad;
}

/** The rock's outline as points, for drawing (x, y are the rock's centre). */
export function rockPoints(r: Rock): [number, number][] {
  const n = r.shape.length;
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = r.angle + (i / n) * TAU;
    const d = rockRadius(r) * r.shape[i];
    pts.push([Math.sin(a) * d, -Math.cos(a) * d]);
  }
  return pts;
}

function makeRock(s: RockState, x: number, y: number, size: RockSize, vx: number, vy: number): Rock {
  const n = size === 0 ? 12 : size === 1 ? 10 : 8;
  const shape: number[] = [];
  for (let i = 0; i < n; i++) shape.push(0.68 + s.rng() * 0.5);
  return { x, y, vx, vy, size, angle: s.rng() * TAU, spin: (s.rng() - 0.5) * 1.6, shape };
}

const rockSpeed = (s: RockState, size: RockSize) => {
  const base = [48, 82, 125][size] * (1 + Math.min(0.9, (s.wave - 1) * 0.06));
  return base * (0.7 + s.rng() * 0.6);
};

// ------------------------------------------------------------------ setup

export function newGame(seed = 1, w = 800, h = 600): RockState {
  const s: RockState = {
    w, h, score: 0, lives: START_LIVES, wave: 0, nextLife: EXTRA_LIFE_EVERY, rocks: [], bullets: [], saucer: null,
    saucerTimer: 14, ship: newShip(w, h), waveDelay: 0, phase: "play", time: 0, overTimer: 0, rng: mulberry32(seed),
  };
  s.ship.invuln = 1.5;
  startWave(s);
  return s;
}

function newShip(w: number, h: number): Ship {
  return { x: w / 2, y: h / 2, vx: 0, vy: 0, angle: 0, alive: true, thrusting: false, invuln: 0, respawn: 0, fireCooldown: 0, hyperCooldown: 0 };
}

/** Large rocks in the next wave: 4, 5, 6 … up to 11. */
export const rocksInWave = (wave: number) => Math.min(11, 3 + wave);

export function startWave(s: RockState, out: RockEvent[] = []) {
  s.wave++;
  const n = rocksInWave(s.wave);
  for (let i = 0; i < n; i++) {
    // Appear along the edges, never right on top of the ship.
    let x = 0;
    let y = 0;
    for (let tries = 0; tries < 20; tries++) {
      if (s.rng() < 0.5) {
        x = s.rng() * s.w;
        y = s.rng() < 0.5 ? 0 : s.h;
      } else {
        x = s.rng() < 0.5 ? 0 : s.w;
        y = s.rng() * s.h;
      }
      if (Math.hypot(wrapDelta(x, s.ship.x, s.w), wrapDelta(y, s.ship.y, s.h)) > 170) break;
    }
    const a = s.rng() * TAU;
    const sp = rockSpeed(s, 0);
    s.rocks.push(makeRock(s, x, y, 0, Math.cos(a) * sp, Math.sin(a) * sp));
  }
  s.saucerTimer = Math.max(7, 16 - s.wave);
  out.push(ev("wave"));
}

/** The playfield changed shape (a phone turned over): pull everything back inside. */
export function resize(s: RockState, w: number, h: number) {
  s.w = w;
  s.h = h;
  for (const r of s.rocks) {
    r.x = wrap(r.x, w);
    r.y = wrap(r.y, h);
  }
  for (const b of s.bullets) {
    b.x = wrap(b.x, w);
    b.y = wrap(b.y, h);
  }
  s.ship.x = wrap(s.ship.x, w);
  s.ship.y = wrap(s.ship.y, h);
  if (s.saucer) s.saucer.y = wrap(s.saucer.y, h);
}

// ------------------------------------------------------------------ actions

export interface RockInput {
  left: boolean;
  right: boolean;
  thrust: boolean;
  fire: boolean;
}

export function fire(s: RockState, out: RockEvent[] = []): boolean {
  const sh = s.ship;
  if (!sh.alive || sh.fireCooldown > 0) return false;
  if (s.bullets.filter((b) => !b.enemy).length >= MAX_SHIP_BULLETS) return false;
  sh.fireCooldown = FIRE_COOLDOWN;
  const nx = Math.sin(sh.angle);
  const ny = -Math.cos(sh.angle);
  s.bullets.push({
    x: sh.x + nx * SHIP_RADIUS, y: sh.y + ny * SHIP_RADIUS, vx: nx * BULLET_SPEED + sh.vx * 0.35, vy: ny * BULLET_SPEED + sh.vy * 0.35,
    life: BULLET_LIFE, enemy: false,
  });
  out.push(ev("shoot", sh.x, sh.y));
  return true;
}

/** Jump to a random spot. It's a gamble: sometimes the ship comes out the other side in pieces. */
export function hyperspace(s: RockState, out: RockEvent[] = []): boolean {
  const sh = s.ship;
  if (!sh.alive || sh.hyperCooldown > 0) return false;
  sh.hyperCooldown = HYPER_COOLDOWN;
  const x0 = sh.x;
  const y0 = sh.y;
  sh.x = 30 + s.rng() * (s.w - 60);
  sh.y = 30 + s.rng() * (s.h - 60);
  sh.vx *= 0.3;
  sh.vy *= 0.3;
  out.push(ev("hyper", x0, y0));
  if (s.rng() < hyperDeathChance(s)) {
    out.push(ev("hyper-fail", sh.x, sh.y));
    destroyShip(s, out);
    return true;
  }
  out.push(ev("hyper", sh.x, sh.y));
  return true;
}

/** About one jump in seven goes wrong, more when the screen is crowded. */
export const hyperDeathChance = (s: RockState) => Math.min(0.3, 0.12 + s.rocks.length * 0.006);

function destroyShip(s: RockState, out: RockEvent[]) {
  const sh = s.ship;
  if (!sh.alive) return;
  sh.alive = false;
  sh.thrusting = false;
  s.lives--;
  out.push(ev("ship-die", sh.x, sh.y));
  if (s.lives > 0) sh.respawn = RESPAWN_DELAY;
  else {
    sh.respawn = 0;
    s.overTimer = 2.4;
  }
}

function addScore(s: RockState, points: number, out: RockEvent[]) {
  s.score += points;
  while (s.score >= s.nextLife) {
    s.nextLife += EXTRA_LIFE_EVERY;
    s.lives++;
    out.push(ev("extra-life", s.ship.x, s.ship.y));
  }
}

/** Break a rock: two smaller ones (unless it was already small). Returns the points if scored. */
export function splitRock(s: RockState, i: number, award: boolean, out: RockEvent[]) {
  const r = s.rocks[i];
  s.rocks.splice(i, 1);
  out.push(ev("rock", r.x, r.y, { size: r.size }));
  if (award) addScore(s, ROCK_SCORE[r.size], out);
  if (r.size < 2) {
    const size = (r.size + 1) as RockSize;
    const base = s.rng() * TAU;
    for (let k = 0; k < 2; k++) {
      const a = base + k * Math.PI + (s.rng() - 0.5) * 0.9;
      const sp = rockSpeed(s, size);
      s.rocks.push(makeRock(s, r.x, r.y, size, r.vx * 0.4 + Math.cos(a) * sp, r.vy * 0.4 + Math.sin(a) * sp));
    }
  }
}

function spawnSaucer(s: RockState, out: RockEvent[]) {
  const small = s.score > 3500 && s.rng() < Math.min(0.85, 0.2 + s.score / 25000);
  const fromLeft = s.rng() < 0.5;
  const kind = small ? "small" : "big";
  const speed = small ? 150 : 110;
  s.saucer = {
    x: fromLeft ? -30 : s.w + 30, y: 40 + s.rng() * (s.h - 80), vx: fromLeft ? speed : -speed, vy: 0, kind, turnTimer: 0.8 + s.rng(),
    fireTimer: 0.9 + s.rng() * 0.6,
  };
  out.push(ev("saucer-spawn", s.saucer.x, s.saucer.y, { big: !small }));
}

function saucerShoot(s: RockState, sc: Saucer, out: RockEvent[]) {
  let a: number;
  if (sc.kind === "small" && s.ship.alive) {
    // The small saucer aims at you, and gets sharper as your score climbs.
    const dx = wrapDelta(s.ship.x, sc.x, s.w);
    const dy = wrapDelta(s.ship.y, sc.y, s.h);
    const err = Math.max(0.03, 0.34 - s.score / 60000);
    a = Math.atan2(dy, dx) + (s.rng() - 0.5) * 2 * err;
  } else a = s.rng() * TAU;
  s.bullets.push({ x: sc.x, y: sc.y, vx: Math.cos(a) * 330, vy: Math.sin(a) * 330, life: 1.7, enemy: true });
  out.push(ev("saucer-shoot", sc.x, sc.y));
}

/** Is the middle of the screen clear enough to put a new ship there? */
export function centreIsSafe(s: RockState, radius = 120): boolean {
  const cx = s.w / 2;
  const cy = s.h / 2;
  for (const r of s.rocks) if (Math.hypot(wrapDelta(r.x, cx, s.w), wrapDelta(r.y, cy, s.h)) < radius + rockRadius(r)) return false;
  if (s.saucer && Math.hypot(s.saucer.x - cx, s.saucer.y - cy) < radius) return false;
  for (const b of s.bullets) if (b.enemy && Math.hypot(b.x - cx, b.y - cy) < radius) return false;
  return true;
}

// ------------------------------------------------------------------ the update loop

export function update(s: RockState, dt: number, input: RockInput): RockEvent[] {
  const out: RockEvent[] = [];
  if (s.phase === "over") return out;
  s.time += dt;
  const sh = s.ship;

  // ---- the ship
  sh.fireCooldown = Math.max(0, sh.fireCooldown - dt);
  sh.hyperCooldown = Math.max(0, sh.hyperCooldown - dt);
  if (sh.alive) {
    sh.invuln = Math.max(0, sh.invuln - dt);
    if (input.left !== input.right) sh.angle += (input.right ? 1 : -1) * ROTATE_SPEED * dt;
    sh.angle = wrap(sh.angle, TAU);
    sh.thrusting = input.thrust;
    if (input.thrust) {
      sh.vx += Math.sin(sh.angle) * THRUST * dt;
      sh.vy += -Math.cos(sh.angle) * THRUST * dt;
    }
    const k = Math.exp(-FRICTION * dt);
    sh.vx *= k;
    sh.vy *= k;
    const sp = Math.hypot(sh.vx, sh.vy);
    if (sp > MAX_SPEED) {
      sh.vx *= MAX_SPEED / sp;
      sh.vy *= MAX_SPEED / sp;
    }
    sh.x = wrap(sh.x + sh.vx * dt, s.w);
    sh.y = wrap(sh.y + sh.vy * dt, s.h);
    if (input.fire) fire(s, out);
  } else if (s.lives > 0) {
    sh.respawn -= dt;
    // Wait for a clear patch of sky, but not for ever.
    if (sh.respawn <= 0 && (centreIsSafe(s) || sh.respawn < -2.5)) {
      Object.assign(sh, newShip(s.w, s.h), { invuln: INVULN_TIME });
      out.push(ev("respawn", sh.x, sh.y));
    }
  } else if (s.overTimer > 0) {
    s.overTimer -= dt;
    if (s.overTimer <= 0) {
      s.phase = "over";
      out.push(ev("over"));
    }
  }

  // ---- rocks drift and tumble
  for (const r of s.rocks) {
    r.x = wrap(r.x + r.vx * dt, s.w);
    r.y = wrap(r.y + r.vy * dt, s.h);
    r.angle += r.spin * dt;
  }

  // ---- bullets, moved in small pieces so a fast one can't skip over a small rock
  for (const b of s.bullets) stepBullet(s, b, dt, out);

  // ---- the saucer
  if (s.saucer) {
    const sc = s.saucer;
    sc.x += sc.vx * dt;
    sc.y = wrap(sc.y + sc.vy * dt, s.h);
    sc.turnTimer -= dt;
    if (sc.turnTimer <= 0) {
      sc.turnTimer = 0.7 + s.rng() * 1.2;
      sc.vy = [-85, 0, 85][Math.floor(s.rng() * 3)];
    }
    sc.fireTimer -= dt;
    if (sc.fireTimer <= 0) {
      sc.fireTimer = sc.kind === "small" ? 0.75 + s.rng() * 0.3 : 1.1 + s.rng() * 0.6;
      saucerShoot(s, sc, out);
    }
    if (sc.x < -60 || sc.x > s.w + 60) s.saucer = null;
  } else if (sh.alive || s.lives > 0) {
    s.saucerTimer -= dt;
    if (s.saucerTimer <= 0 && s.rocks.length > 0) {
      spawnSaucer(s, out);
      s.saucerTimer = Math.max(8, 20 - s.wave) + s.rng() * 8;
    }
  }

  collide(s, out);
  s.bullets = s.bullets.filter((b) => b.life > 0);

  // ---- next wave
  if (s.rocks.length === 0 && !s.saucer) {
    s.waveDelay += dt;
    if (s.waveDelay >= WAVE_DELAY) {
      s.waveDelay = 0;
      startWave(s, out);
    }
  } else s.waveDelay = 0;
  return out;
}

function stepBullet(s: RockState, b: Bullet, dt: number, out: RockEvent[]) {
  const sh = s.ship;
  const n = Math.max(1, Math.ceil((Math.hypot(b.vx, b.vy) * dt) / 6));
  const h = dt / n;
  for (let i = 0; i < n && b.life > 0; i++) {
    b.x = wrap(b.x + b.vx * h, s.w);
    b.y = wrap(b.y + b.vy * h, s.h);
    b.life -= h;
    for (let j = s.rocks.length - 1; j >= 0; j--) {
      if (hitsRock(s, s.rocks[j], b.x, b.y, 1)) {
        b.life = 0;
        splitRock(s, j, !b.enemy, out);
        break;
      }
    }
    if (b.life <= 0) break;
    if (!b.enemy && s.saucer && Math.hypot(b.x - s.saucer.x, wrapDelta(b.y, s.saucer.y, s.h)) < SAUCER_RADIUS[s.saucer.kind] + 2) {
      b.life = 0;
      killSaucer(s, true, out);
    } else if (b.enemy && sh.alive && sh.invuln <= 0 && Math.hypot(wrapDelta(b.x, sh.x, s.w), wrapDelta(b.y, sh.y, s.h)) < SHIP_RADIUS) {
      b.life = 0;
      destroyShip(s, out);
    }
  }
}

function collide(s: RockState, out: RockEvent[]) {
  const sh = s.ship;

  // The ship against rocks and the saucer.
  if (sh.alive && sh.invuln <= 0) {
    for (const r of s.rocks) {
      if (hitsRock(s, r, sh.x, sh.y, SHIP_RADIUS * 0.8)) {
        destroyShip(s, out);
        break;
      }
    }
    if (sh.alive && s.saucer && Math.hypot(s.saucer.x - sh.x, wrapDelta(s.saucer.y, sh.y, s.h)) < SAUCER_RADIUS[s.saucer.kind] + SHIP_RADIUS * 0.8) {
      killSaucer(s, true, out);
      destroyShip(s, out);
    }
  }

  // Rocks wreck the saucer too (for no points).
  if (s.saucer) {
    const sc = s.saucer;
    for (let i = s.rocks.length - 1; i >= 0; i--) {
      if (hitsRock(s, s.rocks[i], sc.x, sc.y, SAUCER_RADIUS[sc.kind] * 0.8)) {
        splitRock(s, i, false, out);
        killSaucer(s, false, out);
        break;
      }
    }
  }
}

function killSaucer(s: RockState, award: boolean, out: RockEvent[]) {
  const sc = s.saucer;
  if (!sc) return;
  s.saucer = null;
  const points = SAUCER_SCORE[sc.kind];
  if (award) addScore(s, points, out);
  out.push(ev("saucer-die", sc.x, sc.y, { points: award ? points : 0, big: sc.kind === "big" }));
}

/** Total "mass" of the rocks left (a large rock counts 4, medium 2, small 1): drives the beat's tempo. */
export function rockMass(s: RockState): number {
  let m = 0;
  for (const r of s.rocks) m += r.size === 0 ? 4 : r.size === 1 ? 2 : 1;
  return m;
}
