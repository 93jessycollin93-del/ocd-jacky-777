/**
 * Transaction Guard — Fraud Prevention Layer
 * 
 * Provides:
 * 1. Transaction logging to server-side audit ledger
 * 2. Purchase deduplication via unique transaction IDs
 * 3. Rate limiting per transaction source
 * 4. State integrity hashing to detect localStorage tampering
 * 5. Atomic balance checks inside setState callbacks
 */

import { supabase } from '@/integrations/supabase/client';
import type { GameState, Resources } from './types';

// ── Transaction Types ──
export interface TransactionRecord {
  transaction_type: 'purchase' | 'spend' | 'reward' | 'claim';
  currency_type: 'diamonds' | 'stars' | 'usd' | 'ton' | 'gold';
  amount: number;
  balance_before: number;
  balance_after: number;
  source: string;
  source_id?: string;
  metadata?: Record<string, unknown>;
}

// ── Rate Limiter ──
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMITS: Record<string, { maxPerWindow: number; windowMs: number }> = {
  diamond_exchange: { maxPerWindow: 3, windowMs: 60_000 },    // 3 purchases per minute
  jade_store: { maxPerWindow: 5, windowMs: 60_000 },          // 5 purchases per minute
  battle_pass_claim: { maxPerWindow: 10, windowMs: 30_000 },  // 10 claims per 30s
  gacha_pull: { maxPerWindow: 5, windowMs: 30_000 },          // 5 pulls per 30s
  free_gacha: { maxPerWindow: 1, windowMs: 86_400_000 },      // 1 per day
};

export function checkRateLimit(source: string): { allowed: boolean; retryAfterMs: number } {
  const limit = RATE_LIMITS[source];
  if (!limit) return { allowed: true, retryAfterMs: 0 };

  const now = Date.now();
  const entry = rateLimitMap.get(source);

  if (!entry || now >= entry.resetAt) {
    rateLimitMap.set(source, { count: 1, resetAt: now + limit.windowMs });
    return { allowed: true, retryAfterMs: 0 };
  }

  if (entry.count >= limit.maxPerWindow) {
    return { allowed: false, retryAfterMs: entry.resetAt - now };
  }

  entry.count++;
  return { allowed: true, retryAfterMs: 0 };
}

// ── Transaction ID Generation ──
let txCounter = 0;
export function generateTransactionId(source: string): string {
  txCounter++;
  return `${source}_${Date.now()}_${txCounter}_${Math.random().toString(36).slice(2, 8)}`;
}

// ── Deduplication Check ──
const pendingTransactions = new Set<string>();

export function acquireTransactionLock(txId: string): boolean {
  if (pendingTransactions.has(txId)) return false;
  pendingTransactions.add(txId);
  // Auto-release after 30 seconds (safety net)
  setTimeout(() => pendingTransactions.delete(txId), 30_000);
  return true;
}

export function releaseTransactionLock(txId: string): void {
  pendingTransactions.delete(txId);
}

// ── Server-Side Transaction Logging ──
export async function logTransaction(record: TransactionRecord): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return false;

    const { error } = await supabase.from('game_transactions' as any).insert({
      user_id: session.user.id,
      ...record,
    });

    if (error) {
      console.error('[TransactionGuard] Log failed:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error('[TransactionGuard] Log error:', e);
    return false;
  }
}

// ── Server-Side Deduplication ──
export async function checkServerDedup(txId: string, source: string): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return true; // Allow if not authenticated (offline mode)

    const { error } = await supabase.from('game_purchase_locks' as any).insert({
      user_id: session.user.id,
      transaction_id: txId,
      source,
    });

    // If insert fails due to unique constraint, it's a duplicate
    if (error) {
      if (error.code === '23505') {
        console.warn('[TransactionGuard] Duplicate transaction blocked:', txId);
        return false;
      }
      // Other errors — allow but log
      console.error('[TransactionGuard] Dedup check failed:', error.message);
    }
    return true;
  } catch {
    return true; // Fail open for network issues
  }
}

// ── State Integrity ──
const INTEGRITY_KEY = 'me_state_checksum';

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const chr = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return hash.toString(36);
}

