// Balloon Pop TD: pure rules. Balloons float along a path in layers (popping one reveals the next), towers
// throw darts, spin tacks, lob bombs, freeze, snipe, cast bolts or grow coins. Some balloons shrug off some
// attacks. Survive 40 rounds, then keep going in freeplay. No DOM here; index.tsx draws and handles input.

export const MAP_W = 760;
export const MAP_H = 600;
export const ROAD = 20; // half-width of the road
export const WIN_ROUND = 40;
export const BASE_SPEED = 64; // px/s for a red balloon

export type DmgType = "sharp" | "explode" | "cold" | "shot" | "magic" | "fire";
export type BalloonKind = "red" | "blue" | "green" | "yellow" | "pink" | "black" | "white" | "zebra" | "lead" | "ceramic" | "blimp";

interface BalloonDef { speed: number; hp: number; children: BalloonKind[]; r: number; immune: (DmgType | "freeze")[]; color: string; name: string }
export const BALLOONS: Record<BalloonKind, BalloonDef> = {
  red: { speed: 1, hp: 1, children: [], r: 11, immune: [], color: "#ef4444", name: "Red" },
  blue: { speed: 1.4, hp: 1, children: ["red"], r: 11.5, immune: [], color: "#3b82f6", name: "Blue" },
  green: { speed: 1.8, hp: 1, children: ["blue"], r: 12, immune: [], color: "#22c55e", name: "Green" },
  yellow: { speed: 3.2, hp: 1, children: ["green"], r: 12.5, immune: [], color: "#facc15", name: "Yellow" },
  pink: { speed: 3.5, hp: 1, children: ["yellow"], r: 13, immune: [], color: "#f472b6", name: "Pink" },
  black: { speed: 1.8, hp: 1, children: ["pink", "pink"], r: 8, immune: ["explode"], color: "#1f2937", name: "Black" },
  white: { speed: 2, hp: 1, children: ["pink", "pink"], r: 8, immune: ["freeze"], color: "#f8fafc", name: "White" },
  zebra: { speed: 1.8, hp: 1, children: ["black", "white"], r: 12, immune: ["explode", "freeze"], color: "#e5e7eb", name: "Zebra" },
  lead: { speed: 1, hp: 1, children: ["black", "black"], r: 12.5, immune: ["sharp", "cold"], color: "#94a3b8", name: "Lead" },
  ceramic: { speed: 2.5, hp: 10, children: ["black", "white"], r: 13.5, immune: [], color: "#b45309", name: "Ceramic" },
  blimp: { speed: 1, hp: 200, children: ["ceramic", "ceramic", "ceramic", "ceramic"], r: 30, immune: ["freeze"], color: "#2563eb", name: "Blimp" },
};

/** Red-balloon equivalent: how many lives a balloon costs if it gets through. */
export const rbe = (k: BalloonKind): number => BALLOONS[k].hp + BALLOONS[k].children.reduce((a, c) => a + rbe(c), 0);

// ---------------------------------------------------------------- maps

export interface GameMap { id: string; name: string; blurb: string; path: [number, number][]; grass: string; road: string }
export const MAPS: GameMap[] = [
  { id: "meadow", name: "Meadow", blurb: "A gentle winding lane. Good for learning.", grass: "#4d7c0f", road: "#d6b98c",
    path: [[-30, 90], [200, 90], [200, 250], [60, 250], [60, 520], [320, 520], [320, 330], [480, 330], [480, 90], [680, 90], [680, 520], [790, 520]] },
  { id: "canyon", name: "Canyon", blurb: "A long zigzag: lots of road to cover.", grass: "#a16207", road: "#fde68a",
    path: [[-30, 60], [660, 60], [660, 190], [100, 190], [100, 320], [660, 320], [660, 450], [100, 450], [100, 560], [790, 560]] },
  { id: "spiral", name: "Spiral", blurb: "Spins into a portal in the middle. Short and tough.", grass: "#166534", road: "#cbd5e1",
    path: [[380, -30], [380, 80], [680, 80], [680, 520], [80, 520], [80, 160], [560, 160], [560, 420], [220, 420], [220, 260], [420, 260], [420, 340]] },
];

export interface Track { pts: [number, number][]; cum: number[]; len: number }
export function track(m: GameMap): Track {
  const cum = [0];
  for (let i = 1; i < m.path.length; i++) {
    const [ax, ay] = m.path[i - 1];
    const [bx, by] = m.path[i];
    cum.push(cum[i - 1] + Math.hypot(bx - ax, by - ay));
  }
  return { pts: m.path, cum, len: cum[cum.length - 1] };
}

