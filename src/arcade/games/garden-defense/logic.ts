// Garden Defense: the rules as pure TypeScript. Horizontal positions are in lawn columns (0 is the house edge, 9 is
// the right-hand hedge), vertical positions in lanes (0 is the top lane). No React, no DOM.
import { mulberry32, type Rng } from "../../kit/rng";
import {
  BITE_DPS, BLAST_DMG, CHERRY_FUSE, COLS, FIRE_EVERY, GNOMES, LANES, LOB_DMG, LOB_EVERY, LOB_TIME, MAX_SUN, MINE_ARM, MOWER_SPEED,
  PEA_DMG, PEA_SPEED, PLANTS, PLANT_ORDER, REACH, SLOW_TIME, SUN_EVERY, SUN_FIRST, SUN_LINGER, SUN_VALUE, VAULT_TIME,
  type GnomeKind, type PlantId,
} from "./defs";
import { LEVELS, type LevelDef } from "./levels";

export interface Plant {
  uid: number;
  kind: PlantId;
  lane: number;
  col: number;
  hp: number;
  maxHp: number;
  /** Seconds until the next shot / sun. */
  t: number;
  /** Cherry fuse left, or mine arming time left. */
  fuse: number;
  age: number;
  /** For the art: time since the last shot or hit, bounces the plant. */
  kick: number;
  hurt: number;
}

export type GnomeState = "walk" | "eat" | "vault" | "die";

export interface Gnome {
  uid: number;
  kind: GnomeKind;
  lane: number;
  x: number;
  hp: number;
  maxHp: number;
  armor: number;
  shield: number;
  state: GnomeState;
  slow: number;
  flash: number;
  bite: number;
  vaultT: number;
  vaultFrom: number;
  vaultTo: number;
  vaulted: boolean;
  dieT: number;
  /** True while the red hat is still on (basic kinds lose it when badly hurt). */
  hat: boolean;
  /** Art: walk cycle phase and a random offset so a crowd doesn't march in step. */
  phase: number;
  mowed: boolean;
}

export interface Proj {
  uid: number;
  kind: "pea" | "frost" | "lob";
  lane: number;
  x: number;
  x0: number;
  x1: number;
  t: number;
  dur: number;
}

export interface Sun {
  uid: number;
  x: number;
  y: number;
  ty: number;
  vy: number;
  grav: boolean;
  value: number;
  /** Seconds it stays once landed. */
  life: number;
  from: "sky" | "plant";
}

export interface Mower {
  lane: number;
  x: number;
  state: "idle" | "run" | "gone";
}

export interface Spawn {
  t: number;
  kind: GnomeKind;
  lane: number;
  wave: number;
}

export type EventType =
  | "plant" | "pea" | "frost-pea" | "lob" | "hit" | "shield-hit" | "shield-break" | "hat" | "gnome-die" | "plant-die" | "bite"
  | "sun-spawn" | "sun-make" | "blast" | "mine-boom" | "mine-armed" | "mower" | "bigwave" | "spawn" | "win" | "lose" | "vault" | "splat";

export interface GameEvent {
  type: EventType;
  lane: number;
  x: number;
  kind?: string;
  /** Extra info: the wave is the final one, or a flag for a mower kill. */
  flag?: boolean;
}

export type Status = "playing" | "won" | "lost";

export interface GameState {
  level: LevelDef;
  levelIndex: number;
  rng: Rng;
  time: number;
  sun: number;
  cool: Record<PlantId, number>;
  plants: Plant[];
  grid: (Plant | null)[];
  gnomes: Gnome[];
  projs: Proj[];
  suns: Sun[];
  mowers: Mower[];
  schedule: Spawn[];
  next: number;
  warnings: { t: number; final: boolean }[];
  skyT: number;
  uid: number;
  status: Status;
  events: GameEvent[];
  killed: number;
  /** Waves whose first gnome has walked on. */
  wavesStarted: number;
  mowersUsed: number;
}

export const cellIndex = (lane: number, col: number) => lane * COLS + col;

