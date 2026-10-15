import { describe, it, expect } from "vitest";
import {
  AI_LEVELS, BALL_MAX_SPEED, BALL_R, BALL_START_SPEED, COURT_H, COURT_W, FAST_HIT, MAX_BOUNCE, PADDLE_H, PADDLE_SPEED, SERVE_COUNTDOWN,
  SPEED_UP, aiStep, ballSpeed, clampPaddle, movePaddle, movePaddleToward, newAi, newMatch, paddleBounce, paddleX, predictLanding, stepMatch,
  winnerOf, type Ball, type Difficulty, type Match, type MatchEvent,
} from "@/arcade/games/paddle-duel/logic";
import { mulberry32 } from "@/arcade/kit/rng";

/** A match with the serve already over: the ball is live. */
function live(seed = 1): Match {
  const m = newMatch(seed);
  m.countdown = 0;
  return m;
}

const run = (m: Match, seconds: number, dt = 1 / 120) => {
  const events: MatchEvent[] = [];
  for (let t = 0; t < seconds && m.winner < 0; t += dt) events.push(...stepMatch(m, dt));
  return events;
};

describe("paddle duel: bounce angles", () => {
  it("a hit in the middle goes straight back, hits near the tips go off steeply", () => {
    const paddle = { y: 240, vy: 0 };
    const mid: Ball = { x: 50, y: 240, vx: -500, vy: 0 };
    expect(paddleBounce(mid, paddle, 0)).toBeCloseTo(0);
    expect(mid.vy).toBeCloseTo(0);
    expect(mid.vx).toBeGreaterThan(0);

    const top: Ball = { x: 50, y: 240 - PADDLE_H / 2 - BALL_R, vx: -500, vy: 0 };
    expect(paddleBounce(top, paddle, 0)).toBeCloseTo(-1);
    expect(Math.atan2(top.vy, top.vx)).toBeCloseTo(-MAX_BOUNCE, 5);

    const low: Ball = { x: 50, y: 240 + PADDLE_H / 4, vx: -500, vy: 0 };
    paddleBounce(low, paddle, 0);
    expect(low.vy).toBeGreaterThan(0);
    // The angle grows steadily with the distance from the centre.
    const a1 = Math.atan2(low.vy, low.vx);
    const far: Ball = { x: 50, y: 240 + PADDLE_H / 2, vx: -500, vy: 0 };
    paddleBounce(far, paddle, 0);
    expect(Math.atan2(far.vy, far.vx)).toBeGreaterThan(a1);
  });

  it("the right paddle mirrors it", () => {
    const paddle = { y: 240, vy: 0 };
    const ball: Ball = { x: 750, y: 240 + 30, vx: 500, vy: 0 };
    paddleBounce(ball, paddle, 1);
    expect(ball.vx).toBeLessThan(0);
    expect(ball.vy).toBeGreaterThan(0);
  });

  it("every return is a little faster, up to a limit", () => {
    const paddle = { y: 240, vy: 0 };
    const ball: Ball = { x: 50, y: 240, vx: -BALL_START_SPEED, vy: 0 };
    paddleBounce(ball, paddle, 0);
    expect(ballSpeed(ball)).toBeCloseTo(BALL_START_SPEED * SPEED_UP, 5);
    let prev = ballSpeed(ball);
    for (let i = 0; i < 100; i++) {
      ball.vx = -Math.abs(ball.vx);
      paddleBounce(ball, paddle, 0);
      expect(ballSpeed(ball)).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = ballSpeed(ball);
    }
    expect(prev).toBeLessThanOrEqual(BALL_MAX_SPEED + 1e-9);
  });

  it("the ball really bounces off the paddle in play, with the angle set by where it hit", () => {
    const m = live();
    m.paddles[0].y = 200;
    m.ball = { x: 120, y: 200 + 30, vx: -420, vy: 0 };
    const events = run(m, 0.5);
    const hit = events.find((e) => e.type === "paddle");
    expect(hit).toMatchObject({ type: "paddle", player: 0 });
    expect(m.rally).toBe(1);
    expect(m.ball.vx).toBeGreaterThan(0);
    expect(m.ball.vy).toBeGreaterThan(0); // hit below centre: heads down
    expect(m.ball.x).toBeGreaterThan(paddleX(0));
  });

  it("flags fast returns so the screen can shake", () => {
    const m = live();
    m.ball = { x: 120, y: 240, vx: -(FAST_HIT + 50), vy: 0 };
    const hit = run(m, 0.5).find((e) => e.type === "paddle");
    expect(hit).toMatchObject({ type: "paddle", fast: true });
  });
});

