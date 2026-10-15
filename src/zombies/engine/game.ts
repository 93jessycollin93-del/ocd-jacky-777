// Dead Hours: round-based zombie survival. Pure TypeScript game rules: no React, no three.js, so it
// can be tested headless. The scene reads this state every frame; the HUD samples it a few times a second.
import {
  CELL, EYE_HEIGHT, MAX_BOARDS, WALL_HEIGHT, blocksBullet, blocksWalker, cellCenter, cellOf, clearLine, collideCircle,
  flowField, parseArena, rayDistance, reachableZones, tileAt, zoneAt,
  type Arena, type Spot, type Vec2,
} from "./map";
import {
  MAX_PERKS, PERKS, POWER_UPS, WEAPONS, WEAPON_IDS, ammoCost, magSize, newWeapon, reserveSize, weaponDamage, weaponName,
  type OwnedWeapon, type PerkId, type PowerUpId, type WeaponClass, type WeaponId,
} from "./weapons";

export const ARENA: Arena = parseArena();

export const MAX_ALIVE = 24;
export const PLAYER_RADIUS = 0.3;
export const ZOMBIE_RADIUS = 0.32;
export const ZOMBIE_HIT = 50;
export const ATTACK_REACH = 1.05;
export const BOX_COST = 950;
export const UPGRADE_COST = 5000;
export const REPAIR_POINTS_CAP = 500;
export const INTERMISSION = 9;
export const POWER_UP_SECONDS = 30;
export const START_POINTS = 500;
const HEAD_Y = 1.6;
const HEAD_R = 0.19;
const BODY_TOP = 1.42;
const GAIT_SPEED = { walk: 1.05, run: 2.5, sprint: 4.3 } as const;

export type Gait = keyof typeof GAIT_SPEED;
export type ZombieState = "outside" | "tearing" | "climbing" | "inside" | "dead";

export interface Zombie {
  id: number;
  x: number;
  z: number;
  yaw: number;
  hp: number;
  maxHp: number;
  gait: Gait;
  speed: number;
  state: ZombieState;
  windowId: number;
  /** Board-tearing, climbing or death progress, in seconds. */
  timer: number;
  /** Seconds left in an attack wind-up (0 = not attacking). */
  attack: number;
  cooldown: number;
  /** Seconds left on the hit flash. */
  hurt: number;
  headless: boolean;
  /** Walk-cycle phase, advanced by distance moved. */
  anim: number;
  /** Skin/clothes variation for the renderer. */
  look: number;
}

export interface Player {
  x: number;
  z: number;
  y: number;
  vy: number;
  vx: number;
  vz: number;
  yaw: number;
  pitch: number;
  hp: number;
  maxHp: number;
  /** Game time of the last hit (health starts coming back a little after). */
  hurtAt: number;
  stamina: number;
  sprinting: boolean;
  moving: boolean;
  points: number;
  weapons: OwnedWeapon[];
  current: number;
  grenades: number;
  perks: PerkId[];
  windUses: number;
  /** Seconds left down (0 = up). */
  downed: number;
  reload: number;
  swap: number;
  drink: number;
  melee: number;
  cooldown: number;
  /** A trigger pull waiting for the gun to be ready (so quick clicks are never lost). */
  fireBuffer: number;
  /** Aim-down-sights blend, 0 (hip) to 1 (aimed). */
  ads: number;
  /** Recoil kick for the camera and gun model; decays quickly. */
  kick: number;
  repair: number;
  /** Game time of the last shot, for the muzzle flash. */
  shotAt: number;
}

export interface Drop {
  id: number;
  kind: PowerUpId;
  x: number;
  z: number;
  age: number;
}

export interface Grenade {
  id: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  fuse: number;
}

export type BoxState = "idle" | "spinning" | "ready" | "leaving";

export interface Box {
  /** Spot id where the box currently sits. */
  spot: number;
  state: BoxState;
  timer: number;
  weapon: WeaponId | null;
  uses: number;
}

export interface UpgradeStation {
  state: "idle" | "working" | "ready";
  timer: number;
  weapon: OwnedWeapon | null;
}

export type Fx =
  | { type: "tracer"; from: [number, number, number]; to: [number, number, number]; color: string }
  | { type: "impact"; at: [number, number, number]; kind: "wall" | "blood" | "splinter" | "dust" | "spark" }
  | { type: "zap"; from: [number, number, number]; to: [number, number, number] }
  | { type: "explosion"; at: [number, number, number] }
  | { type: "muzzle" };

export type SfxName =
  | "shot" | "empty" | "reload" | "swap" | "hit" | "headshot" | "kill" | "board_break" | "board_fix" | "buy" | "deny"
  | "door" | "power" | "perk" | "box_open" | "box_take" | "box_leave" | "upgrade" | "powerup_spawn" | "powerup"
  | "round_start" | "round_end" | "groan" | "attack" | "hurt" | "down" | "revive" | "game_over" | "explosion"
  | "throw" | "knife" | "zap";

export interface Sfx {
  name: SfxName;
  cls?: WeaponClass;
  upgraded?: boolean;
  /** Where it happened, for distance volume. */
  x?: number;
  z?: number;
}

export interface Popup {
  id: number;
  amount: number;
  age: number;
}

export interface Banner {
  text: string;
  sub?: string;
  age: number;
  tone: "round" | "power" | "info" | "danger";
}

export interface Stats {
  kills: number;
  headshots: number;
  downs: number;
  earned: number;
  shots: number;
  hits: number;
}

export interface GameState {
  seed: number;
  rng: number;
  time: number;
  round: number;
  phase: "intermission" | "active" | "over";
  phaseTimer: number;
  toSpawn: number;
  spawnTimer: number;
  openDoors: number[];
  /** Boards left on each window. */
  boards: number[];
  power: boolean;
  box: Box;
  upgrade: UpgradeStation;
  /** Seconds left on each timed power-up. */
  insta: number;
  double: number;
  dropsThisRound: number;
  drops: Drop[];
  grenades: Grenade[];
  zombies: Zombie[];
  player: Player;
  stats: Stats;
  repairPoints: number;
  nextId: number;
  /** Visual effects for the scene; drained every frame. */
  fx: Fx[];
  /** Sounds; drained by the page. */
  sfx: Sfx[];
  popups: Popup[];
  banner: Banner | null;
  /** Seconds since the last zombie groan, to keep the moaning from piling up. */
  groanTimer: number;
  /** Bumped whenever doors open or the power comes on, so the scene can rebuild. */
  mapVersion: number;
  /** Camera shake, decays quickly. */
  shake: number;
}

export interface Input {
  forward: boolean;
  back: boolean;
  left: boolean;
  right: boolean;
  sprint: boolean;
  jump: boolean;
  /** Trigger held. */
  fire: boolean;
  /** Aim down sights held. */
  aim: boolean;
  /** Use held (repairing windows). */
  use: boolean;
}

export const NO_INPUT: Input = {
  forward: false, back: false, left: false, right: false, sprint: false, jump: false, fire: false, aim: false, use: false,
};

