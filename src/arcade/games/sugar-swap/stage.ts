// Sugar Swap's animation stage. The rules (logic.ts) return a list of steps with a board snapshot after
// each one; the Stage plays them back one at a time: sweets slide, pop, fall and bounce, specials fire
// beams, rings and lightning, and sparkles fly. It owns every moving thing; index.tsx only feeds it steps.
import {
  Floaters, Particles, Shake, clamp, easeInOutQuad, easeOutBack, easeOutCubic, easeOutElastic, lerp, text, DISPLAY_FONT, roundRect,
} from "../../kit/draw";
import { noise, play, tone } from "../../kit/sfx";
import { Atlas, pieceColor, pieceLight } from "./art";
import { CELLS, SIZE, colOf, idx, rowOf, type Effect, type GameState, type Piece, type Step } from "./logic";

export interface Layout {
  w: number;
  h: number;
  bx: number;
  by: number;
  cell: number;
  landscape: boolean;
}

export function makeLayout(landscape: boolean): Layout {
  if (landscape) return { w: 660, h: 340, bx: 326, by: 10, cell: 40, landscape };
  return { w: 440, h: 558, bx: 12, by: 116, cell: 52, landscape };
}

interface Sprite {
  id: number;
  piece: Piece;
  /** Position in cell units (x = column, y = row), may be fractional while moving. */
  x: number;
  y: number;
  scale: number;
  sx: number;
  sy: number;
  alpha: number;
  rot: number;
}

interface Anim {
  delay: number;
  t: number;
  dur: number;
  started: boolean;
  start?: () => void;
  apply: (k: number) => void;
  end?: () => void;
}

type Fx =
  | { type: "rocket"; cell: number; dir: "row" | "col"; t: number; dur: number }
  | { type: "bomb"; cell: number; radius: number; t: number; dur: number }
  | { type: "prism"; cell: number; t: number; dur: number; bolts: { x: number; y: number }[][] }
  | { type: "nova"; cell: number; t: number; dur: number }
  | { type: "ring"; x: number; y: number; t: number; dur: number; color: string; size: number };

interface Banner {
  text: string;
  color: string;
  t: number;
  dur: number;
  size: number;
}

const GRAVITY = 62; // cells per second squared
const CHAIN_WORDS = ["Sweet!", "Tasty!", "Delicious!", "Divine!"];

export class Stage {
  layout: Layout = makeLayout(false);
  atlas = new Atlas();
  particles = new Particles(520);
  shake = new Shake();
  floaters = new Floaters();
  grid: (Sprite | null)[] = new Array(CELLS).fill(null);
  private byId = new Map<number, Sprite>();
  private dying: Sprite[] = [];
  private anims: Anim[] = [];
  private fx: Fx[] = [];
  private banner: Banner | null = null;
  private queue: Step[] = [];
  private hold = 0;
  private idleFlag = false;
  onIdle: (() => void) | null = null;

  holes: boolean[] = new Array(CELLS).fill(false);
  /** What the board shows, which trails the real state while a move is still playing back. */
  frosting: number[] = new Array(CELLS).fill(0);
  score = 0;
  shownScore = 0;
  collected = 0;
  exits: number[] = [];
  showExits = false;
  time = 0;
  flash = 0;

  // Interaction highlights, set by the component.
  sel = -1;
  kb = -1;
  hint: [number, number] | null = null;

  get busy() {
    return this.queue.length > 0 || this.anims.length > 0 || this.hold > 0;
  }

  // ------------------------------------------------------------------ set-up

  load(state: GameState) {
    this.queue = [];
    this.anims = [];
    this.fx = [];
    this.dying = [];
    this.banner = null;
    this.hold = 0;
    this.idleFlag = false;
    this.byId.clear();
    this.grid.fill(null);
    this.particles.clear();
    this.floaters.items = [];
    this.holes = state.holes.slice();
    this.frosting = state.frosting.slice();
    this.score = 0;
    this.shownScore = 0;
    this.collected = 0;
    this.sel = -1;
    this.kb = -1;
    this.hint = null;
    this.showExits = state.level.goal.type === "ingredients";
    this.exits = [];
    for (let c = 0; c < SIZE; c++) {
      for (let r = SIZE - 1; r >= 0; r--) {
        if (!state.holes[idx(r, c)]) {
          this.exits.push(idx(r, c));
          break;
        }
      }
    }
    for (let i = 0; i < CELLS; i++) {
      const p = state.cells[i];
      if (!p) continue;
      const sp = this.newSprite(p, colOf(i), rowOf(i));
      sp.scale = 0;
      this.grid[i] = sp;
    }
  }

