// Maze Muncher rules: pure and seeded so they can be tested. Positions are in tiles, with tile centres on
// whole numbers. Hunters choose a direction at every tile centre by heading for a target tile, the way
// the classic maze-chase game does it; the muncher has buffered turns and can cut corners.
import { mulberry32, type Rng } from "../../kit/rng";
import {
  BONUS_SPOT, COLS, PEN_CENTRE_Y, PEN_DOOR, PLAYER_START, freshDots, inTunnel, isOpen, wrapX,
} from "./maze";

export type Dir = 0 | 1 | 2 | 3;
export const UP: Dir = 0;
export const LEFT: Dir = 1;
export const DOWN: Dir = 2;
export const RIGHT: Dir = 3;
export const DX = [0, -1, 0, 1];
export const DY = [-1, 0, 1, 0];
export const OPP: Dir[] = [DOWN, RIGHT, UP, LEFT];

/** Tiles per second at full ("100%") speed. */
export const BASE_SPEED = 9.5;
/** How far before or after a tile centre the muncher may start a turn (cornering). */
export const CORNER = 0.42;
/** How close (in tiles, per axis) a hunter must be to touch the muncher. */
export const TOUCH = 0.55;
export const EXTRA_LIFE_AT = 10_000;
export const START_LIVES = 3;
const STEP = 1 / 120;
const EPS = 1e-6;

export const READY_TIME = 2.2;
export const EAT_PAUSE = 0.7;
/** Freeze after being caught, then the death animation. */
export const DEATH_FREEZE = 0.8;
export const DEATH_ANIM = 1.5;
export const CLEAR_FREEZE = 0.6;
export const CLEAR_FLASH = 2;
/** Frightened hunters flash during this many final seconds. */
export const FLASH_TIME = 2;

export interface HunterInfo {
  name: string;
  color: string;
  /** What it does in chase mode, for the title screen. */
  role: string;
  scatter: { x: number; y: number };
  home: { x: number; y: number };
}

export const HUNTERS: HunterInfo[] = [
  { name: "Ember", color: "#ff5a4e", role: "chases you", scatter: { x: 25, y: -3 }, home: { x: 13.5, y: PEN_CENTRE_Y } },
  { name: "Hex", color: "#d17cff", role: "ambushes ahead", scatter: { x: 2, y: -3 }, home: { x: 13.5, y: PEN_CENTRE_Y } },
  { name: "Frost", color: "#3fe0cf", role: "flanks with Ember", scatter: { x: 27, y: 31 }, home: { x: 11.5, y: PEN_CENTRE_Y } },
  { name: "Moss", color: "#a5e05a", role: "shy up close", scatter: { x: 0, y: 31 }, home: { x: 15.5, y: PEN_CENTRE_Y } },
];

export const BONUS_ITEMS = [
  { name: "Berry", points: 100 },
  { name: "Lemon", points: 300 },
  { name: "Plum", points: 500 },
  { name: "Pear", points: 700 },
  { name: "Mushroom", points: 1000 },
  { name: "Melon", points: 2000 },
  { name: "Crown", points: 3000 },
  { name: "Gem", points: 5000 },
];

export type HunterMode = "house" | "leaving" | "roam" | "eyes" | "entering";
export type Phase = "ready" | "play" | "eat" | "dying" | "clear" | "over";

export interface Hunter {
  id: number;
  x: number;
  y: number;
  dir: Dir;
  mode: HunterMode;
  frightened: boolean;
  /** Personal dot counter while waiting in the pen. */
  dots: number;
}

export interface Muncher {
  x: number;
  y: number;
  dir: Dir;
  /** The buffered direction: taken as soon as the maze allows. -1 = none. */
  want: Dir | -1;
  /** Seconds left of the tiny pause after eating. */
  stall: number;
  moving: boolean;
  /** Distance travelled, for the chomping animation. */
  travelled: number;
}

