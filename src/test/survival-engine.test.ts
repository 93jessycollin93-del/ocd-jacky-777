import { describe, it, expect } from "vitest";
import {
  newGame, step, craft, addItem, count, primaryAction, interact, toggleMount, respawn, lookTarget,
  serialize, deserialize, placementFor, groundAt, lookedAtStorage, transfer, bedSpawn, toggleDoor, assignHotbar, collectLoot,
  carryWeight, encumbrance, toolDurability, repairTool, queueCraft, cancelCraft, craftBlocker,
  carryCapacity, wearGear, removeGear, armorValue, ambientTemperature, feelsLike, thermalBand, dropItem, consume, canCraft,
  huntNight, isLit, TAME_FEED_HEAL,
  SWING_STAMINA, FALL_SAFE, FALL_DAMAGE, TAME_REGEN, DAY_LENGTH, NO_INPUT,
  type GameState,
} from "@/survival/engine/game";
import { solidAt } from "@/survival/engine/blocks";
import {
  SPECIES, makeCreature, damageCreature, feedCreature, gainTameXp, creatureLevel, creatureMaxHp, creatureDamage, tameXpForLevel,
} from "@/survival/engine/creatures";
import { heightAt, spawnPoint, generateNodes, WATER_LEVEL, WORLD_HALF } from "@/survival/engine/world";
import { RECIPES, ITEMS } from "@/survival/engine/items";

const SEED = 1234;

/** Put a single thing directly in front of the player and nothing else around. */
function isolate(state: GameState) {
  state.creatures = [];
  state.nodes = [];
  state.player.yaw = 0; // facing +z
}

describe("island generation", () => {
  it("is deterministic for a seed", () => {
    expect(heightAt(10, -20, SEED)).toBe(heightAt(10, -20, SEED));
    expect(generateNodes(SEED)).toEqual(generateNodes(SEED));
  });

  it("is an island: land in the middle, ocean at the edges", () => {
    expect(heightAt(0, 0, SEED)).toBeGreaterThan(WATER_LEVEL);
    expect(heightAt(WORLD_HALF * 0.98, 0, SEED)).toBeLessThan(WATER_LEVEL);
  });

  it("spawns the player on a dry beach", () => {
    const s = spawnPoint(SEED);
    const h = heightAt(s.x, s.z, SEED);
    expect(h).toBeGreaterThan(1);
    expect(h).toBeLessThan(6);
  });

  it("generates every resource kind above water", () => {
    const nodes = generateNodes(SEED);
    expect(new Set(nodes.map((n) => n.kind))).toEqual(new Set(["tree", "rock", "bush", "ore"]));
    expect(nodes.every((n) => n.y >= 1)).toBe(true);
  });
});

describe("new game", () => {
  it("starts with a full wild population and an empty inventory", () => {
    const g = newGame(SEED);
    const total = Object.values(SPECIES).reduce((a, s) => a + s.population, 0);
    expect(g.creatures).toHaveLength(total);
    expect(g.creatures.every((c) => !c.tamed)).toBe(true);
    expect(g.inventory).toEqual({});
  });
});

describe("gathering and crafting", () => {
  it("punching a tree gives wood and thatch", () => {
    const g = newGame(SEED);
    isolate(g);
    const p = g.player;
    g.nodes = [{ id: 1, kind: "tree", x: p.x, z: p.z + 1.5, y: p.y, hp: 60, maxHp: 60, respawnAt: 0 }];
    expect(primaryAction(g)).toBe(true);
    expect(count(g, "wood")).toBeGreaterThan(0);
    expect(count(g, "thatch")).toBeGreaterThan(0);
  });

  it("depletes a node and regrows it later", () => {
    const g = newGame(SEED);
    isolate(g);
    const p = g.player;
    g.nodes = [{ id: 1, kind: "bush", x: p.x, z: p.z + 1.5, y: p.y, hp: 10, maxHp: 20, respawnAt: 0 }];
    primaryAction(g);
    expect(g.nodes[0].respawnAt).toBeGreaterThan(0);
    expect(lookTarget(g, 3)).toBeNull();
    g.time = g.nodes[0].respawnAt + 1;
    step(g, NO_INPUT, 0.016);
    expect(g.nodes[0].respawnAt).toBe(0);
    expect(g.nodes[0].hp).toBe(20);
  });

  it("crafts a pick from wood, stone and cordage, and puts it on the hotbar", () => {
    const g = newGame(SEED);
    addItem(g, "wood", 2);
    addItem(g, "stone", 2);
    addItem(g, "fiber", 3);
    expect(craft(g, "stone_pick")).toBe(false); // no cordage yet
    expect(craft(g, "cordage")).toBe(true);
    expect(craft(g, "stone_pick")).toBe(true);
    expect(count(g, "stone_pick")).toBe(1);
    expect(count(g, "cordage")).toBe(0);
    expect(count(g, "wood")).toBe(1);
    expect(g.hotbar).toContain("stone_pick");
  });

  it("refuses recipes without materials, level, or a campfire", () => {
    const g = newGame(SEED);
    expect(craft(g, "stone_pick")).toBe(false);
    addItem(g, "wood", 50);
    addItem(g, "thatch", 50);
    addItem(g, "fiber", 50);
    expect(craft(g, "foundation")).toBe(false); // level 2
    addItem(g, "raw_meat", 1);
    expect(craft(g, "cooked_meat")).toBe(false); // no campfire
  });

  it("every recipe produces a real item from real items", () => {
    for (const r of RECIPES) {
      expect(ITEMS[r.output], r.id).toBeDefined();
      for (const id of Object.keys(r.cost)) expect(ITEMS[id as keyof typeof ITEMS], `${r.id} ${id}`).toBeDefined();
    }
  });
});

describe("building", () => {
  it("places a foundation on the grid and lets you stand on it", () => {
    const g = newGame(SEED);
    addItem(g, "foundation", 1);
    g.selected = g.hotbar.indexOf("foundation");
    const spot = placementFor(g, "foundation");
    expect(Math.abs(spot.x % 4)).toBe(0);
    expect(primaryAction(g)).toBe(true);
    expect(g.structures).toHaveLength(1);
    expect(groundAt(g, spot.x, spot.z)).toBeGreaterThanOrEqual(spot.y);
    expect(count(g, "foundation")).toBe(0);
  });

  it("cooks meat at a campfire", () => {
    const g = newGame(SEED);
    isolate(g);
    addItem(g, "campfire", 1);
    g.selected = g.hotbar.indexOf("campfire");
    primaryAction(g);
    g.player.cooldown = 0;
    addItem(g, "raw_meat", 3);
    addItem(g, "wood", 3);
    g.player.yaw = Math.PI; // look away so E doesn't target the fire itself
    expect(interact(g)).toBe("Cooked 3 meat");
    expect(count(g, "cooked_meat")).toBe(3);
  });
});

