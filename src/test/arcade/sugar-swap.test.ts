import { describe, it, expect } from "vitest";
import { LEVELS, type LevelDef } from "@/arcade/games/sugar-swap/levels";
import {
  CELLS, SIZE, MAX_CHAIN_MULT, finaleWave, findGroups, findMoves, frostingLeft, goalMet, hasMoves, hintMove, idx, isValidSwap,
  levelOver, newLevel, reshuffleIfStuck, shuffleBoard, specialFor, starsFor, trySwap,
  type GameState, type Kind, type Piece, type Step,
} from "@/arcade/games/sugar-swap/logic";

// ------------------------------------------------------------------ helpers

const FULL = Array(8).fill("oooooooo") as string[];
const base = (over: Partial<LevelDef> = {}): LevelDef => ({
  name: "test", moves: 20, colors: 6, goal: { type: "score", target: 1000 }, stars: [1000, 2000, 3000], layout: FULL, ...over,
});

/**
 * The background is the diagonal pattern (r + 2c) % 3: three colours, no matches, and no possible
 * matching swap. Colours 3, 4 and 5 never appear in it, so a scenario can drop them in without
 * accidental matches. Patch characters: 0-5 plain sweet, a-f row rocket, g-l column rocket, m-r burst
 * (bomb), P prism, N or C an ingredient.
 */
function pieceFor(s: GameState, ch: string): Piece {
  const id = s.nextId++;
  if (ch >= "0" && ch <= "5") return { id, color: Number(ch), kind: "normal" };
  const groups: [string, Kind][] = [["a", "rowRocket"], ["g", "colRocket"], ["m", "bomb"]];
  for (const [first, kind] of groups) {
    const n = ch.charCodeAt(0) - first.charCodeAt(0);
    if (n >= 0 && n < 6) return { id, color: n, kind };
  }
  if (ch === "P") return { id, color: 0, kind: "prism" };
  if (ch === "N") return { id, color: 0, kind: "ingredient" };
  if (ch === "C") return { id, color: 1, kind: "ingredient" };
  throw new Error(`bad patch ${ch}`);
}

type Patch = [row: number, col: number, ch: string];

function scene(patches: Patch[] = [], level: LevelDef = base()): GameState {
  const s = newLevel(level, 11);
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const i = idx(r, c);
      s.cells[i] = s.holes[i] ? null : { id: s.nextId++, color: (r + 2 * c) % 3, kind: "normal" };
    }
  }
  for (const [r, c, ch] of patches) s.cells[idx(r, c)] = pieceFor(s, ch);
  s.colors = 6;
  return s;
}

const clears = (steps: Step[]) => steps.filter((x): x is Extract<Step, { type: "clear" }> => x.type === "clear");
const poppedCells = (step: Extract<Step, { type: "clear" }>) => step.popped.map((p) => p.cell).sort((a, b) => a - b);
const rowOf = (r: number) => Array.from({ length: SIZE }, (_, c) => idx(r, c));
const colOf = (c: number) => Array.from({ length: SIZE }, (_, r) => idx(r, c));
const rect = (r0: number, r1: number, c0: number, c1: number) => {
  const out: number[] = [];
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) out.push(idx(r, c));
  return out;
};
const sorted = (a: number[]) => [...new Set(a)].sort((x, y) => x - y);

// ------------------------------------------------------------------ match detection

