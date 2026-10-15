// Sling Siege rules, with no drawing: build a level into a physics world, launch critters, use their
// abilities, turn impacts into damage, and decide when a level is won or lost. Deterministic, so the
// tests (and the level-solving bot) can replay a game exactly.
import {
  World, PHYS, triangleShape, wedgeShape,
  type Body, type Shape,
} from "./physics";
import {
  CRITTERS, GRUMBLERS, LEFTOVER_BONUS, MATERIALS, SLING,
  type CritterKind, type GrumblerKind, type MatId,
} from "./materials";
import { LEVELS, type GrumblerDef, type LevelDef, type PieceDef } from "./levels";

export type PieceKind = "block" | "grumbler" | "critter";

export interface Piece {
  id: number;
  kind: PieceKind;
  body: Body;
  hp: number;
  maxHp: number;
  dead: boolean;
  /** Squash-and-stretch kick (0..1) and a white hit flash (0..1), for the artists. */
  sq: number;
  flash: number;
  /** Blocks. */
  mat?: MatId;
  /** Grumblers. */
  gkind?: GrumblerKind;
  /** Critters. */
  ckind?: CritterKind;
  touched?: boolean;
  used?: boolean;
  /** Seconds since it left the sling, and how long it has been nearly still after touching something. */
  life?: number;
  calm?: number;
  /** Counts down to a bomber's blast once it has landed (-1 = not lit). */
  fuse?: number;
}

export type EventType =
  | "launch" | "hit" | "break" | "kill" | "boom" | "ability" | "score" | "poof" | "bonus" | "next" | "won" | "lost" | "fall";

export interface SiegeEvent {
  t: EventType;
  x: number;
  y: number;
  /** Impact strength (hit), blast radius (boom), points (score). */
  v?: number;
  mat?: MatId | "critter" | "grumbler" | "ground";
  kind?: string;
  w?: number;
  h?: number;
  a?: number;
  shape?: Piece["body"]["shape"]["kind"];
}

export type SiegePhase = "aim" | "fly" | "settle" | "won" | "lost";

export interface SiegeResult {
  won: boolean;
  /** Destruction points. */
  destruction: number;
  bonus: number;
  left: number;
  score: number;
  stars: number;
}

export interface SiegeState {
  level: LevelDef;
  index: number;
  world: World;
  pieces: Piece[];
  /** Critters still to fire; queue[0] is on the sling. */
  queue: CritterKind[];
  phase: SiegePhase;
  /** Destruction points so far (the leftover bonus is added at the end). */
  score: number;
  time: number;
  shotTime: number;
  settleTime: number;
  quietTime: number;
  /** Counts up once every grumbler is gone, so the level ends after a short celebration. */
  clearTime: number;
  grumblersLeft: number;
  shots: number;
  events: SiegeEvent[];
  result: SiegeResult | null;
  acc: number;
  nextId: number;
  nextGroup: number;
  /** TNT that went off and still has to blow. */
  blasts: { x: number; y: number }[];
}

export const STEP = PHYS.dt;
const BOMB = { radius: 3.4, power: 10, damage: 12, fuse: 0.9 };
const TNT = { radius: 3, power: 8, damage: 9 };
const GRUMBLER_BLAST = 2;
/** Physics impulses are turned into game damage with this factor (tuned together with the material strengths). */
const DAMAGE_SCALE = 1.2;
/** Anything that falls below this is gone. */
const KILL_Y = 30;
const KILL_X = 90;

// ---------------------------------------------------------------- building a level