/** Build the spawn list for a level: when each gnome walks on and in which lane (lanes are dealt from a shuffled bag). */
export function buildSchedule(level: LevelDef, rng: Rng): Spawn[] {
  const out: Spawn[] = [];
  let bag: number[] = [];
  const dealLane = () => {
    if (!bag.length) {
      bag = [...level.lanes];
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
    }
    return bag.pop()!;
  };
  level.waves.forEach((w, wi) => {
    const list: GnomeKind[] = w.big ? ["flag", ...w.gnomes] : w.gnomes;
    const spread = Math.min(12, 1 + w.gnomes.length * 0.8);
    list.forEach((kind, k) => {
      const t = w.at + (k / list.length) * spread + (k === 0 ? 0 : rng() * 0.8);
      out.push({ t, kind, lane: dealLane(), wave: wi });
    });
  });
  return out.sort((a, b) => a.t - b.t);
}

export function newGame(levelIndex: number, seed = 1): GameState {
  const level = LEVELS[Math.max(0, Math.min(LEVELS.length - 1, levelIndex))];
  const rng = mulberry32(seed);
  const cool = {} as Record<PlantId, number>;
  for (const id of PLANT_ORDER) cool[id] = PLANTS[id].cooldown * PLANTS[id].startCool;
  return {
    level, levelIndex: level.id - 1, rng, time: 0, sun: level.startSun, cool, plants: [], grid: new Array(LANES * COLS).fill(null),
    gnomes: [], projs: [], suns: [], mowers: level.lanes.map((lane) => ({ lane, x: -0.55, state: "idle" as const })),
    schedule: buildSchedule(level, rng), next: 0,
    warnings: level.waves.flatMap((w, i) => (w.big ? [{ t: w.at - 4, final: i === level.waves.length - 1 }] : [])),
    skyT: 4, uid: 1, status: "playing", events: [], killed: 0, wavesStarted: 0, mowersUsed: 0,
  };
}

const ev = (s: GameState, type: EventType, lane: number, x: number, kind?: string, flag?: boolean) => {
  s.events.push({ type, lane, x, kind, flag });
};

// ---------------------------------------------------------------- planting

export type PlantCheck = "ok" | "locked" | "lane" | "occupied" | "sun" | "cooldown" | "over";

export function plantCheck(s: GameState, id: PlantId, lane: number, col: number): PlantCheck {
  if (s.status !== "playing") return "over";
  if (!s.level.plants.includes(id)) return "locked";
  if (!s.level.lanes.includes(lane) || col < 0 || col >= COLS) return "lane";
  if (s.grid[cellIndex(lane, col)]) return "occupied";
  if (s.cool[id] > 0) return "cooldown";
  if (s.sun < PLANTS[id].cost) return "sun";
  return "ok";
}

export function placePlant(s: GameState, id: PlantId, lane: number, col: number): boolean {
  if (plantCheck(s, id, lane, col) !== "ok") return false;
  const d = PLANTS[id];
  s.sun -= d.cost;
  s.cool[id] = d.cooldown;
  const p: Plant = {
    uid: s.uid++, kind: id, lane, col, hp: d.hp, maxHp: d.hp, t: id === "sun" ? SUN_FIRST : id === "lobber" ? 1.2 : 0.8,
    fuse: id === "cherry" ? CHERRY_FUSE : id === "mine" ? MINE_ARM : 0, age: 0, kick: 0, hurt: 0,
  };
  s.plants.push(p);
  s.grid[cellIndex(lane, col)] = p;
  ev(s, "plant", lane, col + 0.5, id);
  return true;
}

export function removePlant(s: GameState, lane: number, col: number): boolean {
  const p = s.grid[cellIndex(lane, col)];
  if (!p || s.status !== "playing") return false;
  dropPlant(s, p);
  return true;
}

function dropPlant(s: GameState, p: Plant) {
  s.grid[cellIndex(p.lane, p.col)] = null;
  const i = s.plants.indexOf(p);
  if (i >= 0) s.plants.splice(i, 1);
}

// ---------------------------------------------------------------- sun

