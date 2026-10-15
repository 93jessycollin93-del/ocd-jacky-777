// Missile Defense rules: pure TypeScript, seeded, no DOM. The world is 800 × 600 logical units with the ground
// at y = GROUND. Three bases fire interceptors that burst into expanding blasts; anything inside a blast is
// destroyed. Warheads target cities and bases; later waves add splitting missiles (MIRVs), smart bombs that
// sidestep blasts, and bombers that cross the sky dropping warheads.
import { mulberry32, type Rng } from "../../kit/rng";

export const W = 800;
export const H = 600;
export const GROUND = 556;
export const BASE_X = [62, 400, 738];
export const CITY_X = [150, 222, 294, 506, 578, 650];
export const AMMO = 10;
export const BLAST_R = 42;
export const BLAST_GROW = 0.45;
export const BLAST_HOLD = 0.2;
export const BLAST_SHRINK = 0.5;
export const BONUS_CITY_EVERY = 10000;

export type ThreatKind = "warhead" | "mirv" | "smart";

export interface Threat {
  id: number;
  kind: ThreatKind;
  x0: number;
  y0: number;
  x: number;
  y: number;
  tx: number;
  ty: number;
  speed: number;
  /** MIRVs split when they fall below this height. */
  splitY: number;
  alive: boolean;
}

export interface Bomber {
  id: number;
  x: number;
  y: number;
  vx: number;
  dropIn: number;
  kind: "bomber" | "satellite";
  alive: boolean;
}

export interface Interceptor {
  x0: number;
  y0: number;
  x: number;
  y: number;
  tx: number;
  ty: number;
  speed: number;
}

export interface Blast {
  x: number;
  y: number;
  t: number;
  /** Blasts from the player's interceptors (and the chains they set off) score; ground hits don't. */
  friendly: boolean;
  /** Radius multiplier (small chain blasts and ground hits are smaller). */
  size: number;
}

export interface Base {
  x: number;
  ammo: number;
  alive: boolean;
}

export type MdEvent =
  | { type: "fire"; base: number }
  | { type: "empty" }
  | { type: "kill"; x: number; y: number; points: number; kind: ThreatKind | "bomber" | "satellite" }
  | { type: "split"; x: number; y: number }
  | { type: "city"; index: number; x: number }
  | { type: "base"; index: number; x: number }
  | { type: "ground"; x: number }
  | { type: "waveEnd"; bonus: number; ammoLeft: number; cities: number }
  | { type: "bonusCity"; index: number }
  | { type: "gameOver" };

export interface MdState {
  rng: Rng;
  wave: number;
  score: number;
  cities: boolean[];
  bases: Base[];
  threats: Threat[];
  bombers: Bomber[];
  shots: Interceptor[];
  blasts: Blast[];
  /** Threats still to launch this wave, and time to the next launch. */
  toLaunch: number;
  launchIn: number;
  bombersToLaunch: number;
  /** Cities earned but not yet rebuilt. */
  spareCities: number;
  nextBonusAt: number;
  /** Between waves: counts down, then the next wave starts. */
  intermission: number;
  over: boolean;
  nextId: number;
  time: number;
}

export function newGame(seed: number): MdState {
  const s: MdState = {
    rng: mulberry32(seed), wave: 0, score: 0, cities: CITY_X.map(() => true), bases: [], threats: [], bombers: [], shots: [], blasts: [],
    toLaunch: 0, launchIn: 0, bombersToLaunch: 0, spareCities: 0, nextBonusAt: BONUS_CITY_EVERY, intermission: 0, over: false, nextId: 1, time: 0,
  };
  startWave(s);
  return s;
}

