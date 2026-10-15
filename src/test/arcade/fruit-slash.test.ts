import { describe, it, expect } from "vitest";
import {
  ARCADE_SECONDS, COMBO_GAP, FREEZE_SCALE, FRUIT_KINDS, MAX_MISSES, bombChance, endSwipe, fruitRadius, gravityFor, newWorld,
  segmentHitsCircle, slice, spawnWave, step, throwThing, type Thing, type World,
} from "@/arcade/games/fruit-slash/logic";
import { LOOKS } from "@/arcade/games/fruit-slash/art";

const W = 720;
const H = 420;

/** A world with no random spawns, so tests control exactly what is on screen. */
function quiet(mode: "classic" | "arcade" = "classic"): World {
  const w = newWorld(mode, 3, W, H);
  w.spawnTimer = 1e9;
  w.powerTimer = 1e9;
  return w;
}

function put(w: World, x: number, y: number, type: Thing["type"] = "fruit", kind = "apple", vx = 0, vy = 0): Thing {
  const t = throwThing(w, type, kind);
  Object.assign(t, { x, y, vx, vy, spin: 0, seen: true });
  return t;
}

describe("fruit slash: slicing geometry", () => {
  it("detects a segment passing through, grazing, or missing a circle", () => {
    expect(segmentHitsCircle(0, 0, 100, 0, 50, 0, 10)).toBe(true); // through the centre
    expect(segmentHitsCircle(0, 8, 100, 8, 50, 0, 10)).toBe(true); // passes within the radius
    expect(segmentHitsCircle(0, 10, 100, 10, 50, 0, 10)).toBe(true); // exactly tangent
    expect(segmentHitsCircle(0, 12, 100, 12, 50, 0, 10)).toBe(false); // just misses
    expect(segmentHitsCircle(0, 0, 40, 0, 60, 0, 10)).toBe(false); // stops short of the circle
    expect(segmentHitsCircle(0, 0, 55, 0, 60, 0, 10)).toBe(true); // ends inside it
    expect(segmentHitsCircle(55, 3, 55, 3, 50, 0, 10)).toBe(true); // a zero-length swipe on the fruit
    expect(segmentHitsCircle(100, 0, 0, 0, 50, 0, 10)).toBe(true); // direction doesn't matter
  });

  it("fruit size follows the screen", () => {
    expect(fruitRadius(420, 860)).toBeCloseTo(31.5);
    expect(fruitRadius(720, 300)).toBeLessThan(fruitRadius(720, 600));
    expect(fruitRadius(100, 100)).toBeGreaterThanOrEqual(18);
  });
});

describe("fruit slash: slicing fruit", () => {
  it("splits a sliced fruit into two halves along the swipe angle and scores it", () => {
    const w = quiet();
    const t = put(w, 300, 200);
    const events = slice(w, 250, 250, 350, 150); // up and to the right, 45 degrees
    expect(events.filter((e) => e.type === "slice")).toHaveLength(1);
    expect(w.score).toBe(1);
    expect(w.things).not.toContain(t);
    expect(w.halves).toHaveLength(2);
    const [a, b] = w.halves;
    expect(a.cut).toBeCloseTo(Math.atan2(-100, 100));
    expect(a.side).toBe(1);
    expect(b.side).toBe(-1);
    // They fly apart, perpendicular to the cut.
    const nx = -Math.sin(a.cut);
    const ny = Math.cos(a.cut);
    expect(a.vx * nx + a.vy * ny).toBeGreaterThan(0);
    expect(b.vx * nx + b.vy * ny).toBeLessThan(0);
    // And a sliced fruit can't be sliced twice.
    expect(slice(w, 250, 250, 350, 150).filter((e) => e.type === "slice")).toHaveLength(0);
    expect(w.score).toBe(1);
  });

  it("leaves fruit the swipe doesn't touch", () => {
    const w = quiet();
    put(w, 300, 200);
    const far = put(w, 600, 100);
    slice(w, 250, 250, 350, 150);
    expect(w.things).toEqual([far]);
  });

  it("slices everything along a swipe, and three or more in one swipe is a combo", () => {
    const w = quiet();
    for (const x of [200, 300, 400, 500]) put(w, x, 200);
    const ev = slice(w, 150, 200, 550, 200);
    expect(ev.filter((e) => e.type === "slice")).toHaveLength(4);
    expect(w.score).toBe(4);
    const combo = endSwipe(w);
    expect(combo).toEqual([expect.objectContaining({ type: "combo", hits: 4, bonus: 4 })]);
    expect(w.score).toBe(8);
    // Paid once only.
    expect(endSwipe(w)).toEqual([]);
  });

  it("two fruit are not a combo, and separate swipes don't add up", () => {
    const w = quiet();
    put(w, 200, 200);
    put(w, 300, 200);
    slice(w, 150, 200, 350, 200);
    expect(endSwipe(w)).toEqual([]);
    expect(w.score).toBe(2);
    put(w, 200, 300);
    slice(w, 150, 300, 250, 300);
    endSwipe(w);
    put(w, 300, 300);
    slice(w, 250, 300, 350, 300);
    endSwipe(w);
    expect(w.score).toBe(4);
  });

  it("hits too far apart in time are separate combos", () => {
    const w = quiet();
    put(w, 200, 200);
    put(w, 300, 200);
    put(w, 400, 200);
    slice(w, 150, 200, 250, 200);
    step(w, COMBO_GAP + 0.1);
    for (const t of w.things) Object.assign(t, { x: t.x, y: 200, vy: 0 });
    slice(w, 250, 200, 450, 200);
    // One fruit, then two: neither reaches three.
    expect(endSwipe(w)).toEqual([]);
  });
});