export interface MazeState {
  level: number;
  score: number;
  lives: number;
  extraGiven: boolean;
  dots: Uint8Array;
  dotsLeft: number;
  dotsEaten: number;
  player: Muncher;
  hunters: Hunter[];
  phase: Phase;
  phaseTime: number;
  readyTime: number;
  /** Index into the scatter/chase schedule (even = scatter) and time spent in it. */
  modeIndex: number;
  modeTime: number;
  /** Frightened time left, the level's full frightened time, and hunters eaten in this spell. */
  fright: number;
  frightMax: number;
  chain: number;
  bonus: { kind: number; ttl: number } | null;
  /** Where the last hunter was eaten and for how much (shown during the pause). */
  eaten: { x: number; y: number; points: number } | null;
  /** Seconds since a dot was eaten (a hunter leaves the pen if you stall). */
  sinceDot: number;
  /** Shared dot counter used after losing a life; -1 when off. */
  globalDots: number;
  /** The chaser's late-level speed-up is suspended after a death until the last hunter is out. */
  elroyOn: boolean;
  acc: number;
  rng: Rng;
}

export type MazeEventType =
  | "go" | "dot" | "pellet" | "hunter" | "bonus" | "bonus-spawn" | "bonus-gone" | "caught" | "death"
  | "life-lost" | "extra-life" | "clear" | "level" | "over" | "mode";

export interface MazeEvent {
  type: MazeEventType;
  x: number;
  y: number;
  points: number;
}

const ev = (type: MazeEventType, x = 0, y = 0, points = 0): MazeEvent => ({ type, x, y, points });

// ------------------------------------------------------------------ level tables

export interface Speeds {
  player: number;
  playerFright: number;
  hunter: number;
  hunterFright: number;
  tunnel: number;
}

const SPEEDS_1: Speeds = { player: 0.8, playerFright: 0.9, hunter: 0.75, hunterFright: 0.5, tunnel: 0.4 };
const SPEEDS_2: Speeds = { player: 0.9, playerFright: 0.95, hunter: 0.85, hunterFright: 0.55, tunnel: 0.45 };
const SPEEDS_5: Speeds = { player: 1, playerFright: 1, hunter: 0.95, hunterFright: 0.6, tunnel: 0.5 };
const SPEEDS_21: Speeds = { player: 0.9, playerFright: 0.9, hunter: 0.95, hunterFright: 0.6, tunnel: 0.5 };

/** Speeds as fractions of BASE_SPEED: everyone gets quicker over the first levels. */
export function speedsFor(level: number): Speeds {
  if (level <= 1) return SPEEDS_1;
  if (level <= 4) return SPEEDS_2;
  if (level <= 20) return SPEEDS_5;
  return SPEEDS_21;
}

const FRIGHT = [6, 5, 4, 3, 2, 5, 2, 2, 1, 5, 2, 1, 1, 3, 1, 1, 0, 1];
/** Seconds the hunters stay frightened after a power pellet: it shrinks as levels go by. */
export const frightTimeFor = (level: number) => FRIGHT[level - 1] ?? 0;

const SCHEDULE_1 = [7, 20, 7, 20, 5, 20, 5, Infinity];
const SCHEDULE_2 = [7, 20, 7, 20, 5, 1033, 1 / 60, Infinity];
const SCHEDULE_5 = [5, 20, 5, 20, 5, 1037, 1 / 60, Infinity];
/** Alternating scatter / chase durations (seconds), starting with scatter. */
export function modeSchedule(level: number): number[] {
  if (level <= 1) return SCHEDULE_1;
  if (level <= 4) return SCHEDULE_2;
  return SCHEDULE_5;
}

export const currentMode = (s: MazeState): "scatter" | "chase" => (s.modeIndex % 2 === 0 ? "scatter" : "chase");

/** Dots each hunter waits for in the pen (personal counters). */
function dotLimit(level: number, id: number): number {
  if (level === 1) return [0, 0, 30, 60][id];
  if (level === 2) return [0, 0, 0, 50][id];
  return 0;
}
const GLOBAL_LIMITS = [0, 7, 17, 32];
const releaseTimer = (level: number) => (level < 5 ? 4 : 3);

function elroyDots(level: number): number {
  if (level <= 1) return 20;
  if (level <= 2) return 30;
  if (level <= 5) return 40;
  if (level <= 8) return 50;
  if (level <= 11) return 60;
  if (level <= 14) return 80;
  if (level <= 18) return 100;
  return 120;
}

