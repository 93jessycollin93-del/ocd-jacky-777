import { describe, it, expect } from "vitest";
import {
  ALIEN_POINTS, BUNKER_COLS, BUNKER_ROWS, BUNKER_XS, BUNKER_Y, CELL, DIVE_MULTIPLIER, DROP_Y, EXTRA_LIFE_AT, FORM_COLS, FORM_ROWS, H,
  PLAYER_Y, SAUCER_POINTS, SIDE_MARGIN, SPACING_X, STEP_X, UPGRADE_TIME, W, bezier, bunkerAt, bunkerCells, erodeBunker, fire,
  formationAliens, killAlien, makeBunker, makeDivePath, maxDivers, newGame, slotX, startWave, stepDelay, stepFormation, trampleBunker,
  update, type WaveEvent, type WaveInput, type WaveState,
} from "@/arcade/games/alien-wave/logic";
import { mulberry32 } from "@/arcade/kit/rng";
import { ALIEN_ART, SAUCER_ART, SHIP_ART } from "@/arcade/games/alien-wave/sprites";

const idle: WaveInput = { left: false, right: false, fire: false };

/** A wave in progress with the random fire and dives switched off, so tests control what happens. */
function quiet(seed = 1): WaveState {
  const s = newGame(seed);
  s.shotTimer = 999;
  s.diveTimer = 999;
  s.saucerTimer = 999;
  s.stepTimer = 999;
  return s;
}

const run = (s: WaveState, seconds: number, input: WaveInput = idle) => {
  const out: WaveEvent[] = [];
  for (let t = 0; t < seconds; t += 1 / 60) out.push(...update(s, 1 / 60, input));
  return out;
};

describe("alien-wave formation", () => {
  it("starts as a 5×9 formation with four alien designs", () => {
    const s = newGame(1);
    expect(s.aliens).toHaveLength(FORM_ROWS * FORM_COLS);
    expect(new Set(s.aliens.map((a) => a.type)).size).toBe(4);
    expect(s.aliens.every((a) => a.state === "form")).toBe(true);
    expect(s.wave).toBe(1);
  });

  it("marches sideways a step at a time, then drops and turns round at the edge", () => {
    const s = quiet();
    const x0 = s.fx;
    const y0 = s.fy;
    stepFormation(s);
    expect(s.fx).toBe(x0 + STEP_X);
    expect(s.fy).toBe(y0);
    expect(s.anim).toBe(1);
    // Walk it to the right-hand edge.
    let drops = 0;
    for (let i = 0; i < 80 && drops === 0; i++) {
      const y = s.fy;
      stepFormation(s);
      if (s.fy > y) drops++;
    }
    expect(drops).toBe(1);
    expect(s.fy).toBe(y0 + DROP_Y);
    expect(s.dir).toBe(-1);
    const rightmost = slotX(s, FORM_COLS - 1) + 13;
    expect(rightmost).toBeLessThanOrEqual(W - SIDE_MARGIN + 0.001);
    // And back the other way.
    const before = s.fx;
    stepFormation(s);
    expect(s.fx).toBe(before - STEP_X);
    for (let i = 0; i < 80; i++) stepFormation(s);
    expect(slotX(s, 0) - 13).toBeGreaterThanOrEqual(SIDE_MARGIN - STEP_X);
  });

  it("only turns at the edge when an alien is actually there: a gap in the end columns lets it go further", () => {
    const full = quiet();
    const gap = quiet();
    gap.aliens = gap.aliens.filter((a) => a.col < FORM_COLS - 2);
    let stepsFull = 0;
    let stepsGap = 0;
    while (full.dir === 1 && stepsFull < 200) {
      stepFormation(full);
      stepsFull++;
    }
    while (gap.dir === 1 && stepsGap < 200) {
      stepFormation(gap);
      stepsGap++;
    }
    expect(stepsGap).toBeGreaterThan(stepsFull);
    expect(gap.fx).toBeGreaterThan(full.fx);
  });

  it("speeds up as aliens are shot, and over the waves", () => {
    const delays = [45, 30, 15, 5, 1].map((n) => stepDelay(n, 45, 1));
    for (let i = 1; i < delays.length; i++) expect(delays[i]).toBeLessThan(delays[i - 1]);
    expect(delays[4]).toBeLessThan(0.1);
    expect(delays[0]).toBeGreaterThan(0.4);
    expect(stepDelay(45, 45, 5)).toBeLessThan(stepDelay(45, 45, 1));
    expect(stepDelay(0, 45, 1)).toBeGreaterThan(0);

    // In play: the same ten seconds produce more steps once most of the formation is gone.
    const a = quiet();
    a.stepTimer = 0;
    a.fy = 100;
    a.totalAliens = 45;
    const few = quiet();
    few.stepTimer = 0;
    few.totalAliens = 45;
    few.aliens = few.aliens.slice(0, 6);
    run(a, 4);
    run(few, 4);
    expect(few.stepCount).toBeGreaterThan(a.stepCount * 2);
  });
});

