// Primal Isle game state and simulation. Pure TypeScript: no React, no three.js, so it can be tested
// headless. The scene reads this state every frame; the HUD samples it a few times a second.
import {
  SPECIES, makeCreature, updateCreature, damageCreature, feedCreature, sedateCreature, isDown,
  type Creature, type SpeciesId,
} from "./creatures";
import { HAND, ITEMS, RECIPES, isEquippable, type Cost, type ItemId, type Recipe, type ToolStats } from "./items";
import { mulberry32 } from "./noise";
import {
  generateNodes, heightAt, randomLandPoint, spawnPoint,
  NODE_RADIUS, NODE_RESPAWN_SECONDS, WATER_LEVEL, WORLD_HALF, type ResourceNode,
} from "./world";

export const DAY_LENGTH = 720; // seconds per full day/night cycle
export const HOTBAR_SIZE = 8;
export const GRID = 4; // building grid, metres
export const EYE_HEIGHT = 1.7;

const GRAVITY = 22;
const JUMP_SPEED = 7.5;
const WALK_SPEED = 5;
const SPRINT_SPEED = 8.5;
const SWIM_SPEED = 3;
const FOOD_DRAIN = 0.07;
const WATER_DRAIN = 0.11;

export type StructureKind = "campfire" | "foundation" | "wall" | "bed" | "storage";

export type Sfx =
  | "swing" | "hit" | "harvest" | "kill" | "hurt" | "eat" | "drink" | "craft" | "place" | "tame" | "level" | "death";

export interface Structure {
  id: number;
  kind: StructureKind;
  x: number;
  y: number;
  z: number;
  rot: number;
  /** Storage boxes only. */
  items?: Partial<Record<ItemId, number>>;
}

export interface Player {
  x: number;
  y: number;
  z: number;
  vy: number;
  yaw: number;
  pitch: number;
  hp: number;
  maxHp: number;
  stamina: number;
  maxStamina: number;
  food: number;
  water: number;
  xp: number;
  level: number;
  dead: boolean;
  onGround: boolean;
  swimming: boolean;
  mountId: number | null;
  cooldown: number;
  hurtFlash: number;
}

export interface LogEntry {
  id: number;
  text: string;
  at: number;
}

export interface GameState {
  version: 1;
  seed: number;
  time: number;
  day: number;
  player: Player;
  inventory: Partial<Record<ItemId, number>>;
  hotbar: (ItemId | null)[];
  selected: number;
  nodes: ResourceNode[];
  creatures: Creature[];
  structures: Structure[];
  log: LogEntry[];
  nextId: number;
  /** Bumped whenever nodes appear/disappear so the scene can rebuild instance buffers. */
  nodeVersion: number;
  structureVersion: number;
  stats: { tamed: number; kills: number; crafted: number };
  /** Sounds to play this frame; the page drains it. Not saved. */
  sfx: Sfx[];
}

export interface Input {
  forward: boolean;
  back: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
  sprint: boolean;
}

export const NO_INPUT: Input = { forward: false, back: false, left: false, right: false, jump: false, sprint: false };

// ---------------------------------------------------------------- setup

export function newGame(seed = Math.floor(Math.random() * 1e9)): GameState {
  const spawn = spawnPoint(seed);
  const state: GameState = {
    version: 1,
    seed,
    time: DAY_LENGTH * 0.3, // mid-morning
    day: 1,
    player: freshPlayer(spawn.x, spawn.z, seed),
    inventory: {},
    hotbar: Array(HOTBAR_SIZE).fill(null),
    selected: 0,
    nodes: generateNodes(seed),
    creatures: [],
    structures: [],
    log: [],
    nextId: 1,
    nodeVersion: 0,
    structureVersion: 0,
    stats: { tamed: 0, kills: 0, crafted: 0 },
    sfx: [],
  };
  const rng = mulberry32(seed ^ 0xc0ffee);
  for (const sp of Object.values(SPECIES)) {
    for (let i = 0; i < sp.population; i++) spawnCreature(state, sp.id, rng);
  }
  log(state, "You wake on a beach with nothing. Punch a tree to start gathering.");
  return state;
}

