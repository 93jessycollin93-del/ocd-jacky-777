/**
 * secretAreaPin.js
 * ----------------------------------------------------------------------------
 * Lightweight client-side PIN helper for the in-app "Secret Area".
 *
 * Goals:
 *  - Per-user, per-device gate for revealing sensitive info (emails, tokens,
 *    wallet addresses, etc).
 *  - Never store the raw PIN. Only a salted SHA-256 hash is persisted in
 *    localStorage so a glance at devtools doesn't leak the code.
 *  - Auto-lock on tab close (session unlock token is sessionStorage only).
 *
 * This is NOT a server-side auth boundary — it's a local privacy gate to keep
 * shoulder-surfers and casual onlookers from seeing sensitive fields. Server
 * RLS still owns real authorization.
 */

const PIN_HASH_KEY = 'eru.secret_area.pin_hash.v1';
const PIN_SALT_KEY = 'eru.secret_area.pin_salt.v1';
const UNLOCK_KEY   = 'eru.secret_area.unlocked.v1';

function randomSalt() {
  const arr = new Uint8Array(16);
  (window.crypto || window.msCrypto).getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(text) {
  const enc = new TextEncoder().encode(text);
  const buf = await window.crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function isPinConfigured() {
  try {
    return Boolean(localStorage.getItem(PIN_HASH_KEY));
  } catch {
    return false;
  }
}

export async function setPin(pin) {
  if (!pin || pin.length < 4) throw new Error('PIN must be at least 4 characters.');
  const salt = randomSalt();
  const hash = await sha256Hex(`${salt}::${pin}`);
  localStorage.setItem(PIN_SALT_KEY, salt);
  localStorage.setItem(PIN_HASH_KEY, hash);
  // Setting a new PIN locks the secret area until the user re-enters it.
  sessionStorage.removeItem(UNLOCK_KEY);
}

export async function verifyPin(pin) {
  const salt = localStorage.getItem(PIN_SALT_KEY) || '';
  const expected = localStorage.getItem(PIN_HASH_KEY) || '';
  if (!salt || !expected) return false;
  const got = await sha256Hex(`${salt}::${pin}`);
  return got === expected;
}

export function clearPin() {
  localStorage.removeItem(PIN_HASH_KEY);
  localStorage.removeItem(PIN_SALT_KEY);
  sessionStorage.removeItem(UNLOCK_KEY);
}

export function isUnlocked() {
  try {
    return sessionStorage.getItem(UNLOCK_KEY) === '1';
  } catch {
    return false;
  }
}

export function markUnlocked() {
  sessionStorage.setItem(UNLOCK_KEY, '1');
}

export function lockNow() {
  sessionStorage.removeItem(UNLOCK_KEY);
}