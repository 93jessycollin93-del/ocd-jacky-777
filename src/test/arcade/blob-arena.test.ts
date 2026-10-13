import { describe, it, expect } from "vitest";
import {
  EAT_RATIO, EJECT_MASS, HALF, MAX_CELLS, SPLIT_MIN, THORN_FEEDS, THORN_MASS, addThorn, advance, aim, burstCell, canEat, centroid,
  decayPerSec, eject, livingBots, mergeCooldown, newWorld, radiusOf, speedOf, split, spawnPlayer, step, totalMass, zoomFor,
  type BlobWorld, type Player,
} from "@/arcade/games/blob-arena/logic";
import { think } from "@/arcade/games/blob-arena/ai";

/** An empty arena: the player (index 0) plus `bots` idle bots, no pellets or thorns. */
function arena(bots = 0): BlobWorld {
  const s = newWorld(2, { bots, pellets: 0, thorns: 0 });
  for (const p of s.players) p.brain.thinkIn = 1e9;
  return s;
}

function put(s: BlobWorld, pi: number, x: number, y: number, mass: number): Player {
  spawnPlayer(s, pi, mass, x, y);
  const p = s.players[pi];
  p.brain.thinkIn = 1e9;
  p.brain.splitCd = 1e9;
  return p;
}

const run = (s: BlobWorld, seconds: number) => {
  for (let t = 0; t < seconds - 1e-9; t += 1 / 60) step(s, 1 / 60);
};

