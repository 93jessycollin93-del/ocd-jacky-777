// Alien Wave rules: pure and seeded, so they can be tested. A formation marches side to side and steps
// down at the edges (faster as it thins out); some aliens peel off and swoop at you on curved paths;
// bunkers are made of little cells that blast away where they're hit.
import { mulberry32, type Rng } from "../../kit/rng";

export const W = 480;
export const H = 600;

export const FORM_COLS = 9;
export const FORM_ROWS = 5;
export const SPACING_X = 40;
export const SPACING_Y = 33;
export const ALIEN_W = 26;
export const ALIEN_H = 19;
export const STEP_X = 8;
export const DROP_Y = 16;
export const SIDE_MARGIN = 14;

export const PLAYER_Y = 556;
export const PLAYER_W = 28;
export const PLAYER_H = 16;
export const PLAYER_SPEED = 270;
export const START_LIVES = 3;
export const BULLET_SPEED = 540;
export const FIRE_COOLDOWN = 0.16;
export const UPGRADE_TIME = 20;

export const CELL = 3;
export const BUNKER_COLS = 22;
export const BUNKER_ROWS = 15;
export const BUNKER_Y = 462;
export const BUNKER_XS = [60, 180, 300, 420];

/** Points by alien design: 0 = top row … 3 = bottom row. */
export const ALIEN_POINTS = [40, 30, 20, 10] as const;
/** Which design each formation row uses. */
export const ROW_TYPES = [0, 1, 2, 2, 3] as const;
export const DIVE_MULTIPLIER = 2;
export const SAUCER_POINTS = [50, 100, 150, 300] as const;
export const EXTRA_LIFE_AT = 5000;
const INVULN = 2.2;
const RESPAWN = 1.4;
const WAVE_DELAY = 1.8;

export type AlienState = "form" | "dive" | "return";

export interface Alien {
  col: number;
  row: number;
  type: number;
  state: AlienState;
  x: number;
  y: number;
  /** Progress 0..1 along a dive or a return. */
  t: number;
  path: Pt[] | null;
  shots: number;
}

export interface Pt {
  x: number;
  y: number;
}

export interface Bunker {
  x: number;
  y: number;
  cells: Uint8Array;
}

export interface Bolt {
  x: number;
  y: number;
}

export interface AlienShot {
  x: number;
  y: number;
  vy: number;
  /** Side-to-side wobble (0 for a straight shot). */
  wobble: number;
  phase: number;
  baseX: number;
}

export interface Capsule {
  x: number;
  y: number;
}

export interface Saucer {
  x: number;
  y: number;
  vx: number;
}

export type Phase = "play" | "over";

export interface WaveState {
  wave: number;
  score: number;
  lives: number;
  nextLife: number;
  aliens: Alien[];
  totalAliens: number;
  /** Formation origin: where column 0, row 0 sits (its centre). */
  fx: number;
  fy: number;
  dir: 1 | -1;
  stepTimer: number;
  /** Flips every step: which of an alien's two animation frames is showing. */
  anim: 0 | 1;
  stepCount: number;
  bunkers: Bunker[];
  bolts: Bolt[];
  shots: AlienShot[];
  capsules: Capsule[];
  saucer: Saucer | null;
  saucerTimer: number;
  shotTimer: number;
  diveTimer: number;
  player: { x: number; target: number; alive: boolean; invuln: number; respawn: number; cooldown: number };
  upgrade: number;
  waveDelay: number;
  phase: Phase;
  /** How the run ended: the aliens landed, or you ran out of lives. */
  invaded: boolean;
  time: number;
  rng: Rng;
}

export type WaveEventType =
  | "shoot" | "alien-die" | "saucer-spawn" | "saucer-die" | "player-die" | "step" | "dive" | "alien-shot" | "bunker-hit"
  | "wave" | "extra-life" | "upgrade" | "over" | "respawn";

export interface WaveEvent {
  type: WaveEventType;
  x: number;
  y: number;
  points?: number;
  /** For "alien-die": the alien's design, and whether it was diving. */
  alienType?: number;
  diving?: boolean;
}

const ev = (type: WaveEventType, x = 0, y = 0, extra: Partial<WaveEvent> = {}): WaveEvent => ({ type, x, y, ...extra });

// ------------------------------------------------------------------ bunkers

