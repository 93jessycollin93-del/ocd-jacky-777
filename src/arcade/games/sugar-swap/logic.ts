// Sugar Swap rules: a classic swap-and-match puzzle on an 8×8 board. Pure and seeded so every rule can
// be tested. trySwap() plays a move and returns the animation steps (swap, clear, fall, shuffle) with a
// board snapshot after each one; the component just plays them back.
import { mulberry32, type Rng } from "../../kit/rng";
import type { LevelDef } from "./levels";

export const SIZE = 8;
export const CELLS = SIZE * SIZE;
export const MAX_COLORS = 6;

export type Kind = "normal" | "rowRocket" | "colRocket" | "bomb" | "prism" | "ingredient";

/** Pieces are never mutated: a change makes a new object (same id when it's the same sweet). */
export interface Piece {
  id: number;
  /** Sweet colour 0..5; for ingredients, which ingredient (0 hazelnut, 1 cherry); -1 for a prism. */
  color: number;
  kind: Kind;
}

export type Snapshot = (Piece | null)[];

export type Effect =
  | { type: "rocket"; cell: number; dir: "row" | "col" }
  | { type: "bomb"; cell: number; radius: number }
  | { type: "prism"; cell: number; targets: number[] }
  | { type: "nova"; cell: number };

export interface Popped {
  cell: number;
  piece: Piece;
}

export type Step =
  | { type: "swap"; a: number; b: number; ok: boolean }
  | { type: "transform"; cells: number[]; board: Snapshot }
  | {
      type: "clear";
      popped: Popped[];
      created: Popped[];
      effects: Effect[];
      points: number;
      floaters: { cell: number; points: number }[];
      chain: number;
      frostingHit: number[];
      collected: Popped[];
      board: Snapshot;
    }
  | { type: "fall"; board: Snapshot; spawned: { id: number; cell: number; fromRow: number }[] }
  | { type: "shuffle"; board: Snapshot };

export interface GameState {
  level: LevelDef;
  cells: Snapshot;
  holes: boolean[];
  frosting: number[];
  score: number;
  moves: number;
  colors: number;
  collected: number;
  spawnedIngredients: number;
  rng: Rng;
  nextId: number;
}

export const idx = (r: number, c: number) => r * SIZE + c;
export const rowOf = (i: number) => Math.floor(i / SIZE);
export const colOf = (i: number) => i % SIZE;
export const adjacent = (a: number, b: number) =>
  (rowOf(a) === rowOf(b) && Math.abs(colOf(a) - colOf(b)) === 1) || (colOf(a) === colOf(b) && Math.abs(rowOf(a) - rowOf(b)) === 1);

export const isMatchable = (p: Piece | null) => !!p && p.kind !== "prism" && p.kind !== "ingredient";
export const isSpecial = (p: Piece | null) => !!p && (p.kind === "rowRocket" || p.kind === "colRocket" || p.kind === "bomb" || p.kind === "prism");
const isLineOrBomb = (p: Piece | null) => !!p && (p.kind === "rowRocket" || p.kind === "colRocket" || p.kind === "bomb");
const isRocket = (p: Piece | null) => !!p && (p.kind === "rowRocket" || p.kind === "colRocket");

function newPiece(s: GameState, color: number, kind: Kind = "normal"): Piece {
  return { id: s.nextId++, color, kind };
}

// ------------------------------------------------------------------------------------------ set-up

/** Build a level: parse the layout, deal a board with no ready-made matches and at least one move. */
export function newLevel(level: LevelDef, seed = 1): GameState {
  const s: GameState = {
    level, cells: new Array(CELLS).fill(null), holes: new Array(CELLS).fill(false), frosting: new Array(CELLS).fill(0),
    score: 0, moves: level.moves, colors: level.colors, collected: 0, spawnedIngredients: 0, rng: mulberry32(seed), nextId: 1,
  };
  const ingredientCells: number[] = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const ch = level.layout[r]?.[c] ?? "o";
      const i = idx(r, c);
      if (ch === ".") s.holes[i] = true;
      else if (ch === "f") s.frosting[i] = 1;
      else if (ch === "F") s.frosting[i] = 2;
      else if (ch === "i") ingredientCells.push(i);
    }
  }
  for (let tries = 0; tries < 200; tries++) {
    dealColors(s);
    for (const i of ingredientCells) {
      s.cells[i] = newPiece(s, s.spawnedIngredients % 2, "ingredient");
      s.spawnedIngredients++;
    }
    if (findGroups(s).length === 0 && findMoves(s).length > 0) break;
    s.spawnedIngredients = 0;
  }
  return s;
}

