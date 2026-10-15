import { describe, it, expect } from "vitest";
import {
  ARENA, BOX_COST, MAX_ALIVE, NO_INPUT, UPGRADE_COST, currentWeapon, damageZombie, gaitOdds, interactTarget, newGame,
  interact, promptFor, spawnInterval, step, zombieHealth, zombiesForRound,
  type Action, type GameState, type Input, type Zombie,
} from "@/zombies/engine/game";
import { CELL, MAX_BOARDS, cellCenter, reachableZones } from "@/zombies/engine/map";
import { WEAPONS, magSize, newWeapon, weaponDamage, weaponName } from "@/zombies/engine/weapons";

const SEED = 42;

/** A zombie already inside, standing at (x, z). */
function addZombie(g: GameState, x: number, z: number, hp = 150): Zombie {
  const zb: Zombie = {
    id: g.nextId++, x, z, yaw: Math.PI, hp, maxHp: hp, gait: "walk", speed: 1.05, state: "inside", windowId: 0,
    timer: 0, attack: 0, cooldown: 99, hurt: 0, headless: false, anim: 0, look: 1,
  };
  g.zombies.push(zb);
  return zb;
}

/** A quiet game: no round running, standing at the spawn. */
function quiet(): GameState {
  const g = newGame(SEED);
  g.phaseTimer = 9999;
  return g;
}

const run = (g: GameState, seconds: number, input: Input = NO_INPUT, dt = 1 / 30) => {
  for (let t = 0; t < seconds; t += dt) step(g, input, dt);
};
const act = (g: GameState, ...actions: Action[]) => step(g, NO_INPUT, 1 / 60, actions);
/** Fire one aimed shot, waiting out any cooldown first. */
function shoot(g: GameState) {
  g.player.cooldown = 0;
  g.player.ads = 1;
  act(g, "fire");
}
const spot = (kind: string, extra?: (s: (typeof ARENA.spots)[number]) => boolean) =>
  ARENA.spots.find((s) => s.kind === kind && (!extra || extra(s)))!;
/** Stand in front of a wall spot, facing it. */
function standAt(g: GameState, s: (typeof ARENA.spots)[number]) {
  const solid = s.kind === "perk" || s.kind === "box" || s.kind === "upgrade";
  g.player.x = cellCenter(s.cx) + s.facing.x * (solid ? CELL * 0.75 : 0.3);
  g.player.z = cellCenter(s.cz) + s.facing.z * (solid ? CELL * 0.75 : 0.3);
  g.player.yaw = Math.atan2(-s.facing.x, -s.facing.z);
  g.player.pitch = 0;
}

describe("the map", () => {
  it("has four named rooms joined by four buyable doors", () => {
    expect(new Set(ARENA.zoneNames)).toEqual(new Set(["Lobby", "Dining Hall", "Chapel", "Workshop"]));
    expect(ARENA.zoneNames[ARENA.startZone]).toBe("Lobby");
    expect(ARENA.doors.map((d) => d.cost)).toEqual([750, 1000, 1250, 1000]);
    for (const d of ARENA.doors) expect(d.zones).toHaveLength(2);
  });

  it("puts every window between open ground and a room", () => {
    expect(ARENA.windows.length).toBe(13);
    for (const w of ARENA.windows) expect(w.zone).toBeGreaterThanOrEqual(0);
  });

  it("has wall guns, perks, box spots, an upgrade station and a power switch", () => {
    const count = (k: string) => ARENA.spots.filter((s) => s.kind === k).length;
    expect(count("wallbuy")).toBe(6);
    expect(count("perk")).toBe(5);
    expect(count("box")).toBe(3);
    expect(count("upgrade")).toBe(1);
    expect(count("power")).toBe(1);
  });

  it("opens up room by room", () => {
    expect(reachableZones(ARENA, []).size).toBe(1);
    expect(reachableZones(ARENA, [1]).size).toBe(2);
    expect(reachableZones(ARENA, [1, 2, 3, 4]).size).toBe(4);
    expect(reachableZones(ARENA, [3]).size).toBe(1); // that door is two rooms away
  });
});

