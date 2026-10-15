import type { GameMeta } from "../../types";

export const meta: GameMeta = {
  id: "sugar-swap",
  title: "Sugar Swap",
  emoji: "🍬",
  category: "Puzzle",
  blurb:
    "Swap neighbouring sweets to line up three or more. Match four for a rocket, an L or T for a burst, five for a prism, and chain the cascades through 24 levels of scores, frosting and falling ingredients.",
  controls: {
    desktop: "Click a sweet, then a neighbour (or drag it) to swap · arrows + Space to play from the keyboard · H hint · P or Esc to pause",
    touch: "Drag a sweet toward a neighbour to swap, or tap one then the next · tap Menu to pause",
  },
  accent: "#ec4899",
  tags: ["Match-3", "Levels", "Stars"],
  scoreLabel: "Total stars",
  order: 1,
};
