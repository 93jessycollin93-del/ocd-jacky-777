// Phone and tablet controls for Dead Hours: a move stick (push to the rim to sprint), drag to look,
// and buttons for fire, aim, reload, use, swap, grenade, knife, jump and pause.
import { useRef, useState, type MutableRefObject, type ReactNode, type TouchList as ReactTouchList } from "react";
import type { Action, GameState, Input } from "./engine/game";

const STICK_RADIUS = 52;
const DEAD_ZONE = 10;
const LOOK_SENSITIVITY = 0.0055;

function Btn({
  label, onDown, onUp, className = "", children, active = false,
}: {
  label: string;
  onDown: () => void;
  onUp?: () => void;
  className?: string;
  children: ReactNode;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onTouchStart={(e) => {
        e.stopPropagation();
        onDown();
      }}
      onTouchEnd={(e) => {
        e.stopPropagation();
        // Stop the follow-up "ghost" click landing on whatever opens under your finger.
        if (e.cancelable) e.preventDefault();
        onUp?.();
      }}
      onTouchCancel={() => onUp?.()}
      className={`pointer-events-auto flex items-center justify-center rounded-full border text-white shadow-lg ${
        active ? "border-red-400 bg-red-700/60" : "border-white/25 bg-black/45 active:bg-white/25"
      } ${className}`}
    >
      {children}
    </button>
  );
}

export function TouchControls({
  game, input, actions, onPause,
}: {
  game: MutableRefObject<GameState>;
  input: MutableRefObject<Input>;
  actions: MutableRefObject<Action[]>;
  onPause: () => void;
}) {
  const stick = useRef<{ id: number; x: number; y: number } | null>(null);
  const look = useRef<{ id: number; x: number; y: number } | null>(null);
  const [knob, setKnob] = useState<{ ox: number; oy: number; dx: number; dy: number } | null>(null);
  const [aiming, setAiming] = useState(false);
  const find = (list: ReactTouchList, id: number) => {
    for (let i = 0; i < list.length; i++) if (list[i].identifier === id) return list[i];
    return undefined;
  };
  const push = (a: Action) => actions.current.push(a);

  const releaseStick = () => {
    stick.current = null;
    setKnob(null);
    Object.assign(input.current, { forward: false, back: false, left: false, right: false, sprint: false });
  };

  return (
    <div className="absolute inset-0 select-none" style={{ touchAction: "none", WebkitTouchCallout: "none" }} onContextMenu={(e) => e.preventDefault()}>
      {/* move: left 40% */}
      <div
        className="absolute bottom-0 left-0 top-1/4 w-2/5"
        onTouchStart={(e) => {
          const t = e.changedTouches[0];
          if (stick.current || !t) return;
          stick.current = { id: t.identifier, x: t.clientX, y: t.clientY };
          setKnob({ ox: t.clientX, oy: t.clientY, dx: 0, dy: 0 });
        }}
        onTouchMove={(e) => {
          const s = stick.current;
          const t = s && find(e.changedTouches, s.id);
          if (!s || !t) return;
          let dx = t.clientX - s.x;
          let dy = t.clientY - s.y;
          const mag = Math.hypot(dx, dy);
          if (mag > STICK_RADIUS) {
            dx = (dx / mag) * STICK_RADIUS;
            dy = (dy / mag) * STICK_RADIUS;
          }
          Object.assign(input.current, {
            forward: dy < -DEAD_ZONE,
            back: dy > DEAD_ZONE,
            left: dx < -DEAD_ZONE,
            right: dx > DEAD_ZONE,
            sprint: mag > STICK_RADIUS * 1.15 && dy < -DEAD_ZONE,
          });
          setKnob({ ox: s.x, oy: s.y, dx, dy });
        }}
        onTouchEnd={(e) => {
          if (stick.current && find(e.changedTouches, stick.current.id)) releaseStick();
        }}
        onTouchCancel={releaseStick}
      />
      {knob && (
        <div className="pointer-events-none absolute" style={{ left: knob.ox - STICK_RADIUS, top: knob.oy - STICK_RADIUS }}>
          <div className="relative rounded-full border-2 border-white/30 bg-white/10" style={{ width: STICK_RADIUS * 2, height: STICK_RADIUS * 2 }}>
            <div className="absolute h-10 w-10 rounded-full bg-white/60" style={{ left: STICK_RADIUS - 20 + knob.dx, top: STICK_RADIUS - 20 + knob.dy }} />
          </div>
        </div>
      )}
      {!knob && <div className="pointer-events-none absolute bottom-24 left-8 text-[11px] text-white/40">drag to move · push to the edge to sprint</div>}

      {/* look: the rest of the screen */}
      <div
        className="absolute bottom-0 right-0 top-0 w-3/5"
        onTouchStart={(e) => {
          const t = e.changedTouches[0];
          if (look.current || !t) return;
          look.current = { id: t.identifier, x: t.clientX, y: t.clientY };
        }}
        onTouchMove={(e) => {
          const l = look.current;
          const t = l && find(e.changedTouches, l.id);
          if (!l || !t) return;
          const p = game.current.player;
          // Finer turning while aiming.
          const k = LOOK_SENSITIVITY * (1 - p.ads * 0.55);
          p.yaw -= (t.clientX - l.x) * k;
          p.pitch = Math.max(-1.45, Math.min(1.45, p.pitch - (t.clientY - l.y) * k));
          l.x = t.clientX;
          l.y = t.clientY;
        }}
        onTouchEnd={(e) => {
          if (look.current && find(e.changedTouches, look.current.id)) look.current = null;
        }}
        onTouchCancel={() => (look.current = null)}
      />

      {/* buttons */}
      <div className="pointer-events-none absolute bottom-4 right-3 grid grid-cols-4 items-end gap-2">
        <Btn label="Knife" onDown={() => push("melee")} className="h-11 w-11 text-lg">🔪</Btn>
        <Btn label="Grenade" onDown={() => push("grenade")} className="h-11 w-11 text-lg">💣</Btn>
        <Btn label="Swap weapon" onDown={() => push("swap")} className="h-11 w-11 text-lg">⇄</Btn>
        <Btn label="Reload" onDown={() => push("reload")} className="h-11 w-11 text-lg">⟳</Btn>
        <Btn
          label="Use, buy, rebuild"
          onDown={() => {
            push("use");
            input.current.use = true;
          }}
          onUp={() => (input.current.use = false)}
          className="h-14 w-14 text-sm font-bold"
        >
          Use
        </Btn>
        <Btn label="Jump" onDown={() => (input.current.jump = true)} onUp={() => (input.current.jump = false)} className="h-12 w-12 text-xl">⤒</Btn>
        <Btn
          label="Aim down sights"
          active={aiming}
          onDown={() => {
            const next = !aiming;
            setAiming(next);
            input.current.aim = next;
          }}
          className="h-14 w-14 text-xl"
        >
          ◎
        </Btn>
        <Btn
          label="Fire"
          onDown={() => {
            push("fire");
            input.current.fire = true;
          }}
          onUp={() => (input.current.fire = false)}
          className="h-20 w-20 border-red-400/60 text-3xl"
        >
          ✹
        </Btn>
      </div>
      <Btn label="Pause" onDown={onPause} className="absolute right-3 top-3 h-9 w-9 text-sm">⏸</Btn>
    </div>
  );
}
