// On-screen controls for phones and tablets: a move stick on the left, drag-to-look on the right,
// and action buttons. Rendered underneath the HUD so the hotbar stays tappable.
import { useRef, useState, type MutableRefObject, type ReactNode, type TouchEvent } from "react";
import type { GameState, Input } from "./engine/game";

const STICK_RADIUS = 50;
const DEAD_ZONE = 12;
const LOOK_SENSITIVITY = 0.006;

function ActionButton({
  label,
  onPress,
  onRelease,
  className = "",
  children,
}: {
  label: string;
  onPress: () => void;
  onRelease?: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onTouchStart={(e) => {
        e.stopPropagation();
        onPress();
      }}
      onTouchEnd={(e) => {
        e.stopPropagation();
        onRelease?.();
      }}
      onTouchCancel={() => onRelease?.()}
      className={`pointer-events-auto flex items-center justify-center rounded-full border border-white/25 bg-black/45 text-white shadow-lg active:bg-white/25 ${className}`}
    >
      {children}
    </button>
  );
}

export function TouchControls({
  game,
  input,
  attack,
  onUse,
  onRide,
  onEat,
  onBag,
  onPause,
}: {
  game: MutableRefObject<GameState>;
  input: MutableRefObject<Input>;
  attack: MutableRefObject<boolean>;
  onUse: () => void;
  onRide: () => void;
  onEat: () => void;
  onBag: () => void;
  onPause: () => void;
}) {
  const stick = useRef<{ id: number; x: number; y: number } | null>(null);
  const look = useRef<{ id: number; x: number; y: number } | null>(null);
  const [knob, setKnob] = useState<{ ox: number; oy: number; dx: number; dy: number } | null>(null);

  const find = (e: TouchEvent, id: number) => Array.from(e.changedTouches).find((t) => t.identifier === id);

  const releaseStick = () => {
    stick.current = null;
    setKnob(null);
    Object.assign(input.current, { forward: false, back: false, left: false, right: false, sprint: false });
  };

  return (
    <div className="absolute inset-0 select-none" style={{ touchAction: "none", WebkitTouchCallout: "none" }} onContextMenu={(e) => e.preventDefault()}>
      {/* move stick: left 40% of the screen */}
      <div
        className="absolute bottom-0 left-0 top-1/3 w-2/5"
        onTouchStart={(e) => {
          const t = e.changedTouches[0];
          if (stick.current || !t) return;
          stick.current = { id: t.identifier, x: t.clientX, y: t.clientY };
          setKnob({ ox: t.clientX, oy: t.clientY, dx: 0, dy: 0 });
        }}
        onTouchMove={(e) => {
          const s = stick.current;
          const t = s && find(e, s.id);
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
            sprint: mag > STICK_RADIUS * 1.1, // push past the rim to sprint
          });
          setKnob({ ox: s.x, oy: s.y, dx, dy });
        }}
        onTouchEnd={(e) => {
          if (stick.current && find(e, stick.current.id)) releaseStick();
        }}
        onTouchCancel={releaseStick}
      />
      {knob && (
        <div className="pointer-events-none absolute" style={{ left: knob.ox - STICK_RADIUS, top: knob.oy - STICK_RADIUS }}>
          <div className="relative rounded-full border-2 border-white/30 bg-white/10" style={{ width: STICK_RADIUS * 2, height: STICK_RADIUS * 2 }}>
            <div
              className="absolute h-10 w-10 rounded-full bg-white/60"
              style={{ left: STICK_RADIUS - 20 + knob.dx, top: STICK_RADIUS - 20 + knob.dy }}
            />
          </div>
        </div>
      )}
      {!knob && (
        <div className="pointer-events-none absolute bottom-20 left-8 text-[11px] text-white/45">drag here to move</div>
      )}

      {/* look: everything right of the stick */}
      <div
        className="absolute bottom-0 right-0 top-0 w-3/5"
        onTouchStart={(e) => {
          const t = e.changedTouches[0];
          if (look.current || !t) return;
          look.current = { id: t.identifier, x: t.clientX, y: t.clientY };
        }}
        onTouchMove={(e) => {
          const l = look.current;
          const t = l && find(e, l.id);
          if (!l || !t) return;
          const p = game.current.player;
          p.yaw -= (t.clientX - l.x) * LOOK_SENSITIVITY;
          p.pitch = Math.max(-1.45, Math.min(1.45, p.pitch - (t.clientY - l.y) * LOOK_SENSITIVITY));
          l.x = t.clientX;
          l.y = t.clientY;
        }}
        onTouchEnd={(e) => {
          if (look.current && find(e, look.current.id)) look.current = null;
        }}
        onTouchCancel={() => (look.current = null)}
      />

      {/* actions */}
      <div className="pointer-events-none absolute bottom-16 right-3 grid grid-cols-3 items-end gap-2">
        <ActionButton label="Eat" onPress={onEat} className="h-11 w-11 text-lg">🍖</ActionButton>
        <ActionButton label="Ride" onPress={onRide} className="h-11 w-11 text-lg">🦖</ActionButton>
        <ActionButton label="Use" onPress={onUse} className="h-14 w-14 text-sm font-semibold">Use</ActionButton>
        <ActionButton label="Bag and crafting" onPress={onBag} className="h-11 w-11 text-lg">🎒</ActionButton>
        <ActionButton
          label="Jump"
          onPress={() => (input.current.jump = true)}
          onRelease={() => (input.current.jump = false)}
          className="h-14 w-14 text-xl"
        >
          ⤒
        </ActionButton>
        <ActionButton
          label="Attack or use held item"
          onPress={() => (attack.current = true)}
          onRelease={() => (attack.current = false)}
          className="h-20 w-20 border-amber-300/60 text-3xl"
        >
          ✊
        </ActionButton>
      </div>
      <ActionButton label="Pause" onPress={onPause} className="absolute right-3 top-3 h-9 w-9 text-sm">
        ⏸
      </ActionButton>
    </div>
  );
}