describe("sugar swap: match detection", () => {
  it("finds horizontal and vertical runs of three and ignores pairs", () => {
    expect(findGroups(scene())).toHaveLength(0);
    const s = scene([[0, 0, "5"], [0, 1, "5"], [0, 2, "5"], [3, 7, "4"], [4, 7, "4"], [5, 7, "4"], [7, 0, "3"], [7, 1, "3"]]);
    const groups = findGroups(s);
    expect(groups).toHaveLength(2);
    const h = groups.find((g) => g.color === 5)!;
    expect(sorted(h.cells)).toEqual([idx(0, 0), idx(0, 1), idx(0, 2)]);
    expect(h.hasH && !h.hasV).toBe(true);
    const v = groups.find((g) => g.color === 4)!;
    expect(sorted(v.cells)).toEqual([idx(3, 7), idx(4, 7), idx(5, 7)]);
    expect(v.hasV && !v.hasH).toBe(true);
    expect(specialFor(h)).toBeNull();
  });

  it("joins crossing runs into one L-shaped group, and one T-shaped group", () => {
    const ell = findGroups(scene([[2, 0, "5"], [2, 1, "5"], [2, 2, "5"], [3, 0, "5"], [4, 0, "5"]]));
    expect(ell).toHaveLength(1);
    expect(ell[0].cells).toHaveLength(5);
    expect(ell[0].hasH && ell[0].hasV).toBe(true);
    expect(specialFor(ell[0])).toBe("bomb");

    const tee = findGroups(scene([[2, 3, "4"], [2, 4, "4"], [2, 5, "4"], [3, 4, "4"], [4, 4, "4"]]));
    expect(tee).toHaveLength(1);
    expect(tee[0].cells).toHaveLength(5);
    expect(specialFor(tee[0])).toBe("bomb");
  });

  it("names the special: four makes a rocket along the line, five makes a prism", () => {
    const four = findGroups(scene([[1, 0, "5"], [1, 1, "5"], [1, 2, "5"], [1, 3, "5"]]));
    expect(specialFor(four[0])).toBe("rowRocket");
    const fourV = findGroups(scene([[0, 6, "5"], [1, 6, "5"], [2, 6, "5"], [3, 6, "5"]]));
    expect(specialFor(fourV[0])).toBe("colRocket");
    const five = findGroups(scene([[5, 0, "5"], [5, 1, "5"], [5, 2, "5"], [5, 3, "5"], [5, 4, "5"]]));
    expect(specialFor(five[0])).toBe("prism");
  });
});

// ------------------------------------------------------------------ moves

describe("sugar swap: swapping", () => {
  it("swaps back (no move spent, board unchanged) when nothing matches", () => {
    const s = scene();
    const before = s.cells.slice();
    const steps = trySwap(s, idx(3, 3), idx(3, 4));
    expect(steps).toEqual([{ type: "swap", a: idx(3, 3), b: idx(3, 4), ok: false }]);
    expect(s.moves).toBe(20);
    expect(s.cells).toEqual(before);
  });

  it("only lets neighbours swap, and costs one move for a good swap", () => {
    const s = scene([[4, 0, "5"], [4, 1, "5"], [5, 2, "5"]]);
    expect(trySwap(s, idx(4, 0), idx(4, 2))).toEqual([]);
    expect(isValidSwap(s, idx(5, 2), idx(4, 2))).toBe(true);
    const steps = trySwap(s, idx(5, 2), idx(4, 2));
    expect(steps[0]).toMatchObject({ type: "swap", ok: true });
    expect(s.moves).toBe(19);
    expect(s.score).toBeGreaterThan(0);
  });

  it("finds legal moves and a hint that is one of them", () => {
    const s = scene([[4, 0, "5"], [4, 1, "5"], [5, 2, "5"]]);
    const moves = findMoves(s);
    expect(moves).toContainEqual([idx(4, 2), idx(5, 2)]);
    const hint = hintMove(s)!;
    expect(isValidSwap(s, hint[0], hint[1])).toBe(true);
  });
});

// ------------------------------------------------------------------ making specials

describe("sugar swap: making specials", () => {
  it("match 4 makes a rocket where you swapped (row for a row, column for a column)", () => {
    const row = scene([[4, 0, "5"], [4, 1, "5"], [4, 3, "5"], [5, 2, "5"]]);
    expect(findGroups(row)).toHaveLength(0);
    const first = clears(trySwap(row, idx(5, 2), idx(4, 2)))[0];
    expect(first.created).toHaveLength(1);
    expect(first.created[0].cell).toBe(idx(4, 2));
    expect(first.created[0].piece).toMatchObject({ kind: "rowRocket", color: 5 });
    expect(first.merges[0].to).toBe(idx(4, 2));

    const col = scene([[0, 6, "4"], [1, 6, "4"], [3, 6, "4"], [2, 5, "4"]]);
    const c1 = clears(trySwap(col, idx(2, 5), idx(2, 6)))[0];
    expect(c1.created[0].piece.kind).toBe("colRocket");
    expect(c1.created[0].cell).toBe(idx(2, 6));
  });

  it("an L or T shape makes an area bomb", () => {
    // Swapping the 5 above the corner down into (2,0) completes a row and a column at once: an L.
    const ell = scene([[2, 1, "5"], [2, 2, "5"], [3, 0, "5"], [4, 0, "5"], [1, 0, "5"]]);
    expect(findGroups(ell)).toHaveLength(0);
    const first = clears(trySwap(ell, idx(1, 0), idx(2, 0)))[0];
    expect(first.popped).toHaveLength(5);
    expect(first.created).toHaveLength(1);
    expect(first.created[0].piece).toMatchObject({ kind: "bomb", color: 5 });
    expect(first.created[0].cell).toBe(idx(2, 0));

    // A T: the stem meets the middle of the bar.
    const tee = scene([[2, 3, "4"], [2, 5, "4"], [3, 4, "4"], [4, 4, "4"], [1, 4, "4"]]);
    expect(findGroups(tee)).toHaveLength(0);
    const t1 = clears(trySwap(tee, idx(1, 4), idx(2, 4)))[0];
    expect(t1.created[0].piece.kind).toBe("bomb");
    expect(t1.popped).toHaveLength(5);
  });

  it("match 5 makes a prism", () => {
    const s = scene([[4, 0, "5"], [4, 1, "5"], [4, 3, "5"], [4, 4, "5"], [5, 2, "5"]]);
    const first = clears(trySwap(s, idx(5, 2), idx(4, 2)))[0];
    expect(first.created[0].piece.kind).toBe("prism");
    expect(first.created[0].cell).toBe(idx(4, 2));
  });
});

