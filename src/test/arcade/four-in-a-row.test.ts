import { describe, it, expect } from "vitest";
import { CELLS, COLS, ROWS, canPlay, fromMoves, isFull, landingRow, newBoard, play, undo, winLine, winsAt } from "@/arcade/games/four-in-a-row/logic";
import { LEVELS, chooseColumn, evaluate } from "@/arcade/games/four-in-a-row/ai";

// A full 42-move game in which nobody ever connects four.
const DRAW = [6, 1, 0, 4, 4, 0, 0, 4, 6, 1, 6, 4, 5, 6, 1, 3, 0, 0, 1, 5, 6, 6, 5, 0, 5, 5, 3, 5, 4, 1, 2, 2, 4, 1, 3, 2, 3, 2, 2, 3, 2, 3];

describe("four in a row rules", () => {
  it("drops discs with gravity, alternating players, and refuses a full column", () => {
    const b = newBoard();
    expect(play(b, 3)).toBe(0);
    expect(play(b, 3)).toBe(1);
    expect(play(b, 3)).toBe(2);
    expect(b.cells[0 * COLS + 3]).toBe(1);
    expect(b.cells[1 * COLS + 3]).toBe(2);
    expect(b.turn).toBe(2);
    for (let i = 0; i < 3; i++) play(b, 3);
    expect(canPlay(b, 3)).toBe(false);
    expect(play(b, 3)).toBe(-1);
    expect(landingRow(b, 3)).toBe(-1);
    expect(landingRow(b, 0)).toBe(0);
    expect(b.moves).toHaveLength(6);
  });

  it("detects a win in each of the four directions", () => {
    // Horizontal: red along the bottom (columns 0-3), yellow stacking on top.
    let b = fromMoves([0, 0, 1, 1, 2, 2, 3]);
    expect(b.winner).toBe(1);
    expect(winLine(b)!.sort((x, y) => x - y)).toEqual([0, 1, 2, 3]);
    // Vertical: red stacks column 0 while yellow plays elsewhere.
    b = fromMoves([0, 1, 0, 1, 0, 1, 0]);
    expect(b.winner).toBe(1);
    expect(winLine(b)!.map((c) => Math.floor(c / COLS)).sort()).toEqual([0, 1, 2, 3]);
    // Diagonal rising to the right: red at (0,0) (1,1) (2,2) (3,3).
    b = fromMoves([0, 1, 1, 2, 3, 2, 2, 3, 6, 3, 3]);
    expect(b.winner).toBe(1);
    expect(winLine(b)!.sort((x, y) => x - y)).toEqual([0, 8, 16, 24]);
    // Diagonal falling to the right: red at (0,3) (1,2) (2,1) (3,0).
    b = fromMoves([3, 2, 2, 1, 6, 1, 1, 0, 6, 0, 5, 0, 0]);
    expect(b.winner).toBe(1);
    expect(winLine(b)!.sort((x, y) => x - y)).toEqual([3, 9, 15, 21]);
    // Yellow can win too, and a finished game accepts no more discs.
    b = fromMoves([0, 6, 1, 6, 2, 6, 5, 6]);
    expect(b.winner).toBe(2);
    expect(play(b, 3)).toBe(-1);
  });

  it("calls a full board with no line a draw", () => {
    const b = fromMoves(DRAW);
    expect(b.moves).toHaveLength(CELLS);
    expect(isFull(b)).toBe(true);
    expect(b.winner).toBe(0);
    expect(winLine(b)).toBeNull();
    expect(play(b, 0)).toBe(-1);
    for (let c = 0; c < COLS; c++) expect(b.heights[c]).toBe(ROWS);
  });

  it("undoes moves exactly, including a winning move", () => {
    const b = fromMoves([0, 1, 0, 1, 0, 1]);
    const snapshot = Array.from(b.cells).join();
    play(b, 0);
    expect(b.winner).toBe(1);
    expect(undo(b)).toBe(0);
    expect(b.winner).toBe(0);
    expect(b.turn).toBe(1);
    expect(Array.from(b.cells).join()).toBe(snapshot);
    expect(winsAt(b, 0)).toBe(true);
    expect(winsAt(b, 4)).toBe(false);
    expect(undo(newBoard())).toBe(-1);
  });
});

describe("four in a row AI", () => {
  it("takes an immediate win at every level", () => {
    // Red has three on the bottom row (0,1,2): column 3 wins. Yellow's discs are stacked harmlessly.
    for (let level = 0; level < LEVELS.length; level++) {
      const b = fromMoves([0, 6, 1, 6, 2, 5]);
      expect(chooseColumn(b, level)!.col).toBe(3);
    }
  });

  it("blocks an immediate threat on medium and hard", () => {
    // Yellow threatens the bottom row at column 3 (yellow on 0,1,2 after red scattered).
    const b = fromMoves([6, 0, 6, 1, 5, 2]);
    expect(b.turn).toBe(1);
    for (const level of [1, 2]) expect(chooseColumn(b, level)!.col).toBe(3);
    // And a vertical threat: yellow has three stacked in column 4.
    const v = fromMoves([0, 4, 1, 4, 6, 4]);
    for (const level of [1, 2]) expect(chooseColumn(v, level)!.col).toBe(4);
  });

  it("makes a winning double threat: an open three on the bottom row", () => {
    // Red holds columns 2 and 3 on the bottom with 1 and 4 open to either side; it must play 1 or 4 to
    // build an unstoppable open three (the AI sees it within its depth).
    const b = fromMoves([2, 2, 3, 3]);
    const r = chooseColumn(b, 2)!;
    expect([1, 4]).toContain(r.col);
    expect(r.score).toBeGreaterThan(5000);
  });

  it("always plays a legal column, never into a full one", () => {
    const b = fromMoves([3, 3, 3, 3, 3, 3]);
    for (let level = 0; level < LEVELS.length; level++) {
      const r = chooseColumn(b, level, () => 0.5)!;
      expect(canPlay(b, r.col)).toBe(true);
    }
    expect(chooseColumn(fromMoves(DRAW), 1)).toBeNull();
    expect(evaluate(newBoard(), 1)).toBe(0);
  });

  it("the AI beats a random opponent in a full game, going first or second", () => {
    for (const aiFirst of [true, false]) {
      const b = newBoard();
      let seed = 7;
      const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
      while (!b.winner && !isFull(b)) {
        const aiTurn = (b.turn === 1) === aiFirst;
        const col = aiTurn ? chooseColumn(b, 1, rnd)!.col : [0, 1, 2, 3, 4, 5, 6].filter((c) => canPlay(b, c))[Math.floor(rnd() * 7) % [0, 1, 2, 3, 4, 5, 6].filter((c) => canPlay(b, c)).length];
        play(b, col);
      }
      const aiPlayer = aiFirst ? 1 : 2;
      expect(b.winner).toBe(aiPlayer);
    }
  });
});