function freshPlayer(x: number, z: number, seed: number): Player {
  return {
    x, z, y: heightAt(x, z, seed) + 0.5, vy: 0, yaw: Math.atan2(-x, -z), pitch: 0,
    hp: 100, maxHp: 100, stamina: 100, maxStamina: 100, food: 80, water: 80,
    xp: 0, level: 1, dead: false, onGround: false, swimming: false, mountId: null, cooldown: 0, hurtFlash: 0,
  };
}

function spawnCreature(state: GameState, species: SpeciesId, rng: () => number) {
  const avoid = { x: state.player.x, z: state.player.z, radius: 45 };
  const maxH = species === "dodo" ? 10 : 18;
  const p = randomLandPoint(state.seed, rng, avoid, 1.5, maxH);
  state.creatures.push(makeCreature(state.nextId++, species, p.x, p.z, rng() * Math.PI * 2));
}

export function sfx(state: GameState, name: Sfx) {
  if (state.sfx.length < 8) state.sfx.push(name);
}

export function log(state: GameState, text: string) {
  state.log.push({ id: state.nextId++, text, at: state.time });
  if (state.log.length > 6) state.log.shift();
}

// ---------------------------------------------------------------- inventory

export const count = (state: GameState, id: ItemId) => state.inventory[id] ?? 0;

export function addItem(state: GameState, id: ItemId, n: number) {
  if (n <= 0) return;
  state.inventory[id] = count(state, id) + n;
  if (isEquippable(id) && !state.hotbar.includes(id)) {
    const slot = state.hotbar.indexOf(null);
    if (slot >= 0) state.hotbar[slot] = id;
  }
}

export function hasCost(state: GameState, cost: Cost) {
  return (Object.entries(cost) as [ItemId, number][]).every(([id, n]) => count(state, id) >= n);
}

export function removeItem(state: GameState, id: ItemId, n = 1): boolean {
  if (count(state, id) < n) return false;
  const left = count(state, id) - n;
  if (left > 0) state.inventory[id] = left;
  else {
    delete state.inventory[id];
    const slot = state.hotbar.indexOf(id);
    if (slot >= 0) state.hotbar[slot] = null;
  }
  return true;
}

function spend(state: GameState, cost: Cost) {
  for (const [id, n] of Object.entries(cost) as [ItemId, number][]) removeItem(state, id, n);
}

export function equipped(state: GameState): ItemId | null {
  return state.hotbar[state.selected] ?? null;
}

export function toolStats(state: GameState): ToolStats {
  const id = equipped(state);
  return (id && ITEMS[id].tool) || HAND;
}

// ---------------------------------------------------------------- crafting

export function nearCampfire(state: GameState, range = 4) {
  const p = state.player;
  return state.structures.some((s) => s.kind === "campfire" && Math.hypot(s.x - p.x, s.z - p.z) < range);
}

export function canCraft(state: GameState, recipe: Recipe): { ok: boolean; reason?: string } {
  if ((recipe.level ?? 1) > state.player.level) return { ok: false, reason: `Needs level ${recipe.level}` };
  if (recipe.needsCampfire && !nearCampfire(state)) return { ok: false, reason: "Stand near a campfire" };
  if (!hasCost(state, recipe.cost)) return { ok: false, reason: "Missing materials" };
  return { ok: true };
}

export function craft(state: GameState, recipeId: string, quiet = false): boolean {
  const recipe = RECIPES.find((r) => r.id === recipeId);
  if (!recipe || !canCraft(state, recipe).ok) return false;
  spend(state, recipe.cost);
  addItem(state, recipe.output, recipe.count);
  state.stats.crafted++;
  gainXp(state, 4);
  if (!quiet) {
    log(state, `Crafted ${ITEMS[recipe.output].name}`);
    sfx(state, "craft");
  }
  return true;
}

