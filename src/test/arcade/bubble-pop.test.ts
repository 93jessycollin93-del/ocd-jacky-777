import { describe, it, expect } from "vitest";
import { mulberry32 } from "@/arcade/kit/rng";
import { LEVELS } from "@/arcade/games/bubble-pop/levels";
import {
  COLS, LOSE_ROW, ROW_H, ROWS, addTopRow, boardFromRows, centerOf, clampAngle, colorsOnBoard, countBubbles, emptyBoard,
  endlessStage, fallPoints, findFloating, hasLost, isCleared, land, launch, neighbors, newEndless, newLevelState, parityOf, pickColor,
  popPoints, reflectX, refillEndless, resolveLanding, rowLen, sameColorGroup, snapCell, stepShot, swapQueue, trace, allCells,
  type Board, type BubbleState,
} from "@/arcade/games/bubble-pop/logic";

// Letters: r=0 o=1 y=2 g=3 b=4 p=5
const R = 0, O = 1, Y = 2, G = 3, B = 4;

/** A level-mode state on a board built from rows, with a known loaded and next colour. */
function state(rows: string[], loaded = R, next = O, missesPerDrop = 0): BubbleState {
  const s = newLevelState({ name: "t", missesPerDrop, rows }, 5);
  s.board = boardFromRows(rows);
  s.loaded = loaded;
  s.next = next;
  return s;
}

const keys = (cells: { r: number; c: number }[]) => cells.map((c) => `${c.r},${c.c}`).sort();

describe("bubble pop: hex grid maths", () => {
  it("rows alternate between 11 and 10 bubbles, and short rows sit half a bubble in", () => {
    const b = emptyBoard(0);
    expect(rowLen(b, 0)).toBe(COLS);
    expect(rowLen(b, 1)).toBe(COLS - 1);
    expect(centerOf(b, 0, 0).x).toBeCloseTo(0.5);
    expect(centerOf(b, 1, 0).x).toBeCloseTo(1);
    expect(centerOf(b, 2, 0).y - centerOf(b, 1, 0).y).toBeCloseTo(ROW_H);
    expect(rowLen(emptyBoard(1), 0)).toBe(COLS - 1);
  });

  it("an inner bubble touches six neighbours, all exactly one diameter away", () => {
    const b = emptyBoard(0);
    for (const [r, c] of [[2, 4], [3, 4]] as const) {
      const ns = neighbors(b, r, c);
      expect(ns).toHaveLength(6);
      const me = centerOf(b, r, c);
      for (const n of ns) {
        const p = centerOf(b, n.r, n.c);
        expect(Math.hypot(p.x - me.x, p.y - me.y)).toBeCloseTo(1, 5);
      }
    }
    // Long row: the short-row neighbours are c-1 and c. Short row: the long-row neighbours are c and c+1.
    expect(keys(neighbors(b, 2, 4)).filter((k) => k.startsWith("1,"))).toEqual(["1,3", "1,4"]);
    expect(keys(neighbors(b, 3, 4)).filter((k) => k.startsWith("2,"))).toEqual(["2,4", "2,5"]);
  });

  it("neighbour relations are symmetric, and edges have fewer neighbours", () => {
    for (const parity of [0, 1] as const) {
      const b = emptyBoard(parity);
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < rowLen(b, r); c++) {
          for (const n of neighbors(b, r, c)) expect(neighbors(b, n.r, n.c)).toContainEqual({ r, c });
        }
      }
    }
    const b = emptyBoard(0);
    expect(neighbors(b, 0, 0)).toHaveLength(2); // the one to its right and the short-row cell below it
    expect(neighbors(b, 0, 0).some((n) => n.r < 0)).toBe(false);
    expect(neighbors(b, 2, 0).some((n) => n.c < 0)).toBe(false);
  });
});

