// Slither Arena rules: pure and seeded so they can be tested. The world is a circle; worms are chains of
// segments that follow their head; a head touching another worm's body (or the edge) kills it.
import { mulberry32, type Rng } from "../../kit/rng";
import { think } from "./ai";
import { OrbField, SegGrid } from "./grid";
import {
  AMBIENT_ORBS, BASE_SPEED, BODY_HIT, BOOST_MULT, BOOST_RETURN, BOT_COUNT, DEATH_RETURN, HEAD_HIT, MAX_SEGS, MIN_BOOST_MASS,
  ORB_CAP, ORB_COLORS, SHIELD_TIME, START_MASS, WORLD_R, angDiff, boostDrain, clamp, girth, segCount, segSpacing, turnRate,
  TAU, type Brain, type SlitherEvent, type Worm,
} from "./model";

export * from "./model";
export { OrbField, SegGrid } from "./grid";

export const SKIN_COUNT = 14;

const NAMES = [
  "Wriggles", "NoodleNinja", "Zig Zag Zoe", "Coil", "Orbivore", "Mamba Mia", "Gnasher", "Hexa", "Lil Wyrm", "Snek",
  "Plush Python", "Spaghetti", "Glowworm", "Taffy", "Kiwi", "Rattle", "Sir Slithers", "Ouroboros", "Pixelworm", "Hissterical",
  "ByteMe", "Nibbles", "Slinky Pete", "Moss", "Vyper", "TinyTim", "Mr. Wiggles", "Zephyr", "Dot", "Fangs McGee", "Loopy",
  "Boa Constrictor", "Jelly", "Comet", "Squiggle", "Ember", "Naga", "Wormhole", "Cosmo", "Bubbles", "Tangle", "Rizzo",
  "Sparky", "Muffin", "Ziggy", "Chompers", "Lumi", "Pretzel", "Mochi", "Static", "Waffles", "Noodle Soup", "Gizmo", "Blip",
  "Twister", "Rascal", "Olive", "Sunny", "Echo", "Dash",
];

export interface World {
  rng: Rng;
  time: number;
  worms: Worm[];
  /** The player's worm (always worms[0]) or null in attract mode. */
  player: Worm | null;
  orbs: OrbField;
  grid: SegGrid;
  /** Largest body radius among living worms this step. */
  maxG: number;
  respawns: { wi: number; t: number }[];
  /** Indices of living worms, biggest first (refreshed a few times a second). */
  board: number[];
  boardT: number;
  events: SlitherEvent[];
  ambientTarget: number;
  orbAcc: number;
  botTarget: number;
  nextId: number;
  /** Scratch list for deaths found in one step. */
  dying: { wi: number; cause: "body" | "edge"; by: number }[];
}

function makeBrain(rng: Rng): Brain {
  const skill = 0.35 + 0.65 * rng();
  return {
    skill,
    aggr: Math.pow(rng(), 1.4),
    thinkIn: rng() * 0.2,
    thinkEvery: 0.2 - 0.13 * skill,
    wanderX: 0,
    wanderY: 0,
    wanderT: 0,
    prey: -1,
    preyT: 0,
    circleDir: rng() < 0.5 ? 1 : -1,
    mode: "forage",
    danger: 0,
    lastTurn: 0,
  };
}

function makeWorm(id: number, rng: Rng, isPlayer: boolean): Worm {
  return {
    id, name: isPlayer ? "You" : "", skin: isPlayer ? 0 : 1 + (id % (SKIN_COUNT - 1)), isPlayer, alive: false, x: 0, y: 0, ang: 0, targetAng: 0, turnCmd: null, wantBoost: false,
    boosting: false, mass: START_MASS, g: girth(START_MASS), n: 0, sx: new Float32Array(MAX_SEGS), sy: new Float32Array(MAX_SEGS),
    minX: 0, maxX: 0, minY: 0, maxY: 0, kills: 0, peak: START_MASS, shield: 0, dropAcc: 0, killedBy: "", deadFor: 0,
    brain: makeBrain(rng),
  };
}

