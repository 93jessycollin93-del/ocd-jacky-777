// Primal Isle on-screen UI: vitals, hotbar, prompts, crafting/inventory panel, tames, death screen.
import type { MutableRefObject } from "react";
import { ITEMS, RECIPES, type ItemId } from "./engine/items";
import { canCraft, count, craft, isNight, respawn, timeOfDay, xpForLevel, type GameState } from "./engine/game";
import { promptFor } from "./engine/prompt";

function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="w-14 text-white/80">{label}</span>
      <div className="h-2.5 w-36 rounded-full bg-black/50 overflow-hidden border border-white/10">
        <div className="h-full rounded-full transition-[width]" style={{ width: `${(value / max) * 100}%`, background: color }} />
      </div>
      <span className="w-12 tabular-nums text-white/70">{Math.ceil(value)}/{max}</span>
    </div>
  );
}

function clockText(state: GameState) {
  const minutes = Math.floor(timeOfDay(state) * 24 * 60);
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

export function Hud({
  game,
  panel,
  setPanel,
  onChange,
}: {
  game: MutableRefObject<GameState>;
  panel: boolean;
  setPanel: (open: boolean) => void;
  onChange: () => void;
}) {
  const g = game.current;
  const p = g.player;
  const prompt = promptFor(g);
  const tames = g.creatures.filter((c) => c.tamed && c.state !== "dead");

  return (
    <div className="pointer-events-none absolute inset-0 select-none font-sans text-white">
      {p.hurtFlash > 0 && <div className="absolute inset-0 bg-red-600/25" />}

      {/* crosshair */}
      {!panel && !p.dead && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-white/90 shadow" />
      )}
      {prompt && !panel && (
        <div className="absolute left-1/2 top-[56%] -translate-x-1/2 rounded bg-black/55 px-3 py-1 text-xs">{prompt}</div>
      )}

      {/* top: day/time + log */}
      <div className="absolute left-4 top-4 space-y-1">
        <div className="text-sm font-semibold drop-shadow">
          Day {g.day} · {clockText(g)} {isNight(g) ? "🌙" : "☀️"}
        </div>
        {g.log.map((l) => (
          <div key={l.id} className="text-xs text-white/85 drop-shadow">{l.text}</div>
        ))}
      </div>

      {/* vitals */}
      <div className="absolute bottom-24 left-4 space-y-1 rounded-lg bg-black/35 p-2 backdrop-blur-sm">
        <div className="text-[11px] text-white/80">
          Level {p.level} · XP {Math.floor(p.xp)}/{xpForLevel(p.level)}
          {p.mountId ? " · 🦕 riding" : ""}
        </div>
        <Bar label="Health" value={p.hp} max={p.maxHp} color="#ef4444" />
        <Bar label="Stamina" value={p.stamina} max={p.maxStamina} color="#facc15" />
        <Bar label="Food" value={p.food} max={100} color="#f97316" />
        <Bar label="Water" value={p.water} max={100} color="#38bdf8" />
      </div>

      {/* hotbar */}
      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5">
        {g.hotbar.map((id, i) => (
          <div
            key={i}
            className={`relative flex h-12 w-12 items-center justify-center rounded-md border text-2xl ${
              i === g.selected ? "border-amber-300 bg-black/60" : "border-white/20 bg-black/40"
            }`}
          >
            <span className="absolute left-1 top-0 text-[9px] text-white/60">{i + 1}</span>
            {id && <span title={ITEMS[id].name}>{ITEMS[id].icon}</span>}
            {id && count(g, id) > 1 && <span className="absolute bottom-0 right-1 text-[10px]">{count(g, id)}</span>}
          </div>
        ))}
      </div>

      {/* tames */}
      {tames.length > 0 && (
        <div className="absolute right-4 top-4 w-48 space-y-1 rounded-lg bg-black/35 p-2 text-[11px] backdrop-blur-sm">
          <div className="font-semibold">Tames</div>
          {tames.map((c) => (
            <div key={c.id} className="flex justify-between">
              <span>{c.name}</span>
              <span className="text-white/70">{c.id === p.mountId ? "ridden" : c.state} · {Math.ceil(c.hp)}hp</span>
            </div>
          ))}
        </div>
      )}

      {/* crafting + inventory */}
      {panel && !p.dead && (
        <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-black/50 p-4">
          <div className="grid max-h-[85vh] w-full max-w-3xl gap-4 overflow-y-auto rounded-xl border border-white/15 bg-zinc-900/95 p-4 md:grid-cols-2">
            <div>
              <h2 className="mb-2 text-sm font-semibold">Inventory</h2>
              {Object.keys(g.inventory).length === 0 ? (
                <p className="text-xs text-white/60">Empty. Punch trees and bushes to gather.</p>
              ) : (
                <div className="grid grid-cols-4 gap-1.5">
                  {(Object.keys(g.inventory) as ItemId[]).map((id) => (
                    <div key={id} className="flex flex-col items-center rounded border border-white/10 bg-black/40 p-1.5 text-[10px]" title={ITEMS[id].name}>
                      <span className="text-xl">{ITEMS[id].icon}</span>
                      <span className="truncate w-full text-center">{ITEMS[id].name}</span>
                      <span className="text-white/70">×{count(g, id)}</span>
                    </div>
                  ))}
                </div>
              )}
              <p className="mt-3 text-[11px] text-white/50">Tools, food and buildings go on the hotbar automatically (keys 1–8).</p>
            </div>
            <div>
              <h2 className="mb-2 text-sm font-semibold">Crafting</h2>
              <div className="space-y-1.5">
                {RECIPES.map((r) => {
                  const check = canCraft(g, r);
                  return (
                    <button
                      key={r.id}
                      type="button"
                      disabled={!check.ok}
                      onClick={() => {
                        craft(g, r.id);
                        onChange();
                      }}
                      className="flex w-full items-center gap-2 rounded border border-white/10 bg-black/40 p-2 text-left text-xs enabled:hover:border-amber-300 disabled:opacity-45"
                    >
                      <span className="text-xl">{ITEMS[r.output].icon}</span>
                      <span className="flex-1">
                        <span className="block font-medium">{ITEMS[r.output].name}</span>
                        <span className="block text-[10px] text-white/65">
                          {Object.entries(r.cost).map(([id, n]) => (
                            <span key={id} className={count(g, id as ItemId) >= (n ?? 0) ? "" : "text-red-400"}>
                              {ITEMS[id as ItemId].icon}{count(g, id as ItemId)}/{n}{" "}
                            </span>
                          ))}
                        </span>
                      </span>
                      {!check.ok && <span className="text-[10px] text-white/50">{check.reason}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPanel(false)}
              className="rounded border border-white/20 py-1.5 text-xs hover:bg-white/10 md:col-span-2"
            >
              Close (Tab)
            </button>
          </div>
        </div>
      )}

      {p.dead && (
        <div className="pointer-events-auto absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70">
          <div className="text-3xl font-bold text-red-400">You died</div>
          <div className="text-sm text-white/70">{g.log[g.log.length - 1]?.text}</div>
          <button
            type="button"
            className="rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-black hover:bg-amber-400"
            onClick={() => {
              respawn(g);
              onChange();
            }}
          >
            Respawn on the beach
          </button>
        </div>
      )}
    </div>
  );
}
