import type { GameMeta } from "../../types";

export const meta: GameMeta = {
  id: "crazy-eights",
  title: "Crazy Eights",
  emoji: "🎴",
  category: "Board & Cards",
  blurb: "The classic shedding card game against one to three computer players. Match the suit or the rank, play an eight to change the suit, and be first to empty your hand. First to 200 points wins the match.",
  controls: {
    desktop: "Click a card to play it · click the deck to draw · after drawing, play the card or keep it",
    touch: "Tap a card to play it · tap the deck to draw",
  },
  accent: "#10b981",
  tags: ["Cards", "vs Computer"],
  scoreLabel: "Best match",
  order: 6,
};
