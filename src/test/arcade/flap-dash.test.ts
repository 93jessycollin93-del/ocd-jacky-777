import { describe, it, expect } from "vitest";
import {
  BIRD_R, FLAP_V, GRAVITY, GROUND_Y, MAX_FALL, MAX_SHIFT, PILLAR_W, READY_Y, STEP, circleHitsRect, ensurePillars, flap, gapFor,
  hitsPillar, medalFor, newGame, nextMedal, nightAmount, spacingFor, speedFor, step, update, type FlapState, type Pillar,
} from "@/arcade/games/flap-dash/logic";

/** Run n fixed steps. */
function steps(s: FlapState, n: number) {
  for (let i = 0; i < n; i++) step(s);
}

/**
 * A careful player: hovers inside the opening it is crossing and, once it is nearly through, drifts toward the
 * side of the opening that points at the next one (low if the next is lower, high if it is higher). A flap
 * rises about 50 px, so the hover line has to leave that much room under the top edge.
 */
function bot(s: FlapState) {
  const i = s.pillars.findIndex((q) => q.x + PILLAR_W / 2 + BIRD_R > s.x);
  const p = s.pillars[i];
  let target = 300;
  if (p) {
    const next = s.pillars[i + 1];
    const rise = (FLAP_V * FLAP_V) / (2 * GRAVITY);
    const low = p.gapY + p.gap / 2 - BIRD_R - 6;
    const high = p.gapY - p.gap / 2 + BIRD_R + rise + 6;
    const mid = p.gapY + 8;
    target = Math.min(low, Math.max(high, mid));
    if (next && next.gapY > p.gapY + 20) target = low;
    else if (next && next.gapY < p.gapY - 20 && p.x - s.x < 0) target = Math.max(high, Math.min(low, p.gapY + 4));
  }
  if (s.vy >= 0 && s.y > target) flap(s);
}

