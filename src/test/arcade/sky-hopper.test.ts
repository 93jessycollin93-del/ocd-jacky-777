import { describe, it, expect } from "vitest";
import {
  APEX, BOUNCE_V, GRAVITY, JET_V, MAX_GAP_CAP, MAX_VX, W, aimAngle, canReach, ensureWorld, gapRange,
  newGame, scoreFor, scoreOf, setDir, shoot, step, timeToDescendTo, update, wrapDelta, wrapDist,
  type HopState, type Monster, type Platform, type PlatformKind,
} from "@/arcade/games/sky-hopper/logic";

function plat(kind: PlatformKind, x: number, y: number, id = 900): Platform {
  return { id, kind, x, y, w: 74, vx: 0, minX: x, maxX: x, broken: false, t: -1, squash: 0 };
}

function monster(kind: Monster["kind"], x: number, y: number): Monster {
  return { id: 700, kind, x, y, vx: 0, hx: 23, hy: 20, hp: kind === "brute" ? 3 : 1, alive: true, deadT: -1, phase: 0 };
}

/** An empty page with the player hovering where we want, so single rules can be tested alone. */
function blank(x = 200, y = 400, vy = 0): HopState {
  const s = newGame(1);
  s.platforms = [];
  s.monsters = [];
  s.jets = [];
  s.bullets = [];
  s.x = x;
  s.y = y;
  s.vy = vy;
  s.vx = 0;
  s.camY = y - 300;
  s.maxY = y;
  return s;
}

function run(s: HopState, steps: number) {
  for (let i = 0; i < steps; i++) step(s);
}

/**
 * A steady player: picks the highest platform it can still steer onto on the way down (aiming where a moving
 * one will be) and holds toward it.
 */
function bot(s: HopState) {
  let target: Platform | null = null;
  let tHit = 0;
  let bestScore = -Infinity;
  for (const p of s.platforms) {
    if (p.kind === "break" || p.broken || p.kind === "ground") continue;
    const disc = s.vy * s.vy + 2 * GRAVITY * (s.y - p.y);
    if (disc < 0) continue;
    const t = (s.vy + Math.sqrt(disc)) / GRAVITY;
    if (t < 0.02) continue;
    const dx = Math.abs(wrapDelta(p.x + p.vx * t, s.x));
    if (dx > MAX_VX * t * 0.85) continue;
    const score = p.y - dx * 0.2;
    if (score > bestScore) {
      bestScore = score;
      target = p;
      tHit = t;
    }
  }
  if (!target) return setDir(s, 0);
  const d = wrapDelta(target.x + target.vx * tHit, s.x);
  setDir(s, Math.abs(d) < 5 ? 0 : d > 0 ? 1 : -1);
}

