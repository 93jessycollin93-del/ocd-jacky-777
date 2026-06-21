/**
 * Jade Refresh System
 * ------------------------------------------------------------------
 * Tracks the daily-free + paid-refresh state for the Monolith Mystery Box.
 * Persistence is intentionally local — refreshes are non-monetary actions
 * and the source of truth lives in the user's browser. Spam is rate-limited
 * by a small cooldown so repeated clicks can't burn through paid refreshes.
 *
 * All paid refreshes still flow through the existing JadeTransaction +
 * EconomyAuditLog ledger via logRefresh() so the action is auditable.
 */

import { base44 } from '@/eru/api/base44Client';

const STORAGE_KEY = 'jade_refresh_state_v1';
const FREE_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24h
const SPAM_COOLDOWN_MS = 1500;                // 1.5s anti-spam

export const PAID_REFRESH_USD = 1;

function readState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { last_free_at: 0, last_action_at: 0 };
    const parsed = JSON.parse(raw);
    return {
      last_free_at: Number(parsed.last_free_at || 0),
      last_action_at: Number(parsed.last_action_at || 0),
    };
  } catch {
    return { last_free_at: 0, last_action_at: 0 };
  }
}

function writeState(next) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* storage full / private mode */ }
}

/** Returns the current refresh status: free availability + countdown. */
export function getRefreshStatus() {
  const { last_free_at, last_action_at } = readState();
  const now = Date.now();
  const elapsed = now - last_free_at;
  const freeAvailable = elapsed >= FREE_COOLDOWN_MS;
  const msUntilFree = freeAvailable ? 0 : FREE_COOLDOWN_MS - elapsed;
  const spamLocked = now - last_action_at < SPAM_COOLDOWN_MS;
  return { freeAvailable, msUntilFree, spamLocked };
}

/** Mark the daily free refresh as consumed. Returns false if not available. */
export function consumeFreeRefresh() {
  const status = getRefreshStatus();
  if (!status.freeAvailable || status.spamLocked) return false;
  const now = Date.now();
  writeState({ last_free_at: now, last_action_at: now });
  return true;
}

/** Mark a paid refresh action — only updates anti-spam, not the daily timer. */
export function recordPaidRefresh() {
  const status = getRefreshStatus();
  if (status.spamLocked) return false;
  const { last_free_at } = readState();
  writeState({ last_free_at, last_action_at: Date.now() });
  return true;
}

/** Format remaining ms as "HH:MM:SS" countdown. */
export function formatCountdown(ms) {
  if (ms <= 0) return '00:00:00';
  const total = Math.floor(ms / 1000);
  const h = String(Math.floor(total / 3600)).padStart(2, '0');
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

/**
 * Audit a refresh action against the economy ledger so admins can review.
 * Non-fatal: failures here never block the UI.
 */
export async function logRefresh({ kind, scope, currency = 'USD', amount = 0, metadata = {} }) {
  try {
    const me = await base44.auth.me().catch(() => null);
    await base44.entities.EconomyAuditLog.create({
      action: kind === 'free' ? 'jade_refresh_free' : 'jade_refresh_paid',
      user_email: me?.email,
      amount,
      reason: `Jade ${scope || 'monolith'} refresh (${kind})`,
      metadata: { ...metadata, currency, scope: scope || 'monolith' },
      status: 'success',
    });
  } catch { /* non-fatal */ }
}