/** A fresh bunker: an arch with a notch cut out of the bottom and rounded shoulders. */
export function makeBunker(cx: number): Bunker {
  const cells = new Uint8Array(BUNKER_COLS * BUNKER_ROWS);
  for (let r = 0; r < BUNKER_ROWS; r++) {
    for (let c = 0; c < BUNKER_COLS; c++) {
      let on = true;
      const corner = Math.min(c, BUNKER_COLS - 1 - c);
      if (r < 3 && corner < 3 - r) on = false; // rounded shoulders
      if (r >= BUNKER_ROWS - 5 && c >= 7 && c <= BUNKER_COLS - 8) {
        // The doorway: a little taller in the middle.
        const inset = Math.min(c - 7, BUNKER_COLS - 8 - c);
        if (r >= BUNKER_ROWS - 4 - Math.min(inset, 1)) on = false;
      }
      cells[r * BUNKER_COLS + c] = on ? 1 : 0;
    }
  }
  return { x: cx - (BUNKER_COLS * CELL) / 2, y: BUNKER_Y, cells };
}

export const bunkerCells = (b: Bunker) => b.cells.reduce((n, v) => n + v, 0);

/** Is there still bunker at this point? */
export function bunkerAt(b: Bunker, x: number, y: number): boolean {
  const c = Math.floor((x - b.x) / CELL);
  const r = Math.floor((y - b.y) / CELL);
  return c >= 0 && c < BUNKER_COLS && r >= 0 && r < BUNKER_ROWS && b.cells[r * BUNKER_COLS + c] === 1;
}

/** Blast a ragged hole around a point. Returns how many cells went. */
export function erodeBunker(b: Bunker, x: number, y: number, radius: number, rng: Rng): number {
  const cx = (x - b.x) / CELL;
  const cy = (y - b.y) / CELL;
  let removed = 0;
  const reach = Math.ceil(radius) + 1;
  for (let r = Math.floor(cy) - reach; r <= Math.floor(cy) + reach; r++) {
    for (let c = Math.floor(cx) - reach; c <= Math.floor(cx) + reach; c++) {
      if (c < 0 || c >= BUNKER_COLS || r < 0 || r >= BUNKER_ROWS) continue;
      const i = r * BUNKER_COLS + c;
      if (!b.cells[i]) continue;
      const d = Math.hypot(c + 0.5 - cx, r + 0.5 - cy);
      if (d <= radius * (0.55 + 0.45 * rng())) {
        b.cells[i] = 0;
        removed++;
      }
    }
  }
  return removed;
}

/** Clear every cell under a rectangle (an alien marching through). */
export function trampleBunker(b: Bunker, x: number, y: number, w: number, h: number): number {
  let removed = 0;
  const c0 = Math.max(0, Math.floor((x - b.x) / CELL));
  const c1 = Math.min(BUNKER_COLS - 1, Math.floor((x + w - b.x) / CELL));
  const r0 = Math.max(0, Math.floor((y - b.y) / CELL));
  const r1 = Math.min(BUNKER_ROWS - 1, Math.floor((y + h - b.y) / CELL));
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      const i = r * BUNKER_COLS + c;
      if (b.cells[i]) {
        b.cells[i] = 0;
        removed++;
      }
    }
  }
  return removed;
}

// ------------------------------------------------------------------ formation

/**
 * Seconds between formation steps. The fewer aliens are left (and the later the wave), the quicker they
 * march: a full formation plods, the last alien sprints.
 */
export function stepDelay(alive: number, total: number, wave: number): number {
  const frac = Math.max(0, Math.min(1, alive / Math.max(1, total)));
  const base = Math.max(0.3, 0.52 - 0.03 * (wave - 1));
  return Math.max(0.03, 0.025 + base * frac ** 1.15);
}

/** Where a formation alien sits right now. */
export const slotX = (s: Pick<WaveState, "fx">, col: number) => s.fx + col * SPACING_X;
export const slotY = (s: Pick<WaveState, "fy">, row: number) => s.fy + row * SPACING_Y;

export const formationAliens = (s: WaveState) => s.aliens.filter((a) => a.state === "form");

