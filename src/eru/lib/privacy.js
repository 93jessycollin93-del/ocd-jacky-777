/**
 * privacy.js
 * ----------------------------------------------------------------------------
 * Single source of truth for masking sensitive user information in the UI.
 *
 * Rules:
 *  - Email addresses are masked by default everywhere they're rendered to other
 *    users (and even to the owner, until they explicitly choose to reveal).
 *  - Reveal is opt-in per render context: the user must click "Reveal" or
 *    unlock the Secret Area with a PIN.
 *  - Inputs the user types themselves are NEVER masked — masking is a render
 *    concern, not a data concern.
 *  - This module never mutates entity data. It only formats strings for display.
 */

const FALLBACK = '••••@•••';

/**
 * Mask an email like "alice.smith@example.com" -> "ali•••@example.com".
 * Short locals are masked harder so 2-letter handles never leak.
 */
export function maskEmail(email) {
  if (!email || typeof email !== 'string') return FALLBACK;
  const trimmed = email.trim();
  if (!trimmed.includes('@')) return FALLBACK;
  const [localRaw, domainRaw = ''] = trimmed.split('@');
  const local = localRaw || '';
  const domain = domainRaw || '';
  const visible = local.length <= 2 ? local.slice(0, 1) : local.slice(0, 3);
  const safeLocal = visible ? `${visible}•••` : '•••';
  const safeDomain = domain || '•••';
  return `${safeLocal}@${safeDomain}`;
}

/**
 * Mask any sensitive string (token, wallet, phone) by keeping the first/last
 * couple of characters visible.
 */
export function maskSecret(value, { head = 4, tail = 4 } = {}) {
  if (!value || typeof value !== 'string') return FALLBACK;
  const v = value.trim();
  if (v.length <= head + tail) return '•'.repeat(Math.max(4, v.length));
  return `${v.slice(0, head)}••••${v.slice(-tail)}`;
}

/**
 * Decide what to display for an email field, given a viewer.
 *  - If `revealed` is true → show the raw email.
 *  - If the viewer is the owner of the email AND `revealForOwner` is true → raw.
 *  - Otherwise → masked.
 */
export function displayEmail(email, { viewerEmail, revealed = false, revealForOwner = false } = {}) {
  if (!email) return FALLBACK;
  if (revealed) return email;
  if (revealForOwner && viewerEmail && viewerEmail === email) return email;
  return maskEmail(email);
}