// Finds every game under ./games automatically: drop in a folder with meta.ts and index.tsx and it
// appears in the Arcade at /arcade/<id>.
import type { ComponentType } from "react";
import { CATEGORIES, type GameMeta, type GameProps } from "./types";

// Games still being built are left out of the Arcade (and the production bundle) until they pass their checks.
// Remove an id from both lists when its game is finished.
const metas = import.meta.glob<{ meta: GameMeta }>(
  [
    "./games/*/meta.ts",
    "!./games/chess/**", "!./games/checkers/**", "!./games/four-in-a-row/**", "!./games/klondike/**",
    "!./games/word-guess/**", "!./games/slither-arena/**", "!./games/sling-siege/**",
  ],
  { eager: true },
);
const loaders = import.meta.glob<{ default: ComponentType<GameProps> }>([
  "./games/*/index.tsx",
  "!./games/chess/**", "!./games/checkers/**", "!./games/four-in-a-row/**", "!./games/klondike/**",
  "!./games/word-guess/**", "!./games/slither-arena/**", "!./games/sling-siege/**",
]);

export const GAMES: GameMeta[] = Object.values(metas)
  .map((m) => m.meta)
  .filter((m): m is GameMeta => !!m && typeof m.id === "string")
  .sort(
    (a, b) =>
      CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category) ||
      (a.order ?? 50) - (b.order ?? 50) ||
      a.title.localeCompare(b.title),
  );

export const gameById = (id: string) => GAMES.find((g) => g.id === id);

/** Lazy loader for a game's component, or undefined if there's no such game. */
export function gameLoader(id: string) {
  return loaders[`./games/${id}/index.tsx`];
}