/** Point and heading at distance d along the track. */
export function along(t: Track, d: number): [number, number, number] {
  const n = t.pts.length;
  let i = 1;
  while (i < n - 1 && t.cum[i] < d) i++;
  const [ax, ay] = t.pts[i - 1];
  const [bx, by] = t.pts[i];
  const seg = t.cum[i] - t.cum[i - 1] || 1;
  const k = Math.max(0, Math.min(1, (d - t.cum[i - 1]) / seg));
  return [ax + (bx - ax) * k, ay + (by - ay) * k, Math.atan2(by - ay, bx - ax)];
}

export function distToTrack(t: Track, x: number, y: number) {
  let best = Infinity;
  for (let i = 1; i < t.pts.length; i++) {
    const [ax, ay] = t.pts[i - 1];
    const [bx, by] = t.pts[i];
    const dx = bx - ax;
    const dy = by - ay;
    const k = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
    best = Math.min(best, Math.hypot(ax + dx * k - x, ay + dy * k - y));
  }
  return best;
}

// ---------------------------------------------------------------- towers

export type TowerId = "dart" | "tack" | "bomb" | "frost" | "sniper" | "wizard" | "farm";
export type Targeting = "first" | "last" | "strong" | "close";
export const TARGETING: Targeting[] = ["first", "last", "strong", "close"];

export interface Stats {
  range: number; cd: number; dmg: number; pierce: number; count: number; spread: number; speed: number;
  type: DmgType; splash: number; freeze: number; coldDmg: number; freezeAll: boolean; slowAura: number;
  homing: boolean; income: number; lives: number; interest: number; ignoreImmune: boolean;
}
interface Mod {
  dmg?: number; pierce?: number; count?: number; spread?: number; rangeMul?: number; cdMul?: number; splash?: number; type?: DmgType;
  freeze?: number; coldDmg?: number; freezeAll?: boolean; slowAura?: number; homing?: boolean; income?: number; lives?: number; interest?: number; ignoreImmune?: boolean;
}
export interface Upgrade { name: string; blurb: string; cost: number; mod: Mod }
export interface TowerDef { id: TowerId; name: string; icon: string; blurb: string; cost: number; attack: "proj" | "ring" | "bomb" | "freeze" | "hitscan" | "farm"; base: Stats; paths: [Upgrade[], Upgrade[]] }

const S = (o: Partial<Stats>): Stats => ({
  range: 120, cd: 1, dmg: 1, pierce: 1, count: 1, spread: 0, speed: 600, type: "sharp", splash: 0, freeze: 0, coldDmg: 0, freezeAll: false, slowAura: 0,
  homing: false, income: 0, lives: 0, interest: 0, ignoreImmune: false, ...o,
});