// ------------------------------------------------------------------ triggering specials

describe("sugar swap: triggering specials", () => {
  // A rocket (or burst) at (4,3) with a 5 below it and a 5 swapped in above it, so it is part of a match.
  const matchWith = (ch: string) => scene([[4, 3, ch], [5, 3, "5"], [3, 2, "5"]]);

  it("a rocket in a match clears its whole row", () => {
    const s = matchWith("f");
    const steps = trySwap(s, idx(3, 2), idx(3, 3));
    const first = clears(steps)[0];
    expect(first.effects.some((e) => e.type === "rocket" && e.dir === "row")).toBe(true);
    expect(sorted(rowOf(4)).every((c) => poppedCells(first).includes(c))).toBe(true);
  });

  it("a column rocket clears its whole column", () => {
    const s = matchWith("l");
    const first = clears(trySwap(s, idx(3, 2), idx(3, 3)))[0];
    expect(first.effects.some((e) => e.type === "rocket" && e.dir === "col")).toBe(true);
    expect(colOf(3).every((c) => poppedCells(first).includes(c))).toBe(true);
  });

  it("a burst in a match clears the 3×3 around it", () => {
    const s = matchWith("r");
    const first = clears(trySwap(s, idx(3, 2), idx(3, 3)))[0];
    expect(first.effects.some((e) => e.type === "bomb")).toBe(true);
    expect(rect(3, 5, 2, 4).every((c) => poppedCells(first).includes(c))).toBe(true);
  });

  it("a prism swapped with a sweet clears every sweet of that colour", () => {
    const s = scene([[4, 3, "P"]]);
    const other = s.cells[idx(4, 4)]!;
    const same = s.cells.filter((p) => p && p.kind === "normal" && p.color === other.color).length;
    const steps = trySwap(s, idx(4, 3), idx(4, 4));
    const first = clears(steps)[0];
    expect(first.effects[0].type).toBe("prism");
    // Every sweet of that colour, plus the prism itself.
    expect(first.popped).toHaveLength(same + 1);
    expect(first.popped.every((p) => p.piece.kind === "prism" || p.piece.color === other.color)).toBe(true);
  });

  it("chains specials: a rocket caught in another rocket's line fires too", () => {
    const s = scene([[4, 3, "f"], [5, 3, "5"], [3, 2, "5"], [4, 6, "l"]]);
    const first = clears(trySwap(s, idx(3, 2), idx(3, 3)))[0];
    const rockets = first.effects.filter((e) => e.type === "rocket");
    expect(rockets).toHaveLength(2);
    expect(colOf(6).every((c) => poppedCells(first).includes(c))).toBe(true);
  });
});

