/**
 * WEBHOOK AUTHENTICATION LAYER (client-side stub)
 *
 * Webhook signatures MUST be verified server-side using secrets that are
 * never shipped to the browser. The previous implementation here read
 * VITE_*_WEBHOOK_SECRET env vars, which Vite inlines into the JS bundle —
 * meaning every visitor could lift the secret and forge "verified"
 * webhooks that gated asset/jade grants downstream.
 *
 * This module now intentionally has NO secrets and NO HMAC validation in
 * the browser. The real implementation lives in:
 *   base44/functions/validatePaymentWebhook/entry.ts
 *
 * The remaining helpers (timestamp window, replay cache) are kept because
 * they're harmless and may still be useful as a pre-filter on inbound
 * payloads. They do NOT establish trust on their own.
 */

const TIMESTAMP_TOLERANCE_SECONDS = 300; // 5 minutes
const PROCESSED_WEBHOOKS = new Set(); // In-memory replay cache (use Redis in production)

/**
 * Always throws — signature verification is not allowed client-side.
 * Call the validatePaymentWebhook Deno function instead and trust the
 * payment_webhook_verified flag it sets on the Order entity.
 */
export function validateWebhookSignature() {
  throw new Error(
    'webhookValidator.validateWebhookSignature is server-only. ' +
    'Call base44.functions.invoke("validatePaymentWebhook", ...) instead — ' +
    'the browser must never see the HMAC secret.',
  );
}

/**
 * Validate webhook timestamp (prevent replay attacks)
 * @param {number} webhookTimestamp - Timestamp from webhook (Unix seconds)
 * @returns {boolean} true if timestamp is recent
 */
export function validateWebhookTimestamp(webhookTimestamp) {
  const now = Math.floor(Date.now() / 1000);
  const diff = Math.abs(now - webhookTimestamp);

  if (diff > TIMESTAMP_TOLERANCE_SECONDS) {
    return false; // Webhook is too old or too far in future
  }

  return true;
}

/**
 * Prevent replay attacks using idempotency key
 * @param {string} idempotencyKey - Unique key from webhook
 * @returns {{allowed: boolean, reason?: string}}
 */
export function checkReplayAttempt(idempotencyKey) {
  if (PROCESSED_WEBHOOKS.has(idempotencyKey)) {
    return {
      allowed: false,
      reason: 'Webhook already processed (replay attempt detected)',
    };
  }

  PROCESSED_WEBHOOKS.add(idempotencyKey);
  return { allowed: true };
}

/**
 * Full webhook validation — DEPRECATED in the browser.
 * Use the validatePaymentWebhook Deno function for the real check; this
 * client-side helper is now a no-op that returns invalid so any leftover
 * caller fails closed instead of granting "verified" status with no proof.
 */
export function validateWebhook() {
  return {
    valid: false,
    errors: [
      'Client-side webhook validation removed for security. ' +
      'Invoke base44.functions.invoke("validatePaymentWebhook", { provider, signature, rawBody, timestamp, idempotencyKey }) on the server instead.',
    ],
  };
}