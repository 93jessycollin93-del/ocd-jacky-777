// The chess engine: negamax alpha-beta with iterative deepening, a transposition table, move ordering
// (hash move, MVV-LVA captures, killer moves, history), quiescence search, null-move pruning, late move
// reductions and piece-square tables. Levels 1-5 set the search depth, time limit and how loosely it picks.
// Pure TypeScript so the UI can run it inside a Web Worker (ai.worker.ts) and tests can call it directly.
import { mulberry32, type Rng } from "../../kit/rng";
import {
  BISHOP, BLACK, KING, KNIGHT, PAWN, PIECE_VALUE, QUEEN, ROOK, WHITE, isCapture, moveFrom, moveFromUci, movePromo, moveTo,
  moveToUci, type Position,
} from "./logic";

export const MATE = 30000;
const INF = 32000;
const MAX_PLY = 64;

// ---------------------------------------------------------------- evaluation
// Tables are written from White's side with rank 8 on the first row, as chess diagrams are printed.
const PST_PAWN = [
  0, 0, 0, 0, 0, 0, 0, 0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
  5, 5, 10, 25, 25, 10, 5, 5,
  0, 0, 0, 20, 20, 0, 0, 0,
  5, -5, -10, 0, 0, -10, -5, 5,
  5, 10, 10, -20, -20, 10, 10, 5,
  0, 0, 0, 0, 0, 0, 0, 0,
];
const PST_KNIGHT = [
  -50, -40, -30, -30, -30, -30, -40, -50,
  -40, -20, 0, 0, 0, 0, -20, -40,
  -30, 0, 10, 15, 15, 10, 0, -30,
  -30, 5, 15, 20, 20, 15, 5, -30,
  -30, 0, 15, 20, 20, 15, 0, -30,
  -30, 5, 10, 15, 15, 10, 5, -30,
  -40, -20, 0, 5, 5, 0, -20, -40,
  -50, -40, -30, -30, -30, -30, -40, -50,
];
const PST_BISHOP = [
  -20, -10, -10, -10, -10, -10, -10, -20,
  -10, 0, 0, 0, 0, 0, 0, -10,
  -10, 0, 5, 10, 10, 5, 0, -10,
  -10, 5, 5, 10, 10, 5, 5, -10,
  -10, 0, 10, 10, 10, 10, 0, -10,
  -10, 10, 10, 10, 10, 10, 10, -10,
  -10, 5, 0, 0, 0, 0, 5, -10,
  -20, -10, -10, -10, -10, -10, -10, -20,
];
const PST_ROOK = [
  0, 0, 0, 0, 0, 0, 0, 0,
  5, 10, 10, 10, 10, 10, 10, 5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  0, 0, 0, 5, 5, 0, 0, 0,
];
const PST_QUEEN = [
  -20, -10, -10, -5, -5, -10, -10, -20,
  -10, 0, 0, 0, 0, 0, 0, -10,
  -10, 0, 5, 5, 5, 5, 0, -10,
  -5, 0, 5, 5, 5, 5, 0, -5,
  0, 0, 5, 5, 5, 5, 0, -5,
  -10, 5, 5, 5, 5, 5, 0, -10,
  -10, 0, 5, 0, 0, 0, 0, -10,
  -20, -10, -10, -5, -5, -10, -10, -20,
];
const PST_KING_MID = [
  -30, -40, -40, -50, -50, -40, -40, -30,
  -30, -40, -40, -50, -50, -40, -40, -30,
  -30, -40, -40, -50, -50, -40, -40, -30,
  -30, -40, -40, -50, -50, -40, -40, -30,
  -20, -30, -30, -40, -40, -30, -30, -20,
  -10, -20, -20, -20, -20, -20, -20, -10,
  20, 20, 0, 0, 0, 0, 20, 20,
  20, 30, 10, 0, 0, 10, 30, 20,
];
const PST_KING_END = [
  -50, -40, -30, -20, -20, -30, -40, -50,
  -30, -20, -10, 0, 0, -10, -20, -30,
  -30, -10, 20, 30, 30, 20, -10, -30,
  -30, -10, 30, 40, 40, 30, -10, -30,
  -30, -10, 30, 40, 40, 30, -10, -30,
  -30, -10, 20, 30, 30, 20, -10, -30,
  -30, -30, 0, 0, 0, 0, -30, -30,
  -50, -30, -30, -30, -30, -30, -30, -50,
];

