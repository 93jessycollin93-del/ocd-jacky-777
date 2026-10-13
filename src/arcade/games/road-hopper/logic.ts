// Road Hopper rules: an endless hopper. Pure and seeded so it can be tested. The world is a stack of rows
// (index 0 is where you start, higher is further); each row is grass, road, rail or river. Columns run
// -4..4 for the player. Everything that moves is a function of the clock, so it is easy to test.
import { mulberry32, randInt, type Rng } from "../../kit/rng";

export const STEP = 1 / 120;
/** Playable columns are -HALF_COLS..HALF_COLS. */
export const HALF_COLS = 4;
/** Carried further sideways than this by a log and you are off the edge of the world. */
export const EDGE = 5;
/** Moving things loop around a strip this wide (x from -16 to 16). */
export const CYCLE = 32;
export const HALF_CYCLE = CYCLE / 2;
/** Columns drawn on each side (grass has trees out there for scenery). */
export const DRAW_COLS = 16;
export const HOP_TIME = 0.13;
/** How close (in tiles) a vehicle must get to squash you. */
export const HIT = 0.36;
/** A log keeps you up if you land within this much of its end. */
export const LOG_SLACK = 0.4;

/** Stand still this long and the bird starts circling; this long and it grabs you. */
export const IDLE_WARN = 4.2;
export const IDLE_GRAB = 6.6;
/** More than this many rows behind your furthest row brings the bird. */
export const BACK_LIMIT = 4;
export const BACK_GRAB = 1.3;
/** The first hop has a longer allowance. */
export const START_GRACE = 3;

export const TRAIN_SPEED = 26;
export const TRAIN_WARN = 1.7;

export type RowKind = "grass" | "road" | "rail" | "river";
export type Dir = "up" | "down" | "left" | "right";

export interface Vehicle {
  x0: number;
  len: number;
  /** 0..N colour index. */
  color: number;
}

export interface Log {
  x0: number;
  len: number;
}

export interface Row {
  index: number;
  kind: RowKind;
  /** Grass: columns with a tree, rock or bush (all out to DRAW_COLS). */
  trees: number[];
  /** Columns with a coin still to collect. */
  coins: number[];
  /** Lane direction and speed (tiles per second), for road and river rows. */
  dir: 1 | -1;
  speed: number;
  vehicles: Vehicle[];
  vehicleKind: "car" | "truck";
  lane: "logs" | "pads";
  logs: Log[];
  pads: number[];
  /** Rail: seconds between trains, when the first one's warning starts, warning length, train length. */
  period: number;
  phase: number;
  warn: number;
  trainLen: number;
  /** Which tile of this strip is lit up (for the checkerboard). */
  alt: number;
  /** Columns you can stand on and walk through to the next row (see generation). */
  reach: boolean[];
}

export type HopEvent = "hop" | "land" | "bump" | "coin" | "die" | "bird-warn";
export type DeathCause = "car" | "train" | "water" | "bird" | "edge";

export interface HopperState {
  seed: number;
  rng: Rng;
  /** rows[i + PAD] is row i. */
  rows: Row[];
  zoneKind: RowKind;
  zoneLeft: number;
  zoneDir: 1 | -1;
  time: number;
  row: number;
  /** Sideways position: whole numbers on land, any number on a log. */
  x: number;
  maxRow: number;
  facing: Dir;
  /** Seconds into the current hop; HOP_TIME or more means standing. */
  hopT: number;
  hopFrom: { row: number; x: number };
  queue: Dir | null;
  coins: number;
  alive: boolean;
  cause: DeathCause | null;
  deadT: number;
  idle: number;
  birdT: number;
  birdKind: "idle" | "back" | null;
  acc: number;
  events: HopEvent[];
}

/** Rows below 0 are scenery only; they are stored first. */
export const PAD = 10;
const COLS = HALF_COLS * 2 + 1;
const ci = (c: number) => c + HALF_COLS;

export const rowAt = (s: HopperState, i: number): Row => s.rows[i + PAD];

/** Wrap a position onto the looping strip. */
export const wrapX = (v: number) => ((((v + HALF_CYCLE) % CYCLE) + CYCLE) % CYCLE) - HALF_CYCLE;
/** Signed shortest distance from b to a on the loop. */
export const wrapDelta = (a: number, b: number) => wrapX(a - b);