export const TOWERS: TowerDef[] = [
  { id: "dart", name: "Dart Tower", icon: "🎯", blurb: "Throws a dart at one balloon. Cheap and steady.", cost: 200, attack: "proj",
    base: S({ range: 125, cd: 0.95, pierce: 2, speed: 640 }),
    paths: [
      [
        { name: "Sharp Darts", blurb: "Each dart pops 1 more balloon.", cost: 140, mod: { pierce: 1 } },
        { name: "Razor Darts", blurb: "Each dart pops 2 more balloons.", cost: 220, mod: { pierce: 2 } },
        { name: "Triple Darts", blurb: "Throws three darts at once.", cost: 400, mod: { count: 3, spread: 0.22 } },
      ],
      [
        { name: "Long Throw", blurb: "+25% range.", cost: 90, mod: { rangeMul: 1.25 } },
        { name: "Quick Hands", blurb: "Throws 33% faster.", cost: 180, mod: { cdMul: 0.75 } },
        { name: "Dart Storm", blurb: "Throws twice as fast again.", cost: 700, mod: { cdMul: 0.5 } },
      ],
    ] },
  { id: "tack", name: "Tack Ring", icon: "✳️", blurb: "Sprays tacks in every direction. Short range.", cost: 280, attack: "ring",
    base: S({ range: 78, cd: 1.35, count: 8, speed: 420 }),
    paths: [
      [
        { name: "Fast Spin", blurb: "Shoots 33% faster.", cost: 150, mod: { cdMul: 0.75 } },
        { name: "Faster Spin", blurb: "Shoots 50% faster again.", cost: 260, mod: { cdMul: 0.67 } },
        { name: "Blade Ring", blurb: "Sixteen blades that pop 3 each.", cost: 650, mod: { count: 16, pierce: 2 } },
      ],
      [
        { name: "Long Tacks", blurb: "+20% range.", cost: 100, mod: { rangeMul: 1.2 } },
        { name: "More Tacks", blurb: "Twelve tacks per spray.", cost: 200, mod: { count: 12 } },
        { name: "Hot Tacks", blurb: "Burning tacks pop lead too.", cost: 480, mod: { type: "fire", dmg: 1 } },
      ],
    ] },
  { id: "bomb", name: "Bomb Cannon", icon: "💣", blurb: "Explodes on impact. Pops lead, not black.", cost: 520, attack: "bomb",
    base: S({ range: 135, cd: 1.5, type: "explode", splash: 40, pierce: 16, speed: 420 }),
    paths: [
      [
        { name: "Bigger Bombs", blurb: "Bigger blast that pops more.", cost: 350, mod: { splash: 58, pierce: 10 } },
        { name: "Heavy Bombs", blurb: "Blasts deal 2 damage.", cost: 750, mod: { dmg: 1 } },
        { name: "Mega Bombs", blurb: "Huge blasts, 5 damage each.", cost: 1800, mod: { splash: 80, dmg: 3, pierce: 20 } },
      ],
      [
        { name: "Extra Range", blurb: "+25% range.", cost: 200, mod: { rangeMul: 1.25 } },
        { name: "Fast Reload", blurb: "Fires 33% faster.", cost: 380, mod: { cdMul: 0.75 } },
        { name: "Frag Bombs", blurb: "Blasts pop black and zebra too.", cost: 550, mod: { ignoreImmune: true } },
      ],
    ] },
  { id: "frost", name: "Frost Tower", icon: "❄️", blurb: "Freezes nearby balloons in place. Can't pop white.", cost: 300, attack: "freeze",
    base: S({ range: 72, cd: 2.2, dmg: 0, pierce: 30, type: "cold", freeze: 1.3 }),
    paths: [
      [
        { name: "Deep Freeze", blurb: "Freezes 60% longer.", cost: 200, mod: { freeze: 0.8 } },
        { name: "Cold Snap", blurb: "Freezing also pops a layer.", cost: 380, mod: { coldDmg: 1 } },
        { name: "Arctic Wind", blurb: "Everything in range moves 40% slower.", cost: 1100, mod: { slowAura: 0.4 } },
      ],
      [
        { name: "Wide Chill", blurb: "+25% range.", cost: 150, mod: { rangeMul: 1.25 } },
        { name: "Quick Frost", blurb: "Freezes 40% more often.", cost: 280, mod: { cdMul: 0.7 } },
        { name: "Ice Shards", blurb: "Can freeze white and zebra.", cost: 420, mod: { freezeAll: true } },
      ],
    ] },
  { id: "sniper", name: "Sniper Nest", icon: "🔭", blurb: "Hits the lead balloon anywhere on the map. Pops anything.", cost: 350, attack: "hitscan",
    base: S({ range: 2000, cd: 1.6, dmg: 2, type: "shot" }),
    paths: [
      [
        { name: "Full Metal", blurb: "4 damage per shot.", cost: 350, mod: { dmg: 2 } },
        { name: "Large Calibre", blurb: "7 damage per shot.", cost: 1200, mod: { dmg: 3 } },
        { name: "Deadly Aim", blurb: "18 damage per shot.", cost: 3000, mod: { dmg: 11 } },
      ],
      [
        { name: "Fast Bolt", blurb: "Shoots 43% faster.", cost: 400, mod: { cdMul: 0.7 } },
        { name: "Semi-Auto", blurb: "Shoots twice as fast again.", cost: 1500, mod: { cdMul: 0.5 } },
        { name: "Full Auto", blurb: "Shoots three times as fast again.", cost: 3400, mod: { cdMul: 0.33 } },
      ],
    ] },
  { id: "wizard", name: "Arcane Tower", icon: "🔮", blurb: "Magic bolts pop every kind of balloon.", cost: 450, attack: "proj",
    base: S({ range: 115, cd: 1.1, pierce: 3, type: "magic", speed: 420 }),
    paths: [
      [
        { name: "Arcane Blast", blurb: "Bolts deal 2 damage.", cost: 350, mod: { dmg: 1 } },
        { name: "Arcane Mastery", blurb: "Faster bolts that pop 3 more.", cost: 900, mod: { cdMul: 0.6, pierce: 3 } },
        { name: "Fireball", blurb: "Bolts explode on impact.", cost: 1500, mod: { splash: 48, pierce: 12 } },
      ],
      [
        { name: "Far Sight", blurb: "+25% range.", cost: 150, mod: { rangeMul: 1.25 } },
        { name: "Seeking Bolts", blurb: "Bolts curve toward balloons.", cost: 300, mod: { homing: true } },
        { name: "Twin Bolts", blurb: "Casts two bolts at once.", cost: 1300, mod: { count: 2, spread: 0.18 } },
      ],
    ] },
  { id: "farm", name: "Coin Tree", icon: "🌳", blurb: "Grows $80 at the end of every round.", cost: 700, attack: "farm",
    base: S({ range: 0, cd: 0, dmg: 0, income: 80 }),
    paths: [
      [
        { name: "More Coins", blurb: "+$40 per round.", cost: 300, mod: { income: 40 } },
        { name: "Golden Fruit", blurb: "+$100 per round.", cost: 800, mod: { income: 100 } },
        { name: "Money Tree", blurb: "+$250 per round.", cost: 2400, mod: { income: 250 } },
      ],
      [
        { name: "Sprinkler", blurb: "+1 life every round.", cost: 250, mod: { lives: 1 } },
        { name: "Piggy Bank", blurb: "+10% of your cash each round (max $250).", cost: 900, mod: { interest: 0.1 } },
        { name: "Orchard", blurb: "+$200 per round and +2 lives.", cost: 2000, mod: { income: 200, lives: 2 } },
      ],
    ] },
];
export const towerDef = (id: TowerId) => TOWERS.find((t) => t.id === id)!;

