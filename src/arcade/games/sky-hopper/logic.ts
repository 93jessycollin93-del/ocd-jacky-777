// Sky Hopper rules: an endless climber. Pure and seeded so it can be tested. The y axis points UP here (height),
// the renderer flips it. The player bounces by itself; you steer sideways and shoot.
import { mulberry32, type Rng } from "../../kit/rng";

export const STEP = 1 / 120;
/** The page is always this wide; leaving one side brings you back on the other. */
export const W = 400;
export const GRAVITY = 1500;
export const BOUNCE_V = 820;
export const SPRING_V = 1340;
export const JET_V = 1060;
export const JET_TIME = 2.5;
export const MAX_FALL = 1500;
export const MAX_VX = 340;
const ACCEL = 2800;
const FRICTION = 2100;

export const PLAYER_HALF_W = 17;
export const PLAYER_H = 44;
/** The feet are narrower than the body when landing on an edge. */
export const FEET = 13;
export const PLATFORM_W = 74;
export const PLATFORM_H = 14;
export const SPRING_H = 14;

/** Apex height of a normal bounce, and the biggest vertical gap the generator ever makes. */
export const APEX = (BOUNCE_V * BOUNCE_V) / (2 * GRAVITY);
export const MAX_GAP_CAP = Math.floor(APEX * 0.84);

export type PlatformKind = "normal" | "moving" | "break" | "vanish" | "spring" | "ground";

export interface Platform {
  id: number;
  kind: PlatformKind;
  /** Centre x. */
  x: number;
  /** Height of the surface you land on. */
  y: number;
  w: number;
  vx: number;
  minX: number;
  maxX: number;
  /** Breaking platforms crumble when touched; vanishing ones count down after a bounce. */
  broken: boolean;
  /** Seconds since it broke / started vanishing (drives the animation); -1 if it hasn't. */
  t: number;
  /** Spring compression animation, 1 → 0. */
  squash: number;
}

export type MonsterKind = "blob" | "bat" | "brute";
export interface Monster {
  id: number;
  kind: MonsterKind;
  x: number;
  /** Centre height. */
  y: number;
  vx: number;
  hx: number;
  hy: number;
  hp: number;
  alive: boolean;
  /** Seconds since it died (for the poof animation), -1 while alive. */
  deadT: number;
  phase: number;
}

export interface Jet {
  x: number;
  y: number;
  taken: boolean;
}

export interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

export type HopEvent =
  | "bounce" | "spring" | "crumble" | "vanish" | "stomp" | "shoot" | "monster-shot" | "monster-hit" | "jet" | "jet-end"
  | "hit" | "fall";

export interface HopState {
  rng: Rng;
  w: number;
  platforms: Platform[];
  monsters: Monster[];
  jets: Jet[];
  bullets: Bullet[];
  /** Feet position and velocity. */
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** -1 left, 0 none, 1 right (analog values are fine). */
  dir: number;
  facing: 1 | -1;
  /** Aim angle in radians (0 = right, π/2 = up) for drawing the nose. */
  aim: number;
  aimT: number;
  shootCd: number;
  jetT: number;
  /** Bottom of the view and its height, in world units. Only ever moves up. */
  camY: number;
  viewH: number;
  maxY: number;
  alive: boolean;
  /** How the run ended: "fell" off the page or "monster". */
  cause: "fell" | "monster" | null;
  deadT: number;
  /** Seconds since the last landing, for squash-and-stretch. */
  sinceBounce: number;
  /** Generation bookkeeping. */
  topY: number;
  lastChain: Platform;
  nextId: number;
  lastJetY: number;
  lastCleanup: number;
  acc: number;
  time: number;
  events: HopEvent[];
}

// ---------------------------------------------------------------- spacing and reachability

const smooth = (t: number) => {
  const k = Math.min(1, Math.max(0, t));
  return k * (2 - k);
};

/** Score is the height divided by this. */
export const SCORE_DIV = 10;
export const scoreFor = (height: number) => Math.max(0, Math.floor(height / SCORE_DIV));