// ---------------------------------------------------------------- progression

export const xpForLevel = (level: number) => level * 60;

export function gainXp(state: GameState, xp: number) {
  const p = state.player;
  p.xp += xp;
  while (p.xp >= xpForLevel(p.level)) {
    p.xp -= xpForLevel(p.level);
    p.level++;
    p.maxHp += 10;
    p.maxStamina += 10;
    p.hp = p.maxHp;
    log(state, `Level ${p.level}! Health and stamina increased.`);
    sfx(state, "level");
  }
}

// ---------------------------------------------------------------- targeting

export type Target =
  | { kind: "creature"; creature: Creature; dist: number }
  | { kind: "node"; node: ResourceNode; dist: number }
  | { kind: "structure"; structure: Structure; dist: number };

/** What the crosshair is on: the nearest thing inside a narrow cone in front of the player. */
export function lookTarget(state: GameState, reach: number): Target | null {
  const p = state.player;
  const fx = Math.sin(p.yaw);
  const fz = Math.cos(p.yaw);
  let best: Target | null = null;
  const consider = (x: number, z: number, radius: number, make: (dist: number) => Target) => {
    const dx = x - p.x;
    const dz = z - p.z;
    const dist = Math.hypot(dx, dz);
    if (dist - radius > reach) return;
    const along = dx * fx + dz * fz;
    if (along < -radius) return;
    const side = Math.abs(dx * fz - dz * fx);
    if (side > radius + 0.6) return;
    if (!best || dist < best.dist) best = make(dist);
  };
  for (const c of state.creatures) {
    if (c.id === p.mountId) continue;
    if (c.state === "dead" && c.harvestLeft <= 0) continue;
    const r = SPECIES[c.species].size * 0.9;
    consider(c.x, c.z, r, (dist) => ({ kind: "creature", creature: c, dist }));
  }
  for (const n of state.nodes) {
    if (n.respawnAt) continue;
    consider(n.x, n.z, NODE_RADIUS[n.kind], (dist) => ({ kind: "node", node: n, dist }));
  }
  for (const s of state.structures) {
    if (s.kind === "foundation") continue;
    consider(s.x, s.z, s.kind === "wall" ? 1.2 : s.kind === "campfire" ? 0.8 : 1, (dist) => ({ kind: "structure", structure: s, dist }));
  }
  return best;
}

// ---------------------------------------------------------------- actions

/** Left click with whatever is in the selected hotbar slot. */
export function primaryAction(state: GameState): boolean {
  const p = state.player;
  if (p.dead || p.cooldown > 0) return false;
  const id = equipped(state);
  if (id && ITEMS[id].kind === "consumable") return consume(state, id);
  if (id && ITEMS[id].kind === "structure") return place(state, id as StructureKind);
  return swing(state);
}

function swing(state: GameState): boolean {
  const p = state.player;
  const tool = toolStats(state);
  p.cooldown = tool.cooldown;
  const target = lookTarget(state, tool.reach + (p.mountId ? 1.5 : 0));
  if (!target) {
    sfx(state, "swing");
    return false;
  }

  if (target.kind === "node") return harvestNode(state, target.node, tool);

  if (target.kind === "creature") {
    const c = target.creature;
    if (c.state === "dead") return carve(state, c, tool);
    if (c.tamed) return false;
    const mount = p.mountId ? state.creatures.find((m) => m.id === p.mountId) : undefined;
    const damage = mount ? SPECIES[mount.species].damage + tool.damage * 0.5 : tool.damage;
    const killed = damageCreature(c, damage, tool.torpor, state.time, "player");
    sfx(state, killed ? "kill" : "hit");
    if (killed) onKilled(state, c);
    else if (c.state === "unconscious") log(state, `${SPECIES[c.species].name} is knocked out. Feed it (E) to tame.`);
    return true;
  }

  if (target.kind === "structure") {
    const s = target.structure;
    state.structures = state.structures.filter((o) => o.id !== s.id);
    state.structureVersion++;
    addItem(state, s.kind, 1);
    // A picked-up box empties into your pockets rather than destroying what's inside.
    for (const [id, n] of Object.entries(s.items ?? {}) as [ItemId, number][]) addItem(state, id, n);
    log(state, `Picked up ${ITEMS[s.kind].name}`);
    sfx(state, "place");
    return true;
  }
  return false;
}