/** How a wave plays: more, faster threats each time, with new kinds joining as it goes on. */
export function waveSpec(wave: number) {
  return {
    count: Math.min(30, 8 + wave * 2),
    speed: Math.min(130, 26 + wave * 7),
    gap: Math.max(0.45, 2.1 - wave * 0.13),
    mirvChance: wave >= 2 ? Math.min(0.35, 0.08 + wave * 0.03) : 0,
    smartChance: wave >= 5 ? Math.min(0.25, (wave - 4) * 0.05) : 0,
    bombers: wave >= 3 ? Math.min(4, Math.floor((wave - 1) / 2)) : 0,
    multiplier: Math.min(6, 1 + Math.floor((wave - 1) / 2)),
  };
}

export function startWave(s: MdState) {
  s.wave++;
  const spec = waveSpec(s.wave);
  s.bases = BASE_X.map((x) => ({ x, ammo: AMMO, alive: true }));
  s.toLaunch = spec.count;
  s.launchIn = 1.2;
  s.bombersToLaunch = spec.bombers;
  s.intermission = 0;
}

const liveTargets = (s: MdState): { x: number; y: number }[] => [
  ...CITY_X.flatMap((x, i) => (s.cities[i] ? [{ x, y: GROUND - 6 }] : [])),
  ...s.bases.flatMap((b) => (b.alive ? [{ x: b.x, y: GROUND - 10 }] : [])),
];

function pickTarget(s: MdState) {
  const targets = liveTargets(s);
  if (!targets.length) return { x: 100 + s.rng() * 600, y: GROUND };
  // Cities are hit about twice as often as bases.
  const weighted = targets.flatMap((t) => (CITY_X.includes(t.x) ? [t, t] : [t]));
  return weighted[Math.floor(s.rng() * weighted.length)];
}

export function launchThreat(s: MdState, kind: ThreatKind, x0 = 20 + s.rng() * (W - 40), y0 = -10): Threat {
  const spec = waveSpec(s.wave);
  const t = pickTarget(s);
  const threat: Threat = {
    id: s.nextId++, kind, x0, y0, x: x0, y: y0, tx: t.x, ty: t.y,
    speed: spec.speed * (kind === "smart" ? 0.85 : 1) * (0.9 + s.rng() * 0.2),
    splitY: kind === "mirv" ? 150 + s.rng() * 160 : Infinity, alive: true,
  };
  s.threats.push(threat);
  return threat;
}

/** Fire from a base (by index) at a point. Returns false when that base can't fire. */
export function fire(s: MdState, base: number, tx: number, ty: number, events: MdEvent[] = []): boolean {
  const b = s.bases[base];
  if (!b || !b.alive || b.ammo <= 0 || s.over || s.intermission > 0) {
    events.push({ type: "empty" });
    return false;
  }
  ty = Math.min(ty, GROUND - 24);
  b.ammo--;
  // The middle base fires faster interceptors, as in the classic.
  s.shots.push({ x0: b.x, y0: GROUND - 14, x: b.x, y: GROUND - 14, tx, ty, speed: base === 1 ? 620 : 440 });
  events.push({ type: "fire", base });
  return true;
}

/** The base that should answer a tap at x: the nearest one that is alive and has ammo (−1 if none). */
export function nearestBase(s: MdState, x: number): number {
  let best = -1;
  let bestD = Infinity;
  s.bases.forEach((b, i) => {
    if (!b.alive || b.ammo <= 0) return;
    const d = Math.abs(b.x - x);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  });
  return best;
}

/** Current radius of a blast (0 once it has faded). */
export function blastRadius(b: Blast): number {
  const r = BLAST_R * b.size;
  if (b.t < BLAST_GROW) return r * (b.t / BLAST_GROW);
  if (b.t < BLAST_GROW + BLAST_HOLD) return r;
  const k = (b.t - BLAST_GROW - BLAST_HOLD) / BLAST_SHRINK;
  return k >= 1 ? 0 : r * (1 - k);
}

const POINTS: Record<ThreatKind | "bomber" | "satellite", number> = { warhead: 25, mirv: 25, smart: 125, bomber: 100, satellite: 100 };

function inBlast(s: MdState, x: number, y: number, pad = 0): Blast | null {
  for (const b of s.blasts) {
    const r = blastRadius(b);
    if (r > 0 && (x - b.x) ** 2 + (y - b.y) ** 2 <= (r + pad) ** 2) return b;
  }
  return null;
}

