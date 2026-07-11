import { base44 } from '@/eru/api/base44Client';

/**
 * JADE ECONOMY STABILITY MONITOR
 * 
 * Tracks total Jade supply and adjusts drop probabilities
 * to prevent long-term inflation.
 * 
 * Strategy: If supply growth exceeds threshold, shift probabilities
 * slightly toward BASE tier to slow inflation.
 */

const ECONOMY_STATE = {
  lastCheckDate: new Date(),
  totalSupply: 0,
  adjustedProbabilities: {
    BASE: 0.60,
    MID: 0.35,
    HIGH_RARE: 0.045,
    LEGENDARY: 0.005,
  },
  inflationFactor: 1.0, // 1.0 = baseline, <1.0 = slower growth
};

const SUPPLY_GROWTH_THRESHOLD_KG = 100000; // 100 tons per check period
const CHECK_INTERVAL_HOURS = 24;

/**
 * Calculate total Jade supply in system
 */
export async function calculateTotalJadeSupply() {
  // Fetch all Jade assets in economy
  const allAssets = await base44.entities.JadeAsset.list('-created_date', 1000);

  if (!allAssets || allAssets.length === 0) {
    return 0;
  }

  const total = allAssets.reduce((sum, asset) => sum + (asset.volume_kg || 0), 0);
  return total;
}

/**
 * Check economy health and adjust probabilities
 */
export async function checkEconomyHealth() {
  const now = new Date();
  const hoursSinceCheck = (now - ECONOMY_STATE.lastCheckDate) / (1000 * 60 * 60);

  // Only check once per interval
  if (hoursSinceCheck < CHECK_INTERVAL_HOURS) {
    return ECONOMY_STATE.adjustedProbabilities;
  }

  // Calculate growth rate
  const currentSupply = await calculateTotalJadeSupply();
  const growth = currentSupply - ECONOMY_STATE.totalSupply;

  // Adjust probabilities if growth too high
  if (growth > SUPPLY_GROWTH_THRESHOLD_KG) {
    // Shift 1-2% from HIGH_RARE+LEGENDARY to BASE+MID
    ECONOMY_STATE.inflationFactor = 0.98;
    ECONOMY_STATE.adjustedProbabilities.BASE += 0.015;
    ECONOMY_STATE.adjustedProbabilities.MID += 0.005;
    ECONOMY_STATE.adjustedProbabilities.HIGH_RARE -= 0.012;
    ECONOMY_STATE.adjustedProbabilities.LEGENDARY -= 0.008;

    await base44.entities.EconomyAuditLog.create({
      action: 'economy_adjustment',
      status: 'success',
      reason: `Supply growth (${growth}kg) exceeded threshold. Shifted probabilities to BASE/MID.`,
      metadata: {
        growth_kg: growth,
        total_supply_kg: currentSupply,
        old_probs: { BASE: 0.60, MID: 0.35 },
        new_probs: ECONOMY_STATE.adjustedProbabilities,
      },
      triggered_by: 'system',
    });
  } else {
    // Reset to baseline if growth normalized
    ECONOMY_STATE.inflationFactor = 1.0;
    ECONOMY_STATE.adjustedProbabilities = {
      BASE: 0.60,
      MID: 0.35,
      HIGH_RARE: 0.045,
      LEGENDARY: 0.005,
    };
  }

  ECONOMY_STATE.totalSupply = currentSupply;
  ECONOMY_STATE.lastCheckDate = now;

  return ECONOMY_STATE.adjustedProbabilities;
}

/**
 * Get current adjusted probabilities
 */
export async function getAdjustedProbabilities() {
  await checkEconomyHealth();
  return ECONOMY_STATE.adjustedProbabilities;
}

/**
 * Manual economy reset (admin only)
 */
export async function resetEconomyState() {
  ECONOMY_STATE.adjustedProbabilities = {
    BASE: 0.60,
    MID: 0.35,
    HIGH_RARE: 0.045,
    LEGENDARY: 0.005,
  };
  ECONOMY_STATE.inflationFactor = 1.0;
  ECONOMY_STATE.lastCheckDate = new Date();
  ECONOMY_STATE.totalSupply = await calculateTotalJadeSupply();

  await base44.entities.EconomyAuditLog.create({
    action: 'admin_override',
    status: 'success',
    reason: 'Economy state manually reset to baseline',
    metadata: ECONOMY_STATE,
    triggered_by: 'admin',
  });
}

/**
 * Get economy dashboard stats
 */
export async function getEconomyStats() {
  const totalSupply = await calculateTotalJadeSupply();
  const allAssets = await base44.entities.JadeAsset.list('-created_date', 1000);

  // Count assets by tier
  const tiers = {
    BASE: allAssets.filter((a) => (a.volume_kg || 0) < 6).length,
    MID: allAssets.filter((a) => (a.volume_kg || 0) >= 6 && (a.volume_kg || 0) < 25).length,
    HIGH_RARE: allAssets.filter((a) => (a.volume_kg || 0) >= 25 && (a.volume_kg || 0) < 30).length,
    LEGENDARY: allAssets.filter((a) => (a.volume_kg || 0) >= 30).length,
  };

  const probs = await getAdjustedProbabilities();

  return {
    total_supply_kg: totalSupply,
    total_assets: allAssets.length,
    assets_by_tier: tiers,
    current_probabilities: probs,
    inflation_factor: ECONOMY_STATE.inflationFactor,
    last_check: ECONOMY_STATE.lastCheckDate,
  };
}