function onKilled(state: GameState, c: Creature) {
  const sp = SPECIES[c.species];
  state.stats.kills++;
  gainXp(state, sp.xp);
  log(state, `Killed a ${sp.name}. Hit the body to harvest meat and hide.`);
}

function harvestNode(state: GameState, node: ResourceNode, tool: ToolStats): boolean {
  const mult = tool.harvest[node.kind] ?? 0;
  if (mult <= 0) {
    log(state, "That tool can't harvest this.");
    return false;
  }
  const rng = mulberry32((state.nextId * 2654435761) ^ node.id);
  const handed = tool === HAND;
  if (node.kind === "tree") {
    addItem(state, "wood", Math.round((handed ? 1 : 2) * mult));
    addItem(state, "thatch", Math.round((handed ? 2 : 1) * (handed ? 1 : 0.6) + rng()));
  } else if (node.kind === "rock") {
    addItem(state, "stone", Math.round((handed ? 1 : 1.5) * mult));
    addItem(state, "flint", Math.round((handed ? 0.4 : 0.8) * mult * rng() + (handed ? 0 : 0.3)));
  } else {
    addItem(state, "berries", Math.round(1 + rng() * 2 * mult));
    addItem(state, "fiber", Math.round(1 + rng() * mult));
    if (rng() < 0.35) addItem(state, "narcoberry", 1);
  }
  state.nextId++;
  sfx(state, "harvest");
  node.hp -= 10 * mult;
  gainXp(state, 0.5);
  if (node.hp <= 0) {
    node.respawnAt = state.time + NODE_RESPAWN_SECONDS;
    state.nodeVersion++;
  }
  return true;
}

function carve(state: GameState, c: Creature, tool: ToolStats): boolean {
  const mult = tool.harvest.corpse ?? 0.5;
  const sp = SPECIES[c.species];
  const n = Math.max(1, Math.round(2 * mult));
  for (let i = 0; i < n && c.harvestLeft > 0; i++, c.harvestLeft--) {
    const meatShare = sp.drops.raw_meat / (sp.drops.raw_meat + sp.drops.hide);
    addItem(state, (c.harvestLeft + c.id) % 10 < meatShare * 10 ? "raw_meat" : "hide", 1);
  }
  sfx(state, "harvest");
  return true;
}

function consume(state: GameState, id: ItemId): boolean {
  const p = state.player;
  const r = ITEMS[id].restores;
  if (!r || !removeItem(state, id)) return false;
  p.cooldown = 0.4;
  p.hp = clamp(p.hp + (r.hp ?? 0), 0, p.maxHp);
  p.food = clamp(p.food + (r.food ?? 0), 0, 100);
  p.water = clamp(p.water + (r.water ?? 0), 0, 100);
  p.stamina = clamp(p.stamina + (r.stamina ?? 0), 0, p.maxStamina);
  if ((r.hp ?? 0) < 0) log(state, "Raw meat makes you feel sick. Cook it at a campfire.");
  sfx(state, "eat");
  return true;
}