export interface Tower { uid: number; id: TowerId; x: number; y: number; tiers: [number, number]; cd: number; angle: number; target: Targeting; pops: number; spent: number }

export function stats(t: Pick<Tower, "id" | "tiers">): Stats {
  const def = towerDef(t.id);
  const s: Stats = { ...def.base };
  for (let p = 0; p < 2; p++) {
    for (let i = 0; i < t.tiers[p]; i++) {
      const m = def.paths[p][i].mod;
      if (m.dmg) s.dmg += m.dmg;
      if (m.pierce) s.pierce += m.pierce;
      if (m.count) s.count = m.count;
      if (m.spread) s.spread = m.spread;
      if (m.rangeMul) s.range *= m.rangeMul;
      if (m.cdMul) s.cd *= m.cdMul;
      if (m.splash) s.splash = m.splash;
      if (m.type) s.type = m.type;
      if (m.freeze) s.freeze += m.freeze;
      if (m.coldDmg) s.coldDmg += m.coldDmg;
      if (m.freezeAll) s.freezeAll = true;
      if (m.slowAura) s.slowAura = m.slowAura;
      if (m.homing) s.homing = true;
      if (m.income) s.income += m.income;
      if (m.lives) s.lives += m.lives;
      if (m.interest) s.interest = m.interest;
      if (m.ignoreImmune) s.ignoreImmune = true;
    }
  }
  return s;
}

/** Bloons-style crosspathing: both paths can be bought, but only one may go past tier 2. */
export function canUpgrade(t: Tower, path: 0 | 1) {
  const cur = t.tiers[path];
  return cur < 3 && !(cur + 1 === 3 && t.tiers[1 - path] === 3);
}
export const nextUpgrade = (t: Tower, path: 0 | 1): Upgrade | null => (canUpgrade(t, path) ? towerDef(t.id).paths[path][t.tiers[path]] : null);
/** Which path is blocked because the other one went to tier 3. */
export const pathLocked = (t: Tower, path: 0 | 1) => t.tiers[path] < 3 && t.tiers[path] >= 2 && t.tiers[1 - path] >= 3;

// ---------------------------------------------------------------- rounds

