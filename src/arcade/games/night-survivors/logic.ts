// Night Survivors rules, pure and seeded: you only move; weapons fire on their own. Hordes spawn off-screen over a
// 15-minute night, drop XP gems, and each level-up offers three cards (new weapons or upgrades, within the six
// weapon and six passive slots). Bosses at 5 and 10 minutes drop a chest that evolves a maxed weapon whose partner
// passive you own. A spatial grid keeps hundreds of enemies cheap.
import { mulberry32, type Rng } from "../../kit/rng";

export const RUN_LENGTH = 15 * 60;
export const MAX_WEAPONS = 6;
export const MAX_PASSIVES = 6;
export const MAX_LEVEL = 5;
export const MAX_ENEMIES = 420;
const CELL = 64;

export type WeaponId = "whip" | "bolt" | "books" | "garlic" | "axe" | "lightning" | "water" | "cross";
export type PassiveId = "speed" | "might" | "area" | "cooldown" | "magnet" | "maxhp";
export type EnemyKind = "bat" | "zombie" | "skeleton" | "ghost" | "brute" | "boss";

export const WEAPONS: Record<WeaponId, { name: string; icon: string; blurb: string; evolveWith: PassiveId | null; evolvedName: string }> = {
  whip: { name: "Whip", icon: "〰️", blurb: "Lashes left and right in front of you.", evolveWith: "maxhp", evolvedName: "Crimson Lash" },
  bolt: { name: "Magic Bolt", icon: "✨", blurb: "Fires at the nearest enemy.", evolveWith: "cooldown", evolvedName: "Star Storm" },
  books: { name: "Orbit Books", icon: "📘", blurb: "Books circle around you.", evolveWith: null, evolvedName: "" },
  garlic: { name: "Garlic", icon: "🧄", blurb: "Hurts every enemy close to you.", evolveWith: "magnet", evolvedName: "Soul Ward" },
  axe: { name: "Axe", icon: "🪓", blurb: "Thrown high, falls through crowds.", evolveWith: null, evolvedName: "" },
  lightning: { name: "Lightning", icon: "⚡", blurb: "Strikes random enemies on screen.", evolveWith: null, evolvedName: "" },
  water: { name: "Holy Water", icon: "💧", blurb: "Leaves a burning puddle.", evolveWith: null, evolvedName: "" },
  cross: { name: "Cross", icon: "✝️", blurb: "A boomerang that pierces and returns.", evolveWith: null, evolvedName: "" },
};

export const PASSIVES: Record<PassiveId, { name: string; icon: string; blurb: string }> = {
  speed: { name: "Swift Boots", icon: "👟", blurb: "+10% move speed" },
  might: { name: "Might", icon: "💪", blurb: "+10% damage" },
  area: { name: "Reach", icon: "🌀", blurb: "+10% area" },
  cooldown: { name: "Hourglass", icon: "⏳", blurb: "−8% cooldown" },
  magnet: { name: "Magnet", icon: "🧲", blurb: "+35% pickup range" },
  maxhp: { name: "Vitality", icon: "❤️", blurb: "+20 max health" },
};

const ENEMY: Record<EnemyKind, { hp: number; speed: number; r: number; dmg: number; xp: number }> = {
  bat: { hp: 6, speed: 95, r: 9, dmg: 3, xp: 1 },
  zombie: { hp: 16, speed: 42, r: 12, dmg: 5, xp: 1 },
  skeleton: { hp: 30, speed: 60, r: 12, dmg: 7, xp: 2 },
  ghost: { hp: 22, speed: 75, r: 11, dmg: 6, xp: 2 },
  brute: { hp: 140, speed: 34, r: 20, dmg: 12, xp: 5 },
  boss: { hp: 3500, speed: 48, r: 36, dmg: 20, xp: 50 },
};