export function collectSun(s: GameState, uid: number): number {
  const i = s.suns.findIndex((u) => u.uid === uid);
  if (i < 0) return 0;
  const v = s.suns[i].value;
  s.suns.splice(i, 1);
  s.sun = Math.min(MAX_SUN, s.sun + v);
  return v;
}

function spawnSun(s: GameState, from: "sky" | "plant", x: number, y: number, ty: number) {
  s.suns.push({
    uid: s.uid++, x, y, ty, vy: from === "sky" ? 0.55 : -1.6, grav: from === "plant", value: SUN_VALUE, life: SUN_LINGER, from,
  });
  ev(s, "sun-spawn", Math.floor(ty), x, from);
}

// ---------------------------------------------------------------- gnomes

function spawnGnome(s: GameState, kind: GnomeKind, lane: number) {
  const d = GNOMES[kind];
  const g: Gnome = {
    uid: s.uid++, kind, lane, x: COLS + 0.6 + s.rng() * 0.3, hp: d.hp, maxHp: d.hp, armor: d.armor, shield: d.shield, state: "walk",
    slow: 0, flash: 0, bite: 0, vaultT: 0, vaultFrom: 0, vaultTo: 0, vaulted: false, dieT: 0,
    hat: kind === "basic" || kind === "flag" || kind === "runner" || kind === "gate" || kind === "vaulter", phase: s.rng() * 6.28, mowed: false,
  };
  s.gnomes.push(g);
  ev(s, "spawn", lane, g.x, kind);
}

/** Current walking speed in columns per second. */
export function gnomeSpeed(g: Gnome): number {
  const base = GNOMES[g.kind].speed;
  // A vaulter sprints until he has used his pole.
  const v = g.kind === "vaulter" && g.vaulted ? GNOMES.basic.speed : base;
  return v * (g.slow > 0 ? 0.5 : 1);
}

export const isAlive = (g: Gnome) => g.state !== "die";
/** Untargetable while flying over a plant. */
const targetable = (g: Gnome) => g.state !== "die" && g.state !== "vault";

export interface HurtOpts {
  /** Came straight down the lane: a gate stops it. */
  frontal?: boolean;
  slow?: boolean;
}

export function hurtGnome(s: GameState, g: Gnome, dmg: number, o: HurtOpts = {}) {
  if (g.state === "die") return;
  g.flash = 0.12;
  if (o.slow) g.slow = SLOW_TIME;
  if (g.shield > 0) {
    if (o.frontal) {
      g.shield -= dmg;
      if (g.shield <= 0) {
        g.shield = 0;
        ev(s, "shield-break", g.lane, g.x, g.kind);
      } else ev(s, "shield-hit", g.lane, g.x, g.kind);
      return;
    }
    // Lobbed and blast damage goes over / through the gate.
    if (dmg >= BLAST_DMG) {
      g.shield = 0;
      ev(s, "shield-break", g.lane, g.x, g.kind);
    }
  }
  let d = dmg;
  if (g.armor > 0) {
    const a = Math.min(g.armor, d);
    g.armor -= a;
    d -= a;
    if (g.armor <= 0) ev(s, "hat", g.lane, g.x, g.kind === "bucket" ? "bucket" : "cone");
  }
  if (d > 0) g.hp -= d;
  if (g.hp <= 0) {
    killGnome(s, g, false);
    return;
  }
  if (g.hat && g.kind !== "cone" && g.kind !== "bucket" && g.hp <= g.maxHp * 0.5) {
    g.hat = false;
    ev(s, "hat", g.lane, g.x, "red");
  }
  ev(s, "hit", g.lane, g.x, g.kind);
}

function killGnome(s: GameState, g: Gnome, mowed: boolean) {
  if (g.state === "die") return;
  g.state = "die";
  g.dieT = mowed ? 0.7 : 0.9;
  g.mowed = mowed;
  g.hp = 0;
  s.killed++;
  ev(s, "gnome-die", g.lane, g.x, g.kind, mowed);
}

function blast(s: GameState, lane0: number, lane1: number, x0: number, x1: number) {
  for (const g of s.gnomes) {
    if (g.state === "die" || g.state === "vault") continue;
    if (g.lane < lane0 || g.lane > lane1 || g.x < x0 || g.x > x1) continue;
    hurtGnome(s, g, BLAST_DMG);
  }
}

