import type { GameMeta } from "../../types";

export const meta: GameMeta = {
  id: "sea-battle",
  title: "Sea Battle",
  emoji: "🚢",
  category: "Strategy",
  blurb: "Hide your fleet on a 10 × 10 sea, then trade shots with the computer until one fleet is sunk. Three admirals: Easy fires wild, Normal hunts in a checkerboard, Hard works out where your ships must be.",
  controls: {
    desktop: "Pick a ship, click to place it, R to rotate · click the enemy sea to fire",
    touch: "Pick a ship, tap to place it, ⟳ to rotate · tap the enemy sea to fire",
  },
  accent: "#0ea5e9",
  tags: ["Classic", "vs Computer"],
  scoreOrder: "low",
  scoreLabel: "Fewest shots",
  order: 4,
};
