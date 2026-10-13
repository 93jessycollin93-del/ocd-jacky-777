// Paddle Duel rules: the ball, the paddles, the bounce angles, scoring, first to 11 win by 2, and the AI
// that predicts where the ball will land. Pure and seeded so every rule can be tested. The court is
// COURT_W by COURT_H; player 0 is the left paddle, player 1 the right one.
import { mulberry32, type Rng } from "../../kit/rng";

export const COURT_W = 800;
export const COURT_H = 480;
export const PADDLE_W = 14;
export const PADDLE_H = 92;
/** Distance from the court edge to the paddle's centre line. */
export const PADDLE_INSET = 34;
export const BALL_R = 8;
export const BALL_START_SPEED = 400;
export const BALL_MAX_SPEED = 980;
/** Each paddle hit speeds the ball up by this factor. */
export const SPEED_UP = 1.045;
/** The steepest a return can leave a paddle, for a hit on the very tip. */
export const MAX_BOUNCE = 0.95;
export const WIN_SCORE = 11;
export const WIN_BY = 2;
export const SERVE_COUNTDOWN = 3;
export const PADDLE_SPEED = 640;
export const FAST_HIT = 700;

export type Difficulty = "easy" | "medium" | "hard";

export interface Paddle {
  y: number;
  /** Speed last frame (for display). */
  vy: number;
}

export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface Match {
  paddles: [Paddle, Paddle];
  ball: Ball;
  score: [number, number];
  /** Seconds until the ball is served; 0 while it is in play. */
  countdown: number;
  /** Which player the next serve goes towards. */
  serveTo: 0 | 1;
  /** Hits in the current rally. */
  rally: number;
  /** Longest rally this match. */
  longest: number;
  winner: -1 | 0 | 1;
  rng: Rng;
  time: number;
}

export type MatchEvent =
  | { type: "wall" }
  | { type: "paddle"; player: 0 | 1; speed: number; fast: boolean; rel: number }
  | { type: "tick"; n: number }
  | { type: "launch" }
  | { type: "score"; player: 0 | 1 }
  | { type: "win"; player: 0 | 1 };

export const paddleX = (player: 0 | 1) => (player === 0 ? PADDLE_INSET : COURT_W - PADDLE_INSET);
export const clampPaddle = (y: number) => Math.max(PADDLE_H / 2, Math.min(COURT_H - PADDLE_H / 2, y));

export function newMatch(seed: number): Match {
  const rng = mulberry32(seed);
  const m: Match = {
    paddles: [{ y: COURT_H / 2, vy: 0 }, { y: COURT_H / 2, vy: 0 }], ball: { x: COURT_W / 2, y: COURT_H / 2, vx: 0, vy: 0 },
    score: [0, 0], countdown: SERVE_COUNTDOWN, serveTo: rng() < 0.5 ? 0 : 1, rally: 0, longest: 0, winner: -1, rng, time: 0,
  };
  return m;
}

/** First to 11, and ahead by at least 2. */
export function winnerOf(score: [number, number], to = WIN_SCORE, by = WIN_BY): -1 | 0 | 1 {
  const [a, b] = score;
  if (Math.max(a, b) >= to && Math.abs(a - b) >= by) return a > b ? 0 : 1;
  return -1;
}

export const ballSpeed = (b: Ball) => Math.hypot(b.vx, b.vy);

/**
 * Bounce the ball off a paddle. Where it lands on the paddle sets the angle: the middle sends it
 * straight back, the tips send it off at up to MAX_BOUNCE radians. Every hit makes it a little faster.
 * Returns the contact position from -1 (top tip) to 1 (bottom tip).
 */
export function paddleBounce(ball: Ball, paddle: Paddle, player: 0 | 1): number {
  const rel = Math.max(-1, Math.min(1, (ball.y - paddle.y) / (PADDLE_H / 2 + BALL_R)));
  const speed = Math.min(BALL_MAX_SPEED, Math.max(BALL_START_SPEED, ballSpeed(ball)) * SPEED_UP);
  const angle = rel * MAX_BOUNCE;
  const dir = player === 0 ? 1 : -1; // the ball leaves towards the other side
  ball.vx = dir * Math.cos(angle) * speed;
  ball.vy = Math.sin(angle) * speed;
  return rel;
}

