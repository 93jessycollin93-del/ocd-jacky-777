// A uniform grid of pellets so "which pellets is this blob touching?" only checks nearby cells.
import { CELL_SIZE, HALF, type Pellet } from "./model";

export class PelletGrid {
  readonly size: number;
  readonly cells: Pellet[][];
  count = 0;
  private free: Pellet[] = [];
  constructor(private cell = CELL_SIZE) {
    this.size = Math.ceil((HALF * 2) / cell) + 1;
    this.cells = Array.from({ length: this.size * this.size }, () => []);
  }
  idx(v: number): number {
    const i = Math.floor((v + HALF) / this.cell);
    return i < 0 ? 0 : i >= this.size ? this.size - 1 : i;
  }
  add(x: number, y: number, m: number, c: number): Pellet {
    const p: Pellet = this.free.pop() ?? { x: 0, y: 0, m: 0, c: 0, r: 0, cell: 0, slot: 0, alive: false };
    p.x = x;
    p.y = y;
    p.m = m;
    p.c = c;
    p.r = m >= 3 ? 7.5 : 4.6;
    p.alive = true;
    p.cell = this.idx(y) * this.size + this.idx(x);
    p.slot = this.cells[p.cell].length;
    this.cells[p.cell].push(p);
    this.count++;
    return p;
  }
  remove(p: Pellet) {
    if (!p.alive) return;
    const list = this.cells[p.cell];
    const last = list[list.length - 1];
    list[p.slot] = last;
    last.slot = p.slot;
    list.pop();
    p.alive = false;
    this.count--;
    this.free.push(p);
  }
  clear() {
    for (const list of this.cells) {
      for (const p of list) {
        p.alive = false;
        this.free.push(p);
      }
      list.length = 0;
    }
    this.count = 0;
  }
  /** Calls fn for every pellet within r of (x, y). */
  near(x: number, y: number, r: number, fn: (p: Pellet) => void) {
    const gx0 = this.idx(x - r);
    const gx1 = this.idx(x + r);
    const gy0 = this.idx(y - r);
    const gy1 = this.idx(y + r);
    const r2 = r * r;
    for (let gy = gy0; gy <= gy1; gy++) {
      for (let gx = gx0; gx <= gx1; gx++) {
        const list = this.cells[gy * this.size + gx];
        for (let i = 0; i < list.length; i++) {
          const p = list[i];
          const dx = p.x - x;
          const dy = p.y - y;
          if (dx * dx + dy * dy <= r2) fn(p);
        }
      }
    }
  }
}