export const difficulty = (index: number) => Math.min(1, Math.max(0, index) / 160);

// ---------------------------------------------------------------- things that move

export const vehicleX = (row: Row, v: Vehicle, t: number) => wrapX(v.x0 + row.dir * row.speed * t);
export const logX = (row: Row, l: Log, t: number) => wrapX(l.x0 + row.dir * row.speed * t);

export interface TrainState {
  /** Warning light on (from the start of the warning until the tail clears). */
  light: boolean;
  present: boolean;
  front: number;
  tail: number;
  /** Seconds until the front reaches the edge of the view; 0 once it has. */
  timeToArrive: number;
}

/** Where the train on a rail row is at time t, and whether the warning light is on. */
export function trainState(row: Row, t: number): TrainState {
  const out: TrainState = { light: false, present: false, front: 0, tail: 0, timeToArrive: Infinity };
  const k0 = Math.floor((t - row.phase) / row.period);
  const travel = (CYCLE + row.trainLen) / TRAIN_SPEED;
  for (let k = k0 - 1; k <= k0; k++) {
    const start = row.phase + k * row.period;
    const arrive = start + row.warn;
    const end = arrive + travel;
    if (t >= start && t <= end) {
      out.light = true;
      out.timeToArrive = Math.max(0, arrive - t);
      if (t >= arrive) {
        out.present = true;
        out.front = -row.dir * HALF_CYCLE + row.dir * TRAIN_SPEED * (t - arrive);
        out.tail = out.front - row.dir * row.trainLen;
      }
    }
  }
  return out;
}

/** Seconds from time t until the next warning starts on this rail row. */
export function nextWarning(row: Row, t: number) {
  const k = Math.ceil((t - row.phase) / row.period);
  return row.phase + k * row.period - t;
}

// ---------------------------------------------------------------- building rows

/** Can you stand on this tile? (Log lanes count as standable: there is always a log to catch.) */
export function passable(row: Row, c: number): boolean {
  if (row.kind === "grass") return !row.trees.includes(c);
  if (row.kind === "river" && row.lane === "pads") return row.pads.includes(c);
  return true;
}

function emptyRow(index: number, kind: RowKind): Row {
  return {
    index, kind, trees: [], coins: [], dir: 1, speed: 0, vehicles: [], vehicleKind: "car", lane: "logs", logs: [], pads: [],
    period: 0, phase: 0, warn: TRAIN_WARN, trainLen: 0, alt: index & 1, reach: new Array<boolean>(COLS).fill(false),
  };
}

/** Which columns you could get to on this row from the reachable columns of the row before, walking sideways too. */
function computeReach(row: Row, from: boolean[]): boolean[] {
  const out = new Array<boolean>(COLS).fill(false);
  for (let c = -HALF_COLS; c <= HALF_COLS; c++) if (from[ci(c)] && passable(row, c)) out[ci(c)] = true;
  for (let c = -HALF_COLS; c < HALF_COLS; c++) if (out[ci(c)] && passable(row, c + 1)) out[ci(c + 1)] = true;
  for (let c = HALF_COLS; c > -HALF_COLS; c--) if (out[ci(c)] && passable(row, c - 1)) out[ci(c - 1)] = true;
  return out;
}

const anyTrue = (a: boolean[]) => a.some(Boolean);

function pickOf(rng: Rng, from: boolean[]): number {
  const cols: number[] = [];
  for (let c = -HALF_COLS; c <= HALF_COLS; c++) if (from[ci(c)]) cols.push(c);
  return cols[Math.floor(rng() * cols.length)];
}

function buildGrass(s: HopperState, row: Row, prev: boolean[]) {
  const r = row.index;
  const d = difficulty(r);
  const pTree = r === 0 ? 0 : r < 3 ? 0.1 : 0.15 + 0.12 * d;
  for (let c = -DRAW_COLS; c <= DRAW_COLS; c++) {
    const inside = Math.abs(c) <= HALF_COLS;
    if (s.rng() < (inside ? pTree : 0.58)) row.trees.push(c);
  }
  row.reach = computeReach(row, prev);
  if (!anyTrue(row.reach)) {
    // Never wall the player in: open the tree in front of a column they can stand on.
    const c = pickOf(s.rng, prev);
    row.trees = row.trees.filter((t) => t !== c);
    row.reach = computeReach(row, prev);
  }
}

