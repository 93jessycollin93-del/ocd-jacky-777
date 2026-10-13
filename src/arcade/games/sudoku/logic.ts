// Sudoku rules: pure and seeded so they can be tested. A fast bitmask backtracking solver (also used to
// prove each puzzle has exactly one solution), a "singles" solver that rates how human-solvable a puzzle
// is, the puzzle generator, and the game state with notes, undo/redo, hints and mistakes.
import { mulberry32, shuffle, type Rng } from "../../kit/rng";

export type Difficulty = "easy" | "medium" | "hard" | "expert";

export const DIFFICULTIES: { id: Difficulty; label: string; givens: number; blurb: string }[] = [
  { id: "easy", label: "Easy", givens: 42, blurb: "42 clues · simple deductions" },
  { id: "medium", label: "Medium", givens: 36, blurb: "36 clues · needs sharper eyes" },
  { id: "hard", label: "Hard", givens: 30, blurb: "30 clues · some real thinking" },
  { id: "expert", label: "Expert", givens: 25, blurb: "25 clues · for the brave" },
];
export const difficultyById = (id: Difficulty) => DIFFICULTIES.find((d) => d.id === id) ?? DIFFICULTIES[1];

export const MAX_HINTS = 3;

// ---------------------------------------------------------------- geometry

export const rowOf = (i: number) => (i / 9) | 0;
export const colOf = (i: number) => i % 9;
export const boxOf = (i: number) => 3 * (((i / 27) | 0)) + (((i % 9) / 3) | 0);

const ROW = new Uint8Array(81);
const COL = new Uint8Array(81);
const BOX = new Uint8Array(81);
for (let i = 0; i < 81; i++) {
  ROW[i] = rowOf(i);
  COL[i] = colOf(i);
  BOX[i] = boxOf(i);
}

/** The 20 cells that share a row, column or box with each cell. */
export const PEERS: number[][] = Array.from({ length: 81 }, (_, i) => {
  const out: number[] = [];
  for (let j = 0; j < 81; j++) if (j !== i && (ROW[j] === ROW[i] || COL[j] === COL[i] || BOX[j] === BOX[i])) out.push(j);
  return out;
});

/** The 27 units (9 rows, 9 columns, 9 boxes) as lists of cell indices. */
export const UNITS: number[][] = [
  ...Array.from({ length: 9 }, (_, r) => Array.from({ length: 9 }, (_, c) => r * 9 + c)),
  ...Array.from({ length: 9 }, (_, c) => Array.from({ length: 9 }, (_, r) => r * 9 + c)),
  ...Array.from({ length: 9 }, (_, b) => {
    const out: number[] = [];
    for (let i = 0; i < 81; i++) if (BOX[i] === b) out.push(i);
    return out;
  }),
];

const BIT = [0, 1, 2, 4, 8, 16, 32, 64, 128, 256];
const POP = new Uint8Array(512);
for (let m = 1; m < 512; m++) POP[m] = POP[m >> 1] + (m & 1);
export const bitOf = (d: number) => BIT[d];

// ---------------------------------------------------------------- solver

/**
 * Depth-first search that always fills the cell with the fewest candidates. Counts solutions up to
 * `limit` (2 is enough to tell "unique" from "ambiguous") and copies the first one into `out`.
 */
function search(g: Int8Array, limit: number, rng: Rng | null, out: Int8Array | null): number {
  const rows = new Uint16Array(9);
  const cols = new Uint16Array(9);
  const boxes = new Uint16Array(9);
  for (let i = 0; i < 81; i++) {
    const v = g[i];
    if (!v) continue;
    const b = BIT[v];
    if ((rows[ROW[i]] | cols[COL[i]] | boxes[BOX[i]]) & b) return 0;
    rows[ROW[i]] |= b;
    cols[COL[i]] |= b;
    boxes[BOX[i]] |= b;
  }
  let count = 0;
  const dfs = (): void => {
    let best = -1;
    let bestMask = 0;
    let bestN = 10;
    for (let i = 0; i < 81; i++) {
      if (g[i]) continue;
      const m = ~(rows[ROW[i]] | cols[COL[i]] | boxes[BOX[i]]) & 511;
      const n = POP[m];
      if (n === 0) return;
      if (n < bestN) {
        best = i;
        bestMask = m;
        bestN = n;
        if (n === 1) break;
      }
    }
    if (best < 0) {
      count++;
      if (out && count === 1) out.set(g);
      return;
    }
    const cands: number[] = [];
    for (let d = 1; d <= 9; d++) if (bestMask & BIT[d]) cands.push(d);
    if (rng) shuffle(rng, cands);
    for (const d of cands) {
      const b = BIT[d];
      g[best] = d;
      rows[ROW[best]] |= b;
      cols[COL[best]] |= b;
      boxes[BOX[best]] |= b;
      dfs();
      rows[ROW[best]] &= ~b;
      cols[COL[best]] &= ~b;
      boxes[BOX[best]] &= ~b;
      g[best] = 0;
      if (count >= limit) return;
    }
  };
  dfs();
  return count;
}