/** Each round: groups that come one after another, written "count kind gap". */
const ROUND_TEXT = [
  "20 red .9",
  "30 red .7",
  "20 red .6, 6 blue .8",
  "30 red .5, 12 blue .7",
  "10 blue .6, 30 red .4, 10 blue .5",
  "15 green .9, 20 red .4, 10 blue .5",
  "25 blue .5, 10 green .7, 20 red .3",
  "20 blue .4, 15 green .6, 30 red .25",
  "30 green .5",
  "100 blue .25",
  "10 yellow .9, 20 green .5, 20 blue .4",
  "15 green .5, 10 yellow .7, 30 blue .3",
  "50 blue .25, 25 green .4, 8 yellow .7",
  "40 red .2, 20 green .4, 15 yellow .5, 25 blue .3",
  "20 yellow .5, 10 pink .9, 40 green .3",
  "20 green .3, 25 yellow .4",
  "8 pink .6, 20 yellow .35",
  "50 green .25, 10 black 1",
  "15 yellow .4, 15 pink .5, 6 black .9",
  "6 black .8, 8 white .8",
  "25 pink .35, 15 yellow .3",
  "16 white .6",
  "8 lead 1.2, 20 pink .3",
  "2 zebra 2, 30 green .2",
  "25 yellow .25, 10 lead 1, 15 pink .3",
  "10 zebra 1, 25 pink .25",
  "60 red .1, 40 blue .12, 30 green .15, 30 yellow .15",
  "12 lead .8, 10 black .5, 10 white .5",
  "30 yellow .2, 30 pink .2, 4 zebra 1",
  "9 lead .6, 2 ceramic 2",
  "12 black .4, 12 white .4, 8 zebra .7",
  "25 black .3, 20 white .3, 8 lead .6",
  "4 ceramic 1.2, 20 yellow .15",
  "140 yellow .1, 6 zebra .6",
  "35 pink .15, 20 lead .5, 10 black .3",
  "80 pink .12",
  "10 zebra .4, 7 ceramic .8, 20 white .3",
  "14 ceramic .6, 30 lead .3",
  "20 zebra .3, 18 ceramic .5, 20 lead .3",
  "1 blimp 0, 10 ceramic .6",
];

export interface Spawn { t: number; kind: BalloonKind }
export interface Group { count: number; kind: BalloonKind; gap: number }

export function roundGroups(r: number): Group[] {
  if (r <= ROUND_TEXT.length) {
    return ROUND_TEXT[r - 1].split(",").map((g) => {
      const [c, k, gap] = g.trim().split(/\s+/);
      return { count: Number(c), kind: k as BalloonKind, gap: Number(gap) };
    });
  }
  // Freeplay: ceramics, lead and blimps grow every round.
  const x = r - WIN_ROUND;
  return [
    { count: 10 + x * 2, kind: "ceramic", gap: Math.max(0.15, 0.5 - x * 0.01) },
    { count: 10 + x * 2, kind: "lead", gap: 0.25 },
    { count: 1 + Math.floor(x / 4), kind: "blimp", gap: 2.5 },
    { count: 20 + x * 3, kind: "zebra", gap: 0.2 },
  ];
}

export function roundSpawns(r: number): Spawn[] {
  const out: Spawn[] = [];
  let t = 0;
  for (const g of roundGroups(r)) {
    for (let i = 0; i < g.count; i++) {
      out.push({ t, kind: g.kind });
      t += g.gap;
    }
    t += 0.6;
  }
  return out;
}

/** Balloons in freeplay get tougher: ceramic and blimp health grows each round past 40. */
export const hpMul = (round: number, k: BalloonKind) => (round > WIN_ROUND && (k === "ceramic" || k === "blimp") ? 1 + (round - WIN_ROUND) * 0.08 : 1);

// ---------------------------------------------------------------- state

export type Difficulty = "easy" | "normal" | "hard";
export const DIFFICULTY: Record<Difficulty, { lives: number; costMul: number; name: string }> = {
  easy: { lives: 200, costMul: 0.85, name: "Easy" },
  normal: { lives: 100, costMul: 1, name: "Normal" },
  hard: { lives: 40, costMul: 1.1, name: "Hard" },
};

export interface Balloon { id: number; kind: BalloonKind; d: number; hp: number; frozen: number; slow: number; from: number; x: number; y: number; dead: boolean }
export interface Proj {
  id: number; kind: "dart" | "tack" | "bomb" | "bolt"; x: number; y: number; vx: number; vy: number; life: number; pierce: number; dmg: number; type: DmgType;
  splash: number; homing: boolean; ignoreImmune: boolean; tower: number; hit: number[]; dead: boolean;
}
export interface TDState {
  map: number; track: Track; diff: Difficulty; cash: number; lives: number; round: number; active: boolean; spawnT: number; queue: Spawn[]; qi: number;
  balloons: Balloon[]; towers: Tower[]; projs: Proj[]; nextId: number; time: number; over: boolean; won: boolean; pops: number; auto: boolean;
}