export interface WorldOptions {
  /** Include a player worm at index 0 (default true). */
  player?: boolean;
  bots?: number;
  /** Ambient orb count (default AMBIENT_ORBS). */
  orbs?: number;
}

export function newWorld(seed = 1, opts: WorldOptions = {}): World {
  const rng = mulberry32(seed);
  const botCount = opts.bots ?? BOT_COUNT;
  const s: World = {
    rng, time: 0, worms: [], player: null, orbs: new OrbField(), grid: new SegGrid(), maxG: girth(START_MASS), respawns: [],
    board: [], boardT: 0, events: [], ambientTarget: opts.orbs ?? AMBIENT_ORBS, orbAcc: 0, botTarget: botCount, nextId: 1, dying: [],
  };
  if (opts.player ?? true) {
    const p = makeWorm(0, rng, true);
    s.worms.push(p);
    s.player = p;
  }
  for (let i = 0; i < botCount; i++) s.worms.push(makeWorm(s.nextId++, rng, false));
  // Seed the arena with food, then drop everyone in.
  for (let i = 0; i < s.ambientTarget; i++) addAmbientOrb(s);
  for (let wi = 0; wi < s.worms.length; wi++) {
    const w = s.worms[wi];
    if (w.isPlayer) spawnWorm(s, wi, START_MASS);
    else spawnWorm(s, wi, START_MASS + Math.pow(rng(), 3) * 140);
    s.grid.rebuild(s.worms);
  }
  refreshBoard(s);
  return s;
}

const colorOf = (w: Worm) => w.skin % ORB_COLORS.length;

export function addAmbientOrb(s: World) {
  const a = s.rng() * TAU;
  const r = Math.sqrt(s.rng()) * (WORLD_R - 60);
  const roll = s.rng();
  const v = roll < 0.68 ? 1 : roll < 0.92 ? 2 : roll < 0.985 ? 3 : 5;
  s.orbs.add(Math.cos(a) * r, Math.sin(a) * r, v, Math.floor(s.rng() * ORB_COLORS.length), true, s.rng() * TAU);
}

function pickName(s: World): string {
  for (let tries = 0; tries < 30; tries++) {
    const n = NAMES[Math.floor(s.rng() * NAMES.length)];
    if (!s.worms.some((w) => w.alive && w.name === n)) return n;
  }
  return NAMES[Math.floor(s.rng() * NAMES.length)] + Math.floor(s.rng() * 90 + 10);
}

/** A spot at least ~260 away from every living worm segment (best of a few tries). */
export function findSpawn(s: World): { x: number; y: number } {
  let best = { x: 0, y: 0 };
  let bestD = -1;
  for (let t = 0; t < 14; t++) {
    const a = s.rng() * TAU;
    const r = Math.sqrt(s.rng()) * (WORLD_R - 700);
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    let d = 1e9;
    s.grid.range(x, y, 280);
    for (let gy = s.grid.gy0; gy <= s.grid.gy1; gy++) {
      for (let gx = s.grid.gx0; gx <= s.grid.gx1; gx++) {
        for (let e = s.grid.head[gy * s.grid.size + gx]; e !== -1; e = s.grid.next[e]) {
          const w = s.worms[s.grid.wormOf[e]];
          const si = s.grid.segOf[e];
          const dd = Math.hypot(w.sx[si] - x, w.sy[si] - y);
          if (dd < d) d = dd;
        }
      }
    }
    if (d > bestD) {
      bestD = d;
      best = { x, y };
    }
    if (d >= 280) break;
  }
  return best;
}

