// Tower Clash: pure rules for a real-time lane battler. Two sides, each with two turrets and a keep, split by
// a river with two bridges. Spend mana to deploy cards: troops walk to the nearest thing they can hit,
// spells land where you aim. Knock down towers for stars; the keep is worth the match.
// Coordinates are in tiles: the arena is 18 wide and 32 tall; side 0 (you) is at the bottom.
import { mulberry32, type Rng } from "../../kit/rng";

export const COLS = 18;
export const ROWS = 32;
export const RIVER_TOP = 15;
export const RIVER_BOT = 17;
export const BRIDGES = [3.5, 14.5];
export const MATCH_TIME = 180;
export const OVERTIME = 60;
export const MANA_MAX = 10;
export const MANA_RATE = 1 / 2.8;
export const DEPLOY_TIME = 1;

export type Side = 0 | 1;
export type CardId = "squire" | "archers" | "ogre" | "bones" | "firebolt" | "arrows" | "rifleman" | "brute" | "wyvern" | "cannon" | "boar" | "imps";
type Targets = "ground" | "both" | "buildings";

export interface CardDef {
  id: CardId; name: string; icon: string; cost: number; blurb: string; kind: "troop" | "spell" | "building";
  // troops and buildings
  hp?: number; dmg?: number; hit?: number; range?: number; speed?: number; targets?: Targets; count?: number; r?: number; flying?: boolean; splash?: number;
  jumps?: boolean; lifetime?: number;
  // spells
  radius?: number; waves?: number; delay?: number; towerMul?: number;
}

export const CARDS: Record<CardId, CardDef> = {
  squire: { id: "squire", name: "Squire", icon: "🛡️", cost: 3, kind: "troop", blurb: "Sturdy sword fighter.", hp: 1400, dmg: 160, hit: 1.2, range: 1.1, speed: 1, targets: "ground", r: 0.5 },
  archers: { id: "archers", name: "Archers", icon: "🧝", cost: 3, kind: "troop", blurb: "Two archers. Hit air and ground.", hp: 300, dmg: 100, hit: 1, range: 5, speed: 1, targets: "both", count: 2, r: 0.4 },
  ogre: { id: "ogre", name: "Ogre", icon: "👹", cost: 5, kind: "troop", blurb: "Huge and slow. Only hits buildings.", hp: 3600, dmg: 200, hit: 1.5, range: 1.2, speed: 0.75, targets: "buildings", r: 0.8 },
  bones: { id: "bones", name: "Bone Swarm", icon: "💀", cost: 3, kind: "troop", blurb: "A dozen tiny skeletons.", hp: 70, dmg: 70, hit: 1, range: 0.8, speed: 1.4, targets: "ground", count: 12, r: 0.3 },
  firebolt: { id: "firebolt", name: "Fire Bolt", icon: "🔥", cost: 4, kind: "spell", blurb: "Big blast in a small circle.", radius: 2.5, dmg: 560, waves: 1, delay: 0.8, towerMul: 0.35 },
  arrows: { id: "arrows", name: "Arrow Rain", icon: "🏹", cost: 3, kind: "spell", blurb: "Wide volley that clears swarms.", radius: 4, dmg: 80, waves: 3, delay: 0.5, towerMul: 0.35 },
  rifleman: { id: "rifleman", name: "Rifleman", icon: "💂", cost: 4, kind: "troop", blurb: "Long-range sharpshooter.", hp: 600, dmg: 180, hit: 1.1, range: 6, speed: 1, targets: "both", r: 0.45 },
  brute: { id: "brute", name: "Brute", icon: "🦍", cost: 4, kind: "troop", blurb: "Slow swings that hit very hard.", hp: 1100, dmg: 600, hit: 1.8, range: 1, speed: 1.4, targets: "ground", r: 0.55 },
  wyvern: { id: "wyvern", name: "Wyvern", icon: "🐉", cost: 4, kind: "troop", blurb: "Flies. Breathes fire in a small area.", hp: 1000, dmg: 130, hit: 1.6, range: 3.5, speed: 1.4, targets: "both", flying: true, splash: 1.5, r: 0.6 },
  cannon: { id: "cannon", name: "Cannon", icon: "💣", cost: 3, kind: "building", blurb: "Pulls ground troops. Crumbles in 30s.", hp: 800, dmg: 170, hit: 0.9, range: 5.5, targets: "ground", r: 0.8, lifetime: 30 },
  boar: { id: "boar", name: "Boar Rider", icon: "🐗", cost: 4, kind: "troop", blurb: "Very fast. Jumps the river. Hits buildings.", hp: 1400, dmg: 260, hit: 1.6, range: 1, speed: 1.8, targets: "buildings", jumps: true, r: 0.55 },
  imps: { id: "imps", name: "Imps", icon: "👺", cost: 2, kind: "troop", blurb: "Three quick stabbers.", hp: 200, dmg: 100, hit: 1.1, range: 0.8, speed: 1.8, targets: "ground", count: 3, r: 0.35 },
};
export const CARD_IDS = Object.keys(CARDS) as CardId[];
export const DEFAULT_DECK: CardId[] = ["squire", "archers", "ogre", "bones", "firebolt", "arrows", "rifleman", "brute"];
export const DECK_SIZE = 8;