describe("alien-wave bunkers", () => {
  it("starts as an arch with a doorway, 4 of them, and erodes where it is hit", () => {
    expect(BUNKER_XS).toHaveLength(4);
    const b = makeBunker(240);
    const total = bunkerCells(b);
    expect(total).toBeGreaterThan(150);
    expect(total).toBeLessThan(BUNKER_COLS * BUNKER_ROWS);
    // The doorway at the bottom middle is open; the roof above it is solid.
    expect(bunkerAt(b, 240, BUNKER_Y + (BUNKER_ROWS - 1) * CELL + 1)).toBe(false);
    expect(bunkerAt(b, 240, BUNKER_Y + 3 * CELL)).toBe(true);
    const rng = mulberry32(5);
    const x = b.x + 5 * CELL;
    const y = BUNKER_Y + 6 * CELL;
    expect(bunkerAt(b, x, y)).toBe(true);
    const removed = erodeBunker(b, x, y, 3, rng);
    expect(removed).toBeGreaterThan(3);
    expect(bunkerCells(b)).toBe(total - removed);
    expect(bunkerAt(b, x, y)).toBe(false);
    // Far away cells are untouched.
    expect(bunkerAt(b, b.x + 18 * CELL, BUNKER_Y + 6 * CELL)).toBe(true);
    // Repeated hits keep chewing through it, never giving cells back.
    let last = bunkerCells(b);
    for (let i = 0; i < 6; i++) {
      erodeBunker(b, x + i * CELL, y + CELL, 3, rng);
      expect(bunkerCells(b)).toBeLessThanOrEqual(last);
      last = bunkerCells(b);
    }
    expect(last).toBeLessThan(total - 15);
  });

  it("is chewed up by a player's bolt from below and by an alien's shot from above", () => {
    const s = quiet();
    s.aliens = s.aliens.slice(0, 3);
    const bk = s.bunkers[1];
    const total = bunkerCells(bk);
    s.player.x = bk.x + 10 * CELL;
    s.player.target = s.player.x;
    s.bolts.push({ x: s.player.x + 0.5, y: BUNKER_Y + BUNKER_ROWS * CELL + 30 });
    const ev = run(s, 0.6);
    expect(ev.some((e) => e.type === "bunker-hit")).toBe(true);
    expect(s.bolts).toHaveLength(0);
    const afterBolt = bunkerCells(bk);
    expect(afterBolt).toBeLessThan(total);
    s.shots.push({ x: bk.x + 4 * CELL, y: BUNKER_Y - 40, vy: 200, wobble: 0, phase: 0, baseX: bk.x + 4 * CELL });
    run(s, 0.6);
    expect(s.shots).toHaveLength(0);
    expect(bunkerCells(bk)).toBeLessThan(afterBolt);
  });

  it("is wiped out by an alien marching through it", () => {
    const b = makeBunker(240);
    const total = bunkerCells(b);
    const removed = trampleBunker(b, b.x, BUNKER_Y, 30, 20);
    expect(removed).toBeGreaterThan(20);
    expect(bunkerCells(b)).toBe(total - removed);
  });
});

