// Snake rules: pure and seeded so they can be tested.
import { mulberry32, type Rng } from "../../kit/rng";

export const COLS = 20;
export const ROWS = 20;

export type Dir = "up" | "down" | "left" | "right";
export interface Cell {
  x: number;
  y: number;
}

export interface SnakeState {
  /** Head first. */
  snake: Cell[];
  dir: Dir;
  /** Turns waiting for the next steps (so quick double-turns aren't lost). */
  queue: Dir[];
  food: Cell;
  /** A golden fruit worth more, for a few seconds. */
  bonus: (Cell & { ttl: number }) | null;
  score: number;
  eaten: number;
  alive: boolean;
  /** Seconds between steps; shrinks as you grow. */
  stepTime: number;
  acc: number;
  /** Cells the snake still needs to grow by. */
  grow: number;
  rng: Rng;
}

export type SnakeEvent = "eat" | "bonus" | "die" | "bonus-spawn" | "bonus-gone";

const VEC: Record<Dir, Cell> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
const OPPOSITE: Record<Dir, Dir> = { up: "down", down: "up", left: "right", right: "left" };

export const stepTimeFor = (eaten: number) => Math.max(0.055, 0.14 - eaten * 0.0025);

export function newGame(seed = 1): SnakeState {
  const rng = mulberry32(seed);
  const mid = Math.floor(ROWS / 2);
  const snake = [{ x: 6, y: mid }, { x: 5, y: mid }, { x: 4, y: mid }];
  const s: SnakeState = {
    snake, dir: "right", queue: [], food: { x: 14, y: mid }, bonus: null, score: 0, eaten: 0, alive: true,
    stepTime: stepTimeFor(0), acc: 0, grow: 0, rng,
  };
  return s;
}

const occupied = (s: SnakeState, c: Cell) => s.snake.some((p) => p.x === c.x && p.y === c.y);

function freeCell(s: SnakeState): Cell {
  for (let i = 0; i < 400; i++) {
    const c = { x: Math.floor(s.rng() * COLS), y: Math.floor(s.rng() * ROWS) };
    if (!occupied(s, c) && !(s.food.x === c.x && s.food.y === c.y) && !(s.bonus && s.bonus.x === c.x && s.bonus.y === c.y)) return c;
  }
  // Nearly full board: scan for any gap.
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (!occupied(s, { x, y })) return { x, y };
  return { x: 0, y: 0 };
}

/** Queue a turn. Reversing into yourself and repeating the same direction are ignored. */
export function turn(s: SnakeState, d: Dir) {
  const last = s.queue[s.queue.length - 1] ?? s.dir;
  if (d === last || d === OPPOSITE[last] || s.queue.length >= 2) return;
  s.queue.push(d);
}

/** Move one cell. */
export function tick(s: SnakeState): SnakeEvent[] {
  if (!s.alive) return [];
  const events: SnakeEvent[] = [];
  const next = s.queue.shift();
  if (next) s.dir = next;
  const v = VEC[s.dir];
  const head = { x: s.snake[0].x + v.x, y: s.snake[0].y + v.y };
  // The tail moves out of the way this step unless we're growing.
  const body = s.grow > 0 ? s.snake : s.snake.slice(0, -1);
  if (head.x < 0 || head.y < 0 || head.x >= COLS || head.y >= ROWS || body.some((p) => p.x === head.x && p.y === head.y)) {
    s.alive = false;
    return ["die"];
  }
  s.snake.unshift(head);
  if (s.grow > 0) s.grow--;
  else s.snake.pop();

  if (head.x === s.food.x && head.y === s.food.y) {
    s.eaten++;
    s.score += 10;
    s.grow += 1;
    s.food = freeCell(s);
    s.stepTime = stepTimeFor(s.eaten);
    events.push("eat");
    // Every fifth fruit, a golden one appears for a while.
    if (s.eaten % 5 === 0 && !s.bonus) {
      s.bonus = { ...freeCell(s), ttl: 6 };
      events.push("bonus-spawn");
    }
  } else if (s.bonus && head.x === s.bonus.x && head.y === s.bonus.y) {
    s.score += 50;
    s.grow += 3;
    s.bonus = null;
    events.push("bonus");
  }
  return events;
}

/** Advance by dt seconds of real time, stepping as often as the speed allows. */
export function update(s: SnakeState, dt: number): SnakeEvent[] {
  if (!s.alive) return [];
  const events: SnakeEvent[] = [];
  if (s.bonus) {
    s.bonus.ttl -= dt;
    if (s.bonus.ttl <= 0) {
      s.bonus = null;
      events.push("bonus-gone");
    }
  }
  s.acc += dt;
  while (s.acc >= s.stepTime && s.alive) {
    s.acc -= s.stepTime;
    events.push(...tick(s));
  }
  return events;
}