/** 0 = normal, 1 or 2 = the chaser has sped up because few dots are left. */
export function elroy(s: MazeState): 0 | 1 | 2 {
  if (!s.elroyOn) return 0;
  const n = elroyDots(s.level);
  if (s.dotsLeft <= n / 2) return 2;
  if (s.dotsLeft <= n) return 1;
  return 0;
}

export function bonusForLevel(level: number): number {
  if (level <= 1) return 0;
  if (level === 2) return 1;
  if (level >= 13) return 7;
  return 2 + Math.floor((level - 3) / 2);
}

/** Points for the n-th hunter eaten on one power pellet (0-based): 200, 400, 800, 1600. */
export const hunterPoints = (chain: number) => 200 * 2 ** Math.min(3, chain);

// ------------------------------------------------------------------ setup

function countDots(d: Uint8Array) {
  let n = 0;
  for (let i = 0; i < d.length; i++) if (d[i]) n++;
  return n;
}

export function newGame(seed = 1): MazeState {
  const dots = freshDots();
  const s: MazeState = {
    level: 1, score: 0, lives: START_LIVES, extraGiven: false, dots, dotsLeft: countDots(dots), dotsEaten: 0,
    player: { x: 0, y: 0, dir: LEFT, want: -1, stall: 0, moving: false, travelled: 0 },
    hunters: HUNTERS.map((_, id) => ({ id, x: 0, y: 0, dir: LEFT, mode: "house" as HunterMode, frightened: false, dots: 0 })),
    phase: "ready", phaseTime: 0, readyTime: READY_TIME + 1, modeIndex: 0, modeTime: 0, fright: 0, frightMax: 0, chain: 0,
    bonus: null, eaten: null, sinceDot: 0, globalDots: -1, elroyOn: true, acc: 0, rng: mulberry32(seed),
  };
  resetActors(s, false);
  return s;
}

/** Put everyone back at their start spots (after a death or for a new level). */
export function resetActors(s: MazeState, afterDeath: boolean) {
  const p = s.player;
  p.x = PLAYER_START.x;
  p.y = PLAYER_START.y;
  p.dir = LEFT;
  p.want = -1;
  p.stall = 0;
  p.moving = false;
  for (const h of s.hunters) {
    h.frightened = false;
    if (h.id === 0) {
      h.x = PEN_DOOR.x;
      h.y = PEN_DOOR.y;
      h.dir = LEFT;
      h.mode = "roam";
    } else {
      h.x = HUNTERS[h.id].home.x;
      h.y = HUNTERS[h.id].home.y;
      h.dir = h.id === 1 ? DOWN : UP;
      h.mode = "house";
    }
    if (!afterDeath) h.dots = 0;
  }
  s.globalDots = afterDeath ? 0 : -1;
  s.elroyOn = !afterDeath;
  s.modeIndex = 0;
  s.modeTime = 0;
  s.fright = 0;
  s.chain = 0;
  s.bonus = null;
  s.eaten = null;
  s.sinceDot = 0;
  s.acc = 0;
}

// ------------------------------------------------------------------ input

/** Ask the muncher to go this way; it turns as soon as the maze allows. */
export function steer(s: MazeState, d: Dir) {
  s.player.want = d;
}

// ------------------------------------------------------------------ targeting

export interface Point {
  x: number;
  y: number;
}

export const tileOf = (x: number, y: number): Point => ({ x: wrapX(Math.round(x)), y: Math.round(y) });

/**
 * Where a hunter heads in chase mode. Pure, so the four personalities can be tested:
 * 0 goes straight for you, 1 aims four tiles ahead of you, 2 doubles the vector from hunter 0 to two tiles
 * ahead of you (a pincer), and 3 chases you until it gets within eight tiles, then backs off to its corner.
 */
