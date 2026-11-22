// 8-Ball Pool rules and physics, pure. The table is 1000 × 500 (cloth inside the cushions), balls have radius 11.
// Physics runs in small substeps (no tunnelling): equal-mass elastic collisions, cushions with restitution 0.8,
// rolling friction, and pockets whose jaws are short cushion segments so balls can rattle. The rules engine covers
// the break, an open table until a group is claimed, fouls (scratch, wrong ball first, no rail after contact), ball
// in hand, and winning or losing on the 8.
import { mulberry32, type Rng } from "../../kit/rng";

export const TW = 1000;
export const TH = 500;
export const R = 11;
export const POCKET_R = 24;
const CUSHION_E = 0.8;
const BALL_E = 0.96;
const ROLL = 0.65;
const DRAG = 9;
const STOP = 4;
export const MAX_SPEED = 1700;

export const POCKETS = [
  { x: 0, y: 0 }, { x: TW / 2, y: -6 }, { x: TW, y: 0 },
  { x: 0, y: TH }, { x: TW / 2, y: TH + 6 }, { x: TW, y: TH },
];

export interface Ball {
  n: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  potted: boolean;
}

export type Group = "solids" | "stripes";
export const groupOf = (n: number): Group | null => (n >= 1 && n <= 7 ? "solids" : n >= 9 && n <= 15 ? "stripes" : null);

export interface Shot {
  first: number | null;
  potted: number[];
  railAfterContact: boolean;
  cueRail: boolean;
}

export interface PoolState {
  balls: Ball[];
  turn: 0 | 1;
  groups: [Group | null, Group | null];
  breakShot: boolean;
  ballInHand: boolean;
  over: boolean;
  winner: 0 | 1 | null;
  shot: Shot | null;
  message: string;
  /** Spin applied to the cue ball after its first contact: + follow, − draw. */
  spin: number;
  rng: Rng;
}

export function rack(seed = 1): Ball[] {
  const rng = mulberry32(seed);
  const balls: Ball[] = [{ n: 0, x: TW * 0.25, y: TH / 2, vx: 0, vy: 0, potted: false }];
  // A triangle with the 8 in the middle, a solid and a stripe in the back corners, the rest shuffled.
  const rest = [1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15];
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  const solid = rest.splice(rest.findIndex((n) => n < 8), 1)[0];
  const stripe = rest.splice(rest.findIndex((n) => n > 8), 1)[0];
  const order: number[] = [];
  let k = 0;
  for (let row = 0; row < 5; row++) {
    for (let i = 0; i <= row; i++) {
      if (row === 2 && i === 1) order.push(8);
      else if (row === 4 && i === 0) order.push(solid);
      else if (row === 4 && i === 4) order.push(stripe);
      else order.push(rest[k++]);
    }
  }
  const apexX = TW * 0.72;
  let idx = 0;
  for (let row = 0; row < 5; row++) {
    for (let i = 0; i <= row; i++) {
      balls.push({ n: order[idx++], x: apexX + row * R * 1.75, y: TH / 2 + (i - row / 2) * R * 2.02, vx: 0, vy: 0, potted: false });
    }
  }
  return balls;
}

export function newGame(seed = 1): PoolState {
  return {
    balls: rack(seed), turn: 0, groups: [null, null], breakShot: true, ballInHand: false, over: false, winner: null, shot: null,
    message: "Break!", spin: 0, rng: mulberry32(seed + 7),
  };
}

export const cue = (s: PoolState) => s.balls[0];
export const moving = (s: PoolState) => s.balls.some((b) => !b.potted && (b.vx !== 0 || b.vy !== 0));
export const onTable = (s: PoolState, n: number) => s.balls.some((b) => b.n === n && !b.potted);