function dealColors(s: GameState) {
  for (let i = 0; i < CELLS; i++) {
    if (s.holes[i]) {
      s.cells[i] = null;
      continue;
    }
    const r = rowOf(i);
    const c = colOf(i);
    let color = 0;
    for (let t = 0; t < 20; t++) {
      color = Math.floor(s.rng() * s.colors);
      const left = c >= 2 && colorAt(s, idx(r, c - 1)) === color && colorAt(s, idx(r, c - 2)) === color;
      const up = r >= 2 && colorAt(s, idx(r - 1, c)) === color && colorAt(s, idx(r - 2, c)) === color;
      if (!left && !up) break;
    }
    s.cells[i] = newPiece(s, color);
  }
}

const colorAt = (s: GameState, i: number) => {
  const p = s.cells[i];
  return isMatchable(p) ? p!.color : -1;
};

// ------------------------------------------------------------------------------------------ matching

export interface Run {
  cells: number[];
  dir: "h" | "v";
}

export interface Group {
  color: number;
  cells: number[];
  runs: Run[];
  longest: number;
  hasH: boolean;
  hasV: boolean;
}

export function findRuns(s: GameState): Run[] {
  const runs: Run[] = [];
  for (let pass = 0; pass < 2; pass++) {
    const h = pass === 0;
    for (let a = 0; a < SIZE; a++) {
      let b = 0;
      while (b < SIZE) {
        const color = colorAt(s, h ? idx(a, b) : idx(b, a));
        if (color < 0) {
          b++;
          continue;
        }
        let e = b + 1;
        while (e < SIZE && colorAt(s, h ? idx(a, e) : idx(e, a)) === color) e++;
        if (e - b >= 3) {
          const cells: number[] = [];
          for (let k = b; k < e; k++) cells.push(h ? idx(a, k) : idx(k, a));
          runs.push({ cells, dir: h ? "h" : "v" });
        }
        b = e;
      }
    }
  }
  return runs;
}

/** Runs that share a sweet join into one group, which is how L and T shapes are found. */
export function findGroups(s: GameState): Group[] {
  const runs = findRuns(s);
  const parent = runs.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const owner = new Map<number, number>();
  runs.forEach((run, ri) => {
    for (const c of run.cells) {
      const o = owner.get(c);
      if (o === undefined) owner.set(c, ri);
      else parent[find(ri)] = find(o);
    }
  });
  const byRoot = new Map<number, Group>();
  runs.forEach((run, ri) => {
    const root = find(ri);
    let g = byRoot.get(root);
    if (!g) {
      g = { color: colorAt(s, run.cells[0]), cells: [], runs: [], longest: 0, hasH: false, hasV: false };
      byRoot.set(root, g);
    }
    g.runs.push(run);
    g.longest = Math.max(g.longest, run.cells.length);
    if (run.dir === "h") g.hasH = true;
    else g.hasV = true;
    for (const c of run.cells) if (!g.cells.includes(c)) g.cells.push(c);
  });
  return [...byRoot.values()];
}

/** What a group of matched sweets turns into: five in a line beats an L/T, which beats four in a line. */
export function specialFor(g: Group): Kind | null {
  if (g.longest >= 5) return "prism";
  if (g.hasH && g.hasV) return "bomb";
  if (g.longest === 4) return g.runs.find((r) => r.cells.length === 4)!.dir === "h" ? "rowRocket" : "colRocket";
  return null;
}