export interface Unit {
  id: number; side: Side; card: CardId | "turret" | "keep"; x: number; y: number; hp: number; maxHp: number; r: number; flying: boolean; building: boolean;
  dmg: number; hit: number; range: number; speed: number; targets: Targets; splash: number; jumps: boolean; decay: number;
  cd: number; deploy: number; target: number; retarget: number; active: boolean; dead: boolean; face: number; lane: 0 | 1; crossed: boolean;
}
export interface Spell { id: number; side: Side; card: CardId; x: number; y: number; t: number; waves: number }

export type Difficulty = "easy" | "normal" | "hard";
export const AI: Record<Difficulty, { name: string; mana: number; think: number }> = {
  easy: { name: "Easy", mana: 0.7, think: 1.8 },
  normal: { name: "Normal", mana: 1, think: 0.9 },
  hard: { name: "Hard", mana: 1.15, think: 0.45 },
};

export interface ClashState {
  rng: Rng; units: Unit[]; spells: Spell[]; mana: [number, number]; hands: [CardId[], CardId[]]; queues: [CardId[], CardId[]];
  time: number; overtime: boolean; over: boolean; winner: Side | -1; stars: [number, number]; nextId: number; diff: Difficulty; aiT: number;
  aiPlan: { card: CardId; x: number; y: number } | null;
}

export type ClashEvent =
  | { type: "deploy"; side: Side; card: CardId; x: number; y: number }
  | { type: "hit"; from: number; x1: number; y1: number; x2: number; y2: number; ranged: boolean; side: Side }
  | { type: "splash"; x: number; y: number; r: number }
  | { type: "spell"; card: CardId; x: number; y: number; r: number }
  | { type: "death"; x: number; y: number; side: Side; building: boolean }
  | { type: "tower"; side: Side; keep: boolean }
  | { type: "overtime" }
  | { type: "end"; winner: Side | -1 };

// ---------------------------------------------------------------- setup

function tower(s: ClashState, side: Side, keep: boolean, x: number): Unit {
  const y = keep ? (side === 0 ? 29 : 3) : side === 0 ? 25.5 : 6.5;
  const hp = keep ? 3800 : 2400;
  return {
    id: s.nextId++, side, card: keep ? "keep" : "turret", x, y, hp, maxHp: hp, r: keep ? 1.8 : 1.4, flying: false, building: true,
    dmg: keep ? 100 : 90, hit: keep ? 1 : 0.8, range: 7, speed: 0, targets: "both", splash: 0, jumps: false, decay: 0,
    cd: 0, deploy: 0, target: 0, retarget: 0, active: !keep, dead: false, face: 0, lane: x < COLS / 2 ? 0 : 1, crossed: false,
  };
}

