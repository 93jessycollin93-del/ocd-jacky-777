import { base44 } from '@/eru/api/base44Client';

/**
 * BALANCED JADE ECONOMY DROP SYSTEM
 *
 * The authoritative roll + grant runs in the `executeJadeDrop` backend
 * function (see base44/functions/executeJadeDrop). `executeSafeJadeDrop` below
 * is a thin client wrapper that invokes it. `generateJadeDrop` is kept only as
 * a CLIENT-SIDE PREVIEW helper for UI — it must never be used to grant an
 * asset, since the browser-side result is not trusted.
 *
 * Distribution:
 * - Base (60%): 3.5kg–6kg, weighted ~4.5kg
 * - Mid (35%): 6kg–25kg, weighted curve
 * - Jackpot (5%): 25kg+ (high rare 4.5%, legendary 0.5%)
 */

const TIERS = {
  BASE: { probability: 0.60, min: 3.5, max: 6.0, label: 'Base Drop' },
  MID: { probability: 0.35, min: 6.0, max: 25.0, label: 'Mid Tier' },
  HIGH_RARE: { probability: 0.045, min: 25.0, max: 30.0, label: 'High Rare' },
  LEGENDARY: { probability: 0.005, min: 30.0, max: 50.0, label: 'Legendary' },
};

const LEGENDARY_HARD_CAP = 50.0; // Maximum Jade per single pull

/**
 * Generate random float in range with optional weight
 * @param min Lower bound
 * @param max Upper bound
 * @param weight Optional center point (0.0–1.0 position)
 */
function weightedRandom(min, max, weight = 0.5) {
  // Weighted distribution: favor values closer to weight position
  const u1 = Math.random();
  const u2 = Math.random();
  
  // Box-Muller approximation for weighted distribution
  const gaussian = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  const normalized = 0.5 + gaussian * 0.15; // Limit sigma
  const clipped = Math.max(0, Math.min(1, normalized));
  
  // Blend toward weight position
  const position = weight * 0.7 + clipped * 0.3;
  return min + position * (max - min);
}

/**
 * Generate single Jade drop (server-side only)
 * @returns {Object} { tier, amount_kg, tierLabel }
 */
export function generateJadeDrop() {
  const roll = Math.random();
  let tier, amount;

  // Tier selection
  if (roll < TIERS.BASE.probability) {
    tier = 'BASE';
    // Weight toward 4.5kg center
    amount = weightedRandom(TIERS.BASE.min, TIERS.BASE.max, 0.5);
  } else if (roll < TIERS.BASE.probability + TIERS.MID.probability) {
    tier = 'MID';
    // Weight toward lower-mid values (~10kg)
    amount = weightedRandom(TIERS.MID.min, TIERS.MID.max, 0.35);
  } else if (roll < TIERS.BASE.probability + TIERS.MID.probability + TIERS.HIGH_RARE.probability) {
    tier = 'HIGH_RARE';
    // Weight toward lower end of high rare
    amount = weightedRandom(TIERS.HIGH_RARE.min, TIERS.HIGH_RARE.max, 0.4);
  } else {
    tier = 'LEGENDARY';
    // Weight toward lower end, hard cap at 50kg
    amount = Math.min(
      LEGENDARY_HARD_CAP,
      weightedRandom(TIERS.LEGENDARY.min, TIERS.LEGENDARY.max, 0.3)
    );
  }

  // Round to 0.1kg precision (prevent floating point exploit)
  amount = Math.round(amount * 10) / 10;

  // CRITICAL: Never return less than base minimum on failure
  if (amount < TIERS.BASE.min) {
    amount = TIERS.BASE.min;
    tier = 'BASE';
  }

  // CRITICAL: Never exceed hard cap
  if (amount > LEGENDARY_HARD_CAP) {
    amount = LEGENDARY_HARD_CAP;
  }

  return {
    tier,
    amount_kg: amount,
    tierLabel: TIERS[tier].label,
  };
}

/**
 * Execute Jade drop for user (with payment verification).
 *
 * Delegates to the `executeJadeDrop` backend function, which performs the roll
 * and the JadeAsset.create() with the service role. This MUST go through the
 * backend: running the roll/create in the browser (as this module used to)
 * lets a user bypass the payment check and mint arbitrary jade directly.
 *
 * @param userId User email (ignored server-side; the authenticated caller is used)
 * @param orderId Payment order ID (for verification)
 * @param dropContext Optional context (activity type, etc)
 */
export async function executeSafeJadeDrop(userId, orderId, dropContext = {}) {
  const res = await base44.functions.invoke('executeJadeDrop', { orderId, dropContext });
  const data = res?.data ?? res;
  if (!data?.ok) {
    throw new Error(`❌ JADE DROP FAILED: ${data?.error || 'unknown error'}`);
  }
  return {
    success: true,
    jadeAssetId: data.jadeAssetId,
    tier: data.tier,
    tierLabel: data.tierLabel,
    amount_kg: data.amount_kg,
  };
}

/**
 * Batch drop execution (multiple users) with stability monitoring
 */
export async function executeBatchDrops(drops) {
  const results = [];

  for (const drop of drops) {
    try {
      const result = await executeSafeJadeDrop(
        drop.userId,
        drop.orderId,
        drop.context
      );
      results.push(result);
    } catch (err) {
      results.push({
        success: false,
        userId: drop.userId,
        error: err.message,
      });
    }
  }

  return results;
}