describe("flap dash", () => {
  it("hovers in 'get ready' until the first flap, then gravity takes over", () => {
    const s = newGame(1);
    steps(s, 240);
    expect(s.phase).toBe("ready");
    expect(s.x).toBe(0);
    expect(Math.abs(s.y - READY_Y)).toBeLessThanOrEqual(8);
    flap(s);
    expect(s.phase).toBe("playing");
    expect(s.vy).toBe(-FLAP_V);
  });

  it("flap sets the velocity (it does not stack) and gravity pulls the bird back down", () => {
    const s = newGame(2);
    flap(s);
    flap(s);
    flap(s);
    expect(s.vy).toBe(-FLAP_V);
    const y0 = s.y;
    steps(s, 1);
    // One step: velocity gains gravity, position moves by the new velocity.
    expect(s.vy).toBeCloseTo(-FLAP_V + GRAVITY * STEP, 6);
    expect(s.y).toBeCloseTo(y0 + s.vy * STEP, 6);
    // Rises to the apex v^2 / 2g then falls past the start.
    let top = s.y;
    for (let i = 0; i < 400; i++) {
      step(s);
      top = Math.min(top, s.y);
      if (s.phase !== "playing") break;
    }
    expect(y0 - top).toBeGreaterThan((FLAP_V * FLAP_V) / (2 * GRAVITY) - 4);
    expect(y0 - top).toBeLessThan((FLAP_V * FLAP_V) / (2 * GRAVITY) + 4);
  });

  it("falls with a terminal speed and dies on the ground", () => {
    const s = newGame(3);
    flap(s);
    s.pillars = [];
    s.nextX = 1e9;
    let guard = 0;
    while (s.phase === "playing" && guard++ < 5000) step(s);
    expect(s.phase).toBe("dead");
    expect(s.cause).toBe("ground");
    expect(s.y).toBe(GROUND_Y - BIRD_R);
    expect(s.vy).toBe(0);
    expect(s.events).toContain("hit");
  });

  it("circle-versus-rectangle collision is exact at the edges", () => {
    expect(circleHitsRect(0, 0, 10, 9, -5, 20, 5)).toBe(true);
    expect(circleHitsRect(0, 0, 10, 10, -5, 20, 5)).toBe(false);
    expect(circleHitsRect(0, 0, 10, 8, 8, 20, 20)).toBe(false);
    expect(circleHitsRect(0, 0, 10, 6, 6, 20, 20)).toBe(true);
  });

  it("flying through the gap is safe; clipping the top or bottom pillar kills", () => {
    const p: Pillar = { x: 300, gapY: 250, gap: 150, index: 0, scored: false };
    expect(hitsPillar(300, 250, BIRD_R, p)).toBe(false);
    expect(hitsPillar(300, 250 - 75 + BIRD_R + 1, BIRD_R, p)).toBe(false);
    expect(hitsPillar(300, 250 - 75 + BIRD_R - 2, BIRD_R, p)).toBe(true);
    expect(hitsPillar(300, 250 + 75 - BIRD_R + 2, BIRD_R, p)).toBe(true);
    // Beside the pillar nothing is hit, whatever the height.
    expect(hitsPillar(300 - PILLAR_W / 2 - BIRD_R - 1, 40, BIRD_R, p)).toBe(false);

    const s = newGame(4);
    flap(s);
    s.pillars = [{ x: s.x + 60, gapY: 120, gap: 100, index: 0, scored: false }];
    s.nextX = 1e9;
    s.y = 400;
    s.vy = 0;
    let guard = 0;
    while (s.phase === "playing" && guard++ < 600) {
      if (s.y > 395) flap(s);
      step(s);
    }
    expect(s.phase).toBe("dead");
    expect(s.cause).toBe("pillar");
    expect(s.score).toBe(0);
  });

  it("scores exactly once when the bird passes the middle of a pillar", () => {
    const s = newGame(5);
    flap(s);
    s.pillars = [{ x: s.x + 100, gapY: s.y, gap: 400, index: 0, scored: false }];
    s.nextX = 1e9;
    s.y = 280;
    s.vy = 0;
    const pillar = s.pillars[0];
    let scoredAt = -1;
    let scores = 0;
    for (let i = 0; i < 300 && s.phase === "playing"; i++) {
      if (s.vy > 60) flap(s);
      const before = s.score;
      step(s);
      if (s.score > before) {
        scores++;
        scoredAt = s.x;
      }
    }
    expect(scores).toBe(1);
    expect(scoredAt).toBeGreaterThan(pillar.x);
    expect(scoredAt).toBeLessThan(pillar.x + 3);
    expect(s.score).toBe(1);
  });

  it("makes pillars the same way for the same seed, and every opening is reachable from the last", () => {
    const a = newGame(77);
    const b = newGame(77);
    a.x = b.x = 20000;
    ensurePillars(a);
    ensurePillars(b);
    expect(a.pillars.map((p) => p.gapY)).toEqual(b.pillars.map((p) => p.gapY));
    for (let seed = 1; seed <= 30; seed++) {
      const g = newGame(seed);
      for (let k = 0; k < 40; k++) {
        g.x += 1000;
        ensurePillars(g);
      }
      for (let i = 1; i < g.pillars.length; i++) {
        const prev = g.pillars[i - 1];
        const cur = g.pillars[i];
        expect(Math.abs(cur.gapY - prev.gapY)).toBeLessThanOrEqual(MAX_SHIFT + 1e-9);
        expect(cur.gapY - cur.gap / 2).toBeGreaterThan(40);
        expect(cur.gapY + cur.gap / 2).toBeLessThan(GROUND_Y - 40);
        expect(cur.x - prev.x).toBe(spacingFor(prev.index));
      }
    }
  });

  it("tightens gently: the gap and spacing shrink with the score, then hold; speed creeps up", () => {
    expect(gapFor(0)).toBeGreaterThan(gapFor(20));
    expect(gapFor(20)).toBeGreaterThan(gapFor(40));
    expect(gapFor(40)).toBe(gapFor(500));
    expect(spacingFor(0)).toBeGreaterThan(spacingFor(20));
    expect(spacingFor(40)).toBe(spacingFor(500));
    expect(speedFor(0)).toBeLessThan(speedFor(40));
    expect(speedFor(40)).toBe(speedFor(500));
    for (let i = 0; i < 60; i++) {
      expect(gapFor(i + 1)).toBeLessThanOrEqual(gapFor(i));
      expect(spacingFor(i + 1)).toBeLessThanOrEqual(spacingFor(i));
    }
    // "Gently": the tightest gap is still comfortably bigger than the bird.
    expect(gapFor(500)).toBeGreaterThan(BIRD_R * 2 * 3.5);
    // And the tightest spacing leaves time to recover.
    expect(spacingFor(500) - PILLAR_W).toBeGreaterThan(120);
  });

  it("a simple bot can fly a long way, so every opening is reachable at every difficulty", () => {
    for (let seed = 1; seed <= 30; seed++) {
      const s = newGame(seed);
      flap(s);
      let guard = 0;
      while (s.phase === "playing" && s.score < 70 && guard++ < 120 * 400) {
        bot(s);
        step(s);
      }
      expect(s.score).toBeGreaterThanOrEqual(70);
    }
  });

  it("awards medals at 10, 20, 30 and 40", () => {
    expect(medalFor(0)).toBeNull();
    expect(medalFor(9)).toBeNull();
    expect(medalFor(10)).toBe("bronze");
    expect(medalFor(19)).toBe("bronze");
    expect(medalFor(20)).toBe("silver");
    expect(medalFor(30)).toBe("gold");
    expect(medalFor(39)).toBe("gold");
    expect(medalFor(40)).toBe("platinum");
    expect(medalFor(400)).toBe("platinum");
    expect(nextMedal(12)?.name).toBe("silver");
    expect(nextMedal(41)).toBeNull();
  });

  it("day turns to night and back again over time", () => {
    expect(nightAmount(0)).toBe(0);
    expect(nightAmount(36)).toBe(1);
    expect(nightAmount(72)).toBeCloseTo(0, 6);
    let last = 0;
    for (let t = 0; t <= 36; t += 1) {
      const n = nightAmount(t);
      expect(n).toBeGreaterThanOrEqual(last - 1e-9);
      last = n;
    }
  });

  it("update() runs fixed steps from real time and reports events", () => {
    const s = newGame(9);
    flap(s);
    const ev = update(s, 0.1);
    expect(s.t).toBeCloseTo(0.1, 1);
    expect(Array.isArray(ev)).toBe(true);
    // A dead bird stops scrolling and can't flap again.
    s.phase = "dead";
    const x = s.x;
    update(s, 0.2);
    expect(s.x).toBe(x);
    expect(flap(s)).toBe(false);
  });
});