// PSQ[type][color][sq] = material + positional bonus, from that colour's point of view.
const PSQ: number[][][] = [[], [], [], [], [], [], []];
const KING_MID: number[][] = [[], []];
const KING_END: number[][] = [[], []];
{
  const tables: Record<number, number[]> = { [PAWN]: PST_PAWN, [KNIGHT]: PST_KNIGHT, [BISHOP]: PST_BISHOP, [ROOK]: PST_ROOK, [QUEEN]: PST_QUEEN };
  for (const t of [PAWN, KNIGHT, BISHOP, ROOK, QUEEN]) {
    PSQ[t] = [[], []];
    for (let sq = 0; sq < 64; sq++) {
      PSQ[t][WHITE][sq] = PIECE_VALUE[t] + tables[t][sq ^ 56];
      PSQ[t][BLACK][sq] = PIECE_VALUE[t] + tables[t][sq];
    }
  }
  for (let sq = 0; sq < 64; sq++) {
    KING_MID[WHITE][sq] = PST_KING_MID[sq ^ 56];
    KING_MID[BLACK][sq] = PST_KING_MID[sq];
    KING_END[WHITE][sq] = PST_KING_END[sq ^ 56];
    KING_END[BLACK][sq] = PST_KING_END[sq];
  }
}
const PASSED_BONUS = [0, 10, 15, 25, 45, 75, 120, 0];
const PHASE_WEIGHT = [0, 0, 1, 1, 2, 4, 0];

const whiteMinRank = new Int8Array(8);
const blackMaxRank = new Int8Array(8);
const whitePawns = new Int8Array(8);
const blackPawns = new Int8Array(8);

/** Static evaluation in centipawns from the point of view of the side to move. */
export function evaluate(pos: Position): number {
  const b = pos.board;
  let score = 0;
  let phase = 0;
  let wBishops = 0;
  let bBishops = 0;
  whiteMinRank.fill(8);
  blackMaxRank.fill(-1);
  whitePawns.fill(0);
  blackPawns.fill(0);
  for (let sq = 0; sq < 64; sq++) {
    const p = b[sq];
    if (!p) continue;
    if (p > 0) {
      if (p === KING) continue;
      score += PSQ[p][WHITE][sq];
      phase += PHASE_WEIGHT[p];
      if (p === BISHOP) wBishops++;
      else if (p === PAWN) {
        const f = sq & 7;
        whitePawns[f]++;
        if ((sq >> 3) < whiteMinRank[f]) whiteMinRank[f] = sq >> 3;
      }
    } else {
      const t = -p;
      if (t === KING) continue;
      score -= PSQ[t][BLACK][sq];
      phase += PHASE_WEIGHT[t];
      if (t === BISHOP) bBishops++;
      else if (t === PAWN) {
        const f = sq & 7;
        blackPawns[f]++;
        if ((sq >> 3) > blackMaxRank[f]) blackMaxRank[f] = sq >> 3;
      }
    }
  }
  const ph = Math.min(24, phase);
  const wk = pos.kingSq[WHITE];
  const bk = pos.kingSq[BLACK];
  score += (KING_MID[WHITE][wk] * ph + KING_END[WHITE][wk] * (24 - ph)) / 24;
  score -= (KING_MID[BLACK][bk] * ph + KING_END[BLACK][bk] * (24 - ph)) / 24;
  if (wBishops >= 2) score += 30;
  if (bBishops >= 2) score -= 30;
  // Pawn structure: doubled and isolated pawns cost, passed pawns pay.
  for (let f = 0; f < 8; f++) {
    const wl = f > 0 ? whitePawns[f - 1] : 0;
    const wr = f < 7 ? whitePawns[f + 1] : 0;
    const bl = f > 0 ? blackPawns[f - 1] : 0;
    const br = f < 7 ? blackPawns[f + 1] : 0;
    if (whitePawns[f]) {
      if (whitePawns[f] > 1) score -= 12 * (whitePawns[f] - 1);
      if (!wl && !wr) score -= 10 * whitePawns[f];
      const r = whiteMinRank[f];
      // The rearmost pawn of the file is the one a blocker would sit in front of; check the most advanced.
      let front = r;
      for (let rr = 7; rr > r; rr--) if (b[rr * 8 + f] === PAWN) { front = rr; break; }
      const lo = Math.max(0, f - 1);
      const hi = Math.min(7, f + 1);
      let passed = true;
      for (let ff = lo; ff <= hi; ff++) if (blackMaxRank[ff] > front) passed = false;
      if (passed) score += PASSED_BONUS[front];
    }
    if (blackPawns[f]) {
      if (blackPawns[f] > 1) score += 12 * (blackPawns[f] - 1);
      if (!bl && !br) score += 10 * blackPawns[f];
      const r = blackMaxRank[f];
      let front = r;
      for (let rr = 0; rr < r; rr++) if (b[rr * 8 + f] === -PAWN) { front = rr; break; }
      const lo = Math.max(0, f - 1);
      const hi = Math.min(7, f + 1);
      let passed = true;
      for (let ff = lo; ff <= hi; ff++) if (whiteMinRank[ff] < front) passed = false;
      if (passed) score += PASSED_BONUS[7 - front];
    }
  }
  return (pos.turn === WHITE ? score : -score) + 8;
}