/** Where a structure would go: snapped to the building grid, walls on the cell edge you face. */
export function placementFor(state: GameState, kind: StructureKind): Structure {
  const p = state.player;
  const free = kind === "campfire" || kind === "bed" || kind === "storage";
  const ahead = free ? 2.5 : GRID * 0.9;
  const tx = p.x + Math.sin(p.yaw) * ahead;
  const tz = p.z + Math.cos(p.yaw) * ahead;
  const rot = Math.round(p.yaw / (Math.PI / 2)) * (Math.PI / 2);
  if (free) {
    return { id: 0, kind, x: tx, z: tz, y: groundAt(state, tx, tz), rot };
  }
  if (kind === "foundation") {
    const x = Math.round(tx / GRID) * GRID;
    const z = Math.round(tz / GRID) * GRID;
    return { id: 0, kind, x, z, y: Math.max(heightAt(x, z, state.seed), WATER_LEVEL) + 0.15, rot: 0 };
  }
  // Wall: the edge of the cell in front of the player, facing them.
  const cx = Math.round((p.x + Math.sin(p.yaw) * GRID * 0.5) / GRID) * GRID;
  const cz = Math.round((p.z + Math.cos(p.yaw) * GRID * 0.5) / GRID) * GRID;
  const x = cx + Math.round(Math.sin(rot)) * GRID * 0.5;
  const z = cz + Math.round(Math.cos(rot)) * GRID * 0.5;
  return { id: 0, kind, x, z, y: groundAt(state, cx, cz), rot };
}

function place(state: GameState, kind: StructureKind): boolean {
  const s = placementFor(state, kind);
  const clash = state.structures.some(
    (o) => o.kind === kind && Math.abs(o.x - s.x) < 0.5 && Math.abs(o.z - s.z) < 0.5 && Math.abs(o.rot - s.rot) < 0.1,
  );
  if (clash) return false;
  if (heightAt(s.x, s.z, state.seed) < WATER_LEVEL - 1 && kind !== "foundation") return false;
  if (!removeItem(state, kind)) return false;
  state.structures.push({ ...s, id: state.nextId++, ...(kind === "storage" ? { items: {} } : {}) });
  state.structureVersion++;
  state.player.cooldown = 0.3;
  gainXp(state, 2);
  sfx(state, "place");
  if (kind === "bed") log(state, "Sleeping bag placed. You'll respawn here.");
  return true;
}

/** E: feed / sedate a knocked-out creature, toggle a tame, cook, or drink. */
export function interact(state: GameState): string | null {
  const p = state.player;
  if (p.dead) return null;
  const target = lookTarget(state, 3.5);
  if (target?.kind === "creature") {
    const c = target.creature;
    const sp = SPECIES[c.species];
    if (c.state === "unconscious" && !c.tamed) {
      const fed = feedCreature(c, (id) => count(state, id) > 0);
      if (fed) {
        removeItem(state, fed.food);
        if (fed.tamed) {
          state.stats.tamed++;
          c.name = `${sp.name} #${state.stats.tamed}`;
          gainXp(state, sp.xp * 1.5);
          const msg = `Tamed ${c.name}!${sp.rideSpeed ? " Press R to ride." : ""}`;
          log(state, msg);
          sfx(state, "tame");
          return msg;
        }
        sfx(state, "eat");
        return `Fed ${sp.name} (${Math.round(c.tameProgress * 100)}%)`;
      }
      if (removeItem(state, "narcoberry")) {
        sedateCreature(c);
        return `Sedated ${sp.name}`;
      }
      const msg = `${sp.name} eats ${Object.keys(sp.tameFoods).map((f) => ITEMS[f as ItemId].name).join(" / ")}`;
      log(state, msg);
      return msg;
    }
    if (c.tamed) {
      c.state = c.state === "follow" ? "stay" : "follow";
      c.target = null;
      return `${c.name}: ${c.state}`;
    }
  }
  if (nearCampfire(state, 3) && count(state, "raw_meat") > 0) {
    let cooked = 0;
    while (cooked < 5 && craft(state, "cooked_meat", true)) cooked++;
    if (cooked) {
      sfx(state, "craft");
      return `Cooked ${cooked} meat`;
    }
    return "Cooking needs wood";
  }
  if (canDrink(state)) {
    p.water = Math.min(100, p.water + 20);
    sfx(state, "drink");
    return "You drink";
  }
  return null;
}

export function canDrink(state: GameState) {
  const p = state.player;
  if (p.swimming) return true;
  const fx = p.x + Math.sin(p.yaw) * 2;
  const fz = p.z + Math.cos(p.yaw) * 2;
  return heightAt(fx, fz, state.seed) < WATER_LEVEL && p.y - WATER_LEVEL < 3;
}