describe("rounds", () => {
  it("follow the classic curve: more zombies, more health, faster spawns", () => {
    expect([1, 2, 3, 4, 5].map(zombiesForRound)).toEqual([6, 8, 13, 18, 24]);
    expect(zombiesForRound(10)).toBeGreaterThan(zombiesForRound(6));
    expect(zombieHealth(1)).toBe(150);
    expect(zombieHealth(9)).toBe(950);
    expect(zombieHealth(10)).toBe(1045);
    expect(spawnInterval(10)).toBeLessThan(spawnInterval(1));
    expect(gaitOdds(1)).toEqual({ run: 0, sprint: 0 });
    expect(gaitOdds(12).sprint).toBeGreaterThan(0);
  });

  it("starts you with 500 points and a pistol, then sends round 1", () => {
    const g = newGame(SEED);
    expect(g.player.points).toBe(500);
    expect(currentWeapon(g)).toMatchObject({ id: "sidearm", mag: 8, reserve: 80 });
    run(g, 3.2);
    expect(g.round).toBe(1);
    expect(g.phase).toBe("active");
    run(g, 15);
    expect(g.zombies.length).toBeGreaterThan(0);
    expect(g.zombies.length).toBeLessThanOrEqual(MAX_ALIVE);
    // Only the Lobby's windows are in play until you open a door.
    for (const z of g.zombies) expect(ARENA.zoneNames[ARENA.windows[z.windowId].zone]).toBe("Lobby");
  });

  it("zombies tear the boards off, climb in and come for you", () => {
    const g = newGame(SEED);
    let lowest = g.player.hp;
    let boardsDown = false;
    for (let t = 0; t < 90 && g.phase !== "over"; t += 1 / 30) {
      step(g, NO_INPUT, 1 / 30);
      lowest = Math.min(lowest, g.player.hp);
      if (g.boards.some((b) => b < MAX_BOARDS)) boardsDown = true;
    }
    expect(boardsDown).toBe(true);
    expect(lowest).toBeLessThan(100);
  });

  it("ends the round when every zombie is dead, then starts the next", () => {
    const g = newGame(SEED);
    run(g, 3.2);
    g.toSpawn = 0;
    for (const z of g.zombies) damageZombie(g, z, 9999, "body", "gun");
    run(g, 0.1);
    expect(g.phase).toBe("intermission");
    run(g, 9.5);
    expect(g.round).toBe(2);
    expect(g.player.grenades).toBe(4);
  });
});

describe("zombie pathfinding", () => {
  it("finds its way through open doors to you", () => {
    const g = quiet();
    g.openDoors = [1, 2];
    const p = g.player;
    // You: in the Workshop. It: the far corner of the Lobby.
    p.x = cellCenter(20);
    p.z = cellCenter(18);
    const z = addZombie(g, cellCenter(5), cellCenter(5));
    z.speed = 4;
    let closest = Infinity;
    for (let i = 0; i < 30 * 20; i++) {
      step(g, NO_INPUT, 1 / 30);
      closest = Math.min(closest, Math.hypot(z.x - p.x, z.z - p.z));
    }
    expect(closest).toBeLessThan(1.2);
  });

  it("can't walk through a shut door", () => {
    const g = quiet();
    const p = g.player;
    p.x = cellCenter(18);
    p.z = cellCenter(8); // Dining Hall, door 1 still shut
    const z = addZombie(g, cellCenter(10), cellCenter(8));
    z.speed = 4;
    run(g, 10);
    expect(z.x).toBeLessThan(13 * CELL); // still in the Lobby
  });
});

describe("shooting", () => {
  it("headshots do more damage and pay more", () => {
    const g = quiet();
    const p = g.player;
    const z = addZombie(g, p.x, p.z + 5);
    shoot(g);
    expect(z.hp).toBeCloseTo(150 - WEAPONS.sidearm.damage * WEAPONS.sidearm.head);
    expect(p.points).toBe(510);
    shoot(g);
    expect(z.state).toBe("dead");
    expect(z.headless).toBe(true);
    expect(g.stats.headshots).toBe(1);
    expect(p.points).toBe(610);
  });

  it("body shots do base damage", () => {
    const g = quiet();
    const p = g.player;
    const z = addZombie(g, p.x, p.z + 5);
    p.pitch = -0.12; // chest
    shoot(g);
    expect(z.hp).toBeCloseTo(150 - WEAPONS.sidearm.damage);
  });

  it("walls stop bullets", () => {
    const g = quiet();
    const p = g.player;
    p.z = cellCenter(9);
    p.yaw = Math.PI / 2; // facing +x, at the Lobby's east wall
    const z = addZombie(g, cellCenter(16), cellCenter(9));
    shoot(g);
    expect(z.hp).toBe(150);
  });

  it("rifles punch through a line of zombies", () => {
    const g = quiet();
    const p = g.player;
    p.weapons = [newWeapon("marksman")];
    p.pitch = -0.12;
    const a = addZombie(g, p.x, p.z + 3, 1000);
    const b = addZombie(g, p.x, p.z + 5, 1000);
    shoot(g);
    expect(a.hp).toBeLessThan(1000);
    expect(b.hp).toBeLessThan(1000);
    expect(1000 - b.hp).toBeLessThan(1000 - a.hp); // loses punch going through
  });

  it("reloads by itself when empty and Fast Hands halves the time", () => {
    const g = quiet();
    const w = currentWeapon(g)!;
    w.mag = 1;
    shoot(g);
    expect(w.mag).toBe(0);
    expect(g.player.reload).toBeCloseTo(WEAPONS.sidearm.reload);
    run(g, WEAPONS.sidearm.reload + 0.1);
    expect(w.mag).toBe(8);
    expect(w.reserve).toBe(72);
    g.player.perks = ["hands"];
    w.mag = 3;
    act(g, "reload");
    expect(g.player.reload).toBeCloseTo(WEAPONS.sidearm.reload / 2, 1);
  });

  it("the knife one-shots early zombies for 130", () => {
    const g = quiet();
    const p = g.player;
    const z = addZombie(g, p.x, p.z + 1.2);
    act(g, "melee");
    expect(z.state).toBe("dead");
    expect(p.points).toBe(630);
  });

  it("grenades blow up zombies around them but not through walls", () => {
    const g = quiet();
    g.round = 1;
    const p = g.player;
    p.pitch = -0.6;
    const near = addZombie(g, p.x, p.z + 4);
    const behindWall = addZombie(g, cellCenter(16), p.z);
    near.speed = behindWall.speed = 0;
    act(g, "grenade");
    expect(p.grenades).toBe(1);
    run(g, 2.5);
    expect(near.state).toBe("dead");
    expect(behindWall.state).toBe("inside");
  });
});