// ---------------------------------------------------------------- search
const TT_BITS = 18;
const TT_SIZE = 1 << TT_BITS;
const EXACT = 0;
const LOWER = 1;
const UPPER = 2;

class Searcher {
  ttKey = new Int32Array(TT_SIZE);
  ttMove = new Int32Array(TT_SIZE);
  ttScore = new Int16Array(TT_SIZE);
  ttDepth = new Int8Array(TT_SIZE).fill(-1);
  ttFlag = new Uint8Array(TT_SIZE);
  killers = new Int32Array(MAX_PLY * 2);
  history = new Int32Array(2 * 64 * 64);
  nodes = 0;
  stopped = false;
  deadline = Infinity;

  constructor(public pos: Position) {}

  private timeUp() {
    if (performance.now() >= this.deadline) this.stopped = true;
  }

  /** Move order score: hash move, then captures by MVV-LVA, then killers, then history. */
  private scoreMove(m: number, ttMove: number, ply: number): number {
    if (m === ttMove) return 10_000_000;
    const b = this.pos.board;
    const from = moveFrom(m);
    const to = moveTo(m);
    if (isCapture(m)) {
      const victim = Math.abs(b[to]) || PAWN;
      return 1_000_000 + victim * 16 - Math.abs(b[from]) + (movePromo(m) ? 800 : 0);
    }
    if (movePromo(m)) return 900_000 + movePromo(m);
    if (m === this.killers[ply * 2]) return 800_000;
    if (m === this.killers[ply * 2 + 1]) return 790_000;
    return this.history[(this.pos.turn * 64 + from) * 64 + to];
  }

  private scoreAll(moves: number[], ttMove: number, ply: number): number[] {
    const scores = new Array<number>(moves.length);
    for (let i = 0; i < moves.length; i++) scores[i] = this.scoreMove(moves[i], ttMove, ply);
    return scores;
  }

  /** Selection step: swap the best remaining move into slot i (cheaper than sorting when cutoffs come early). */
  private pick(moves: number[], scores: number[], i: number): number {
    let bi = i;
    for (let j = i + 1; j < moves.length; j++) if (scores[j] > scores[bi]) bi = j;
    if (bi !== i) {
      const m = moves[bi];
      moves[bi] = moves[i];
      moves[i] = m;
      const sc = scores[bi];
      scores[bi] = scores[i];
      scores[i] = sc;
    }
    return moves[i];
  }

  private hasPieces(side: number): boolean {
    const b = this.pos.board;
    const s = side === WHITE ? 1 : -1;
    for (let sq = 0; sq < 64; sq++) {
      const t = b[sq] * s;
      if (t > PAWN && t < KING) return true;
    }
    return false;
  }

