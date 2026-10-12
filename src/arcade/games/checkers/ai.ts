// Checkers AI: negamax with alpha-beta pruning and iterative deepening, searching forced captures a little
// deeper so it never stops in the middle of a jump sequence. Three levels set depth, time and looseness.
import type { Rng } from "../../kit/rng";
import { DRAW_PLIES, applyMove, countPieces, getResult, legalMoves, type Move, type State } from "./logic";

const WIN = 100000;
const INF = 1_000_000;

export interface Level {
  name: string;
  maxDepth: number;
  timeMs: number;
  /** Chance of playing a random legal move instead (to make the weakest level beatable). */
  blunder: number;
  /** Pick among moves scoring within this many points of the best. */
  margin: number;
}

export const LEVELS: Level[] = [
  { name: "Easy", maxDepth: 2, timeMs: 150, blunder: 0.18, margin: 45 },
  { name: "Medium", maxDepth: 6, timeMs: 400, blunder: 0, margin: 6 },
  { name: "Hard", maxDepth: 16, timeMs: 1400, blunder: 0, margin: 0 },
];

/** Static evaluation in points, positive when the side to move is better. */
export function evaluate(s: State): number {
  const b = s.board;
  let score = 0;
  for (let sq = 0; sq < 64; sq++) {
    const p = b[sq];
    if (!p) continue;
    const r = sq >> 3;
    const c = sq & 7;
    const side = p > 0 ? 1 : -1;
    const centre = Math.min(r, 7 - r) + Math.min(c, 7 - c);
    let v: number;
    if (Math.abs(p) === 2) v = 170 + centre * 3;
    else {
      const adv = side === 1 ? 7 - r : r;
      v = 100 + adv * 4 + (c >= 2 && c <= 5 ? 3 : 0);
      if (adv === 0) v += 7; // back-row men stop enemy kings
      if (adv >= 5) v += 6; // about to crown
    }
    score += side * v;
  }
  // With a lead, trade down; when behind, avoid trades.
  const n = countPieces(b);
  const total = n.red + n.cream;
  score += ((n.red - n.cream) * 12 * (24 - total)) / 24;
  return s.turn === 1 ? score : -score;
}

class Search {
  nodes = 0;
  stopped = false;
  deadline = Infinity;

  negamax(s: State, depth: number, alpha: number, beta: number, ply: number, moves: Move[] = legalMoves(s)): number {
    if ((++this.nodes & 1023) === 0 && performance.now() >= this.deadline) this.stopped = true;
    if (this.stopped) return 0;
    if (moves.length === 0) return -WIN + ply;
    if (s.sinceCapture >= DRAW_PLIES) return 0;
    // Don't stop while a capture is pending: the position is unstable.
    if (depth <= 0 && (moves[0].captures.length === 0 || ply > 24)) return evaluate(s);
    let best = -INF;
    for (const m of order(moves)) {
      const next = applyMove(s, m);
      const v = -this.negamax(next, depth - 1, -beta, -alpha, ply + 1);
      if (this.stopped) return 0;
      if (v > best) best = v;
      if (v > alpha) alpha = v;
      if (alpha >= beta) break;
    }
    return best;
  }
}

/** Try crowning moves and long jumps first, then advances. */
function order(moves: Move[]): Move[] {
  if (moves.length < 2) return moves;
  return moves
    .map((m) => ({ m, k: m.captures.length * 100 + Math.abs(m.path[m.path.length - 1] - m.path[0]) }))
    .sort((a, b) => b.k - a.k)
    .map((x) => x.m);
}

export interface SearchResult {
  move: Move;
  score: number;
  depth: number;
}

export function chooseMove(s: State, levelIndex: number, rng: Rng = Math.random): SearchResult | null {
  const moves = legalMoves(s);
  if (moves.length === 0) return null;
  const level = LEVELS[Math.max(0, Math.min(LEVELS.length - 1, levelIndex))];
  if (moves.length === 1) return { move: moves[0], score: 0, depth: 0 };
  if (level.blunder > 0 && rng() < level.blunder) return { move: moves[Math.floor(rng() * moves.length)], score: 0, depth: 0 };

  const search = new Search();
  const start = performance.now();
  search.deadline = start + level.timeMs;
  let ranked: { m: Move; v: number }[] = moves.map((m) => ({ m, v: 0 }));
  let depthDone = 0;
  for (let depth = 1; depth <= level.maxDepth; depth++) {
    const scored: { m: Move; v: number }[] = [];
    let alpha = -INF;
    for (const { m } of ranked) {
      const v = -search.negamax(applyMove(s, m), depth - 1, -INF, level.margin > 0 ? INF : -alpha, 1);
      if (search.stopped) break;
      scored.push({ m, v });
      if (v > alpha) alpha = v;
    }
    if (search.stopped) {
      // Keep the finished part of this pass only if it covered every move; otherwise use the previous pass.
      break;
    }
    ranked = scored.sort((a, b) => b.v - a.v);
    depthDone = depth;
    if (ranked[0].v >= WIN - 100 || ranked[0].v <= -WIN + 100) break;
    if (performance.now() - start > level.timeMs * 0.5) break;
  }
  const top = ranked[0].v;
  // Weak levels need true scores for every move (full window above); strong levels just take the best.
  const pool = level.margin > 0 ? ranked.filter((x) => x.v >= top - level.margin) : [ranked[0]];
  const pick = pool[Math.floor(rng() * pool.length)];
  return { move: pick.m, score: pick.v, depth: depthDone };
}

export const isGameOver = (s: State) => getResult(s).over;
