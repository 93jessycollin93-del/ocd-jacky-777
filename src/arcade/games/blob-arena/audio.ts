// Rate limiting for frequent sounds, so eating orbs or boosting never turns into a buzz.
const last = new Map<string, number>();

/** Run fn at most once per `gapMs` for this key. Returns whether it ran. */
export function gated(key: string, gapMs: number, fn: () => void): boolean {
  const now = performance.now();
  if (now - (last.get(key) ?? -1e9) < gapMs) return false;
  last.set(key, now);
  fn();
  return true;
}
