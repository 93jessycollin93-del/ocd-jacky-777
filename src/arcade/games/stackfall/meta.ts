import type { GameMeta } from "../../types";

export const meta: GameMeta = {
  id: "stackfall",
  title: "Stackfall",
  emoji: "🧱",
  category: "Puzzle",
  blurb:
    "Guide falling four-block pieces into a 10×20 well and complete rows to clear them. Hold a piece, plan around the next five, and chain quads and combos as the speed climbs every ten lines.",
  controls: {
    desktop: "← → move · ↓ soft drop · Space hard drop · Z / X rotate · C or Shift hold · P or Esc pause",
    touch: "Drag sideways to move · tap to rotate · slow drag down to soft-drop · fast swipe down to hard-drop · tap Hold",
  },
  accent: "#8b5cf6",
  tags: ["Classic", "Endless"],
  order: 1,
};
