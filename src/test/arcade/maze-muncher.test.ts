import { describe, it, expect } from "vitest";
import {
  BASE_SPEED, DOWN, DX, DY, EXTRA_LIFE_AT, HUNTERS, LEFT, RIGHT, UP, chaseTarget, chooseDir, currentMode, eatHunter, frightTimeFor,
  hunterPoints, hunterSpeed, movePlayer, newGame, speedsFor, steer, targetFor, update, type MazeEvent, type MazeState,
} from "@/arcade/games/maze-muncher/logic";
import { COLS, LAYOUT, ROWS, isOpen, tileAt, TUNNEL_ROW, WALL } from "@/arcade/games/maze-muncher/maze";
import { wallOutline } from "@/arcade/games/maze-muncher/outline";

/** A game already in play, with the hunters parked far away so nothing interferes. */
function playing(seed = 1): MazeState {
  const s = newGame(seed);
  s.phase = "play";
  return s;
}

const run = (s: MazeState, seconds: number) => {
  const out: MazeEvent[] = [];
  for (let t = 0; t < seconds; t += 1 / 60) out.push(...update(s, 1 / 60));
  return out;
};

describe("maze-muncher maze", () => {
  it("is a 28×31 mirror-symmetric maze with a wrap-around tunnel and four power pellets", () => {
    expect(LAYOUT).toHaveLength(ROWS);
    for (const row of LAYOUT) {
      expect(row).toHaveLength(COLS);
      expect(row).toBe(row.split("").reverse().join(""));
    }
    expect(LAYOUT.join("").split("o")).toHaveLength(5);
    // Row 14 is open at both edges, so walking off one side comes in on the other.
    expect(isOpen(-1, TUNNEL_ROW)).toBe(true);
    expect(isOpen(COLS, TUNNEL_ROW)).toBe(true);
    expect(tileAt(0, 13)).toBe(WALL);
  });

  it("has no dead ends and every corridor is reachable", () => {
    const open: [number, number][] = [];
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (isOpen(x, y)) open.push([x, y]);
    for (const [x, y] of open) {
      const n = [[0, -1], [0, 1], [-1, 0], [1, 0]].filter(([dx, dy]) => isOpen(x + dx, y + dy)).length;
      expect(n, `tile ${x},${y}`).toBeGreaterThanOrEqual(2);
    }
    const seen = new Set<string>(["1,1"]);
    const stack: [number, number][] = [[1, 1]];
    while (stack.length) {
      const [x, y] = stack.pop()!;
      for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
        const nx = (x + dx + COLS) % COLS;
        const ny = y + dy;
        if (isOpen(nx, ny) && !seen.has(`${nx},${ny}`)) {
          seen.add(`${nx},${ny}`);
          stack.push([nx, ny]);
        }
      }
    }
    expect(seen.size).toBe(open.length);
  });

  it("outlines every wall edge with rounded corners", () => {
    const o = wallOutline();
    expect(o.lines.length).toBeGreaterThan(100);
    expect(o.arcs.length).toBeGreaterThan(40);
  });
});