describe("sleeping bag and storage", () => {
  function placeAhead(g: GameState, kind: "bed" | "storage") {
    addItem(g, kind, 1);
    g.selected = g.hotbar.indexOf(kind);
    g.player.cooldown = 0;
    expect(primaryAction(g)).toBe(true);
    return g.structures[g.structures.length - 1];
  }

  it("respawns you at your sleeping bag instead of the beach", () => {
    const g = newGame(SEED);
    isolate(g);
    const bed = placeAhead(g, "bed");
    expect(bedSpawn(g)).toBe(bed);
    g.player.dead = true;
    respawn(g);
    expect(Math.hypot(g.player.x - bed.x, g.player.z - bed.z)).toBeLessThan(1.5);
    expect(g.player.dead).toBe(false);
  });

  it("stores and returns items, and keeps them through death", () => {
    const g = newGame(SEED);
    isolate(g);
    const box = placeAhead(g, "storage");
    expect(lookedAtStorage(g)?.id).toBe(box.id);
    addItem(g, "stone", 12);
    expect(transfer(g, box.id, "stone", "deposit")).toBe(true);
    expect(count(g, "stone")).toBe(0);
    expect(box.items?.stone).toBe(12);
    respawn(g);
    expect(box.items?.stone).toBe(12);
    expect(transfer(g, box.id, "stone", "withdraw")).toBe(true);
    expect(count(g, "stone")).toBe(12);
    expect(transfer(g, box.id, "stone", "withdraw")).toBe(false);
  });

  it("picking up a box gives you the box and everything in it", () => {
    const g = newGame(SEED);
    isolate(g);
    const box = placeAhead(g, "storage");
    addItem(g, "hide", 3);
    transfer(g, box.id, "hide", "deposit");
    g.selected = g.hotbar.indexOf(null);
    g.player.cooldown = 0;
    primaryAction(g); // punch it
    expect(g.structures).toHaveLength(0);
    expect(count(g, "storage")).toBe(1);
    expect(count(g, "hide")).toBe(3);
  });
});

describe("blocks", () => {
  /** Stand on flat-ish ground, looking straight down at your feet's neighbour. */
  function lookDown(g: GameState) {
    isolate(g);
    g.player.pitch = -1.2;
  }

  it("places a block on the ground in front of you and breaks it back", () => {
    const g = newGame(SEED);
    lookDown(g);
    addItem(g, "cobblestone", 3);
    g.selected = g.hotbar.indexOf("cobblestone");
    expect(primaryAction(g)).toBe(true);
    expect(Object.values(g.blocks)).toEqual(["cobblestone"]);
    expect(count(g, "cobblestone")).toBe(2);

    // Break it with bare hands: cobblestone takes several hits.
    g.selected = g.hotbar.indexOf(null);
    let hits = 0;
    while (Object.keys(g.blocks).length && hits < 20) {
      g.player.cooldown = 0;
      primaryAction(g);
      hits++;
    }
    expect(hits).toBeGreaterThan(1);
    expect(g.blocks).toEqual({});
    expect(count(g, "cobblestone")).toBe(3);
  });

  it("stacks blocks on the face you're looking at", () => {
    const g = newGame(SEED);
    lookDown(g);
    addItem(g, "plank", 2);
    g.selected = g.hotbar.indexOf("plank");
    primaryAction(g);
    g.player.cooldown = 0;
    primaryAction(g);
    const cells = Object.keys(g.blocks).map((k) => k.split(",").map(Number));
    expect(cells).toHaveLength(2);
    const [a, b] = cells;
    // The second block goes on whichever face of the first one you were looking at.
    expect(Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2])).toBe(1);
  });

  it("won't place a solid block inside you", () => {
    const g = newGame(SEED);
    isolate(g);
    const p = g.player;
    for (let i = 0; i < 60; i++) step(g, NO_INPUT, 1 / 60); // land first: new games start you just above the sand
    expect(p.onGround).toBe(true);
    g.player.pitch = -Math.PI / 2 + 0.01; // straight down at your own feet
    addItem(g, "plank", 1);
    g.selected = g.hotbar.indexOf("plank");
    expect(primaryAction(g)).toBe(false);
    expect(count(g, "plank")).toBe(1);
    expect(p.dead).toBe(false);
  });

  it("you can stand on blocks, and they stop you walking", () => {
    const g = newGame(SEED);
    isolate(g);
    const p = g.player;
    const fx = Math.floor(p.x);
    const fz = Math.floor(p.z);
    const base = Math.floor(heightAt(fx + 0.5, fz + 0.5, SEED) + 0.3);
    // A pillar under the player, and a wall one cell ahead (+z).
    g.blocks[`${fx},${base},${fz}`] = "cobblestone";
    for (let y = base; y < base + 4; y++) g.blocks[`${fx},${y + 1},${fz + 1}`] = "cobblestone";
    p.x = fx + 0.5;
    p.z = fz + 0.5;
    p.y = base + 1;
    p.vy = 0;
    for (let i = 0; i < 60; i++) step(g, { ...NO_INPUT, forward: true }, 1 / 60);
    expect(p.y).toBeCloseTo(base + 1, 1);
    expect(p.z).toBeLessThan(fz + 1); // the wall held
  });

  it("dinosaurs can't walk through solid blocks", () => {
    const g = newGame(SEED);
    isolate(g);
    const p = g.player;
    const c = makeCreature(50, "dodo", p.x, p.z + 3);
    g.creatures = [c];
    const ahead = { x: c.x + Math.sin(0) * 0.5, z: c.z + Math.cos(0) * 0.5 };
    const y = Math.floor(heightAt(ahead.x, ahead.z, SEED) + 0.5);
    g.blocks[`${Math.floor(ahead.x)},${y},${Math.floor(ahead.z)}`] = "plank";
    g.blocks[`${Math.floor(ahead.x)},${y + 1},${Math.floor(ahead.z)}`] = "plank";
    c.heading = 0;
    c.timer = 10;
    const z0 = c.z;
    step(g, NO_INPUT, 0.2);
    expect(c.z).toBe(z0);
  });

  it("saves and loads blocks", () => {
    const g = newGame(SEED);
    g.blocks["1,2,3"] = "torch";
    expect(deserialize(serialize(g))!.blocks).toEqual({ "1,2,3": "torch" });
  });
});

