import type { GameMeta } from "../../types";

export const meta: GameMeta = {
  id: "chess",
  title: "Chess",
  emoji: "♟️",
  category: "Board & Cards",
  blurb: "Full chess against a computer with five levels: castling, en passant, promotion, check and mate, plus every draw rule. Play White or Black, undo freely, and beat the harder levels to set your best.",
  controls: {
    desktop: "Drag a piece or click it, then click a dot · Z undo · F flip board",
    touch: "Tap a piece, then tap a dot (or drag it) · Undo and Flip buttons below",
  },
  accent: "#e0a84a",
  tags: ["Classic", "Strategy", "vs AI"],
  scoreOrder: "high",
  scoreLabel: "Best win (level)",
  order: 1,
};
