import { describe, expect, it } from "vitest";
import {
  MAX_LEVEL, MAX_WEAPONS, RUN_LENGTH, applyOffer, buildGrid, chooseOffer, evolvable, gainXp, maxHp, nearby, newRun, offers, openChest, shopCost, step,
  waveAt, weaponStats, xpForLevel, type SurvState,
} from "@/arcade/games/night-survivors/logic";

const enemy = (s: SurvState, x: number, y: number, hp = 10) =>
  s.enemies.push({ id: s.nextId++, kind: "bat", x, y, hp, maxHp: hp, flash: 0, hitT: 0, dead: false });

describe("night survivors", () => {
  it("the night gets denser and meaner over time", () => {
    const early = waveAt(0);
    const late = waveAt(600);
    expect(early.kinds).toEqual(["bat"]);
    expect(late.kinds).toContain("brute");
    expect(late.target).toBeGreaterThan(early.target * 5);
    expect(late.hpMul).toBeGreaterThan(early.hpMul);
    expect(waveAt(RUN_LENGTH).target).toBeLessThan(420);
  });

  it("XP needed rises with level and level-ups queue up", () => {
    for (let l = 1; l < 40; l++) expect(xpForLevel(l + 1)).toBeGreaterThan(xpForLevel(l));
    const s = newRun(1);
    gainXp(s, xpForLevel(1) + xpForLevel(2));
    expect(s.level).toBe(3);
    expect(s.pendingLevels).toBe(2);
  });

  it("the run pauses while a level-up waits for a card", () => {
    const s = newRun(2);
    s.pendingLevels = 1;
    step(s, 0.05, 1, 0);
    expect(s.time).toBe(0);
    chooseOffer(s, offers(s)[0]);
    expect(s.pendingLevels).toBe(0);
    step(s, 0.05, 1, 0);
    expect(s.time).toBeGreaterThan(0);
  });

  it("cards are distinct, never maxed, and respect the weapon slots", () => {
    const s = newRun(3);
    for (let i = 0; i < 200; i++) {
      const cards = offers(s);
      const keys = cards.map((c) => `${c.kind}:${c.id}`);
      expect(new Set(keys).size).toBe(keys.length);
      for (const c of cards) expect(c.nextLevel).toBeLessThanOrEqual(MAX_LEVEL);
      applyOffer(s, cards[0]);
      expect(s.weapons.length).toBeLessThanOrEqual(MAX_WEAPONS);
    }
    // Everything owned is maxed: only heal and gold remain.
    expect(offers(s).map((c) => c.kind).sort()).toEqual(["gold", "heal"]);
  });

  it("weapons grow with level and evolution", () => {
    const l1 = weaponStats("whip", 1, false);
    const l5 = weaponStats("whip", 5, false);
    const ev = weaponStats("whip", 5, true);
    expect(l5.dmg).toBeGreaterThan(l1.dmg);
    expect(ev.dmg).toBeGreaterThan(l5.dmg);
  });

  it("a boss chest evolves a maxed weapon only with its partner passive", () => {
    const s = newRun(4);
    s.weapons[0].level = MAX_LEVEL;
    expect(evolvable(s)).toEqual([]);
    s.passives.push({ id: "maxhp", level: 1 });
    expect(evolvable(s)).toEqual(["whip"]);
    const ev: { type: string }[] = [];
    openChest(s, ev as never);
    expect(s.weapons[0].evolved).toBe(true);
    expect(ev.some((e) => e.type === "evolve")).toBe(true);
  });

  it("the grid finds nearby enemies and skips far ones", () => {
    const s = newRun(5);
    enemy(s, 10, 0);
    enemy(s, 0, 40);
    enemy(s, 500, 500);
    buildGrid(s);
    const found = nearby(s, 0, 0, 50);
    expect(found).toHaveLength(2);
  });

  it("the whip kills a bat next to the player and drops XP", () => {
    const s = newRun(6);
    enemy(s, 40, 0, 5);
    let killed = false;
    for (let i = 0; i < 60 && !killed; i++) killed = step(s, 1 / 30, 0, 0).some((e) => e.type === "kill");
    expect(killed).toBe(true);
    expect(s.kills).toBe(1);
    expect(s.gems.length + s.xp).toBeGreaterThan(0);
  });

  it("standing still in a crowd eventually ends the run", () => {
    const s = newRun(7);
    s.time = 400;
    for (let i = 0; i < 30 * 120 && !s.over; i++) {
      step(s, 1 / 30, 0, 0);
      while (s.pendingLevels > 0) chooseOffer(s, offers(s)[0]);
    }
    expect(s.over).toBe(true);
    expect(s.won).toBe(false);
  });

  it("surviving until dawn wins", () => {
    const s = newRun(8);
    s.time = RUN_LENGTH - 0.01;
    s.enemies = [];
    step(s, 0.05, 0, 0);
    expect(s.over).toBe(true);
    expect(s.won).toBe(true);
  });

  it("shop upgrades raise health and cost more each rank", () => {
    expect(maxHp(newRun(9, { might: 0, health: 3, speed: 0 }))).toBe(maxHp(newRun(9)) + 30);
    expect(shopCost(1)).toBeGreaterThan(shopCost(0));
  });
});
