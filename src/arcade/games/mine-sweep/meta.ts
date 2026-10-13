import type { GameMeta } from "../../types";

export const meta: GameMeta = {
  id: "mine-sweep",
  title: "Mine Sweep",
  emoji: "💣",
  category: "Puzzle",
  blurb:
    "Clear the field without touching a mine. Numbers count the mines next to them, so use logic to flag the dangerous squares and open the safe ones as fast as you can. Three board sizes, with best times for each.",
  controls: {
    desktop: "Click to dig · right-click to flag · click a number to open around it once its flags match · F toggles flag mode · P pauses",
    touch: "Tap to dig · long-press to flag (or switch the Dig / Flag toggle) · tap a satisfied number to open around it · drag to scroll big boards",
  },
  accent: "#38bdf8",
  tags: ["Classic", "Logic"],
  scoreOrder: "low",
  scoreLabel: "Best (Intermediate)",
  scoreFormat: "time",
  order: 3,
};