export function chaseTarget(id: number, hunterTile: Point, playerTile: Point, playerDir: Dir, chaserTile: Point): Point {
  switch (id) {
    case 0:
      return { x: playerTile.x, y: playerTile.y };
    case 1:
      return { x: playerTile.x + DX[playerDir] * 4, y: playerTile.y + DY[playerDir] * 4 };
    case 2: {
      const px = playerTile.x + DX[playerDir] * 2;
      const py = playerTile.y + DY[playerDir] * 2;
      return { x: px * 2 - chaserTile.x, y: py * 2 - chaserTile.y };
    }
    default: {
      const dx = hunterTile.x - playerTile.x;
      const dy = hunterTile.y - playerTile.y;
      return dx * dx + dy * dy > 64 ? { x: playerTile.x, y: playerTile.y } : { ...HUNTERS[3].scatter };
    }
  }
}

/** The tile a hunter is steering for right now. */
export function targetFor(s: MazeState, h: Hunter): Point {
  if (h.mode === "eyes") return { x: Math.floor(PEN_DOOR.x), y: PEN_DOOR.y };
  if (currentMode(s) === "scatter" && !(h.id === 0 && elroy(s) > 0)) return HUNTERS[h.id].scatter;
  const p = s.player;
  const chaser = s.hunters[0];
  return chaseTarget(h.id, tileOf(h.x, h.y), tileOf(p.x, p.y), p.dir, tileOf(chaser.x, chaser.y));
}

/** Pick the way out of the tile a hunter has just reached: never back, nearest to the target. */
export function chooseDir(s: MazeState, h: Hunter): Dir {
  const tx = Math.round(h.x);
  const ty = Math.round(h.y);
  const back = OPP[h.dir];
  if (h.frightened && h.mode === "roam") {
    const start = Math.floor(s.rng() * 4);
    for (let i = 0; i < 4; i++) {
      const d = ((start + i) % 4) as Dir;
      if (d !== back && isOpen(tx + DX[d], ty + DY[d])) return d;
    }
    return back;
  }
  const t = targetFor(s, h);
  let best: Dir | -1 = -1;
  let bestD = Infinity;
  for (let d = 0 as Dir; d < 4; d = (d + 1) as Dir) {
    if (d === back) continue;
    const nx = tx + DX[d];
    const ny = ty + DY[d];
    if (!isOpen(nx, ny)) continue;
    const dd = (nx - t.x) ** 2 + (ny - t.y) ** 2;
    if (dd < bestD) {
      bestD = dd;
      best = d;
    }
  }
  return best === -1 ? back : best;
}

// ------------------------------------------------------------------ movement

const horizontal = (d: Dir) => d === LEFT || d === RIGHT;

function normaliseX(a: { x: number }) {
  if (a.x < -0.5) a.x += COLS;
  else if (a.x >= COLS - 0.5) a.x -= COLS;
}

/** Next tile centre along an axis when moving with the given sign. */
const nextCentre = (pos: number, sign: number) => (sign > 0 ? Math.floor(pos + EPS) + 1 : Math.ceil(pos - EPS) - 1);

function tryTurn(p: Muncher) {
  const w = p.want;
  if (w < 0 || w === p.dir) return;
  if (w === OPP[p.dir]) {
    p.dir = w;
    return;
  }
  const tx = Math.round(p.x);
  const ty = Math.round(p.y);
  const off = horizontal(p.dir) ? Math.abs(p.x - tx) : Math.abs(p.y - ty);
  if (off > CORNER + EPS) return;
  if (!isOpen(tx + DX[w], ty + DY[w])) return;
  p.dir = w;
}

/** Move the muncher up to `dist` tiles: buffered turns, cornering, and walls stop it at a tile centre. */
export function movePlayer(p: Muncher, dist: number) {
  tryTurn(p);
  let left = dist;
  let moved = false;
  for (let guard = 0; left > EPS && guard < 8; guard++) {
    const horiz = horizontal(p.dir);
    const pos = horiz ? p.x : p.y;
    if (Math.abs(pos - Math.round(pos)) < EPS) {
      if (horiz) p.x = Math.round(p.x);
      else p.y = Math.round(p.y);
      tryTurn(p);
    }
    const h2 = horizontal(p.dir);
    const pos2 = h2 ? p.x : p.y;
    const sign = p.dir === LEFT || p.dir === UP ? -1 : 1;
    if (Math.abs(pos2 - Math.round(pos2)) < EPS) {
      const tx = Math.round(p.x);
      const ty = Math.round(p.y);
      if (!isOpen(tx + DX[p.dir], ty + DY[p.dir])) break; // a wall: stay at the centre
    }
    const next = nextCentre(pos2, sign);
    const seg = Math.min(Math.abs(next - pos2), left);
    if (h2) {
      p.x += sign * seg;
      p.y = slide(p.y, seg);
    } else {
      p.y += sign * seg;
      p.x = slide(p.x, seg);
    }
    if (seg >= Math.abs(next - pos2) - EPS) {
      if (h2) p.x = next;
      else p.y = next;
    }
    normaliseX(p);
    left -= seg;
    p.travelled += seg;
    moved = true;
  }
  p.moving = moved;
}