describe("buying", () => {
  it("wall guns cost their price, then ammo costs half", () => {
    const g = quiet();
    standAt(g, spot("wallbuy", (s) => s.weapon === "carbine"));
    expect(promptFor(g)).toContain("Ranger Carbine [500]");
    expect(interact(g)).toBe(true);
    expect(g.player.points).toBe(0);
    expect(currentWeapon(g)?.id).toBe("carbine");
    expect(g.player.weapons).toHaveLength(2);
    currentWeapon(g)!.reserve = 0;
    g.player.points = 300;
    expect(promptFor(g)).toContain("[250]");
    expect(interact(g)).toBe(true);
    expect(g.player.points).toBe(50);
    expect(currentWeapon(g)!.reserve).toBe(WEAPONS.carbine.reserve);
  });

  it("a third gun replaces the one in your hands", () => {
    const g = quiet();
    g.player.points = 5000;
    standAt(g, spot("wallbuy", (s) => s.weapon === "carbine"));
    interact(g);
    standAt(g, spot("wallbuy", (s) => s.weapon === "coach"));
    interact(g);
    expect(g.player.weapons.map((w) => w.id).sort()).toEqual(["coach", "sidearm"]);
  });

  it("doors open when you can pay, and open up more windows", () => {
    const g = quiet();
    g.player.points = 700;
    g.player.x = cellCenter(12);
    g.player.z = cellCenter(8);
    g.player.yaw = Math.PI / 2;
    expect(interactTarget(g)).toMatchObject({ kind: "door", cost: 750 });
    expect(interact(g)).toBe(false);
    expect(g.openDoors).toEqual([]);
    g.player.points = 750;
    expect(interact(g)).toBe(true);
    expect(g.openDoors).toEqual([1]);
    expect(g.player.points).toBe(0);
  });

  it("perks need the power on (except Second Wind)", () => {
    const g = quiet();
    g.player.points = 10000;
    standAt(g, spot("perk", (s) => s.perk === "iron"));
    expect(promptFor(g)).toMatch(/power/);
    expect(interact(g)).toBe(false);
    g.power = true;
    expect(interact(g)).toBe(true);
    expect(g.player.maxHp).toBe(250);
    expect(g.player.points).toBe(7500);
    expect(interact(g)).toBe(false); // already have it
    const g2 = quiet();
    standAt(g2, spot("perk", (s) => s.perk === "wind"));
    expect(interact(g2)).toBe(true);
    expect(g2.player.perks).toEqual(["wind"]);
  });

  it("the power switch turns the power on", () => {
    const g = quiet();
    standAt(g, spot("power"));
    expect(interact(g)).toBe(true);
    expect(g.power).toBe(true);
  });
});

describe("going down", () => {
  it("without Second Wind it's game over", () => {
    const g = quiet();
    const z = addZombie(g, g.player.x, g.player.z + 0.8);
    z.cooldown = 0;
    run(g, 6);
    expect(g.phase).toBe("over");
  });

  it("Second Wind gets you back up, without your perks", () => {
    const g = quiet();
    g.player.perks = ["wind", "tap"];
    g.player.hp = 10;
    const z = addZombie(g, g.player.x, g.player.z + 0.8);
    z.cooldown = 0;
    run(g, 1);
    expect(g.player.downed).toBeGreaterThan(0);
    expect(g.player.perks).toEqual([]);
    g.zombies = [];
    run(g, 5);
    expect(g.player.downed).toBe(0);
    expect(g.player.hp).toBe(100);
    expect(g.phase).not.toBe("over");
  });

  it("health comes back a few seconds after a hit", () => {
    const g = quiet();
    g.player.hp = 40;
    g.player.hurtAt = g.time;
    run(g, 1.5);
    expect(g.player.hp).toBe(40);
    run(g, 2);
    expect(g.player.hp).toBe(100);
  });
});