function buildRoad(s: HopperState, row: Row) {
  const d = difficulty(row.index);
  row.dir = s.zoneDir;
  s.zoneDir = (s.zoneDir === 1 ? -1 : 1) as 1 | -1;
  if (s.rng() < 0.2) s.zoneDir = row.dir;
  const truck = s.rng() < 0.3 + 0.2 * d;
  row.vehicleKind = truck ? "truck" : "car";
  const len = truck ? 2.5 + s.rng() * 0.5 : 1.5;
  const base = truck ? 1.4 + s.rng() * 1.0 : 2.0 + s.rng() * 1.4;
  row.speed = base * (1 + 0.8 * d);
  const spacing0 = (11 - 4.5 * d) * (0.8 + 0.4 * s.rng());
  const n = Math.max(2, Math.round(CYCLE / Math.max(spacing0, len + 2.6)));
  const sp = CYCLE / n;
  const off = s.rng() * CYCLE;
  const palette = truck ? 4 : 7;
  for (let i = 0; i < n; i++) {
    row.vehicles.push({ x0: wrapX(off + i * sp + (s.rng() - 0.5) * 0.2 * sp), len, color: randInt(s.rng, 0, palette - 1) });
  }
}

function buildRail(s: HopperState, row: Row) {
  const d = difficulty(row.index);
  row.dir = s.rng() < 0.5 ? 1 : -1;
  row.period = 6.4 - 1.4 * d + s.rng() * 2.2;
  row.phase = s.rng() * row.period;
  row.warn = TRAIN_WARN + s.rng() * 0.3;
  row.trainLen = randInt(s.rng, 12, 20);
}

function buildRiver(s: HopperState, row: Row, prev: boolean[]) {
  const d = difficulty(row.index);
  row.dir = s.zoneDir;
  s.zoneDir = (s.zoneDir === 1 ? -1 : 1) as 1 | -1;
  const pads = s.rng() < 0.32;
  if (pads) {
    row.lane = "pads";
    const k = randInt(s.rng, 3, 5);
    while (row.pads.length < k) {
      const c = randInt(s.rng, -HALF_COLS, HALF_COLS);
      if (!row.pads.includes(c)) row.pads.push(c);
    }
    row.pads.sort((a, b) => a - b);
    row.reach = computeReach(row, prev);
    if (!anyTrue(row.reach)) {
      row.pads.push(pickOf(s.rng, prev));
      row.pads.sort((a, b) => a - b);
      row.reach = computeReach(row, prev);
    }
    return;
  }
  row.lane = "logs";
  row.speed = (0.9 + s.rng() * 1.0) * (1 + 0.5 * d);
  const n = s.rng() < 0.5 ? 4 : 5;
  const sp = CYCLE / n;
  const off = s.rng() * CYCLE;
  const maxLen = n === 4 ? 4 : 3;
  for (let i = 0; i < n; i++) {
    const len = randInt(s.rng, 2, maxLen);
    row.logs.push({ x0: wrapX(off + i * sp + (s.rng() - 0.5) * 0.3), len });
  }
}

/** Put a coin on a tile the player can reach (sometimes). */
function maybeCoin(s: HopperState, row: Row) {
  if (row.index < 2 || row.kind === "river" && row.lane === "logs") return;
  if (s.rng() >= 0.22) return;
  const cols: number[] = [];
  for (let c = -HALF_COLS; c <= HALF_COLS; c++) if (row.reach[ci(c)] && passable(row, c)) cols.push(c);
  if (cols.length) row.coins.push(cols[Math.floor(s.rng() * cols.length)]);
}

/** Choose the next stretch of rows. Grass separates busier stretches, and the first rows are always safe. */
function nextZone(s: HopperState, r: number): { kind: RowKind; len: number } {
  if (r < 3) return { kind: "grass", len: 3 - r };
  if (s.zoneKind !== "grass") return { kind: "grass", len: s.rng() < 0.45 ? 2 : 1 };
  const x = s.rng();
  const riverOk = r >= 9;
  const railOk = r >= 6;
  if (x < 0.12) return { kind: "grass", len: randInt(s.rng, 1, 2) };
  if (x < 0.52 || (!riverOk && !railOk)) {
    const lanes = s.rng();
    return { kind: "road", len: lanes < 0.18 ? 1 : lanes < 0.5 ? 2 : lanes < 0.82 ? 3 : 4 };
  }
  if (riverOk && (x < 0.8 || !railOk)) return { kind: "river", len: randInt(s.rng, 1, 3) };
  return { kind: "rail", len: s.rng() < 0.6 ? 1 : 2 };
}