describe("bubble pop: shots, walls and snapping", () => {
  it("bounces off the side walls, keeping the bubble inside", () => {
    expect(reflectX(0.3, -5)).toMatchObject({ bounced: true, vx: 5 });
    expect(reflectX(0.3, -5).x).toBeCloseTo(0.7);
    expect(reflectX(COLS - 0.2, 4).x).toBeCloseTo(COLS - 0.8);
    expect(reflectX(5, 3)).toEqual({ x: 5, vx: 3, bounced: false });

    const b = emptyBoard(0);
    const shot = launch(1, 10, Math.PI * 0.75, 26); // up and to the left
    let flying = "flying";
    for (let i = 0; i < 400 && flying === "flying" && shot.bounces === 0; i++) flying = stepShot(b, shot, 1 / 60);
    expect(shot.bounces).toBe(1);
    expect(shot.vx).toBeGreaterThan(0);
    expect(shot.x).toBeGreaterThanOrEqual(0.5);
    // It keeps going and eventually reaches the ceiling, always inside the walls.
    for (let i = 0; i < 600 && flying === "flying"; i++) {
      flying = stepShot(b, shot, 1 / 60);
      expect(shot.x).toBeGreaterThanOrEqual(0.5 - 1e-9);
      expect(shot.x).toBeLessThanOrEqual(COLS - 0.5 + 1e-9);
    }
    expect(flying).toBe("landed");
    expect(shot.y).toBeCloseTo(0.5);
  });

  it("the aim guide follows the same bounces as a real shot", () => {
    const b = emptyBoard(0);
    const t = trace(b, 5.5, 11, Math.PI / 4);
    expect(t.points.length).toBeGreaterThanOrEqual(3);
    expect(t.points[1].x).toBeCloseTo(COLS - 0.5); // first bounce is the right wall
    expect(t.points[t.points.length - 1].y).toBeCloseTo(0.5);
    expect(t.cell.r).toBe(0);
    // Straight up on an empty board ends in the top row, right above the shooter.
    const up = trace(b, 5.5, 11, Math.PI / 2);
    expect(up.points).toHaveLength(2);
    expect(up.cell).toEqual({ r: 0, c: 5 });
    expect(clampAngle(0)).toBeGreaterThan(0);
    expect(clampAngle(Math.PI)).toBeLessThan(Math.PI);
  });

  it("stops against a bubble and snaps into an empty cell beside it", () => {
    const b = boardFromRows(["rrrrrrrrrrr", "..........", "..........".padEnd(11, ".")]);
    const shot = launch(5.5, 8, Math.PI / 2);
    let st = "flying";
    for (let i = 0; i < 400 && st === "flying"; i++) st = stepShot(b, shot, 1 / 60);
    expect(st).toBe("landed");
    expect(shot.y).toBeGreaterThan(1.3); // stopped below row 0, not at the ceiling
    const cell = snapCell(b, shot.x, shot.y);
    expect(cell.r).toBe(1);
    expect(b.rows[cell.r][cell.c]).toBe(-1);
    // It sits directly under the hit bubble, in one of the two short-row cells touching it.
    expect([4, 5]).toContain(cell.c);
  });

  it("snaps to the ceiling row when nothing is in the way, and never into an unattached cell", () => {
    const b = emptyBoard(0);
    expect(snapCell(b, 3.4, 0.5)).toEqual({ r: 0, c: 3 }); // cell 3 is centred on x = 3.5
    const b2 = boardFromRows(["rr"]);
    const cell = snapCell(b2, 6, 3);
    expect(cell.r === 0 || neighbors(b2, cell.r, cell.c).some((n) => b2.rows[n.r][n.c] >= 0)).toBe(true);
  });
});

describe("bubble pop: popping and falling", () => {
  it("flood-fills a colour group across both kinds of row, and ignores other colours", () => {
    const b = boardFromRows(["rrgggbbbbbb", "ogbbbbbbbb", "ggybbbbbbbb"]);
    const g = sameColorGroup(b, 0, 2);
    // The three greens in row 0 plus the green at (1,1) which touches (0,2)? (1,1) sits under (0,1)/(0,2).
    expect(keys(g)).toEqual(expect.arrayContaining(["0,2", "0,3", "0,4", "1,1"]));
    expect(g.every((p) => b.rows[p.r][p.c] === G)).toBe(true);
    expect(sameColorGroup(b, 2, 2)).toHaveLength(1);
  });

  it("pops groups of three or more, but not two", () => {
    const three = boardFromRows(["rrr........", ".........."]);
    expect(resolveLanding(three, 0, 1).popped).toHaveLength(3);
    expect(isCleared(three)).toBe(true);
    const two = boardFromRows(["rr.........", ".........."]);
    const r2 = resolveLanding(two, 0, 0);
    expect(r2.popped).toHaveLength(0);
    expect(countBubbles(two)).toBe(2);
  });

  it("finds bubbles left hanging once their support pops, and drops them", () => {
    // A red trio in row 0 holds up a blue pair in row 1 (through (0,1)); nothing else touches the blues.
    const b = boardFromRows(["rrr........", ".bb......."]);
    expect(findFloating(b)).toHaveLength(0);
    const res = resolveLanding(b, 0, 0);
    expect(res.popped).toHaveLength(3);
    expect(keys(res.fallen)).toEqual(["1,1", "1,2"]);
    expect(isCleared(b)).toBe(true);
  });

  it("keeps bubbles that are still joined to the ceiling by another path", () => {
    const b = boardFromRows(["rrrbb......", ".bb......."]);
    const res = resolveLanding(b, 0, 0);
    expect(res.popped).toHaveLength(3);
    expect(res.fallen).toHaveLength(0); // (1,1) and (1,2) still touch the blues at (0,3)/(0,4)? (1,2) touches (0,2)->popped, (0,3)
    expect(countBubbles(b)).toBe(4);
  });

  it("scores pops by size and gives drop bonuses that grow", () => {
    expect(popPoints(3)).toBe(30);
    expect(popPoints(6)).toBeGreaterThan(popPoints(3) * 2 - 1);
    expect(fallPoints(1)).toBe(20);
    expect(fallPoints(3)).toBeGreaterThan(fallPoints(1) * 3);
  });
});

