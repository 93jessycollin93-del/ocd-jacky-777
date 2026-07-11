import { base44 } from '@/eru/api/base44Client';

/**
 * ANTI-EXPLOIT GUARDS FOR JADE DROP SYSTEM
 * 
 * Prevents:
 * - Rerolling failed jackpots
 * - Combining multiple pulls into higher tier
 * - Client-side reward manipulation
 * - Missing data inflation defaults
 * - Sequence exploitation
 */

/**
 * Guard 1: Prevent reroll exploitation
 * Each order gets exactly ONE Jade asset, never rerolled
 */
export async function preventRerollExploit(orderId) {
  const orders = await base44.entities.Order.filter(
    { id: orderId },
    '-created_date',
    1
  );

  if (!orders || orders.length === 0) {
    throw new Error('❌ GUARD: Order not found');
  }

  const order = orders[0];

  // If asset already granted for this order, block second grant
  if (order.asset_granted_at && order.asset_grant_reference) {
    throw new Error(
      `❌ GUARD: Jade already granted for this order (${order.asset_grant_reference}). ` +
      `Rerolling is not allowed.`
    );
  }
}

/**
 * Guard 2: Prevent combining multiple pulls
 * Track sequential pulls per user within time window
 */
const PULL_TRACKING = new Map(); // userId → [{ timestamp, orderId }]
const PULL_WINDOW_MS = 60000; // 1 minute window
const MAX_PULLS_PER_WINDOW = 1; // Only 1 pull per minute per user

export function preventSequentialExploit(userId) {
  const now = Date.now();
  const userPulls = PULL_TRACKING.get(userId) || [];

  // Remove old pulls outside window
  const recentPulls = userPulls.filter((p) => now - p.timestamp < PULL_WINDOW_MS);

  if (recentPulls.length >= MAX_PULLS_PER_WINDOW) {
    throw new Error(
      `❌ GUARD: Too many Jade pulls in short time. ` +
      `Maximum ${MAX_PULLS_PER_WINDOW} per ${PULL_WINDOW_MS / 1000} seconds.`
    );
  }

  // Track this pull
  recentPulls.push({ timestamp: now, userId });
  PULL_TRACKING.set(userId, recentPulls);
}

/**
 * Guard 3: Prevent max-value defaults on missing data
 */
export function validateDropData(drop) {
  if (!drop || typeof drop.amount_kg !== 'number') {
    throw new Error('❌ GUARD: Invalid drop data — amount_kg must be a number');
  }

  if (drop.amount_kg < 3.5) {
    // Fallback to minimum, never inflate
    drop.amount_kg = 3.5;
  }

  if (drop.amount_kg > 50) {
    // Never exceed hard cap
    drop.amount_kg = 50;
  }

  if (!drop.tier) {
    throw new Error('❌ GUARD: Drop must have assigned tier');
  }

  const VALID_TIERS = ['BASE', 'MID', 'HIGH_RARE', 'LEGENDARY'];
  if (!VALID_TIERS.includes(drop.tier)) {
    throw new Error(`❌ GUARD: Invalid tier "${drop.tier}"`);
  }

  return drop;
}

/**
 * Guard 4: Prevent one-time bonuses from stacking
 * Track bonus drops per user per day
 */
const BONUS_TRACKING = new Map(); // userId → lastBonusDate

export function preventBonusStacking(userId, bonusType = 'daily') {
  const today = new Date().toDateString();
  const lastBonus = BONUS_TRACKING.get(`${userId}:${bonusType}`);

  if (lastBonus === today) {
    throw new Error(
      `❌ GUARD: ${bonusType} bonus already claimed today. ` +
      `Bonuses reset at midnight UTC.`
    );
  }

  BONUS_TRACKING.set(`${userId}:${bonusType}`, today);
}

/**
 * Guard 5: Immutable drop verification
 * Once Jade asset created, verify it matches drop parameters
 */
export async function verifyJadeAssetMatchesDrop(jadeAssetId, expectedDrop) {
  const asset = await base44.entities.JadeAsset.read(jadeAssetId);

  if (!asset) {
    throw new Error('❌ GUARD: Jade asset not found after creation');
  }

  // Verify amount matches (with 0.1kg tolerance for rounding)
  const tolerance = 0.1;
  if (Math.abs(asset.volume_kg - expectedDrop.amount_kg) > tolerance) {
    throw new Error(
      `❌ GUARD: Jade volume mismatch. Created ${asset.volume_kg}kg, expected ${expectedDrop.amount_kg}kg`
    );
  }

  // Verify ownership
  if (!asset.ownership_timeline || asset.ownership_timeline.length === 0) {
    throw new Error('❌ GUARD: Jade has no ownership record');
  }

  return asset;
}

/**
 * Guard 6: Prevent fraud via missing order verification
 * Double-check order status before any grant
 */
export async function verifyOrderBeforeGrant(orderId) {
  const orders = await base44.entities.Order.filter(
    { id: orderId },
    '-created_date',
    1
  );

  if (!orders || orders.length === 0) {
    throw new Error('❌ GUARD: Order not found');
  }

  const order = orders[0];

  if (order.status !== 'paid') {
    throw new Error(
      `❌ GUARD: Order status is "${order.status}", must be "paid" to grant Jade`
    );
  }

  if (order.verification_status !== 'verified') {
    throw new Error(
      `❌ GUARD: Payment not verified for this order`
    );
  }

  if (!order.payment_webhook_verified && order.payment_method !== 'wallet') {
    throw new Error(
      `❌ GUARD: Webhook signature not verified for this order`
    );
  }

  return order;
}

/**
 * Guard 7: Economic inconsistency detection
 * Flag unusual drop patterns for admin review
 */
export async function detectEconomicAnomalies(userId, drop) {
  const userDrops = await base44.entities.EconomyAuditLog.filter(
    { user_email: userId, action: 'asset_granted', asset_type: 'jade' },
    '-created_date',
    100
  );

  if (!userDrops || userDrops.length === 0) {
    return { anomalies: [] };
  }

  const anomalies = [];
  const last10 = userDrops.slice(0, 10);
  const avgAmount = last10.reduce((sum, d) => sum + (d.amount || 0), 0) / last10.length;

  // Check: sudden spike in rewards
  if (drop.amount_kg > avgAmount * 3) {
    anomalies.push(`Drop amount (${drop.amount_kg}kg) is 3x higher than user average (${avgAmount}kg)`);
  }

  // Check: repeated jackpot claims
  const recentJackpots = last10.filter(
    (d) => d.metadata?.drop_tier === 'LEGENDARY'
  ).length;

  if (recentJackpots > 1 && userDrops.length < 50) {
    anomalies.push(`User claimed ${recentJackpots} legendary drops in ${userDrops.length} total drops`);
  }

  if (anomalies.length > 0) {
    // Log for admin review
    await base44.entities.EconomyAuditLog.create({
      action: 'inconsistency_detected',
      user_email: userId,
      status: 'manual_review_required',
      reason: anomalies.join('; '),
      metadata: {
        drop_tier: drop.tier,
        drop_amount: drop.amount_kg,
        recent_history: last10.length,
      },
      triggered_by: 'system',
    });

    return { anomalies, flaggedForReview: true };
  }

  return { anomalies: [] };
}