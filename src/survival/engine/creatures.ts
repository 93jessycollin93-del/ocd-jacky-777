// Creatures: species, behaviour, knock-out taming and riding.
import type { ItemId } from "./items";
import { heightAt, WATER_LEVEL, WORLD_HALF } from "./world";

export type SpeciesId = "dodo" | "compy" | "parasaur" | "raptor" | "trike";
export type Temperament = "passive" | "skittish" | "territorial" | "aggressive";

export interface Species {
  id: SpeciesId;
  name: string;
  hp: number;
  speed: number;
  /** Movement speed while ridden; absent means it can't be ridden. */
  rideSpeed?: number;
  damage: number;
  attackRange: number;
  aggroRange: number;
  temperament: Temperament;
  maxTorpor: number;
  /** Foods it accepts while unconscious, best first, with how much tame progress each gives. */
  tameFoods: Partial<Record<ItemId, number>>;
  drops: { raw_meat: number; hide: number };
  /** Chance a hit on the player opens a wound: light and heavy (arterial) bleeding. */
  bleed?: { light: number; heavy: number };
  xp: number;
  size: number;
  color: string;
  population: number;
}

export const SPECIES: Record<SpeciesId, Species> = {
  dodo: {
    id: "dodo", name: "Dodo", hp: 40, speed: 1.6, damage: 2, attackRange: 1.2, aggroRange: 0,
    temperament: "passive", maxTorpor: 25, tameFoods: { berries: 0.25 },
    drops: { raw_meat: 2, hide: 1 }, xp: 8, size: 0.55, color: "#9b8a74", population: 14,
  },
  compy: {
    id: "compy", name: "Compsognathus", hp: 30, speed: 6.5, damage: 4, attackRange: 1.3, aggroRange: 12,
    temperament: "aggressive", maxTorpor: 20, tameFoods: { raw_meat: 0.34 },
    drops: { raw_meat: 1, hide: 1 }, xp: 10, size: 0.45, color: "#6f8f3a", population: 8,
    bleed: { light: 0.25, heavy: 0 },
  },
  parasaur: {
    id: "parasaur", name: "Parasaurolophus", hp: 200, speed: 5, rideSpeed: 11, damage: 8, attackRange: 2.4, aggroRange: 0,
    temperament: "skittish", maxTorpor: 120, tameFoods: { berries: 0.08 },
    drops: { raw_meat: 8, hide: 5 }, xp: 30, size: 1.6, color: "#3f7fa6", population: 8,
    bleed: { light: 0.1, heavy: 0 },
  },
  raptor: {
    id: "raptor", name: "Raptor", hp: 150, speed: 8.5, rideSpeed: 13, damage: 14, attackRange: 2, aggroRange: 20,
    temperament: "aggressive", maxTorpor: 90, tameFoods: { raw_meat: 0.12, cooked_meat: 0.06 },
    drops: { raw_meat: 5, hide: 4 }, xp: 40, size: 1.1, color: "#b5651d", population: 6,
    bleed: { light: 0.35, heavy: 0.15 },
  },
  trike: {
    id: "trike", name: "Triceratops", hp: 375, speed: 3.8, rideSpeed: 9, damage: 22, attackRange: 3, aggroRange: 0,
    temperament: "territorial", maxTorpor: 200, tameFoods: { berries: 0.05 },
    drops: { raw_meat: 12, hide: 8 }, xp: 60, size: 2, color: "#5d6b3a", population: 6,
    bleed: { light: 0.2, heavy: 0.25 },
  },
};

export type CreatureState = "wander" | "flee" | "chase" | "unconscious" | "dead" | "follow" | "stay";

export interface Creature {
  id: number;
  species: SpeciesId;
  x: number;
  z: number;
  heading: number;
  hp: number;
  torpor: number;
  state: CreatureState;
  tamed: boolean;
  tameProgress: number;
  name?: string;
  /** Who it's chasing: "player" or another creature's id. */
  target: "player" | number | null;
  timer: number;
  attackCooldown: number;
  /** Corpses only: how much meat/hide is left to carve. */
  harvestLeft: number;
  /** World time when a corpse disappears. */
  despawnAt: number;
  /** Seconds left on the red hit flash. Optional so older saves load. */
  hurt?: number;
  /** Knockback velocity (m/s), decays quickly. */
  kx?: number;
  kz?: number;
}

export function makeCreature(id: number, species: SpeciesId, x: number, z: number, heading = 0): Creature {
  return {
    id, species, x, z, heading, hp: SPECIES[species].hp, torpor: 0, state: "wander",
    tamed: false, tameProgress: 0, target: null, timer: 0, attackCooldown: 0, harvestLeft: 0, despawnAt: 0,
    hurt: 0, kx: 0, kz: 0,
  };
}

export const isDown = (c: Creature) => c.state === "unconscious" || c.state === "dead";