// ---------------------------------------------------------------- the step

function nearestAhead(s: GameState, lane: number, col: number): Gnome | null {
  let best: Gnome | null = null;
  for (const g of s.gnomes) {
    if (g.lane !== lane || !targetable(g) || g.x <= col + 0.2 || g.x > COLS + 0.4) continue;
    if (!best || g.x < best.x) best = g;
  }
  return best;
}

function shoot(s: GameState, p: Plant) {
  const target = nearestAhead(s, p.lane, p.col);
  if (!target) return false;
  const x = p.col + 0.7;
  if (p.kind === "lobber") {
    const aim = Math.max(p.col + 1, target.x - gnomeSpeed(target) * LOB_TIME);
    s.projs.push({ uid: s.uid++, kind: "lob", lane: p.lane, x, x0: x, x1: aim, t: 0, dur: LOB_TIME });
    ev(s, "lob", p.lane, x, "lob");
    p.t = LOB_EVERY;
  } else {
    const kind = p.kind === "frost" ? "frost" : "pea";
    s.projs.push({ uid: s.uid++, kind, lane: p.lane, x, x0: x, x1: 0, t: 0, dur: 0 });
    if (p.kind === "twin") s.projs.push({ uid: s.uid++, kind, lane: p.lane, x: x - 0.32, x0: x - 0.32, x1: 0, t: 0, dur: 0 });
    ev(s, kind === "frost" ? "frost-pea" : "pea", p.lane, x, p.kind);
    p.t = FIRE_EVERY;
  }
  p.kick = 0.001;
  return true;
}

function stepPlants(s: GameState, dt: number) {
  for (const p of s.plants.slice()) {
    p.age += dt;
    if (p.kick > 0) p.kick += dt;
    if (p.kick > 0.3) p.kick = 0;
    if (p.hurt > 0) p.hurt = Math.max(0, p.hurt - dt);
    switch (p.kind) {
      case "sun":
        p.t -= dt;
        if (p.t <= 0) {
          p.t = SUN_EVERY;
          const x = p.col + 0.5 + (s.rng() - 0.5) * 0.5;
          spawnSun(s, "plant", x, p.lane + 0.25, p.lane + 0.55 + s.rng() * 0.2);
          ev(s, "sun-make", p.lane, p.col + 0.5, "sun");
        }
        break;
      case "pea": case "frost": case "twin": case "lobber":
        p.t = Math.max(0, p.t - dt);
        if (p.t <= 0) shoot(s, p);
        break;
      case "cherry":
        p.fuse -= dt;
        if (p.fuse <= 0) {
          dropPlant(s, p);
          ev(s, "blast", p.lane, p.col + 0.5, "cherry");
          blast(s, p.lane - 1, p.lane + 1, p.col - 1.0, p.col + 2.3);
        }
        break;
      case "mine": {
        if (p.fuse > 0) {
          p.fuse -= dt;
          if (p.fuse <= 0) ev(s, "mine-armed", p.lane, p.col + 0.5, "mine");
          break;
        }
        const hit = s.gnomes.some((g) => g.lane === p.lane && targetable(g) && g.x - REACH >= p.col - 0.1 && g.x - REACH < p.col + 1);
        if (hit) {
          dropPlant(s, p);
          ev(s, "mine-boom", p.lane, p.col + 0.5, "mine");
          blast(s, p.lane, p.lane, p.col - 0.3, p.col + 1.9);
        }
        break;
      }
      case "nut":
        break;
    }
  }
}