/** Put the ball in the middle and start the countdown to the next serve. */
function resetForServe(m: Match) {
  m.ball = { x: COURT_W / 2, y: COURT_H / 2, vx: 0, vy: 0 };
  m.countdown = SERVE_COUNTDOWN;
  m.rally = 0;
}

function launch(m: Match) {
  const angle = (m.rng() * 2 - 1) * 0.4;
  const dir = m.serveTo === 1 ? 1 : -1;
  m.ball.vx = dir * Math.cos(angle) * BALL_START_SPEED;
  m.ball.vy = Math.sin(angle) * BALL_START_SPEED;
}

/** Move a paddle by up to `speed` towards `y`. */
export function movePaddleToward(p: Paddle, y: number, dt: number, speed = PADDLE_SPEED) {
  const target = clampPaddle(y);
  const d = target - p.y;
  const step = Math.max(-speed * dt, Math.min(speed * dt, d));
  p.y += step;
  p.vy = dt > 0 ? step / dt : 0;
}

/** Move a paddle up (-1) or down (+1) at full speed. */
export function movePaddle(p: Paddle, dir: number, dt: number, speed = PADDLE_SPEED) {
  const before = p.y;
  p.y = clampPaddle(p.y + dir * speed * dt);
  p.vy = dt > 0 ? (p.y - before) / dt : 0;
}

/** Advance the ball and the serve clock by dt seconds. The caller moves the paddles. */
export function stepMatch(m: Match, dt: number): MatchEvent[] {
  const events: MatchEvent[] = [];
  if (m.winner >= 0) return events;
  m.time += dt;

  if (m.countdown > 0) {
    const before = Math.ceil(m.countdown);
    m.countdown -= dt;
    if (m.countdown <= 0) {
      m.countdown = 0;
      launch(m);
      events.push({ type: "launch" });
    } else if (Math.ceil(m.countdown) !== before) {
      events.push({ type: "tick", n: Math.ceil(m.countdown) });
    }
    return events;
  }

  const b = m.ball;
  const sp = ballSpeed(b);
  const n = Math.max(1, Math.ceil((sp * dt) / (BALL_R * 0.6)));
  const h = dt / n;
  for (let i = 0; i < n; i++) {
    const px = b.x;
    b.x += b.vx * h;
    b.y += b.vy * h;
    // Top and bottom walls.
    if (b.y < BALL_R) {
      b.y = 2 * BALL_R - b.y;
      b.vy = Math.abs(b.vy);
      events.push({ type: "wall" });
    } else if (b.y > COURT_H - BALL_R) {
      b.y = 2 * (COURT_H - BALL_R) - b.y;
      b.vy = -Math.abs(b.vy);
      events.push({ type: "wall" });
    }
    // Paddles: the ball must be travelling towards the paddle and cross its front face.
    for (const player of [0, 1] as const) {
      const face = paddleX(player) + (player === 0 ? PADDLE_W / 2 : -PADDLE_W / 2);
      const towards = player === 0 ? b.vx < 0 : b.vx > 0;
      if (!towards) continue;
      const crossed = player === 0 ? px - BALL_R >= face - 0.001 && b.x - BALL_R <= face : px + BALL_R <= face + 0.001 && b.x + BALL_R >= face;
      const paddle = m.paddles[player];
      if (crossed && Math.abs(b.y - paddle.y) <= PADDLE_H / 2 + BALL_R) {
        b.x = player === 0 ? face + BALL_R : face - BALL_R;
        const rel = paddleBounce(b, paddle, player);
        m.rally++;
        m.longest = Math.max(m.longest, m.rally);
        const speed = ballSpeed(b);
        events.push({ type: "paddle", player, speed, fast: speed >= FAST_HIT, rel });
      }
    }
    // Out of play: a point for the other player.
    if (b.x < -BALL_R * 2 || b.x > COURT_W + BALL_R * 2) {
      const scorer: 0 | 1 = b.x < 0 ? 1 : 0;
      m.score[scorer]++;
      events.push({ type: "score", player: scorer });
      const w = winnerOf(m.score);
      if (w >= 0) {
        m.winner = w;
        events.push({ type: "win", player: w as 0 | 1 });
        b.vx = 0;
        b.vy = 0;
      } else {
        // The player who lost the point receives the next serve.
        m.serveTo = scorer === 0 ? 1 : 0;
        resetForServe(m);
      }
      return events;
    }
  }
  return events;
}

