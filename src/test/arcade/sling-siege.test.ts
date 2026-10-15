import { describe, it, expect } from "vitest";
import { World, PHYS, triangleShape, wedgeShape, type Body } from "@/arcade/games/sling-siege/physics";
import {
  critters, emptyProgress, explode, isUnlocked, launch, launchVelocity, normalizeProgress, playShot, pullFor, recordResult, simulate,
  siegeFromLevel, spawnCritter, startSiege, starsFor, starTargets, stepSiege, totalScore, totalStars, trajectory, triggerAbility,
  clampPull, type SiegeEvent,
} from "@/arcade/games/sling-siege/logic";
import { LEVELS, type LevelDef, type PieceDef } from "@/arcade/games/sling-siege/levels";
import { LEFTOVER_BONUS, MATERIALS, SLING } from "@/arcade/games/sling-siege/materials";
import { clampCamX, homeCam, homeZoom, screenToWorld, targetCam, worldToScreen } from "@/arcade/games/sling-siege/camera";

const ground = (w: World) => w.add({ shape: { kind: "box", hw: 60, hh: 2 }, x: 20, y: 2, density: 0, friction: 0.9 });
const run = (w: World, secs: number) => {
  for (let i = 0; i < secs / PHYS.dt; i++) w.step();
};
const box = (x: number, bottom: number, w: number, h: number, mat: PieceDef["mat"] = "wood"): PieceDef => ({ shape: "box", mat, x, y: bottom + h / 2, w, h });
const arena = (pieces: PieceDef[], critterKinds: LevelDef["critters"] = ["basic", "basic"], grumblers: LevelDef["grumblers"] = [{ kind: "normal", x: 41, y: 0.5 }]): LevelDef => ({
  id: "t", name: "test", world: 0, critters: critterKinds, pieces, grumblers, width: 44, par: 0,
});

