import { describe, it, expect } from "vitest";
import { World, PHYS, triangleShape, wedgeShape, type Body } from "@/arcade/games/sling-siege/physics";

function ground(w: World) {
  return w.add({ shape: { kind: "box", hw: 60, hh: 2 }, x: 20, y: 2, density: 0, friction: 0.9 });
}
const run = (w: World, secs: number) => {
  for (let i = 0; i < secs / PHYS.dt; i++) w.step();
};

describe("sling-siege physics (explore)", () => {
  it("stack of 8 boxes", () => {
    const w = new World();
    ground(w);
    const bs: Body[] = [];
    for (let i = 0; i < 8; i++) bs.push(w.add({ shape: { kind: "box", hw: 0.5, hh: 0.5 }, x: 10, y: -0.5 - i * 1, density: 1 }));
    const p0 = bs.map((b) => [b.x, b.y]);
    run(w, 10);
    const drift = Math.max(...bs.map((b, i) => Math.hypot(b.x - p0[i][0], b.y - p0[i][1])));
    console.log("drift", drift, bs.every((b) => !b.awake));
    expect(drift).toBeLessThan(0.05);
  });
  it("triangle roof on two posts", () => {
    const w = new World();
    ground(w);
    const l = w.add({ shape: { kind: "box", hw: 0.2, hh: 1.5 }, x: 9, y: -1.5, density: 1 });
    const r = w.add({ shape: { kind: "box", hw: 0.2, hh: 1.5 }, x: 11, y: -1.5, density: 1 });
    const beam = w.add({ shape: { kind: "box", hw: 1.5, hh: 0.2 }, x: 10, y: -3.2, density: 1 });
    const tri = w.add({ shape: triangleShape(3, 1.5), x: 10, y: -3.4 - 0.5, density: 1 });
    const ball = w.add({ shape: { kind: "circle", r: 0.4 }, x: 10, y: -5.5, density: 1 });
    const all = [l, r, beam, tri, ball];
    run(w, 10);
    console.log(all.map((b) => [b.x.toFixed(2), b.y.toFixed(2), b.a.toFixed(3)].join(",")).join(" | "), all.map((b) => b.awake));
  });
  it("wedge and ball roll", () => {
    const w = new World();
    ground(w);
    const wd = w.add({ shape: wedgeShape(6, 3), x: 15, y: -1.5 + 0, density: 0 });
    const ball = w.add({ shape: { kind: "circle", r: 0.5 }, x: 13, y: -3.2, density: 1, restitution: 0.2 });
    run(w, 6);
    console.log(ball.x, ball.y, ball.awake, wd.y);
  });
});