/** One-off presses, collected by the page and handed to the next step. */
export type Action = "fire" | "use" | "reload" | "swap" | "grenade" | "melee";

// ---------------------------------------------------------------- rules of the round

/** Zombies in a round, solo. */
export function zombiesForRound(round: number): number {
  const early = [6, 8, 13, 18, 24];
  if (round <= early.length) return early[round - 1];
  const r = round - 5;
  return Math.round(24 + 2.2 * r + 0.08 * r * r);
}

/** Health per zombie: +100 a round up to round 9, then +10% a round. */
export function zombieHealth(round: number): number {
  return round <= 9 ? 150 + 100 * (round - 1) : Math.round(950 * 1.1 ** (round - 9));
}

/** Seconds between spawns. */
export const spawnInterval = (round: number) => Math.max(0.3, 2 * 0.93 ** (round - 1));

/** How likely a new zombie is to run or sprint this round. */
export function gaitOdds(round: number): { run: number; sprint: number } {
  const sprint = Math.min(0.7, Math.max(0, 0.09 * (round - 5)));
  const run = Math.min(1 - sprint, Math.max(0, 0.16 * (round - 1)));
  return { run, sprint };
}

// ---------------------------------------------------------------- setup

function rand(state: GameState): number {
  state.rng = (state.rng + 0x6d2b79f5) | 0;
  let t = state.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function newGame(seed = Math.floor(Math.random() * 1e9)): GameState {
  const a = ARENA;
  const boxSpots = a.spots.filter((s) => s.kind === "box");
  // The box starts in the first room you can buy your way into.
  const startBox = boxSpots.find((s) => a.zoneNames[s.zone] === "Dining Hall") ?? boxSpots[0];
  return {
    seed, rng: seed | 0, time: 0, round: 0, phase: "intermission", phaseTimer: 3, toSpawn: 0, spawnTimer: 0,
    openDoors: [], boards: a.windows.map(() => MAX_BOARDS), power: false,
    box: { spot: startBox.id, state: "idle", timer: 0, weapon: null, uses: 0 },
    upgrade: { state: "idle", timer: 0, weapon: null },
    insta: 0, double: 0, dropsThisRound: 0, drops: [], grenades: [], zombies: [],
    player: {
      x: a.spawn.x, z: a.spawn.z, y: 0, vy: 0, vx: 0, vz: 0, yaw: 0, pitch: 0, hp: 100, maxHp: 100, hurtAt: -99,
      stamina: 4, sprinting: false, moving: false, points: START_POINTS, weapons: [newWeapon("sidearm")], current: 0,
      grenades: 2, perks: [], windUses: 0, downed: 0, reload: 0, swap: 0, drink: 0, melee: 0, cooldown: 0, fireBuffer: 0,
      ads: 0, kick: 0, repair: 0, shotAt: -99,
    },
    stats: { kills: 0, headshots: 0, downs: 0, earned: 0, shots: 0, hits: 0 },
    repairPoints: 0, nextId: 1, fx: [], sfx: [], popups: [], banner: null, groanTimer: 0, mapVersion: 0, shake: 0,
  };
}

// ---------------------------------------------------------------- small helpers

const sfx = (state: GameState, s: Sfx) => {
  if (state.sfx.length < 24) state.sfx.push(s);
};
const fx = (state: GameState, f: Fx) => {
  if (state.fx.length < 96) state.fx.push(f);
};
function banner(state: GameState, text: string, tone: Banner["tone"], sub?: string) {
  state.banner = { text, sub, age: 0, tone };
}

export const currentWeapon = (state: GameState): OwnedWeapon | undefined => state.player.weapons[state.player.current];
export const hasPerk = (state: GameState, id: PerkId) => state.player.perks.includes(id);
export const alive = (z: Zombie) => z.state !== "dead";
export const maxStamina = (state: GameState) => (hasPerk(state, "step") ? 8 : 4);

/** Earn points (doubled by Double Points). */
export function earn(state: GameState, amount: number) {
  const n = amount * (state.double > 0 ? 2 : 1);
  state.player.points += n;
  state.stats.earned += n;
  state.popups.push({ id: state.nextId++, amount: n, age: 0 });
  if (state.popups.length > 8) state.popups.shift();
}

function spend(state: GameState, cost: number): boolean {
  if (state.player.points < cost) {
    sfx(state, { name: "deny" });
    return false;
  }
  state.player.points -= cost;
  sfx(state, { name: "buy" });
  return true;
}

const forward = (p: Player): [number, number, number] => [
  Math.sin(p.yaw) * Math.cos(p.pitch), Math.sin(p.pitch), Math.cos(p.yaw) * Math.cos(p.pitch),
];

export const eye = (p: Player): [number, number, number] => [p.x, EYE_HEIGHT + p.y, p.z];

const walkerBlocked = (state: GameState) => (cx: number, cz: number) => blocksWalker(ARENA, state.openDoors, cx, cz);
const bulletBlocked = (state: GameState) => (cx: number, cz: number) => blocksBullet(ARENA, state.openDoors, cx, cz);

/** Rooms that are open to you (zombies only come through these rooms' windows). */
export const openZones = (state: GameState) => reachableZones(ARENA, state.openDoors);

export const spotById = (id: number): Spot => ARENA.spots[id];

/** Where you stand to use something against a wall. */
function spotFront(s: Spot): Vec2 {
  const solid = s.kind === "perk" || s.kind === "box" || s.kind === "upgrade";
  return {
    x: cellCenter(s.cx) + (solid ? s.facing.x * CELL * 0.75 : 0),
    z: cellCenter(s.cz) + (solid ? s.facing.z * CELL * 0.75 : 0),
  };
}

// ---------------------------------------------------------------- what you can use

export type Interactable =
  | { kind: "door"; door: number; cost: number }
  | { kind: "spot"; spot: Spot }
  | { kind: "window"; window: number };

/** The thing in front of you that E / Use would act on. */
export function interactTarget(state: GameState): Interactable | null {
  const p = state.player;
  if (p.downed > 0) return null;
  const [fx_, , fz_] = forward(p);
  const flen = Math.hypot(fx_, fz_) || 1;
  const best: { score: number; t: Interactable | null } = { score: Infinity, t: null };
  const consider = (x: number, z: number, reach: number, t: Interactable, needFacing: boolean) => {
    const dx = x - p.x;
    const dz = z - p.z;
    const d = Math.hypot(dx, dz);
    if (d > reach) return;
    const facing = d > 0.4 ? (dx * fx_ + dz * fz_) / (d * flen) : 1;
    if (needFacing && facing < 0.2) return;
    // Nearest wins, nudged toward what you're looking at.
    const score = d - facing * 0.5;
    if (score < best.score) {
      best.score = score;
      best.t = t;
    }
  };
  for (const door of ARENA.doors) {
    if (state.openDoors.includes(door.id)) continue;
    for (const [cx, cz] of door.cells) consider(cellCenter(cx), cellCenter(cz), 2.1, { kind: "door", door: door.id, cost: door.cost }, false);
  }
  for (const s of ARENA.spots) {
    if (s.kind === "box" && s.id !== state.box.spot) continue;
    const f = spotFront(s);
    consider(f.x, f.z, s.kind === "wallbuy" || s.kind === "power" ? 1.5 : 1.6, { kind: "spot", spot: s }, true);
  }
  for (const w of ARENA.windows) {
    if (state.boards[w.id] >= MAX_BOARDS || !openZones(state).has(w.zone)) continue;
    consider(cellCenter(w.cx), cellCenter(w.cz), 2.3, { kind: "window", window: w.id }, true);
  }
  return best.t;
}

/** Hint under the crosshair. `{use}` is replaced by the HUD with E or the Use button. */
export function promptFor(state: GameState): string | null {
  const p = state.player;
  if (state.phase === "over" || p.downed > 0) return null;
  const t = interactTarget(state);
  if (!t) return null;
  if (t.kind === "door") return `{use} Clear debris [${t.cost}]`;
  if (t.kind === "window") return `Hold {use} to rebuild barrier`;
  const s = t.spot;
  if (s.kind === "wallbuy" && s.weapon) {
    const owned = p.weapons.find((w) => w.id === s.weapon);
    const def = WEAPONS[s.weapon];
    if (owned) return `{use} Buy ammo for ${weaponName(owned)} [${ammoCost(owned)}]`;
    return `{use} Buy ${def.name} [${def.cost}]`;
  }
  if (s.kind === "perk" && s.perk) {
    const perk = PERKS[s.perk];
    if (!state.power && !perk.noPower) return "You need to turn on the power";
    if (hasPerk(state, s.perk)) return `You already have ${perk.name}`;
    if (p.perks.length >= MAX_PERKS) return `You can only hold ${MAX_PERKS} perks`;
    if (s.perk === "wind" && p.windUses >= 3) return `${perk.name} is used up`;
    return `{use} Drink ${perk.name}: ${perk.desc} [${perk.cost}]`;
  }
  if (s.kind === "box") {
    const b = state.box;
    if (b.state === "idle") return `{use} Mystery Box [${BOX_COST}]`;
    if (b.state === "ready" && b.weapon) return `{use} Take ${WEAPONS[b.weapon].name}`;
    return null;
  }
  if (s.kind === "upgrade") {
    const u = state.upgrade;
    if (!state.power) return "You need to turn on the power";
    if (u.state === "ready" && u.weapon) return `{use} Take ${weaponName(u.weapon)}`;
    if (u.state === "working") return "Upgrading…";
    const w = currentWeapon(state);
    if (!w) return null;
    if (w.upgraded) return "That weapon is already upgraded";
    return `{use} Upgrade ${weaponName(w)} [${UPGRADE_COST}]`;
  }
  if (s.kind === "power") return state.power ? null : "{use} Turn on the power";
  return null;
}

/** E / Use pressed. Returns true if something happened. */
export function interact(state: GameState): boolean {
  const p = state.player;
  if (state.phase === "over" || p.downed > 0 || p.drink > 0) return false;
  const t = interactTarget(state);
  if (!t) return false;
  if (t.kind === "door") {
    if (!spend(state, t.cost)) return false;
    state.openDoors.push(t.door);
    state.mapVersion++;
    sfx(state, { name: "door" });
    for (const [cx, cz] of ARENA.doors.find((d) => d.id === t.door)!.cells) {
      fx(state, { type: "impact", at: [cellCenter(cx), 1, cellCenter(cz)], kind: "dust" });
    }
    return true;
  }
  if (t.kind === "window") return false; // windows are held, not pressed
  const s = t.spot;
  if (s.kind === "wallbuy" && s.weapon) {
    const owned = p.weapons.find((w) => w.id === s.weapon);
    if (owned) {
      if (owned.reserve >= reserveSize(owned) && owned.mag >= magSize(owned)) return false;
      if (!spend(state, ammoCost(owned))) return false;
      owned.reserve = reserveSize(owned);
      owned.mag = magSize(owned);
      return true;
    }
    if (!spend(state, WEAPONS[s.weapon].cost ?? 0)) return false;
    giveWeapon(state, newWeapon(s.weapon));
    return true;
  }
  if (s.kind === "perk" && s.perk) {
    const perk = PERKS[s.perk];
    if ((!state.power && !perk.noPower) || hasPerk(state, s.perk) || p.perks.length >= MAX_PERKS) return false;
    if (s.perk === "wind" && p.windUses >= 3) return false;
    if (!spend(state, perk.cost)) return false;
    p.perks.push(s.perk);
    p.drink = 1.5;
    p.reload = 0;
    p.ads = 0;
    if (s.perk === "iron") p.maxHp = 250;
    if (s.perk === "step") p.stamina = maxStamina(state);
    sfx(state, { name: "perk" });
    return true;
  }
  if (s.kind === "box") return operateBox(state);
  if (s.kind === "upgrade") return operateUpgrade(state);
  if (s.kind === "power") {
    if (state.power) return false;
    state.power = true;
    state.mapVersion++;
    sfx(state, { name: "power" });
    banner(state, "Power is on", "power", "Perks and the Upgrade Station are running");
    return true;
  }
  return false;
}

/** Add a gun; with two already, it replaces the one in your hands. */
export function giveWeapon(state: GameState, w: OwnedWeapon) {
  const p = state.player;
  if (p.weapons.length < 2) {
    p.weapons.push(w);
    p.current = p.weapons.length - 1;
  } else {
    p.weapons[p.current] = w;
  }
  p.swap = 0.5;
  p.reload = 0;
  p.ads = 0;
  sfx(state, { name: "swap" });
}

function operateBox(state: GameState): boolean {
  const b = state.box;
  const p = state.player;
  if (b.state === "ready" && b.weapon) {
    giveWeapon(state, newWeapon(b.weapon));
    b.state = "idle";
    b.weapon = null;
    sfx(state, { name: "box_take" });
    return true;
  }
  if (b.state !== "idle" || !spend(state, BOX_COST)) return false;
  b.uses++;
  b.state = "spinning";
  b.timer = 3.6;
  // After a few spins the box may decide to leave: you get your points back and it moves.
  if (b.uses >= 4 && rand(state) < 0.22) {
    b.weapon = null;
  } else {
    const pool = WEAPON_IDS.filter((id) => WEAPONS[id].boxWeight > 0 && !p.weapons.some((w) => w.id === id));
    const total = pool.reduce((a, id) => a + WEAPONS[id].boxWeight, 0);
    let roll = rand(state) * total;
    b.weapon = pool.find((id) => (roll -= WEAPONS[id].boxWeight) < 0) ?? pool[pool.length - 1] ?? "vandal";
  }
  sfx(state, { name: "box_open" });
  return true;
}

function operateUpgrade(state: GameState): boolean {
  const u = state.upgrade;
  const p = state.player;
  if (!state.power) return false;
  if (u.state === "ready" && u.weapon) {
    giveWeapon(state, u.weapon);
    u.state = "idle";
    u.weapon = null;
    return true;
  }
  const w = currentWeapon(state);
  if (u.state !== "idle" || !w || w.upgraded || !spend(state, UPGRADE_COST)) return false;
  p.weapons.splice(p.current, 1);
  p.current = 0;
  p.reload = 0;
  p.ads = 0;
  u.weapon = newWeapon(w.id, true);
  u.state = "working";
  u.timer = 3.5;
  sfx(state, { name: "upgrade" });
  return true;
}

// ---------------------------------------------------------------- the player

function hurtPlayer(state: GameState, amount: number, from?: Vec2) {
  const p = state.player;
  if (p.downed > 0 || state.phase === "over" || amount <= 0) return;
  p.hp -= amount;
  p.hurtAt = state.time;
  state.shake = Math.max(state.shake, 0.35);
  sfx(state, { name: "hurt", x: from?.x, z: from?.z });
  if (p.hp > 0) return;
  p.hp = 0;
  state.stats.downs++;
  if (hasPerk(state, "wind")) {
    // Second Wind: you go down, the horde loses interest, and you get back up without your perks.
    p.downed = 4.5;
    p.windUses++;
    p.perks = [];
    p.maxHp = 100;
    p.reload = 0;
    p.ads = 0;
    p.sprinting = false;
    sfx(state, { name: "down" });
    banner(state, "Down!", "danger", "Second Wind will get you back up");
    return;
  }
  state.phase = "over";
  p.ads = 0;
  sfx(state, { name: "game_over" });
}

function startReload(state: GameState) {
  const p = state.player;
  const w = currentWeapon(state);
  if (!w || p.reload > 0 || p.swap > 0 || p.drink > 0 || w.mag >= magSize(w) || w.reserve <= 0) return;
  p.reload = WEAPONS[w.id].reload * (hasPerk(state, "hands") ? 0.5 : 1);
  p.sprinting = false;
  sfx(state, { name: "reload", cls: WEAPONS[w.id].cls });
}

function finishReload(state: GameState) {
  const w = currentWeapon(state);
  if (!w) return;
  const n = Math.min(magSize(w) - w.mag, w.reserve);
  w.mag += n;
  w.reserve -= n;
}

function swapWeapon(state: GameState) {
  const p = state.player;
  if (p.weapons.length < 2 || p.swap > 0 || p.drink > 0) return;
  p.current = 1 - p.current;
  p.swap = 0.55;
  p.reload = 0;
  p.ads = 0;
  sfx(state, { name: "swap" });
}

function throwGrenade(state: GameState) {
  const p = state.player;
  if (p.grenades <= 0 || p.drink > 0 || p.melee > 0) return;
  p.grenades--;
  const [dx, dy, dz] = forward(p);
  const [ex, ey, ez] = eye(p);
  state.grenades.push({
    id: state.nextId++, x: ex + dx * 0.4, y: ey - 0.15, z: ez + dz * 0.4,
    vx: dx * 13 + p.vx, vy: dy * 13 + 3.2, vz: dz * 13 + p.vz, fuse: 2.1,
  });
  sfx(state, { name: "throw" });
}

function knife(state: GameState) {
  const p = state.player;
  if (p.melee > 0 || p.drink > 0) return;
  p.melee = 0.6;
  p.reload = 0;
  p.sprinting = false;
  sfx(state, { name: "knife" });
  const [fx_, , fz_] = forward(p);
  const flen = Math.hypot(fx_, fz_) || 1;
  let target: Zombie | null = null;
  let bestD = 2.0;
  for (const z of state.zombies) {
    if (!alive(z)) continue;
    const dx = z.x - p.x;
    const dz = z.z - p.z;
    const d = Math.hypot(dx, dz);
    if (d > bestD || (d > 0.3 && (dx * fx_ + dz * fz_) / (d * flen) < 0.45)) continue;
    if (!clearLine(bulletBlocked(state), p.x, p.z, z.x, z.z)) continue;
    bestD = d;
    target = z;
  }
  if (target) damageZombie(state, target, 150, "body", "knife");
}

// ---------------------------------------------------------------- shooting

function raySphere(o: number[], d: number[], c: number[], r: number): number {
  const ox = o[0] - c[0];
  const oy = o[1] - c[1];
  const oz = o[2] - c[2];
  const b = ox * d[0] + oy * d[1] + oz * d[2];
  const cc = ox * ox + oy * oy + oz * oz - r * r;
  const disc = b * b - cc;
  if (disc < 0) return Infinity;
  const t = -b - Math.sqrt(disc);
  return t > 0 ? t : Infinity;
}

/** Ray against an upright cylinder (a zombie's body). */
function rayCylinder(o: number[], d: number[], cx: number, cz: number, r: number, y0: number, y1: number): number {
  const ox = o[0] - cx;
  const oz = o[2] - cz;
  const a = d[0] * d[0] + d[2] * d[2];
  if (a < 1e-9) return Infinity;
  const b = ox * d[0] + oz * d[2];
  const c = ox * ox + oz * oz - r * r;
  const disc = b * b - a * c;
  if (disc < 0) return Infinity;
  const t = (-b - Math.sqrt(disc)) / a;
  if (t <= 0) return Infinity;
  const y = o[1] + d[1] * t;
  return y >= y0 && y <= y1 ? t : Infinity;
}

/** Where a zombie's head is (lower while climbing through a window). */
function headOf(z: Zombie): [number, number, number] {
  const crouch = z.state === "climbing" ? 0.35 : 0;
  return [z.x + Math.sin(z.yaw) * 0.05, HEAD_Y - crouch, z.z + Math.cos(z.yaw) * 0.05];
}

interface BulletHit {
  t: number;
  zombie: Zombie;
  part: "head" | "body";
}

/** Trace one bullet. Returns where it stopped. */
function castBullet(
  state: GameState, o: [number, number, number], d: [number, number, number], w: OwnedWeapon,
): [number, number, number] {
  const def = WEAPONS[w.id];
  const hl = Math.hypot(d[0], d[2]);
  const wallT = hl > 1e-6 ? rayDistance(bulletBlocked(state), o[0], o[2], d[0] / hl, d[2] / hl, def.range * hl) / hl : def.range;
  const floorT = d[1] < 0 ? o[1] / -d[1] : Infinity;
  const ceilT = d[1] > 0 ? (WALL_HEIGHT - o[1]) / d[1] : Infinity;
  const maxT = Math.min(def.range, wallT, floorT, ceilT);
  const hits: BulletHit[] = [];
  for (const z of state.zombies) {
    if (!alive(z)) continue;
    if (Math.hypot(z.x - o[0], z.z - o[2]) > maxT + 1) continue;
    const top = z.state === "climbing" ? BODY_TOP - 0.35 : BODY_TOP;
    const th = z.headless ? Infinity : raySphere(o, d, headOf(z), HEAD_R);
    const tb = rayCylinder(o, d, z.x, z.z, ZOMBIE_RADIUS, 0, top);
    const t = Math.min(th, tb);
    if (t < maxT) hits.push({ t, zombie: z, part: th <= tb ? "head" : "body" });
  }
  hits.sort((a, b) => a.t - b.t);
  let falloff = 1;
  const pierce = def.penetration;
  let end = maxT;
  let stoppedOnFlesh = false;
  for (let i = 0; i < hits.length && i < pierce; i++) {
    const h = hits[i];
    const at: [number, number, number] = [o[0] + d[0] * h.t, o[1] + d[1] * h.t, o[2] + d[2] * h.t];
    // Shotgun pellets lose punch with distance.
    const range = def.cls === "shotgun" ? Math.max(0.35, 1 - Math.max(0, h.t - 6) / 14) : 1;
    let dmg = weaponDamage(w) * (h.part === "head" ? def.head : 1) * falloff * range;
    if (hasPerk(state, "tap")) dmg *= 1.5;
    state.stats.hits++;
    fx(state, { type: "impact", at, kind: "blood" });
    damageZombie(state, h.zombie, dmg, h.part, def.cls === "wonder" ? "zap" : "gun");
    if (def.chain) chainZap(state, h.zombie, weaponDamage(w), def.chain);
    falloff *= 0.7;
    if (i === pierce - 1) {
      end = h.t;
      stoppedOnFlesh = true;
    }
  }
  const stop: [number, number, number] = [o[0] + d[0] * end, o[1] + d[1] * end, o[2] + d[2] * end];
  if (!stoppedOnFlesh && end < def.range - 0.01) fx(state, { type: "impact", at: stop, kind: def.cls === "wonder" ? "spark" : "wall" });
  return stop;
}

/** The Arc Caster's bolt jumps to the nearest zombies around the one it hit. */
function chainZap(state: GameState, from: Zombie, damage: number, jumps: number) {
  let src = from;
  const done = new Set<number>([from.id]);
  for (let i = 0; i < jumps; i++) {
    let next: Zombie | null = null;
    let best = 5.5;
    for (const z of state.zombies) {
      if (!alive(z) || done.has(z.id)) continue;
      const d = Math.hypot(z.x - src.x, z.z - src.z);
      if (d < best) {
        best = d;
        next = z;
      }
    }
    if (!next) return;
    done.add(next.id);
    fx(state, { type: "zap", from: [src.x, 1.2, src.z], to: [next.x, 1.2, next.z] });
    damageZombie(state, next, damage, "body", "zap");
    src = next;
  }
}

function fireWeapon(state: GameState) {
  const p = state.player;
  const w = currentWeapon(state);
  if (!w || p.reload > 0 || p.swap > 0 || p.drink > 0 || p.melee > 0.2 || p.downed > 0) return;
  if (p.cooldown > 0) return;
  const def = WEAPONS[w.id];
  p.fireBuffer = 0;
  if (w.mag <= 0) {
    if (w.reserve > 0) startReload(state);
    else {
      sfx(state, { name: "empty" });
      p.cooldown = 0.3;
    }
    return;
  }
  w.mag--;
  state.stats.shots++;
  p.cooldown = 1 / (def.rate * (hasPerk(state, "tap") ? 1.33 : 1));
  p.sprinting = false;
  p.shotAt = state.time;
  const aimTight = def.cls === "sniper" ? 0.04 : def.cls === "shotgun" ? 0.6 : 0.22;
  const moving = p.moving ? 1.5 : 1;
  const airborne = p.y > 0.05 ? 2 : 1;
  const cone = def.spread * (1 + (aimTight - 1) * p.ads) * moving * airborne;
  const o = eye(p);
  const color = def.cls === "wonder" ? (w.upgraded ? "#ff5cf4" : "#58e1ff") : w.upgraded ? "#c084fc" : "#ffd27a";
  for (let i = 0; i < def.pellets; i++) {
    // Uniform direction inside the cone.
    const a = rand(state) * Math.PI * 2;
    const r = Math.sqrt(rand(state)) * cone;
    const yaw = p.yaw + Math.cos(a) * r;
    const pitch = p.pitch + Math.sin(a) * r;
    const d: [number, number, number] = [Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)];
    const stop = castBullet(state, o, d, w);
    if (i < 3) fx(state, { type: "tracer", from: o, to: stop, color });
  }
  fx(state, { type: "muzzle" });
  sfx(state, { name: def.cls === "wonder" ? "zap" : "shot", cls: def.cls, upgraded: w.upgraded });
  // Recoil: a kick that settles, and a little climb you pull back down.
  const steady = 1 - p.ads * 0.4;
  p.kick += def.kick * steady;
  p.pitch = Math.min(1.45, p.pitch + def.kick * 0.25 * steady);
  if (w.mag === 0 && w.reserve > 0) startReload(state);
}

