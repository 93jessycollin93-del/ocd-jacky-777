// Turns the maze's wall tiles into a neon outline: straight edges where a wall meets a corridor, with the
// corners rounded off. Pure data (tile units) so the drawing code can turn it into a Path2D.
import { COLS, ROWS, TILES, WALL, wrapX } from "./maze";

export interface Outline {
  lines: [number, number, number, number][];
  arcs: { cx: number; cy: number; r: number; a0: number; a1: number; ccw: boolean }[];
}

const solid = (x: number, y: number) => (y < 0 || y >= ROWS ? true : TILES[y * COLS + wrapX(x)] === WALL);
/** A horizontal edge along vertex row y, from x to x + 1: wall on one side only. */
const hEdge = (x: number, y: number) => solid(x, y - 1) !== solid(x, y);
/** A vertical edge along vertex column x, from y to y + 1. */
const vEdge = (x: number, y: number) => solid(x - 1, y) !== solid(x, y);

interface Corner {
  dx: number;
  dy: number;
}

/** A vertex where one horizontal and one vertical edge meet: returns the way each edge leaves it. */
function cornerAt(x: number, y: number): { h: Corner; v: Corner } | null {
  const left = hEdge(x - 1, y);
  const right = hEdge(x, y);
  const up = vEdge(x, y - 1);
  const down = vEdge(x, y);
  if (Number(left) + Number(right) + Number(up) + Number(down) !== 2) return null;
  if (!(left || right) || !(up || down)) return null;
  return { h: { dx: left ? -1 : 1, dy: 0 }, v: { dx: 0, dy: up ? -1 : 1 } };
}

export function wallOutline(r = 0.45): Outline {
  const lines: Outline["lines"] = [];
  const arcs: Outline["arcs"] = [];
  for (let y = 0; y <= ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (hEdge(x, y)) {
        const a = cornerAt(x, y) ? r : 0;
        const b = cornerAt(x + 1, y) ? r : 0;
        lines.push([x + a, y, x + 1 - b, y]);
      }
    }
  }
  for (let x = 0; x <= COLS; x++) {
    for (let y = 0; y < ROWS; y++) {
      if (vEdge(x, y)) {
        const a = cornerAt(x, y) ? r : 0;
        const b = cornerAt(x, y + 1) ? r : 0;
        lines.push([x, y + a, x, y + 1 - b]);
      }
    }
  }
  for (let y = 0; y <= ROWS; y++) {
    for (let x = 0; x <= COLS; x++) {
      const c = cornerAt(x, y);
      if (!c) continue;
      const cx = x + r * c.h.dx + r * c.v.dx;
      const cy = y + r * c.h.dy + r * c.v.dy;
      const a0 = Math.atan2(-c.v.dy, -c.v.dx);
      const a1 = Math.atan2(-c.h.dy, -c.h.dx);
      let diff = a1 - a0;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff <= -Math.PI) diff += Math.PI * 2;
      arcs.push({ cx, cy, r, a0, a1, ccw: diff < 0 });
    }
  }
  return { lines, arcs };
}