describe("bubble pop: landing, misses and the ceiling", () => {
  it("land() places the bubble, pops a matching group, scores it and loads the next colour", () => {
    const s = state(["rr.........", ".........."], R, O);
    const shotX = 2.5;
    const res = land(s, shotX, 0.5); // lands beside the pair in the top row
    expect(res.cell).toEqual({ r: 0, c: 2 });
    expect(res.popped).toHaveLength(3);
    expect(res.points).toBe(popPoints(3));
    expect(s.score).toBe(30);
    expect(s.misses).toBe(0);
    expect(res.cleared).toBe(true);
    expect(s.loaded).toBe(O);
  });

  it("counts misses and lowers the ceiling one row after N misses in a row", () => {
    const s = state(["rrgg.......", ".........."], R, R, 3);
    const before = s.board.rows.map((r) => r.slice());
    expect(land(s, 7.5, 0.5).dropped).toBe(false); // miss 1
    s.loaded = Y;
    expect(land(s, 9.5, 0.5).dropped).toBe(false); // miss 2
    s.loaded = O;
    const parity = s.board.topParity;
    const third = land(s, 10.5, 0.5);
    expect(third.dropped).toBe(true); // miss 3
    expect(s.misses).toBe(0);
    expect(s.drops).toBe(1);
    expect(s.board.topParity).toBe(1 - parity);
    // The old top row is now row 1 and keeps its shape.
    expect(s.board.rows[1].slice(0, 4)).toEqual(before[0].slice(0, 4));
    expect(parityOf(s.board, 1)).toBe(parity);
    expect(third.missesLeft).toBe(3);
  });

  it("a pop resets the miss counter", () => {
    const s = state(["rr.........", ".........."], Y, R, 3);
    land(s, 8.5, 0.5);
    expect(s.misses).toBe(1);
    s.loaded = R;
    land(s, 2.5, 0.5);
    expect(s.misses).toBe(0);
  });

  it("loses when a bubble reaches the bottom line, including when the ceiling pushes it there", () => {
    const rows: string[] = [];
    for (let r = 0; r < LOSE_ROW; r++) rows.push(r === 0 ? "gggggggggg." : r === LOSE_ROW - 1 ? "o.........." : ".".repeat(r % 2 ? 10 : 11));
    // Hang a column of bubbles down the left wall to row LOSE_ROW - 1.
    const b = emptyBoard(0);
    for (let r = 0; r < LOSE_ROW; r++) b.rows[r][0] = O;
    expect(hasLost(b)).toBe(false);
    const s = state(["o.........."]);
    s.board = b;
    s.missesPerDrop = 1;
    s.loaded = Y;
    const res = land(s, 6.5, 0.5);
    expect(res.dropped).toBe(true);
    expect(res.lost).toBe(true);
    expect(hasLost(s.board)).toBe(true);
    expect(rows).toHaveLength(LOSE_ROW);
  });

  it("addTopRow pushes a fresh row in and flips the row shape", () => {
    const s = state(["rrr........", ".........."]);
    s.mode = "endless";
    s.palette = 3;
    const lost = addTopRow(s);
    expect(lost).toBe(false);
    expect(s.board.topParity).toBe(1);
    expect(rowLen(s.board, 0)).toBe(COLS - 1);
    expect(s.board.rows[0].slice(0, COLS - 1).every((c) => c >= 0 && c < 3)).toBe(true);
    expect(s.board.rows[1].slice(0, 3)).toEqual([R, R, R]);
  });
});