/** How many solutions a puzzle has, stopping at `limit`. 0 = contradictory, 1 = unique. */
export function countSolutions(puzzle: ArrayLike<number>, limit = 2): number {
  return search(Int8Array.from(puzzle), limit, null, null);
}

/** Solve a puzzle (the first solution found), or null if it has none. */
export function solve(puzzle: ArrayLike<number>, rng: Rng | null = null): Int8Array | null {
  const out = new Int8Array(81);
  return search(Int8Array.from(puzzle), 1, rng, out) > 0 ? out : null;
}

/** A complete random valid grid. */
export function generateSolved(rng: Rng): Int8Array {
  return solve(new Int8Array(81), rng) as Int8Array;
}

export function isValidSolution(g: ArrayLike<number>): boolean {
  if (g.length !== 81) return false;
  for (const unit of UNITS) {
    let seen = 0;
    for (const i of unit) {
      const v = g[i];
      if (!(v >= 1 && v <= 9) || seen & BIT[v]) return false;
      seen |= BIT[v];
    }
  }
  return true;
}

/** Candidate digits (as bitmasks) for every cell, from the filled cells only. */
export function candidates(g: ArrayLike<number>): Uint16Array {
  const rows = new Uint16Array(9);
  const cols = new Uint16Array(9);
  const boxes = new Uint16Array(9);
  for (let i = 0; i < 81; i++) {
    const v = g[i];
    if (v) {
      rows[ROW[i]] |= BIT[v];
      cols[COL[i]] |= BIT[v];
      boxes[BOX[i]] |= BIT[v];
    }
  }
  const out = new Uint16Array(81);
  for (let i = 0; i < 81; i++) if (!g[i]) out[i] = ~(rows[ROW[i]] | cols[COL[i]] | boxes[BOX[i]]) & 511;
  return out;
}

export interface SingleStep {
  cell: number;
  value: number;
  kind: "naked" | "hidden";
}

/** The next cell a human could fill with a naked single (only one candidate) or a hidden single. */
export function nextSingle(g: ArrayLike<number>, allowHidden = true): SingleStep | null {
  const cand = candidates(g);
  for (let i = 0; i < 81; i++) {
    if (!g[i] && POP[cand[i]] === 1) return { cell: i, value: BIT.indexOf(cand[i]), kind: "naked" };
  }
  if (!allowHidden) return null;
  for (const unit of UNITS) {
    for (let d = 1; d <= 9; d++) {
      let at = -1;
      let n = 0;
      for (const i of unit) {
        if (!g[i] && cand[i] & BIT[d]) {
          at = i;
          n++;
          if (n > 1) break;
        }
      }
      if (n === 1) return { cell: at, value: d, kind: "hidden" };
    }
  }
  return null;
}

/** Solve using only singles. `solved` says whether that was enough, i.e. how "human" the puzzle is. */
export function solveSingles(puzzle: ArrayLike<number>, allowHidden = true): { solved: boolean; steps: number; grid: Int8Array } {
  const g = Int8Array.from(puzzle);
  let steps = 0;
  for (;;) {
    const s = nextSingle(g, allowHidden);
    if (!s) break;
    g[s.cell] = s.value;
    steps++;
  }
  return { solved: g.every((v) => v !== 0), steps, grid: g };
}

// ---------------------------------------------------------------- generation

export interface Puzzle {
  /** The clues (0 = blank). */
  givens: Int8Array;
  solution: Int8Array;
  difficulty: Difficulty;
  seed: number;
}

export const countGivens = (g: ArrayLike<number>) => {
  let n = 0;
  for (let i = 0; i < g.length; i++) if (g[i]) n++;
  return n;
};