/** Base stats per level (index 0 = level 1) and how often each weapon fires. */
export function weaponStats(id: WeaponId, level: number, evolved: boolean) {
  const L = Math.max(1, Math.min(MAX_LEVEL, level)) - 1;
  const base = {
    whip: { dmg: 14 + L * 6, cd: 1.1, count: 2, area: 1 + L * 0.12 },
    bolt: { dmg: 10 + L * 3, cd: 1.0 - L * 0.08, count: 1 + Math.floor(L / 2), area: 1 },
    books: { dmg: 8 + L * 3, cd: 0, count: 1 + L, area: 1 + L * 0.08 },
    garlic: { dmg: 3 + L * 1.5, cd: 0.35, count: 1, area: 1 + L * 0.15 },
    axe: { dmg: 22 + L * 8, cd: 1.6, count: 1 + Math.floor(L / 2), area: 1 },
    lightning: { dmg: 25 + L * 8, cd: 2.2 - L * 0.15, count: 1 + Math.floor(L / 2), area: 1 },
    water: { dmg: 6 + L * 2, cd: 3.2, count: 1 + Math.floor(L / 3), area: 1 + L * 0.12 },
    cross: { dmg: 18 + L * 6, cd: 1.8, count: 1 + Math.floor(L / 3), area: 1 },
  }[id];
  if (evolved) return { ...base, dmg: base.dmg * 2, cd: base.cd * 0.5, count: base.count + 1, area: base.area * 1.25 };
  return base;
}

export const xpForLevel = (level: number) => Math.round(4 + level * 4 + level * level * 0.3);

export interface Enemy {
  id: number;
  kind: EnemyKind;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  flash: number;
  /** Per-enemy cooldown for continuous hitters (books, garlic, puddles). */
  hitT: number;
  dead: boolean;
}

export interface Gem { x: number; y: number; v: number; dead: boolean }
export interface Pickup { x: number; y: number; kind: "chicken" | "magnet" | "gold" | "chest"; dead: boolean }
export interface Proj {
  kind: "bolt" | "axe" | "cross";
  x: number;
  y: number;
  vx: number;
  vy: number;
  dmg: number;
  life: number;
  pierce: number;
  hit: Set<number>;
  r: number;
}
export interface Effect { kind: "whip" | "bolt-hit" | "lightning" | "water"; x: number; y: number; t: number; dir: number; r: number; dmg: number; dead: boolean }

export interface Upgrades { might: number; health: number; speed: number }

export interface SurvState {
  rng: Rng;
  time: number;
  px: number;
  py: number;
  face: number;
  hp: number;
  level: number;
  xp: number;
  kills: number;
  gold: number;
  weapons: { id: WeaponId; level: number; t: number; evolved: boolean }[];
  passives: { id: PassiveId; level: number }[];
  enemies: Enemy[];
  gems: Gem[];
  pickups: Pickup[];
  projs: Proj[];
  effects: Effect[];
  /** Pending level-ups: each one shows a choice of cards. */
  pendingLevels: number;
  spawnAcc: number;
  bossesSpawned: number;
  over: boolean;
  won: boolean;
  nextId: number;
  invuln: number;
  upgrades: Upgrades;
  grid: Map<number, Enemy[]>;
}

export function newRun(seed: number, upgrades: Upgrades = { might: 0, health: 0, speed: 0 }): SurvState {
  const s: SurvState = {
    rng: mulberry32(seed), time: 0, px: 0, py: 0, face: 0, hp: 0, level: 1, xp: 0, kills: 0, gold: 0,
    weapons: [{ id: "whip", level: 1, t: 0.5, evolved: false }], passives: [], enemies: [], gems: [], pickups: [], projs: [], effects: [],
    pendingLevels: 0, spawnAcc: 0, bossesSpawned: 0, over: false, won: false, nextId: 1, invuln: 0, upgrades, grid: new Map(),
  };
  s.hp = maxHp(s);
  return s;
}

