// A requestAnimationFrame loop for React components. dt is in seconds, capped so a stalled tab doesn't
// fast-forward the game.
import { useEffect, useRef } from "react";

export function useFrameLoop(callback: (dt: number, time: number) => void, active = true, maxDt = 0.05) {
  const cb = useRef(callback);
  cb.current = callback;
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(maxDt, Math.max(0, (now - last) / 1000));
      last = now;
      cb.current(dt, now / 1000);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [active, maxDt]);
}

/** Run a fixed-rate simulation from a variable frame dt (keeps physics stable). Returns leftover time. */
export function fixedSteps(acc: number, dt: number, step: number, tick: () => void, maxSteps = 8): number {
  acc += dt;
  let n = 0;
  while (acc >= step && n < maxSteps) {
    tick();
    acc -= step;
    n++;
  }
  return n >= maxSteps ? 0 : acc;
}
