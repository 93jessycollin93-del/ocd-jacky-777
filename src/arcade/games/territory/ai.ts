// Bot brains for Territory. A bot walks home land, then makes a rectangular trip (out, across, back), looks
// out for rivals near its trail (and heads home if one gets close), and now and then goes after a rival's
// trail. Decisions happen once per cell, exactly where a turn can be applied.
import type { TPlayer, TWorld } from "./logic";
import { DX, DY, opposite } from "./model";

const inB = (s: TWorld, x: number, y: number) => x >= 0 && y >= 0 && x < s.w && y < s.h;

/** Would stepping from (cx, cy) in direction d be a mistake (wall or own trail)? */
function unsafe(s: TWorld, p: TPlayer, cx: number, cy: number, d: number): boolean {
  const nx = cx + DX[d];
  const ny = cy + DY[d];
  if (!inB(s, nx, ny)) return true;
  return s.trail[ny * s.w + nx] === p.id;
}

/** Keep d if it is safe, else the safest turn (preferring `prefer`). */
function safeDir(s: TWorld, p: TPlayer, cx: number, cy: number, d: number, prefer = -1): number {
  if (d === opposite(p.dir)) d = p.dir;
  if (!unsafe(s, p, cx, cy, d)) return d;
  const options = [0, 1, 2, 3].filter((k) => k !== opposite(p.dir) && k !== d && !unsafe(s, p, cx, cy, k));
  if (!options.length) return d;
  if (prefer >= 0 && options.includes(prefer)) return prefer;
  // Prefer the side with more room to the wall.
  let best = options[0];
  let bestRoom = -1;
  for (const k of options) {
    let room = 0;
    while (room < 12 && inB(s, cx + DX[k] * (room + 1), cy + DY[k] * (room + 1)) && s.trail[(cy + DY[k] * (room + 1)) * s.w + cx + DX[k] * (room + 1)] !== p.id) room++;
    if (room > bestRoom) {
      bestRoom = room;
      best = k;
    }
  }
  return best;
}

/** Breadth-first search for the first step toward own land (goal 0) or a rival's trail (goal 1). -1 if none within maxDepth. */
export function bfsDir(s: TWorld, p: TPlayer, cx: number, cy: number, goal: 0 | 1, maxDepth: number): number {
  const { w } = s;
  const id = p.id;
  const stamp = ++s.stampNo;
  let qh = 0;
  let qt = 0;
  const start = cy * w + cx;
  s.stamp[start] = stamp;
  s.depth[start] = 0;
  const expand = (c: number, x: number, y: number, first: number, depth: number, skipDir: number): number => {
    for (let d = 0; d < 4; d++) {
      if (d === skipDir) continue;
      const nx = x + DX[d];
      const ny = y + DY[d];
      if (!inB(s, nx, ny)) continue;
      const n = ny * w + nx;
      if (s.stamp[n] === stamp || s.trail[n] === id) continue;
      s.stamp[n] = stamp;
      const fd = first >= 0 ? first : d;
      const hit = goal === 0 ? s.owner[n] === id : s.trail[n] !== 0 && s.trail[n] !== id;
      if (hit) return fd;
      if (depth + 1 < maxDepth) {
        s.queue[qt++] = n;
        s.firstDir[n] = fd;
        s.depth[n] = depth + 1;
      }
    }
    void c;
    return -1;
  };
  const r0 = expand(start, cx, cy, -1, 0, opposite(p.dir));
  if (r0 >= 0) return r0;
  while (qh < qt) {
    const c = s.queue[qh++];
    const x = c % w;
    const y = (c - x) / w;
    const r = expand(c, x, y, s.firstDir[c], s.depth[c], -1);
    if (r >= 0) return r;
  }
  return -1;
}

