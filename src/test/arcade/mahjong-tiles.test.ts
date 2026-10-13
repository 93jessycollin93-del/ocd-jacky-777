import { describe, it, expect } from "vitest";
import { LAYOUTS, extents, slotsOf } from "@/arcade/games/mahjong-tiles/layouts";
import {
  buildBoard, canPair, findMoves, freeTiles, hint, isFree, isStuck, isWon, newGame, removePair, replay, reshuffle, restart, undo,
  type Game,
} from "@/arcade/games/mahjong-tiles/logic";
import { KIND_COUNT, fullSet, kindName, matches, suitOf } from "@/arcade/games/mahjong-tiles/tiles";
import { mulberry32 } from "@/arcade/kit/rng";

const counts = (kinds: number[]) => {
  const m = new Map<number, number>();
  for (const k of kinds) m.set(k, (m.get(k) ?? 0) + 1);
  return m;
};

describe("mahjong tile set", () => {
  it("has the standard 144 tiles", () => {
    const set = fullSet();
    expect(set).toHaveLength(144);
    const c = counts(set);
    let suited = 0;
    for (let k = 0; k < 34; k++) {
      expect(c.get(k)).toBe(4);
      suited++;
    }
    expect(suited).toBe(34); // 3 suits x 9 + 4 winds + 3 dragons
    for (let k = 34; k < KIND_COUNT; k++) expect(c.get(k)).toBe(1);
    expect(set.filter((k) => suitOf(k) === "flower")).toHaveLength(4);
    expect(set.filter((k) => suitOf(k) === "season")).toHaveLength(4);
    expect(set.filter((k) => suitOf(k) === "wind")).toHaveLength(16);
    expect(set.filter((k) => suitOf(k) === "dragon")).toHaveLength(12);
    expect(new Set(Array.from({ length: KIND_COUNT }, (_, k) => kindName(k))).size).toBe(KIND_COUNT);
  });

  it("matches equal tiles, any flower with any flower and any season with any season", () => {
    expect(matches(0, 0)).toBe(true);
    expect(matches(0, 1)).toBe(false);
    expect(matches(34, 37)).toBe(true);
    expect(matches(38, 41)).toBe(true);
    expect(matches(34, 38)).toBe(false);
    expect(matches(27, 31)).toBe(false);
  });
});

describe("mahjong layouts", () => {
  it("has at least four layouts with unique ids, each stacked several layers high", () => {
    expect(LAYOUTS.length).toBeGreaterThanOrEqual(4);
    expect(new Set(LAYOUTS.map((l) => l.id)).size).toBe(LAYOUTS.length);
    for (const l of LAYOUTS) expect(l.layers.length).toBeGreaterThanOrEqual(3);
  });

  it("every layout has exactly 144 slots, in both orientations", () => {
    for (const l of LAYOUTS) {
      expect(slotsOf(l)).toHaveLength(144);
      expect(slotsOf(l, true)).toHaveLength(144);
    }
  });

  it("never overlaps two tiles on a layer, and supports every raised tile", () => {
    for (const l of LAYOUTS) {
      for (const rotated of [false, true]) {
        const s = slotsOf(l, rotated);
        for (let i = 0; i < s.length; i++) {
          let supported = s[i].z === 0;
          for (let j = 0; j < s.length; j++) {
            if (i === j) continue;
            const near = Math.abs(s[i].x - s[j].x) < 2 && Math.abs(s[i].y - s[j].y) < 2;
            if (near && s[i].z === s[j].z) throw new Error(`${l.id}: overlapping tiles at ${JSON.stringify(s[i])}`);
            if (near && s[j].z === s[i].z - 1) supported = true;
          }
          expect(supported).toBe(true);
        }
      }
    }
  });

  it("keeps every layout at most seven rows tall so tiles stay big on a phone", () => {
    for (const l of LAYOUTS) {
      const e = extents(slotsOf(l));
      expect(e.h).toBeLessThanOrEqual(15);
      expect(e.w).toBeLessThanOrEqual(36);
    }
  });

  it("rotating swaps the board's width and height", () => {
    const l = LAYOUTS[1];
    const a = extents(slotsOf(l));
    const b = extents(slotsOf(l, true));
    expect(b.w).toBe(a.h);
    expect(b.h).toBe(a.w);
  });
});

