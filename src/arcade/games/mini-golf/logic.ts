// Mini Golf rules, pure: a ball rolling on a top-down course with walls (line segments), sand, water, ice, slopes,
// moving blockers and a cup. Units are course pixels on an 800 × 500 table; the ball moves in small substeps so it
// never passes through a wall, and only drops into the cup when it is slow enough (otherwise it lips out).

export const CW = 800;
export const CH = 500;
export const BALL_R = 7;
export const CUP_R = 11;
export const MAX_POWER = 900;
export const MAX_STROKES = 8;
const FRICTION = 0.55;
const SAND_FRICTION = 3.2;
const ICE_FRICTION = 0.12;
const STOP_SPEED = 6;
const CUP_SPEED = 340;

export type Vec = { x: number; y: number };
export type Seg = { a: Vec; b: Vec };
export type Zone = { kind: "sand" | "water" | "ice" | "slope"; x: number; y: number; w: number; h: number; gx?: number; gy?: number };

/** A wall that spins around a centre (windmill-like) or slides back and forth. */
export type Mover =
  | { kind: "spinner"; cx: number; cy: number; len: number; speed: number }
  | { kind: "slider"; x: number; y: number; dx: number; dy: number; len: number; vertical: boolean; period: number };

export interface Hole {
  name: string;
  par: number;
  tee: Vec;
  cup: Vec;
  walls: Seg[];
  zones: Zone[];
  movers: Mover[];
  /** Pairs of teleport pads: entering a lands on b with the same velocity. */
  portals: { a: Vec; b: Vec }[];
}

const S = (ax: number, ay: number, bx: number, by: number): Seg => ({ a: { x: ax, y: ay }, b: { x: bx, y: by } });
/** Walls around a polygon given as a list of corner points. */
const poly = (...pts: number[]): Seg[] => {
  const out: Seg[] = [];
  for (let i = 0; i < pts.length; i += 2) {
    const j = (i + 2) % pts.length;
    out.push(S(pts[i], pts[i + 1], pts[j], pts[j + 1]));
  }
  return out;
};
const box = (x: number, y: number, w: number, h: number) => poly(x, y, x + w, y, x + w, y + h, x, y + h);
const H = (name: string, par: number, tee: [number, number], cup: [number, number], walls: Seg[], extra: Partial<Hole> = {}): Hole => ({
  name, par, tee: { x: tee[0], y: tee[1] }, cup: { x: cup[0], y: cup[1] }, walls, zones: [], movers: [], portals: [], ...extra,
});

