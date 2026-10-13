import type { GameMeta } from "../../types";

export const meta: GameMeta = {
  id: "territory",
  title: "Territory",
  emoji: "🟥",
  category: "Arcade",
  blurb:
    "Step out of your land, loop back home and everything you circled is yours. Cut rivals' trails to knock them out, and guard your own: anyone touching your trail, even you, ends your run.",
  controls: {
    desktop: "Arrow keys or WASD to turn (or steer with the mouse) · P or Esc to pause",
    touch: "Drag anywhere to steer · ⏸ to pause",
  },
  accent: "#ef4444",
  tags: ["io", "Endless", "Bots"],
  scoreLabel: "Peak land (% ×10)",
  order: 8,
};
