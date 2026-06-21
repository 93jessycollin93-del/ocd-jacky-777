import { TON_RECEIVING_ADDRESS } from './tonConfig';

/**
 * TON Payment helpers (frontend)
 * ------------------------------------------------------------------
 * Generates a unique payment reference per order so the backend can
 * uniquely match an on-chain transfer to the order. The reference is
 * embedded in the TON transfer comment field.
 */

/** Short, URL-safe payment reference. e.g. "BZ-7K3F9A2L" */
export function generateTonPaymentRef() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 9; i += 1) id += chars[Math.floor(Math.random() * chars.length)];
  return `BZ-${id}`;
}

/**
 * Build a `ton://transfer/...` deep link that opens Tonkeeper / MyTonWallet
 * pre-filled with the destination address, exact amount (in nanoTON), and
 * the payment-reference comment. Works inside Telegram Mini Apps too.
 */
export function buildTonTransferUrl({ amountTon, comment }) {
  const nano = Math.round(Number(amountTon || 0) * 1e9);
  const params = new URLSearchParams();
  params.set('amount', String(nano));
  if (comment) params.set('text', comment);
  return `ton://transfer/${TON_RECEIVING_ADDRESS}?${params.toString()}`;
}

/**
 * Tonkeeper universal HTTPS link (works as a fallback when ton:// is blocked).
 */
export function buildTonkeeperUniversalUrl({ amountTon, comment }) {
  const nano = Math.round(Number(amountTon || 0) * 1e9);
  const params = new URLSearchParams();
  params.set('amount', String(nano));
  if (comment) params.set('text', comment);
  return `https://app.tonkeeper.com/transfer/${TON_RECEIVING_ADDRESS}?${params.toString()}`;
}

/** Copy helper — returns true on success. */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}