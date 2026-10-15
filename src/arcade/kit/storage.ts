// Best scores and small saves in localStorage. Every read and write is guarded: private windows and
// blocked storage just mean nothing persists.

const PREFIX = "arcade:";

export function loadBest(id: string): number {
  try {
    return Number(localStorage.getItem(`${PREFIX}best:${id}`)) || 0;
  } catch {
    return 0;
  }
}

/** Store a score if it beats the best so far. Returns true if it was a new best. */
export function saveBest(id: string, score: number, order: "high" | "low" = "high"): boolean {
  if (!Number.isFinite(score) || score <= 0) return false;
  const best = loadBest(id);
  const better = best === 0 || (order === "high" ? score > best : score < best);
  if (!better) return false;
  try {
    localStorage.setItem(`${PREFIX}best:${id}`, String(score));
  } catch {
    // Not persisted; still a best for this visit.
  }
  return true;
}

export function loadState<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(`${PREFIX}${key}`);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function saveState(key: string, value: unknown) {
  try {
    localStorage.setItem(`${PREFIX}${key}`, JSON.stringify(value));
  } catch {
    // Storage full or blocked.
  }
}

export function clearState(key: string) {
  try {
    localStorage.removeItem(`${PREFIX}${key}`);
  } catch {
    // Nothing to do.
  }
}
