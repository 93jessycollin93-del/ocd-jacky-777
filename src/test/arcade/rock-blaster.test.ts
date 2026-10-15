import { describe, it, expect } from "vitest";
import {
  BULLET_LIFE, EXTRA_LIFE_EVERY, FIRE_COOLDOWN, FRICTION, INVULN_TIME, MAX_SHIP_BULLETS, MAX_SPEED, RESPAWN_DELAY, ROCK_RADIUS,
  ROCK_SCORE, THRUST, WAVE_DELAY, centreIsSafe, fire, hitsRock, hyperspace, newGame, rockEdgeAt, rocksInWave,
  splitRock, update, wrap, wrapDelta, type Rock, type RockEvent, type RockInput, type RockState,
} from "@/arcade/games/rock-blaster/logic";

const none: RockInput = { left: false, right: false, thrust: false, fire: false };

/** A game with the ship safe in the middle and nothing else on the screen. */
function empty(seed = 1): RockState {
  const s = newGame(seed);
  s.rocks = [];
  s.wave = 1;
  s.saucerTimer = 999;
  s.ship.invuln = 0;
  return s;
}

const rock = (s: RockState, x: number, y: number, size: 0 | 1 | 2, vx = 0, vy = 0): Rock => {
  const r: Rock = { x, y, vx, vy, size, angle: 0, spin: 0, shape: Array.from({ length: 10 }, () => 1) };
  s.rocks.push(r);
  return r;
};

const run = (s: RockState, seconds: number, input: RockInput = none) => {
  const out: RockEvent[] = [];
  for (let t = 0; t < seconds; t += 1 / 60) out.push(...update(s, 1 / 60, input));
  return out;
};

describe("rock-blaster ship", () => {
  it("rotates, and thrust pushes it the way it points", () => {
    const s = empty();
    run(s, 0.5, { ...none, right: true });
    expect(s.ship.angle).toBeGreaterThan(1);
    const t = empty();
    run(t, 1, { ...none, thrust: true });
    expect(t.ship.vy).toBeLessThan(-100); // pointing up: the ship climbs
    expect(Math.abs(t.ship.vx)).toBeLessThan(1);
    const u = empty();
    u.ship.angle = Math.PI / 2; // pointing right
    run(u, 1, { ...none, thrust: true });
    expect(u.ship.vx).toBeGreaterThan(100);
  });

  it("keeps drifting when you let go, slowing only a little, and has a top speed", () => {
    const s = empty();
    s.ship.vx = 200;
    s.ship.vy = 0;
    const x0 = s.ship.x;
    run(s, 1);
    expect(s.ship.vx).toBeGreaterThan(200 * 0.65);
    expect(s.ship.vx).toBeLessThan(200);
    expect(s.ship.vx).toBeCloseTo(200 * Math.exp(-FRICTION), 0);
    expect(Math.abs(wrapDelta(s.ship.x, x0, s.w))).toBeGreaterThan(120);
    run(s, 8, { ...none, thrust: true });
    expect(Math.hypot(s.ship.vx, s.ship.vy)).toBeLessThanOrEqual(MAX_SPEED + 1e-6);
    expect(THRUST).toBeGreaterThan(0);
  });

  it("wraps around every edge", () => {
    expect(wrap(-5, 800)).toBe(795);
    expect(wrap(805, 800)).toBe(5);
    expect(wrapDelta(795, 5, 800)).toBe(-10);
    const s = empty();
    s.ship.x = 2;
    s.ship.vx = -300;
    run(s, 0.1);
    expect(s.ship.x).toBeGreaterThan(700);
    s.ship.y = s.h - 2;
    s.ship.vx = 0;
    s.ship.vy = 300;
    run(s, 0.1);
    expect(s.ship.y).toBeLessThan(40);
    const r = rock(s, 5, 5, 0, -100, -100);
    run(s, 0.2);
    expect(r.x).toBeGreaterThan(700);
    expect(r.y).toBeGreaterThan(500);
  });

  it("fires at most four bullets at once, with a short gap between shots, and they expire", () => {
    const s = empty();
    rock(s, 50, 50, 0); // keep the wave going
    expect(fire(s)).toBe(true);
    expect(fire(s)).toBe(false); // cooling down
    let most = 0;
    for (let i = 0; i < 40; i++) {
      run(s, FIRE_COOLDOWN + 0.01);
      fire(s);
      most = Math.max(most, s.bullets.length);
      expect(s.bullets.length).toBeLessThanOrEqual(MAX_SHIP_BULLETS);
    }
    expect(most).toBe(MAX_SHIP_BULLETS);
    run(s, BULLET_LIFE + 0.2);
    expect(s.bullets).toHaveLength(0);
  });
});