const plevel = (s: SurvState, id: PassiveId) => s.passives.find((p) => p.id === id)?.level ?? 0;
export const maxHp = (s: SurvState) => 100 + plevel(s, "maxhp") * 20 + s.upgrades.health * 10;
export const moveSpeed = (s: SurvState) => 150 * (1 + plevel(s, "speed") * 0.1 + s.upgrades.speed * 0.05);
const might = (s: SurvState) => 1 + plevel(s, "might") * 0.1 + s.upgrades.might * 0.05;
const areaMul = (s: SurvState) => 1 + plevel(s, "area") * 0.1;
const cdMul = (s: SurvState) => Math.max(0.4, 1 - plevel(s, "cooldown") * 0.08);
export const magnetRange = (s: SurvState) => 60 * (1 + plevel(s, "magnet") * 0.35);

// ---------------------------------------------------------------- spawning

/** How many enemies the night wants on screen at time t, and which kinds can appear. */
export function waveAt(t: number) {
  const m = t / 60;
  const target = Math.min(MAX_ENEMIES - 20, Math.round(12 + m * 18 + m * m * 0.7));
  const kinds: EnemyKind[] = ["bat"];
  if (m >= 1) kinds.push("zombie");
  if (m >= 3) kinds.push("skeleton");
  if (m >= 5) kinds.push("ghost");
  if (m >= 7) kinds.push("brute");
  return { target, kinds, hpMul: 1 + m * 0.18 };
}

function spawnEnemy(s: SurvState, kind: EnemyKind, hpMul: number) {
  const a = s.rng() * Math.PI * 2;
  const d = 520 + s.rng() * 120;
  const def = ENEMY[kind];
  const hp = def.hp * (kind === "boss" ? 1 + s.bossesSpawned * 0.8 : hpMul);
  s.enemies.push({ id: s.nextId++, kind, x: s.px + Math.cos(a) * d, y: s.py + Math.sin(a) * d, hp, maxHp: hp, flash: 0, hitT: 0, dead: false });
}

// ---------------------------------------------------------------- grid

const key = (cx: number, cy: number) => (cx & 0xffff) * 65536 + (cy & 0xffff);

export function buildGrid(s: SurvState) {
  s.grid.clear();
  for (const e of s.enemies) {
    if (e.dead) continue;
    const k = key(Math.floor(e.x / CELL), Math.floor(e.y / CELL));
    let list = s.grid.get(k);
    if (!list) s.grid.set(k, (list = []));
    list.push(e);
  }
}

/** Enemies within r of (x, y), using the grid. */
export function nearby(s: SurvState, x: number, y: number, r: number, out: Enemy[] = []): Enemy[] {
  out.length = 0;
  const c0x = Math.floor((x - r) / CELL);
  const c1x = Math.floor((x + r) / CELL);
  const c0y = Math.floor((y - r) / CELL);
  const c1y = Math.floor((y + r) / CELL);
  for (let cx = c0x; cx <= c1x; cx++) {
    for (let cy = c0y; cy <= c1y; cy++) {
      const list = s.grid.get(key(cx, cy));
      if (!list) continue;
      for (const e of list) if (!e.dead && (e.x - x) ** 2 + (e.y - y) ** 2 <= (r + ENEMY[e.kind].r) ** 2) out.push(e);
    }
  }
  return out;
}

const scratch: Enemy[] = [];

// ---------------------------------------------------------------- combat

export type SurvEvent =
  | { type: "hit"; x: number; y: number; dmg: number }
  | { type: "kill"; x: number; y: number; kind: EnemyKind }
  | { type: "hurt" }
  | { type: "levelup" }
  | { type: "pickup"; kind: Pickup["kind"] }
  | { type: "boss" }
  | { type: "evolve"; id: WeaponId }
  | { type: "fire"; id: WeaponId };