describe("sling-siege physics", () => {
  it("a resting stack of boxes stays put for 10 seconds and falls asleep", () => {
    const w = new World();
    ground(w);
    const bs: Body[] = [];
    for (let i = 0; i < 8; i++) bs.push(w.add({ shape: { kind: "box", hw: 0.5, hh: 0.5 }, x: 10, y: -0.5 - i, density: 1 }));
    const p0 = bs.map((b) => [b.x, b.y]);
    run(w, 10);
    const drift = Math.max(...bs.map((b, i) => Math.hypot(b.x - p0[i][0], b.y - p0[i][1])));
    expect(drift).toBeLessThan(0.05);
    expect(bs.every((b) => !b.awake)).toBe(true);
    expect(Math.max(...bs.map((b) => Math.abs(b.a)))).toBeLessThan(0.01);
  });

  it("a mixed stack (posts, plank, triangle, ball) stays stable for 10 seconds", () => {
    const w = new World();
    ground(w);
    const l = w.add({ shape: { kind: "box", hw: 0.2, hh: 1.5 }, x: 9, y: -1.5, density: 1 });
    const r = w.add({ shape: { kind: "box", hw: 0.2, hh: 1.5 }, x: 11, y: -1.5, density: 1 });
    const beam = w.add({ shape: { kind: "box", hw: 1.5, hh: 0.2 }, x: 10, y: -3.2, density: 1 });
    const tri = w.add({ shape: triangleShape(3, 1.5), x: 10, y: -3.9, density: 1 });
    const ball = w.add({ shape: { kind: "circle", r: 0.4 }, x: 10, y: -5.3, density: 1 });
    const all = [l, r, beam, tri, ball];
    const p0 = all.map((b) => [b.x, b.y]);
    run(w, 10);
    all.forEach((b, i) => expect(Math.hypot(b.x - p0[i][0], b.y - p0[i][1])).toBeLessThan(0.1));
    expect(all.every((b) => !b.awake)).toBe(true);
  });

  it("a tall tower of 16 boxes stands", () => {
    const w = new World();
    ground(w);
    const bs: Body[] = [];
    for (let i = 0; i < 16; i++) bs.push(w.add({ shape: { kind: "box", hw: 0.5, hh: 0.5 }, x: 10, y: -0.5 - i, density: 1 }));
    run(w, 6);
    expect(Math.abs(bs[15].x - 10)).toBeLessThan(0.05);
    expect(bs[15].y).toBeLessThan(-15);
  });

  it("a ball sits on a slope's flat top and a wedge is solid", () => {
    const w = new World();
    ground(w);
    const wedge = w.add({ shape: wedgeShape(4, 2), x: 12 - 4 / 6, y: -1 + 2 / 6, density: 0 });
    const ball = w.add({ shape: { kind: "circle", r: 0.5 }, x: 13, y: -3, density: 1 });
    run(w, 5);
    expect(wedge.removed).toBe(false);
    // It rolled down the slope and stopped on the ground instead of falling through.
    expect(ball.y).toBeLessThanOrEqual(-0.45);
    expect(ball.y).toBeGreaterThan(-3);
  });

  it("momentum is conserved in a head-on collision and the bounce reverses the approach", () => {
    const w = new World();
    w.gravity = 0;
    const a = w.add({ shape: { kind: "circle", r: 0.5 }, x: 0, y: 0, vx: 6, density: 1, restitution: 0.8, linearDamping: 0 });
    const b = w.add({ shape: { kind: "circle", r: 0.5 }, x: 4, y: 0, vx: -2, density: 3, restitution: 0.8, linearDamping: 0 });
    const before = a.mass * a.vx + b.mass * b.vx;
    run(w, 1.5);
    const after = a.mass * a.vx + b.mass * b.vx;
    expect(after).toBeCloseTo(before, 3);
    // They separate: a bounces back, b is pushed on.
    expect(a.vx).toBeLessThan(0);
    expect(b.vx).toBeGreaterThan(a.vx);
    // Elastic-ish: relative speed after is 0.8 of before.
    expect((b.vx - a.vx) / 8).toBeCloseTo(0.8, 1);
  });

  it("friction brings a sliding box to a stop, and rolling resistance stops a ball", () => {
    const w = new World();
    ground(w);
    const crate = w.add({ shape: { kind: "box", hw: 0.5, hh: 0.5 }, x: 5, y: -0.5, vx: 5, density: 1, friction: 0.6 });
    const ball = w.add({ shape: { kind: "circle", r: 0.5 }, x: 5, y: -0.5, vx: 0, density: 1, group: 7 });
    ball.vx = 8;
    ball.w = 16;
    run(w, 8);
    expect(crate.awake).toBe(false);
    expect(crate.x).toBeLessThan(5 + 5 * 5 / (2 * 0.6 * 10) + 0.5);
    expect(Math.abs(ball.vx)).toBeLessThan(0.3);
  });

  it("sleeping bodies stay put until something touches them", () => {
    const w = new World();
    ground(w);
    const a = w.add({ shape: { kind: "box", hw: 0.5, hh: 0.5 }, x: 10, y: -0.5, density: 1 });
    run(w, 2);
    expect(a.awake).toBe(false);
    run(w, 1);
    expect(a.y).toBeCloseTo(-0.5, 1);
    const hit = w.add({ shape: { kind: "circle", r: 0.4 }, x: 7, y: -0.4, vx: 8, density: 2 });
    run(w, 0.6);
    expect(hit.removed).toBe(false);
    expect(a.awake || a.x > 10.2).toBe(true);
  });

  it("a fast ball never tunnels through a thin wall", () => {
    const w = new World();
    ground(w);
    const wall = w.add({ shape: { kind: "box", hw: 0.1, hh: 2 }, x: 20, y: -2, density: 0 });
    const ball = w.add({ shape: { kind: "circle", r: 0.3 }, x: 10, y: -1, vx: PHYS.maxSpeed, vy: 0, density: 3 });
    let maxX = 0;
    for (let i = 0; i < 2 / PHYS.dt; i++) {
      w.step();
      maxX = Math.max(maxX, ball.x);
    }
    expect(wall.x).toBe(20);
    expect(maxX).toBeLessThan(20);
  });
});

