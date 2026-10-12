// Bubble Pop rules: a hex grid with offset rows, a bouncing shot, snapping, pop-and-drop and the
// creeping ceiling. Pure and seeded so every rule can be tested. Distances are in bubble diameters:
// a cell is 1 wide and its centre is 0.5 below the ceiling; rows are ROW_H apart.
import { mulberry32, type Rng } from "../../kit/rng";
import { COLOR_LETTERS, type LevelDef } from "./levels";

export const COLS = 11;
/** A bubble resting on this row (0 = top) ends the run. */
export const LOSE_ROW = 12;
/** Rows kept in the board array: the playing rows plus a little spare. */
export const ROWS = LOSE_ROW + 3;
export const COLORS = 6;
export const ROW_H = Math.sqrt(3) / 2;
export const EMPTY = -1;
export const SHOT_SPEED = 26;
const HIT_DIST = 0.9;

export interface RC {
  r: number;
  c: number;
}

export interface Placed extends RC {
  color: number;
}

/**
 * rows[r][c] is a colour 0..5 or EMPTY. Row r is "long" (COLS bubbles) when (topParity + r) is even and
 * "short" (COLS - 1, shifted right by half a bubble) when it is odd. topParity flips every time a row
 * is pushed in at the top, so the rows already on the board keep their shape.
 */
export interface Board {
  rows: number[][];
  topParity: 0 | 1;
}

export const emptyBoard = (topParity: 0 | 1 = 0): Board => ({
  rows: Array.from({ length: ROWS }, () => new Array<number>(COLS).fill(EMPTY)),
  topParity,
});

export const parityOf = (b: Board, r: number) => (b.topParity + r) % 2;
export const rowLen = (b: Board, r: number) => (parityOf(b, r) === 0 ? COLS : COLS - 1);
export const inBounds = (b: Board, r: number, c: number) => r >= 0 && r < ROWS && c >= 0 && c < rowLen(b, r);
export const colorAt = (b: Board, r: number, c: number) => (inBounds(b, r, c) ? b.rows[r][c] : EMPTY);

/** Centre of a cell, in bubble diameters from the field's top-left corner. */
export const centerOf = (b: Board, r: number, c: number) => ({ x: c + (parityOf(b, r) === 0 ? 0.5 : 1), y: r * ROW_H + 0.5 });

/** The (up to six) cells touching this one. */
export function neighbors(b: Board, r: number, c: number): RC[] {
  const out: RC[] = [{ r, c: c - 1 }, { r, c: c + 1 }];
  // A long row's cells line up with the short rows' cells c-1 and c; a short row's with c and c+1.
  const [a, z] = parityOf(b, r) === 0 ? [c - 1, c] : [c, c + 1];
  for (const rr of [r - 1, r + 1]) out.push({ r: rr, c: a }, { r: rr, c: z });
  return out.filter((n) => inBounds(b, n.r, n.c));
}

export const occupied = (b: Board, r: number, c: number) => colorAt(b, r, c) >= 0;

export function allCells(b: Board): Placed[] {
  const out: Placed[] = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < rowLen(b, r); c++) if (b.rows[r][c] >= 0) out.push({ r, c, color: b.rows[r][c] });
  return out;
}

export const countBubbles = (b: Board) => allCells(b).length;
export const colorsOnBoard = (b: Board): number[] => [...new Set(allCells(b).map((p) => p.color))].sort((x, y) => x - y);
export const isCleared = (b: Board) => countBubbles(b) === 0;
export const lowestRow = (b: Board) => allCells(b).reduce((m, p) => Math.max(m, p.r), -1);
export const hasLost = (b: Board) => lowestRow(b) >= LOSE_ROW;

/** Build a board from a level's rows ("." empty, letters for colours). */
export function boardFromRows(rows: string[]): Board {
  const b = emptyBoard(0);
  rows.forEach((row, r) => {
    for (let c = 0; c < row.length && inBounds(b, r, c); c++) {
      const i = COLOR_LETTERS.indexOf(row[c]);
      if (i >= 0) b.rows[r][c] = i;
    }
  });
  return b;
}

// ---------------------------------------------------------------------------------------------- popping

const key = (r: number, c: number) => r * COLS + c;