  quiesce(alpha: number, beta: number, ply: number): number {
    const pos = this.pos;
    if ((++this.nodes & 2047) === 0) this.timeUp();
    if (this.stopped) return 0;
    const stand = evaluate(pos);
    if (ply >= MAX_PLY - 1) return stand;
    if (stand >= beta) return stand;
    if (stand > alpha) alpha = stand;
    const mover = pos.turn;
    const enemy = mover === WHITE ? BLACK : WHITE;
    const moves = pos.generate(true);
    const scores = this.scoreAll(moves, 0, ply);
    for (let i = 0; i < moves.length; i++) {
      const m = this.pick(moves, scores, i);
      // Delta pruning: skip captures that can't lift the score back to alpha, unless they promote.
      if (!movePromo(m) && stand + (PIECE_VALUE[Math.abs(pos.board[moveTo(m)])] || 100) + 200 < alpha) continue;
      pos.makeMove(m);
      if (pos.isAttacked(pos.kingSq[mover], enemy)) {
        pos.unmakeMove();
        continue;
      }
      const s = -this.quiesce(-beta, -alpha, ply + 1);
      pos.unmakeMove();
      if (this.stopped) return 0;
      if (s >= beta) return s;
      if (s > alpha) alpha = s;
    }
    return alpha;
  }

  negamax(depth: number, alpha: number, beta: number, ply: number, allowNull: boolean): number {
    const pos = this.pos;
    if ((++this.nodes & 2047) === 0) this.timeUp();
    if (this.stopped) return 0;
    if (ply > 0) {
      if (pos.halfmove >= 100 || pos.seenBefore()) return 0;
      if (ply >= MAX_PLY - 1) return evaluate(pos);
    }
    const inCheck = pos.inCheck();
    if (inCheck) depth++;
    if (depth <= 0) return this.quiesce(alpha, beta, ply);

    // Mate distance pruning.
    alpha = Math.max(alpha, -MATE + ply);
    beta = Math.min(beta, MATE - ply - 1);
    if (alpha >= beta) return alpha;

    const origAlpha = alpha;
    const slot = pos.hash & (TT_SIZE - 1);
    let ttMove = 0;
    if (this.ttKey[slot] === pos.hash && this.ttDepth[slot] >= 0) {
      ttMove = this.ttMove[slot];
      if (ply > 0 && this.ttDepth[slot] >= depth) {
        let s = this.ttScore[slot];
        if (s > MATE - 200) s -= ply;
        else if (s < -MATE + 200) s += ply;
        const flag = this.ttFlag[slot];
        if (flag === EXACT) return s;
        if (flag === LOWER && s > alpha) alpha = s;
        else if (flag === UPPER && s < beta) beta = s;
        if (alpha >= beta) return s;
      }
    }

    const mover = pos.turn;
    const enemy = mover === WHITE ? BLACK : WHITE;
    const pv = beta - alpha > 1;

    // Null move: if passing still beats beta, this position is too good for the opponent to allow.
    if (allowNull && !inCheck && !pv && depth >= 3 && this.hasPieces(mover) && evaluate(pos) >= beta) {
      pos.makeNull();
      const s = -this.negamax(depth - 3, -beta, -beta + 1, ply + 1, false);
      pos.unmakeNull();
      if (this.stopped) return 0;
      if (s >= beta) return s >= MATE - 200 ? beta : s;
    }

    const moves = pos.generate();
    const scores = this.scoreAll(moves, ttMove, ply);
    let best = -INF;
    let bestMove = 0;
    let legal = 0;
    for (let i = 0; i < moves.length; i++) {
      const m = this.pick(moves, scores, i);
      pos.makeMove(m);
      if (pos.isAttacked(pos.kingSq[mover], enemy)) {
        pos.unmakeMove();
        continue;
      }
      legal++;
      const quiet = !isCapture(m) && !movePromo(m);
      let s: number;
      if (legal === 1) s = -this.negamax(depth - 1, -beta, -alpha, ply + 1, true);
      else {
        // Late quiet moves get a shallower look first; anything that surprises us is re-searched fully.
        const reduce = quiet && !inCheck && depth >= 3 && legal > 3 ? 1 : 0;
        s = -this.negamax(depth - 1 - reduce, -alpha - 1, -alpha, ply + 1, true);
        if (s > alpha && !this.stopped && (reduce > 0 || s < beta)) s = -this.negamax(depth - 1, -beta, -alpha, ply + 1, true);
      }
      pos.unmakeMove();
      if (this.stopped) return 0;
      if (s > best) {
        best = s;
        bestMove = m;
        if (s > alpha) {
          alpha = s;
          if (alpha >= beta) {
            if (quiet) {
              if (this.killers[ply * 2] !== m) {
                this.killers[ply * 2 + 1] = this.killers[ply * 2];
                this.killers[ply * 2] = m;
              }
              const hi = (mover * 64 + moveFrom(m)) * 64 + moveTo(m);
              this.history[hi] = Math.min(500_000, this.history[hi] + depth * depth);
            }
            break;
          }
        }
      }
    }
    if (legal === 0) return inCheck ? -MATE + ply : 0;

    const flag = best >= beta ? LOWER : best > origAlpha ? EXACT : UPPER;
    if (this.ttDepth[slot] <= depth || this.ttKey[slot] !== pos.hash) {
      let stored = best;
      if (stored > MATE - 200) stored += ply;
      else if (stored < -MATE + 200) stored -= ply;
      this.ttKey[slot] = pos.hash;
      this.ttMove[slot] = bestMove;
      this.ttScore[slot] = Math.max(-32000, Math.min(32000, stored));
      this.ttDepth[slot] = Math.min(100, depth);
      this.ttFlag[slot] = flag;
    }
    return best;
  }
}

