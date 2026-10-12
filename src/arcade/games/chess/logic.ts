// Chess rules: pure TypeScript, no DOM. A mailbox board with make/unmake, full legal move generation
// (castling, en passant, promotion), check / mate / stalemate, the draw rules, FEN and algebraic notation.
// The AI in ai.ts searches on the same Position.
import { mulberry32 } from "../../kit/rng";

export type Color = 0 | 1;
export const WHITE: Color = 0;
export const BLACK: Color = 1;

/** Piece types. On the board white pieces are positive and black pieces negative. */
export const PAWN = 1;
export const KNIGHT = 2;
export const BISHOP = 3;
export const ROOK = 4;
export const QUEEN = 5;
export const KING = 6;

export const PIECE_VALUE = [0, 100, 320, 330, 500, 900, 0];
const LETTERS = "PNBRQK";

/** Square index: rank * 8 + file, so a1 = 0, h1 = 7, a8 = 56, h8 = 63. */
export const fileOf = (sq: number) => sq & 7;
export const rankOf = (sq: number) => sq >> 3;
export const sqName = (sq: number) => "abcdefgh"[sq & 7] + String((sq >> 3) + 1);
export const sqFromName = (s: string) => (s.charCodeAt(1) - 49) * 8 + (s.charCodeAt(0) - 97);
export const colorOfPiece = (p: number): Color => (p > 0 ? WHITE : BLACK);

// ---------------------------------------------------------------- moves
// A move is a small integer: from (6 bits) | to << 6 | promotion piece type << 12 | flags << 15.
export const F_CAPTURE = 1;
export const F_EP = 2;
export const F_CASTLE = 4;
export const F_DOUBLE = 8;

export const makeMove = (from: number, to: number, promo = 0, flags = 0) => from | (to << 6) | (promo << 12) | (flags << 15);
export const moveFrom = (m: number) => m & 63;
export const moveTo = (m: number) => (m >> 6) & 63;
export const movePromo = (m: number) => (m >> 12) & 7;
export const moveFlags = (m: number) => m >> 15;
export const isCapture = (m: number) => (m >> 15 & (F_CAPTURE | F_EP)) !== 0;

export const moveToUci = (m: number) => sqName(moveFrom(m)) + sqName(moveTo(m)) + (movePromo(m) ? LETTERS[movePromo(m) - 1].toLowerCase() : "");

// ---------------------------------------------------------------- tables
const KNIGHT_TARGETS: number[][] = [];
const KING_TARGETS: number[][] = [];
/** Rays from each square in 8 directions: 0-3 straight (N, S, E, W), 4-7 diagonal (NE, NW, SE, SW). */
const RAYS: number[][][] = [];
/** PAWN_FROM[color][sq]: squares from which a pawn of that colour attacks sq. */
const PAWN_FROM: number[][][] = [[], []];
const DIRS: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]; // [rank, file]

for (let sq = 0; sq < 64; sq++) {
  const r = sq >> 3;
  const f = sq & 7;
  const kn: number[] = [];
  const kg: number[] = [];
  for (const [dr, df] of [[2, 1], [2, -1], [-2, 1], [-2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2]]) {
    const rr = r + dr;
    const ff = f + df;
    if (rr >= 0 && rr < 8 && ff >= 0 && ff < 8) kn.push(rr * 8 + ff);
  }
  for (const [dr, df] of DIRS) {
    const rr = r + dr;
    const ff = f + df;
    if (rr >= 0 && rr < 8 && ff >= 0 && ff < 8) kg.push(rr * 8 + ff);
  }
  KNIGHT_TARGETS.push(kn);
  KING_TARGETS.push(kg);
  RAYS.push(
    DIRS.map(([dr, df]) => {
      const ray: number[] = [];
      let rr = r + dr;
      let ff = f + df;
      while (rr >= 0 && rr < 8 && ff >= 0 && ff < 8) {
        ray.push(rr * 8 + ff);
        rr += dr;
        ff += df;
      }
      return ray;
    }),
  );
  // A white pawn on (r-1, f±1) attacks (r, f); a black pawn on (r+1, f±1) does.
  PAWN_FROM[WHITE].push([-1, 1].filter((df) => r > 0 && f + df >= 0 && f + df < 8).map((df) => (r - 1) * 8 + f + df));
  PAWN_FROM[BLACK].push([-1, 1].filter((df) => r < 7 && f + df >= 0 && f + df < 8).map((df) => (r + 1) * 8 + f + df));
}

