import type { GameMeta } from "../../types";

export const meta: GameMeta = {
  id: "klondike",
  title: "Klondike Solitaire",
  emoji: "🃏",
  category: "Board & Cards",
  blurb: "The classic patience game. Build the four suits up from Ace to King on the foundations, stacking the columns down in alternating colours. Draw one or draw three, and watch the cards cascade when you win.",
  controls: {
    desktop: "Drag cards or whole stacks · click a card to auto-move it · double-click sends it up to the foundation · click the stock to draw · Z to undo",
    touch: "Drag cards or stacks · tap a card to send it to its best place · double-tap to the foundation · tap the stock to draw",
  },
  accent: "#34d399",
  tags: ["Classic", "Cards", "Solitaire"],
  scoreOrder: "high",
  scoreLabel: "Best score",
  order: 4,
};
