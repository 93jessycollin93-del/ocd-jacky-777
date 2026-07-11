/**
 * Safe URL helpers — validate user-provided/external URLs before rendering.
 *
 * Rules:
 *   - Only http(s) and a short allowlist of protocols pass.
 *   - No `javascript:`, `data:`, `vbscript:`, `file:` URLs.
 *   - For EMBEDS (iframe src) we further require https.
 *   - For IMAGES we allow https + data:image/ (common for small previews).
 *
 * These are client-side helpers. Server-side validation is still required for
 * anything that gets persisted.
 * --------------------------------------------------------------------------*/

const BLOCKED_PROTOCOLS = new Set(['javascript:', 'data:', 'vbscript:', 'file:', 'blob:']);

function parseOrNull(value) {
  if (!value || typeof value !== 'string') return null;
  try {
    return new URL(value.trim());
  } catch {
    return null;
  }
}

export function isSafeLinkUrl(value) {
  const parsed = parseOrNull(value);
  if (!parsed) return false;
  if (BLOCKED_PROTOCOLS.has(parsed.protocol)) return false;
  return parsed.protocol === 'http:' || parsed.protocol === 'https:' || parsed.protocol === 'mailto:';
}

export function isSafeEmbedUrl(value) {
  const parsed = parseOrNull(value);
  if (!parsed) return false;
  return parsed.protocol === 'https:';
}

export function isSafeImageUrl(value) {
  const parsed = parseOrNull(value);
  if (!parsed) return false;
  if (parsed.protocol === 'https:' || parsed.protocol === 'http:') return true;
  // Allow small inline image previews
  return value.startsWith('data:image/');
}

/**
 * Return value if safe, else an empty string — so `<a href={safeLinkUrl(x)}>`
 * never receives a dangerous value.
 */
export function safeLinkUrl(value) {
  return isSafeLinkUrl(value) ? value : '';
}

export function safeEmbedUrl(value) {
  return isSafeEmbedUrl(value) ? value : '';
}

export function safeImageUrl(value) {
  return isSafeImageUrl(value) ? value : '';
}