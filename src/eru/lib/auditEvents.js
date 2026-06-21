/**
 * Audit event helper.
 * ----------------------------------------------------------------------------
 * Unified shape for tracking important actions. Persists into the existing
 * `EconomyAuditLog` entity when possible, and ALWAYS also writes into an
 * in-memory + localStorage ring buffer for resilience (useful when RLS denies
 * the write or when offline).
 *
 * Callers do NOT need to await this — it is fire-and-forget. A failed write
 * must never break the user's action.
 *
 * Remaining platform setup:
 *   - Optional: add a dedicated `AppAuditLog` entity with fields matching
 *     `AuditEvent` below. Until then, EconomyAuditLog is reused with
 *     `metadata` carrying the richer event shape.
 * --------------------------------------------------------------------------*/

import { base44 } from '@/eru/api/base44Client';
import { getRole } from './permissions';

const LOCAL_KEY = 'app_audit_events';
const LOCAL_MAX = 200;

/**
 * @typedef {Object} AuditEvent
 * @property {string} action         short slug e.g. "listing.update"
 * @property {string} [target_type]  entity kind e.g. "StorefrontListing"
 * @property {string} [target_id]    entity id
 * @property {'success'|'failure'|'denied'} [status='success']
 * @property {string} [reason]       required when status != success
 * @property {any}    [before]
 * @property {any}    [after]
 * @property {Object} [metadata]
 */

function sanitize(value) {
  if (value === undefined) return undefined;
  try {
    // Avoid persisting giant/recursive objects.
    const str = JSON.stringify(value);
    return str.length > 4000 ? `${str.slice(0, 4000)}…` : value;
  } catch {
    return '[unserializable]';
  }
}

function writeLocalRing(event) {
  try {
    const existing = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
    existing.unshift(event);
    if (existing.length > LOCAL_MAX) existing.length = LOCAL_MAX;
    localStorage.setItem(LOCAL_KEY, JSON.stringify(existing));
  } catch {
    // Storage unavailable — swallow silently.
  }
}

export function readLocalAuditRing() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
  } catch {
    return [];
  }
}

/**
 * Log an audit event. Fire-and-forget.
 */
export function logAuditEvent(user, event) {
  const payload = {
    action: event.action,
    target_type: event.target_type || null,
    target_id: event.target_id || null,
    status: event.status || 'success',
    reason: event.reason || null,
    actor_email: user?.email || null,
    actor_role: getRole(user),
    timestamp: new Date().toISOString(),
    before: sanitize(event.before),
    after: sanitize(event.after),
    metadata: event.metadata || null,
  };

  writeLocalRing(payload);

  // Persist via existing EconomyAuditLog entity. We deliberately don't await
  // or throw — audit failures must never block the user's real action.
  try {
    base44.entities.EconomyAuditLog.create({
      action: payload.action,
      user_email: payload.actor_email || undefined,
      reason: payload.reason || payload.action,
      status: payload.status === 'success' ? 'success' : 'failure',
      metadata: {
        actor_role: payload.actor_role,
        target_type: payload.target_type,
        target_id: payload.target_id,
        before: payload.before,
        after: payload.after,
        ...(payload.metadata || {}),
      },
    }).catch(() => null);
  } catch {
    // Entity not available → local ring already captured it.
  }
}