/** Slide the off-axis coordinate back onto the corridor's centre line (finishing a cut corner). */
function slide(v: number, amount: number) {
  const c = Math.round(v);
  if (Math.abs(v - c) <= amount) return c;
  return v + Math.sign(c - v) * amount;
}

function moveRoam(s: MazeState, h: Hunter, dist: number) {
  let left = dist;
  for (let guard = 0; left > EPS && guard < 8; guard++) {
    const horiz = horizontal(h.dir);
    const sign = h.dir === LEFT || h.dir === UP ? -1 : 1;
    const pos = horiz ? h.x : h.y;
    const next = nextCentre(pos, sign);
    const gap = Math.abs(next - pos);
    const seg = Math.min(gap, left);
    if (h.mode === "eyes" && horiz && h.y === PEN_DOOR.y) {
      const after = h.x + sign * seg;
      if ((h.x - PEN_DOOR.x) * (after - PEN_DOOR.x) <= 0) {
        h.x = PEN_DOOR.x;
        h.mode = "entering";
        h.dir = DOWN;
        return;
      }
    }
    if (horiz) h.x += sign * seg;
    else h.y += sign * seg;
    left -= seg;
    if (seg >= gap - EPS) {
      if (horiz) h.x = next;
      else h.y = next;
      normaliseX(h);
      h.dir = chooseDir(s, h);
    } else {
      normaliseX(h);
    }
  }
}

function moveHunter(s: MazeState, h: Hunter, dist: number) {
  switch (h.mode) {
    case "roam":
    case "eyes":
      moveRoam(s, h, dist);
      return;
    case "house": {
      // Bob up and down while waiting.
      const top = HUNTERS[h.id].home.y - 0.5;
      const bottom = HUNTERS[h.id].home.y + 0.5;
      if (h.dir !== UP && h.dir !== DOWN) h.dir = UP;
      h.y += h.dir === UP ? -dist : dist;
      if (h.y <= top) {
        h.y = top;
        h.dir = DOWN;
      } else if (h.y >= bottom) {
        h.y = bottom;
        h.dir = UP;
      }
      return;
    }
    case "leaving": {
      let left = dist;
      if (Math.abs(h.x - PEN_DOOR.x) > EPS) {
        const d = PEN_DOOR.x - h.x;
        const m = Math.min(Math.abs(d), left);
        h.x += Math.sign(d) * m;
        h.dir = d > 0 ? RIGHT : LEFT;
        left -= m;
        if (Math.abs(h.x - PEN_DOOR.x) > EPS) return;
      }
      h.x = PEN_DOOR.x;
      h.dir = UP;
      h.y -= Math.min(left, h.y - PEN_DOOR.y);
      if (h.y <= PEN_DOOR.y + EPS) {
        h.y = PEN_DOOR.y;
        h.mode = "roam";
        h.dir = LEFT;
        if (h.id === 3) s.elroyOn = true;
      }
      return;
    }
    case "entering": {
      h.x = PEN_DOOR.x;
      h.y += Math.min(dist, PEN_CENTRE_Y - h.y);
      h.dir = DOWN;
      if (h.y >= PEN_CENTRE_Y - EPS) {
        h.y = PEN_CENTRE_Y;
        h.mode = "leaving";
        h.frightened = false;
      }
      return;
    }
  }
}

