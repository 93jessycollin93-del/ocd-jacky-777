// The bag: inventory with real weights, item details, crafting by category with a timed queue,
// station status, tool repair, and storage boxes.
import { useState } from "react";
import {
  ITEMS, RECIPES, RECIPE_CATEGORIES, STATION_NAMES, isEquippable,
  type ItemId, type Recipe, type RecipeCategory, type StationId,
} from "./engine/items";
import {
  assignHotbar, canCraft, cancelCraft, carryCapacity, carryWeight, count, craftBlocker, encumbrance, maxDurability,
  nearStation, queueCraft, repairCost, repairTool, toolDurability, transfer, MAX_CRAFT_QUEUE,
  type GameState, type Structure,
} from "./engine/game";

const STATION_ICONS: Record<StationId, string> = { campfire: "🔥", workbench: "🪚", forge: "🏭" };

function DurabilityBar({ value, max }: { value: number; max: number }) {
  const r = value / max;
  return (
    <div className="h-1 w-full overflow-hidden rounded bg-black/60">
      <div
        className="h-full"
        style={{ width: `${r * 100}%`, background: r > 0.5 ? "#4ade80" : r > 0.2 ? "#facc15" : "#ef4444" }}
      />
    </div>
  );
}

function ItemTile({
  g, id, n, onClick, onInspect, hint, selected,
}: {
  g: GameState;
  id: ItemId;
  n: number;
  onClick?: () => void;
  onInspect?: () => void;
  hint?: string;
  selected?: boolean;
}) {
  const def = ITEMS[id];
  const dur = toolDurability(g, id);
  const max = maxDurability(id);
  return (
    <button
      type="button"
      onClick={() => {
        onInspect?.();
        onClick?.();
      }}
      onMouseEnter={onInspect}
      title={`${def.name} — ${def.desc}${hint ? ` (${hint})` : ""}`}
      className={`flex flex-col items-center gap-0.5 rounded border p-1.5 text-[10px] hover:border-amber-300 ${
        selected ? "border-amber-300 bg-amber-300/10" : "border-white/10 bg-black/40"
      }`}
    >
      <span className="text-xl leading-none">{def.icon}</span>
      <span className="w-full truncate text-center">{def.name}</span>
      <span className="text-white/70">×{n} · {(def.weight * n).toFixed(1)}kg</span>
      {dur !== undefined && max !== undefined && <DurabilityBar value={dur} max={max} />}
    </button>
  );
}

function CostChips({ g, cost }: { g: GameState; cost: Recipe["cost"] }) {
  return (
    <span className="flex flex-wrap gap-x-1.5 text-[10px]">
      {Object.entries(cost).map(([id, n]) => {
        const have = count(g, id as ItemId);
        return (
          <span key={id} className={have >= (n ?? 0) ? "text-white/75" : "text-red-400"} title={ITEMS[id as ItemId].name}>
            {ITEMS[id as ItemId].icon}
            {have}/{n}
          </span>
        );
      })}
    </span>
  );
}

function WeightBar({ g }: { g: GameState }) {
  const kg = carryWeight(g);
  const cap = carryCapacity(g);
  const load = encumbrance(g);
  const color = load.level === "ok" ? "#4ade80" : load.level === "heavy" ? "#facc15" : "#ef4444";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[11px]">
        <span>
          Weight <b className="tabular-nums">{kg.toFixed(1)}</b> / {cap} kg
        </span>
        <span style={{ color }}>
          {load.level === "ok" ? "Unburdened" : load.level === "heavy" ? "Heavy: slower, tires faster" : "Overloaded: can't sprint or jump"}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded bg-black/60">
        <div className="h-full" style={{ width: `${Math.min(100, (kg / (cap * 1.5)) * 100)}%`, background: color }} />
      </div>
    </div>
  );
}

