import { describe, it } from "vitest";
import { newSiege, simulate, launch, useAbility, critters, type SiegeEvent } from "@/arcade/games/sling-siege/logic";
describe("x", () => {
  it("m1", () => {
    const s2 = newSiege(0);
    simulate(s2, 3);
    launch(s2, -2.5, 1.2);
    for (let t = 0; t < 12; t++) {
      simulate(s2, 1);
      const c = critters(s2)[0];
      console.log(t, s2.phase, c && [c.body.x.toFixed(1), c.body.y.toFixed(2), Math.hypot(c.body.vx, c.body.vy).toFixed(2), c.touched, c.calm?.toFixed(2)].join(" "));
    }
  });
});
