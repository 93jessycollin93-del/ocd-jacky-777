import type { GameMeta } from "../../types";

export const meta: GameMeta = {
  id: "merge-2048",
  title: "2048",
  emoji: "🔢",
  category: "Puzzle",
  blurb:
    "Slide the whole board in any direction: equal tiles that meet merge into one with double the value. Build a 2048 tile before the grid fills up, then keep going as far as you dare.",
  controls: {
    desktop: "Arrow keys or WASD to slide · U or Z to undo · R for a new game",
    touch: "Swipe anywhere to slide the tiles · tap Undo to take back your last move",
  },
  accent: "#f59e0b",
  tags: ["Classic", "Numbers"],
  order: 2,
};