/** Move the whole formation one step: sideways, or down and around if it has reached an edge. */
export function stepFormation(s: WaveState, out: WaveEvent[] = []) {
  const form = formationAliens(s);
  s.anim = s.anim === 0 ? 1 : 0;
  s.stepCount++;
  out.push(ev("step", 0, 0));
  if (form.length === 0) return;
  let minX = Infinity;
  let maxX = -Infinity;
  for (const a of form) {
    const x = slotX(s, a.col);
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
  }
  const half = ALIEN_W / 2;
  if ((s.dir > 0 && maxX + STEP_X + half > W - SIDE_MARGIN) || (s.dir < 0 && minX - STEP_X - half < SIDE_MARGIN)) {
    s.fy += DROP_Y;
    s.dir = s.dir > 0 ? -1 : 1;
  } else s.fx += s.dir * STEP_X;
  for (const a of form) {
    a.x = slotX(s, a.col);
    a.y = slotY(s, a.row);
  }
  // Marching through a bunker wipes out what it touches.
  for (const a of form) for (const b of s.bunkers) trampleBunker(b, a.x - half, a.y - ALIEN_H / 2, ALIEN_W, ALIEN_H);
}

/** The lowest edge of any alien still in formation (to see if they have landed). */
export function lowestAlien(s: WaveState): number {
  let low = -Infinity;
  for (const a of s.aliens) if (a.state === "form" && a.y + ALIEN_H / 2 > low) low = a.y + ALIEN_H / 2;
  return low;
}

// ------------------------------------------------------------------ diving

/** A curved Galaga-style swoop: out to the side in an arc, then down across the screen at the target. */
export function makeDivePath(x0: number, y0: number, targetX: number, side: 1 | -1): Pt[] {
  return [
    { x: x0, y: y0 },
    { x: x0 + side * 150, y: y0 - 70 },
    { x: targetX - side * 150, y: H * 0.45 },
    { x: targetX, y: H + 40 },
  ];
}

export function bezier(p: Pt[], t: number): Pt {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return { x: a * p[0].x + b * p[1].x + c * p[2].x + d * p[3].x, y: a * p[0].y + b * p[1].y + c * p[2].y + d * p[3].y };
}

export const maxDivers = (wave: number) => Math.min(4, 1 + Math.floor(wave / 2));
const diveDuration = (wave: number) => Math.max(1.7, 2.6 - 0.08 * wave);
const diveInterval = (s: WaveState) => Math.max(1.1, 4.2 - 0.3 * s.wave) * (0.7 + s.rng() * 0.6);

function startDive(s: WaveState, a: Alien, out: WaveEvent[]) {
  const side: 1 | -1 = a.x < W / 2 ? 1 : -1;
  const target = Math.max(40, Math.min(W - 40, s.player.x + (s.rng() - 0.5) * 90));
  a.state = "dive";
  a.t = 0;
  a.path = makeDivePath(a.x, a.y, target, side);
  a.shots = s.wave >= 3 ? 2 : 1;
  out.push(ev("dive", a.x, a.y));
}

// ------------------------------------------------------------------ setup

export function newGame(seed = 1): WaveState {
  const s: WaveState = {
    wave: 0, score: 0, lives: START_LIVES, nextLife: EXTRA_LIFE_AT, aliens: [], totalAliens: 0, fx: 0, fy: 0, dir: 1, stepTimer: 0.5, anim: 0,
    stepCount: 0, bunkers: [], bolts: [], shots: [], capsules: [], saucer: null, saucerTimer: 18,
    shotTimer: 1.5, diveTimer: 6, player: { x: W / 2, target: W / 2, alive: true, invuln: 0, respawn: 0, cooldown: 0 }, upgrade: 0,
    waveDelay: 0, phase: "play", invaded: false, time: 0, rng: mulberry32(seed),
  };
  startWave(s);
  return s;
}

/** Lay out a new wave: the formation, fresh bunkers, and difficulty settings that grow with the wave number. */
export function startWave(s: WaveState, out: WaveEvent[] = []) {
  s.wave++;
  s.aliens = [];
  for (let row = 0; row < FORM_ROWS; row++) {
    for (let col = 0; col < FORM_COLS; col++) {
      s.aliens.push({ col, row, type: ROW_TYPES[row], state: "form", x: 0, y: 0, t: 0, path: null, shots: 0 });
    }
  }
  s.totalAliens = s.aliens.length;
  s.fx = (W - (FORM_COLS - 1) * SPACING_X) / 2;
  s.fy = 92 + Math.min(s.wave - 1, 6) * 14;
  s.dir = 1;
  s.anim = 0;
  s.stepTimer = 0.6;
  for (const a of s.aliens) {
    a.x = slotX(s, a.col);
    a.y = slotY(s, a.row);
  }
  s.bunkers = BUNKER_XS.map(makeBunker);
  s.bolts = [];
  s.shots = [];
  s.capsules = [];
  s.shotTimer = 1.4;
  s.diveTimer = Math.max(2, 7 - s.wave * 0.5);
  s.waveDelay = 0;
  out.push(ev("wave"));
}