/** Balls the player at `p` should hit first (their group, or the 8 once it is cleared). */
export function targets(s: PoolState, p: 0 | 1): number[] {
  const g = s.groups[p];
  if (!g) return s.balls.filter((b) => !b.potted && b.n !== 0 && b.n !== 8).map((b) => b.n);
  const left = s.balls.filter((b) => !b.potted && groupOf(b.n) === g).map((b) => b.n);
  return left.length ? left : [8];
}

/** Can the cue ball be placed here (ball in hand)? */
export function canPlace(s: PoolState, x: number, y: number): boolean {
  if (x < R || x > TW - R || y < R || y > TH - R) return false;
  return s.balls.every((b) => b.n === 0 || b.potted || Math.hypot(b.x - x, b.y - y) >= 2 * R + 1);
}

/** Strike the cue ball: angle in radians, power 0..1, spin −1 (draw) .. +1 (follow). */
export function strike(s: PoolState, angle: number, power: number, spin = 0): boolean {
  if (s.over || moving(s) || s.ballInHand) return false;
  const c = cue(s);
  const v = Math.max(0.03, Math.min(1, power)) * MAX_SPEED;
  c.vx = Math.cos(angle) * v;
  c.vy = Math.sin(angle) * v;
  s.spin = Math.max(-1, Math.min(1, spin));
  s.shot = { first: null, potted: [], railAfterContact: false, cueRail: false };
  return true;
}

export type PoolEvent = { type: "hit"; speed: number } | { type: "rail"; speed: number } | { type: "pot"; n: number };

function cushion(s: PoolState, b: Ball, ev: PoolEvent[]) {
  // Near a pocket mouth the cushion is open (the jaws are handled by the pocket check).
  const nearPocket = POCKETS.some((p) => Math.hypot(b.x - p.x, b.y - p.y) < POCKET_R + R * 0.6);
  if (nearPocket) return;
  let hit = 0;
  if (b.x < R) { b.x = R; hit = Math.abs(b.vx); b.vx = -b.vx * CUSHION_E; }
  else if (b.x > TW - R) { b.x = TW - R; hit = Math.abs(b.vx); b.vx = -b.vx * CUSHION_E; }
  if (b.y < R) { b.y = R; hit = Math.max(hit, Math.abs(b.vy)); b.vy = -b.vy * CUSHION_E; }
  else if (b.y > TH - R) { b.y = TH - R; hit = Math.max(hit, Math.abs(b.vy)); b.vy = -b.vy * CUSHION_E; }
  if (hit > 0 && s.shot) {
    if (s.shot.first !== null) s.shot.railAfterContact = true;
    if (b.n === 0) s.shot.cueRail = true;
    if (hit > 60) ev.push({ type: "rail", speed: hit });
  }
}