function placementFor(g: Group, kind: Kind, swapped: number[]): number {
  for (let i = swapped.length - 1; i >= 0; i--) if (g.cells.includes(swapped[i])) return swapped[i];
  if (kind === "bomb") {
    const h = new Set<number>();
    for (const r of g.runs) if (r.dir === "h") for (const c of r.cells) h.add(c);
    for (const r of g.runs) if (r.dir === "v") for (const c of r.cells) if (h.has(c)) return c;
  }
  const long = g.runs.reduce((a, b) => (b.cells.length > a.cells.length ? b : a));
  return long.cells[Math.floor((long.cells.length - 1) / 2)];
}

// ------------------------------------------------------------------------------------------ moves

export function isValidSwap(s: GameState, a: number, b: number): boolean {
  if (a < 0 || b < 0 || a >= CELLS || b >= CELLS || !adjacent(a, b) || s.holes[a] || s.holes[b]) return false;
  const pa = s.cells[a];
  const pb = s.cells[b];
  if (!pa || !pb) return false;
  if (pa.kind === "prism" && pb.kind !== "ingredient") return true;
  if (pb.kind === "prism" && pa.kind !== "ingredient") return true;
  if (isLineOrBomb(pa) && isLineOrBomb(pb)) return true;
  s.cells[a] = pb;
  s.cells[b] = pa;
  const ok = makesMatchAt(s, a) || makesMatchAt(s, b);
  s.cells[a] = pa;
  s.cells[b] = pb;
  return ok;
}

function makesMatchAt(s: GameState, i: number): boolean {
  const color = colorAt(s, i);
  if (color < 0) return false;
  const r = rowOf(i);
  const c = colOf(i);
  let n = 1;
  for (let k = c - 1; k >= 0 && colorAt(s, idx(r, k)) === color; k--) n++;
  for (let k = c + 1; k < SIZE && colorAt(s, idx(r, k)) === color; k++) n++;
  if (n >= 3) return true;
  n = 1;
  for (let k = r - 1; k >= 0 && colorAt(s, idx(k, c)) === color; k--) n++;
  for (let k = r + 1; k < SIZE && colorAt(s, idx(k, c)) === color; k++) n++;
  return n >= 3;
}

/** Every legal swap on the board, as [cell, right-or-down neighbour] pairs. */
export function findMoves(s: GameState): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < CELLS; i++) {
    const r = rowOf(i);
    const c = colOf(i);
    if (c + 1 < SIZE && isValidSwap(s, i, i + 1)) out.push([i, i + 1]);
    if (r + 1 < SIZE && isValidSwap(s, i, i + SIZE)) out.push([i, i + SIZE]);
  }
  return out;
}

export const hasMoves = (s: GameState) => findMoves(s).length > 0;

/** The move a hint should show: the one that clears the most (specials count extra). */
export function hintMove(s: GameState): [number, number] | null {
  const moves = findMoves(s);
  let best: [number, number] | null = null;
  let bestValue = -1;
  for (const [a, b] of moves) {
    const pa = s.cells[a];
    const pb = s.cells[b];
    let value = isSpecial(pa) && isSpecial(pb) ? 20 : pa?.kind === "prism" || pb?.kind === "prism" ? 15 : 0;
    s.cells[a] = pb;
    s.cells[b] = pa;
    for (const g of findGroups(s)) {
      if (!g.cells.includes(a) && !g.cells.includes(b)) continue;
      value += g.cells.length + (specialFor(g) ? 4 : 0);
    }
    s.cells[a] = pa;
    s.cells[b] = pb;
    if (value > bestValue) {
      bestValue = value;
      best = [a, b];
    }
  }
  return best;
}

// ------------------------------------------------------------------------------------------ clearing

const POINTS_PER_SWEET = 20;
const POINTS_BLAST = 40;
const POINTS_FROSTING = 100;
const POINTS_INGREDIENT = 1000;
const SPECIAL_BONUS: Record<string, number> = { rowRocket: 40, colRocket: 40, bomb: 100, prism: 100 };

function rowCells(r: number) {
  const out: number[] = [];
  for (let c = 0; c < SIZE; c++) out.push(idx(r, c));
  return out;
}
function colCells(c: number) {
  const out: number[] = [];
  for (let r = 0; r < SIZE; r++) out.push(idx(r, c));
  return out;
}
function areaCells(center: number, radius: number) {
  const out: number[] = [];
  const r0 = rowOf(center);
  const c0 = colOf(center);
  for (let r = r0 - radius; r <= r0 + radius; r++) {
    for (let c = c0 - radius; c <= c0 + radius; c++) if (r >= 0 && c >= 0 && r < SIZE && c < SIZE) out.push(idx(r, c));
  }
  return out;
}

