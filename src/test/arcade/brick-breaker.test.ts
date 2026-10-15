import { describe, it, expect } from "vitest";
import {
  BALL_R, BH, BRICK_TOP, BW, CLEAR_TIME, H, MAX_BALLS, MAX_BOUNCE, MAX_LIVES, PADDLE_W, PADDLE_Y, W, applyPower, baseSpeed,
  ballSpeed, brickAt, circleVsRect, launch, loadLevel, maxSpeed, newGame, paddleBounce, setPaddleTarget, update, hitBrick,
  type Ball, type Brick, type BreakerEvent, type BreakerState,
} from "@/arcade/games/brick-breaker/logic";
import { AUTHORED, COLS, breakableCount, generateLevel, isSolvable, levelDef } from "@/arcade/games/brick-breaker/levels";

const ball = (x: number, y: number, vx: number, vy: number): Ball => ({ x, y, vx, vy, stuck: false, offset: 0, stuckTime: 0 });

/** A game in play with one free ball and an empty-but-for-the-given-rows brick field. */
function playing(rows: string[] = [".............", "1111111111111"]): BreakerState {
  const s = newGame(3);
  loadLevelRows(s, rows);
  launch(s);
  s.balls = [ball(260, 400, 0, -300)];
  return s;
}

function loadLevelRows(s: BreakerState, rows: string[]) {
  loadLevel(s, 1);
  s.grid.fill(null);
  s.bricksLeft = 0;
  rows.forEach((row, r) => {
    for (let c = 0; c < COLS; c++) {
      const ch = row[c];
      if (!ch || ch === ".") continue;
      const kind = ch === "#" ? "steel" : ch === "a" || ch === "b" ? "multi" : "normal";
      const hp = ch === "#" ? 999 : ch === "a" ? 2 : ch === "b" ? 3 : 1;
      s.grid[r * COLS + c] = { col: c, row: r, x: c * BW, y: BRICK_TOP + r * BH, kind, hp, maxHp: hp, color: 0, flash: 0 };
      if (kind !== "steel") s.bricksLeft++;
    }
  });
}

const frames = (s: BreakerState, n: number, dt = 1 / 60) => {
  const out: BreakerEvent[] = [];
  for (let i = 0; i < n; i++) out.push(...update(s, dt));
  return out;
};

describe("brick-breaker paddle", () => {
  it("rebounds at an angle set by where the ball lands, always upward, at the same speed", () => {
    const mid = paddleBounce(300, 300, 84, 400);
    expect(mid.vx).toBeCloseTo(0);
    expect(mid.vy).toBeCloseTo(-400);
    const right = paddleBounce(342, 300, 84, 400);
    expect(Math.atan2(right.vx, -right.vy)).toBeCloseTo(MAX_BOUNCE);
    const left = paddleBounce(258, 300, 84, 400);
    expect(Math.atan2(left.vx, -left.vy)).toBeCloseTo(-MAX_BOUNCE);
    const quarter = paddleBounce(321, 300, 84, 400);
    expect(Math.atan2(quarter.vx, -quarter.vy)).toBeCloseTo(MAX_BOUNCE / 2);
    for (const v of [mid, right, left, quarter]) {
      expect(Math.hypot(v.vx, v.vy)).toBeCloseTo(400);
      expect(v.vy).toBeLessThan(0);
    }
    // Off the edge still gives the steepest angle, not something wilder.
    expect(Math.atan2(paddleBounce(900, 300, 84, 400).vx, -paddleBounce(900, 300, 84, 400).vy)).toBeCloseTo(MAX_BOUNCE);
  });

  it("bounces a falling ball off the paddle and speeds the ball up a little", () => {
    const s = playing(["............."]);
    s.bricksLeft = 5;
    s.paddle.x = 300;
    s.paddle.target = 300;
    const before = s.speed;
    s.balls = [ball(320, PADDLE_Y - 40, 0, 300)];
    frames(s, 30);
    expect(s.balls[0].vy).toBeLessThan(0);
    expect(s.balls[0].vx).toBeGreaterThan(0); // landed right of centre
    expect(s.speed).toBeGreaterThan(before);
    expect(s.speed).toBeLessThanOrEqual(maxSpeed(1));
  });

  it("serves the ball sitting on the paddle and launches upward", () => {
    const s = newGame(1);
    expect(s.phase).toBe("serve");
    expect(s.balls[0].stuck).toBe(true);
    setPaddleTarget(s, 200);
    frames(s, 10);
    expect(s.balls[0].x).toBeCloseTo(s.paddle.x);
    expect(launch(s).map((e) => e.type)).toEqual(["launch"]);
    expect(s.phase).toBe("play");
    expect(s.balls[0].vy).toBeLessThan(0);
  });

  it("keeps the paddle inside the walls", () => {
    const s = newGame(1);
    setPaddleTarget(s, -500);
    frames(s, 60);
    expect(s.paddle.x).toBeCloseTo(PADDLE_W.normal / 2);
    setPaddleTarget(s, 5000);
    frames(s, 60);
    expect(s.paddle.x).toBeCloseTo(W - PADDLE_W.normal / 2);
  });
});

