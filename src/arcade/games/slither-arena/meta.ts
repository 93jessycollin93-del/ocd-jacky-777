import type { GameMeta } from "../../types";

export const meta: GameMeta = {
  id: "slither-arena",
  title: "Slither Arena",
  emoji: "🐍",
  category: "Action",
  blurb:
    "Glide through a glowing round arena, gobble orbs to grow, and trap rival worms: if your head touches another worm's body, you burst. Boost to cut them off, but it burns your own mass.",
  controls: {
    desktop: "Move the mouse to steer (or A/D, arrows) · hold the mouse button or Space to boost · P or Esc to pause",
    touch: "Drag on the left side to steer · hold the BOOST button to speed up · ⏸ to pause",
  },
  accent: "#22d3ee",
  tags: ["io", "Endless", "Bots"],
  scoreLabel: "Longest",
  order: 5,
};