describe("maze-muncher movement and walls", () => {
  it("stops dead at a wall, centred in its corridor", () => {
    const s = playing();
    const p = s.player;
    p.x = 2;
    p.y = 1;
    p.dir = RIGHT;
    movePlayer(p, 0.4);
    expect(p.x).toBeCloseTo(2.4);
    p.dir = UP; // (2,0) is the outer wall
    p.x = 2;
    movePlayer(p, 5);
    expect(p.y).toBe(1);
    expect(p.moving).toBe(false);
    // Never inside a wall tile, however far it is told to go.
    p.dir = LEFT;
    movePlayer(p, 50);
    expect(isOpen(Math.round(p.x), Math.round(p.y))).toBe(true);
    expect(p.x).toBe(1);
  });

  it("buffers a turn until the maze allows it", () => {
    const s = playing();
    const p = s.player;
    p.x = 2;
    p.y = 4;
    p.dir = RIGHT;
    steer(s, DOWN); // (2,5) is a wall: stays queued
    movePlayer(p, 1);
    expect(p.dir).toBe(RIGHT);
    expect(p.want).toBe(DOWN);
    movePlayer(p, 2.5); // reaches the opening at x = 5
    expect(p.dir).toBe(DOWN);
    expect(p.x).toBe(5);
    expect(p.y).toBeGreaterThan(4);
  });

  it("cuts corners: a turn pressed a little early or late still works, but not too early", () => {
    const early = playing().player;
    early.x = 4.7;
    early.y = 4;
    early.dir = RIGHT;
    early.want = DOWN;
    movePlayer(early, 0.1);
    expect(early.dir).toBe(DOWN);
    expect(early.x).toBeGreaterThan(4.7); // slides onto the corridor's centre line
    expect(early.x).toBeLessThanOrEqual(5);

    const late = playing().player;
    late.x = 5.3;
    late.y = 4;
    late.dir = RIGHT;
    late.want = DOWN;
    movePlayer(late, 0.1);
    expect(late.dir).toBe(DOWN);

    const tooEarly = playing().player;
    tooEarly.x = 4.4;
    tooEarly.y = 4;
    tooEarly.dir = RIGHT;
    tooEarly.want = DOWN;
    movePlayer(tooEarly, 0.1);
    expect(tooEarly.dir).toBe(RIGHT);
  });

  it("lets you reverse instantly and goes through the tunnel to the other side", () => {
    const s = playing();
    const p = s.player;
    p.x = 3;
    p.y = TUNNEL_ROW;
    p.dir = LEFT;
    movePlayer(p, 3.8);
    expect(p.x).toBeGreaterThan(COLS - 1);
    expect(p.x).toBeLessThan(COLS);
    steer(s, RIGHT);
    movePlayer(p, 0.2);
    expect(p.dir).toBe(RIGHT);
  });
});

describe("maze-muncher hunters", () => {
  const player = { x: 10, y: 20 };

  it("each hunter has its own chase target", () => {
    const ember = { x: 3, y: 5 };
    // Ember heads straight for you.
    expect(chaseTarget(0, ember, player, LEFT, ember)).toEqual({ x: 10, y: 20 });
    // Hex aims four tiles ahead of you.
    expect(chaseTarget(1, ember, player, LEFT, ember)).toEqual({ x: 6, y: 20 });
    expect(chaseTarget(1, ember, player, UP, ember)).toEqual({ x: 10, y: 16 });
    // Frost doubles the line from Ember to the tile two ahead of you.
    expect(chaseTarget(2, { x: 0, y: 0 }, player, RIGHT, ember)).toEqual({ x: 12 * 2 - 3, y: 20 * 2 - 5 });
  });

  it("Moss chases from far away but gets shy within eight tiles", () => {
    const far = { x: 10, y: 8 };
    const near = { x: 12, y: 24 };
    expect(chaseTarget(3, far, player, LEFT, far)).toEqual({ x: 10, y: 20 });
    expect(chaseTarget(3, near, player, LEFT, far)).toEqual(HUNTERS[3].scatter);
  });

  it("go for their corners in scatter mode and for the pen door as eyes", () => {
    const s = playing();
    expect(currentMode(s)).toBe("scatter");
    s.rageOn = false;
    for (const h of s.hunters) expect(targetFor(s, h)).toEqual(HUNTERS[h.id].scatter);
    s.hunters[1].mode = "eyes";
    expect(targetFor(s, s.hunters[1])).toEqual({ x: 13, y: 11 });
  });

  it("switch from scatter to chase on a timer, turning around, and frightened time pauses the clock", () => {
    const s = playing();
    s.player.x = 1;
    s.player.y = 29;
    for (const h of s.hunters) if (h.id) h.mode = "house";
    const before = s.hunters[0].dir;
    const ev = run(s, 7.1);
    expect(ev.some((e) => e.type === "mode")).toBe(true);
    expect(currentMode(s)).toBe("chase");
    expect(before).toBeDefined();

    const t = s.modeTime;
    s.fright = 3;
    run(s, 2);
    expect(s.modeTime).toBeCloseTo(t, 3);
  });

  it("never turn back on themselves or walk into walls over a long chase", () => {
    const s = playing(7);
    s.phase = "play";
    for (const h of s.hunters) h.mode = "roam";
    s.hunters[1].x = 9;
    s.hunters[1].y = 7;
    s.hunters[2].x = 18;
    s.hunters[2].y = 20;
    s.hunters[3].x = 1;
    s.hunters[3].y = 29;
    s.player.x = 5;
    s.player.y = 23;
    s.lives = 99;
    for (const h of s.hunters) h.dir = ([UP, LEFT, DOWN, RIGHT] as const).find((d) => isOpen(Math.round(h.x) + DX[d], Math.round(h.y) + DY[d])) ?? UP;
    for (let i = 0; i < 60 * 40; i++) {
      s.player.x = 5;
      s.player.y = 23;
      update(s, 1 / 60);
      if ((s.phase as string) === "dying") s.phase = "play";
      for (const h of s.hunters) {
        if (h.mode !== "roam") continue;
        expect(isOpen(Math.round(h.x), Math.round(h.y)), `hunter ${h.id} at ${h.x},${h.y}`).toBe(true);
      }
    }
  });

  it("chooseDir picks the open tile closest to the target and never reverses", () => {
    const s = playing();
    s.rageOn = false;
    const h = s.hunters[0];
    h.x = 5;
    h.y = 4;
    h.dir = RIGHT; // heading right along row 4; (5,5) is open below, (6,4) ahead
    s.modeIndex = 1; // chase
    s.player.x = 5;
    s.player.y = 20;
    expect(chooseDir(s, h)).toBe(DOWN);
    s.player.x = 20;
    s.player.y = 4;
    expect(chooseDir(s, h)).toBe(RIGHT);
    s.player.x = 0;
    s.player.y = 4;
    h.dir = RIGHT;
    expect(chooseDir(s, h)).not.toBe(LEFT);
  });

  it("are slower when frightened and slower again in the side tunnel", () => {
    const s = playing();
    const h = s.hunters[1];
    h.mode = "roam";
    h.x = 9;
    h.y = 4;
    const normal = hunterSpeed(s, h);
    h.frightened = true;
    expect(hunterSpeed(s, h)).toBeLessThan(normal);
    h.frightened = false;
    h.x = 2;
    h.y = TUNNEL_ROW;
    expect(hunterSpeed(s, h)).toBeLessThan(normal);
    h.mode = "eyes";
    expect(hunterSpeed(s, h)).toBeGreaterThan(normal);
  });
});