export const START_CASH = 650;

export function newGame(map = 0, diff: Difficulty = "normal"): TDState {
  return {
    map, track: track(MAPS[map]), diff, cash: START_CASH, lives: DIFFICULTY[diff].lives, round: 0, active: false, spawnT: 0, queue: [], qi: 0,
    balloons: [], towers: [], projs: [], nextId: 1, time: 0, over: false, won: false, pops: 0, auto: false,
  };
}

export const price = (s: TDState, base: number) => Math.round((base * DIFFICULTY[s.diff].costMul) / 5) * 5;
export const sellValue = (t: Tower) => Math.floor(t.spent * 0.7);

export function canPlace(s: TDState, x: number, y: number) {
  if (x < 16 || y < 16 || x > MAP_W - 16 || y > MAP_H - 16) return false;
  if (distToTrack(s.track, x, y) < ROAD + 15) return false;
  return s.towers.every((t) => Math.hypot(t.x - x, t.y - y) >= 32);
}

export function place(s: TDState, id: TowerId, x: number, y: number): Tower | null {
  const cost = price(s, towerDef(id).cost);
  if (s.cash < cost || !canPlace(s, x, y)) return null;
  s.cash -= cost;
  const t: Tower = { uid: s.nextId++, id, x, y, tiers: [0, 0], cd: 0, angle: -Math.PI / 2, target: "first", pops: 0, spent: cost };
  s.towers.push(t);
  return t;
}

export function upgrade(s: TDState, t: Tower, path: 0 | 1) {
  const u = nextUpgrade(t, path);
  if (!u) return false;
  const cost = price(s, u.cost);
  if (s.cash < cost) return false;
  s.cash -= cost;
  t.spent += cost;
  t.tiers[path]++;
  return true;
}

export function sell(s: TDState, t: Tower) {
  s.cash += sellValue(t);
  s.towers = s.towers.filter((x) => x !== t);
}

export function startRound(s: TDState) {
  if (s.active || s.over) return false;
  s.round++;
  s.active = true;
  s.queue = roundSpawns(s.round);
  s.qi = 0;
  s.spawnT = 0;
  return true;
}

// ---------------------------------------------------------------- simulation

export type TDEvent =
  | { type: "pop"; x: number; y: number; kind: BalloonKind }
  | { type: "leak"; lives: number; kind: BalloonKind }
  | { type: "blast"; x: number; y: number; r: number }
  | { type: "freeze"; x: number; y: number; r: number }
  | { type: "shot"; x1: number; y1: number; x2: number; y2: number }
  | { type: "clink"; x: number; y: number }
  | { type: "fire"; tower: number; id: TowerId }
  | { type: "roundEnd"; round: number; bonus: number }
  | { type: "win" }
  | { type: "lose" };

function spawn(s: TDState, kind: BalloonKind, d: number, from = 0) {
  const b: Balloon = { id: s.nextId++, kind, d, hp: BALLOONS[kind].hp * hpMul(s.round, kind), frozen: 0, slow: 1, from, x: 0, y: 0, dead: false };
  [b.x, b.y] = along(s.track, d);
  s.balloons.push(b);
  return b;
}

const immuneTo = (k: BalloonKind, type: DmgType, ignore: boolean) => !ignore && BALLOONS[k].immune.includes(type);

/** Deal damage to a balloon: each layer popped pays $1 and reveals its children. Extra damage carries into the first child. */
export function damage(s: TDState, b: Balloon, dmg: number, tower: Tower | undefined, src: number, ev: TDEvent[]) {
  if (b.dead || dmg <= 0) return;
  b.hp -= dmg;
  if (b.hp > 0) return;
  b.dead = true;
  s.cash += 1;
  s.pops++;
  if (tower) tower.pops++;
  ev.push({ type: "pop", x: b.x, y: b.y, kind: b.kind });
  const kids = BALLOONS[b.kind].children;
  let left = -b.hp;
  kids.forEach((k, i) => {
    const c = spawn(s, k, Math.max(0, b.d - i * 9), src);
    if (left > 0 && i === 0) {
      const l = left;
      left = 0;
      damage(s, c, l, tower, src, ev);
    }
  });
}