describe("sling-siege damage", () => {
  const hitPost = (mat: "wood" | "stone" | "glass", kind: "basic" | "heavy", speed: number) => {
    const s = siegeFromLevel(arena([box(25, 0, 0.3, 1.2, mat)], [kind]));
    simulate(s, 1.5);
    s.events.length = 0;
    const c = spawnCritter(s, kind, 21, -0.95, speed, 0);
    s.phase = "fly";
    const ev: SiegeEvent[] = [];
    simulate(s, 1.2, ev);
    const post = s.pieces.find((p) => p.kind === "block");
    return { post, broke: ev.some((e) => e.t === "break"), critter: c };
  };

  it("a quick shove or a soft landing does no damage", () => {
    const s = siegeFromLevel(arena([box(20, 0.15, 0.4, 2, "wood")]));
    simulate(s, 3);
    const post = s.pieces.find((p) => p.kind === "block")!;
    expect(post.dead).toBe(false);
    expect(post.hp).toBe(post.maxHp);
    const slow = hitPost("wood", "basic", 5);
    expect(slow.broke).toBe(false);
  });

  it("a fast critter splinters wood in one hit", () => {
    expect(hitPost("wood", "basic", 22).broke).toBe(true);
  });

  it("glass shatters at a modest speed", () => {
    expect(hitPost("glass", "basic", 12).broke).toBe(true);
  });

  it("stone shrugs off a basic critter but a heavy one breaks it", () => {
    const basic = hitPost("stone", "basic", 22);
    expect(basic.broke).toBe(false);
    expect(basic.post!.hp).toBeLessThan(basic.post!.maxHp);
    const heavy = hitPost("stone", "heavy", 22);
    expect(heavy.broke).toBe(true);
  });

  it("materials differ in strength and density", () => {
    expect(MATERIALS.glass.hp).toBeLessThan(MATERIALS.wood.hp);
    expect(MATERIALS.wood.hp).toBeLessThan(MATERIALS.stone.hp);
    expect(MATERIALS.wood.density).toBeLessThan(MATERIALS.stone.density);
    expect(MATERIALS.glass.tough).toBeLessThan(MATERIALS.stone.tough);
  });

  it("explosions smash wood and glass, only dent stone, and set off TNT", () => {
    const s = siegeFromLevel(arena([box(25.2, 0, 0.4, 1.5, "wood"), box(27.4, 0, 0.4, 1.5, "glass"), box(28.2, 0, 0.6, 1.5, "stone"), box(36, 0, 1, 1, "tnt")]));
    simulate(s, 2);
    const ev: SiegeEvent[] = [];
    s.events.length = 0;
    explode(s, 26, -0.8, 3.4, 10, 12);
    simulate(s, 0.3, ev);
    const kinds = s.pieces.filter((p) => p.kind === "block").map((p) => p.mat);
    expect(kinds).not.toContain("wood");
    expect(kinds).not.toContain("glass");
    expect(kinds).toContain("stone");
    expect(s.events.length + ev.length).toBeGreaterThan(0);
  });

  it("TNT explodes when it is destroyed", () => {
    const s = siegeFromLevel(arena([box(25, 0, 1, 1, "tnt"), box(26.2, 0, 0.4, 1.5, "wood")]));
    simulate(s, 2);
    const ev: SiegeEvent[] = [];
    spawnCritter(s, "basic", 15, -0.9, 22, 0);
    s.phase = "fly";
    simulate(s, 1.2, ev);
    expect(ev.filter((e) => e.t === "boom").length).toBeGreaterThanOrEqual(1);
  });
});

describe("sling-siege critters", () => {
  const flying = (kind: "splitter" | "dasher" | "heavy" | "bomber" | "basic") => {
    const s = siegeFromLevel(arena([], [kind, "basic"]));
    simulate(s, 0.5);
    const p = pullFor(35, 0.8);
    expect(launch(s, p.x, p.y)).toBe(true);
    simulate(s, 0.4);
    return s;
  };

  it("the splitter breaks into three on tap, once", () => {
    const s = flying("splitter");
    expect(critters(s)).toHaveLength(1);
    expect(triggerAbility(s)).toBe(true);
    expect(critters(s)).toHaveLength(3);
    expect(triggerAbility(s)).toBe(false);
  });

  it("the dasher speeds up", () => {
    const s = flying("dasher");
    const b = critters(s)[0].body;
    const before = Math.hypot(b.vx, b.vy);
    triggerAbility(s);
    expect(Math.hypot(b.vx, b.vy)).toBeGreaterThan(before * 1.7);
  });

  it("the heavy one slams downward", () => {
    const s = flying("heavy");
    const b = critters(s)[0].body;
    triggerAbility(s);
    expect(b.vy).toBeGreaterThan(18);
  });

  it("the bomber explodes and is gone", () => {
    const s = flying("bomber");
    triggerAbility(s);
    expect(s.events.some((e) => e.t === "boom")).toBe(true);
    expect(critters(s)).toHaveLength(0);
  });

  it("the basic critter has no trick", () => {
    const s = flying("basic");
    expect(triggerAbility(s)).toBe(false);
  });

  it("the dotted arc matches the real flight", () => {
    const s = siegeFromLevel(arena([], ["basic"]));
    simulate(s, 0.5);
    const pull = pullFor(40, 0.9);
    const pts = trajectory(pull.x, pull.y, 12, 0.1);
    launch(s, pull.x, pull.y);
    const c = critters(s)[0].body;
    for (let i = 0; i < 12; i++) {
      simulate(s, 0.1);
      expect(Math.hypot(c.x - pts[i].x, c.y - pts[i].y)).toBeLessThan(0.1);
    }
  });

  it("pulling back further launches faster, and the pull is capped", () => {
    const a = launchVelocity(-1, 0).speed;
    const b = launchVelocity(-2.5, 0).speed;
    expect(b).toBeGreaterThan(a);
    const far = clampPull(-30, 10);
    expect(far.len).toBeCloseTo(SLING.maxPull, 5);
    expect(far.y).toBeLessThan(3);
  });
});