// Zobrist keys (32-bit), fixed seed so hashes are stable between runs and between the UI and the worker.
const zr = mulberry32(0x5eed1234);
const z32 = () => (zr() * 4294967296) | 0;
const Z_PIECE: number[][] = Array.from({ length: 12 }, () => Array.from({ length: 64 }, z32));
const Z_SIDE = z32();
const Z_CASTLE: number[] = Array.from({ length: 16 }, z32);
const Z_EP: number[] = Array.from({ length: 8 }, z32);
const zIndex = (p: number) => (p > 0 ? p - 1 : 5 - p);

// Castling rights: 1 = white kingside, 2 = white queenside, 4 = black kingside, 8 = black queenside.
const CASTLE_MASK = new Int8Array(64).fill(15);
CASTLE_MASK[4] = 15 & ~3;
CASTLE_MASK[0] = 15 & ~2;
CASTLE_MASK[7] = 15 & ~1;
CASTLE_MASK[60] = 15 & ~12;
CASTLE_MASK[56] = 15 & ~8;
CASTLE_MASK[63] = 15 & ~4;

export const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

// ---------------------------------------------------------------- position
export class Position {
  board = new Int8Array(64);
  turn: Color = WHITE;
  castling = 0;
  ep = -1;
  halfmove = 0;
  fullmove = 1;
  kingSq = [-1, -1];
  hash = 0;

  private uMove: number[] = [];
  private uCap: number[] = [];
  private uCastle: number[] = [];
  private uEp: number[] = [];
  private uHalf: number[] = [];
  private uHash: number[] = [];

  static fromFen(fen: string = START_FEN): Position {
    const p = new Position();
    const [placement, side = "w", cast = "-", ep = "-", half = "0", full = "1"] = fen.trim().split(/\s+/);
    let sq = 56;
    for (const ch of placement) {
      if (ch === "/") sq -= 16;
      else if (ch >= "1" && ch <= "8") sq += Number(ch);
      else {
        const t = LETTERS.indexOf(ch.toUpperCase()) + 1;
        if (t > 0) {
          p.board[sq] = ch === ch.toUpperCase() ? t : -t;
          if (t === KING) p.kingSq[ch === ch.toUpperCase() ? WHITE : BLACK] = sq;
        }
        sq++;
      }
    }
    p.turn = side === "b" ? BLACK : WHITE;
    p.castling = (cast.includes("K") ? 1 : 0) | (cast.includes("Q") ? 2 : 0) | (cast.includes("k") ? 4 : 0) | (cast.includes("q") ? 8 : 0);
    p.ep = ep === "-" ? -1 : sqFromName(ep);
    p.halfmove = Number(half) || 0;
    p.fullmove = Number(full) || 1;
    p.hash = p.computeHash();
    return p;
  }

  toFen(): string {
    let s = "";
    for (let r = 7; r >= 0; r--) {
      let empty = 0;
      for (let f = 0; f < 8; f++) {
        const pc = this.board[r * 8 + f];
        if (!pc) empty++;
        else {
          if (empty) s += empty;
          empty = 0;
          const ch = LETTERS[Math.abs(pc) - 1];
          s += pc > 0 ? ch : ch.toLowerCase();
        }
      }
      if (empty) s += empty;
      if (r) s += "/";
    }
    const c = (this.castling & 1 ? "K" : "") + (this.castling & 2 ? "Q" : "") + (this.castling & 4 ? "k" : "") + (this.castling & 8 ? "q" : "");
    return `${s} ${this.turn === WHITE ? "w" : "b"} ${c || "-"} ${this.ep >= 0 ? sqName(this.ep) : "-"} ${this.halfmove} ${this.fullmove}`;
  }

  clone(): Position {
    const p = Position.fromFen(this.toFen());
    return p;
  }

  /** Is the en-passant square usable by the side to move? Only then does it count towards the hash. */
  private epLive(ep: number, side: Color): boolean {
    if (ep < 0) return false;
    const us = side === WHITE ? 1 : -1;
    const from = ep - 8 * us;
    const f = ep & 7;
    return (f > 0 && this.board[from - 1] === us) || (f < 7 && this.board[from + 1] === us);
  }

