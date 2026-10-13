// 2048 rules: pure and seeded so they can be tested. A 4×4 grid of values (0 = empty). Sliding moves
// every tile as far as it will go; two equal tiles that meet merge once per move, starting with the
// pair closest to the side you are moving toward. Score is the sum of all merged values.
import { mulberry32 } from "../../kit/rng";

export const SIZE = 4;
export const GOAL = 2048;
export type Grid = number[][];
export type Dir = "up" | "down" | "left" | "right";
export const DIRS: Dir[] = ["up", "down", "left", "right"];

export interface TileMove {
  /** Where the tile (or the two tiles that merged) started: [row, col]. */
  from: [number, number][];
  to: [number, number];
  /** Value after the move (doubled if two tiles merged). */
  value: number;
  merged: boolean;
}

export interface LineSlide {
  line: number[];
  gained: number;
  moves: { from: number[]; to: number; value: number; merged: boolean }[];
}

/**
 * Slide one line toward index 0. A tile merges with the next one if they are equal, and a tile that
 * just merged can't merge again in the same move: [2,2,2,2] → [4,4,0,0] and [4,2,2,0] → [4,4,0,0].
 */
export function slideLine(input: number[]): LineSlide {
  const n = input.length;
  const tiles: { v: number; i: number }[] = [];
  input.forEach((v, i) => {
    if (v) tiles.push({ v, i });
  });
  const line = new Array<number>(n).fill(0);
  const moves: LineSlide["moves"] = [];
  let gained = 0;
  let out = 0;
  for (let k = 0; k < tiles.length; k++) {
    const a = tiles[k];
    const b = tiles[k + 1];
    if (b && b.v === a.v) {
      line[out] = a.v * 2;
      gained += a.v * 2;
      moves.push({ from: [a.i, b.i], to: out, value: a.v * 2, merged: true });
      k++;
    } else {
      line[out] = a.v;
      moves.push({ from: [a.i], to: out, value: a.v, merged: false });
    }
    out++;
  }
  return { line, gained, moves };
}

/** Cell positions of line `i` listed starting from the side the tiles are moving toward. */
function linePositions(dir: Dir, i: number): [number, number][] {
  const out: [number, number][] = [];
  for (let k = 0; k < SIZE; k++) {
    if (dir === "left") out.push([i, k]);
    else if (dir === "right") out.push([i, SIZE - 1 - k]);
    else if (dir === "up") out.push([k, i]);
    else out.push([SIZE - 1 - k, i]);
  }
  return out;
}

export const emptyGrid = (): Grid => Array.from({ length: SIZE }, () => new Array<number>(SIZE).fill(0));
export const cloneGrid = (g: Grid): Grid => g.map((r) => r.slice());

export interface MoveResult {
  grid: Grid;
  gained: number;
  moved: boolean;
  moves: TileMove[];
  /** Largest tile that was created by a merge this move (0 if none). */
  biggestMerge: number;
}

/** Slide the whole grid. Does not spawn anything. */
export function moveGrid(grid: Grid, dir: Dir): MoveResult {
  const next = emptyGrid();
  const moves: TileMove[] = [];
  let gained = 0;
  let biggestMerge = 0;
  for (let i = 0; i < SIZE; i++) {
    const pos = linePositions(dir, i);
    const res = slideLine(pos.map(([r, c]) => grid[r][c]));
    gained += res.gained;
    res.line.forEach((v, k) => {
      next[pos[k][0]][pos[k][1]] = v;
    });
    for (const m of res.moves) {
      moves.push({ from: m.from.map((k) => pos[k]), to: pos[m.to], value: m.value, merged: m.merged });
      if (m.merged) biggestMerge = Math.max(biggestMerge, m.value);
    }
  }
  const moved = next.some((row, r) => row.some((v, c) => v !== grid[r][c]));
  return { grid: next, gained, moved, moves, biggestMerge };
}

export const emptyCells = (g: Grid): [number, number][] => {
  const out: [number, number][] = [];
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (!g[r][c]) out.push([r, c]);
  return out;
};

/** True if any slide would change the board. */
export function hasMoves(g: Grid): boolean {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (!g[r][c]) return true;
      if (c + 1 < SIZE && g[r][c] === g[r][c + 1]) return true;
      if (r + 1 < SIZE && g[r][c] === g[r + 1][c]) return true;
    }
  }
  return false;
}

