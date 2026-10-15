// Connect-four AI: negamax with alpha-beta pruning, centre-first move ordering, a transposition table and
// iterative deepening. Before searching, every node checks for an immediate win and for forced blocks, which
// keeps the tree tiny and makes the hard level very difficult to beat.
import type { Rng } from "../../kit/rng";
import { mulberry32 } from "../../kit/rng";
import { CELLS, COLS, ROWS, WINDOWS, other, play, undo, winsAt, type Board, type Player } from "./logic";

const WIN = 10000;
const ORDER = [3, 2, 4, 1, 5, 0, 6];

export interface Level {
  name: string;
  maxDepth: number;
  timeMs: number;
  /** Chance of missing a block (easy only), so the weakest level can be beaten. */
  missBlock: number;
  /** Pick randomly among moves within this many points of the best. */
  margin: number;
}

export const LEVELS: Level[] = [
  { name: "Easy", maxDepth: 3, timeMs: 100, missBlock: 0.35, margin: 30 },
  { name: "Medium", maxDepth: 7, timeMs: 400, missBlock: 0, margin: 4 },
  { name: "Hard", maxDepth: 30, timeMs: 1500, missBlock: 0, margin: 0 },
];

// Zobrist keys for the transposition table (two 32-bit halves, so false matches are very unlikely).
const zr = mulberry32(0xc0ffee11);
const ZA = Array.from({ length: 2 * CELLS }, () => (zr() * 4294967296) | 0);
const ZB = Array.from({ length: 2 * CELLS }, () => (zr() * 4294967296) | 0);
const TT_BITS = 19;
const TT_SIZE = 1 << TT_BITS;
const EXACT = 0;
const LOWER = 1;
const UPPER = 2;

const WEIGHT = [0, 1, 6, 28];
const CENTRE = [0, 1, 2, 4, 2, 1, 0];

/** Static score for `p` (positive means p is better). */
export function evaluate(b: Board, p: Player): number {
  const n = WINDOWS.length;
  const mine = (p - 1) * n;
  const theirs = (other(p) - 1) * n;
  let score = 0;
  for (let w = 0; w < n; w++) {
    const a = b.counts[mine + w];
    const c = b.counts[theirs + w];
    if (c === 0) score += WEIGHT[a];
    else if (a === 0) score -= WEIGHT[c];
  }
  for (let col = 0; col < COLS; col++) {
    for (let row = 0; row < b.heights[col]; row++) {
      const v = b.cells[row * COLS + col];
      score += v === p ? CENTRE[col] : -CENTRE[col];
    }
  }
  return score;
}

class Solver {
  nodes = 0;
  stopped = false;
  deadline = Infinity;
  keyA = new Int32Array(TT_SIZE);
  keyB = new Int32Array(TT_SIZE);
  score = new Int16Array(TT_SIZE);
  depth = new Int8Array(TT_SIZE).fill(-1);
  flag = new Uint8Array(TT_SIZE);
  best = new Int8Array(TT_SIZE).fill(-1);
  ha = 0;
  hb = 0;

  constructor(b: Board) {
    for (let cell = 0; cell < CELLS; cell++) {
      const v = b.cells[cell];
      if (v) {
        this.ha ^= ZA[(v - 1) * CELLS + cell];
        this.hb ^= ZB[(v - 1) * CELLS + cell];
      }
    }
  }

  private toggle(b: Board, col: number, row: number, p: Player) {
    const i = (p - 1) * CELLS + row * COLS + col;
    this.ha ^= ZA[i];
    this.hb ^= ZB[i];
    void b;
  }

  move(b: Board, col: number) {
    const p = b.turn;
    const row = play(b, col);
    this.toggle(b, col, row, p);
  }

  unmove(b: Board) {
    const col = b.moves[b.moves.length - 1];
    const row = b.heights[col] - 1;
    const p = b.cells[row * COLS + col] as Player;
    undo(b);
    this.toggle(b, col, row, p);
  }

