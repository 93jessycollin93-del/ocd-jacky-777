// Draws one chess piece from the path data in pieceArt.ts. PieceDefs must be rendered once on the page:
// it holds the gradients every piece refers to.
import { memo } from "react";
import { ART } from "./pieceArt";

export function PieceDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
      <defs>
        <linearGradient id="chess-ivory" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fffdf6" />
          <stop offset="1" stopColor="#d6c9ad" />
        </linearGradient>
        <linearGradient id="chess-ink" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5f5f78" />
          <stop offset="1" stopColor="#1b1b25" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/** `piece` is the signed board code: positive for white, negative for black. */
export const Piece = memo(function Piece({ piece, size }: { piece: number; size?: number | string }) {
  const white = piece > 0;
  const art = ART[Math.abs(piece)];
  const stroke = white ? "#3a2e22" : "#0b0b10";
  const line = white ? "#7a6a55" : "#9a9ab0";
  return (
    <svg
      viewBox="3 3 94 94"
      width={size ?? "100%"}
      height={size ?? "100%"}
      style={{ display: "block", filter: "drop-shadow(0 1.5px 1px rgba(0,0,0,0.35))", pointerEvents: "none" }}
      aria-hidden="true"
    >
      <g fill={white ? "url(#chess-ivory)" : "url(#chess-ink)"} stroke={stroke} strokeWidth={2.6} strokeLinejoin="round">
        {art.body.map((d, i) => (
          <path key={i} d={d} />
        ))}
        {art.dots.map(([x, y, r], i) => (
          <circle key={i} cx={x} cy={y} r={r} />
        ))}
      </g>
      <g fill="none" stroke={line} strokeWidth={2} strokeLinecap="round">
        {art.lines.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
    </svg>
  );
});
