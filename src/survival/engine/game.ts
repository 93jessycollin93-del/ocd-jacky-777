// Primal Isle game state and simulation. Pure TypeScript: no React, no three.js, so it can be tested
// headless. The scene reads this state every frame; the HUD samples it a few times a second.
import {
  SPECIES, makeCreature, updateCreature, damageCreature, feedCreature, sedateCreature, isDown,
  type Creature, type SpeciesId,
} from "./creatures";
import {
  HAND, ITEMS, RECIPES, STATION_NAMES, isEquippable, recipeFor,
  type Ailment, type Cost, type EquipSlot, type ItemId, type Recipe, type StationId, type ToolStats,
} from "./items";
import { mulberry32 } from "./noise";
import {
  BLOCKS, BLOCK_COLORS, blockSupport, bodyBlocked, cellKey, doorPartner, hitsToBreak, isBlockItem, isDoor, raycastBlocks, solidAt,
  PLAYER_HEIGHT, PLAYER_RADIUS, type BlockHit, type BlockMap, type PlaceableBlock,
} from "./blocks";
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
/** Falls up to this many metres are free; each metre beyond costs FALL_DAMAGE health. */
export const FALL_SAFE = 4;
export const FALL_DAMAGE = 9;
/** Falls longer than this also break a leg. */
export const FRACTURE_FALL = 7;
/** Health lost per second while bleeding. */
export const LIGHT_BLEED = 0.35;
export const HEAVY_BLEED = 1.1;
/** Health lost per second when freezing or overheating. */
export const EXPOSURE_DAMAGE = 0.5;
/** Share of a tame's health it regains per second out of combat. */
export const TAME_REGEN = 0.01;
const WATER_DRAIN = 0.11;

export type StructureKind = "campfire" | "foundation" | "wall" | "bed" | "storage" | "forge" | "workbench" | "lootbag";

/** A burst of particles for the scene to show; like sfx, queued per frame and never saved. */
export interface Fx {
  x: number;
  y: number;
  z: number;
  color: string;
  count: number;
}

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
  /** The last damage was a fall (for the death message). */
  fallDeath?: boolean;
  /** Seconds left on the held-item swing animation. */
  swing?: number;
  /** Knockback velocity from being hit (m/s). */
  kx?: number;
  kz?: number;
  /** Highest point since last standing on something, for fall damage. */
  peakY?: number;
  /** 0 none, 1 light bleeding, 2 heavy bleeding. */
  bleeding?: 0 | 1 | 2;
  /** A broken leg: slower, no sprinting, and jumping hurts. */
  fracture?: boolean;
  /** Health still to come from a salve, and how fast. */
  regen?: { left: number; perSec: number } | null;
  /** Seconds until you're dry after a swim. */
  wet?: number;
  /** How warm it feels to you right now (°C), updated every step. */
  feels?: number;
}

