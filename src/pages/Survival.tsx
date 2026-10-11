// Primal Isle: a first-person survival game — gather, craft, build, and knock out and tame dinosaurs.
import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";
import { Link } from "react-router-dom";
import { Canvas, useFrame } from "@react-three/fiber";
import World from "@/survival/scene/World";
import { Hud } from "@/survival/Hud";
import {
  HOTBAR_SIZE, NO_INPUT, SAVE_KEY, count, deserialize, interact, log, newGame, serialize, step, toggleMount,
  primaryAction, type GameState, type Input,
} from "@/survival/engine/game";

const MOUSE_SENSITIVITY = 0.0022;

function readSave(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? deserialize(raw) : null;
  } catch {
    return null;
  }
}

function writeSave(state: GameState) {
  try {
    localStorage.setItem(SAVE_KEY, serialize(state));
  } catch {
    // Storage full or blocked (private mode): the game still runs, it just won't persist.
  }
}

function GameLoop({
  game,
  input,
  mouseDown,
  active,
}: {
  game: MutableRefObject<GameState>;
  input: MutableRefObject<Input>;
  mouseDown: MutableRefObject<boolean>;
  active: boolean;
}) {
  useFrame((_, dt) => {
    if (!active) return;
    const g = game.current;
    step(g, input.current, Math.min(dt, 0.05));
    if (mouseDown.current) primaryAction(g);
  });
  return null;
}

/** Eat the best food you're carrying. */
function quickEat(g: GameState) {
  const food = (["cooked_meat", "berries", "raw_meat"] as const).find((id) => count(g, id) > 0);
  if (!food) return log(g, "Nothing to eat. Bushes have berries.");
  const prev = g.selected;
  const slot = g.hotbar.indexOf(food);
  if (slot < 0) return;
  g.selected = slot;
  g.player.cooldown = 0;
  primaryAction(g);
  g.selected = prev;
}

function Game({ initial, onQuit }: { initial: GameState; onQuit: () => void }) {
  const game = useRef(initial);
  const input = useRef<Input>({ ...NO_INPUT });
  const mouseDown = useRef(false);
  const container = useRef<HTMLDivElement>(null);
  const [locked, setLocked] = useState(false);
  const [panel, setPanelState] = useState(false);
  const panelRef = useRef(false);
  const [, setTick] = useState(0);
  const rerender = useCallback(() => setTick((t) => t + 1), []);

  const lock = useCallback(() => {
    const el = container.current;
    if (!el || game.current.player.dead) return;
    try {
      const r = el.requestPointerLock() as unknown as Promise<void> | undefined;
      r?.catch?.(() => {});
    } catch {
      // Some embeds disallow pointer lock; the game is still playable with the pause overlay.
    }
  }, []);

  const setPanel = useCallback(
    (open: boolean) => {
      panelRef.current = open;
      setPanelState(open);
      if (open) document.exitPointerLock?.();
      else lock();
    },
    [lock],
  );

  // HUD refresh at 10 Hz; the 3D scene runs every frame on its own. Free the mouse on death so the
  // respawn button can be clicked.
  useEffect(() => {
    const id = window.setInterval(() => {
      if (game.current.player.dead && document.pointerLockElement) document.exitPointerLock?.();
      rerender();
    }, 100);
    return () => window.clearInterval(id);
  }, [rerender]);

  const afterHudAction = useCallback(() => {
    rerender();
    if (!panelRef.current && !game.current.player.dead) lock();
  }, [rerender, lock]);

  // Autosave.
  useEffect(() => {
    const id = window.setInterval(() => writeSave(game.current), 15000);
    const save = () => writeSave(game.current);
    window.addEventListener("beforeunload", save);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("beforeunload", save);
      save();
    };
  }, []);

  useEffect(() => {
    const onLockChange = () => {
      const isLocked = document.pointerLockElement === container.current;
      setLocked(isLocked);
      if (!isLocked) {
        input.current = { ...NO_INPUT };
        mouseDown.current = false;
        writeSave(game.current);
      }
    };
    const onMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== container.current) return;
      const p = game.current.player;
      p.yaw -= e.movementX * MOUSE_SENSITIVITY;
      p.pitch = Math.max(-1.45, Math.min(1.45, p.pitch - e.movementY * MOUSE_SENSITIVITY));
    };
    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 0 && document.pointerLockElement === container.current) mouseDown.current = true;
    };
    const onMouseUp = (e: MouseEvent) => {
      if (e.button === 0) mouseDown.current = false;
    };
    const onWheel = (e: WheelEvent) => {
      if (document.pointerLockElement !== container.current) return;
      const g = game.current;
      g.selected = (g.selected + (e.deltaY > 0 ? 1 : -1) + HOTBAR_SIZE) % HOTBAR_SIZE;
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
      }
      return false;
    };
    const onKeyDown = (e: KeyboardEvent) => {
      const g = game.current;
      if (e.code === "Tab" || e.code === "KeyI" || e.code === "KeyC") {
        e.preventDefault();
        if (!e.repeat) setPanel(!panelRef.current);
        return;
      }
      if (panelRef.current) return;
      if (document.pointerLockElement !== container.current) return;
      if (setKey(e.code, true)) {
        e.preventDefault();
        return;
      }
      if (e.repeat) return;
      if (/^Digit[1-8]$/.test(e.code)) g.selected = Number(e.code.slice(5)) - 1;
      else if (e.code === "KeyE") {
        const msg = interact(g);
        if (msg && !g.log.some((l) => l.text === msg)) log(g, msg);
      } else if (e.code === "KeyR") toggleMount(g);
      else if (e.code === "KeyQ") quickEat(g);
    };
    const onKeyUp = (e: KeyboardEvent) => setKey(e.code, false);

    document.addEventListener("pointerlockchange", onLockChange);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      document.removeEventListener("pointerlockchange", onLockChange);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      if (document.pointerLockElement) document.exitPointerLock?.();
    };
  }, [setPanel]);

  const paused = !locked && !panel && !game.current.player.dead;

  return (
    <div ref={container} className="fixed inset-0 bg-black">
      <Canvas shadows camera={{ fov: 75, near: 0.1, far: 1200 }} gl={{ antialias: true }} dpr={[1, 1.75]}>
        <World game={game} />
        <GameLoop game={game} input={input} mouseDown={mouseDown} active={locked || game.current.player.dead} />
      </Canvas>
      <Hud game={game} panel={panel} setPanel={setPanel} onChange={afterHudAction} />
      {paused && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-sm space-y-3 rounded-xl border border-white/15 bg-zinc-900/95 p-5 text-center text-white">
            <h2 className="text-xl font-bold">Paused</h2>
            <button type="button" className="w-full rounded-md bg-amber-500 py-2 font-semibold text-black hover:bg-amber-400" onClick={lock}>
              {game.current.time === initial.time ? "Play" : "Resume"}
            </button>
            <button
              type="button"
              className="w-full rounded-md border border-white/20 py-2 text-sm hover:bg-white/10"
              onClick={() => {
                writeSave(game.current);
                onQuit();
              }}
            >
              Save &amp; quit to menu
            </button>
            <Controls />
          </div>
        </div>
      )}
    </div>
  );
}