function genRow(s: HopperState) {
  const r = s.rows.length - PAD;
  if (s.zoneLeft <= 0) {
    const z = nextZone(s, r);
    s.zoneKind = z.kind;
    s.zoneLeft = z.len;
    s.zoneDir = s.rng() < 0.5 ? 1 : -1;
  }
  s.zoneLeft--;
  const row = emptyRow(r, s.zoneKind);
  const prev = s.rows[s.rows.length - 1].reach;
  switch (row.kind) {
    case "grass":
      buildGrass(s, row, prev);
      break;
    case "road":
      buildRoad(s, row);
      row.reach = computeReach(row, prev);
      break;
    case "rail":
      buildRail(s, row);
      row.reach = computeReach(row, prev);
      break;
    case "river":
      buildRiver(s, row, prev);
      if (row.lane === "logs") row.reach = computeReach(row, prev);
      break;
  }
  maybeCoin(s, row);
  s.rows.push(row);
}

/** Make sure rows exist up to this index. */
export function ensureRows(s: HopperState, upTo: number) {
  while (s.rows.length - PAD <= upTo) genRow(s);
}

export function newGame(seed = 1): HopperState {
  const rng = mulberry32(seed);
  const s: HopperState = {
    seed, rng, rows: [], zoneKind: "grass", zoneLeft: 0, zoneDir: 1, time: 0, row: 0, x: 0, maxRow: 0, facing: "up", hopT: HOP_TIME,
    hopFrom: { row: 0, x: 0 }, queue: null, coins: 0, alive: true, cause: null, deadT: 0, idle: -START_GRACE, birdT: 0,
    birdKind: null, acc: 0, events: [],
  };
  // Scenery behind the start: dense grass.
  for (let i = -PAD; i < 0; i++) {
    const row = emptyRow(i, "grass");
    for (let c = -DRAW_COLS; c <= DRAW_COLS; c++) if (rng() < 0.55) row.trees.push(c);
    row.reach = new Array<boolean>(COLS).fill(true);
    s.rows.push(row);
  }
  // The start row is all open grass.
  const first = emptyRow(0, "grass");
  for (let c = -DRAW_COLS; c <= DRAW_COLS; c++) if (Math.abs(c) > HALF_COLS && rng() < 0.55) first.trees.push(c);
  first.reach = new Array<boolean>(COLS).fill(true);
  s.rows.push(first);
  s.zoneKind = "grass";
  s.zoneLeft = 2;
  ensureRows(s, 40);
  return s;
}

// ---------------------------------------------------------------- hopping and dying

function die(s: HopperState, cause: DeathCause) {
  if (!s.alive) return;
  s.alive = false;
  s.cause = cause;
  s.deadT = 0;
  s.queue = null;
  s.events.push("die");
}

const DELTA: Record<Dir, [number, number]> = { up: [1, 0], down: [-1, 0], left: [0, -1], right: [0, 1] };

function startHop(s: HopperState, dir: Dir): boolean {
  const cur = rowAt(s, s.row);
  const [dr, dc] = DELTA[dir];
  const nr = s.row + dr;
  ensureRows(s, nr + 30);
  s.idle = 0;
  if (nr < 0) {
    s.events.push("bump");
    return false;
  }
  const dest = rowAt(s, nr);
  const stayOnWater = cur.kind === "river" && dest.kind === "river";
  let nx: number;
  if (dc !== 0) nx = (cur.kind === "river" ? s.x : Math.round(s.x)) + dc;
  else nx = stayOnWater ? s.x : Math.round(s.x);
  const limit = HALF_COLS + (stayOnWater ? 0.5 : 0);
  if (Math.abs(nx) > limit + 1e-9) {
    s.events.push("bump");
    return false;
  }
  if (dest.kind === "grass" && dest.trees.includes(Math.round(nx))) {
    s.events.push("bump");
    return false;
  }
  s.hopFrom = { row: s.row, x: s.x };
  s.row = nr;
  s.x = nx;
  s.facing = dir;
  s.hopT = 0;
  if (nr > s.maxRow) s.maxRow = nr;
  s.events.push("hop");
  return true;
}

