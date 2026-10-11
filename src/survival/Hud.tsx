// Primal Isle on-screen UI: vitals, compass, hotbar, prompts, crafting/inventory, storage, tames, death screen.
import type { MutableRefObject } from "react";
import { ITEMS, RECIPES } from "./engine/items";
import {
  bedSpawn, count, craftBlocker, encumbrance, isNight, maxDurability, respawn, timeOfDay, toolDurability, xpForLevel,
  type GameState,
} from "./engine/game";
import { BagPanel } from "./BagPanel";
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
  for (const bag of state.structures.filter((s) => s.kind === "lootbag")) {
    marks.push({
      label: `💼 ${Math.round(Math.hypot(bag.x - p.x, bag.z - p.z))}m`,
      deg: bearingOf(bag.x - p.x, bag.z - p.z),
    });
  }
  return (
    <div className="absolute left-1/2 top-3 h-6 w-64 -translate-x-1/2 overflow-hidden rounded-full bg-black/40 text-[11px] backdrop-blur-sm">
      {marks.map((m) => {
        const off = ((m.deg - heading + 540) % 360) - 180; // -180..180
        if (Math.abs(off) > 75) return null;
        return (
          <span
            key={`${m.label}@${m.deg.toFixed(1)}`}
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

/** Injuries, healing, load and crafting at a glance. */
function StatusBadges({ g }: { g: GameState }) {
  const p = g.player;
  const load = encumbrance(g);
  const job = g.craftQueue[0];
  const recipe = job && RECIPES.find((r) => r.id === job.recipeId);
  const badges: { icon: string; text: string; tone: string }[] = [];
  if (p.bleeding === 2) badges.push({ icon: "🩸", text: "Heavy bleeding · tourniquet", tone: "text-red-400" });
  else if (p.bleeding === 1) badges.push({ icon: "🩸", text: "Bleeding · bandage", tone: "text-red-300" });
  if (p.fracture) badges.push({ icon: "🦴", text: "Broken leg · splint", tone: "text-orange-300" });
  if (p.regen) badges.push({ icon: "💊", text: `Healing +${Math.ceil(p.regen.left)}`, tone: "text-green-300" });
  if (load.level !== "ok") {
    badges.push({ icon: "🎒", text: load.level === "heavy" ? "Heavy load" : "Overloaded", tone: load.level === "heavy" ? "text-yellow-300" : "text-red-400" });
  }
  if (recipe) {
    const blocked = craftBlocker(g);
    badges.push({
      icon: "⚒️",
      text: blocked ? `${ITEMS[recipe.output].name}: paused` : `${ITEMS[recipe.output].name} ${Math.ceil(job.left)}s${g.craftQueue.length > 1 ? ` (+${g.craftQueue.length - 1})` : ""}`,
      tone: blocked ? "text-amber-300" : "text-white/80",
    });
  }
  if (!badges.length) return null;
  return (
    <div className="space-y-0.5 pt-1">
      {badges.map((b) => (
        <div key={b.text} className={`text-[11px] ${b.tone}`}>
          {b.icon} {b.text}
        </div>
      ))}
    </div>
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
        <StatusBadges g={g} />
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
            {id && maxDurability(id) !== undefined && (
              <span className="absolute bottom-0.5 left-1 right-1 h-0.5 overflow-hidden rounded bg-black/70">
                <span
                  className="block h-full"
                  style={{
                    width: `${((toolDurability(g, id) ?? 0) / (maxDurability(id) ?? 1)) * 100}%`,
                    background: (toolDurability(g, id) ?? 0) / (maxDurability(id) ?? 1) > 0.2 ? "#4ade80" : "#ef4444",
                  }}
                />
              </span>
            )}
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
        <BagPanel g={g} box={box} onChange={onChange} onClose={() => setPanel(false)} touch={touch} />
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