function damage(s: SurvState, e: Enemy, dmg: number, ev: SurvEvent[]) {
  if (e.dead) return;
  e.hp -= dmg;
  e.flash = 0.12;
  ev.push({ type: "hit", x: e.x, y: e.y, dmg });
  if (e.hp <= 0) {
    e.dead = true;
    s.kills++;
    ev.push({ type: "kill", x: e.x, y: e.y, kind: e.kind });
    s.gems.push({ x: e.x, y: e.y, v: ENEMY[e.kind].xp, dead: false });
    const r = s.rng();
    if (e.kind === "boss") s.pickups.push({ x: e.x, y: e.y, kind: "chest", dead: false });
    else if (r < 0.006) s.pickups.push({ x: e.x, y: e.y, kind: "chicken", dead: false });
    else if (r < 0.009) s.pickups.push({ x: e.x, y: e.y, kind: "magnet", dead: false });
    else if (r < 0.05) s.pickups.push({ x: e.x, y: e.y, kind: "gold", dead: false });
    // Crimson Lash heals a little on every kill.
    if (s.weapons.some((w) => w.id === "whip" && w.evolved)) s.hp = Math.min(maxHp(s), s.hp + 1);
  }
}

function nearest(s: SurvState): Enemy | null {
  let best: Enemy | null = null;
  let bd = Infinity;
  for (const e of s.enemies) {
    if (e.dead) continue;
    const d = (e.x - s.px) ** 2 + (e.y - s.py) ** 2;
    if (d < bd) {
      bd = d;
      best = e;
    }
  }
  return best;
}

function fireWeapon(s: SurvState, w: SurvState["weapons"][number], ev: SurvEvent[]) {
  const st = weaponStats(w.id, w.level, w.evolved);
  const dmg = st.dmg * might(s);
  const area = st.area * areaMul(s);
  switch (w.id) {
    case "whip":
      for (let i = 0; i < st.count; i++) {
        const dir = i === 0 ? s.face : s.face + Math.PI;
        s.effects.push({ kind: "whip", x: s.px, y: s.py, t: 0.25, dir, r: 110 * area, dmg, dead: false });
        for (const e of nearby(s, s.px + Math.cos(dir) * 60 * area, s.py, 60 * area, scratch)) damage(s, e, dmg, ev);
      }
      break;
    case "bolt": {
      for (let i = 0; i < st.count; i++) {
        const t = nearest(s);
        const a = t ? Math.atan2(t.y - s.py, t.x - s.px) + (i - (st.count - 1) / 2) * 0.15 : s.face;
        s.projs.push({ kind: "bolt", x: s.px, y: s.py, vx: Math.cos(a) * 420, vy: Math.sin(a) * 420, dmg, life: 1.4, pierce: w.evolved ? 3 : 1, hit: new Set(), r: 7 });
      }
      break;
    }
    case "axe":
      for (let i = 0; i < st.count; i++) {
        const vx = (s.rng() - 0.5) * 260 + (i - (st.count - 1) / 2) * 90;
        s.projs.push({ kind: "axe", x: s.px, y: s.py, vx, vy: -480, dmg, life: 2.2, pierce: 99, hit: new Set(), r: 14 * area });
      }
      break;
    case "cross":
      for (let i = 0; i < st.count; i++) {
        const t = nearest(s);
        const a = t ? Math.atan2(t.y - s.py, t.x - s.px) + i * 0.5 : s.face;
        s.projs.push({ kind: "cross", x: s.px, y: s.py, vx: Math.cos(a) * 520, vy: Math.sin(a) * 520, dmg, life: 2, pierce: 99, hit: new Set(), r: 14 * area });
      }
      break;
    case "lightning": {
      const onScreen = s.enemies.filter((e) => !e.dead && Math.abs(e.x - s.px) < 420 && Math.abs(e.y - s.py) < 320);
      for (let i = 0; i < st.count && onScreen.length; i++) {
        const e = onScreen[Math.floor(s.rng() * onScreen.length)];
        s.effects.push({ kind: "lightning", x: e.x, y: e.y, t: 0.3, dir: 0, r: 40 * area, dmg, dead: false });
        for (const n of nearby(s, e.x, e.y, 40 * area, scratch)) damage(s, n, dmg, ev);
      }
      break;
    }
    case "water":
      for (let i = 0; i < st.count; i++) {
        const t = nearest(s);
        const x = t ? t.x : s.px + (s.rng() - 0.5) * 200;
        const y = t ? t.y : s.py + (s.rng() - 0.5) * 200;
        s.effects.push({ kind: "water", x: x + (s.rng() - 0.5) * 60 * i, y: y + (s.rng() - 0.5) * 60 * i, t: 2.5, dir: 0, r: 46 * area, dmg, dead: false });
      }
      break;
    default:
      break;
  }
  ev.push({ type: "fire", id: w.id });
}