describe("digging, new blocks and doors", () => {
  function settle(g: GameState) {
    for (let i = 0; i < 60; i++) step(g, NO_INPUT, 1 / 60);
  }

  it("digs dirt inland and sand on the beach; a shovel digs faster", () => {
    const g = newGame(SEED);
    isolate(g);
    settle(g);
    g.player.pitch = -1.0;
    const swings = () => {
      let n = 0;
      const before = count(g, "dirt") + count(g, "sand");
      while (count(g, "dirt") + count(g, "sand") === before && n < 10) {
        g.player.cooldown = 0;
        primaryAction(g);
        n++;
      }
      return n;
    };
    expect(swings()).toBe(2); // bare hands
    // The spawn is a beach, so that was sand.
    expect(count(g, "sand")).toBe(1);
    addItem(g, "stone_shovel", 1);
    g.selected = g.hotbar.indexOf("stone_shovel");
    expect(swings()).toBe(1);
  });

  it("smelts sand into glass at a campfire", () => {
    const g = newGame(SEED);
    isolate(g);
    addItem(g, "sand", 4);
    addItem(g, "wood", 2);
    expect(craft(g, "glass")).toBe(false);
    g.structures.push({ id: 77, kind: "campfire", x: g.player.x + 1, y: g.player.y, z: g.player.z, rot: 0 });
    expect(craft(g, "glass")).toBe(true);
    expect(count(g, "glass")).toBe(1);
  });

  it("doors are two blocks tall, open with E, and break as one", () => {
    const g = newGame(SEED);
    isolate(g);
    settle(g);
    g.player.pitch = -0.9;
    addItem(g, "door", 1);
    g.selected = g.hotbar.indexOf("door");
    expect(primaryAction(g)).toBe(true);
    const cells = Object.keys(g.blocks);
    expect(cells).toHaveLength(2);
    expect(Object.values(g.blocks)).toEqual(["door", "door"]);

    g.player.pitch = -0.4; // look at the door rather than the ground
    expect(interact(g)).toBe("Door opened");
    expect(Object.values(g.blocks)).toEqual(["door_open", "door_open"]);
    const [x, y, z] = cells[0].split(",").map(Number);
    expect(solidAt(g.blocks, x + 0.5, y + 0.5, z + 0.5)).toBe(false);
    expect(interact(g)).toBe("Door closed");

    g.selected = g.hotbar.indexOf(null);
    for (let i = 0; i < 6 && Object.keys(g.blocks).length; i++) {
      g.player.cooldown = 0;
      primaryAction(g);
    }
    expect(g.blocks).toEqual({});
    expect(count(g, "door")).toBe(1);
  });

  it("won't close a door on you", () => {
    const g = newGame(SEED);
    isolate(g);
    settle(g);
    const p = g.player;
    const x = Math.floor(p.x);
    const z = Math.floor(p.z);
    const y = Math.floor(p.y);
    g.blocks[`${x},${y},${z}`] = "door_open";
    g.blocks[`${x},${y + 1},${z}`] = "door_open";
    expect(toggleDoor(g, [x, y, z])).toBe("Step out of the doorway to close it");
    expect(g.blocks[`${x},${y},${z}`]).toBe("door_open");
  });

  it("lets you choose what goes in each hotbar slot", () => {
    const g = newGame(SEED);
    addItem(g, "plank", 5);
    addItem(g, "dirt", 5);
    addItem(g, "wood", 5);
    expect(g.hotbar.slice(0, 2)).toEqual(["plank", "dirt"]);
    expect(assignHotbar(g, "dirt", 0)).toBe(true);
    expect(g.hotbar.slice(0, 2)).toEqual(["dirt", "plank"]); // swapped, not duplicated
    expect(assignHotbar(g, "dirt", 5)).toBe(true);
    expect(g.hotbar.filter((h) => h === "dirt")).toHaveLength(1);
    expect(assignHotbar(g, "wood", 3)).toBe(false); // resources don't go on the bar
  });

  it("crafts logs by hand; stone bricks and doors need a workbench", () => {
    const g = newGame(SEED);
    addItem(g, "wood", 10);
    addItem(g, "stone", 6);
    addItem(g, "cordage", 2);
    expect(craft(g, "log")).toBe(true);
    expect(craft(g, "stone_brick")).toBe(false); // no workbench
    for (let i = 0; i < 3; i++) craft(g, "plank");
    expect(count(g, "plank")).toBe(6);
    expect(craft(g, "door")).toBe(false); // no workbench
    g.structures.push({ id: 88, kind: "workbench", x: g.player.x + 1, y: g.player.y, z: g.player.z, rot: 0 });
    expect(craft(g, "stone_brick")).toBe(true);
    expect(count(g, "stone_brick")).toBe(2);
    expect(craft(g, "door")).toBe(true);
  });
});

describe("metal tier", () => {
  function oreAhead(g: GameState) {
    isolate(g);
    const p = g.player;
    g.nodes = [{ id: 1, kind: "ore", x: p.x, z: p.z + 1.5, y: p.y, hp: 90, maxHp: 90, respawnAt: 0 }];
  }

  it("puts metal ore up in the mountains", () => {
    const ore = generateNodes(SEED).filter((n) => n.kind === "ore");
    expect(ore.length).toBeGreaterThan(5);
    expect(ore.every((n) => n.y > 14)).toBe(true);
  });

  it("needs a pick to mine ore", () => {
    const g = newGame(SEED);
    oreAhead(g);
    primaryAction(g);
    expect(count(g, "metal_ore")).toBe(0);
    addItem(g, "stone_pick", 1);
    g.selected = g.hotbar.indexOf("stone_pick");
    g.player.cooldown = 0;
    primaryAction(g);
    expect(count(g, "metal_ore")).toBeGreaterThan(0);
  });

  it("smelts ore into ingots at a forge, using wood as fuel", () => {
    const g = newGame(SEED);
    isolate(g);
    addItem(g, "forge", 1);
    g.selected = g.hotbar.indexOf("forge");
    expect(primaryAction(g)).toBe(true);
    g.player.yaw = Math.PI; // turn away so E doesn't target the forge itself
    addItem(g, "metal_ore", 5);
    expect(interact(g)).toBe("Smelting needs wood for fuel");
    addItem(g, "wood", 10);
    expect(interact(g)).toBe("Smelted 2 metal ingots");
    expect(count(g, "metal_ingot")).toBe(2);
    expect(count(g, "metal_ore")).toBe(1);
  });

  it("metal tools are gated by level and much stronger", () => {
    const g = newGame(SEED);
    addItem(g, "metal_ingot", 20);
    addItem(g, "wood", 20);
    addItem(g, "leather", 5);
    g.structures.push({ id: 89, kind: "workbench", x: g.player.x + 1, y: g.player.y, z: g.player.z, rot: 0 });
    expect(craft(g, "metal_pick")).toBe(false); // level 1
    g.player.level = 4;
    expect(craft(g, "metal_pick")).toBe(true);
    expect(craft(g, "metal_sword")).toBe(true);
    expect(craft(g, "metal_block")).toBe(true);
  });

  it("a metal pick breaks cobblestone in one hit; metal blocks are tough", () => {
    const g = newGame(SEED);
    isolate(g);
    g.player.pitch = -1.2;
    addItem(g, "cobblestone", 1);
    g.selected = g.hotbar.indexOf("cobblestone");
    primaryAction(g);
    addItem(g, "metal_pick", 1);
    g.selected = g.hotbar.indexOf("metal_pick");
    g.player.cooldown = 0;
    primaryAction(g);
    expect(g.blocks).toEqual({});

    addItem(g, "metal_block", 1);
    g.selected = g.hotbar.indexOf("metal_block");
    g.player.cooldown = 0;
    primaryAction(g);
    g.selected = g.hotbar.indexOf(null);
    for (let i = 0; i < 10; i++) {
      g.player.cooldown = 0;
      primaryAction(g); // bare hands
    }
    expect(Object.values(g.blocks)).toEqual(["metal_block"]);
  });
});

