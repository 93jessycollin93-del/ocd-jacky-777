import type { GameMeta } from "../../types";

export const meta: GameMeta = {
  id: "sudoku",
  title: "Sudoku",
  emoji: "🔢",
  category: "Puzzle",
  blurb:
    "Fill the grid so every row, column and 3×3 box holds 1 to 9 exactly once. Every puzzle is freshly made with exactly one solution, in four difficulties, with pencil notes, hints and undo.",
  controls: {
    desktop: "Arrows move · 1-9 fill a cell · Shift+number or N for notes · Backspace erases · U undo · H hint · P pauses",
    touch: "Tap a cell, then tap a number · switch on Notes to pencil in candidates · Undo, Erase and Hint sit under the grid",
  },
  accent: "#22c55e",
  tags: ["Classic", "Logic"],
  scoreOrder: "low",
  scoreLabel: "Best (Medium)",
  scoreFormat: "time",
  order: 4,
};