export const HOLES: Hole[] = [
  H("First Putt", 2, [150, 250], [650, 250], box(80, 170, 640, 160)),
  H("Dogleg", 3, [140, 400], [640, 120], poly(80, 340, 520, 340, 520, 60, 720, 60, 720, 180, 600, 180, 600, 460, 80, 460)),
  H("The Bumper", 2, [140, 250], [660, 250], [...box(80, 150, 640, 200), ...box(380, 215, 40, 70)]),
  H("Sand Trap", 3, [140, 250], [660, 250], box(80, 140, 640, 220), { zones: [{ kind: "sand", x: 330, y: 140, w: 140, h: 150 }] }),
  H("Over the Pond", 3, [140, 400], [660, 120], box(80, 60, 640, 400), { zones: [{ kind: "water", x: 300, y: 160, w: 220, h: 180 }] }),
  H("Windmill", 3, [140, 250], [670, 250], box(80, 150, 640, 200), { movers: [{ kind: "spinner", cx: 400, cy: 250, len: 95, speed: 1.6 }] }),
  H("Zig Zag", 4, [140, 100], [660, 400], [...box(80, 50, 640, 400), S(260, 50, 260, 330), S(440, 170, 440, 450), S(600, 50, 600, 330)]),
  H("Slippery", 3, [140, 250], [660, 250], box(80, 160, 640, 180), { zones: [{ kind: "ice", x: 250, y: 160, w: 300, h: 180 }] }),
  H("Hillside", 3, [140, 400], [660, 400], box(80, 80, 640, 380), { zones: [{ kind: "slope", x: 280, y: 80, w: 240, h: 380, gx: 0, gy: -260 }] }),
  H("Diamond", 3, [400, 430], [400, 75], [...poly(400, 30, 760, 250, 400, 470, 40, 250), ...box(370, 220, 60, 60)]),
  H("Sliding Door", 3, [140, 250], [660, 250], [...box(80, 150, 640, 200), S(400, 150, 400, 210), S(400, 290, 400, 350)], {
    movers: [{ kind: "slider", x: 400, y: 160, dx: 0, dy: 120, len: 80, vertical: true, period: 2.6 }],
  }),
  H("Teleporter", 3, [140, 400], [660, 100], [...box(80, 50, 640, 410), S(400, 50, 400, 460)], { portals: [{ a: { x: 330, y: 400 }, b: { x: 470, y: 400 } }] }),
  H("Bunker Hill", 4, [130, 250], [680, 250], box(70, 120, 660, 260), {
    zones: [{ kind: "sand", x: 250, y: 120, w: 90, h: 140 }, { kind: "sand", x: 450, y: 240, w: 90, h: 140 }, { kind: "slope", x: 560, y: 120, w: 100, h: 260, gx: -150, gy: 0 }],
  }),
  H("The Gauntlet", 4, [120, 250], [690, 250], box(70, 160, 660, 180), {
    movers: [{ kind: "spinner", cx: 300, cy: 250, len: 80, speed: 1.4 }, { kind: "spinner", cx: 520, cy: 250, len: 80, speed: -1.8 }],
  }),
  H("Island Green", 4, [140, 250], [620, 250], box(60, 60, 680, 380), {
    zones: [{ kind: "water", x: 500, y: 60, w: 240, h: 110 }, { kind: "water", x: 500, y: 330, w: 240, h: 110 }, { kind: "water", x: 680, y: 170, w: 60, h: 160 }, { kind: "water", x: 300, y: 170, w: 120, h: 160 }],
  }),
  H("Ice Rink", 3, [130, 400], [670, 100], [...box(70, 50, 660, 410), ...box(360, 210, 80, 80)], { zones: [{ kind: "ice", x: 70, y: 50, w: 660, h: 410 }] }),
  H("Funnel", 3, [140, 250], [680, 250], [...poly(80, 80, 560, 200, 720, 200, 720, 300, 560, 300, 80, 420)], {
    zones: [{ kind: "slope", x: 380, y: 80, w: 180, h: 340, gx: 120, gy: 0 }],
  }),
  H("Grand Finale", 5, [120, 430], [680, 80], [...box(60, 40, 680, 430), S(260, 470, 260, 170), S(480, 40, 480, 340)], {
    zones: [{ kind: "sand", x: 270, y: 380, w: 200, h: 90 }, { kind: "water", x: 500, y: 200, w: 100, h: 120 }],
    movers: [{ kind: "spinner", cx: 370, cy: 230, len: 70, speed: 2 }],
    portals: [{ a: { x: 160, y: 120 }, b: { x: 600, y: 420 } }],
  }),
];

export const COURSE_PAR = HOLES.reduce((n, h) => n + h.par, 0);

export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  moving: boolean;
  sunk: boolean;
  /** Where the last shot was hit from (water puts you back here). */
  lastX: number;
  lastY: number;
  /** Teleport cooldown so a ball doesn't bounce between pads. */
  portalT: number;
  /** Already rattled over the cup on this pass (cleared once it leaves the cup). */
  lipped: boolean;
}

export interface GolfState {
  hole: number;
  ball: Ball;
  strokes: number;
  time: number;
  card: number[];
}

export type GolfEvent = { type: "wall" } | { type: "sunk" } | { type: "lipout" } | { type: "water" } | { type: "portal" } | { type: "maxed" };

export function newRound(): GolfState {
  const s: GolfState = { hole: 0, ball: freshBall(HOLES[0]), strokes: 0, time: 0, card: [] };
  return s;
}

function freshBall(h: Hole): Ball {
  return { x: h.tee.x, y: h.tee.y, vx: 0, vy: 0, moving: false, sunk: false, lastX: h.tee.x, lastY: h.tee.y, portalT: 0, lipped: false };
}

export function startHole(s: GolfState, i: number) {
  s.hole = i;
  s.ball = freshBall(HOLES[i]);
  s.strokes = 0;
  s.time = 0;
}

/** Hit the ball: angle in radians, power 0..1. */
export function shoot(s: GolfState, angle: number, power: number): boolean {
  const b = s.ball;
  if (b.moving || b.sunk) return false;
  const p = Math.max(0.04, Math.min(1, power)) * MAX_POWER;
  b.vx = Math.cos(angle) * p;
  b.vy = Math.sin(angle) * p;
  b.lastX = b.x;
  b.lastY = b.y;
  b.moving = true;
  s.strokes++;
  return true;
}

