// Finds every game under ./games automatically: drop in a folder with meta.ts and index.tsx and it
// appears in the Arcade at /arcade/<id>.
import type { ComponentType } from "react";
import { CATEGORIES, type GameMeta, type GameProps } from "./types";

// Games still being built are left out of production builds (so out of the published Arcade, and their code
// can't break a deploy) until they pass their checks, but are listed in development so they can be played and
// tested. When a game ships, remove its id from all four brace lists below (they must be literal strings).
const metas = {
  ...import.meta.glob<{ meta: GameMeta }>(["./games/*/meta.ts", "!./games/{sea-battle,rope-snip,eight-ball,mini-golf,night-survivors,garden-defense,balloon-defense,tower-clash}/**"], { eager: true }),
  ...(import.meta.env.DEV
    ? import.meta.glob<{ meta: GameMeta }>("./games/{sea-battle,rope-snip,eight-ball,mini-golf,night-survivors,garden-defense,balloon-defense,tower-clash}/meta.ts", { eager: true })
    : {}),
};
const loaders = {
  ...import.meta.glob<{ default: ComponentType<GameProps> }>(["./games/*/index.tsx", "!./games/{sea-battle,rope-snip,eight-ball,mini-golf,night-survivors,garden-defense,balloon-defense,tower-clash}/**"]),
  ...(import.meta.env.DEV
    ? import.meta.glob<{ default: ComponentType<GameProps> }>("./games/{sea-battle,rope-snip,eight-ball,mini-golf,night-survivors,garden-defense,balloon-defense,tower-clash}/index.tsx")
    : {}),
};

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
