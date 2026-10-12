import { describe, it, expect } from "vitest";
import { COLS, newGame, stepTimeFor, tick, turn, update } from "@/arcade/games/snake/logic";

describe("snake", () => {
  it("moves one cell per step and can't reverse into itself", () => {
    const s = newGame(1);
    const head = { ...s.snake[0] };
    turn(s, "left"); // straight back: ignored
    tick(s);
    expect(s.snake[0]).toEqual({ x: head.x + 1, y: head.y });
    expect(s.snake).toHaveLength(3);
  });

  it("queues two quick turns so a fast U-turn works", () => {
    const s = newGame(1);
    turn(s, "up");
    turn(s, "left");
    const y = s.snake[0].y;
    tick(s);
    tick(s);
    expect(s.snake[0].y).toBe(y - 1);
    expect(s.dir).toBe("left");
  });

  it("eats, scores, grows and speeds up", () => {
    const s = newGame(1);
    s.food = { x: s.snake[0].x + 1, y: s.snake[0].y };
    expect(tick(s)).toContain("eat");
    expect(s.score).toBe(10);
    tick(s);
    expect(s.snake).toHaveLength(4);
    expect(stepTimeFor(10)).toBeLessThan(stepTimeFor(0));
  });

  it("drops a golden fruit every fifth fruit, worth 50, gone after a few seconds", () => {
    const s = newGame(2);
    s.eaten = 4;
    s.food = { x: s.snake[0].x + 1, y: s.snake[0].y };
    expect(tick(s)).toContain("bonus-spawn");
    expect(s.bonus).not.toBeNull();
    s.bonus = { x: s.snake[0].x + 1, y: s.snake[0].y, ttl: 5 };
    expect(tick(s)).toContain("bonus");
    expect(s.score).toBe(60);
    s.bonus = { x: 0, y: 0, ttl: 0.1 };
    expect(update(s, 0.2)).toContain("bonus-gone");
  });

  it("dies on the wall", () => {
    const s = newGame(1);
    let died = false;
    for (let i = 0; i < COLS && !died; i++) died = tick(s).includes("die");
    expect(died).toBe(true);
    expect(s.alive).toBe(false);
  });

  it("dies biting itself", () => {
    const s = newGame(1);
    s.grow = 5;
    for (let i = 0; i < 4; i++) tick(s);
    turn(s, "down");
    tick(s);
    turn(s, "left");
    tick(s);
    turn(s, "up");
    expect(tick(s)).toContain("die");
  });
});
