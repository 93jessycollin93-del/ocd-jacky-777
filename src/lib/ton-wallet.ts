// ── TON Wallet Connection (Architecture-Ready) ──
// Production TON Connect integration placeholder with full type safety
// Real implementation requires @tonconnect/ui-react SDK

export type WalletConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface WalletState {
  status: WalletConnectionStatus;
  address: string | null;
  balance: string | null;
  network: 'mainnet' | 'testnet' | null;
  lastConnected: number | null;
}

export interface TransactionRequest {
  to: string;
  amount: string; // in nanotons
  message?: string;
  /** Require user confirmation before sending */
  requireConfirmation: boolean;
}

export interface TransactionResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

const WALLET_STORAGE_KEY = 'ton_wallet_state';

/** Get persisted wallet state */
export function getPersistedWalletState(): WalletState {
  try {
    const saved = localStorage.getItem(WALLET_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return { status: 'disconnected', address: null, balance: null, network: null, lastConnected: null };
}

/** Persist wallet state */
export function persistWalletState(state: WalletState): void {
  localStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify(state));
}

/** Format TON address for display (truncated) */
export function formatAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/** Format nanotons to TON with decimals */
export function formatTON(nanotons: string): string {
  const val = BigInt(nanotons);
  const whole = val / BigInt(1e9);
  const frac = val % BigInt(1e9);
  const fracStr = frac.toString().padStart(9, '0').slice(0, 4);
  return `${whole}.${fracStr}`;
}

/** Security: Validate a TON address format */
export function isValidTONAddress(address: string): boolean {
  // TON addresses: raw (66 hex chars) or user-friendly (48 base64 chars)
  const rawPattern = /^[0-9a-fA-F]{64}$/;
  const friendlyPattern = /^[A-Za-z0-9_-]{48}$/;
  return rawPattern.test(address) || friendlyPattern.test(address);
}