  computeHash(): number {
    let h = 0;
    for (let sq = 0; sq < 64; sq++) if (this.board[sq]) h ^= Z_PIECE[zIndex(this.board[sq])][sq];
    if (this.turn === BLACK) h ^= Z_SIDE;
    h ^= Z_CASTLE[this.castling];
    if (this.epLive(this.ep, this.turn)) h ^= Z_EP[this.ep & 7];
    return h | 0;
  }

  /** Is `sq` attacked by any piece of colour `by`? */
  isAttacked(sq: number, by: Color): boolean {
    const b = this.board;
    const s = by === WHITE ? 1 : -1;
    for (const from of PAWN_FROM[by][sq]) if (b[from] === s * PAWN) return true;
    for (const to of KNIGHT_TARGETS[sq]) if (b[to] === s * KNIGHT) return true;
    for (const to of KING_TARGETS[sq]) if (b[to] === s * KING) return true;
    for (let d = 0; d < 8; d++) {
      const ray = RAYS[sq][d];
      for (let i = 0; i < ray.length; i++) {
        const p = b[ray[i]];
        if (!p) continue;
        if (p * s > 0) {
          const t = p * s;
          if (t === QUEEN || (d < 4 ? t === ROOK : t === BISHOP)) return true;
        }
        break;
      }
    }
    return false;
  }

  inCheck(side: Color = this.turn): boolean {
    return this.isAttacked(this.kingSq[side], side === WHITE ? BLACK : WHITE);
  }

  /** Pseudo-legal moves (they may leave the own king in check). With `noisy`, only captures and promotions. */
  generate(noisy = false, out: number[] = []): number[] {
    const b = this.board;
    const us = this.turn === WHITE ? 1 : -1;
    const side = this.turn;
    const enemy = side === WHITE ? BLACK : WHITE;
    const promoRank = us === 1 ? 6 : 1;
    const startRank = us === 1 ? 1 : 6;
    for (let sq = 0; sq < 64; sq++) {
      const p = b[sq] * us;
      if (p <= 0) continue;
      switch (p) {
        case PAWN: {
          const r = sq >> 3;
          const f = sq & 7;
          const one = sq + 8 * us;
          if (r === promoRank) {
            if (!b[one]) {
              out.push(makeMove(sq, one, QUEEN));
              if (!noisy) out.push(makeMove(sq, one, ROOK), makeMove(sq, one, BISHOP), makeMove(sq, one, KNIGHT));
            }
          } else if (!b[one]) {
            if (!noisy) {
              out.push(makeMove(sq, one));
              if (r === startRank && !b[one + 8 * us]) out.push(makeMove(sq, one + 8 * us, 0, F_DOUBLE));
            }
          }
          for (const df of [-1, 1]) {
            const ff = f + df;
            if (ff < 0 || ff > 7) continue;
            const to = one + df;
            const t = b[to];
            if (t * us < 0) {
              if (r === promoRank) {
                out.push(makeMove(sq, to, QUEEN, F_CAPTURE));
                if (!noisy) out.push(makeMove(sq, to, ROOK, F_CAPTURE), makeMove(sq, to, BISHOP, F_CAPTURE), makeMove(sq, to, KNIGHT, F_CAPTURE));
              } else out.push(makeMove(sq, to, 0, F_CAPTURE));
            } else if (to === this.ep && !t) out.push(makeMove(sq, to, 0, F_EP | F_CAPTURE));
          }
          break;
        }
        case KNIGHT:
          for (const to of KNIGHT_TARGETS[sq]) {
            const t = b[to] * us;
            if (t < 0) out.push(makeMove(sq, to, 0, F_CAPTURE));
            else if (t === 0 && !noisy) out.push(makeMove(sq, to));
          }
          break;
        case KING: {
          for (const to of KING_TARGETS[sq]) {
            const t = b[to] * us;
            if (t < 0) out.push(makeMove(sq, to, 0, F_CAPTURE));
            else if (t === 0 && !noisy) out.push(makeMove(sq, to));
          }
          if (!noisy) {
            const home = side === WHITE ? 4 : 60;
            if (sq === home) {
              const ks = side === WHITE ? 1 : 4;
              const qs = side === WHITE ? 2 : 8;
              if (this.castling & (ks | qs) && !this.isAttacked(home, enemy)) {
                if (this.castling & ks && !b[home + 1] && !b[home + 2] && b[home + 3] === us * ROOK && !this.isAttacked(home + 1, enemy) && !this.isAttacked(home + 2, enemy)) {
                  out.push(makeMove(home, home + 2, 0, F_CASTLE));
                }
                if (this.castling & qs && !b[home - 1] && !b[home - 2] && !b[home - 3] && b[home - 4] === us * ROOK && !this.isAttacked(home - 1, enemy) && !this.isAttacked(home - 2, enemy)) {
                  out.push(makeMove(home, home - 2, 0, F_CASTLE));
                }
              }
            }
          }
          break;
        }
        default: {
          const from = p === BISHOP ? 4 : 0;
          const to = p === ROOK ? 4 : 8;
          for (let d = from; d < to; d++) {
            const ray = RAYS[sq][d];
            for (let i = 0; i < ray.length; i++) {
              const dest = ray[i];
              const t = b[dest] * us;
              if (t === 0) {
                if (!noisy) out.push(makeMove(sq, dest));
              } else {
                if (t < 0) out.push(makeMove(sq, dest, 0, F_CAPTURE));
                break;
              }
            }
          }
        }
      }
    }
    return out;
  }

