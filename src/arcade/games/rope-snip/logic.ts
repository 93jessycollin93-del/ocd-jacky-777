// Rope Snip rules, pure. A candy hangs from ropes (Verlet chains with distance constraints) over a 400 × 640 box.
// Swipe through a rope to cut it; get the candy to Munch. Mechanics: bubbles that float the candy (tap to pop),
// air puffers that push it (tap), spikes that destroy it, auto-rope pins that tie a new rope when the candy comes
// close, and stars to collect on the way.

export const BW = 400;
export const BH = 640;
export const CANDY_R = 14;
const G = 900;
const SEG = 16;
const ITER = 12;
const BUBBLE_LIFT = -260;
const PUFF = 520;
const AUTO_R = 70;
export const MUNCH_R = 30;
export const STAR_R = 24;
export const DT = 1 / 120;

export type Vec = { x: number; y: number };

export interface Node {
  x: number;
  y: number;
  px: number;
  py: number;
}

export interface Rope {
  pin: Vec;
  /** Points between the pin and the candy. */
  nodes: Node[];
  /** Length of each link, fixed when the rope is tied. */
  seg: number;
  attached: boolean;
}

export interface Puffer {
  x: number;
  y: number;
  /** Direction it blows (radians). */
  dir: number;
}

export interface LevelDef {
  name: string;
  candy: Vec;
  munch: Vec;
  /** Pins that start with a rope tied to the candy. */
  ropes: Vec[];
  autoPins?: Vec[];
  bubbles?: Vec[];
  puffers?: Puffer[];
  spikes?: { x: number; y: number; w: number; h: number }[];
  stars: Vec[];
}

export interface World {
  level: number;
  candy: Node;
  ropes: Rope[];
  autoPins: { pin: Vec; used: boolean }[];
  bubbles: { x: number; y: number; holding: boolean; popped: boolean }[];
  puffers: Puffer[];
  spikes: { x: number; y: number; w: number; h: number }[];
  stars: { x: number; y: number; got: boolean }[];
  munch: Vec;
  time: number;
  status: "playing" | "won" | "lost";
  lostBy: string;
}

const V = (x: number, y: number): Vec => ({ x, y });