describe("the Mystery Box and the Upgrade Station", () => {
  it("rolls a gun you don't have, and you take it", () => {
    const g = quiet();
    g.player.points = BOX_COST;
    standAt(g, ARENA.spots[g.box.spot]);
    expect(promptFor(g)).toContain(`[${BOX_COST}]`);
    expect(interact(g)).toBe(true);
    expect(g.box.state).toBe("spinning");
    run(g, 3.7);
    expect(g.box.state).toBe("ready");
    const rolled = g.box.weapon!;
    expect(WEAPONS[rolled].boxWeight).toBeGreaterThan(0);
    expect(interact(g)).toBe(true);
    expect(currentWeapon(g)?.id).toBe(rolled);
  });

  it("sometimes flies away: you get your points back and it moves", () => {
    const g = quiet();
    const start = g.box.spot;
    let left = false;
    for (let i = 0; i < 60 && !left; i++) {
      standAt(g, ARENA.spots[g.box.spot]);
      g.player.points = BOX_COST;
      g.box.uses = 10;
      interact(g);
      run(g, 3.7);
      if (g.box.state === "leaving") {
        left = true;
        expect(g.player.points).toBe(BOX_COST);
        run(g, 4.1);
        expect(g.box.spot).not.toBe(start);
      } else {
        interact(g); // take it, go again
      }
    }
    expect(left).toBe(true);
  });

  it("upgrades a gun for 5000 with the power on", () => {
    const g = quiet();
    g.player.points = UPGRADE_COST;
    standAt(g, spot("upgrade"));
    expect(interact(g)).toBe(false); // no power
    g.power = true;
    expect(interact(g)).toBe(true);
    expect(g.player.weapons).toHaveLength(0);
    run(g, 3.6);
    expect(g.upgrade.state).toBe("ready");
    expect(interact(g)).toBe(true);
    const w = currentWeapon(g)!;
    expect(w.upgraded).toBe(true);
    expect(weaponName(w)).toBe("Viper Fang");
    expect(weaponDamage(w)).toBe(WEAPONS.sidearm.damage * 2);
    expect(w.mag).toBe(magSize(w));
    expect(magSize(w)).toBe(12);
  });
});

describe("barriers and power-ups", () => {
  it("holding Use rebuilds boards for 10 points each, up to 500 a round", () => {
    const g = quiet();
    const w = ARENA.windows.find((x) => ARENA.zoneNames[x.zone] === "Lobby")!;
    g.boards[w.id] = 2;
    g.player.x = cellCenter(w.inside[0]);
    g.player.z = cellCenter(w.inside[1]);
    g.player.yaw = Math.atan2(w.normal.x, w.normal.z);
    expect(promptFor(g)).toMatch(/rebuild/);
    run(g, 1.2, { ...NO_INPUT, use: true });
    expect(g.boards[w.id]).toBe(4);
    expect(g.player.points).toBe(520);
    g.repairPoints = 500;
    run(g, 0.6, { ...NO_INPUT, use: true });
    expect(g.boards[w.id]).toBe(5);
    expect(g.player.points).toBe(520);
  });

  it("insta-kill, double points, max ammo, nuke and carpenter", () => {
    const g = quiet();
    const p = g.player;
    const drop = (kind: GameState["drops"][number]["kind"]) => {
      g.drops.push({ id: g.nextId++, kind, x: p.x, z: p.z, age: 0 });
      run(g, 1 / 30);
    };
    drop("insta_kill");
    const tough = addZombie(g, p.x, p.z + 5, 100000);
    shoot(g);
    expect(tough.state).toBe("dead");

    drop("double_points");
    const before = p.points;
    const z2 = addZombie(g, p.x, p.z + 5, 100000);
    g.insta = 0;
    p.pitch = -0.12;
    shoot(g);
    expect(z2.state).toBe("inside");
    expect(p.points - before).toBe(20);

    currentWeapon(g)!.reserve = 0;
    p.grenades = 0;
    drop("max_ammo");
    expect(currentWeapon(g)!.reserve).toBe(80);
    expect(p.grenades).toBe(4);

    g.double = 0;
    addZombie(g, p.x + 3, p.z);
    const pts = p.points;
    drop("nuke");
    expect(g.zombies.every((z) => z.state === "dead")).toBe(true);
    expect(p.points - pts).toBe(400);

    g.boards[0] = 0;
    drop("carpenter");
    expect(g.boards[0]).toBe(MAX_BOARDS);
  });
});