export function BagPanel({
  g,
  box,
  onChange,
  onClose,
  touch,
}: {
  g: GameState;
  box: Structure | null;
  onChange: () => void;
  onClose: () => void;
  touch: boolean;
}) {
  const [category, setCategory] = useState<RecipeCategory | "All">("All");
  const [search, setSearch] = useState("");
  const [inspect, setInspect] = useState<ItemId | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const inventory = (Object.keys(g.inventory) as ItemId[]).sort(
    (a, b) => ITEMS[a].kind.localeCompare(ITEMS[b].kind) || ITEMS[a].name.localeCompare(ITEMS[b].name),
  );
  const stations = (Object.keys(STATION_NAMES) as StationId[]).map((s) => ({ id: s, near: nearStation(g, s) }));
  const atBench = nearStation(g, "workbench");
  const worn = inventory.filter((id) => {
    const max = maxDurability(id);
    return max !== undefined && (toolDurability(g, id) ?? max) < max;
  });
  const q = search.trim().toLowerCase();
  const recipes = RECIPES.filter(
    (r) =>
      (category === "All" || r.category === category) &&
      (!q || ITEMS[r.output].name.toLowerCase().includes(q) || r.category.toLowerCase().includes(q)),
  );
  const blocker = craftBlocker(g);
  const shown = inspect && ITEMS[inspect];

  const act = (result: { ok: boolean; reason?: string }) => {
    setMessage(result.ok ? null : result.reason ?? null);
    onChange();
  };

  return (
    <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-black/50 p-2 sm:p-3">
      <div className="grid max-h-[94vh] w-full max-w-5xl gap-3 overflow-y-auto rounded-xl border border-white/15 bg-zinc-900/95 p-3 sm:p-4 md:grid-cols-2">
        {/* ---------------- left: inventory */}
        <div className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold">Inventory</h2>
            <span className="text-[10px] text-white/50">
              {box ? "Tap to store all" : `Tap to put in hotbar slot ${g.selected + 1}`}
            </span>
          </div>
          <WeightBar g={g} />
          {inventory.length === 0 ? (
            <p className="text-xs text-white/60">Empty. Punch trees and bushes to gather.</p>
          ) : (
            <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
              {inventory.map((id) => (
                <ItemTile
                  key={id}
                  g={g}
                  id={id}
                  n={count(g, id)}
                  selected={inspect === id}
                  onInspect={() => setInspect(id)}
                  hint={box ? "store all" : isEquippable(id) ? `hotbar slot ${g.selected + 1}` : undefined}
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

          {shown && (
            <div className="rounded border border-white/10 bg-black/40 p-2 text-[11px]">
              <div className="font-semibold">
                {shown.icon} {shown.name} <span className="font-normal text-white/50">· {shown.weight} kg each</span>
              </div>
              <div className="text-white/70">{shown.desc}</div>
              {shown.tool && (
                <div className="mt-1 text-white/60">
                  Damage {shown.tool.damage}
                  {shown.tool.torpor ? ` · Knock-out ${shown.tool.torpor}` : ""} · Reach {shown.tool.reach} m
                  {maxDurability(shown.id) !== undefined && ` · Condition ${toolDurability(g, shown.id)}/${maxDurability(shown.id)}`}
                </div>
              )}
            </div>
          )}

          {!box && worn.length > 0 && (
            <div className="space-y-1.5">
              <h3 className="text-xs font-semibold">
                Repair {atBench ? "" : <span className="font-normal text-white/50">(stand near a Workbench)</span>}
              </h3>
              {worn.map((id) => {
                const cost = repairCost(g, id) ?? {};
                return (
                  <button
                    key={id}
                    type="button"
                    disabled={!atBench}
                    onClick={() => act(repairTool(g, id))}
                    className="flex w-full items-center gap-2 rounded border border-white/10 bg-black/40 p-1.5 text-left text-xs enabled:hover:border-amber-300 disabled:opacity-50"
                  >
                    <span className="text-lg">{ITEMS[id].icon}</span>
                    <span className="flex-1">
                      <span className="block">{ITEMS[id].name}</span>
                      <DurabilityBar value={toolDurability(g, id) ?? 0} max={maxDurability(id) ?? 1} />
                    </span>
                    <CostChips g={g} cost={cost} />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ---------------- right: storage box, or crafting */}
        {box ? (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold">📦 Storage Box</h2>
            {Object.keys(box.items ?? {}).length === 0 ? (
              <p className="text-xs text-white/60">Empty. Tap items on the left to store them.</p>
            ) : (
              <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
                {(Object.entries(box.items ?? {}) as [ItemId, number][]).map(([id, n]) => (
                  <ItemTile
                    key={id}
                    g={g}
                    id={id}
                    n={n}
                    hint="take all"
                    onInspect={() => setInspect(id)}
                    onClick={() => { transfer(g, box.id, id, "withdraw"); onChange(); }}
                  />
                ))}
              </div>
            )}
            <p className="text-[11px] text-white/50">Boxes keep their contents when you die.</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">Crafting</h2>
              <div className="flex gap-1.5 text-[10px]">
                {stations.map((s) => (
                  <span
                    key={s.id}
                    className={`rounded border px-1.5 py-0.5 ${s.near ? "border-green-400/60 text-green-300" : "border-white/10 text-white/40"}`}
                    title={s.near ? `${STATION_NAMES[s.id]} nearby` : `No ${STATION_NAMES[s.id]} nearby`}
                  >
                    {STATION_ICONS[s.id]} {STATION_NAMES[s.id]}
                  </span>
                ))}
              </div>
            </div>

            {/* queue */}
            {g.craftQueue.length > 0 && (
              <div className="space-y-1 rounded border border-white/10 bg-black/40 p-2">
                <div className="flex justify-between text-[11px] text-white/70">
                  <span>Queue {g.craftQueue.length}/{MAX_CRAFT_QUEUE}</span>
                  {blocker && <span className="text-amber-300">{blocker}</span>}
                </div>
                {g.craftQueue.map((job, i) => {
                  const r = RECIPES.find((x) => x.id === job.recipeId);
                  if (!r) return null;
                  const done = i === 0 ? 1 - Math.max(0, job.left) / job.total : 0;
                  return (
                    <div key={job.id} className="flex items-center gap-2 text-xs">
                      <span>{ITEMS[r.output].icon}</span>
                      <span className="w-28 truncate">{ITEMS[r.output].name}{r.count > 1 ? ` ×${r.count}` : ""}</span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded bg-black/60">
                        <div className="h-full bg-amber-400" style={{ width: `${done * 100}%` }} />
                      </div>
                      <span className="w-9 text-right tabular-nums text-white/60">{Math.ceil(job.left)}s</span>
                      <button
                        type="button"
                        aria-label={`Cancel ${ITEMS[r.output].name}`}
                        title="Cancel and get the materials back"
                        onClick={() => { cancelCraft(g, job.id); onChange(); }}
                        className="rounded px-1 text-white/60 hover:bg-white/10 hover:text-white"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* filters */}
            <div className="flex flex-wrap gap-1">
              {(["All", ...RECIPE_CATEGORIES] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`rounded px-2 py-0.5 text-[11px] ${category === c ? "bg-amber-400 text-black" : "bg-white/5 text-white/70 hover:bg-white/10"}`}
                >
                  {c}
                </button>
              ))}
            </div>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search recipes…"
              className="w-full rounded border border-white/10 bg-black/40 px-2 py-1 text-xs text-white placeholder:text-white/40"
            />
            {message && <p className="text-[11px] text-red-400">{message}</p>}

            <div className="space-y-1.5">
              {recipes.map((r) => {
                const check = canCraft(g, r);
                const full = g.craftQueue.length >= MAX_CRAFT_QUEUE;
                return (
                  <button
                    key={r.id}
                    type="button"
                    disabled={!check.ok || full}
                    onClick={() => act(queueCraft(g, r.id))}
                    onMouseEnter={() => setInspect(r.output)}
                    title={ITEMS[r.output].desc}
                    className="flex w-full items-center gap-2 rounded border border-white/10 bg-black/40 p-2 text-left text-xs enabled:hover:border-amber-300 disabled:opacity-45"
                  >
                    <span className="text-xl">{ITEMS[r.output].icon}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">
                        {ITEMS[r.output].name}
                        {r.count > 1 ? ` ×${r.count}` : ""}
                        <span className="ml-1.5 text-[10px] font-normal text-white/45">
                          ⏱{r.time}s{r.station ? ` · ${STATION_ICONS[r.station]} ${STATION_NAMES[r.station]}` : ""}
                        </span>
                      </span>
                      <CostChips g={g} cost={r.cost} />
                    </span>
                    {!check.ok && <span className="shrink-0 text-right text-[10px] text-white/50">{check.reason}</span>}
                  </button>
                );
              })}
              {recipes.length === 0 && <p className="text-xs text-white/50">No recipes match.</p>}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="rounded border border-white/20 py-2 text-xs hover:bg-white/10 md:col-span-2"
        >
          Close{touch ? "" : " (Tab)"}
        </button>
      </div>
    </div>
  );
}