export interface SearchResult {
  move: number;
  /** Centipawns from the point of view of the side that moved. */
  score: number;
  depth: number;
  nodes: number;
}

export interface SearchOptions {
  maxDepth: number;
  timeMs: number;
  /** Pick randomly among root moves scoring within this many centipawns of the best (weak levels). */
  margin?: number;
  rng?: Rng;
}

/** Search the position and return the best move, or null if there are no legal moves. */
export function search(pos: Position, opts: SearchOptions): SearchResult | null {
  const legal = pos.legalMoves();
  if (legal.length === 0) return null;
  if (legal.length === 1) return { move: legal[0], score: 0, depth: 0, nodes: 0 };
  const s = new Searcher(pos);
  const start = performance.now();
  s.deadline = start + opts.timeMs;
  const rng = opts.rng ?? Math.random;

  if (opts.margin) {
    // Weak levels: score every root move at a fixed depth, then choose loosely among the good-enough ones.
    s.deadline = Infinity;
    const scored: { m: number; s: number }[] = [];
    for (const m of legal) {
      pos.makeMove(m);
      const v = -s.negamax(opts.maxDepth - 1, -INF, INF, 1, true);
      pos.unmakeMove();
      scored.push({ m, s: v });
    }
    const top = Math.max(...scored.map((x) => x.s));
    const pool = top >= MATE - 100 ? scored.filter((x) => x.s === top) : scored.filter((x) => x.s >= top - opts.margin!);
    const pickd = pool[Math.floor(rng() * pool.length)];
    return { move: pickd.m, score: pickd.s, depth: opts.maxDepth, nodes: s.nodes };
  }

  let rootMoves = legal;
  let best = { move: legal[0], score: -INF, depth: 0, nodes: 0 };
  const mover = pos.turn;
  const enemy = mover === WHITE ? BLACK : WHITE;
  for (let depth = 1; depth <= opts.maxDepth; depth++) {
    let alpha = -INF;
    const beta = INF;
    let iterBest = 0;
    let iterScore = -INF;
    const scores: number[] = [];
    let first = true;
    for (const m of rootMoves) {
      pos.makeMove(m);
      if (pos.isAttacked(pos.kingSq[mover], enemy)) {
        pos.unmakeMove();
        continue;
      }
      let v: number;
      if (first) v = -s.negamax(depth - 1, -beta, -alpha, 1, true);
      else {
        v = -s.negamax(depth - 1, -alpha - 1, -alpha, 1, true);
        if (v > alpha && !s.stopped) v = -s.negamax(depth - 1, -beta, -alpha, 1, true);
      }
      pos.unmakeMove();
      if (s.stopped) break;
      first = false;
      scores.push(v);
      if (v > iterScore) {
        iterScore = v;
        iterBest = m;
        if (v > alpha) alpha = v;
      }
    }
    // A fully searched root move is trustworthy even when time ran out part-way through the iteration.
    if (iterBest !== 0 && scores.length > 0) best = { move: iterBest, score: iterScore, depth, nodes: s.nodes };
    if (s.stopped) break;
    best.nodes = s.nodes;
    // Put the best move first for the next, deeper pass.
    rootMoves = [iterBest, ...rootMoves.filter((m) => m !== iterBest)];
    if (best.score >= MATE - 100 && depth >= 2) break;
    if (performance.now() - start > opts.timeMs * 0.45) break;
  }
  best.nodes = s.nodes;
  return best;
}