function pickTarget(s: TDState, t: Tower, range: number): Balloon | null {
  let best: Balloon | null = null;
  let score = -Infinity;
  for (const b of s.balloons) {
    if (b.dead) continue;
    const dist = Math.hypot(b.x - t.x, b.y - t.y);
    if (dist > range + BALLOONS[b.kind].r) continue;
    const v = t.target === "first" ? b.d : t.target === "last" ? -b.d : t.target === "strong" ? rbe(b.kind) * 10000 + b.d : -dist;
    if (v > score) {
      score = v;
      best = b;
    }
  }
  return best;
}

function fire(s: TDState, t: Tower, st: Stats, ev: TDEvent[]): boolean {
  const def = towerDef(t.id);
  if (def.attack === "farm") return false;
  if (def.attack === "freeze") {
    let any = false;
    let n = 0;
    for (const b of s.balloons) {
      if (b.dead || n >= st.pierce || Math.hypot(b.x - t.x, b.y - t.y) > st.range + BALLOONS[b.kind].r) continue;
      const canFreeze = !BALLOONS[b.kind].immune.includes("freeze") || (st.freezeAll && b.kind !== "blimp");
      if (!canFreeze) continue;
      any = true;
      n++;
      b.frozen = Math.max(b.frozen, b.kind === "ceramic" ? st.freeze * 0.5 : st.freeze);
      if (st.coldDmg && !immuneTo(b.kind, "cold", false)) damage(s, b, st.coldDmg, t, -t.uid, ev);
    }
    if (any) ev.push({ type: "freeze", x: t.x, y: t.y, r: st.range });
    return any;
  }
  const target = pickTarget(s, t, st.range);
  if (!target) return false;
  // Lead the target: aim where it will be when the shot arrives (it follows the road).
  let ax = target.x;
  let ay = target.y;
  if (def.attack === "proj" || def.attack === "bomb") {
    const v = target.frozen > 0 ? 0 : BASE_SPEED * BALLOONS[target.kind].speed * target.slow;
    for (let i = 0; i < 2; i++) [ax, ay] = along(s.track, target.d + (v * Math.hypot(ax - t.x, ay - t.y)) / st.speed);
  }
  t.angle = Math.atan2(ay - t.y, ax - t.x);
  ev.push({ type: "fire", tower: t.uid, id: t.id });
  if (def.attack === "hitscan") {
    ev.push({ type: "shot", x1: t.x, y1: t.y, x2: target.x, y2: target.y });
    if (immuneTo(target.kind, st.type, st.ignoreImmune)) ev.push({ type: "clink", x: target.x, y: target.y });
    else damage(s, target, st.dmg, t, -t.uid, ev);
    return true;
  }
  const kind: Proj["kind"] = def.attack === "ring" ? "tack" : def.attack === "bomb" ? "bomb" : t.id === "wizard" ? "bolt" : "dart";
  const n = st.count;
  for (let i = 0; i < n; i++) {
    const a = def.attack === "ring" ? t.angle + (i / n) * Math.PI * 2 : t.angle + (i - (n - 1) / 2) * st.spread;
    const life = def.attack === "ring" ? st.range / st.speed : (st.range * 1.6) / st.speed;
    s.projs.push({
      id: s.nextId++, kind, x: t.x, y: t.y, vx: Math.cos(a) * st.speed, vy: Math.sin(a) * st.speed, life, pierce: st.pierce, dmg: st.dmg,
      type: st.type, splash: st.splash, homing: st.homing, ignoreImmune: st.ignoreImmune, tower: t.uid, hit: [], dead: false,
    });
  }
  return true;
}

function blast(s: TDState, p: Proj, tower: Tower | undefined, ev: TDEvent[]) {
  ev.push({ type: "blast", x: p.x, y: p.y, r: p.splash });
  let n = 0;
  // Snapshot: children spawned by this blast aren't hit by it again.
  for (const b of s.balloons.slice()) {
    if (n >= p.pierce) break;
    if (b.dead || Math.hypot(b.x - p.x, b.y - p.y) > p.splash + BALLOONS[b.kind].r) continue;
    n++;
    if (!immuneTo(b.kind, p.type, p.ignoreImmune)) damage(s, b, p.dmg, tower, p.id, ev);
  }
}

