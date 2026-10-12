// Dead Hours on-screen display: round tallies, points, ammo, perks, power-ups, crosshair and hit
// markers, prompts, the damage vignette, scope, banners, being downed, and the game-over screen.
import { useRef, type MutableRefObject } from "react";
import { ARENA, currentWeapon, promptFor, roundProgress, type GameState } from "./engine/game";
import { cellOf, zoneAt } from "./engine/map";
import { PERKS, POWER_UPS, WEAPONS, magSize, weaponName } from "./engine/weapons";

const HORROR = "Impact, 'Haettenschweiler', 'Arial Narrow Bold', 'Arial Black', sans-serif";

/** Tally marks for rounds 1–5, then the number, in dripping red. */
function RoundCounter({ round }: { round: number }) {
  if (round <= 0) return null;
  return (
    <div key={round} className="dh-round-in select-none" style={{ fontFamily: HORROR, color: "#b3120f", textShadow: "0 0 12px rgba(160,0,0,0.6), 2px 2px 0 #300" }}>
      {round <= 5 ? (
        <svg
          width={round === 5 ? 130 : 26 * round + 10}
          height="86"
          viewBox={`0 0 ${round === 5 ? 130 : 26 * round + 10} 86`}
          style={{ filter: "drop-shadow(0 0 8px rgba(170,0,0,0.65)) drop-shadow(2px 2px 0 #300)" }}
        >
          {Array.from({ length: Math.min(round, 4) }, (_, i) => (
            <path key={i} d={`M${14 + i * 26} 6 Q${11 + i * 26 + (i % 2) * 3} 44 ${12 + i * 26} 78`} stroke="#b3120f" strokeWidth="10" strokeLinecap="round" fill="none" />
          ))}
          {round === 5 && <path d="M2 60 L122 22" stroke="#b3120f" strokeWidth="10" strokeLinecap="round" />}
        </svg>
      ) : (
        <span className="text-7xl leading-none">{round}</span>
      )}
    </div>
  );
}

function Crosshair({ g, hitAt, killAt }: { g: GameState; hitAt: number; killAt: number }) {
  const p = g.player;
  const w = currentWeapon(g);
  const def = w ? WEAPONS[w.id] : null;
  const aimed = p.ads > 0.6 && def?.cls !== "shotgun";
  const spread = def ? def.spread * (1 + ((def.cls === "shotgun" ? 0.6 : 0.22) - 1) * p.ads) * (p.moving ? 1.5 : 1) * (p.y > 0.05 ? 2 : 1) : 0.02;
  const gap = 6 + spread * 420 + p.kick * 160;
  const since = performance.now() - hitAt;
  const sinceKill = performance.now() - killAt;
  const marker = since < 180 || sinceKill < 260;
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2">
      {!aimed && !p.sprinting && p.downed <= 0 && (
        <>
          {[0, 90, 180, 270].map((r) => (
            <div
              key={r}
              className="absolute bg-white/85 shadow-[0_0_2px_black]"
              style={{ width: 2, height: 9, left: -1, top: -4.5, transform: `rotate(${r}deg) translateY(${-gap - 4}px)` }}
            />
          ))}
          <div className="absolute h-[3px] w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/80" />
        </>
      )}
      {marker &&
        [45, 135, 225, 315].map((r) => (
          <div
            key={r}
            className="absolute"
            style={{
              width: 2.5, height: 10, left: -1.25, top: -5,
              background: sinceKill < 260 ? "#ff3b30" : "#ffffff",
              boxShadow: "0 0 2px black",
              transform: `rotate(${r}deg) translateY(-11px)`,
            }}
          />
        ))}
    </div>
  );
}

function Scope() {
  return (
    <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(circle at center, transparent 0 32vmin, rgba(0,0,0,0.97) 32.5vmin)" }}>
      <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-black/90" />
      <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-black/90" />
      <div className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-600" />
    </div>
  );
}

export interface HudProps {
  game: MutableRefObject<GameState>;
  touch: boolean;
  best: number;
  onRestart: () => void;
  onQuit: () => void;
}

