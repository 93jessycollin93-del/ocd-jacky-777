import type { GameMeta } from "../../types";

export const meta: GameMeta = {
  id: "alien-wave",
  title: "Alien Wave",
  emoji: "👾",
  category: "Arcade",
  blurb:
    "Shoot down a marching alien formation as it speeds up. Some swoop at you in wild curves, so hide behind the bunkers!",
  controls: {
    desktop: "← → or A D to move · hold Space to fire (one shot at a time!) · P or Esc to pause",
    touch: "Drag anywhere to move · touch and hold to auto-fire (or use the Fire button)",
  },
  accent: "#a78bfa",
  tags: ["Classic", "Shooter", "Pixel art"],
  scoreLabel: "Best",
  order: 5,
};
