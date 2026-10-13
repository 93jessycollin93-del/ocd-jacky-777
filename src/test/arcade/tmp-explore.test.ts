import { describe, it } from "vitest";
import { newSiege, simulate, type SiegeEvent } from "@/arcade/games/sling-siege/logic";
import { LEVELS } from "@/arcade/games/sling-siege/levels";
describe("x", () => {
  LEVELS.forEach((lv, i) => {
    it(lv.id, () => {
      const s = newSiege(i);
      const g0 = s.grumblersLeft;
      const p0 = s.pieces.map((p) => [p.body.x, p.body.y]);
      const ev: SiegeEvent[] = [];
      simulate(s, 8, ev);
      let drift = 0;
      s.pieces.forEach((p, k) => { drift = Math.max(drift, Math.hypot(p.body.x - p0[k][0], p.body.y - p0[k][1])); });
      console.log(lv.id, "grumblers", g0, "->", s.grumblersLeft, "pieces", s.pieces.length, "drift", drift.toFixed(2), "events", ev.filter((e) => e.t === "break" || e.t === "kill").length, "asleep", s.pieces.filter((p) => !p.body.awake).length);
    });
  });
});