describe("combat and movement feel", () => {
  function settle(g: GameState) {
    for (let i = 0; i < 60; i++) step(g, NO_INPUT, 1 / 60);
  }

  it("knocks creatures back and flashes them when hit", () => {
    const g = newGame(SEED);
    isolate(g);
    settle(g);
    const p = g.player;
    const c = makeCreature(40, "dodo", p.x, p.z + 1.6);
    g.creatures = [c];
    const z0 = c.z;
    primaryAction(g);
    expect(c.hurt).toBeGreaterThan(0);
    for (let i = 0; i < 10; i++) step(g, NO_INPUT, 1 / 60);
    expect(c.z).toBeGreaterThan(z0 + 0.2); // pushed away from the player (+z)
  });

  it("swinging costs stamina, and swings slow down when you're out of breath", () => {
    const g = newGame(SEED);
    isolate(g);
    const s0 = g.player.stamina;
    primaryAction(g);
    expect(g.player.stamina).toBe(s0 - SWING_STAMINA);
    const normal = g.player.cooldown;
    g.player.cooldown = 0;
    g.player.stamina = 0;
    primaryAction(g);
    expect(g.player.cooldown).toBeGreaterThan(normal);
  });

  it("raptors can't bite you through a wall", () => {
    const g = newGame(SEED);
    isolate(g);
    settle(g);
    const p = g.player;
    // A two-high wall across the z axis between the player and the raptor.
    const wz = Math.floor(p.z) + 1;
    for (let x = Math.floor(p.x) - 3; x <= Math.floor(p.x) + 3; x++) {
      const y = Math.floor(heightAt(x + 0.5, wz + 0.5, SEED) + 0.3);
      for (let dy = 0; dy < 3; dy++) g.blocks[`${x},${y + dy},${wz}`] = "cobblestone";
    }
    const r = makeCreature(41, "raptor", p.x, wz + 1.6);
    r.state = "chase";
    r.target = "player";
    r.timer = 30;
    g.creatures = [r];
    const hp = p.hp;
    for (let i = 0; i < 120; i++) step(g, NO_INPUT, 1 / 30);
    expect(p.hp).toBeGreaterThanOrEqual(hp - 0.01 - 4); // only starvation-free regen noise, no bites
    expect(p.hurtFlash).toBe(0);
  });

  it("long falls hurt; short ones and water landings don't", () => {
    const g = newGame(SEED);
    isolate(g);
    settle(g);
    const p = g.player;
    const ground = p.y;
    p.y = ground + 3;
    p.onGround = false;
    p.peakY = p.y;
    const hp = p.hp;
    settle(g);
    expect(p.hp).toBeCloseTo(hp, 0);
    p.y = ground + 10;
    p.onGround = false;
    p.peakY = p.y;
    settle(g);
    expect(p.hp).toBeLessThan(hp - (10 - FALL_SAFE) * FALL_DAMAGE + 5);
  });

  it("drops your things in a bag when you die, and you can get them back", () => {
    const g = newGame(SEED);
    isolate(g);
    settle(g);
    addItem(g, "stone_pick", 1);
    addItem(g, "wood", 12);
    const where = { x: g.player.x, z: g.player.z };
    g.player.hp = 1;
    g.player.food = 0;
    step(g, NO_INPUT, 1);
    expect(g.player.dead).toBe(true);
    const bag = g.structures.find((s) => s.kind === "lootbag")!;
    expect(bag.items).toEqual({ stone_pick: 1, wood: 12 });
    expect(Math.hypot(bag.x - where.x, bag.z - where.z)).toBeLessThan(0.1);
    respawn(g);
    expect(count(g, "wood")).toBe(0);
    expect(collectLoot(g, bag)).toBe(true);
    expect(count(g, "wood")).toBe(12);
    expect(g.hotbar).toContain("stone_pick");
    expect(g.structures.some((s) => s.kind === "lootbag")).toBe(false);
  });

  it("tames heal over time out of combat", () => {
    const g = newGame(SEED);
    isolate(g);
    const c = makeCreature(42, "parasaur", g.player.x + 3, g.player.z);
    c.tamed = true;
    c.state = "stay";
    c.hp = 50;
    g.creatures = [c];
    step(g, NO_INPUT, 5);
    expect(c.hp).toBeCloseTo(50 + SPECIES.parasaur.hp * TAME_REGEN * 5, 0);
  });

  it("queues particle bursts for hits and never saves them", () => {
    const g = newGame(SEED);
    isolate(g);
    g.player.pitch = -1.0;
    primaryAction(g); // dig
    expect(g.fx.length).toBeGreaterThan(0);
    expect(deserialize(serialize(g))!.fx).toEqual([]);
  });
});