export const maxTile = (g: Grid) => Math.max(0, ...g.map((r) => Math.max(...r)));

export interface Snapshot {
  grid: Grid;
  score: number;
  counter: number;
  reached: boolean;
  over: boolean;
}

export interface GameState {
  grid: Grid;
  score: number;
  /** Random spawns use seed + counter, so a game can be saved, restored and undone exactly. */
  seed: number;
  counter: number;
  /** A 2048 tile has been made (the win screen has been, or is being, shown). */
  reached: boolean;
  over: boolean;
  moves: number;
  /** One step back, or null. */
  prev: Snapshot | null;
}

export interface Spawn {
  r: number;
  c: number;
  value: number;
}

/** Drop a 2 (90%) or a 4 (10%) on a random empty cell. Returns where, or null if the grid is full. */
export function spawnTile(s: GameState): Spawn | null {
  const empty = emptyCells(s.grid);
  if (!empty.length) return null;
  const rng = mulberry32((s.seed ^ Math.imul(s.counter + 1, 0x9e3779b1)) | 0);
  s.counter++;
  const [r, c] = empty[Math.floor(rng() * empty.length)];
  const value = rng() < 0.9 ? 2 : 4;
  s.grid[r][c] = value;
  return { r, c, value };
}

export function newGame(seed = 1): GameState {
  const s: GameState = { grid: emptyGrid(), score: 0, seed, counter: 0, reached: false, over: false, moves: 0, prev: null };
  spawnTile(s);
  spawnTile(s);
  return s;
}

export interface TurnResult {
  moved: boolean;
  move: MoveResult | null;
  spawn: Spawn | null;
  /** This move made the first 2048 tile. */
  won: boolean;
}

/** Make a move: slide, score, spawn one tile (only if something moved), and check for the end. */
export function applyMove(s: GameState, dir: Dir): TurnResult {
  if (s.over) return { moved: false, move: null, spawn: null, won: false };
  const res = moveGrid(s.grid, dir);
  if (!res.moved) return { moved: false, move: res, spawn: null, won: false };
  s.prev = { grid: cloneGrid(s.grid), score: s.score, counter: s.counter, reached: s.reached, over: s.over };
  s.grid = res.grid;
  s.score += res.gained;
  s.moves++;
  const spawn = spawnTile(s);
  let won = false;
  if (!s.reached && maxTile(s.grid) >= GOAL) {
    s.reached = true;
    won = true;
  }
  if (!hasMoves(s.grid)) s.over = true;
  return { moved: true, move: res, spawn, won };
}

/** Take back the last move (one step only). */
export function undo(s: GameState): boolean {
  if (!s.prev) return false;
  s.grid = cloneGrid(s.prev.grid);
  s.score = s.prev.score;
  s.counter = s.prev.counter;
  s.reached = s.prev.reached;
  s.over = s.prev.over;
  s.moves = Math.max(0, s.moves - 1);
  s.prev = null;
  return true;
}

// ---------------------------------------------------------------- saving

export interface SavedGame {
  grid: Grid;
  score: number;
  seed: number;
  counter: number;
  reached: boolean;
  moves: number;
  prev: Snapshot | null;
}

export const serialize = (s: GameState): SavedGame => ({
  grid: cloneGrid(s.grid), score: s.score, seed: s.seed, counter: s.counter, reached: s.reached, moves: s.moves, prev: s.prev,
});

const validGrid = (g: unknown): g is Grid =>
  Array.isArray(g) &&
  g.length === SIZE &&
  g.every((r) => Array.isArray(r) && r.length === SIZE && r.every((v) => Number.isInteger(v) && v >= 0 && (v === 0 || (v & (v - 1)) === 0)));

/** Rebuild a game from a save, or null if it isn't a playable board. */
export function restore(raw: unknown): GameState | null {
  const d = raw as Partial<SavedGame> | null;
  if (!d || !validGrid(d.grid) || typeof d.score !== "number" || typeof d.seed !== "number" || typeof d.counter !== "number") return null;
  if (!hasMoves(d.grid)) return null;
  const prev = d.prev && validGrid(d.prev.grid) ? { ...d.prev, grid: cloneGrid(d.prev.grid), over: false } : null;
  return {
    grid: cloneGrid(d.grid), score: d.score, seed: d.seed, counter: d.counter, reached: !!d.reached, over: false, moves: d.moves ?? 0, prev,
  };
}