/** How far apart (vertically) the next platform may be. Grows with height but is capped below the bounce apex. */
export function gapRange(height: number) {
  const k = smooth(height / 34000);
  const max = Math.min(MAX_GAP_CAP, Math.round(74 + (MAX_GAP_CAP - 74) * k));
  return { min: Math.round(max * 0.5), max };
}

/** Time for a bounce launched at `v` to come back down through `dy` above the launch point; -1 if it never gets there. */
export function timeToDescendTo(dy: number, v = BOUNCE_V) {
  const disc = v * v - 2 * GRAVITY * dy;
  if (disc < 0) return -1;
  return (v + Math.sqrt(disc)) / GRAVITY;
}

/** Shortest sideways distance on a page that wraps around. */
export function wrapDist(a: number, b: number, w = W) {
  const d = Math.abs(a - b) % w;
  return Math.min(d, w - d);
}

/** Signed shortest delta from b to a on the wrapped page. */
export function wrapDelta(a: number, b: number, w = W) {
  return ((((a - b + w / 2) % w) + w) % w) - w / 2;
}

/** How far sideways a steering player can get while falling back down to a platform `dy` higher. 80% of top speed. */
export function reachX(dy: number) {
  const t = timeToDescendTo(dy);
  return t < 0 ? 0 : MAX_VX * t * 0.8;
}

/** Worst-case sideways distance between where two platforms can be (moving ones cover a range). */
export function worstDx(a: Platform, b: Platform) {
  let worst = 0;
  for (const ax of [a.minX, a.maxX]) for (const bx of [b.minX, b.maxX]) worst = Math.max(worst, wrapDist(ax, bx));
  return worst;
}

/** Can a player bouncing off `a` always get down onto `b`? Platforms below are always reachable (just drop). */
export function canReach(a: Platform, b: Platform) {
  const dy = b.y - a.y;
  if (dy <= 0) return true;
  if (dy > APEX * 0.9) return false;
  return worstDx(a, b) <= reachX(dy);
}

// ---------------------------------------------------------------- building the world

function makePlatform(s: HopState, kind: PlatformKind, x: number, y: number): Platform {
  const w = kind === "ground" ? W : PLATFORM_W;
  return {
    id: s.nextId++, kind, x, y, w, vx: 0, minX: x, maxX: x, broken: false, t: -1, squash: 0,
  };
}

const clampX = (x: number, w = PLATFORM_W) => Math.min(W - w / 2, Math.max(w / 2, x));

export function newGame(seed = 1, viewH = 640): HopState {
  const rng = mulberry32(seed);
  const s = {
    rng, w: W, platforms: [], monsters: [], jets: [], bullets: [], x: W / 2, y: 0, vx: 0, vy: BOUNCE_V, dir: 0, facing: 1,
    aim: Math.PI / 2, aimT: 0, shootCd: 0, jetT: 0, camY: -viewH * 0.08, viewH, maxY: 0, alive: true, cause: null, deadT: 0,
    sinceBounce: 0, topY: 0, lastChain: null as unknown as Platform, nextId: 1, lastJetY: -9999, lastCleanup: 0, acc: 0, time: 0, events: [],
  } as HopState;
  const ground = makePlatform(s, "ground", W / 2, 0);
  s.platforms.push(ground);
  s.lastChain = makePlatform(s, "normal", W / 2, 0);
  ensureWorld(s);
  return s;
}

/** Kinds get more varied the higher you go. */
function pickKind(s: HopState, height: number): PlatformKind {
  const r = s.rng();
  const moving = height < 700 ? 0 : Math.min(0.34, 0.1 + (height - 700) / 14000);
  const vanish = height < 2400 ? 0 : Math.min(0.16, (height - 2400) / 26000 + 0.04);
  const spring = height < 350 ? 0 : 0.07;
  if (r < spring) return "spring";
  if (r < spring + moving) return "moving";
  if (r < spring + moving + vanish) return "vanish";
  return "normal";
}