  makeMove(m: number): void {
    const b = this.board;
    const from = m & 63;
    const to = (m >> 6) & 63;
    const promo = (m >> 12) & 7;
    const flags = m >> 15;
    const us = this.turn === WHITE ? 1 : -1;
    const piece = b[from];
    let capSq = to;
    if (flags & F_EP) capSq = to - 8 * us;
    const captured = b[capSq];

    this.uMove.push(m);
    this.uCap.push(captured);
    this.uCastle.push(this.castling);
    this.uEp.push(this.ep);
    this.uHalf.push(this.halfmove);
    this.uHash.push(this.hash);

    let h = this.hash;
    if (this.epLive(this.ep, this.turn)) h ^= Z_EP[this.ep & 7];
    h ^= Z_PIECE[zIndex(piece)][from];
    if (captured) {
      h ^= Z_PIECE[zIndex(captured)][capSq];
      b[capSq] = 0;
    }
    const placed = promo ? promo * us : piece;
    b[from] = 0;
    b[to] = placed;
    h ^= Z_PIECE[zIndex(placed)][to];
    if (flags & F_CASTLE) {
      const rookFrom = to > from ? to + 1 : to - 2;
      const rookTo = to > from ? to - 1 : to + 1;
      const rook = b[rookFrom];
      b[rookFrom] = 0;
      b[rookTo] = rook;
      h ^= Z_PIECE[zIndex(rook)][rookFrom] ^ Z_PIECE[zIndex(rook)][rookTo];
    }
    if (Math.abs(piece) === KING) this.kingSq[this.turn] = to;

    h ^= Z_CASTLE[this.castling];
    this.castling &= CASTLE_MASK[from] & CASTLE_MASK[to];
    h ^= Z_CASTLE[this.castling];

    this.ep = flags & F_DOUBLE ? (from + to) >> 1 : -1;
    this.halfmove = Math.abs(piece) === PAWN || captured ? 0 : this.halfmove + 1;
    if (this.turn === BLACK) this.fullmove++;
    const next: Color = this.turn === WHITE ? BLACK : WHITE;
    if (this.epLive(this.ep, next)) h ^= Z_EP[this.ep & 7];
    this.turn = next;
    h ^= Z_SIDE;
    this.hash = h | 0;
  }

  unmakeMove(): void {
    const b = this.board;
    const m = this.uMove.pop()!;
    const captured = this.uCap.pop()!;
    this.castling = this.uCastle.pop()!;
    this.ep = this.uEp.pop()!;
    this.halfmove = this.uHalf.pop()!;
    this.hash = this.uHash.pop()!;
    this.turn = this.turn === WHITE ? BLACK : WHITE;
    if (this.turn === BLACK) this.fullmove--;
    const from = m & 63;
    const to = (m >> 6) & 63;
    const promo = (m >> 12) & 7;
    const flags = m >> 15;
    const us = this.turn === WHITE ? 1 : -1;
    const piece = promo ? PAWN * us : b[to];
    b[from] = piece;
    b[to] = 0;
    if (flags & F_EP) b[to - 8 * us] = captured;
    else if (captured) b[to] = captured;
    if (flags & F_CASTLE) {
      const rookFrom = to > from ? to + 1 : to - 2;
      const rookTo = to > from ? to - 1 : to + 1;
      b[rookFrom] = b[rookTo];
      b[rookTo] = 0;
    }
    if (Math.abs(piece) === KING) this.kingSq[this.turn] = from;
  }

