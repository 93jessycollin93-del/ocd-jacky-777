import type { GameMeta } from "../../types";

export const meta: GameMeta = {
  id: "rock-blaster",
  title: "Rock Blaster",
  emoji: "☄️",
  category: "Arcade",
  blurb:
    "Blast tumbling rocks into smaller and smaller pieces, dodge the saucers, and gamble on hyperspace when you're cornered.",
  controls: {
    desktop: "← → or A D to turn · ↑ or W to thrust · Space to fire · Shift for hyperspace · P or Esc to pause",
    touch: "Turn left / right and thrust with the buttons · fire · hyperspace (risky!)",
  },
  accent: "#38bdf8",
  tags: ["Classic", "Shooter", "Vector"],
  scoreLabel: "Best",
  order: 3,
};