describe("bubble pop: the next bubbles and difficulty", () => {
  it("only ever offers colours that are still on the board", () => {
    const s = state(["rrbb......."]);
    for (let i = 0; i < 50; i++) {
      s.rng = mulberry32(i + 1);
      const c = pickColor(s.board, s.rng);
      expect([R, B]).toContain(c);
    }
    // Clear every blue: the queued bubbles switch to a colour that's left.
    s.loaded = B;
    s.next = B;
    s.board.rows[0][2] = -1;
    s.board.rows[0][3] = -1;
    const res = land(s, 5.5, 0.5); // blue lands in a gap, board has red only... place a blue: loaded was B
    expect(res.cell.r).toBeGreaterThanOrEqual(0);
    expect(colorsOnBoard(s.board)).toContain(R);
    expect(s.loaded).not.toBe(G);
    expect(colorsOnBoard(s.board)).toContain(s.next);
  });

  it("swapping exchanges the loaded and next bubbles", () => {
    const s = state(["rrbb......."], R, B);
    swapQueue(s);
    expect([s.loaded, s.next]).toEqual([B, R]);
  });

  it("endless mode gets harder: more colours and a quicker ceiling", () => {
    const early = endlessStage(0);
    const late = endlessStage(150);
    expect(late.stage).toBeGreaterThan(early.stage);
    expect(late.palette).toBeGreaterThanOrEqual(early.palette);
    expect(late.palette).toBeLessThanOrEqual(6);
    expect(late.missesPerDrop).toBeLessThan(early.missesPerDrop);
    expect(late.missesPerDrop).toBeGreaterThanOrEqual(3);
  });

  it("a cleared endless board earns a bonus and a fresh start", () => {
    const s = newEndless(3);
    for (const p of allCells(s.board)) s.board.rows[p.r][p.c] = -1;
    expect(isCleared(s.board)).toBe(true);
    const before = s.score;
    const bonus = refillEndless(s);
    expect(bonus).toBeGreaterThan(0);
    expect(s.score).toBe(before + bonus);
    expect(countBubbles(s.board)).toBeGreaterThan(20);
    expect(colorsOnBoard(s.board)).toContain(s.loaded);
  });
});

describe("bubble pop: the ten levels", () => {
  it("has ten valid, fully connected levels", () => {
    expect(LEVELS).toHaveLength(10);
    for (const lv of LEVELS) {
      const b: Board = boardFromRows(lv.rows);
      lv.rows.forEach((row, r) => expect(row.length).toBe(rowLen(b, r)));
      expect(countBubbles(b)).toBeGreaterThan(30);
      expect(findFloating(b)).toHaveLength(0);
      expect(colorsOnBoard(b).length).toBeGreaterThanOrEqual(3);
      expect(hasLost(b)).toBe(false);
      const s = newLevelState(lv, 1);
      expect(colorsOnBoard(b)).toContain(s.loaded);
      expect(colorsOnBoard(b)).toContain(s.next);
    }
    expect(new Set(LEVELS.map((l) => l.name)).size).toBe(10);
    // Later levels are harder: the ceiling comes down sooner.
    const first = LEVELS.filter((l) => l.missesPerDrop > 0)[0];
    expect(LEVELS[9].missesPerDrop).toBeLessThan(first.missesPerDrop);
  });

  it("can be cleared by shooting well: a scripted player empties level 1", () => {
    const s = newLevelState(LEVELS[0], 9);
    // Greedy bot: try angles, pick the one that pops the most (or the lowest bubbles), up to 80 shots.
    for (let shot = 0; shot < 80 && !isCleared(s.board) && !hasLost(s.board); shot++) {
      let bestAngle = Math.PI / 2;
      let bestScore = -1;
      for (let a = 0.25; a < Math.PI - 0.25; a += 0.03) {
        const t = trace(s.board, COLS / 2, LOSE_ROW * ROW_H + 1.5, a);
        const copy = s.board.rows.map((r) => r.slice());
        const b2: Board = { rows: copy, topParity: s.board.topParity };
        b2.rows[t.cell.r][t.cell.c] = s.loaded;
        const res = resolveLanding(b2, t.cell.r, t.cell.c);
        const value = res.popped.length * 10 + res.fallen.length * 20 - t.cell.r * 0.01;
        if (value > bestScore) {
          bestScore = value;
          bestAngle = a;
        }
      }
      const t = trace(s.board, COLS / 2, LOSE_ROW * ROW_H + 1.5, bestAngle);
      land(s, launchEndX(t), t.points[t.points.length - 1].y);
    }
    expect(isCleared(s.board)).toBe(true);
  });
});

function launchEndX(t: { points: { x: number; y: number }[] }) {
  return t.points[t.points.length - 1].x;
}

// A final sanity check that a fired bubble matches what the guide promised.
describe("bubble pop: shot matches guide", () => {
  it("a real shot ends in the cell the aim guide showed", () => {
    const b = boardFromRows(LEVELS[2].rows);
    for (const angle of [0.6, 1.1, Math.PI / 2, 2.2]) {
      const t = trace(b, COLS / 2, 11, angle);
      const shot = launch(COLS / 2, 11, clampAngle(angle));
      let st = "flying";
      for (let i = 0; i < 4000 && st === "flying"; i++) st = stepShot(b, shot, 1 / 120);
      expect(snapCell(b, shot.x, shot.y)).toEqual(t.cell);
    }
  });
});