export function Hud({ game, touch, best, onRestart, onQuit }: HudProps) {
  const g = game.current;
  const p = g.player;
  const w = currentWeapon(g);
  // Hit markers: notice new hits and kills since the last render.
  const seen = useRef({ hits: g.stats.hits, kills: g.stats.kills, hitAt: 0, killAt: 0 });
  const s = seen.current;
  if (g.stats.hits > s.hits) s.hitAt = performance.now();
  if (g.stats.kills > s.kills) s.killAt = performance.now();
  s.hits = g.stats.hits;
  s.kills = g.stats.kills;

  const prompt = promptFor(g)?.replace("{use}", touch ? "Use:" : "[E]");
  const hurt = 1 - p.hp / p.maxHp;
  const recentHit = g.time - p.hurtAt < 0.35;
  const scoped = !!w && WEAPONS[w.id].cls === "sniper" && p.ads > 0.92;
  const room = ARENA.zoneNames[zoneAt(ARENA, cellOf(p.x), cellOf(p.z))] ?? "";
  const { left } = roundProgress(g);
  const lowAmmo = w && w.mag <= Math.ceil(magSize(w) * 0.25);
  const over = g.phase === "over";

  return (
    <div className="pointer-events-none absolute inset-0 select-none overflow-hidden text-white" style={{ fontFamily: "system-ui, sans-serif" }}>
      <style>{`
        @keyframes dhRoundIn { 0% { transform: scale(2.2); opacity: 0; filter: blur(4px) } 40% { opacity: 1; filter: blur(0) } 100% { transform: scale(1) } }
        .dh-round-in { animation: dhRoundIn 1.4s ease-out both; transform-origin: left bottom }
        @keyframes dhPop { 0% { transform: translateY(0); opacity: 1 } 100% { transform: translateY(-38px); opacity: 0 } }
        @keyframes dhBlink { 50% { opacity: 0.25 } }
      `}</style>

      {/* damage: a red edge that thickens as you get hurt, and a flash on each hit */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at center, transparent ${55 - hurt * 30}%, rgba(120,0,0,${Math.min(0.85, hurt * 0.9)}) 100%)`,
        }}
      />
      {recentHit && <div className="absolute inset-0 bg-red-700/25" />}
      {scoped && <Scope />}
      {!over && <Crosshair g={g} hitAt={s.hitAt} killAt={s.killAt} />}

      {/* top-left: where you are, and what's left */}
      {!over && g.round > 0 && (
        <div className="absolute left-3 top-3 text-xs text-white/70 drop-shadow">
          <div className="font-semibold text-white/85">{room}</div>
          {g.phase === "active" ? <div>{left} left this round</div> : <div>Next round in {Math.ceil(g.phaseTimer)}s</div>}
          {!g.power && <div className="text-amber-300/80">Power is off</div>}
        </div>
      )}

      {/* bottom-left: perks over the round counter */}
      <div className={`absolute left-4 space-y-2 ${touch ? "bottom-[46%]" : "bottom-4"}`}>
        <div className="flex gap-1.5">
          {p.perks.map((id) => (
            <div
              key={id}
              title={PERKS[id].name}
              className="flex h-8 w-8 items-center justify-center rounded-full border-2 text-[10px] font-black"
              style={{ borderColor: PERKS[id].color, background: `${PERKS[id].color}33`, color: PERKS[id].color, fontFamily: HORROR }}
            >
              {PERKS[id].badge}
            </div>
          ))}
        </div>
        <RoundCounter round={g.round} />
      </div>

      {/* bottom-centre: active power-ups */}
      <div className="absolute bottom-24 left-1/2 flex -translate-x-1/2 gap-3">
        {g.insta > 0 && <PowerTimer icon={POWER_UPS.insta_kill.icon} left={g.insta} color={POWER_UPS.insta_kill.color} />}
        {g.double > 0 && <PowerTimer icon={POWER_UPS.double_points.icon} left={g.double} color={POWER_UPS.double_points.color} />}
      </div>

      {/* bottom-right: points, gun, ammo, grenades */}
      <div className={`absolute right-4 text-right ${touch ? "top-14" : "bottom-4"}`}>
        <div className="relative">
          <div className="text-3xl font-black tabular-nums" style={{ fontFamily: HORROR, color: "#f4d35e", textShadow: "2px 2px 0 #000" }}>
            {p.points.toLocaleString()}
          </div>
          {g.popups.map((pop, i) => (
            <div
              key={pop.id}
              className="absolute right-0 text-lg font-black"
              style={{ top: -8 - i * 2, color: pop.amount > 10 ? "#fde68a" : "#fef3c7", fontFamily: HORROR, animation: "dhPop 1.2s ease-out forwards", textShadow: "1px 1px 0 #000" }}
            >
              +{pop.amount}
            </div>
          ))}
        </div>
        {w && (
          <>
            <div className="mt-1 text-xs uppercase tracking-widest text-white/75">
              <span className={w.upgraded ? "text-fuchsia-300" : ""}>{weaponName(w)}</span>
            </div>
            <div className="text-2xl font-bold tabular-nums" style={{ fontFamily: HORROR, textShadow: "2px 2px 0 #000" }}>
              <span className={w.mag === 0 ? "text-red-500" : lowAmmo ? "text-amber-300" : ""}>{w.mag}</span>
              <span className="text-white/50"> / {w.reserve}</span>
            </div>
          </>
        )}
        <div className="mt-0.5 flex justify-end gap-1">
          {Array.from({ length: p.grenades }, (_, i) => (
            <span key={i} className="inline-block h-3 w-2.5 rounded-sm bg-lime-800 ring-1 ring-lime-500/60" />
          ))}
        </div>
      </div>

      {/* centre: reload hint and what you can buy */}
      {w && !over && p.downed <= 0 && w.mag === 0 && w.reserve > 0 && p.reload <= 0 && (
        <div className="absolute left-1/2 top-[58%] -translate-x-1/2 text-sm font-bold text-amber-300" style={{ animation: "dhBlink 0.8s infinite" }}>
          {touch ? "Tap ⟳ to reload" : "Press R to reload"}
        </div>
      )}
      {w && !over && w.mag === 0 && w.reserve === 0 && (
        <div className="absolute left-1/2 top-[58%] -translate-x-1/2 text-sm font-bold text-red-400">No ammo: buy more off the wall</div>
      )}
      {prompt && !over && (
        <div className="absolute left-1/2 top-[64%] -translate-x-1/2 rounded bg-black/55 px-3 py-1.5 text-center text-sm text-white shadow">
          {prompt}
        </div>
      )}
      {p.drink > 0 && (
        <div className="absolute left-1/2 top-[70%] -translate-x-1/2 text-xs text-white/70">Drinking…</div>
      )}

      {/* banners: rounds, power, power-ups */}
      {g.banner && (
        <div
          className="absolute left-1/2 top-[22%] -translate-x-1/2 text-center"
          style={{ opacity: Math.min(1, (3.2 - g.banner.age) * 2, g.banner.age * 4) }}
        >
          <div
            className="text-4xl font-black uppercase tracking-wide sm:text-5xl"
            style={{
              fontFamily: HORROR,
              color: g.banner.tone === "round" || g.banner.tone === "danger" ? "#c1121f" : g.banner.tone === "power" ? "#8bd3ff" : "#fde047",
              textShadow: "0 0 18px rgba(0,0,0,0.9), 3px 3px 0 #000",
            }}
          >
            {g.banner.text}
          </div>
          {g.banner.sub && <div className="mt-1 text-sm text-white/80 drop-shadow">{g.banner.sub}</div>}
        </div>
      )}

      {p.downed > 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40" style={{ backdropFilter: "grayscale(0.8)" }}>
          <div className="text-4xl font-black text-red-500" style={{ fontFamily: HORROR }}>DOWN</div>
          <div className="text-sm text-white/80">Second Wind: back on your feet in {Math.ceil(p.downed)}…</div>
        </div>
      )}

      {over && <GameOver g={g} best={best} onRestart={onRestart} onQuit={onQuit} />}
    </div>
  );
}

function PowerTimer({ icon, left, color }: { icon: string; left: number; color: string }) {
  return (
    <div className="flex flex-col items-center" style={{ animation: left < 5 ? "dhBlink 0.4s infinite" : undefined }}>
      <div className="flex h-11 w-11 items-center justify-center rounded-full text-xl" style={{ background: `${color}33`, boxShadow: `0 0 14px ${color}` }}>
        {icon}
      </div>
      <div className="text-[11px] font-bold tabular-nums">{Math.ceil(left)}s</div>
    </div>
  );
}

function GameOver({ g, best, onRestart, onQuit }: { g: GameState; best: number; onRestart: () => void; onQuit: () => void }) {
  const survived = Math.max(0, g.round - 1);
  const acc = g.stats.shots ? Math.round((g.stats.hits / g.stats.shots) * 100) : 0;
  const rows: [string, string][] = [
    ["Kills", `${g.stats.kills}`],
    ["Headshots", `${g.stats.headshots}`],
    ["Points earned", g.stats.earned.toLocaleString()],
    ["Accuracy", `${acc}%`],
    ["Downs", `${g.stats.downs}`],
    ["Time", `${Math.floor(g.time / 60)}:${String(Math.floor(g.time % 60)).padStart(2, "0")}`],
  ];
  return (
    <div className="pointer-events-auto absolute inset-0 flex items-center justify-center overflow-y-auto bg-black/75 p-4">
      <div className="w-full max-w-sm space-y-4 text-center">
        <div className="text-6xl font-black text-red-600" style={{ fontFamily: HORROR, textShadow: "3px 3px 0 #000" }}>GAME OVER</div>
        <div className="text-lg text-white/90">
          You survived <b className="text-red-400">{survived}</b> round{survived === 1 ? "" : "s"}
          {survived > 0 && survived >= best && <div className="text-sm text-amber-300">New best!</div>}
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 rounded-lg border border-white/10 bg-black/50 p-3 text-left text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="contents">
              <span className="text-white/60">{k}</span>
              <span className="text-right font-semibold tabular-nums">{v}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onRestart} className="flex-1 rounded-md bg-red-700 py-2.5 font-bold hover:bg-red-600">Play again</button>
          <button type="button" onClick={onQuit} className="flex-1 rounded-md border border-white/25 py-2.5 hover:bg-white/10">Main menu</button>
        </div>
      </div>
    </div>
  );
}