// ------------------------------------------------------------------ actions

export interface WaveInput {
  left: boolean;
  right: boolean;
  fire: boolean;
}

export const hasUpgrade = (s: WaveState) => s.upgrade > 0;
/** How many bolts may be in the air at once: one, or two volleys of twin bolts with the upgrade. */
export const maxBolts = (s: WaveState) => (hasUpgrade(s) ? 4 : 1);

export function setTarget(s: WaveState, x: number) {
  s.player.target = Math.max(PLAYER_W / 2, Math.min(W - PLAYER_W / 2, x));
}

export function fire(s: WaveState, out: WaveEvent[] = []): boolean {
  const p = s.player;
  if (!p.alive || p.cooldown > 0) return false;
  if (hasUpgrade(s)) {
    if (s.bolts.length > 2) return false;
    s.bolts.push({ x: p.x - 8, y: PLAYER_Y - 10 }, { x: p.x + 8, y: PLAYER_Y - 10 });
  } else {
    if (s.bolts.length >= 1) return false;
    s.bolts.push({ x: p.x, y: PLAYER_Y - 10 });
  }
  p.cooldown = FIRE_COOLDOWN;
  out.push(ev("shoot", p.x, PLAYER_Y));
  return true;
}

function addScore(s: WaveState, points: number, out: WaveEvent[]) {
  s.score += points;
  while (s.score >= s.nextLife) {
    s.nextLife += 10000;
    s.lives++;
    out.push(ev("extra-life", s.player.x, PLAYER_Y));
  }
}

function killPlayer(s: WaveState, out: WaveEvent[]) {
  const p = s.player;
  if (!p.alive) return;
  p.alive = false;
  s.lives--;
  s.upgrade = 0;
  s.shots = [];
  s.bolts = [];
  out.push(ev("player-die", p.x, PLAYER_Y));
  if (s.lives > 0) p.respawn = RESPAWN;
  else p.respawn = 1.6;
}

/** Remove an alien, scoring it (double if it was diving) and maybe dropping an upgrade. */
export function killAlien(s: WaveState, a: Alien, out: WaveEvent[]) {
  const i = s.aliens.indexOf(a);
  if (i < 0) return;
  s.aliens.splice(i, 1);
  const diving = a.state !== "form";
  const points = ALIEN_POINTS[a.type] * (diving ? DIVE_MULTIPLIER : 1);
  addScore(s, points, out);
  out.push(ev("alien-die", a.x, a.y, { points, alienType: a.type, diving }));
  if (diving && s.rng() < 0.25) s.capsules.push({ x: a.x, y: a.y });
}

// ------------------------------------------------------------------ the update loop

const overlap = (ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number) =>
  Math.abs(ax - bx) * 2 < aw + bw && Math.abs(ay - by) * 2 < ah + bh;