function addRow(s: HopState) {
  const prev = s.lastChain;
  const height = s.topY;
  const { min, max } = gapRange(height);
  const gap = Math.round(min + s.rng() * (max - min));
  const kind = pickKind(s, height);
  // `surface` is what you land on; a spring platform's bar sits SPRING_H below it, under the coil.
  const surface = prev.y + gap;
  const dy = gap;
  const comfy = Math.min(W / 2 - 20, reachX(dy) * 0.62);
  const x = clampX(prev.x + (s.rng() * 2 - 1) * comfy);
  const p = makePlatform(s, kind, x, surface);
  if (kind === "moving") {
    const amp = 40 + s.rng() * 40;
    p.vx = (s.rng() < 0.5 ? -1 : 1) * (55 + Math.min(70, height / 450) + s.rng() * 25);
    p.minX = clampX(x - amp);
    p.maxX = clampX(x + amp);
    // Never let the swing make the next hop unreachable.
    while (p.maxX - p.minX > 1 && !canReach(prev, p)) {
      p.minX = (p.minX + x) / 2;
      p.maxX = (p.maxX + x) / 2;
    }
    if (p.maxX - p.minX < 12) {
      p.kind = "normal";
      p.vx = 0;
      p.minX = p.maxX = x;
    }
  } else {
    p.minX = p.maxX = x;
  }
  s.platforms.push(p);
  s.lastChain = p;
  s.topY = p.y;

  // A crumbly decoy somewhere in between: tempting, but you fall straight through it.
  if (height > 420 && s.rng() < Math.min(0.3, 0.1 + height / 40000)) {
    const dyD = 24 + s.rng() * Math.max(10, surface - prev.y - 48);
    const dx = clampX(s.rng() * W);
    const d = makePlatform(s, "break", dx, prev.y + dyD);
    if (wrapDist(dx, prev.x) > 24 || Math.abs(d.y - prev.y) > 30) s.platforms.push(d);
  }
  // A rare jetpack.
  if (height > 1400 && kind !== "spring" && kind !== "moving" && s.rng() < 0.032 && height - s.lastJetY > 1800) {
    s.jets.push({ x: p.x, y: p.y + 26, taken: false });
    s.lastJetY = height;
  }
  // Monsters from a few hundred points up, more often later; never right on the platforms themselves.
  const chance = height < 1100 ? 0 : Math.min(0.2, 0.05 + (height - 1100) / 40000);
  if (kind !== "spring" && s.rng() < chance) addMonster(s, prev, p);
}

function addMonster(s: HopState, a: Platform, b: Platform) {
  const height = b.y;
  const r = s.rng();
  const kind: MonsterKind = height > 6500 && r < 0.2 ? "brute" : r < 0.55 ? "blob" : "bat";
  const hx = kind === "brute" ? 32 : 23;
  const hy = kind === "brute" ? 26 : 20;
  let x = clampX(s.rng() * W, 0);
  for (let i = 0; i < 6 && (wrapDist(x, a.x) < 80 || wrapDist(x, b.x) < 80); i++) x = clampX(s.rng() * W, 0);
  const y = a.y + (b.y - a.y) * (0.35 + s.rng() * 0.3) + 30;
  s.monsters.push({
    id: s.nextId++, kind, x, y, vx: kind === "bat" ? (s.rng() < 0.5 ? -1 : 1) * (70 + s.rng() * 50) : 0, hx, hy,
    hp: kind === "brute" ? 3 : 1, alive: true, deadT: -1, phase: s.rng() * 6.28,
  });
}

/** Make platforms for everything the camera could see soon. */
export function ensureWorld(s: HopState) {
  let guard = 0;
  while (s.topY < s.camY + s.viewH + 900 && guard++ < 200) addRow(s);
  // Forget what is far below the view (a few times a second is plenty).
  if (s.time - s.lastCleanup < 0.5) return;
  s.lastCleanup = s.time;
  const floor = s.camY - 260;
  s.platforms = s.platforms.filter((p) => p.y >= floor && !(p.t > 1.2));
  s.monsters = s.monsters.filter((m) => m.y > floor - 100 && !(m.deadT > 1));
  s.jets = s.jets.filter((j) => j.y > floor && !j.taken);
}

// ---------------------------------------------------------------- input

export function setDir(s: HopState, dir: number) {
  s.dir = Math.max(-1, Math.min(1, dir));
}