export const LEVELS: LevelDef[] = [
  // Box 1: ropes and stars.
  { name: "Hello, Munch", candy: V(200, 160), munch: V(200, 540), ropes: [V(200, 60)], stars: [V(200, 260), V(200, 360), V(200, 450)] },
  { name: "Two Strings", candy: V(200, 200), munch: V(200, 560), ropes: [V(90, 80), V(310, 80)], stars: [V(200, 300), V(160, 420), V(240, 420)] },
  { name: "Swing Low", candy: V(120, 250), munch: V(320, 560), ropes: [V(200, 80)], stars: [V(250, 280), V(300, 380), V(330, 470)] },
  { name: "Pick One", candy: V(200, 220), munch: V(80, 560), ropes: [V(60, 100), V(340, 100)], stars: [V(130, 300), V(100, 400), V(90, 480)] },
  { name: "Triangle", candy: V(200, 260), munch: V(200, 580), ropes: [V(60, 120), V(340, 120), V(200, 60)], stars: [V(200, 330), V(200, 420), V(200, 500)] },
  { name: "Long Swing", candy: V(60, 120), munch: V(330, 560), ropes: [V(220, 60)], stars: [V(140, 330), V(260, 390), V(320, 470)] },
  { name: "Catch", candy: V(60, 150), munch: V(320, 580), ropes: [V(200, 70)], autoPins: [V(320, 330)], stars: [V(150, 230), V(280, 260), V(320, 460)] },
  { name: "Hand Over Hand", candy: V(40, 120), munch: V(340, 590), ropes: [V(140, 60)], autoPins: [V(220, 240), V(330, 400)], stars: [V(120, 190), V(260, 300), V(340, 500)] },
  { name: "Mind the Spikes", candy: V(60, 140), munch: V(330, 580), ropes: [V(200, 60)], spikes: [{ x: 100, y: 420, w: 150, h: 20 }], stars: [V(200, 220), V(290, 320), V(330, 470)] },
  { name: "Thread the Needle", candy: V(200, 140), munch: V(200, 580), ropes: [V(130, 60), V(270, 60)], spikes: [{ x: 0, y: 420, w: 150, h: 20 }, { x: 250, y: 420, w: 150, h: 20 }], stars: [V(200, 280), V(200, 380), V(200, 500)] },
  // Box 2: bubbles and puffers.
  { name: "Up We Go", candy: V(200, 430), munch: V(200, 110), ropes: [V(200, 330)], bubbles: [V(200, 520)], stars: [V(200, 380), V(200, 260), V(200, 180)] },
  { name: "Pop!", candy: V(80, 300), munch: V(300, 560), ropes: [V(80, 210)], bubbles: [V(80, 400)], puffers: [{ x: 20, y: 380, dir: 0 }], stars: [V(80, 360), V(180, 330), V(290, 430)] },
  { name: "Gust", candy: V(80, 200), munch: V(320, 560), ropes: [V(80, 80)], puffers: [{ x: 20, y: 200, dir: 0 }], stars: [V(160, 240), V(250, 330), V(310, 460)] },
  { name: "Updraft", candy: V(120, 380), munch: V(320, 110), ropes: [V(120, 280)], bubbles: [V(120, 470)], puffers: [{ x: 20, y: 300, dir: 0 }, { x: 20, y: 160, dir: 0 }], stars: [V(120, 430), V(200, 280), V(300, 170)] },
  { name: "Float and Drop", candy: V(80, 360), munch: V(320, 560), ropes: [V(80, 270)], bubbles: [V(80, 450)], puffers: [{ x: 20, y: 200, dir: 0 }], spikes: [{ x: 140, y: 600, w: 120, h: 30 }], stars: [V(80, 410), V(200, 200), V(320, 420)] },
  { name: "Bounce Pad", candy: V(320, 140), munch: V(80, 580), ropes: [V(320, 60)], puffers: [{ x: 380, y: 320, dir: Math.PI }], stars: [V(320, 260), V(200, 330), V(100, 470)] },
  { name: "Catch and Release", candy: V(40, 110), munch: V(200, 590), ropes: [V(140, 50)], autoPins: [V(230, 220)], stars: [V(140, 160), V(220, 330), V(200, 480)] },
  { name: "Spike Garden", candy: V(200, 120), munch: V(200, 590), ropes: [V(100, 50), V(300, 50)], spikes: [{ x: 0, y: 300, w: 140, h: 20 }, { x: 260, y: 300, w: 140, h: 20 }, { x: 0, y: 460, w: 120, h: 20 }, { x: 280, y: 460, w: 120, h: 20 }], stars: [V(200, 230), V(200, 380), V(200, 520)] },
  { name: "Long Way Round", candy: V(80, 380), munch: V(330, 120), ropes: [V(80, 290)], bubbles: [V(80, 470)], puffers: [{ x: 20, y: 300, dir: 0 }, { x: 20, y: 160, dir: 0 }], autoPins: [V(320, 60)], stars: [V(80, 430), V(200, 250), V(320, 180)] },
  { name: "Grand Finale", candy: V(200, 120), munch: V(330, 590), ropes: [V(120, 50), V(280, 50)], autoPins: [V(80, 330)], puffers: [{ x: 20, y: 470, dir: 0 }], spikes: [{ x: 150, y: 420, w: 100, h: 20 }], stars: [V(200, 220), V(80, 420), V(300, 500)] },
];

function makeRope(pin: Vec, candy: Node): Rope {
  const len = Math.max(1, Math.hypot(candy.x - pin.x, candy.y - pin.y));
  const links = Math.max(2, Math.ceil(len / SEG));
  const nodes: Node[] = [];
  for (let i = 1; i < links; i++) {
    const t = i / links;
    const x = pin.x + (candy.x - pin.x) * t;
    const y = pin.y + (candy.y - pin.y) * t;
    nodes.push({ x, y, px: x, py: y });
  }
  return { pin, nodes, seg: len / links, attached: true };
}

export function load(i: number): World {
  const L = LEVELS[i];
  const candy: Node = { x: L.candy.x, y: L.candy.y, px: L.candy.x, py: L.candy.y };
  return {
    level: i, candy, ropes: L.ropes.map((p) => makeRope(p, candy)),
    autoPins: (L.autoPins ?? []).map((p) => ({ pin: p, used: false })),
    bubbles: (L.bubbles ?? []).map((b) => ({ ...b, holding: false, popped: false })),
    puffers: (L.puffers ?? []).map((p) => ({ ...p })), spikes: (L.spikes ?? []).map((s) => ({ ...s })), stars: L.stars.map((s) => ({ ...s, got: false })),
    munch: L.munch, time: 0, status: "playing", lostBy: "",
  };
}

