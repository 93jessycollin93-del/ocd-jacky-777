// Primal Isle on-screen UI: vitals, compass, hotbar, prompts, crafting/inventory, storage, tames, death screen.
import type { MutableRefObject } from "react";
import { ITEMS, RECIPES, isEquippable, type ItemId } from "./engine/items";
import {
  assignHotbar, bedSpawn, canCraft, count, craft, isNight, respawn, timeOfDay, transfer, xpForLevel, type GameState,
} from "./engine/game";
import { promptFor } from "./engine/prompt";

function Bar({ label, value, max, color, compact }: { label: string; value: number; max: number; color: string; compact?: boolean }) {
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className={compact ? "w-4" : "w-14 text-white/80"}>{compact ? label.slice(0, 1) : label}</span>
      <div className={`h-2.5 ${compact ? "w-24" : "w-36"} rounded-full bg-black/50 overflow-hidden border border-white/10`}>
        <div className="h-full rounded-full transition-[width]" style={{ width: `${(value / max) * 100}%`, background: color }} />
      </div>
      {!compact && <span className="w-12 tabular-nums text-white/70">{Math.ceil(value)}/{max}</span>}
    </div>
  );
}

function clockText(state: GameState) {
  const minutes = Math.floor(timeOfDay(state) * 24 * 60);
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

const CARDINALS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

/** Degrees clockwise from north (-z) for a direction on the ground plane. */
const bearingOf = (dx: number, dz: number) => ((Math.atan2(dx, -dz) * 180) / Math.PI + 360) % 360;

function Compass({ state }: { state: GameState }) {
  const p = state.player;
  const heading = bearingOf(Math.sin(p.yaw), Math.cos(p.yaw));
  const marks: { label: string; deg: number; strong?: boolean }[] = CARDINALS.map((label, i) => ({
    label,
    deg: i * 45,
    strong: label.length === 1,
  }));
  const bed = bedSpawn(state);
  if (bed) marks.push({ label: `🛏️ ${Math.round(Math.hypot(bed.x - p.x, bed.z - p.z))}m`, deg: bearingOf(bed.x - p.x, bed.z - p.z) });
  return (
    <div className="absolute left-1/2 top-3 h-6 w-64 -translate-x-1/2 overflow-hidden rounded-full bg-black/40 text-[11px] backdrop-blur-sm">
      {marks.map((m) => {
        const off = ((m.deg - heading + 540) % 360) - 180; // -180..180
        if (Math.abs(off) > 75) return null;
        return (
          <span
            key={m.label}
            className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap ${m.strong ? "font-bold text-amber-300" : "text-white/75"}`}
            style={{ left: `${50 + (off / 75) * 50}%` }}
          >
            {m.label}
          </span>
        );
      })}
      <span className="absolute left-1/2 top-0 h-1.5 w-px bg-white" />
    </div>
  );
}

function ItemTile({ id, n, onClick, hint }: { id: ItemId; n: number; onClick?: () => void; hint?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      title={hint ? `${ITEMS[id].name} — ${hint}` : ITEMS[id].name}
      className="flex flex-col items-center rounded border border-white/10 bg-black/40 p-1.5 text-[10px] enabled:hover:border-amber-300"
    >
      <span className="text-xl">{ITEMS[id].icon}</span>
      <span className="w-full truncate text-center">{ITEMS[id].name}</span>
      <span className="text-white/70">×{n}</span>
    </button>
  );
}

export function Hud({
  game,
  panel,
  setPanel,
  storageId,
  onChange,
  touch,
}: {
  game: MutableRefObject<GameState>;
  panel: boolean;
  setPanel: (open: boolean) => void;
  /** When set, the panel shows this storage box instead of crafting. */
  storageId: number | null;
  onChange: () => void;
  touch: boolean;
}) {
  const g = game.current;
  const p = g.player;
  const prompt = promptFor(g);
  const tames = g.creatures.filter((c) => c.tamed && c.state !== "dead");
  const box = storageId == null ? null : g.structures.find((s) => s.id === storageId) ?? null;
  const inventory = Object.keys(g.inventory) as ItemId[];

  return (
    <div className="pointer-events-none absolute inset-0 select-none font-sans text-white">
      {p.hurtFlash > 0 && <div className="absolute inset-0 bg-red-600/25" />}

      {!panel && !p.dead && (
        <div className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/90 shadow" />
      )}
      {prompt && !panel && (
        <div className="absolute left-1/2 top-[56%] max-w-[90vw] -translate-x-1/2 rounded bg-black/55 px-3 py-1 text-center text-xs">
          {touch ? prompt.replace(/\bClick\b/g, "Hit").replace(/\bE:/g, "Use:").replace(/\bR:/g, "Ride:") : prompt}
        </div>
      )}

      {!p.dead && <Compass state={g} />}

      {/* top-left: day/time, log, and (on touch) the vitals */}
      <div className="absolute left-3 top-3 space-y-1">
        <div className="text-sm font-semibold drop-shadow">
          Day {g.day} · {clockText(g)} {isNight(g) ? "🌙" : "☀️"}
        </div>
        {(touch ? g.log.slice(-2) : g.log).map((l) => (
          <div key={l.id} className="max-w-[45vw] text-xs text-white/85 drop-shadow">{l.text}</div>
        ))}
      </div>

      <div
        className={`absolute space-y-1 rounded-lg bg-black/35 p-2 backdrop-blur-sm ${
          touch ? "right-3 top-12" : "bottom-24 left-4"
        }`}
      >
        <div className="text-[11px] text-white/80">
          Lv {p.level} · XP {Math.floor(p.xp)}/{xpForLevel(p.level)}
          {p.mountId ? " · 🦕 riding" : ""}
        </div>
        <Bar label="Health" value={p.hp} max={p.maxHp} color="#ef4444" compact={touch} />
        <Bar label="Stamina" value={p.stamina} max={p.maxStamina} color="#facc15" compact={touch} />
        <Bar label="Food" value={p.food} max={100} color="#f97316" compact={touch} />
        <Bar label="Water" value={p.water} max={100} color="#38bdf8" compact={touch} />
      </div>

      {/* hotbar: click/tap a slot to select it */}
      <div className={`absolute left-1/2 flex -translate-x-1/2 gap-1 ${touch ? "bottom-2" : "bottom-4"}`}>
        {g.hotbar.map((id, i) => (
          <button
            key={i}
            type="button"
            onClick={() => {
              g.selected = i;
              onChange();
            }}
            className={`pointer-events-auto relative flex items-center justify-center rounded-md border ${
              touch ? "h-10 w-10 text-xl" : "h-12 w-12 text-2xl"
            } ${i === g.selected ? "border-amber-300 bg-black/60" : "border-white/20 bg-black/40"}`}
          >
            <span className="absolute left-1 top-0 text-[9px] text-white/60">{i + 1}</span>
            {id && <span title={ITEMS[id].name}>{ITEMS[id].icon}</span>}
            {id && count(g, id) > 1 && <span className="absolute bottom-0 right-1 text-[10px]">{count(g, id)}</span>}
          </button>
        ))}
      </div>

      {tames.length > 0 && !touch && (
        <div className="absolute right-4 top-12 w-48 space-y-1 rounded-lg bg-black/35 p-2 text-[11px] backdrop-blur-sm">
          <div className="font-semibold">Tames</div>
          {tames.map((c) => (
            <div key={c.id} className="flex justify-between">
              <span>{c.name}</span>
              <span className="text-white/70">{c.id === p.mountId ? "ridden" : c.state} · {Math.ceil(c.hp)}hp</span>
            </div>
          ))}
        </div>
      )}

      {panel && !p.dead && (
        <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-black/50 p-3">
          <div className="grid max-h-[88vh] w-full max-w-3xl gap-4 overflow-y-auto rounded-xl border border-white/15 bg-zinc-900/95 p-4 md:grid-cols-2">
            <div>
              <h2 className="mb-2 text-sm font-semibold">Inventory</h2>
              {inventory.length === 0 ? (
                <p className="text-xs text-white/60">Empty. Punch trees and bushes to gather.</p>
              ) : (
                <div className="grid grid-cols-4 gap-1.5">
                  {inventory.map((id) => (
                    <ItemTile
                      key={id}
                      id={id}
                      n={count(g, id)}
                      hint={box ? "store all" : isEquippable(id) ? `put in hotbar slot ${g.selected + 1}` : undefined}
                      onClick={
                        box
                          ? () => { transfer(g, box.id, id, "deposit"); onChange(); }
                          : isEquippable(id)
                            ? () => { assignHotbar(g, id, g.selected); onChange(); }
                            : undefined
                      }
                    />
                  ))}
                </div>
              )}
              <p className="mt-3 text-[11px] text-white/50">
                {box
                  ? "Tap an item to store all of it. Boxes keep their contents when you die."
                  : `Tap a tool, food or block to put it in hotbar slot ${g.selected + 1} (pick the slot first with 1–8 or a tap).`}
              </p>
            </div>

            {box ? (
              <div>
                <h2 className="mb-2 text-sm font-semibold">📦 Storage Box</h2>
                {Object.keys(box.items ?? {}).length === 0 ? (
                  <p className="text-xs text-white/60">Empty.</p>
                ) : (
                  <div className="grid grid-cols-4 gap-1.5">
                    {(Object.entries(box.items ?? {}) as [ItemId, number][]).map(([id, n]) => (
                      <ItemTile key={id} id={id} n={n} hint="take all" onClick={() => { transfer(g, box.id, id, "withdraw"); onChange(); }} />
                    ))}
                  </div>
                )}
              </div>
            ) : (
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
            )}

            <button
              type="button"
              onClick={() => setPanel(false)}
              className="rounded border border-white/20 py-2 text-xs hover:bg-white/10 md:col-span-2"
            >
              Close{touch ? "" : " (Tab)"}
            </button>
          </div>
        </div>
      )}

      {p.dead && (
        <div className="pointer-events-auto absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 p-4 text-center">
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
            {bedSpawn(g) ? "Respawn at your sleeping bag" : "Respawn on the beach"}
          </button>
        </div>
      )}
    </div>
  );
}
