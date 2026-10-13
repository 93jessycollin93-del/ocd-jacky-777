import type { GameMeta } from "../../types";

export const meta: GameMeta = {
  id: "blob-arena",
  title: "Blob Arena",
  emoji: "🫧",
  category: "Action",
  blurb:
    "Eat pellets to grow, swallow smaller blobs and run from bigger ones. Split to pounce, shoot mass to feed spiky thorns, and watch the leaderboard: the bigger you get, the slower you move.",
  controls: {
    desktop: "Move the mouse to steer · Space to split · W to eject mass (hold to keep firing) · P or Esc to pause",
    touch: "Drag on the left side to steer · SPLIT and EJECT buttons on the right · ⏸ to pause",
  },
  accent: "#38bdf8",
  tags: ["io", "Endless", "Bots"],
  scoreLabel: "Peak mass",
  order: 6,
};