describe("realism: weight, wear, injuries", () => {
  function settle(g: GameState) {
    for (let i = 0; i < 60; i++) step(g, NO_INPUT, 1 / 60);
  }
  const walk = (g: GameState, seconds: number) => {
    const z0 = g.player.z;
    for (let i = 0; i < seconds * 30; i++) step(g, { ...NO_INPUT, forward: true }, 1 / 30);
    return Math.abs(g.player.z - z0);
  };

  it("gives every item a real weight and a description", () => {
    for (const def of Object.values(ITEMS)) {
      expect(def.weight, def.id).toBeGreaterThanOrEqual(0);
      expect(def.desc.length, def.id).toBeGreaterThan(10);
    }
    for (const r of RECIPES) expect(r.time, r.id).toBeGreaterThan(0);
  });

  it("carrying too much slows you down", () => {
    const light = newGame(SEED);
    isolate(light);
    settle(light);
    const heavy = newGame(SEED);
    isolate(heavy);
    settle(heavy);
    addItem(heavy, "stone", 100); // 80 kg against a 60 kg capacity
    expect(carryWeight(heavy)).toBeCloseTo(80);
    expect(encumbrance(heavy).level).toBe("heavy");
    expect(walk(heavy, 2)).toBeLessThan(walk(light, 2) * 0.8);
    addItem(heavy, "stone", 50);
    expect(encumbrance(heavy).level).toBe("overloaded");
    expect(encumbrance(heavy).canSprint).toBe(false);
  });

  it("tools wear out with use, break, and can be repaired at a workbench", () => {
    const g = newGame(SEED);
    isolate(g);
    g.player.pitch = -1.0; // dig, so every swing lands
    addItem(g, "stone_shovel", 1);
    g.selected = g.hotbar.indexOf("stone_shovel");
    const max = ITEMS.stone_shovel.durability!;
    for (let i = 0; i < 10; i++) {
      g.player.cooldown = 0;
      primaryAction(g);
    }
    expect(toolDurability(g, "stone_shovel")).toBe(max - 10);
    // Repair: needs a workbench and a share of the materials.
    expect(repairTool(g, "stone_shovel").ok).toBe(false);
    // Behind you (you face +z), so swings still land on the ground ahead rather than the bench.
    g.structures.push({ id: 90, kind: "workbench", x: g.player.x, y: g.player.y, z: g.player.z - 2, rot: 0 });
    addItem(g, "wood", 2);
    addItem(g, "stone", 2);
    addItem(g, "cordage", 1);
    expect(repairTool(g, "stone_shovel").ok).toBe(true);
    expect(toolDurability(g, "stone_shovel")).toBe(max);
    // Break it.
    g.durability.stone_shovel = 1;
    g.player.cooldown = 0;
    primaryAction(g);
    expect(count(g, "stone_shovel")).toBe(0);
    expect(g.log.some((l) => l.text.includes("broke"))).toBe(true);
  });

  it("crafting takes time in a queue, pauses away from its station, and can be cancelled", () => {
    const g = newGame(SEED);
    isolate(g);
    addItem(g, "fiber", 6);
    expect(queueCraft(g, "cordage").ok).toBe(true);
    expect(queueCraft(g, "cordage").ok).toBe(true);
    expect(count(g, "fiber")).toBe(0); // materials taken up front
    step(g, NO_INPUT, 1);
    expect(count(g, "cordage")).toBe(0);
    step(g, NO_INPUT, 1);
    expect(count(g, "cordage")).toBe(1);
    cancelCraft(g, g.craftQueue[0].id);
    expect(count(g, "fiber")).toBe(3); // refunded
    expect(g.craftQueue).toHaveLength(0);

    // Station recipes only progress while you're at the station.
    addItem(g, "raw_meat", 1);
    addItem(g, "wood", 1);
    const fire = { id: 91, kind: "campfire" as const, x: g.player.x + 1, y: g.player.y, z: g.player.z, rot: 0 };
    g.structures.push(fire);
    expect(queueCraft(g, "cooked_meat").ok).toBe(true);
    g.player.x += 30;
    step(g, NO_INPUT, 5);
    expect(count(g, "cooked_meat")).toBe(0);
    expect(craftBlocker(g)).toContain("Campfire");
    g.player.x -= 30;
    step(g, NO_INPUT, 5);
    expect(count(g, "cooked_meat")).toBe(1);
  });

  it("raptor bites can make you bleed; a bandage stops light bleeding, a tourniquet heavy", () => {
    const g = newGame(SEED);
    isolate(g);
    settle(g);
    const p = g.player;
    g.creatures = [makeCreature(60, "raptor", p.x + 1, p.z)];
    g.creatures[0].state = "chase";
    g.creatures[0].target = "player";
    g.creatures[0].timer = 99;
    for (let i = 0; i < 300 && !p.bleeding && !p.dead; i++) step(g, NO_INPUT, 1 / 30);
    expect(p.bleeding).toBeGreaterThan(0);
    g.creatures = [];

    p.bleeding = 1;
    p.hp = 50;
    step(g, NO_INPUT, 2);
    expect(p.hp).toBeLessThan(50); // bleeding drains health and stops natural healing
    addItem(g, "bandage", 1);
    g.selected = g.hotbar.indexOf("bandage");
    g.player.cooldown = 0;
    primaryAction(g);
    expect(p.bleeding).toBe(0);

    p.bleeding = 2;
    addItem(g, "bandage", 1);
    g.selected = g.hotbar.indexOf("bandage");
    g.player.cooldown = 0;
    primaryAction(g);
    expect(p.bleeding).toBe(2); // a bandage can't stop arterial bleeding
    addItem(g, "tourniquet", 2);
    g.selected = g.hotbar.indexOf("tourniquet");
    g.player.cooldown = 0;
    primaryAction(g);
    expect(p.bleeding).toBe(0);
    g.player.cooldown = 0;
    expect(primaryAction(g)).toBe(false); // nothing to treat: not wasted
    expect(count(g, "tourniquet")).toBe(1);
  });

  it("a long fall breaks your leg; a splint sets it", () => {
    const g = newGame(SEED);
    isolate(g);
    settle(g);
    const p = g.player;
    p.maxHp = p.hp = 500; // survive the drop
    p.y += 9;
    p.onGround = false;
    p.peakY = p.y;
    settle(g);
    expect(p.fracture).toBe(true);
    const limping = walk(g, 1);
    addItem(g, "splint", 1);
    g.selected = g.hotbar.indexOf("splint");
    g.player.cooldown = 0;
    primaryAction(g);
    expect(p.fracture).toBe(false);
    expect(walk(g, 1)).toBeGreaterThan(limping * 1.3);
  });

  it("herbal salve heals over time", () => {
    const g = newGame(SEED);
    isolate(g);
    g.player.hp = 30;
    g.player.food = g.player.water = 10; // no natural regen
    addItem(g, "salve", 1);
    g.selected = g.hotbar.indexOf("salve");
    primaryAction(g);
    step(g, NO_INPUT, 10);
    expect(g.player.hp).toBeGreaterThan(45);
    expect(g.player.hp).toBeLessThan(55);
    step(g, NO_INPUT, 15);
    expect(g.player.hp).toBeCloseTo(70, 0);
    expect(g.player.regen).toBeNull();
  });

  it("injuries and the craft queue survive save and load", () => {
    const g = newGame(SEED);
    g.player.bleeding = 2;
    g.player.fracture = true;
    addItem(g, "fiber", 3);
    queueCraft(g, "cordage");
    g.durability.stone_pick = 40;
    const back = deserialize(serialize(g))!;
    expect(back.player.bleeding).toBe(2);
    expect(back.player.fracture).toBe(true);
    expect(back.craftQueue).toHaveLength(1);
    expect(back.durability.stone_pick).toBe(40);
  });
});