/** Longest time (ms) the generator may spend digging out clues; it keeps what it has by then. */
export const GENERATION_BUDGET_MS = 120;

const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

/**
 * Make a puzzle with exactly one solution. Clues are removed in random order, keeping each removal only
 * if the puzzle still has a single solution (Easy and Medium additionally stay solvable with singles
 * alone, which also proves uniqueness). The number of clues is set by the difficulty, and the finished
 * puzzle is rated with the singles solver: Hard must need more than naked singles, Expert more than any
 * singles, so the harder levels really are harder to solve by hand.
 */
export function generatePuzzle(difficulty: Difficulty, seed: number): Puzzle {
  const rng = mulberry32(seed);
  const solution = generateSolved(rng);
  const target = difficultyById(difficulty).givens;
  const start = now();
  const ok = (g: Int8Array) => {
    if (difficulty === "easy") return solveSingles(g, false).solved;
    if (difficulty === "medium") return solveSingles(g, true).solved;
    return countSolutions(g, 2) === 1;
  };
  // The rating each level is checked against: Hard needs more than naked singles, Expert more than any singles.
  const rated = (g: Int8Array) => {
    if (difficulty === "hard") return !solveSingles(g, false).solved;
    if (difficulty === "expert") return !solveSingles(g, true).solved;
    return true;
  };
  let best = Int8Array.from(solution);
  let bestN = 81;
  let bestRated = false;
  for (let attempt = 0; attempt < 12; attempt++) {
    const g = Int8Array.from(solution);
    let n = 81;
    for (const i of shuffle(rng, Array.from({ length: 81 }, (_, k) => k))) {
      if (n <= target) break;
      const v = g[i];
      g[i] = 0;
      if (ok(g)) n--;
      else g[i] = v;
      if (now() - start > GENERATION_BUDGET_MS) break;
    }
    const good = rated(g);
    if ((good && !bestRated) || (good === bestRated && n < bestN)) {
      best = g;
      bestN = n;
      bestRated = good;
    }
    if ((bestN <= target && bestRated) || now() - start > GENERATION_BUDGET_MS) break;
  }
  return { givens: best, solution, difficulty, seed };
}

// ---------------------------------------------------------------- game state

export interface Change {
  i: number;
  v0: number;
  n0: number;
  v1: number;
  n1: number;
}

export interface Game {
  puzzle: Puzzle;
  values: Int8Array;
  /** Pencil marks as a bitmask per cell. */
  notes: Uint16Array;
  /** Cells filled by a hint. */
  hinted: Uint8Array;
  mistakes: number;
  hintsUsed: number;
  elapsed: number;
  undoStack: Change[][];
  redoStack: Change[][];
  won: boolean;
}

export function newGame(puzzle: Puzzle): Game {
  return {
    puzzle, values: Int8Array.from(puzzle.givens), notes: new Uint16Array(81), hinted: new Uint8Array(81), mistakes: 0, hintsUsed: 0,
    elapsed: 0, undoStack: [], redoStack: [], won: false,
  };
}

export const isGiven = (g: Game, i: number) => g.puzzle.givens[i] !== 0;
export const isCorrect = (g: Game, i: number) => g.values[i] !== 0 && g.values[i] === g.puzzle.solution[i];

/** 1 for every filled cell whose digit also appears in a peer (a clash). */
export function conflicts(values: ArrayLike<number>): Uint8Array {
  const out = new Uint8Array(81);
  for (let i = 0; i < 81; i++) {
    const v = values[i];
    if (!v) continue;
    for (const j of PEERS[i]) {
      if (values[j] === v) {
        out[i] = 1;
        break;
      }
    }
  }
  return out;
}

/** How many times each digit is placed correctly (a pad button greys out at 9). */
export function digitCounts(g: Game): number[] {
  const out = new Array<number>(10).fill(0);
  for (let i = 0; i < 81; i++) if (isCorrect(g, i)) out[g.values[i]]++;
  return out;
}

export const isSolved = (g: Game) => {
  for (let i = 0; i < 81; i++) if (g.values[i] !== g.puzzle.solution[i]) return false;
  return true;
};

function apply(g: Game, changes: Change[]) {
  if (!changes.length) return;
  for (const c of changes) {
    g.values[c.i] = c.v1;
    g.notes[c.i] = c.n1;
  }
  g.undoStack.push(changes);
  g.redoStack = [];
}

