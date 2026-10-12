// Where everything sits on Bubble Pop's canvas. Portrait stacks the HUD above the board; landscape puts a
// narrower board in the middle with the HUD on its sides, so it stays big on a phone held sideways.
import { COLS, LOSE_ROW, ROW_H } from "./logic";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface BpLayout {
  w: number;
  h: number;
  /** Bubble diameter in canvas units. */
  d: number;
  /** Top-left of the playing field. */
  fx: number;
  fy: number;
  /** Y of the losing line. */
  lineY: number;
  shooterX: number;
  shooterY: number;
  landscape: boolean;
  menu: Rect;
}

export function makeLayout(landscape: boolean): BpLayout {
  const d = landscape ? 26 : 40;
  const fy = landscape ? 14 : 60;
  const w = landscape ? 640 : COLS * d;
  const fx = (w - COLS * d) / 2;
  const lineY = fy + ((LOSE_ROW - 1) * ROW_H + 1) * d;
  const shooterY = lineY + 1.35 * d;
  const h = Math.ceil(shooterY + 0.95 * d + (landscape ? 4 : 18));
  return {
    w, h, d, fx, fy, lineY, shooterX: w / 2, shooterY, landscape,
    menu: landscape ? { x: w - 118, y: 12, w: 104, h: 36 } : { x: w - 52, y: 8, w: 42, h: 42 },
  };
}

export const inRect = (r: Rect, x: number, y: number) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