describe("gear, weather and food", () => {
  function settle(g: GameState) {
    for (let i = 0; i < 60; i++) step(g, NO_INPUT, 1 / 60);
  }
  const run = (g: GameState, seconds: number, dt = 0.5) => {
    for (let t = 0; t < seconds; t += dt) step(g, NO_INPUT, dt);
  };
  const LEATHERS = ["leather_cap", "leather_jacket", "leather_trousers", "leather_boots"] as const;
  /** The highest spot on the island, for cold-weather tests. */
  function summit() {
    let best = { x: 0, z: 0, h: -Infinity };
    for (let x = -WORLD_HALF; x <= WORLD_HALF; x += 4) {
      for (let z = -WORLD_HALF; z <= WORLD_HALF; z += 4) {
        const h = heightAt(x, z, SEED);
        if (h > best.h) best = { x, z, h };
      }
    }
    return best;
  }

  it("clothing and backpacks are crafted at the right station", () => {
    const g = newGame(SEED);
    isolate(g);
    addItem(g, "leather", 10);
    addItem(g, "cordage", 10);
    expect(canCraft(g, RECIPES.find((r) => r.output === "leather_jacket")!).ok).toBe(false);
    addItem(g, "workbench", 1);
    g.selected = g.hotbar.indexOf("workbench");
    primaryAction(g);
    expect(canCraft(g, RECIPES.find((r) => r.output === "leather_jacket")!).ok).toBe(true);
    expect(craft(g, "leather_jacket", true)).toBe(true);
    expect(count(g, "leather_jacket")).toBe(1);
    expect(g.hotbar).not.toContain("leather_jacket"); // you wear it, not hold it
  });

  it("wearing gear moves it out of the bag but it still weighs something; backpacks add capacity", () => {
    const g = newGame(SEED);
    addItem(g, "leather_jacket", 1);
    addItem(g, "leather_backpack", 1);
    const kg = carryWeight(g);
    const cap = carryCapacity(g);
    expect(wearGear(g, "leather_jacket")).toBe(true);
    expect(wearGear(g, "leather_backpack")).toBe(true);
    expect(count(g, "leather_jacket")).toBe(0);
    expect(g.equipment).toEqual({ body: "leather_jacket", back: "leather_backpack" });
    expect(carryWeight(g)).toBeCloseTo(kg);
    expect(carryCapacity(g)).toBe(cap + 35);
    // a second backpack swaps in and the first goes back in the bag
    addItem(g, "fiber_pack", 1);
    wearGear(g, "fiber_pack");
    expect(g.equipment.back).toBe("fiber_pack");
    expect(count(g, "leather_backpack")).toBe(1);
    expect(removeGear(g, "body")).toBe(true);
    expect(count(g, "leather_jacket")).toBe(1);
    expect(wearGear(g, "wood")).toBe(false);
  });

  it("armor takes the edge off bites", () => {
    const bite = (armored: boolean) => {
      const g = newGame(SEED);
      isolate(g);
      settle(g);
      if (armored) for (const id of LEATHERS) { addItem(g, id, 1); wearGear(g, id); }
      const p = g.player;
      g.creatures = [makeCreature(60, "raptor", p.x + 1, p.z)];
      Object.assign(g.creatures[0], { state: "chase", target: "player", timer: 99 });
      for (let i = 0; i < 300; i++) {
        const before = p.hp;
        step(g, NO_INPUT, 1 / 30);
        if (before - p.hp > 3) return before - p.hp;
      }
      return 0;
    };
    const bare = bite(false);
    const armored = bite(true);
    expect(bare).toBeCloseTo(SPECIES.raptor.damage, 0);
    expect(armored).toBeGreaterThan(0);
    expect(armored).toBeLessThan(bare * 0.8);
  });

  it("nights are colder than noon, fires warm you, and the mountains are cold", () => {
    const g = newGame(SEED);
    isolate(g);
    settle(g);
    g.time = DAY_LENGTH * 0.5;
    const noon = ambientTemperature(g);
    g.time = DAY_LENGTH;
    const midnight = ambientTemperature(g);
    expect(noon - midnight).toBeGreaterThan(10);
    expect(thermalBand(midnight)).toBe("cold");
    g.structures.push({ id: 900, kind: "campfire", x: g.player.x + 1, z: g.player.z, y: g.player.y, rot: 0 });
    expect(ambientTemperature(g)).toBeGreaterThan(midnight + 8);
    g.time = DAY_LENGTH * 0.5;
    expect(thermalBand(ambientTemperature(g))).toBe("comfortable"); // a fire at noon won't cook you
    g.structures = [];
    g.player.y += 30;
    expect(ambientTemperature(g)).toBeLessThan(noon - 12);
  });

  it("freezing on a mountain at night hurts, and warm clothes fix it", () => {
    const top = summit();
    expect(top.h).toBeGreaterThan(24);
    const g = newGame(SEED);
    isolate(g);
    Object.assign(g.player, { x: top.x, z: top.z, y: top.h });
    g.time = DAY_LENGTH * 2; // midnight
    settle(g);
    const hp = (g.player.hp = 80);
    run(g, 10);
    expect(thermalBand(g.player.feels!)).toBe("freezing");
    expect(g.player.hp).toBeLessThan(hp - 3);
    const cold = feelsLike(g);
    for (const id of LEATHERS) { addItem(g, id, 1); wearGear(g, id); }
    expect(feelsLike(g)).toBeGreaterThan(cold + 8);
  });

  it("swimming soaks you, which chills you until you dry off", () => {
    const g = newGame(SEED);
    isolate(g);
    settle(g);
    const dry = feelsLike(g);
    Object.assign(g.player, { x: WORLD_HALF * 0.95, z: 0, y: WATER_LEVEL });
    step(g, NO_INPUT, 1 / 30);
    expect(g.player.swimming).toBe(true);
    expect(g.player.wet).toBeGreaterThan(59); // soaked: about a minute to dry
    const spot = newGame(SEED);
    isolate(spot);
    settle(spot);
    spot.player.wet = 30;
    expect(feelsLike(spot)).toBeCloseTo(dry - 6, 0);
    run(spot, 31);
    expect(spot.player.wet).toBe(0);
  });

  it("raw meat spoils, jerky keeps, and boxed food stays fresh", () => {
    const g = newGame(SEED);
    isolate(g);
    g.time = DAY_LENGTH * 0.22; // all daylight, so no hunting pack interrupts lunch
    settle(g);
    addItem(g, "raw_meat", 2);
    addItem(g, "jerky", 3);
    const box = { id: 990, kind: "storage" as const, x: g.player.x + 3, z: g.player.z, y: g.player.y, rot: 0, items: { raw_meat: 1 } };
    g.structures.push(box);
    run(g, 200);
    expect(g.spoil.raw_meat).toBeLessThan(ITEMS.raw_meat.spoilSeconds!);
    run(g, 170);
    expect(count(g, "raw_meat")).toBe(1);
    expect(count(g, "spoiled_meat")).toBe(1);
    expect(count(g, "jerky")).toBe(3);
    expect(box.items).toEqual({ raw_meat: 1 });
    g.player.food = 50;
    const hp = g.player.hp;
    consume(g, "spoiled_meat");
    expect(g.player.hp).toBeLessThan(hp);
    expect(g.log.at(-1)?.text).toMatch(/gone off/);
  });

  it("jerky is smoked from cooked meat at a campfire", () => {
    const g = newGame(SEED);
    isolate(g);
    addItem(g, "cooked_meat", 2);
    addItem(g, "wood", 2);
    expect(canCraft(g, RECIPES.find((r) => r.output === "jerky")!).ok).toBe(false);
    g.structures.push({ id: 901, kind: "campfire", x: g.player.x + 1, z: g.player.z, y: g.player.y, rot: 0 });
    expect(craft(g, "jerky", true)).toBe(true);
    expect(count(g, "jerky")).toBe(2);
  });

  it("drops items into a bag at your feet that you can pick back up", () => {
    const g = newGame(SEED);
    isolate(g);
    settle(g);
    addItem(g, "stone", 10);
    addItem(g, "stone_hatchet", 1);
    expect(dropItem(g, "stone", 4)).toBe(true);
    expect(dropItem(g, "stone_hatchet")).toBe(true);
    expect(dropItem(g, "flint")).toBe(false);
    const bags = g.structures.filter((s) => s.kind === "lootbag");
    expect(bags).toHaveLength(1); // drops nearby pile into the same bag
    expect(bags[0].items).toEqual({ stone: 4, stone_hatchet: 1 });
    expect(count(g, "stone")).toBe(6);
    expect(g.hotbar).not.toContain("stone_hatchet");
    collectLoot(g, bags[0]);
    expect(count(g, "stone")).toBe(10);
    expect(g.hotbar).toContain("stone_hatchet");
  });

  it("what you're wearing goes in your death bag too, and gear survives save and load", () => {
    const g = newGame(SEED);
    isolate(g);
    settle(g);
    addItem(g, "leather_jacket", 1);
    wearGear(g, "leather_jacket");
    addItem(g, "raw_meat", 1);
    run(g, 10);
    const back = deserialize(serialize(g))!;
    expect(back.equipment).toEqual({ body: "leather_jacket" });
    expect(back.spoil.raw_meat).toBeCloseTo(g.spoil.raw_meat!, 3);
    expect(armorValue(back)).toBeCloseTo(0.12);

    g.player.hp = 1;
    g.player.food = 0;
    step(g, NO_INPUT, 1);
    expect(g.player.dead).toBe(true);
    expect(g.equipment).toEqual({});
    expect(g.structures.find((s) => s.kind === "lootbag")!.items).toEqual({ raw_meat: 1, leather_jacket: 1 });
  });

  it("old saves without gear or spoilage still load", () => {
    const g = newGame(SEED);
    const data = JSON.parse(serialize(g));
    delete data.equipment;
    delete data.spoil;
    const back = deserialize(JSON.stringify(data))!;
    expect(back.equipment).toEqual({});
    expect(back.spoil).toEqual({});
  });
});

