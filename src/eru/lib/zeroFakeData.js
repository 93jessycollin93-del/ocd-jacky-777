// Zero Fake Data — central truth/policy layer for all pricing surfaces.
// This module is the single source of truth for:
//   • the 7 user-facing trust labels
//   • the freshness window
//   • the global "Zero Fake Data Mode" toggle (ON by default, owner-gated)
//   • normalization helpers that REFUSE to fabricate values
//
// Anything in the app that displays a price or claims an identification must
// route through these helpers. If a real source is missing, helpers return a
// state object with a label — never a number pretending to be a price.

import { base44 } from '@/eru/api/base44Client';

// ---- Public constants -----------------------------------------------------

export const TRUST_LABELS = {
  VERIFIED:           'Verified Price',
  MULTIPLE_VERIFIED:  'Multiple Verified Sources',
  ESTIMATE_RANGE:     'Estimate Range',
  NEEDS_REVIEW:       'Needs Manual Review',
  NO_VERIFIED_PRICE:  'No Verified Price',
  SOURCE_OFFLINE:     'Source Offline',
  STALE:              'Stale Data',
  NOT_CONNECTED:      'Not Connected',
  MANUAL:             'Owner Manual Price',
  DEMO:               'Demo / Test Only',
};

export const TRUST_BADGES = {
  verified_source:   { label: 'Verified Source',   tone: 'ok' },
  multiple_sources:  { label: 'Multiple Sources',  tone: 'ok' },
  stale:             { label: 'Stale',             tone: 'warn' },
  manual_entry:      { label: 'Manual Entry',      tone: 'info' },
  needs_review:      { label: 'Needs Review',      tone: 'warn' },
  no_data:           { label: 'No Data',           tone: 'muted' },
  not_connected:     { label: 'Not Connected',     tone: 'muted' },
  demo:              { label: 'Demo / Test Only',  tone: 'danger' },
};

// Default freshness window (24h). Pricing older than this surfaces as Stale.
export const DEFAULT_FRESHNESS_MS = 24 * 60 * 60 * 1000;

// Default identity confidence threshold. Below this → Needs Review.
export const DEFAULT_CONFIDENCE_THRESHOLD = 75;

// Currencies considered safe to display directly without conversion.
export const DEFAULT_DISPLAY_CURRENCY = 'CAD';

// ---- Zero Fake Data Mode toggle ------------------------------------------
// The mode is ON by default. The only way to disable it is owner/admin via
// the Settings UI. When disabled, every price shown by the app gets the
// `demo` badge and a loud warning — production users must never land in that
// state.

const MODE_KEY = 'eru_zero_fake_data_mode';

export function getZeroFakeDataMode() {
  try {
    const raw = localStorage.getItem(MODE_KEY);
    if (raw === null) return 'on';
    return raw === 'off' ? 'off' : 'on';
  } catch {
    return 'on';
  }
}

export function setZeroFakeDataMode(nextMode, { actorEmail, actorRole } = {}) {
  if (actorRole !== 'admin') {
    throw new Error('Only an admin can change Zero Fake Data Mode.');
  }
  const value = nextMode === 'off' ? 'off' : 'on';
  try { localStorage.setItem(MODE_KEY, value); } catch { /* quota */ }
  // Audit best-effort, never blocks.
  base44.entities.PricingAuditLog?.create?.({
    source: 'system',
    source_type: 'unknown',
    request_status: 'ok',
    user_label_shown: value === 'off' ? TRUST_LABELS.DEMO : TRUST_LABELS.VERIFIED,
    warnings: value === 'off' ? ['zero_fake_data_mode_disabled'] : [],
    owner_email: actorEmail || '',
  }).catch?.(() => null);
  return value;
}

// ---- Pricing result normalization ----------------------------------------

/**
 * Decide the user-facing label for a single pricing source attempt. NEVER
 * invents a value — only chooses a label.
 *
 * @param {object} args
 * @param {string} args.requestStatus  ok | no_data | rate_limited | stale | failed | not_connected | needs_review
 * @param {number=} args.returnedValue
 * @param {string=} args.lastUpdatedISO
 * @param {number=} [args.freshnessMs=DEFAULT_FRESHNESS_MS]
 */
export function labelForSource({ requestStatus, returnedValue, lastUpdatedISO, freshnessMs = DEFAULT_FRESHNESS_MS }) {
  if (requestStatus === 'not_connected') return TRUST_LABELS.NOT_CONNECTED;
  if (requestStatus === 'failed' || requestStatus === 'rate_limited') return TRUST_LABELS.SOURCE_OFFLINE;
  if (requestStatus === 'needs_review') return TRUST_LABELS.NEEDS_REVIEW;
  if (requestStatus === 'no_data' || returnedValue == null || Number.isNaN(returnedValue)) {
    return TRUST_LABELS.NO_VERIFIED_PRICE;
  }
  if (lastUpdatedISO) {
    const age = Date.now() - new Date(lastUpdatedISO).getTime();
    if (Number.isFinite(age) && age > freshnessMs) return TRUST_LABELS.STALE;
  }
  if (requestStatus === 'stale') return TRUST_LABELS.STALE;
  return TRUST_LABELS.VERIFIED;
}

/**
 * Choose the top-level label for a pricing panel given multiple source
 * attempts. Only returns "Verified" or "Multiple Verified" when at least one
 * (or two) sources actually returned data. Never fabricates.
 */