/** Where a shot toward (tx, ty) actually goes: always upward, never flatter than 15 degrees. */
export function aimAngle(px: number, py: number, tx: number, ty: number) {
  const lo = (15 * Math.PI) / 180;
  const dx = tx - px;
  const dy = ty - py;
  let a = Math.atan2(dy, dx);
  if (dy <= 0) a = Math.abs(dx) < 1 ? Math.PI / 2 : dx > 0 ? lo : Math.PI - lo;
  return Math.min(Math.PI - lo, Math.max(lo, a));
}

/** Fire toward a world point. Returns false while reloading or after dying. */
export function shoot(s: HopState, tx: number, ty: number) {
  if (!s.alive || s.shootCd > 0) return false;
  const a = aimAngle(s.x, s.y + PLAYER_H * 0.6, tx, ty);
  const sp = 820;
  s.bullets.push({ x: s.x, y: s.y + PLAYER_H * 0.7, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1.15 });
  s.shootCd = 0.22;
  s.aim = a;
  s.aimT = 0.3;
  s.events.push("shoot");
  return true;
}

// ---------------------------------------------------------------- the step

function overlapsMonster(s: HopState, m: Monster) {
  const dx = Math.abs(wrapDelta(s.x, m.x));
  if (dx > m.hx + PLAYER_HALF_W - 3) return false;
  const top = s.y + PLAYER_H;
  return top > m.y - m.hy && s.y < m.y + m.hy;
}

function kill(s: HopState, m: Monster) {
  m.alive = false;
  m.deadT = 0;
}