describe("alien-wave shooting and collisions", () => {
  it("allows one shot on screen at a time, going up", () => {
    const s = quiet();
    expect(fire(s)).toBe(true);
    expect(fire(s)).toBe(false);
    expect(s.bolts).toHaveLength(1);
    run(s, 0.5);
    expect(s.bolts[0]?.y ?? -99).toBeLessThan(PLAYER_Y);
  });

  it("an upgrade gives twin shots, two volleys at a time, for a while", () => {
    const s = quiet();
    s.capsules.push({ x: s.player.x, y: PLAYER_Y - 5 });
    const ev = run(s, 0.1);
    expect(ev.some((e) => e.type === "upgrade")).toBe(true);
    expect(s.upgrade).toBeGreaterThan(UPGRADE_TIME - 1);
    s.aliens = s.aliens.slice(0, 3);
    expect(fire(s)).toBe(true);
    expect(s.bolts).toHaveLength(2);
    expect(Math.abs(s.bolts[0].x - s.bolts[1].x)).toBeGreaterThan(8);
    run(s, 0.2);
    expect(fire(s)).toBe(true);
    expect(s.bolts).toHaveLength(4);
    run(s, 0.2);
    expect(fire(s)).toBe(false);
    run(s, UPGRADE_TIME + 1);
    expect(s.upgrade).toBe(0);
    s.bolts = [];
    s.player.cooldown = 0;
    fire(s);
    expect(s.bolts).toHaveLength(1);
  });

  it("scores by alien design, double for one that is diving", () => {
    const s = quiet();
    const out: WaveEvent[] = [];
    const top = s.aliens.find((a) => a.type === 0)!;
    killAlien(s, top, out);
    expect(s.score).toBe(ALIEN_POINTS[0]);
    const bottom = s.aliens.find((a) => a.type === 3)!;
    bottom.state = "dive";
    killAlien(s, bottom, out);
    expect(s.score).toBe(ALIEN_POINTS[0] + ALIEN_POINTS[3] * DIVE_MULTIPLIER);
    expect(out.map((e) => e.points)).toEqual([40, 20]);
  });

  it("a bolt that reaches an alien kills it", () => {
    const s = quiet();
    const target = s.aliens.find((a) => a.row === 4 && a.col === 4)!;
    s.player.x = target.x;
    s.player.target = target.x;
    s.bunkers = [];
    fire(s);
    const count = s.aliens.length;
    const ev = run(s, 0.7);
    expect(ev.some((e) => e.type === "alien-die")).toBe(true);
    expect(s.aliens.length).toBe(count - 1);
    expect(s.bolts).toHaveLength(0);
    expect(s.score).toBe(ALIEN_POINTS[3]);
  });

  it("an alien shot costs a life, clears the screen of fire, and the ship returns protected", () => {
    const s = quiet();
    s.bunkers = [];
    s.shots.push({ x: s.player.x, y: PLAYER_Y - 10, vy: 100, wobble: 0, phase: 0, baseX: s.player.x });
    const ev = run(s, 0.2);
    expect(ev.some((e) => e.type === "player-die")).toBe(true);
    expect(s.lives).toBe(2);
    expect(s.player.alive).toBe(false);
    const back = run(s, 2);
    expect(back.some((e) => e.type === "respawn")).toBe(true);
    expect(s.player.alive).toBe(true);
    expect(s.player.invuln).toBeGreaterThan(0);
    s.shots.push({ x: s.player.x, y: PLAYER_Y - 10, vy: 100, wobble: 0, phase: 0, baseX: s.player.x });
    run(s, 0.2);
    expect(s.player.alive).toBe(true);
  });

  it("ends the game on the last life, and when the aliens land", () => {
    const s = quiet();
    s.bunkers = [];
    s.lives = 1;
    s.shots.push({ x: s.player.x, y: PLAYER_Y - 10, vy: 100, wobble: 0, phase: 0, baseX: s.player.x });
    const ev = run(s, 3);
    expect(ev.some((e) => e.type === "over")).toBe(true);
    expect(s.phase).toBe("over");
    expect(s.invaded).toBe(false);

    const t = quiet();
    for (const a of t.aliens) a.y += 400;
    const ev2 = run(t, 3);
    expect(t.invaded).toBe(true);
    expect(ev2.some((e) => e.type === "over")).toBe(true);
  });

  it("gives an extra life at 5,000 points", () => {
    const s = quiet();
    s.score = EXTRA_LIFE_AT - 5;
    const out: WaveEvent[] = [];
    killAlien(s, s.aliens[0], out);
    expect(s.lives).toBe(4);
    expect(out.some((e) => e.type === "extra-life")).toBe(true);
  });

  it("the mystery saucer scores a bonus and drops an upgrade", () => {
    const s = quiet();
    s.bunkers = [];
    s.saucer = { x: s.player.x, y: 400, vx: 0 };
    s.bolts.push({ x: s.player.x, y: 420 });
    const ev = run(s, 0.1);
    const hit = ev.find((e) => e.type === "saucer-die");
    expect(hit).toBeDefined();
    expect(SAUCER_POINTS as readonly number[]).toContain(hit!.points);
    expect(s.saucer).toBeNull();
    expect(s.capsules.length).toBe(1);
  });
});