function shapeFor(d: PieceDef): { shape: Shape; x: number; y: number; area: number } {
  const x = d.x;
  const y = -d.y;
  switch (d.shape) {
    case "ball": {
      const r = d.w / 2;
      return { shape: { kind: "circle", r }, x, y, area: Math.PI * r * r };
    }
    case "tri": {
      const sh = triangleShape(d.w, d.h);
      return { shape: sh, x, y, area: (d.w * d.h) / 2 };
    }
    case "wedge": {
      const dir = d.dir ?? 1;
      const sh = wedgeShape(d.w, d.h, dir);
      // The body sits on the centroid, which is a sixth of the box off the bounding-box centre.
      return { shape: sh, x: x - (dir * d.w) / 6, y: y + d.h / 6, area: (d.w * d.h) / 2 };
    }
    default:
      return { shape: { kind: "box", hw: d.w / 2, hh: d.h / 2 }, x, y, area: d.w * d.h };
  }
}

function addBlock(s: SiegeState, d: PieceDef) {
  const m = MATERIALS[d.mat];
  const { shape, x, y, area } = shapeFor(d);
  const fixed = d.mat === "rock";
  const body = s.world.add({
    shape, x, y, angle: d.angle ?? 0, density: fixed ? 0 : m.density, friction: m.friction, restitution: m.restitution,
  });
  const maxHp = fixed ? Infinity : m.hp * Math.max(0.5, Math.min(4, area / 0.6));
  const p: Piece = { id: s.nextId++, kind: "block", body, hp: maxHp, maxHp, dead: false, sq: 0, flash: 0, mat: d.mat };
  body.user = p;
  s.pieces.push(p);
}

function addGrumbler(s: SiegeState, d: GrumblerDef) {
  const spec = GRUMBLERS[d.kind];
  const body = s.world.add({
    shape: { kind: "circle", r: spec.r }, x: d.x, y: -d.y, density: spec.density, friction: 0.7, restitution: 0.1,
    angularDamping: 2.5,
  });
  const p: Piece = { id: s.nextId++, kind: "grumbler", body, hp: spec.hp, maxHp: spec.hp, dead: false, sq: 0, flash: 0, gkind: d.kind };
  body.user = p;
  s.pieces.push(p);
  s.grumblersLeft++;
}

/** Build a playable state from any level definition (the tests use this for tiny hand-made levels). */
export function siegeFromLevel(level: LevelDef, index = 0): SiegeState {
  const world = new World();
  const s: SiegeState = {
    level, index, world, pieces: [], queue: [...level.critters], phase: "aim", score: 0, time: 0, shotTime: 0, settleTime: 0,
    quietTime: 0, clearTime: 0, grumblersLeft: 0, shots: 0, events: [], result: null, acc: 0, nextId: 1, nextGroup: 1, blasts: [],
  };
  // The ground: a wide slab whose top is y = 0.
  world.add({ shape: { kind: "box", hw: 100, hh: 3 }, x: 20, y: 3, density: 0, friction: 0.9, restitution: 0.02 });
  for (const d of level.pieces) addBlock(s, d);
  for (const g of level.grumblers) addGrumbler(s, g);
  return s;
}

/** A level as built, before anything has settled. */
export const newSiege = (index: number) => siegeFromLevel(LEVELS[index], index);

/** A level ready to play: built, then given a moment for the blocks to settle and fall asleep. */
export function startSiege(index: number, level: LevelDef = LEVELS[index]): SiegeState {
  const s = siegeFromLevel(level, index);
  simulate(s, 2.5);
  s.events.length = 0;
  s.time = 0;
  return s;
}

/**
 * Fire the critter on the sling and run the game until the shot has played out (or the level ends).
 * `tap` is when to use the critter's trick, in seconds after launch. Used by the tests and the bot.
 */
export function playShot(s: SiegeState, pullX: number, pullY: number, tap: number | null = null, maxSeconds = 40): boolean {
  if (!launch(s, pullX, pullY)) return false;
  let t = 0;
  let tapped = false;
  while ((s.phase === "fly" || s.phase === "settle") && t < maxSeconds) {
    stepSiege(s, 1 / 60);
    t += 1 / 60;
    if (tap !== null && !tapped && t >= tap && s.phase === "fly") {
      triggerAbility(s);
      tapped = true;
    }
  }
  // If that was the last grumbler, let the short victory pause run out.
  for (let i = 0; i < 240 && s.grumblersLeft === 0 && s.phase !== "won" && s.phase !== "lost"; i++) stepSiege(s, 1 / 60);
  return true;
}

