import type { GameMeta } from "../../types";

export const meta: GameMeta = {
  id: "missile-defense",
  title: "Missile Defense",
  emoji: "🚀",
  category: "Arcade",
  blurb: "Warheads rain down on six cities. Fire interceptors from three bases to fill the sky with blasts before they land, and watch out for splitting missiles, smart bombs and bombers.",
  controls: {
    desktop: "Click to fire at a spot · A / S / D fire from the left, middle or right base · P or Esc to pause",
    touch: "Tap the sky to fire from the nearest base with ammo",
  },
  accent: "#f43f5e",
  tags: ["Classic", "Waves"],
  order: 6,
};