describe("sugar swap: combining two specials", () => {
  const combo = (a: string, b: string) => {
    const s = scene([[3, 3, a], [3, 4, b]]);
    expect(isValidSwap(s, idx(3, 3), idx(3, 4))).toBe(true);
    return clears(trySwap(s, idx(3, 3), idx(3, 4)))[0];
  };

  it("rocket + rocket clears a cross", () => {
    const first = combo("a", "g");
    expect(sorted(poppedCells(first))).toEqual(sorted([...rowOf(3), ...colOf(4)]));
  });

  it("burst + burst clears a 5×5 area", () => {
    const first = combo("m", "n");
    expect(sorted(poppedCells(first))).toEqual(sorted(rect(1, 5, 2, 6)));
    expect(first.effects[0]).toMatchObject({ type: "bomb", radius: 2 });
  });

  it("burst + rocket clears three rows and three columns", () => {
    const first = combo("m", "a");
    const expected = sorted([...rowOf(2), ...rowOf(3), ...rowOf(4), ...colOf(3), ...colOf(4), ...colOf(5)]);
    expect(sorted(poppedCells(first))).toEqual(expected);
  });

  it("prism + prism clears the whole board", () => {
    const first = combo("P", "P");
    expect(first.popped).toHaveLength(CELLS);
    expect(first.effects[0].type).toBe("nova");
  });

  it("prism + rocket turns that colour into rockets and fires them all", () => {
    const s = scene([[3, 3, "P"], [3, 4, "a"]]);
    const steps = trySwap(s, idx(3, 3), idx(3, 4));
    const t = steps.find((x) => x.type === "transform");
    expect(t).toBeTruthy();
    const first = clears(steps)[0];
    const rocketFx = first.effects.filter((e) => e.type === "rocket");
    expect(rocketFx.length).toBeGreaterThan(3);
    expect(first.popped.length).toBeGreaterThan(30);
  });
});

// ------------------------------------------------------------------ cascades, gravity, shuffle

describe("sugar swap: cascades", () => {
  it("falling sweets can match again, with a growing chain multiplier", () => {
    // Clearing row 3 drops the 4 above column 0 onto the 4s below it: a second match.
    const s = scene([[3, 0, "5"], [3, 1, "5"], [4, 2, "5"], [2, 0, "4"], [4, 0, "4"], [5, 0, "4"]]);
    expect(findGroups(s)).toHaveLength(0);
    const cs = clears(trySwap(s, idx(3, 2), idx(4, 2)));
    expect(cs.length).toBeGreaterThanOrEqual(2);
    expect(cs[0].chain).toBe(1);
    expect(cs[1].chain).toBe(2);
    expect(cs[0].points).toBe(60);
    expect(cs[1].points).toBeGreaterThanOrEqual(120);
    expect(poppedCells(cs[1])).toEqual(expect.arrayContaining([idx(3, 0), idx(4, 0), idx(5, 0)]));
    expect(s.score).toBe(cs.reduce((n, c) => n + c.points, 0));
  });

  it("caps the chain multiplier", () => {
    expect(MAX_CHAIN_MULT).toBeGreaterThanOrEqual(3);
    let seen = 0;
    for (let seed = 1; seed <= 60 && !seen; seed++) {
      const s = newLevel(LEVELS[0], seed);
      for (let k = 0; k < 8; k++) {
        const m = hintMove(s);
        if (!m) break;
        for (const c of clears(trySwap(s, m[0], m[1]))) {
          expect(c.chain).toBeLessThanOrEqual(MAX_CHAIN_MULT);
          seen = Math.max(seen, c.chain);
        }
      }
    }
    expect(seen).toBeGreaterThanOrEqual(2);
  });

  it("always settles into a full board with no matches and a move to make", () => {
    for (let seed = 1; seed <= 25; seed++) {
      const s = newLevel(LEVELS[seed % 6], seed);
      for (let k = 0; k < 10 && !levelOver(s); k++) {
        const m = hintMove(s);
        expect(m).not.toBeNull();
        const steps = trySwap(s, m![0], m![1]);
        expect(steps.length).toBeGreaterThan(0);
        for (let i = 0; i < CELLS; i++) {
          if (s.holes[i]) expect(s.cells[i]).toBeNull();
          else expect(s.cells[i]).not.toBeNull();
        }
        expect(findGroups(s)).toHaveLength(0);
        if (!levelOver(s)) expect(hasMoves(s)).toBe(true);
        // Every clear is followed by gravity.
        steps.forEach((st, i) => {
          if (st.type === "clear") expect(steps[i + 1]?.type).toBe("fall");
        });
      }
    }
  });

  it("refills from above: new sweets list where they start", () => {
    const s = scene([[4, 0, "5"], [4, 1, "5"], [5, 2, "5"]]);
    const steps = trySwap(s, idx(5, 2), idx(4, 2));
    const fall = steps.find((x) => x.type === "fall") as Extract<Step, { type: "fall" }>;
    expect(fall.spawned.length).toBeGreaterThanOrEqual(3);
    for (const sp of fall.spawned) expect(sp.fromRow).toBeLessThan(0);
    // In a column the lowest new sweet starts highest.
    const col0 = fall.spawned.filter((x) => x.cell % SIZE === 0).sort((a, b) => b.cell - a.cell);
    for (let i = 1; i < col0.length; i++) expect(col0[i].fromRow).toBeGreaterThan(col0[i - 1].fromRow);
  });
});