function addPoints(s: MdState, pts: number) {
  s.score += pts * waveSpec(s.wave).multiplier;
}

/** Advance the world by dt seconds. */
export function step(s: MdState, dt: number): MdEvent[] {
  const ev: MdEvent[] = [];
  if (s.over) return ev;
  s.time += dt;

  if (s.intermission > 0) {
    s.intermission -= dt;
    if (s.intermission <= 0) startWave(s);
    return ev;
  }

  const spec = waveSpec(s.wave);
  // Launch threats over time.
  s.launchIn -= dt;
  if (s.toLaunch > 0 && s.launchIn <= 0) {
    const r = s.rng();
    const kind: ThreatKind = r < spec.smartChance ? "smart" : r < spec.smartChance + spec.mirvChance ? "mirv" : "warhead";
    launchThreat(s, kind);
    s.toLaunch--;
    // Sometimes two at once.
    if (s.toLaunch > 0 && s.rng() < 0.25) {
      launchThreat(s, "warhead");
      s.toLaunch--;
    }
    s.launchIn = spec.gap * (0.6 + s.rng() * 0.8);
  }
  if (s.bombersToLaunch > 0 && s.toLaunch < spec.count * 0.7 && s.rng() < dt * 0.25) {
    const left = s.rng() < 0.5;
    const satellite = s.rng() < 0.4;
    s.bombers.push({
      id: s.nextId++, x: left ? -30 : W + 30, y: satellite ? 70 + s.rng() * 60 : 150 + s.rng() * 80, vx: (left ? 1 : -1) * (satellite ? 70 : 55),
      dropIn: 1 + s.rng() * 1.5, kind: satellite ? "satellite" : "bomber", alive: true,
    });
    s.bombersToLaunch--;
  }

  // Interceptors fly to their target, then burst.
  for (let i = s.shots.length - 1; i >= 0; i--) {
    const m = s.shots[i];
    const dx = m.tx - m.x;
    const dy = m.ty - m.y;
    const d = Math.hypot(dx, dy);
    const stepLen = m.speed * dt;
    if (d <= stepLen) {
      s.blasts.push({ x: m.tx, y: m.ty, t: 0, friendly: true, size: 1 });
      s.shots.splice(i, 1);
    } else {
      m.x += (dx / d) * stepLen;
      m.y += (dy / d) * stepLen;
    }
  }

  // Blasts grow and fade.
  for (const b of s.blasts) b.t += dt;
  s.blasts = s.blasts.filter((b) => b.t < BLAST_GROW + BLAST_HOLD + BLAST_SHRINK);

  // Bombers cross, drop warheads, and can be shot down.
  for (const b of s.bombers) {
    if (!b.alive) continue;
    b.x += b.vx * dt;
    b.dropIn -= dt;
    if (b.dropIn <= 0 && b.x > 40 && b.x < W - 40) {
      launchThreat(s, "warhead", b.x, b.y + 8);
      b.dropIn = 1.6 + s.rng() * 1.6;
    }
    const hit = inBlast(s, b.x, b.y, 10);
    if (hit) {
      b.alive = false;
      if (hit.friendly) addPoints(s, POINTS[b.kind]);
      s.blasts.push({ x: b.x, y: b.y, t: 0, friendly: hit.friendly, size: 0.8 });
      ev.push({ type: "kill", x: b.x, y: b.y, points: POINTS[b.kind], kind: b.kind });
    }
    if (b.x < -60 || b.x > W + 60) b.alive = false;
  }
  s.bombers = s.bombers.filter((b) => b.alive);

  // Threats fall toward their targets.
  for (const t of s.threats) {
    if (!t.alive) continue;
    let dx = t.tx - t.x;
    let dy = t.ty - t.y;
    let d = Math.hypot(dx, dy);
    if (t.kind === "smart") {
      // Smart bombs sidestep any blast just ahead of them.
      for (const b of s.blasts) {
        const r = blastRadius(b);
        const ex = t.x - b.x;
        const ey = t.y - b.y;
        const ed = Math.hypot(ex, ey);
        if (r > 0 && ed < r + 46 && ed > 0.01) {
          dx += (ex / ed) * d * 0.9;
          dy += (ey / ed) * d * 0.2;
          d = Math.hypot(dx, dy);
        }
      }
    }
    const stepLen = t.speed * dt;
    if (d <= stepLen || t.y >= t.ty) {
      t.alive = false;
      impact(s, t.tx, ev);
      continue;
    }
    t.x += (dx / d) * stepLen;
    t.y += (dy / d) * stepLen;
    if (t.kind === "mirv" && t.y >= t.splitY) {
      t.alive = false;
      const parts = 2 + (s.rng() < 0.5 ? 1 : 0);
      for (let k = 0; k < parts; k++) {
        const child = launchThreat(s, "warhead", t.x, t.y);
        child.speed = t.speed;
      }
      ev.push({ type: "split", x: t.x, y: t.y });
      continue;
    }
    const hit = inBlast(s, t.x, t.y);
    if (hit) {
      t.alive = false;
      if (hit.friendly) addPoints(s, POINTS[t.kind]);
      // Destroyed missiles burst too, which can chain.
      s.blasts.push({ x: t.x, y: t.y, t: 0, friendly: hit.friendly, size: 0.55 });
      ev.push({ type: "kill", x: t.x, y: t.y, points: POINTS[t.kind], kind: t.kind });
    }
  }
  s.threats = s.threats.filter((t) => t.alive);

  if (!s.cities.some(Boolean)) {
    s.over = true;
    ev.push({ type: "gameOver" });
    return ev;
  }

  // The wave ends once everything has launched and the sky is clear.
  if (s.toLaunch === 0 && s.bombersToLaunch === 0 && !s.threats.length && !s.bombers.length && !s.shots.length && !s.blasts.length) {
    endWave(s, ev);
  }
  return ev;
}

