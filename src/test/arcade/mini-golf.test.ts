import { describe, expect, it } from "vitest";
import {
  CH, COURSE_PAR, CUP_R, CW, HOLES, MAX_STROKES, finishHole, newRound, shoot, simulateShot, solveHole, startHole, step, total,
} from "@/arcade/games/mini-golf/logic";

describe("mini golf", () => {
  it("has 18 holes with sensible pars, tees and cups on the course", () => {
    expect(HOLES).toHaveLength(18);
    expect(COURSE_PAR).toBe(HOLES.reduce((n, h) => n + h.par, 0));
    for (const h of HOLES) {
      expect(h.par).toBeGreaterThanOrEqual(2);
      expect(h.par).toBeLessThanOrEqual(5);
      for (const p of [h.tee, h.cup]) {
        expect(p.x).toBeGreaterThan(0);
        expect(p.x).toBeLessThan(CW);
        expect(p.y).toBeGreaterThan(0);
        expect(p.y).toBeLessThan(CH);
      }
    }
  });

  it("bounces off a wall instead of passing through it, even at full power", () => {
    for (let i = 0; i < HOLES.length; i++) {
      for (let a = 0; a < 24; a++) {
        const s = newRound();
        startHole(s, i);
        simulateShot(s, (a / 24) * Math.PI * 2, 1);
        expect(s.ball.x).toBeGreaterThan(0);
        expect(s.ball.x).toBeLessThan(CW);
        expect(s.ball.y).toBeGreaterThan(0);
        expect(s.ball.y).toBeLessThan(CH);
      }
    }
  });

  it("drops a slow ball into the cup but lets a fast one lip out", () => {
    const h = HOLES[0];
    const slow = newRound();
    slow.ball.x = h.cup.x - 30;
    slow.ball.y = h.cup.y;
    const ev = simulateShot(slow, 0, 0.18);
    expect(slow.ball.sunk).toBe(true);
    expect(ev.some((e) => e.type === "sunk")).toBe(true);
    const fast = newRound();
    fast.ball.x = h.cup.x - 30;
    fast.ball.y = h.cup.y;
    // Run just past the cup: at full power it rattles over the hole instead of dropping.
    shoot(fast, 0, 1);
    const ev2 = [];
    for (let t = 0; t < 0.12; t += 1 / 120) ev2.push(...step(fast, 1 / 120));
    expect(ev2.some((e) => e.type === "lipout")).toBe(true);
    expect(fast.ball.sunk).toBe(false);
    expect(Math.hypot(fast.ball.x - h.cup.x, fast.ball.y - h.cup.y)).toBeGreaterThan(CUP_R);
  });

  it("puts the ball back where it was hit from after a splash, with a one-stroke penalty", () => {
    const i = HOLES.findIndex((h) => h.name === "Over the Pond");
    const s = newRound();
    startHole(s, i);
    const ev = simulateShot(s, -Math.PI / 4, 0.55);
    expect(ev.some((e) => e.type === "water")).toBe(true);
    expect(s.ball.x).toBe(HOLES[i].tee.x);
    expect(s.ball.y).toBe(HOLES[i].tee.y);
    expect(s.strokes).toBe(2);
  });

  it("refuses to putt while the ball is moving", () => {
    const s = newRound();
    expect(shoot(s, 0, 0.5)).toBe(true);
    step(s, 0.05);
    expect(shoot(s, 0, 0.5)).toBe(false);
    expect(s.strokes).toBe(1);
  });

  it("caps a hole at the stroke limit on the scorecard and totals the round", () => {
    const s = newRound();
    s.strokes = MAX_STROKES + 3;
    finishHole(s);
    expect(s.card[0]).toBe(MAX_STROKES);
    expect(s.hole).toBe(1);
    expect(total([3, 4, 2])).toBe(9);
  });

  it("every hole can be finished within par + 3 by a search over angles and powers", () => {
    for (let i = 0; i < HOLES.length; i++) expect(solveHole(i, HOLES[i].par + 3)).toBeLessThanOrEqual(HOLES[i].par + 3);
  }, 120000);
});
