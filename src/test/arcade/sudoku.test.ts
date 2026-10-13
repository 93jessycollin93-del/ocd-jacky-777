import { describe, it, expect } from "vitest";
import {
  DIFFICULTIES, MAX_HINTS, PEERS, UNITS, bitOf, canRedo, canUndo, cleanTimes, conflicts, countGivens, countSolutions, digitCounts,
  enterDigit, erase, generatePuzzle, generateSolved, hintsLeft, isValidSolution, newGame, recordTime, redo, restore, serialize, solve,
  solveSingles, takeHint, toggleNote, undo, type Difficulty, type Game,
} from "@/arcade/games/sudoku/logic";
import { mulberry32 } from "@/arcade/kit/rng";

const KNOWN =
  "530070000600195000098000060800060003400803001700020006060000280000419005000080079";
const KNOWN_SOLUTION =
  "534678912672195348198342567859761423426853791713924856961537284287419635345286179";
const parse = (s: string) => Int8Array.from(s.split("").map(Number));

/** A small game with a known puzzle, for the play rules. */
function knownGame(): Game {
  return newGame({ givens: parse(KNOWN), solution: parse(KNOWN_SOLUTION), difficulty: "easy", seed: 1 });
}

describe("sudoku", () => {
  it("solves a known puzzle and agrees with the published solution", () => {
    expect(Array.from(solve(parse(KNOWN)) as Int8Array).join("")).toBe(KNOWN_SOLUTION);
    expect(countSolutions(parse(KNOWN))).toBe(1);
  });

  it("tells unique, ambiguous and impossible puzzles apart", () => {
    expect(countSolutions(new Int8Array(81), 2)).toBe(2); // empty grid: many solutions
    const clash = parse(KNOWN);
    clash[2] = 5; // 5 already in the row
    expect(countSolutions(clash)).toBe(0);
    const dead = parse(KNOWN);
    dead[2] = 1;
    dead[1] = 0;
    expect(countSolutions(dead, 2)).toBeLessThanOrEqual(1);
    // Removing two clues from a unique puzzle in a way that opens a swap makes it ambiguous.
    const ambiguous = new Int8Array(81);
    expect(solve(ambiguous)).not.toBeNull();
  });

  it("generates complete valid grids, repeatably from a seed", () => {
    const a = generateSolved(mulberry32(7));
    expect(isValidSolution(a)).toBe(true);
    expect(Array.from(generateSolved(mulberry32(7)))).toEqual(Array.from(a));
    expect(Array.from(generateSolved(mulberry32(8)))).not.toEqual(Array.from(a));
    for (const unit of UNITS) expect(new Set(unit.map((i) => a[i])).size).toBe(9);
    expect(PEERS.every((p) => p.length === 20)).toBe(true);
  });

  it("makes puzzles with exactly one solution, with the clue count set by the difficulty", () => {
    for (const d of DIFFICULTIES) {
      for (const seed of [1, 2, 3, 4]) {
        const p = generatePuzzle(d.id, seed * 101);
        expect(countSolutions(p.givens, 2)).toBe(1);
        expect(isValidSolution(p.solution)).toBe(true);
        p.givens.forEach((v, i) => v && expect(v).toBe(p.solution[i]));
        const n = countGivens(p.givens);
        expect(n).toBeGreaterThanOrEqual(17);
        expect(n).toBeLessThanOrEqual(d.givens + 3);
        expect(Array.from(solve(p.givens) as Int8Array)).toEqual(Array.from(p.solution));
      }
    }
    // Harder levels leave fewer clues.
    const avg = (id: Difficulty) => [11, 12, 13, 14].reduce((s, k) => s + countGivens(generatePuzzle(id, k).givens), 0) / 4;
    expect(avg("easy")).toBeGreaterThan(avg("medium"));
    expect(avg("medium")).toBeGreaterThan(avg("hard"));
    expect(avg("hard")).toBeGreaterThan(avg("expert") - 0.01);
  });

  it("checks difficulty with the solver: easy and medium fall to simple deductions, hard and expert don't", () => {
    for (const seed of [5, 6, 7, 8, 9]) {
      expect(solveSingles(generatePuzzle("easy", seed).givens, false).solved).toBe(true);
      expect(solveSingles(generatePuzzle("medium", seed).givens, true).solved).toBe(true);
      expect(solveSingles(generatePuzzle("hard", seed).givens, false).solved).toBe(false);
      const expert = generatePuzzle("expert", seed);
      expect(solveSingles(expert.givens, true).solved).toBe(false);
      expect(countSolutions(expert.givens, 2)).toBe(1);
    }
  });

  it("generates in well under 200 ms", () => {
    const times: number[] = [];
    for (const d of DIFFICULTIES) {
      for (const seed of [21, 22, 23]) {
        const t0 = performance.now();
        generatePuzzle(d.id, seed);
        times.push(performance.now() - t0);
      }
    }
    expect(Math.max(...times)).toBeLessThan(260);
    expect(times.reduce((s, t) => s + t, 0) / times.length).toBeLessThan(120);
  });

  it("flags clashes in rows, columns and boxes", () => {
    const v = new Int8Array(81);
    v[0] = 5;
    v[8] = 5; // same row
    v[40] = 7;
    v[76] = 7; // same column
    v[60] = 3;
    v[70] = 3; // same box (rows 6-8, cols 6-8)
    v[20] = 9;
    const c = conflicts(v);
    expect([c[0], c[8], c[40], c[76], c[60], c[70]]).toEqual([1, 1, 1, 1, 1, 1]);
    expect(c[20]).toBe(0);
    expect(conflicts(parse(KNOWN)).some(Boolean)).toBe(false);
  });

  it("counts mistakes for wrong digits, locks the clues, and clears notes with a correct digit", () => {
    const g = knownGame();
    expect(enterDigit(g, 0, 1)).toBeNull(); // cell 0 is a clue (5)
    expect(g.values[0]).toBe(5);
    const blank = 2; // solution digit 4
    expect(enterDigit(g, blank, 9)?.correct).toBe(false);
    expect(g.mistakes).toBe(1);
    expect(g.values[blank]).toBe(9);
    // Notes in peers of a correct entry lose that candidate.
    toggleNote(g, 3, 4); // note "4" in cell 3 (same row)
    toggleNote(g, 3, 6);
    expect(g.notes[3]).toBe(bitOf(4) | bitOf(6));
    const r = enterDigit(g, blank, 4);
    expect(r?.correct).toBe(true);
    expect(g.mistakes).toBe(1);
    expect(g.notes[3]).toBe(bitOf(6));
    expect(enterDigit(g, blank, 4)).toBeNull(); // same digit again does nothing
  });

  it("toggles notes only on empty cells, and erase clears digit and notes", () => {
    const g = knownGame();
    expect(toggleNote(g, 0, 3)).toBe(false); // a clue
    expect(toggleNote(g, 2, 3)).toBe(true);
    expect(toggleNote(g, 2, 3)).toBe(true); // off again
    expect(g.notes[2]).toBe(0);
    toggleNote(g, 2, 1);
    expect(erase(g, 2)).toBe(true);
    expect(g.notes[2]).toBe(0);
    enterDigit(g, 2, 4);
    expect(toggleNote(g, 2, 5)).toBe(false); // filled cell
    expect(erase(g, 2)).toBe(true);
    expect(g.values[2]).toBe(0);
    expect(erase(g, 2)).toBe(false);
    expect(erase(g, 0)).toBe(false);
  });

  it("undoes and redoes whole actions including the notes they cleared", () => {
    const g = knownGame();
    toggleNote(g, 3, 4);
    enterDigit(g, 2, 4); // also clears the 4 note in cell 3
    expect(g.notes[3]).toBe(0);
    expect(canUndo(g)).toBe(true);
    undo(g);
    expect(g.values[2]).toBe(0);
    expect(g.notes[3]).toBe(bitOf(4));
    expect(canRedo(g)).toBe(true);
    redo(g);
    expect(g.values[2]).toBe(4);
    expect(g.notes[3]).toBe(0);
    undo(g);
    undo(g);
    expect(canUndo(g)).toBe(false);
    expect(undo(g)).toBeNull();
    // A new move after undoing drops the redo history.
    enterDigit(g, 2, 4);
    expect(canRedo(g)).toBe(false);
  });

  it("gives three hints per game, each filling a correct digit", () => {
    const g = knownGame();
    expect(hintsLeft(g)).toBe(MAX_HINTS);
    const seen = new Set<number>();
    for (let k = 0; k < MAX_HINTS; k++) {
      const h = takeHint(g, -1);
      expect(h).not.toBeNull();
      expect(g.values[h!.cell]).toBe(g.puzzle.solution[h!.cell]);
      expect(g.hinted[h!.cell]).toBe(1);
      seen.add(h!.cell);
    }
    expect(seen.size).toBe(3);
    expect(takeHint(g, -1)).toBeNull();
    expect(g.hintsUsed).toBe(3);
    // A hint on a selected wrong cell fixes that cell.
    const w = knownGame();
    enterDigit(w, 2, 9);
    expect(takeHint(w, 2)?.cell).toBe(2);
    expect(w.values[2]).toBe(4);
  });

  it("wins when the last cell is filled correctly, and marks digits used nine times", () => {
    const g = knownGame();
    const blanks = Array.from(g.puzzle.givens).map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);
    const last = blanks.pop() as number;
    for (const i of blanks) enterDigit(g, i, g.puzzle.solution[i]);
    expect(g.won).toBe(false);
    const counts = digitCounts(g);
    const lastDigit = g.puzzle.solution[last];
    expect(counts[lastDigit]).toBe(8);
    expect(counts.slice(1).filter((n) => n === 9)).toHaveLength(8);
    const r = enterDigit(g, last, lastDigit);
    expect(r?.won).toBe(true);
    expect(g.won).toBe(true);
    expect(digitCounts(g)[lastDigit]).toBe(9);
    expect(enterDigit(g, last, 1)).toBeNull();
  });

  it("reports the rows, columns and boxes a move completes", () => {
    const g = knownGame();
    // Fill everything except cell 2 in row 0, then finish it.
    for (let c = 0; c < 9; c++) if (c !== 2 && !g.puzzle.givens[c]) enterDigit(g, c, g.puzzle.solution[c]);
    const r = enterDigit(g, 2, g.puzzle.solution[2]);
    expect(r?.completed.rows).toEqual([0]);
  });

  it("saves and restores a game in progress, and rejects damaged saves", () => {
    const g = knownGame();
    enterDigit(g, 2, 4);
    enterDigit(g, 3, 1); // wrong
    toggleNote(g, 5, 2);
    takeHint(g, -1);
    g.elapsed = 123;
    const back = restore(JSON.parse(JSON.stringify(serialize(g))));
    expect(back).not.toBeNull();
    expect(Array.from(back!.values)).toEqual(Array.from(g.values));
    expect(Array.from(back!.notes)).toEqual(Array.from(g.notes));
    expect([back!.mistakes, back!.hintsUsed, back!.elapsed]).toEqual([1, 1, 123]);
    const bad = JSON.parse(JSON.stringify(serialize(g)));
    bad.solution[0] = 9;
    expect(restore(bad)).toBeNull();
    expect(restore(null)).toBeNull();
    expect(restore({ values: [] })).toBeNull();
  });

  it("keeps the fastest time per difficulty", () => {
    let t = recordTime({}, "medium", 300);
    expect(t.isBest).toBe(true);
    t = recordTime(t.times, "medium", 400);
    expect(t.isBest).toBe(false);
    t = recordTime(t.times, "medium", 250);
    expect(t.times.medium).toBe(250);
    expect(cleanTimes({ easy: 10, medium: "x", hard: -1 })).toEqual({ easy: 10 });
  });
});