describe("rock-blaster rocks", () => {
  it("splits large rocks into two medium, medium into two small, and small ones vanish", () => {
    const s = empty();
    rock(s, 100, 100, 0);
    const out: RockEvent[] = [];
    splitRock(s, 0, true, out);
    expect(s.rocks.map((r) => r.size)).toEqual([1, 1]);
    expect(s.rocks.every((r) => r.x === 100 && r.y === 100)).toBe(true);
    splitRock(s, 0, true, out);
    expect(s.rocks.map((r) => r.size)).toEqual([1, 2, 2]);
    splitRock(s, 0, true, out);
    expect(s.rocks.map((r) => r.size)).toEqual([2, 2, 2, 2]);
    splitRock(s, 0, true, out);
    expect(s.rocks).toHaveLength(3);
    expect(out.filter((e) => e.type === "rock")).toHaveLength(4);
  });

  it("scores 20 for large, 50 for medium and 100 for small", () => {
    expect([...ROCK_SCORE]).toEqual([20, 50, 100]);
    const s = empty();
    rock(s, 100, 100, 0);
    rock(s, 300, 100, 1);
    rock(s, 500, 100, 2);
    const out: RockEvent[] = [];
    splitRock(s, 2, true, out);
    expect(s.score).toBe(100);
    splitRock(s, 1, true, out);
    expect(s.score).toBe(150);
    splitRock(s, 0, true, out);
    expect(s.score).toBe(170);
    splitRock(s, 0, false, out); // a rock wrecked by a saucer's shot earns nothing
    expect(s.score).toBe(170);
  });

  it("has irregular outlines and a bullet only hits where the rock really is", () => {
    const s = empty();
    const r = rock(s, 400, 300, 0);
    r.shape = [1.15, 0.7, 1.1, 0.7, 1.15, 0.7, 1.1, 0.7, 1.15, 0.7];
    expect(hitsRock(s, r, 400, 300)).toBe(true);
    expect(hitsRock(s, r, 400 + ROCK_RADIUS[0] * 2, 300)).toBe(false);
    const lump = rockEdgeAt(r, 0); // the first corner, pointing up
    expect(lump).toBeGreaterThan(rockEdgeAt(r, (Math.PI * 2) / 10));
    // A shot flying through the rock breaks it, and is used up.
    s.ship.x = 400;
    s.ship.y = 450;
    s.ship.angle = 0;
    fire(s);
    expect(s.bullets).toHaveLength(1);
    run(s, 0.4);
    expect(s.rocks.every((x) => x.size === 1)).toBe(true);
    expect(s.rocks).toHaveLength(2);
    expect(s.score).toBe(20);
    expect(s.bullets).toHaveLength(0);
  });

  it("a fast bullet cannot skip over a small rock", () => {
    const s = empty();
    rock(s, 400, 200, 2);
    s.ship.x = 400;
    s.ship.y = 500;
    fire(s);
    for (let i = 0; i < 20; i++) update(s, 0.05, none);
    expect(s.rocks).toHaveLength(0);
    expect(s.score).toBe(100);
  });

  it("starts each wave with more large rocks, up to eleven, none on top of the ship", () => {
    expect([1, 2, 3, 8, 20].map(rocksInWave)).toEqual([4, 5, 6, 11, 11]);
    const s = newGame(5);
    expect(s.rocks).toHaveLength(4);
    for (const r of s.rocks) expect(Math.hypot(wrapDelta(r.x, s.ship.x, s.w), wrapDelta(r.y, s.ship.y, s.h))).toBeGreaterThan(150);
  });
});

describe("rock-blaster collisions and lives", () => {
  it("destroys the ship on a rock, costing a life, and brings a protected one back", () => {
    const s = empty();
    rock(s, s.ship.x + 20, s.ship.y, 1);
    const ev = update(s, 1 / 60, none);
    expect(ev.some((e) => e.type === "ship-die")).toBe(true);
    expect(s.lives).toBe(2);
    expect(s.ship.alive).toBe(false);
    s.rocks = [];
    rock(s, 20, 20, 0);
    const out = run(s, RESPAWN_DELAY + 0.5);
    expect(out.some((e) => e.type === "respawn")).toBe(true);
    expect(s.ship.alive).toBe(true);
    expect(s.ship.invuln).toBeGreaterThan(INVULN_TIME - 1);
    // While protected, a rock passes through it.
    rock(s, s.ship.x, s.ship.y, 1);
    update(s, 1 / 60, none);
    expect(s.ship.alive).toBe(true);
  });

  it("waits to reappear until the middle of the screen is clear", () => {
    const s = empty();
    rock(s, 30, 30, 1);
    s.ship.alive = false;
    s.ship.respawn = 0.1;
    expect(centreIsSafe(s)).toBe(true);
    s.rocks.length = 0;
    rock(s, s.w / 2 + 30, s.h / 2, 0, 0, 0);
    expect(centreIsSafe(s)).toBe(false);
    run(s, 1);
    expect(s.ship.alive).toBe(false);
    s.rocks[0].x = 20;
    s.rocks[0].y = 20;
    run(s, 1);
    expect(s.ship.alive).toBe(true);
  });

  it("ends the game after the last ship is lost", () => {
    const s = empty();
    s.lives = 1;
    rock(s, s.ship.x + 10, s.ship.y, 1);
    update(s, 1 / 60, none);
    expect(s.lives).toBe(0);
    expect(s.phase).toBe("play");
    const out = run(s, 3);
    expect(out.some((e) => e.type === "over")).toBe(true);
    expect(s.phase).toBe("over");
  });

  it("gives an extra life every 10,000 points", () => {
    const s = empty();
    s.score = EXTRA_LIFE_EVERY - 20;
    rock(s, 100, 100, 0);
    const out: RockEvent[] = [];
    splitRock(s, 0, true, out);
    expect(s.lives).toBe(4);
    expect(out.some((e) => e.type === "extra-life")).toBe(true);
    s.score += 5000;
    const more: RockEvent[] = [];
    rock(s, 100, 100, 2);
    splitRock(s, s.rocks.length - 1, true, more);
    expect(s.lives).toBe(4);
    s.score = 2 * EXTRA_LIFE_EVERY - 50;
    rock(s, 100, 100, 2);
    splitRock(s, s.rocks.length - 1, true, more);
    expect(s.lives).toBe(5);
    expect(s.nextLife).toBe(3 * EXTRA_LIFE_EVERY);
  });

  it("starts the next wave a moment after the last rock is cleared", () => {
    const s = empty();
    s.wave = 1;
    const ev = run(s, WAVE_DELAY + 0.3);
    expect(ev.some((e) => e.type === "wave")).toBe(true);
    expect(s.wave).toBe(2);
    expect(s.rocks).toHaveLength(rocksInWave(2));
  });
});