function Controls() {
  const rows: [string, string][] = [
    ["WASD / Mouse", "Move / look"],
    ["Shift / Space", "Sprint / jump (or swim up)"],
    ["Left click", "Use held item: punch, harvest, attack, eat, build"],
    ["1–8 / wheel", "Choose hotbar slot"],
    ["Tab / C / I", "Inventory & crafting"],
    ["E", "Feed a knocked-out dino · cook · drink · tame follow/stay"],
    ["R", "Ride / dismount a tame"],
    ["Q", "Quick eat"],
    ["Esc", "Pause"],
  ];
  return (
    <table className="w-full text-left text-xs">
      <tbody>
        {rows.map(([k, v]) => (
          <tr key={k} className="border-t border-white/10">
            <td className="py-1 pr-2 font-mono text-amber-300">{k}</td>
            <td className="py-1 text-white/75">{v}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function Survival() {
  const [game, setGame] = useState<GameState | null>(null);
  const [saved, setSaved] = useState<GameState | null>(() => readSave());

  if (game) {
    return (
      <Game
        key={game.seed + ":" + game.time}
        initial={game}
        onQuit={() => {
          setSaved(readSave());
          setGame(null);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-900 via-emerald-950 to-black p-4 text-white">
      <div className="mx-auto max-w-lg space-y-5 pt-10">
        <Link to="/" className="text-xs text-white/60 hover:text-white">← Back</Link>
        <div>
          <h1 className="text-4xl font-black tracking-tight">🦖 Primal Isle</h1>
          <p className="mt-2 text-sm text-white/75">
            Wash up on an island full of dinosaurs. Gather, craft tools, build a base, survive the night, then knock out
            dinos with a club and feed them until they're yours to ride.
          </p>
        </div>
        <div className="space-y-2">
          {saved && (
            <button
              type="button"
              className="w-full rounded-md bg-amber-500 py-2.5 font-semibold text-black hover:bg-amber-400"
              onClick={() => setGame(saved)}
            >
              Continue — Day {saved.day}, level {saved.player.level}
            </button>
          )}
          <button
            type="button"
            className={`w-full rounded-md py-2.5 font-semibold ${saved ? "border border-white/25 hover:bg-white/10" : "bg-amber-500 text-black hover:bg-amber-400"}`}
            onClick={() => {
              if (saved && !window.confirm("Start a new island? Your current save will be replaced.")) return;
              const fresh = newGame();
              writeSave(fresh);
              setGame(fresh);
            }}
          >
            New island
          </button>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/30 p-3">
          <h2 className="mb-1 text-sm font-semibold">Controls</h2>
          <Controls />
        </div>
        <p className="text-[11px] text-white/45">
          Needs a keyboard and mouse. Click the game to capture the mouse; progress saves in this browser.
        </p>
      </div>
    </div>
  );
}