describe("paddle duel: walls, serving and scoring", () => {
  it("bounces off the top and bottom walls", () => {
    const m = live();
    m.ball = { x: 400, y: 30, vx: 100, vy: -300 };
    const events = run(m, 0.3);
    expect(events.some((e) => e.type === "wall")).toBe(true);
    expect(m.ball.vy).toBeGreaterThan(0);
    expect(m.ball.y).toBeGreaterThanOrEqual(BALL_R);
    m.ball = { x: 400, y: COURT_H - 30, vx: 100, vy: 300 };
    run(m, 0.3);
    expect(m.ball.vy).toBeLessThan(0);
  });

  it("counts down 3, 2, 1 before the serve, with the ball still", () => {
    const m = newMatch(4);
    const ticks: number[] = [];
    let launched = false;
    for (let t = 0; t < SERVE_COUNTDOWN + 0.5; t += 1 / 60) {
      for (const e of stepMatch(m, 1 / 60)) {
        if (e.type === "tick") ticks.push(e.n);
        if (e.type === "launch") launched = true;
      }
      if (!launched) expect(m.ball.x).toBe(COURT_W / 2);
    }
    expect(ticks).toEqual([2, 1]);
    expect(launched).toBe(true);
    expect(ballSpeed(m.ball)).toBeCloseTo(BALL_START_SPEED, 3);
  });

  it("a ball past a paddle scores for the other side; the loser receives the next serve", () => {
    const m = live();
    m.paddles[0].y = 40; // out of the way
    m.ball = { x: 100, y: 400, vx: -500, vy: 0 };
    const events = run(m, 1);
    expect(events).toContainEqual({ type: "score", player: 1 });
    expect(m.score).toEqual([0, 1]);
    expect(m.countdown).toBeGreaterThan(0);
    expect(m.serveTo).toBe(0);
    expect(m.ball.x).toBe(COURT_W / 2);

    const m2 = live();
    m2.paddles[1].y = 440;
    m2.ball = { x: 700, y: 60, vx: 500, vy: 0 };
    run(m2, 1);
    expect(m2.score).toEqual([1, 0]);
    expect(m2.serveTo).toBe(1);
  });

  it("first to 11 wins, but only by two clear points", () => {
    expect(winnerOf([11, 0])).toBe(0);
    expect(winnerOf([11, 9])).toBe(0);
    expect(winnerOf([11, 10])).toBe(-1);
    expect(winnerOf([10, 10])).toBe(-1);
    expect(winnerOf([12, 10])).toBe(0);
    expect(winnerOf([14, 15])).toBe(-1);
    expect(winnerOf([14, 16])).toBe(1);
    expect(winnerOf([9, 11])).toBe(1);
    expect(winnerOf([10, 8])).toBe(-1);

    const m = live();
    m.score = [10, 10];
    m.paddles[0].y = 40;
    m.ball = { x: 100, y: 400, vx: -500, vy: 0 };
    run(m, 1);
    expect(m.score).toEqual([10, 11]);
    expect(m.winner).toBe(-1); // 11-10 is not enough
    m.countdown = 0;
    m.ball = { x: 100, y: 400, vx: -500, vy: 0 };
    m.paddles[0].y = 40;
    const events = run(m, 1);
    expect(m.score).toEqual([10, 12]);
    expect(m.winner).toBe(1);
    expect(events).toContainEqual({ type: "win", player: 1 });
    // Nothing moves after the win.
    expect(stepMatch(m, 0.1)).toEqual([]);
  });
});

describe("paddle duel: paddle movement", () => {
  it("paddles stay inside the court and move at a limited speed", () => {
    const p = { y: 240, vy: 0 };
    movePaddle(p, -1, 10);
    expect(p.y).toBe(PADDLE_H / 2);
    movePaddle(p, 1, 10);
    expect(p.y).toBe(COURT_H - PADDLE_H / 2);
    const q = { y: 240, vy: 0 };
    movePaddleToward(q, 0, 0.1);
    expect(q.y).toBeCloseTo(240 - PADDLE_SPEED * 0.1);
    movePaddleToward(q, 100, 5);
    expect(q.y).toBe(clampPaddle(100));
  });
});