export function update(s: WaveState, dt: number, input: WaveInput): WaveEvent[] {
  const out: WaveEvent[] = [];
  if (s.phase === "over") return out;
  s.time += dt;
  const p = s.player;

  // ---- the player
  p.cooldown = Math.max(0, p.cooldown - dt);
  if (s.upgrade > 0) s.upgrade = Math.max(0, s.upgrade - dt);
  if (p.alive) {
    p.invuln = Math.max(0, p.invuln - dt);
    if (input.left !== input.right) p.target = Math.max(PLAYER_W / 2, Math.min(W - PLAYER_W / 2, p.target + (input.right ? 1 : -1) * PLAYER_SPEED * dt * 1.6));
    const d = p.target - p.x;
    const m = Math.max(-PLAYER_SPEED * 1.6 * dt, Math.min(PLAYER_SPEED * 1.6 * dt, d));
    p.x = Math.max(PLAYER_W / 2, Math.min(W - PLAYER_W / 2, p.x + m));
    if (input.fire) fire(s, out);
  } else {
    p.respawn -= dt;
    if (p.respawn <= 0) {
      if (s.lives <= 0) {
        s.phase = "over";
        out.push(ev("over"));
        return out;
      }
      p.alive = true;
      p.invuln = INVULN;
      p.x = W / 2;
      p.target = W / 2;
      out.push(ev("respawn", p.x, PLAYER_Y));
    }
  }

  // ---- the formation marches
  s.stepTimer -= dt;
  let guard = 0;
  while (s.stepTimer <= 0 && guard++ < 4) {
    stepFormation(s, out);
    s.stepTimer += stepDelay(s.aliens.length, s.totalAliens, s.wave);
  }
  if (p.alive && lowestAlien(s) >= PLAYER_Y - PLAYER_H / 2 - 4) {
    // They've landed: it's over, whatever lives you had left.
    s.invaded = true;
    s.lives = 1;
    killPlayer(s, out);
  }

  // ---- divers and returners
  for (const a of s.aliens) {
    if (a.state === "dive" && a.path) {
      const before = a.t;
      a.t += dt / diveDuration(s.wave);
      const pt = bezier(a.path, Math.min(1, a.t));
      a.x = pt.x;
      a.y = pt.y;
      if (a.shots > 0 && before < 0.42 && a.t >= 0.42 && p.alive) {
        a.shots--;
        s.shots.push({ x: a.x, y: a.y + 10, vy: 230 + s.wave * 8, wobble: 0, phase: 0, baseX: a.x });
        out.push(ev("alien-shot", a.x, a.y));
      }
      if (a.t >= 1) {
        // Off the bottom of the screen: it will drop back in from the top.
        a.state = "return";
        a.t = 0;
        a.path = null;
        a.x = slotX(s, a.col);
        a.y = -30;
      }
    } else if (a.state === "return") {
      a.t += dt / 1.1;
      const tx = slotX(s, a.col);
      const ty = slotY(s, a.row);
      const k = Math.min(1, a.t);
      const e = 1 - (1 - k) ** 3;
      a.x = tx;
      a.y = -30 + (ty + 30) * e;
      if (a.t >= 1) {
        a.state = "form";
        a.x = tx;
        a.y = ty;
      }
    } else if (a.state === "form") {
      a.x = slotX(s, a.col);
      a.y = slotY(s, a.row);
    }
    if (a.state === "dive") for (const b of s.bunkers) trampleBunker(b, a.x - 8, a.y - 6, 16, 12);
  }
  if (s.aliens.length > 0) {
    s.diveTimer -= dt;
    if (s.diveTimer <= 0) {
      s.diveTimer = diveInterval(s);
      const divers = s.aliens.filter((a) => a.state !== "form").length;
      const pool = formationAliens(s);
      if (divers < maxDivers(s.wave) && pool.length > 3 && s.fy < 260 && p.alive) startDive(s, pool[Math.floor(s.rng() * pool.length)], out);
    }
  }

  // ---- alien fire from the bottom of a random column
  s.shotTimer -= dt;
  if (s.shotTimer <= 0 && p.alive) {
    const frac = s.aliens.length / Math.max(1, s.totalAliens);
    s.shotTimer = Math.max(0.35, 1.5 - 0.1 * s.wave - (1 - frac) * 0.4) * (0.6 + s.rng() * 0.8);
    const cap = Math.min(8, 3 + s.wave);
    if (s.shots.length < cap) {
      const cols = new Map<number, Alien>();
      for (const a of formationAliens(s)) {
        const cur = cols.get(a.col);
        if (!cur || a.row > cur.row) cols.set(a.col, a);
      }
      const shooters = [...cols.values()];
      if (shooters.length) {
        const a = shooters[Math.floor(s.rng() * shooters.length)];
        s.shots.push({ x: a.x, y: a.y + ALIEN_H / 2, vy: Math.min(300, 175 + s.wave * 14), wobble: s.rng() < 0.4 ? 9 : 0, phase: s.rng() * 6, baseX: a.x });
        out.push(ev("alien-shot", a.x, a.y));
      }
    }
  }
  for (const sh of s.shots) {
    sh.y += sh.vy * dt;
    sh.phase += dt * 9;
    sh.x = sh.baseX + (sh.wobble ? Math.sin(sh.phase) * sh.wobble : 0);
  }

  // ---- the mystery saucer
  if (s.saucer) {
    s.saucer.x += s.saucer.vx * dt;
    if (s.saucer.x < -40 || s.saucer.x > W + 40) s.saucer = null;
  } else {
    s.saucerTimer -= dt;
    if (s.saucerTimer <= 0 && s.aliens.length > 6) {
      const left = s.rng() < 0.5;
      s.saucer = { x: left ? -30 : W + 30, y: 56, vx: left ? 95 : -95 };
      s.saucerTimer = 20 + s.rng() * 12;
      out.push(ev("saucer-spawn", s.saucer.x, s.saucer.y));
    }
  }

  // ---- upgrade capsules
  for (const c of s.capsules) c.y += 100 * dt;
  s.capsules = s.capsules.filter((c) => {
    if (p.alive && overlap(c.x, c.y, 22, 16, p.x, PLAYER_Y, PLAYER_W, PLAYER_H)) {
      s.upgrade = UPGRADE_TIME;
      out.push(ev("upgrade", c.x, c.y));
      return false;
    }
    return c.y < H + 20;
  });

  moveBolts(s, dt, out);
  moveShots(s, out);

  // ---- wave progress
  if (s.aliens.length === 0 && p.alive) {
    s.waveDelay += dt;
    if (s.waveDelay >= WAVE_DELAY) startWave(s, out);
  }
  return out;
}

