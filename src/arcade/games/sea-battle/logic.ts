// Sea Battle rules, pure and seeded: a 10 × 10 grid, a fleet of 5, 4, 3, 3 and 2, ships that may not touch
// (not even diagonally), and three computer opponents: random shots, hunt-and-target on a checkerboard, and a
// probability heatmap of every place the remaining ships could still be.
import { mulberry32, type Rng } from "../../kit/rng";

export const N = 10;
export const FLEET = [5, 4, 3, 3, 2];
export const SHIP_NAMES = ["Carrier", "Battleship", "Cruiser", "Submarine", "Destroyer"];

export type Difficulty = "easy" | "normal" | "hard";

export interface Ship {
  len: number;
  cells: number[];
  hits: number;
}

/** What is known about each cell of a grid: 0 unknown, 1 miss, 2 hit, 3 part of a sunk ship. */
export const UNKNOWN = 0;
export const MISS = 1;
export const HIT = 2;
export const SUNK = 3;

export interface Board {
  ships: Ship[];
  shots: Uint8Array;
}

export const idx = (r: number, c: number) => r * N + c;
export const rc = (i: number) => [Math.floor(i / N), i % N] as const;

export function shipCells(len: number, r: number, c: number, horizontal: boolean): number[] | null {
  const out: number[] = [];
  for (let k = 0; k < len; k++) {
    const rr = horizontal ? r : r + k;
    const cc = horizontal ? c + k : c;
    if (rr < 0 || cc < 0 || rr >= N || cc >= N) return null;
    out.push(idx(rr, cc));
  }
  return out;
}

/** Cells next to (or on) any of these cells, diagonals included. */
export function halo(cells: number[]): Set<number> {
  const out = new Set<number>();
  for (const i of cells) {
    const [r, c] = rc(i);
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      const rr = r + dr;
      const cc = c + dc;
      if (rr >= 0 && cc >= 0 && rr < N && cc < N) out.add(idx(rr, cc));
    }
  }
  return out;
}

/** Can a ship go here without leaving the grid or touching another ship? */
export function canPlace(ships: Ship[], cells: number[] | null, ignore?: Ship): boolean {
  if (!cells) return false;
  const near = halo(cells);
  return !ships.some((s) => s !== ignore && s.cells.some((c) => near.has(c)));
}

export function randomFleet(rng: Rng): Ship[] {
  for (;;) {
    const ships: Ship[] = [];
    let ok = true;
    for (const len of FLEET) {
      let placed = false;
      for (let t = 0; t < 400 && !placed; t++) {
        const h = rng() < 0.5;
        const cells = shipCells(len, Math.floor(rng() * N), Math.floor(rng() * N), h);
        if (canPlace(ships, cells)) {
          ships.push({ len, cells: cells!, hits: 0 });
          placed = true;
        }
      }
      if (!placed) {
        ok = false;
        break;
      }
    }
    if (ok) return ships;
  }
}

export const newBoard = (ships: Ship[]): Board => ({ ships: ships.map((s) => ({ ...s, cells: s.cells.slice(), hits: 0 })), shots: new Uint8Array(N * N) });

export type ShotResult = { type: "miss" } | { type: "hit" } | { type: "sunk"; ship: number; around: number[] } | { type: "repeat" };

/** Fire at a cell. A sunk ship is revealed and the water around it is marked as known misses. */
export function fireAt(b: Board, i: number): ShotResult {
  if (b.shots[i] !== UNKNOWN) return { type: "repeat" };
  const si = b.ships.findIndex((s) => s.cells.includes(i));
  if (si < 0) {
    b.shots[i] = MISS;
    return { type: "miss" };
  }
  const ship = b.ships[si];
  ship.hits++;
  b.shots[i] = HIT;
  if (ship.hits < ship.len) return { type: "hit" };
  for (const c of ship.cells) b.shots[c] = SUNK;
  const around: number[] = [];
  for (const c of halo(ship.cells)) {
    if (b.shots[c] === UNKNOWN) {
      b.shots[c] = MISS;
      around.push(c);
    }
  }
  return { type: "sunk", ship: si, around };
}

export const allSunk = (b: Board) => b.ships.every((s) => s.hits >= s.len);
export const shipsLeft = (b: Board) => b.ships.filter((s) => s.hits < s.len).map((s) => s.len);

// ---------------------------------------------------------------- the computer's shots

const unknownCells = (shots: Uint8Array) => {
  const out: number[] = [];
  for (let i = 0; i < shots.length; i++) if (shots[i] === UNKNOWN) out.push(i);
  return out;
};