describe("brick-breaker bricks", () => {
  it("breaks a normal brick in one hit, a tough one in two and a tougher one in three", () => {
    const s = playing(["a1b#........."]);
    const out: BreakerEvent[] = [];
    const [a, n, b, steel] = [0, 1, 2, 3].map((c) => brickAt(s, c, 0)!) as Brick[];
    expect(hitBrick(s, n, out)).toBe(true);
    expect(brickAt(s, 1, 0)).toBeNull();
    expect(hitBrick(s, a, out)).toBe(false);
    expect(a.hp).toBe(1);
    expect(hitBrick(s, a, out)).toBe(true);
    expect(hitBrick(s, b, out)).toBe(false);
    expect(hitBrick(s, b, out)).toBe(false);
    expect(hitBrick(s, b, out)).toBe(true);
    expect(s.bricksLeft).toBe(0);
    expect(out.filter((e) => e.type === "hit")).toHaveLength(3);
    expect(steel.kind).toBe("steel");
  });

  it("never breaks a steel brick, however many times it is hit, and a level doesn't need it cleared", () => {
    const s = playing(["#.1.........."]);
    const steel = brickAt(s, 0, 0)!;
    const out: BreakerEvent[] = [];
    for (let i = 0; i < 50; i++) hitBrick(s, steel, out);
    expect(brickAt(s, 0, 0)).toBe(steel);
    expect(out.every((e) => e.type === "steel")).toBe(true);
    expect(s.bricksLeft).toBe(1);
  });

  it("bounces off the underside of a brick and breaks it, scoring 10", () => {
    const s = playing([".............", "......1......"]);
    const brick = brickAt(s, 6, 1)!;
    s.balls = [ball(brick.x + BW / 2, brick.y + BH + 20, 0, -300)];
    const ev = frames(s, 30);
    expect(ev.some((e) => e.type === "break")).toBe(true);
    expect(s.balls[0].vy).toBeGreaterThan(0);
    expect(s.score).toBeGreaterThanOrEqual(10);
  });

  it("reflects off the side of a brick, flipping only the horizontal speed", () => {
    const s = playing([".............", ".....#1#....."]);
    const brick = brickAt(s, 6, 1)!;
    s.grid[1 * COLS + 5] = null;
    s.grid[1 * COLS + 7] = null;
    s.bricksLeft = 5;
    s.balls = [ball(brick.x - 30, brick.y + BH / 2, 400, 60)];
    frames(s, 20);
    expect(s.balls[0].vx).toBeLessThan(0);
    expect(s.balls[0].vy).toBeGreaterThan(0);
  });

  it("circleVsRect finds contacts and nothing else", () => {
    expect(circleVsRect(50, 50, 7, 100, 100, 40, 18)).toBeNull();
    const hit = circleVsRect(120, 95, 7, 100, 100, 40, 18)!;
    expect(hit.ny).toBe(-1);
    expect(hit.depth).toBeCloseTo(2);
    const inside = circleVsRect(120, 109, 7, 100, 100, 40, 18)!;
    expect(inside.depth).toBeGreaterThan(7);
  });
});

describe("brick-breaker never tunnels", () => {
  const solid = Array.from({ length: 6 }, (_, i) => (i === 0 ? "............." : "2222222222222"));

  it("a very fast ball stops at the first row of bricks instead of going through", () => {
    for (const speed of [900, 2500, 6000]) {
      const s = playing(solid);
      s.speed = speed;
      s.balls = [ball(260, 480, 0, -speed)];
      const total = s.bricksLeft;
      for (let i = 0; i < 60; i++) {
        update(s, 1 / 60);
        if (s.phase !== "play") break;
        const b = s.balls[0];
        if (!b) break;
        for (const br of s.grid) if (br) expect(circleVsRect(b.x, b.y, BALL_R - 0.5, br.x, br.y, BW, BH), `speed ${speed}`).toBeNull();
      }
      // Only the lowest row (row 5) can have been touched: rows 1-4 are all still there.
      for (let r = 1; r < 5; r++) for (let c = 0; c < COLS; c++) expect(brickAt(s, c, r), `row ${r} speed ${speed}`).not.toBeNull();
      expect(s.bricksLeft).toBeGreaterThanOrEqual(total - 3);
    }
  });

  it("a fast ball cannot slip through a steel row or out of the sides", () => {
    const s = playing(["#############", ".............", "#############"]);
    s.speed = 5000;
    s.balls = [ball(260, 480, 300, -5000)];
    for (let i = 0; i < 120; i++) {
      update(s, 1 / 60);
      const b = s.balls[0];
      if (!b) break;
      expect(b.y).toBeGreaterThanOrEqual(BRICK_TOP + 3 * BH + BALL_R - 1); // never above the lower steel row
      expect(b.x).toBeGreaterThanOrEqual(BALL_R - 1e-6);
      expect(b.x).toBeLessThanOrEqual(W - BALL_R + 1e-6);
    }
    expect(s.balls[0]).toBeDefined();
  });

  it("a fast ball cannot fall through the paddle", () => {
    const s = playing(["............."]);
    s.bricksLeft = 3;
    s.paddle.x = 260;
    s.paddle.target = 260;
    s.speed = 5000;
    s.balls = [ball(262, 300, 0, 5000)];
    update(s, 1 / 20);
    update(s, 1 / 20);
    expect(s.lives).toBe(3);
    expect(s.balls[0].vy).toBeLessThan(0);
  });
});

