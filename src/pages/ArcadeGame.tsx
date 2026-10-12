// /arcade/:id: loads one Arcade game into the shared shell.
import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from "react";
import { Link, useParams } from "react-router-dom";
import { GameShell } from "@/arcade/GameShell";
import { gameById, gameLoader } from "@/arcade/registry";
import type { GameProps } from "@/arcade/types";

const cache = new Map<string, LazyExoticComponent<ComponentType<GameProps>>>();

function lazyGame(id: string) {
  let c = cache.get(id);
  const load = gameLoader(id);
  if (!c && load) {
    c = lazy(load);
    cache.set(id, c);
  }
  return c;
}

export default function ArcadeGame() {
  const { id = "" } = useParams();
  const meta = gameById(id);
  const Game = meta ? lazyGame(id) : undefined;
  if (!meta || !Game) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-black p-6 text-white">
        <div className="text-4xl">🕹️</div>
        <div className="text-lg font-bold">No game called “{id}”</div>
        <Link to="/arcade" className="rounded-lg bg-white/10 px-4 py-2 text-sm hover:bg-white/20">Back to the Arcade</Link>
      </div>
    );
  }
  return (
    <GameShell
      meta={meta}
      render={(props) => (
        <Suspense fallback={<div className="flex h-full items-center justify-center text-sm text-white/50">Loading {meta.title}…</div>}>
          <Game key={meta.id} {...props} />
        </Suspense>
      )}
    />
  );
}
