import type { GameMeta } from "../../types";

export const meta: GameMeta = {
  id: "fruit-slash",
  title: "Fruit Slash",
  emoji: "🍉",
  category: "Casual",
  blurb:
    "Fruit flies up in high arcs: swipe to slice it in two, string three or more into a combo, and never touch a bomb. Classic ends after three missed fruit; Arcade is a 60-second sprint with freeze, frenzy and double-points fruit.",
  controls: {
    desktop: "Hold the mouse button and drag across fruit to slice it · P or Esc to pause",
    touch: "Swipe your finger across fruit to slice it · tap ⏸ to pause",
  },
  accent: "#f97316",
  tags: ["Swipe", "Arcade", "Combos"],
  scoreLabel: "Best Classic score",
  order: 3,
};
