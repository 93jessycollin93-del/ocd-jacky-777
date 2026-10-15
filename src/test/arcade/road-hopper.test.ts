import { describe, it, expect } from "vitest";
import {
  BACK_GRAB, BACK_LIMIT, CYCLE, EDGE, HALF_COLS, HOP_TIME, IDLE_GRAB, IDLE_WARN, STEP, TRAIN_SPEED, TRAIN_WARN, birdWarn, ensureRows,
  hop, newGame, nextWarning, passable, rowAt, scoreOf, step, supportingLog, trainState, update, vehicleX, wrapDelta, wrapX,
  type Dir, type HopperState, type Row,
} from "@/arcade/games/road-hopper/logic";

/** Run for some seconds of game time (fixed steps). */
function run(s: HopperState, seconds: number) {
  const n = Math.round(seconds / STEP);
  for (let i = 0; i < n; i++) step(s);
}

/** Hop and wait for the landing. */
function hopAndLand(s: HopperState, dir: Dir) {
  hop(s, dir);
  run(s, HOP_TIME + STEP * 2);
}

/** A state with row `i` replaced by a custom row (and the bunny standing there). */
function placeOn(s: HopperState, i: number, patch: Partial<Row>, x = 0) {
  ensureRows(s, i + 5);
  Object.assign(rowAt(s, i), patch);
  s.row = i;
  s.maxRow = Math.max(s.maxRow, i);
  s.x = x;
  s.hopT = HOP_TIME;
  s.idle = 0;
}

const blankRow = (kind: Row["kind"]): Partial<Row> => ({
  kind, trees: [], coins: [], vehicles: [], logs: [], pads: [], lane: "logs", dir: 1, speed: 2,
});

