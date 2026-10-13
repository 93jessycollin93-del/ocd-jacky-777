// Mine Sweep rules: pure and seeded so they can be tested. The first dig is always safe and opens an
// area (mines are laid out after it, keeping its whole neighbourhood clear), empty cells flood-fill,
// numbers can be chorded, and the board reports wins and losses.
import { mulberry32, shuffle } from "../../kit/rng";

export type LevelId = "beginner" | "intermediate" | "expert";

export interface Level {
  id: LevelId;
  label: string;
  cols: number;
  rows: number;
  mines: number;
}

export const LEVELS: Level[] = [
  { id: "beginner", label: "Beginner", cols: 9, rows: 9, mines: 10 },
  { id: "intermediate", label: "Intermediate", cols: 16, rows: 16, mines: 40 },
  { id: "expert", label: "Expert", cols: 30, rows: 16, mines: 99 },
];

export const levelById = (id: LevelId): Level => LEVELS.find((l) => l.id === id) ?? LEVELS[0];

export const HIDDEN = 0;
export const OPEN = 1;
export const FLAG = 2;

export type Phase = "idle" | "playing" | "won" | "lost";

export interface Board {
  level: Level;
  cols: number;
  rows: number;
  mines: number;
  /** 1 where a mine is (laid out on the first dig). */
  mine: Uint8Array;
  /** Neighbouring mine counts. */
  adj: Uint8Array;
  /** HIDDEN, OPEN or FLAG for every cell. */
  state: Uint8Array;
  phase: Phase;
  seed: number;
  opened: number;
  flags: number;
  /** The mine that went off, or -1. */
  exploded: number;
  /** Flags that were on safe cells when the game was lost. */
  wrongFlags: number[];
}

export interface Reveal {
  /** Cells opened by this action, in the order a flood reaches them. */
  opened: number[];
  /** How many steps from the clicked cell each one is (for a rippling animation). */
  depth: number[];
  hitMine: boolean;
  won: boolean;
}

const EMPTY_REVEAL = (): Reveal => ({ opened: [], depth: [], hitMine: false, won: false });

export function newBoard(level: Level, seed = 1): Board {
  const n = level.cols * level.rows;
  return {
    level, cols: level.cols, rows: level.rows, mines: level.mines, mine: new Uint8Array(n), adj: new Uint8Array(n),
    state: new Uint8Array(n), phase: "idle", seed, opened: 0, flags: 0, exploded: -1, wrongFlags: [],
  };
}

export const idxOf = (b: Board, x: number, y: number) => y * b.cols + x;

/** Indices of the (up to 8) cells around i. */
export function neighbors(b: Board, i: number): number[] {
  const x = i % b.cols;
  const y = (i - x) / b.cols;
  const out: number[] = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < b.cols && ny < b.rows) out.push(ny * b.cols + nx);
    }
  }
  return out;
}

/** Lay the mines, keeping `safe` and everything around it clear so the first dig opens an area. */
export function placeMines(b: Board, safe: number) {
  const banned = new Set([safe, ...neighbors(b, safe)]);
  const candidates: number[] = [];
  for (let i = 0; i < b.cols * b.rows; i++) if (!banned.has(i)) candidates.push(i);
  shuffle(mulberry32(b.seed), candidates);
  for (let k = 0; k < b.mines; k++) b.mine[candidates[k]] = 1;
  for (let i = 0; i < b.mine.length; i++) {
    let c = 0;
    for (const n of neighbors(b, i)) c += b.mine[n];
    b.adj[i] = c;
  }
}

/** Open a cell (and flood outward from empty ones). Flagged and open cells are left alone. */
export function reveal(b: Board, start: number): Reveal {
  if (b.phase === "won" || b.phase === "lost") return EMPTY_REVEAL();
  if (b.state[start] !== HIDDEN) return EMPTY_REVEAL();
  if (b.phase === "idle") {
    placeMines(b, start);
    b.phase = "playing";
  }
  return openFrom(b, [start]);
}

