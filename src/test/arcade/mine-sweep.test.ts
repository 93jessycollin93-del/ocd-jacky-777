import { describe, it, expect } from "vitest";
import {
  FLAG, HIDDEN, LEVELS, OPEN, chord, cleanTimes, cleared, idxOf, levelById, mineReveals, minesLeft, neighbors, newBoard, recordTime,
  reveal, toggleFlag, type Board,
} from "@/arcade/games/mine-sweep/logic";

const [beginner, intermediate, expert] = LEVELS;
const countMines = (b: Board) => b.mine.reduce((s, v) => s + v, 0);

/** A tiny hand-made board: place mines at chosen cells and compute the numbers. */
function handBoard(cols: number, rows: number, mines: number[]): Board {
  const b = newBoard({ id: "beginner", label: "Test", cols, rows, mines: mines.length }, 1);
  for (const m of mines) b.mine[m] = 1;
  for (let i = 0; i < b.mine.length; i++) b.adj[i] = neighbors(b, i).reduce((s, n) => s + b.mine[n], 0);
  b.phase = "playing";
  return b;
}

describe("mine sweep", () => {
  it("offers the three classic boards", () => {
    expect(LEVELS.map((l) => [l.cols, l.rows, l.mines])).toEqual([[9, 9, 10], [16, 16, 40], [30, 16, 99]]);
    expect(levelById("expert").mines).toBe(99);
  });

  it("lays exactly the right number of mines, with correct counts", () => {
    for (const level of LEVELS) {
      const b = newBoard(level, 42);
      reveal(b, idxOf(b, 3, 3));
      expect(countMines(b)).toBe(level.mines);
      for (let i = 0; i < b.mine.length; i++) {
        expect(b.adj[i]).toBe(neighbors(b, i).filter((n) => b.mine[n]).length);
      }
    }
  });

  it("makes the first dig safe and opens an area, wherever you click", () => {
    for (const level of [beginner, intermediate, expert]) {
      for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
        for (const at of [0, level.cols - 1, level.cols * level.rows - 1, Math.floor((level.cols * level.rows) / 2)]) {
          const b = newBoard(level, seed);
          const r = reveal(b, at);
          expect(r.hitMine).toBe(false);
          expect(b.mine[at]).toBe(0);
          expect(b.adj[at]).toBe(0);
          expect(r.opened.length).toBeGreaterThanOrEqual(4);
          expect(b.phase).toBe("playing");
        }
      }
    }
  });

  it("flood-fills empty cells, stops at numbers, and never opens mines or flags", () => {
    // A strip of six: the fifth cell is a mine, so the flood stops at the number before it.
    const b = handBoard(6, 1, [4]);
    const r = reveal(b, 0);
    expect(r.opened.sort()).toEqual([0, 1, 2, 3]);
    expect(b.state[4]).toBe(HIDDEN);
    expect(b.state[5]).toBe(HIDDEN);
    expect(b.adj[3]).toBe(1);
    // A flagged cell blocks the flood.
    const c = handBoard(6, 1, [5]);
    toggleFlag(c, 2);
    const r2 = reveal(c, 0);
    expect(r2.opened.sort()).toEqual([0, 1]);
    expect(c.state[2]).toBe(FLAG);
    // depths ripple outward from the click
    const d = handBoard(6, 1, [4]);
    const r3 = reveal(d, 0);
    expect(r3.depth).toEqual([0, 1, 2, 3]);
  });

  it("flags only hidden cells, counts mines left, and won't open a flagged cell", () => {
    const b = handBoard(4, 4, [15]);
    expect(minesLeft(b)).toBe(1);
    expect(toggleFlag(b, 5)).toBe(true);
    expect(minesLeft(b)).toBe(0);
    expect(reveal(b, 5).opened).toHaveLength(0);
    expect(toggleFlag(b, 5)).toBe(true);
    expect(minesLeft(b)).toBe(1);
    reveal(b, 0);
    expect(b.state[0]).toBe(OPEN);
    expect(toggleFlag(b, 0)).toBe(false);
  });

  it("loses on a mine, reveals the rest, and marks wrong flags", () => {
    const b = handBoard(4, 1, [0, 3]);
    toggleFlag(b, 1); // wrong flag on a safe cell
    toggleFlag(b, 3); // right flag
    const r = reveal(b, 0);
    expect(r.hitMine).toBe(true);
    expect(b.phase).toBe("lost");
    expect(b.exploded).toBe(0);
    expect(b.wrongFlags).toEqual([1]);
    expect(mineReveals(b)).toEqual([]); // the other mine is already flagged; the blast cell is shown separately
    expect(reveal(b, 2).opened).toHaveLength(0); // game is over
  });

  it("chords: opens the neighbours when the flags match, does nothing when they don't", () => {
    const open = (b: Board, i: number) => {
      b.state[i] = OPEN;
      b.opened++;
    };
    // 3x3 with one mine in the corner; the centre shows a 1.
    const b = handBoard(3, 3, [0]);
    open(b, 4);
    expect(b.adj[4]).toBe(1);
    expect(chord(b, 4).opened).toHaveLength(0); // no flag yet
    toggleFlag(b, 1); // flag on the wrong cell is still "one flag" ... but it's a safe cell
    expect(chord(b, 4).hitMine).toBe(true); // so the chord opens the real mine and loses
    expect(b.wrongFlags).toEqual([1]);
    // Right flag: every other neighbour opens, and that clears the board.
    const c = handBoard(3, 3, [0]);
    open(c, 4);
    toggleFlag(c, 0);
    const r = chord(c, 4);
    expect(r.hitMine).toBe(false);
    expect(r.opened.sort()).toEqual([1, 2, 3, 5, 6, 7, 8]);
    expect(r.won).toBe(true);
    // A number that isn't open can't be chorded, and neither can a zero.
    const z = handBoard(3, 3, [0]);
    expect(chord(z, 4).opened).toHaveLength(0);
  });

  it("wins when every safe cell is open, flagging the remaining mines", () => {
    const b = handBoard(3, 1, [2]);
    const r = reveal(b, 0);
    expect(r.won).toBe(true);
    expect(b.phase).toBe("won");
    expect(b.state[2]).toBe(FLAG);
    expect(minesLeft(b)).toBe(0);
    expect(cleared(b)).toBe(1);
  });

  it("is repeatable from a seed", () => {
    const a = newBoard(intermediate, 99);
    const b = newBoard(intermediate, 99);
    reveal(a, 100);
    reveal(b, 100);
    expect(Array.from(a.mine)).toEqual(Array.from(b.mine));
    const c = newBoard(intermediate, 100);
    reveal(c, 100);
    expect(Array.from(c.mine)).not.toEqual(Array.from(a.mine));
  });

  it("keeps the fastest time per difficulty", () => {
    let t = recordTime({}, "beginner", 30);
    expect(t.isBest).toBe(true);
    t = recordTime(t.times, "beginner", 45);
    expect(t.isBest).toBe(false);
    expect(t.times.beginner).toBe(30);
    t = recordTime(t.times, "beginner", 20.5);
    expect(t.times.beginner).toBe(20.5);
    t = recordTime(t.times, "expert", 200);
    expect(t.times).toEqual({ beginner: 20.5, expert: 200 });
    expect(cleanTimes({ beginner: "x", intermediate: -3, expert: 99, junk: 1 })).toEqual({ expert: 99 });
    expect(cleanTimes(null)).toEqual({});
  });
});
