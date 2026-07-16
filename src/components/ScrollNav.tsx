import { useEffect, useState, type RefObject } from "react";
import { ArrowUp, ArrowDown, ArrowUpDown, ChevronDown } from "lucide-react";
import { useDockableWidget } from "@/components/widgets/WidgetDock";

/**
 * Floating scroll-to-top / scroll-to-bottom buttons.
 * Auto-hide when idle; reappear during scroll.
 * Keyboard: Ctrl/Cmd+Home / Ctrl/Cmd+End.
 */
export function ScrollNav({ targetRef }: { targetRef: RefObject<HTMLElement> }) {
  const [visible, setVisible] = useState(false);
  const [canUp, setCanUp] = useState(false);
  const [canDown, setCanDown] = useState(false);
  const { isDocked, dock } = useDockableWidget({
    id: "scroll",
    label: "Scroll",
    icon: <ArrowUpDown size={14} />,
  });

  useEffect(() => {
    const el = targetRef.current;
    if (!el) return;
    let hideTimer: number | null = null;
    const update = () => {
      setCanUp(el.scrollTop > 40);
      setCanDown(el.scrollTop + el.clientHeight < el.scrollHeight - 40);
      setVisible(true);
      if (hideTimer) window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(() => setVisible(false), 1600);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key === "Home") { el.scrollTo({ top: 0, behavior: "smooth" }); e.preventDefault(); }
      if (e.key === "End") { el.scrollTo({ top: el.scrollHeight, behavior: "smooth" }); e.preventDefault(); }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("keydown", onKey);
      if (hideTimer) window.clearTimeout(hideTimer);
    };
  }, [targetRef]);

  const scrollTo = (top: number) => targetRef.current?.scrollTo({ top, behavior: "smooth" });

  if (isDocked) return null;

  return (
    <div
      className={`pointer-events-none absolute right-3 bottom-24 z-30 flex flex-col gap-1.5 transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <button
        type="button"
        onClick={() => scrollTo(0)}
        disabled={!canUp}
        className="pointer-events-auto w-8 h-8 rounded-full bg-popover/95 backdrop-blur-md border border-border shadow-md flex items-center justify-center text-muted-foreground hover:text-primary disabled:opacity-30 transition-all hover:scale-105"
        title="Scroll to top (Ctrl+Home)"
        aria-label="Scroll to top"
      >
        <ArrowUp size={14} />
      </button>
      <button
        type="button"
        onClick={() => scrollTo(targetRef.current?.scrollHeight ?? 0)}
        disabled={!canDown}
        className="pointer-events-auto w-8 h-8 rounded-full bg-popover/95 backdrop-blur-md border border-border shadow-md flex items-center justify-center text-muted-foreground hover:text-primary disabled:opacity-30 transition-all hover:scale-105"
        title="Scroll to bottom (Ctrl+End)"
        aria-label="Scroll to bottom"
      >
        <ArrowDown size={14} />
      </button>
      <button
        type="button"
        onClick={dock}
        className="pointer-events-auto w-8 h-5 rounded-full bg-popover/95 backdrop-blur-md border border-border shadow-md flex items-center justify-center text-muted-foreground hover:text-primary transition-all"
        title="Collapse to dock"
        aria-label="Collapse scroll buttons into the dock bar"
      >
        <ChevronDown size={10} />
      </button>
    </div>
  );
}