/** Rope length right now (pin through every node to the candy), for tests. */
export function ropeLength(r: Rope, candy: Node): number {
  let len = 0;
  let prev: Vec = r.pin;
  for (const n of r.nodes) {
    len += Math.hypot(n.x - prev.x, n.y - prev.y);
    prev = n;
  }
  if (r.attached) len += Math.hypot(candy.x - prev.x, candy.y - prev.y);
  return len;
}

function segIntersect(a: Vec, b: Vec, c: Vec, d: Vec): boolean {
  const o = (p: Vec, q: Vec, r: Vec) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  const o1 = o(a, b, c);
  const o2 = o(a, b, d);
  const o3 = o(c, d, a);
  const o4 = o(c, d, b);
  return o1 * o2 < 0 && o3 * o4 < 0;
}

/** Cut every rope the swipe from a to b crosses. Returns how many were cut. */
export function cut(w: World, a: Vec, b: Vec): number {
  let n = 0;
  for (const r of w.ropes) {
    if (!r.attached) continue;
    const pts: Vec[] = [r.pin, ...r.nodes, w.candy];
    for (let i = 0; i + 1 < pts.length; i++) {
      if (segIntersect(a, b, pts[i], pts[i + 1])) {
        r.attached = false;
        n++;
        break;
      }
    }
  }
  return n;
}

/** Cut a rope by index (for the solver and keyboard play). */
export function cutRope(w: World, i: number): boolean {
  const r = w.ropes[i];
  if (!r || !r.attached) return false;
  r.attached = false;
  return true;
}

export function popBubble(w: World): boolean {
  const b = w.bubbles.find((x) => x.holding && !x.popped);
  if (!b) return false;
  b.popped = true;
  b.holding = false;
  return true;
}

/** Fire a puffer: pushes the candy if it is in front of it, within range. */
export function puff(w: World, i: number): boolean {
  const p = w.puffers[i];
  if (!p) return false;
  const dx = w.candy.x - p.x;
  const dy = w.candy.y - p.y;
  const along = dx * Math.cos(p.dir) + dy * Math.sin(p.dir);
  const off = Math.abs(-dx * Math.sin(p.dir) + dy * Math.cos(p.dir));
  if (along > 0 && along < 420 && off < 90) {
    // Verlet velocity is position − previous position: shift the previous position back.
    w.candy.px -= Math.cos(p.dir) * PUFF * DT;
    w.candy.py -= Math.sin(p.dir) * PUFF * DT;
  }
  return true;
}

export type RopeEvent = "star" | "bubble" | "rope" | "win" | "lose";

export function step(w: World): RopeEvent[] {
  const ev: RopeEvent[] = [];
  if (w.status !== "playing") return ev;
  w.time += DT;
  const c = w.candy;
  const held = w.bubbles.some((b) => b.holding);
  const gy = held ? BUBBLE_LIFT : G;
  // Integrate the candy and rope nodes.
  const integrate = (n: Node, g: number, damp: number) => {
    const vx = (n.x - n.px) * damp;
    const vy = (n.y - n.py) * damp;
    n.px = n.x;
    n.py = n.y;
    n.x += vx;
    n.y += vy + g * DT * DT;
  };
  integrate(c, gy, held ? 0.97 : 0.999);
  for (const r of w.ropes) for (const n of r.nodes) integrate(n, G, 0.985);
  // Constraints.
  for (let k = 0; k < ITER; k++) {
    for (const r of w.ropes) {
      const L = r.seg;
      const nodes = r.nodes;
      // Pin to first node.
      relax(r.pin, nodes[0], L, 0, 1);
      for (let i = 0; i + 1 < nodes.length; i++) relax(nodes[i], nodes[i + 1], L, 1, 1);
      if (r.attached) relax(nodes[nodes.length - 1], c, L, 1, 0.25);
    }
  }
  // Auto-rope pins.
  for (const a of w.autoPins) {
    if (!a.used && Math.hypot(c.x - a.pin.x, c.y - a.pin.y) < AUTO_R) {
      a.used = true;
      w.ropes.push(makeRope(a.pin, c));
      ev.push("rope");
    }
  }
  // Bubbles catch the candy.
  for (const b of w.bubbles) {
    if (!b.popped && !b.holding && Math.hypot(c.x - b.x, c.y - b.y) < CANDY_R + 22) {
      b.holding = true;
      // A bubble catches softly: it soaks up most of the candy's speed.
      c.px = c.x - (c.x - c.px) * 0.25;
      c.py = c.y - (c.y - c.py) * 0.25;
      ev.push("bubble");
    }
    if (b.holding) {
      b.x = c.x;
      b.y = c.y;
    }
  }
  for (const s of w.stars) {
    if (!s.got && Math.hypot(c.x - s.x, c.y - s.y) < STAR_R) {
      s.got = true;
      ev.push("star");
    }
  }
  if (Math.hypot(c.x - w.munch.x, c.y - w.munch.y) < MUNCH_R) {
    w.status = "won";
    ev.push("win");
    return ev;
  }
  const hitSpike = w.spikes.some((s) => c.x + CANDY_R > s.x && c.x - CANDY_R < s.x + s.w && c.y + CANDY_R > s.y && c.y - CANDY_R < s.y + s.h);
  const out = c.y > BH + 60 || c.y < -80 || c.x < -60 || c.x > BW + 60;
  if (hitSpike || out) {
    w.status = "lost";
    w.lostBy = hitSpike ? "spikes" : "fell";
    ev.push("lose");
  }
  return ev;
}