describe("rock-blaster saucers and hyperspace", () => {
  it("the small saucer aims at you, the big one just fires anywhere", () => {
    const s = empty();
    s.score = 40000;
    rock(s, 50, 50, 0);
    s.saucerTimer = 0;
    s.ship.x = 600;
    s.ship.y = 450;
    s.ship.invuln = 99;
    run(s, 0.05);
    expect(s.saucer?.kind).toBeDefined();
    s.saucer!.kind = "small";
    s.saucer!.x = 200;
    s.saucer!.y = 150;
    s.saucer!.vx = 0;
    s.saucer!.vy = 0;
    s.saucer!.turnTimer = 99;
    s.saucer!.fireTimer = 0;
    run(s, 1 / 60);
    const shot = s.bullets.find((b) => b.enemy)!;
    expect(shot).toBeDefined();
    const aim = Math.atan2(450 - 150, 600 - 200);
    expect(Math.abs(Math.atan2(shot.vy, shot.vx) - aim)).toBeLessThan(0.12);
  });

  it("scores 200 for the big saucer and 1,000 for the small one, and a saucer's shot can kill you", () => {
    const s = empty();
    rock(s, 50, 50, 0);
    s.saucerTimer = 0;
    run(s, 0.05);
    const sc = s.saucer!;
    sc.kind = "big";
    sc.x = 300;
    sc.y = 100;
    sc.vx = 0;
    sc.vy = 0;
    sc.fireTimer = 99;
    sc.turnTimer = 99;
    s.bullets.push({ x: 300, y: 100, vx: 0, vy: 0, life: 1, enemy: false });
    run(s, 1 / 60);
    expect(s.saucer).toBeNull();
    expect(s.score).toBe(200);

    s.saucer = { x: 300, y: 100, vx: 0, vy: 0, kind: "small", turnTimer: 99, fireTimer: 99 };
    s.bullets.push({ x: 300, y: 100, vx: 0, vy: 0, life: 1, enemy: false });
    run(s, 1 / 60);
    expect(s.score).toBe(1200);

    s.bullets.push({ x: s.ship.x, y: s.ship.y, vx: 0, vy: 0, life: 1, enemy: true });
    run(s, 1 / 60);
    expect(s.ship.alive).toBe(false);
  });

  it("hyperspace jumps somewhere else, and is a gamble that can blow the ship up", () => {
    const s = empty(3);
    const x0 = s.ship.x;
    const y0 = s.ship.y;
    const seq = [0.2, 0.7, 0.95];
    let k = 0;
    s.rng = () => seq[k++ % seq.length];
    expect(hyperspace(s)).toBe(true);
    expect(s.ship.alive).toBe(true);
    expect(Math.hypot(s.ship.x - x0, s.ship.y - y0)).toBeGreaterThan(100);
    expect(hyperspace(s)).toBe(false); // cooling down
    const t = empty(3);
    t.rng = () => 0.001;
    const out: RockEvent[] = [];
    hyperspace(t, out);
    expect(out.some((e) => e.type === "hyper-fail")).toBe(true);
    expect(t.ship.alive).toBe(false);
    expect(t.lives).toBe(2);
    // Over many tries it fails some of the time but not most of the time.
    let failures = 0;
    for (let i = 0; i < 600; i++) {
      const g = empty(i + 10);
      hyperspace(g);
      if (!g.ship.alive) failures++;
    }
    expect(failures).toBeGreaterThan(30);
    expect(failures).toBeLessThan(200);
  });
});