  /** The opening: the whole board tumbles in from above, bottom rows first. */
  dropIn() {
    play("swoosh");
    for (let i = 0; i < CELLS; i++) {
      const sp = this.grid[i];
      if (!sp) continue;
      const row = rowOf(i);
      sp.scale = 1;
      const y1 = sp.y;
      sp.y = y1 - 10;
      this.fall(sp, y1, (SIZE - 1 - row) * 0.04 + colOf(i) * 0.018);
    }
    this.hold = 0.05;
  }

  private newSprite(piece: Piece, x: number, y: number): Sprite {
    const sp: Sprite = { id: piece.id, piece, x, y, scale: 1, sx: 1, sy: 1, alpha: 1, rot: 0 };
    this.byId.set(piece.id, sp);
    return sp;
  }

  push(steps: Step[]) {
    if (!steps.length) return;
    for (const s of steps) this.queue.push(s);
    this.idleFlag = true;
  }

  // ------------------------------------------------------------------ geometry

  cx(col: number) {
    return this.layout.bx + (col + 0.5) * this.layout.cell;
  }
  cy(row: number) {
    return this.layout.by + (row + 0.5) * this.layout.cell;
  }
  /** The cell under a logical point, or -1. */
  cellAt(x: number, y: number): number {
    const { bx, by, cell } = this.layout;
    const c = Math.floor((x - bx) / cell);
    const r = Math.floor((y - by) / cell);
    if (c < 0 || r < 0 || c >= SIZE || r >= SIZE) return -1;
    const i = idx(r, c);
    return this.holes[i] ? -1 : i;
  }

  // ------------------------------------------------------------------ animation helpers

  private add(a: { dur: number; delay?: number; start?: () => void; apply: (k: number) => void; end?: () => void }) {
    this.anims.push({ ...a, delay: a.delay ?? 0, t: 0, started: false });
  }

  private moveTo(sp: Sprite, x1: number, y1: number, dur: number, delay = 0, ease: (t: number) => number = easeInOutQuad, then?: () => void) {
    let x0 = 0;
    let y0 = 0;
    this.add({
      delay, dur,
      start: () => {
        x0 = sp.x;
        y0 = sp.y;
      },
      apply: (k) => {
        const e = ease(k);
        sp.x = lerp(x0, x1, e);
        sp.y = lerp(y0, y1, e);
      },
      end: then,
    });
  }

  /** Drop a sprite to row y1 as if under gravity, then squash on landing. */
  private fall(sp: Sprite, y1: number, delay = 0) {
    const dist = y1 - sp.y;
    if (dist <= 0.001) return;
    const dur = Math.sqrt((2 * dist) / GRAVITY);
    let y0 = 0;
    this.add({
      delay, dur,
      start: () => (y0 = sp.y),
      apply: (k) => (sp.y = lerp(y0, y1, k * k)),
      end: () => {
        sp.y = y1;
        this.squash(sp, Math.min(0.2, 0.08 + dist * 0.025));
      },
    });
  }

  private squash(sp: Sprite, amp: number, dur = 0.24) {
    this.add({
      dur,
      apply: (k) => {
        const w = Math.sin(k * Math.PI) * (1 - k);
        sp.sy = 1 - amp * w * 1.6;
        sp.sx = 1 + amp * w;
        if (k >= 1) {
          sp.sx = 1;
          sp.sy = 1;
        }
      },
      end: () => {
        sp.sx = 1;
        sp.sy = 1;
      },
    });
  }

  private pop(sp: Sprite, delay = 0, to?: { x: number; y: number }) {
    const spin = (sp.id % 2 ? 1 : -1) * 0.5;
    let x0 = 0;
    let y0 = 0;
    this.dying.push(sp);
    this.add({
      delay, dur: to ? 0.22 : 0.26,
      start: () => {
        x0 = sp.x;
        y0 = sp.y;
      },
      apply: (k) => {
        if (to) {
          const e = k * k;
          sp.x = lerp(x0, to.x, e);
          sp.y = lerp(y0, to.y, e);
          sp.scale = lerp(1, 0.5, e);
          sp.alpha = 1 - 0.5 * e;
        } else {
          sp.scale = k < 0.28 ? lerp(1, 1.28, easeOutCubic(k / 0.28)) : lerp(1.28, 0, easeInOutQuad((k - 0.28) / 0.72));
          sp.alpha = k < 0.55 ? 1 : 1 - (k - 0.55) / 0.45;
          sp.rot = spin * k;
        }
      },
      end: () => {
        this.dying = this.dying.filter((d) => d !== sp);
      },
    });
  }

  private appear(sp: Sprite, delay: number, dur = 0.38, bounce = true) {
    sp.scale = 0;
    this.add({
      delay, dur,
      apply: (k) => (sp.scale = bounce ? clamp(easeOutElastic(k), 0, 1.4) : easeOutBack(k)),
      end: () => (sp.scale = 1),
    });
  }