describe("fruit slash: misses, bombs and game over", () => {
  it("Classic: a fruit that falls off the bottom is a miss, and the third ends the run", () => {
    const w = quiet();
    const events: string[] = [];
    for (let i = 1; i <= MAX_MISSES; i++) {
      put(w, 300, H + 80, "fruit", "apple", 0, 200);
      for (let k = 0; k < 20 && w.things.length; k++) for (const e of step(w, 0.05)) events.push(`${e.type}${e.type === "miss" ? e.misses : ""}`);
      expect(w.misses).toBe(i);
      expect(w.over).toBe(i === MAX_MISSES);
    }
    expect(events).toEqual(["miss1", "miss2", "miss3", "over"]);
    expect(w.reason).toBe("misses");
    // Nothing more happens once it's over.
    expect(step(w, 0.1)).toEqual([]);
    expect(slice(w, 0, 0, 700, 400)).toEqual([]);
  });

  it("a fruit that is sliced, or a bomb that falls, is not a miss", () => {
    const w = quiet();
    put(w, 300, 200);
    slice(w, 250, 200, 350, 200);
    put(w, 400, H + 80, "bomb", "bomb", 0, 200);
    for (let k = 0; k < 20; k++) step(w, 0.05);
    expect(w.misses).toBe(0);
    expect(w.things).toHaveLength(0);
  });

  it("Classic: slicing a bomb ends the run at once", () => {
    const w = quiet();
    put(w, 300, 200, "bomb", "bomb");
    const ev = slice(w, 250, 200, 350, 200);
    expect(ev.map((e) => e.type)).toEqual(["bomb", "over"]);
    expect(w.over).toBe(true);
    expect(w.reason).toBe("bomb");
  });

  it("Arcade: a bomb costs points instead, and fruit that gets away costs nothing", () => {
    const w = quiet("arcade");
    w.score = 25;
    put(w, 300, 200, "bomb", "bomb");
    slice(w, 250, 200, 350, 200);
    expect(w.over).toBe(false);
    expect(w.score).toBe(15);
    put(w, 400, H + 80, "fruit", "apple", 0, 200);
    for (let k = 0; k < 20; k++) step(w, 0.05);
    expect(w.misses).toBe(0);
    expect(w.over).toBe(false);
  });

  it("Arcade ends when the 60 seconds are up", () => {
    const w = quiet("arcade");
    expect(w.timeLeft).toBe(ARCADE_SECONDS);
    let last: string[] = [];
    for (let i = 0; i < 700 && !w.over; i++) last = step(w, 0.1).map((e) => e.type);
    expect(w.over).toBe(true);
    expect(w.reason).toBe("time");
    expect(last).toContain("over");
    expect(w.elapsed).toBeGreaterThanOrEqual(ARCADE_SECONDS - 0.2);
  });
});