describe("road hopper", () => {
  it("there is always a way forward: from the start, every row can be reached by walking forward and sideways", () => {
    for (let seed = 1; seed <= 25; seed++) {
      const s = newGame(seed);
      ensureRows(s, 600);
      // Row 0 is open grass, so you can walk to any column of it before the first hop.
      let front = new Set<number>([-4, -3, -2, -1, 0, 1, 2, 3, 4]);
      const kinds = new Set<string>();
      for (let r = 1; r <= 600; r++) {
        const row = rowAt(s, r);
        kinds.add(row.kind);
        // Forward from where we can stand, then slide sideways over open tiles until nothing new opens up.
        const next = new Set<number>();
        for (const c of front) if (passable(row, c)) next.add(c);
        let grew = true;
        while (grew) {
          grew = false;
          for (const c of [...next]) {
            for (const n of [c - 1, c + 1]) {
              if (Math.abs(n) <= HALF_COLS && passable(row, n) && !next.has(n)) {
                next.add(n);
                grew = true;
              }
            }
          }
        }
        expect(next.size).toBeGreaterThan(0);
        front = next;
      }
      expect(kinds.size).toBe(4);
    }
  });

  it("starts on safe open grass and score is the furthest row reached", () => {
    const s = newGame(3);
    for (let r = 0; r < 3; r++) expect(rowAt(s, r).kind).toBe("grass");
    expect(rowAt(s, 0).trees.filter((c) => Math.abs(c) <= HALF_COLS)).toEqual([]);
    expect(s.row).toBe(0);
    expect(scoreOf(s)).toBe(0);
    s.rows.forEach((r) => (r.index >= 0 && r.index <= 2 ? (r.trees = r.trees.filter((c) => Math.abs(c) > HALF_COLS)) : null));
    hopAndLand(s, "up");
    hopAndLand(s, "up");
    expect(s.row).toBe(2);
    expect(scoreOf(s)).toBe(2);
    hopAndLand(s, "down");
    expect(s.row).toBe(1);
    expect(scoreOf(s)).toBe(2);
    // Can't hop back past the start row.
    s.row = 0;
    s.hopT = HOP_TIME;
    expect(hop(s, "down")).toBe(false);
    expect(s.events).toContain("bump");
  });

  it("trees block a hop, and the edge of the world blocks sideways hops", () => {
    const s = newGame(4);
    placeOn(s, 1, { ...blankRow("grass"), trees: [0] }, 0);
    placeOn(s, 0, blankRow("grass"), 0);
    expect(hop(s, "up")).toBe(false);
    expect(s.row).toBe(0);
    run(s, 0.2);
    for (let i = 0; i < 4; i++) hopAndLand(s, "right");
    expect(s.x).toBe(HALF_COLS);
    expect(hop(s, "right")).toBe(false);
    expect(s.x).toBe(HALF_COLS);
  });

  it("queues one hop while another is under way", () => {
    const s = newGame(5);
    placeOn(s, 0, blankRow("grass"), 0);
    for (const i of [1, 2, 3]) rowAt(s, i).trees = [];
    hop(s, "up");
    hop(s, "up");
    run(s, HOP_TIME * 2 + 0.05);
    expect(s.row).toBe(2);
  });

  it("a car squashes you if you stand where it passes, and leaves you alone in a gap", () => {
    const s = newGame(6);
    const row: Partial<Row> = { ...blankRow("road"), dir: 1, speed: 3, vehicles: [{ x0: -3, len: 1.5, color: 0 }] };
    placeOn(s, 4, row, 0);
    // The car starts 3 tiles to the left and reaches us in about a second.
    run(s, 0.5);
    expect(s.alive).toBe(true);
    run(s, 1);
    expect(s.alive).toBe(false);
    expect(s.cause).toBe("car");
    expect(s.events).toContain("die");

    const t = newGame(6);
    placeOn(t, 4, { ...blankRow("road"), dir: 1, speed: 3, vehicles: [{ x0: 5, len: 1.5, color: 0 }] }, -3);
    run(t, 1);
    expect(t.alive).toBe(true);
    expect(wrapDelta(vehicleX(rowAt(t, 4), rowAt(t, 4).vehicles[0], 1), 5)).toBeCloseTo(3, 6);
    expect(wrapX(17)).toBe(-15);
  });

  it("riding a log carries you along, and the log keeps you from drowning", () => {
    const s = newGame(7);
    placeOn(s, 5, { ...blankRow("river"), lane: "logs", dir: 1, speed: 1, logs: [{ x0: 0, len: 3 }] }, 0);
    const row = rowAt(s, 5);
    expect(supportingLog(s, row)).not.toBeNull();
    run(s, 2);
    expect(s.alive).toBe(true);
    expect(s.x).toBeCloseTo(2, 1);
    expect(s.x).toBeCloseTo(wrapDelta(logX0(row, s.time), 0), 1);
  });

  it("falls in the water when there is no log, but a lily pad holds you", () => {
    const s = newGame(8);
    placeOn(s, 5, { ...blankRow("river"), lane: "logs", dir: 1, speed: 1, logs: [{ x0: 8, len: 2 }] }, 0);
    run(s, 0.1);
    expect(s.alive).toBe(false);
    expect(s.cause).toBe("water");

    const p = newGame(8);
    placeOn(p, 5, { ...blankRow("river"), lane: "pads", pads: [-2, 0, 3] }, 0);
    run(p, 3);
    expect(p.alive).toBe(true);
    const q = newGame(8);
    placeOn(q, 5, { ...blankRow("river"), lane: "pads", pads: [-2, 3] }, 0);
    run(q, 0.1);
    expect(q.cause).toBe("water");
  });

  it("being carried off the edge of the screen by a log kills you", () => {
    const s = newGame(9);
    placeOn(s, 5, { ...blankRow("river"), lane: "logs", dir: 1, speed: 2, logs: [{ x0: 3, len: 4 }] }, 3);
    let t = 0;
    while (s.alive && t < 5) {
      run(s, 0.05);
      t += 0.05;
    }
    expect(s.alive).toBe(false);
    expect(s.cause).toBe("edge");
    expect(s.x).toBeGreaterThan(EDGE);
    expect(t).toBeLessThan(2);
  });

  it("hopping from a log to another log keeps you up, and onto grass snaps to a tile", () => {
    const s = newGame(10);
    ensureRows(s, 10);
    placeOn(s, 4, { ...blankRow("river"), lane: "logs", dir: 1, speed: 1, logs: [{ x0: 0.4, len: 4 }] }, 0.4);
    Object.assign(rowAt(s, 5), { ...blankRow("river"), lane: "logs", dir: -1, speed: 1, logs: [{ x0: 0.4, len: 4 }] });
    Object.assign(rowAt(s, 6), { ...blankRow("grass"), trees: [] });
    hopAndLand(s, "up");
    expect(s.alive).toBe(true);
    expect(s.row).toBe(5);
    expect(s.x % 1).not.toBe(0);
    hopAndLand(s, "up");
    expect(s.alive).toBe(true);
    expect(Number.isInteger(s.x)).toBe(true);
  });

  it("trains: the light comes on well before the train, the train kills you on the track, and it clears again", () => {
    const row: Partial<Row> = { ...blankRow("rail"), dir: 1, period: 7, phase: 2, warn: 1.8, trainLen: 16 };
    const s = newGame(11);
    placeOn(s, 6, row, 0);
    const r = rowAt(s, 6);
    expect(trainState(r, 1.9).light).toBe(false);
    expect(trainState(r, 2.1).light).toBe(true);
    expect(trainState(r, 2.1).present).toBe(false);
    // The front reaches the edge of the playable area (x = -EDGE) no sooner than the warning plus travel time.
    let tFront = -1;
    for (let t = 2; t < 6; t += 0.01) {
      const st = trainState(r, t);
      if (st.present && st.front >= -EDGE) {
        tFront = t;
        break;
      }
    }
    expect(tFront - 2).toBeGreaterThanOrEqual(TRAIN_WARN);
    expect(nextWarning(r, 0)).toBeCloseTo(2, 6);
    // While it passes, the light stays on; after the tail clears it goes off again.
    const clear = 2 + 1.8 + (CYCLE + 16) / TRAIN_SPEED;
    expect(trainState(r, clear - 0.1).light).toBe(true);
    expect(trainState(r, clear + 0.1).light).toBe(false);
    // Standing on the track while it passes is fatal.
    s.time = 1;
    run(s, 4);
    expect(s.alive).toBe(false);
    expect(s.cause).toBe("train");
    // Slipping across before the train arrives is fine.
    const u = newGame(11);
    placeOn(u, 6, row, 0);
    u.row = 5;
    u.time = 1;
    rowAt(u, 5).trees = [];
    hopAndLand(u, "up");
    hopAndLand(u, "up");
    expect(u.row).toBe(7);
    expect(u.alive).toBe(true);
  });

  it("stand still too long and the hawk takes you, with a warning first; a hop resets it", () => {
    const s = newGame(12);
    run(s, 3 + IDLE_WARN - 0.2);
    expect(birdWarn(s)).toBe(0);
    run(s, 0.6);
    expect(birdWarn(s)).toBeGreaterThan(0);
    expect(s.alive).toBe(true);
    // Hopping saves you.
    hopAndLand(s, "right");
    run(s, 1);
    expect(birdWarn(s)).toBeLessThan(0.5);
    expect(s.idle).toBeGreaterThan(0);
    run(s, IDLE_GRAB + 0.5);
    expect(s.alive).toBe(false);
    expect(s.cause).toBe("bird");
  });

  it("wandering too far back brings the hawk, but hopping forward in time cancels it", () => {
    const s = newGame(13);
    ensureRows(s, 40);
    // A plain field of open grass so only the bird can end this run.
    for (let i = 0; i < 14; i++) Object.assign(rowAt(s, i), blankRow("grass"));
    for (let i = 0; i < 6; i++) hopAndLand(s, "up");
    expect(s.row).toBe(6);
    const top = s.maxRow;
    for (let i = 0; i < BACK_LIMIT - 1; i++) hopAndLand(s, "down");
    expect(top - s.row).toBe(BACK_LIMIT - 1);
    run(s, 1);
    expect(birdWarn(s)).toBeLessThan(0.2);
    hopAndLand(s, "down");
    expect(top - s.row).toBe(BACK_LIMIT);
    run(s, BACK_GRAB * 0.5);
    expect(birdWarn(s)).toBeGreaterThan(0.4);
    hopAndLand(s, "up");
    run(s, 1);
    expect(s.alive).toBe(true);
    expect(birdWarn(s)).toBe(0);
    hopAndLand(s, "down");
    run(s, BACK_GRAB + 0.2);
    expect(s.alive).toBe(false);
    expect(s.cause).toBe("bird");
  });

  it("coins are collected once and counted", () => {
    const s = newGame(14);
    placeOn(s, 3, { ...blankRow("grass"), coins: [0] }, 0);
    s.row = 2;
    rowAt(s, 2).trees = [];
    rowAt(s, 3).trees = [];
    hopAndLand(s, "up");
    expect(s.coins).toBe(1);
    expect(rowAt(s, 3).coins).toEqual([]);
    hopAndLand(s, "down");
    hopAndLand(s, "up");
    expect(s.coins).toBe(1);
    // Seeded worlds are the same every time and have coins about as often as intended.
    const a = newGame(99);
    const b = newGame(99);
    ensureRows(a, 300);
    ensureRows(b, 300);
    expect(a.rows.map((r) => [r.kind, r.coins.length])).toEqual(b.rows.map((r) => [r.kind, r.coins.length]));
    const coinRows = a.rows.filter((r) => r.coins.length).length;
    expect(coinRows).toBeGreaterThan(20);
    expect(coinRows).toBeLessThan(120);
  });

  it("gets busier with distance: faster traffic further on, and update() drives fixed steps", () => {
    const speeds = (from: number, to: number) => {
      const out: number[] = [];
      for (let seed = 1; seed <= 12; seed++) {
        const s = newGame(seed);
        ensureRows(s, to + 5);
        for (let r = from; r < to; r++) if (rowAt(s, r).kind === "road") out.push(rowAt(s, r).speed);
      }
      return out.reduce((a, b) => a + b, 0) / out.length;
    };
    expect(speeds(150, 300)).toBeGreaterThan(speeds(3, 60) * 1.3);
    const s = newGame(15);
    for (let i = 0; i < 10; i++) update(s, 0.05);
    expect(s.time).toBeGreaterThan(0.45);
    expect(s.time).toBeLessThan(0.55);
  });
});

/** Where the log's centre is at time t. */
function logX0(row: Row, t: number) {
  return wrapX(row.logs[0].x0 + row.dir * row.speed * t);
}