/** Tiles per second for a hunter right now. */
export function hunterSpeed(s: MazeState, h: Hunter): number {
  const sp = speedsFor(s.level);
  if (h.mode === "eyes" || h.mode === "entering") return BASE_SPEED * 1.6;
  if (h.mode === "house" || h.mode === "leaving") return BASE_SPEED * 0.42;
  if (inTunnel(h.x, h.y)) return BASE_SPEED * sp.tunnel;
  if (h.frightened) return BASE_SPEED * sp.hunterFright;
  let k = sp.hunter;
  if (h.id === 0) {
    const e = elroy(s);
    if (e) k += e * 0.05;
  }
  return BASE_SPEED * k;
}

// ------------------------------------------------------------------ rules

function addScore(s: MazeState, points: number, out: MazeEvent[]) {
  s.score += points;
  if (!s.extraGiven && s.score >= EXTRA_LIFE_AT) {
    s.extraGiven = true;
    s.lives++;
    out.push(ev("extra-life"));
  }
}

function startFright(s: MazeState) {
  const t = frightTimeFor(s.level);
  s.chain = 0;
  s.fright = t;
  s.frightMax = t;
  for (const h of s.hunters) {
    if (h.mode === "roam") h.dir = OPP[h.dir];
    if (t > 0 && (h.mode === "roam" || h.mode === "house" || h.mode === "leaving")) h.frightened = true;
  }
}

/** Eat a frightened hunter: 200, 400, 800, 1600 for each one in the same spell. */
export function eatHunter(s: MazeState, h: Hunter, out: MazeEvent[]) {
  const points = hunterPoints(s.chain);
  s.chain++;
  h.frightened = false;
  h.mode = h.mode === "leaving" ? "entering" : "eyes";
  if (h.mode === "entering") h.x = PEN_DOOR.x;
  addScore(s, points, out);
  s.eaten = { x: h.x, y: h.y, points };
  s.phase = "eat";
  s.phaseTime = 0;
  out.push(ev("hunter", h.x, h.y, points));
}

function release(s: MazeState, h: Hunter) {
  h.mode = "leaving";
  s.sinceDot = 0;
}

function eatAt(s: MazeState, out: MazeEvent[]) {
  const p = s.player;
  const tx = wrapX(Math.round(p.x));
  const ty = Math.round(p.y);
  const i = ty * COLS + tx;
  const d = s.dots[i];
  if (!d) return;
  s.dots[i] = 0;
  s.dotsLeft--;
  s.dotsEaten++;
  s.sinceDot = 0;
  const waiting = s.hunters.find((h) => h.mode === "house");
  if (s.globalDots >= 0) s.globalDots++;
  else if (waiting) waiting.dots++;
  if (d === 2) {
    p.stall = 3 / 60;
    addScore(s, 50, out);
    startFright(s);
    out.push(ev("pellet", tx, ty, 50));
  } else {
    p.stall = 1 / 60;
    addScore(s, 10, out);
    out.push(ev("dot", tx, ty, 10));
  }
  if ((s.dotsEaten === 70 || s.dotsEaten === 170) && !s.bonus) {
    s.bonus = { kind: bonusForLevel(s.level), ttl: 9 + s.rng() };
    out.push(ev("bonus-spawn", BONUS_SPOT.x, BONUS_SPOT.y));
  }
  if (s.dotsLeft <= 0) {
    s.phase = "clear";
    s.phaseTime = 0;
    s.bonus = null;
    out.push(ev("clear"));
  }
}

function checkRelease(s: MazeState) {
  const waiting = s.hunters.find((h) => h.mode === "house");
  if (!waiting) {
    s.globalDots = -1;
    return;
  }
  if (s.globalDots >= 0) {
    if (s.globalDots >= GLOBAL_LIMITS[waiting.id]) release(s, waiting);
  } else if (waiting.dots >= dotLimit(s.level, waiting.id)) {
    release(s, waiting);
  }
  if (waiting.mode === "house" && s.sinceDot >= releaseTimer(s.level)) release(s, waiting);
}

function wrappedGap(a: number, b: number) {
  const d = Math.abs(a - b);
  return Math.min(d, COLS - d);
}

