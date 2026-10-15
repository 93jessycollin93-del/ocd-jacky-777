// Mahjong solitaire rules: pure, seeded and testable. A deal is made backwards: starting from the full
// layout we take away pairs of free tiles one after another, then give those pairs matching faces in that
// order. Playing the same pairs in the same order always clears the board, so every deal can be solved.
import { mulberry32, shuffle, type Rng } from "../../kit/rng";
import { slotsOf, type LayoutDef, type Slot } from "./layouts";
import { fullSet, matchClass, matches } from "./tiles";

/** What sits next to and on top of each slot. Computed once per layout. */
export interface Board {
  slots: Slot[];
  /** Slots on a higher layer that overlap this one: while any is still there, the tile is covered. */
  above: number[][];
  /** Same-layer neighbours touching the left and right sides. */
  left: number[][];
  right: number[][];
}

export type Pair = [number, number];

export interface Game {
  board: Board;
  /** Tile kind at each slot (see tiles.ts). */
  faces: number[];
  gone: boolean[];
  /** Pairs removed so far, oldest first: undo pops from the end. */
  history: Pair[];
  remaining: number;
  /** A move list that clears the tiles currently on the board (valid until you leave it). */
  solution: Pair[];
  /** The deal as first made, so Restart can put it back. */
  startFaces: number[];
  startSolution: Pair[];
  seed: number;
  rotated: boolean;
  layoutId: string;
}

const overlaps = (a: Slot, b: Slot) => Math.abs(a.x - b.x) < 2 && Math.abs(a.y - b.y) < 2;

export function buildBoard(slots: Slot[]): Board {
  const n = slots.length;
  const above: number[][] = Array.from({ length: n }, () => []);
  const left: number[][] = Array.from({ length: n }, () => []);
  const right: number[][] = Array.from({ length: n }, () => []);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const a = slots[i];
      const b = slots[j];
      if (b.z > a.z && overlaps(a, b)) above[i].push(j);
      else if (b.z === a.z && Math.abs(b.y - a.y) < 2) {
        if (b.x === a.x - 2) left[i].push(j);
        else if (b.x === a.x + 2) right[i].push(j);
      }
    }
  }
  return { slots, above, left, right };
}

/** A tile is free when nothing is on top of it and its left or its right side is open. */
export function isFree(board: Board, gone: readonly boolean[], i: number): boolean {
  if (gone[i]) return false;
  if (board.above[i].some((j) => !gone[j])) return false;
  return board.left[i].every((j) => gone[j]) || board.right[i].every((j) => gone[j]);
}

export function freeFlags(g: Game): boolean[] {
  return g.gone.map((_, i) => isFree(g.board, g.gone, i));
}

export const freeTiles = (g: Game): number[] => {
  const out: number[] = [];
  for (let i = 0; i < g.gone.length; i++) if (isFree(g.board, g.gone, i)) out.push(i);
  return out;
};

// ---- dealing

/**
 * Take pairs of free tiles away one at a time, at random, until nothing is left. Backtracks if a choice
 * leaves fewer than two free tiles. Returns the pairs in the order they were taken, or null if it gives up.
 */
export function planOrder(board: Board, startGone: readonly boolean[], rng: Rng): Pair[] | null {
  const gone = startGone.slice();
  let left = gone.filter((x) => !x).length;
  if (left % 2) return null;
  const out: Pair[] = [];
  let budget = 3000;
  const free = (): number[] => {
    const f: number[] = [];
    for (let i = 0; i < gone.length; i++) if (isFree(board, gone, i)) f.push(i);
    return f;
  };
  const dfs = (): boolean => {
    if (left === 0) return true;
    if (budget-- <= 0) return false;
    const f = free();
    if (f.length < 2) return false;
    const cands: Pair[] = [];
    for (let a = 0; a < f.length; a++) for (let b = a + 1; b < f.length; b++) cands.push([f[a], f[b]]);
    shuffle(rng, cands);
    let tried = 0;
    for (const [a, b] of cands) {
      if (tried >= 6) break;
      gone[a] = gone[b] = true;
      left -= 2;
      if (left === 0 || free().length >= 2) {
        tried++;
        out.push([a, b]);
        if (dfs()) return true;
        out.pop();
      }
      gone[a] = gone[b] = false;
      left += 2;
    }
    return false;
  };
  return dfs() ? out : null;
}

/** Group tile kinds into matching pairs (flowers pair with flowers, seasons with seasons). */
export function makePairs(kinds: readonly number[], rng: Rng): Pair[] {
  const byClass = new Map<number, number[]>();
  for (const k of kinds) {
    const c = matchClass(k);
    if (!byClass.has(c)) byClass.set(c, []);
    byClass.get(c)!.push(k);
  }
  const pairs: Pair[] = [];
  for (const list of byClass.values()) {
    shuffle(rng, list);
    for (let i = 0; i + 1 < list.length; i += 2) pairs.push([list[i], list[i + 1]]);
  }
  return shuffle(rng, pairs);
}