/** (Re)spawn a worm as a fresh young worm of the given mass. */
export function spawnWorm(s: World, wi: number, mass: number, x?: number, y?: number, ang?: number) {
  const w = s.worms[wi];
  if (x === undefined || y === undefined) {
    const p = findSpawn(s);
    x = p.x;
    y = p.y;
  }
  const a = ang ?? Math.atan2(-y, -x) + (s.rng() - 0.5) * 1.2;
  w.alive = true;
  w.x = x;
  w.y = y;
  w.ang = a;
  w.targetAng = a;
  w.turnCmd = null;
  w.wantBoost = false;
  w.boosting = false;
  w.mass = mass;
  w.peak = mass;
  w.g = girth(mass);
  w.kills = 0;
  w.shield = SHIELD_TIME;
  w.dropAcc = 0;
  w.killedBy = "";
  w.deadFor = 0;
  if (!w.isPlayer) {
    w.name = pickName(s);
    w.skin = 1 + Math.floor(s.rng() * (SKIN_COUNT - 1));
    w.brain = makeBrain(s.rng);
  }
  w.n = segCount(mass);
  const sp = segSpacing(mass);
  for (let i = 0; i < w.n; i++) {
    w.sx[i] = x - Math.cos(a) * sp * i;
    w.sy[i] = y - Math.sin(a) * sp * i;
  }
  updateBox(w);
  s.events.push({ type: "spawn", wormId: w.id, x, y });
}

function updateBox(w: Worm) {
  let minX = 1e9;
  let maxX = -1e9;
  let minY = 1e9;
  let maxY = -1e9;
  for (let i = 0; i < w.n; i++) {
    const x = w.sx[i];
    const y = w.sy[i];
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  w.minX = minX;
  w.maxX = maxX;
  w.minY = minY;
  w.maxY = maxY;
}

/** Make every body segment trail the one in front at the worm's segment spacing. */
export function followChain(w: Worm) {
  const sx = w.sx;
  const sy = w.sy;
  sx[0] = w.x;
  sy[0] = w.y;
  const sp = segSpacing(w.mass);
  let minX = w.x;
  let maxX = w.x;
  let minY = w.y;
  let maxY = w.y;
  for (let i = 1; i < w.n; i++) {
    const dx = sx[i - 1] - sx[i];
    const dy = sy[i - 1] - sy[i];
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d > sp) {
      const k = (d - sp) / d;
      sx[i] += dx * k;
      sy[i] += dy * k;
    }
    const x = sx[i];
    const y = sy[i];
    if (x < minX) minX = x;
    else if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    else if (y > maxY) maxY = y;
  }
  w.minX = minX;
  w.maxX = maxX;
  w.minY = minY;
  w.maxY = maxY;
}

/** Add or remove tail segments so the length matches the mass. */
function resizeBody(w: Worm) {
  const target = segCount(w.mass);
  while (w.n < target) {
    w.sx[w.n] = w.sx[w.n - 1];
    w.sy[w.n] = w.sy[w.n - 1];
    w.n++;
  }
  if (w.n > target) w.n = target;
}

/** Whether a worm can boost right now. */
export const canBoost = (w: Worm) => w.alive && w.mass > MIN_BOOST_MASS;

function moveWorm(s: World, w: Worm, dt: number) {
  const maxT = turnRate(w.mass) * dt;
  if (w.turnCmd !== null) w.ang += clamp(w.turnCmd, -1, 1) * maxT;
  else w.ang += clamp(angDiff(w.ang, w.targetAng), -maxT, maxT);
  if (w.ang > Math.PI) w.ang -= TAU;
  else if (w.ang < -Math.PI) w.ang += TAU;
  w.boosting = w.wantBoost && canBoost(w);
  const speed = BASE_SPEED * (w.boosting ? BOOST_MULT : 1);
  w.x += Math.cos(w.ang) * speed * dt;
  w.y += Math.sin(w.ang) * speed * dt;
  if (w.shield > 0) w.shield -= dt;

  if (w.boosting) {
    const drain = boostDrain(w.mass) * dt;
    w.mass -= drain;
    w.dropAcc += drain * BOOST_RETURN;
    const chunk = 0.8 + w.mass * 0.004;
    while (w.dropAcc >= chunk) {
      w.dropAcc -= chunk;
      if (s.orbs.count < ORB_CAP && w.n > 0) {
        const tx = w.sx[w.n - 1] + (s.rng() - 0.5) * w.g;
        const ty = w.sy[w.n - 1] + (s.rng() - 0.5) * w.g;
        s.orbs.add(tx, ty, chunk, colorOf(w), false, s.rng() * TAU);
        if (w.isPlayer) s.events.push({ type: "boost-drop", wormId: w.id, x: tx, y: ty });
      }
    }
  }
  w.g = girth(w.mass);
  resizeBody(w);
  followChain(w);
}