export function newMatch(seed: number, deck: CardId[] = DEFAULT_DECK, diff: Difficulty = "normal", aiDeck?: CardId[]): ClashState {
  const rng = mulberry32(seed);
  const shuffle = (d: CardId[]) => {
    const a = d.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const ai = aiDeck ?? AI_DECKS[Math.floor(rng() * AI_DECKS.length)];
  const p = shuffle(deck);
  const e = shuffle(ai);
  const s: ClashState = {
    rng, units: [], spells: [], mana: [5, 5], hands: [p.slice(0, 4), e.slice(0, 4)], queues: [p.slice(4), e.slice(4)],
    time: 0, overtime: false, over: false, winner: -1, stars: [0, 0], nextId: 1, diff, aiT: 2, aiPlan: null,
  };
  for (const side of [0, 1] as Side[]) {
    s.units.push(tower(s, side, false, BRIDGES[0]), tower(s, side, false, BRIDGES[1]), tower(s, side, true, COLS / 2));
  }
  return s;
}

export const AI_DECKS: CardId[][] = [
  ["squire", "archers", "ogre", "bones", "firebolt", "arrows", "rifleman", "brute"],
  ["boar", "imps", "cannon", "arrows", "firebolt", "wyvern", "squire", "archers"],
  ["ogre", "wyvern", "rifleman", "bones", "arrows", "brute", "imps", "firebolt"],
];

// ---------------------------------------------------------------- deploying

const towersOf = (s: ClashState, side: Side) => s.units.filter((u) => !u.dead && (u.card === "turret" || u.card === "keep") && u.side === side);

/** Where a side may drop troops and buildings: its own half, plus the enemy's half of a lane whose turret has fallen. */
export function canDeploy(s: ClashState, side: Side, card: CardId, x: number, y: number) {
  if (x < 0.5 || x > COLS - 0.5 || y < 0.5 || y > ROWS - 0.5) return false;
  if (CARDS[card].kind === "spell") return true;
  for (const t of towersOf(s, 0).concat(towersOf(s, 1))) if (Math.abs(t.x - x) < t.r + 0.4 && Math.abs(t.y - y) < t.r + 0.4) return false;
  const own = side === 0 ? y >= RIVER_BOT + 0.5 : y <= RIVER_TOP - 0.5;
  if (own) return true;
  if (CARDS[card].kind === "building") return false;
  // Pocket: up to 4 tiles past the river in a lane whose enemy turret is gone.
  const enemy = (1 - side) as Side;
  const lane = x < COLS / 2 ? 0 : 1;
  const turretUp = s.units.some((u) => u.side === enemy && u.card === "turret" && !u.dead && u.lane === lane);
  if (turretUp) return false;
  return side === 0 ? y >= RIVER_TOP - 4 && y <= RIVER_TOP - 0.5 : y <= RIVER_BOT + 4 && y >= RIVER_BOT + 0.5;
}

export function play(s: ClashState, side: Side, slot: number, x: number, y: number, ev: ClashEvent[] = []): boolean {
  const card = s.hands[side][slot];
  if (!card || s.over) return false;
  const def = CARDS[card];
  if (s.mana[side] < def.cost || !canDeploy(s, side, card, x, y)) return false;
  s.mana[side] -= def.cost;
  // Cycle: the played card goes to the back of the queue; the next one fills the slot.
  s.queues[side].push(card);
  s.hands[side][slot] = s.queues[side].shift()!;
  ev.push({ type: "deploy", side, card, x, y });
  if (def.kind === "spell") {
    s.spells.push({ id: s.nextId++, side, card, x, y, t: def.delay!, waves: def.waves! });
    return true;
  }
  const n = def.count ?? 1;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const spread = n === 1 ? 0 : n <= 3 ? 0.6 : 1.1 * Math.sqrt((i + 1) / n);
    s.units.push({
      id: s.nextId++, side, card, x: x + Math.cos(a) * spread, y: y + Math.sin(a) * spread, hp: def.hp!, maxHp: def.hp!, r: def.r!, flying: !!def.flying,
      building: def.kind === "building", dmg: def.dmg!, hit: def.hit!, range: def.range!, speed: def.speed ?? 0, targets: def.targets!, splash: def.splash ?? 0,
      jumps: !!def.jumps, decay: def.lifetime ? def.hp! / def.lifetime : 0, cd: def.hit! * 0.4, deploy: DEPLOY_TIME, target: 0, retarget: 0, active: true,
      dead: false, face: side === 0 ? -1 : 1, lane: x < COLS / 2 ? 0 : 1, crossed: false,
    });
  }
  return true;
}

