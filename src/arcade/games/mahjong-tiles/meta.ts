import type { GameMeta } from "../../types";

export const meta: GameMeta = {
  id: "mahjong-tiles",
  title: "Mahjong Tiles",
  emoji: "🀄",
  category: "Board & Cards",
  blurb:
    "Clear the stacked board by matching pairs of free tiles. A tile is free when nothing sits on top and its left or right side is open. Five layouts, every deal can be solved, with hints, shuffles and endless undo.",
  controls: {
    desktop: "Click a free tile, then its match · H hint · U undo · S shuffle · P or Esc pause",
    touch: "Tap a free tile, then its match · use the Hint, Undo and Shuffle buttons",
  },
  accent: "#14b8a6",
  tags: ["Solitaire", "Matching"],
  scoreOrder: "low",
  scoreLabel: "Best time (Pyramid)",
  scoreFormat: "time",
  order: 6,
};
