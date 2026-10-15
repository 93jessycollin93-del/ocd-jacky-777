// Connect-four rules on a 7x6 board. Pure TypeScript: the UI, the AI worker and the tests all share it.
// Cells are indexed row * COLS + col with row 0 at the bottom. Every one of the 69 possible four-cell
// windows keeps a count per player, so a move updates its wins and the AI's evaluation in a few steps.

export const COLS = 7;
export const ROWS = 6;
export const CELLS = COLS * ROWS;

/** 1 moves first (red), 2 moves second (yellow). 0 is an empty cell. */
export type Player = 1 | 2;
export const other = (p: Player): Player => (p === 1 ? 2 : 1);

// ---------------------------------------------------------------- windows
export const WINDOWS: number[][] = [];
export const CELL_WINDOWS: number[][] = Array.from({ length: CELLS }, () => []);
{
  const add = (cells: number[]) => {
    const id = WINDOWS.length;
    WINDOWS.push(cells);
    for (const c of cells) CELL_WINDOWS[c].push(id);
  };
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
        const er = r + dr * 3;
        const ec = c + dc * 3;
        if (er < 0 || er >= ROWS || ec < 0 || ec >= COLS) continue;
        add([0, 1, 2, 3].map((k) => (r + dr * k) * COLS + c + dc * k));
      }
    }
  }
}

export interface Board {
  cells: Int8Array;
  heights: Int8Array;
  /** Columns played so far, in order. */
  moves: number[];
  turn: Player;
  /** counts[(player - 1) * 69 + window]: how many of that player's discs sit in the window. */
  counts: Uint8Array;
  winner: Player | 0;
}

export function newBoard(): Board {
  return { cells: new Int8Array(CELLS), heights: new Int8Array(COLS), moves: [], turn: 1, counts: new Uint8Array(2 * WINDOWS.length), winner: 0 };
}

export const canPlay = (b: Board, col: number) => col >= 0 && col < COLS && b.heights[col] < ROWS && b.winner === 0;

export const isFull = (b: Board) => b.moves.length === CELLS;

/** Where a disc dropped in `col` would land (its row), or -1 if the column is full. */
export const landingRow = (b: Board, col: number) => (b.heights[col] < ROWS ? b.heights[col] : -1);

/** Drop a disc for the player to move. Returns the row it lands in, or -1 if the move is illegal. */
export function play(b: Board, col: number): number {
  if (!canPlay(b, col)) return -1;
  const row = b.heights[col]++;
  const cell = row * COLS + col;
  const p = b.turn;
  b.cells[cell] = p;
  const base = (p - 1) * WINDOWS.length;
  let won = false;
  for (const w of CELL_WINDOWS[cell]) if (++b.counts[base + w] === 4) won = true;
  if (won) b.winner = p;
  b.moves.push(col);
  b.turn = other(p);
  return row;
}

/** Take back the last disc. Returns the column it was in, or -1 if there is nothing to undo. */
export function undo(b: Board): number {
  const col = b.moves.pop();
  if (col === undefined) return -1;
  const row = --b.heights[col];
  const cell = row * COLS + col;
  const p = b.cells[cell] as Player;
  const base = (p - 1) * WINDOWS.length;
  for (const w of CELL_WINDOWS[cell]) b.counts[base + w]--;
  b.cells[cell] = 0;
  b.winner = 0;
  b.turn = p;
  return col;
}

/** Would the player to move win by dropping in `col`? */
export function winsAt(b: Board, col: number, p: Player = b.turn): boolean {
  if (b.heights[col] >= ROWS) return false;
  const cell = b.heights[col] * COLS + col;
  const base = (p - 1) * WINDOWS.length;
  for (const w of CELL_WINDOWS[cell]) if (b.counts[base + w] === 3) return true;
  return false;
}

/** The connected line (4 or more cells) through the last disc played, or null. Cells are indexes. */
export function winLine(b: Board): number[] | null {
  if (!b.winner || b.moves.length === 0) return null;
  const col = b.moves[b.moves.length - 1];
  const row = b.heights[col] - 1;
  const p = b.cells[row * COLS + col];
  for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
    const line = [row * COLS + col];
    for (const s of [1, -1]) {
      let r = row + dr * s;
      let c = col + dc * s;
      while (r >= 0 && r < ROWS && c >= 0 && c < COLS && b.cells[r * COLS + c] === p) {
        line.push(r * COLS + c);
        r += dr * s;
        c += dc * s;
      }
    }
    if (line.length >= 4) return line;
  }
  return null;
}

/** Build a board by playing columns in order (used by tests and by the AI worker). */
export function fromMoves(cols: number[]): Board {
  const b = newBoard();
  for (const c of cols) if (play(b, c) < 0) throw new Error(`illegal move ${c}`);
  return b;
}

/** Columns that can still be played. */
export const legalColumns = (b: Board) => (b.winner ? [] : [0, 1, 2, 3, 4, 5, 6].filter((c) => b.heights[c] < ROWS));