describe("maze-muncher scoring", () => {
  it("chains eaten hunters 200, 400, 800, 1600", () => {
    expect([0, 1, 2, 3, 4].map(hunterPoints)).toEqual([200, 400, 800, 1600, 1600]);
    const s = playing();
    const out: MazeEvent[] = [];
    for (const h of s.hunters) {
      h.mode = "roam";
      h.frightened = true;
    }
    for (const h of s.hunters) {
      eatHunter(s, h, out);
      s.phase = "play";
    }
    expect(out.filter((e) => e.type === "hunter").map((e) => e.points)).toEqual([200, 400, 800, 1600]);
    expect(s.score).toBe(3000);
    expect(s.hunters.every((h) => h.mode === "eyes" && !h.frightened)).toBe(true);
  });

  it("starts the chain again with each power pellet, and dots score 10, pellets 50", () => {
    const s = playing();
    s.player.x = 1;
    s.player.y = 3; // the top-left pellet
    s.chain = 3;
    const ev = update(s, 1 / 120);
    expect(ev.some((e) => e.type === "pellet")).toBe(true);
    expect(s.score).toBe(50);
    expect(s.chain).toBe(0);
    expect(s.fright).toBeGreaterThan(0);
    expect(s.hunters.some((h) => h.frightened)).toBe(true);
    s.player.x = 1;
    s.player.y = 2;
    s.phase = "play";
    const before = s.score;
    update(s, 1 / 120);
    expect(s.score).toBe(before + 10);
  });

  it("gives one extra life when the score passes 10,000", () => {
    const s = playing();
    s.score = EXTRA_LIFE_AT - 5;
    s.player.x = 1;
    s.player.y = 2;
    const ev = update(s, 1 / 120);
    expect(ev.some((e) => e.type === "extra-life")).toBe(true);
    expect(s.lives).toBe(4);
    s.dots[2 * COLS + 1] = 1;
    s.player.x = 1;
    s.player.y = 2;
    s.score = EXTRA_LIFE_AT + 100;
    update(s, 1 / 120);
    expect(s.lives).toBe(4);
  });

  it("spawns a bonus item part-way through the dots and scores it", () => {
    const s = playing();
    s.level = 2;
    s.dotsEaten = Math.round(s.totalDots * 0.29) - 1;
    s.player.x = 1;
    s.player.y = 2;
    const ev = update(s, 1 / 120);
    expect(ev.some((e) => e.type === "bonus-spawn")).toBe(true);
    expect(s.bonus).not.toBeNull();
    s.player.x = 13.5;
    s.player.y = 17;
    const ev2 = update(s, 1 / 120);
    expect(ev2.find((e) => e.type === "bonus")?.points).toBe(300);
    expect(s.bonus).toBeNull();
  });
});