/** A warhead reaches the ground at x: it destroys a city or base there. */
function impact(s: MdState, x: number, ev: MdEvent[]) {
  s.blasts.push({ x, y: GROUND - 8, t: 0, friendly: false, size: 0.7 });
  const city = CITY_X.findIndex((cx, i) => s.cities[i] && Math.abs(cx - x) < 22);
  if (city >= 0) {
    s.cities[city] = false;
    ev.push({ type: "city", index: city, x });
    return;
  }
  const base = s.bases.findIndex((b) => b.alive && Math.abs(b.x - x) < 26);
  if (base >= 0) {
    s.bases[base].alive = false;
    s.bases[base].ammo = 0;
    ev.push({ type: "base", index: base, x });
    return;
  }
  ev.push({ type: "ground", x });
}

function endWave(s: MdState, ev: MdEvent[]) {
  const mult = waveSpec(s.wave).multiplier;
  const ammoLeft = s.bases.reduce((n, b) => n + (b.alive ? b.ammo : 0), 0);
  const cities = s.cities.filter(Boolean).length;
  const bonus = (ammoLeft * 5 + cities * 100) * mult;
  s.score += bonus;
  ev.push({ type: "waveEnd", bonus, ammoLeft, cities });
  awardBonusCities(s, ev);
  s.intermission = 3;
}

/** One spare city per 10,000 points, rebuilt into the first ruined slot at the end of a wave. */
export function awardBonusCities(s: MdState, ev: MdEvent[] = []) {
  while (s.score >= s.nextBonusAt) {
    s.spareCities++;
    s.nextBonusAt += BONUS_CITY_EVERY;
  }
  while (s.spareCities > 0) {
    const ruined = s.cities.findIndex((c) => !c);
    if (ruined < 0) break;
    s.cities[ruined] = true;
    s.spareCities--;
    ev.push({ type: "bonusCity", index: ruined });
  }
}