// ---------------------------------------------------------------- simulation

const canHit = (a: Unit, b: Unit) =>
  a.side !== b.side && !b.dead && (a.targets === "buildings" ? b.building : a.targets === "ground" ? !b.flying : true);

const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
const inRiver = (y: number) => y > RIVER_TOP && y < RIVER_BOT;
const sideOf = (y: number): Side | -1 => (y >= RIVER_BOT ? 0 : y <= RIVER_TOP ? 1 : -1);

function acquire(s: ClashState, u: Unit): Unit | null {
  let best: Unit | null = null;
  let bd = Infinity;
  const sight = u.building ? u.range + 0.5 : Math.max(5.5, u.range + 1);
  for (const o of s.units) {
    if (!canHit(u, o) || (o.deploy > 0 && !o.building && o.card !== "turret")) continue;
    const d = dist(u, o) - o.r;
    if (u.targets !== "buildings" && d > sight) continue;
    if (u.targets === "buildings" && !o.building) continue;
    if (d < bd) {
      bd = d;
      best = o;
    }
  }
  if (best || u.building) return best;
  // Nothing in sight: march on the nearest enemy tower in this lane, else the keep.
  const enemy = (1 - u.side) as Side;
  const lane = s.units.find((o) => o.side === enemy && !o.dead && o.card === "turret" && o.lane === u.lane);
  return lane ?? s.units.find((o) => o.side === enemy && !o.dead && o.card === "keep") ?? null;
}

function moveToward(u: Unit, tx: number, ty: number, dt: number) {
  const dx = tx - u.x;
  const dy = ty - u.y;
  const d = Math.hypot(dx, dy);
  if (d < 1e-6) return;
  const step = Math.min(d, u.speed * dt);
  u.x += (dx / d) * step;
  u.y += (dy / d) * step;
  if (Math.abs(dx) > 0.05) u.face = dx > 0 ? 1 : -1;
}

/** Ground troops cross only at a bridge: head for the nearer bridge mouth, then straight across. */
function waypoint(u: Unit, t: Unit): [number, number] {
  if (u.flying || u.jumps) return [t.x, t.y];
  const us = sideOf(u.y);
  const ts = sideOf(t.y);
  if (us === ts && us !== -1) return [t.x, t.y];
  const bx = Math.abs(u.x - BRIDGES[0]) + Math.abs(t.x - BRIDGES[0]) <= Math.abs(u.x - BRIDGES[1]) + Math.abs(t.x - BRIDGES[1]) ? BRIDGES[0] : BRIDGES[1];
  const goingUp = t.y < u.y;
  if (Math.abs(u.x - bx) > 0.25 && !inRiver(u.y)) return [bx, goingUp ? RIVER_BOT + 0.2 : RIVER_TOP - 0.2];
  return [bx, goingUp ? RIVER_TOP - 0.3 : RIVER_BOT + 0.3];
}

function strike(s: ClashState, u: Unit, t: Unit, ev: ClashEvent[]) {
  ev.push({ type: "hit", from: u.id, x1: u.x, y1: u.y, x2: t.x, y2: t.y, ranged: u.range > 2, side: u.side });
  if (u.splash > 0) {
    ev.push({ type: "splash", x: t.x, y: t.y, r: u.splash });
    for (const o of s.units) if (canHit(u, o) && dist(o, t) <= u.splash + o.r) hurt(s, o, u.dmg, ev);
  } else hurt(s, t, u.dmg, ev);
}