// ---------------------------------------------------------------------------------------------- AI

/**
 * Where the ball will cross the vertical line x = `atX`, unfolding bounces off the top and bottom walls.
 * Returns null if it is not heading that way.
 */
export function predictLanding(ball: Ball, atX: number): number | null {
  if (ball.vx === 0) return null;
  const t = (atX - ball.x) / ball.vx;
  if (t < 0) return null;
  const lo = BALL_R;
  const range = COURT_H - 2 * BALL_R;
  let u = (ball.y + ball.vy * t - lo) % (2 * range);
  if (u < 0) u += 2 * range;
  if (u > range) u = 2 * range - u;
  return lo + u;
}

export interface AiConfig {
  /** Seconds before the AI notices what the ball is doing. */
  reaction: number;
  /** Largest aiming error in pixels. */
  error: number;
  /** Paddle speed in pixels per second. */
  maxSpeed: number;
  /** Chance of a bigger slip on a given return. */
  mistake: number;
  /** How well it keeps its head as the ball speeds up: its error grows by 1 for every `composure` px/s above the serve speed. */
  composure: number;
}

export const AI_LEVELS: Record<Difficulty, AiConfig> = {
  easy: { reaction: 0.32, error: 60, maxSpeed: 300, mistake: 0.25, composure: 240 },
  medium: { reaction: 0.2, error: 36, maxSpeed: 420, mistake: 0.12, composure: 360 },
  hard: { reaction: 0.11, error: 24, maxSpeed: 480, mistake: 0.08, composure: 480 },
};

export interface AiState {
  /** Where the AI is heading. */
  target: number;
  timer: number;
  /** The ball as the AI last saw it. */
  seen: Ball | null;
  /** Its aiming error for the ball it is tracking. */
  err: number;
  /** Where on the paddle it tries to meet the ball, for angled returns. */
  aim: number;
  dir: number;
}

export const newAi = (): AiState => ({ target: COURT_H / 2, timer: 0, seen: null, err: 0, aim: 0, dir: 0 });

/** Drive one paddle: look at the ball every `reaction` seconds, predict, add human error, and move. */
export function aiStep(m: Match, player: 0 | 1, ai: AiState, cfg: AiConfig, dt: number) {
  const ball = m.ball;
  const dir = ball.vx === 0 ? 0 : Math.sign(ball.vx);
  const incoming = player === 1 ? dir > 0 : dir < 0;
  // A new incoming ball: pick this return's error and where on the paddle to meet it.
  if (dir !== ai.dir) {
    ai.dir = dir;
    if (incoming) {
      // Faster balls are harder to judge, so the error grows with the speed.
      const pressure = 1 + Math.max(0, ballSpeed(ball) - BALL_START_SPEED) / cfg.composure;
      let err = (m.rng() * 2 - 1) * cfg.error * pressure;
      if (m.rng() < cfg.mistake) err *= 2.4;
      ai.err = err;
      ai.aim = (m.rng() * 2 - 1) * PADDLE_H * 0.32;
    }
  }
  ai.timer -= dt;
  if (ai.timer <= 0) {
    ai.timer = cfg.reaction;
    ai.seen = { ...ball };
  }
  const seen = ai.seen;
  if (seen && m.countdown <= 0 && (player === 1 ? seen.vx > 0 : seen.vx < 0)) {
    const face = paddleX(player) + (player === 0 ? PADDLE_W / 2 : -PADDLE_W / 2);
    const land = predictLanding(seen, face + (player === 0 ? BALL_R : -BALL_R));
    if (land !== null) ai.target = land + ai.err - ai.aim;
  } else {
    // Ball going away: drift back towards the middle.
    ai.target += (COURT_H / 2 - ai.target) * Math.min(1, dt * 1.2);
  }
  const p = m.paddles[player];
  const gap = ai.target - p.y;
  if (Math.abs(gap) < 3) {
    p.vy = 0;
    return;
  }
  movePaddleToward(p, ai.target, dt, cfg.maxSpeed);
}