/** Advance the table by dt seconds. */
export function step(s: PoolState, dt: number): PoolEvent[] {
  const ev: PoolEvent[] = [];
  const live = s.balls.filter((b) => !b.potted);
  const vmax = Math.max(0, ...live.map((b) => Math.hypot(b.vx, b.vy)));
  const n = Math.max(1, Math.ceil((vmax * dt) / (R * 0.4)));
  const h = dt / n;
  for (let k = 0; k < n; k++) {
    for (const b of live) {
      if (b.potted) continue;
      b.x += b.vx * h;
      b.y += b.vy * h;
      const sp = Math.hypot(b.vx, b.vy);
      if (sp > 0) {
        const nsp = Math.max(0, sp - (sp * ROLL + DRAG) * h);
        b.vx *= nsp / sp;
        b.vy *= nsp / sp;
        if (nsp < STOP) b.vx = b.vy = 0;
      }
    }
    // Ball-ball collisions.
    for (let i = 0; i < live.length; i++) {
      const a = live[i];
      if (a.potted) continue;
      for (let j = i + 1; j < live.length; j++) {
        const b = live[j];
        if (b.potted) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy);
        if (d >= 2 * R || d === 0) continue;
        const nx = dx / d;
        const ny = dy / d;
        const overlap = 2 * R - d;
        a.x -= nx * overlap / 2;
        a.y -= ny * overlap / 2;
        b.x += nx * overlap / 2;
        b.y += ny * overlap / 2;
        const rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
        if (rel <= 0) continue;
        const imp = rel * (1 + BALL_E) / 2;
        a.vx -= imp * nx;
        a.vy -= imp * ny;
        b.vx += imp * nx;
        b.vy += imp * ny;
        if (s.shot && s.shot.first === null && (a.n === 0 || b.n === 0)) {
          s.shot.first = a.n === 0 ? b.n : a.n;
          // Follow or draw: after the first contact the cue ball picks up its spin along the shot line.
          const c = a.n === 0 ? a : b;
          const sp = Math.hypot(rel * nx, rel * ny);
          c.vx += nx * s.spin * sp * 0.5 * (a.n === 0 ? 1 : -1);
          c.vy += ny * s.spin * sp * 0.5 * (a.n === 0 ? 1 : -1);
        }
        if (rel > 30) ev.push({ type: "hit", speed: rel });
      }
    }
    for (const b of live) {
      if (b.potted) continue;
      for (const p of POCKETS) {
        if (Math.hypot(b.x - p.x, b.y - p.y) < POCKET_R) {
          b.potted = true;
          b.vx = b.vy = 0;
          s.shot?.potted.push(b.n);
          ev.push({ type: "pot", n: b.n });
          break;
        }
      }
      if (!b.potted) cushion(s, b, ev);
    }
  }
  return ev;
}

/** Call when the table has stopped after a shot: applies the rules and hands over the turn if needed. */
export function resolve(s: PoolState) {
  const shot = s.shot;
  if (!shot) return;
  s.shot = null;
  const me = s.turn;
  const other = (1 - me) as 0 | 1;
  const potted = shot.potted;
  const scratch = potted.includes(0);
  const eight = potted.includes(8);
  const wanted = targets(s, me);
  let foul = "";
  if (scratch) foul = "Scratch";
  else if (shot.first === null) foul = "No ball hit";
  else if (!wanted.includes(shot.first) && !(s.groups[me] === null && shot.first !== 8)) foul = "Wrong ball first";
  else if (!s.breakShot && potted.length === 0 && !shot.railAfterContact) foul = "No rail after contact";

  if (eight) {
    s.over = true;
    const cleared = s.groups[me] !== null && wanted.length === 1 && wanted[0] === 8;
    const legal = cleared && !foul && !s.breakShot;
    // Potting the 8 on the break respots it rather than ending the game.
    if (s.breakShot && !scratch) {
      s.over = false;
      const b = s.balls.find((x) => x.n === 8)!;
      b.potted = false;
      b.x = TW * 0.72;
      b.y = TH / 2;
    } else {
      s.winner = legal ? me : other;
      s.message = legal ? "Sank the 8: game won!" : foul ? `${foul} on the 8: game lost` : "Potted the 8 too early: game lost";
      return;
    }
  }

  // Claim a group on an open table with the first legal pot (not on the break).
  if (!foul && s.groups[me] === null && !s.breakShot) {
    const firstPot = potted.find((n) => groupOf(n) !== null);
    if (firstPot !== undefined) {
      const g = groupOf(firstPot)!;
      s.groups[me] = g;
      s.groups[other] = g === "solids" ? "stripes" : "solids";
    }
  }
  s.breakShot = false;

  if (scratch) {
    const c = cue(s);
    c.potted = false;
    c.vx = c.vy = 0;
    c.x = TW * 0.25;
    c.y = TH / 2;
  }
  if (foul) {
    s.turn = other;
    s.ballInHand = true;
    s.message = `${foul}: ball in hand`;
    return;
  }
  const mine = s.groups[me];
  const scored = potted.some((n) => (mine ? groupOf(n) === mine : groupOf(n) !== null));
  if (!scored) {
    s.turn = other;
    s.message = "";
  } else s.message = "Keep going";
}

