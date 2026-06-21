/**
 * Marketplace validation helpers.
 * ----------------------------------------------------------------------------
 * Pure synchronous validators used BEFORE attempting a listing, purchase,
 * price update, or order-status change. They never talk to the network —
 * they just check the shape/value of inputs and the user's role.
 *
 * Return shape:
 *   { ok: true } | { ok: false, reason: string, code: string }
 *
 * Callers should surface `reason` to the user in a polished "blocked" state.
 * --------------------------------------------------------------------------*/

import { isAuthenticated, canEditListing, canPublishListing } from './permissions';

const KNOWN_CURRENCIES = new Set([
  'USD', 'CAD', 'EUR', 'GBP',
  'GOLD', 'JADEITE', 'USDT', 'USDC',
  'TON', 'BTC', 'ETH', 'SOL', 'BNB',
  'TELEGRAM_STARS',
]);

export function fail(code, reason) {
  return { ok: false, code, reason };
}

export function ok() {
  return { ok: true };
}

export function validatePrice(price, { allowZero = false } = {}) {
  const num = Number(price);
  if (Number.isNaN(num)) return fail('price_invalid', 'Enter a valid price.');
  if (!allowZero && num <= 0) return fail('price_invalid', 'Price must be greater than zero.');
  if (num < 0) return fail('price_negative', 'Price cannot be negative.');
  return ok();
}

export function validateCurrency(currency) {
  if (!currency || typeof currency !== 'string') {
    return fail('currency_missing', 'Currency is required.');
  }
  if (!KNOWN_CURRENCIES.has(currency.toUpperCase())) {
    return fail('currency_unknown', `Currency "${currency}" is not supported.`);
  }
  return ok();
}

export function validateListingDraft(draft) {
  if (!draft) return fail('listing_missing', 'Listing is missing.');
  if (!draft.title || !draft.title.trim()) return fail('title_missing', 'Title is required.');
  const priceCheck = validatePrice(draft.base_price ?? draft.crypto_value);
  if (!priceCheck.ok) return priceCheck;
  if (draft.currency) {
    const currencyCheck = validateCurrency(draft.currency);
    if (!currencyCheck.ok) return currencyCheck;
  }
  return ok();
}

/**
 * Pre-checkout validation. Returns the first failing condition.
 */
export function validatePurchase({ user, listing, paymentSourceConnected = true }) {
  if (!isAuthenticated(user)) return fail('not_authenticated', 'Please sign in to continue.');
  if (!listing) return fail('listing_missing', 'This item is no longer available.');
  if (listing.status && listing.status !== 'active') {
    return fail('listing_unavailable', 'This listing is not currently available for purchase.');
  }
  if (listing.disabled) return fail('listing_disabled', 'This listing is disabled.');
  if (listing.under_review) return fail('listing_under_review', 'This listing is under review.');
  if (typeof listing.quantity === 'number' && listing.quantity <= 0) {
    return fail('out_of_stock', 'This item is out of stock.');
  }
  const priceCheck = validatePrice(listing.base_price, { allowZero: false });
  if (!priceCheck.ok) return priceCheck;
  if (listing.currency) {
    const currencyCheck = validateCurrency(listing.currency);
    if (!currencyCheck.ok) return currencyCheck;
  }
  if (!paymentSourceConnected) {
    return fail('payment_not_connected', 'Connect a payment or wallet source before buying.');
  }
  return ok();
}

export function validateListingEdit({ user, listing }) {
  if (!canEditListing(user, listing)) {
    return fail('forbidden', 'You don’t have permission to edit this listing.');
  }
  return ok();
}

export function validatePublish({ user, listing }) {
  if (!canPublishListing(user, listing)) {
    return fail('forbidden', 'You don’t have permission to publish this listing.');
  }
  const draftCheck = validateListingDraft(listing);
  if (!draftCheck.ok) return draftCheck;
  return ok();
}