describe("sugar swap: no moves and reshuffle", () => {
  it("spots a board with no legal swap", () => {
    const dead = scene();
    expect(hasMoves(dead)).toBe(false);
    expect(findMoves(dead)).toHaveLength(0);
    expect(hintMove(dead)).toBeNull();
    expect(hasMoves(scene([[4, 0, "5"], [4, 1, "5"], [5, 2, "5"]]))).toBe(true);
  });

  it("reshuffles a stuck board into one with moves and no ready-made matches, keeping every piece", () => {
    const s = scene();
    const ids = s.cells.map((p) => p!.id).sort((a, b) => a - b);
    const step = reshuffleIfStuck(s);
    expect(step?.type).toBe("shuffle");
    expect(findGroups(s)).toHaveLength(0);
    expect(hasMoves(s)).toBe(true);
    expect(s.cells.map((p) => p!.id).sort((a, b) => a - b)).toEqual(ids);
    // Nothing to do when there is a move, or the level is over.
    expect(reshuffleIfStuck(s)).toBeNull();
    const done = scene();
    done.moves = 0;
    expect(reshuffleIfStuck(done)).toBeNull();
  });

  it("shuffleBoard leaves ingredients and holes where they are", () => {
    const lvl = base({ goal: { type: "ingredients", count: 2 }, layout: ["ooooNooo".replace("N", "i"), ...FULL.slice(1, 3), "oo.oo.oo", ...FULL.slice(4)] });
    const s = scene([[0, 4, "N"]], lvl);
    const holes = s.holes.slice();
    shuffleBoard(s);
    expect(s.cells[idx(0, 4)]?.kind).toBe("ingredient");
    expect(s.holes).toEqual(holes);
    expect(s.cells[idx(3, 2)]).toBeNull();
  });
});

// ------------------------------------------------------------------ goals

describe("sugar swap: level goals", () => {
  it("score goal: stars come from the score, and the level only ends when moves run out", () => {
    const s = newLevel(LEVELS[0], 3);
    const [one, two, three] = s.level.stars;
    expect(starsFor(s)).toBe(0);
    s.score = one;
    expect(goalMet(s)).toBe(true);
    expect(levelOver(s)).toBe(false);
    expect(starsFor(s)).toBe(1);
    s.score = two;
    expect(starsFor(s)).toBe(2);
    s.score = three;
    expect(starsFor(s)).toBe(3);
    s.moves = 0;
    expect(levelOver(s)).toBe(true);
    const lost = newLevel(LEVELS[0], 3);
    lost.moves = 0;
    expect(levelOver(lost)).toBe(true);
    expect(starsFor(lost)).toBe(0);
  });

  it("frosting goal: matching on frosting chips it; thick frosting takes two", () => {
    const lvl = base({
      goal: { type: "frosting" }, stars: [1, 3000, 6000],
      layout: ["oooooooo", "oooooooo", "oooooooo", "oooooooo", "FFfooooo", "oooooooo", "oooooooo", "oooooooo"],
    });
    const s = scene([[4, 0, "5"], [4, 1, "5"], [5, 2, "5"]], lvl);
    expect(frostingLeft(s)).toBe(5);
    expect(goalMet(s)).toBe(false);
    const first = clears(trySwap(s, idx(5, 2), idx(4, 2)))[0];
    expect(first.frostingHit.sort((a, b) => a - b)).toEqual([idx(4, 0), idx(4, 1), idx(4, 2)]);
    expect(s.frosting[idx(4, 0)]).toBe(1);
    expect(s.frosting[idx(4, 1)]).toBe(1);
    expect(s.frosting[idx(4, 2)]).toBe(0);
    expect(frostingLeft(s)).toBe(2);
    expect(first.points).toBeGreaterThanOrEqual(60 + 3 * 100);
    // Clearing the rest finishes the goal and ends the level straight away.
    s.frosting.fill(0);
    expect(goalMet(s)).toBe(true);
    expect(levelOver(s)).toBe(true);
    expect(starsFor(s)).toBe(1);
  });

  it("ingredient goal: an ingredient leaves at the bottom once what is under it is cleared", () => {
    const lvl = base({ goal: { type: "ingredients", count: 1 }, stars: [1, 3000, 6000] });
    const s = scene([[6, 3, "N"], [7, 3, "5"], [7, 4, "5"], [6, 5, "5"]], lvl);
    s.spawnedIngredients = 1;
    expect(goalMet(s)).toBe(false);
    const steps = trySwap(s, idx(6, 5), idx(7, 5));
    const got = clears(steps).flatMap((c) => c.collected);
    expect(got).toHaveLength(1);
    expect(got[0].piece.kind).toBe("ingredient");
    expect(s.collected).toBe(1);
    expect(goalMet(s)).toBe(true);
    expect(s.cells.some((p) => p?.kind === "ingredient")).toBe(false);
    expect(levelOver(s)).toBe(true);
  });

  it("ingredients keep arriving until the goal count has been dropped", () => {
    const s = newLevel(LEVELS[3], 5); // Nut Drop
    expect(LEVELS[3].goal).toMatchObject({ type: "ingredients" });
    let seen = s.spawnedIngredients;
    for (let k = 0; k < 40 && !levelOver(s); k++) {
      const m = hintMove(s);
      if (!m) break;
      trySwap(s, m[0], m[1]);
      seen = Math.max(seen, s.spawnedIngredients);
    }
    const goal = s.level.goal as { count: number };
    expect(seen).toBeLessThanOrEqual(goal.count);
    expect(seen).toBeGreaterThanOrEqual(2);
  });

  it("the victory lap turns spare moves into rockets and finishes", () => {
    const s = newLevel(LEVELS[2], 4);
    s.frosting.fill(0);
    s.moves = 3;
    const before = s.score;
    let waves = 0;
    let sawRocket = false;
    for (let guard = 0; guard < 20; guard++) {
      const steps = finaleWave(s);
      if (!steps.length) break;
      waves++;
      if (steps.some((x) => x.type === "clear" && x.effects.some((e) => e.type === "rocket"))) sawRocket = true;
    }
    expect(waves).toBeGreaterThan(0);
    expect(sawRocket).toBe(true);
    expect(s.moves).toBe(0);
    expect(s.score).toBeGreaterThan(before);
  });
});