// ---------------------------------------------------------------- zombies

type DamageSource = "gun" | "knife" | "grenade" | "zap" | "nuke";

/** Hurt a zombie. Points: 10 a hit; 60 for a kill, 100 for a headshot kill, 130 with the knife. */
export function damageZombie(state: GameState, z: Zombie, amount: number, part: "head" | "body", source: DamageSource) {
  if (!alive(z)) return;
  if (state.insta > 0 && source !== "nuke") amount = z.hp;
  z.hp -= amount;
  z.hurt = 0.12;
  if (z.hp > 0) {
    if (source !== "nuke") earn(state, 10);
    sfx(state, { name: part === "head" ? "headshot" : "hit", x: z.x, z: z.z });
    return;
  }
  z.hp = 0;
  const atWindow = z.state !== "inside";
  z.state = "dead";
  z.timer = 0;
  z.attack = 0;
  z.headless = part === "head" && source !== "nuke";
  state.stats.kills++;
  if (part === "head" && source !== "nuke") state.stats.headshots++;
  if (source !== "nuke") {
    earn(state, source === "knife" ? 130 : part === "head" ? 100 : source === "grenade" ? 50 : 60);
    maybeDrop(state, z, atWindow);
  }
  sfx(state, { name: part === "head" ? "headshot" : "kill", x: z.x, z: z.z });
  fx(state, { type: "impact", at: [z.x, part === "head" ? HEAD_Y : 1.1, z.z], kind: "blood" });
}

