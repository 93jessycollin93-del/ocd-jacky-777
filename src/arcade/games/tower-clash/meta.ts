import type { GameMeta } from "../../types";

export const meta: GameMeta = {
  id: "tower-clash",
  title: "Tower Clash",
  emoji: "🏰",
  category: "Strategy",
  blurb: "A real-time card battle across a river. Spend mana on troops, spells and buildings, defend your towers, push a lane and topple the enemy keep. Build your own deck of eight and climb the trophy road.",
  controls: {
    desktop: "Click a card (or 1–4), then click the arena to deploy · drag cards onto the arena · P or Esc pauses",
    touch: "Tap a card then tap the arena, or drag the card onto it",
  },
  accent: "#3b82f6",
  tags: ["Cards", "Real-time", "vs AI"],
  scoreLabel: "Trophies",
  order: 3,
};
