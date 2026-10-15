// Blob Arena rules: pure and seeded so they can be tested. Blobs eat smaller blobs (1.25x heavier and
// covering the centre), split and merge, shoot mass, and burst on thorns.
import { mulberry32, type Rng } from "../../kit/rng";
import { think } from "./ai";
import { PelletGrid } from "./grid";
import {
  BOT_COLORS, BOT_COUNT, DRAG, EJECT_MASS, EJECT_MIN, HALF, MAX_CELLS, PELLET_COLORS, PELLET_TARGET, PLAYER_COLOR, SPLIT_MIN,
  START_MASS, THORN_FEEDS, THORN_MASS, THORN_MAX, THORN_POP_RATIO, THORN_TARGET, canEat, clamp, decayPerSec, mergeCooldown,
  radiusOf, speedOf, type BlobEvent, type Brain, type Cell, type Ejected, type Player, type Thorn,
} from "./model";

export * from "./model";
export { PelletGrid } from "./grid";

const NAMES = [
  "Blobert", "Gloop", "Squish", "Mr. Bubbles", "Orbit", "Jellybean", "Pudding", "Globby", "BigBlorp", "Pip", "Moxie", "Sploosh",
  "Dumpling", "Mochi", "Nimbus", "Bloop", "Wobble", "Fizz", "Marshmallow", "Plum", "Jiggle", "Boba", "Tapioca", "Gumdrop", "Nugget",
  "Blobfish", "Splat", "Zorb", "Goober", "Pebble", "Cosmo", "Yolk", "Orbo", "Sprout", "Muffin", "Nacho", "Bao", "Fluff", "Gizmo", "Pixel",
];

export interface BlobWorld {
  rng: Rng;
  time: number;
  players: Player[];
  /** The human's player (index 0) or null in attract mode. */
  me: Player | null;
  pellets: PelletGrid;
  ejected: Ejected[];
  thorns: Thorn[];
  /** Indices of living players, heaviest first. */
  board: number[];
  boardT: number;
  events: BlobEvent[];
  pelletTarget: number;
  thornTarget: number;
  pelletAcc: number;
  thornT: number;
  nextCell: number;
  nextThorn: number;
  flat: Cell[];
}

function makeBrain(rng: Rng): Brain {
  const skill = 0.3 + 0.7 * rng();
  return {
    skill, aggr: Math.pow(rng(), 1.2), thinkIn: rng() * 0.2, thinkEvery: 0.22 - 0.12 * skill, wanderX: 0, wanderY: 0, wanderT: 0,
    splitCd: 4 + rng() * 6, mode: "farm",
  };
}

function makePlayer(id: number, isPlayer: boolean, rng: Rng): Player {
  return {
    id, name: isPlayer ? "You" : "", color: isPlayer ? PLAYER_COLOR : BOT_COLORS[id % BOT_COLORS.length], isPlayer, alive: false, cells: [],
    aimX: 0, aimY: 0, aimMag: 1, wantSplit: false, ejectCd: 0, peak: START_MASS, eaten: 0, eatenBy: "", born: 0, respawn: 0, lx: 0, ly: 0,
    brain: makeBrain(rng),
  };
}

export interface BlobOptions {
  player?: boolean;
  bots?: number;
  pellets?: number;
  thorns?: number;
}

export function newWorld(seed = 1, opts: BlobOptions = {}): BlobWorld {
  const rng = mulberry32(seed);
  const s: BlobWorld = {
    rng, time: 0, players: [], me: null, pellets: new PelletGrid(), ejected: [], thorns: [], board: [], boardT: 0, events: [],
    pelletTarget: opts.pellets ?? PELLET_TARGET, thornTarget: opts.thorns ?? THORN_TARGET, pelletAcc: 0, thornT: 0, nextCell: 1, nextThorn: 1,
    flat: [],
  };
  if (opts.player ?? true) {
    const p = makePlayer(0, true, rng);
    s.players.push(p);
    s.me = p;
  }
  const bots = opts.bots ?? BOT_COUNT;
  for (let i = 0; i < bots; i++) s.players.push(makePlayer(s.players.length, false, rng));
  while (s.pellets.count < s.pelletTarget) addPellet(s);
  for (let i = 0; i < s.thornTarget; i++) addThorn(s);
  for (let i = 0; i < s.players.length; i++) {
    const p = s.players[i];
    spawnPlayer(s, i, p.isPlayer ? START_MASS : START_MASS + Math.pow(rng(), 3) * 200);
  }
  refreshBoard(s);
  return s;
}

