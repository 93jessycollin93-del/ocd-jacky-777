import type { GameMeta } from "../../types";

export const meta: GameMeta = {
  id: "rope-snip",
  title: "Rope Snip",
  emoji: "✂️",
  category: "Puzzle",
  blurb: "Munch the little green monster wants his candy. Snip the ropes at just the right moment, float it in bubbles, puff it with air and dodge the spikes. Twenty levels, three stars each.",
  controls: {
    desktop: "Drag across a rope to cut it · click a bubble to pop it · click a puffer to blow · R restarts · P or Esc pauses",
    touch: "Swipe across a rope to cut it · tap a bubble to pop it · tap a puffer to blow",
  },
  accent: "#84cc16",
  tags: ["Physics", "Levels"],
  scoreLabel: "Stars",
  order: 8,
};
