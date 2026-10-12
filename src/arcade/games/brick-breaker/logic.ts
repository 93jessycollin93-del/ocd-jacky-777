// Brick Breaker rules: pure and seeded, so they can be tested. The ball is moved in tiny sub-steps (never
// more than a few pixels at a time), so even a very fast ball can't skip over a brick or the paddle.
import { mulberry32, type Rng } from "../../kit/rng";
import { COLS, breakableCount, levelDef } from "./levels";

export { COLS };

export const W = 520;
export const H = 640;
export const BW = W / COLS; // 40
export const BH = 18;
/** Top of the playfield (the HUD sits above it) and of the first brick row. */
export const WALL_TOP = 50;
export const BRICK_TOP = 82;
export const PADDLE_Y = 592;
export const PADDLE_H = 14;
export const BALL_R = 7;
export const MAX_ROWS = 18;
export const MAX_BALLS = 9;
/** The farthest the ball may travel in one sub-step: well under a brick's height and the ball's radius. */
export const MAX_STEP = 3;
/** The steepest rebound off the paddle's edge, measured from straight up. */
export const MAX_BOUNCE = (60 * Math.PI) / 180;

export const PADDLE_W = { normal: 84, wide: 134, shrink: 52 };
export const POWER_TIME = { wide: 14, laser: 12, slow: 10, sticky: 15, shrink: 10 };
export const START_LIVES = 3;
export const MAX_LIVES = 9;

export type PowerKind = "multi" | "wide" | "laser" | "slow" | "sticky" | "life" | "shrink";
export const POWER_LETTER: Record<PowerKind, string> = {
  multi: "M", wide: "W", laser: "L", slow: "S", sticky: "C", life: "+1", shrink: "▼",
};
/** How often each kind falls out of a broken brick (relative weights). */
const DROP_WEIGHTS: [PowerKind, number][] = [
  ["multi", 18], ["wide", 18], ["laser", 13], ["slow", 14], ["sticky", 13], ["life", 3], ["shrink", 10],
];
const DROP_CHANCE = 0.17;

export type BrickKind = "normal" | "multi" | "steel";

export interface Brick {
  col: number;
  row: number;
  x: number;
  y: number;
  kind: BrickKind;
  hp: number;
  maxHp: number;
  /** Palette index 0-7 for normal bricks. */
  color: number;
  /** Seconds since last hit (for a flash). */
  flash: number;
}

export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Stuck to the paddle (serving, or caught), at this offset from its centre. */
  stuck: boolean;
  offset: number;
  stuckTime: number;
}

export interface Capsule {
  x: number;
  y: number;
  kind: PowerKind;
}

export interface Bolt {
  x: number;
  y: number;
}

export type Phase = "serve" | "play" | "dead" | "clear" | "over";

export interface BreakerState {
  level: number;
  levelName: string;
  score: number;
  lives: number;
  grid: (Brick | null)[];
  bricksLeft: number;
  balls: Ball[];
  capsules: Capsule[];
  bolts: Bolt[];
  paddle: { x: number; w: number; target: number };
  powers: { wide: number; laser: number; slow: number; sticky: number; shrink: number };
  /** Ball speed in px/s, which creeps up as you play. */
  speed: number;
  phase: Phase;
  phaseTime: number;
  laserCooldown: number;
  combo: number;
  rng: Rng;
}

export type BreakerEventType =
  | "wall" | "paddle" | "hit" | "break" | "steel" | "capsule" | "power" | "life-lost" | "extra-life" | "clear"
  | "level" | "launch" | "laser" | "over" | "stick";

export interface BreakerEvent {
  type: BreakerEventType;
  x: number;
  y: number;
  /** Brick colour, power kind, or points, depending on the event. */
  brick?: Brick;
  power?: PowerKind;
  points?: number;
}

const ev = (type: BreakerEventType, x = 0, y = 0, extra: Partial<BreakerEvent> = {}): BreakerEvent => ({ type, x, y, ...extra });

// ------------------------------------------------------------------ setup

