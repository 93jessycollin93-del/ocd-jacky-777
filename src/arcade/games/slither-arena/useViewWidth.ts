// Measures the play area so the canvas can use one logical unit per CSS pixel (clamped), which keeps
// text readable on phones and shows a fair amount of the world on big screens.
import { useEffect, useState, type RefObject } from "react";

export function useViewWidth(ref: RefObject<HTMLElement>, min = 360, max = 1100): number {
  const [w, setW] = useState(900);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => {
      const cw = el.clientWidth;
      if (cw > 0) setW(Math.max(min, Math.min(max, Math.round(cw))));
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, min, max]);
  return w;
}
