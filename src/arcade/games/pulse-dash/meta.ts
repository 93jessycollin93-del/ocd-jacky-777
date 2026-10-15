import type { GameMeta } from "../../types";

export const meta: GameMeta = {
  id: "pulse-dash",
  title: "Pulse Dash",
  emoji: "🟪",
  category: "Casual",
  blurb:
    "A square runs on its own to a synth beat. Tap to jump spikes and blocks, bounce off pads, grab orbs in mid-air and flip gravity through portals. Three handmade levels; the obstacles line up with the music.",
  controls: {
    desktop: "Space, ↑, W or click to jump (hold to keep jumping) · P or Esc to pause",
    touch: "Tap or hold anywhere to jump · tap again in the air to use orbs",
  },
  accent: "#c084fc",
  tags: ["Rhythm", "Runner", "Levels"],
  scoreLabel: "Progress",
  order: 13,
};