describe("night hunters and tame levels", () => {
  function settle(g: GameState) {
    for (let i = 0; i < 60; i++) step(g, NO_INPUT, 1 / 60);
  }
  const at = (g: GameState, dayFraction: number) => {
    g.time = DAY_LENGTH * dayFraction;
    step(g, NO_INPUT, 1 / 30);
  };
  /** A night hunter already on your trail, and no other pack due tonight. */
  function stalked(withFire: boolean) {
    const g = newGame(SEED);
    isolate(g);
    settle(g);
    g.time = DAY_LENGTH * 0.85;
    g.lastHunt = huntNight(g);
    const p = g.player;
    if (withFire) g.structures.push({ id: 950, kind: "campfire", x: p.x, z: p.z, y: p.y, rot: 0 });
    const c = makeCreature(951, "raptor", p.x + 12, p.z);
    Object.assign(c, { hunter: true, state: "chase", target: "player", timer: 99 });
    g.creatures = [c];
    return { g, c, fire: { x: p.x, z: p.z } };
  }

  it("from the second night a pack comes once each night, out of sight, and runs off at dawn", () => {
    const g = newGame(SEED);
    isolate(g);
    settle(g);
    expect(g.creatures).toHaveLength(0); // nothing hunts by day
    at(g, 0.8);
    expect(g.creatures).toHaveLength(0); // the first night is a warning
    expect(g.log.at(-1)?.text).toMatch(/campfire/);
    at(g, 1.8);
    const pack = g.creatures.filter((c) => c.hunter);
    expect(pack).toHaveLength(2);
    for (const c of pack) {
      expect(c.species).toBe("raptor");
      expect(Math.hypot(c.x - g.player.x, c.z - g.player.z)).toBeGreaterThan(40);
    }
    at(g, 2.1); // the small hours are the same night
    expect(g.creatures.filter((c) => c.hunter)).toHaveLength(2);
    // at dawn, one that's close runs for it, then it's gone
    Object.assign(pack[0], { x: g.player.x + 8, z: g.player.z });
    at(g, 2.23);
    expect(pack[0].state).toBe("flee");
    expect(g.creatures).toContain(pack[0]);
    expect(g.creatures).not.toContain(pack[1]); // far away: already gone
    at(g, 2.35);
    expect(g.creatures.filter((c) => c.hunter)).toHaveLength(0);
    at(g, 2.8);
    expect(g.creatures.filter((c) => c.hunter)).toHaveLength(2);
  });

  it("stalks you in the dark and bites", () => {
    const { g } = stalked(false);
    const hp = g.player.hp;
    for (let i = 0; i < 300; i++) step(g, NO_INPUT, 1 / 30);
    expect(g.player.hp).toBeLessThan(hp - 5);
  });

  it("won't step into firelight, so a campfire keeps you safe", () => {
    const { g, c, fire } = stalked(true);
    expect(isLit(g, fire.x, fire.z)).toBe(true);
    const hp = g.player.hp;
    let closest = Infinity;
    for (let i = 0; i < 600; i++) {
      step(g, NO_INPUT, 1 / 30);
      closest = Math.min(closest, Math.hypot(c.x - fire.x, c.z - fire.z));
    }
    expect(closest).toBeGreaterThan(6.5);
    expect(closest).toBeLessThan(9); // it waits at the edge of the light
    expect(g.player.hp).toBeGreaterThanOrEqual(hp);
  });

  it("bolts if the light finds it", () => {
    const { g, c, fire } = stalked(true);
    Object.assign(c, { x: fire.x + 3, z: fire.z });
    for (let i = 0; i < 30; i++) step(g, NO_INPUT, 1 / 30);
    expect(Math.hypot(c.x - fire.x, c.z - fire.z)).toBeGreaterThan(6);
  });

  it("tames level up by fighting: more health, harder hits", () => {
    const c = makeCreature(960, "raptor", 0, 0);
    expect(gainTameXp(c, 999)).toBe(0); // wild animals don't level
    c.tamed = true;
    c.hp = 100;
    expect(creatureLevel(c)).toBe(1);
    expect(gainTameXp(c, tameXpForLevel(1) + 5)).toBe(1);
    expect(creatureLevel(c)).toBe(2);
    expect(c.xp).toBe(5);
    expect(creatureMaxHp(c)).toBe(Math.round(SPECIES.raptor.hp * 1.1));
    expect(creatureDamage(c)).toBeCloseTo(SPECIES.raptor.damage * 1.08);
    expect(c.hp).toBe(100 + creatureMaxHp(c) - SPECIES.raptor.hp); // the new health comes topped up

    const g = newGame(SEED);
    isolate(g);
    settle(g);
    const p = g.player;
    const tame = makeCreature(961, "raptor", p.x + 2, p.z);
    Object.assign(tame, { tamed: true, name: "Rex", state: "follow" });
    const compy = makeCreature(962, "compy", p.x - 6, p.z);
    Object.assign(compy, { state: "chase", target: "player", timer: 99 });
    g.creatures = [tame, compy];
    for (let i = 0; i < 300 && compy.state !== "dead"; i++) step(g, NO_INPUT, 1 / 30);
    expect(compy.state).toBe("dead");
    expect(tame.xp).toBeGreaterThan(SPECIES.compy.xp);
  });

  it("feeding a hurt tame the food it eats heals it", () => {
    const g = newGame(SEED);
    isolate(g);
    settle(g);
    const p = g.player;
    const c = makeCreature(970, "parasaur", p.x, p.z + 3);
    Object.assign(c, { tamed: true, name: "Para", state: "stay", hp: 50 });
    g.creatures = [c];
    addItem(g, "berries", 3);
    addItem(g, "raw_meat", 1);
    g.selected = g.hotbar.indexOf("raw_meat");
    expect(interact(g)).toMatch(/follow/); // it doesn't eat meat
    c.state = "stay";
    g.selected = g.hotbar.indexOf("berries");
    expect(interact(g)).toMatch(/Fed Para/);
    expect(c.hp).toBeCloseTo(50 + SPECIES.parasaur.hp * TAME_FEED_HEAL);
    expect(count(g, "berries")).toBe(2);
    c.hp = creatureMaxHp(c);
    expect(interact(g)).toMatch(/follow/); // not hungry: E goes back to follow/stay
    expect(count(g, "berries")).toBe(2);
  });

  it("tame levels and the night's hunt survive save and load", () => {
    const g = newGame(SEED);
    const c = makeCreature(980, "raptor", 0, 0);
    Object.assign(c, { tamed: true, level: 4, xp: 12 });
    g.creatures = [c];
    g.lastHunt = 3;
    const back = deserialize(serialize(g))!;
    expect(back.creatures[0]).toMatchObject({ level: 4, xp: 12 });
    expect(back.lastHunt).toBe(3);
  });
});