function maybeDrop(state: GameState, z: Zombie, atWindow: boolean) {
  if (state.dropsThisRound >= 4 || rand(state) > 0.035) return;
  const kinds: PowerUpId[] = ["max_ammo", "insta_kill", "double_points", "nuke"];
  if (state.boards.some((b, i) => b < MAX_BOARDS && openZones(state).has(ARENA.windows[i].zone))) kinds.push("carpenter");
  const kind = kinds[Math.floor(rand(state) * kinds.length)];
  // Zombies killed outside or in a window drop their power-up just inside, where you can reach it.
  let x = z.x;
  let zz = z.z;
  const w = ARENA.windows[z.windowId];
  if (w && (atWindow || tileAt(ARENA, cellOf(x), cellOf(zz)) !== "floor")) {
    x = cellCenter(w.inside[0]);
    zz = cellCenter(w.inside[1]);
  }
  state.drops.push({ id: state.nextId++, kind, x, z: zz, age: 0 });
  state.dropsThisRound++;
  sfx(state, { name: "powerup_spawn", x, z: zz });
}

function spawnZombie(state: GameState) {
  const zones = openZones(state);
  const p = state.player;
  const here = zoneAt(ARENA, cellOf(p.x), cellOf(p.z));
  const choices = ARENA.windows.filter((w) => zones.has(w.zone));
  if (!choices.length) return;
  // Mostly through windows near you.
  const weight = (zone: number) => {
    if (zone === here) return 4;
    return ARENA.doors.some((d) => state.openDoors.includes(d.id) && d.zones.includes(zone) && d.zones.includes(here)) ? 2 : 1;
  };
  const total = choices.reduce((a, w) => a + weight(w.zone), 0);
  let roll = rand(state) * total;
  const win = choices.find((w) => (roll -= weight(w.zone)) < 0) ?? choices[0];
  const ox = cellCenter(win.outside[0]);
  const oz = cellCenter(win.outside[1]);
  const lateral = (rand(state) - 0.5) * 2.4;
  const odds = gaitOdds(state.round);
  const roll2 = rand(state);
  const gait: Gait = roll2 < odds.sprint ? "sprint" : roll2 < odds.sprint + odds.run ? "run" : "walk";
  const hp = zombieHealth(state.round);
  state.zombies.push({
    id: state.nextId++,
    x: ox + win.normal.x * CELL * 2.4 + win.normal.z * lateral,
    z: oz + win.normal.z * CELL * 2.4 + win.normal.x * lateral,
    yaw: Math.atan2(-win.normal.x, -win.normal.z), hp, maxHp: hp, gait,
    speed: GAIT_SPEED[gait] * (0.92 + rand(state) * 0.16),
    state: "outside", windowId: win.id, timer: 0, attack: 0, cooldown: 0, hurt: 0, headless: false, anim: rand(state) * 6,
    look: Math.floor(rand(state) * 1000),
  });
}