/** Advance exactly one fixed step. */
export function step(s: HopState) {
  const dt = STEP;
  s.time += dt;
  s.sinceBounce += dt;
  s.shootCd = Math.max(0, s.shootCd - dt);
  s.aimT = Math.max(0, s.aimT - dt);

  // Platforms that move, crumble or vanish.
  for (const p of s.platforms) {
    if (p.kind === "moving") {
      p.x += p.vx * dt;
      if (p.x < p.minX) {
        p.x = p.minX;
        p.vx = Math.abs(p.vx);
      } else if (p.x > p.maxX) {
        p.x = p.maxX;
        p.vx = -Math.abs(p.vx);
      }
    }
    if (p.t >= 0) p.t += dt;
    if (p.squash > 0) p.squash = Math.max(0, p.squash - dt * 4);
    if (p.kind === "vanish" && p.t >= 0.16 && !p.broken) p.broken = true;
  }
  for (const m of s.monsters) {
    if (!m.alive) {
      m.deadT += dt;
      continue;
    }
    m.phase += dt * 3;
    if (m.kind === "bat") {
      m.x += m.vx * dt;
      if (m.x < m.hx) {
        m.x = m.hx;
        m.vx = Math.abs(m.vx);
      } else if (m.x > W - m.hx) {
        m.x = W - m.hx;
        m.vx = -Math.abs(m.vx);
      }
    }
  }

  // Bullets.
  for (const b of s.bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (b.life <= 0 || b.x < -20 || b.x > W + 20) {
      b.life = 0;
      continue;
    }
    for (const m of s.monsters) {
      if (!m.alive) continue;
      if (Math.abs(b.x - m.x) < m.hx + 5 && Math.abs(b.y - m.y) < m.hy + 5) {
        b.life = 0;
        m.hp--;
        if (m.hp <= 0) {
          kill(s, m);
          s.events.push("monster-shot");
        } else {
          s.events.push("monster-hit");
        }
        break;
      }
    }
  }
  if (s.bullets.length) s.bullets = s.bullets.filter((b) => b.life > 0);

  if (!s.alive) {
    // Tumble off the bottom of the page.
    s.vy = Math.max(-MAX_FALL, s.vy - GRAVITY * dt);
    s.y += s.vy * dt;
    s.deadT += dt;
    s.vx *= 0.99;
    s.x += s.vx * dt;
    followCamera(s, dt);
    return;
  }

  // Steering: speed up toward the pressed direction, slide to a stop when nothing is held.
  const target = s.dir * MAX_VX;
  const a = s.dir !== 0 ? ACCEL : FRICTION;
  const dv = target - s.vx;
  s.vx += Math.max(-a * dt, Math.min(a * dt, dv));
  if (s.dir > 0.1) s.facing = 1;
  else if (s.dir < -0.1) s.facing = -1;
  const prevY = s.y;
  s.x += s.vx * dt;
  // Leaving one side brings you back on the other.
  if (s.x < 0) s.x += W;
  else if (s.x >= W) s.x -= W;

  if (s.jetT > 0) {
    s.jetT -= dt;
    s.vy = Math.min(JET_V, s.vy + 5200 * dt);
    if (s.jetT <= 0) {
      s.jetT = 0;
      s.vy = Math.min(s.vy, 420);
      s.events.push("jet-end");
    }
  } else {
    s.vy = Math.max(-MAX_FALL, s.vy - GRAVITY * dt);
  }
  s.y += s.vy * dt;

  // Landing: only while falling, only from above, only on the platform's surface.
  if (s.vy < 0 && s.jetT <= 0) {
    for (const p of s.platforms) {
      if (p.broken || (p.kind === "break" && p.t >= 0)) continue;
      if (prevY < p.y - 0.5 || s.y > p.y) continue;
      if (Math.abs(wrapDelta(s.x, p.x)) > p.w / 2 + FEET) continue;
      if (p.kind === "break") {
        // No bounce: you keep falling right through the crumbling page.
        p.t = 0;
        s.events.push("crumble");
        continue;
      }
      s.y = p.y;
      s.sinceBounce = 0;
      if (p.kind === "spring") {
        s.vy = SPRING_V;
        p.squash = 1;
        s.events.push("spring");
      } else {
        s.vy = BOUNCE_V;
        if (p.kind === "vanish") {
          p.t = 0;
          s.events.push("vanish");
        } else s.events.push("bounce");
      }
      break;
    }
  }

  if (s.y > s.maxY) s.maxY = s.y;

  // Pickups.
  for (const j of s.jets) {
    if (j.taken) continue;
    if (Math.abs(wrapDelta(s.x, j.x)) < 34 && Math.abs(s.y + PLAYER_H / 2 - j.y) < 44) {
      j.taken = true;
      s.jetT = JET_TIME;
      s.vy = Math.max(s.vy, 600);
      s.events.push("jet");
    }
  }

  // Monsters: land on top of one to stomp it; touch one any other way and you are done (a jetpack plows through).
  if (s.alive) {
    for (const m of s.monsters) {
      if (!m.alive || !overlapsMonster(s, m)) continue;
      if (s.jetT > 0) {
        kill(s, m);
        s.events.push("monster-shot");
        continue;
      }
      const stomp = s.vy < 0 && prevY >= m.y + m.hy * 0.3;
      if (stomp) {
        kill(s, m);
        s.vy = BOUNCE_V;
        s.sinceBounce = 0;
        s.events.push("stomp");
      } else {
        s.alive = false;
        s.cause = "monster";
        s.vy = Math.min(s.vy, 120);
        s.vx = s.x < m.x ? -120 : 120;
        s.events.push("hit");
        break;
      }
    }
  }

  followCamera(s, dt);
  // Falling below the bottom of the page ends the run.
  if (s.alive && s.y + PLAYER_H < s.camY - 6) {
    s.alive = false;
    s.cause = "fell";
    s.events.push("fall");
  }
}

function followCamera(s: HopState, dt: number) {
  // The camera only ever climbs: it follows the player above the middle of the view and never comes back down.
  const target = s.y - s.viewH * 0.46;
  if (target > s.camY) s.camY += (target - s.camY) * Math.min(1, 14 * dt);
}

/** Advance by real time using fixed steps. Returns the events (the array is reused between calls). */
export function update(s: HopState, dt: number): HopEvent[] {
  s.events.length = 0;
  s.acc += dt;
  let n = 0;
  while (s.acc >= STEP && n < 12) {
    step(s);
    s.acc -= STEP;
    n++;
    if (n % 3 === 0) ensureWorld(s);
  }
  if (n >= 12) s.acc = 0;
  ensureWorld(s);
  return s.events;
}

export const heightOf = (s: HopState) => Math.max(0, s.maxY);
export const scoreOf = (s: HopState) => scoreFor(heightOf(s));