describe("fruit slash: power fruit", () => {
  it("double points doubles slices and combos", () => {
    const w = quiet("arcade");
    put(w, 300, 200, "power", "double");
    slice(w, 250, 200, 350, 200);
    endSwipe(w);
    expect(w.double).toBeGreaterThan(0);
    const before = w.score;
    for (const x of [200, 300, 400]) put(w, x, 300);
    slice(w, 150, 300, 450, 300);
    endSwipe(w);
    expect(w.score - before).toBe(3 * 2 + 3 * 2);
  });

  it("freeze slows everything down and pauses new throws", () => {
    const w = quiet("arcade");
    const t = put(w, 300, 200, "fruit", "apple", 0, 0);
    put(w, 500, 200, "power", "freeze");
    slice(w, 450, 200, 550, 200);
    expect(w.freeze).toBeGreaterThan(0);
    const v0 = t.vy;
    step(w, 0.1);
    // Gravity only acts at the slowed rate.
    expect(t.vy - v0).toBeCloseTo(gravityFor(H) * 0.1 * FREEZE_SCALE, 5);
    w.spawnTimer = 0;
    const n = w.things.length;
    step(w, 0.1);
    expect(w.things.length).toBe(n);
    for (let i = 0; i < 60; i++) step(w, 0.1);
    expect(w.freeze).toBe(0);
  });

  it("frenzy throws lots of fruit with no bombs", () => {
    const w = quiet("arcade");
    w.waves = 40; // late enough that bombs would normally be common
    put(w, 300, 200, "power", "frenzy");
    slice(w, 250, 200, 350, 200);
    expect(w.frenzy).toBeGreaterThan(0);
    w.spawnTimer = 0;
    let thrown = 0;
    let bombs = 0;
    for (let i = 0; i < 40; i++) {
      for (const t of w.things) {
        thrown++;
        if (t.type === "bomb") bombs++;
      }
      w.things = [];
      step(w, 0.1);
    }
    expect(bombs).toBe(0);
    expect(w.frenzy).toBeLessThanOrEqual(1.1);
    expect(thrown).toBeGreaterThan(6);
  });

  it("only Arcade throws power fruit", () => {
    const classic = newWorld("classic", 5, W, H);
    const arcade = newWorld("arcade", 5, W, H);
    arcade.powerTimer = 0;
    arcade.waves = 5;
    let sawPower = false;
    for (let i = 0; i < 300; i++) {
      for (const t of spawnWave(classic)) expect(t.type).not.toBe("power");
      for (const t of spawnWave(arcade)) if (t.type === "power") sawPower = true;
      arcade.powerTimer = 0;
    }
    expect(sawPower).toBe(true);
  });
});

describe("fruit slash: throwing", () => {
  it("fruit starts below the screen and arcs up into view, then comes back down", () => {
    const w = quiet();
    const t = throwThing(w, "fruit", "orange");
    expect(t.y).toBeGreaterThan(H);
    expect(t.vy).toBeLessThan(0);
    let top = t.y;
    let spent = 0;
    for (let i = 0; i < 400; i++) {
      step(w, 1 / 60);
      top = Math.min(top, t.y);
      spent++;
      if (!w.things.includes(t)) break;
    }
    expect(top).toBeLessThan(H * 0.65); // every arc peaks well inside the screen
    expect(top).toBeGreaterThan(-H * 0.1);
    expect(spent).toBeLessThan(400);
    expect(t.x).toBeGreaterThan(-100);
    expect(t.x).toBeLessThan(W + 100);
  });

  it("has at least eight fruit types, each with a look, and bombs come only after a few waves", () => {
    expect(FRUIT_KINDS.length).toBeGreaterThanOrEqual(8);
    for (const k of FRUIT_KINDS) expect(LOOKS[k]).toBeTruthy();
    expect(bombChance(0)).toBe(0);
    expect(bombChance(2)).toBe(0);
    expect(bombChance(10)).toBeGreaterThan(0);
    expect(bombChance(500)).toBeLessThanOrEqual(0.2);
    const w = newWorld("classic", 9, W, H);
    for (let i = 0; i < 3; i++) for (const t of spawnWave(w)) expect(t.type).toBe("fruit");
  });

  it("is repeatable for a seed", () => {
    const a = newWorld("classic", 77, W, H);
    const b = newWorld("classic", 77, W, H);
    const sa = spawnWave(a).map((t) => [t.kind, Math.round(t.x), Math.round(t.vy)]);
    const sb = spawnWave(b).map((t) => [t.kind, Math.round(t.x), Math.round(t.vy)]);
    expect(sa).toEqual(sb);
  });
});
