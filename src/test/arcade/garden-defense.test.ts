import { describe, expect, it } from "vitest";
import { COLS, GNOMES, PLANTS, SUN_VALUE } from "@/arcade/games/garden-defense/defs";
import { LEVELS } from "@/arcade/games/garden-defense/levels";
import {
  buildSchedule, collectSun, emptyProgress, hurtGnome, isUnlocked, levelsCleared, markCleared, newGame, nextLevel, placePlant, plantCheck,
  removePlant, update, type GameState, type Gnome,
} from "@/arcade/games/garden-defense/logic";
import { mulberry32 } from "@/arcade/kit/rng";

/** A game with plenty of sun and no gnomes due, so tests add their own. */
function quiet(level = 0): GameState {
  const s = newGame(level, 1);
  // One gnome far in the future keeps the level going (an empty schedule counts as already won).
  s.schedule = [{ t: 1e9, kind: "basic", lane: s.level.lanes[0], wave: 0 }];
  s.next = 0;
  s.sun = 5000;
  for (const k of Object.keys(s.cool)) s.cool[k as keyof typeof s.cool] = 0;
  return s;
}

function addGnome(s: GameState, kind: Gnome["kind"], lane: number, x: number): Gnome {
  const d = GNOMES[kind];
  const g: Gnome = {
    uid: s.uid++, kind, lane, x, hp: d.hp, maxHp: d.hp, armor: d.armor, shield: d.shield, state: "walk", slow: 0, flash: 0, bite: 0,
    vaultT: 0, vaultFrom: 0, vaultTo: 0, vaulted: false, dieT: 0, hat: true, phase: 0, mowed: false,
  };
  s.gnomes.push(g);
  return g;
}

const run = (s: GameState, seconds: number) => {
  const events = [];
  for (let t = 0; t < seconds; t += 0.05) events.push(...update(s, 0.05));
  return events;
};

describe("garden defense", () => {
  it("every level has a valid wave script with gnomes only in its live lanes", () => {
    expect(LEVELS).toHaveLength(10);
    for (const level of LEVELS) {
      expect(level.waves.length).toBeGreaterThan(0);
      expect(level.waves[level.waves.length - 1].big).toBe(true);
      const sched = buildSchedule(level, mulberry32(level.id));
      expect(sched.length).toBeGreaterThan(0);
      for (const sp of sched) {
        expect(level.lanes).toContain(sp.lane);
        expect(level.gnomes).toContain(sp.kind);
      }
      for (let i = 1; i < sched.length; i++) expect(sched[i].t).toBeGreaterThanOrEqual(sched[i - 1].t);
      for (const p of level.plants) expect(PLANTS[p]).toBeDefined();
    }
  });

  it("planting costs sun, starts a cooldown, and refuses taken tiles, bare lanes and empty purses", () => {
    const s = quiet();
    const lane = s.level.lanes[0];
    const before = s.sun;
    expect(placePlant(s, "pea", lane, 0)).toBe(true);
    expect(s.sun).toBe(before - PLANTS.pea.cost);
    expect(plantCheck(s, "pea", lane, 1)).toBe("cooldown");
    s.cool.pea = 0;
    expect(plantCheck(s, "pea", lane, 0)).toBe("occupied");
    const dead = [0, 1, 2, 3, 4].find((l) => !s.level.lanes.includes(l));
    if (dead !== undefined) expect(plantCheck(s, "pea", dead, 3)).toBe("lane");
    s.sun = 10;
    expect(plantCheck(s, "pea", lane, 2)).toBe("sun");
    expect(removePlant(s, lane, 0)).toBe(true);
    expect(s.grid[lane * COLS]).toBeNull();
  });

  it("sun falls from the sky and can be collected", () => {
    const s = quiet();
    s.sun = 0;
    run(s, 12);
    expect(s.suns.length).toBeGreaterThan(0);
    expect(collectSun(s, s.suns[0].uid)).toBe(SUN_VALUE);
    expect(s.sun).toBe(SUN_VALUE);
  });

  it("a pea pod shoots down a gnome in its lane", () => {
    const s = quiet();
    const [lane] = s.level.lanes;
    placePlant(s, "pea", lane, 0);
    const g = addGnome(s, "basic", lane, COLS - 1);
    run(s, 30);
    expect(g.state).toBe("die");
    expect(s.killed).toBeGreaterThanOrEqual(1);
  });

  it("armour soaks damage first and the hat falls off", () => {
    const s = quiet();
    const g = addGnome(s, "cone", s.level.lanes[0], 5);
    hurtGnome(s, g, GNOMES.cone.armor + 10);
    expect(g.armor).toBe(0);
    expect(g.hp).toBe(GNOMES.cone.hp - 10);
  });

  it("a gnome stops to eat a plant in its way", () => {
    const s = quiet();
    const lane = s.level.lanes[0];
    expect(placePlant(s, s.level.plants[0], lane, 4)).toBe(true);
    const g = addGnome(s, "basic", lane, 5.6);
    run(s, 2.5);
    expect(g.state).toBe("eat");
    const plant = s.grid[lane * COLS + 4]!;
    expect(plant.hp).toBeLessThan(plant.maxHp);
  });

  it("a pole vaulter hops over the first plant and lands past it", () => {
    const s = quiet(LEVELS.findIndex((l) => l.gnomes.includes("vaulter")));
    const lane = s.level.lanes[0];
    expect(placePlant(s, "nut", lane, 5)).toBe(true);
    const g = addGnome(s, "vaulter", lane, 7);
    run(s, 8);
    expect(g.vaulted).toBe(true);
    expect(g.x).toBeLessThan(5);
  });

  it("a lawn mower clears the lane once, then the next gnome to reach the house wins it", () => {
    const s = quiet();
    const lane = s.level.lanes[0];
    addGnome(s, "basic", lane, 0.2);
    const ev = run(s, 4);
    expect(ev.some((e) => e.type === "mower")).toBe(true);
    expect(s.mowers.find((m) => m.lane === lane)!.state).not.toBe("idle");
    run(s, 4);
    addGnome(s, "basic", lane, 0.1);
    const ev2 = run(s, 6);
    expect(ev2.some((e) => e.type === "lose")).toBe(true);
    expect(s.status).toBe("lost");
  });

  it("a cherry blast wipes out gnomes around it", () => {
    const s = quiet(LEVELS.findIndex((l) => l.plants.includes("cherry")));
    const lane = s.level.lanes[Math.floor(s.level.lanes.length / 2)];
    const near = addGnome(s, "bucket", lane, 4.6);
    expect(placePlant(s, "cherry", lane, 4)).toBe(true);
    run(s, 2);
    expect(near.state).toBe("die");
  });

  it("clearing a level unlocks the next and counts toward the score", () => {
    let p = emptyProgress();
    expect(isUnlocked(p, 1)).toBe(false);
    p = markCleared(p, 0);
    expect(isUnlocked(p, 1)).toBe(true);
    expect(nextLevel(p)).toBe(1);
    expect(levelsCleared(p)).toBe(1);
  });

  it("a well-defended first level is won once every scheduled gnome is beaten", () => {
    const s = newGame(0, 4);
    s.sun = 9990;
    for (const lane of s.level.lanes) for (let c = 0; c < 3; c++) {
      for (const k of Object.keys(s.cool)) s.cool[k as keyof typeof s.cool] = 0;
      placePlant(s, "pea", lane, c);
    }
    for (let i = 0; i < 20 * 60 * 10 && s.status === "playing"; i++) update(s, 0.1);
    expect(s.status).toBe("won");
  });
});