/** The colour a prism caught in a blast goes for: the commonest one on the board. */
function commonestColor(s: GameState): number {
  const counts = new Array(MAX_COLORS).fill(0);
  for (const p of s.cells) if (isMatchable(p)) counts[p!.color]++;
  let best = 0;
  for (let c = 1; c < MAX_COLORS; c++) if (counts[c] > counts[best]) best = c;
  return best;
}

interface ClearPlan {
  cells: Set<number>;
  /** Specials that already went off (a combo's own pieces), so they don't fire twice. */
  spent: Set<number>;
  effects: Effect[];
  created: Popped[];
  groupPoints: { cell: number; points: number; cells: number[] }[];
  collected: number[];
}

const emptyPlan = (): ClearPlan => ({ cells: new Set(), spent: new Set(), effects: [], created: [], groupPoints: [], collected: [] });

/** Fire every special caught in the plan, chaining into any others they hit. */
function expand(s: GameState, plan: ClearPlan) {
  const queue = [...plan.cells];
  const add = (cells: number[]) => {
    for (const c of cells) {
      if (s.holes[c] || plan.cells.has(c)) continue;
      plan.cells.add(c);
      queue.push(c);
    }
  };
  while (queue.length) {
    const cell = queue.shift()!;
    const p = s.cells[cell];
    if (!p || !isSpecial(p) || plan.spent.has(cell)) continue;
    plan.spent.add(cell);
    if (p.kind === "rowRocket") {
      plan.effects.push({ type: "rocket", cell, dir: "row" });
      add(rowCells(rowOf(cell)));
    } else if (p.kind === "colRocket") {
      plan.effects.push({ type: "rocket", cell, dir: "col" });
      add(colCells(colOf(cell)));
    } else if (p.kind === "bomb") {
      plan.effects.push({ type: "bomb", cell, radius: 1 });
      add(areaCells(cell, 1));
    } else if (p.kind === "prism") {
      const color = commonestColor(s);
      const targets: number[] = [];
      for (let i = 0; i < CELLS; i++) if (colorAt(s, i) === color) targets.push(i);
      plan.effects.push({ type: "prism", cell, targets });
      add(targets);
    }
  }
}

/** Remove everything in the plan, score it, chip frosting, then drop in any specials it made. */
function applyPlan(s: GameState, plan: ClearPlan, chain: number): Step {
  expand(s, plan);
  const popped: Popped[] = [];
  const frostingHit: number[] = [];
  const floaters: { cell: number; points: number }[] = [];
  const inGroups = new Set<number>();
  let points = 0;
  for (const g of plan.groupPoints) {
    const pts = g.points * chain;
    points += pts;
    floaters.push({ cell: g.cell, points: pts });
    for (const c of g.cells) inGroups.add(c);
  }
  let blastPoints = 0;
  for (const cell of plan.cells) {
    const p = s.cells[cell];
    if (!p || p.kind === "ingredient") continue;
    popped.push({ cell, piece: p });
    s.cells[cell] = null;
    if (!inGroups.has(cell)) blastPoints += POINTS_BLAST * chain;
    if (s.frosting[cell] > 0) {
      s.frosting[cell]--;
      frostingHit.push(cell);
      blastPoints += POINTS_FROSTING;
    }
  }
  const collected: Popped[] = [];
  for (const cell of plan.collected) {
    const p = s.cells[cell];
    if (!p) continue;
    collected.push({ cell, piece: p });
    s.cells[cell] = null;
    s.collected++;
    points += POINTS_INGREDIENT;
    floaters.push({ cell, points: POINTS_INGREDIENT });
  }
  if (blastPoints > 0) {
    points += blastPoints;
    const at = plan.effects[0]?.cell ?? popped[0]?.cell;
    if (at !== undefined && !plan.groupPoints.length) floaters.push({ cell: at, points: blastPoints });
    else if (floaters.length) floaters[0].points += blastPoints;
  }
  for (const c of plan.created) s.cells[c.cell] = c.piece;
  s.score += points;
  return {
    type: "clear", popped, created: plan.created, effects: plan.effects, points, floaters, chain, frostingHit, collected,
    board: s.cells.slice(),
  };
}

