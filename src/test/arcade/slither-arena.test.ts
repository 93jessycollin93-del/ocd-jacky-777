import { describe, it, expect } from "vitest";
import { SegGrid } from "@/arcade/games/slither-arena/grid";
import {
  BASE_SPEED, BOOST_MULT, MIN_BOOST_MASS, WORLD_R, advance, angDiff, bodyHit, girth, killWorm, livingBots, newWorld, rankOf, refreshBoard,
  segCount, segSpacing, spawnWorm, step, turnRate, type World, type Worm,
} from "@/arcade/games/slither-arena/logic";

/** A quiet arena: the player (index 0) plus `bots` idle bots, no food. Everyone is out of the spawn shield. */
function arena(bots = 0, orbs = 0): World {
  const s = newWorld(3, { bots, orbs });
  for (const w of s.worms) {
    w.shield = 0;
    w.brain.thinkIn = 1e9;
  }
  return s;
}

/** Put worm `wi` at a place, heading and mass, with a straight body behind it. */
function place(s: World, wi: number, x: number, y: number, ang: number, mass: number): Worm {
  spawnWorm(s, wi, mass, x, y, ang);
  const w = s.worms[wi];
  w.shield = 0;
  w.brain.thinkIn = 1e9;
  s.grid.rebuild(s.worms);
  return w;
}

const run = (s: World, seconds: number) => {
  for (let t = 0; t < seconds - 1e-9; t += 1 / 60) step(s, 1 / 60);
};