  /** Null move for search: pass the turn. */
  makeNull(): void {
    this.uMove.push(0);
    this.uCap.push(0);
    this.uCastle.push(this.castling);
    this.uEp.push(this.ep);
    this.uHalf.push(this.halfmove);
    this.uHash.push(this.hash);
    let h = this.hash;
    if (this.epLive(this.ep, this.turn)) h ^= Z_EP[this.ep & 7];
    this.ep = -1;
    this.halfmove++;
    this.turn = this.turn === WHITE ? BLACK : WHITE;
    h ^= Z_SIDE;
    this.hash = h | 0;
  }

  unmakeNull(): void {
    this.uMove.pop();
    this.uCap.pop();
    this.castling = this.uCastle.pop()!;
    this.ep = this.uEp.pop()!;
    this.halfmove = this.uHalf.pop()!;
    this.hash = this.uHash.pop()!;
    this.turn = this.turn === WHITE ? BLACK : WHITE;
  }

  legalMoves(): number[] {
    const pseudo = this.generate();
    const mover = this.turn;
    const enemy = mover === WHITE ? BLACK : WHITE;
    const legal: number[] = [];
    for (const m of pseudo) {
      this.makeMove(m);
      if (!this.isAttacked(this.kingSq[mover], enemy)) legal.push(m);
      this.unmakeMove();
    }
    return legal;
  }

  hasLegalMove(): boolean {
    const mover = this.turn;
    const enemy = mover === WHITE ? BLACK : WHITE;
    for (const m of this.generate()) {
      this.makeMove(m);
      const ok = !this.isAttacked(this.kingSq[mover], enemy);
      this.unmakeMove();
      if (ok) return true;
    }
    return false;
  }

  /** Piece codes captured so far, in order (positive = a white piece was taken). */
  capturedPieces(): number[] {
    return this.uCap.filter((c) => c !== 0);
  }

  get plies(): number {
    return this.uMove.length;
  }

  /** How many times the current position has occurred (1 = just this once). */
  repetitions(): number {
    let n = 1;
    const len = this.uHash.length;
    for (let i = len - 2; i >= 0 && i >= len - this.halfmove; i -= 2) if (this.uHash[i] === this.hash) n++;
    return n;
  }

  /** True when the same position has already occurred earlier (used by the search to score repeats as draws). */
  seenBefore(): boolean {
    const len = this.uHash.length;
    for (let i = len - 2; i >= 0 && i >= len - this.halfmove; i -= 2) if (this.uHash[i] === this.hash) return true;
    return false;
  }

  /** Neither side can possibly mate: K v K, K+minor v K, or only bishops all on the same colour of square. */
  insufficientMaterial(): boolean {
    let knights = 0;
    let bishopsLight = 0;
    let bishopsDark = 0;
    for (let sq = 0; sq < 64; sq++) {
      const t = Math.abs(this.board[sq]);
      if (!t || t === KING) continue;
      if (t === PAWN || t === ROOK || t === QUEEN) return false;
      if (t === KNIGHT) knights++;
      else if (((sq >> 3) + (sq & 7)) % 2 === 0) bishopsDark++;
      else bishopsLight++;
    }
    const bishops = bishopsLight + bishopsDark;
    if (knights + bishops <= 1) return true;
    return knights === 0 && (bishopsLight === 0 || bishopsDark === 0);
  }

  /** Material (without kings) for each side, in pawn units. */
  material(): [number, number] {
    let w = 0;
    let bl = 0;
    for (let sq = 0; sq < 64; sq++) {
      const p = this.board[sq];
      if (!p || Math.abs(p) === KING) continue;
      const v = PIECE_VALUE[Math.abs(p)] / 100;
      if (p > 0) w += v;
      else bl += v;
    }
    return [w, bl];
  }
}