/** R: climb onto (or off) a tamed, rideable creature. */
export function toggleMount(state: GameState): boolean {
  const p = state.player;
  if (p.mountId) {
    const m = state.creatures.find((c) => c.id === p.mountId);
    p.mountId = null;
    if (m) {
      m.state = "follow";
      p.x = m.x + Math.cos(m.heading) * 1.5;
      p.z = m.z - Math.sin(m.heading) * 1.5;
    }
    return true;
  }
  const c = state.creatures.find(
    (o) => o.tamed && !isDown(o) && SPECIES[o.species].rideSpeed && Math.hypot(o.x - p.x, o.z - p.z) < 3.5,
  );
  if (!c) return false;
  p.mountId = c.id;
  c.target = null;
  return true;
}

/** The storage box under the crosshair, if any. */
export function lookedAtStorage(state: GameState): Structure | null {
  const t = lookTarget(state, 3.5);
  return t?.kind === "structure" && t.structure.kind === "storage" ? t.structure : null;
}

/** Move every one of an item between your inventory and a box. */
export function transfer(state: GameState, boxId: number, id: ItemId, direction: "deposit" | "withdraw"): boolean {
  const box = state.structures.find((s) => s.id === boxId && s.kind === "storage");
  if (!box) return false;
  box.items ??= {};
  if (direction === "deposit") {
    const n = count(state, id);
    if (n <= 0 || !removeItem(state, id, n)) return false;
    box.items[id] = (box.items[id] ?? 0) + n;
  } else {
    const n = box.items[id] ?? 0;
    if (n <= 0) return false;
    delete box.items[id];
    addItem(state, id, n);
  }
  return true;
}

/** Your most recently placed sleeping bag, if you've placed one. */
export function bedSpawn(state: GameState): Structure | null {
  const beds = state.structures.filter((s) => s.kind === "bed");
  return beds[beds.length - 1] ?? null;
}

export function respawn(state: GameState) {
  const bed = bedSpawn(state);
  const spawn = bed ? { x: bed.x + 0.8, z: bed.z } : spawnPoint(state.seed);
  const keepLevel = state.player.level;
  state.player = freshPlayer(spawn.x, spawn.z, state.seed);
  if (bed) state.player.y = groundAt(state, spawn.x, spawn.z);
  state.player.level = keepLevel;
  state.player.maxHp = 100 + (keepLevel - 1) * 10;
  state.player.maxStamina = 100 + (keepLevel - 1) * 10;
  state.player.hp = state.player.maxHp;
  state.inventory = {};
  state.hotbar = Array(HOTBAR_SIZE).fill(null);
  log(
    state,
    bed
      ? "You wake in your sleeping bag. Anything you were carrying is gone."
      : "You wash up on the beach again. Your tames and base are where you left them.",
  );
}

// ---------------------------------------------------------------- simulation

/** Highest walkable surface at (x, z): terrain or a foundation. */
export function groundAt(state: GameState, x: number, z: number): number {
  let h = heightAt(x, z, state.seed);
  for (const s of state.structures) {
    if (s.kind !== "foundation") continue;
    if (Math.abs(x - s.x) <= GRID / 2 && Math.abs(z - s.z) <= GRID / 2) h = Math.max(h, s.y + 0.15);
  }
  return h;
}

function blockedByWall(state: GameState, x: number, z: number, y: number): boolean {
  const r = 0.35;
  for (const s of state.structures) {
    if (s.kind !== "wall" || y > s.y + 3) continue;
    const alongX = Math.abs(Math.sin(s.rot)) < 0.5; // wall spans the x axis
    const halfW = alongX ? GRID / 2 : 0.15;
    const halfD = alongX ? 0.15 : GRID / 2;
    if (Math.abs(x - s.x) < halfW + r && Math.abs(z - s.z) < halfD + r) return true;
  }
  return false;
}