export const baseSpeed = (level: number) => Math.min(450, 330 + (level - 1) * 14);
export const maxSpeed = (level: number) => baseSpeed(level) + 170;

export function newGame(seed = 1): BreakerState {
  const s: BreakerState = {
    level: 1, levelName: "", score: 0, lives: START_LIVES, grid: [], bricksLeft: 0, balls: [], capsules: [], bolts: [],
    paddle: { x: W / 2, w: PADDLE_W.normal, target: W / 2 }, powers: { wide: 0, laser: 0, slow: 0, sticky: 0, shrink: 0 },
    speed: baseSpeed(1), phase: "serve", phaseTime: 0, laserCooldown: 0, combo: 0, rng: mulberry32(seed),
  };
  loadLevel(s, 1);
  return s;
}

export function loadLevel(s: BreakerState, level: number) {
  const def = levelDef(level);
  s.level = level;
  s.levelName = def.name;
  s.grid = new Array(COLS * MAX_ROWS).fill(null);
  def.rows.forEach((row, r) => {
    for (let c = 0; c < COLS; c++) {
      const ch = row[c];
      if (!ch || ch === ".") continue;
      let kind: BrickKind = "normal";
      let hp = 1;
      let color = 0;
      if (ch === "#") {
        kind = "steel";
        hp = 999;
      } else if (ch === "a" || ch === "b") {
        kind = "multi";
        hp = ch === "a" ? 2 : 3;
      } else color = Math.max(0, Math.min(7, Number(ch) - 1));
      s.grid[r * COLS + c] = { col: c, row: r, x: c * BW, y: BRICK_TOP + r * BH, kind, hp, maxHp: hp, color, flash: 0 };
    }
  });
  s.bricksLeft = breakableCount(def.rows);
  s.speed = baseSpeed(level);
  resetForServe(s);
}

/** A fresh ball on the paddle, with power-ups cleared. */
export function resetForServe(s: BreakerState) {
  s.capsules = [];
  s.bolts = [];
  s.powers = { wide: 0, laser: 0, slow: 0, sticky: 0, shrink: 0 };
  s.paddle.w = PADDLE_W.normal;
  s.balls = [newBall(s)];
  s.phase = "serve";
  s.phaseTime = 0;
  s.combo = 0;
  s.speed = Math.max(baseSpeed(s.level), Math.min(s.speed, baseSpeed(s.level) + 40));
}

function newBall(s: BreakerState): Ball {
  return { x: s.paddle.x, y: PADDLE_Y - BALL_R, vx: 0, vy: 0, stuck: true, offset: 0, stuckTime: 0 };
}

export const brickAt = (s: BreakerState, col: number, row: number) =>
  col < 0 || col >= COLS || row < 0 || row >= MAX_ROWS ? null : s.grid[row * COLS + col];

// ------------------------------------------------------------------ paddle and launch

/** Where the paddle's centre may go. */
export const clampPaddle = (x: number, w: number) => Math.max(w / 2, Math.min(W - w / 2, x));

/** Aim for this x (mouse, touch); the paddle glides there in update(). */
export function setPaddleTarget(s: BreakerState, x: number) {
  s.paddle.target = clampPaddle(x, s.paddle.w);
}

/**
 * Rebound angle for a ball hitting the paddle: where it lands decides the angle, from straight up in the
 * middle to MAX_BOUNCE off the edges. Returns the new velocity at the given speed.
 */
export function paddleBounce(ballX: number, paddleX: number, paddleW: number, speed: number): { vx: number; vy: number } {
  const off = Math.max(-1, Math.min(1, (ballX - paddleX) / (paddleW / 2)));
  const a = off * MAX_BOUNCE;
  return { vx: speed * Math.sin(a), vy: -speed * Math.cos(a) };
}

