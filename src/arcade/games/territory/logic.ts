// Territory rules: pure and seeded so they can be tested. Players glide over a grid; outside their own land they
// leave a trail. Closing the loop back onto home claims the trail plus everything enclosed (flood-filled from the
// outside). Touching a trail (yours or anyone's) kills the trail's owner, and so does the wall.
import { mulberry32, type Rng } from "../../kit/rng";
import { decide } from "./ai";
import { DX, DY, opposite } from "./model";

export const GRID_W = 120;
export const GRID_H = 120;
export const SPEED = 6.5;
export const START_SIZE = 5;
export const BOT_COUNT = 8;
export const MAX_QUEUE = 2;

export { DX, DY, opposite };

export const COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#f59e0b", "#a855f7", "#14b8a6", "#ec4899", "#84cc16", "#06b6d4", "#f97316"];

const NAMES = [
  "Atlas", "Nova", "Rook", "Echo", "Pixel", "Juno", "Mako", "Sable", "Quill", "Zed", "Ivy", "Orion", "Pip", "Tango", "Vesper", "Cleo",
  "Boone", "Lyra", "Fable", "Kestrel", "Dune", "Marlo", "Tess", "Ozzy", "Rune", "Skye",
];

export interface Brain {
  skill: number;
  aggr: number;
  /** Planned rectangle: out, across, back. */
  dirs: number[];
  lens: number[];
  leg: number;
  legLeft: number;
  /** "home" | "out" | "return" | "attack": what it is doing, for the HUD and tests. */
  mode: string;
  /** Cells to idle on home land before the next trip. */
  rest: number;
  /** A plan has been made for the next trip / the last trip left home. */
  planned: boolean;
  dirty: boolean;
}

export interface TPlayer {
  id: number;
  name: string;
  color: string;
  isPlayer: boolean;
  alive: boolean;
  /** Head position in cell units (cell i covers [i, i+1)). */
  x: number;
  y: number;
  dir: number;
  queue: number[];
  trail: number[];
  /** When each trail cell was added (seconds), for the animation. */
  trailT: number[];
  speed: number;
  /** The player waits at the start until they choose a direction. */
  hold: boolean;
  kills: number;
  peakPct: number;
  respawn: number;
  diedBy: string;
  born: number;
  brain: Brain;
}

export type TerritoryEvent =
  | { type: "claim"; pid: number; gained: number; x: number; y: number; trailLen: number }
  | { type: "kill"; killer: number; victim: number; x: number; y: number }
  | { type: "death"; pid: number; cause: "wall" | "self" | "trail" | "land"; by: string; x: number; y: number }
  | { type: "spawn"; pid: number; x: number; y: number };

export interface TWorld {
  rng: Rng;
  time: number;
  w: number;
  h: number;
  /** Who owns each cell (0 = nobody, else a player id). */
  owner: Uint8Array;
  /** Whose trail is on each cell (0 = none). */
  trail: Uint8Array;
  /** When each cell last changed hands (for the flash effect). */
  flashT: Float32Array;
  counts: number[];
  players: TPlayer[];
  me: TPlayer | null;
  events: TerritoryEvent[];
  /** Scratch for flood fills and searches. */
  seen: Uint8Array;
  stack: Int32Array;
  stamp: Int32Array;
  stampNo: number;
  queue: Int32Array;
  firstDir: Int8Array;
  depth: Int16Array;
  tick: number;
}

function makeBrain(rng: Rng): Brain {
  return { skill: 0.35 + 0.65 * rng(), aggr: Math.pow(rng(), 1.3), dirs: [0, 1, 2], lens: [5, 5, 99], leg: 0, legLeft: 5, mode: "home", rest: 0, planned: false, dirty: false };
}

