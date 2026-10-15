// Follows each piece through the game so the board can slide it from square to square (and fade out
// captured ones) instead of redrawing the position. Pure helpers; the UI keeps one snapshot per ply.
import { F_CAPTURE, F_CASTLE, F_EP, WHITE, moveFlags, moveFrom, movePromo, moveTo, type Position } from "./logic";

export interface Tracked {
  id: number;
  /** Signed piece code (promotions change it). */
  piece: number;
  sq: number;
  captured: boolean;
}

export function trackedFromPosition(pos: Position): Tracked[] {
  const out: Tracked[] = [];
  for (let sq = 0; sq < 64; sq++) if (pos.board[sq]) out.push({ id: out.length, piece: pos.board[sq], sq, captured: false });
  return out;
}

/** The pieces after `m` is played from `pos` (call before making the move). */
export function trackMove(prev: Tracked[], pos: Position, m: number): Tracked[] {
  const from = moveFrom(m);
  const to = moveTo(m);
  const flags = moveFlags(m);
  const promo = movePromo(m);
  const us = pos.turn === WHITE ? 1 : -1;
  const capSq = flags & F_EP ? to - 8 * us : to;
  const rookFrom = to > from ? to + 1 : to - 2;
  const rookTo = to > from ? to - 1 : to + 1;
  return prev.map((t) => {
    if (t.captured) return t;
    if (flags & (F_CAPTURE | F_EP) && t.sq === capSq) return { ...t, captured: true };
    if (t.sq === from) return { ...t, sq: to, piece: promo ? promo * us : t.piece };
    if (flags & F_CASTLE && t.sq === rookFrom) return { ...t, sq: rookTo };
    return t;
  });
}