/** Plan for the matches on the board (and ingredients sitting on an exit). */
function planMatches(s: GameState, swapped: number[]): ClearPlan | null {
  const groups = findGroups(s);
  const exits = ingredientsAtExit(s);
  if (!groups.length && !exits.length) return null;
  const plan = emptyPlan();
  plan.collected = exits;
  for (const g of groups) {
    for (const c of g.cells) plan.cells.add(c);
    const kind = specialFor(g);
    let at = g.cells[0];
    let points = g.cells.length * POINTS_PER_SWEET;
    if (kind) {
      at = placementFor(g, kind, swapped);
      plan.created.push({ cell: at, piece: newPiece(s, g.color, kind) });
      points += SPECIAL_BONUS[kind];
    } else {
      at = g.runs[0].cells[1];
    }
    plan.groupPoints.push({ cell: at, points, cells: g.cells });
  }
  return plan;
}

/** Ingredients resting on the lowest cell of their column leave the board. */
export function ingredientsAtExit(s: GameState): number[] {
  const out: number[] = [];
  for (let c = 0; c < SIZE; c++) {
    for (let r = SIZE - 1; r >= 0; r--) {
      const i = idx(r, c);
      if (s.holes[i]) continue;
      if (s.cells[i]?.kind === "ingredient") out.push(i);
      break;
    }
  }
  return out;
}

// ------------------------------------------------------------------------------------------ gravity

const countIngredients = (s: GameState) => s.cells.reduce((n, p) => n + (p?.kind === "ingredient" ? 1 : 0), 0);

export function gravity(s: GameState): Step {
  const spawned: { id: number; cell: number; fromRow: number }[] = [];
  const goal = s.level.goal;
  let ingredientSlot = -1;
  if (goal.type === "ingredients" && s.spawnedIngredients < goal.count && countIngredients(s) < (s.level.maxIngredients ?? 2)) {
    // Drop the next ingredient soon after the last one leaves, never two at once.
    if (countIngredients(s) === 0 || s.rng() < 0.25) ingredientSlot = Math.floor(s.rng() * SIZE);
  }
  for (let c = 0; c < SIZE; c++) {
    const valid: number[] = [];
    for (let r = 0; r < SIZE; r++) if (!s.holes[idx(r, c)]) valid.push(r);
    if (!valid.length) continue;
    const stack: Piece[] = [];
    for (let k = valid.length - 1; k >= 0; k--) {
      const p = s.cells[idx(valid[k], c)];
      if (p) stack.push(p);
    }
    for (let k = 0; k < valid.length; k++) s.cells[idx(valid[valid.length - 1 - k], c)] = stack[k] ?? null;
    const empty = valid.length - stack.length;
    for (let j = 0; j < empty; j++) {
      const row = valid[empty - 1 - j];
      let piece: Piece;
      if (ingredientSlot >= 0 && (c === ingredientSlot || (c > ingredientSlot && ingredientSlot >= 0)) && j === empty - 1) {
        piece = newPiece(s, s.spawnedIngredients % 2, "ingredient");
        s.spawnedIngredients++;
        ingredientSlot = -1;
      } else {
        piece = newPiece(s, Math.floor(s.rng() * s.colors));
      }
      s.cells[idx(row, c)] = piece;
      spawned.push({ id: piece.id, cell: idx(row, c), fromRow: valid[0] - 1 - j });
    }
  }
  return { type: "fall", board: s.cells.slice(), spawned };
}

// ------------------------------------------------------------------------------------------ shuffle