  private ring(x: number, y: number, color: string, size = 1, dur = 0.45) {
    this.fx.push({ type: "ring", x, y, t: 0, dur, color, size });
  }

  private sparkle(x: number, y: number, n: number, colors: string[], speed = 190) {
    const cell = this.layout.cell;
    this.particles.burst(x, y, n, { color: colors, speed, size: cell * 0.12, life: 0.6, gravity: 420, drag: 2 });
    this.particles.burst(x, y, Math.ceil(n / 2), { color: ["#ffffff", "#fff3b0"], speed: speed * 1.2, size: 3, life: 0.45, gravity: 0, drag: 3, shape: "spark" });
  }

  // ------------------------------------------------------------------ step playback

  private begin(step: Step) {
    switch (step.type) {
      case "swap": return this.beginSwap(step);
      case "transform": return this.beginTransform(step);
      case "clear": return this.beginClear(step);
      case "fall": return this.beginFall(step);
      case "shuffle": return this.beginShuffle(step);
    }
  }

  private beginSwap(step: Extract<Step, { type: "swap" }>) {
    const { a, b, ok } = step;
    const A = this.grid[a];
    const B = this.grid[b];
    if (!A || !B) return;
    const ax = colOf(a), ay = rowOf(a), bx = colOf(b), by = rowOf(b);
    if (ok) {
      this.grid[a] = B;
      this.grid[b] = A;
      this.moveTo(A, bx, by, 0.17);
      this.moveTo(B, ax, ay, 0.17);
      play("slide");
    } else {
      // Slide over, find nothing, and slide back.
      this.moveTo(A, bx, by, 0.13, 0, easeInOutQuad);
      this.moveTo(B, ax, ay, 0.13, 0, easeInOutQuad);
      this.moveTo(A, ax, ay, 0.15, 0.15);
      this.moveTo(B, bx, by, 0.15, 0.15);
      this.squash(A, 0.12);
      this.add({ delay: 0.13, dur: 0.01, apply: () => undefined, start: () => play("error") });
    }
  }

  private beginTransform(step: Extract<Step, { type: "transform" }>) {
    play("powerup");
    for (const cell of step.cells) {
      const sp = this.grid[cell];
      const piece = step.board[cell];
      if (!sp || !piece) continue;
      sp.piece = piece;
      this.byId.set(piece.id, sp);
      this.add({
        dur: 0.4,
        apply: (k) => (sp.scale = 1 + Math.sin(k * Math.PI) * 0.35),
        end: () => (sp.scale = 1),
      });
      this.sparkle(this.cx(colOf(cell)), this.cy(rowOf(cell)), 8, ["#fff", pieceLight(piece), pieceColor(piece)], 150);
      this.ring(this.cx(colOf(cell)), this.cy(rowOf(cell)), "#fff", 0.7, 0.4);
    }
    this.hold = 0.12;
  }