// ---------------------------------------------------------------- aiming and launching

/** Keep the pull inside the slingshot's reach (and above the ground), as a vector from the sling. */
export function clampPull(dx: number, dy: number): { x: number; y: number; len: number } {
  const len = Math.hypot(dx, dy);
  let x = dx;
  let y = dy;
  if (len > SLING.maxPull) {
    x = (dx / len) * SLING.maxPull;
    y = (dy / len) * SLING.maxPull;
  }
  // Never drag the critter into the ground.
  const maxY = -SLING.y - 0.9;
  if (y > maxY) y = maxY;
  return { x, y, len: Math.hypot(x, y) };
}

/** The pull vector for a launch angle (degrees above horizontal) and a power from 0 to 1. */
export function pullFor(angleDeg: number, power: number): { x: number; y: number } {
  const a = (angleDeg * Math.PI) / 180;
  const len = power * SLING.maxPull;
  return { x: -len * Math.cos(a), y: len * Math.sin(a) };
}

export function launchVelocity(pullX: number, pullY: number): { vx: number; vy: number; speed: number } {
  const vx = -pullX * SLING.power;
  const vy = -pullY * SLING.power;
  return { vx, vy, speed: Math.hypot(vx, vy) };
}

/** Where a critter pulled back by (pullX, pullY) would be after each interval, ignoring what it hits. */
export function trajectory(pullX: number, pullY: number, count: number, interval = 0.07, out: { x: number; y: number }[] = []) {
  const { vx: ivx, vy: ivy } = launchVelocity(pullX, pullY);
  let x = SLING.x + pullX;
  let y = SLING.y + pullY;
  let vx = ivx;
  let vy = ivy;
  const damp = 1 / (1 + STEP * 0.02);
  const per = Math.max(1, Math.round(interval / STEP));
  for (let i = 0; i < count; i++) {
    for (let k = 0; k < per; k++) {
      vy += PHYS.gravity * STEP;
      vx *= damp;
      vy *= damp;
      x += vx * STEP;
      y += vy * STEP;
    }
    if (out[i]) {
      out[i].x = x;
      out[i].y = y;
    } else out[i] = { x, y };
  }
  return out;
}

export function spawnCritter(s: SiegeState, kind: CritterKind, x: number, y: number, vx: number, vy: number, r?: number, group = 0, density?: number): Piece {
  const spec = CRITTERS[kind];
  const body = s.world.add({
    shape: { kind: "circle", r: r ?? spec.r }, x, y, vx, vy, density: density ?? spec.density, friction: 0.7, restitution: 0.22,
    linearDamping: 0.02, angularDamping: 0.8, group,
  });
  const p: Piece = {
    id: s.nextId++, kind: "critter", body, hp: Infinity, maxHp: Infinity, dead: false, sq: 0, flash: 0, ckind: kind,
    touched: false, used: false, life: 0, calm: 0, fuse: -1,
  };
  body.user = p;
  s.pieces.push(p);
  return p;
}

/** Fire the critter on the sling. (pullX, pullY) is how far it was drawn back from the sling. */
export function launch(s: SiegeState, pullX: number, pullY: number): boolean {
  if (s.phase !== "aim" || s.queue.length === 0) return false;
  const c = clampPull(pullX, pullY);
  if (c.len < SLING.minPull) return false;
  const kind = s.queue.shift()!;
  const { vx, vy, speed } = launchVelocity(c.x, c.y);
  spawnCritter(s, kind, SLING.x + c.x, SLING.y + c.y, vx, vy);
  s.phase = "fly";
  s.shotTime = 0;
  s.settleTime = 0;
  s.quietTime = 0;
  s.shots++;
  s.events.push({ t: "launch", x: SLING.x + c.x, y: SLING.y + c.y, v: speed, kind });
  return true;
}

