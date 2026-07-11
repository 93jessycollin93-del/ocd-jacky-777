const PREFIX = 'app_metadata_cache';
const memoryCache = new Map();

function getStorageKey(key) {
  return `${PREFIX}:${key}`;
}

function hasWindow() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function readCachedValue(key, maxAgeMs = 5 * 60 * 1000) {
  const now = Date.now();
  const cached = memoryCache.get(key);
  if (cached && now - cached.cachedAt <= maxAgeMs) {
    return cached.value;
  }

  if (!hasWindow()) return null;

  const raw = window.localStorage.getItem(getStorageKey(key));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || now - parsed.cachedAt > maxAgeMs) {
      window.localStorage.removeItem(getStorageKey(key));
      return null;
    }
    memoryCache.set(key, parsed);
    return parsed.value;
  } catch {
    window.localStorage.removeItem(getStorageKey(key));
    return null;
  }
}

export function writeCachedValue(key, value) {
  const payload = { value, cachedAt: Date.now() };
  memoryCache.set(key, payload);
  if (!hasWindow()) return;
  window.localStorage.setItem(getStorageKey(key), JSON.stringify(payload));
}

export async function getCachedOrFetch({ key, maxAgeMs, fetcher }) {
  const cached = readCachedValue(key, maxAgeMs);
  if (cached !== null) return cached;
  const fresh = await fetcher();
  writeCachedValue(key, fresh);
  return fresh;
}

export function invalidateCachedValue(key) {
  memoryCache.delete(key);
  if (!hasWindow()) return;
  window.localStorage.removeItem(getStorageKey(key));
}