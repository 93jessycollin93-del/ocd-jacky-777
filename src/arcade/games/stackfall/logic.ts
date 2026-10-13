// Stackfall rules: a classic falling-block game. Pure and seeded so it can be tested.
// 10-wide well with two hidden spawn rows above the 20 visible ones, SRS-style rotation with wall
// kicks, a 7-bag randomizer, hold, ghost, lock delay with a move-reset limit, and guideline-style
// scoring. y grows downward.
import { mulberry32, shuffle, type Rng } from "../../kit/rng";

export const COLS = 10;
export const VISIBLE = 20;
export const HIDDEN = 2;
export const ROWS = VISIBLE + HIDDEN;
export const LOCK_DELAY = 0.5;
export const MAX_LOCK_RESETS = 15;
/** Delayed auto-shift and auto-repeat rate, in seconds. */
export const DAS = 0.17;
export const ARR = 0.05;
export const QUEUE_SHOWN = 5;
export const LINES_PER_LEVEL = 10;

export type PieceType = "I" | "O" | "T" | "S" | "Z" | "J" | "L";
export const PIECES: PieceType[] = ["I", "O", "T", "S", "Z", "J", "L"];
export type Rot = 0 | 1 | 2 | 3;
export type Cell = [number, number];

const BASE: Record<PieceType, { size: number; cells: Cell[] }> = {
  I: { size: 4, cells: [[0, 1], [1, 1], [2, 1], [3, 1]] },
  O: { size: 4, cells: [[1, 0], [2, 0], [1, 1], [2, 1]] },
  T: { size: 3, cells: [[1, 0], [0, 1], [1, 1], [2, 1]] },
  S: { size: 3, cells: [[1, 0], [2, 0], [0, 1], [1, 1]] },
  Z: { size: 3, cells: [[0, 0], [1, 0], [1, 1], [2, 1]] },
  J: { size: 3, cells: [[0, 0], [0, 1], [1, 1], [2, 1]] },
  L: { size: 3, cells: [[2, 0], [0, 1], [1, 1], [2, 1]] },
};

function buildShapes(): Record<PieceType, Cell[][]> {
  const out = {} as Record<PieceType, Cell[][]>;
  for (const t of PIECES) {
    const { size, cells } = BASE[t];
    const states: Cell[][] = [cells];
    for (let r = 1; r < 4; r++) {
      // The square piece never changes shape, so it stays put.
      states.push(t === "O" ? cells : states[r - 1].map(([x, y]) => [size - 1 - y, x] as Cell));
    }
    out[t] = states;
  }
  return out;
}

/** The four cells of each piece in each rotation state, inside its bounding box. */
export const SHAPES = buildShapes();