export function placeCue(s: PoolState, x: number, y: number): boolean {
  if (!s.ballInHand || !canPlace(s, x, y)) return false;
  const c = cue(s);
  c.x = x;
  c.y = y;
  s.ballInHand = false;
  return true;
}

/** Run a shot to rest without rendering (for the AI and tests). */
export function simulate(s: PoolState, maxT = 15) {
  const events: PoolEvent[] = [];
  for (let t = 0; t < maxT && moving(s); t += 1 / 120) events.push(...step(s, 1 / 120));
  return events;
}

export function clone(s: PoolState): PoolState {
  return { ...s, balls: s.balls.map((b) => ({ ...b })), groups: [...s.groups] as PoolState["groups"], shot: s.shot && { ...s.shot, potted: [...s.shot.potted] } };
}

export type Difficulty = "easy" | "normal" | "hard";

/**
 * The computer's shot: try aiming each wanted ball at each pocket (the ghost-ball angle) at a few powers, simulate
 * each with the real physics, score the result, then add aim error by difficulty.
 */
export function aiShot(s: PoolState, level: Difficulty): { angle: number; power: number; place?: { x: number; y: number } } {
  const me = s.turn;
  let place: { x: number; y: number } | undefined;
  const base = clone(s);
  if (base.ballInHand) {
    // Put the cue ball a little behind the easiest wanted ball, on a line to the nearest pocket.
    const want = targets(base, me).map((n) => base.balls.find((b) => b.n === n)!).filter((b) => !b.potted);
    outer: for (const b of want) {
      for (const p of POCKETS) {
        const dx = b.x - p.x;
        const dy = b.y - p.y;
        const d = Math.hypot(dx, dy);
        const x = b.x + (dx / d) * 80;
        const y = b.y + (dy / d) * 80;
        if (canPlace(base, x, y)) {
          place = { x, y };
          break outer;
        }
      }
    }
    place ??= { x: TW * 0.25, y: TH / 2 };
    placeCue(base, place.x, place.y);
  }
  const c = cue(base);
  const want = targets(base, me);
  const candidates: { angle: number; power: number }[] = [];
  for (const n of want) {
    const b = base.balls.find((x) => x.n === n)!;
    for (const p of POCKETS) {
      const dx = p.x - b.x;
      const dy = p.y - b.y;
      const d = Math.hypot(dx, dy);
      const gx = b.x - (dx / d) * 2 * R;
      const gy = b.y - (dy / d) * 2 * R;
      const angle = Math.atan2(gy - c.y, gx - c.x);
      for (const power of [0.35, 0.55, 0.8]) candidates.push({ angle, power });
    }
  }
  // A few safety taps toward each wanted ball.
  for (const n of want) {
    const b = base.balls.find((x) => x.n === n)!;
    candidates.push({ angle: Math.atan2(b.y - c.y, b.x - c.x), power: 0.3 });
  }
  let best = candidates[0] ?? { angle: 0, power: 0.5 };
  let bestScore = -Infinity;
  const budget = level === "hard" ? 120 : level === "normal" ? 70 : 30;
  for (const cand of candidates.slice(0, budget)) {
    const t = clone(base);
    strike(t, cand.angle, cand.power);
    simulate(t);
    const shot = t.shot!;
    let score = 0;
    const mine = t.groups[me];
    for (const n of shot.potted) {
      if (n === 0) score -= 60;
      else if (n === 8) score += want.length === 1 && want[0] === 8 ? 200 : -500;
      else if (!mine || groupOf(n) === mine) score += 50;
      else score -= 15;
    }
    if (shot.first === null || !want.includes(shot.first)) score -= 40;
    if (score > bestScore) {
      bestScore = score;
      best = cand;
    }
  }
  const err = level === "hard" ? 0.004 : level === "normal" ? 0.015 : 0.045;
  return { angle: best.angle + (s.rng() - 0.5) * 2 * err, power: best.power, place };
}
