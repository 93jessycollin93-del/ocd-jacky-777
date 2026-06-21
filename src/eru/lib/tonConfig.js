/**
 * TON Mainnet Payment Configuration
 * ------------------------------------------------------------------
 * Single source of truth for TON wallet integration.
 * Update TON_RECEIVING_ADDRESS here if the receiving wallet changes.
 */

// Receiving wallet — Tonkeeper / mainnet
export const TON_RECEIVING_ADDRESS = 'UQA9AY1w8JZ0RZSqz8vqptMDl0JjD6k0nTxsCcLfK-6heY2-';

// Network: 'mainnet' or 'testnet'
export const TON_NETWORK = 'mainnet';

// Public toncenter API base — used by backend verifier.
// No API key required for low-volume reads, but you can add one later if needed.
export const TONCENTER_API_BASE = TON_NETWORK === 'mainnet'
  ? 'https://toncenter.com/api/v2'
  : 'https://testnet.toncenter.com/api/v2';

// Indicative USD → TON conversion (rough). Real-time pricing is fetched at
// checkout time from the live price hook; this is just a sane fallback.
export const FALLBACK_TON_USD = 5.5;