describe("brick-breaker power-ups", () => {
  it("wide paddle grows, shrink makes it smaller, and they cancel each other", () => {
    const s = playing();
    applyPower(s, "wide");
    frames(s, 60);
    expect(s.paddle.w).toBe(PADDLE_W.wide);
    applyPower(s, "shrink");
    frames(s, 60);
    expect(s.paddle.w).toBe(PADDLE_W.shrink);
    expect(s.powers.wide).toBe(0);
    s.powers.shrink = 0.05;
    frames(s, 90);
    expect(s.paddle.w).toBe(PADDLE_W.normal);
  });

  it("multi-ball triples the balls in flight, up to a cap", () => {
    const s = playing();
    applyPower(s, "multi");
    expect(s.balls).toHaveLength(3);
    applyPower(s, "multi");
    expect(s.balls).toHaveLength(9);
    applyPower(s, "multi");
    expect(s.balls.length).toBeLessThanOrEqual(MAX_BALLS);
    // They fly apart, not on top of each other.
    const angles = new Set(s.balls.map((b) => Math.round(Math.atan2(b.vx, -b.vy) * 100)));
    expect(angles.size).toBeGreaterThan(1);
  });

  it("slow ball lowers the ball speed until it runs out", () => {
    const s = playing();
    const normal = ballSpeed(s);
    applyPower(s, "slow");
    expect(ballSpeed(s)).toBeLessThan(normal);
    frames(s, 60 * 11);
    expect(ballSpeed(s)).toBeCloseTo(s.speed);
  });

  it("laser paddle fires two bolts that break bricks, and steel stops them", () => {
    const s = playing(["#............", "1111111111111"]);
    applyPower(s, "laser");
    s.balls = [ball(10, 300, 0, 0)];
    s.balls[0].stuck = true;
    s.paddle.x = BW * 6.5;
    s.paddle.target = s.paddle.x;
    const left = s.bricksLeft;
    const ev = update(s, 1 / 60, { left: false, right: false, fire: true });
    expect(ev.some((e) => e.type === "laser")).toBe(true);
    expect(s.bolts).toHaveLength(2);
    for (let i = 0; i < 60; i++) update(s, 1 / 60);
    expect(s.bricksLeft).toBeLessThan(left);
    expect(s.bolts).toHaveLength(0);
    // Without the power-up, fire does nothing.
    s.powers.laser = 0;
    update(s, 1 / 60, { left: false, right: false, fire: true });
    expect(s.bolts).toHaveLength(0);
  });

  it("sticky paddle catches the ball until you launch it", () => {
    const s = playing();
    s.bricksLeft = 3;
    applyPower(s, "sticky");
    s.paddle.x = 260;
    s.paddle.target = 260;
    s.balls = [ball(280, PADDLE_Y - 30, 0, 300)];
    frames(s, 20);
    const b = s.balls[0];
    expect(b.stuck).toBe(true);
    expect(b.offset).toBeGreaterThan(0);
    setPaddleTarget(s, 200);
    frames(s, 20);
    expect(b.x).toBeCloseTo(s.paddle.x + b.offset, 0);
    launch(s);
    expect(b.stuck).toBe(false);
    expect(b.vy).toBeLessThan(0);
    expect(b.vx).toBeGreaterThan(0);
  });

  it("extra life adds one, to a limit; capsules fall and are caught by the paddle", () => {
    const s = playing();
    applyPower(s, "life");
    expect(s.lives).toBe(4);
    s.lives = MAX_LIVES;
    applyPower(s, "life");
    expect(s.lives).toBe(MAX_LIVES);

    const t = playing();
    t.bricksLeft = 4;
    t.balls = [ball(30, 250, 0, 0)];
    t.paddle.x = 200;
    t.paddle.target = 200;
    t.capsules.push({ x: 205, y: PADDLE_Y - 80, kind: "wide" });
    const ev = frames(t, 60);
    expect(ev.some((e) => e.type === "power" && e.power === "wide")).toBe(true);
    expect(t.capsules).toHaveLength(0);
    expect(t.powers.wide).toBeGreaterThan(0);
    // A capsule that is missed falls away.
    const u = playing();
    u.bricksLeft = 4;
    u.balls = [ball(30, 250, 0, 0)];
    u.capsules.push({ x: 20, y: PADDLE_Y - 80, kind: "wide" });
    u.paddle.x = 400;
    u.paddle.target = 400;
    frames(u, 120);
    expect(u.capsules).toHaveLength(0);
    expect(u.powers.wide).toBe(0);
  });
});