export interface EnterResult {
  i: number;
  digit: number;
  correct: boolean;
  /** Units (row / column / box index) this move just finished. */
  completed: { rows: number[]; cols: number[]; boxes: number[] };
  won: boolean;
}

function unitComplete(g: Game, cells: number[]) {
  return cells.every((c) => g.values[c] === g.puzzle.solution[c]);
}

/** Put a digit in a cell. Clues can't be changed. A wrong digit counts as a mistake. */
export function enterDigit(g: Game, i: number, d: number): EnterResult | null {
  if (g.won || isGiven(g, i) || d < 1 || d > 9 || g.values[i] === d) return null;
  const correct = g.puzzle.solution[i] === d;
  const wasCorrect = isCorrect(g, i);
  const changes: Change[] = [{ i, v0: g.values[i], n0: g.notes[i], v1: d, n1: 0 }];
  if (correct) {
    // Pencil marks of this digit in the cells it now rules out are no longer needed.
    for (const j of PEERS[i]) if (g.notes[j] & BIT[d]) changes.push({ i: j, v0: g.values[j], n0: g.notes[j], v1: g.values[j], n1: g.notes[j] & ~BIT[d] });
  } else g.mistakes++;
  g.hinted[i] = 0;
  apply(g, changes);
  const completed = { rows: [] as number[], cols: [] as number[], boxes: [] as number[] };
  if (correct && !wasCorrect) {
    if (unitComplete(g, UNITS[ROW[i]])) completed.rows.push(ROW[i]);
    if (unitComplete(g, UNITS[9 + COL[i]])) completed.cols.push(COL[i]);
    if (unitComplete(g, UNITS[18 + BOX[i]])) completed.boxes.push(BOX[i]);
  }
  g.won = isSolved(g);
  return { i, digit: d, correct, completed, won: g.won };
}

/** Pencil a candidate in or out of an empty cell. */
export function toggleNote(g: Game, i: number, d: number): boolean {
  if (g.won || isGiven(g, i) || g.values[i] !== 0 || d < 1 || d > 9) return false;
  apply(g, [{ i, v0: 0, n0: g.notes[i], v1: 0, n1: g.notes[i] ^ BIT[d] }]);
  return true;
}

/** Clear a cell's digit and notes. */
export function erase(g: Game, i: number): boolean {
  if (g.won || isGiven(g, i) || (g.values[i] === 0 && g.notes[i] === 0)) return false;
  g.hinted[i] = 0;
  apply(g, [{ i, v0: g.values[i], n0: g.notes[i], v1: 0, n1: 0 }]);
  return true;
}

export const canUndo = (g: Game) => g.undoStack.length > 0;
export const canRedo = (g: Game) => g.redoStack.length > 0;

/** Take back the last action (mistakes and hints already used stay counted). Returns the cells touched. */
export function undo(g: Game): number[] | null {
  const changes = g.undoStack.pop();
  if (!changes) return null;
  for (let k = changes.length - 1; k >= 0; k--) {
    const c = changes[k];
    g.values[c.i] = c.v0;
    g.notes[c.i] = c.n0;
  }
  g.redoStack.push(changes);
  g.won = false;
  return changes.map((c) => c.i);
}

export function redo(g: Game): number[] | null {
  const changes = g.redoStack.pop();
  if (!changes) return null;
  for (const c of changes) {
    g.values[c.i] = c.v1;
    g.notes[c.i] = c.n1;
  }
  g.undoStack.push(changes);
  g.won = isSolved(g);
  return changes.map((c) => c.i);
}

export const hintsLeft = (g: Game) => MAX_HINTS - g.hintsUsed;

/**
 * Pick the cell a hint should fill: the selected cell if it is open or wrong, otherwise the easiest
 * next step (a single), otherwise the open cell with the fewest candidates.
 */
export function pickHintCell(g: Game, selected = -1): number {
  const open = (i: number) => !isGiven(g, i) && !isCorrect(g, i);
  if (selected >= 0 && open(selected)) return selected;
  // Work from the correct digits only, so a wrong entry can't mislead the hint.
  const clean = Int8Array.from(g.values, (v, i) => (v && v === g.puzzle.solution[i] ? v : 0));
  const single = nextSingle(clean, true);
  if (single && open(single.cell)) return single.cell;
  const cand = candidates(clean);
  let best = -1;
  let bestN = 10;
  for (let i = 0; i < 81; i++) {
    if (!open(i)) continue;
    const n = POP[cand[i]];
    if (n < bestN) {
      best = i;
      bestN = n;
    }
  }
  return best;
}

