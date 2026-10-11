import { describe, it, expect } from "vitest";
import {
  newGame, step, craft, addItem, count, primaryAction, interact, toggleMount, respawn, lookTarget,
  serialize, deserialize, placementFor, groundAt, NO_INPUT, type GameState,
} from "@/survival/engine/game";
import { SPECIES, makeCreature, damageCreature, feedCreature } from "@/survival/engine/creatures";
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

  it("generates all three resource kinds above water", () => {
    const nodes = generateNodes(SEED);
    expect(new Set(nodes.map((n) => n.kind))).toEqual(new Set(["tree", "rock", "bush"]));
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

  it("crafts a pick, spends materials, and puts it on the hotbar", () => {
    const g = newGame(SEED);
    addItem(g, "wood", 2);
    addItem(g, "thatch", 10);
    addItem(g, "stone", 1);
    expect(craft(g, "stone_pick")).toBe(true);
    expect(count(g, "stone_pick")).toBe(1);
    expect(count(g, "thatch")).toBe(0);
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