function makePlayer(id: number, isPlayer: boolean, rng: Rng): TPlayer {
  return {
    id, name: isPlayer ? "You" : "", color: COLORS[(id - 1) % COLORS.length], isPlayer, alive: false, x: 0, y: 0, dir: 0, queue: [], trail: [], trailT: [],
    speed: SPEED * (isPlayer ? 1 : 0.96 + rng() * 0.07), hold: false, kills: 0, peakPct: 0, respawn: 0, diedBy: "", born: 0, brain: makeBrain(rng),
  };
}

export interface TerritoryOptions {
  player?: boolean;
  bots?: number;
  w?: number;
  h?: number;
}

export function newWorld(seed = 1, opts: TerritoryOptions = {}): TWorld {
  const rng = mulberry32(seed);
  const w = opts.w ?? GRID_W;
  const h = opts.h ?? GRID_H;
  const n = w * h;
  const s: TWorld = {
    rng, time: 0, w, h, owner: new Uint8Array(n), trail: new Uint8Array(n), flashT: new Float32Array(n).fill(-10), counts: [], players: [], me: null,
    events: [], seen: new Uint8Array(n), stack: new Int32Array(n), stamp: new Int32Array(n), stampNo: 0, queue: new Int32Array(n),
    firstDir: new Int8Array(n), depth: new Int16Array(n), tick: 0,
  };
  const total = (opts.player ?? true ? 1 : 0) + (opts.bots ?? BOT_COUNT);
  s.counts = new Array(total + 1).fill(0);
  if (opts.player ?? true) {
    const p = makePlayer(1, true, rng);
    s.players.push(p);
    s.me = p;
  }
  for (let i = 0; i < (opts.bots ?? BOT_COUNT); i++) s.players.push(makePlayer(s.players.length + 1, false, rng));
  for (const p of s.players) spawnPlayer(s, p);
  return s;
}

export const cellIndex = (s: TWorld, cx: number, cy: number) => cy * s.w + cx;
export const inBounds = (s: TWorld, cx: number, cy: number) => cx >= 0 && cy >= 0 && cx < s.w && cy < s.h;
export const percent = (s: TWorld, p: TPlayer) => (s.counts[p.id] / (s.w * s.h)) * 100;

function pickName(s: TWorld): string {
  for (let i = 0; i < 30; i++) {
    const n = NAMES[Math.floor(s.rng() * NAMES.length)];
    if (!s.players.some((p) => p.alive && p.name === n)) return n;
  }
  return NAMES[Math.floor(s.rng() * NAMES.length)] + Math.floor(s.rng() * 90 + 10);
}

/** A spot whose start block (and a margin) is free of land and trails; best of many tries. */
export function findStart(s: TWorld): { cx: number; cy: number } {
  const half = Math.floor(START_SIZE / 2);
  const margin = half + 3;
  let best = { cx: Math.floor(s.w / 2), cy: Math.floor(s.h / 2) };
  let bestScore = -1;
  for (let t = 0; t < 60; t++) {
    const cx = margin + Math.floor(s.rng() * (s.w - margin * 2));
    const cy = margin + Math.floor(s.rng() * (s.h - margin * 2));
    let busy = 0;
    for (let y = cy - margin; y <= cy + margin; y++) for (let x = cx - margin; x <= cx + margin; x++) if (s.owner[y * s.w + x] || s.trail[y * s.w + x]) busy++;
    const score = 1000 - busy;
    if (score > bestScore) {
      bestScore = score;
      best = { cx, cy };
    }
    if (busy === 0) break;
  }
  return best;
}

/** Put a player on a fresh start block (cx, cy default to a free spot). */
export function spawnPlayer(s: TWorld, p: TPlayer, cx?: number, cy?: number) {
  if (cx === undefined || cy === undefined) {
    const f = findStart(s);
    cx = f.cx;
    cy = f.cy;
  }
  const half = Math.floor(START_SIZE / 2);
  for (let y = cy - half; y <= cy + half; y++) {
    for (let x = cx - half; x <= cx + half; x++) {
      if (!inBounds(s, x, y)) continue;
      setOwner(s, y * s.w + x, p.id);
    }
  }
  p.alive = true;
  p.x = cx + 0.5;
  p.y = cy + 0.5;
  p.dir = Math.floor(s.rng() * 4);
  p.queue = [];
  p.trail = [];
  p.trailT = [];
  p.kills = 0;
  p.diedBy = "";
  p.born = s.time;
  p.peakPct = percent(s, p);
  if (!p.isPlayer) {
    p.name = pickName(s);
    p.brain = makeBrain(s.rng);
    p.brain.rest = 2;
  }
  s.events.push({ type: "spawn", pid: p.id, x: p.x, y: p.y });
}

