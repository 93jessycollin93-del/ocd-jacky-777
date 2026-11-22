// Finds every game under ./games automatically: drop in a folder with meta.ts and index.tsx and it
// appears in the Arcade at /arcade/<id>.
import type { ComponentType } from "react";
import { CATEGORIES, type GameMeta, type GameProps } from "./types";

// Every game here has shipped. To keep an unfinished game out of production builds (and the published
// Arcade) while still playing it in development, exclude its folder from both globs below, e.g.
// ["./games/*/meta.ts", "!./games/my-game/**"], and add a second glob for it behind import.meta.env.DEV.
const metas = import.meta.glob<{ meta: GameMeta }>("./games/*/meta.ts", { eager: true });
const loaders = import.meta.glob<{ default: ComponentType<GameProps> }>("./games/*/index.tsx");

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