/** Let go of a served or caught ball. Returns events (and does nothing if nothing is stuck). */
export function launch(s: BreakerState): BreakerEvent[] {
  const out: BreakerEvent[] = [];
  if (s.phase !== "serve" && s.phase !== "play") return out;
  let any = false;
  for (const b of s.balls) {
    if (!b.stuck) continue;
    any = true;
    b.stuck = false;
    const off = s.phase === "serve" ? (s.rng() - 0.5) * 0.9 : b.offset / (s.paddle.w / 2);
    const v = paddleBounce(s.paddle.x + off * (s.paddle.w / 2), s.paddle.x, s.paddle.w, ballSpeed(s));
    b.vx = v.vx;
    b.vy = v.vy;
    b.y = PADDLE_Y - BALL_R - 0.5;
  }
  if (any) {
    if (s.phase === "serve") s.phase = "play";
    out.push(ev("launch", s.paddle.x, PADDLE_Y));
  }
  return out;
}

/** The speed balls travel at right now, with the slow-ball power-up applied. */
export const ballSpeed = (s: BreakerState) => s.speed * (s.powers.slow > 0 ? 0.68 : 1);

// ------------------------------------------------------------------ bricks and power-ups

function rollPower(s: BreakerState): PowerKind | null {
  if (s.rng() >= DROP_CHANCE) return null;
  const total = DROP_WEIGHTS.reduce((n, [, w]) => n + w, 0);
  let r = s.rng() * total;
  for (const [k, w] of DROP_WEIGHTS) {
    r -= w;
    if (r < 0) return k;
  }
  return "multi";
}

/** Damage a brick by one hit. Steel just rings. Returns true if the brick is gone. */
export function hitBrick(s: BreakerState, b: Brick, out: BreakerEvent[]): boolean {
  const cx = b.x + BW / 2;
  const cy = b.y + BH / 2;
  if (b.kind === "steel") {
    b.flash = 0.25;
    out.push(ev("steel", cx, cy, { brick: b }));
    return false;
  }
  b.hp--;
  b.flash = 0.25;
  s.speed = Math.min(maxSpeed(s.level), s.speed + 1.2);
  if (b.hp > 0) {
    s.score += 5;
    out.push(ev("hit", cx, cy, { brick: b, points: 5 }));
    return false;
  }
  s.grid[b.row * COLS + b.col] = null;
  s.bricksLeft--;
  s.combo++;
  const points = b.kind === "multi" ? 20 * b.maxHp : 10;
  s.score += points;
  out.push(ev("break", cx, cy, { brick: b, points }));
  const p = rollPower(s);
  if (p && s.phase === "play") s.capsules.push({ x: cx, y: cy, kind: p });
  if (s.bricksLeft <= 0) {
    s.phase = "clear";
    s.phaseTime = 0;
    s.score += 500 + 100 * s.level;
    s.capsules = [];
    s.bolts = [];
    out.push(ev("clear", cx, cy, { points: 500 + 100 * s.level }));
  }
  return true;
}

/** Multi-ball: every ball in flight splits into three (up to MAX_BALLS in all). */
function splitBalls(s: BreakerState) {
  const out = [...s.balls];
  for (const b of s.balls) {
    if (b.stuck) continue;
    for (const a of [0.42, -0.42]) {
      if (out.length >= MAX_BALLS) break;
      const c = Math.cos(a);
      const sn = Math.sin(a);
      out.push({ ...b, vx: b.vx * c - b.vy * sn, vy: b.vx * sn + b.vy * c });
    }
  }
  s.balls = out;
}

/** Apply a collected power-up. */
export function applyPower(s: BreakerState, kind: PowerKind, out: BreakerEvent[] = []) {
  switch (kind) {
    case "multi":
      splitBalls(s);
      break;
    case "wide":
      s.powers.wide = POWER_TIME.wide;
      s.powers.shrink = 0;
      break;
    case "shrink":
      s.powers.shrink = POWER_TIME.shrink;
      s.powers.wide = 0;
      break;
    case "laser":
      s.powers.laser = POWER_TIME.laser;
      break;
    case "slow":
      s.powers.slow = POWER_TIME.slow;
      break;
    case "sticky":
      s.powers.sticky = POWER_TIME.sticky;
      break;
    case "life":
      if (s.lives < MAX_LIVES) s.lives++;
      out.push(ev("extra-life"));
      break;
  }
  s.paddle.w = paddleWidth(s);
  s.paddle.x = clampPaddle(s.paddle.x, s.paddle.w);
  s.paddle.target = clampPaddle(s.paddle.target, s.paddle.w);
  s.score += 50;
  out.push(ev("power", s.paddle.x, PADDLE_Y, { power: kind }));
}

