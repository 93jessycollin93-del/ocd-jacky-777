import type { GameMeta } from "../../types";

export const meta: GameMeta = {
  id: "bubble-pop",
  title: "Bubble Pop",
  emoji: "🫧",
  category: "Casual",
  blurb:
    "Aim and fire coloured bubbles up the board. Match three or more to pop them, and anything left hanging falls for bonus points. Miss too often and the ceiling creeps down. Play endless, or clear ten handmade levels.",
  controls: {
    desktop: "Move the mouse to aim, click to fire · ← → to aim, Space to fire · right-click, Shift or the next bubble to swap · P or Esc to pause",
    touch: "Drag to aim, release to fire (drag back down to cancel) · tap the next bubble to swap",
  },
  accent: "#38bdf8",
  tags: ["Shooter", "Endless", "Levels"],
  scoreLabel: "Best endless score",
  order: 2,
};
