import { useEffect, useRef, useState, type ReactNode } from "react";
import { GripVertical } from "lucide-react";

/**
 * Floating toolbar you can drag anywhere on screen.
 * - Long-press (~800ms) the grip to unlock movement (grip glows)
 * - Drag with mouse or touch
 * - Snaps to nearest horizontal edge on release
 * - Position persisted to localStorage
 */
interface Pos { x: number; y: number }
const STORAGE_KEY = "jackie.toolbar.pos.v1";
const HOLD_MS = 800;

export function DraggableToolbar({ children, storageKey = STORAGE_KEY }: { children: ReactNode; storageKey?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<Pos>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) return JSON.parse(raw);
    } catch {}
    return { x: window.innerWidth - 320, y: window.innerHeight - 180 };
  });
  const [armed, setArmed] = useState(false);
  const [dragging, setDragging] = useState(false);
  const holdTimer = useRef<number | null>(null);
  const start = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(pos)); } catch {}
  }, [pos, storageKey]);

  const clamp = (p: Pos): Pos => {
    const el = ref.current;
    const w = el?.offsetWidth ?? 240;
    const h = el?.offsetHeight ?? 48;
    return {
      x: Math.max(4, Math.min(window.innerWidth - w - 4, p.x)),
      y: Math.max(4, Math.min(window.innerHeight - h - 4, p.y)),
    };
  };

  const snapEdge = (p: Pos): Pos => {
    const el = ref.current;
    const w = el?.offsetWidth ?? 240;
    const mid = p.x + w / 2;
    return { x: mid < window.innerWidth / 2 ? 8 : window.innerWidth - w - 8, y: p.y };
  };

  const beginHold = (px: number, py: number) => {
    if (holdTimer.current) window.clearTimeout(holdTimer.current);
    holdTimer.current = window.setTimeout(() => {
      setArmed(true);
      if (navigator.vibrate) navigator.vibrate(30);
    }, HOLD_MS);
    start.current = { px, py, ox: pos.x, oy: pos.y };
  };
  const cancelHold = () => {
    if (holdTimer.current) { window.clearTimeout(holdTimer.current); holdTimer.current = null; }
  };

  useEffect(() => {
    if (!armed) return;
    const move = (e: MouseEvent | TouchEvent) => {
      if (!start.current) return;
      setDragging(true);
      const t = "touches" in e ? e.touches[0] : (e as MouseEvent);
      const dx = t.clientX - start.current.px;
      const dy = t.clientY - start.current.py;
      setPos(clamp({ x: start.current.ox + dx, y: start.current.oy + dy }));
      if ("touches" in e) e.preventDefault();
    };
    const up = () => {
      setDragging(false);
      setArmed(false);
      start.current = null;
      setPos((p) => snapEdge(p));
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    window.addEventListener("touchmove", move, { passive: false });
    window.addEventListener("touchend", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", up);
    };
  }, [armed]);

  useEffect(() => {
    const onResize = () => setPos((p) => clamp(p));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <div
      ref={ref}
      className={`fixed z-40 flex items-center gap-1 rounded-full border bg-popover/95 backdrop-blur-md shadow-lg transition-shadow ${
        armed ? "border-primary shadow-[0_0_20px_hsl(var(--primary)/0.5)]" : "border-border"
      } ${dragging ? "cursor-grabbing" : ""}`}
      style={{ left: pos.x, top: pos.y, padding: "6px 8px", touchAction: armed ? "none" : "auto" }}
    >
      <button
        type="button"
        aria-label="Hold to drag toolbar"
        onMouseDown={(e) => beginHold(e.clientX, e.clientY)}
        onMouseUp={cancelHold}
        onMouseLeave={cancelHold}
        onTouchStart={(e) => { const t = e.touches[0]; beginHold(t.clientX, t.clientY); }}
        onTouchEnd={cancelHold}
        className={`p-1 rounded-full transition-colors ${
          armed ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"
        }`}
        title="Hold 1s to drag"
      >
        <GripVertical size={14} />
      </button>
      <div className="flex items-center gap-1">{children}</div>
    </div>
  );
}