/** Wall segments that exist right now, including moving blockers. */
export function wallsAt(h: Hole, time: number): Seg[] {
  const out = h.walls.slice();
  for (const m of h.movers) {
    if (m.kind === "spinner") {
      const a = time * m.speed;
      const dx = Math.cos(a) * m.len;
      const dy = Math.sin(a) * m.len;
      out.push(S(m.cx - dx, m.cy - dy, m.cx + dx, m.cy + dy));
    } else {
      const k = (Math.sin((time / m.period) * Math.PI * 2) + 1) / 2;
      const x = m.x + m.dx * k;
      const y = m.y + m.dy * k;
      out.push(m.vertical ? S(x, y, x, y + m.len) : S(x, y, x + m.len, y));
    }
  }
  return out;
}

const inZone = (z: Zone, x: number, y: number) => x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h;

function closestOnSeg(p: Vec, s: Seg): Vec {
  const dx = s.b.x - s.a.x;
  const dy = s.b.y - s.a.y;
  const len2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((p.x - s.a.x) * dx + (p.y - s.a.y) * dy) / len2));
  return { x: s.a.x + dx * t, y: s.a.y + dy * t };
}

/** Advance the ball by dt seconds. */
export function step(s: GolfState, dt: number): GolfEvent[] {
  const ev: GolfEvent[] = [];
  s.time += dt;
  const b = s.ball;
  if (!b.moving || b.sunk) return ev;
  const h = HOLES[s.hole];
  const speed0 = Math.hypot(b.vx, b.vy);
  const n = Math.max(1, Math.ceil((speed0 * dt) / (BALL_R * 0.5)));
  const sub = dt / n;
  for (let i = 0; i < n && b.moving; i++) {
    let friction = FRICTION;
    for (const z of h.zones) {
      if (!inZone(z, b.x, b.y)) continue;
      if (z.kind === "sand") friction = SAND_FRICTION;
      else if (z.kind === "ice") friction = ICE_FRICTION;
      else if (z.kind === "slope") {
        b.vx += (z.gx ?? 0) * sub;
        b.vy += (z.gy ?? 0) * sub;
      } else if (z.kind === "water") {
        b.x = b.lastX;
        b.y = b.lastY;
        b.vx = b.vy = 0;
        b.moving = false;
        s.strokes++;
        ev.push({ type: "water" });
        return ev;
      }
    }
    // Rolling friction slows the ball in proportion to its speed, plus a small constant drag.
    const sp = Math.hypot(b.vx, b.vy);
    const drop = Math.max(0, sp - (sp * friction + 18) * sub);
    if (sp > 0) {
      b.vx *= drop / sp;
      b.vy *= drop / sp;
    }
    b.x += b.vx * sub;
    b.y += b.vy * sub;
    // Walls: push out and reflect (with a little energy loss).
    for (const w of wallsAt(h, s.time)) {
      const c = closestOnSeg(b, w);
      const dx = b.x - c.x;
      const dy = b.y - c.y;
      const d = Math.hypot(dx, dy);
      if (d < BALL_R && d > 1e-6) {
        const nx = dx / d;
        const ny = dy / d;
        b.x = c.x + nx * BALL_R;
        b.y = c.y + ny * BALL_R;
        const vn = b.vx * nx + b.vy * ny;
        if (vn < 0) {
          b.vx -= 1.8 * vn * nx;
          b.vy -= 1.8 * vn * ny;
          if (Math.abs(vn) > 40) ev.push({ type: "wall" });
        }
      }
    }
    // Portals.
    b.portalT = Math.max(0, b.portalT - sub);
    if (b.portalT === 0) {
      for (const p of h.portals) {
        if (Math.hypot(b.x - p.a.x, b.y - p.a.y) < 16) {
          b.x = p.b.x;
          b.y = p.b.y;
          b.portalT = 0.6;
          ev.push({ type: "portal" });
          break;
        }
      }
    }
    // The cup.
    const dc = Math.hypot(b.x - h.cup.x, b.y - h.cup.y);
    if (dc >= CUP_R) b.lipped = false;
    else if (!b.lipped || Math.hypot(b.vx, b.vy) < CUP_SPEED) {
      const v = Math.hypot(b.vx, b.vy);
      if (v < CUP_SPEED) {
        b.sunk = true;
        b.moving = false;
        b.x = h.cup.x;
        b.y = h.cup.y;
        ev.push({ type: "sunk" });
        return ev;
      }
      // Too fast: it rattles over the cup and gets knocked off line.
      const ang = Math.atan2(b.vy, b.vx) + (dc < CUP_R * 0.5 ? 0.35 : -0.35);
      b.vx = Math.cos(ang) * v * 0.8;
      b.vy = Math.sin(ang) * v * 0.8;
      b.lipped = true;
      ev.push({ type: "lipout" });
    }
    if (Math.hypot(b.vx, b.vy) < STOP_SPEED) {
      b.vx = b.vy = 0;
      b.moving = false;
    }
  }
  if (!b.moving && !b.sunk && s.strokes >= MAX_STROKES) ev.push({ type: "maxed" });
  return ev;
}