function dealOnto(board: Board, gone: boolean[], kinds: number[], faces: number[], rng: Rng): Pair[] {
  let order: Pair[] | null = null;
  for (let attempt = 0; attempt < 40 && !order; attempt++) order = planOrder(board, gone, rng);
  if (!order) throw new Error("Could not deal a solvable board");
  const pairs = makePairs(kinds, rng);
  order.forEach(([a, b], k) => {
    // Randomly swap which slot gets which face of a pair (it matters for flowers and seasons).
    const [fa, fb] = pairs[k];
    if (rng() < 0.5) {
      faces[a] = fa;
      faces[b] = fb;
    } else {
      faces[a] = fb;
      faces[b] = fa;
    }
  });
  return order;
}

/** A fresh, solvable deal of a layout. */
export function newGame(layout: LayoutDef, rotated: boolean, seed: number): Game {
  const rng = mulberry32(seed);
  const board = buildBoard(slotsOf(layout, rotated));
  const n = board.slots.length;
  const faces = new Array<number>(n).fill(0);
  const gone = new Array<boolean>(n).fill(false);
  const solution = dealOnto(board, gone, fullSet(), faces, rng);
  return {
    board, faces, gone, history: [], remaining: n, solution, startFaces: faces.slice(), startSolution: solution.slice(),
    seed, rotated, layoutId: layout.id,
  };
}

/** Put the tiles still on the board in a new order that can still be cleared. */
export function reshuffle(g: Game, rng: Rng): boolean {
  const alive: number[] = [];
  g.gone.forEach((x, i) => {
    if (!x) alive.push(i);
  });
  if (alive.length < 4) return false;
  const kinds = alive.map((i) => g.faces[i]);
  const faces = g.faces.slice();
  try {
    g.solution = dealOnto(g.board, g.gone, kinds, faces, rng);
  } catch {
    return false;
  }
  g.faces = faces;
  return true;
}

/** Put the first deal back: every tile returned, the clock is the caller's business. */
export function restart(g: Game) {
  g.faces = g.startFaces.slice();
  g.gone.fill(false);
  g.history.length = 0;
  g.remaining = g.gone.length;
  g.solution = g.startSolution.slice();
}

// ---- playing

export function canPair(g: Game, i: number, j: number): boolean {
  return i !== j && isFree(g.board, g.gone, i) && isFree(g.board, g.gone, j) && matches(g.faces[i], g.faces[j]);
}

/** Take a matching pair of free tiles off the board. Returns false (and changes nothing) if it isn't allowed. */
export function removePair(g: Game, i: number, j: number): boolean {
  if (!canPair(g, i, j)) return false;
  g.gone[i] = g.gone[j] = true;
  g.history.push([i, j]);
  g.remaining -= 2;
  return true;
}

/** Bring back the last pair. Returns it, or null when nothing has been played. */
export function undo(g: Game): Pair | null {
  const p = g.history.pop();
  if (!p) return null;
  g.gone[p[0]] = g.gone[p[1]] = false;
  g.remaining += 2;
  return p;
}

/** Every pair that can be played right now. */
export function findMoves(g: Game): Pair[] {
  const byClass = new Map<number, number[]>();
  for (const i of freeTiles(g)) {
    const c = matchClass(g.faces[i]);
    if (!byClass.has(c)) byClass.set(c, []);
    byClass.get(c)!.push(i);
  }
  const out: Pair[] = [];
  for (const list of byClass.values()) for (let a = 0; a < list.length; a++) for (let b = a + 1; b < list.length; b++) out.push([list[a], list[b]]);
  return out;
}

export const isWon = (g: Game) => g.remaining === 0;
export const isStuck = (g: Game) => g.remaining > 0 && findMoves(g).length === 0;

/** A suggested move: among the playable pairs, the one that frees the most tiles (ties broken at random). */
export function hint(g: Game, rng: Rng): Pair | null {
  const moves = findMoves(g);
  if (!moves.length) return null;
  let best: Pair[] = [];
  let bestScore = -1;
  for (const m of moves) {
    g.gone[m[0]] = g.gone[m[1]] = true;
    let score = 0;
    for (let i = 0; i < g.gone.length; i++) if (isFree(g.board, g.gone, i)) score++;
    g.gone[m[0]] = g.gone[m[1]] = false;
    if (score > bestScore) {
      bestScore = score;
      best = [m];
    } else if (score === bestScore) best.push(m);
  }
  return best[Math.floor(rng() * best.length)];
}

/** Replay a list of pairs from the current state; true if every one is legal and the board ends up empty. */
export function replay(g: Game, pairs: readonly Pair[]): boolean {
  for (const [a, b] of pairs) if (!removePair(g, a, b)) return false;
  return isWon(g);
}