export const paddleWidth = (s: BreakerState) =>
  s.powers.shrink > 0 ? PADDLE_W.shrink : s.powers.wide > 0 ? PADDLE_W.wide : PADDLE_W.normal;

// ------------------------------------------------------------------ ball physics

/** Push a circle out of a rectangle. Returns the contact's penetration depth and axis-aligned normal, or null. */
export function circleVsRect(
  bx: number, by: number, r: number, rx: number, ry: number, rw: number, rh: number,
): { nx: number; ny: number; px: number; py: number; depth: number } | null {
  const cx = Math.max(rx, Math.min(rx + rw, bx));
  const cy = Math.max(ry, Math.min(ry + rh, by));
  const dx = bx - cx;
  const dy = by - cy;
  const d2 = dx * dx + dy * dy;
  if (d2 >= r * r) return null;
  if (d2 > 1e-9) {
    const d = Math.sqrt(d2);
    const depth = r - d;
    // The bounce normal is snapped to the dominant axis so corners behave like flat faces.
    const nx = Math.abs(dx) > Math.abs(dy) ? Math.sign(dx) : 0;
    const ny = Math.abs(dx) > Math.abs(dy) ? 0 : Math.sign(dy);
    return { nx, ny, px: (dx / d) * depth, py: (dy / d) * depth, depth };
  }
  // The centre is inside the rectangle: leave by the nearest face.
  const l = bx - rx;
  const rr = rx + rw - bx;
  const t = by - ry;
  const bt = ry + rh - by;
  const m = Math.min(l, rr, t, bt);
  if (m === l) return { nx: -1, ny: 0, px: -(l + r), py: 0, depth: l + r };
  if (m === rr) return { nx: 1, ny: 0, px: rr + r, py: 0, depth: rr + r };
  if (m === t) return { nx: 0, ny: -1, px: 0, py: -(t + r), depth: t + r };
  return { nx: 0, ny: 1, px: 0, py: bt + r, depth: bt + r };
}

function reflect(b: Ball, nx: number, ny: number) {
  const dot = b.vx * nx + b.vy * ny;
  if (dot >= 0) return;
  b.vx -= 2 * dot * nx;
  b.vy -= 2 * dot * ny;
}

/** Keep the ball from drifting almost flat, which would take forever to come back down. */
function keepSteep(b: Ball, speed: number) {
  const minVy = speed * 0.2;
  if (Math.abs(b.vy) < minVy) {
    b.vy = (b.vy > 0 ? 1 : -1) * minVy;
    const vx = Math.sqrt(Math.max(0, speed * speed - b.vy * b.vy));
    b.vx = (b.vx < 0 ? -1 : 1) * vx;
  }
}

function setSpeed(b: Ball, speed: number) {
  const m = Math.hypot(b.vx, b.vy);
  if (m < 1e-6) return;
  b.vx = (b.vx / m) * speed;
  b.vy = (b.vy / m) * speed;
}

/** Hit the bricks the ball overlaps right now: one bounce, damage to the deepest brick. */
function collideBricks(s: BreakerState, b: Ball, out: BreakerEvent[]): boolean {
  const c0 = Math.floor((b.x - BALL_R) / BW);
  const c1 = Math.floor((b.x + BALL_R) / BW);
  const r0 = Math.floor((b.y - BALL_R - BRICK_TOP) / BH);
  const r1 = Math.floor((b.y + BALL_R - BRICK_TOP) / BH);
  let best: Brick | null = null;
  let bestHit: ReturnType<typeof circleVsRect> = null;
  for (let r = Math.max(0, r0); r <= Math.min(MAX_ROWS - 1, r1); r++) {
    for (let c = Math.max(0, c0); c <= Math.min(COLS - 1, c1); c++) {
      const br = s.grid[r * COLS + c];
      if (!br) continue;
      const hit = circleVsRect(b.x, b.y, BALL_R, br.x, br.y, BW, BH);
      if (hit && (!bestHit || hit.depth > bestHit.depth)) {
        best = br;
        bestHit = hit;
      }
    }
  }
  if (!best || !bestHit) return false;
  b.x += bestHit.px;
  b.y += bestHit.py;
  reflect(b, bestHit.nx, bestHit.ny);
  hitBrick(s, best, out);
  return true;
}