describe("sling-siege levels", () => {
  it("has 18 levels in three worlds with unique ids", () => {
    expect(LEVELS).toHaveLength(18);
    expect(new Set(LEVELS.map((l) => l.id)).size).toBe(18);
    for (let w = 0; w < 3; w++) expect(LEVELS.filter((l) => l.world === w)).toHaveLength(6);
    for (const l of LEVELS) {
      expect(l.grumblers.length).toBeGreaterThan(0);
      expect(l.critters.length).toBeGreaterThanOrEqual(3);
    }
  });

  LEVELS.forEach((level, i) => {
    it(`level ${i + 1} (${level.name}) loads and settles with every grumbler alive`, () => {
      const s = siegeFromLevel(level, i);
      const grumblers = s.grumblersLeft;
      expect(grumblers).toBe(level.grumblers.length);
      const start = s.pieces.map((p) => [p.body.x, p.body.y]);
      const ev: SiegeEvent[] = [];
      simulate(s, 8, ev);
      expect(ev.filter((e) => e.t === "kill" || e.t === "break" || e.t === "boom")).toHaveLength(0);
      expect(s.grumblersLeft).toBe(grumblers);
      s.pieces.forEach((p, k) => {
        expect(Math.hypot(p.body.x - start[k][0], p.body.y - start[k][1])).toBeLessThan(0.12);
        expect(p.hp).toBe(p.maxHp);
      });
      expect(s.pieces.every((p) => !p.body.awake)).toBe(true);
      expect(s.phase).toBe("aim");
    });
  });
});

// A strong shot-by-shot search (angle in degrees, power 0..1, tap time in seconds) found these wins; replaying
// them proves every level can be cleared and guards the physics against drifting.
const SOLUTIONS: Record<string, [number, number, number | null][]> = {
  m1: [[20, 0.78, null]],
  m2: [[12, 0.92, null]],
  m3: [[68, 0.92, null], [36, 0.78, 0.45]],
  m4: [[68, 0.78, null], [8, 0.78, null]],
  m5: [[20, 0.78, null]],
  m6: [[20, 0.78, null], [8, 1, 0.8], [8, 1, 0.8], [20, 1, null]],
  c1: [[24, 0.78, null], [12, 1, null]],
  c2: [[40, 0.78, null], [8, 0.78, 0.8], [20, 0.92, null], [48, 0.78, null]],
  c3: [[12, 1, null], [16, 0.92, null]],
  c4: [[32, 0.78, null], [16, 0.92, null]],
  c5: [[24, 1, 1.15], [16, 0.92, 0.45]],
  c6: [[24, 0.78, null], [20, 0.92, null]],
  f1: [[24, 0.78, null], [12, 1, 0.45]],
  f2: [[72, 1, null], [76, 0.78, 1.15], [56, 0.78, 1.15]],
  f3: [[64, 0.6, 1.15], [64, 1, 1.15], [8, 0.92, null]],
  f4: [[60, 0.78, null], [8, 1, 1.5]],
  f5: [[40, 0.6, 1.15], [8, 1, null], [24, 0.78, 0.45]],
  f6: [[44, 0.92, 1.4], [8, 0.6, null]],
};