export function computeStateChecksum(state: GameState): string {
  // Hash critical economy fields only
  const critical = {
    diamonds: state.resources?.diamonds || 0,
    gold: state.resources?.gold || 0,
    stars: state.telegramStars || 0,
    bpTier: state.battlePass?.tier || 0,
    bpClaimedFree: (state.battlePass?.claimedFree || []).length,
    bpClaimedPremium: (state.battlePass?.claimedPremium || []).length,
    bpPremium: state.battlePass?.isPremium ? 1 : 0,
    gachaInvCount: (state.gachaInventory || []).length,
    bagCount: (state.bag || []).length,
  };
  return simpleHash(JSON.stringify(critical));
}

export function saveStateChecksum(state: GameState): void {
  try {
    localStorage.setItem(INTEGRITY_KEY, computeStateChecksum(state));
  } catch { /* ignore */ }
}

export function verifyStateIntegrity(state: GameState): boolean {
  try {
    const stored = localStorage.getItem(INTEGRITY_KEY);
    if (!stored) return true; // First load
    return stored === computeStateChecksum(state);
  } catch {
    return true;
  }
}

// ── Atomic Balance Operations ──
export function atomicDiamondSpend(
  prev: GameState,
  amount: number,
  source: string,
  sourceId?: string,
): { newState: GameState; success: boolean; txRecord: TransactionRecord | null } {
  const currentBalance = prev.resources?.diamonds || 0;

  if (amount <= 0 || currentBalance < amount) {
    return { newState: prev, success: false, txRecord: null };
  }

  const newBalance = currentBalance - amount;
  const newState: GameState = {
    ...prev,
    resources: { ...prev.resources, diamonds: newBalance },
  };

  const txRecord: TransactionRecord = {
    transaction_type: 'spend',
    currency_type: 'diamonds',
    amount: -amount,
    balance_before: currentBalance,
    balance_after: newBalance,
    source,
    source_id: sourceId,
  };

  return { newState, success: true, txRecord };
}

export function atomicDiamondGrant(
  prev: GameState,
  amount: number,
  source: string,
  sourceId?: string,
  metadata?: Record<string, unknown>,
): { newState: GameState; txRecord: TransactionRecord } {
  const currentBalance = prev.resources?.diamonds || 0;
  const newBalance = currentBalance + amount;

  const newState: GameState = {
    ...prev,
    resources: { ...prev.resources, diamonds: newBalance },
  };

  const txRecord: TransactionRecord = {
    transaction_type: source === 'diamond_exchange' ? 'purchase' : 'reward',
    currency_type: 'diamonds',
    amount,
    balance_before: currentBalance,
    balance_after: newBalance,
    source,
    source_id: sourceId,
    metadata,
  };

  return { newState, txRecord };
}

// ── Guarded Purchase Flow ──
export interface PurchaseResult {
  success: boolean;
  error?: string;
  txId?: string;
}

export async function guardedPurchaseFlow(
  source: string,
  sourceId: string,
  executeTransaction: () => boolean,
): Promise<PurchaseResult> {
  // 1. Rate limit
  const rateCheck = checkRateLimit(source);
  if (!rateCheck.allowed) {
    return {
      success: false,
      error: `Too many purchases. Try again in ${Math.ceil(rateCheck.retryAfterMs / 1000)}s`,
    };
  }

  // 2. Generate unique transaction ID
  const txId = generateTransactionId(source);

  // 3. Acquire local lock
  if (!acquireTransactionLock(txId)) {
    return { success: false, error: 'Transaction already in progress' };
  }

  try {
    // 4. Server-side deduplication
    const dedupOk = await checkServerDedup(txId, source);
    if (!dedupOk) {
      return { success: false, error: 'Duplicate transaction detected' };
    }

    // 5. Execute the actual transaction
    const result = executeTransaction();
    if (!result) {
      return { success: false, error: 'Insufficient balance or invalid transaction' };
    }

    return { success: true, txId };
  } finally {
    releaseTransactionLock(txId);
  }
}