export function addPellet(s: BlobWorld) {
  const big = s.rng() < 0.1;
  s.pellets.add((s.rng() * 2 - 1) * (HALF - 20), (s.rng() * 2 - 1) * (HALF - 20), big ? 3 : 1, Math.floor(s.rng() * PELLET_COLORS.length));
}

export function addThorn(s: BlobWorld, x?: number, y?: number, vx = 0, vy = 0): Thorn {
  const t: Thorn = {
    id: s.nextThorn++, x: x ?? (s.rng() * 2 - 1) * (HALF - 200), y: y ?? (s.rng() * 2 - 1) * (HALF - 200), vx, vy, mass: THORN_MASS,
    feeds: 0, fx: 0, fy: 0, pulse: 0,
  };
  s.thorns.push(t);
  return t;
}

export const totalMass = (p: Player) => {
  let m = 0;
  for (const c of p.cells) m += c.mass;
  return m;
};

export function centroid(p: Player): { x: number; y: number } {
  let m = 0;
  let x = 0;
  let y = 0;
  for (const c of p.cells) {
    m += c.mass;
    x += c.x * c.mass;
    y += c.y * c.mass;
  }
  return m > 0 ? { x: x / m, y: y / m } : { x: 0, y: 0 };
}

/** Largest distance from the centre of mass to a cell's far edge. */
export function extent(p: Player): number {
  const c = centroid(p);
  let e = 0;
  for (const cell of p.cells) e = Math.max(e, Math.hypot(cell.x - c.x, cell.y - c.y) + radiusOf(cell.mass));
  return e;
}

export const biggestCell = (p: Player): Cell | null => {
  let best: Cell | null = null;
  for (const c of p.cells) if (!best || c.mass > best.mass) best = c;
  return best;
};

function newCell(s: BlobWorld, owner: number, x: number, y: number, mass: number): Cell {
  return { id: s.nextCell++, owner, x, y, vx: 0, vy: 0, mx: 0, my: 0, mass, merge: 0, age: 0, alive: true };
}

/** A spot with no blob within ~600 (best of a few tries). */
export function findSpawn(s: BlobWorld): { x: number; y: number } {
  let best = { x: 0, y: 0 };
  let bestD = -1;
  for (let t = 0; t < 12; t++) {
    const x = (s.rng() * 2 - 1) * (HALF - 300);
    const y = (s.rng() * 2 - 1) * (HALF - 300);
    let d = 1e9;
    for (const p of s.players) for (const c of p.cells) d = Math.min(d, Math.hypot(c.x - x, c.y - y) - radiusOf(c.mass));
    if (d > bestD) {
      bestD = d;
      best = { x, y };
    }
    if (d > 600) break;
  }
  return best;
}

export function spawnPlayer(s: BlobWorld, pi: number, mass = START_MASS, x?: number, y?: number) {
  const p = s.players[pi];
  if (x === undefined || y === undefined) {
    const pos = findSpawn(s);
    x = pos.x;
    y = pos.y;
  }
  p.alive = true;
  p.cells = [newCell(s, pi, x, y, mass)];
  p.peak = mass;
  p.eaten = 0;
  p.eatenBy = "";
  p.born = s.time;
  p.aimX = x;
  p.aimY = y;
  p.aimMag = 1;
  p.wantSplit = false;
  if (!p.isPlayer) {
    p.name = pickName(s);
    p.color = BOT_COLORS[Math.floor(s.rng() * BOT_COLORS.length)];
    p.brain = makeBrain(s.rng);
  }
}

