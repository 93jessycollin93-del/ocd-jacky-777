import type { GameMeta } from "../../types";

export const meta: GameMeta = {
  id: "mini-golf",
  title: "Mini Golf",
  emoji: "⛳",
  category: "Sports & Racing",
  blurb: "Eighteen holes of top-down mini golf: bank shots off the walls, sand traps, ponds, ice, hills, a windmill, sliding doors and teleporters. Beat par over the full round.",
  controls: {
    desktop: "Drag back from the ball and let go to putt (further back = harder) · R restarts the hole · P or Esc pauses",
    touch: "Drag back from the ball and let go to putt",
  },
  accent: "#22c55e",
  tags: ["Sports", "18 holes"],
  scoreOrder: "low",
  scoreLabel: "Best round",
  order: 3,
};