function stepProjs(s: GameState, dt: number) {
  for (let i = s.projs.length - 1; i >= 0; i--) {
    const p = s.projs[i];
    if (p.kind === "lob") {
      p.t += dt;
      p.x = p.x0 + (p.x1 - p.x0) * Math.min(1, p.t / p.dur);
      if (p.t >= p.dur) {
        s.projs.splice(i, 1);
        let best: Gnome | null = null;
        for (const g of s.gnomes) {
          if (g.lane !== p.lane || !targetable(g) || Math.abs(g.x - p.x1) > 0.7) continue;
          if (!best || Math.abs(g.x - p.x1) < Math.abs(best.x - p.x1)) best = g;
        }
        ev(s, "splat", p.lane, p.x1, "lob");
        if (best) hurtGnome(s, best, LOB_DMG);
      }
      continue;
    }
    p.x += PEA_SPEED * dt;
    let hit: Gnome | null = null;
    for (const g of s.gnomes) {
      if (g.lane !== p.lane || !targetable(g) || p.x < g.x - 0.3 || p.x > g.x + 0.2) continue;
      if (!hit || g.x < hit.x) hit = g;
    }
    if (hit) {
      s.projs.splice(i, 1);
      ev(s, "splat", p.lane, p.x, p.kind);
      hurtGnome(s, hit, PEA_DMG, { frontal: true, slow: p.kind === "frost" && hit.shield <= 0 });
    } else if (p.x > COLS + 1.2) s.projs.splice(i, 1);
  }
}

function plantAt(s: GameState, lane: number, col: number): Plant | null {
  return col >= 0 && col < COLS ? s.grid[cellIndex(lane, col)] : null;
}

function stepGnomes(s: GameState, dt: number) {
  for (let i = s.gnomes.length - 1; i >= 0; i--) {
    const g = s.gnomes[i];
    if (g.flash > 0) g.flash = Math.max(0, g.flash - dt);
    if (g.state === "die") {
      g.dieT -= dt;
      if (g.dieT <= 0) s.gnomes.splice(i, 1);
      continue;
    }
    if (g.slow > 0) g.slow = Math.max(0, g.slow - dt);
    g.phase += dt * (g.state === "walk" ? 3 + gnomeSpeed(g) * 4 : 6);
    if (g.state === "vault") {
      g.vaultT += dt;
      const k = Math.min(1, g.vaultT / VAULT_TIME);
      g.x = g.vaultFrom + (g.vaultTo - g.vaultFrom) * k;
      if (k >= 1) {
        g.state = "walk";
        g.vaulted = true;
      }
      continue;
    }
    const fr = g.x - REACH;
    const col = Math.floor(fr);
    const plant = plantAt(s, g.lane, col);
    if (g.kind === "vaulter" && !g.vaulted) {
      // Jump over the first plant in the way: the one he is touching or about to touch.
      const ahead = plantAt(s, g.lane, col) ?? plantAt(s, g.lane, Math.floor(fr - 0.45));
      if (ahead) {
        g.state = "vault";
        g.vaultT = 0;
        g.vaultFrom = g.x;
        g.vaultTo = ahead.col - 0.1 + REACH;
        ev(s, "vault", g.lane, g.x, g.kind);
        continue;
      }
    }
    if (plant) {
      g.state = "eat";
      plant.hp -= BITE_DPS * (g.slow > 0 ? 0.5 : 1) * dt;
      plant.hurt = 0.1;
      g.bite -= dt;
      if (g.bite <= 0) {
        g.bite = 0.55;
        ev(s, "bite", g.lane, g.x - REACH, plant.kind);
      }
      if (plant.hp <= 0) {
        dropPlant(s, plant);
        ev(s, "plant-die", g.lane, plant.col + 0.5, plant.kind);
        g.state = "walk";
      }
    } else {
      g.state = "walk";
      g.x -= gnomeSpeed(g) * dt;
    }
  }
}

function stepMowers(s: GameState, dt: number) {
  for (const m of s.mowers) {
    if (m.state === "idle") {
      if (s.gnomes.some((g) => g.lane === m.lane && g.state !== "die" && g.x <= 0.4)) {
        m.state = "run";
        s.mowersUsed++;
        ev(s, "mower", m.lane, m.x);
      }
    } else if (m.state === "run") {
      m.x += MOWER_SPEED * dt;
      for (const g of s.gnomes) {
        if (g.lane === m.lane && g.state !== "die" && g.x - 0.5 < m.x + 0.5) killGnome(s, g, true);
      }
      if (m.x > COLS + 1.5) m.state = "gone";
    }
  }
}