export function critters(s: SiegeState): Piece[] {
  return s.pieces.filter((p) => p.kind === "critter" && !p.dead);
}

/** The critter whose trick a tap would trigger, if any. */
export function abilityTarget(s: SiegeState): Piece | null {
  if (s.phase !== "fly") return null;
  for (const p of s.pieces) {
    if (p.kind !== "critter" || p.dead || p.used) continue;
    if (p.ckind === "basic") continue;
    if (p.ckind !== "bomber" && p.touched) continue;
    return p;
  }
  return null;
}

/** Use the in-flight trick of the current critter. Returns true if something happened. */
export function triggerAbility(s: SiegeState): boolean {
  const p = abilityTarget(s);
  if (!p) return false;
  const b = p.body;
  p.used = true;
  const kind = p.ckind!;
  s.events.push({ t: "ability", x: b.x, y: b.y, kind });
  if (kind === "splitter") {
    const speed = Math.hypot(b.vx, b.vy);
    const ang = Math.atan2(b.vy, b.vx);
    const group = 1000 + s.nextGroup++;
    const x = b.x;
    const y = b.y;
    killPiece(s, p, false);
    for (const off of [-0.2, 0, 0.2]) {
      const a = ang + off;
      const nx = -Math.sin(ang) * (off / 0.2) * 0.42;
      const ny = Math.cos(ang) * (off / 0.2) * 0.42;
      const c = spawnCritter(s, "splitter", x + nx, y + ny, Math.cos(a) * speed, Math.sin(a) * speed, 0.3, group, 3.4);
      c.used = true;
    }
  } else if (kind === "dasher") {
    const speed = Math.hypot(b.vx, b.vy) || 1;
    const k = Math.min(1.9, 46 / speed);
    b.vx *= k;
    b.vy *= k;
  } else if (kind === "heavy") {
    b.vx *= 0.3;
    b.vy = Math.max(b.vy, 0) + 24;
  } else if (kind === "bomber") {
    const x = b.x;
    const y = b.y;
    killPiece(s, p, false);
    explode(s, x, y, BOMB.radius, BOMB.power, BOMB.damage);
  }
  return true;
}

// ---------------------------------------------------------------- damage

function pieceSize(p: Piece): number {
  const sh = p.body.shape;
  return sh.kind === "circle" ? sh.r : sh.kind === "box" ? Math.max(sh.hw, sh.hh) : Math.sqrt(sh.area) / 2;
}

function toughOf(p: Piece): number {
  if (p.kind === "block") return MATERIALS[p.mat!].tough;
  if (p.kind === "grumbler") return GRUMBLERS[p.gkind!].tough;
  return Infinity;
}

function addScore(s: SiegeState, x: number, y: number, pts: number) {
  if (pts <= 0) return;
  s.score += pts;
  s.events.push({ t: "score", x, y: y - 0.6, v: pts });
}

/** Remove a piece for good. `score` awards its points. */
function killPiece(s: SiegeState, p: Piece, score: boolean) {
  if (p.dead) return;
  p.dead = true;
  const b = p.body;
  s.world.remove(b);
  if (p.kind === "block") {
    const m = MATERIALS[p.mat!];
    const sh = b.shape;
    const w = sh.kind === "box" ? sh.hw * 2 : sh.kind === "circle" ? sh.r * 2 : Math.sqrt(sh.area);
    const h = sh.kind === "box" ? sh.hh * 2 : sh.kind === "circle" ? sh.r * 2 : Math.sqrt(sh.area);
    s.events.push({ t: "break", x: b.x, y: b.y, mat: p.mat, w, h, a: b.a, shape: sh.kind });
    if (score) addScore(s, b.x, b.y, m.points);
    if (p.mat === "tnt") s.blasts.push({ x: b.x, y: b.y });
  } else if (p.kind === "grumbler") {
    s.grumblersLeft--;
    s.events.push({ t: "kill", x: b.x, y: b.y, kind: p.gkind, w: pieceSize(p) * 2 });
    if (score) addScore(s, b.x, b.y, GRUMBLERS[p.gkind!].points);
  } else {
    s.events.push({ t: "poof", x: b.x, y: b.y, w: pieceSize(p) * 2 });
  }
}

