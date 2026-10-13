import { describe, expect, it } from "vitest";
import {
  AMMO, BLAST_GROW, BONUS_CITY_EVERY, CITY_X, GROUND, awardBonusCities, blastRadius, fire, launchThreat, nearestBase, newGame, step, waveSpec,
  type MdState,
} from "@/arcade/games/missile-defense/logic";

/** A game with nothing left to launch, so tests control every threat. */
function quiet(seed = 1): MdState {
  const s = newGame(seed);
  s.toLaunch = 0;
  s.bombersToLaunch = 0;
  return s;
}

const run = (s: MdState, seconds: number) => {
  const events = [];
  for (let t = 0; t < seconds; t += 1 / 60) events.push(...step(s, 1 / 60));
  return events;
};

describe("missile defense", () => {
  it("starts with six cities and three bases of ten interceptors", () => {
    const s = newGame(5);
    expect(s.cities).toEqual([true, true, true, true, true, true]);
    expect(s.bases.map((b) => b.ammo)).toEqual([AMMO, AMMO, AMMO]);
    expect(s.wave).toBe(1);
  });

  it("spends ammo per base and refuses to fire from an empty base", () => {
    const s = quiet();
    for (let i = 0; i < AMMO; i++) expect(fire(s, 0, 100, 200)).toBe(true);
    expect(s.bases[0].ammo).toBe(0);
    expect(fire(s, 0, 100, 200)).toBe(false);
    expect(s.bases[1].ammo).toBe(AMMO);
    // A tap now goes to the nearest base that can still fire.
    expect(nearestBase(s, 50)).toBe(1);
  });

  it("bursts an interceptor at its target, and the blast grows then fades", () => {
    const s = quiet();
    fire(s, 1, 400, 300);
    run(s, 1);
    expect(s.shots).toHaveLength(0);
    const b = { x: 0, y: 0, t: 0, friendly: true, size: 1 };
    expect(blastRadius(b)).toBe(0);
    expect(blastRadius({ ...b, t: BLAST_GROW })).toBeGreaterThan(40);
    expect(blastRadius({ ...b, t: 5 })).toBe(0);
  });

  it("destroys a warhead that flies into a blast, and scores it", () => {
    const s = quiet();
    const t = launchThreat(s, "warhead", 300, 100);
    t.tx = 300;
    t.ty = GROUND;
    s.blasts.push({ x: 300, y: 140, t: BLAST_GROW, friendly: true, size: 1 });
    const ev = run(s, 0.5);
    expect(ev.some((e) => e.type === "kill")).toBe(true);
    expect(s.threats).toHaveLength(0);
    expect(s.score).toBe(25 * waveSpec(1).multiplier);
  });

  it("splits a MIRV into several warheads when it falls low enough", () => {
    const s = quiet();
    const m = launchThreat(s, "mirv", 400, 0);
    m.splitY = 50;
    const ev = run(s, 3);
    expect(ev.some((e) => e.type === "split")).toBe(true);
    // The parent is gone; its children are live warheads (or have already landed).
    expect(s.threats.every((t) => t.kind === "warhead")).toBe(true);
  });

  it("knocks out a city when a warhead lands on it", () => {
    const s = quiet();
    const t = launchThreat(s, "warhead", CITY_X[2], GROUND - 30);
    t.tx = CITY_X[2];
    t.ty = GROUND - 6;
    const ev = run(s, 2);
    expect(ev.some((e) => e.type === "city" && e.index === 2)).toBe(true);
    expect(s.cities[2]).toBe(false);
  });

  it("speeds up and adds more threats each wave", () => {
    expect(waveSpec(5).count).toBeGreaterThan(waveSpec(1).count);
    expect(waveSpec(5).speed).toBeGreaterThan(waveSpec(1).speed);
    expect(waveSpec(1).mirvChance).toBe(0);
    expect(waveSpec(6).smartChance).toBeGreaterThan(0);
    expect(waveSpec(20).multiplier).toBe(6);
  });

  it("pays a bonus for spare ammo and cities when the wave is cleared, then starts the next", () => {
    const s = quiet();
    const ev = run(s, 0.2);
    const end = ev.find((e) => e.type === "waveEnd");
    expect(end).toBeDefined();
    if (end?.type === "waveEnd") expect(end.bonus).toBe((AMMO * 3 * 5 + 6 * 100) * waveSpec(1).multiplier);
    run(s, 3.5);
    expect(s.wave).toBe(2);
    expect(s.bases.every((b) => b.ammo === AMMO)).toBe(true);
  });

  it("rebuilds a city for every 10,000 points", () => {
    const s = quiet();
    s.cities[0] = false;
    s.cities[3] = false;
    s.score = BONUS_CITY_EVERY * 2 + 5;
    awardBonusCities(s);
    expect(s.cities).toEqual([true, true, true, true, true, true]);
    expect(s.nextBonusAt).toBe(BONUS_CITY_EVERY * 3);
  });

  it("ends the game when the last city falls", () => {
    const s = quiet();
    s.cities = [false, false, false, false, false, true];
    const t = launchThreat(s, "warhead", CITY_X[5], GROUND - 20);
    t.tx = CITY_X[5];
    t.ty = GROUND - 6;
    const ev = run(s, 2);
    expect(ev.some((e) => e.type === "gameOver")).toBe(true);
    expect(s.over).toBe(true);
    expect(fire(s, 1, 400, 300)).toBe(false);
  });

  it("plays a whole unattended game to the end without getting stuck", () => {
    const s = newGame(9);
    for (let i = 0; i < 60 * 60 * 10 && !s.over; i++) step(s, 1 / 60);
    expect(s.over).toBe(true);
  });
});
