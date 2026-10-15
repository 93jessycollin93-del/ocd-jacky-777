import { describe, it, expect } from "vitest";
import {
  SIZE, applyMove, cloneGrid, emptyGrid, hasMoves, maxTile, moveGrid, newGame, restore, serialize, slideLine, spawnTile, undo,
  type Grid,
} from "@/arcade/games/merge-2048/logic";

const grid = (rows: number[][]): Grid => rows.map((r) => r.slice());

describe("2048", () => {
  it("merges a tile at most once per move, starting from the side you move toward", () => {
    expect(slideLine([2, 2, 2, 2]).line).toEqual([4, 4, 0, 0]);
    expect(slideLine([2, 2, 2, 0]).line).toEqual([4, 2, 0, 0]);
    expect(slideLine([4, 2, 2, 0]).line).toEqual([4, 4, 0, 0]);
    expect(slideLine([2, 0, 2, 4]).line).toEqual([4, 4, 0, 0]);
    expect(slideLine([4, 4, 8, 0]).line).toEqual([8, 8, 0, 0]);
    expect(slideLine([2, 4, 2, 4]).line).toEqual([2, 4, 2, 4]);
    // The freshly merged tile doesn't merge again with the next equal one.
    expect(slideLine([2, 2, 4, 0]).line).toEqual([4, 4, 0, 0]);
  });

  it("merges toward the moving side in every direction", () => {
    const g = grid([
      [2, 2, 2, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);
    expect(moveGrid(g, "left").grid[0]).toEqual([4, 2, 0, 0]);
    expect(moveGrid(g, "right").grid[0]).toEqual([0, 0, 2, 4]); // the pair nearest the right wall merges first
    const col = grid([[2, 0, 0, 0], [2, 0, 0, 0], [2, 0, 0, 0], [0, 0, 0, 0]]);
    expect(moveGrid(col, "up").grid.map((r) => r[0])).toEqual([4, 2, 0, 0]);
    expect(moveGrid(col, "down").grid.map((r) => r[0])).toEqual([0, 0, 2, 4]);
  });

  it("scores the sum of the merged values", () => {
    const g = grid([
      [2, 2, 4, 4],
      [8, 8, 0, 0],
      [16, 0, 16, 0],
      [0, 0, 0, 0],
    ]);
    const r = moveGrid(g, "left");
    expect(r.gained).toBe(4 + 8 + 16 + 32);
    expect(r.biggestMerge).toBe(32);
    const s = newGame(1);
    s.grid = cloneGrid(g);
    applyMove(s, "left");
    expect(s.score).toBe(60);
  });

  it("describes where every tile went, for the slide animation", () => {
    const r = moveGrid(grid([[0, 2, 0, 2], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 4, 0]]), "left");
    const merged = r.moves.find((m) => m.merged);
    expect(merged).toEqual({ from: [[0, 1], [0, 3]], to: [0, 0], value: 4, merged: true });
    const lone = r.moves.find((m) => !m.merged);
    expect(lone).toEqual({ from: [[3, 2]], to: [3, 0], value: 4, merged: false });
  });

  it("doesn't spawn a tile when a move changes nothing", () => {
    const s = newGame(3);
    s.grid = grid([[2, 4, 8, 16], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
    const before = cloneGrid(s.grid);
    const t = applyMove(s, "left");
    expect(t.moved).toBe(false);
    expect(t.spawn).toBeNull();
    expect(s.grid).toEqual(before);
    expect(s.prev).toBeNull();
    // A move that does change the board spawns exactly one tile.
    const t2 = applyMove(s, "down");
    expect(t2.moved).toBe(true);
    expect(s.grid.flat().filter(Boolean).length).toBe(5);
  });

  it("spawns a 2 about 90% of the time and a 4 about 10%", () => {
    let fours = 0;
    const n = 4000;
    for (let i = 0; i < n; i++) {
      const s = newGame(1000 + i);
      s.grid = emptyGrid();
      s.counter = i;
      const sp = spawnTile(s);
      expect(sp && [2, 4].includes(sp.value)).toBe(true);
      if (sp && sp.value === 4) fours++;
    }
    expect(fours / n).toBeGreaterThan(0.08);
    expect(fours / n).toBeLessThan(0.12);
    expect(newGame(5).grid.flat().filter(Boolean)).toHaveLength(2);
  });

  it("is over only when the board is full and nothing can merge", () => {
    const full = grid([[2, 4, 2, 4], [4, 2, 4, 2], [2, 4, 2, 4], [4, 2, 4, 2]]);
    expect(hasMoves(full)).toBe(false);
    full[3][3] = 4; // an equal neighbour appears
    expect(hasMoves(full)).toBe(true);
    // One hole left; sliding right fills it with a new tile and nothing can merge: game over.
    const s = newGame(2);
    s.grid = grid([[8, 16, 8, 16], [16, 8, 16, 8], [8, 16, 8, 16], [32, 64, 0, 32]]);
    const t = applyMove(s, "right");
    expect(t.moved).toBe(true);
    expect(s.over).toBe(true);
    expect(applyMove(s, "left").moved).toBe(false); // finished games take no more moves
    expect(undo(s)).toBe(true); // ...but the last move can be taken back
    expect(s.over).toBe(false);
  });

  it("flags the first 2048 as a win and lets you keep going", () => {
    const s = newGame(7);
    s.grid = grid([[1024, 1024, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
    const t = applyMove(s, "left");
    expect(t.won).toBe(true);
    expect(s.reached).toBe(true);
    expect(maxTile(s.grid)).toBe(2048);
    expect(s.over).toBe(false);
    // Another 2048 later is not announced again.
    s.grid = grid([[1024, 1024, 0, 0], [2048, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
    expect(applyMove(s, "left").won).toBe(false);
    expect(maxTile(s.grid)).toBeGreaterThanOrEqual(2048);
  });

  it("undoes exactly one move, restoring the grid, score and the next spawn", () => {
    const s = newGame(11);
    const grid0 = cloneGrid(s.grid);
    const firstMove = () => {
      for (const d of ["left", "up", "right", "down"] as const) {
        const t = applyMove(s, d);
        if (t.moved) return t;
      }
      return null;
    };
    const turn1 = firstMove();
    expect(turn1).toBeTruthy();
    expect(undo(s)).toBe(true);
    expect(s.grid).toEqual(grid0);
    expect(s.score).toBe(0);
    expect(undo(s)).toBe(false); // only one step back
    // Replaying the same move reproduces the same spawn.
    const again = firstMove();
    expect(again && again.spawn).toEqual(turn1 && turn1.spawn);
  });

  it("saves and restores a game in progress, and refuses a broken save", () => {
    const s = newGame(21);
    for (const d of ["left", "down", "right", "up", "left"] as const) applyMove(s, d);
    const back = restore(JSON.parse(JSON.stringify(serialize(s))));
    expect(back).not.toBeNull();
    expect(back!.grid).toEqual(s.grid);
    expect(back!.score).toBe(s.score);
    // The restored game keeps spawning the same tiles as the original would.
    const a = applyMove(s, "right");
    const b = applyMove(back!, "right");
    expect(b.spawn).toEqual(a.spawn);
    expect(restore({ grid: [[1, 2], [3, 4]], score: 0, seed: 1, counter: 0 })).toBeNull();
    expect(restore({ grid: [[3, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], score: 0, seed: 1, counter: 0 })).toBeNull();
    expect(restore(null)).toBeNull();
    expect(SIZE).toBe(4);
  });
});