describe("slither arena", () => {
  it("body segments follow the path the head took", () => {
    const s = arena();
    const w = place(s, 0, 0, 0, 0, 80);
    const sp = segSpacing(w.mass);
    run(s, 1); // straight along +x
    w.targetAng = Math.PI / 2; // then turn to head down the screen (+y)
    run(s, 0.7);
    expect(w.ang).toBeCloseTo(Math.PI / 2, 1);
    // The segments just behind the head are still on the old straight line: same y as the earlier path (about 0) until the bend catches up.
    const tailEnd = w.n - 1;
    expect(w.sx[tailEnd]).toBeLessThan(w.x);
    // Every segment sits behind the previous by about one spacing, along a continuous path.
    for (let i = 1; i < w.n; i++) {
      const d = Math.hypot(w.sx[i - 1] - w.sx[i], w.sy[i - 1] - w.sy[i]);
      expect(d).toBeLessThanOrEqual(sp + 0.01);
      expect(d).toBeGreaterThan(sp * 0.45);
    }
    // The part of the body that was laid down before the turn is still on y ≈ 0.
    const oldPart = [...Array(w.n).keys()].filter((i) => w.sy[i] < 6);
    expect(oldPart.length).toBeGreaterThan(5);
    expect(Math.max(...oldPart.map((i) => Math.abs(w.sy[i])))).toBeLessThan(6);
  });

  it("limits how fast a worm can turn", () => {
    const s = arena();
    const w = place(s, 0, 0, 0, 0, 10);
    w.targetAng = Math.PI; // wants to reverse at once
    step(s, 1 / 60);
    expect(Math.abs(angDiff(0, w.ang))).toBeLessThanOrEqual(turnRate(10) / 60 + 1e-9);
    run(s, 0.2);
    expect(Math.abs(angDiff(0, w.ang))).toBeLessThan(turnRate(10) * 0.25);
    run(s, 1);
    expect(Math.abs(angDiff(w.ang, Math.PI))).toBeLessThan(0.05);
    // Fatter worms turn a little wider.
    expect(turnRate(2000)).toBeLessThan(turnRate(10));
  });

  it("kills a worm whose head touches another worm's body", () => {
    const s = arena(1);
    place(s, 1, 100, -60, Math.PI / 2, 60); // a long wall heading down the screen, head far below
    const a = place(s, 0, 40, 0, 0, 20); // heading right into it
    run(s, 1);
    expect(a.alive).toBe(false);
    expect(a.killedBy).toBe(s.worms[1].name);
    expect(s.worms[1].alive).toBe(true);
    expect(s.worms[1].kills).toBe(1);
  });

  it("does not kill a worm for touching its own body", () => {
    const s = arena();
    const w = place(s, 0, 0, 0, 0, 150);
    w.targetAng = Math.PI; // circle back over its own tail
    run(s, 6);
    expect(w.alive).toBe(true);
    expect(bodyHit(s, 0)).toBe(-1);
  });

  it("kills both worms in a head-on crash", () => {
    const s = arena(1);
    const a = place(s, 0, -40, 0, 0, 30);
    const b = place(s, 1, 40, 0, Math.PI, 30);
    run(s, 0.6);
    expect(a.alive).toBe(false);
    expect(b.alive).toBe(false);
  });

  it("boosting doubles speed, burns mass and drops glowing orbs behind", () => {
    const s = arena();
    const w = place(s, 0, 0, 0, 0, 60);
    const m0 = w.mass;
    run(s, 1);
    const cruise = w.x;
    expect(cruise).toBeCloseTo(BASE_SPEED, -1);
    expect(s.orbs.count).toBe(0);
    w.wantBoost = true;
    const x1 = w.x;
    run(s, 1);
    expect(w.x - x1).toBeCloseTo(BASE_SPEED * BOOST_MULT, -1);
    expect(w.boosting).toBe(true);
    const lost = m0 - w.mass;
    expect(lost).toBeGreaterThan(1);
    let dropped = 0;
    for (const list of s.orbs.cells) for (const o of list) dropped += o.v;
    expect(s.orbs.count).toBeGreaterThan(0);
    expect(dropped).toBeGreaterThan(0);
    expect(dropped).toBeLessThanOrEqual(lost); // never more food than the mass burned
    // The drops are behind the head, near the tail.
    for (const list of s.orbs.cells) for (const o of list) expect(o.x).toBeLessThan(w.x - 20);
  });

  it("can't boost when too small, and stops boosting once it shrinks to the minimum", () => {
    const s = arena();
    const w = place(s, 0, 0, 0, 0, MIN_BOOST_MASS - 1);
    w.wantBoost = true;
    run(s, 0.5);
    expect(w.boosting).toBe(false);
    expect(w.x).toBeCloseTo(BASE_SPEED * 0.5, -1);
    const big = place(s, 0, 0, 0, 0, MIN_BOOST_MASS + 3);
    big.wantBoost = true;
    run(s, 4);
    expect(big.mass).toBeGreaterThan(MIN_BOOST_MASS - 0.5);
    expect(big.boosting).toBe(false);
  });

  it("eating orbs grows mass, length and girth", () => {
    const s = arena();
    const w = place(s, 0, 0, 0, 0, 10);
    const g0 = w.g;
    const n0 = w.n;
    for (let i = 0; i < 60; i++) s.orbs.add(40 + i * 8, 0, 3, 1, false);
    run(s, 4);
    expect(w.mass).toBeCloseTo(10 + 60 * 3, 0);
    expect(w.g).toBeGreaterThan(g0);
    expect(w.n).toBeGreaterThan(n0);
    expect(w.g).toBeCloseTo(girth(w.mass), 5);
    expect(w.n).toBe(segCount(w.mass));
    expect(s.orbs.count).toBeLessThan(10);
  });

  it("a dead worm bursts into big orbs worth most of its mass", () => {
    const s = arena(1);
    const w = place(s, 1, 200, 200, 0, 120);
    const n = killWorm(s, 1, "body", 0);
    expect(w.alive).toBe(false);
    expect(n).toBeGreaterThanOrEqual(6);
    expect(s.orbs.count).toBe(n);
    let total = 0;
    let biggest = 0;
    for (const list of s.orbs.cells) for (const o of list) {
      total += o.v;
      biggest = Math.max(biggest, o.v);
    }
    expect(total).toBeGreaterThan(120 * 0.8);
    expect(total).toBeLessThanOrEqual(120);
    expect(biggest).toBeGreaterThan(2); // bigger than ordinary food
    expect(s.worms[0].kills).toBe(1);
  });

  it("dies on the world boundary and drops its orbs inside the arena", () => {
    const s = arena();
    const w = place(s, 0, WORLD_R - 60, 0, 0, 80);
    const events = advance(s, 1);
    expect(w.alive).toBe(false);
    expect(events.some((e) => e.type === "death" && e.cause === "edge")).toBe(true);
    expect(w.killedBy).toMatch(/edge/);
    for (const list of s.orbs.cells) for (const o of list) expect(Math.hypot(o.x, o.y)).toBeLessThan(WORLD_R);
  });

  it("a freshly spawned worm is shielded for a moment", () => {
    const s = newWorld(5, { bots: 1, orbs: 0 });
    const w = s.worms[0];
    expect(w.shield).toBeGreaterThan(1);
    w.x = WORLD_R + 50; // outside the wall and heading further out, but the shield protects it
    w.ang = 0;
    w.targetAng = 0;
    step(s, 1 / 60);
    expect(w.alive).toBe(true);
    run(s, 2);
    expect(w.alive).toBe(false);
  });

  it("keeps the bot population up by respawning dead bots", () => {
    const s = newWorld(9, { bots: 12, orbs: 200 });
    for (let i = 1; i <= 5; i++) killWorm(s, i, "body", 0);
    expect(livingBots(s)).toBe(7);
    for (let t = 0; t < 8; t += 1 / 30) advance(s, 1 / 30);
    expect(livingBots(s)).toBeGreaterThanOrEqual(10);
    for (let t = 0; t < 12; t += 1 / 30) advance(s, 1 / 30);
    expect(livingBots(s)).toBeGreaterThanOrEqual(11);
  });

  it("segment grid finds only nearby segments", () => {
    const s = arena(1);
    place(s, 0, 0, 0, 0, 30);
    place(s, 1, 1500, 1500, 0, 30);
    const grid = new SegGrid();
    grid.rebuild(s.worms);
    expect(grid.count).toBe(s.worms[0].n + s.worms[1].n);
    const seen = new Set<number>();
    grid.query(0, 0, 100, (wi) => seen.add(wi));
    expect([...seen]).toEqual([0]);
    const far = new Set<number>();
    grid.query(1500, 1500, 100, (wi) => far.add(wi));
    expect([...far]).toEqual([1]);
    let n = 0;
    grid.query(0, 0, 3000, () => n++);
    expect(n).toBe(grid.count);
  });

  it("orb field lookups are local and removal keeps the grid consistent", () => {
    const s = arena();
    const a = s.orbs.add(10, 10, 1, 0, true);
    s.orbs.add(20, 20, 1, 0, true);
    s.orbs.add(900, 900, 1, 0, true);
    let near = 0;
    s.orbs.near(0, 0, 100, () => near++);
    expect(near).toBe(2);
    s.orbs.remove(a);
    near = 0;
    s.orbs.near(0, 0, 100, () => near++);
    expect(near).toBe(1);
    expect(s.orbs.count).toBe(2);
    expect(s.orbs.ambient).toBe(2);
  });

  it("ranks worms by mass", () => {
    const s = arena(3);
    s.worms[0].mass = 50;
    s.worms[1].mass = 300;
    s.worms[2].mass = 20;
    s.worms[3].mass = 100;
    refreshBoard(s);
    expect(s.board).toEqual([1, 3, 0, 2]);
    expect(rankOf(s, 0)).toBe(3);
    expect(rankOf(s, 1)).toBe(1);
  });

  it("bots steer clear of a wall of body in their path", () => {
    const s = newWorld(21, { bots: 2, orbs: 0, player: false });
    const wall = place(s, 1, 260, -600, Math.PI / 2, 400);
    wall.brain.thinkIn = 1e9;
    wall.turnCmd = 0;
    wall.shield = 0;
    const bot = place(s, 0, 0, 0, 0, 40);
    bot.brain.thinkIn = 0;
    bot.brain.skill = 0.95;
    bot.brain.aggr = 0;
    bot.shield = 0;
    // Hold the wall's head steady so it forms a long barrier while the bot approaches.
    for (let t = 0; t < 3; t += 1 / 60) {
      wall.x = 260;
      wall.y = Math.max(wall.y, -600);
      step(s, 1 / 60);
      wall.brain.thinkIn = 1e9;
    }
    expect(bot.alive).toBe(true);
  });

  it("bots turn away from the world edge instead of crashing into it", () => {
    const s = newWorld(4, { bots: 1, orbs: 0, player: false });
    const bot = place(s, 0, WORLD_R - 330, 0, 0, 50);
    bot.brain.thinkIn = 0;
    bot.brain.skill = 0.9;
    for (let t = 0; t < 8; t += 1 / 60) step(s, 1 / 60);
    expect(bot.alive).toBe(true);
    expect(Math.hypot(bot.x, bot.y)).toBeLessThan(WORLD_R - 60);
  });

  it("a full arena of bots runs for a while without anything going wrong", () => {
    const s = newWorld(12, { player: false });
    let steps = 0;
    for (let t = 0; t < 40; t += 1 / 60) {
      step(s, 1 / 60);
      steps++;
    }
    expect(steps).toBeGreaterThan(2000);
    expect(livingBots(s)).toBeGreaterThanOrEqual(20);
    for (const w of s.worms) {
      if (!w.alive) continue;
      expect(Number.isFinite(w.x) && Number.isFinite(w.y) && Number.isFinite(w.mass)).toBe(true);
      expect(w.n).toBe(segCount(w.mass));
    }
    expect(s.orbs.count).toBeGreaterThan(500);
  });
});
