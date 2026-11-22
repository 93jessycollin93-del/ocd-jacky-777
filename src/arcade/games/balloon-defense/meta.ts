import type { GameMeta } from "../../types";

export const meta: GameMeta = {
  id: "balloon-defense",
  title: "Balloon Pop TD",
  emoji: "🎈",
  category: "Strategy",
  blurb: "Balloons float down the road in layers. Build dart, tack, bomb, frost, sniper and arcane towers, upgrade them down two paths, and pop everything before it gets through. Forty rounds, then freeplay.",
  controls: {
    desktop: "Click a tower then the map to build · click a tower to upgrade · 1–7 pick a tower · Space starts the round or speeds it up · Z / X upgrade · T targeting · Del sells · P or Esc pauses",
    touch: "Tap a tower card then the map (or drag it on) · tap a tower to upgrade or sell · tap ▶ to start the round",
  },
  accent: "#ef4444",
  tags: ["Tower defense", "Upgrades"],
  scoreLabel: "Most rounds",
  order: 2,
};
