// Sizes for drawing the tiles, in the SVG's own units (the whole board scales to fit the screen).
import type { Slot } from "./layouts";

/** Tile face width and height. */
export const PW = 54;
export const PH = 70;
/** How far the tile's side shows below and to the right of its face. */
export const DEPTH = 7;
/** One half-tile step on the board grid. */
export const HW = (PW + DEPTH) / 2;
export const HH = (PH + DEPTH) / 2;
/** Each layer up is drawn this far up and to the left, so the stack reads as stacked. */
export const SHIFT = DEPTH;

export const tilePos = (s: Slot) => ({ x: s.x * HW - s.z * SHIFT, y: s.y * HH - s.z * SHIFT });

/** The box (in SVG units) that holds every tile of a layout, with a little margin. */
export function boardBox(slots: readonly Slot[], pad = 6) {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const s of slots) {
    const p = tilePos(s);
    x0 = Math.min(x0, p.x);
    y0 = Math.min(y0, p.y);
    x1 = Math.max(x1, p.x + PW + DEPTH);
    y1 = Math.max(y1, p.y + PH + DEPTH);
  }
  return { x: x0 - pad, y: y0 - pad, w: x1 - x0 + pad * 2, h: y1 - y0 + pad * 2 };
}
