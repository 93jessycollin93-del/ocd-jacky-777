import type { GameMeta } from "../../types";

export const meta: GameMeta = {
  id: "brick-breaker",
  title: "Brick Breaker",
  emoji: "🧱",
  category: "Arcade",
  blurb:
    "Bounce the ball off your paddle to smash every brick. Catch falling capsules for multi-ball, lasers and more.",
  controls: {
    desktop: "Mouse or ← → / A D to move · click or Space to launch and fire · P or Esc to pause",
    touch: "Drag anywhere to slide the paddle · touch to launch · hold to fire the laser",
  },
  accent: "#22d3ee",
  tags: ["Classic", "Power-ups", "Levels"],
  scoreLabel: "Best",
  order: 4,
};
