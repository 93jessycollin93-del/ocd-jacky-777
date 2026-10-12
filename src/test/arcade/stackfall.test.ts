import { describe, it, expect } from "vitest";
import {
  COLS, HIDDEN, LOCK_DELAY, MAX_LOCK_RESETS, PIECES, ROWS, SHAPES, cellsOf, collides, ghostY, gravityInterval, hardDrop,
  holdPiece, isGrounded, kicksFor, levelForLines, move, newGame, newRepeat, repeatSteps, rotate, softDropStep, update,
  upcoming, type PieceType, type StackState,
} from "@/arcade/games/stackfall/logic";

/** Fill a row of the well except for the given columns. */
function fillRow(s: StackState, y: number, gaps: number[] = []) {
  for (let x = 0; x < COLS; x++) if (!gaps.includes(x)) s.board[y * COLS + x] = 1;
}

/** Put a specific piece at a spot, without touching anything else. */
function place(s: StackState, type: PieceType, x: number, y: number, rot: 0 | 1 | 2 | 3 = 0) {
  s.cur = { type, rot, x, y };
  s.fallAcc = 0;
  s.lockTimer = 0;
  s.lockResets = 0;
  s.lowest = y;
}

/** Stand an I piece flat on the bottom, with its cells over columns x..x+3. */
function flatIOnFloor(s: StackState, x = 0) {
  place(s, "I", x, ROWS - 2);
}

/**
 * Fill the bottom n rows except column 9, drop a standing I piece into the gap, and report the points
 * the line clear alone was worth (hard-drop points removed).
 */
function clearLines(s: StackState, n: number) {
  for (let k = 0; k < n; k++) fillRow(s, ROWS - 1 - k, [9]);
  place(s, "I", 7, 3, 1);
  const before = s.score;
  const ev = hardDrop(s);
  const clear = ev.find((e) => e.type === "clear");
  const drop = ev.find((e) => e.type === "harddrop");
  const dropPts = drop && drop.type === "harddrop" ? drop.dist * 2 : 0;
  return {
    gained: s.score - before - dropPts,
    lines: clear && clear.type === "clear" ? clear.lines : 0,
    b2b: !!(clear && clear.type === "clear" && clear.b2b),
  };
}