describe("mahjong free tiles", () => {
  it("is free only with nothing on top and a side open", () => {
    // Row of three on the bottom, one tile on top of the middle one.
    const slots = [
      { x: 0, y: 0, z: 0 }, { x: 2, y: 0, z: 0 }, { x: 4, y: 0, z: 0 }, { x: 2, y: 0, z: 1 },
    ];
    const board = buildBoard(slots);
    const gone = [false, false, false, false];
    expect(isFree(board, gone, 0)).toBe(true); // left end
    expect(isFree(board, gone, 2)).toBe(true); // right end
    expect(isFree(board, gone, 1)).toBe(false); // covered and boxed in
    expect(isFree(board, gone, 3)).toBe(true); // the top one
    gone[3] = true;
    expect(isFree(board, gone, 1)).toBe(false); // uncovered but still has a tile each side
    gone[0] = true;
    expect(isFree(board, gone, 1)).toBe(true); // left side open now
  });

  it("treats a half-tile offset tile as covering both tiles below", () => {
    const slots = [{ x: 0, y: 0, z: 0 }, { x: 2, y: 0, z: 0 }, { x: 1, y: 0, z: 1 }];
    const board = buildBoard(slots);
    expect(isFree(board, [false, false, false], 0)).toBe(false);
    expect(isFree(board, [false, false, false], 1)).toBe(false);
    expect(isFree(board, [false, false, true], 0)).toBe(true);
  });

  it("counts a neighbour offset by half a tile vertically as touching", () => {
    const slots = [{ x: 0, y: 0, z: 0 }, { x: 2, y: 1, z: 0 }, { x: -2, y: 0, z: 0 }];
    const board = buildBoard(slots);
    expect(isFree(board, [false, false, false], 0)).toBe(false);
    expect(isFree(board, [false, true, false], 0)).toBe(true);
  });

  it("leaves the layout's outer tiles free at the start", () => {
    for (const l of LAYOUTS) {
      const g = newGame(l, false, 5);
      const f = freeTiles(g);
      expect(f.length).toBeGreaterThanOrEqual(8);
      for (const i of f) expect(g.board.slots[i].z).toBeLessThanOrEqual(g.board.slots.reduce((m, s) => Math.max(m, s.z), 0));
    }
  });
});

describe("mahjong deals", () => {
  const seeds = [1, 2, 3, 42, 777];

  it("hands out the full tile set", () => {
    for (const l of LAYOUTS) {
      const g = newGame(l, false, 9);
      expect([...g.faces].sort((a, b) => a - b)).toEqual(fullSet().sort((a, b) => a - b));
    }
  });

  it("can always be solved by replaying its own order (every layout, both orientations, several seeds)", () => {
    for (const l of LAYOUTS) {
      for (const rotated of [false, true]) {
        for (const seed of seeds) {
          const g = newGame(l, rotated, seed);
          expect(g.solution).toHaveLength(72);
          expect(replay(g, g.solution)).toBe(true);
          expect(isWon(g)).toBe(true);
        }
      }
    }
  });

  it("is repeatable for a seed and different for different seeds", () => {
    const a = newGame(LAYOUTS[0], false, 11);
    const b = newGame(LAYOUTS[0], false, 11);
    const c = newGame(LAYOUTS[0], false, 12);
    expect(b.faces).toEqual(a.faces);
    expect(c.faces).not.toEqual(a.faces);
  });

  it("starts with something to play", () => {
    for (const l of LAYOUTS) for (const seed of seeds) expect(findMoves(newGame(l, false, seed)).length).toBeGreaterThan(0);
  });
});