let flowCache: { key: string; field: Int32Array } | null = null;

function playerFlow(state: GameState): Int32Array {
  const p = state.player;
  const key = `${cellOf(p.x)},${cellOf(p.z)}|${state.openDoors.join(",")}`;
  if (flowCache?.key !== key) flowCache = { key, field: flowField(ARENA, walkerBlocked(state), cellOf(p.x), cellOf(p.z)) };
  return flowCache.field;
}

/** Steer toward a point, turning to face where it walks. Returns distance moved. */
function walkToward(z: Zombie, tx: number, tz: number, speed: number, dt: number): number {
  const dx = tx - z.x;
  const dz = tz - z.z;
  const d = Math.hypot(dx, dz);
  if (d < 1e-4) return 0;
  const step = Math.min(d, speed * dt);
  z.x += (dx / d) * step;
  z.z += (dz / d) * step;
  const want = Math.atan2(dx, dz);
  let diff = want - z.yaw;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  z.yaw += diff * Math.min(1, dt * 10);
  return step;
}

function updateZombie(state: GameState, z: Zombie, dt: number) {
  const p = state.player;
  z.hurt = Math.max(0, z.hurt - dt);
  z.cooldown = Math.max(0, z.cooldown - dt);
  if (z.state === "dead") {
    z.timer += dt;
    return;
  }
  const win = ARENA.windows[z.windowId];
  const slow = z.hurt > 0 ? 0.6 : 1; // hits make them stagger
  const dist = Math.hypot(p.x - z.x, p.z - z.z);
  const playerUp = p.downed <= 0 && state.phase !== "over";

  // Attacks land at the end of the wind-up if you're still in reach.
  if (z.attack > 0) {
    z.attack -= dt;
    if (z.attack <= 0) {
      z.attack = 0;
      z.cooldown = 1.0;
      const reach = z.state === "inside" ? ATTACK_REACH + 0.45 : 1.9;
      if (playerUp && dist < reach && clearLine(bulletBlocked(state), z.x, z.z, p.x, p.z)) {
        hurtPlayer(state, ZOMBIE_HIT, z);
      }
    }
  }

  if (z.state === "outside") {
    const ox = cellCenter(win.outside[0]);
    const oz = cellCenter(win.outside[1]);
    z.anim += walkToward(z, ox, oz, z.speed * slow, dt) * 2.2;
    if (Math.hypot(ox - z.x, oz - z.z) < 0.08) {
      z.state = "tearing";
      z.timer = 0;
      z.yaw = Math.atan2(-win.normal.x, -win.normal.z);
    }
    return;
  }

  if (z.state === "tearing") {
    // Reach through the gap and swipe at anyone standing at the window.
    if (playerUp && dist < 1.8 && z.cooldown <= 0 && z.attack <= 0 && state.boards[win.id] < MAX_BOARDS - 1) {
      z.attack = 0.4;
      sfx(state, { name: "attack", x: z.x, z: z.z });
      return;
    }
    if (state.boards[win.id] > 0) {
      z.timer += dt;
      if (z.timer >= (z.gait === "walk" ? 1.1 : 0.75)) {
        z.timer = 0;
        state.boards[win.id]--;
        sfx(state, { name: "board_break", x: z.x, z: z.z });
        fx(state, { type: "impact", at: [cellCenter(win.cx), 1.3, cellCenter(win.cz)], kind: "splinter" });
      }
      return;
    }
    z.state = "climbing";
    z.timer = 0;
    return;
  }

  if (z.state === "climbing") {
    z.timer += dt;
    const t = Math.min(1, z.timer / 1.1);
    const ox = cellCenter(win.outside[0]);
    const oz = cellCenter(win.outside[1]);
    z.x = ox + (cellCenter(win.inside[0]) - ox) * t;
    z.z = oz + (cellCenter(win.inside[1]) - oz) * t;
    z.anim += dt * 3;
    if (t >= 1) z.state = "inside";
    return;
  }

  // Inside: hunt the player.
  if (!playerUp) {
    z.anim += walkToward(z, z.x + Math.sin(z.yaw), z.z + Math.cos(z.yaw), 0.3, dt);
    return;
  }
  if (dist < ATTACK_REACH && z.cooldown <= 0 && z.attack <= 0) {
    z.attack = 0.38;
    z.yaw = Math.atan2(p.x - z.x, p.z - z.z);
    sfx(state, { name: "attack", x: z.x, z: z.z });
  }
  if (dist < ATTACK_REACH * 0.8) return; // close enough: stand and swing
  const blocked = walkerBlocked(state);
  let tx = p.x;
  let tz = p.z;
  if (!clearLine(blocked, z.x, z.z, p.x, p.z, ZOMBIE_RADIUS)) {
    // Follow the flow field: step to the neighbouring cell nearest the player.
    const field = playerFlow(state);
    const cx = cellOf(z.x);
    const cz = cellOf(z.z);
    const here = field[cz * ARENA.w + cx];
    let best = here >= 0 ? here : Infinity;
    let bx = cx;
    let bz = cz;
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dz) continue;
        const nx = cx + dx;
        const nz = cz + dz;
        if (nx < 0 || nz < 0 || nx >= ARENA.w || nz >= ARENA.h) continue;
        // Never cut a corner diagonally.
        if (dx && dz && (blocked(cx + dx, cz) || blocked(cx, cz + dz))) continue;
        const v = field[nz * ARENA.w + nx];
        if (v >= 0 && v + (dx && dz ? 0.4 : 0) < best) {
          best = v + (dx && dz ? 0.4 : 0);
          bx = nx;
          bz = nz;
        }
      }
    }
    tx = cellCenter(bx);
    tz = cellCenter(bz);
  }
  const speed = z.speed * slow * (z.attack > 0 ? 0.35 : 1);
  z.anim += walkToward(z, tx, tz, speed, dt) * 2.2;
}