/** Advance the night by dt seconds; `mx, my` is the movement input (−1..1 each). */
export function step(s: SurvState, dt: number, mx: number, my: number): SurvEvent[] {
  const ev: SurvEvent[] = [];
  if (s.over || s.pendingLevels > 0) return ev;
  s.time += dt;
  if (s.time >= RUN_LENGTH) {
    s.over = true;
    s.won = true;
    return ev;
  }
  // Move.
  const len = Math.hypot(mx, my);
  if (len > 0.05) {
    const k = Math.min(1, len);
    s.px += (mx / len) * k * moveSpeed(s) * dt;
    s.py += (my / len) * k * moveSpeed(s) * dt;
    if (Math.abs(mx) > 0.1) s.face = mx > 0 ? 0 : Math.PI;
  }
  s.invuln = Math.max(0, s.invuln - dt);

  // Spawn toward the night's target count, plus bosses at 5 and 10 minutes.
  const wave = waveAt(s.time);
  const alive = s.enemies.length;
  if (alive < wave.target) {
    s.spawnAcc += dt * (4 + s.time / 30);
    while (s.spawnAcc >= 1 && s.enemies.length < MAX_ENEMIES) {
      s.spawnAcc -= 1;
      spawnEnemy(s, wave.kinds[Math.floor(s.rng() * wave.kinds.length)], wave.hpMul);
    }
  }
  const bossesDue = Math.floor(s.time / 300);
  if (bossesDue > s.bossesSpawned && bossesDue <= 2) {
    s.bossesSpawned++;
    spawnEnemy(s, "boss", 1);
    ev.push({ type: "boss" });
  }

  buildGrid(s);

  // Enemies walk toward you and push apart (ghosts drift through the crowd).
  for (const e of s.enemies) {
    if (e.dead) continue;
    const def = ENEMY[e.kind];
    const dx = s.px - e.x;
    const dy = s.py - e.y;
    const d = Math.hypot(dx, dy) || 1;
    e.x += (dx / d) * def.speed * dt;
    e.y += (dy / d) * def.speed * dt;
    e.flash = Math.max(0, e.flash - dt);
    e.hitT = Math.max(0, e.hitT - dt);
    if (e.kind !== "ghost") {
      for (const o of nearby(s, e.x, e.y, def.r, scratch)) {
        if (o === e || o.kind === "ghost") continue;
        const ox = e.x - o.x;
        const oy = e.y - o.y;
        const od = Math.hypot(ox, oy) || 0.01;
        const min = def.r + ENEMY[o.kind].r;
        if (od < min) {
          const push = ((min - od) / od) * 0.25;
          e.x += ox * push;
          e.y += oy * push;
        }
      }
    }
    if (d < def.r + 14 && s.invuln <= 0) {
      s.hp -= def.dmg;
      s.invuln = 0.6;
      ev.push({ type: "hurt" });
      if (s.hp <= 0) {
        s.over = true;
        return ev;
      }
    }
    // Recycle enemies left far behind.
    if (d > 900 && e.kind !== "boss") {
      const a = Math.atan2(dy, dx) + Math.PI + (s.rng() - 0.5);
      e.x = s.px - Math.cos(a) * 560;
      e.y = s.py - Math.sin(a) * 560;
    }
  }

  // Weapons.
  for (const w of s.weapons) {
    const st = weaponStats(w.id, w.level, w.evolved);
    if (w.id === "books") {
      const r = 80 * st.area * areaMul(s);
      for (let i = 0; i < st.count; i++) {
        const a = s.time * 3 + (i / st.count) * Math.PI * 2;
        const bx = s.px + Math.cos(a) * r;
        const by = s.py + Math.sin(a) * r;
        for (const e of nearby(s, bx, by, 14, scratch)) if (e.hitT <= 0) {
          damage(s, e, st.dmg * might(s), ev);
          e.hitT = 0.5;
        }
      }
      continue;
    }
    if (w.id === "garlic") {
      w.t -= dt;
      if (w.t <= 0) {
        w.t = st.cd;
        for (const e of nearby(s, s.px, s.py, 55 * st.area * areaMul(s) * (w.evolved ? 1.4 : 1), scratch)) damage(s, e, st.dmg * might(s), ev);
      }
      continue;
    }
    w.t -= dt;
    if (w.t <= 0) {
      w.t = st.cd * cdMul(s);
      fireWeapon(s, w, ev);
    }
  }

  // Projectiles.
  for (const p of s.projs) {
    p.life -= dt;
    if (p.kind === "axe") p.vy += 900 * dt;
    if (p.kind === "cross") {
      // Slow down, then come back.
      const back = Math.atan2(s.py - p.y, s.px - p.x);
      p.vx += Math.cos(back) * 700 * dt;
      p.vy += Math.sin(back) * 700 * dt;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    for (const e of nearby(s, p.x, p.y, p.r, scratch)) {
      if (p.hit.has(e.id) || p.pierce <= 0) continue;
      p.hit.add(e.id);
      damage(s, e, p.dmg, ev);
      p.pierce--;
    }
  }
  s.projs = s.projs.filter((p) => p.life > 0 && p.pierce > 0);

  // Area effects.
  for (const f of s.effects) {
    f.t -= dt;
    if (f.kind === "water") {
      for (const e of nearby(s, f.x, f.y, f.r, scratch)) if (e.hitT <= 0) {
        damage(s, e, f.dmg, ev);
        e.hitT = 0.4;
      }
    }
    if (f.t <= 0) f.dead = true;
  }
  s.effects = s.effects.filter((f) => !f.dead);
  s.enemies = s.enemies.filter((e) => !e.dead);

  // Gems and pickups: pulled in within the magnet range.
  const mr = magnetRange(s);
  for (const g of s.gems) {
    const dx = s.px - g.x;
    const dy = s.py - g.y;
    const d = Math.hypot(dx, dy);
    if (d < mr) {
      g.x += (dx / d) * 420 * dt;
      g.y += (dy / d) * 420 * dt;
    }
    if (d < 16) {
      g.dead = true;
      gainXp(s, g.v, ev);
    }
  }
  s.gems = s.gems.filter((g) => !g.dead);
  // Too many gems on the ground: merge the far ones into one big gem.
  if (s.gems.length > 400) {
    const far = s.gems.filter((g) => Math.hypot(g.x - s.px, g.y - s.py) > 500);
    if (far.length > 50) {
      const v = far.reduce((n, g) => n + g.v, 0);
      for (const g of far) g.dead = true;
      s.gems = s.gems.filter((g) => !g.dead);
      s.gems.push({ x: far[0].x, y: far[0].y, v, dead: false });
    }
  }
  for (const p of s.pickups) {
    if (Math.hypot(s.px - p.x, s.py - p.y) > 24) continue;
    p.dead = true;
    ev.push({ type: "pickup", kind: p.kind });
    if (p.kind === "chicken") s.hp = Math.min(maxHp(s), s.hp + 30);
    else if (p.kind === "gold") s.gold += 1;
    else if (p.kind === "magnet") for (const g of s.gems) {
      g.x = s.px;
      g.y = s.py;
    }
    else if (p.kind === "chest") openChest(s, ev);
  }
  s.pickups = s.pickups.filter((p) => !p.dead);
  return ev;
}

export function gainXp(s: SurvState, v: number, ev: SurvEvent[] = []) {
  s.xp += v;
  while (s.xp >= xpForLevel(s.level)) {
    s.xp -= xpForLevel(s.level);
    s.level++;
    s.pendingLevels++;
    ev.push({ type: "levelup" });
  }
}

/** Weapons that can evolve right now: maxed, not yet evolved, with their partner passive owned. */
export function evolvable(s: SurvState): WeaponId[] {
  return s.weapons
    .filter((w) => !w.evolved && w.level >= MAX_LEVEL && WEAPONS[w.id].evolveWith && plevel(s, WEAPONS[w.id].evolveWith!) > 0)
    .map((w) => w.id);
}

export function openChest(s: SurvState, ev: SurvEvent[] = []) {
  const ready = evolvable(s);
  if (ready.length) {
    const w = s.weapons.find((x) => x.id === ready[0])!;
    w.evolved = true;
    ev.push({ type: "evolve", id: w.id });
    return;
  }
  // Nothing to evolve: level up a random owned item that isn't maxed, or give gold.
  const options = offers(s, 8).filter((o) => o.kind !== "gold" && o.kind !== "heal" && o.owned);
  if (options.length) applyOffer(s, options[0]);
  else s.gold += 25;
}

// ---------------------------------------------------------------- level-up cards

export interface Offer {
  kind: "weapon" | "passive" | "gold" | "heal";
  id?: WeaponId | PassiveId;
  owned: boolean;
  nextLevel: number;
}

/** Up to `n` distinct cards: owned items that aren't maxed, and new ones while there are free slots. */
export function offers(s: SurvState, n = 3): Offer[] {
  const pool: Offer[] = [];
  for (const id of Object.keys(WEAPONS) as WeaponId[]) {
    const w = s.weapons.find((x) => x.id === id);
    if (w && w.level < MAX_LEVEL) pool.push({ kind: "weapon", id, owned: true, nextLevel: w.level + 1 });
    if (!w && s.weapons.length < MAX_WEAPONS) pool.push({ kind: "weapon", id, owned: false, nextLevel: 1 });
  }
  for (const id of Object.keys(PASSIVES) as PassiveId[]) {
    const p = s.passives.find((x) => x.id === id);
    if (p && p.level < MAX_LEVEL) pool.push({ kind: "passive", id, owned: true, nextLevel: p.level + 1 });
    if (!p && s.passives.length < MAX_PASSIVES) pool.push({ kind: "passive", id, owned: false, nextLevel: 1 });
  }
  const out: Offer[] = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(s.rng() * pool.length), 1)[0]);
  if (!out.length) out.push({ kind: "heal", owned: false, nextLevel: 0 }, { kind: "gold", owned: false, nextLevel: 0 });
  return out;
}