/** Is a rival head close enough to my trail (or head) that they might cut it soon? */
function threatened(s: TWorld, p: TPlayer, cx: number, cy: number): boolean {
  const reach = 3 + Math.floor(3 * p.brain.skill);
  for (const o of s.players) {
    if (o === p || !o.alive) continue;
    const ox = Math.floor(o.x);
    const oy = Math.floor(o.y);
    if (Math.abs(ox - cx) + Math.abs(oy - cy) <= reach) return true;
    // Every few cells along the trail is enough.
    for (let i = 0; i < p.trail.length; i += 2) {
      const c = p.trail[i];
      const tx = c % s.w;
      const ty = (c - tx) / s.w;
      if (Math.abs(ox - tx) + Math.abs(oy - ty) <= reach - 1) return true;
    }
  }
  return false;
}

function newPlan(s: TWorld, p: TPlayer, cx: number, cy: number) {
  const b = p.brain;
  const rng = s.rng;
  const span = 4 + 14 * b.skill;
  for (let tries = 0; tries < 6; tries++) {
    const d0 = Math.floor(rng() * 4);
    if (d0 === opposite(p.dir)) continue;
    const l1 = 3 + Math.floor(rng() * span);
    const l2 = 3 + Math.floor(rng() * span);
    const side = rng() < 0.5 ? (d0 + 1) & 3 : (d0 + 3) & 3;
    const ex = cx + DX[d0] * l1;
    const ey = cy + DY[d0] * l1;
    const fx = ex + DX[side] * l2;
    const fy = ey + DY[side] * l2;
    if (inB(s, ex, ey) && inB(s, fx, fy) && fx > 1 && fy > 1 && fx < s.w - 2 && fy < s.h - 2) {
      b.dirs = [d0, side, opposite(d0)];
      b.lens = [l1, l2, 999];
      b.leg = 0;
      b.legLeft = l1;
      return;
    }
  }
  // Boxed in: a short hop toward the middle.
  const toMid = Math.abs(s.w / 2 - cx) > Math.abs(s.h / 2 - cy) ? (cx < s.w / 2 ? 0 : 2) : cy < s.h / 2 ? 1 : 3;
  const side = (toMid + 1) & 3;
  b.dirs = [toMid, side, opposite(toMid)];
  b.lens = [3, 3, 999];
  b.leg = 0;
  b.legLeft = 3;
}

/** Choose the direction for the next cell. Called when the head is centred in (cx, cy) and has just entered it. */
export function decide(s: TWorld, p: TPlayer, cx: number, cy: number): number {
  const b = p.brain;
  const here = cy * s.w + cx;
  const onOwn = s.owner[here] === p.id;
  const out = !onOwn && p.trail.length > 0;

  if (out) {
    const maxTrail = 24 + Math.floor(34 * b.skill);
    if (b.leg >= 2 || p.trail.length > maxTrail || threatened(s, p, cx, cy)) {
      const d = bfsDir(s, p, cx, cy, 0, 80);
      if (d >= 0) {
        b.mode = "return";
        b.dirty = true;
        return safeDir(s, p, cx, cy, d);
      }
    }
    if (b.aggr > 0.3 && p.trail.length <= 16 && s.rng() < 0.5 + 0.5 * b.aggr) {
      const d = bfsDir(s, p, cx, cy, 1, 12);
      if (d >= 0) {
        b.mode = "attack";
        b.dirty = true;
        return safeDir(s, p, cx, cy, d);
      }
    }
    b.mode = "out";
    b.dirty = true;
    b.legLeft--;
    if (b.legLeft <= 0 && b.leg < 2) {
      b.leg++;
      b.legLeft = b.lens[b.leg];
      return safeDir(s, p, cx, cy, b.dirs[b.leg]);
    }
    return safeDir(s, p, cx, cy, b.dirs[Math.min(2, b.leg)]);
  }

  // On home land.
  b.mode = "home";
  if (!b.planned || b.dirty) {
    newPlan(s, p, cx, cy);
    b.planned = true;
    b.dirty = false;
    b.rest = Math.floor(s.rng() * 3);
  }
  if (b.rest > 0) {
    b.rest--;
    return safeDir(s, p, cx, cy, p.dir);
  }
  // Head for the exit in the planned direction (turns only if it is safe).
  return safeDir(s, p, cx, cy, b.dirs[0]);
}