function hurt(s: ClashState, o: Unit, dmg: number, ev: ClashEvent[]) {
  if (o.dead) return;
  o.hp -= dmg;
  if (o.card === "keep") o.active = true;
  if (o.hp > 0) return;
  o.dead = true;
  ev.push({ type: "death", x: o.x, y: o.y, side: o.side, building: o.building });
  if (o.card === "turret" || o.card === "keep") towerDown(s, o, ev);
}

function towerDown(s: ClashState, o: Unit, ev: ClashEvent[]) {
  const winner = (1 - o.side) as Side;
  ev.push({ type: "tower", side: o.side, keep: o.card === "keep" });
  if (o.card === "keep") {
    s.stars[winner] = 3;
    for (const t of towersOf(s, o.side)) t.dead = true;
    end(s, winner, ev);
    return;
  }
  s.stars[winner]++;
  const keep = s.units.find((u) => u.side === o.side && u.card === "keep" && !u.dead);
  if (keep) keep.active = true;
  if (s.overtime) end(s, winner, ev);
}

function end(s: ClashState, winner: Side | -1, ev: ClashEvent[]) {
  if (s.over) return;
  s.over = true;
  s.winner = winner;
  ev.push({ type: "end", winner });
}

/** Lowest tower health as a fraction, used to break a tie when overtime runs out. */
export function weakest(s: ClashState, side: Side) {
  return Math.min(...towersOf(s, side).map((t) => t.hp / t.maxHp));
}

export const manaBoost = (s: ClashState) => (s.overtime || s.time >= MATCH_TIME - 60 ? 2 : 1);
export const timeLeft = (s: ClashState) => (s.overtime ? MATCH_TIME + OVERTIME - s.time : MATCH_TIME - s.time);