/** Record the hole on the scorecard (capped at MAX_STROKES) and move to the next. Returns true at the end. */
export function finishHole(s: GolfState): boolean {
  s.card[s.hole] = Math.min(MAX_STROKES, s.strokes);
  if (s.hole + 1 >= HOLES.length) return true;
  startHole(s, s.hole + 1);
  return false;
}

export const total = (card: number[]) => card.reduce((n, v) => n + (v ?? 0), 0);
export const parSoFar = (card: number[]) => card.reduce((n, _v, i) => n + HOLES[i].par, 0);

/** Simulate one shot to rest (for tests and the solver). */
export function simulateShot(s: GolfState, angle: number, power: number, maxT = 20): GolfEvent[] {
  const ev: GolfEvent[] = [];
  shoot(s, angle, power);
  for (let t = 0; t < maxT && s.ball.moving; t += 1 / 120) ev.push(...step(s, 1 / 120));
  return ev;
}

/**
 * Search shot angles and powers for a way to finish a hole within `limit` strokes (greedy: each shot picks the
 * outcome closest to the cup by path distance on a coarse grid). Returns the strokes used, or Infinity.
 */
export function solveHole(i: number, limit: number): number {
  const h = HOLES[i];
  const dist = flowDistance(h);
  const s = newRound();
  startHole(s, i);
  for (let shot = 0; shot < limit; shot++) {
    let best: { a: number; p: number; d: number; t: number } | null = null;
    for (let ai = 0; ai < 72; ai++) {
      for (const p of [0.15, 0.25, 0.35, 0.5, 0.65, 0.8, 1]) {
        for (const t0 of [0, 0.4, 0.8, 1.2]) {
          const trial: GolfState = { ...s, ball: { ...s.ball }, card: [], time: s.time + t0 };
          const ev = simulateShot(trial, (ai / 72) * Math.PI * 2, p);
          if (ev.some((e) => e.type === "water")) continue;
          const d = trial.ball.sunk ? -1 : dist(trial.ball.x, trial.ball.y);
          if (!best || d < best.d) best = { a: (ai / 72) * Math.PI * 2, p, d, t: t0 };
          if (d < 0) break;
        }
      }
    }
    if (!best) return Infinity;
    s.time += best.t;
    simulateShot(s, best.a, best.p);
    if (s.ball.sunk) return shot + 1;
  }
  return Infinity;
}

/** Walking distance to the cup around static walls, on a 10 px grid (for the solver). */
function flowDistance(h: Hole): (x: number, y: number) => number {
  const G = 10;
  const gw = Math.ceil(CW / G);
  const gh = Math.ceil(CH / G);
  const blocked = new Uint8Array(gw * gh);
  for (let gy = 0; gy < gh; gy++) {
    for (let gx = 0; gx < gw; gx++) {
      const p = { x: gx * G + G / 2, y: gy * G + G / 2 };
      for (const w of h.walls) {
        const c = closestOnSeg(p, w);
        if (Math.hypot(p.x - c.x, p.y - c.y) < G * 0.75) blocked[gy * gw + gx] = 1;
      }
      for (const z of h.zones) if (z.kind === "water" && inZone(z, p.x, p.y)) blocked[gy * gw + gx] = 1;
    }
  }
  const d = new Float64Array(gw * gh).fill(Infinity);
  const start = Math.floor(h.cup.y / G) * gw + Math.floor(h.cup.x / G);
  d[start] = 0;
  const q = [start];
  while (q.length) {
    const c = q.shift()!;
    const cx = c % gw;
    const cy = (c - cx) / gw;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
      const n = ny * gw + nx;
      if (blocked[n] || d[n] <= d[c] + 1) continue;
      d[n] = d[c] + 1;
      q.push(n);
    }
  }
  return (x, y) => {
    const v = d[Math.floor(y / G) * gw + Math.floor(x / G)];
    return Number.isFinite(v) ? v * G : 1e6 + Math.hypot(x - h.cup.x, y - h.cup.y);
  };
}