function setOwner(s: TWorld, c: number, id: number) {
  const old = s.owner[c];
  if (old === id) return;
  if (old) s.counts[old]--;
  s.owner[c] = id;
  if (id) s.counts[id]++;
  s.flashT[c] = s.time;
}

/** Ask for a turn; it is applied when the head reaches the next cell centre. Reversing is ignored. */
export function turn(p: TPlayer, d: number) {
  const last = p.queue.length ? p.queue[p.queue.length - 1] : p.dir;
  if (d === last || d === opposite(last) || p.queue.length >= MAX_QUEUE) return;
  p.queue.push(d);
}

/** Remove a player: their trail vanishes and their land becomes free. */
export function killPlayer(s: TWorld, p: TPlayer, cause: "wall" | "self" | "trail" | "land", killer: TPlayer | null = null) {
  if (!p.alive) return;
  p.alive = false;
  p.diedBy = killer ? killer.name : cause === "wall" ? "the wall" : cause === "self" ? "your own trail" : "losing all land";
  for (const c of p.trail) if (s.trail[c] === p.id) s.trail[c] = 0;
  p.trail = [];
  p.trailT = [];
  for (let c = 0; c < s.owner.length; c++) if (s.owner[c] === p.id) setOwner(s, c, 0);
  s.counts[p.id] = 0;
  p.respawn = 2 + s.rng() * 2.5;
  s.events.push({ type: "death", pid: p.id, cause, by: p.diedBy, x: p.x, y: p.y });
  if (killer && killer.alive) {
    killer.kills++;
    s.events.push({ type: "kill", killer: killer.id, victim: p.id, x: p.x, y: p.y });
  }
}

/**
 * The head came home: claim the trail and every cell it encloses. Cells not reachable from the outside without
 * crossing your land are enclosed (this includes enemy land and neutral islands). Returns the number of cells gained.
 */