  private beginClear(step: Extract<Step, { type: "clear" }>) {
    const { cell: cs } = this.layout;
    this.score += step.points;
    const chain = step.chain;
    const pitch = 1 + 0.09 * Math.min(8, chain - 1);

    const mergeTo = new Map<number, number>();
    for (const m of step.merges) for (const f of m.from) mergeTo.set(f, m.to);

    for (const { cell, piece } of step.popped) {
      const sp = this.byId.get(piece.id);
      if (!sp) continue;
      this.byId.delete(piece.id);
      if (this.grid[cell] === sp) this.grid[cell] = null;
      const x = this.cx(colOf(cell));
      const y = this.cy(rowOf(cell));
      const target = mergeTo.get(cell);
      if (target !== undefined) {
        this.pop(sp, 0, { x: colOf(target), y: rowOf(target) });
      } else {
        this.pop(sp);
        this.sparkle(x, y, 7, [pieceColor(piece), pieceLight(piece), "#ffffff"], 150 + chain * 15);
        this.ring(x, y, pieceLight(piece), 0.8, 0.35);
      }
    }

    // Specials made by a match appear where it was swapped.
    for (const { cell, piece } of step.created) {
      const sp = this.newSprite(piece, colOf(cell), rowOf(cell));
      this.grid[cell] = sp;
      this.appear(sp, 0.17, 0.42);
      const x = this.cx(colOf(cell));
      const y = this.cy(rowOf(cell));
      this.add({
        delay: 0.17, dur: 0.01, apply: () => undefined,
        start: () => {
          this.sparkle(x, y, 14, ["#fff", pieceLight(piece), "#fde68a"], 210);
          this.ring(x, y, "#ffffff", 1.2, 0.5);
          play("combo", 1.3);
        },
      });
    }

    // Special effects.
    let loud = 0;
    for (const e of step.effects) loud = Math.max(loud, this.addEffect(e));
    if (loud > 0) this.shake.add(loud);

    // Frosting cracking.
    for (const cell of step.frostingHit) {
      const x = this.cx(colOf(cell));
      const y = this.cy(rowOf(cell));
      this.frosting[cell] = Math.max(0, this.frosting[cell] - 1);
      this.particles.burst(x, y, 9, { color: ["#ffffff", "#fbcfe8", "#f9a8d4", "#fef3c7"], speed: 170, size: cs * 0.1, life: 0.7, gravity: 380, shape: "square" });
      if (this.frosting[cell] === 0) this.ring(x, y, "#fbcfe8", 1, 0.5);
    }
    if (step.frostingHit.length) {
      noise(0.1, 0.18, { type: "highpass", freq: 3200 });
      tone(660, 0.07, "triangle", 0.08, { slide: 330 });
    }

    // Ingredients reaching the bottom.
    for (const { cell, piece } of step.collected) {
      const sp = this.byId.get(piece.id);
      if (!sp) continue;
      this.byId.delete(piece.id);
      this.grid[cell] = null;
      this.collected++;
      this.dying.push(sp);
      const y0 = sp.y;
      this.add({
        dur: 0.55,
        apply: (k) => {
          sp.y = y0 + easeOutCubic(k) * 0.9;
          sp.scale = 1 - 0.7 * k;
          sp.alpha = 1 - k * k;
          sp.rot = k * 1.2;
        },
        end: () => (this.dying = this.dying.filter((d) => d !== sp)),
      });
      const x = this.cx(colOf(cell));
      const y = this.cy(rowOf(cell));
      this.sparkle(x, y + cs * 0.3, 16, ["#fde047", "#fff", "#fb923c"], 230);
      this.ring(x, y, "#fde047", 1.3, 0.6);
      play("coin");
      play("levelup");
    }

    for (const f of step.floaters) {
      const big = f.points >= 400;
      this.floaters.add(this.cx(colOf(f.cell)), this.cy(rowOf(f.cell)) - cs * 0.15, `+${f.points}`, big ? "#fde047" : "#ffffff", clamp(15 + Math.log2(f.points / 20 + 1) * 3, 15, 30));
    }

    if (chain >= 2 && step.popped.length) {
      const word = CHAIN_WORDS[Math.min(chain - 2, CHAIN_WORDS.length - 1)];
      this.showBanner(chain >= 3 ? `${word}  x${chain}` : word, chain >= 4 ? "#fde047" : "#f9a8d4", 30 + chain * 2);
    }
    if (step.effects.length === 0) play("match", pitch);
    this.hold = 0.12;
  }

  /** Spawn the visuals for one special effect. Returns how hard to shake the screen. */
  private addEffect(e: Effect): number {
    const { cell: cs } = this.layout;
    const x = this.cx(colOf(e.cell));
    const y = this.cy(rowOf(e.cell));
    switch (e.type) {
      case "rocket":
        this.fx.push({ type: "rocket", cell: e.cell, dir: e.dir, t: 0, dur: 0.5 });
        this.particles.burst(x, y, 12, { color: ["#fff", "#fde68a", "#f9a8d4"], speed: 360, size: cs * 0.1, life: 0.5, gravity: 0, drag: 2.5, angle: e.dir === "row" ? 0 : Math.PI / 2, spread: 0.3, shape: "spark" });
        this.particles.burst(x, y, 12, { color: ["#fff", "#fde68a", "#f9a8d4"], speed: 360, size: cs * 0.1, life: 0.5, gravity: 0, drag: 2.5, angle: e.dir === "row" ? Math.PI : -Math.PI / 2, spread: 0.3, shape: "spark" });
        play("laser");
        noise(0.25, 0.2, { type: "bandpass", freq: 900, sweep: 3600, q: 1.2 });
        return 0.3;
      case "bomb":
        this.fx.push({ type: "bomb", cell: e.cell, radius: e.radius, t: 0, dur: 0.5 });
        this.particles.burst(x, y, 26, { color: ["#fff", "#fde68a", "#fb923c", "#f472b6"], speed: 330, size: cs * 0.13, life: 0.7, gravity: 300 });
        play("explode");
        return 0.65;
      case "prism": {
        const bolts = e.targets.map((t) => this.bolt(x, y, this.cx(colOf(t)), this.cy(rowOf(t))));
        this.fx.push({ type: "prism", cell: e.cell, t: 0, dur: 0.6, bolts });
        for (const t of e.targets) this.sparkle(this.cx(colOf(t)), this.cy(rowOf(t)), 3, ["#fff", "#e9d5ff", "#a5f3fc"], 120);
        this.sparkle(x, y, 18, ["#fff", "#fda4af", "#fde68a", "#86efac", "#7dd3fc", "#c4b5fd"], 260);
        play("powerup");
        tone(1500, 0.3, "sine", 0.1, { slide: 400 });
        return 0.5;
      }
      case "nova":
        this.fx.push({ type: "nova", cell: e.cell, t: 0, dur: 0.8 });
        this.sparkle(x, y, 40, ["#fff", "#fda4af", "#fde68a", "#86efac", "#7dd3fc", "#c4b5fd"], 420);
        this.flash = 1;
        play("explode");
        play("win");
        this.showBanner("Sugar Nova!", "#fde047", 40);
        return 1;
    }
  }

