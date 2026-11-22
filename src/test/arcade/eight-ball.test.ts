import { describe, expect, it } from "vitest";
import {
  MAX_SPEED, POCKETS, R, TH, TW, aiShot, canPlace, clone, cue, groupOf, newGame, placeCue, rack, resolve, simulate, step, strike, targets,
  type PoolState,
} from "@/arcade/games/eight-ball/logic";

/** A table with only the cue ball and the given balls. */
function table(balls: { n: number; x: number; y: number }[], cueAt = { x: 200, y: 250 }): PoolState {
  const s = newGame(1);
  s.balls = [{ n: 0, ...cueAt, vx: 0, vy: 0, potted: false }, ...balls.map((b) => ({ ...b, vx: 0, vy: 0, potted: false }))];
  s.breakShot = false;
  return s;
}

describe("8-ball pool", () => {
  it("racks 15 balls in a tight triangle with the 8 in the middle and one of each group in the back corners", () => {
    const balls = rack(4);
    expect(balls).toHaveLength(16);
    expect(new Set(balls.map((b) => b.n)).size).toBe(16);
    const rows = balls.slice(1);
    expect(rows[4].n).toBe(8);
    const back = [rows[10].n, rows[14].n].map(groupOf).sort();
    expect(back).toEqual(["solids", "stripes"]);
  });

  it("a head-on hit passes the speed to the object ball and conserves momentum", () => {
    const s = table([{ n: 1, x: 300, y: 250 }]);
    strike(s, 0, 0.3);
    const v0 = cue(s).vx;
    for (let i = 0; i < 40 && s.balls[1].vx === 0; i++) step(s, 1 / 240);
    const c = cue(s);
    const b = s.balls[1];
    expect(b.vx).toBeGreaterThan(v0 * 0.8);
    expect(Math.abs(c.vx)).toBeLessThan(v0 * 0.2);
    expect(c.vx + b.vx).toBeLessThanOrEqual(v0 + 1e-6);
  });

  it("never tunnels through a ball or out of the table at maximum power", () => {
    for (let a = 0; a < 36; a++) {
      const s = newGame(a + 1);
      strike(s, (a / 36) * Math.PI * 2, 1);
      expect(cue(s).vx ** 2 + cue(s).vy ** 2).toBeCloseTo(MAX_SPEED ** 2, -2);
      simulate(s);
      for (const b of s.balls) {
        if (b.potted) continue;
        expect(b.x).toBeGreaterThanOrEqual(R - 1);
        expect(b.x).toBeLessThanOrEqual(TW - R + 1);
        expect(b.y).toBeGreaterThanOrEqual(R - 1);
        expect(b.y).toBeLessThanOrEqual(TH - R + 1);
      }
      const live = s.balls.filter((b) => !b.potted);
      for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) {
        expect(Math.hypot(live[i].x - live[j].x, live[i].y - live[j].y)).toBeGreaterThan(2 * R - 1);
      }
    }
  });

  it("pots a ball rolled into a pocket", () => {
    const p = POCKETS[2];
    const s = table([{ n: 3, x: p.x - 80, y: p.y + 40 }], { x: p.x - 160, y: p.y + 80 });
    strike(s, Math.atan2(-40, 80), 0.5);
    simulate(s);
    expect(s.balls[1].potted).toBe(true);
  });

  it("claims a group with the first legal pot on an open table and keeps the turn", () => {
    const s = table([{ n: 11, x: 900, y: 250 }, { n: 2, x: 500, y: 100 }]);
    s.balls[1].potted = true;
    s.shot = { first: 11, potted: [11], railAfterContact: false, cueRail: false };
    resolve(s);
    expect(s.groups).toEqual(["stripes", "solids"]);
    expect(s.turn).toBe(0);
    // Its only stripe is down, so the 8 is next.
    expect(targets(s, 0)).toEqual([8]);
  });

  it("fouls give the other player ball in hand: scratch, wrong ball first, no rail", () => {
    const base = () => {
      const s = table([{ n: 2, x: 500, y: 100 }, { n: 12, x: 600, y: 100 }]);
      s.groups = ["solids", "stripes"];
      return s;
    };
    const scratch = base();
    scratch.shot = { first: 2, potted: [0], railAfterContact: true, cueRail: false };
    resolve(scratch);
    expect(scratch.turn).toBe(1);
    expect(scratch.ballInHand).toBe(true);
    expect(cue(scratch).potted).toBe(false);
    const wrong = base();
    wrong.shot = { first: 12, potted: [], railAfterContact: true, cueRail: false };
    resolve(wrong);
    expect(wrong.message).toMatch(/Wrong ball/);
    const norail = base();
    norail.shot = { first: 2, potted: [], railAfterContact: false, cueRail: false };
    resolve(norail);
    expect(norail.message).toMatch(/No rail/);
    expect(placeCue(norail, 300, 300)).toBe(true);
    expect(canPlace(norail, 500, 100)).toBe(false);
  });

  it("sinking the 8 early loses, and sinking it legally last wins", () => {
    const early = table([{ n: 8, x: 500, y: 250 }, { n: 2, x: 600, y: 100 }]);
    early.groups = ["solids", "stripes"];
    early.shot = { first: 8, potted: [8], railAfterContact: true, cueRail: false };
    resolve(early);
    expect(early.over).toBe(true);
    expect(early.winner).toBe(1);
    const legal = table([{ n: 8, x: 500, y: 250 }, { n: 12, x: 600, y: 100 }]);
    legal.groups = ["solids", "stripes"];
    legal.shot = { first: 8, potted: [8], railAfterContact: true, cueRail: false };
    resolve(legal);
    expect(legal.winner).toBe(0);
    const scratch8 = table([{ n: 8, x: 500, y: 250 }]);
    scratch8.groups = ["solids", "stripes"];
    scratch8.shot = { first: 8, potted: [8, 0], railAfterContact: true, cueRail: false };
    resolve(scratch8);
    expect(scratch8.winner).toBe(1);
  });

  it("the computer aims at one of its own balls, places the cue legally, and finishes games", () => {
    const s = table([{ n: 3, x: 600, y: 200 }, { n: 12, x: 700, y: 300 }]);
    s.groups = ["stripes", "solids"];
    s.turn = 1;
    s.ballInHand = true;
    const m = aiShot(clone(s), "normal");
    expect(m.place).toBeDefined();
    expect(canPlace(s, m.place!.x, m.place!.y)).toBe(true);
    placeCue(s, m.place!.x, m.place!.y);
    strike(s, m.angle, m.power);
    simulate(s);
    expect(s.shot?.first).toBe(3);
    const g = newGame(5);
    let shots = 0;
    while (!g.over && shots < 200) {
      const mv = aiShot(g, "hard");
      if (mv.place) placeCue(g, mv.place.x, mv.place.y);
      strike(g, mv.angle, mv.power);
      simulate(g);
      resolve(g);
      shots++;
    }
    expect(g.over).toBe(true);
  }, 120000);
});