describe("mahjong play", () => {
  const fresh = (): Game => newGame(LAYOUTS[0], false, 21);

  it("removes a matching free pair and refuses everything else", () => {
    const g = fresh();
    const [a, b] = g.solution[0];
    expect(canPair(g, a, b)).toBe(true);
    expect(canPair(g, a, a)).toBe(false);
    // A free tile with a different, non-matching face can't be paired with it.
    const other = freeTiles(g).find((i) => i !== a && i !== b && !matches(g.faces[i], g.faces[a]));
    expect(other).toBeDefined();
    expect(removePair(g, a, other!)).toBe(false);
    expect(g.remaining).toBe(144);
    // A covered tile can't be removed even if it matches.
    const covered = g.board.slots.findIndex((_, i) => !isFree(g.board, g.gone, i) && matches(g.faces[i], g.faces[a]));
    if (covered >= 0) expect(removePair(g, a, covered)).toBe(false);
    expect(removePair(g, a, b)).toBe(true);
    expect(g.remaining).toBe(142);
    expect(g.gone[a] && g.gone[b]).toBe(true);
  });

  it("undoes every move, one pair at a time, all the way back", () => {
    const g = fresh();
    const before = g.gone.slice();
    for (const [a, b] of g.solution.slice(0, 30)) removePair(g, a, b);
    expect(g.history).toHaveLength(30);
    let n = 0;
    while (undo(g)) n++;
    expect(n).toBe(30);
    expect(g.gone).toEqual(before);
    expect(g.remaining).toBe(144);
    expect(undo(g)).toBeNull();
  });

  it("restarts the first deal after shuffles and moves", () => {
    const g = fresh();
    const faces = g.faces.slice();
    for (const [a, b] of g.solution.slice(0, 10)) removePair(g, a, b);
    reshuffle(g, mulberry32(3));
    restart(g);
    expect(g.faces).toEqual(faces);
    expect(g.remaining).toBe(144);
    expect(replay(g, g.solution)).toBe(true);
  });

  it("finds playable pairs, and the hint is one of them", () => {
    const g = fresh();
    const moves = findMoves(g);
    expect(moves.length).toBeGreaterThan(0);
    for (const [a, b] of moves) expect(canPair(g, a, b)).toBe(true);
    const h = hint(g, mulberry32(1))!;
    expect(canPair(g, h[0], h[1])).toBe(true);
    expect(g.gone.every((x) => !x)).toBe(true); // the hint search leaves the board alone
  });

  it("notices when no moves are left", () => {
    const g = fresh();
    // Fake a position where the two free tiles don't match: give every free tile a unique face class.
    const f = freeTiles(g);
    f.forEach((i, k) => (g.faces[i] = k % 34));
    // Make sure no two free tiles share a class.
    const seen = new Set<number>();
    const unique = f.filter((i) => {
      const c = g.faces[i];
      if (seen.has(c)) return false;
      seen.add(c);
      return true;
    });
    // Hide the duplicates by removing them from play.
    for (const i of f) if (!unique.includes(i)) g.gone[i] = true;
    g.remaining = g.gone.filter((x) => !x).length;
    // Newly uncovered tiles could match; retry until stuck by also removing those from play.
    for (let guard = 0; guard < 200 && !isStuck(g) && findMoves(g).length; guard++) {
      const [a] = findMoves(g)[0];
      g.gone[a] = true;
      g.remaining--;
    }
    expect(findMoves(g)).toHaveLength(0);
    expect(isStuck(g)).toBe(true);
    expect(hint(g, mulberry32(1))).toBeNull();
  });
});

describe("mahjong shuffle", () => {
  it("keeps the same tiles on the same spots and stays solvable, mid-game", () => {
    for (const l of LAYOUTS) {
      const g = newGame(l, false, 8);
      for (const [a, b] of g.solution.slice(0, 20)) removePair(g, a, b);
      const alive = g.gone.map((x, i) => (x ? -1 : i)).filter((i) => i >= 0);
      const kindsBefore = alive.map((i) => g.faces[i]).sort((a, b) => a - b);
      const facesBefore = g.faces.slice();
      expect(reshuffle(g, mulberry32(99))).toBe(true);
      expect(alive.map((i) => g.faces[i]).sort((a, b) => a - b)).toEqual(kindsBefore);
      expect(g.faces).not.toEqual(facesBefore);
      expect(g.solution).toHaveLength(alive.length / 2);
      expect(replay(g, g.solution)).toBe(true);
    }
  });

  it("works after the player strays off the planned path, and after undo", () => {
    const g = newGame(LAYOUTS[2], false, 4);
    const rng = mulberry32(5);
    // Play 25 random legal moves (not the planned ones), then shuffle.
    for (let n = 0; n < 25; n++) {
      const moves = findMoves(g);
      if (!moves.length) break;
      const m = moves[Math.floor(rng() * moves.length)];
      removePair(g, m[0], m[1]);
    }
    expect(reshuffle(g, mulberry32(7))).toBe(true);
    // Undo two moves made before the shuffle. Both pairs were free in the position they come back to, so the
    // board is solved by playing them again (the one undone last first) and then the shuffle's own solution.
    const p1 = undo(g)!;
    const p2 = undo(g)!;
    expect(replay(g, [p2, p1, ...g.solution])).toBe(true);
  });

  it("refuses to shuffle a nearly empty board", () => {
    const g = newGame(LAYOUTS[0], false, 6);
    for (const [a, b] of g.solution.slice(0, 71)) removePair(g, a, b);
    expect(g.remaining).toBe(2);
    expect(reshuffle(g, mulberry32(1))).toBe(false);
  });
});