function pickName(s: BlobWorld): string {
  for (let i = 0; i < 30; i++) {
    const n = NAMES[Math.floor(s.rng() * NAMES.length)];
    if (!s.players.some((p) => p.alive && p.name === n)) return n;
  }
  return NAMES[Math.floor(s.rng() * NAMES.length)] + Math.floor(s.rng() * 90 + 10);
}

export function refreshBoard(s: BlobWorld) {
  s.board.length = 0;
  for (let i = 0; i < s.players.length; i++) if (s.players[i].alive) s.board.push(i);
  s.board.sort((a, b) => totalMass(s.players[b]) - totalMass(s.players[a]));
}

/** Split every cell that is big enough in two, launching the new half toward the aim point. Returns the number of new cells. */
export function split(s: BlobWorld, pi: number): number {
  const p = s.players[pi];
  if (!p.alive) return 0;
  const snapshot = p.cells.slice().sort((a, b) => b.mass - a.mass);
  let made = 0;
  for (const c of snapshot) {
    if (p.cells.length >= MAX_CELLS) break;
    if (c.mass < SPLIT_MIN) continue;
    const half = c.mass / 2;
    const cd = mergeCooldown(c.mass);
    c.mass = half;
    let dx = p.aimX - c.x;
    let dy = p.aimY - c.y;
    const d = Math.hypot(dx, dy);
    if (d < 1e-6) {
      dx = 1;
      dy = 0;
    } else {
      dx /= d;
      dy /= d;
    }
    const n = newCell(s, pi, c.x + dx * 2, c.y + dy * 2, half);
    const v = 640 + radiusOf(half) * 4;
    n.vx = dx * v;
    n.vy = dy * v;
    n.merge = cd;
    c.merge = cd;
    p.cells.push(n);
    made++;
  }
  if (made) {
    const ctr = centroid(p);
    s.events.push({ type: "split", owner: pi, x: ctr.x, y: ctr.y });
  }
  return made;
}

/** Each cell big enough shoots a small pellet of mass toward the aim point. Returns the count shot. */
export function eject(s: BlobWorld, pi: number): number {
  const p = s.players[pi];
  if (!p.alive || p.ejectCd > 0) return 0;
  p.ejectCd = 0.11;
  let n = 0;
  for (const c of p.cells) {
    if (c.mass < EJECT_MIN) continue;
    let dx = p.aimX - c.x;
    let dy = p.aimY - c.y;
    const d = Math.hypot(dx, dy);
    if (d < 1e-6) {
      dx = 1;
      dy = 0;
    } else {
      dx /= d;
      dy /= d;
    }
    c.mass -= EJECT_MASS;
    const r = radiusOf(c.mass);
    s.ejected.push({ x: c.x + dx * (r + 5), y: c.y + dy * (r + 5), vx: dx * 780, vy: dy * 780, mass: EJECT_MASS, owner: pi, color: p.color, age: 0 });
    n++;
  }
  if (s.ejected.length > 450) s.ejected.splice(0, s.ejected.length - 450);
  if (n) {
    const ctr = centroid(p);
    s.events.push({ type: "eject", owner: pi, x: ctr.x, y: ctr.y });
  }
  return n;
}