/** Reshuffle until the board has no ready-made matches and at least one move. */
export function shuffleBoard(s: GameState) {
  const slots: number[] = [];
  const pieces: Piece[] = [];
  for (let i = 0; i < CELLS; i++) {
    const p = s.cells[i];
    if (p && p.kind !== "ingredient") {
      slots.push(i);
      pieces.push(p);
    }
  }
  for (let tries = 0; tries < 300; tries++) {
    for (let i = pieces.length - 1; i > 0; i--) {
      const j = Math.floor(s.rng() * (i + 1));
      [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
    }
    slots.forEach((cell, k) => (s.cells[cell] = pieces[k]));
    // After many failed tries, recolour some plain sweets so a move must exist.
    if (tries > 150) {
      for (const cell of slots) {
        const p = s.cells[cell]!;
        if (p.kind === "normal") s.cells[cell] = { ...p, color: Math.floor(s.rng() * s.colors) };
      }
    }
    if (findGroups(s).length === 0 && hasMoves(s)) return;
  }
}

// ------------------------------------------------------------------------------------------ playing

/** Matches, then falls, then more matches, until the board settles. Reshuffles if no move is left. */
function cascade(s: GameState, steps: Step[], swapped: number[], startChain: number) {
  let chain = startChain;
  for (let guard = 0; guard < 60; guard++) {
    const plan = planMatches(s, chain === startChain ? swapped : []);
    if (!plan) break;
    steps.push(applyPlan(s, plan, chain));
    steps.push(gravity(s));
    chain++;
  }
  if (!hasMoves(s)) {
    shuffleBoard(s);
    steps.push({ type: "shuffle", board: s.cells.slice() });
  }
}

/**
 * Two specials (or a prism and anything) swapped together go off as a combo, centred on `at`, the cell
 * the player's piece moved into. `from` is the other cell of the swap.
 */
function comboPlan(s: GameState, at: number, from: number, steps: Step[]): ClearPlan | null {
  const pa = s.cells[at]!;
  const pb = s.cells[from]!;
  const plan = emptyPlan();
  plan.cells.add(at);
  plan.cells.add(from);
  plan.spent.add(at);
  plan.spent.add(from);
  if (pa.kind === "prism" && pb.kind === "prism") {
    plan.effects.push({ type: "nova", cell: at });
    for (let i = 0; i < CELLS; i++) if (!s.holes[i]) plan.cells.add(i);
    return plan;
  }
  if (pa.kind === "prism" || pb.kind === "prism") {
    const prismCell = pa.kind === "prism" ? at : from;
    const otherCell = prismCell === at ? from : at;
    const other = s.cells[otherCell]!;
    const targets: number[] = [];
    for (let i = 0; i < CELLS; i++) if (i !== at && i !== from && colorAt(s, i) === other.color) targets.push(i);
    plan.effects.push({ type: "prism", cell: prismCell, targets });
    if (other.kind === "normal") {
      for (const t of targets) plan.cells.add(t);
      return plan;
    }
    // Every sweet of that colour becomes the same kind of special, then they all go off.
    const changed: number[] = [];
    for (const t of targets) {
      const p = s.cells[t]!;
      if (p.kind !== "normal") continue;
      const kind: Kind = other.kind === "bomb" ? "bomb" : s.rng() < 0.5 ? "rowRocket" : "colRocket";
      s.cells[t] = { ...p, kind };
      changed.push(t);
    }
    steps.push({ type: "transform", cells: changed, board: s.cells.slice() });
    for (const t of targets) plan.cells.add(t);
    plan.spent.delete(otherCell);
    return plan;
  }
  if (isRocket(pa) && isRocket(pb)) {
    plan.effects.push({ type: "rocket", cell: at, dir: "row" }, { type: "rocket", cell: at, dir: "col" });
    for (const c of rowCells(rowOf(at))) plan.cells.add(c);
    for (const c of colCells(colOf(at))) plan.cells.add(c);
    return plan;
  }
  if ((isRocket(pa) && pb.kind === "bomb") || (pa.kind === "bomb" && isRocket(pb))) {
    for (let d = -1; d <= 1; d++) {
      const r = rowOf(at) + d;
      const c = colOf(at) + d;
      if (r >= 0 && r < SIZE) {
        plan.effects.push({ type: "rocket", cell: idx(r, colOf(at)), dir: "row" });
        for (const x of rowCells(r)) plan.cells.add(x);
      }
      if (c >= 0 && c < SIZE) {
        plan.effects.push({ type: "rocket", cell: idx(rowOf(at), c), dir: "col" });
        for (const x of colCells(c)) plan.cells.add(x);
      }
    }
    return plan;
  }
  if (pa.kind === "bomb" && pb.kind === "bomb") {
    plan.effects.push({ type: "bomb", cell: at, radius: 2 });
    for (const c of areaCells(at, 2)) plan.cells.add(c);
    return plan;
  }
  return null;
}

/**
 * Play a swap of cells a and b. Returns the steps to animate: a swap that makes nothing comes straight
 * back ([swap ok:false]) and costs no move. Returns [] if the swap isn't even possible.
 */
export function trySwap(s: GameState, a: number, b: number): Step[] {
  if (s.moves <= 0 || !adjacent(a, b) || s.holes[a] || s.holes[b] || !s.cells[a] || !s.cells[b]) return [];
  if (!isValidSwap(s, a, b)) return [{ type: "swap", a, b, ok: false }];
  const steps: Step[] = [{ type: "swap", a, b, ok: true }];
  const pa = s.cells[a];
  s.cells[a] = s.cells[b];
  s.cells[b] = pa;
  s.moves--;
  // After the swap the piece the player moved sits at b.
  const combo = comboPlan(s, b, a, steps);
  if (combo) {
    steps.push(applyPlan(s, combo, 1));
    steps.push(gravity(s));
    cascade(s, steps, [], 2);
  } else {
    cascade(s, steps, [a, b], 1);
  }
  return steps;
}

// ------------------------------------------------------------------------------------------ goals

export const frostingLeft = (s: GameState) => s.frosting.reduce((n, f) => n + f, 0);

export function goalMet(s: GameState): boolean {
  const g = s.level.goal;
  if (g.type === "score") return s.score >= g.target;
  if (g.type === "frosting") return frostingLeft(s) === 0;
  return s.collected >= g.count;
}

/** 0 if the goal isn't met; otherwise 1–3 by score. */
export function starsFor(s: GameState): number {
  if (!goalMet(s)) return 0;
  const [, two, three] = s.level.stars;
  return s.score >= three ? 3 : s.score >= two ? 2 : 1;
}

/** Goal met or out of moves. */
export const levelOver = (s: GameState) => goalMet(s) || s.moves <= 0;

/**
 * The victory lap: specials left on the board go off, then each move you didn't need becomes a rocket
 * (a few at a time) for bonus points. Call until it returns no steps.
 */
export function finaleWave(s: GameState): Step[] {
  const steps: Step[] = [];
  const specials: number[] = [];
  for (let i = 0; i < CELLS; i++) if (isSpecial(s.cells[i])) specials.push(i);
  const plan = emptyPlan();
  if (specials.length) {
    for (const c of specials) plan.cells.add(c);
  } else if (s.moves > 0) {
    const plain: number[] = [];
    for (let i = 0; i < CELLS; i++) if (s.cells[i]?.kind === "normal") plain.push(i);
    const k = Math.min(s.moves, 4, plain.length);
    if (!k) return steps;
    s.moves -= k;
    const chosen: number[] = [];
    for (let n = 0; n < k; n++) {
      const j = Math.floor(s.rng() * plain.length);
      chosen.push(plain[j]);
      plain.splice(j, 1);
    }
    for (const c of chosen) {
      const p = s.cells[c]!;
      s.cells[c] = { ...p, kind: s.rng() < 0.5 ? "rowRocket" : "colRocket" };
      plan.cells.add(c);
    }
    steps.push({ type: "transform", cells: chosen, board: s.cells.slice() });
  } else {
    return steps;
  }
  steps.push(applyPlan(s, plan, 1));
  steps.push(gravity(s));
  cascade(s, steps, [], 2);
  return steps;
}

/** A copy that can be played forward without touching the original (for bots and previews). */
export function cloneState(s: GameState, seed: number): GameState {
  return { ...s, cells: s.cells.slice(), holes: s.holes.slice(), frosting: s.frosting.slice(), rng: mulberry32(seed) };
}
