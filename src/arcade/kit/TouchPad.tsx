// On-screen controls for phones: buttons, a D-pad and a floating joystick. Touch-only handlers that
// stop the browser's follow-up "ghost" click from landing on whatever opens under the finger.
import { useRef, useState, type CSSProperties, type ReactNode, type TouchEvent as ReactTouchEvent, type TouchList as ReactTouchList } from "react";

export function TouchButton({
  label, onDown, onUp, children, className = "", style, size = 56, active = false,
}: {
  label: string;
  onDown: () => void;
  onUp?: () => void;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  size?: number;
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
        if (e.cancelable) e.preventDefault();
        onUp?.();
      }}
      onTouchCancel={() => onUp?.()}
      onMouseDown={(e) => {
        e.stopPropagation();
        onDown();
      }}
      onMouseUp={() => onUp?.()}
      onMouseLeave={() => onUp?.()}
      className={`pointer-events-auto flex select-none items-center justify-center rounded-full border text-white shadow-lg ${
        active ? "border-white/70 bg-white/30" : "border-white/25 bg-black/40 active:bg-white/25"
      } ${className}`}
      style={{ width: size, height: size, touchAction: "none", ...style }}
    >
      {children}
    </button>
  );
}

export interface Dirs {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

const NONE: Dirs = { up: false, down: false, left: false, right: false };

/** Four-way pad; slide your thumb between directions. Diagonals when `diagonal` is on. */
export function DPad({
  onChange, size = 150, diagonal = false, className = "", style,
}: {
  onChange: (dirs: Dirs) => void;
  size?: number;
  diagonal?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [dirs, setDirs] = useState<Dirs>(NONE);
  const last = useRef("");
  const update = (e: ReactTouchEvent) => {
    const el = ref.current;
    const t = e.touches[0];
    if (!el || !t) return set(NONE);
    const r = el.getBoundingClientRect();
    const dx = t.clientX - (r.left + r.width / 2);
    const dy = t.clientY - (r.top + r.height / 2);
    if (Math.hypot(dx, dy) < size * 0.12) return set(NONE);
    const a = Math.atan2(dy, dx);
    const oct = Math.round(a / (Math.PI / 4));
    const d = { ...NONE };
    const map: Record<number, (keyof Dirs)[]> = {
      0: ["right"], 1: ["right", "down"], 2: ["down"], 3: ["left", "down"], 4: ["left"], [-4]: ["left"],
      [-3]: ["left", "up"], [-2]: ["up"], [-1]: ["right", "up"],
    };
    let keys = map[oct] ?? [];
    if (!diagonal && keys.length > 1) {
      keys = Math.abs(dx) > Math.abs(dy) ? [dx > 0 ? "right" : "left"] : [dy > 0 ? "down" : "up"];
    }
    for (const k of keys) d[k] = true;
    set(d);
  };
  const set = (d: Dirs) => {
    const key = `${d.up}${d.down}${d.left}${d.right}`;
    if (key === last.current) return;
    last.current = key;
    setDirs(d);
    onChange(d);
  };
  const arm = (on: boolean, rot: number) => (
    <div
      className={`absolute left-1/2 top-1/2 rounded-md border ${on ? "border-white/70 bg-white/35" : "border-white/25 bg-black/40"}`}
      style={{ width: size * 0.32, height: size * 0.36, transform: `translate(-50%, -50%) rotate(${rot}deg) translateY(-${size * 0.3}px)` }}
    />
  );
  return (
    <div
      ref={ref}
      className={`pointer-events-auto relative select-none ${className}`}
      style={{ width: size, height: size, touchAction: "none", ...style }}
      onTouchStart={(e) => {
        e.stopPropagation();
        update(e);
      }}
      onTouchMove={update}
      onTouchEnd={(e) => {
        if (e.cancelable) e.preventDefault();
        update(e);
      }}
      onTouchCancel={() => set(NONE)}
    >
      {arm(dirs.up, 0)}
      {arm(dirs.right, 90)}
      {arm(dirs.down, 180)}
      {arm(dirs.left, 270)}
    </div>
  );
}

/** A thumbstick that appears wherever you touch inside its area. x and y run from -1 to 1. */
export function Joystick({
  onChange, radius = 56, className = "", style, hint,
}: {
  onChange: (x: number, y: number) => void;
  radius?: number;
  /** Position the touch area with these (e.g. "absolute bottom-0 left-0 h-1/2 w-1/2"). */
  className?: string;
  style?: CSSProperties;
  hint?: string;
}) {
  const origin = useRef<{ id: number; x: number; y: number } | null>(null);
  const [knob, setKnob] = useState<{ ox: number; oy: number; dx: number; dy: number } | null>(null);
  const find = (list: ReactTouchList, id: number) => {
    for (let i = 0; i < list.length; i++) if (list[i].identifier === id) return list[i];
    return undefined;
  };
  const release = () => {
    origin.current = null;
    setKnob(null);
    onChange(0, 0);
  };
  return (
    <div
      className={`pointer-events-auto select-none ${className}`}
      style={{ touchAction: "none", ...style }}
      onTouchStart={(e) => {
        const t = e.changedTouches[0];
        if (origin.current || !t) return;
        const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
        origin.current = { id: t.identifier, x: t.clientX, y: t.clientY };
        setKnob({ ox: t.clientX - r.left, oy: t.clientY - r.top, dx: 0, dy: 0 });
      }}
      onTouchMove={(e) => {
        const o = origin.current;
        const t = o && find(e.changedTouches, o.id);
        if (!o || !t) return;
        let dx = t.clientX - o.x;
        let dy = t.clientY - o.y;
        const m = Math.hypot(dx, dy);
        if (m > radius) {
          dx = (dx / m) * radius;
          dy = (dy / m) * radius;
        }
        setKnob((k) => (k ? { ...k, dx, dy } : k));
        onChange(dx / radius, dy / radius);
      }}
      onTouchEnd={(e) => {
        if (origin.current && find(e.changedTouches, origin.current.id)) release();
      }}
      onTouchCancel={release}
    >
      {knob ? (
        <div className="pointer-events-none absolute" style={{ left: knob.ox - radius, top: knob.oy - radius }}>
          <div className="relative rounded-full border-2 border-white/30 bg-white/10" style={{ width: radius * 2, height: radius * 2 }}>
            <div className="absolute h-10 w-10 rounded-full bg-white/60" style={{ left: radius - 20 + knob.dx, top: radius - 20 + knob.dy }} />
          </div>
        </div>
      ) : (
        hint && <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] text-white/40">{hint}</div>
      )}
    </div>
  );
}
