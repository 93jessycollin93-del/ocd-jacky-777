import { describe, it, expect } from "vitest";
import {
  CREAM, DRAW_PLIES, RED, applyMove, countPieces, crowns, fromRows, getResult, legalMoves, newGame, sqName, type Player, type State,
} from "@/arcade/games/checkers/logic";
import { chooseMove, evaluate, LEVELS } from "@/arcade/games/checkers/ai";

const names = (s: State) => legalMoves(s).map((m) => m.path.map(sqName).join(">")).sort();
const sq = (name: string) => (8 - Number(name[1])) * 8 + (name.charCodeAt(0) - 97);

describe("checkers rules", () => {
  it("starts with 12 pieces each, red to move, and the 7 classic opening moves", () => {
    const s = newGame();
    expect(countPieces(s.board)).toEqual({ red: 12, cream: 12, redKings: 0, creamKings: 0 });
    expect(s.turn).toBe(RED);
    expect(legalMoves(s)).toHaveLength(7);
    expect(s.board[sq("a1")]).toBe(1); // bottom-left is a dark square holding a red man
    expect(s.board[sq("b1")]).toBe(0); // light squares stay empty
    expect(s.board[sq("b8")]).toBe(-1);
  });

  it("moves men diagonally forward only, and kings both ways", () => {
    const man = fromRows(["........", "........", "........", "........", "...r....", "........", "........", "........"]);
    expect(names(man)).toEqual(["d4>c5", "d4>e5"]);
    const king = fromRows(["........", "........", "........", "........", "...R....", "........", "........", "........"]);
    expect(names(king)).toEqual(["d4>c3", "d4>c5", "d4>e3", "d4>e5"]);
    const cream = fromRows(["........", "........", "..c.....", "........", "........", "........", "........", "........"], CREAM);
    expect(names(cream)).toEqual(["c6>b5", "c6>d5"]);
  });

  it("forces captures: when any jump exists, plain steps are illegal", () => {
    const s = fromRows(["........", "........", "........", "..c.....", "...r....", "......r.", "........", "........"]);
    expect(names(s)).toEqual(["d4>b6"]); // the other red man's steps are not allowed
    // A jump needs an empty square behind the victim.
    const blocked = fromRows(["........", "........", ".c......", "..c.....", "...r....", "........", "........", "........"]);
    expect(legalMoves(blocked).every((m) => m.captures.length === 0)).toBe(true);
  });

  it("chains multi-jumps in one turn and offers every route", () => {
    const two = fromRows(["........", "........", "..c.c...", "........", "..c.....", "...r....", "........", "........"]);
    const jumps = legalMoves(two);
    expect(jumps).toHaveLength(1);
    expect(jumps[0].path.map(sqName)).toEqual(["d3", "b5", "d7"]);
    expect(jumps[0].captures.map(sqName)).toEqual(["c4", "c6"]);
    const after = applyMove(two, jumps[0]);
    expect(countPieces(after.board).cream).toBe(1);
    expect(after.turn).toBe(CREAM);
    expect(after.sinceCapture).toBe(0);
    const fork = fromRows(["........", "........", "........", "........", "..c.c...", "...r....", "........", "........"]);
    expect(names(fork)).toEqual(["d3>b5", "d3>f5"]);
  });

  it("never jumps the same piece twice (a king circling four men lands back on its start)", () => {
    const s = fromRows(["........", "........", "..c.c...", "........", "..c.c...", "...R....", "........", "........"]);
    const jumps = legalMoves(s);
    expect(Math.max(...jumps.map((m) => m.captures.length))).toBe(4);
    for (const m of jumps) expect(new Set(m.captures).size).toBe(m.captures.length);
    const loop = jumps.find((m) => m.captures.length === 4)!;
    expect(loop.path[0]).toBe(loop.path[loop.path.length - 1]);
  });

  it("crowns a man on the far row, and a jump that crowns ends the turn", () => {
    const step = fromRows(["........", ".r......", "........", "........", "........", "........", "........", "........"]);
    const mv = legalMoves(step).find((m) => sqName(m.path[1]) === "a8")!;
    expect(crowns(step, mv)).toBe(true);
    expect(applyMove(step, mv).board[mv.path[1]]).toBe(2);
    expect(crowns(step, legalMoves(step).find((m) => sqName(m.path[1]) === "c8")!)).toBe(true);
    // The man jumps e7 and lands on d8 crowned; a king could now jump c7 backwards, but the turn ends.
    const stop = fromRows(["........", "..c.c...", ".....r..", "........", "........", "........", "........", "........"]);
    const jumps = legalMoves(stop);
    expect(jumps).toHaveLength(1);
    expect(jumps[0].path.map(sqName)).toEqual(["f6", "d8"]);
    expect(applyMove(stop, jumps[0]).board[sq("d8")]).toBe(2);
    // A king does keep going through the same geometry.
    const kingStop = fromRows(["........", "..c.c...", ".....R..", "........", "........", "........", "........", "........"]);
    expect(legalMoves(kingStop)[0].captures).toHaveLength(2);
  });

  it("ends the game when a side has no legal move, and draws after 40 moves without a capture", () => {
    const lost = fromRows(["........", "........", "........", "........", "........", "........", "........", "r......."], CREAM);
    expect(getResult(lost)).toMatchObject({ over: true, winner: RED, reason: "no-moves" });
    const blocked = fromRows(["c.......", ".r......", "..r.....", "........", "........", "........", "........", "........"], CREAM);
    expect(legalMoves(blocked)).toHaveLength(0);
    expect(getResult(blocked).winner).toBe(RED);
    const live = fromRows(["........", "........", "..R.....", "........", "........", "......C.", "........", "........"], RED, DRAW_PLIES - 2);
    expect(getResult(live).over).toBe(false);
    const next = applyMove(live, legalMoves(live)[0]);
    expect(next.sinceCapture).toBe(DRAW_PLIES - 1);
    expect(getResult({ ...next, sinceCapture: DRAW_PLIES })).toMatchObject({ over: true, winner: 0, reason: "draw-rule" });
  });
});