// ------------------------------------------------------------------ levels

describe("sugar swap: the levels", () => {
  it("has at least 20 levels, each with sane rules", () => {
    expect(LEVELS.length).toBeGreaterThanOrEqual(20);
    const names = new Set<string>();
    for (const lv of LEVELS) {
      names.add(lv.name);
      expect(lv.layout).toHaveLength(8);
      for (const row of lv.layout) expect(row).toHaveLength(8);
      expect(lv.moves).toBeGreaterThan(5);
      expect(lv.colors).toBeGreaterThanOrEqual(4);
      expect(lv.colors).toBeLessThanOrEqual(6);
      expect(lv.stars[0]).toBeLessThan(lv.stars[1]);
      expect(lv.stars[1]).toBeLessThan(lv.stars[2]);
      if (lv.goal.type === "frosting") expect(lv.layout.join("")).toMatch(/[fF]/);
      if (lv.goal.type === "ingredients") expect(lv.goal.count).toBeGreaterThanOrEqual(lv.layout.join("").split("i").length - 1);
    }
    expect(names.size).toBe(LEVELS.length);
    expect(LEVELS.some((l) => l.goal.type === "score")).toBe(true);
    expect(LEVELS.some((l) => l.goal.type === "frosting")).toBe(true);
    expect(LEVELS.some((l) => l.goal.type === "ingredients")).toBe(true);
  });

  it("deals every level a clean board with a move to make", () => {
    LEVELS.forEach((lv, i) => {
      for (const seed of [1, 2, 3]) {
        const s = newLevel(lv, seed * 17 + i);
        expect(findGroups(s)).toHaveLength(0);
        expect(hasMoves(s)).toBe(true);
        expect(s.moves).toBe(lv.moves);
        expect(goalMet(s)).toBe(false);
        s.cells.forEach((p, c) => (s.holes[c] ? expect(p).toBeNull() : expect(p).not.toBeNull()));
      }
    });
  });

  it("a plain greedy player can win the first level", () => {
    let wins = 0;
    for (let seed = 1; seed <= 6; seed++) {
      const s = newLevel(LEVELS[0], seed);
      for (let k = 0; k < 40 && !levelOver(s); k++) {
        const m = hintMove(s);
        if (!m) break;
        trySwap(s, m[0], m[1]);
      }
      if (goalMet(s)) wins++;
    }
    expect(wins).toBeGreaterThanOrEqual(4);
  });
});
