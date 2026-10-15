// Dead Hours: a round-based zombie survival shooter. Hold out in a boarded-up house as the waves get
// bigger and faster: buy guns off the walls, open rooms, turn on the power, drink perks, gamble on the
// Mystery Box and upgrade your gun.
import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";
import { Link } from "react-router-dom";
import { Canvas, useFrame } from "@react-three/fiber";
import Arena from "@/zombies/scene/Arena";
import Zombies from "@/zombies/scene/Zombies";
import Effects from "@/zombies/scene/Effects";
import { CameraRig, ViewModel } from "@/zombies/scene/ViewModel";
import { Hud } from "@/zombies/Hud";
import { TouchControls } from "@/zombies/TouchControls";
import { heartbeat, isMuted, playSfx, setMuted, startAmbient, stopAmbient, unlockAudio } from "@/zombies/sound";
import { NO_INPUT, newGame, step, type Action, type GameState, type Input } from "@/zombies/engine/game";

// ---------------------------------------------------------------- settings

type ControlMode = "auto" | "touch" | "mouse";

interface Settings {
  sensitivity: number;
  fov: number;
  controls: ControlMode;
}

const SETTINGS_KEY = "dead-hours-settings";
const BEST_KEY = "dead-hours-best";
const DEFAULTS: Settings = { sensitivity: 1, fov: 78, controls: "auto" };

function loadSettings(): Settings {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}") };
  } catch {
    return DEFAULTS;
  }
}

function saveSettings(s: Settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    // Not saved; fine for this visit.
  }
}

function loadBest(): number {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}

/** Touch controls only when the device has no mouse at all (touchscreen laptops keep mouse and keyboard). */
function detectTouch(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(pointer: coarse)").matches && !window.matchMedia("(any-pointer: fine)").matches;
}

const useTouch = (mode: ControlMode) => (mode === "auto" ? detectTouch() : mode === "touch");

// ---------------------------------------------------------------- the loop

function GameLoop({
  game, input, actions, active,
}: {
  game: MutableRefObject<GameState>;
  input: MutableRefObject<Input>;
  actions: MutableRefObject<Action[]>;
  active: boolean;
}) {
  const beat = useRef(0);
  useFrame((_, dt) => {
    const g = game.current;
    if (active) step(g, input.current, Math.min(dt, 0.05), actions.current.splice(0));
    else actions.current.length = 0;
    const p = g.player;
    const listener = { x: p.x, z: p.z, yaw: p.yaw };
    for (const s of g.sfx.splice(0)) playSfx(s, listener);
    // A heartbeat when you're nearly down.
    beat.current -= dt;
    if (active && g.phase !== "over" && p.downed <= 0 && p.hp < p.maxHp * 0.4 && beat.current <= 0) {
      heartbeat();
      beat.current = 0.85;
    }
  });
  return null;
}

// ---------------------------------------------------------------- the game