describe("checkers AI", () => {
  it("always returns a legal move, at every difficulty", () => {
    for (let level = 0; level < LEVELS.length; level++) {
      const s = newGame();
      const r = chooseMove(s, level, () => 0.5)!;
      expect(legalMoves(s).some((m) => m.path.join() === r.move.path.join())).toBe(true);
    }
    expect(chooseMove(fromRows(["........", "........", "........", "........", "........", "........", "........", "r......."], CREAM), 1)).toBeNull();
  });

  it("takes the double jump over the single one", () => {
    const s = fromRows(["........", "........", "..c.....", "........", "..c.c...", "...r....", "........", "........"]);
    expect(legalMoves(s)).toHaveLength(2);
    const r = chooseMove(s, 2)!;
    expect(r.move.captures).toHaveLength(2);
  });

  it("evaluates a position the same from either side's chair", () => {
    const red = fromRows(["...c....", "........", "........", "..c.....", "....r...", ".R......", "........", ".r......"]);
    const mirrored: State = {
      board: red.board.map((_, i) => -red.board[63 - i]),
      turn: CREAM as Player,
      sinceCapture: 0,
    };
    expect(evaluate(mirrored)).toBeCloseTo(evaluate(red), 6);
  });

  it("plays whole games between its own levels to a legal finish", () => {
    let s = newGame();
    let plies = 0;
    while (!getResult(s).over && plies < 200) {
      const r = chooseMove(s, 0, () => 0.37)!;
      expect(legalMoves(s).some((m) => m.path.join() === r.move.path.join())).toBe(true);
      s = applyMove(s, r.move);
      plies++;
    }
    expect(plies).toBeGreaterThan(8);
  });
});