/** Ask for a hop. If one is under way it is remembered and happens as soon as the bunny lands. */
export function hop(s: HopperState, dir: Dir): boolean {
  if (!s.alive) return false;
  if (s.hopT < HOP_TIME) {
    s.queue = dir;
    return true;
  }
  return startHop(s, dir);
}

/** What is under the bunny's feet right now, and what it means. */
function checkHazards(s: HopperState) {
  const row = rowAt(s, s.row);
  switch (row.kind) {
    case "road":
      for (const v of row.vehicles) {
        if (Math.abs(wrapDelta(s.x, vehicleX(row, v, s.time))) < v.len / 2 + HIT) return die(s, "car");
      }
      break;
    case "rail": {
      const t = trainState(row, s.time);
      if (t.present) {
        const lo = Math.min(t.front, t.tail) - HIT;
        const hi = Math.max(t.front, t.tail) + HIT;
        if (s.x >= lo && s.x <= hi) return die(s, "train");
      }
      break;
    }
    case "river":
      if (row.lane === "pads") {
        if (!row.pads.includes(Math.round(s.x)) || Math.abs(s.x - Math.round(s.x)) > 0.5) return die(s, "water");
      } else if (!supportingLog(s, row)) return die(s, "water");
      break;
    default:
      break;
  }
}

/** The log (if any) holding the bunny up. */
export function supportingLog(s: HopperState, row: Row): Log | null {
  for (const l of row.logs) {
    if (Math.abs(wrapDelta(s.x, logX(row, l, s.time))) <= l.len / 2 + LOG_SLACK) return l;
  }
  return null;
}

function land(s: HopperState) {
  s.events.push("land");
  const row = rowAt(s, s.row);
  checkHazards(s);
  if (!s.alive) return;
  const c = Math.round(s.x);
  const i = row.coins.indexOf(c);
  if (i >= 0 && Math.abs(s.x - c) < 0.5) {
    row.coins.splice(i, 1);
    s.coins++;
    s.events.push("coin");
  }
}

/** How close the bird is to grabbing you, 0..1. */
export function birdWarn(s: HopperState) {
  const need = s.birdKind === "back" ? BACK_GRAB : IDLE_GRAB - IDLE_WARN;
  return Math.min(1, s.birdT / need);
}

/** Advance exactly one fixed step. */
export function step(s: HopperState) {
  const dt = STEP;
  s.time += dt;
  ensureRows(s, s.row + 30);
  const row = rowAt(s, s.row);

  if (!s.alive) {
    s.deadT += dt;
    // Carried off the edge: the log goes on without you.
    if (s.cause === "edge" && row.kind === "river") s.x += row.dir * row.speed * dt;
    return;
  }

  if (s.hopT < HOP_TIME) {
    s.hopT += dt;
    if (s.hopT >= HOP_TIME) {
      s.hopT = HOP_TIME;
      land(s);
      if (s.alive && s.queue) {
        const q = s.queue;
        s.queue = null;
        startHop(s, q);
      }
    }
  } else {
    // Standing: ride a log, watch for traffic, and the idle clock runs.
    if (row.kind === "river" && row.lane === "logs") {
      if (supportingLog(s, row)) s.x += row.dir * row.speed * dt;
    }
    checkHazards(s);
    if (s.alive && Math.abs(s.x) > EDGE) die(s, "edge");
    s.idle += dt;
  }
  if (!s.alive) return;

  // The bird: it circles if you stand still or wander too far back, then grabs you.
  const farBack = s.maxRow - s.row >= BACK_LIMIT;
  const idling = s.idle >= IDLE_WARN;
  if (farBack || idling) {
    if (s.birdT === 0) s.events.push("bird-warn");
    s.birdKind = farBack ? "back" : "idle";
    s.birdT += dt;
    if (s.birdT >= (farBack ? BACK_GRAB : IDLE_GRAB - IDLE_WARN)) die(s, "bird");
  } else if (s.birdT > 0) {
    s.birdT = Math.max(0, s.birdT - dt * 2);
    if (s.birdT === 0) s.birdKind = null;
  }
}

/** Advance by real time using fixed steps. Returns the events (the array is reused between calls). */
export function update(s: HopperState, dt: number): HopEvent[] {
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

/** Score is the furthest row reached. */
export const scoreOf = (s: HopperState) => s.maxRow;