function step(s: MazeState, h: number, out: MazeEvent[]) {
  // Timers: frightened time pauses the scatter/chase clock.
  if (s.fright > 0) {
    s.fright -= h;
    if (s.fright <= 0) {
      s.fright = 0;
      for (const g of s.hunters) g.frightened = false;
    }
  } else {
    const sched = modeSchedule(s.level);
    s.modeTime += h;
    if (s.modeTime >= sched[s.modeIndex]) {
      s.modeTime = 0;
      s.modeIndex = Math.min(sched.length - 1, s.modeIndex + 1);
      for (const g of s.hunters) if (g.mode === "roam") g.dir = OPP[g.dir];
      out.push(ev("mode"));
    }
  }
  if (s.bonus) {
    s.bonus.ttl -= h;
    if (s.bonus.ttl <= 0) {
      s.bonus = null;
      out.push(ev("bonus-gone"));
    }
  }
  s.sinceDot += h;
  checkRelease(s);

  // The muncher.
  const p = s.player;
  if (p.stall > 0) p.stall -= h;
  else {
    const sp = speedsFor(s.level);
    movePlayer(p, BASE_SPEED * (s.fright > 0 ? sp.playerFright : sp.player) * h);
  }
  eatAt(s, out);
  if (s.phase !== "play") return;
  if (s.bonus && Math.abs(p.x - BONUS_SPOT.x) < 0.6 && Math.abs(p.y - BONUS_SPOT.y) < 0.6) {
    const pts = BONUS_ITEMS[s.bonus.kind].points;
    s.bonus = null;
    addScore(s, pts, out);
    out.push(ev("bonus", BONUS_SPOT.x, BONUS_SPOT.y, pts));
  }

  // The hunters.
  for (const g of s.hunters) moveHunter(s, g, hunterSpeed(s, g) * h);

  // Touches.
  for (const g of s.hunters) {
    if (g.mode !== "roam" && g.mode !== "leaving") continue;
    if (wrappedGap(g.x, p.x) < TOUCH && Math.abs(g.y - p.y) < TOUCH) {
      if (g.frightened) {
        eatHunter(s, g, out);
        return;
      }
      s.phase = "dying";
      s.phaseTime = 0;
      out.push(ev("caught", p.x, p.y));
      return;
    }
  }
}

/** Advance the game by dt seconds of real time. */
export function update(s: MazeState, dt: number): MazeEvent[] {
  const out: MazeEvent[] = [];
  if (s.phase === "over") return out;
  s.phaseTime += dt;
  switch (s.phase) {
    case "ready":
      if (s.phaseTime >= s.readyTime) {
        s.phase = "play";
        s.phaseTime = 0;
        s.acc = 0;
        out.push(ev("go"));
      }
      break;
    case "eat":
      if (s.phaseTime >= EAT_PAUSE) {
        s.phase = "play";
        s.phaseTime = 0;
        s.eaten = null;
      }
      break;
    case "dying": {
      const before = s.phaseTime - dt;
      if (before < DEATH_FREEZE && s.phaseTime >= DEATH_FREEZE) out.push(ev("death", s.player.x, s.player.y));
      if (s.phaseTime >= DEATH_FREEZE + DEATH_ANIM) {
        s.lives--;
        if (s.lives <= 0) {
          s.phase = "over";
          out.push(ev("over"));
        } else {
          resetActors(s, true);
          s.phase = "ready";
          s.phaseTime = 0;
          s.readyTime = READY_TIME;
          out.push(ev("life-lost"));
        }
      }
      break;
    }
    case "clear":
      if (s.phaseTime >= CLEAR_FREEZE + CLEAR_FLASH) {
        s.level++;
        s.dots = freshDots();
        s.dotsLeft = countDots(s.dots);
        s.dotsEaten = 0;
        resetActors(s, false);
        s.phase = "ready";
        s.phaseTime = 0;
        s.readyTime = READY_TIME;
        out.push(ev("level"));
      }
      break;
    case "play":
      s.acc += dt;
      while (s.acc >= STEP && s.phase === "play") {
        s.acc -= STEP;
        step(s, STEP, out);
      }
      break;
  }
  return out;
}