/** The cells of the same colour joined to (r, c). */
export function sameColorGroup(b: Board, r: number, c: number): RC[] {
  const color = colorAt(b, r, c);
  if (color < 0) return [];
  const seen = new Set([key(r, c)]);
  const out: RC[] = [{ r, c }];
  for (let i = 0; i < out.length; i++) {
    for (const n of neighbors(b, out[i].r, out[i].c)) {
      if (b.rows[n.r][n.c] === color && !seen.has(key(n.r, n.c))) {
        seen.add(key(n.r, n.c));
        out.push(n);
      }
    }
  }
  return out;
}

/** Bubbles with no path to the ceiling (the top row) through other bubbles. */
export function findFloating(b: Board): Placed[] {
  const seen = new Set<number>();
  const stack: RC[] = [];
  for (let c = 0; c < rowLen(b, 0); c++) {
    if (b.rows[0][c] >= 0) {
      seen.add(key(0, c));
      stack.push({ r: 0, c });
    }
  }
  while (stack.length) {
    const cur = stack.pop()!;
    for (const n of neighbors(b, cur.r, cur.c)) {
      if (b.rows[n.r][n.c] >= 0 && !seen.has(key(n.r, n.c))) {
        seen.add(key(n.r, n.c));
        stack.push(n);
      }
    }
  }
  return allCells(b).filter((p) => !seen.has(key(p.r, p.c)));
}

export interface Resolution {
  popped: Placed[];
  fallen: Placed[];
}

/** After a bubble lands at (r, c): pop its colour group if it has 3 or more, then drop what's left hanging. */
export function resolveLanding(b: Board, r: number, c: number): Resolution {
  const group = sameColorGroup(b, r, c);
  if (group.length < 3) return { popped: [], fallen: [] };
  const popped = group.map((p) => ({ ...p, color: b.rows[p.r][p.c] }));
  for (const p of group) b.rows[p.r][p.c] = EMPTY;
  const fallen = findFloating(b);
  for (const p of fallen) b.rows[p.r][p.c] = EMPTY;
  return { popped, fallen };
}

export const popPoints = (n: number) => n * 10 + Math.max(0, n - 3) * 10;
/** Dropped bubbles are worth more the more of them fall at once: 20, 60, 120, 200 ... */
export const fallPoints = (n: number) => 10 * n * (n + 1);

// ---------------------------------------------------------------------------------------------- shots

export interface Shot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  bounces: number;
}

export const MIN_ANGLE = 0.2;
export const clampAngle = (a: number) => Math.min(Math.PI - MIN_ANGLE, Math.max(MIN_ANGLE, a));

/** Angle is measured from the +x axis, counter-clockwise: PI/2 fires straight up. */
export const launch = (x: number, y: number, angle: number, speed = SHOT_SPEED): Shot => ({
  x, y, vx: Math.cos(angle) * speed, vy: -Math.sin(angle) * speed, bounces: 0,
});

const WALL_L = 0.5;
const WALL_R = COLS - 0.5;

/** Bounce a position off the side walls (bubble centres stay within half a bubble of them). */
export function reflectX(x: number, vx: number): { x: number; vx: number; bounced: boolean } {
  if (x < WALL_L) return { x: 2 * WALL_L - x, vx: -vx, bounced: true };
  if (x > WALL_R) return { x: 2 * WALL_R - x, vx: -vx, bounced: true };
  return { x, vx, bounced: false };
}

/** True if a bubble centred at (x, y) would overlap a bubble already on the board. */
export function touchesBubble(b: Board, x: number, y: number): boolean {
  const r0 = Math.max(0, Math.floor((y - 1) / ROW_H));
  const r1 = Math.min(ROWS - 1, Math.ceil((y + 1) / ROW_H));
  for (let r = r0; r <= r1; r++) {
    for (let c = 0; c < rowLen(b, r); c++) {
      if (b.rows[r][c] < 0) continue;
      const p = centerOf(b, r, c);
      if ((p.x - x) ** 2 + (p.y - y) ** 2 < HIT_DIST * HIT_DIST) return true;
    }
  }
  return false;
}

/** Move a shot by dt seconds in small steps. Returns "landed" when it reaches the ceiling or touches a bubble. */
export function stepShot(b: Board, s: Shot, dt: number): "flying" | "landed" {
  const dist = Math.hypot(s.vx, s.vy) * dt;
  const n = Math.max(1, Math.ceil(dist / 0.2));
  for (let i = 0; i < n; i++) {
    s.x += (s.vx * dt) / n;
    s.y += (s.vy * dt) / n;
    const w = reflectX(s.x, s.vx);
    if (w.bounced) {
      s.x = w.x;
      s.vx = w.vx;
      s.bounces++;
    }
    if (s.y <= 0.5) {
      s.y = 0.5;
      return "landed";
    }
    if (touchesBubble(b, s.x, s.y)) return "landed";
  }
  return "flying";
}