function Game({ settings, onQuit, onBest }: { settings: Settings; onQuit: () => void; onBest: (round: number) => void }) {
  const [run, setRun] = useState(0);
  const game = useRef<GameState>(newGame());
  const input = useRef<Input>({ ...NO_INPUT });
  const actions = useRef<Action[]>([]);
  const container = useRef<HTMLDivElement>(null);
  const touch = useTouch(settings.controls);
  const [locked, setLocked] = useState(false);
  // When the browser refuses pointer lock (some embeds do), play with a free mouse instead.
  const [freeMouse, setFreeMouse] = useState(false);
  const [freePlaying, setFreePlaying] = useState(false);
  const [touchPlaying, setTouchPlaying] = useState(false);
  const [muted, setMutedState] = useState(isMuted);
  const [best, setBest] = useState(loadBest);
  const [, setTick] = useState(0);
  const started = useRef(false);
  // The input handlers live for the whole game; this gives them the current free-mouse state.
  const freePlayingRef = useRef(freePlaying);
  freePlayingRef.current = freePlaying;

  const playing = touch ? touchPlaying : locked || freePlaying;
  // Dev builds only: lets automated browser checks stage scenes. Stripped from production builds.
  if (import.meta.env.DEV) (window as unknown as { __deadHours?: MutableRefObject<GameState> }).__deadHours = game;
  const over = game.current.phase === "over";

  const clearInput = () => {
    input.current = { ...NO_INPUT };
    actions.current.length = 0;
  };

  const play = useCallback(() => {
    unlockAudio();
    startAmbient();
    started.current = true;
    if (touch) {
      setTouchPlaying(true);
      try {
        void document.documentElement.requestFullscreen?.().catch(() => {});
      } catch {
        // Fullscreen is a nice-to-have.
      }
      return;
    }
    if (freeMouse) {
      setFreePlaying(true);
      return;
    }
    const el = container.current;
    if (!el) return;
    const fallback = () => {
      setFreeMouse(true);
      setFreePlaying(true);
    };
    try {
      const r = el.requestPointerLock() as unknown as Promise<void> | undefined;
      r?.catch?.(fallback);
    } catch {
      fallback();
    }
  }, [touch, freeMouse]);

  const pause = useCallback(() => {
    clearInput();
    setTouchPlaying(false);
    setFreePlaying(false);
    if (document.pointerLockElement) document.exitPointerLock?.();
  }, []);

  const restart = useCallback(() => {
    game.current = newGame();
    clearInput();
    setRun((r) => r + 1);
    started.current = false;
    play();
  }, [play]);

  const toggleMute = useCallback(() => {
    setMuted(!isMuted());
    setMutedState(isMuted());
  }, []);

  // HUD refresh at 20 Hz. On game over: free the mouse and keep the best round.
  useEffect(() => {
    const id = window.setInterval(() => {
      const g = game.current;
      if (g.phase === "over") {
        if (document.pointerLockElement) document.exitPointerLock?.();
        const survived = Math.max(0, g.round - 1);
        if (survived > loadBest()) {
          try {
            localStorage.setItem(BEST_KEY, String(survived));
          } catch {
            // Not saved.
          }
          setBest(survived);
          onBest(survived);
        }
      }
      setTick((t) => t + 1);
    }, 50);
    return () => window.clearInterval(id);
  }, [onBest]);

  useEffect(() => () => stopAmbient(), []);

  useEffect(() => {
    const sens = 0.0022 * settings.sensitivity;
    const isLocked = () => document.pointerLockElement === container.current;
    const capturing = () => isLocked() || freePlayingRef.current;
    const onLockChange = () => {
      const l = isLocked();
      setLocked(l);
      if (!l) clearInput();
    };
    const onLockError = () => {
      setFreeMouse(true);
      setFreePlaying(true);
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!capturing() || game.current.phase === "over") return;
      const p = game.current.player;
      const k = sens * (1 - p.ads * 0.45);
      p.yaw -= e.movementX * k;
      p.pitch = Math.max(-1.45, Math.min(1.45, p.pitch - e.movementY * k));
    };
    const onMouseDown = (e: MouseEvent) => {
      if (!capturing()) return;
      if (e.button === 0) {
        actions.current.push("fire");
        input.current.fire = true;
      } else if (e.button === 2) input.current.aim = true;
    };
    const onMouseUp = (e: MouseEvent) => {
      if (e.button === 0) input.current.fire = false;
      else if (e.button === 2) input.current.aim = false;
    };
    const onContextMenu = (e: MouseEvent) => {
      if (capturing()) e.preventDefault();
    };
    const onWheel = (e: WheelEvent) => {
      if (capturing() && Math.abs(e.deltaY) > 10) actions.current.push("swap");
    };
    const setKey = (code: string, down: boolean) => {
      const i = input.current;
      switch (code) {
        case "KeyW": case "ArrowUp": i.forward = down; return true;
        case "KeyS": case "ArrowDown": i.back = down; return true;
        case "KeyA": case "ArrowLeft": i.left = down; return true;
        case "KeyD": case "ArrowRight": i.right = down; return true;
        case "Space": i.jump = down; return true;
        case "ShiftLeft": case "ShiftRight": i.sprint = down; return true;
        case "KeyE": i.use = down; return false;
      }
      return false;
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "KeyM" && !e.repeat) {
        toggleMute();
        return;
      }
      if (e.code === "Escape" && freePlayingRef.current) {
        pause();
        return;
      }
      if (!capturing()) return;
      if (setKey(e.code, true)) {
        e.preventDefault();
        return;
      }
      if (e.repeat) return;
      const map: Partial<Record<string, Action>> = {
        KeyE: "use", KeyR: "reload", KeyQ: "swap", Digit1: "swap", Digit2: "swap", KeyG: "grenade", KeyV: "melee", KeyF: "melee",
      };
      const a = map[e.code];
      if (a) {
        e.preventDefault();
        actions.current.push(a);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => setKey(e.code, false);
    document.addEventListener("pointerlockchange", onLockChange);
    document.addEventListener("pointerlockerror", onLockError);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      document.removeEventListener("pointerlockchange", onLockChange);
      document.removeEventListener("pointerlockerror", onLockError);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      if (document.pointerLockElement) document.exitPointerLock?.();
    };
  }, [settings.sensitivity, toggleMute, pause]);

  const paused = !playing && !over;

  return (
    <div
      ref={container}
      className="fixed inset-0 bg-black"
      style={{ touchAction: "none", cursor: freePlaying ? "none" : undefined }}
    >
      <Canvas key={run} camera={{ fov: settings.fov, near: 0.05, far: 90 }} gl={{ antialias: true, powerPreference: "high-performance" }} dpr={[1, 1.5]}>
        <color attach="background" args={["#04050a"]} />
        <fog attach="fog" args={["#06070c", 7, 44]} />
        <GameLoop game={game} input={input} actions={actions} active={playing || over} />
        <CameraRig game={game} fov={settings.fov} />
        <Arena game={game} />
        <Zombies game={game} />
        <Effects game={game} />
        <ViewModel game={game} />
      </Canvas>
      {touch && playing && !over && <TouchControls game={game} input={input} actions={actions} onPause={pause} />}
      <Hud game={game} touch={touch} best={best} onRestart={restart} onQuit={onQuit} />
      {paused && (
        <div className="absolute inset-0 flex justify-center overflow-y-auto bg-black/60 p-4">
          <div className="my-auto h-fit w-full max-w-sm space-y-3 rounded-xl border border-red-900/50 bg-zinc-950/95 p-5 text-center text-white">
            <h2 className="text-2xl font-black text-red-600" style={{ fontFamily: "Impact, 'Arial Black', sans-serif" }}>
              {started.current ? "PAUSED" : "READY?"}
            </h2>
            <button type="button" className="w-full rounded-md bg-red-700 py-2.5 font-bold hover:bg-red-600" onClick={play}>
              {started.current ? "Resume" : "Start"}
            </button>
            {freeMouse && !touch && (
              <p className="text-[11px] text-amber-300/80">
                This page can't capture the mouse, so it moves freely: keep it over the game. Esc pauses.
              </p>
            )}
            <div className="flex gap-2">
              <button type="button" className="flex-1 rounded-md border border-white/20 py-2 text-sm hover:bg-white/10" onClick={toggleMute}>
                {muted ? "🔇 Sound off" : "🔊 Sound on"}
              </button>
              <button type="button" className="flex-1 rounded-md border border-white/20 py-2 text-sm hover:bg-white/10" onClick={onQuit}>
                Quit
              </button>
            </div>
            <Controls touch={touch} />
          </div>
        </div>
      )}
    </div>
  );
}