export interface CreatureContext {
  seed: number;
  time: number;
  dt: number;
  rng: () => number;
  player: { x: number; z: number; dead: boolean; mountId: number | null };
  creatures: Creature[];
  /** True where a wall or solid block stands in the way. */
  blocked?: (x: number, z: number) => boolean;
  /** True when something solid stands between two points, so neither can reach the other. */
  losBlocked?: (ax: number, az: number, bx: number, bz: number) => boolean;
}

export interface CreatureEvent {
  type: "hit-player" | "hit-creature" | "woke" | "killed";
  creatureId: number;
  targetId?: number;
  amount?: number;
}

const TORPOR_DECAY = 2.5; // per second while awake
const KO_TORPOR_DECAY = 1.2; // per second while unconscious
const TAME_PROGRESS_DECAY = 0.004; // tame effectiveness slowly bleeds if you stop feeding

function angleTo(from: { x: number; z: number }, to: { x: number; z: number }) {
  return Math.atan2(to.x - from.x, to.z - from.z);
}

function stepToward(c: Creature, heading: number, speed: number, ctx: CreatureContext) {
  c.heading = heading;
  const nx = c.x + Math.sin(heading) * speed * ctx.dt;
  const nz = c.z + Math.cos(heading) * speed * ctx.dt;
  const lim = WORLD_HALF * 0.95;
  if (
    Math.abs(nx) > lim || Math.abs(nz) > lim || heightAt(nx, nz, ctx.seed) < WATER_LEVEL + 0.3 ||
    ctx.blocked?.(nx, nz)
  ) {
    // Turn away from the shore (or your walls) instead of walking through them.
    c.heading += Math.PI * (0.5 + ctx.rng());
    return;
  }
  c.x = nx;
  c.z = nz;
}

function applyKnockback(c: Creature, ctx: CreatureContext) {
  const kx = c.kx ?? 0;
  const kz = c.kz ?? 0;
  if (Math.abs(kx) + Math.abs(kz) < 0.05) {
    c.kx = 0;
    c.kz = 0;
    return;
  }
  const nx = c.x + kx * ctx.dt;
  const nz = c.z + kz * ctx.dt;
  const lim = WORLD_HALF * 0.95;
  if (Math.abs(nx) < lim && Math.abs(nz) < lim && heightAt(nx, nz, ctx.seed) > WATER_LEVEL - 0.5 && !ctx.blocked?.(nx, nz)) {
    c.x = nx;
    c.z = nz;
  }
  const decay = Math.exp(-8 * ctx.dt);
  c.kx = kx * decay;
  c.kz = kz * decay;
}

function findCreature(ctx: CreatureContext, id: number) {
  return ctx.creatures.find((o) => o.id === id);
}

/** Advance one creature by ctx.dt seconds. Mutates the creature and returns what it did to others. */
export function updateCreature(c: Creature, ctx: CreatureContext): CreatureEvent[] {
  const sp = SPECIES[c.species];
  const events: CreatureEvent[] = [];
  c.attackCooldown = Math.max(0, c.attackCooldown - ctx.dt);
  c.hurt = Math.max(0, (c.hurt ?? 0) - ctx.dt);

  if (c.state === "dead") return events;
  if (ctx.player.mountId === c.id) return events; // the rider drives it
  applyKnockback(c, ctx);

  if (c.state === "unconscious") {
    c.torpor = Math.max(0, c.torpor - KO_TORPOR_DECAY * ctx.dt);
    c.tameProgress = Math.max(0, c.tameProgress - TAME_PROGRESS_DECAY * ctx.dt);
    if (c.torpor <= 0) {
      c.state = sp.temperament === "aggressive" || sp.temperament === "territorial" ? "chase" : "flee";
      c.target = "player";
      c.timer = 8;
      c.tameProgress = 0;
      events.push({ type: "woke", creatureId: c.id });
    }
    return events;
  }

  c.torpor = Math.max(0, c.torpor - TORPOR_DECAY * ctx.dt);
  const distPlayer = Math.hypot(ctx.player.x - c.x, ctx.player.z - c.z);

  if (c.tamed) {
    // Tames defend the player against anything wild that is hunting them.
    if (c.state === "follow" && (c.target === null || c.target === "player")) {
      const threat = ctx.creatures.find(
        (o) => !o.tamed && !isDown(o) && o.target === "player" && Math.hypot(o.x - c.x, o.z - c.z) < 20,
      );
      c.target = threat ? threat.id : null;
    }
    if (typeof c.target === "number") {
      const foe = findCreature(ctx, c.target);
      if (!foe || isDown(foe)) {
        c.target = null;
      } else {
        attackOrApproach(c, foe, sp, ctx, events);
        return events;
      }
    }
    if (c.state === "follow" && distPlayer > 4) {
      stepToward(c, angleTo(c, ctx.player), Math.min(sp.speed * 1.6, distPlayer), ctx);
    }
    return events;
  }

  // Wild behaviour.
  if (sp.temperament === "aggressive" && c.state === "wander" && !ctx.player.dead && distPlayer < sp.aggroRange) {
    c.state = "chase";
    c.target = "player";
    c.timer = 12;
  }

  if (c.state === "chase") {
    c.timer -= ctx.dt;
    if (c.target === "player") {
      if (ctx.player.dead || distPlayer > sp.aggroRange * 2.5 + 15 || c.timer <= 0) {
        c.state = "wander";
        c.target = null;
      } else {
        attackOrApproach(c, ctx.player, sp, ctx, events);
      }
    } else if (typeof c.target === "number") {
      const foe = findCreature(ctx, c.target);
      if (!foe || isDown(foe) || c.timer <= 0) {
        c.state = "wander";
        c.target = null;
      } else {
        attackOrApproach(c, foe, sp, ctx, events);
      }
    }
    return events;
  }

  if (c.state === "flee") {
    c.timer -= ctx.dt;
    stepToward(c, angleTo(ctx.player, c), sp.speed * 1.3, ctx);
    if (c.timer <= 0) c.state = "wander";
    return events;
  }

  // Wander: amble in a direction for a while, then pause or turn.
  c.timer -= ctx.dt;
  if (c.timer <= 0) {
    c.heading += (ctx.rng() - 0.5) * Math.PI;
    c.timer = 2 + ctx.rng() * 5;
  }
  if (c.timer > 1.5) stepToward(c, c.heading, sp.speed * 0.35, ctx);
  return events;
}

