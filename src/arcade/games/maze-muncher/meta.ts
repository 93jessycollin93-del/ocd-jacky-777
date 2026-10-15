import type { GameMeta } from "../../types";

export const meta: GameMeta = {
  id: "maze-muncher",
  title: "Maze Muncher",
  emoji: "🟡",
  category: "Arcade",
  blurb:
    "Gobble every dot in the neon maze while four hunters close in. Grab a power pellet to turn the tables.",
  controls: {
    desktop: "Arrow keys or WASD to steer (turns are buffered) · P or Esc to pause",
    touch: "Swipe anywhere to steer · or switch on the D-pad (the pad button)",
  },
  accent: "#ffc83a",
  tags: ["Classic", "Maze", "Chase"],
  scoreLabel: "Best",
  order: 2,
};