/** Keep zombies from stacking into one body, and out of the walls. */
function separate(state: GameState) {
  const inside = state.zombies.filter((z) => z.state === "inside");
  const min = ZOMBIE_RADIUS * 2;
  for (let i = 0; i < inside.length; i++) {
    for (let j = i + 1; j < inside.length; j++) {
      const a = inside[i];
      const b = inside[j];
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const d = Math.hypot(dx, dz);
      if (d >= min || d < 1e-6) continue;
      const push = (min - d) / 2;
      a.x -= (dx / d) * push;
      a.z -= (dz / d) * push;
      b.x += (dx / d) * push;
      b.z += (dz / d) * push;
    }
  }
  const blocked = walkerBlocked(state);
  for (const z of inside) {
    const c = collideCircle(blocked, z.x, z.z, ZOMBIE_RADIUS);
    z.x = c.x;
    z.z = c.z;
  }
}

// ---------------------------------------------------------------- grenades and power-ups

function explode(state: GameState, g: Grenade) {
  const R = 5.5;
  const p = state.player;
  sfx(state, { name: "explosion", x: g.x, z: g.z });
  fx(state, { type: "explosion", at: [g.x, g.y, g.z] });
  state.shake = Math.max(state.shake, 0.9 * Math.max(0, 1 - Math.hypot(p.x - g.x, p.z - g.z) / 18));
  const blocked = bulletBlocked(state);
  const dmg = 260 + 110 * state.round;
  for (const z of state.zombies) {
    if (!alive(z)) continue;
    const d = Math.hypot(z.x - g.x, z.z - g.z);
    if (d > R || !clearLine(blocked, g.x, g.z, z.x, z.z)) continue;
    damageZombie(state, z, dmg * (1 - (d / R) * 0.55), "body", "grenade");
  }
  const pd = Math.hypot(p.x - g.x, p.z - g.z);
  if (pd < 3.5 && clearLine(blocked, g.x, g.z, p.x, p.z)) hurtPlayer(state, 45 * (1 - pd / 3.5));
}

