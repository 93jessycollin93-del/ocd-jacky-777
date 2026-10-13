import type { GameMeta } from "../../types";

export const meta: GameMeta = {
  id: "garden-defense",
  title: "Garden Defense",
  emoji: "🌻",
  category: "Strategy",
  blurb:
    "A parade of goofy lawn gnomes is marching on your house! Grow sunbloom, pea pods, walnut walls and cherry bombs across five lanes, collect the falling sun and hold the line through 10 levels. Your lawn mowers are the last line of defence.",
  controls: {
    desktop: "Click a seed (or press 1-8), then click a lawn tile · click sun to collect it · X is the shovel · P or Esc pauses",
    touch: "Tap a seed, then tap a lawn tile (or drag the seed onto it) · tap the sun to collect it · shovel removes plants",
  },
  accent: "#84cc16",
  tags: ["Lane defense", "Levels", "Plants"],
  scoreLabel: "Levels cleared",
  order: 20,
};