function Controls({ touch }: { touch: boolean }) {
  const rows: [string, string][] = touch
    ? [
        ["Left side", "Drag to move · push to the edge to sprint"],
        ["Right side", "Drag to look"],
        ["✹ / ◎", "Fire (hold for automatic guns) / aim down sights"],
        ["Use", "Buy guns, ammo, doors, perks, the box · hold at a window to rebuild"],
        ["⟳ ⇄ 💣 🔪", "Reload, swap guns, throw a grenade, knife"],
      ]
    : [
        ["WASD / Mouse", "Move / look"],
        ["Left / right click", "Fire / aim down sights"],
        ["Shift / Space", "Sprint / jump"],
        ["E", "Buy guns, ammo, doors, perks, the box · hold at a window to rebuild"],
        ["R / Q or wheel", "Reload / swap guns"],
        ["G / V", "Grenade / knife"],
        ["M / Esc", "Mute / pause"],
      ];
  return (
    <table className="w-full text-left text-xs">
      <tbody>
        {rows.map(([k, v]) => (
          <tr key={k} className="border-t border-white/10">
            <td className="py-1 pr-2 font-mono text-red-400">{k}</td>
            <td className="py-1 text-white/75">{v}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ---------------------------------------------------------------- the menu

export default function DeadHours() {
  const [playing, setPlaying] = useState(false);
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [best, setBest] = useState(loadBest);
  const touch = useTouch(settings.controls);
  const update = (patch: Partial<Settings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveSettings(next);
  };

  if (playing) return <Game settings={settings} onQuit={() => setPlaying(false)} onBest={setBest} />;

  return (
    <div
      className="min-h-screen p-4 text-white"
      style={{ background: "radial-gradient(ellipse at top, #3a0606 0%, #120303 45%, #000 100%)" }}
    >
      <div className="mx-auto max-w-lg space-y-5 pt-8">
        <div className="flex justify-between text-xs text-white/60">
          <Link to="/arcade" className="hover:text-white">← Arcade</Link>
          <Link to="/" className="hover:text-white">Home</Link>
        </div>
        <div>
          <h1
            className="text-6xl font-black tracking-tight text-red-600 sm:text-7xl"
            style={{ fontFamily: "Impact, 'Arial Black', sans-serif", textShadow: "0 0 24px rgba(200,0,0,0.5), 4px 4px 0 #000" }}
          >
            DEAD HOURS
          </h1>
          <p className="mt-2 text-sm text-white/75">
            Hold out in a boarded-up house as the dead come in waves, each round bigger and faster than the last. Earn
            points for every hit, then spend them: guns off the walls, doors to new rooms, the power switch, perks, the
            Mystery Box, and an Upgrade Station that turns your gun into something terrible.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setPlaying(true)}
          className="w-full rounded-md bg-red-700 py-3 text-lg font-black tracking-wide hover:bg-red-600"
          style={{ fontFamily: "Impact, 'Arial Black', sans-serif" }}
        >
          PLAY
        </button>
        {best > 0 && <p className="text-center text-sm text-white/70">Best: survived {best} round{best === 1 ? "" : "s"}</p>}

        <div className="space-y-3 rounded-lg border border-white/10 bg-black/40 p-3 text-sm">
          <h2 className="font-semibold">Settings</h2>
          <label className="flex items-center justify-between gap-3">
            <span className="text-white/75">Controls</span>
            <select
              value={settings.controls}
              onChange={(e) => update({ controls: e.target.value as ControlMode })}
              className="rounded border border-white/20 bg-zinc-900 px-2 py-1"
            >
              <option value="auto">Automatic ({detectTouch() ? "touch" : "mouse & keyboard"})</option>
              <option value="mouse">Mouse & keyboard</option>
              <option value="touch">Touch</option>
            </select>
          </label>
          <label className="flex items-center justify-between gap-3">
            <span className="text-white/75">Look sensitivity</span>
            <input type="range" min={0.3} max={2.5} step={0.05} value={settings.sensitivity} onChange={(e) => update({ sensitivity: Number(e.target.value) })} />
          </label>
          <label className="flex items-center justify-between gap-3">
            <span className="text-white/75">Field of view ({settings.fov}°)</span>
            <input type="range" min={65} max={100} step={1} value={settings.fov} onChange={(e) => update({ fov: Number(e.target.value) })} />
          </label>
        </div>

        <div className="rounded-lg border border-white/10 bg-black/40 p-3">
          <h2 className="mb-1 text-sm font-semibold">Controls</h2>
          <Controls touch={touch} />
        </div>
        <div className="rounded-lg border border-white/10 bg-black/40 p-3 text-xs text-white/70">
          <h2 className="mb-1 text-sm font-semibold text-white">How it works</h2>
          <ul className="list-disc space-y-0.5 pl-4">
            <li>10 points a hit, 60 a kill, 100 for a headshot kill, 130 with the knife.</li>
            <li>Zombies tear boards off the windows: hold Use at a window to nail them back (10 points a board).</li>
            <li>Find the power switch to wake up the perk machines and the Upgrade Station.</li>
            <li>Power-ups drop now and then: Max Ammo, Insta-Kill, Double Points, Nuke, Carpenter.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