export function summarizePricingResults(results = []) {
  if (!Array.isArray(results) || results.length === 0) {
    return { label: TRUST_LABELS.NO_VERIFIED_PRICE, badge: 'no_data', verifiedCount: 0 };
  }
  const verified = results.filter((r) => r.user_label_shown === TRUST_LABELS.VERIFIED);
  if (verified.length >= 2) return { label: TRUST_LABELS.MULTIPLE_VERIFIED, badge: 'multiple_sources', verifiedCount: verified.length };
  if (verified.length === 1) return { label: TRUST_LABELS.VERIFIED, badge: 'verified_source', verifiedCount: 1 };

  if (results.every((r) => r.user_label_shown === TRUST_LABELS.NOT_CONNECTED)) {
    return { label: TRUST_LABELS.NOT_CONNECTED, badge: 'not_connected', verifiedCount: 0 };
  }
  if (results.some((r) => r.user_label_shown === TRUST_LABELS.STALE)) {
    return { label: TRUST_LABELS.STALE, badge: 'stale', verifiedCount: 0 };
  }
  if (results.some((r) => r.user_label_shown === TRUST_LABELS.NEEDS_REVIEW)) {
    return { label: TRUST_LABELS.NEEDS_REVIEW, badge: 'needs_review', verifiedCount: 0 };
  }
  return { label: TRUST_LABELS.NO_VERIFIED_PRICE, badge: 'no_data', verifiedCount: 0 };
}

/**
 * Honest currency renderer. Returns either { value, currency } or
 * { value: null, fallback: "CAD conversion unavailable" } — never invents
 * a conversion rate.
 */
export function formatPriceHonest({ amount, sourceCurrency, displayCurrency = DEFAULT_DISPLAY_CURRENCY, conversionRate }) {
  if (amount == null || Number.isNaN(amount)) {
    return { displayed: null, raw: null, note: 'No verified amount.' };
  }
  if (!sourceCurrency) {
    return { displayed: amount.toFixed(2), raw: amount, note: 'Source currency unspecified — shown as raw value.' };
  }
  // No conversion → render in source currency, never invent a CAD value.
  if (sourceCurrency === displayCurrency || !conversionRate) {
    return {
      displayed: `${amount.toFixed(2)} ${sourceCurrency}`,
      raw: amount,
      note: sourceCurrency === displayCurrency ? null : `${displayCurrency} conversion unavailable.`,
    };
  }
  const converted = amount * conversionRate;
  return {
    displayed: `${converted.toFixed(2)} ${displayCurrency}`,
    raw: amount,
    note: `Converted from ${amount.toFixed(2)} ${sourceCurrency} using configured rate.`,
  };
}

/**
 * Decide whether an identification candidate is high-confidence enough to
 * preselect. Strict gate — never claims certainty below the threshold.
 */
export function isHighConfidence(candidate, threshold = DEFAULT_CONFIDENCE_THRESHOLD) {
  if (!candidate) return false;
  return Number(candidate.confidence) >= threshold;
}

// ---- Audit log helper -----------------------------------------------------

export async function logPricingAudit(payload) {
  try {
    await base44.entities.PricingAuditLog.create({
      source:           payload.source || 'unknown',
      source_type:      payload.sourceType || 'unknown',
      request_status:   payload.requestStatus || 'no_data',
      returned_value:   payload.returnedValue ?? undefined,
      normalized_value: payload.normalizedValue ?? undefined,
      currency:         payload.currency || '',
      conversion_source:    payload.conversionSource || '',
      conversion_timestamp: payload.conversionTimestamp || '',
      condition_basis:  payload.conditionBasis || 'unknown',
      grade:            payload.grade || '',
      confidence:       payload.confidence ?? undefined,
      warnings:         payload.warnings || [],
      user_label_shown: payload.userLabelShown || TRUST_LABELS.NO_VERIFIED_PRICE,
      scan_id:          payload.scanId || '',
      card_id:          payload.cardId || '',
      candidate_id:     payload.candidateId || '',
      owner_email:      payload.ownerEmail || '',
    });
  } catch {
    /* audit must never block the user */
  }
}

// ---- Connector status (honest empty by default) --------------------------
// Pricing providers must be wired through server-side functions/secrets.
// Until then, every source defaults to `not_connected` so the UI shows the
// truthful empty state.

export const PRICING_PROVIDERS = [
  { key: 'tcgplayer',  label: 'TCGplayer',  type: 'marketplace' },
  { key: 'cardmarket', label: 'Cardmarket', type: 'marketplace' },
  { key: 'ebay_sold',  label: 'eBay Sold',  type: 'sold_comps'  },
  { key: 'pricecharting', label: 'PriceCharting', type: 'price_index' },
  { key: 'pokemon_tcg_api', label: 'Pokémon TCG API', type: 'card_database' },
];

const PROVIDER_STATUS_KEY = 'eru_pricing_provider_status';

export function getPricingProviderStatus() {
  try {
    const saved = JSON.parse(localStorage.getItem(PROVIDER_STATUS_KEY) || '{}');
    return PRICING_PROVIDERS.reduce((acc, p) => {
      acc[p.key] = saved[p.key] === 'connected' ? 'connected' : 'not_connected';
      return acc;
    }, {});
  } catch {
    return PRICING_PROVIDERS.reduce((acc, p) => { acc[p.key] = 'not_connected'; return acc; }, {});
  }
}

export function setPricingProviderStatus(key, value, { actorRole } = {}) {
  if (actorRole !== 'admin') throw new Error('Only an admin can change provider status.');
  try {
    const saved = JSON.parse(localStorage.getItem(PROVIDER_STATUS_KEY) || '{}');
    saved[key] = value === 'connected' ? 'connected' : 'not_connected';
    localStorage.setItem(PROVIDER_STATUS_KEY, JSON.stringify(saved));
  } catch { /* quota */ }
}