import { describe, expect, it } from "vitest";
import {
  START_SIZE, advance, claimLoop, killPlayer, newWorld, percent, spawnPlayer, turn, type TPlayer, type TWorld,
} from "@/arcade/games/territory/logic";

/** A 30×30 world with just the player, standing still in a 5×5 block centred on (10, 10). */
function solo(): { s: TWorld; p: TPlayer } {
  const s = newWorld(3, { bots: 0, w: 30, h: 30 });
  const p = s.me!;
  s.owner.fill(0);
  s.counts.fill(0);
  spawnPlayer(s, p, 10, 10);
  p.dir = 0;
  return { s, p };
}

/** Drive the player cell by cell along a list of directions (0 right, 1 down, 2 left, 3 up). */
function drive(s: TWorld, p: TPlayer, moves: number[]) {
  for (const d of moves) {
    turn(p, d);
    // A hair over one cell per step, so rounding never leaves the head just short of a centre.
    advance(s, 1.001 / p.speed);
    if (!p.alive) return;
  }
}

const owns = (s: TWorld, p: TPlayer, x: number, y: number) => s.owner[y * s.w + x] === p.id;

describe("territory", () => {
  it("starts everyone on a 5×5 block of their own land", () => {
    const s = newWorld(7, { bots: 4, w: 60, h: 60 });
    for (const p of s.players) {
      expect(p.alive).toBe(true);
      expect(s.counts[p.id]).toBe(START_SIZE * START_SIZE);
    }
    expect(percent(s, s.me!)).toBeCloseTo((25 / 3600) * 100, 6);
  });

  it("leaves a trail outside its land and claims the loop plus everything inside when it gets home", () => {
    const { s, p } = solo();
    // Out of the right edge of the block (x = 12), round a 6×4 rectangle and back in from above.
    drive(s, p, [0, 0, 0, 0, 0]);
    expect(p.trail.length).toBeGreaterThan(0);
    drive(s, p, [3, 3, 3, 3, 3, 3]);
    drive(s, p, [2, 2, 2, 2, 2, 2]);
    // Turns apply at the next cell, so keep heading down until the loop closes on home land.
    for (let i = 0; i < 8 && p.trail.length; i++) drive(s, p, [1]);
    expect(p.alive).toBe(true);
    expect(p.trail).toHaveLength(0);
    // The enclosed interior is now owned, not just the path.
    expect(owns(s, p, 13, 6)).toBe(true);
    expect(owns(s, p, 11, 5)).toBe(true);
    expect(s.counts[p.id]).toBeGreaterThan(25 + 20);
  });

  it("fills enclosed islands of free land and enemy land too", () => {
    const s = newWorld(1, { bots: 1, w: 20, h: 20 });
    const [me, bot] = s.players;
    s.owner.fill(0);
    s.counts.fill(0);
    // A ring of my land with a free cell and an enemy cell inside.
    for (let x = 3; x <= 9; x++) for (const y of [3, 9]) s.owner[y * 20 + x] = me.id;
    for (let y = 3; y <= 9; y++) for (const x of [3, 9]) s.owner[y * 20 + x] = me.id;
    s.counts[me.id] = [...s.owner].filter((o) => o === me.id).length;
    s.owner[5 * 20 + 5] = bot.id;
    s.counts[bot.id] = 1;
    // A one-cell trail is enough to trigger the fill.
    me.trail = [3 * 20 + 2];
    s.trail[3 * 20 + 2] = me.id;
    const gained = claimLoop(s, me);
    expect(gained).toBe(1 + 5 * 5);
    expect(s.owner[6 * 20 + 6]).toBe(me.id);
    expect(s.owner[5 * 20 + 5]).toBe(me.id);
    // The bot lost its last cell, so it's out.
    expect(bot.alive).toBe(false);
    // Cells outside the ring stay free.
    expect(s.owner[0]).toBe(0);
  });

  it("dies when it crosses its own trail", () => {
    const { s, p } = solo();
    // Already out on its own trail just past its land, heading toward an older stretch of that trail.
    p.x = 13.5;
    for (const x of [13, 15]) {
      s.trail[10 * 30 + x] = p.id;
      p.trail.push(10 * 30 + x);
    }
    drive(s, p, [0, 0]);
    expect(p.alive).toBe(false);
    expect(p.diedBy).toBe("your own trail");
  });

  it("dies at the edge of the world", () => {
    const { s, p } = solo();
    drive(s, p, Array(30).fill(0));
    expect(p.alive).toBe(false);
    expect(p.diedBy).toBe("the wall");
  });

  it("knocks out a rival by crossing their trail, and their land frees up", () => {
    const s = newWorld(2, { bots: 1, w: 30, h: 30 });
    const [me, bot] = s.players;
    s.owner.fill(0);
    s.counts.fill(0);
    spawnPlayer(s, me, 6, 15);
    spawnPlayer(s, bot, 24, 15);
    // The rival has a trail crossing my path.
    bot.hold = true;
    for (let y = 5; y <= 25; y++) {
      s.trail[y * 30 + 15] = bot.id;
      bot.trail.push(y * 30 + 15);
    }
    me.dir = 0;
    drive(s, me, Array(9).fill(0));
    expect(me.alive).toBe(true);
    expect(bot.alive).toBe(false);
    expect(me.kills).toBe(1);
    expect(s.counts[bot.id]).toBe(0);
    expect([...s.trail].some((t) => t === bot.id)).toBe(false);
  });

  it("ignores reversing and limits the turn queue", () => {
    const { p } = solo();
    p.dir = 0;
    turn(p, 2);
    expect(p.queue).toEqual([]);
    turn(p, 1);
    turn(p, 0);
    turn(p, 3);
    expect(p.queue.length).toBeLessThanOrEqual(2);
  });

  it("runs a full arena of bots for two minutes without breaking the land counts", () => {
    const s = newWorld(11, { player: false, bots: 8, w: 80, h: 80 });
    for (let i = 0; i < 120 * 10; i++) advance(s, 0.1);
    const counted = new Array(s.counts.length).fill(0);
    for (const o of s.owner) counted[o]++;
    for (const p of s.players) expect(s.counts[p.id]).toBe(counted[p.id]);
    // Bots respawn, so the arena stays busy.
    expect(s.players.filter((p) => p.alive).length).toBeGreaterThan(0);
  });

  it("frees all of a dead player's land", () => {
    const { s, p } = solo();
    killPlayer(s, p, "wall");
    expect(s.counts[p.id]).toBe(0);
    expect([...s.owner].some((o) => o === p.id)).toBe(false);
  });
});