/** A cell hits a thorn it is big enough to pop: it absorbs the thorn and bursts into pieces. Mass is conserved. Returns the piece count. */
export function burstCell(s: BlobWorld, cell: Cell, thornIndex: number): number {
  const thorn = s.thorns[thornIndex];
  const p = s.players[cell.owner];
  const total = cell.mass + thorn.mass;
  s.thorns.splice(thornIndex, 1);
  const free = MAX_CELLS - p.cells.length;
  const pieces = Math.min(free + 1, 9, Math.floor(total / 18));
  if (pieces <= 1) {
    cell.mass = total;
    return 1;
  }
  const each = total / pieces;
  const cd = mergeCooldown(each * pieces);
  cell.mass = each;
  cell.merge = cd;
  const base = s.rng() * Math.PI * 2;
  for (let k = 1; k < pieces; k++) {
    const a = base + (k / (pieces - 1)) * Math.PI * 2;
    const n = newCell(s, cell.owner, cell.x, cell.y, each);
    const v = 560 + radiusOf(each) * 3;
    n.vx = Math.cos(a) * v;
    n.vy = Math.sin(a) * v;
    n.merge = cd;
    p.cells.push(n);
  }
  s.events.push({ type: "burst", owner: cell.owner, x: cell.x, y: cell.y, pieces });
  return pieces;
}

function moveCell(c: Cell, p: Player, dt: number) {
  const r = radiusOf(c.mass);
  const dx = p.aimX - c.x;
  const dy = p.aimY - c.y;
  const d = Math.sqrt(dx * dx + dy * dy);
  const sp = d > 1e-6 ? speedOf(c.mass) * p.aimMag * clamp(d / (r * 0.5 + 12), 0, 1) : 0;
  const ux = d > 1e-6 ? dx / d : 0;
  const uy = d > 1e-6 ? dy / d : 0;
  c.mx = ux * sp + c.vx;
  c.my = uy * sp + c.vy;
  c.x += c.mx * dt;
  c.y += c.my * dt;
  const f = Math.exp(-DRAG * dt);
  c.vx *= f;
  c.vy *= f;
  c.x = clamp(c.x, -HALF + r, HALF - r);
  c.y = clamp(c.y, -HALF + r, HALF - r);
  c.mass = Math.max(START_MASS * 0.5, c.mass - decayPerSec(c.mass) * dt);
  c.merge -= dt;
  c.age += dt;
}

/** Siblings that can't merge yet push apart; siblings past their cooldown that overlap fuse. */
function sortOutSiblings(s: BlobWorld, p: Player) {
  const cells = p.cells;
  for (let i = 0; i < cells.length; i++) {
    const a = cells[i];
    if (!a.alive) continue;
    for (let j = i + 1; j < cells.length; j++) {
      const b = cells[j];
      if (!b.alive) continue;
      const ra = radiusOf(a.mass);
      const rb = radiusOf(b.mass);
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (a.merge > 0 || b.merge > 0) {
        const min = ra + rb;
        if (d < min) {
          if (d < 1e-6) {
            dx = 1;
            dy = 0;
          } else {
            dx /= d;
            dy /= d;
          }
          const push = (min - d) * 0.5;
          const wa = b.mass / (a.mass + b.mass);
          a.x -= dx * push * wa * 2;
          a.y -= dy * push * wa * 2;
          b.x += dx * push * (1 - wa) * 2;
          b.y += dy * push * (1 - wa) * 2;
        }
      } else if (d < Math.max(ra, rb) - Math.min(ra, rb) * 0.35) {
        const big = a.mass >= b.mass ? a : b;
        const small = big === a ? b : a;
        const tot = big.mass + small.mass;
        big.x = (big.x * big.mass + small.x * small.mass) / tot;
        big.y = (big.y * big.mass + small.y * small.mass) / tot;
        big.vx += small.vx * 0.5;
        big.vy += small.vy * 0.5;
        big.mass = tot;
        small.alive = false;
        s.events.push({ type: "merge", owner: p.id, x: big.x, y: big.y });
      }
    }
  }
  p.cells = cells.filter((c) => c.alive);
}