export function update(s: GameState, dt: number): GameEvent[] {
  s.events.length = 0;
  if (s.status !== "playing") {
    // Let dying gnomes finish their fall even after the level ends.
    for (const g of s.gnomes) if (g.state === "die") g.dieT -= dt;
    return s.events;
  }
  const n = Math.max(1, Math.ceil(dt / 0.025));
  const h = dt / n;
  for (let i = 0; i < n && s.status === "playing"; i++) step(s, h);
  return s.events;
}

function step(s: GameState, dt: number) {
  s.time += dt;
  for (const id of PLANT_ORDER) if (s.cool[id] > 0) s.cool[id] = Math.max(0, s.cool[id] - dt);

  while (s.warnings.length && s.warnings[0].t <= s.time) {
    const w = s.warnings.shift()!;
    ev(s, "bigwave", 0, 0, undefined, w.final);
  }
  while (s.next < s.schedule.length && s.schedule[s.next].t <= s.time) {
    const sp = s.schedule[s.next++];
    spawnGnome(s, sp.kind, sp.lane);
    s.wavesStarted = Math.max(s.wavesStarted, sp.wave + 1);
  }

  s.skyT -= dt;
  if (s.skyT <= 0) {
    s.skyT = s.level.sky * (0.8 + s.rng() * 0.4);
    spawnSun(s, "sky", 0.5 + s.rng() * (COLS - 1), -0.9, 0.5 + s.rng() * (LANES - 1.1));
  }
  for (let i = s.suns.length - 1; i >= 0; i--) {
    const u = s.suns[i];
    if (u.y < u.ty || (u.grav && u.vy < 0)) {
      if (u.grav) u.vy += 5 * dt;
      u.y += u.vy * dt;
      if (u.y >= u.ty && u.vy > 0) u.y = u.ty;
    } else {
      u.life -= dt;
      if (u.life <= 0) s.suns.splice(i, 1);
    }
  }

  stepPlants(s, dt);
  stepProjs(s, dt);
  stepGnomes(s, dt);
  stepMowers(s, dt);

  // A gnome through the front door and no mower left: the garden is lost.
  if (s.gnomes.some((g) => g.state !== "die" && g.x < -0.45)) {
    s.status = "lost";
    ev(s, "lose", 0, 0);
    return;
  }
  if (s.next >= s.schedule.length && !s.gnomes.some((g) => g.state !== "die")) {
    s.status = "won";
    ev(s, "win", 0, 0);
  }
}

// ---------------------------------------------------------------- progress

export interface Progress {
  /** Which levels (by index) have been cleared. */
  done: boolean[];
}

export const emptyProgress = (): Progress => ({ done: new Array(LEVELS.length).fill(false) });

export function normalizeProgress(raw: unknown): Progress {
  const p = emptyProgress();
  const done = (raw as Progress | null)?.done;
  if (Array.isArray(done)) for (let i = 0; i < p.done.length; i++) p.done[i] = done[i] === true;
  return p;
}

export const levelsCleared = (p: Progress) => p.done.filter(Boolean).length;

/** The first level you haven't beaten (or the last one when everything is done). */
export function nextLevel(p: Progress): number {
  const i = p.done.indexOf(false);
  return i < 0 ? LEVELS.length - 1 : i;
}

/** A level can be played once the one before it is cleared. */
export const isUnlocked = (p: Progress, i: number) => i === 0 || p.done[i - 1] === true || p.done[i] === true;

export function markCleared(p: Progress, i: number): Progress {
  const done = [...p.done];
  done[i] = true;
  return { done };
}

/** Wave progress for the HUD: 0..1 by gnomes spawned. */
export const waveFraction = (s: GameState) => (s.schedule.length ? s.next / s.schedule.length : 1);

/** Fractions along the progress bar where each big wave starts. */
export function bigWaveMarks(level: LevelDef, schedule: Spawn[]): number[] {
  const marks: number[] = [];
  level.waves.forEach((w, wi) => {
    if (!w.big) return;
    const idx = schedule.findIndex((sp) => sp.wave === wi);
    if (idx >= 0) marks.push(idx / schedule.length);
  });
  return marks;
}