/** The empty cell a bubble stopped near: the closest one that touches the ceiling or another bubble. */
export function snapCell(b: Board, x: number, y: number): RC {
  const rGuess = Math.round((y - 0.5) / ROW_H);
  let best: RC | null = null;
  let bestD = Infinity;
  for (let r = Math.max(0, rGuess - 2); r <= Math.min(ROWS - 1, rGuess + 2); r++) {
    for (let c = 0; c < rowLen(b, r); c++) {
      if (b.rows[r][c] >= 0) continue;
      const attached = r === 0 || neighbors(b, r, c).some((n) => b.rows[n.r][n.c] >= 0);
      if (!attached) continue;
      const p = centerOf(b, r, c);
      const d = (p.x - x) ** 2 + (p.y - y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = { r, c };
      }
    }
  }
  if (best) return best;
  // Nothing attached nearby (only possible with an empty board): the nearest cell in the top row.
  return { r: 0, c: Math.max(0, Math.min(rowLen(b, 0) - 1, Math.round(x - (parityOf(b, 0) === 0 ? 0.5 : 1)))) };
}

export interface Trace {
  /** Start, each wall bounce, and where it stops. */
  points: { x: number; y: number }[];
  cell: RC;
}

/** Follow a shot without changing anything, for the dotted aim guide. */
export function trace(b: Board, x: number, y: number, angle: number, maxBounces = 4): Trace {
  const s = launch(x, y, clampAngle(angle));
  const points = [{ x, y }];
  let bounces = 0;
  for (let i = 0; i < 4000; i++) {
    const r = stepShot(b, s, 1 / 120);
    if (s.bounces > bounces) {
      bounces = s.bounces;
      points.push({ x: s.vx > 0 ? WALL_L : WALL_R, y: s.y });
      if (bounces > maxBounces) break;
    }
    if (r === "landed") break;
  }
  points.push({ x: s.x, y: s.y });
  return { points, cell: snapCell(b, s.x, s.y) };
}

// ---------------------------------------------------------------------------------------------- game state

export type Mode = "endless" | "level";

export interface BubbleState {
  board: Board;
  rng: Rng;
  mode: Mode;
  score: number;
  shots: number;
  /** Shots in a row that popped nothing. */
  misses: number;
  /** Misses before the ceiling drops; 0 = never. */
  missesPerDrop: number;
  /** How many colours new rows use (endless). */
  palette: number;
  /** Endless difficulty, 1 and rising. */
  stage: number;
  loaded: number;
  next: number;
  drops: number;
}

/** Endless difficulty by the number of shots fired: more colours and a quicker ceiling as you go. */
export function endlessStage(shots: number) {
  const stage = 1 + Math.floor(shots / 14);
  return {
    stage,
    palette: Math.min(COLORS, 3 + Math.floor(stage / 2)),
    missesPerDrop: Math.max(3, 7 - Math.floor((stage - 1) / 2)),
  };
}

/** A random colour among those still on the board (any colour if the board is empty). */
export function pickColor(b: Board, rng: Rng, palette = COLORS): number {
  const on = colorsOnBoard(b);
  return on.length ? on[Math.floor(rng() * on.length)] : Math.floor(rng() * palette);
}

/** Make sure the loaded and next bubbles are colours that are still on the board. */
export function refreshQueue(s: BubbleState) {
  const on = colorsOnBoard(s.board);
  if (!on.length) return;
  if (!on.includes(s.loaded)) s.loaded = pickColor(s.board, s.rng);
  if (!on.includes(s.next)) s.next = pickColor(s.board, s.rng);
}

export function swapQueue(s: BubbleState) {
  [s.loaded, s.next] = [s.next, s.loaded];
}

/** Fill the top rows with clumpy random colours. */
export function fillRows(b: Board, rows: number, palette: number, rng: Rng) {
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < rowLen(b, r); c++) {
      const left = c > 0 ? b.rows[r][c - 1] : EMPTY;
      const up = r > 0 ? colorAt(b, r - 1, c) : EMPTY;
      const roll = rng();
      b.rows[r][c] = roll < 0.4 && left >= 0 ? left : roll < 0.6 && up >= 0 ? up : Math.floor(rng() * palette);
    }
  }
}