  negamax(b: Board, depth: number, alpha: number, beta: number, ply: number): number {
    if ((++this.nodes & 4095) === 0 && performance.now() >= this.deadline) this.stopped = true;
    if (this.stopped) return 0;
    const me = b.turn;
    const foe = other(me);
    if (b.moves.length === CELLS) return 0;

    // Win now?
    for (const c of ORDER) if (winsAt(b, c, me)) return WIN - ply;
    // Opponent threatens to win next move? Count distinct playable winning columns.
    let threats = 0;
    let block = -1;
    for (const c of ORDER) {
      if (winsAt(b, c, foe)) {
        threats++;
        block = c;
      }
    }
    if (threats > 1) return -(WIN - ply - 1);
    if (b.moves.length === CELLS - 1 && threats === 0) return 0;
    if (depth <= 0) return evaluate(b, me);

    const slot = (this.ha ^ (this.hb << 7)) & (TT_SIZE - 1);
    let ttMove = -1;
    if (this.keyA[slot] === this.ha && this.keyB[slot] === this.hb && this.depth[slot] >= 0) {
      ttMove = this.best[slot];
      if (this.depth[slot] >= depth) {
        let s = this.score[slot];
        if (s > WIN - 100) s -= ply;
        else if (s < -WIN + 100) s += ply;
        const f = this.flag[slot];
        if (f === EXACT) return s;
        if (f === LOWER && s > alpha) alpha = s;
        else if (f === UPPER && s < beta) beta = s;
        if (alpha >= beta) return s;
      }
    }

    const origAlpha = alpha;
    let best = -Infinity;
    let bestCol = -1;
    const tryCol = (c: number): boolean => {
      this.move(b, c);
      const v = -this.negamax(b, depth - 1, -beta, -alpha, ply + 1);
      this.unmove(b);
      if (this.stopped) return true;
      if (v > best) {
        best = v;
        bestCol = c;
        if (v > alpha) alpha = v;
      }
      return alpha >= beta;
    };

    if (block >= 0) tryCol(block);
    else {
      let cut = false;
      if (ttMove >= 0 && b.heights[ttMove] < ROWS) cut = tryCol(ttMove);
      if (!cut) {
        for (const c of ORDER) {
          if (c === ttMove || b.heights[c] >= ROWS) continue;
          if (tryCol(c)) break;
        }
      }
    }
    if (this.stopped) return 0;

    this.keyA[slot] = this.ha;
    this.keyB[slot] = this.hb;
    this.score[slot] = best > WIN - 100 ? best + ply : best < -WIN + 100 ? best - ply : best;
    this.depth[slot] = Math.min(100, depth);
    this.flag[slot] = best <= origAlpha ? UPPER : best >= beta ? LOWER : EXACT;
    this.best[slot] = bestCol;
    return best;
  }
}

export interface Choice {
  col: number;
  score: number;
  depth: number;
}

/** Pick the AI's column for the player to move. */
export function chooseColumn(b: Board, levelIndex: number, rng: Rng = Math.random): Choice | null {
  const level = LEVELS[Math.max(0, Math.min(LEVELS.length - 1, levelIndex))];
  const cols = ORDER.filter((c) => b.heights[c] < ROWS);
  if (cols.length === 0 || b.winner) return null;
  const me = b.turn;
  const foe = other(me);
  // 1. Take a win.
  for (const c of cols) if (winsAt(b, c, me)) return { col: c, score: WIN, depth: 1 };
  // 2. Block a win (the weakest level sometimes misses).
  const threats = cols.filter((c) => winsAt(b, c, foe));
  if (threats.length > 0 && !(level.missBlock > 0 && rng() < level.missBlock)) return { col: threats[0], score: -WIN, depth: 1 };
  if (cols.length === 1) return { col: cols[0], score: 0, depth: 0 };

  const s = new Solver(b);
  const start = performance.now();
  s.deadline = start + level.timeMs;
  let ranked: { c: number; v: number }[] = cols.map((c) => ({ c, v: 0 }));
  let done = 0;
  for (let depth = 1; depth <= Math.min(level.maxDepth, CELLS - b.moves.length); depth++) {
    const scored: { c: number; v: number }[] = [];
    let alpha = -Infinity;
    for (const { c } of ranked) {
      s.move(b, c);
      // Full window when we need exact scores for a margin pick; otherwise a bound is enough.
      const v = -s.negamax(b, depth - 1, -Infinity, level.margin > 0 ? Infinity : -alpha, 1);
      s.unmove(b);
      if (s.stopped) break;
      scored.push({ c, v });
      if (v > alpha) alpha = v;
    }
    if (s.stopped) break;
    ranked = scored.sort((a, z) => z.v - a.v);
    done = depth;
    if (Math.abs(ranked[0].v) >= WIN - 60) break;
    if (performance.now() - start > level.timeMs * 0.55) break;
  }
  // Prefer moves that don't hand the opponent a win right above; the search already prices that in.
  const top = ranked[0].v;
  const pool = level.margin > 0 ? ranked.filter((x) => x.v >= top - level.margin) : [ranked[0]];
  const pick = pool[Math.floor(rng() * pool.length)];
  return { col: pick.c, score: pick.v, depth: done };
}
