import { describe, expect, it } from "vitest";
import {
  BALLOONS, MAPS, MAP_H, MAP_W, WIN_ROUND, along, canPlace, canUpgrade, damage, distToTrack, newGame, place, rbe, roundGroups, roundSpawns, sell, startRound,
  stats, step, upgrade, type TDEvent, type TDState,
} from "@/arcade/games/balloon-defense/logic";

const balloon = (s: TDState, kind: keyof typeof BALLOONS, d = 200) => {
  const [x, y] = along(s.track, d);
  const b = { id: s.nextId++, kind, d, hp: BALLOONS[kind].hp, frozen: 0, slow: 1, from: 0, x, y, dead: false };
  s.balloons.push(b);
  return b;
};

/** Good build spots: valid places that see the most road. */
function spots(s: TDState) {
  const out: { x: number; y: number; sc: number }[] = [];
  for (let y = 20; y < MAP_H; y += 20) {
    for (let x = 20; x < MAP_W; x += 20) {
      if (!canPlace(s, x, y)) continue;
      let sc = 0;
      for (let d = 0; d < s.track.len; d += 12) {
        const [px, py] = along(s.track, d);
        if (Math.hypot(px - x, py - y) < 110) sc++;
      }
      out.push({ x, y, sc });
    }
  }
  return out.sort((a, b) => b.sc - a.sc);
}

