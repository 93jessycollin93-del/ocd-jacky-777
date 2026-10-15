// American checkers (English draughts) on 8x8: men step diagonally forward, kings both ways, captures are
// compulsory and chain through multi-jumps, and a man that reaches the far row is crowned and stops.
// Pure TypeScript with no DOM, shared by the UI, the AI worker and the tests.

export type Player = 1 | -1;
/** Red moves first and starts at the bottom (rows 5-7); cream starts at the top (rows 0-2). */
export const RED: Player = 1;
export const CREAM: Player = -1;

/** Board cells: 0 empty, 1 red man, 2 red king, -1 cream man, -2 cream king. Index = row * 8 + col. */
export type Board = number[];

export interface Move {
  /** Squares visited, starting square first. A plain step has two entries; a jump chain has more. */
  path: number[];
  /** Squares of the opponent pieces jumped, in order (empty for a step). */
  captures: number[];
}

export interface State {
  board: Board;
  turn: Player;
  /** Plies played since the last capture; the game is drawn at DRAW_PLIES. */
  sinceCapture: number;
}

/** 40 moves by each side without a capture. */
export const DRAW_PLIES = 80;

export const isDark = (sq: number) => ((sq >> 3) + (sq & 7)) % 2 === 1;
export const rowOf = (sq: number) => sq >> 3;
export const colOf = (sq: number) => sq & 7;
export const sqName = (sq: number) => "abcdefgh"[sq & 7] + String(8 - (sq >> 3));

export function newGame(): State {
  const board: Board = new Array(64).fill(0);
  for (let sq = 0; sq < 64; sq++) {
    if (!isDark(sq)) continue;
    if (sq >> 3 < 3) board[sq] = CREAM;
    else if (sq >> 3 > 4) board[sq] = RED;
  }
  return { board, turn: RED, sinceCapture: 0 };
}

export const fromRows = (rows: string[], turn: Player = RED, sinceCapture = 0): State => {
  // Test helper: 8 strings of 8 chars, "r"/"R" red man/king, "c"/"C" cream man/king, anything else empty.
  const board: Board = new Array(64).fill(0);
  rows.forEach((row, r) => {
    for (let c = 0; c < 8; c++) {
      const ch = row[c];
      board[r * 8 + c] = ch === "r" ? 1 : ch === "R" ? 2 : ch === "c" ? -1 : ch === "C" ? -2 : 0;
    }
  });
  return { board, turn, sinceCapture };
};

const DIRS = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

const crownRow = (player: Player) => (player === RED ? 0 : 7);

function jumpsFrom(board: Board, start: number, sq: number, piece: number, captured: number[], path: number[], out: Move[]) {
  const player = Math.sign(piece) as Player;
  const king = Math.abs(piece) === 2;
  const r = sq >> 3;
  const c = sq & 7;
  let any = false;
  for (const [dr, dc] of DIRS) {
    if (!king && dr !== -player) continue;
    const orr = r + dr;
    const occ = c + dc;
    const lr = r + 2 * dr;
    const lc = c + 2 * dc;
    if (lr < 0 || lr > 7 || lc < 0 || lc > 7) continue;
    const over = orr * 8 + occ;
    const land = lr * 8 + lc;
    if (Math.sign(board[over]) !== -player || captured.includes(over)) continue;
    // The jumping piece has left its start square, so a loop may land back on it.
    if (board[land] !== 0 && land !== start) continue;
    any = true;
    const nextCaptured = [...captured, over];
    const nextPath = [...path, land];
    if (!king && lr === crownRow(player)) out.push({ path: nextPath, captures: nextCaptured });
    else jumpsFrom(board, start, land, piece, nextCaptured, nextPath, out);
  }
  if (!any && captured.length > 0) out.push({ path, captures: captured });
}

/** All legal moves for the side to move. If any piece can jump, only jumps are legal. */
export function legalMoves(s: State): Move[] {
  const { board, turn } = s;
  const jumps: Move[] = [];
  for (let sq = 0; sq < 64; sq++) {
    const p = board[sq];
    if (p !== 0 && Math.sign(p) === turn) jumpsFrom(board, sq, sq, p, [], [sq], jumps);
  }
  if (jumps.length) return jumps;
  const steps: Move[] = [];
  for (let sq = 0; sq < 64; sq++) {
    const p = board[sq];
    if (p === 0 || Math.sign(p) !== turn) continue;
    const king = Math.abs(p) === 2;
    const r = sq >> 3;
    const c = sq & 7;
    for (const [dr, dc] of DIRS) {
      if (!king && dr !== -turn) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr > 7 || nc < 0 || nc > 7) continue;
      const to = nr * 8 + nc;
      if (board[to] === 0) steps.push({ path: [sq, to], captures: [] });
    }
  }
  return steps;
}

export const isJump = (m: Move) => m.captures.length > 0;

/** Does the move crown a man? */
export function crowns(s: State, m: Move): boolean {
  const p = s.board[m.path[0]];
  return Math.abs(p) === 1 && rowOf(m.path[m.path.length - 1]) === crownRow(Math.sign(p) as Player);
}

/** The state after a legal move (the input is not changed). */
export function applyMove(s: State, m: Move): State {
  const board = s.board.slice();
  const from = m.path[0];
  const to = m.path[m.path.length - 1];
  let piece = board[from];
  board[from] = 0;
  for (const c of m.captures) board[c] = 0;
  if (Math.abs(piece) === 1 && rowOf(to) === crownRow(Math.sign(piece) as Player)) piece = Math.sign(piece) * 2;
  board[to] = piece;
  return { board, turn: (s.turn === RED ? CREAM : RED) as Player, sinceCapture: m.captures.length ? 0 : s.sinceCapture + 1 };
}

export interface Result {
  over: boolean;
  /** The winner, 0 for a draw, null while the game goes on. */
  winner: Player | 0 | null;
  reason: "no-moves" | "draw-rule" | null;
}

export function getResult(s: State, moves: Move[] = legalMoves(s)): Result {
  if (moves.length === 0) return { over: true, winner: (s.turn === RED ? CREAM : RED) as Player, reason: "no-moves" };
  if (s.sinceCapture >= DRAW_PLIES) return { over: true, winner: 0, reason: "draw-rule" };
  return { over: false, winner: null, reason: null };
}

export function countPieces(board: Board) {
  const n = { red: 0, cream: 0, redKings: 0, creamKings: 0 };
  for (const p of board) {
    if (p > 0) {
      n.red++;
      if (p === 2) n.redKings++;
    } else if (p < 0) {
      n.cream++;
      if (p === -2) n.creamKings++;
    }
  }
  return n;
}

/** Squares from which the side to move can currently jump (all of them, when a jump is compulsory). */
export function movablePieces(moves: Move[]): number[] {
  return [...new Set(moves.map((m) => m.path[0]))];
}
