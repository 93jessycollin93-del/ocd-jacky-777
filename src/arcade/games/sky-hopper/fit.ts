// Measures the play area so the canvas can pick a logical size that matches the screen's shape.
import { useLayoutEffect, useState, type RefObject } from "react";

export interface BoxSize {
  w: number;
  h: number;
}

/** Width and height of an element in CSS pixels, kept up to date as it resizes. */
export function useBoxSize(ref: RefObject<HTMLElement>): BoxSize {
  const [size, setSize] = useState<BoxSize>({ w: 360, h: 640 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (!w || !h) return;
      setSize((p) => (p.w === w && p.h === h ? p : { w, h }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}
