// Keyboard and gesture input hooks for Arcade games.
import { useEffect, useRef, type RefObject } from "react";

const typing = (e: KeyboardEvent) => {
  const el = e.target as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
};

/** Keys that would scroll the page; games swallow them while mounted. */
const SCROLL_KEYS = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "PageUp", "PageDown"]);

/** The set of key codes (e.code, like "ArrowLeft" or "KeyW") held right now. */
export function useHeldKeys() {
  const held = useRef(new Set<string>());
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (typing(e)) return;
      if (SCROLL_KEYS.has(e.code)) e.preventDefault();
      held.current.add(e.code);
    };
    const up = (e: KeyboardEvent) => held.current.delete(e.code);
    const blur = () => held.current.clear();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, []);
  return held;
}

/** Call handler once per key press (no auto-repeat), ignoring typing in text boxes. */
export function useKeyPress(handler: (code: string, e: KeyboardEvent) => void, allowRepeat = false) {
  const h = useRef(handler);
  h.current = handler;
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (typing(e) || (e.repeat && !allowRepeat)) return;
      if (SCROLL_KEYS.has(e.code)) e.preventDefault();
      h.current(e.code, e);
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, [allowRepeat]);
}

export type SwipeDir = "up" | "down" | "left" | "right";

/** Swipes on an element (touch or mouse drag). Also reports short taps. */
export function useSwipe(
  ref: RefObject<HTMLElement>,
  onSwipe: (dir: SwipeDir) => void,
  onTap?: (x: number, y: number) => void,
  minDistance = 24,
) {
  const s = useRef(onSwipe);
  const t = useRef(onTap);
  s.current = onSwipe;
  t.current = onTap;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let start: { x: number; y: number; id: number } | null = null;
    const down = (e: PointerEvent) => {
      start = { x: e.clientX, y: e.clientY, id: e.pointerId };
    };
    const up = (e: PointerEvent) => {
      if (!start || e.pointerId !== start.id) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      start = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < minDistance) {
        t.current?.(e.clientX, e.clientY);
        return;
      }
      s.current(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up");
    };
    const cancel = () => (start = null);
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", cancel);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", cancel);
    };
  }, [ref, minDistance]);
}