function hurt(s: SiegeState, p: Piece, amount: number) {
  if (p.dead || amount <= 0 || !Number.isFinite(p.hp)) return;
  p.hp -= amount;
  p.flash = 1;
  if (p.hp <= 0) killPiece(s, p, true);
}

/** A radial blast: shoves bodies away and hurts what is close. */
export function explode(s: SiegeState, x: number, y: number, radius: number, power: number, damage: number) {
  s.events.push({ t: "boom", x, y, v: radius });
  for (const p of s.pieces.slice()) {
    if (p.dead || p.kind === "critter") continue;
    const b = p.body;
    if (b.invMass === 0) continue;
    const dx = b.x - x;
    const dy = b.y - y;
    const d = Math.hypot(dx, dy);
    const f = 1 - Math.max(0, d - pieceSize(p) * 0.6) / radius;
    if (f <= 0) continue;
    const nx = d > 1e-6 ? dx / d : 0;
    const ny = d > 1e-6 ? dy / d : -1;
    // A little lift so rubble flies up and out.
    const ux = nx;
    const uy = ny - 0.35;
    const ul = Math.hypot(ux, uy) || 1;
    const dv = power * f;
    s.world.applyImpulse(b, (ux / ul) * dv * b.mass, (uy / ul) * dv * b.mass);
    const blast = p.kind === "grumbler" ? GRUMBLER_BLAST : MATERIALS[p.mat!].blast;
    hurt(s, p, damage * f * blast);
    p.sq = Math.max(p.sq, f);
  }
  for (const c of s.pieces) {
    // Other critters get a shove too, but no damage.
    if (c.dead || c.kind !== "critter") continue;
    const dx = c.body.x - x;
    const dy = c.body.y - y;
    const f = 1 - Math.hypot(dx, dy) / radius;
    if (f > 0) s.world.applyImpulse(c.body, dx * f * c.body.mass, (dy - 1) * f * c.body.mass);
  }
}

function flushBlasts(s: SiegeState) {
  let guard = 0;
  while (s.blasts.length && guard++ < 24) {
    const q = s.blasts.shift()!;
    explode(s, q.x, q.y, TNT.radius, TNT.power, TNT.damage);
  }
  s.blasts.length = 0;
}

function damageFrom(s: SiegeState, victim: Piece, other: Piece | undefined, impact: number) {
  if (victim.kind === "critter") return;
  let amount = Math.max(0, impact - toughOf(victim));
  if (other && other.kind === "critter" && victim.kind === "block" && victim.mat === "stone") amount *= CRITTERS[other.ckind!].stoneBonus;
  if (victim.kind === "grumbler") victim.sq = Math.max(victim.sq, Math.min(1, impact / 3));
  if (amount > 0) hurt(s, victim, amount);
}

function processImpacts(s: SiegeState) {
  const list = s.world.impacts;
  for (let i = 0; i < list.length; i++) {
    const arb = list[i];
    const pa = arb.a.user as Piece | undefined;
    const pb = arb.b.user as Piece | undefined;
    const imp = arb.impact * DAMAGE_SCALE;
    const c = arb.contacts[0];
    if (pa?.kind === "critter" && !pa.touched) pa.touched = true;
    if (pb?.kind === "critter" && !pb.touched) pb.touched = true;
    for (const c2 of [pa, pb]) {
      if (c2?.kind === "critter" && c2.ckind === "bomber" && c2.fuse! < 0 && !c2.used) c2.fuse = BOMB.fuse;
    }
    if (imp > 0.7) {
      const pick = pa && pa.kind !== "critter" ? pa : pb && pb.kind !== "critter" ? pb : pa ?? pb;
      const mat = pick ? (pick.kind === "block" ? pick.mat : pick.kind === "grumbler" ? "grumbler" : "critter") : "ground";
      s.events.push({ t: "hit", x: c.x, y: c.y, v: imp, mat });
    }
    if (pa) damageFrom(s, pa, pb, imp);
    if (pb) damageFrom(s, pb, pa, imp);
  }
}