export function applyOffer(s: SurvState, o: Offer) {
  if (o.kind === "weapon") {
    const w = s.weapons.find((x) => x.id === o.id);
    if (w) w.level = Math.min(MAX_LEVEL, w.level + 1);
    else if (s.weapons.length < MAX_WEAPONS) s.weapons.push({ id: o.id as WeaponId, level: 1, t: 0.3, evolved: false });
  } else if (o.kind === "passive") {
    const p = s.passives.find((x) => x.id === o.id);
    if (p) p.level = Math.min(MAX_LEVEL, p.level + 1);
    else if (s.passives.length < MAX_PASSIVES) s.passives.push({ id: o.id as PassiveId, level: 1 });
    if (o.id === "maxhp") s.hp += 20;
  } else if (o.kind === "heal") s.hp = Math.min(maxHp(s), s.hp + 50);
  else s.gold += 10;
}

/** Choose a card for the next pending level-up. */
export function chooseOffer(s: SurvState, o: Offer) {
  if (s.pendingLevels <= 0) return;
  applyOffer(s, o);
  s.pendingLevels--;
}

// ---------------------------------------------------------------- permanent upgrades

export const SHOP: { id: keyof Upgrades; name: string; blurb: string; max: number }[] = [
  { id: "might", name: "Might", blurb: "+5% damage per rank", max: 5 },
  { id: "health", name: "Health", blurb: "+10 max health per rank", max: 5 },
  { id: "speed", name: "Speed", blurb: "+5% move speed per rank", max: 5 },
];
export const shopCost = (rank: number) => 40 + rank * 40;