// ---------------------------------------------------------------- perft
export function perft(pos: Position, depth: number): number {
  if (depth === 0) return 1;
  const moves = pos.legalMoves();
  if (depth === 1) return moves.length;
  let n = 0;
  for (const m of moves) {
    pos.makeMove(m);
    n += perft(pos, depth - 1);
    pos.unmakeMove();
  }
  return n;
}

// ---------------------------------------------------------------- notation
/** Standard algebraic notation for a legal move, computed before it is played. */
export function moveToSan(pos: Position, m: number, legal: number[] = pos.legalMoves()): string {
  const from = moveFrom(m);
  const to = moveTo(m);
  const flags = moveFlags(m);
  const piece = Math.abs(pos.board[from]);
  let s: string;
  if (flags & F_CASTLE) s = to > from ? "O-O" : "O-O-O";
  else {
    s = "";
    const capture = (flags & (F_CAPTURE | F_EP)) !== 0;
    if (piece === PAWN) {
      if (capture) s += "abcdefgh"[fileOf(from)];
    } else {
      s += LETTERS[piece - 1];
      let sameFile = false;
      let sameRank = false;
      let ambiguous = false;
      for (const o of legal) {
        const of = moveFrom(o);
        if (o === m || moveTo(o) !== to || of === from || Math.abs(pos.board[of]) !== piece) continue;
        ambiguous = true;
        if (fileOf(of) === fileOf(from)) sameFile = true;
        if (rankOf(of) === rankOf(from)) sameRank = true;
      }
      if (ambiguous) {
        if (!sameFile) s += "abcdefgh"[fileOf(from)];
        else if (!sameRank) s += String(rankOf(from) + 1);
        else s += sqName(from);
      }
    }
    if (capture) s += "x";
    s += sqName(to);
    if (movePromo(m)) s += "=" + LETTERS[movePromo(m) - 1];
  }
  pos.makeMove(m);
  if (pos.inCheck()) s += pos.hasLegalMove() ? "+" : "#";
  pos.unmakeMove();
  return s;
}

/** Find the legal move matching a UCI string like "e2e4" or "e7e8q". */
export function moveFromUci(pos: Position, uci: string): number | null {
  for (const m of pos.legalMoves()) if (moveToUci(m) === uci) return m;
  return null;
}

// ---------------------------------------------------------------- game
export type Reason = "checkmate" | "stalemate" | "fifty-move" | "repetition" | "insufficient";
export interface Status {
  over: boolean;
  /** Winner when over: a colour for checkmate, "draw" for the draw rules, null while playing. */
  result: Color | "draw" | null;
  reason: Reason | null;
  check: boolean;
}

export function getStatus(pos: Position): Status {
  const check = pos.inCheck();
  if (!pos.hasLegalMove()) {
    if (check) return { over: true, result: pos.turn === WHITE ? BLACK : WHITE, reason: "checkmate", check };
    return { over: true, result: "draw", reason: "stalemate", check };
  }
  if (pos.insufficientMaterial()) return { over: true, result: "draw", reason: "insufficient", check };
  if (pos.halfmove >= 100) return { over: true, result: "draw", reason: "fifty-move", check };
  if (pos.repetitions() >= 3) return { over: true, result: "draw", reason: "repetition", check };
  return { over: false, result: null, reason: null, check };
}

export interface ChessGame {
  pos: Position;
  startFen: string;
  moves: number[];
  sans: string[];
}

export function newGame(fen: string = START_FEN): ChessGame {
  return { pos: Position.fromFen(fen), startFen: fen, moves: [], sans: [] };
}

/** Play a legal move, recording it and its notation. Returns false if the move is not legal. */
export function playMove(g: ChessGame, m: number): boolean {
  const legal = g.pos.legalMoves();
  if (!legal.includes(m)) return false;
  g.sans.push(moveToSan(g.pos, m, legal));
  g.moves.push(m);
  g.pos.makeMove(m);
  return true;
}

export function undoMove(g: ChessGame): number | null {
  const m = g.moves.pop();
  if (m === undefined) return null;
  g.sans.pop();
  g.pos.unmakeMove();
  return m;
}

/** Rebuild a position from a start FEN and a list of moves (what the AI worker receives). */
export function replay(startFen: string, moves: number[]): Position {
  const pos = Position.fromFen(startFen);
  for (const m of moves) pos.makeMove(m);
  return pos;
}