describe("balloon pop td", () => {
  it("balloons are worth their layers", () => {
    expect(rbe("red")).toBe(1);
    expect(rbe("pink")).toBe(5);
    expect(rbe("black")).toBe(11);
    expect(rbe("ceramic")).toBe(32);
    expect(rbe("blimp")).toBe(200 + 4 * 32);
  });

  it("every round parses and freeplay keeps growing", () => {
    for (let r = 1; r <= WIN_ROUND; r++) {
      const g = roundGroups(r);
      expect(g.length).toBeGreaterThan(0);
      for (const x of g) {
        expect(BALLOONS[x.kind]).toBeDefined();
        expect(x.count).toBeGreaterThan(0);
        expect(x.gap).toBeGreaterThanOrEqual(0);
      }
    }
    expect(roundSpawns(WIN_ROUND).some((x) => x.kind === "blimp")).toBe(true);
    const size = (r: number) => roundSpawns(r).reduce((a, x) => a + rbe(x.kind), 0);
    expect(size(50)).toBeGreaterThan(size(41));
  });

  it("the road is followed exactly and towers can't sit on it", () => {
    for (let m = 0; m < MAPS.length; m++) {
      const s = newGame(m);
      const [x0, y0] = along(s.track, 0);
      expect([x0, y0]).toEqual(MAPS[m].path[0]);
      const [x, y] = along(s.track, s.track.len / 2);
      expect(distToTrack(s.track, x, y)).toBeLessThan(0.001);
      expect(canPlace(s, x, y)).toBe(false);
      expect(spots(s).length).toBeGreaterThan(100);
    }
  });

  it("building costs cash, needs space, and selling refunds 70%", () => {
    const s = newGame(0);
    const [spot] = spots(s);
    const t = place(s, "dart", spot.x, spot.y)!;
    expect(s.cash).toBe(650 - 200);
    expect(place(s, "dart", spot.x + 5, spot.y)).toBeNull();
    sell(s, t);
    expect(s.cash).toBe(450 + 140);
    expect(s.towers).toHaveLength(0);
  });

  it("only one upgrade path can reach tier 3", () => {
    const s = newGame(0);
    s.cash = 99999;
    const [spot] = spots(s);
    const t = place(s, "dart", spot.x, spot.y)!;
    for (let i = 0; i < 3; i++) expect(upgrade(s, t, 0)).toBe(true);
    expect(upgrade(s, t, 0)).toBe(false);
    expect(upgrade(s, t, 1)).toBe(true);
    expect(upgrade(s, t, 1)).toBe(true);
    expect(canUpgrade(t, 1)).toBe(false);
    expect(t.tiers).toEqual([3, 2]);
    expect(stats(t).count).toBe(3);
  });

  it("popping a layer reveals the next, and extra damage carries through", () => {
    const s = newGame(0);
    const ev: TDEvent[] = [];
    damage(s, balloon(s, "pink"), 1, undefined, 0, ev);
    expect(s.balloons.filter((b) => !b.dead).map((b) => b.kind)).toEqual(["yellow"]);
    s.balloons = [];
    damage(s, balloon(s, "pink"), 3, undefined, 0, ev);
    expect(s.balloons.filter((b) => !b.dead).map((b) => b.kind)).toEqual(["blue"]);
    s.balloons = [];
    damage(s, balloon(s, "black"), 1, undefined, 0, ev);
    expect(s.balloons.filter((b) => !b.dead).map((b) => b.kind)).toEqual(["pink", "pink"]);
  });

  it("lead shrugs off darts, but bombs and snipers pop it", () => {
    for (const [id, pops] of [["dart", false], ["bomb", true], ["sniper", true]] as const) {
      const s = newGame(1);
      s.cash = 99999;
      const [spot] = spots(s);
      place(s, id, spot.x, spot.y);
      // Park a lead balloon right in front of the tower.
      let best = 0;
      let bd = Infinity;
      for (let d = 0; d < s.track.len; d += 4) {
        const [x, y] = along(s.track, d);
        const dist = Math.hypot(x - spot.x, y - spot.y);
        if (dist < bd) [bd, best] = [dist, d];
      }
      const b = balloon(s, "lead", best);
      b.frozen = 999;
      for (let i = 0; i < 180; i++) step(s, 1 / 60);
      expect(b.dead).toBe(pops);
    }
  });

  it("black balloons ignore explosions until frag bombs", () => {
    const s = newGame(0);
    s.cash = 99999;
    const [spot] = spots(s);
    const t = place(s, "bomb", spot.x, spot.y)!;
    expect(stats(t).ignoreImmune).toBe(false);
    for (let i = 0; i < 3; i++) upgrade(s, t, 1);
    expect(stats(t).ignoreImmune).toBe(true);
  });

  it("leaks cost lives by layer and end the game at zero", () => {
    const s = newGame(0, "hard");
    balloon(s, "ceramic", s.track.len - 1);
    const ev = step(s, 0.1);
    expect(ev.some((e) => e.type === "leak")).toBe(true);
    expect(s.lives).toBe(40 - 32);
    balloon(s, "ceramic", s.track.len - 1);
    expect(step(s, 0.1).some((e) => e.type === "lose")).toBe(true);
    expect(s.over).toBe(true);
  });

  it("clearing a round pays the bonus and coin trees", () => {
    const s = newGame(0);
    s.cash = 2000;
    const sp = spots(s);
    place(s, "farm", sp[sp.length - 1].x, sp[sp.length - 1].y);
    s.cash = 0;
    startRound(s);
    s.qi = s.queue.length;
    const ev = step(s, 0.01);
    const end = ev.find((e) => e.type === "roundEnd");
    expect(end).toEqual({ type: "roundEnd", round: 1, bonus: 102 + 80 });
    expect(s.cash).toBe(182);
    expect(s.active).toBe(false);
  });

  it("a few darts and a tack ring hold the first ten rounds", () => {
    const s = newGame(1, "easy");
    const sp = spots(s);
    let k = 0;
    const build = (id: "dart" | "tack") => {
      while (k < sp.length && !canPlace(s, sp[k].x, sp[k].y)) k++;
      return place(s, id, sp[k].x, sp[k].y);
    };
    build("dart");
    build("dart");
    for (let r = 1; r <= 10; r++) {
      if (r === 3) build("dart");
      if (r === 5) build("tack");
      startRound(s);
      for (let i = 0; i < 60 * 240 && s.active; i++) step(s, 1 / 60);
    }
    expect(s.round).toBe(10);
    expect(s.lives).toBeGreaterThan(180);
  });
});
