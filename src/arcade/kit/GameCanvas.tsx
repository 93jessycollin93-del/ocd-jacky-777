// A canvas that fills its container, scaled for sharp pixels on any screen. You draw in logical units:
// "contain" keeps a fixed width×height and letterboxes; "fill" fixes the width and lets the height
// follow the screen's shape.
import { useEffect, useRef, type CSSProperties } from "react";
import { useFrameLoop } from "./loop";

export interface View {
  /** Logical width and height you draw in. */
  w: number;
  h: number;
  /** CSS pixels per logical unit. */
  scale: number;
}

export interface CanvasPointer {
  type: "down" | "move" | "up" | "cancel";
  /** Position in logical units. */
  x: number;
  y: number;
  id: number;
  /** Mouse buttons held (1 = left, 2 = right). */
  buttons: number;
  button: number;
  pointerType: string;
}

export function GameCanvas({
  width,
  height = width,
  fit = "contain",
  draw,
  onPointer,
  active = true,
  background = "#0b0b12",
  cursor,
  style,
}: {
  width: number;
  height?: number;
  fit?: "contain" | "fill";
  /** Called every frame with the context already scaled to logical units. */
  draw: (ctx: CanvasRenderingContext2D, view: View, dt: number, time: number) => void;
  onPointer?: (p: CanvasPointer) => void;
  active?: boolean;
  /** Letterbox colour around a "contain" canvas. */
  background?: string;
  cursor?: string;
  style?: CSSProperties;
}) {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const view = useRef<View>({ w: width, h: height, scale: 1 });
  const size = useRef({ cw: 0, ch: 0, dpr: 1 });
  const pointer = useRef(onPointer);
  pointer.current = onPointer;

  useEffect(() => {
    const el = box.current;
    const cv = canvas.current;
    if (!el || !cv) return;
    const resize = () => {
      const cw = el.clientWidth;
      const ch = el.clientHeight;
      if (!cw || !ch) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      let scale: number;
      const w = width;
      let h = height;
      if (fit === "fill") {
        scale = cw / width;
        h = ch / scale;
      } else {
        scale = Math.min(cw / width, ch / height);
      }
      view.current = { w, h, scale };
      size.current = { cw, ch, dpr };
      const cssW = fit === "fill" ? cw : Math.floor(w * scale);
      const cssH = fit === "fill" ? ch : Math.floor(h * scale);
      cv.style.width = `${cssW}px`;
      cv.style.height = `${cssH}px`;
      cv.width = Math.max(1, Math.round(cssW * dpr));
      cv.height = Math.max(1, Math.round(cssH * dpr));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    return () => ro.disconnect();
  }, [width, height, fit]);

  useFrameLoop((dt, t) => {
    const cv = canvas.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    const { scale } = view.current;
    const { dpr } = size.current;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
    draw(ctx, view.current, dt, t);
  }, active);

  useEffect(() => {
    const cv = canvas.current;
    if (!cv) return;
    const send = (type: CanvasPointer["type"]) => (e: PointerEvent) => {
      const fn = pointer.current;
      if (!fn) return;
      const r = cv.getBoundingClientRect();
      const s = view.current.scale || 1;
      if (type === "down") {
        try {
          cv.setPointerCapture(e.pointerId);
        } catch {
          // Capture is a nicety.
        }
      }
      fn({
        type, x: (e.clientX - r.left) / s, y: (e.clientY - r.top) / s, id: e.pointerId, buttons: e.buttons,
        button: e.button, pointerType: e.pointerType,
      });
      if (type === "down" && e.pointerType !== "mouse") e.preventDefault();
    };
    const down = send("down");
    const move = send("move");
    const up = send("up");
    const cancel = send("cancel");
    const menu = (e: Event) => e.preventDefault();
    cv.addEventListener("pointerdown", down);
    cv.addEventListener("pointermove", move);
    cv.addEventListener("pointerup", up);
    cv.addEventListener("pointercancel", cancel);
    cv.addEventListener("contextmenu", menu);
    return () => {
      cv.removeEventListener("pointerdown", down);
      cv.removeEventListener("pointermove", move);
      cv.removeEventListener("pointerup", up);
      cv.removeEventListener("pointercancel", cancel);
      cv.removeEventListener("contextmenu", menu);
    };
  }, []);

  return (
    <div ref={box} className="absolute inset-0 flex items-center justify-center overflow-hidden" style={{ background, ...style }}>
      <canvas ref={canvas} style={{ touchAction: "none", cursor, display: "block" }} />
    </div>
  );
}