// ---------------------------------------------------------------- levels and a tiny opening book
export interface LevelConfig {
  name: string;
  maxDepth: number;
  timeMs: number;
  margin: number;
}

export const LEVELS: LevelConfig[] = [
  { name: "Beginner", maxDepth: 1, timeMs: 300, margin: 400 },
  { name: "Casual", maxDepth: 2, timeMs: 600, margin: 140 },
  { name: "Club", maxDepth: 4, timeMs: 1200, margin: 0 },
  { name: "Strong", maxDepth: 6, timeMs: 2200, margin: 0 },
  { name: "Master", maxDepth: 12, timeMs: 4500, margin: 0 },
];

const BOOK: Record<string, string[]> = {
  "": ["e2e4", "d2d4", "g1f3", "c2c4"],
  e2e4: ["e7e5", "c7c5", "e7e6", "c7c6"],
  d2d4: ["d7d5", "g8f6"],
  g1f3: ["d7d5", "g8f6", "c7c5"],
  c2c4: ["e7e5", "g8f6", "c7c5"],
  "e2e4 e7e5": ["g1f3"],
  "e2e4 e7e5 g1f3": ["b8c6"],
  "e2e4 e7e5 g1f3 b8c6": ["f1b5", "f1c4", "d2d4"],
  "e2e4 c7c5": ["g1f3"],
  "e2e4 c7c5 g1f3": ["d7d6", "b8c6", "e7e6"],
  "e2e4 e7e6": ["d2d4"],
  "e2e4 e7e6 d2d4": ["d7d5"],
  "e2e4 c7c6": ["d2d4"],
  "e2e4 c7c6 d2d4": ["d7d5"],
  "d2d4 d7d5": ["c2c4", "g1f3"],
  "d2d4 d7d5 c2c4": ["e7e6", "c7c6"],
  "d2d4 g8f6": ["c2c4", "g1f3"],
  "d2d4 g8f6 c2c4": ["e7e6", "g7g6"],
  "g1f3 d7d5": ["d2d4", "g2g3"],
  "g1f3 g8f6": ["c2c4", "d2d4"],
  "c2c4 e7e5": ["b1c3"],
  "c2c4 g8f6": ["b1c3", "g1f3"],
};

function bookMove(pos: Position, history: number[], rng: Rng): number | null {
  const key = history.map(moveToUci).join(" ");
  const options = BOOK[key];
  if (!options) return null;
  const m = moveFromUci(pos, options[Math.floor(rng() * options.length)]);
  return m;
}

/** The AI's reply for a position. `history` lets it use the opening book (moves played so far). */
export function chooseMove(pos: Position, level: number, history: number[] = [], rng: Rng = Math.random): SearchResult | null {
  const cfg = LEVELS[Math.max(0, Math.min(LEVELS.length - 1, level - 1))];
  if (level >= 2 && history.length < 8 && pos.plies === history.length) {
    const bm = bookMove(pos, history, rng);
    if (bm !== null) return { move: bm, score: 0, depth: 0, nodes: 0 };
  }
  return search(pos, { maxDepth: cfg.maxDepth, timeMs: cfg.timeMs, margin: cfg.margin || undefined, rng });
}

export const seededRng = (seed: number) => mulberry32(seed);
