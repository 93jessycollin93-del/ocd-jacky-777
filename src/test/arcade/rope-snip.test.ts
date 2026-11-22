import { describe, expect, it } from "vitest";
import { LEVELS, cut, load, popBubble, puff, replay, ropeLength, solve, starsGot, step } from "@/arcade/games/rope-snip/logic";

describe("rope snip", () => {
  it("has 20 levels in two boxes with three stars each", () => {
    expect(LEVELS).toHaveLength(20);
    for (const l of LEVELS) expect(l.stars).toHaveLength(3);
  });

  it("a rope holds the candy and keeps its length", () => {
    const w = load(0);
    const r = w.ropes[0];
    const before = ropeLength(r, w.candy);
    for (let i = 0; i < 600; i++) step(w);
    expect(w.status).toBe("playing");
    expect(ropeLength(r, w.candy)).toBeLessThan(before * 1.06);
    expect(ropeLength(r, w.candy)).toBeGreaterThan(before * 0.94);
  });

  it("a swipe across a rope cuts it, and one that misses doesn't", () => {
    const w = load(0);
    expect(cut(w, { x: 10, y: 600 }, { x: 60, y: 620 })).toBe(0);
    expect(cut(w, { x: 150, y: 110 }, { x: 250, y: 110 })).toBe(1);
    expect(w.ropes[0].attached).toBe(false);
  });

  it("a cut candy falls and collects stars on the way to Munch", () => {
    const w = load(0);
    cut(w, { x: 150, y: 110 }, { x: 250, y: 110 });
    for (let i = 0; i < 1200 && w.status === "playing"; i++) step(w);
    expect(w.status).toBe("won");
    expect(starsGot(w)).toBe(3);
  });

  it("bubbles lift the candy until popped; puffers only push what is in front of them", () => {
    const w = load(LEVELS.findIndex((l) => l.name === "Up We Go"));
    cut(w, { x: 150, y: 380 }, { x: 250, y: 380 });
    let caught = false;
    for (let i = 0; i < 240 && !caught; i++) caught = step(w).includes("bubble");
    expect(caught).toBe(true);
    const y0 = w.candy.y;
    for (let i = 0; i < 60; i++) step(w);
    expect(w.candy.y).toBeLessThan(y0);
    expect(popBubble(w)).toBe(true);
    const p = load(LEVELS.findIndex((l) => l.name === "Pop!"));
    const vx0 = p.candy.x - p.candy.px;
    p.puffers[0] = { x: 300, y: 50, dir: 0 };
    puff(p, 0);
    expect(p.candy.x - p.candy.px).toBe(vx0);
  });

  it("spikes destroy the candy", () => {
    const w = load(LEVELS.findIndex((l) => l.name === "Mind the Spikes"));
    w.candy.x = w.spikes[0].x + 20;
    w.candy.px = w.candy.x;
    w.candy.y = w.candy.py = w.spikes[0].y - 5;
    for (const r of w.ropes) r.attached = false;
    for (let i = 0; i < 5 && w.status === "playing"; i++) step(w);
    expect(w.status).toBe("lost");
    expect(w.lostBy).toBe("spikes");
  });

  it("every level can be won (a seeded search finds a plan, and replaying it wins)", () => {
    for (let i = 0; i < LEVELS.length; i++) {
      const plan = solve(i, 800);
      expect(plan, LEVELS[i].name).not.toBeNull();
      expect(replay(i, plan!).status).toBe("won");
    }
  }, 300000);
});