/** Move one ball for dt seconds in small sub-steps. Returns false if it fell off the bottom. */
function moveBall(s: BreakerState, b: Ball, dt: number, out: BreakerEvent[]): boolean {
  const speed = ballSpeed(s);
  setSpeed(b, speed);
  const dist = speed * dt;
  const n = Math.max(1, Math.ceil(dist / MAX_STEP));
  const px = s.paddle.x;
  const half = s.paddle.w / 2;
  for (let i = 0; i < n; i++) {
    // Sub-step along the *current* direction: bounces change it part-way through.
    const m = Math.hypot(b.vx, b.vy) || 1;
    const stepLen = dist / n;
    b.x += (b.vx / m) * stepLen;
    b.y += (b.vy / m) * stepLen;

    if (b.x < BALL_R) {
      b.x = BALL_R;
      b.vx = Math.abs(b.vx);
      out.push(ev("wall", 0, b.y));
    } else if (b.x > W - BALL_R) {
      b.x = W - BALL_R;
      b.vx = -Math.abs(b.vx);
      out.push(ev("wall", W, b.y));
    }
    if (b.y < WALL_TOP + BALL_R) {
      b.y = WALL_TOP + BALL_R;
      b.vy = Math.abs(b.vy);
      out.push(ev("wall", b.x, WALL_TOP));
    }

    if (b.y > BRICK_TOP - BALL_R && b.y < BRICK_TOP + MAX_ROWS * BH + BALL_R && collideBricks(s, b, out)) {
      keepSteep(b, speed);
      if (s.phase === "clear") return true;
    }

    if (b.vy > 0 && b.y + BALL_R >= PADDLE_Y && b.y - BALL_R < PADDLE_Y + PADDLE_H && Math.abs(b.x - px) <= half + BALL_R * 0.7) {
      b.y = PADDLE_Y - BALL_R;
      if (s.powers.sticky > 0) {
        b.stuck = true;
        b.offset = Math.max(-half, Math.min(half, b.x - px));
        b.stuckTime = 0;
        b.vx = 0;
        b.vy = 0;
        s.speed = Math.min(maxSpeed(s.level), s.speed + 4);
        out.push(ev("stick", b.x, PADDLE_Y));
        return true;
      }
      const v = paddleBounce(b.x, px, s.paddle.w, speed);
      b.vx = v.vx;
      b.vy = v.vy;
      s.speed = Math.min(maxSpeed(s.level), s.speed + 4);
      s.combo = 0;
      out.push(ev("paddle", b.x, PADDLE_Y));
    }
    if (b.y - BALL_R > H) return false;
  }
  return true;
}

// ------------------------------------------------------------------ the update loop

export interface BreakerInput {
  left: boolean;
  right: boolean;
  fire: boolean;
}

const PADDLE_KEY_SPEED = 620;
const PADDLE_FOLLOW_SPEED = 2600;
const LASER_COOLDOWN = 0.26;
export const CLEAR_TIME = 2.6;
export const DEAD_TIME = 0.9;

