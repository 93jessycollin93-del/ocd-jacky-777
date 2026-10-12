import type { GameMeta } from "../../types";

export const meta: GameMeta = {
  id: "checkers",
  title: "Checkers",
  emoji: "🔴",
  category: "Board & Cards",
  blurb: "American checkers against the computer: captures are compulsory, jumps chain together, and a crowned king flies both ways. Pick Easy, Medium or Hard and rack up wins.",
  controls: {
    desktop: "Click a piece, then a dot (or drag it) · Z to undo · you play red and move first",
    touch: "Tap a piece, then tap a glowing square · Undo button below",
  },
  accent: "#ef4444",
  tags: ["Classic", "Strategy", "vs AI"],
  scoreOrder: "high",
  scoreLabel: "Total wins",
  order: 2,
};