describe("sky hopper", () => {
  it("every platform stays reachable from the one before it, all the way up", () => {
    for (let seed = 1; seed <= 12; seed++) {
      const s = newGame(seed);
      const seen = new Map<number, Platform>();
      while (s.camY < 90000) {
        s.camY += 400;
        ensureWorld(s);
        for (const p of s.platforms) seen.set(p.id, p);
      }
      const chain = [...seen.values()].filter((p) => p.kind !== "break" && p.kind !== "ground").sort((a, b) => a.y - b.y);
      expect(chain.length).toBeGreaterThan(400);
      for (let i = 1; i < chain.length; i++) {
        const a = chain[i - 1];
        const b = chain[i];
        expect(b.y - a.y).toBeLessThanOrEqual(MAX_GAP_CAP);
        expect(canReach(a, b)).toBe(true);
      }
    }
  });

  it("platform spacing grows with height but never beyond what a bounce can reach", () => {
    expect(gapRange(0).max).toBeLessThan(gapRange(8000).max);
    expect(gapRange(8000).max).toBeLessThan(gapRange(30000).max);
    for (let h = 0; h <= 200000; h += 1000) {
      const g = gapRange(h);
      expect(g.max).toBeLessThanOrEqual(MAX_GAP_CAP);
      expect(g.min).toBeLessThanOrEqual(g.max);
      expect(gapRange(h + 1000).max).toBeGreaterThanOrEqual(g.max);
    }
    expect(MAX_GAP_CAP).toBeLessThan(APEX);
    // And what is made really is wider apart higher up.
    const avg = (from: number, to: number) => {
      const s = newGame(5);
      const ys: number[] = [];
      while (s.camY < to + 1000) {
        s.camY += 400;
        ensureWorld(s);
      }
      for (const p of s.platforms) if (p.kind !== "break" && p.kind !== "ground" && p.y >= from && p.y < to) ys.push(p.y);
      ys.sort((a, b) => a - b);
      let sum = 0;
      for (let i = 1; i < ys.length; i++) sum += ys[i] - ys[i - 1];
      return sum / (ys.length - 1);
    };
    expect(avg(20000, 26000)).toBeGreaterThan(avg(0, 2000) * 1.4);
  });

  it("bounces off a platform at the standard speed and rises to the expected height", () => {
    const s = blank(200, 150, 0);
    s.platforms = [plat("normal", 200, 100)];
    let bounced = false;
    for (let i = 0; i < 400 && !bounced; i++) {
      step(s);
      bounced = s.events.includes("bounce");
    }
    expect(bounced).toBe(true);
    expect(s.vy).toBe(BOUNCE_V);
    expect(s.y).toBe(100);
    let top = s.y;
    for (let i = 0; i < 400; i++) {
      step(s);
      top = Math.max(top, s.y);
    }
    expect(top - 100).toBeGreaterThan(APEX - 5);
    expect(top - 100).toBeLessThan(APEX + 5);
    expect(timeToDescendTo(0)).toBeCloseTo((2 * BOUNCE_V) / GRAVITY, 6);
  });

  it("platforms are one-way: you pass up through them and only land coming down", () => {
    const s = blank(200, 60, BOUNCE_V);
    s.platforms = [plat("normal", 200, 120)];
    run(s, 60);
    expect(s.events).not.toContain("bounce");
    expect(s.y).toBeGreaterThan(120);
    expect(s.vy).toBeLessThan(BOUNCE_V);
  });

  it("a breaking platform crumbles and gives no bounce", () => {
    const s = blank(200, 150, -200);
    s.platforms = [plat("break", 200, 100)];
    run(s, 40);
    expect(s.platforms[0].t).toBeGreaterThanOrEqual(0);
    expect(s.events).toContain("crumble");
    expect(s.events).not.toContain("bounce");
    expect(s.vy).toBeLessThan(0);
    expect(s.y).toBeLessThan(100);
  });

  it("a spring launches you much higher; a vanishing platform bounces once then is gone", () => {
    const sp = blank(200, 150, -100);
    sp.platforms = [plat("spring", 200, 100)];
    run(sp, 80);
    let top = 0;
    for (let i = 0; i < 600; i++) {
      step(sp);
      top = Math.max(top, sp.y);
    }
    expect(top - 100).toBeGreaterThan(APEX * 2);

    const v = blank(200, 150, -100);
    v.platforms = [plat("vanish", 200, 100)];
    let vanished = false;
    for (let i = 0; i < 60 && !vanished; i++) {
      step(v);
      vanished = v.events.includes("vanish");
    }
    expect(vanished).toBe(true);
    expect(v.vy).toBe(BOUNCE_V);
    run(v, 40);
    expect(v.platforms[0].broken).toBe(true);
    // Fall back through where it was: no second bounce.
    v.y = 140;
    v.vy = -300;
    run(v, 30);
    expect(v.y).toBeLessThan(100);
  });

  it("wraps around: leave one side and you come back on the other", () => {
    const s = blank(3, 400, 0);
    s.vx = -MAX_VX;
    setDir(s, -1);
    run(s, 4);
    expect(s.x).toBeGreaterThan(W - 10);
    const r = blank(W - 3, 400, 0);
    r.vx = MAX_VX;
    setDir(r, 1);
    run(r, 4);
    expect(r.x).toBeLessThan(10);
    expect(wrapDist(5, W - 5)).toBe(10);
    expect(wrapDelta(5, W - 5)).toBe(10);
    expect(wrapDelta(W - 5, 5)).toBe(-10);
    // Platforms are landed on across the seam too.
    const t = blank(W - 8, 150, -100);
    t.platforms = [plat("normal", 6, 100)];
    run(t, 60);
    expect(t.events).toContain("bounce");
    expect(t.vy).toBeGreaterThan(0);
  });

  it("steering accelerates to a top speed and slides to a stop", () => {
    const s = blank(200, 400, 0);
    s.platforms = [{ ...plat("ground", 200, 300), w: W }]; // a floor to keep bouncing on
    setDir(s, 1);
    run(s, 120);
    expect(s.vx).toBe(MAX_VX);
    setDir(s, 0);
    run(s, 240);
    expect(s.vx).toBe(0);
  });

  it("landing on a monster from above stomps it; touching it any other way is fatal", () => {
    const a = blank(200, 190, -200);
    a.monsters = [monster("blob", 200, 100)];
    let stomped = false;
    for (let i = 0; i < 100 && !stomped; i++) {
      step(a);
      stomped = a.events.includes("stomp");
    }
    expect(stomped).toBe(true);
    expect(a.monsters[0].alive).toBe(false);
    expect(a.alive).toBe(true);
    expect(a.vy).toBe(BOUNCE_V);

    // Rising into it from below.
    const b = blank(200, 40, BOUNCE_V);
    b.monsters = [monster("blob", 200, 100)];
    run(b, 40);
    expect(b.alive).toBe(false);
    expect(b.cause).toBe("monster");

    // Walking into it from the side.
    const c = blank(120, 100, 0);
    c.monsters = [monster("bat", 160, 100)];
    c.vy = 0;
    setDir(c, 1);
    c.vx = MAX_VX;
    run(c, 30);
    expect(c.alive).toBe(false);
  });

  it("a jetpack lifts you fast and plows through monsters without harm", () => {
    const s = blank(200, 200, 0);
    s.jets = [{ x: 200, y: 222, taken: false }];
    s.monsters = [monster("brute", 200, 500)];
    run(s, 2);
    expect(s.jetT).toBeGreaterThan(0);
    run(s, 120);
    expect(s.vy).toBeGreaterThan(JET_V * 0.9);
    let ended = false;
    for (let i = 0; i < 600 && !ended; i++) {
      step(s);
      ended = s.events.includes("jet-end");
      expect(s.alive).toBe(true);
    }
    expect(s.monsters[0].alive).toBe(false);
    expect(s.y).toBeGreaterThan(1800);
  });

  it("the camera only moves up, and falling off the bottom ends the run", () => {
    const s = blank(200, 600, 0);
    s.platforms = [];
    let last = s.camY;
    s.vy = BOUNCE_V;
    for (let i = 0; i < 500; i++) {
      step(s);
      expect(s.camY).toBeGreaterThanOrEqual(last);
      last = s.camY;
      if (!s.alive) break;
    }
    expect(s.alive).toBe(false);
    expect(s.cause).toBe("fell");
    expect(s.events).toContain("fall");
  });

  it("aim never points downward and follows the target when it is above", () => {
    const lo = (15 * Math.PI) / 180;
    expect(aimAngle(200, 100, 200, 400)).toBeCloseTo(Math.PI / 2, 6);
    expect(aimAngle(200, 100, 300, 300)).toBeCloseTo(Math.atan2(200, 100), 6);
    expect(aimAngle(200, 100, 100, 300)).toBeGreaterThan(Math.PI / 2);
    for (let i = 0; i < 400; i++) {
      const a = aimAngle(200, 300, (i * 37) % 400, 300 + ((i * 91) % 500) - 250);
      expect(Math.sin(a)).toBeGreaterThan(0.2);
      expect(a).toBeGreaterThanOrEqual(lo - 1e-9);
      expect(a).toBeLessThanOrEqual(Math.PI - lo + 1e-9);
    }
    expect(aimAngle(200, 300, 380, 100)).toBeCloseTo(lo, 6);
    expect(aimAngle(200, 300, 20, 100)).toBeCloseTo(Math.PI - lo, 6);
  });

  it("bullets kill monsters (a brute takes three), and shooting has a cooldown", () => {
    const s = blank(200, 300, 0);
    s.vy = 0;
    s.monsters = [monster("blob", 200, 500), monster("brute", 120, 700)];
    expect(shoot(s, 200, 600)).toBe(true);
    expect(shoot(s, 200, 600)).toBe(false);
    run(s, 80);
    expect(s.monsters[0].alive).toBe(false);
    expect(s.alive).toBe(true);
    s.vy = 0;
    s.y = 300;
    for (let i = 0; i < 3; i++) {
      s.shootCd = 0;
      s.x = 120;
      s.y = 300;
      s.vy = 0;
      shoot(s, 120, 700);
      run(s, 70);
    }
    expect(s.monsters[1].alive).toBe(false);
  });

  it("score is the height climbed, and the world is the same for the same seed", () => {
    expect(scoreFor(0)).toBe(0);
    expect(scoreFor(99)).toBe(9);
    expect(scoreFor(1234)).toBe(123);
    const s = newGame(3);
    s.maxY = 4567;
    expect(scoreOf(s)).toBe(456);
    const a = newGame(42);
    const b = newGame(42);
    for (const g of [a, b]) {
      g.camY = 20000;
      ensureWorld(g);
    }
    expect(a.platforms.map((p) => [p.kind, Math.round(p.x), p.y])).toEqual(b.platforms.map((p) => [p.kind, Math.round(p.x), p.y]));
  });

  it("a steady bot can climb thousands of points through the generated world", () => {
    for (let seed = 1; seed <= 8; seed++) {
      const s = newGame(seed);
      let n = 0;
      while (s.alive && n < 120 * 150 && s.maxY < 12000) {
        s.monsters.length = 0; // platforms only; monsters have their own tests
        bot(s);
        step(s);
        if (n++ % 3 === 0) ensureWorld(s);
      }
      expect(s.maxY).toBeGreaterThanOrEqual(12000);
    }
  });

  it("a full real-time run climbs, bounces by itself and ends when the player falls", () => {
    const s = newGame(7);
    let t = 0;
    let sawBounce = false;
    // Hold right and let it hop around; it should bounce for a while and then fall off the page.
    setDir(s, 1);
    while (s.alive && t < 120) {
      const ev = update(s, 1 / 60);
      if (ev.includes("bounce") || ev.includes("spring")) sawBounce = true;
      t += 1 / 60;
    }
    expect(sawBounce).toBe(true);
    expect(s.alive).toBe(false);
    expect(s.maxY).toBeGreaterThan(0);
  });
});