export function update(s: BreakerState, dt: number, input: BreakerInput = { left: false, right: false, fire: false }): BreakerEvent[] {
  const out: BreakerEvent[] = [];
  if (s.phase === "over") return out;
  s.phaseTime += dt;
  for (const b of s.grid) if (b && b.flash > 0) b.flash = Math.max(0, b.flash - dt);

  // The paddle: keys nudge the target, then it glides to it.
  const p = s.paddle;
  if (input.left !== input.right) p.target = clampPaddle(p.target + (input.right ? 1 : -1) * PADDLE_KEY_SPEED * dt, p.w);
  const move = Math.max(-PADDLE_FOLLOW_SPEED * dt, Math.min(PADDLE_FOLLOW_SPEED * dt, p.target - p.x));
  p.x = clampPaddle(p.x + move, p.w);

  // Power-up timers, and the paddle's width easing toward its target.
  for (const k of ["wide", "laser", "slow", "sticky", "shrink"] as const) if (s.powers[k] > 0) s.powers[k] = Math.max(0, s.powers[k] - dt);
  const want = paddleWidth(s);
  if (Math.abs(p.w - want) > 0.5) {
    p.w += Math.sign(want - p.w) * Math.min(Math.abs(want - p.w), 260 * dt);
    p.x = clampPaddle(p.x, p.w);
    p.target = clampPaddle(p.target, p.w);
  } else p.w = want;
  if (s.powers.sticky <= 0) {
    // The glue wore off: let go of anything still held (but not the very first serve).
    if (s.phase === "play") for (const b of s.balls) if (b.stuck) launch(s);
  }

  s.laserCooldown = Math.max(0, s.laserCooldown - dt);
  if (s.phase === "serve" || s.phase === "play") {
    for (const b of s.balls) {
      if (!b.stuck) continue;
      b.x = Math.max(BALL_R, Math.min(W - BALL_R, p.x + b.offset));
      b.y = PADDLE_Y - BALL_R;
      if (s.phase === "play") {
        b.stuckTime += dt;
        if (b.stuckTime > 5) out.push(...launch(s));
      }
    }
  }

  if (s.phase === "play") {
    if (s.powers.laser > 0 && input.fire && s.laserCooldown <= 0) {
      s.laserCooldown = LASER_COOLDOWN;
      s.bolts.push({ x: p.x - p.w / 2 + 6, y: PADDLE_Y }, { x: p.x + p.w / 2 - 6, y: PADDLE_Y });
      out.push(ev("laser", p.x, PADDLE_Y));
    }
    // Lasers.
    for (const bolt of s.bolts) {
      const oldY = bolt.y;
      bolt.y -= 760 * dt;
      const col = Math.floor(bolt.x / BW);
      const r0 = Math.floor((bolt.y - BRICK_TOP) / BH);
      const r1 = Math.floor((oldY - BRICK_TOP) / BH);
      for (let r = Math.min(MAX_ROWS - 1, r1); r >= Math.max(0, r0); r--) {
        const br = brickAt(s, col, r);
        if (br) {
          hitBrick(s, br, out);
          bolt.y = -100;
          break;
        }
      }
    }
    s.bolts = s.bolts.filter((b) => b.y > WALL_TOP);

    // Falling capsules.
    for (const c of s.capsules) c.y += 150 * dt;
    const keep: Capsule[] = [];
    for (const c of s.capsules) {
      if (c.y > PADDLE_Y - 8 && c.y < PADDLE_Y + PADDLE_H + 10 && Math.abs(c.x - p.x) < p.w / 2 + 14) {
        applyPower(s, c.kind, out);
      } else if (c.y < H + 20) keep.push(c);
    }
    s.capsules = keep;

    // The balls.
    const alive: Ball[] = [];
    for (const b of s.balls) {
      if (b.stuck) {
        alive.push(b);
        continue;
      }
      if (moveBall(s, b, dt, out)) alive.push(b);
      if (s.phase !== "play") break;
    }
    if (s.phase === "play") {
      s.balls = alive;
      if (s.balls.length === 0) {
        s.lives--;
        s.phase = "dead";
        s.phaseTime = 0;
        s.capsules = [];
        s.bolts = [];
        out.push(ev("life-lost", p.x, H));
      }
    }
  } else if (s.phase === "dead") {
    if (s.phaseTime >= DEAD_TIME) {
      if (s.lives <= 0) {
        s.phase = "over";
        out.push(ev("over"));
      } else {
        s.paddle.w = PADDLE_W.normal;
        resetForServe(s);
      }
    }
  } else if (s.phase === "clear") {
    if (s.phaseTime >= CLEAR_TIME) {
      loadLevel(s, s.level + 1);
      out.push(ev("level"));
    }
  }
  return out;
}