export function step(s: ClashState, dt: number): ClashEvent[] {
  const ev: ClashEvent[] = [];
  if (s.over) return ev;
  s.time += dt;
  const boost = manaBoost(s);
  s.mana[0] = Math.min(MANA_MAX, s.mana[0] + MANA_RATE * boost * dt);
  s.mana[1] = Math.min(MANA_MAX, s.mana[1] + MANA_RATE * boost * AI[s.diff].mana * dt);

  // Spells.
  for (const sp of s.spells) {
    sp.t -= dt;
    if (sp.t > 0 || sp.waves <= 0) continue;
    const def = CARDS[sp.card];
    ev.push({ type: "spell", card: sp.card, x: sp.x, y: sp.y, r: def.radius! });
    for (const o of s.units) {
      if (o.side === sp.side || o.dead || dist(o, sp) > def.radius! + o.r) continue;
      hurt(s, o, o.card === "turret" || o.card === "keep" ? Math.round(def.dmg! * def.towerMul!) : def.dmg!, ev);
    }
    sp.waves--;
    sp.t = 0.35;
  }
  s.spells = s.spells.filter((sp) => sp.waves > 0);

  const byId = new Map(s.units.map((u) => [u.id, u]));
  for (const u of s.units) {
    if (u.dead) continue;
    if (u.decay) {
      u.hp -= u.decay * dt;
      if (u.hp <= 0) {
        u.dead = true;
        ev.push({ type: "death", x: u.x, y: u.y, side: u.side, building: true });
        continue;
      }
    }
    if (u.deploy > 0) {
      u.deploy -= dt;
      continue;
    }
    if (!u.active) continue;
    // Keep the current target while it's alive and in reach; otherwise look again a few times a second.
    let t = byId.get(u.target);
    u.retarget -= dt;
    if (!t || t.dead || (u.retarget <= 0 && dist(u, t) - t.r > u.range + u.r)) {
      if (!t || t.dead || u.retarget <= 0) {
        t = acquire(s, u) ?? undefined;
        u.target = t?.id ?? 0;
        u.retarget = 0.3;
      }
    }
    if (!t) continue;
    const reach = u.range + u.r + t.r;
    const d = dist(u, t);
    if (d <= reach) {
      u.cd -= dt;
      if (Math.abs(t.x - u.x) > 0.05) u.face = t.x > u.x ? 1 : -1;
      if (u.cd <= 0) {
        strike(s, u, t, ev);
        u.cd = u.hit;
      }
    } else if (u.speed > 0) {
      u.cd = Math.max(u.cd, u.hit * 0.3);
      const [wx, wy] = waypoint(u, t);
      moveToward(u, wx, wy, dt);
    }
  }

  // Keep troops apart and out of the river (except on bridges).
  const movers = s.units.filter((u) => !u.dead && !u.building);
  for (let i = 0; i < movers.length; i++) {
    const a = movers[i];
    for (let j = i + 1; j < movers.length; j++) {
      const b = movers[j];
      if (a.flying !== b.flying) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const min = (a.r + b.r) * 0.9;
      const d2 = dx * dx + dy * dy;
      if (d2 >= min * min || d2 === 0) continue;
      const d = Math.sqrt(d2);
      const push = (min - d) / 2;
      const ka = a.card === "ogre" ? 0.2 : 1;
      const kb = b.card === "ogre" ? 0.2 : 1;
      a.x -= (dx / d) * push * ka;
      a.y -= (dy / d) * push * ka;
      b.x += (dx / d) * push * kb;
      b.y += (dy / d) * push * kb;
    }
  }
  for (const u of movers) {
    u.x = Math.max(0.4, Math.min(COLS - 0.4, u.x));
    u.y = Math.max(0.4, Math.min(ROWS - 0.4, u.y));
    if (!u.flying && !u.jumps && inRiver(u.y) && Math.min(...BRIDGES.map((b) => Math.abs(b - u.x))) > 0.9) {
      const b = BRIDGES.reduce((p, c) => (Math.abs(c - u.x) < Math.abs(p - u.x) ? c : p));
      u.x += Math.sign(b - u.x) * Math.min(Math.abs(b - u.x) - 0.85, 0.2);
    }
    u.lane = u.x < COLS / 2 ? 0 : 1;
  }
  s.units = s.units.filter((u) => !u.dead);

  if (!s.over) {
    if (!s.overtime && s.time >= MATCH_TIME) {
      if (s.stars[0] !== s.stars[1]) end(s, s.stars[0] > s.stars[1] ? 0 : 1, ev);
      else {
        s.overtime = true;
        ev.push({ type: "overtime" });
      }
    } else if (s.overtime && s.time >= MATCH_TIME + OVERTIME) {
      const a = weakest(s, 0);
      const b = weakest(s, 1);
      end(s, a === b ? -1 : a > b ? 0 : 1, ev);
    }
  }
  if (!s.over) aiThink(s, dt, ev);
  return ev;
}

// ---------------------------------------------------------------- opponent