function eatPellets(s: BlobWorld, p: Player, c: Cell) {
  const g = s.pellets;
  const r = radiusOf(c.mass);
  const gx0 = g.idx(c.x - r);
  const gx1 = g.idx(c.x + r);
  const gy0 = g.idx(c.y - r);
  const gy1 = g.idx(c.y + r);
  const r2 = r * r;
  for (let gy = gy0; gy <= gy1; gy++) {
    for (let gx = gx0; gx <= gx1; gx++) {
      const list = g.cells[gy * g.size + gx];
      for (let i = list.length - 1; i >= 0; i--) {
        const pl = list[i];
        const dx = pl.x - c.x;
        const dy = pl.y - c.y;
        if (dx * dx + dy * dy < r2) {
          c.mass += pl.m;
          if (p.isPlayer) s.events.push({ type: "pellet", owner: p.id, x: pl.x, y: pl.y, m: pl.m });
          g.remove(pl);
        }
      }
    }
  }
}

function feedThorn(s: BlobWorld, t: Thorn, e: Ejected) {
  t.mass += e.mass;
  t.feeds++;
  t.pulse = 1;
  const sp = Math.hypot(e.vx, e.vy);
  if (sp > 20) {
    t.fx = e.vx / sp;
    t.fy = e.vy / sp;
  } else {
    const d = Math.hypot(e.x - t.x, e.y - t.y) || 1;
    t.fx = (e.x - t.x) / d;
    t.fy = (e.y - t.y) / d;
  }
  s.events.push({ type: "thorn-fed", x: t.x, y: t.y });
  if (t.feeds >= THORN_FEEDS) {
    t.feeds = 0;
    t.mass = THORN_MASS;
    if (s.thorns.length < THORN_MAX) {
      const r = radiusOf(THORN_MASS);
      addThorn(s, t.x + t.fx * r, t.y + t.fy * r, t.fx * 620, t.fy * 620);
      s.events.push({ type: "thorn-shot", x: t.x, y: t.y });
    }
  }
}