export function claimLoop(s: TWorld, p: TPlayer): number {
  if (p.trail.length === 0) return 0;
  const before = s.counts[p.id];
  for (const c of p.trail) {
    if (s.trail[c] === p.id) s.trail[c] = 0;
    setOwner(s, c, p.id);
  }
  p.trail = [];
  p.trailT = [];
  const { w, h, owner, seen, stack } = s;
  seen.fill(0);
  let sp = 0;
  const seed = (c: number) => {
    if (owner[c] !== p.id && !seen[c]) {
      seen[c] = 1;
      stack[sp++] = c;
    }
  };
  for (let x = 0; x < w; x++) {
    seed(x);
    seed((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    seed(y * w);
    seed(y * w + w - 1);
  }
  while (sp > 0) {
    const c = stack[--sp];
    const x = c % w;
    const y = (c - x) / w;
    if (x > 0) seed(c - 1);
    if (x < w - 1) seed(c + 1);
    if (y > 0) seed(c - w);
    if (y < h - 1) seed(c + w);
  }
  for (let c = 0; c < owner.length; c++) if (!seen[c] && owner[c] !== p.id) setOwner(s, c, p.id);
  const gained = s.counts[p.id] - before;
  s.events.push({ type: "claim", pid: p.id, gained, x: p.x, y: p.y, trailLen: 0 });
  // Anyone who just lost their last cell is out.
  for (const o of s.players) if (o.alive && o !== p && s.counts[o.id] <= 0) killPlayer(s, o, "land", p);
  return gained;
}

/** The head is now centred in cell (cx, cy): apply the rules for entering it. Returns false if the player died. */
function enterCell(s: TWorld, p: TPlayer, cx: number, cy: number): boolean {
  if (!inBounds(s, cx, cy)) {
    killPlayer(s, p, "wall");
    return false;
  }
  const c = cy * s.w + cx;
  if (s.owner[c] === p.id) {
    if (p.trail.length) claimLoop(s, p);
    return true;
  }
  const t = s.trail[c];
  if (t === p.id) {
    killPlayer(s, p, "self");
    return false;
  }
  if (t !== 0) {
    const victim = s.players[t - 1];
    killPlayer(s, victim, "trail", p);
  }
  s.trail[c] = p.id;
  p.trail.push(c);
  p.trailT.push(s.time);
  return true;
}

function nextCentre(a: number, dir: number): number {
  const sign = dir === 0 || dir === 1 ? 1 : -1;
  const c0 = Math.floor(a) + 0.5;
  // Exact comparisons: a centre that has been processed was snapped to exactly, so anything short of it (even by
  // a rounding hair) still has that centre ahead. An epsilon here skipped cells, leaving no trail.
  if (sign > 0) return a < c0 ? c0 : c0 + 1;
  return a > c0 ? c0 : c0 - 1;
}

/** Glide one player by dt seconds, stopping at each cell centre to apply rules and turns. */
function movePlayer(s: TWorld, p: TPlayer, dt: number) {
  if (p.hold) return;
  let remaining = p.speed * dt;
  let guard = 0;
  while (remaining > 1e-9 && p.alive && guard++ < 8) {
    const horizontal = p.dir === 0 || p.dir === 2;
    const a = horizontal ? p.x : p.y;
    const sign = p.dir === 0 || p.dir === 1 ? 1 : -1;
    const target = nextCentre(a, p.dir);
    const d = Math.abs(target - a);
    if (d > remaining) {
      if (horizontal) p.x += sign * remaining;
      else p.y += sign * remaining;
      return;
    }
    if (horizontal) p.x = target;
    else p.y = target;
    remaining -= d;
    const cx = Math.floor(p.x);
    const cy = Math.floor(p.y);
    if (!enterCell(s, p, cx, cy)) return;
    // Now at a centre: turn if asked (bots decide here).
    if (p.isPlayer) {
      while (p.queue.length) {
        const q = p.queue.shift()!;
        if (q !== opposite(p.dir)) {
          p.dir = q;
          break;
        }
      }
    } else {
      const nd = decide(s, p, cx, cy);
      if (nd !== opposite(p.dir)) p.dir = nd;
    }
    // Snap to the lane so paths stay on cell centres.
    if (p.dir === 0 || p.dir === 2) p.y = cy + 0.5;
    else p.x = cx + 0.5;
  }
}

/** One simulation step. */
export function step(s: TWorld, dt: number): TerritoryEvent[] {
  s.time += dt;
  s.tick++;
  const order = s.players.slice();
  if (s.tick & 1) order.reverse();
  for (const p of order) {
    if (!p.alive) continue;
    movePlayer(s, p, dt);
    if (p.alive) {
      const pc = percent(s, p);
      if (pc > p.peakPct) p.peakPct = pc;
    }
  }
  for (const p of s.players) {
    if (!p.alive && !p.isPlayer) {
      p.respawn -= dt;
      if (p.respawn <= 0) spawnPlayer(s, p);
    }
  }
  return s.events;
}

/** Advance in steps of at most 1/60 s; returns the events (cleared at the start). */
export function advance(s: TWorld, dt: number): TerritoryEvent[] {
  s.events.length = 0;
  const n = Math.max(1, Math.ceil(dt * 60 - 1e-6));
  for (let i = 0; i < n; i++) step(s, dt / n);
  return s.events;
}

export const livingBots = (s: TWorld) => s.players.filter((p) => !p.isPlayer && p.alive).length;
