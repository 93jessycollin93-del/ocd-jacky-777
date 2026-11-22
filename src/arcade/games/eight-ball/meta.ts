import type { GameMeta } from "../../types";

export const meta: GameMeta = {
  id: "eight-ball",
  title: "8-Ball Pool",
  emoji: "🎱",
  category: "Sports & Racing",
  blurb: "Top-down 8-ball against the computer or a friend: break, claim solids or stripes, run your group and sink the 8 last. Real ball physics, fouls and ball in hand.",
  controls: {
    desktop: "Move the mouse to aim · set power with the slider (or hold and release Space) · click Shoot · P or Esc pauses",
    touch: "Drag on the table to aim · set power with the slider · tap Shoot · tap to place the cue ball when you have ball in hand",
  },
  accent: "#0ea5e9",
  tags: ["Sports", "vs Computer", "2 players"],
  scoreLabel: "Wins",
  order: 2,
};
