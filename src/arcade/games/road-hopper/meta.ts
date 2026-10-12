import type { GameMeta } from "../../types";

export const meta: GameMeta = {
  id: "road-hopper",
  title: "Road Hopper",
  emoji: "🐰",
  category: "Casual",
  blurb:
    "Hop a little bunny as far forward as you can through a chunky voxel world: busy roads, train tracks with warning lights, and rivers of logs and lily pads. Don't dawdle, or a hawk will take you.",
  controls: {
    desktop: "Arrow keys or WASD to hop · P or Esc to pause",
    touch: "Tap to hop forward · swipe to hop left, right or back",
  },
  accent: "#f97316",
  tags: ["Endless", "Voxel", "Reflexes"],
  scoreLabel: "Furthest row",
  order: 12,
};