describe("alien-wave dives", () => {
  it("swoops along a curved path from its slot down past the bottom", () => {
    const path = makeDivePath(100, 120, 300, 1);
    const start = bezier(path, 0);
    const end = bezier(path, 1);
    expect(start).toEqual({ x: 100, y: 120 });
    expect(end.x).toBeCloseTo(300);
    expect(end.y).toBeGreaterThan(H);
    // It bows out to the side first (a curve, not a straight line).
    const mid = bezier(path, 0.25);
    expect(mid.x).toBeGreaterThan(115);
    const straightX = 100 + (300 - 100) * 0.25;
    expect(Math.abs(mid.x - straightX)).toBeGreaterThan(8);
    const ys = [0, 0.2, 0.4, 0.6, 0.8, 1].map((t) => bezier(path, t).y);
    expect(ys[5]).toBeGreaterThan(ys[2]);
  });

  it("an alien peels off, dives, and flies back in from the top to its place in the formation", () => {
    const s = quiet();
    s.bunkers = [];
    s.diveTimer = 0;
    s.player.invuln = 99;
    const ev = run(s, 0.1);
    expect(ev.some((e) => e.type === "dive")).toBe(true);
    const diver = s.aliens.find((a) => a.state === "dive")!;
    expect(diver).toBeDefined();
    const total = s.aliens.length;
    let sawReturn = false;
    let lastY = -Infinity;
    for (let i = 0; i < 60 * 8; i++) {
      update(s, 1 / 60, idle);
      s.diveTimer = 999;
      if (diver.state === "return") {
        // It reappears above the screen and eases down into its slot.
        if (!sawReturn) expect(diver.y).toBeLessThan(0);
        sawReturn = true;
        expect(diver.y).toBeGreaterThanOrEqual(lastY);
        lastY = diver.y;
      }
      if (diver.state === "form") break;
    }
    expect(sawReturn).toBe(true);
    expect(diver.state).toBe("form");
    expect(diver.x).toBeCloseTo(slotX(s, diver.col));
    expect(s.aliens.length).toBe(total);
    expect(s.player.alive).toBe(true);
  });

  it("a diver that rams the ship costs a life; more aliens may dive on later waves", () => {
    const s = quiet();
    s.bunkers = [];
    const a = s.aliens[0];
    a.state = "dive";
    const hit = { x: s.player.x, y: PLAYER_Y - 4 };
    a.path = [hit, hit, hit, hit];
    a.t = 0.5;
    a.x = hit.x;
    a.y = hit.y;
    s.shots = [];
    update(s, 1 / 60, idle);
    expect(s.player.alive).toBe(false);
    expect(s.lives).toBe(2);
    expect(maxDivers(1)).toBe(1);
    expect(maxDivers(6)).toBeGreaterThan(maxDivers(1));
    expect(maxDivers(50)).toBeLessThanOrEqual(4);
  });
});

describe("alien-wave waves", () => {
  it("clears the wave, waits a moment, then starts a harder one with fresh bunkers", () => {
    const s = quiet();
    const wave1Y = s.fy;
    const wave1Fast = stepDelay(20, 45, 1);
    s.bunkers[0].cells.fill(0);
    s.aliens = [];
    const ev = run(s, 2.4);
    expect(ev.some((e) => e.type === "wave")).toBe(true);
    expect(s.wave).toBe(2);
    expect(s.aliens).toHaveLength(FORM_ROWS * FORM_COLS);
    expect(formationAliens(s)).toHaveLength(FORM_ROWS * FORM_COLS);
    expect(s.fy).toBeGreaterThan(wave1Y); // starts lower
    expect(bunkerCells(s.bunkers[0])).toBeGreaterThan(150);
    expect(stepDelay(20, 45, 2)).toBeLessThan(wave1Fast);
    // Waves keep getting tougher, then level off.
    const d = (w: number) => stepDelay(45, 45, w);
    expect(d(10)).toBeLessThan(d(5));
    startWave(s);
    expect(s.wave).toBe(3);
  });

  it("keeps the formation inside the screen for a whole sweep with random play", () => {
    const s = newGame(9);
    s.player.invuln = 9999;
    for (let i = 0; i < 60 * 20; i++) {
      update(s, 1 / 60, { left: i % 120 < 60, right: i % 120 >= 60, fire: true });
      if (s.phase === "over") break;
      for (const a of s.aliens) if (a.state === "form") {
        expect(a.x).toBeGreaterThan(0);
        expect(a.x).toBeLessThan(W);
      }
    }
    expect(SPACING_X).toBeGreaterThan(0);
  });
});

describe("alien-wave art", () => {
  it("draws four alien designs with two frames each, all the same size, plus a ship and a saucer", () => {
    expect(ALIEN_ART).toHaveLength(4);
    const sizes = new Set<string>();
    for (const design of ALIEN_ART) {
      expect(design).toHaveLength(2);
      for (const frame of design) {
        sizes.add(`${frame[0].length}x${frame.length}`);
        for (const row of frame) {
          expect(row).toHaveLength(frame[0].length);
          expect(row).toMatch(/^[XO.]+$/);
        }
      }
      // The two frames really differ, so the aliens animate.
      expect(design[0].join("")).not.toBe(design[1].join(""));
    }
    expect(sizes.size).toBe(1);
    // Each design is its own shape.
    expect(new Set(ALIEN_ART.map((d) => d[0].join(""))).size).toBe(4);
    for (const art of [SHIP_ART, SAUCER_ART]) for (const row of art) expect(row).toHaveLength(art[0].length);
  });
});