export function step(s: TDState, dt: number): TDEvent[] {
  const ev: TDEvent[] = [];
  if (s.over) return ev;
  s.time += dt;
  // Spawn this round's queue.
  if (s.active) {
    s.spawnT += dt;
    while (s.qi < s.queue.length && s.queue[s.qi].t <= s.spawnT) spawn(s, s.queue[s.qi++].kind, 0);
  }
  // Frost auras slow balloons; then towers fire.
  for (const b of s.balloons) b.slow = 1;
  const byUid = new Map<number, Tower>();
  for (const t of s.towers) {
    byUid.set(t.uid, t);
    const st = stats(t);
    if (st.slowAura) {
      for (const b of s.balloons) if (Math.hypot(b.x - t.x, b.y - t.y) < st.range) b.slow = Math.min(b.slow, 1 - st.slowAura);
    }
    if (towerDef(t.id).attack === "farm") continue;
    t.cd -= dt;
    if (t.cd <= 0) {
      if (fire(s, t, st, ev)) t.cd = st.cd;
      else t.cd = 0;
    }
  }
  // Projectiles.
  for (const p of s.projs) {
    if (p.dead) continue;
    if (p.homing) {
      let best: Balloon | null = null;
      let bd = 160;
      for (const b of s.balloons) {
        const d = Math.hypot(b.x - p.x, b.y - p.y);
        if (!b.dead && d < bd && !p.hit.includes(b.id)) {
          bd = d;
          best = b;
        }
      }
      if (best) {
        const sp = Math.hypot(p.vx, p.vy);
        const a = Math.atan2(p.vy, p.vx);
        const want = Math.atan2(best.y - p.y, best.x - p.x);
        let da = want - a;
        while (da > Math.PI) da -= Math.PI * 2;
        while (da < -Math.PI) da += Math.PI * 2;
        const na = a + Math.max(-6 * dt, Math.min(6 * dt, da));
        p.vx = Math.cos(na) * sp;
        p.vy = Math.sin(na) * sp;
      }
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    if (p.life <= 0 || p.x < -40 || p.y < -40 || p.x > MAP_W + 40 || p.y > MAP_H + 40) {
      p.dead = true;
      continue;
    }
    const tower = byUid.get(p.tower);
    for (const b of s.balloons) {
      if (b.dead || b.from === p.id || p.hit.includes(b.id)) continue;
      const r = BALLOONS[b.kind].r + (p.kind === "bomb" ? 6 : 4);
      if (Math.abs(b.x - p.x) > r || Math.abs(b.y - p.y) > r || (b.x - p.x) ** 2 + (b.y - p.y) ** 2 > r * r) continue;
      if (p.splash > 0) {
        blast(s, p, tower, ev);
        p.dead = true;
        break;
      }
      p.hit.push(b.id);
      if (immuneTo(b.kind, p.type, p.ignoreImmune)) {
        ev.push({ type: "clink", x: b.x, y: b.y });
        p.dead = true;
        break;
      }
      damage(s, b, p.dmg, tower, p.id, ev);
      if (--p.pierce <= 0) {
        p.dead = true;
        break;
      }
    }
  }
  // Balloons move; any that reach the end cost lives.
  for (const b of s.balloons) {
    if (b.dead) continue;
    if (b.frozen > 0) b.frozen = Math.max(0, b.frozen - dt);
    else b.d += BASE_SPEED * BALLOONS[b.kind].speed * b.slow * dt;
    if (b.d >= s.track.len) {
      b.dead = true;
      const lost = rbe(b.kind);
      s.lives -= lost;
      ev.push({ type: "leak", lives: lost, kind: b.kind });
      continue;
    }
    [b.x, b.y] = along(s.track, b.d);
  }
  s.balloons = s.balloons.filter((b) => !b.dead);
  s.projs = s.projs.filter((p) => !p.dead);
  if (s.lives <= 0) {
    s.lives = 0;
    s.over = true;
    ev.push({ type: "lose" });
    return ev;
  }
  // Round over: pay the bonus and the coin trees.
  if (s.active && s.qi >= s.queue.length && s.balloons.length === 0) {
    s.active = false;
    s.projs = [];
    let bonus = 100 + s.round * 2;
    for (const t of s.towers) {
      const st = stats(t);
      bonus += st.income;
      if (st.interest) bonus += Math.min(250, Math.floor(s.cash * st.interest));
      s.lives += st.lives;
    }
    s.cash += bonus;
    ev.push({ type: "roundEnd", round: s.round, bonus });
    if (s.round === WIN_ROUND && !s.won) {
      s.won = true;
      ev.push({ type: "win" });
    } else if (s.auto) startRound(s);
  }
  return ev;
}