function moveBolts(s: WaveState, dt: number, out: WaveEvent[]) {
  const keep: Bolt[] = [];
  for (const b of s.bolts) {
    let alive = true;
    const n = Math.max(1, Math.ceil((BULLET_SPEED * dt) / 5));
    for (let i = 0; i < n && alive; i++) {
      b.y -= (BULLET_SPEED * dt) / n;
      if (b.y < -12) {
        alive = false;
        break;
      }
      // Bunkers first (they sit lower than most aliens).
      for (const bk of s.bunkers) {
        if (bunkerAt(bk, b.x, b.y - 5)) {
          erodeBunker(bk, b.x, b.y - 5, 2.6, s.rng);
          out.push(ev("bunker-hit", b.x, b.y));
          alive = false;
          break;
        }
      }
      if (!alive) break;
      for (const a of s.aliens) {
        if (overlap(b.x, b.y - 4, 3, 10, a.x, a.y, ALIEN_W - 4, ALIEN_H - 2)) {
          killAlien(s, a, out);
          alive = false;
          break;
        }
      }
      if (!alive) break;
      if (s.saucer && overlap(b.x, b.y - 4, 3, 10, s.saucer.x, s.saucer.y, 34, 14)) {
        const points = SAUCER_POINTS[Math.floor(s.rng() * SAUCER_POINTS.length)];
        addScore(s, points, out);
        out.push(ev("saucer-die", s.saucer.x, s.saucer.y, { points }));
        s.capsules.push({ x: s.saucer.x, y: s.saucer.y });
        s.saucer = null;
        alive = false;
      }
    }
    if (alive) keep.push(b);
  }
  s.bolts = keep;
}

function moveShots(s: WaveState, out: WaveEvent[]) {
  const p = s.player;
  const keep: AlienShot[] = [];
  for (const sh of s.shots) {
    let alive = sh.y < H + 10;
    if (alive) {
      for (const bk of s.bunkers) {
        if (bunkerAt(bk, sh.x, sh.y + 5) || bunkerAt(bk, sh.x, sh.y)) {
          erodeBunker(bk, sh.x, sh.y + 4, 2.6, s.rng);
          out.push(ev("bunker-hit", sh.x, sh.y));
          alive = false;
          break;
        }
      }
    }
    if (alive && p.alive && p.invuln <= 0 && overlap(sh.x, sh.y, 4, 12, p.x, PLAYER_Y, PLAYER_W - 4, PLAYER_H)) {
      killPlayer(s, out);
      alive = false;
    }
    if (alive) keep.push(sh);
  }
  if (p.alive) s.shots = keep;
  else s.shots = [];
  // Divers ramming the ship.
  if (p.alive && p.invuln <= 0) {
    for (const a of s.aliens) {
      if (a.state === "dive" && overlap(a.x, a.y, ALIEN_W - 6, ALIEN_H - 4, p.x, PLAYER_Y, PLAYER_W - 4, PLAYER_H)) {
        killAlien(s, a, out);
        killPlayer(s, out);
        break;
      }
    }
  }
}