function updateGrenades(state: GameState, dt: number) {
  const blocked = bulletBlocked(state);
  for (const g of state.grenades) {
    g.fuse -= dt;
    g.vy -= 16 * dt;
    const nx = g.x + g.vx * dt;
    if (blocked(cellOf(nx), cellOf(g.z))) g.vx = -g.vx * 0.45;
    else g.x = nx;
    const nz = g.z + g.vz * dt;
    if (blocked(cellOf(g.x), cellOf(nz))) g.vz = -g.vz * 0.45;
    else g.z = nz;
    g.y += g.vy * dt;
    if (g.y < 0.08) {
      g.y = 0.08;
      g.vy = Math.abs(g.vy) > 1.5 ? -g.vy * 0.35 : 0;
      g.vx *= 0.5;
      g.vz *= 0.5;
    }
    if (g.y <= 0.12) {
      // Rolling to a stop.
      const f = Math.exp(-6 * dt);
      g.vx *= f;
      g.vz *= f;
    }
    if (g.y > WALL_HEIGHT - 0.1) {
      g.y = WALL_HEIGHT - 0.1;
      g.vy = -Math.abs(g.vy) * 0.3;
    }
    if (g.fuse <= 0) explode(state, g);
  }
  state.grenades = state.grenades.filter((g) => g.fuse > 0);
}

function collectDrop(state: GameState, d: Drop) {
  const p = state.player;
  sfx(state, { name: "powerup" });
  banner(state, POWER_UPS[d.kind].name, "info");
  if (d.kind === "max_ammo") {
    for (const w of p.weapons) w.reserve = reserveSize(w);
    p.grenades = 4;
  } else if (d.kind === "insta_kill") {
    state.insta = POWER_UP_SECONDS;
  } else if (d.kind === "double_points") {
    state.double = POWER_UP_SECONDS;
  } else if (d.kind === "nuke") {
    for (const z of state.zombies) if (alive(z)) damageZombie(state, z, z.hp, "body", "nuke");
    earn(state, 400);
    fx(state, { type: "explosion", at: [p.x, 6, p.z] });
  } else if (d.kind === "carpenter") {
    const zones = openZones(state);
    ARENA.windows.forEach((w, i) => {
      if (zones.has(w.zone)) state.boards[i] = MAX_BOARDS;
    });
    earn(state, 200);
    sfx(state, { name: "board_fix" });
  }
}

// ---------------------------------------------------------------- the main step