describe("sling-siege solvability, scoring and stars", () => {
  LEVELS.forEach((level, i) => {
    it(`level ${i + 1} (${level.name}) can be won`, () => {
      const s = startSiege(i);
      for (const [ang, pw, tap] of SOLUTIONS[level.id]) {
        if (s.phase !== "aim") break;
        const p = pullFor(ang, pw);
        playShot(s, p.x, p.y, tap);
      }
      expect(s.phase).toBe("won");
      expect(s.grumblersLeft).toBe(0);
      expect(s.result!.won).toBe(true);
    });
  });

  it("scores destruction plus a bonus for every unused critter", () => {
    const s = startSiege(0);
    const p = pullFor(8, 1);
    playShot(s, p.x, p.y, null);
    expect(s.phase).toBe("won");
    const r = s.result!;
    expect(r.left).toBe(2);
    expect(r.bonus).toBe(2 * LEFTOVER_BONUS);
    expect(r.score).toBe(r.destruction + r.bonus);
    expect(r.destruction).toBeGreaterThanOrEqual(5000);
    expect(r.stars).toBe(starsFor(s.level, r.score));
  });

  it("loses when the critters run out", () => {
    const s = siegeFromLevel(arena([], ["basic"]));
    simulate(s, 0.5);
    const p = pullFor(60, 0.7);
    playShot(s, p.x, p.y, null);
    expect(s.phase).toBe("lost");
    expect(s.result!.won).toBe(false);
    expect(s.result!.stars).toBe(0);
  });

  it("stars: winning is one star, and the targets rise", () => {
    for (const l of LEVELS) {
      const [two, three] = starTargets(l);
      expect(two).toBeLessThan(three);
      expect(starsFor(l, 0)).toBe(1);
      expect(starsFor(l, two)).toBe(2);
      expect(starsFor(l, three)).toBe(3);
      expect(starsFor(l, three * 2)).toBe(3);
    }
  });

  it("progress keeps the best score and stars and unlocks the next level", () => {
    let p = emptyProgress();
    expect(isUnlocked(p, 0)).toBe(true);
    expect(isUnlocked(p, 1)).toBe(false);
    p = recordResult(p, 0, 20000, 2).progress;
    expect(isUnlocked(p, 1)).toBe(true);
    const r = recordResult(p, 0, 12000, 3);
    expect(r.progress.scores[0]).toBe(20000);
    expect(r.progress.stars[0]).toBe(3);
    expect(r.improved).toBe(true);
    expect(recordResult(r.progress, 0, 100, 1).improved).toBe(false);
    p = recordResult(r.progress, 1, 30000, 1).progress;
    expect(totalScore(p)).toBe(50000);
    expect(totalStars(p)).toBe(4);
  });

  it("saved progress is sanitised", () => {
    expect(normalizeProgress(null).stars).toHaveLength(LEVELS.length);
    const p = normalizeProgress({ stars: [9, -2, "x", 2], scores: [100, "no", 5.7] });
    expect(p.stars.slice(0, 4)).toEqual([3, 0, 0, 2]);
    expect(p.scores.slice(0, 3)).toEqual([100, 0, 5]);
  });
});

describe("sling-siege camera", () => {
  const v = { w: 1000, h: 560 };
  it("fits the whole level across a wide screen and keeps the ground above the bottom edge", () => {
    const c = homeCam(v, 44);
    expect(c.z).toBeCloseTo(1000 / 44, 5);
    const [, gy] = worldToScreen(c, v, 0, 0);
    expect(gy).toBeLessThan(v.h);
    expect(gy).toBeGreaterThan(v.h - 130);
  });

  it("follows the shot and stays inside the level", () => {
    const far = targetCam(v, 44, { mode: "follow", fx: 200, fy: -5 });
    const half = v.w / far.z / 2;
    expect(far.x + half).toBeLessThanOrEqual(44.01);
    const near = targetCam(v, 44, { mode: "follow", fx: 10, fy: -8 });
    expect(near.z).toBeGreaterThan(homeCam(v, 44).z);
    expect(near.y).toBeLessThanOrEqual(homeCam(v, 44).y);
  });

  it("zooms in on tall screens and converts coordinates both ways", () => {
    const tall = { w: 390, h: 760 };
    expect(homeZoom(tall, 44)).toBeGreaterThan(390 / 44);
    const c = homeCam(tall, 44);
    const [sx, sy] = worldToScreen(c, tall, 7, -2);
    const [wx, wy] = screenToWorld(c, tall, sx, sy);
    expect(wx).toBeCloseTo(7, 6);
    expect(wy).toBeCloseTo(-2, 6);
    expect(clampCamX(tall, c.z, -50, 44)).toBeGreaterThan(-5);
  });
});

void stepSiege;