/** One simulation step (keep dt at or below ~1/30). */
export function step(s: BlobWorld, dt: number): BlobEvent[] {
  s.time += dt;
  const players = s.players;

  for (let pi = 0; pi < players.length; pi++) {
    const p = players[pi];
    if (p.ejectCd > 0) p.ejectCd -= dt;
    if (!p.alive) continue;
    if (!p.isPlayer) {
      p.brain.thinkIn -= dt;
      p.brain.splitCd -= dt;
      if (p.brain.thinkIn <= 0) {
        p.brain.thinkIn += p.brain.thinkEvery * (0.8 + s.rng() * 0.4);
        think(s, pi);
      }
      if (p.wantSplit) {
        p.wantSplit = false;
        split(s, pi);
      }
    }
    for (const c of p.cells) moveCell(c, p, dt);
    sortOutSiblings(s, p);
  }

  // Moving mass pellets and launched thorns.
  const f = Math.exp(-5 * dt);
  for (const e of s.ejected) {
    e.x = clamp(e.x + e.vx * dt, -HALF + 6, HALF - 6);
    e.y = clamp(e.y + e.vy * dt, -HALF + 6, HALF - 6);
    e.vx *= f;
    e.vy *= f;
    e.age += dt;
  }
  const ft = Math.exp(-3.5 * dt);
  for (const t of s.thorns) {
    const r = radiusOf(t.mass);
    t.x = clamp(t.x + t.vx * dt, -HALF + r, HALF - r);
    t.y = clamp(t.y + t.vy * dt, -HALF + r, HALF - r);
    t.vx *= ft;
    t.vy *= ft;
    if (t.pulse > 0) t.pulse = Math.max(0, t.pulse - dt * 4);
  }
  // Mass shot at a thorn feeds it.
  for (let i = s.ejected.length - 1; i >= 0; i--) {
    const e = s.ejected[i];
    for (let k = 0; k < s.thorns.length; k++) {
      const t = s.thorns[k];
      if (Math.hypot(e.x - t.x, e.y - t.y) < radiusOf(t.mass)) {
        feedThorn(s, t, e);
        s.ejected.splice(i, 1);
        break;
      }
    }
  }

  // Everyone eats: pellets, loose mass, thorns.
  const flat = s.flat;
  for (let pi = 0; pi < players.length; pi++) {
    const p = players[pi];
    if (!p.alive) continue;
    for (const c of p.cells) {
      eatPellets(s, p, c);
      const r = radiusOf(c.mass);
      for (let i = s.ejected.length - 1; i >= 0; i--) {
        const e = s.ejected[i];
        if (e.owner === pi && e.age < 0.4) continue;
        if (Math.hypot(e.x - c.x, e.y - c.y) < r) {
          c.mass += e.mass;
          s.ejected.splice(i, 1);
        }
      }
      for (let k = 0; k < s.thorns.length; k++) {
        const t = s.thorns[k];
        if (c.mass >= t.mass * THORN_POP_RATIO && Math.hypot(t.x - c.x, t.y - c.y) < r - radiusOf(t.mass) * 0.3) {
          burstCell(s, c, k);
          break;
        }
      }
    }
  }
  // Blob against blob (after bursts have added their pieces).
  flat.length = 0;
  for (const p of players) if (p.alive) for (const c of p.cells) flat.push(c);

  for (let i = 0; i < flat.length; i++) {
    const a = flat[i];
    if (!a.alive) continue;
    for (let j = i + 1; j < flat.length; j++) {
      const b = flat[j];
      if (!b.alive || a.owner === b.owner || !a.alive) continue;
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (canEat(a.mass, b.mass, d)) devour(s, a, b);
      else if (canEat(b.mass, a.mass, d)) devour(s, b, a);
    }
  }

  for (let pi = 0; pi < players.length; pi++) {
    const p = players[pi];
    if (!p.alive) continue;
    if (p.cells.some((c) => !c.alive)) p.cells = p.cells.filter((c) => c.alive);
    const m = totalMass(p);
    if (m > p.peak) p.peak = m;
    if (p.cells.length === 0) {
      p.alive = false;
      p.respawn = 2 + s.rng() * 3;
      s.events.push({ type: "death", owner: pi, x: p.lx, y: p.ly, by: p.eatenBy });
    }
  }
  for (let pi = 0; pi < players.length; pi++) {
    const p = players[pi];
    if (!p.alive && !p.isPlayer) {
      p.respawn -= dt;
      if (p.respawn <= 0) spawnPlayer(s, pi, START_MASS + s.rng() * 10);
    }
  }

  s.pelletAcc += dt * 45;
  while (s.pelletAcc >= 1) {
    s.pelletAcc -= 1;
    if (s.pellets.count < s.pelletTarget) addPellet(s);
  }
  s.thornT += dt;
  if (s.thornT > 2.5) {
    s.thornT = 0;
    if (s.thorns.length < s.thornTarget) addThorn(s);
  }
  s.boardT -= dt;
  if (s.boardT <= 0) {
    s.boardT = 0.25;
    refreshBoard(s);
  }
  return s.events;
}

function devour(s: BlobWorld, a: Cell, b: Cell) {
  const pa = s.players[a.owner];
  const pb = s.players[b.owner];
  a.mass += b.mass;
  b.alive = false;
  pa.eaten++;
  pb.eatenBy = pa.name;
  pb.lx = b.x;
  pb.ly = b.y;
  s.events.push({ type: "eat", eater: a.owner, victim: b.owner, x: b.x, y: b.y, mass: b.mass });
}

/** Advance by dt seconds in steps of at most 1/60; returns the events (cleared at the start). */
export function advance(s: BlobWorld, dt: number): BlobEvent[] {
  s.events.length = 0;
  const n = Math.max(1, Math.ceil(dt * 60 - 1e-6));
  for (let i = 0; i < n; i++) step(s, dt / n);
  return s.events;
}

/** Point the player at a spot in the world (all of their cells head for it). */
export function aim(p: Player, x: number, y: number, mag = 1) {
  p.aimX = x;
  p.aimY = y;
  p.aimMag = mag;
}

export const livingBots = (s: BlobWorld) => s.players.filter((p) => !p.isPlayer && p.alive).length;