// ---------------------------------------------------------------- stepping

function tick(s: SiegeState) {
  s.time += STEP;
  s.world.step(STEP);
  processImpacts(s);
  flushBlasts(s);

  let flying = 0;
  let allDone = true;
  for (const p of s.pieces) {
    if (p.dead) continue;
    if (p.sq > 0) p.sq = Math.max(0, p.sq - STEP * 2.6);
    if (p.flash > 0) p.flash = Math.max(0, p.flash - STEP * 5);
    const b = p.body;
    if (b.y > KILL_Y || Math.abs(b.x - 20) > KILL_X) {
      if (p.kind === "critter") killPiece(s, p, false);
      else {
        if (p.kind === "grumbler") s.events.push({ t: "fall", x: b.x, y: KILL_Y - 4, kind: p.gkind });
        killPiece(s, p, p.kind === "grumbler");
      }
      continue;
    }
    if (p.kind !== "critter") continue;
    flying++;
    p.life! += STEP;
    const speed = Math.hypot(b.vx, b.vy);
    if (p.touched && speed < 1.3) p.calm! += STEP;
    else p.calm = 0;
    if (p.fuse! >= 0 && !p.used) {
      p.fuse! -= STEP;
      if (p.fuse! <= 0) {
        p.used = true;
        const x = b.x;
        const y = b.y;
        killPiece(s, p, false);
        explode(s, x, y, BOMB.radius, BOMB.power, BOMB.damage);
        flushBlasts(s);
        continue;
      }
    }
    if (p.calm! < 0.6 && p.life! < 9) allDone = false;
  }
  if (s.pieces.some((p) => p.dead)) s.pieces = s.pieces.filter((p) => !p.dead);

  if (s.phase === "fly") {
    s.shotTime += STEP;
    if (flying === 0 || allDone) {
      s.phase = "settle";
      s.settleTime = 0;
      s.quietTime = 0;
    }
  }
  if (s.phase === "settle") {
    s.settleTime += STEP;
    s.quietTime = s.world.isQuiet(0.3) ? s.quietTime + STEP : 0;
    if (s.quietTime >= 0.7 || s.settleTime > 7) endShot(s);
  }
  if (s.grumblersLeft <= 0 && s.phase !== "won" && s.phase !== "lost") {
    s.clearTime += STEP;
    if (s.clearTime >= 1.3) win(s);
  }
}

function endShot(s: SiegeState) {
  for (const p of s.pieces) if (p.kind === "critter" && !p.dead) killPiece(s, p, false);
  s.pieces = s.pieces.filter((p) => !p.dead);
  if (s.grumblersLeft <= 0) win(s);
  else if (s.queue.length === 0) {
    s.phase = "lost";
    s.result = { won: false, destruction: s.score, bonus: 0, left: 0, score: s.score, stars: 0 };
    s.events.push({ t: "lost", x: 0, y: 0 });
  } else {
    s.phase = "aim";
    s.events.push({ t: "next", x: 0, y: 0 });
  }
}

function win(s: SiegeState) {
  if (s.phase === "won") return;
  for (const p of s.pieces) if (p.kind === "critter" && !p.dead) killPiece(s, p, false);
  s.pieces = s.pieces.filter((p) => !p.dead);
  const left = s.queue.length;
  const bonus = left * LEFTOVER_BONUS;
  const score = s.score + bonus;
  s.phase = "won";
  s.result = { won: true, destruction: s.score, bonus, left, score, stars: starsFor(s.level, score) };
  s.events.push({ t: "won", x: 0, y: 0, v: score });
}