describe("stackfall", () => {
  it("deals pieces from a 7-bag: every seven in a row holds each piece once", () => {
    const first = newGame(11);
    const stream = [first.cur.type, ...first.queue];
    expect([...stream.slice(0, 7)].sort()).toEqual([...PIECES].sort());
    expect([...stream.slice(7, 14)].sort()).toEqual([...PIECES].sort());
    // Play through several bags: the stream (current piece, then the queue as it is consumed) stays balanced.
    const s = newGame(21);
    const dealt: PieceType[] = [s.cur.type];
    for (let i = 0; i < 20 && s.alive; i++) {
      place(s, s.cur.type, 3, 0);
      s.board.fill(0);
      hardDrop(s);
      dealt.push(s.cur.type);
    }
    for (let bag = 0; bag + 7 <= dealt.length; bag += 7) expect([...dealt.slice(bag, bag + 7)].sort()).toEqual([...PIECES].sort());
    expect(upcoming(newGame(3))).toHaveLength(5);
  });

  it("has four cells in every rotation of every piece, and the square never changes", () => {
    for (const t of PIECES) for (const r of [0, 1, 2, 3] as const) expect(SHAPES[t][r]).toHaveLength(4);
    expect(SHAPES.O[1]).toEqual(SHAPES.O[0]);
    // T clockwise matches the published right-hand state.
    expect([...SHAPES.T[1]].sort()).toEqual([[1, 0], [1, 1], [1, 2], [2, 1]].sort());
    // I lies flat in row 1 and stands up in column 2.
    expect(SHAPES.I[0].every(([, y]) => y === 1)).toBe(true);
    expect(SHAPES.I[1].every(([x]) => x === 2)).toBe(true);
  });

  it("stops at the walls, and can't move into settled blocks", () => {
    const s = newGame(1);
    place(s, "O", 3, 5);
    for (let i = 0; i < 12; i++) move(s, -1);
    expect(Math.min(...cellsOf(s.cur).map(([x]) => x))).toBe(0);
    expect(move(s, -1)).toBe(false);
    s.board[5 * COLS + 3] = 1;
    place(s, "O", 0, 5); // O occupies columns 1-2
    expect(move(s, 1)).toBe(false);
  });

  it("kicks a vertical I piece off the wall when turning", () => {
    const s = newGame(1);
    place(s, "I", -2, 5, 1); // vertical, hugging the left wall (column 0)
    expect(cellsOf(s.cur).every(([x]) => x === 0)).toBe(true);
    expect(rotate(s, 1)).toBe(true);
    const xs = cellsOf(s.cur).map(([x]) => x);
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...xs) - Math.min(...xs)).toBe(3); // flat again, shoved clear of the wall
  });

  it("uses the second kick test for a T piece squeezing against a block", () => {
    const s = newGame(1);
    // Turning clockwise in place needs the cell below the T's stem; block it so the piece must kick left.
    place(s, "T", 4, 10, 0);
    s.board[12 * COLS + 5] = 1;
    expect(rotate(s, 1)).toBe(true);
    expect(s.cur.rot).toBe(1);
    expect(s.cur.x).toBe(3);
    expect(s.cur.y).toBe(10);
    expect(collides(s, s.cur)).toBe(false);
    // The offsets themselves follow the standard table (y flipped for a board that grows downward).
    expect(kicksFor("T", 0, 1)[1]).toEqual([-1, 0]);
    expect(kicksFor("T", 0, 1)[2]).toEqual([-1, -1]);
    expect(kicksFor("I", 0, 1)[1]).toEqual([-2, 0]);
    expect(kicksFor("O", 0, 1)).toEqual([[0, 0]]);
  });

  it("scores 100/300/500/800 times the level for 1-4 lines", () => {
    for (const [n, base] of [[1, 100], [2, 300], [3, 500], [4, 800]] as const) {
      for (const level of [1, 3]) {
        const s = newGame(5, level);
        const { gained, lines } = clearLines(s, n);
        expect(lines).toBe(n);
        expect(gained).toBe(base * level);
      }
    }
  });

  it("adds a back-to-back bonus for consecutive 4-line clears but not after a smaller clear", () => {
    const s = newGame(9);
    const first = clearLines(s, 4);
    expect(first.gained).toBe(800);
    expect(s.b2b).toBe(true);
    const second = clearLines(s, 4);
    // 800 + half again for back-to-back + 50 x combo 1
    expect(second.gained).toBe(800 + 400 + 50);
    expect(second.b2b).toBe(true);
    clearLines(s, 1);
    expect(s.b2b).toBe(false);
    const third = clearLines(s, 4);
    expect(third.b2b).toBe(false);
  });

  it("builds combos on consecutive clears and resets on a lock without a clear", () => {
    const s = newGame(2);
    const single = () => {
      fillRow(s, ROWS - 1, [0, 1, 2, 3]);
      flatIOnFloor(s, 0);
      const b = s.score;
      const ev = hardDrop(s);
      const d = (ev.find((e) => e.type === "harddrop") as { dist: number }).dist;
      return s.score - b - d * 2;
    };
    expect(single()).toBe(100); // combo 0: no bonus
    expect(s.combo).toBe(0);
    expect(single()).toBe(100 + 50); // combo 1
    expect(single()).toBe(100 + 100); // combo 2
    expect(s.combo).toBe(2);
    place(s, "O", 4, 5);
    hardDrop(s); // no clear
    expect(s.combo).toBe(-1);
  });

  it("holds once per drop, swapping with the held piece", () => {
    const s = newGame(4);
    const first = s.cur.type;
    const next = s.queue[0];
    expect(holdPiece(s)).toBe(true);
    expect(s.hold).toBe(first);
    expect(s.cur.type).toBe(next);
    expect(holdPiece(s)).toBe(false); // already used
    hardDrop(s);
    expect(s.canHold).toBe(true);
    const falling = s.cur.type;
    expect(holdPiece(s)).toBe(true);
    expect(s.cur.type).toBe(first);
    expect(s.hold).toBe(falling);
  });

  it("locks 0.5 s after landing, and moving resets the timer only 15 times", () => {
    const s = newGame(6);
    place(s, "O", 4, ROWS - 2);
    expect(isGrounded(s)).toBe(true);
    update(s, LOCK_DELAY - 0.05);
    expect(s.pieces).toBe(0);
    update(s, 0.1);
    expect(s.pieces).toBe(1);

    const t = newGame(6);
    place(t, "O", 4, ROWS - 2);
    // Wiggle left and right every 0.4 s: it never locks until the allowance is spent.
    let dir = -1;
    for (let i = 0; i < MAX_LOCK_RESETS; i++) {
      update(t, 0.4);
      expect(t.pieces).toBe(0);
      expect(move(t, dir)).toBe(true);
      dir = -dir;
    }
    expect(t.lockResets).toBe(MAX_LOCK_RESETS);
    update(t, 0.4);
    move(t, dir); // no more reset
    update(t, 0.2);
    expect(t.pieces).toBe(1);
  });

  it("gives the reset allowance back when the piece reaches a new lowest row", () => {
    const s = newGame(6);
    place(s, "O", 4, 10); // columns 5-6
    s.board[13 * COLS + 6] = 1; // a ledge the square can only reach one row down
    s.lockResets = 10;
    s.lowest = 10;
    update(s, 1.2);
    expect(s.cur.y).toBe(11);
    expect(s.pieces).toBe(0);
    expect(s.lockResets).toBe(0);
  });

  it("scores soft drops (1/row) and hard drops (2/row) and speeds gravity with level", () => {
    const s = newGame(8);
    place(s, "T", 3, 4);
    expect(softDropStep(s)).toBe(true);
    expect(s.score).toBe(1);
    const y = s.cur.y;
    const dist = ghostY(s) - y;
    hardDrop(s);
    expect(s.score).toBe(1 + dist * 2);
    expect(gravityInterval(1)).toBeCloseTo(1, 5);
    for (let l = 2; l <= 15; l++) expect(gravityInterval(l)).toBeLessThan(gravityInterval(l - 1));
    // Held soft drop outruns plain gravity and scores a point per row.
    const a = newGame(8);
    const b = newGame(8);
    place(a, "O", 4, 2);
    place(b, "O", 4, 2);
    update(a, 0.3, true);
    update(b, 0.3, false);
    expect(a.cur.y).toBeGreaterThan(b.cur.y);
    expect(a.score).toBe(a.cur.y - 2);
  });

  it("goes up a level every ten lines", () => {
    expect(levelForLines(0)).toBe(1);
    expect(levelForLines(9)).toBe(1);
    expect(levelForLines(10)).toBe(2);
    expect(levelForLines(35)).toBe(4);
    const s = newGame(3);
    s.lines = 9;
    fillRow(s, ROWS - 1, [0, 1, 2, 3]);
    flatIOnFloor(s, 0);
    const ev = hardDrop(s);
    expect(ev.some((e) => e.type === "levelup")).toBe(true);
    expect(s.level).toBe(2);
  });

  it("collapses the rows above a clear", () => {
    const s = newGame(12);
    s.board[(ROWS - 2) * COLS + 5] = 3; // a lone block sitting on the row about to clear
    fillRow(s, ROWS - 1, [0, 1, 2, 3]);
    flatIOnFloor(s, 0);
    hardDrop(s);
    expect(s.board[(ROWS - 1) * COLS + 5]).toBe(3);
    expect(s.board[(ROWS - 2) * COLS + 5]).toBe(0);
  });

  it("ends the game when a new piece has no room, and when a piece locks above the well", () => {
    const blocked = newGame(1);
    for (let y = 0; y < 4; y++) fillRow(blocked, y, [0]);
    place(blocked, "O", 4, 8); // keep falling piece out of it, then force a spawn
    const ev = hardDrop(blocked);
    expect(blocked.alive).toBe(false);
    expect(ev.some((e) => e.type === "gameover")).toBe(true);

    const lockOut = newGame(1);
    // A tower to the ceiling of the visible area: the piece comes to rest in the hidden rows.
    for (let y = HIDDEN; y < ROWS; y++) fillRow(lockOut, y, [0]);
    place(lockOut, "O", 3, 0);
    const ev2 = hardDrop(lockOut);
    expect(lockOut.alive).toBe(false);
    expect(ev2.some((e) => e.type === "gameover")).toBe(true);
  });

  it("repeats a held direction: a step on press, then after the delay every repeat interval", () => {
    const r = newRepeat();
    expect(repeatSteps(r, 1, 0.016)).toBe(1); // the press itself
    expect(repeatSteps(r, 1, 0.1)).toBe(0); // still inside the delay
    expect(repeatSteps(r, 1, 0.08)).toBe(1); // 0.18 s: delay (0.17) crossed
    expect(repeatSteps(r, 1, 0.05)).toBe(1); // one repeat interval later
    expect(repeatSteps(r, 1, 0.1)).toBe(2);
    expect(repeatSteps(r, 0, 0.016)).toBe(0); // released
    expect(repeatSteps(r, -1, 0.016)).toBe(1); // new direction starts fresh
  });

  it("projects a ghost that lands on the stack", () => {
    const s = newGame(2);
    fillRow(s, ROWS - 1);
    place(s, "O", 4, 3);
    const y = ghostY(s);
    expect(collides(s, { ...s.cur, y })).toBe(false);
    expect(collides(s, { ...s.cur, y: y + 1 })).toBe(true);
    expect(y).toBe(ROWS - 3);
  });
});