export function movePlayer(state: GameState, input: Input, dt: number) {
  const p = state.player;
  if (p.dead) return;
  const mount = p.mountId ? state.creatures.find((c) => c.id === p.mountId) : undefined;
  if (p.mountId && (!mount || isDown(mount))) p.mountId = null;

  let mx = 0;
  let mz = 0;
  if (input.forward) mz += 1;
  if (input.back) mz -= 1;
  if (input.left) mx += 1;
  if (input.right) mx -= 1;
  const len = Math.hypot(mx, mz) || 1;
  const moving = mx !== 0 || mz !== 0;
  const sprinting = input.sprint && moving && p.stamina > 1 && !p.swimming;

  let speed = p.swimming ? SWIM_SPEED : sprinting ? SPRINT_SPEED : WALK_SPEED;
  if (mount) speed = (SPECIES[mount.species].rideSpeed ?? speed) * (sprinting ? 1.35 : 1);
  if (sprinting) p.stamina = Math.max(0, p.stamina - (mount ? 6 : 14) * dt);
  else p.stamina = Math.min(p.maxStamina, p.stamina + 9 * dt);

  const sin = Math.sin(p.yaw);
  const cos = Math.cos(p.yaw);
  const vx = ((mz * sin + mx * cos) / len) * speed;
  const vz = ((mz * cos - mx * sin) / len) * speed;
  const lim = WORLD_HALF - 2;
  const nx = clamp(p.x + vx * dt, -lim, lim);
  const nz = clamp(p.z + vz * dt, -lim, lim);
  if (!blockedByWall(state, nx, p.z, p.y)) p.x = nx;
  if (!blockedByWall(state, p.x, nz, p.y)) p.z = nz;

  const ground = groundAt(state, p.x, p.z);
  const swimDepth = WATER_LEVEL - 1.3;
  p.swimming = ground < swimDepth && p.y <= WATER_LEVEL;
  if (p.swimming) {
    p.vy = 0;
    p.y += (swimDepth - p.y) * Math.min(1, dt * 4);
    if (input.jump) p.y = Math.min(WATER_LEVEL - 0.6, p.y + 3 * dt);
    p.onGround = false;
  } else {
    if (input.jump && p.onGround && p.stamina > 5) {
      p.vy = JUMP_SPEED;
      p.stamina -= 5;
      p.onGround = false;
    }
    p.vy -= GRAVITY * dt;
    p.y += p.vy * dt;
    if (p.y <= ground) {
      p.y = ground;
      p.vy = 0;
      p.onGround = true;
    } else if (p.onGround && p.y - ground < 0.6 && p.vy <= 0) {
      p.y = ground; // walk down slopes instead of bouncing off them
      p.vy = 0;
    } else {
      p.onGround = false;
    }
  }

  if (mount) {
    mount.x = p.x;
    mount.z = p.z;
    mount.heading = p.yaw;
  }
}

