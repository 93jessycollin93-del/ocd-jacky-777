import type { GameMeta } from "../../types";

export const meta: GameMeta = {
  id: "four-in-a-row",
  title: "Four in a Row",
  emoji: "🟡",
  category: "Board & Cards",
  blurb: "Drop discs into a 7x6 grid and line up four before your opponent does. Play the computer on three levels (hard is a real test) or share the board with a friend.",
  controls: {
    desktop: "Hover and click a column · arrows + Space to drop · 1-7 jump to a column · Z to undo",
    touch: "Press and slide to aim (a ghost disc shows where it lands), release to drop",
  },
  accent: "#4f9cf9",
  tags: ["Classic", "Strategy", "vs AI", "2 players"],
  scoreOrder: "high",
  scoreLabel: "Best win streak",
  order: 3,
};