describe("paddle duel: the AI", () => {
  it("predicts where the ball lands, unfolding bounces off the walls", () => {
    expect(predictLanding({ x: 400, y: 240, vx: 400, vy: 0 }, 766)).toBeCloseTo(240);
    expect(predictLanding({ x: 400, y: 240, vx: -400, vy: 0 }, 766)).toBeNull();
    // Straight line with no bounce: 366 px at 400 px/s with vy 100 is 0.915 s -> +91.5.
    expect(predictLanding({ x: 400, y: 200, vx: 400, vy: 100 }, 766)).toBeCloseTo(200 + 0.915 * 100, 1);
    // Heading for the bottom wall: the prediction is always inside the court.
    for (let i = 0; i < 200; i++) {
      const rng = mulberry32(i + 1);
      const y = predictLanding({ x: 100 + rng() * 600, y: 20 + rng() * 440, vx: 200 + rng() * 600, vy: (rng() - 0.5) * 1200 }, 766)!;
      expect(y).toBeGreaterThanOrEqual(BALL_R - 1e-9);
      expect(y).toBeLessThanOrEqual(COURT_H - BALL_R + 1e-9);
    }
  });

  it("the prediction lands within a pixel of where the simulated ball actually arrives", () => {
    const rng = mulberry32(42);
    for (let i = 0; i < 60; i++) {
      const start: Ball = { x: 150 + rng() * 400, y: 30 + rng() * 420, vx: 300 + rng() * 500, vy: (rng() - 0.5) * 900 };
      const predicted = predictLanding(start, paddleX(1) - 7 - BALL_R)!;
      // Simulate with no paddles in the way.
      const m = live(i + 1);
      m.paddles[1].y = -9999;
      m.ball = { ...start };
      const target = paddleX(1) - 7 - BALL_R;
      let guard = 0;
      while (m.ball.x < target && guard++ < 20000) {
        const before = m.ball.x;
        stepMatch(m, 1 / 240);
        if (m.ball.x === before) break;
      }
      expect(Math.abs(m.ball.y - predicted)).toBeLessThan(3);
    }
  });

  it("has three difficulties that get quicker, sharper and steadier", () => {
    const { easy, medium, hard } = AI_LEVELS;
    expect(hard.reaction).toBeLessThan(medium.reaction);
    expect(medium.reaction).toBeLessThan(easy.reaction);
    expect(hard.error).toBeLessThan(medium.error);
    expect(medium.error).toBeLessThan(easy.error);
    expect(hard.maxSpeed).toBeGreaterThan(medium.maxSpeed);
    expect(medium.maxSpeed).toBeGreaterThan(easy.maxSpeed);
    expect(hard.maxSpeed).toBeLessThanOrEqual(PADDLE_SPEED);
  });

  /** Serve straight at the AI from the middle at a random angle; did it return the ball? */
  function returnRate(level: Difficulty, n: number) {
    let returned = 0;
    for (let s = 1; s <= n; s++) {
      const m = live(s * 7);
      const rng = mulberry32(s * 31);
      m.paddles[0].y = 40;
      const angle = (rng() * 2 - 1) * 0.5;
      m.ball = { x: 400, y: 240, vx: Math.cos(angle) * BALL_START_SPEED, vy: Math.sin(angle) * BALL_START_SPEED };
      const ai = newAi();
      let done = false;
      for (let t = 0; t < 6 && !done; t += 1 / 120) {
        aiStep(m, 1, ai, AI_LEVELS[level], 1 / 120);
        for (const e of stepMatch(m, 1 / 120)) {
          if (e.type === "paddle" && e.player === 1) {
            returned++;
            done = true;
          }
          if (e.type === "score") done = true;
        }
      }
    }
    return returned / n;
  }

  it("returns serves on the way to the paddle: nearly always on Hard, less often on Easy", () => {
    const easy = returnRate("easy", 60);
    const medium = returnRate("medium", 60);
    const hard = returnRate("hard", 60);
    expect(hard).toBeGreaterThanOrEqual(0.95);
    expect(medium).toBeGreaterThanOrEqual(0.8);
    expect(hard).toBeGreaterThanOrEqual(medium);
    expect(medium).toBeGreaterThanOrEqual(easy);
    expect(easy).toBeLessThan(0.97);
  });

  it("a Hard AI beats an Easy AI over a whole match, and matches always finish", () => {
    let hardWins = 0;
    for (let s = 1; s <= 8; s++) {
      const m = newMatch(s);
      const a = newAi();
      const b = newAi();
      for (let t = 0; t < 900 && m.winner < 0; t += 1 / 60) {
        aiStep(m, 0, a, AI_LEVELS.hard, 1 / 60);
        aiStep(m, 1, b, AI_LEVELS.easy, 1 / 60);
        stepMatch(m, 1 / 60);
      }
      expect(m.winner).toBeGreaterThanOrEqual(0);
      if (m.winner === 0) hardWins++;
      expect(Math.abs(m.score[0] - m.score[1])).toBeGreaterThanOrEqual(2);
    }
    expect(hardWins).toBeGreaterThanOrEqual(6);
  });
});