const pick = <T,>(rng: Rng, xs: T[]) => xs[Math.floor(rng() * xs.length)];

/** Hits that belong to ships not yet sunk. */
const openHits = (shots: Uint8Array) => {
  const out: number[] = [];
  for (let i = 0; i < shots.length; i++) if (shots[i] === HIT) out.push(i);
  return out;
};

function neighbours(i: number): number[] {
  const [r, c] = rc(i);
  const out: number[] = [];
  if (r > 0) out.push(i - N);
  if (r < N - 1) out.push(i + N);
  if (c > 0) out.push(i - 1);
  if (c < N - 1) out.push(i + 1);
  return out;
}

function huntTarget(shots: Uint8Array, rng: Rng): number {
  const hits = openHits(shots);
  if (hits.length) {
    // Two or more hits in a line: keep going along that line.
    if (hits.length >= 2) {
      const rows = new Set(hits.map((h) => rc(h)[0]));
      const cols = new Set(hits.map((h) => rc(h)[1]));
      const ends: number[] = [];
      if (rows.size === 1) {
        const r = rc(hits[0])[0];
        const cs = hits.map((h) => rc(h)[1]);
        const lo = Math.min(...cs) - 1;
        const hi = Math.max(...cs) + 1;
        if (lo >= 0) ends.push(idx(r, lo));
        if (hi < N) ends.push(idx(r, hi));
      } else if (cols.size === 1) {
        const c = rc(hits[0])[1];
        const rs = hits.map((h) => rc(h)[0]);
        const lo = Math.min(...rs) - 1;
        const hi = Math.max(...rs) + 1;
        if (lo >= 0) ends.push(idx(lo, c));
        if (hi < N) ends.push(idx(hi, c));
      }
      const open = ends.filter((e) => shots[e] === UNKNOWN);
      if (open.length) return pick(rng, open);
    }
    const around = [...new Set(hits.flatMap(neighbours))].filter((n) => shots[n] === UNKNOWN);
    if (around.length) return pick(rng, around);
  }
  // Hunting: the smallest ship is two long, so a checkerboard finds every ship.
  const free = unknownCells(shots);
  const parity = free.filter((i) => (rc(i)[0] + rc(i)[1]) % 2 === 0);
  return pick(rng, parity.length ? parity : free);
}

/** For each cell, how many placements of the remaining ships cover it (weighted toward open hits). */
export function heatmap(shots: Uint8Array, remaining: number[]): Float64Array {
  const heat = new Float64Array(N * N);
  const hits = openHits(shots);
  for (const len of remaining) {
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) for (const h of [true, false]) {
      const cells = shipCells(len, r, c, h);
      if (!cells) continue;
      if (cells.some((x) => shots[x] === MISS || shots[x] === SUNK)) continue;
      const covered = cells.filter((x) => shots[x] === HIT).length;
      // With open hits, only placements through them matter (and more hits matter more).
      if (hits.length && covered === 0) continue;
      const w = hits.length ? Math.pow(30, covered) : 1;
      for (const x of cells) if (shots[x] === UNKNOWN) heat[x] += w;
    }
  }
  return heat;
}

function hardShot(shots: Uint8Array, remaining: number[], rng: Rng): number {
  const heat = heatmap(shots, remaining);
  let best = -1;
  let bestV = -1;
  for (let i = 0; i < heat.length; i++) {
    if (shots[i] !== UNKNOWN) continue;
    const v = heat[i] + rng() * 0.01;
    if (v > bestV) {
      bestV = v;
      best = i;
    }
  }
  return best >= 0 ? best : huntTarget(shots, rng);
}

/** Choose the computer's next shot at a board it can only see through `shots`. */
export function aiShot(level: Difficulty, shots: Uint8Array, remaining: number[], rng: Rng): number {
  if (level === "easy") {
    // Easy finishes a ship it has hit about half the time; otherwise it fires at random.
    if (openHits(shots).length && rng() < 0.5) return huntTarget(shots, rng);
    return pick(rng, unknownCells(shots));
  }
  if (level === "normal") return huntTarget(shots, rng);
  return hardShot(shots, remaining, rng);
}

/** Play a whole game of the computer against a random fleet; returns the shots it needed (for tests). */
export function simulate(level: Difficulty, seed: number): number {
  const rng = mulberry32(seed);
  const b = newBoard(randomFleet(rng));
  let shots = 0;
  while (!allSunk(b) && shots < 200) {
    const i = aiShot(level, b.shots, shipsLeft(b), rng);
    fireAt(b, i);
    shots++;
  }
  return shots;
}