  private bolt(x0: number, y0: number, x1: number, y1: number) {
    const n = 7;
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len = Math.hypot(dx, dy) || 1;
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const j = i === 0 || i === n ? 0 : (Math.random() - 0.5) * this.layout.cell * 0.9;
      pts.push({ x: x0 + dx * t + (-dy / len) * j, y: y0 + dy * t + (dx / len) * j });
    }
    return pts;
  }

  private beginFall(step: Extract<Step, { type: "fall" }>) {
    const spawn = new Map<number, number>();
    for (const s of step.spawned) spawn.set(s.id, s.fromRow);
    const live = new Set<number>();
    let any = false;
    for (let i = 0; i < CELLS; i++) {
      const piece = step.board[i];
      if (!piece) {
        this.grid[i] = null;
        continue;
      }
      live.add(piece.id);
      let sp = this.byId.get(piece.id);
      if (!sp) sp = this.newSprite(piece, colOf(i), spawn.get(piece.id) ?? -1);
      sp.piece = piece;
      this.grid[i] = sp;
      const row = rowOf(i);
      if (Math.abs(sp.x - colOf(i)) > 0.001) sp.x = colOf(i);
      if (row - sp.y > 0.001) {
        this.fall(sp, row);
        any = true;
      }
    }
    for (const [id, sp] of this.byId) {
      if (!live.has(id)) {
        this.byId.delete(id);
        sp.alpha = 0;
      }
    }
    if (any) {
      this.add({ delay: 0.12, dur: 0.01, apply: () => undefined, start: () => tone(260, 0.06, "sine", 0.06, { slide: 180 }) });
    }
  }

  private beginShuffle(step: Extract<Step, { type: "shuffle" }>) {
    this.showBanner("No moves left!  Shuffling", "#93c5fd", 26, 1.4);
    play("swoosh");
    for (let i = 0; i < CELLS; i++) {
      const piece = step.board[i];
      if (!piece) continue;
      const sp = this.byId.get(piece.id);
      if (!sp) continue;
      sp.piece = piece;
      this.grid[i] = sp;
      this.moveTo(sp, colOf(i), rowOf(i), 0.7, 0, easeInOutQuad);
      this.add({
        dur: 0.7,
        apply: (k) => {
          sp.rot = Math.sin(k * Math.PI) * 0.6 * (sp.id % 2 ? 1 : -1);
          sp.scale = 1 - Math.sin(k * Math.PI) * 0.25;
        },
        end: () => {
          sp.rot = 0;
          sp.scale = 1;
        },
      });
    }
    this.hold = 0.15;
  }

  showBanner(textStr: string, color: string, size = 30, dur = 1) {
    this.banner = { text: textStr, color, t: 0, dur, size };
  }

  // ------------------------------------------------------------------ update

  update(dt: number) {
    this.time += dt;
    this.shake.update(dt);
    this.particles.update(dt);
    this.floaters.update(dt);
    this.flash = Math.max(0, this.flash - dt * 2.2);
    this.shownScore += (this.score - this.shownScore) * (1 - Math.exp(-9 * dt));
    if (Math.abs(this.score - this.shownScore) < 1) this.shownScore = this.score;

    for (let i = this.fx.length - 1; i >= 0; i--) {
      const f = this.fx[i];
      f.t += dt;
      if (f.t >= f.dur) this.fx.splice(i, 1);
    }
    if (this.banner) {
      this.banner.t += dt;
      if (this.banner.t >= this.banner.dur) this.banner = null;
    }

    for (let i = 0; i < this.anims.length; i++) {
      const a = this.anims[i];
      if (a.delay > 0) {
        a.delay -= dt;
        if (a.delay > 0) continue;
        a.t = -a.delay;
        a.delay = 0;
      } else {
        a.t += dt;
      }
      if (!a.started) {
        a.started = true;
        a.start?.();
      }
      const k = Math.min(1, a.t / a.dur);
      a.apply(k);
      if (k >= 1) {
        a.end?.();
        this.anims.splice(i, 1);
        i--;
      }
    }

    if (this.hold > 0) this.hold -= dt;
    if (this.anims.length === 0 && this.hold <= 0) {
      const next = this.queue.shift();
      if (next) this.begin(next);
      else if (this.idleFlag) {
        this.idleFlag = false;
        this.onIdle?.();
      }
    }
  }

  // ------------------------------------------------------------------ drawing

  draw(ctx: CanvasRenderingContext2D, scale: number) {
    const L = this.layout;
    const { bx, by, cell } = L;
    const dpr = Math.min(2, typeof window === "undefined" ? 1 : window.devicePixelRatio || 1);
    this.atlas.setSize(cell * scale * dpr);
    const [sx, sy] = this.shake.offset(9);
    ctx.save();
    ctx.translate(sx, sy);

    // Board tray and tiles are painted once (shadows are slow to redraw every frame).
    const bw = SIZE * cell;
    ctx.drawImage(this.boardImage(scale * dpr), bx - 24, by - 24, bw + 48, bw + 48);

    // Ingredient exits.
    if (this.showExits) {
      for (const i of this.exits) {
        const x = bx + colOf(i) * cell;
        const y = by + (rowOf(i) + 1) * cell;
        ctx.save();
        ctx.translate(x + cell / 2, y - 1);
        const bob = Math.sin(this.time * 4 + colOf(i)) * 1.5;
        ctx.fillStyle = "#f59e0b";
        ctx.beginPath();
        ctx.moveTo(-cell * 0.2, 2 + bob);
        ctx.lineTo(cell * 0.2, 2 + bob);
        ctx.lineTo(0, cell * 0.18 + 2 + bob);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        roundRect(ctx, x + cell * 0.12, y - 3, cell * 0.76, 4, 2);
        ctx.fillStyle = "rgba(245,158,11,0.9)";
        ctx.fill();
      }
    }

    // Frosting.
    for (let i = 0; i < CELLS; i++) {
      const f = this.frosting[i];
      if (f <= 0 || this.holes[i]) continue;
      const [fx, fy, fw, fh] = this.atlas.frostingRect(Math.min(2, f));
      const span = cell * this.atlas.span;
      ctx.drawImage(this.atlas.sheet!, fx, fy, fw, fh, bx + (colOf(i) + 0.5) * cell - span / 2, by + (rowOf(i) + 0.5) * cell - span / 2, span, span);
    }

    // Selection and keyboard cursor under the sweets.
    const marks: [number, string][] = [];
    if (this.sel >= 0) marks.push([this.sel, "#ffffff"]);
    if (this.kb >= 0) marks.push([this.kb, "#93c5fd"]);
    for (const [cellIdx, color] of marks) {
      const pulse = 0.5 + 0.5 * Math.sin(this.time * 7);
      roundRect(ctx, bx + colOf(cellIdx) * cell + 1, by + rowOf(cellIdx) * cell + 1, cell - 2, cell - 2, 9);
      ctx.fillStyle = `rgba(255,255,255,${0.14 + 0.12 * pulse})`;
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // Sweets, clipped to the board so new ones appear to drop in from its top edge.
    ctx.save();
    ctx.beginPath();
    ctx.rect(bx - 6, by, bw + 12, bw + 6);
    ctx.clip();
    for (let i = 0; i < CELLS; i++) {
      const sp = this.grid[i];
      if (sp) this.drawSprite(ctx, sp, i);
    }
    ctx.restore();
    for (const sp of this.dying) this.drawSprite(ctx, sp, -1);

    // Special effects.
    for (const f of this.fx) this.drawFx(ctx, f);
    this.particles.draw(ctx);
    this.floaters.draw(ctx);

    if (this.flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${this.flash * 0.7})`;
      ctx.fillRect(bx - 8, by - 8, bw + 16, bw + 16);
    }

    if (this.banner) this.drawBanner(ctx);
    ctx.restore();
  }

  private boardKey = "";
  private boardCanvas: HTMLCanvasElement | null = null;

  /** The tray and its tiles as one image, rebuilt only when the size or the board shape changes. */
  private boardImage(pxPerUnit: number): HTMLCanvasElement {
    const { cell } = this.layout;
    const key = `${Math.round(pxPerUnit * 100)}:${cell}:${this.holes.map((h) => (h ? 1 : 0)).join("")}`;
    if (this.boardCanvas && key === this.boardKey) return this.boardCanvas;
    const pad = 24;
    const side = SIZE * cell + pad * 2;
    const cv = this.boardCanvas ?? document.createElement("canvas");
    cv.width = Math.ceil(side * pxPerUnit);
    cv.height = Math.ceil(side * pxPerUnit);
    const g = cv.getContext("2d")!;
    g.setTransform(pxPerUnit, 0, 0, pxPerUnit, 0, 0);
    g.translate(pad, pad);
    const bw = SIZE * cell;
    g.save();
    g.shadowColor = "rgba(20,0,40,0.55)";
    g.shadowBlur = 18;
    g.shadowOffsetY = 6;
    roundRect(g, -8, -8, bw + 16, bw + 16, 18);
    g.fillStyle = "#3a1d63";
    g.fill();
    g.restore();
    roundRect(g, -8, -8, bw + 16, bw + 16, 18);
    g.strokeStyle = "rgba(255,255,255,0.18)";
    g.lineWidth = 2;
    g.stroke();
    for (let i = 0; i < CELLS; i++) {
      if (this.holes[i]) continue;
      const r = rowOf(i);
      const c = colOf(i);
      roundRect(g, c * cell + 1.5, r * cell + 1.5, cell - 3, cell - 3, 8);
      g.fillStyle = (r + c) % 2 ? "#4a2a7a" : "#43246f";
      g.fill();
    }
    this.boardCanvas = cv;
    this.boardKey = key;
    return cv;
  }

  private drawSprite(ctx: CanvasRenderingContext2D, sp: Sprite, cellIdx: number) {
    const { cell } = this.layout;
    if (sp.alpha <= 0.01 || sp.scale <= 0.01) return;
    const piece = sp.piece;
    const x = this.cx(sp.x);
    let y = this.cy(sp.y);
    let s = sp.scale;
    let rot = sp.rot;
    const special = piece.kind === "rowRocket" || piece.kind === "colRocket" || piece.kind === "bomb" || piece.kind === "prism";
    const t = this.time;
    const idle = this.anims.length === 0;
    s *= 1 + (special ? 0.05 : 0.012) * Math.sin(t * (special ? 5 : 2.2) + sp.id);
    if (cellIdx >= 0 && (cellIdx === this.sel || cellIdx === this.kb)) s *= 1.1 + 0.03 * Math.sin(t * 8);
    const hinted = this.hint && idle && (this.hint[0] === cellIdx || this.hint[1] === cellIdx);
    if (hinted) {
      const w = Math.sin(t * 9);
      rot += w * 0.16;
      s *= 1.08 + 0.06 * Math.abs(w);
      y -= Math.abs(w) * 3;
    }
    if (special && sp.alpha > 0.5) {
      const g = ctx.createRadialGradient(x, y, cell * 0.1, x, y, cell * 0.78);
      const a = (0.4 + 0.2 * Math.sin(t * 5 + sp.id)) * sp.alpha * Math.min(1, sp.scale);
      const hue = piece.kind === "prism" ? (t * 120) % 360 : 45;
      g.addColorStop(0, `hsla(${hue},100%,85%,${a})`);
      g.addColorStop(1, `hsla(${hue},100%,70%,0)`);
      ctx.fillStyle = g;
      ctx.fillRect(x - cell, y - cell, cell * 2, cell * 2);
    }
    const [rx, ry, rw, rh] = this.atlas.pieceRect(piece);
    const span = cell * this.atlas.span;
    ctx.save();
    ctx.translate(x, y);
    if (rot) ctx.rotate(rot);
    ctx.scale(s * sp.sx, s * sp.sy);
    ctx.globalAlpha = sp.alpha;
    ctx.drawImage(this.atlas.sheet!, rx, ry, rw, rh, -span / 2, -span / 2, span, span);
    ctx.restore();
    if (special && sp.alpha > 0.5 && idle) {
      // A twinkle that circles the special.
      const a = t * 2.4 + sp.id;
      const tx = x + Math.cos(a) * cell * 0.34;
      const ty = y + Math.sin(a) * cell * 0.3 - cell * 0.04;
      const k = 0.5 + 0.5 * Math.sin(t * 9 + sp.id);
      this.star(ctx, tx, ty, cell * 0.11 * (0.5 + k), "rgba(255,255,255,0.95)");
    }
  }

  private star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y - r * 1.6);
    ctx.quadraticCurveTo(x, y, x + r * 1.6, y);
    ctx.quadraticCurveTo(x, y, x, y + r * 1.6);
    ctx.quadraticCurveTo(x, y, x - r * 1.6, y);
    ctx.quadraticCurveTo(x, y, x, y - r * 1.6);
    ctx.fill();
  }

  private drawFx(ctx: CanvasRenderingContext2D, f: Fx) {
    const { bx, by, cell } = this.layout;
    const bw = SIZE * cell;
    const p = clamp(f.t / f.dur, 0, 1);
    switch (f.type) {
      case "rocket": {
        const x = this.cx(colOf(f.cell));
        const y = this.cy(rowOf(f.cell));
        const reach = easeOutCubic(Math.min(1, p * 1.7)) * bw;
        const thick = cell * 0.95 * Math.pow(1 - p, 0.7);
        const horizontal = f.dir === "row";
        const x0 = horizontal ? Math.max(bx - 6, x - reach) : x - thick / 2;
        const x1 = horizontal ? Math.min(bx + bw + 6, x + reach) : x + thick / 2;
        const y0 = horizontal ? y - thick / 2 : Math.max(by - 6, y - reach);
        const y1 = horizontal ? y + thick / 2 : Math.min(by + bw + 6, y + reach);
        const g = horizontal ? ctx.createLinearGradient(0, y0, 0, y1) : ctx.createLinearGradient(x0, 0, x1, 0);
        g.addColorStop(0, "rgba(249,168,212,0)");
        g.addColorStop(0.35, "rgba(255,255,255,0.85)");
        g.addColorStop(0.5, "rgba(255,255,255,1)");
        g.addColorStop(0.65, "rgba(255,255,255,0.85)");
        g.addColorStop(1, "rgba(249,168,212,0)");
        ctx.fillStyle = g;
        ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
        // The glowing heads at both tips.
        const tipR = cell * 0.3 * (1 - p);
        for (const s of [-1, 1]) {
          const tx = horizontal ? x + s * reach : x;
          const ty = horizontal ? y : y + s * reach;
          this.star(ctx, tx, ty, tipR, "rgba(255,255,255,0.95)");
        }
        break;
      }
      case "bomb": {
        const x = this.cx(colOf(f.cell));
        const y = this.cy(rowOf(f.cell));
        const maxR = (f.radius + 0.6) * cell;
        const r = easeOutCubic(p) * maxR;
        const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(1, r));
        g.addColorStop(0, `rgba(255,255,255,${0.9 * (1 - p)})`);
        g.addColorStop(0.7, `rgba(253,224,71,${0.45 * (1 - p)})`);
        g.addColorStop(1, "rgba(251,146,60,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, Math.max(1, r), 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = `rgba(255,255,255,${1 - p})`;
        ctx.lineWidth = cell * 0.25 * (1 - p) + 1;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }
      case "prism": {
        const a = 1 - p;
        const glow = Math.min(1, p * 5);
        for (const pts of f.bolts) {
          ctx.lineJoin = "round";
          ctx.lineCap = "round";
          ctx.beginPath();
          const upto = Math.max(2, Math.ceil(pts.length * Math.min(1, p * 3.5)));
          for (let i = 0; i < upto; i++) {
            if (i) ctx.lineTo(pts[i].x, pts[i].y);
            else ctx.moveTo(pts[i].x, pts[i].y);
          }
          ctx.strokeStyle = `hsla(${(this.time * 300) % 360},100%,75%,${0.5 * a * glow})`;
          ctx.lineWidth = cell * 0.22;
          ctx.stroke();
          ctx.strokeStyle = `rgba(255,255,255,${a})`;
          ctx.lineWidth = Math.max(1.5, cell * 0.07);
          ctx.stroke();
        }
        break;
      }
      case "nova": {
        const x = this.cx(colOf(f.cell));
        const y = this.cy(rowOf(f.cell));
        const r = easeOutCubic(p) * bw * 1.2;
        ctx.strokeStyle = `rgba(255,255,255,${1 - p})`;
        ctx.lineWidth = cell * 0.5 * (1 - p) + 2;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }
      case "ring": {
        const r = (0.2 + easeOutCubic(p)) * this.layout.cell * 0.6 * f.size;
        ctx.strokeStyle = f.color;
        ctx.globalAlpha = (1 - p) * 0.9;
        ctx.lineWidth = 3 * (1 - p) + 0.5;
        ctx.beginPath();
        ctx.arc(f.x, f.y, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
        break;
      }
    }
  }

  private drawBanner(ctx: CanvasRenderingContext2D) {
    const b = this.banner!;
    const { bx, by, cell } = this.layout;
    const p = b.t / b.dur;
    const inK = easeOutBack(Math.min(1, p / 0.18));
    const out = p > 0.75 ? 1 - (p - 0.75) / 0.25 : 1;
    const x = bx + (SIZE * cell) / 2;
    const y = by + (SIZE * cell) * 0.42 - p * 12;
    ctx.save();
    ctx.globalAlpha = clamp(out, 0, 1);
    ctx.translate(x, y);
    ctx.scale(inK, inK);
    text(ctx, b.text, 0, 0, { size: b.size, color: b.color, font: DISPLAY_FONT, stroke: "#4a1d96", strokeWidth: 7, weight: 900 });
    ctx.restore();
  }
}