/** Advance the game by dt seconds (a fixed 1/120 s step inside). Returns the events that happened. */
export function stepSiege(s: SiegeState, dt: number): SiegeEvent[] {
  s.events.length = 0;
  s.acc += dt;
  let n = 0;
  while (s.acc >= STEP && n < 10) {
    tick(s);
    s.acc -= STEP;
    n++;
  }
  if (n >= 10) s.acc = 0;
  return s.events;
}

/** Run the simulation for a number of seconds (tests and bots). Events are collected in `all` if given. */
export function simulate(s: SiegeState, seconds: number, all?: SiegeEvent[]) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i++) {
    s.events.length = 0;
    tick(s);
    if (all) for (const e of s.events) all.push(e);
  }
}

// ---------------------------------------------------------------- stars and progress

export interface Potential {
  grumblers: number;
  blocks: number;
}

export function levelPotential(level: LevelDef): Potential {
  let grumblers = 0;
  let blocks = 0;
  for (const g of level.grumblers) grumblers += GRUMBLERS[g.kind].points;
  for (const p of level.pieces) blocks += MATERIALS[p.mat].points;
  return { grumblers, blocks };
}

/** Scores needed for two and three stars. One star is simply winning. */
export function starTargets(level: LevelDef): [number, number] {
  const { grumblers, blocks } = levelPotential(level);
  const par = level.par > 0 ? level.par : grumblers + 0.6 * blocks + LEFTOVER_BONUS * Math.floor(level.critters.length / 2);
  // Clearing the grumblers is worth `grumblers` points on its own, so the stars are measured above that.
  const extra = Math.max(0, par - grumblers);
  const round = (v: number) => Math.round(v / 100) * 100;
  return [round(grumblers + 0.3 * extra), round(grumblers + 0.65 * extra)];
}

export function starsFor(level: LevelDef, score: number): number {
  const [two, three] = starTargets(level);
  return score >= three ? 3 : score >= two ? 2 : 1;
}

export interface Progress {
  stars: number[];
  scores: number[];
}

export const emptyProgress = (n = LEVELS.length): Progress => ({ stars: new Array(n).fill(0), scores: new Array(n).fill(0) });

export function normalizeProgress(raw: unknown, n = LEVELS.length): Progress {
  const p = emptyProgress(n);
  const r = raw as Partial<Progress> | null;
  if (!r || !Array.isArray(r.stars) || !Array.isArray(r.scores)) return p;
  for (let i = 0; i < n; i++) {
    const st = Number(r.stars[i]);
    const sc = Number(r.scores[i]);
    p.stars[i] = Number.isFinite(st) ? Math.max(0, Math.min(3, Math.floor(st))) : 0;
    p.scores[i] = Number.isFinite(sc) ? Math.max(0, Math.floor(sc)) : 0;
  }
  return p;
}

/** Level i opens once level i-1 has been cleared. */
export const isUnlocked = (p: Progress, i: number) => i === 0 || p.stars[i - 1] > 0;

export const totalScore = (p: Progress) => p.scores.reduce((a, b) => a + b, 0);
export const totalStars = (p: Progress) => p.stars.reduce((a, b) => a + b, 0);

/** Fold a finished level into the saved progress, keeping the best of everything. */
export function recordResult(p: Progress, i: number, score: number, stars: number): { progress: Progress; improved: boolean } {
  const next: Progress = { stars: [...p.stars], scores: [...p.scores] };
  const improved = score > next.scores[i] || stars > next.stars[i];
  next.scores[i] = Math.max(next.scores[i], Math.floor(score));
  next.stars[i] = Math.max(next.stars[i], stars);
  return { progress: next, improved };
}

export { CRITTERS, GRUMBLERS, MATERIALS, SLING, LEFTOVER_BONUS };
