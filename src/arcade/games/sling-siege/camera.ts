// The camera for Sling Siege: it frames the whole level while you aim, zooms in to follow a shot, hangs
// around for the aftermath and then glides home. Pure functions, so they can be tested.
import { clamp, damp } from "../../kit/draw";

export interface Cam {
  /** The world point at the middle of the screen (metres). */
  x: number;
  y: number;
  /** Pixels per metre. */
  z: number;
}

export interface Viewport {
  w: number;
  h: number;
}

/** The zoom that fits the whole level across the screen (zoomed in a little on tall, narrow screens). */
export function homeZoom(v: Viewport, levelWidth: number): number {
  const fit = v.w / levelWidth;
  const portrait = v.h > v.w * 1.1;
  return portrait ? fit * 1.5 : fit;
}

/** How far below the middle of the screen the ground sits at home zoom: a margin under the grass. */
export function groundMargin(v: Viewport): number {
  return clamp(v.h * 0.16, 44, 120);
}

/** The camera height that puts the ground a margin above the bottom edge at zoom z. */
export function groundCamY(v: Viewport, z: number): number {
  return (groundMargin(v) - v.h / 2) / z;
}

/** Keep the camera over the level horizontally. */
export function clampCamX(v: Viewport, z: number, x: number, levelWidth: number): number {
  const half = v.w / z / 2;
  const lo = half - 1.5;
  const hi = levelWidth - 0.5 - half;
  if (lo >= hi) return (lo + hi) / 2;
  return clamp(x, lo, hi);
}

/** Where the camera rests while you aim: the left of the level on narrow screens, the middle otherwise. */
export function homeCam(v: Viewport, levelWidth: number, panX?: number): Cam {
  const z = homeZoom(v, levelWidth);
  const half = v.w / z / 2;
  const left = half - 1.5;
  return { x: clampCamX(v, z, panX ?? left, levelWidth), y: groundCamY(v, z), z };
}

export type CamMode = "home" | "follow" | "hold" | "intro";

export interface CamTarget {
  mode: CamMode;
  /** The thing to follow or look at (metres). */
  fx: number;
  fy: number;
  panX?: number;
}

/** Where the camera wants to be for the current moment. */
export function targetCam(v: Viewport, levelWidth: number, t: CamTarget): Cam {
  const home = homeCam(v, levelWidth, t.panX);
  if (t.mode === "home") return home;
  if (t.mode === "intro") {
    const z = home.z;
    const half = v.w / z / 2;
    return { x: clampCamX(v, z, levelWidth - half + 1, levelWidth), y: home.y, z };
  }
  const z = home.z * (t.mode === "follow" ? 1.2 : 1.15);
  const half = v.w / z / 2;
  const lead = t.mode === "follow" ? half * 0.28 : 0;
  const y = Math.min(groundCamY(v, z), t.fy - (v.h / z) * 0.02);
  return { x: clampCamX(v, z, t.fx + lead, levelWidth), y, z };
}

/** Glide the camera toward its target, framerate independent. */
export function stepCam(cam: Cam, target: Cam, dt: number, rate = 3.2) {
  cam.x = damp(cam.x, target.x, rate, dt);
  cam.y = damp(cam.y, target.y, rate, dt);
  cam.z = damp(cam.z, target.z, rate * 0.8, dt);
}

export function worldToScreen(cam: Cam, v: Viewport, x: number, y: number): [number, number] {
  return [v.w / 2 + (x - cam.x) * cam.z, v.h / 2 + (y - cam.y) * cam.z];
}

export function screenToWorld(cam: Cam, v: Viewport, sx: number, sy: number): [number, number] {
  return [cam.x + (sx - v.w / 2) / cam.z, cam.y + (sy - v.h / 2) / cam.z];
}
