import type { GameMeta } from "../../types";

export const meta: GameMeta = {
  id: "sky-hopper",
  title: "Sky Hopper",
  emoji: "✏️",
  category: "Casual",
  blurb:
    "Scribble your way up the notebook page. Bounce off platforms, dodge crumbling ones, ride springs and jetpacks, and stomp or shoot the ink monsters. How high can you climb?",
  controls: {
    desktop: "← → or A D to steer · click to shoot where you aim · P or Esc to pause",
    touch: "Hold the left or right half to steer · tap the middle band to shoot",
  },
  accent: "#84cc16",
  tags: ["Endless", "Climber", "Shooting"],
  scoreLabel: "Height",
  order: 11,
};