export interface CraftJob {
  id: number;
  recipeId: string;
  /** Seconds of work left. */
  left: number;
  total: number;
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
  /** Placed building blocks, keyed "x,y,z". */
  blocks: BlockMap;
  blockVersion: number;
  /** The block you're part-way through breaking. */
  blockDamage: { key: string; hits: number } | null;
  stats: { tamed: number; kills: number; crafted: number };
  /** Wear on the tool in use for each tool type (uses left on the one you're holding). */
  durability: Partial<Record<ItemId, number>>;
  /** Things being made, in order. Materials are taken when a job is queued. */
  craftQueue: CraftJob[];
  /** What you're wearing, by slot. Worn gear isn't in the inventory but still counts for weight. */
  equipment: Partial<Record<EquipSlot, ItemId>>;
  /** Seconds until the next unit of each perishable in your inventory goes off. */
  spoil: Partial<Record<ItemId, number>>;
  /** Sounds to play this frame; the page drains it. Not saved. */
  sfx: Sfx[];
  /** Particle bursts for the scene; drained every frame. Not saved. */
  fx: Fx[];
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
    blocks: {},
    blockVersion: 0,
    blockDamage: null,
    stats: { tamed: 0, kills: 0, crafted: 0 },
    durability: {},
    craftQueue: [],
    equipment: {},
    spoil: {},
    sfx: [],
    fx: [],
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
    swing: 0, kx: 0, kz: 0,
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

export function burst(state: GameState, x: number, y: number, z: number, color: string, count = 8) {
  if (state.fx.length < 16) state.fx.push({ x, y, z, color, count });
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

/** Put an item in a hotbar slot (moving it if it's already elsewhere on the bar). */
export function assignHotbar(state: GameState, id: ItemId, slot: number): boolean {
  if (!isEquippable(id) || count(state, id) <= 0 || slot < 0 || slot >= HOTBAR_SIZE) return false;
  const from = state.hotbar.indexOf(id);
  if (from >= 0) state.hotbar[from] = state.hotbar[slot] ?? null;
  state.hotbar[slot] = id;
  return true;
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

export const STATION_RANGE = 4;

export function nearStation(state: GameState, station: StationId, range = STATION_RANGE) {
  const p = state.player;
  return state.structures.some((s) => s.kind === station && Math.hypot(s.x - p.x, s.z - p.z) < range);
}

export const nearCampfire = (state: GameState, range = STATION_RANGE) => nearStation(state, "campfire", range);
export const nearForge = (state: GameState, range = STATION_RANGE) => nearStation(state, "forge", range);
export const nearWorkbench = (state: GameState, range = STATION_RANGE) => nearStation(state, "workbench", range);

export function canCraft(state: GameState, recipe: Recipe): { ok: boolean; reason?: string } {
  if ((recipe.level ?? 1) > state.player.level) return { ok: false, reason: `Needs level ${recipe.level}` };
  if (recipe.station && !nearStation(state, recipe.station)) {
    return { ok: false, reason: `Stand near a ${STATION_NAMES[recipe.station]}` };
  }
  if (!hasCost(state, recipe.cost)) return { ok: false, reason: "Missing materials" };
  return { ok: true };
}

export const MAX_CRAFT_QUEUE = 8;

/** Start making something: takes the materials now, delivers the item when the time is up. */
export function queueCraft(state: GameState, recipeId: string): { ok: boolean; reason?: string } {
  const recipe = RECIPES.find((r) => r.id === recipeId);
  if (!recipe) return { ok: false, reason: "Unknown recipe" };
  if (state.craftQueue.length >= MAX_CRAFT_QUEUE) return { ok: false, reason: "Craft queue is full" };
  const check = canCraft(state, recipe);
  if (!check.ok) return check;
  spend(state, recipe.cost);
  state.craftQueue.push({ id: state.nextId++, recipeId, left: recipe.time, total: recipe.time });
  sfx(state, "place");
  return { ok: true };
}

/** Stop a queued job and get its materials back. */
export function cancelCraft(state: GameState, jobId: number): boolean {
  const i = state.craftQueue.findIndex((j) => j.id === jobId);
  if (i < 0) return false;
  const [job] = state.craftQueue.splice(i, 1);
  const recipe = RECIPES.find((r) => r.id === job.recipeId);
  if (recipe) for (const [id, n] of Object.entries(recipe.cost) as [ItemId, number][]) addItem(state, id, n);
  return true;
}

/** Work on the front job. Station jobs only progress while you're near that station. */
function advanceCrafting(state: GameState, dt: number) {
  const job = state.craftQueue[0];
  if (!job || state.player.dead) return;
  const recipe = RECIPES.find((r) => r.id === job.recipeId);
  if (!recipe) {
    state.craftQueue.shift();
    return;
  }
  if (recipe.station && !nearStation(state, recipe.station)) return;
  job.left -= dt;
  if (job.left > 0) return;
  state.craftQueue.shift();
  addItem(state, recipe.output, recipe.count);
  state.stats.crafted++;
  gainXp(state, 2 + recipe.time * 0.5);
  sfx(state, "craft");
  log(state, `Crafted ${recipe.count > 1 ? `${recipe.count}× ` : ""}${ITEMS[recipe.output].name}`);
}

/** Why the front job isn't moving, if it isn't. */
export function craftBlocker(state: GameState): string | null {
  const job = state.craftQueue[0];
  const recipe = job && RECIPES.find((r) => r.id === job.recipeId);
  if (recipe?.station && !nearStation(state, recipe.station)) return `Paused: go back to a ${STATION_NAMES[recipe.station]}`;
  return null;
}

// ---------------------------------------------------------------- durability and repair

export function maxDurability(id: ItemId): number | undefined {
  return ITEMS[id].durability;
}

/** Uses left on the tool of this type you'd use next. */
export function toolDurability(state: GameState, id: ItemId): number | undefined {
  const max = maxDurability(id);
  if (max === undefined) return undefined;
  return state.durability[id] ?? max;
}

/** One use of the held tool. When it hits zero the tool breaks and the next one (if any) takes over. */
function wearTool(state: GameState) {
  const id = equipped(state);
  if (!id) return;
  const max = maxDurability(id);
  if (max === undefined) return;
  const left = (state.durability[id] ?? max) - 1;
  if (left > 0) {
    state.durability[id] = left;
    if (left === Math.floor(max * 0.1)) log(state, `Your ${ITEMS[id].name} is nearly broken. Repair it at a workbench.`);
    return;
  }
  delete state.durability[id];
  removeItem(state, id, 1);
  log(state, `Your ${ITEMS[id].name} broke!`);
  sfx(state, "hurt");
}

/** Materials to fully repair a tool: about half of what it took to make, scaled by how worn it is. */
export function repairCost(state: GameState, id: ItemId): Cost | null {
  const max = maxDurability(id);
  const recipe = recipeFor(id);
  if (max === undefined || !recipe) return null;
  const worn = 1 - (toolDurability(state, id) ?? max) / max;
  if (worn <= 0) return {};
  const cost: Cost = {};
  for (const [mat, n] of Object.entries(recipe.cost) as [ItemId, number][]) {
    cost[mat] = Math.max(1, Math.ceil(n * 0.5 * worn));
  }
  return cost;
}

export function repairTool(state: GameState, id: ItemId): { ok: boolean; reason?: string } {
  if (count(state, id) <= 0) return { ok: false, reason: "You don't have one" };
  if (!nearWorkbench(state)) return { ok: false, reason: "Stand near a Workbench" };
  const cost = repairCost(state, id);
  if (!cost) return { ok: false, reason: "Can't be repaired" };
  if (!Object.keys(cost).length) return { ok: false, reason: "Already in perfect condition" };
  if (!hasCost(state, cost)) return { ok: false, reason: "Missing materials" };
  spend(state, cost);
  delete state.durability[id];
  sfx(state, "craft");
  log(state, `Repaired your ${ITEMS[id].name}`);
  return { ok: true };
}

// ---------------------------------------------------------------- weight

export function carryWeight(state: GameState): number {
  let kg = 0;
  for (const [id, n] of Object.entries(state.inventory) as [ItemId, number][]) kg += ITEMS[id].weight * n;
  for (const id of Object.values(state.equipment)) if (id) kg += ITEMS[id].weight;
  return Math.round(kg * 10) / 10;
}

/** What you can carry without slowing down, in kg: 60, +3 per level, plus your backpack. */
export const carryCapacity = (state: GameState) => 60 + (state.player.level - 1) * 3 + gearTotal(state, "capacity");

// ---------------------------------------------------------------- gear

/** Sum one stat across everything you're wearing. */
export function gearTotal(state: GameState, stat: "insulation" | "cooling" | "armor" | "capacity"): number {
  let total = 0;
  for (const id of Object.values(state.equipment)) if (id) total += ITEMS[id].wear?.[stat] ?? 0;
  return total;
}

/** Share of creature damage your gear absorbs (capped at 40%). */
export const armorValue = (state: GameState) => Math.min(0.4, gearTotal(state, "armor"));

/** Put on a piece of gear from your bag, swapping out whatever was in that slot. */
export function wearGear(state: GameState, id: ItemId): boolean {
  const wear = ITEMS[id].wear;
  if (!wear || count(state, id) <= 0) return false;
  removeItem(state, id, 1);
  const old = state.equipment[wear.slot];
  if (old) addItem(state, old, 1);
  state.equipment[wear.slot] = id;
  sfx(state, "place");
  return true;
}

export function removeGear(state: GameState, slot: EquipSlot): boolean {
  const id = state.equipment[slot];
  if (!id) return false;
  delete state.equipment[slot];
  addItem(state, id, 1);
  return true;
}

// ---------------------------------------------------------------- temperature

export type Thermal = "freezing" | "cold" | "comfortable" | "hot" | "overheating";

/** Air temperature where you stand: warm days, cool nights, colder up high, warmer by a fire. */
export function ambientTemperature(state: GameState): number {
  const p = state.player;
  const t = timeOfDay(state);
  let temp = 18 + 8 * Math.sin((t - 0.25) * Math.PI * 2); // 10 °C at midnight, 26 °C at noon
  temp -= Math.max(0, p.y - 8) * 0.55; // thinner, colder air up the mountains
  let fire = 0;
  let forge = 0;
  for (const s of state.structures) {
    const d = Math.hypot(s.x - p.x, s.z - p.z);
    if (s.kind === "campfire" && d < 6) fire += 14 * (1 - d / 6);
    if (s.kind === "forge" && d < 7) forge += 18 * (1 - d / 7);
  }
  let torchHeat = 0;
  const px = Math.floor(p.x);
  const pz = Math.floor(p.z);
  const py = Math.floor(p.y);
  for (let dx = -3; dx <= 3; dx++) {
    for (let dz = -3; dz <= 3; dz++) {
      for (let dy = -2; dy <= 3; dy++) {
        if (state.blocks[cellKey(px + dx, py + dy, pz + dz)] === "torch") torchHeat += 3;
      }
    }
  }
  // A campfire takes the chill off but won't cook you at noon; a forge's furnace is properly hot.
  temp = Math.max(temp, Math.min(temp + fire + Math.min(8, torchHeat), 28));
  return Math.max(temp, Math.min(temp + forge, 34));
}

/** How warm it feels to you: the air, plus what you're wearing, minus being soaked. */
export function feelsLike(state: GameState): number {
  const air = ambientTemperature(state) - ((state.player.wet ?? 0) > 0 ? 6 : 0);
  const insulation = gearTotal(state, "insulation");
  return air + insulation * (air < 20 ? 1.5 : 0.6) - (air > 24 ? gearTotal(state, "cooling") : 0);
}

export function thermalBand(feels: number): Thermal {
  if (feels < 2) return "freezing";
  if (feels < 12) return "cold";
  if (feels <= 30) return "comfortable";
  if (feels <= 38) return "hot";
  return "overheating";
}

// ---------------------------------------------------------------- dropping and spoilage

/** Drop items at your feet, into a bag you (or anyone) can pick up again. */
export function dropItem(state: GameState, id: ItemId, n = count(state, id)): boolean {
  const take = Math.min(n, count(state, id));
  if (take <= 0) return false;
  const p = state.player;
  removeItem(state, id, take);
  let bag = state.structures.find((s) => s.kind === "lootbag" && Math.hypot(s.x - p.x, s.z - p.z) < 2);
  if (!bag) {
    const y = Math.max(groundAt(state, p.x, p.z), blockSupport(state.blocks, p.x, p.y, p.z), WATER_LEVEL);
    bag = { id: state.nextId++, kind: "lootbag", x: p.x, y, z: p.z, rot: 0, items: {} };
    state.structures.push(bag);
    state.structureVersion++;
  }
  bag.items ??= {};
  bag.items[id] = (bag.items[id] ?? 0) + take;
  return true;
}

/** Perishables in your inventory go off one at a time. Food stored in boxes keeps. */
function spoilFood(state: GameState, dt: number) {
  for (const id of Object.keys(ITEMS) as ItemId[]) {
    const life = ITEMS[id].spoilSeconds;
    if (!life) continue;
    if (count(state, id) <= 0) {
      delete state.spoil[id];
      continue;
    }
    const left = (state.spoil[id] ?? life) - dt;
    if (left > 0) {
      state.spoil[id] = left;
      continue;
    }
    state.spoil[id] = life;
    removeItem(state, id, 1);
    const into = ITEMS[id].spoilsInto;
    if (into) addItem(state, into, 1);
    log(state, `A ${ITEMS[id].name.toLowerCase()} went off.${id === "raw_meat" ? " Cook or dry meat to keep it." : ""}`);
  }
}

export interface Encumbrance {
  ratio: number;
  /** "ok" up to capacity, "heavy" up to 1.5×, then "overloaded". */
  level: "ok" | "heavy" | "overloaded";
  speed: number;
  staminaDrain: number;
  canSprint: boolean;
  canJump: boolean;
}

export function encumbrance(state: GameState): Encumbrance {
  const ratio = carryWeight(state) / carryCapacity(state);
  if (ratio <= 1) return { ratio, level: "ok", speed: 1, staminaDrain: 1, canSprint: true, canJump: true };
  if (ratio <= 1.5) return { ratio, level: "heavy", speed: 0.7, staminaDrain: 1.6, canSprint: true, canJump: true };
  return { ratio, level: "overloaded", speed: 0.4, staminaDrain: 2.5, canSprint: false, canJump: false };
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
  if (isBlockItem(id)) return placeBlock(state, id);
  return swing(state);
}

export const BLOCK_REACH = 5;

/** Eye position and look direction, including pitch. */
export function eyeRay(state: GameState) {
  const p = state.player;
  const mount = p.mountId ? state.creatures.find((c) => c.id === p.mountId) : undefined;
  const lift = mount ? SPECIES[mount.species].size * 1.6 + 0.6 : EYE_HEIGHT;
  const cp = Math.cos(p.pitch);
  return {
    origin: { x: p.x, y: p.y + lift, z: p.z },
    dir: { x: Math.sin(p.yaw) * cp, y: Math.sin(p.pitch), z: Math.cos(p.yaw) * cp },
  };
}

/** The block (or patch of ground) under the crosshair, within building reach. */
export function blockTarget(state: GameState, reach = BLOCK_REACH): BlockHit | null {
  const { origin, dir } = eyeRay(state);
  return raycastBlocks(state.blocks, state.seed, origin, dir, reach);
}

function cellOverlapsPlayer(state: GameState, [cx, cy, cz]: [number, number, number]) {
  const p = state.player;
  return (
    cx < p.x + PLAYER_RADIUS && cx + 1 > p.x - PLAYER_RADIUS &&
    cz < p.z + PLAYER_RADIUS && cz + 1 > p.z - PLAYER_RADIUS &&
    cy < p.y + PLAYER_HEIGHT && cy + 1 > p.y
  );
}

export function placeBlock(state: GameState, id: PlaceableBlock): boolean {
  const hit = blockTarget(state);
  if (!hit) return false;
  const cell = hit.place;
  // Doors are two blocks tall: they need the cell above free as well.
  const cells: [number, number, number][] = id === "door" ? [cell, [cell[0], cell[1] + 1, cell[2]]] : [cell];
  for (const c of cells) {
    if (state.blocks[cellKey(c[0], c[1], c[2])]) return false;
    if (BLOCKS[id].solid && cellOverlapsPlayer(state, c)) return false;
  }
  if (!removeItem(state, id)) return false;
  for (const c of cells) state.blocks[cellKey(c[0], c[1], c[2])] = id;
  state.blockVersion++;
  state.player.cooldown = 0.18;
  state.player.swing = 0.2;
  gainXp(state, 0.5);
  sfx(state, "place");
  burst(state, cell[0] + 0.5, cell[1] + 0.1, cell[2] + 0.5, BLOCK_COLORS[id], 5);
  return true;
}

function hitBlock(state: GameState, hit: BlockHit, tool: ToolStats): boolean {
  const block = hit.block!;
  const key = cellKey(hit.cell[0], hit.cell[1], hit.cell[2]);
  const def = BLOCKS[block];
  const needed = hitsToBreak(block, tool.harvest[def.breakAs] ?? 0.5);
  const hits = (state.blockDamage?.key === key ? state.blockDamage.hits : 0) + 1;
  const [bx, by, bz] = hit.cell;
  if (hits < needed) {
    state.blockDamage = { key, hits };
    sfx(state, "hit");
    burst(state, bx + 0.5, by + 0.5, bz + 0.5, BLOCK_COLORS[block], 4);
    return true;
  }
  state.blockDamage = null;
  burst(state, bx + 0.5, by + 0.5, bz + 0.5, BLOCK_COLORS[block], 14);
  if (isDoor(block)) {
    const other = doorPartner(state.blocks, hit.cell[0], hit.cell[1], hit.cell[2]);
    if (other) delete state.blocks[cellKey(other[0], other[1], other[2])];
  }
  delete state.blocks[key];
  state.blockVersion++;
  addItem(state, def.drop ?? (block as PlaceableBlock), 1);
  sfx(state, "harvest");
  return true;
}

/** Hitting bare ground digs up dirt, or sand on the beach. The island itself doesn't change. */
function dig(state: GameState, hit: BlockHit, tool: ToolStats): boolean {
  const [x, , z] = hit.cell;
  const key = `ground:${x},${z}`;
  const needed = Math.max(1, Math.ceil(2 / Math.max(tool.harvest.ground ?? 0.5, 0.25)));
  const hits = (state.blockDamage?.key === key ? state.blockDamage.hits : 0) + 1;
  const sandy = heightAt(x + 0.5, z + 0.5, state.seed) < 2.2;
  burst(state, x + 0.5, hit.cell[1] + 0.2, z + 0.5, sandy ? BLOCK_COLORS.sand : BLOCK_COLORS.dirt, hits < needed ? 4 : 10);
  if (hits < needed) {
    state.blockDamage = { key, hits };
    sfx(state, "hit");
    return true;
  }
  state.blockDamage = null;
  addItem(state, sandy ? "sand" : "dirt", 1);
  sfx(state, "harvest");
  return true;
}

/** Open or close the door you're looking at (both halves). */
export function toggleDoor(state: GameState, cell: [number, number, number]): string | null {
  const key = cellKey(cell[0], cell[1], cell[2]);
  const current = state.blocks[key];
  if (!isDoor(current)) return null;
  const cells = [cell];
  const other = doorPartner(state.blocks, cell[0], cell[1], cell[2]);
  if (other) cells.push(other);
  const next = current === "door" ? "door_open" : "door";
  if (next === "door" && cells.some((c) => cellOverlapsPlayer(state, c))) return "Step out of the doorway to close it";
  for (const c of cells) state.blocks[cellKey(c[0], c[1], c[2])] = next;
  state.blockVersion++;
  sfx(state, "place");
  return next === "door" ? "Door closed" : "Door opened";
}

export const SWING_STAMINA = 2;

function swing(state: GameState): boolean {
  const p = state.player;
  const tool = toolStats(state);
  // Swinging costs a little stamina; when you're out of breath, swings come slower.
  if (p.stamina >= SWING_STAMINA) {
    p.stamina -= SWING_STAMINA;
    p.cooldown = tool.cooldown;
  } else {
    p.cooldown = tool.cooldown * 1.8;
  }
  p.swing = 0.25;
  const target = lookTarget(state, tool.reach + (p.mountId ? 1.5 : 0));
  const block = blockTarget(state, Math.max(tool.reach, 3.5) + 1);
  if (block?.block && (!target || block.dist <= target.dist + 0.5)) {
    wearTool(state);
    return hitBlock(state, block, tool);
  }
  if (!target) {
    if (block && !block.block) {
      wearTool(state);
      return dig(state, block, tool);
    }
    sfx(state, "swing");
    return false;
  }

  if (target.kind === "node") {
    const ok = harvestNode(state, target.node, tool);
    if (ok) wearTool(state);
    return ok;
  }

  if (target.kind === "creature") {
    const c = target.creature;
    if (c.state === "dead") {
      wearTool(state);
      return carve(state, c, tool);
    }
    if (c.tamed) return false;
    const mount = p.mountId ? state.creatures.find((m) => m.id === p.mountId) : undefined;
    const damage = mount ? SPECIES[mount.species].damage + tool.damage * 0.5 : tool.damage;
    const killed = damageCreature(c, damage, tool.torpor, state.time, "player", p);
    if (!mount) wearTool(state);
    sfx(state, killed ? "kill" : "hit");
    burst(state, c.x, heightAt(c.x, c.z, state.seed) + SPECIES[c.species].size, c.z, killed ? "#7a1010" : "#c0392b", killed ? 16 : 6);
    if (killed) onKilled(state, c);
    else if (c.state === "unconscious") log(state, `${SPECIES[c.species].name} is knocked out. Feed it (E) to tame.`);
    return true;
  }

  if (target.kind === "structure") {
    const s = target.structure;
    if (s.kind === "lootbag") return collectLoot(state, s);
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

const NODE_COLORS: Record<ResourceNode["kind"], string> = { tree: "#6b4a2b", rock: "#8a8680", bush: "#3d7a35", ore: "#e0913a" };

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
  } else if (node.kind === "ore") {
    addItem(state, "metal_ore", Math.max(1, Math.round(mult * (0.6 + rng() * 0.6))));
    addItem(state, "stone", Math.round(rng() * mult));
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
  burst(state, node.x, node.y + (node.kind === "tree" ? 1.5 : 0.6), node.z, NODE_COLORS[node.kind], 6);
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

/** Which of your current injuries an item would fix. */
export function treatable(state: GameState, id: ItemId): Ailment[] {
  const p = state.player;
  const have: Ailment[] = [];
  if (p.bleeding === 1) have.push("bleeding");
  if (p.bleeding === 2) have.push("heavy_bleeding");
  if (p.fracture) have.push("fracture");
  return (ITEMS[id].cures ?? []).filter((a) => have.includes(a));
}

const AILMENT_NAMES: Record<Ailment, string> = {
  bleeding: "light bleeding", heavy_bleeding: "heavy bleeding", fracture: "a broken leg",
};

/** Eat, drink or apply an item from your bag. */
export function consume(state: GameState, id: ItemId): boolean {
  const p = state.player;
  const def = ITEMS[id];
  const r = def.restores ?? {};
  // Pure treatments (tourniquet, splint) are only used up when there's something to treat.
  if (def.cures && !def.restores && !def.regen && !treatable(state, id).length) {
    log(state, `No need: you don't have ${def.cures.map((a) => AILMENT_NAMES[a]).join(" or ")}.`);
    p.cooldown = 0.4;
    return false;
  }
  if (!def.restores && !def.cures && !def.regen) return false;
  if (!removeItem(state, id)) return false;
  p.cooldown = 0.4;
  p.swing = 0.3;
  for (const cure of treatable(state, id)) {
    if (cure === "fracture") p.fracture = false;
    else p.bleeding = 0;
    log(state, `Treated ${AILMENT_NAMES[cure]}.`);
  }
  if (def.regen) p.regen = { left: def.regen.hp, perSec: def.regen.hp / def.regen.seconds };
  p.hp = clamp(p.hp + (r.hp ?? 0), 0, p.maxHp);
  p.food = clamp(p.food + (r.food ?? 0), 0, 100);
  p.water = clamp(p.water + (r.water ?? 0), 0, 100);
  p.stamina = clamp(p.stamina + (r.stamina ?? 0), 0, p.maxStamina);
  if (id === "spoiled_meat") log(state, "That meat had gone off. You feel awful.");
  else if ((r.hp ?? 0) < 0) log(state, "Raw meat makes you feel sick. Cook it at a campfire.");
  sfx(state, "eat");
  return true;
}

/** Where a structure would go: snapped to the building grid, walls on the cell edge you face. */
export function placementFor(state: GameState, kind: StructureKind): Structure {
  const p = state.player;
  const free = kind === "campfire" || kind === "bed" || kind === "storage" || kind === "forge" || kind === "workbench";
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
  const door = blockTarget(state, 3.5);
  if (door && isDoor(door.block ?? undefined)) return toggleDoor(state, door.cell);
  const target = lookTarget(state, 3.5);
  if (target?.kind === "structure" && target.structure.kind === "lootbag") {
    collectLoot(state, target.structure);
    return "You got your things back.";
  }
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
  if (nearForge(state, 3) && count(state, "metal_ore") > 0) {
    let smelted = 0;
    while (smelted < 5 && craft(state, "metal_ingot", true)) smelted++;
    if (smelted) {
      sfx(state, "craft");
      return `Smelted ${smelted} metal ingot${smelted > 1 ? "s" : ""}`;
    }
    return count(state, "metal_ore") < 2 ? "Smelting needs 2 ore per ingot" : "Smelting needs wood for fuel";
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
      ? "You wake in your sleeping bag. What you carried is in a bag where you fell."
      : "You wash up on the beach again. What you carried is in a bag where you fell.",
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
  // Carried weight and a broken leg slow you down (your mount carries both when you ride).
  const load = mount ? null : encumbrance(state);
  const canSprint = !p.fracture && (load?.canSprint ?? true);
  const sprinting = input.sprint && moving && p.stamina > 1 && !p.swimming && (canSprint || !!mount);

  let speed = p.swimming ? SWIM_SPEED : sprinting ? SPRINT_SPEED : WALK_SPEED;
  if (mount) speed = (SPECIES[mount.species].rideSpeed ?? speed) * (sprinting ? 1.35 : 1);
  else speed *= (load?.speed ?? 1) * (p.fracture ? 0.6 : 1);
  if (sprinting) p.stamina = Math.max(0, p.stamina - (mount ? 6 : 14 * (load?.staminaDrain ?? 1)) * dt);
  else {
    const chilled = thermalBand(p.feels ?? 20) === "cold" || thermalBand(p.feels ?? 20) === "freezing" ? 0.6 : 1;
    p.stamina = Math.min(p.maxStamina, p.stamina + (moving ? 9 / (load?.staminaDrain ?? 1) : 9) * chilled * dt);
  }

  const sin = Math.sin(p.yaw);
  const cos = Math.cos(p.yaw);
  const vx = ((mz * sin + mx * cos) / len) * speed;
  const vz = ((mz * cos - mx * sin) / len) * speed;
  const lim = WORLD_HALF - 2;
  // Knockback from being hit slides you on top of whatever you were doing, then fades.
  const kx = p.kx ?? 0;
  const kz = p.kz ?? 0;
  const knockDecay = Math.exp(-7 * dt);
  p.kx = Math.abs(kx) < 0.05 ? 0 : kx * knockDecay;
  p.kz = Math.abs(kz) < 0.05 ? 0 : kz * knockDecay;
  const nx = clamp(p.x + (vx + kx) * dt, -lim, lim);
  const nz = clamp(p.z + (vz + kz) * dt, -lim, lim);
  if (!blockedByWall(state, nx, p.z, p.y) && !bodyBlocked(state.blocks, nx, p.y, p.z)) p.x = nx;
  if (!blockedByWall(state, p.x, nz, p.y) && !bodyBlocked(state.blocks, p.x, p.y, nz)) p.z = nz;

  const ground = Math.max(groundAt(state, p.x, p.z), blockSupport(state.blocks, p.x, p.y, p.z));
  const swimDepth = WATER_LEVEL - 1.3;
  p.swimming = ground < swimDepth && p.y <= WATER_LEVEL;
  if (p.swimming) p.wet = 60; // soaked: takes a minute to dry off
  if (p.swimming) {
    p.peakY = p.y; // water breaks your fall
    p.vy = 0;
    p.y += (swimDepth - p.y) * Math.min(1, dt * 4);
    if (input.jump) p.y = Math.min(WATER_LEVEL - 0.6, p.y + 3 * dt);
    p.onGround = false;
  } else {
    if (input.jump && p.onGround && p.stamina > 5 && (load?.canJump ?? true)) {
      if (p.fracture) hurtPlayer(state, 3, false); // jumping on a broken leg hurts
      p.vy = JUMP_SPEED;
      p.stamina -= 5;
      p.onGround = false;
    }
    p.vy -= GRAVITY * dt;
    p.y += p.vy * dt;
    if (p.vy > 0 && bodyBlocked(state.blocks, p.x, p.y, p.z)) {
      p.y -= p.vy * dt; // bumped your head on a block
      p.vy = 0;
    }
    if (!p.onGround) p.peakY = Math.max(p.peakY ?? p.y, p.y);
    if (p.y <= ground) {
      const fell = (p.peakY ?? ground) - ground;
      p.y = ground;
      p.vy = 0;
      if (!p.onGround && fell > FALL_SAFE && !mount) {
        hurtPlayer(state, (fell - FALL_SAFE) * FALL_DAMAGE, false, undefined, true);
        if (fell > FRACTURE_FALL && !p.dead && !p.fracture) {
          p.fracture = true;
          log(state, "You broke your leg! Craft a splint (wood + cordage) to set it.");
        }
      }
      p.onGround = true;
      p.peakY = ground;
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
  p.swing = Math.max(0, (p.swing ?? 0) - dt);

  movePlayer(state, input, dt);

  if (!p.dead) {
    p.wet = Math.max(0, (p.wet ?? 0) - dt);
    p.feels = feelsLike(state);
    const band = thermalBand(p.feels);
    // Cold burns calories; heat (and bleeding) makes you thirsty; the extremes hurt.
    const hunger = band === "cold" || band === "freezing" ? 1.6 : 1;
    const thirst = (band === "hot" || band === "overheating" ? 1.8 : 1) * (p.bleeding ? 1.5 : 1);
    p.food = Math.max(0, p.food - FOOD_DRAIN * hunger * dt);
    p.water = Math.max(0, p.water - WATER_DRAIN * thirst * dt);
    const exposed = band === "freezing" || band === "overheating";
    if (exposed) hurtPlayer(state, EXPOSURE_DAMAGE * dt, true);
    if (p.food <= 0 || p.water <= 0) hurtPlayer(state, 1.2 * dt, true);
    else if (p.food > 25 && p.water > 25 && !p.bleeding && !exposed) p.hp = Math.min(p.maxHp, p.hp + 0.4 * dt);
    if (p.bleeding) hurtPlayer(state, (p.bleeding === 2 ? HEAVY_BLEED : LIGHT_BLEED) * dt, true);
    if (p.regen && !p.dead) {
      const heal = Math.min(p.regen.left, p.regen.perSec * dt);
      p.hp = Math.min(p.maxHp, p.hp + heal);
      p.regen.left -= heal;
      if (p.regen.left <= 0.001) p.regen = null;
    }
  }
  advanceCrafting(state, dt);
  spoilFood(state, dt);

  const rng = mulberry32((Math.floor(state.time * 10) * 2654435761) ^ state.seed);
  const ctx = {
    seed: state.seed, time: state.time, dt, rng,
    player: { x: p.x, z: p.z, dead: p.dead, mountId: p.mountId },
    creatures: state.creatures,
    blocked: (x: number, z: number) => {
      const y = heightAt(x, z, state.seed);
      return solidAt(state.blocks, x, y + 0.5, z) || solidAt(state.blocks, x, y + 1.2, z) || blockedByWall(state, x, z, y);
    },
    losBlocked: (ax: number, az: number, bx: number, bz: number) => {
      const len = Math.hypot(bx - ax, bz - az);
      const steps = Math.ceil(len / 0.4);
      for (let i = 1; i < steps; i++) {
        const x = ax + ((bx - ax) * i) / steps;
        const z = az + ((bz - az) * i) / steps;
        const y = heightAt(x, z, state.seed);
        if (solidAt(state.blocks, x, y + 0.9, z) || blockedByWall(state, x, z, y)) return true;
      }
      return false;
    },
  };
  for (const c of state.creatures) {
    for (const ev of updateCreature(c, ctx)) {
      if (ev.type === "hit-player") {
        const mount = p.mountId ? state.creatures.find((m) => m.id === p.mountId) : undefined;
        if (mount) {
          // Your mount takes the hit first.
          if (damageCreature(mount, ev.amount ?? 0, 0, state.time, ev.creatureId, c)) {
            p.mountId = null;
            log(state, `${mount.name ?? SPECIES[mount.species].name} was killed!`);
          }
        } else {
          hurtPlayer(state, ev.amount ?? 0, false, c);
          woundPlayer(state, SPECIES[c.species].bleed, rng());
        }
      } else if (ev.type === "hit-creature" && ev.targetId != null) {
        const foe = state.creatures.find((o) => o.id === ev.targetId);
        if (foe && damageCreature(foe, ev.amount ?? 0, 0, state.time, ev.creatureId, c)) {
          if (foe.tamed) log(state, `${foe.name} was killed!`);
          else gainXp(state, SPECIES[foe.species].xp * 0.5);
        }
      } else if (ev.type === "woke") {
        log(state, `The ${SPECIES[c.species].name} woke up!`);
      }
    }
  }

  // Tames slowly heal when nothing is fighting them.
  for (const c of state.creatures) {
    if (!c.tamed || c.state === "dead" || typeof c.target === "number") continue;
    const max = SPECIES[c.species].hp;
    if (c.hp < max) c.hp = Math.min(max, c.hp + max * TAME_REGEN * dt);
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

function hurtPlayer(state: GameState, amount: number, silent: boolean, from?: { x: number; z: number }, fall = false) {
  const p = state.player;
  if (p.dead || amount <= 0) return;
  if (from) amount *= 1 - armorValue(state); // gear turns teeth and claws
  p.hp -= amount;
  p.fallDeath = fall;
  if (!silent) {
    p.hurtFlash = 0.35;
    sfx(state, "hurt");
  }
  if (from) {
    const dx = p.x - from.x;
    const dz = p.z - from.z;
    const len = Math.hypot(dx, dz) || 1;
    const push = Math.min(10, 3 + amount * 0.25);
    p.kx = (p.kx ?? 0) + (dx / len) * push;
    p.kz = (p.kz ?? 0) + (dz / len) * push;
    if (p.onGround) p.vy = Math.max(p.vy, 3); // a little hop sells the hit
  }
  if (p.hp <= 0) {
    p.hp = 0;
    p.dead = true;
    sfx(state, "death");
    if (p.mountId) p.mountId = null;
    log(state, p.food <= 0 ? "You starved." : p.water <= 0 ? "You died of thirst." : p.fallDeath ? "You fell to your death." : "You were killed.");
    dropLoot(state);
  }
}

/** A bite may open a wound. Heavy bleeding replaces light; it never gets better on its own. */
function woundPlayer(state: GameState, chance: { light: number; heavy: number } | undefined, roll: number) {
  const p = state.player;
  if (!chance || p.dead) return;
  if (roll < chance.heavy) {
    if (p.bleeding !== 2) log(state, "Heavy bleeding! Use a tourniquet.");
    p.bleeding = 2;
  } else if (roll < chance.heavy + chance.light && !p.bleeding) {
    p.bleeding = 1;
    log(state, "You're bleeding. Use a bandage.");
  }
}

/** On death, everything you carry goes into a bag where you fell, to walk back for. */
function dropLoot(state: GameState) {
  const p = state.player;
  const items: Partial<Record<ItemId, number>> = Object.fromEntries(
    Object.entries(state.inventory).filter(([, n]) => (n ?? 0) > 0),
  );
  for (const id of Object.values(state.equipment)) if (id) items[id] = (items[id] ?? 0) + 1;
  state.equipment = {};
  if (!Object.keys(items).length) return;
  const y = Math.max(groundAt(state, p.x, p.z), blockSupport(state.blocks, p.x, p.y, p.z), WATER_LEVEL);
  state.structures.push({ id: state.nextId++, kind: "lootbag", x: p.x, y, z: p.z, rot: 0, items });
  state.structureVersion++;
  state.inventory = {};
  state.hotbar = Array(HOTBAR_SIZE).fill(null);
  log(state, "Your things are in a bag where you fell (💼 on the compass).");
}

export function collectLoot(state: GameState, bag: Structure): boolean {
  if (bag.kind !== "lootbag") return false;
  for (const [id, n] of Object.entries(bag.items ?? {}) as [ItemId, number][]) addItem(state, id, n);
  state.structures = state.structures.filter((s) => s.id !== bag.id);
  state.structureVersion++;
  sfx(state, "craft");
  log(state, "You got your things back.");
  return true;
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
  const { nodes, sfx: _sfx, fx: _fx, ...rest } = state;
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
    return {
      ...data,
      blocks: data.blocks ?? {},
      blockDamage: null,
      durability: data.durability ?? {},
      craftQueue: data.craftQueue ?? [],
      equipment: data.equipment ?? {},
      spoil: data.spoil ?? {},
      nodes,
      nodeVersion: 0,
      structureVersion: 0,
      blockVersion: 0,
      sfx: [],
      fx: [],
    } as GameState;
  } catch {
    return null;
  }
}