describe("sound events", () => {
  it("queues sounds for actions and never saves them", () => {
    const g = newGame(SEED);
    isolate(g);
    primaryAction(g); // swing at nothing
    expect(g.sfx).toContain("swing");
    const back = deserialize(serialize(g))!;
    expect(back.sfx).toEqual([]);
    expect(JSON.parse(serialize(g)).sfx).toBeUndefined();
  });
});

describe("taming", () => {
  it("knocks a creature out with torpor, then tames it by feeding", () => {
    const c = makeCreature(1, "dodo", 0, 0);
    while (c.state !== "unconscious") damageCreature(c, 0, 10, 0, "player");
    let tamed = false;
    for (let i = 0; i < 10 && !tamed; i++) tamed = feedCreature(c, (id) => id === "berries")!.tamed;
    expect(tamed).toBe(true);
    expect(c.state).toBe("follow");
  });

  it("refuses food the species doesn't eat", () => {
    const c = makeCreature(1, "raptor", 0, 0);
    c.state = "unconscious";
    expect(feedCreature(c, (id) => id === "berries")).toBeNull();
  });

  it("full flow in-game: club, feed, ride", () => {
    const g = newGame(SEED);
    isolate(g);
    const p = g.player;
    const para = makeCreature(99, "parasaur", p.x, p.z + 2);
    g.creatures = [para];
    addItem(g, "club", 1);
    addItem(g, "berries", 20);
    g.selected = g.hotbar.indexOf("club");
    for (let i = 0; i < 50 && para.state !== "unconscious"; i++) {
      g.player.cooldown = 0;
      primaryAction(g);
    }
    expect(para.state).toBe("unconscious");
    for (let i = 0; i < 20 && !para.tamed; i++) interact(g);
    expect(para.tamed).toBe(true);
    expect(toggleMount(g)).toBe(true);
    expect(g.player.mountId).toBe(99);
    const z0 = g.player.z;
    for (let i = 0; i < 30; i++) step(g, { ...NO_INPUT, forward: true }, 0.05);
    // Ridden parasaurs are much faster than walking (5 m/s).
    expect(Math.abs(g.player.z - z0)).toBeGreaterThan(5 * 1.5 * 0.9);
    expect(para.z).toBeCloseTo(g.player.z);
  });

  it("wakes up if left too long and forgets the tame", () => {
    const c = makeCreature(1, "dodo", 0, 0);
    c.state = "unconscious";
    c.torpor = 1;
    c.tameProgress = 0.5;
    const g = newGame(SEED);
    g.creatures = [c];
    step(g, NO_INPUT, 2);
    expect(c.state).not.toBe("unconscious");
    expect(c.tameProgress).toBe(0);
  });
});

describe("survival", () => {
  it("drains food and water and hurts you when they run out", () => {
    const g = newGame(SEED);
    g.creatures = [];
    g.player.food = 0.01;
    g.player.water = 50;
    const hp = g.player.hp;
    step(g, NO_INPUT, 1);
    expect(g.player.food).toBe(0);
    expect(g.player.water).toBeLessThan(50);
    expect(g.player.hp).toBeLessThan(hp);
  });

  it("aggressive creatures hunt and can kill you; respawn keeps level but not items", () => {
    const g = newGame(SEED);
    isolate(g);
    const p = g.player;
    g.creatures = [makeCreature(5, "raptor", p.x + 1, p.z)];
    addItem(g, "wood", 5);
    p.level = 3;
    for (let i = 0; i < 400 && !p.dead; i++) step(g, NO_INPUT, 0.1);
    expect(p.dead).toBe(true);
    respawn(g);
    expect(g.player.dead).toBe(false);
    expect(g.player.level).toBe(3);
    expect(count(g, "wood")).toBe(0);
  });

  it("keeps the player on the ground while walking", () => {
    const g = newGame(SEED);
    isolate(g);
    for (let i = 0; i < 60; i++) step(g, { ...NO_INPUT, forward: true }, 1 / 60);
    const p = g.player;
    expect(p.y).toBeGreaterThanOrEqual(groundAt(g, p.x, p.z) - 1.5);
  });
});

describe("save / load", () => {
  it("round-trips the game, regenerating untouched nodes from the seed", () => {
    const g = newGame(SEED);
    addItem(g, "stone", 7);
    g.nodes[3].respawnAt = 999;
    g.nodes[3].hp = 0;
    const json = serialize(g);
    expect(json.length).toBeLessThan(JSON.stringify(g).length);
    const back = deserialize(json)!;
    expect(back.inventory.stone).toBe(7);
    expect(back.nodes).toHaveLength(g.nodes.length);
    expect(back.nodes[3].respawnAt).toBe(999);
    expect(back.creatures).toEqual(g.creatures);
  });

  it("rejects junk", () => {
    expect(deserialize("not json")).toBeNull();
    expect(deserialize("{}")).toBeNull();
  });
});