/** Pull two points to distance L; wa and wb are how much each moves (0 = fixed). */
function relax(a: Vec, b: Vec, L: number, wa: number, wb: number) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d = Math.hypot(dx, dy) || 1e-6;
  const diff = (d - L) / d;
  const total = wa + wb || 1;
  a.x += dx * diff * (wa / total);
  a.y += dy * diff * (wa / total);
  b.x -= dx * diff * (wb / total);
  b.y -= dy * diff * (wb / total);
}

export const starsGot = (w: World) => w.stars.filter((s) => s.got).length;

export type Action = { type: "cut"; i: number } | { type: "pop" } | { type: "puff"; i: number };

/** Every action that could matter right now (for the solver). */
export function actions(w: World): Action[] {
  const out: Action[] = [];
  w.ropes.forEach((r, i) => r.attached && out.push({ type: "cut", i }));
  if (w.bubbles.some((b) => b.holding)) out.push({ type: "pop" });
  w.puffers.forEach((_p, i) => out.push({ type: "puff", i }));
  return out;
}

export function apply(w: World, a: Action) {
  if (a.type === "cut") cutRope(w, a.i);
  else if (a.type === "pop") popBubble(w);
  else puff(w, a.i);
}

/**
 * Find a way to win: a seeded random search over short plans (up to four actions at times on a 0.1 s grid within the
 * first 7 s), each simulated to the end. Deterministic for a given seed. Returns the plan, or null.
 */
export function solve(level: number, tries = 1500, seed = 1): { t: number; a: Action }[] | null {
  let st = seed >>> 0;
  const rnd = () => {
    st = (st + 0x6d2b79f5) >>> 0;
    let t = st;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const base = load(level);
  const kinds: Action[] = [
    ...base.ropes.map((_r, i) => ({ type: "cut", i }) as Action),
    ...(base.bubbles.length ? [{ type: "pop" } as Action, { type: "pop" } as Action] : []),
    ...base.puffers.flatMap((_p, i) => [{ type: "puff", i } as Action, { type: "puff", i } as Action, { type: "puff", i } as Action]),
  ];
  // Auto-pin ropes appear later: allow cutting ropes by index beyond the starting ones too.
  for (let k = 0; k < base.autoPins.length; k++) kinds.push({ type: "cut", i: base.ropes.length + k }, { type: "cut", i: base.ropes.length + k });
  for (let n = 0; n < tries; n++) {
    const count = 1 + Math.floor(rnd() * Math.min(6, kinds.length + 2));
    const plan = Array.from({ length: count }, () => ({ t: Math.round(rnd() * 70) / 10, a: kinds[Math.floor(rnd() * kinds.length)] })).sort((a, b) => a.t - b.t);
    const w = load(level);
    let k = 0;
    while (w.status === "playing" && w.time < 12) {
      while (k < plan.length && plan[k].t <= w.time) apply(w, plan[k++].a);
      step(w);
    }
    if (w.status === "won") return plan;
  }
  return null;
}

/** Play a plan from the start (for tests and the hint replay). */
export function replay(level: number, plan: { t: number; a: Action }[]): World {
  const w = load(level);
  let k = 0;
  while (w.status === "playing" && w.time < 12) {
    while (k < plan.length && plan[k].t <= w.time) apply(w, plan[k++].a);
    step(w);
  }
  return w;
}