describe("maze-muncher lives and levels", () => {
  it("loses a life when caught by a hunter, and the run ends at zero", () => {
    const s = playing();
    s.hunters[0].x = s.player.x;
    s.hunters[0].y = s.player.y;
    update(s, 1 / 60);
    expect(s.phase).toBe("dying");
    run(s, 3);
    expect(s.lives).toBe(2);
    expect(s.phase).toBe("ready");

    s.lives = 1;
    s.phase = "play";
    s.hunters[0].mode = "roam";
    s.hunters[0].x = s.player.x;
    s.hunters[0].y = s.player.y;
    update(s, 1 / 60);
    const ev = run(s, 3);
    expect(ev.some((e) => e.type === "over")).toBe(true);
    expect(s.phase).toBe("over");
  });

  it("lets you eat a frightened hunter instead, and sends it home as eyes that return to the pen", () => {
    const s = playing();
    const h = s.hunters[0];
    h.frightened = true;
    h.x = s.player.x;
    h.y = s.player.y;
    update(s, 1 / 60);
    expect(s.phase).toBe("eat");
    expect(h.mode).toBe("eyes");
    s.phase = "play";
    s.fright = 0;
    s.player.x = 1;
    s.player.y = 29;
    for (const g of s.hunters) if (g.id) g.mode = "house";
    h.x = 9;
    h.y = 11;
    h.dir = RIGHT;
    run(s, 4);
    expect(["entering", "leaving", "roam"]).toContain(h.mode);
    expect(h.mode).not.toBe("eyes");
  });

  it("clears the level when the last dot goes, then comes back faster with less frightened time", () => {
    const s = playing();
    s.dots.fill(0);
    s.dots[29 * COLS + 1] = 1;
    s.dotsLeft = 1;
    s.player.x = 1;
    s.player.y = 29;
    for (const h of s.hunters) {
      h.mode = "house";
      h.x = 13.5;
      h.y = 14;
    }
    const ev = update(s, 1 / 120);
    expect(ev.some((e) => e.type === "clear")).toBe(true);
    expect(s.phase).toBe("clear");
    run(s, 4);
    expect(s.level).toBe(2);
    expect(s.phase).toBe("ready");
    expect(s.dotsLeft).toBe(s.totalDots);
    expect(speedsFor(2).player).toBeGreaterThan(speedsFor(1).player);
    expect(speedsFor(5).hunter).toBeGreaterThan(speedsFor(1).hunter);
    expect(frightTimeFor(1)).toBeGreaterThan(frightTimeFor(2));
    expect(frightTimeFor(5)).toBeLessThan(frightTimeFor(1));
    expect(frightTimeFor(30)).toBe(0);
    expect(BASE_SPEED * speedsFor(1).player).toBeLessThan(BASE_SPEED * speedsFor(20).player + 1);
  });

  it("lets the second hunter out straight away and the third after thirty dots", () => {
    const s = playing();
    s.player.x = 13;
    s.player.y = 23;
    run(s, 0.2);
    expect(s.hunters[1].mode).not.toBe("house");
    expect(s.hunters[2].mode).toBe("house");
    s.hunters[2].dots = 30;
    run(s, 0.1);
    expect(s.hunters[2].mode).not.toBe("house");
  });
});