export function newEndless(seed: number): BubbleState {
  const rng = mulberry32(seed);
  const board = emptyBoard(0);
  const d = endlessStage(0);
  fillRows(board, 5, d.palette, rng);
  const s: BubbleState = {
    board, rng, mode: "endless", score: 0, shots: 0, misses: 0, missesPerDrop: d.missesPerDrop, palette: d.palette, stage: 1,
    loaded: 0, next: 0, drops: 0,
  };
  s.loaded = pickColor(board, rng);
  s.next = pickColor(board, rng);
  return s;
}

export function newLevelState(level: LevelDef, seed: number): BubbleState {
  const rng = mulberry32(seed);
  const board = boardFromRows(level.rows);
  const s: BubbleState = {
    board, rng, mode: "level", score: 0, shots: 0, misses: 0, missesPerDrop: level.missesPerDrop, palette: COLORS, stage: 1,
    loaded: 0, next: 0, drops: 0,
  };
  s.loaded = pickColor(board, rng);
  s.next = pickColor(board, rng);
  return s;
}

/** Push a new row in at the top (the whole board moves down one). Returns true if something now sits on the losing row. */
export function addTopRow(s: BubbleState): boolean {
  const b = s.board;
  b.rows.pop();
  b.topParity = (1 - b.topParity) as 0 | 1;
  const row = new Array<number>(COLS).fill(EMPTY);
  b.rows.unshift(row);
  // Level rows reuse the colours still on the board; endless rows use the current palette.
  const on = colorsOnBoard(b);
  for (let c = 0; c < rowLen(b, 0); c++) {
    const prev = c > 0 ? row[c - 1] : EMPTY;
    if (prev >= 0 && s.rng() < 0.35) row[c] = prev;
    else row[c] = s.mode === "level" && on.length ? on[Math.floor(s.rng() * on.length)] : Math.floor(s.rng() * s.palette);
  }
  s.drops++;
  return hasLost(b);
}

export interface LandResult {
  cell: RC;
  color: number;
  popped: Placed[];
  fallen: Placed[];
  points: number;
  /** The ceiling came down (a row was added at the top). */
  dropped: boolean;
  /** Misses left before the next drop (0 if the ceiling doesn't drop in this level). */
  missesLeft: number;
  lost: boolean;
  /** The board is clear. */
  cleared: boolean;
}

/** Settle the loaded bubble where a shot ended: place, pop, drop, score, and load the next bubble. */
export function land(s: BubbleState, x: number, y: number): LandResult {
  const b = s.board;
  const color = s.loaded;
  const cell = snapCell(b, x, y);
  b.rows[cell.r][cell.c] = color;
  s.shots++;
  const { popped, fallen } = resolveLanding(b, cell.r, cell.c);
  let points = 0;
  if (popped.length) {
    points = popPoints(popped.length) + (fallen.length ? fallPoints(fallen.length) : 0);
    s.misses = 0;
  } else {
    s.misses++;
  }
  s.score += points;
  let dropped = false;
  let lost = hasLost(b);
  if (!lost && s.missesPerDrop > 0 && s.misses >= s.missesPerDrop) {
    s.misses = 0;
    dropped = true;
    lost = addTopRow(s);
  }
  if (s.mode === "endless") {
    const d = endlessStage(s.shots);
    s.stage = d.stage;
    s.palette = d.palette;
    s.missesPerDrop = d.missesPerDrop;
  }
  const cleared = isCleared(b);
  s.loaded = s.next;
  s.next = pickColor(b, s.rng, s.palette);
  refreshQueue(s);
  return {
    cell, color, popped, fallen, points, dropped, lost, cleared,
    missesLeft: s.missesPerDrop > 0 ? s.missesPerDrop - s.misses : 0,
  };
}

/** Endless mode: a cleared board earns a bonus and a fresh set of rows. */
export function refillEndless(s: BubbleState): number {
  const bonus = 500 + 100 * s.stage;
  s.score += bonus;
  fillRows(s.board, 4, s.palette, s.rng);
  s.loaded = pickColor(s.board, s.rng);
  s.next = pickColor(s.board, s.rng);
  return bonus;
}