function openFrom(b: Board, starts: number[]): Reveal {
  const res = EMPTY_REVEAL();
  const queue: number[] = [];
  const depthOf = new Map<number, number>();
  for (const s of starts) {
    if (b.state[s] !== HIDDEN) continue;
    if (b.mine[s]) {
      lose(b, s);
      res.hitMine = true;
      return res;
    }
    b.state[s] = OPEN;
    b.opened++;
    res.opened.push(s);
    res.depth.push(0);
    depthOf.set(s, 0);
    queue.push(s);
  }
  for (let q = 0; q < queue.length; q++) {
    const i = queue[q];
    if (b.adj[i] !== 0) continue;
    const d = depthOf.get(i) ?? 0;
    for (const n of neighbors(b, i)) {
      if (b.state[n] !== HIDDEN || b.mine[n]) continue;
      b.state[n] = OPEN;
      b.opened++;
      res.opened.push(n);
      res.depth.push(d + 1);
      depthOf.set(n, d + 1);
      queue.push(n);
    }
  }
  if (b.opened === b.cols * b.rows - b.mines) {
    win(b);
    res.won = true;
  }
  return res;
}

function win(b: Board) {
  b.phase = "won";
  // Every remaining mine gets its flag.
  for (let i = 0; i < b.mine.length; i++) {
    if (b.mine[i] && b.state[i] !== FLAG) b.state[i] = FLAG;
  }
  b.flags = b.mines;
}

function lose(b: Board, at: number) {
  b.phase = "lost";
  b.exploded = at;
  b.wrongFlags = [];
  for (let i = 0; i < b.mine.length; i++) if (b.state[i] === FLAG && !b.mine[i]) b.wrongFlags.push(i);
}

/** Put a flag on a hidden cell, or take it off. Returns false if nothing changed. */
export function toggleFlag(b: Board, i: number): boolean {
  if (b.phase === "won" || b.phase === "lost") return false;
  if (b.state[i] === OPEN) return false;
  if (b.state[i] === FLAG) {
    b.state[i] = HIDDEN;
    b.flags--;
  } else {
    b.state[i] = FLAG;
    b.flags++;
  }
  return true;
}

export const minesLeft = (b: Board) => b.mines - b.flags;

/**
 * Chord on an open number: if the flags around it match the number, open every other hidden
 * neighbour. A wrong flag means one of those is a mine, and that loses.
 */
export function chord(b: Board, i: number): Reveal {
  if (b.phase !== "playing" || b.state[i] !== OPEN || b.adj[i] === 0) return EMPTY_REVEAL();
  const around = neighbors(b, i);
  const flagged = around.filter((n) => b.state[n] === FLAG).length;
  if (flagged !== b.adj[i]) return EMPTY_REVEAL();
  const targets = around.filter((n) => b.state[n] === HIDDEN);
  if (!targets.length) return EMPTY_REVEAL();
  return openFrom(b, targets);
}

/** Hidden neighbours that a chord on `i` would open (for highlighting while pressing). */
export const chordTargets = (b: Board, i: number) => (b.state[i] === OPEN && b.adj[i] > 0 ? neighbors(b, i).filter((n) => b.state[n] === HIDDEN) : []);

/** Every mine that should be shown when a game is lost (mines not flagged), nearest the blast first. */
export function mineReveals(b: Board): number[] {
  const out: number[] = [];
  for (let i = 0; i < b.mine.length; i++) if (b.mine[i] && b.state[i] !== FLAG && i !== b.exploded) out.push(i);
  const ex = b.exploded % b.cols;
  const ey = Math.floor(b.exploded / b.cols);
  const dist = (i: number) => Math.hypot((i % b.cols) - ex, Math.floor(i / b.cols) - ey);
  return out.sort((a, c) => dist(a) - dist(c));
}

export const cleared = (b: Board) => b.opened / (b.cols * b.rows - b.mines);

// ---------------------------------------------------------------- best times

export type Times = Partial<Record<LevelId, number>>;

/** Record a winning time; returns the updated table and whether it is a new best for that level. */
export function recordTime(times: Times, level: LevelId, seconds: number): { times: Times; isBest: boolean } {
  const prev = times[level];
  if (prev !== undefined && prev <= seconds) return { times, isBest: false };
  return { times: { ...times, [level]: seconds }, isBest: true };
}

/** Times saved by older or hand-edited data: keep only sane numbers. */
export function cleanTimes(raw: unknown): Times {
  const out: Times = {};
  if (raw && typeof raw === "object") {
    for (const l of LEVELS) {
      const v = (raw as Record<string, unknown>)[l.id];
      if (typeof v === "number" && Number.isFinite(v) && v > 0) out[l.id] = v;
    }
  }
  return out;
}