function attackOrApproach(
  c: Creature,
  target: { x: number; z: number; id?: number },
  sp: Species,
  ctx: CreatureContext,
  events: CreatureEvent[],
) {
  const dist = Math.hypot(target.x - c.x, target.z - c.z);
  const heading = angleTo(c, target);
  if (dist > sp.attackRange) {
    stepToward(c, heading, sp.speed, ctx);
    return;
  }
  if (ctx.losBlocked?.(c.x, c.z, target.x, target.z)) {
    // A wall is in the way: no biting through it. Scrabble sideways looking for a way round.
    stepToward(c, heading + (c.id % 2 ? 1 : -1) * Math.PI * 0.5, sp.speed * 0.5, ctx);
    return;
  }
  c.heading = heading;
  if (c.attackCooldown > 0) return;
  c.attackCooldown = 1.1;
  if ("id" in target && typeof target.id === "number") {
    events.push({ type: "hit-creature", creatureId: c.id, targetId: target.id, amount: sp.damage });
  } else {
    events.push({ type: "hit-player", creatureId: c.id, amount: sp.damage });
  }
}

/**
 * Damage and knock-out applied by the player or a tame. Returns true if this hit killed it.
 * `from` is where the blow came from; the creature is knocked away from it, small ones further.
 */
export function damageCreature(
  c: Creature,
  damage: number,
  torpor: number,
  time: number,
  attacker: "player" | number,
  from?: { x: number; z: number },
): boolean {
  if (c.state === "dead") return false;
  const sp = SPECIES[c.species];
  c.hp -= damage;
  c.hurt = 0.3;
  if (from && damage > 0) {
    const dx = c.x - from.x;
    const dz = c.z - from.z;
    const len = Math.hypot(dx, dz) || 1;
    const push = Math.min(9, (2 + damage * 0.15) / Math.max(sp.size, 0.5));
    c.kx = (c.kx ?? 0) + (dx / len) * push;
    c.kz = (c.kz ?? 0) + (dz / len) * push;
  }
  if (c.hp <= 0) {
    c.hp = 0;
    c.state = "dead";
    c.target = null;
    c.harvestLeft = sp.drops.raw_meat + sp.drops.hide;
    c.despawnAt = time + 90;
    return true;
  }
  if (c.state === "unconscious") return false;
  c.torpor += torpor;
  if (!c.tamed && c.torpor >= sp.maxTorpor) {
    c.torpor = sp.maxTorpor;
    c.state = "unconscious";
    c.target = null;
    return false;
  }
  if (c.tamed) return false;
  if (sp.temperament === "passive" || sp.temperament === "skittish") {
    c.state = "flee";
    c.timer = 6;
  } else {
    c.state = "chase";
    c.target = attacker;
    c.timer = 15;
  }
  return false;
}

/** Feed an unconscious creature. Returns the food used, or null if it accepts nothing you're carrying. */
export function feedCreature(c: Creature, has: (id: ItemId) => boolean): { food: ItemId; tamed: boolean } | null {
  if (c.state !== "unconscious" || c.tamed) return null;
  const sp = SPECIES[c.species];
  const food = (Object.keys(sp.tameFoods) as ItemId[]).find(has);
  if (!food) return null;
  c.tameProgress = Math.min(1, c.tameProgress + (sp.tameFoods[food] ?? 0));
  if (c.tameProgress >= 1) {
    c.tamed = true;
    c.state = "follow";
    c.torpor = 0;
    c.hp = sp.hp;
    c.target = null;
    return { food, tamed: true };
  }
  return { food, tamed: false };
}

/** Sleepberries keep a knocked-out creature under while you gather its food. */
export function sedateCreature(c: Creature): boolean {
  if (c.state !== "unconscious") return false;
  c.torpor = Math.min(SPECIES[c.species].maxTorpor, c.torpor + 15);
  return true;
}