function eatOrbs(s: World, w: Worm) {
  const eatR = w.g * 1.1 + 12;
  const orbs = s.orbs;
  orbs.range(w.x, w.y, eatR + 14);
  for (let gy = orbs.gy0; gy <= orbs.gy1; gy++) {
    for (let gx = orbs.gx0; gx <= orbs.gx1; gx++) {
      const list = orbs.cells[gy * orbs.size + gx];
      for (let i = list.length - 1; i >= 0; i--) {
        const o = list[i];
        const dx = o.x - w.x;
        const dy = o.y - w.y;
        const rr = eatR + o.r;
        if (dx * dx + dy * dy < rr * rr) {
          w.mass += o.v;
          if (w.isPlayer) s.events.push({ type: "eat", wormId: w.id, x: o.x, y: o.y, c: o.c, v: o.v });
          orbs.remove(o);
        }
      }
    }
  }
  if (w.mass > w.peak) w.peak = w.mass;
  w.g = girth(w.mass);
}

/** The first other worm whose body (or head) this worm's head is touching, as a worm index, or -1. */
export function bodyHit(s: World, wi: number): number {
  const w = s.worms[wi];
  const grid = s.grid;
  const reach = HEAD_HIT * w.g + BODY_HIT * s.maxG;
  grid.range(w.x, w.y, reach);
  for (let gy = grid.gy0; gy <= grid.gy1; gy++) {
    for (let gx = grid.gx0; gx <= grid.gx1; gx++) {
      for (let e = grid.head[gy * grid.size + gx]; e !== -1; e = grid.next[e]) {
        const oi = grid.wormOf[e];
        if (oi === wi) continue;
        const o = s.worms[oi];
        const si = grid.segOf[e];
        const dx = o.sx[si] - w.x;
        const dy = o.sy[si] - w.y;
        const hit = HEAD_HIT * w.g + BODY_HIT * o.g;
        if (dx * dx + dy * dy < hit * hit) return oi;
      }
    }
  }
  return -1;
}

export const outsideWorld = (w: Worm) => Math.sqrt(w.x * w.x + w.y * w.y) + w.g * 0.4 > WORLD_R;

/** Burst a worm into big orbs along its body and mark it dead. Returns the number of orbs dropped. */
export function killWorm(s: World, wi: number, cause: "body" | "edge", by = -1): number {
  const w = s.worms[wi];
  if (!w.alive) return 0;
  w.alive = false;
  w.boosting = false;
  w.wantBoost = false;
  w.deadFor = 0;
  const killer = by >= 0 ? s.worms[by] : null;
  w.killedBy = killer ? killer.name : cause === "edge" ? "the edge of the arena" : "another worm";
  const total = w.mass * DEATH_RETURN;
  const count = clamp(Math.floor(w.n / 2), 6, 140);
  const weights: number[] = [];
  let sum = 0;
  for (let k = 0; k < count; k++) {
    const wt = 0.7 + s.rng() * 0.6;
    weights.push(wt);
    sum += wt;
  }
  const c = colorOf(w);
  for (let k = 0; k < count; k++) {
    const i = Math.min(w.n - 1, Math.floor((k * w.n) / count));
    const jx = (s.rng() - 0.5) * w.g * 1.6;
    const jy = (s.rng() - 0.5) * w.g * 1.6;
    // Orbs stay inside the arena even if the worm died on the edge.
    let ox = w.sx[i] + jx;
    let oy = w.sy[i] + jy;
    const rr = Math.sqrt(ox * ox + oy * oy);
    if (rr > WORLD_R - 20) {
      ox *= (WORLD_R - 20) / rr;
      oy *= (WORLD_R - 20) / rr;
    }
    s.orbs.add(ox, oy, Math.max(1, (total * weights[k]) / sum), c, false, s.rng() * TAU);
  }
  s.events.push({ type: "death", wormId: w.id, x: w.x, y: w.y, cause, by: w.killedBy });
  if (killer && killer.alive) {
    killer.kills++;
    s.events.push({ type: "kill", killer: killer.id, victim: w.id, x: w.x, y: w.y });
  }
  if (!w.isPlayer) s.respawns.push({ wi, t: 1.5 + s.rng() * 3 });
  return count;
}