describe("brick-breaker lives and levels", () => {
  it("loses a life when the last ball falls, serves again, and ends the game at zero", () => {
    const s = playing();
    s.bricksLeft = 3;
    s.paddle.x = 60;
    s.paddle.target = 60;
    s.balls = [ball(450, H - 20, 0, 400)];
    const ev = frames(s, 30);
    expect(ev.some((e) => e.type === "life-lost")).toBe(true);
    expect(s.lives).toBe(2);
    frames(s, 90);
    expect(s.phase).toBe("serve");

    s.lives = 1;
    launch(s);
    s.balls = [ball(450, H - 20, 0, 400)];
    const ev2 = frames(s, 120);
    expect(ev2.some((e) => e.type === "over")).toBe(true);
    expect(s.phase).toBe("over");
  });

  it("clears the level when the last breakable brick goes and moves on to the next", () => {
    const s = playing(["#...1........"]);
    const brick = brickAt(s, 4, 0)!;
    s.balls = [ball(brick.x + BW / 2, brick.y + BH + 15, 0, -400)];
    const ev = frames(s, 30);
    expect(ev.some((e) => e.type === "clear")).toBe(true);
    expect(s.phase).toBe("clear");
    const score = s.score;
    const ev2 = frames(s, Math.ceil(CLEAR_TIME * 60) + 5);
    expect(ev2.some((e) => e.type === "level")).toBe(true);
    expect(s.level).toBe(2);
    expect(s.phase).toBe("serve");
    expect(s.bricksLeft).toBeGreaterThan(10);
    expect(score).toBeGreaterThan(500);
    expect(baseSpeed(2)).toBeGreaterThan(baseSpeed(1));
  });

  it("the ball gradually speeds up, but never past the cap", () => {
    const s = playing();
    s.speed = maxSpeed(1) - 2;
    s.paddle.x = 260;
    s.paddle.target = 260;
    for (let i = 0; i < 5; i++) {
      s.balls = [ball(260, PADDLE_Y - 20, 0, 300)];
      frames(s, 20);
    }
    expect(s.speed).toBe(maxSpeed(1));
  });
});

describe("brick-breaker levels", () => {
  it("has at least ten hand-made layouts, all valid and finishable", () => {
    expect(AUTHORED.length).toBeGreaterThanOrEqual(10);
    const names = new Set<string>();
    for (const def of AUTHORED) {
      names.add(def.name);
      for (const row of def.rows) {
        expect(row, def.name).toHaveLength(COLS);
        expect(row, def.name).toMatch(/^[.1-8ab#]+$/);
      }
      expect(breakableCount(def.rows), def.name).toBeGreaterThanOrEqual(15);
      expect(isSolvable(def.rows), def.name).toBe(true);
    }
    expect(names.size).toBe(AUTHORED.length);
  });

  it("generates endless valid, symmetric, repeatable levels after the hand-made ones", () => {
    for (let level = AUTHORED.length + 1; level <= AUTHORED.length + 60; level++) {
      const def = generateLevel(level);
      expect(def.rows.length).toBeLessThanOrEqual(15);
      for (const row of def.rows) {
        expect(row).toHaveLength(COLS);
        expect(row).toBe([...row].reverse().join(""));
      }
      expect(isSolvable(def.rows), `level ${level}`).toBe(true);
      expect(breakableCount(def.rows)).toBeGreaterThanOrEqual(24);
      expect(levelDef(level).rows).toEqual(def.rows);
    }
    expect(generateLevel(15).rows).not.toEqual(generateLevel(16).rows);
  });

  it("detects a breakable brick walled in by steel", () => {
    const rows = ["#############", "#1111111111.#", "#############"];
    expect(isSolvable(rows)).toBe(false);
  });
});
