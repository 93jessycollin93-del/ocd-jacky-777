import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { GripVertical, ChevronDown } from "lucide-react";

/**
 * Widget Dock — a shared home for every floating widget in the UI.
 *
 * - Each floating widget renders inside a <FloatingWidget> pill.
 * - Press-and-hold the grip for 1 second to unlock movement, then drag
 *   anywhere (mouse or touch). Position persists per widget.
 * - Every widget can collapse into the slim bottom dock bar; tapping its
 *   icon in the bar restores it to its previous position.
 * - Components with bespoke UI (e.g. ScrollNav) can join the dock via
 *   useDockableWidget() without adopting the pill chrome.
 */

export const HOLD_MS = 1000;
const DOCK_KEY = "jackie.widgets.docked.v1";
const POS_PREFIX = "jackie.widget.pos.";

interface Pos {
  x: number;
  y: number;
}

interface WidgetMeta {
  id: string;
  label: string;
  icon: ReactNode;
}

interface DockContextValue {
  docked: Record<string, boolean>;
  registry: WidgetMeta[];
  register: (meta: WidgetMeta) => () => void;
  setDocked: (id: string, value: boolean) => void;
}

const DockContext = createContext<DockContextValue | null>(null);

const loadDocked = (): Record<string, boolean> => {
  try {
    const raw = localStorage.getItem(DOCK_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* corrupt state — start fresh */
  }
  return {};
};

export function WidgetDockProvider({ children }: { children: ReactNode }) {
  const [docked, setDockedMap] = useState<Record<string, boolean>>(loadDocked);
  const [registry, setRegistry] = useState<WidgetMeta[]>([]);

  useEffect(() => {
    try {
      localStorage.setItem(DOCK_KEY, JSON.stringify(docked));
    } catch {
      /* storage full/blocked — dock state just won't persist */
    }
  }, [docked]);

  const register = useCallback((meta: WidgetMeta) => {
    setRegistry((prev) =>
      prev.some((m) => m.id === meta.id) ? prev : [...prev, meta]
    );
    return () => {
      setRegistry((prev) => prev.filter((m) => m.id !== meta.id));
    };
  }, []);

  const setDocked = useCallback((id: string, value: boolean) => {
    setDockedMap((prev) => ({ ...prev, [id]: value }));
  }, []);

  const value = useMemo(
    () => ({ docked, registry, register, setDocked }),
    [docked, registry, register, setDocked]
  );

  return <DockContext.Provider value={value}>{children}</DockContext.Provider>;
}

export function useWidgetDock(): DockContextValue {
  const ctx = useContext(DockContext);
  if (!ctx) {
    throw new Error("useWidgetDock must be used inside <WidgetDockProvider>");
  }
  return ctx;
}

/**
 * Register a widget with the dock. Returns its docked state and controls.
 * Safe to use from any component below the provider.
 */
export function useDockableWidget(meta: WidgetMeta) {
  const { docked, register, setDocked } = useWidgetDock();
  const { id, label } = meta;
  const iconRef = useRef(meta.icon);
  iconRef.current = meta.icon;

  useEffect(() => {
    return register({ id, label, icon: iconRef.current });
  }, [register, id, label]);

  return {
    isDocked: !!docked[id],
    dock: () => setDocked(id, true),
    undock: () => setDocked(id, false),
  };
}

const loadPos = (id: string, fallback: Pos): Pos => {
  try {
    const raw = localStorage.getItem(POS_PREFIX + id);
    if (raw) {
      const p = JSON.parse(raw);
      if (Number.isFinite(p?.x) && Number.isFinite(p?.y)) return p;
    }
  } catch {
    /* fall through to default */
  }
  return fallback;
};

/**
 * The floating pill. Hold the grip for 1s to unlock dragging; the chevron
 * collapses it into the bottom dock bar.
 */
export function FloatingWidget({
  id,
  label,
  icon,
  children,
  defaultPos,
}: {
  id: string;
  label: string;
  icon: ReactNode;
  children: ReactNode;
  /** Initial position; defaults to the bottom-right corner. */
  defaultPos?: Pos;
}) {
  const { isDocked, dock } = useDockableWidget({ id, label, icon });
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<Pos>(() =>
    loadPos(id, defaultPos ?? { x: window.innerWidth - 320, y: window.innerHeight - 180 })
  );
  const [armed, setArmed] = useState(false);
  const [dragging, setDragging] = useState(false);
  const holdTimer = useRef<number | null>(null);
  const start = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(POS_PREFIX + id, JSON.stringify(pos));
    } catch {
      /* position just won't persist */
    }
  }, [pos, id]);

  const clamp = useCallback((p: Pos): Pos => {
    const el = ref.current;
    const w = el?.offsetWidth ?? 240;
    const h = el?.offsetHeight ?? 48;
    return {
      x: Math.max(4, Math.min(window.innerWidth - w - 4, p.x)),
      y: Math.max(4, Math.min(window.innerHeight - h - 4, p.y)),
    };
  }, []);

  const snapEdge = useCallback((p: Pos): Pos => {
    const el = ref.current;
    const w = el?.offsetWidth ?? 240;
    const mid = p.x + w / 2;
    return { x: mid < window.innerWidth / 2 ? 8 : window.innerWidth - w - 8, y: p.y };
  }, []);

  const cancelHold = useCallback(() => {
    if (holdTimer.current) {
      window.clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  }, []);

  const beginHold = (px: number, py: number) => {
    cancelHold();
    holdTimer.current = window.setTimeout(() => {
      setArmed(true);
      if (navigator.vibrate) navigator.vibrate(30);
    }, HOLD_MS);
    start.current = { px, py, ox: pos.x, oy: pos.y };
  };

  useEffect(() => {
    if (!armed) return;
    const move = (e: MouseEvent | TouchEvent) => {
      if (!start.current) return;
      setDragging(true);
      const t = "touches" in e ? e.touches[0] : (e as MouseEvent);
      if (!t) return;
      const dx = t.clientX - start.current.px;
      const dy = t.clientY - start.current.py;
      setPos(clamp({ x: start.current.ox + dx, y: start.current.oy + dy }));
      if ("touches" in e) e.preventDefault();
    };
    const up = () => {
      setDragging(false);
      setArmed(false);
      start.current = null;
      setPos((p) => snapEdge(clamp(p)));
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
  }, [armed, clamp, snapEdge]);

  useEffect(() => {
    const onResize = () => setPos((p) => clamp(p));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [clamp]);

  useEffect(() => cancelHold, [cancelHold]);

  if (isDocked) return null;

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
        aria-label={`Hold 1s to move the ${label} widget`}
        onMouseDown={(e) => beginHold(e.clientX, e.clientY)}
        onMouseUp={cancelHold}
        onMouseLeave={cancelHold}
        onTouchStart={(e) => {
          const t = e.touches[0];
          beginHold(t.clientX, t.clientY);
        }}
        onTouchEnd={cancelHold}
        className={`p-1 rounded-full transition-colors ${
          armed ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"
        }`}
        title="Hold 1s to move"
      >
        <GripVertical size={14} />
      </button>
      <div className="flex items-center gap-1">{children}</div>
      <button
        type="button"
        onClick={dock}
        aria-label={`Collapse ${label} into the dock bar`}
        className="p-1 rounded-full text-muted-foreground hover:text-primary transition-colors"
        title="Collapse to dock"
      >
        <ChevronDown size={12} />
      </button>
    </div>
  );
}

/**
 * The slim bottom bar. Renders only when at least one widget is docked;
 * tapping an icon restores that widget.
 */
export function WidgetDockBar() {
  const { registry, docked, setDocked } = useWidgetDock();
  const items = registry.filter((m) => docked[m.id]);
  if (items.length === 0) return null;

  return (
    <div
      className="fixed bottom-0 left-1/2 -translate-x-1/2 z-40 flex items-center gap-0.5 rounded-t-lg border border-b-0 border-border bg-popover/90 backdrop-blur-md shadow-lg px-1.5 pt-1"
      style={{ paddingBottom: "max(4px, env(safe-area-inset-bottom))" }}
      role="toolbar"
      aria-label="Collapsed widgets"
    >
      {items.map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => setDocked(m.id, false)}
          className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-md text-muted-foreground hover:text-primary hover:bg-secondary/60 transition-colors"
          title={`Restore ${m.label}`}
          aria-label={`Restore ${m.label} widget`}
        >
          <span className="[&>svg]:w-3.5 [&>svg]:h-3.5">{m.icon}</span>
          <span className="font-mono text-[8px] uppercase tracking-wider leading-none">{m.label}</span>
        </button>
      ))}
    </div>
  );
}
