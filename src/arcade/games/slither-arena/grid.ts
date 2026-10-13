// Spatial hashing for Slither Arena: a uniform grid over the arena, used for orbs and for every worm
// segment so collision and bot "vision" only look at nearby cells.
import { CELL, MAX_SEGS, MAX_WORMS, WORLD_R, type Orb, type Worm } from "./model";

export class Grid {
  readonly cell: number;
  readonly half: number;
  readonly size: number;
  /** Cell range set by range(): read these straight after calling it. */
  gx0 = 0;
  gx1 = 0;
  gy0 = 0;
  gy1 = 0;
  constructor(radius = WORLD_R, cell = CELL, pad = 240) {
    this.cell = cell;
    this.half = radius + pad;
    this.size = Math.ceil((this.half * 2) / cell);
  }
  idx(v: number): number {
    const i = Math.floor((v + this.half) / this.cell);
    return i < 0 ? 0 : i >= this.size ? this.size - 1 : i;
  }
  cellOf(x: number, y: number): number {
    return this.idx(y) * this.size + this.idx(x);
  }
  /** Sets gx0..gx1 / gy0..gy1 to the cells touched by a box of half-size r around (x, y). */
  range(x: number, y: number, r: number) {
    this.gx0 = this.idx(x - r);
    this.gx1 = this.idx(x + r);
    this.gy0 = this.idx(y - r);
    this.gy1 = this.idx(y + r);
  }
}

/** Every body segment of every living worm, rebuilt once per simulation step (no allocation). */
export class SegGrid extends Grid {
  head: Int32Array;
  next: Int32Array;
  wormOf: Int16Array;
  segOf: Int16Array;
  count = 0;
  constructor(radius = WORLD_R, cell = CELL) {
    super(radius, cell);
    this.head = new Int32Array(this.size * this.size).fill(-1);
    const cap = MAX_WORMS * MAX_SEGS;
    this.next = new Int32Array(cap);
    this.wormOf = new Int16Array(cap);
    this.segOf = new Int16Array(cap);
  }
  rebuild(worms: Worm[]) {
    this.head.fill(-1);
    let e = 0;
    for (let wi = 0; wi < worms.length; wi++) {
      const w = worms[wi];
      if (!w.alive) continue;
      const sx = w.sx;
      const sy = w.sy;
      for (let i = 0; i < w.n; i++) {
        const c = this.cellOf(sx[i], sy[i]);
        this.next[e] = this.head[c];
        this.head[c] = e;
        this.wormOf[e] = wi;
        this.segOf[e] = i;
        e++;
      }
    }
    this.count = e;
  }
  /** Calls fn(wormIndex, segmentIndex) for every segment in cells touching the box. */
  query(x: number, y: number, r: number, fn: (wi: number, si: number) => void) {
    this.range(x, y, r);
    const gx0 = this.gx0;
    const gx1 = this.gx1;
    for (let gy = this.gy0; gy <= this.gy1; gy++) {
      for (let gx = gx0; gx <= gx1; gx++) {
        for (let e = this.head[gy * this.size + gx]; e !== -1; e = this.next[e]) fn(this.wormOf[e], this.segOf[e]);
      }
    }
  }
}

/** Food orbs with a cell index for fast "what's near me" lookups and pooled objects. */
export class OrbField extends Grid {
  cells: Orb[][];
  count = 0;
  ambient = 0;
  private free: Orb[] = [];
  constructor(radius = WORLD_R, cell = CELL) {
    super(radius, cell);
    this.cells = Array.from({ length: this.size * this.size }, () => []);
  }
  add(x: number, y: number, v: number, c: number, amb: boolean, ph = 0): Orb {
    const o: Orb =
      this.free.pop() ?? { x: 0, y: 0, v: 0, c: 0, r: 0, ph: 0, amb: false, cell: 0, slot: 0, alive: false };
    o.x = x;
    o.y = y;
    o.v = v;
    o.c = c;
    o.r = orbRadius(v);
    o.ph = ph;
    o.amb = amb;
    o.alive = true;
    o.cell = this.cellOf(x, y);
    const list = this.cells[o.cell];
    o.slot = list.length;
    list.push(o);
    this.count++;
    if (amb) this.ambient++;
    return o;
  }
  remove(o: Orb) {
    if (!o.alive) return;
    const list = this.cells[o.cell];
    const last = list[list.length - 1];
    list[o.slot] = last;
    last.slot = o.slot;
    list.pop();
    o.alive = false;
    this.count--;
    if (o.amb) this.ambient--;
    this.free.push(o);
  }
  clear() {
    for (const list of this.cells) {
      for (const o of list) {
        o.alive = false;
        this.free.push(o);
      }
      list.length = 0;
    }
    this.count = 0;
    this.ambient = 0;
  }
  /** Calls fn for every orb within r of (x, y). */
  near(x: number, y: number, r: number, fn: (o: Orb) => void) {
    this.range(x, y, r);
    const r2 = r * r;
    for (let gy = this.gy0; gy <= this.gy1; gy++) {
      for (let gx = this.gx0; gx <= this.gx1; gx++) {
        const list = this.cells[gy * this.size + gx];
        for (let i = 0; i < list.length; i++) {
          const o = list[i];
          const dx = o.x - x;
          const dy = o.y - y;
          if (dx * dx + dy * dy <= r2) fn(o);
        }
      }
    }
  }
}

/** Visual and pickup size of an orb from its value. */
export const orbRadius = (v: number) => 3.2 + Math.sqrt(v) * 1.9;