export function refreshBoard(s: World) {
  s.board.length = 0;
  for (let i = 0; i < s.worms.length; i++) if (s.worms[i].alive) s.board.push(i);
  s.board.sort((a, b) => s.worms[b].mass - s.worms[a].mass);
}

/** 1-based rank of a worm by mass among living worms (0 if dead). */
export function rankOf(s: World, wi: number): number {
  const i = s.board.indexOf(wi);
  return i < 0 ? 0 : i + 1;
}

/** One simulation step. Callers should keep dt at or below ~1/60 so fast boosting worms can't skip through bodies. */
export function step(s: World, dt: number): SlitherEvent[] {
  s.time += dt;
  const worms = s.worms;

  for (let wi = 0; wi < worms.length; wi++) {
    const w = worms[wi];
    if (!w.alive) {
      w.deadFor += dt;
      continue;
    }
    if (!w.isPlayer) {
      w.brain.thinkIn -= dt;
      if (w.brain.thinkIn <= 0) {
        w.brain.thinkIn += w.brain.thinkEvery * (0.8 + s.rng() * 0.4);
        think(s, wi);
      }
    }
  }

  let maxG = 0;
  for (let wi = 0; wi < worms.length; wi++) {
    const w = worms[wi];
    if (!w.alive) continue;
    moveWorm(s, w, dt);
    if (w.g > maxG) maxG = w.g;
  }
  s.maxG = maxG || girth(START_MASS);
  s.grid.rebuild(worms);

  for (let wi = 0; wi < worms.length; wi++) {
    const w = worms[wi];
    if (w.alive) eatOrbs(s, w);
  }

  // Find everyone who dies this step first, so head-on crashes kill both worms.
  s.dying.length = 0;
  for (let wi = 0; wi < worms.length; wi++) {
    const w = worms[wi];
    if (!w.alive || w.shield > 0) continue;
    if (outsideWorld(w)) {
      s.dying.push({ wi, cause: "edge", by: -1 });
      continue;
    }
    const hit = bodyHit(s, wi);
    if (hit >= 0) s.dying.push({ wi, cause: "body", by: hit });
  }
  for (const d of s.dying) killWorm(s, d.wi, d.cause, d.by);

  // Bots that died come back as fresh young worms.
  for (let i = s.respawns.length - 1; i >= 0; i--) {
    const r = s.respawns[i];
    r.t -= dt;
    if (r.t <= 0) {
      s.respawns.splice(i, 1);
      spawnWorm(s, r.wi, START_MASS + s.rng() * 6);
    }
  }

  // Keep the arena stocked with food.
  s.orbAcc += dt * 90;
  while (s.orbAcc >= 1) {
    s.orbAcc -= 1;
    if (s.orbs.ambient < s.ambientTarget && s.orbs.count < ORB_CAP) addAmbientOrb(s);
  }

  s.boardT -= dt;
  if (s.boardT <= 0) {
    s.boardT = 0.25;
    refreshBoard(s);
  }
  return s.events;
}

/** Advance by dt seconds of real time in small steps; returns the events (cleared at the start). */
export function advance(s: World, dt: number): SlitherEvent[] {
  s.events.length = 0;
  const n = Math.max(1, Math.ceil(dt * 60 - 1e-6));
  const h = dt / n;
  for (let i = 0; i < n; i++) step(s, h);
  return s.events;
}

/** Set a worm's wished heading and boost. */
export function steer(w: Worm, angle: number, boost: boolean) {
  w.targetAng = angle;
  w.turnCmd = null;
  w.wantBoost = boost;
}

/** Number of living bots (for population tests). */
export const livingBots = (s: World) => s.worms.filter((w) => !w.isPlayer && w.alive).length;
