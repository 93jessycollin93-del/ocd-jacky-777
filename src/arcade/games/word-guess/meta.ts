import type { GameMeta } from "../../types";

export const meta: GameMeta = {
  id: "word-guess",
  title: "Word Guess",
  emoji: "🟩",
  category: "Puzzle",
  blurb:
    "Find the hidden five-letter word in six guesses. Green letters are in the right spot, amber ones are in the word but misplaced. A new daily word for everyone, or unlimited practice.",
  controls: {
    desktop: "Type letters · Enter to guess · Backspace to delete · or click the on-screen keyboard · Esc opens the menu",
    touch: "Tap the on-screen keyboard · Enter to guess · ⌫ to delete",
  },
  accent: "#3fae67",
  tags: ["Words", "Daily"],
  scoreOrder: "high",
  scoreLabel: "Best streak",
  order: 4,
};