describe("blob arena", () => {
  it("heavier blobs move slower and are bigger", () => {
    let prevSpeed = Infinity;
    let prevRadius = 0;
    for (const m of [10, 20, 50, 100, 300, 1000, 5000]) {
      expect(speedOf(m)).toBeLessThan(prevSpeed);
      expect(radiusOf(m)).toBeGreaterThan(prevRadius);
      prevSpeed = speedOf(m);
      prevRadius = radiusOf(m);
    }
    expect(speedOf(1e6)).toBeGreaterThan(0);
    // And a real blob really covers less ground when heavy.
    const s = arena();
    const small = put(s, 0, -1000, 0, 20);
    aim(small, 2000, 0);
    run(s, 1);
    const dSmall = small.cells[0].x + 1000;
    const s2 = arena();
    const big = put(s2, 0, -1000, 0, 800);
    aim(big, 2000, 0);
    run(s2, 1);
    expect(big.cells[0].x + 1000).toBeLessThan(dSmall * 0.6);
  });

  it("zooms out smoothly as mass and spread grow", () => {
    const z = (m: number, e = radiusOf(m)) => zoomFor(m, e, 700);
    expect(z(20)).toBeGreaterThan(z(200));
    expect(z(200)).toBeGreaterThan(z(2000));
    expect(z(2000)).toBeGreaterThan(z(20000));
    expect(z(100, 600)).toBeLessThan(z(100, radiusOf(100)));
    expect(z(20)).toBeGreaterThan(0);
  });

  it("eating needs 1.25x the mass and covering the other blob's centre", () => {
    const rBig = radiusOf(100);
    expect(canEat(100, 70, 0)).toBe(true);
    expect(canEat(100, 100 / EAT_RATIO + 1, 0)).toBe(false); // not heavy enough
    expect(canEat(100, 80, 0)).toBe(true); // exactly 1.25x
    expect(canEat(100, 50, rBig - 1)).toBe(false); // only touching the edge of the big blob
    expect(canEat(100, 50, rBig * 0.4)).toBe(true);
    expect(canEat(50, 100, 0)).toBe(false);
  });

  it("a big blob swallows a small one and gains its mass; equals just bump", () => {
    const s = arena(1);
    const a = put(s, 0, 0, 0, 100);
    const b = put(s, 1, 10, 0, 40);
    run(s, 0.1);
    expect(b.alive).toBe(false);
    expect(b.eatenBy).toBe("You");
    expect(totalMass(a)).toBeCloseTo(140, 0);
    expect(a.eaten).toBe(1);

    const t = arena(1);
    const c = put(t, 0, 0, 0, 100);
    const d = put(t, 1, 5, 0, 90);
    run(t, 0.5);
    expect(c.alive && d.alive).toBe(true);
  });

  it("eats pellets and keeps the pellet count topped up", () => {
    const s = newWorld(4, { bots: 0, pellets: 300, thorns: 0 });
    const me = put(s, 0, 0, 0, 20);
    const before = s.pellets.count;
    s.pellets.add(5, 0, 1, 0);
    s.pellets.add(-6, 3, 3, 1);
    run(s, 0.1);
    expect(totalMass(me)).toBeCloseTo(24, 0);
    expect(s.pellets.count).toBeLessThanOrEqual(before + 2);
    for (let i = 0; i < 100; i++) step(s, 0.1);
    expect(s.pellets.count).toBe(300);
  });

  it("splitting halves each cell, launches forward and keeps total mass", () => {
    const s = arena();
    const me = put(s, 0, 0, 0, 200);
    me.cells[0].mass = 200;
    aim(me, 1000, 0);
    const made = split(s, 0);
    expect(made).toBe(1);
    expect(me.cells).toHaveLength(2);
    expect(totalMass(me)).toBeCloseTo(200, 6);
    expect(me.cells.map((c) => c.mass)).toEqual([100, 100]);
    const thrown = me.cells[1];
    expect(thrown.vx).toBeGreaterThan(500);
    expect(Math.abs(thrown.vy)).toBeLessThan(1);
    run(s, 0.4);
    expect(thrown.x).toBeGreaterThan(me.cells[0].x);
    expect(totalMass(me)).toBeCloseTo(200, 3);
  });

  it("split pieces: a cap of 16, nothing too small to split, and a merge cooldown that grows with mass", () => {
    const s = arena();
    const me = put(s, 0, 0, 0, 4000);
    aim(me, 500, 0);
    for (let i = 0; i < 8; i++) split(s, 0);
    expect(me.cells.length).toBe(MAX_CELLS);
    expect(totalMass(me)).toBeCloseTo(4000, 3);
    const tiny = put(s, 0, 0, 0, SPLIT_MIN - 1);
    expect(split(s, 0)).toBe(0);
    expect(tiny.cells).toHaveLength(1);
    expect(mergeCooldown(2000)).toBeGreaterThan(mergeCooldown(50));
    expect(mergeCooldown(50)).toBeGreaterThan(5);
  });

  it("pieces stay apart until the cooldown ends, then merge back into one", () => {
    const s = arena();
    const me = put(s, 0, 0, 0, 200);
    aim(me, 0, 0, 0); // sit still: the cursor is on top of us
    split(s, 0);
    const cd = me.cells[0].merge;
    expect(cd).toBeGreaterThan(8);
    run(s, cd - 1.5);
    expect(me.cells).toHaveLength(2); // still two
    const a = me.cells[0];
    const b = me.cells[1];
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(radiusOf(a.mass) + radiusOf(b.mass) - 4); // pushed apart, not overlapping
    // Bring them together once the cooldown is up.
    aim(me, centroid(me).x, centroid(me).y, 1);
    run(s, 4);
    expect(me.cells).toHaveLength(1);
    expect(totalMass(me)).toBeGreaterThan(198); // nothing lost but a touch of decay
    expect(totalMass(me)).toBeLessThanOrEqual(200);
  });

  it("ejecting conserves mass between the cell and the pellet and shoots forward", () => {
    const s = arena();
    const me = put(s, 0, 0, 0, 100);
    aim(me, 500, 0);
    expect(eject(s, 0)).toBe(1);
    expect(me.cells[0].mass).toBe(100 - EJECT_MASS);
    expect(s.ejected).toHaveLength(1);
    expect(s.ejected[0].mass).toBe(EJECT_MASS);
    expect(totalMass(me) + s.ejected.reduce((m, e) => m + e.mass, 0)).toBe(100);
    expect(s.ejected[0].vx).toBeGreaterThan(500);
    // Rate limited: a second press straight away does nothing.
    expect(eject(s, 0)).toBe(0);
    const x0 = s.ejected[0].x;
    run(s, 0.3);
    expect(s.ejected[0].x).toBeGreaterThan(x0);
    // A blob that is too small can't eject at all.
    const small = put(s, 0, 0, 0, 20);
    expect(eject(s, 0)).toBe(0);
    expect(small.cells[0].mass).toBe(20);
  });

  it("mass shot by another blob can be eaten, but not by yourself right away", () => {
    const s = arena(1);
    const me = put(s, 0, 0, 0, 100);
    const other = put(s, 1, 200, 0, 100);
    aim(me, 200, 0);
    aim(other, 200, 0, 0);
    eject(s, 0);
    run(s, 0.05);
    expect(s.ejected).toHaveLength(1);
    run(s, 2);
    expect(totalMass(other)).toBeGreaterThan(100); // it caught the pellet
    expect(s.ejected).toHaveLength(0);
  });

  it("a big blob that hits a thorn bursts into pieces, keeping all the mass", () => {
    const s = arena();
    const me = put(s, 0, 0, 0, 400);
    const total = 400 + THORN_MASS;
    addThorn(s, 20, 0);
    run(s, 0.1);
    expect(s.thorns).toHaveLength(0);
    expect(me.cells.length).toBeGreaterThanOrEqual(6);
    expect(me.cells.length).toBeLessThanOrEqual(MAX_CELLS);
    expect(totalMass(me)).toBeCloseTo(total, 1);
    // The pieces fly apart.
    run(s, 0.3);
    const ctr = centroid(me);
    expect(Math.max(...me.cells.map((c) => Math.hypot(c.x - ctr.x, c.y - ctr.y)))).toBeGreaterThan(60);
  });

  it("small blobs are not hurt by thorns, and a burst never exceeds the piece cap", () => {
    const s = arena();
    const small = put(s, 0, 0, 0, 60);
    addThorn(s, 10, 0);
    run(s, 0.3);
    expect(small.cells).toHaveLength(1);
    expect(s.thorns).toHaveLength(1);

    const t = arena();
    const big = put(t, 0, 0, 0, 3000);
    aim(big, 300, 0, 0);
    for (let i = 0; i < 6; i++) split(t, 0);
    const n = big.cells.length;
    expect(n).toBeGreaterThan(8);
    const t1 = addThorn(t, big.cells[0].x, big.cells[0].y);
    burstCell(t, big.cells[0], t.thorns.indexOf(t1));
    expect(big.cells.length).toBeLessThanOrEqual(MAX_CELLS);
    expect(totalMass(big)).toBeCloseTo(3000 + THORN_MASS, 3);
  });

  it("feeding a thorn enough ejected mass shoots a new thorn that way", () => {
    const s = arena();
    const me = put(s, 0, -300, 0, 2000);
    const thorn = addThorn(s, 0, 0);
    aim(me, 1000, 0);
    // Park the blob so it keeps firing along +x into the thorn.
    me.cells[0].x = -330;
    for (let i = 0; i < THORN_FEEDS; i++) {
      eject(s, 0);
      run(s, 0.2);
      me.ejectCd = 0;
      me.cells[0].x = -330;
      me.cells[0].mass = 2000;
    }
    expect(s.thorns.length).toBe(2);
    const shot = s.thorns.find((t) => t !== thorn)!;
    expect(shot.vx).toBeGreaterThan(100);
    run(s, 1);
    expect(shot.x).toBeGreaterThan(thorn.x + 40);
    expect(thorn.mass).toBe(THORN_MASS);
  });

  it("big blobs slowly lose mass; small ones don't", () => {
    expect(decayPerSec(80)).toBe(0);
    expect(decayPerSec(2000)).toBeGreaterThan(decayPerSec(500));
    const s = arena();
    const big = put(s, 0, 0, 0, 3000);
    aim(big, 0, 0, 0);
    run(s, 5);
    expect(totalMass(big)).toBeLessThan(3000);
    expect(totalMass(big)).toBeGreaterThan(2900);
  });

  it("cells stay inside the arena", () => {
    const s = arena();
    const me = put(s, 0, HALF - 100, 0, 300);
    aim(me, HALF + 5000, 0);
    run(s, 3);
    expect(me.cells[0].x).toBeLessThanOrEqual(HALF - radiusOf(me.cells[0].mass) + 0.01);
  });

  it("bots chase smaller blobs and run from bigger ones", () => {
    const s = arena(2);
    const bot = put(s, 1, 0, 0, 200);
    const prey = put(s, 0, 300, 0, 40);
    prey.name = "Prey";
    bot.brain.skill = 1;
    bot.brain.aggr = 1;
    bot.brain.splitCd = 1e9;
    for (let i = 0; i < 20; i++) think(s, 1);
    expect(bot.aimX).toBeGreaterThan(200); // heads for the prey on its right
    // Now the other blob is a monster: the bot flees to the left.
    prey.cells[0].mass = 900;
    for (let i = 0; i < 5; i++) think(s, 1);
    expect(bot.aimX).toBeLessThan(0);
  });

  it("dead bots come back, keeping the population up", () => {
    const s = newWorld(8, { bots: 10, pellets: 100, thorns: 4 });
    for (let i = 1; i <= 4; i++) {
      s.players[i].cells = [];
      s.players[i].alive = false;
      s.players[i].respawn = 1.5;
    }
    expect(livingBots(s)).toBe(6);
    for (let t = 0; t < 4; t += 1 / 30) advance(s, 1 / 30);
    expect(livingBots(s)).toBe(10);
  });

  it("a whole arena of bots runs without anything going wrong", () => {
    const s = newWorld(12, { player: false });
    for (let t = 0; t < 60; t += 1 / 60) step(s, 1 / 60);
    expect(livingBots(s)).toBeGreaterThanOrEqual(17);
    for (const p of s.players) {
      for (const c of p.cells) {
        expect(Number.isFinite(c.x) && Number.isFinite(c.y) && Number.isFinite(c.mass)).toBe(true);
        expect(Math.abs(c.x)).toBeLessThanOrEqual(HALF);
      }
    }
    expect(s.pellets.count).toBeGreaterThan(1000);
  });
});
