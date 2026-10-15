import type { GameMeta } from "../../types";

export const meta: GameMeta = {
  id: "snake",
  title: "Snake",
  emoji: "🐍",
  category: "Arcade",
  blurb: "Eat, grow, don't bite yourself. The snake speeds up as it grows, and golden fruit appear for a few seconds worth five times as much.",
  controls: { desktop: "Arrow keys or WASD to turn · P or Esc to pause", touch: "Swipe to turn · tap to start" },
  accent: "#22c55e",
  tags: ["Classic", "Endless"],
  order: 1,
};