export function step(state: GameState, input: Input, dt: number, actions: readonly Action[] = []) {
  state.time += dt;
  state.shake = Math.max(0, state.shake - dt * 2.2);
  const p = state.player;
  if (state.banner) {
    state.banner.age += dt;
    if (state.banner.age > 3.2) state.banner = null;
  }
  for (const pop of state.popups) pop.age += dt;
  state.popups = state.popups.filter((x) => x.age < 1.3);

  if (state.phase === "over") {
    for (const z of state.zombies) updateZombie(state, z, dt);
    return;
  }

  // ---- the player
  p.kick = Math.max(0, p.kick - p.kick * 9 * dt);
  p.cooldown = Math.max(0, p.cooldown - dt);
  p.fireBuffer = Math.max(0, p.fireBuffer - dt);
  p.melee = Math.max(0, p.melee - dt);
  p.drink = Math.max(0, p.drink - dt);
  if (p.swap > 0) p.swap = Math.max(0, p.swap - dt);
  if (p.reload > 0) {
    p.reload -= dt;
    if (p.reload <= 0) {
      p.reload = 0;
      finishReload(state);
    }
  }

  if (p.downed > 0) {
    p.downed -= dt;
    p.vx = p.vz = 0;
    p.moving = false;
    if (p.downed <= 0) {
      p.downed = 0;
      p.hp = p.maxHp;
      p.hurtAt = state.time - 99;
      sfx(state, { name: "revive" });
    }
  } else {
    movePlayer(state, input, dt);
    if (p.drink <= 0) {
      for (const a of actions) {
        if (a === "fire") p.fireBuffer = 0.25;
        else if (a === "use") interact(state);
        else if (a === "reload") startReload(state);
        else if (a === "swap") swapWeapon(state);
        else if (a === "grenade") throwGrenade(state);
        else if (a === "melee") knife(state);
      }
      const w = currentWeapon(state);
      const wantsFire = p.fireBuffer > 0 || (input.fire && !!w && WEAPONS[w.id].auto);
      if (wantsFire) fireWeapon(state);
    }
    // Aim down sights.
    const canAim = input.aim && !p.sprinting && p.reload <= 0 && p.swap <= 0 && p.drink <= 0 && p.melee <= 0 && !!currentWeapon(state);
    p.ads = Math.max(0, Math.min(1, p.ads + (canAim ? 1 : -1) * dt / 0.17));
    // Rebuild a window while holding Use.
    const t = input.use ? interactTarget(state) : null;
    if (t?.kind === "window" && !state.zombies.some((z) => z.windowId === t.window && z.state === "climbing")) {
      p.repair += dt;
      if (p.repair >= 0.55) {
        p.repair = 0;
        state.boards[t.window]++;
        sfx(state, { name: "board_fix" });
        if (state.repairPoints < REPAIR_POINTS_CAP) {
          state.repairPoints += 10;
          earn(state, 10);
        }
      }
    } else {
      p.repair = 0;
    }
    // Health comes back a couple of seconds after the last hit.
    if (state.time - p.hurtAt > 2.4) p.hp = Math.min(p.maxHp, p.hp + 70 * dt);
  }

  // ---- rounds
  if (state.phase === "intermission") {
    state.phaseTimer -= dt;
    if (state.phaseTimer <= 0) {
      state.round++;
      state.phase = "active";
      state.toSpawn = zombiesForRound(state.round);
      state.spawnTimer = 1;
      state.dropsThisRound = 0;
      state.repairPoints = 0;
      if (state.round > 1) p.grenades = Math.min(4, p.grenades + 2);
      sfx(state, { name: "round_start" });
      banner(state, `Round ${state.round}`, "round");
    }
  } else if (state.phase === "active") {
    state.spawnTimer -= dt;
    const living = state.zombies.reduce((n, z) => n + (alive(z) ? 1 : 0), 0);
    if (state.toSpawn > 0 && state.spawnTimer <= 0 && living < MAX_ALIVE) {
      spawnZombie(state);
      state.toSpawn--;
      state.spawnTimer = spawnInterval(state.round);
    }
    if (state.toSpawn === 0 && living === 0) {
      state.phase = "intermission";
      state.phaseTimer = INTERMISSION;
      sfx(state, { name: "round_end" });
      banner(state, `Round ${state.round} survived`, "round", "Rebuild, restock, get ready");
    }
  }

  // ---- zombies
  for (const z of state.zombies) updateZombie(state, z, dt);
  separate(state);
  state.zombies = state.zombies.filter((z) => z.state !== "dead" || z.timer < 5);
  state.groanTimer += dt;
  const living = state.zombies.filter(alive);
  if (living.length && state.groanTimer > 2.2 + rand(state) * 2.5) {
    state.groanTimer = 0;
    const z = living[Math.floor(rand(state) * living.length)];
    sfx(state, { name: "groan", x: z.x, z: z.z });
  }

  // ---- grenades, power-ups, machines
  updateGrenades(state, dt);
  state.insta = Math.max(0, state.insta - dt);
  state.double = Math.max(0, state.double - dt);
  for (const d of state.drops) {
    d.age += dt;
    if (p.downed <= 0 && Math.hypot(d.x - p.x, d.z - p.z) < 1.3) {
      collectDrop(state, d);
      d.age = 999;
    }
  }
  state.drops = state.drops.filter((d) => d.age < 26);

  const b = state.box;
  if (b.state === "spinning") {
    b.timer -= dt;
    if (b.timer <= 0) {
      if (b.weapon) {
        b.state = "ready";
        b.timer = 8;
      } else {
        b.state = "leaving";
        b.timer = 4;
        p.points += BOX_COST; // your money back
        sfx(state, { name: "box_leave" });
        banner(state, "The box flew away", "info", "Your points were refunded. Find where it landed.");
      }
    }
  } else if (b.state === "ready") {
    b.timer -= dt;
    if (b.timer <= 0) {
      b.state = "idle";
      b.weapon = null;
    }
  } else if (b.state === "leaving") {
    b.timer -= dt;
    if (b.timer <= 0) {
      const others = ARENA.spots.filter((s) => s.kind === "box" && s.id !== b.spot);
      b.spot = others[Math.floor(rand(state) * others.length)]?.id ?? b.spot;
      b.state = "idle";
      b.uses = 0;
      state.mapVersion++;
    }
  }
  const u = state.upgrade;
  if (u.state === "working") {
    u.timer -= dt;
    if (u.timer <= 0) {
      u.state = "ready";
      u.timer = 12;
    }
  } else if (u.state === "ready") {
    u.timer -= dt;
    if (u.timer <= 0) {
      u.state = "idle";
      u.weapon = null; // left too long: it's gone
    }
  }
}

function movePlayer(state: GameState, input: Input, dt: number) {
  const p = state.player;
  const w = currentWeapon(state);
  let mx = 0;
  let mz = 0;
  if (input.forward) mz += 1;
  if (input.back) mz -= 1;
  if (input.left) mx += 1;
  if (input.right) mx -= 1;
  const len = Math.hypot(mx, mz);
  p.moving = len > 0;
  // Sprint: forward only, not while aiming; stamina runs out and comes back.
  const canSprint = input.sprint && input.forward && p.stamina > 0.05 && p.ads < 0.3 && p.drink <= 0;
  p.sprinting = canSprint;
  const maxSt = maxStamina(state);
  if (p.sprinting) p.stamina = Math.max(0, p.stamina - dt);
  else p.stamina = Math.min(maxSt, p.stamina + dt * (p.moving ? 0.8 : 1.4));
  let speed = p.sprinting ? 6.2 : 4.0;
  speed *= 1 - p.ads * 0.38;
  speed *= w ? WEAPONS[w.id].move : 1;
  if (hasPerk(state, "step")) speed *= 1.07;
  if (p.drink > 0) speed *= 0.6;
  const sin = Math.sin(p.yaw);
  const cos = Math.cos(p.yaw);
  // Forward is (sin yaw, cos yaw); strafing left is (cos yaw, -sin yaw).
  const tx = len ? ((mz * sin + mx * cos) / len) * speed : 0;
  const tz = len ? ((mz * cos - mx * sin) / len) * speed : 0;
  const k = 1 - Math.exp(-14 * dt);
  p.vx += (tx - p.vx) * k;
  p.vz += (tz - p.vz) * k;
  const c = collideCircle(walkerBlocked(state), p.x + p.vx * dt, p.z + p.vz * dt, PLAYER_RADIUS);
  p.x = c.x;
  p.z = c.z;
  // A hop, for feel. The arena is flat, so it never gets you anywhere zombies can't.
  if (input.jump && p.y <= 0 && p.vy <= 0) p.vy = 4.4;
  p.vy -= 14 * dt;
  p.y = Math.max(0, p.y + p.vy * dt);
  if (p.y <= 0) p.vy = Math.max(0, p.vy);
}

/** Fraction of the round done, for the HUD. */
export function roundProgress(state: GameState): { left: number; total: number } {
  const total = zombiesForRound(Math.max(1, state.round));
  const left = state.toSpawn + state.zombies.filter(alive).length;
  return { left, total };
}
