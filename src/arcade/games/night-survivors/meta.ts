import type { GameMeta } from "../../types";

export const meta: GameMeta = {
  id: "night-survivors",
  title: "Night Survivors",
  emoji: "🦇",
  category: "Action",
  blurb: "Survive a 15-minute night against endless hordes. You only move; your weapons fire on their own. Grab XP gems, pick upgrades, evolve weapons with boss chests, and spend gold on permanent upgrades.",
  controls: {
    desktop: "WASD or arrow keys to move · pick a card when you level up (1, 2, 3) · P or Esc pauses",
    touch: "Drag anywhere on the left half to move · tap a card when you level up",
  },
  accent: "#a855f7",
  tags: ["Roguelite", "Hordes"],
  scoreFormat: "time",
  scoreLabel: "Longest",
  order: 5,
};