// Kick tables as (dx, dy) with y pointing UP (the usual published form); converted when used.
const JLSTZ_KICKS: Record<string, Cell[]> = {
  "01": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  "10": [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  "12": [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  "21": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  "23": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  "32": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  "30": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  "03": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
};
const I_KICKS: Record<string, Cell[]> = {
  "01": [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  "10": [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  "12": [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
  "21": [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  "23": [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  "32": [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  "30": [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  "03": [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
};

/** Offsets to try (in board coordinates, y down) when rotating `from` → `to`. */
export function kicksFor(type: PieceType, from: Rot, to: Rot): Cell[] {
  if (type === "O") return [[0, 0]];
  const table = type === "I" ? I_KICKS : JLSTZ_KICKS;
  return (table[`${from}${to}`] ?? [[0, 0]]).map(([dx, dy]) => [dx, dy === 0 ? 0 : -dy] as Cell);
}

export interface Active {
  type: PieceType;
  rot: Rot;
  x: number;
  y: number;
}

export type StackEvent =
  | { type: "spawn" }
  | { type: "lock"; cells: Cell[]; piece: PieceType }
  | { type: "harddrop"; from: Cell[]; dist: number; piece: PieceType }
  | { type: "hold" }
  | { type: "levelup"; level: number }
  | { type: "gameover" }
  | {
      type: "clear";
      /** Board rows that were removed, top to bottom. */
      rows: number[];
      /** What was in each removed row (piece ids 1–7), for the flash. */
      colors: number[][];
      lines: number;
      points: number;
      combo: number;
      b2b: boolean;
      level: number;
    };

export interface StackState {
  /** ROWS × COLS, 0 = empty, otherwise PIECES.indexOf(type) + 1. */
  board: Uint8Array;
  cur: Active;
  hold: PieceType | null;
  canHold: boolean;
  queue: PieceType[];
  rng: Rng;
  score: number;
  lines: number;
  level: number;
  /** Consecutive clearing locks minus one (-1 = no combo running). */
  combo: number;
  /** The last line clear was a 4-line clear. */
  b2b: boolean;
  fallAcc: number;
  lockTimer: number;
  lockResets: number;
  /** Lowest row the current piece has reached (a new low refills the reset allowance). */
  lowest: number;
  alive: boolean;
  /** Pieces locked so far. */
  pieces: number;
  time: number;
}

export const pieceId = (t: PieceType) => PIECES.indexOf(t) + 1;

/** Seconds per row for a level: the usual speed curve, from 1 s at level 1 to nearly instant. */
export function gravityInterval(level: number): number {
  const l = Math.max(1, Math.min(level, 20));
  return Math.max(0.0005, Math.pow(0.8 - (l - 1) * 0.007, l - 1));
}

/** Line-clear points before the level multiplier. */
export const LINE_POINTS = [0, 100, 300, 500, 800];

export const levelForLines = (lines: number) => 1 + Math.floor(lines / LINES_PER_LEVEL);

export function newGame(seed = 1, startLevel = 1): StackState {
  const rng = mulberry32(seed);
  const s: StackState = {
    board: new Uint8Array(ROWS * COLS),
    cur: { type: "T", rot: 0, x: 3, y: 0 },
    hold: null,
    canHold: true,
    queue: [],
    rng,
    score: 0,
    lines: (startLevel - 1) * LINES_PER_LEVEL,
    level: startLevel,
    combo: -1,
    b2b: false,
    fallAcc: 0,
    lockTimer: 0,
    lockResets: 0,
    lowest: 0,
    alive: true,
    pieces: 0,
    time: 0,
  };
  refill(s);
  spawn(s, takeNext(s));
  return s;
}

function refill(s: StackState) {
  while (s.queue.length < 14) s.queue.push(...shuffle(s.rng, [...PIECES]));
}

function takeNext(s: StackState): PieceType {
  const t = s.queue.shift() as PieceType;
  refill(s);
  return t;
}

/** The next pieces that will arrive, in order. */
export const upcoming = (s: StackState, n = QUEUE_SHOWN) => s.queue.slice(0, n);

export function cellsOf(a: Active): Cell[] {
  return SHAPES[a.type][a.rot].map(([x, y]) => [a.x + x, a.y + y] as Cell);
}

export function collides(s: StackState, a: Active): boolean {
  const shape = SHAPES[a.type][a.rot];
  for (let i = 0; i < 4; i++) {
    const x = a.x + shape[i][0];
    const y = a.y + shape[i][1];
    if (x < 0 || x >= COLS || y >= ROWS) return true;
    if (y >= 0 && s.board[y * COLS + x] !== 0) return true;
  }
  return false;
}

export const isGrounded = (s: StackState) => collides(s, { ...s.cur, y: s.cur.y + 1 });

/** Where the current piece would land. */
export function ghostY(s: StackState): number {
  let y = s.cur.y;
  while (!collides(s, { ...s.cur, y: y + 1 })) y++;
  return y;
}

function spawn(s: StackState, type: PieceType) {
  s.cur = { type, rot: 0, x: 3, y: 0 };
  s.fallAcc = 0;
  s.lockTimer = 0;
  s.lockResets = 0;
  if (collides(s, s.cur)) {
    s.alive = false;
    return;
  }
  // Like the guideline: a fresh piece drops one row straight away if it can.
  if (!collides(s, { ...s.cur, y: 1 })) s.cur.y = 1;
  s.lowest = s.cur.y;
}

/** After a successful shift or turn: a grounded piece gets its lock timer back, up to the limit. */
function afterMove(s: StackState) {
  if (isGrounded(s)) {
    if (s.lockResets < MAX_LOCK_RESETS) {
      s.lockTimer = 0;
      s.lockResets++;
    }
  } else {
    s.lockTimer = 0;
  }
}

export function move(s: StackState, dx: number): boolean {
  if (!s.alive) return false;
  const next = { ...s.cur, x: s.cur.x + dx };
  if (collides(s, next)) return false;
  s.cur = next;
  afterMove(s);
  return true;
}

/** Turn the piece: dir 1 = clockwise, -1 = counter-clockwise. Tries the wall-kick offsets in order. */
export function rotate(s: StackState, dir: 1 | -1): boolean {
  if (!s.alive) return false;
  const from = s.cur.rot;
  const to = ((from + dir + 4) % 4) as Rot;
  for (const [dx, dy] of kicksFor(s.cur.type, from, to)) {
    const next = { ...s.cur, rot: to, x: s.cur.x + dx, y: s.cur.y + dy };
    if (!collides(s, next)) {
      s.cur = next;
      if (next.y > s.lowest) {
        s.lowest = next.y;
        s.lockResets = 0;
      }
      afterMove(s);
      return true;
    }
  }
  return false;
}

/** One row down by the player's hand: a point per row. */
export function softDropStep(s: StackState): boolean {
  if (!s.alive) return false;
  const next = { ...s.cur, y: s.cur.y + 1 };
  if (collides(s, next)) return false;
  s.cur = next;
  s.score += 1;
  s.fallAcc = 0;
  if (next.y > s.lowest) {
    s.lowest = next.y;
    s.lockResets = 0;
  }
  if (!isGrounded(s)) s.lockTimer = 0;
  return true;
}

/** Slam the piece down and lock it at once: two points per row. */
export function hardDrop(s: StackState): StackEvent[] {
  if (!s.alive) return [];
  const from = cellsOf(s.cur);
  const dist = ghostY(s) - s.cur.y;
  const piece = s.cur.type;
  s.cur = { ...s.cur, y: s.cur.y + dist };
  s.score += dist * 2;
  const ev: StackEvent[] = [{ type: "harddrop", from, dist, piece }];
  ev.push(...lockPiece(s));
  return ev;
}

/** Swap the falling piece with the held one (once per drop). */
export function holdPiece(s: StackState): boolean {
  if (!s.alive || !s.canHold) return false;
  const incoming = s.hold ?? takeNext(s);
  s.hold = s.cur.type;
  s.canHold = false;
  spawn(s, incoming);
  return true;
}

function lockPiece(s: StackState): StackEvent[] {
  const ev: StackEvent[] = [];
  const cells = cellsOf(s.cur);
  const piece = s.cur.type;
  const id = pieceId(piece);
  for (const [x, y] of cells) s.board[y * COLS + x] = id;
  ev.push({ type: "lock", cells, piece });
  s.pieces++;

  const full: number[] = [];
  for (let y = 0; y < ROWS; y++) {
    let all = true;
    for (let x = 0; x < COLS; x++) {
      if (!s.board[y * COLS + x]) {
        all = false;
        break;
      }
    }
    if (all) full.push(y);
  }

  if (full.length > 0) {
    const colors = full.map((y) => Array.from(s.board.subarray(y * COLS, (y + 1) * COLS)));
    const out = new Uint8Array(s.board.length);
    let w = ROWS - 1;
    for (let y = ROWS - 1; y >= 0; y--) {
      if (full.includes(y)) continue;
      out.set(s.board.subarray(y * COLS, (y + 1) * COLS), w * COLS);
      w--;
    }
    s.board = out;

    const n = full.length;
    const levelAtClear = s.level;
    let points = LINE_POINTS[n] * levelAtClear;
    const b2b = n === 4 && s.b2b;
    if (b2b) points += Math.floor(points / 2);
    s.b2b = n === 4;
    s.combo++;
    if (s.combo > 0) points += 50 * s.combo * levelAtClear;
    s.score += points;
    s.lines += n;
    ev.push({ type: "clear", rows: full, colors, lines: n, points, combo: s.combo, b2b, level: levelAtClear });
    const level = levelForLines(s.lines);
    if (level > s.level) {
      s.level = level;
      ev.push({ type: "levelup", level });
    }
  } else {
    s.combo = -1;
    // The piece came to rest completely above the visible well: the stack is too high.
    if (cells.every(([, y]) => y < HIDDEN)) {
      s.alive = false;
      ev.push({ type: "gameover" });
      return ev;
    }
  }

  s.canHold = true;
  spawn(s, takeNext(s));
  if (!s.alive) ev.push({ type: "gameover" });
  else ev.push({ type: "spawn" });
  return ev;
}

/**
 * Advance by dt seconds: gravity (faster while soft-dropping) and the lock delay.
 * Soft-dropped rows score a point each.
 */
export function update(s: StackState, dt: number, soft = false): StackEvent[] {
  if (!s.alive) return [];
  s.time += dt;
  const ev: StackEvent[] = [];
  if (isGrounded(s)) {
    s.fallAcc = 0;
    s.lockTimer += dt;
    if (s.lockTimer >= LOCK_DELAY) ev.push(...lockPiece(s));
    return ev;
  }
  s.lockTimer = 0;
  const g = gravityInterval(s.level);
  const interval = soft ? Math.min(g, Math.max(g / 20, 0.0005), 0.05) : g;
  s.fallAcc += dt;
  let guard = 0;
  while (s.fallAcc >= interval && guard++ < ROWS) {
    const next = { ...s.cur, y: s.cur.y + 1 };
    if (collides(s, next)) {
      s.fallAcc = 0;
      break;
    }
    s.cur = next;
    s.fallAcc -= interval;
    if (soft) s.score += 1;
    if (next.y > s.lowest) {
      s.lowest = next.y;
      s.lockResets = 0;
    }
  }
  return ev;
}

// ---------------------------------------------------------------- held-key auto-repeat

export interface Repeat {
  dir: -1 | 0 | 1;
  t: number;
  /** Auto-repeat steps already issued this hold. */
  n: number;
}

export const newRepeat = (): Repeat => ({ dir: 0, t: 0, n: 0 });

/**
 * How many one-cell shifts to make this frame for a held direction: one on the press itself, then
 * after the delay (DAS) one every ARR seconds.
 */
export function repeatSteps(r: Repeat, dir: -1 | 0 | 1, dt: number, das = DAS, arr = ARR): number {
  if (dir !== r.dir) {
    r.dir = dir;
    r.t = 0;
    r.n = 0;
    return dir === 0 ? 0 : 1;
  }
  if (dir === 0) return 0;
  r.t += dt;
  if (r.t < das) return 0;
  const due = Math.floor((r.t - das) / arr) + 1;
  const steps = due - r.n;
  r.n = due;
  return Math.max(0, steps);
}