export function step(state: GameState, input: Input, dt: number) {
  const p = state.player;
  state.time += dt;
  const day = Math.floor(state.time / DAY_LENGTH) + 1;
  if (day !== state.day) {
    state.day = day;
    log(state, `Day ${day}`);
  }
  p.cooldown = Math.max(0, p.cooldown - dt);
  p.hurtFlash = Math.max(0, p.hurtFlash - dt);

  movePlayer(state, input, dt);

  if (!p.dead) {
    const night = isNight(state) ? 1.25 : 1;
    p.food = Math.max(0, p.food - FOOD_DRAIN * night * dt);
    p.water = Math.max(0, p.water - WATER_DRAIN * dt);
    if (p.food <= 0 || p.water <= 0) hurtPlayer(state, 1.2 * dt, true);
    else if (p.food > 25 && p.water > 25) p.hp = Math.min(p.maxHp, p.hp + 0.4 * dt);
  }

  const rng = mulberry32((Math.floor(state.time * 10) * 2654435761) ^ state.seed);
  const ctx = {
    seed: state.seed, time: state.time, dt, rng,
    player: { x: p.x, z: p.z, dead: p.dead, mountId: p.mountId },
    creatures: state.creatures,
  };
  for (const c of state.creatures) {
    for (const ev of updateCreature(c, ctx)) {
      if (ev.type === "hit-player") {
        const mount = p.mountId ? state.creatures.find((m) => m.id === p.mountId) : undefined;
        if (mount) {
          // Your mount takes the hit first.
          if (damageCreature(mount, ev.amount ?? 0, 0, state.time, ev.creatureId)) {
            p.mountId = null;
            log(state, `${mount.name ?? SPECIES[mount.species].name} was killed!`);
          }
        } else {
          hurtPlayer(state, ev.amount ?? 0, false);
        }
      } else if (ev.type === "hit-creature" && ev.targetId != null) {
        const foe = state.creatures.find((o) => o.id === ev.targetId);
        if (foe && damageCreature(foe, ev.amount ?? 0, 0, state.time, ev.creatureId)) {
          if (foe.tamed) log(state, `${foe.name} was killed!`);
          else gainXp(state, SPECIES[foe.species].xp * 0.5);
        }
      } else if (ev.type === "woke") {
        log(state, `The ${SPECIES[c.species].name} woke up!`);
      }
    }
  }

  // Corpses rot away; wild populations refill out of sight.
  const before = state.creatures.length;
  state.creatures = state.creatures.filter((c) => !(c.state === "dead" && state.time >= c.despawnAt));
  if (state.creatures.length !== before) {
    for (const sp of Object.values(SPECIES)) {
      const wild = state.creatures.filter((c) => c.species === sp.id && !c.tamed).length;
      for (let i = wild; i < sp.population; i++) spawnCreature(state, sp.id, rng);
    }
  }

  let regrew = false;
  for (const n of state.nodes) {
    if (n.respawnAt && state.time >= n.respawnAt) {
      n.respawnAt = 0;
      n.hp = n.maxHp;
      regrew = true;
    }
  }
  if (regrew) state.nodeVersion++;
}

function hurtPlayer(state: GameState, amount: number, silent: boolean) {
  const p = state.player;
  if (p.dead || amount <= 0) return;
  p.hp -= amount;
  if (!silent) {
    p.hurtFlash = 0.35;
    sfx(state, "hurt");
  }
  if (p.hp <= 0) {
    p.hp = 0;
    p.dead = true;
    sfx(state, "death");
    if (p.mountId) p.mountId = null;
    log(state, p.food <= 0 ? "You starved." : p.water <= 0 ? "You died of thirst." : "You were killed.");
  }
}

/** 0 = midnight, 0.5 = noon. */
export const timeOfDay = (state: GameState) => (state.time % DAY_LENGTH) / DAY_LENGTH;
export const isNight = (state: GameState) => {
  const t = timeOfDay(state);
  return t < 0.22 || t > 0.78;
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

// ---------------------------------------------------------------- save / load

export const SAVE_KEY = "primal-isle-save-v1";

export function serialize(state: GameState): string {
  // Nodes regrow from the seed; only store the ones that are currently chopped down.
  const { nodes, sfx: _sfx, ...rest } = state;
  const depleted = nodes.filter((n) => n.respawnAt || n.hp < n.maxHp).map((n) => [n.id, n.hp, n.respawnAt]);
  return JSON.stringify({ ...rest, depleted });
}

export function deserialize(json: string): GameState | null {
  try {
    const data = JSON.parse(json);
    if (data?.version !== 1 || typeof data.seed !== "number") return null;
    const nodes = generateNodes(data.seed);
    const byId = new Map(nodes.map((n) => [n.id, n]));
    for (const [id, hp, respawnAt] of data.depleted ?? []) {
      const n = byId.get(id);
      if (n) Object.assign(n, { hp, respawnAt });
    }
    delete data.depleted;
    return { ...data, nodes, nodeVersion: 0, structureVersion: 0, sfx: [] } as GameState;
  } catch {
    return null;
  }
}