/** The opponent: defends what crosses to its side, punishes swarms with spells, and pushes with a tank and support when its mana is high. */
export function aiThink(s: ClashState, dt: number, ev: ClashEvent[] = []) {
  s.aiT -= dt;
  if (s.aiT > 0) return;
  const cfg = AI[s.diff];
  s.aiT = cfg.think * (0.7 + s.rng() * 0.6);
  const side: Side = 1;
  const hand = s.hands[1];
  const mana = s.mana[1];
  const slot = (pred: (c: CardDef) => boolean) => hand.findIndex((c) => pred(CARDS[c]) && CARDS[c].cost <= mana);
  const tryPlay = (i: number, x: number, y: number) => {
    if (i < 0) return false;
    x = Math.max(1, Math.min(COLS - 1, x));
    if (CARDS[hand[i]].kind !== "spell") y = Math.max(1.5, Math.min(RIVER_TOP - 0.6, y));
    return play(s, side, i, x, y, ev);
  };

  // Threats: your troops on its half or about to cross.
  const threats = s.units.filter((u) => u.side === 0 && !u.building && u.y < RIVER_BOT + 3);
  if (threats.length) {
    const cx = threats.reduce((a, u) => a + u.x, 0) / threats.length;
    const cy = threats.reduce((a, u) => a + u.y, 0) / threats.length;
    const clustered = threats.filter((u) => Math.hypot(u.x - cx, u.y - cy) < 2.5);
    const hp = threats.reduce((a, u) => a + u.hp, 0);
    const air = threats.some((u) => u.flying);
    const tank = threats.find((u) => u.hp > 1800 || u.targets === "buildings");
    // Swarms melt under spells; aim a little ahead (they walk toward smaller y).
    if (clustered.length >= 4 && hp < 1500) {
      if (tryPlay(slot((c) => c.id === "arrows"), cx, cy - 0.8) || tryPlay(slot((c) => c.id === "firebolt"), cx, cy - 0.8)) return;
    }
    const defY = Math.min(cy - 3, RIVER_TOP - 2);
    if (air && tryPlay(slot((c) => c.kind === "troop" && c.targets === "both"), cx, defY - 1)) return;
    if (tank) {
      if (tryPlay(slot((c) => c.id === "brute" || c.id === "bones" || c.id === "imps"), tank.x, Math.min(tank.y - 2, RIVER_TOP - 1.5))) return;
      if (tryPlay(slot((c) => c.kind === "building"), COLS / 2 + (tank.x < COLS / 2 ? -2 : 2), 10)) return;
    }
    if (threats.some((u) => u.y < RIVER_TOP + 1) || hp > 600) {
      if (tryPlay(slot((c) => c.kind === "troop" && c.targets !== "buildings"), cx, defY)) return;
    }
  }

  // Finish a weak tower with a spell.
  const fb = slot((c) => c.id === "firebolt");
  if (fb >= 0) {
    const weak = s.units.find((u) => u.side === 0 && (u.card === "turret" || u.card === "keep") && u.hp <= Math.round(CARDS.firebolt.dmg! * CARDS.firebolt.towerMul!));
    if (weak && tryPlay(fb, weak.x, weak.y)) return;
  }

  // Push: a tank in the back or at the bridge, then support behind it.
  const pushAt = s.diff === "hard" ? 7 : s.diff === "normal" ? 8.5 : 9.8;
  const myTank = s.units.find((u) => u.side === 1 && (u.card === "ogre" || u.card === "boar") && !u.dead);
  if (myTank && myTank.y < RIVER_BOT + 6) {
    if (tryPlay(slot((c) => c.kind === "troop" && c.targets !== "buildings" && c.cost <= mana - 0.5), myTank.x, myTank.y - 1.5)) return;
  }
  if (mana >= pushAt) {
    const weaker = (lane: 0 | 1) => s.units.find((u) => u.side === 0 && u.card === "turret" && u.lane === lane)?.hp ?? 0;
    const lane = weaker(0) === 0 ? 0 : weaker(1) === 0 ? 1 : weaker(0) <= weaker(1) ? 0 : 1;
    const lx = BRIDGES[lane];
    const tk = slot((c) => c.targets === "buildings");
    if (tk >= 0) {
      const boar = hand[tk] === "boar";
      if (tryPlay(tk, lx, boar ? RIVER_TOP - 1 : 3)) return;
    }
    if (mana >= 9.5 && tryPlay(slot((c) => c.kind === "troop"), lx, RIVER_TOP - 1.5)) return;
  }
  if (mana >= MANA_MAX - 0.05) {
    // Don't waste mana: cycle the cheapest troop at the back.
    let cheap = -1;
    hand.forEach((c, i) => {
      if (CARDS[c].kind === "troop" && (cheap < 0 || CARDS[c].cost < CARDS[hand[cheap]].cost)) cheap = i;
    });
    tryPlay(cheap, s.rng() < 0.5 ? 5 : 13, 2.5);
  }
}

// ---------------------------------------------------------------- trophies

export const trophyChange = (winner: Side | -1, stars: [number, number]) => (winner === 0 ? 25 + stars[0] * 5 : winner === 1 ? -20 : 0);
export const ARENAS = [
  { min: 0, name: "Training Grounds" },
  { min: 150, name: "Goblin Hollow" },
  { min: 400, name: "Frost Pass" },
  { min: 800, name: "Dragon Peak" },
  { min: 1300, name: "Royal Arena" },
];
export const arenaFor = (t: number) => [...ARENAS].reverse().find((a) => t >= a.min)!;
