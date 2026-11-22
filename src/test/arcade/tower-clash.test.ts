import { describe, expect, it } from "vitest";
import {
  AI_DECKS, BRIDGES, CARDS, CARD_IDS, DECK_SIZE, MATCH_TIME, OVERTIME, RIVER_BOT, RIVER_TOP, arenaFor, canDeploy, manaBoost, newMatch, play, step, trophyChange,
  type ClashState, type Side,
} from "@/arcade/games/tower-clash/logic";

const run = (s: ClashState, secs: number) => {
  const ev = [];
  for (let i = 0; i < secs * 30 && !s.over; i++) ev.push(...step(s, 1 / 30));
  return ev;
};
const towers = (s: ClashState, side: Side) => s.units.filter((u) => u.side === side && (u.card === "turret" || u.card === "keep"));
/** Freeze the opponent so a test controls everything. */
const quietAi = (s: ClashState) => {
  s.aiT = 1e9;
};

describe("tower clash", () => {
  it("decks are eight distinct real cards", () => {
    for (const d of AI_DECKS) {
      expect(d).toHaveLength(DECK_SIZE);
      expect(new Set(d).size).toBe(DECK_SIZE);
      for (const c of d) expect(CARD_IDS).toContain(c);
    }
  });

  it("a match starts with 4 cards in hand, 4 queued, 5 mana and six towers", () => {
    const s = newMatch(1);
    expect(s.hands[0]).toHaveLength(4);
    expect(s.queues[0]).toHaveLength(4);
    expect(s.mana).toEqual([5, 5]);
    expect(towers(s, 0)).toHaveLength(3);
    expect(towers(s, 1)).toHaveLength(3);
    expect(towers(s, 1).find((t) => t.card === "keep")!.active).toBe(false);
  });

  it("mana refills over time and doubles in the last minute", () => {
    const s = newMatch(2);
    quietAi(s);
    s.mana[0] = 0;
    run(s, 2.8);
    expect(s.mana[0]).toBeCloseTo(1, 1);
    expect(manaBoost(s)).toBe(1);
    s.time = MATCH_TIME - 59;
    expect(manaBoost(s)).toBe(2);
  });

  it("you deploy only on your side, except spells and open pockets", () => {
    const s = newMatch(3);
    expect(canDeploy(s, 0, "squire", 9, 24)).toBe(true);
    expect(canDeploy(s, 0, "squire", 9, 10)).toBe(false);
    expect(canDeploy(s, 0, "firebolt", 9, 3)).toBe(true);
    expect(canDeploy(s, 0, "squire", BRIDGES[0], 25.5)).toBe(false); // on a tower
    // Knock down the enemy's left turret: its lane pocket opens for troops, not buildings.
    s.units.find((u) => u.side === 1 && u.card === "turret" && u.lane === 0)!.dead = true;
    expect(canDeploy(s, 0, "squire", 4, RIVER_TOP - 2)).toBe(true);
    expect(canDeploy(s, 0, "cannon", 4, RIVER_TOP - 2)).toBe(false);
    expect(canDeploy(s, 0, "squire", 14, RIVER_TOP - 2)).toBe(false);
  });

  it("playing a card spends mana and cycles the deck", () => {
    const s = newMatch(4);
    quietAi(s);
    s.mana[0] = 10;
    const card = s.hands[0][0];
    const next = s.queues[0][0];
    const y = CARDS[card].kind === "spell" ? 6 : 24;
    expect(play(s, 0, 0, 9, y)).toBe(true);
    expect(s.mana[0]).toBe(10 - CARDS[card].cost);
    expect(s.hands[0][0]).toBe(next);
    expect(s.queues[0][s.queues[0].length - 1]).toBe(card);
    s.mana[0] = 0;
    expect(play(s, 0, 1, 9, 24)).toBe(false);
  });

  it("troops cross by the bridges and knock down a turret", () => {
    const s = newMatch(5, ["ogre", "squire", "archers", "bones", "imps", "brute", "rifleman", "boar"]);
    quietAi(s);
    s.hands[0][0] = "ogre";
    s.mana[0] = 10;
    expect(play(s, 0, 0, 4, 22)).toBe(true);
    let inRiver = 0;
    let maxStars = 0;
    for (let i = 0; i < 60 * 30 && !s.over; i++) {
      step(s, 1 / 30);
      const o = s.units.find((u) => u.card === "ogre");
      if (o && o.y > RIVER_TOP && o.y < RIVER_BOT) {
        inRiver++;
        expect(Math.min(...BRIDGES.map((b) => Math.abs(o.x - b)))).toBeLessThan(1.2);
      }
      maxStars = Math.max(maxStars, s.stars[0]);
      if (!o) break;
    }
    expect(inRiver).toBeGreaterThan(0);
    expect(maxStars).toBe(1);
    // Losing a turret wakes the keep.
    expect(towers(s, 1).find((t) => t.card === "keep")!.active).toBe(true);
  });

  it("a fire bolt hits troops hard but towers lightly", () => {
    const s = newMatch(6);
    quietAi(s);
    const turret = towers(s, 1).find((t) => t.card === "turret")!;
    s.hands[0][0] = "firebolt";
    s.mana[0] = 10;
    play(s, 0, 0, turret.x, turret.y);
    run(s, 1.5);
    expect(turret.maxHp - turret.hp).toBe(Math.round(CARDS.firebolt.dmg! * CARDS.firebolt.towerMul!));
  });

  it("destroying the keep wins with three stars", () => {
    const s = newMatch(7);
    quietAi(s);
    const keep = towers(s, 1).find((t) => t.card === "keep")!;
    keep.hp = 50;
    s.hands[0][0] = "firebolt";
    s.mana[0] = 10;
    play(s, 0, 0, keep.x, keep.y);
    const ev = run(s, 2);
    expect(ev.some((e) => e.type === "end")).toBe(true);
    expect(s.winner).toBe(0);
    expect(s.stars[0]).toBe(3);
  });

  it("a tie goes to overtime, and the next tower wins it", () => {
    const s = newMatch(8);
    quietAi(s);
    s.time = MATCH_TIME - 0.01;
    expect(run(s, 0.1).some((e) => e.type === "overtime")).toBe(true);
    expect(s.overtime).toBe(true);
    const t = towers(s, 0).find((u) => u.card === "turret")!;
    t.hp = 1;
    s.units.push({ ...t, id: 999, side: 1, card: "squire", building: false, x: t.x, y: t.y - 2, hp: 500, maxHp: 500, r: 0.5, deploy: 0, cd: 0, target: 0, active: true, dead: false, targets: "ground", range: 1.1, dmg: 50, hit: 0.5, speed: 1 });
    run(s, 3);
    expect(s.over).toBe(true);
    expect(s.winner).toBe(1);
  });

  it("overtime running out goes to the healthier side", () => {
    const s = newMatch(9);
    quietAi(s);
    s.overtime = true;
    s.time = MATCH_TIME + OVERTIME - 0.01;
    towers(s, 1)[0].hp = 100;
    run(s, 0.1);
    expect(s.winner).toBe(0);
  });

  it("the opponent defends when you push", () => {
    const s = newMatch(10, undefined, "hard", ["squire", "archers", "ogre", "bones", "firebolt", "arrows", "rifleman", "brute"]);
    s.mana = [10, 10];
    s.hands[0][0] = "brute";
    play(s, 0, 0, BRIDGES[1], 18);
    const ev = run(s, 6);
    expect(ev.some((e) => e.type === "deploy" && e.side === 1)).toBe(true);
  });

  it("whole matches against every opponent end cleanly", () => {
    for (const d of ["easy", "normal", "hard"] as const) {
      const s = newMatch(11, undefined, d);
      run(s, MATCH_TIME + OVERTIME + 5);
      expect(s.over).toBe(true);
      expect([0, 1, -1]).toContain(s.winner);
    }
  });

  it("trophies go up for wins, down for losses, and arenas follow", () => {
    expect(trophyChange(0, [3, 0])).toBe(40);
    expect(trophyChange(1, [0, 1])).toBe(-20);
    expect(trophyChange(-1, [1, 1])).toBe(0);
    expect(arenaFor(0).name).toBe("Training Grounds");
    expect(arenaFor(500).name).toBe("Frost Pass");
  });
});
