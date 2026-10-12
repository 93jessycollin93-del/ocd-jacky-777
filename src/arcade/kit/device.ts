// Touch controls only for devices with no mouse at all: touchscreen laptops keep mouse and keyboard.
export function isTouchDevice(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(pointer: coarse)").matches && !window.matchMedia("(any-pointer: fine)").matches;
}