/** Fill one cell with its right digit. Returns the cell and digit, or null if no hints are left. */
export function takeHint(g: Game, selected = -1): { cell: number; digit: number } | null {
  if (g.won || g.hintsUsed >= MAX_HINTS) return null;
  const cell = pickHintCell(g, selected);
  if (cell < 0) return null;
  const digit = g.puzzle.solution[cell];
  const changes: Change[] = [{ i: cell, v0: g.values[cell], n0: g.notes[cell], v1: digit, n1: 0 }];
  for (const j of PEERS[cell]) if (g.notes[j] & BIT[digit]) changes.push({ i: j, v0: g.values[j], n0: g.notes[j], v1: g.values[j], n1: g.notes[j] & ~BIT[digit] });
  apply(g, changes);
  g.hinted[cell] = 1;
  g.hintsUsed++;
  g.won = isSolved(g);
  return { cell, digit };
}

// ---------------------------------------------------------------- saving

export interface SavedGame {
  givens: number[];
  solution: number[];
  difficulty: Difficulty;
  seed: number;
  values: number[];
  notes: number[];
  hinted: number[];
  mistakes: number;
  hintsUsed: number;
  elapsed: number;
}

export const serialize = (g: Game): SavedGame => ({
  givens: Array.from(g.puzzle.givens), solution: Array.from(g.puzzle.solution), difficulty: g.puzzle.difficulty, seed: g.puzzle.seed,
  values: Array.from(g.values), notes: Array.from(g.notes), hinted: Array.from(g.hinted), mistakes: g.mistakes, hintsUsed: g.hintsUsed,
  elapsed: g.elapsed,
});

const digitsArray = (a: unknown, lo: number, hi: number): a is number[] =>
  Array.isArray(a) && a.length === 81 && a.every((v) => Number.isInteger(v) && v >= lo && v <= hi);

/** Rebuild a game from a save, or null if it is damaged. */
export function restore(raw: unknown): Game | null {
  const d = raw as Partial<SavedGame> | null;
  if (!d || !digitsArray(d.givens, 0, 9) || !digitsArray(d.solution, 1, 9) || !digitsArray(d.values, 0, 9)) return null;
  if (!digitsArray(d.notes, 0, 511) || !digitsArray(d.hinted, 0, 1)) return null;
  if (!DIFFICULTIES.some((x) => x.id === d.difficulty) || typeof d.seed !== "number") return null;
  if (!isValidSolution(d.solution) || d.givens.some((v, i) => v && v !== d.solution![i]) || d.values.some((v, i) => d.givens![i] && v !== d.givens![i])) return null;
  const puzzle: Puzzle = { givens: Int8Array.from(d.givens), solution: Int8Array.from(d.solution), difficulty: d.difficulty as Difficulty, seed: d.seed };
  const g = newGame(puzzle);
  g.values = Int8Array.from(d.values);
  g.notes = Uint16Array.from(d.notes);
  g.hinted = Uint8Array.from(d.hinted);
  g.mistakes = Math.max(0, Math.floor(Number(d.mistakes) || 0));
  g.hintsUsed = Math.min(MAX_HINTS, Math.max(0, Math.floor(Number(d.hintsUsed) || 0)));
  g.elapsed = Math.max(0, Number(d.elapsed) || 0);
  if (isSolved(g)) return null;
  return g;
}

// ---------------------------------------------------------------- best times

export type Times = Partial<Record<Difficulty, number>>;

export function recordTime(times: Times, difficulty: Difficulty, seconds: number): { times: Times; isBest: boolean } {
  const prev = times[difficulty];
  if (prev !== undefined && prev <= seconds) return { times, isBest: false };
  return { times: { ...times, [difficulty]: seconds }, isBest: true };
}

export function cleanTimes(raw: unknown): Times {
  const out: Times = {};
  if (raw && typeof raw === "object") {
    for (const d of DIFFICULTIES) {
      const v = (raw as Record<string, unknown>)[d.id];
      if (typeof v === "number" && Number.isFinite(v) && v > 0) out[d.id] = v;
    }
  }
  return out;
}
