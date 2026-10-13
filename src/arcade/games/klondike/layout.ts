// Where every card sits on the table, as pure functions of the game state and the canvas size. Phone
// portrait gets smaller cards and tighter overlap; short windows squeeze long columns to fit.
import { isUp, type Klondike } from "./logic";

export interface Layout {
  W: number;
  H: number;
  cw: number;
  ch: number;
  gap: number;
  left: number;
  top: number;
  tabY: number;
  /** x of each of the 7 columns. */
  colX: number[];
  /** Vertical step between face-down and face-up cards in a column (after fitting). */
  stepDown: number;
  stepUp: number;
  /** Horizontal fan of the top cards of the waste in draw-3. */
  fan: number;
  portrait: boolean;
}

export type Zone = "stock" | "waste" | "foundation" | "tableau";

export interface Spot {
  x: number;
  y: number;
  zone: Zone;
  /** Pile number (foundation pile or tableau column), 0 otherwise. */
  pile: number;
  /** Position within the pile, bottom = 0. */
  index: number;
}

export function computeLayout(g: Klondike, W: number, H: number): Layout {
  const portrait = H > W * 1.05;
  const m = Math.max(6, Math.min(24, W * 0.018));
  const gap = Math.max(4, Math.min(16, W * 0.014));
  const widthBased = (W - 2 * m - 6 * gap) / 7;
  const heightBased = (H - 2 * m) / 3.15 / 1.4;
  const cw = Math.max(30, Math.min(widthBased, heightBased, 124));
  const ch = cw * 1.4;
  const left = (W - (7 * cw + 6 * gap)) / 2;
  const top = m;
  const tabY = top + ch + Math.max(8, cw * 0.22);
  const colX = Array.from({ length: 7 }, (_, i) => left + i * (cw + gap));
  const baseDown = ch * (portrait ? 0.13 : 0.12);
  const baseUp = ch * (portrait ? 0.27 : 0.3);
  // Squeeze columns so the longest one still fits above the bottom edge.
  const room = H - m - tabY - ch;
  let f = 1;
  for (const col of g.tableau) {
    let downs = 0;
    let ups = 0;
    col.forEach((c, i) => {
      if (i === col.length - 1) return;
      if (isUp(c)) ups++;
      else downs++;
    });
    const need = downs * baseDown + ups * baseUp;
    if (need > room && need > 0) f = Math.min(f, Math.max(0.3, room / need));
  }
  return { W, H, cw, ch, gap, left, top, tabY, colX, stepDown: baseDown * f, stepUp: baseUp * f, fan: cw * (portrait ? 0.2 : 0.24), portrait };
}

/** Position of one card of a pile. */
export function tableauY(l: Layout, col: number[], index: number): number {
  let y = l.tabY;
  for (let i = 0; i < index; i++) y += isUp(col[i]) ? l.stepUp : l.stepDown;
  return y;
}

/** Target position of every card, keyed by card id (0-51). */
export function layoutCards(g: Klondike, l: Layout): Map<number, Spot> {
  const out = new Map<number, Spot>();
  const id = (c: number) => c & 63;
  g.stock.forEach((c, i) => out.set(id(c), { x: l.colX[0], y: l.top, zone: "stock", pile: 0, index: i }));
  const wn = g.waste.length;
  const spread = g.drawCount === 3 ? Math.min(3, wn) : 1;
  g.waste.forEach((c, i) => {
    const fromTop = wn - 1 - i;
    const k = fromTop < spread ? spread - 1 - fromTop : 0;
    out.set(id(c), { x: l.colX[1] + k * l.fan, y: l.top, zone: "waste", pile: 0, index: i });
  });
  g.foundations.forEach((pile, p) => pile.forEach((c, i) => out.set(id(c), { x: l.colX[3 + p], y: l.top, zone: "foundation", pile: p, index: i })));
  g.tableau.forEach((col, ci) => col.forEach((c, i) => out.set(id(c), { x: l.colX[ci], y: tableauY(l, col, i), zone: "tableau", pile: ci, index: i })));
  return out;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Slots drawn on the felt even when empty. */
export const stockSlot = (l: Layout): Rect => ({ x: l.colX[0], y: l.top, w: l.cw, h: l.ch });
export const wasteSlot = (l: Layout): Rect => ({ x: l.colX[1], y: l.top, w: l.cw, h: l.ch });
export const foundationSlot = (l: Layout, p: number): Rect => ({ x: l.colX[3 + p], y: l.top, w: l.cw, h: l.ch });
export const columnSlot = (l: Layout, c: number): Rect => ({ x: l.colX[c], y: l.tabY, w: l.cw, h: l.ch });
