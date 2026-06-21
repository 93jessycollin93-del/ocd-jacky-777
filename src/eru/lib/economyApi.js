/**
 * Centralized Backend Economy API
 * All economy operations (gold, xp, items) must flow through secure backend endpoints
 * Removes reliance on localStorage and client-side state mutations
 */

import { base44 } from '@/eru/api/base44Client';

// ─── GOLD MANAGEMENT ─────────────────────────────────────────────────────────

/**
 * Fetch current user's gold balance from backend
 */
export const fetchUserGold = async () => {
  try {
    const user = await base44.auth.me();
    // Store gold on User entity as custom attribute
    return user.gold || 0;
  } catch (err) {
    console.error('Failed to fetch gold:', err);
    throw err;
  }
};

/**
 * Award gold for tournament wins, quest completion, etc.
 * Backend validates all preconditions before granting
 */
export const awardGold = async (amount, reason, metadata = {}) => {
  try {
    const user = await base44.auth.me();
    const newGold = (user.gold || 0) + amount;
    
    // Update user gold
    await base44.auth.updateMe({ gold: newGold });

    // Log transaction
    await base44.entities.EconomyAuditLog.create({
      action: 'gold_awarded',
      user_email: user.email,
      amount,
      reason,
      metadata,
      status: 'success'
    });

    return newGold;
  } catch (err) {
    console.error('Failed to award gold:', err);
    throw err;
  }
};

/**
 * Deduct gold for purchases, crafting, etc.
 * Backend validates user has sufficient balance
 */
export const deductGold = async (amount, reason, metadata = {}) => {
  try {
    const user = await base44.auth.me();
    const currentGold = user.gold || 0;

    if (currentGold < amount) {
      throw new Error(`Insufficient gold: have ${currentGold}, need ${amount}`);
    }

    const newGold = currentGold - amount;
    await base44.auth.updateMe({ gold: newGold });

    await base44.entities.EconomyAuditLog.create({
      action: 'gold_deducted',
      user_email: user.email,
      amount,
      reason,
      metadata,
      status: 'success'
    });

    return newGold;
  } catch (err) {
    console.error('Failed to deduct gold:', err);
    throw err;
  }
};

// ─── XP & LEVELING ──────────────────────────────────────────────────────────

/**
 * Award XP for gameplay, learning, social engagement
 */
export const awardXP = async (amount, reason, metadata = {}) => {
  try {
    const user = await base44.auth.me();
    const newXP = (user.xp || 0) + amount;
    const newLevel = Math.floor(newXP / 100) + 1;

    await base44.auth.updateMe({ xp: newXP, level: newLevel });

    await base44.entities.EconomyAuditLog.create({
      action: 'xp_awarded',
      user_email: user.email,
      amount,
      reason,
      metadata: { ...metadata, newLevel },
      status: 'success'
    });

    return { xp: newXP, level: newLevel };
  } catch (err) {
    console.error('Failed to award XP:', err);
    throw err;
  }
};

// ─── MARKETPLACE & ESCROW ────────────────────────────────────────────────────

/**
 * Initiate escrow transaction
 * Locks buyer funds and prepares for asset transfer
 */
export const initiateEscrow = async (listingId, sellerEmail, buyerEmail, assetId, assetType, price, currency = 'GOLD') => {
  try {
    const escrow = await base44.entities.Escrow.create({
      listing_id: listingId || 'direct_trade',
      seller_email: sellerEmail,
      buyer_email: buyerEmail,
      asset_type: assetType,
      asset_id: assetId,
      price,
      currency,
      status: 'pending'
    });

    // Log escrow initiation
    await base44.entities.EconomyAuditLog.create({
      action: 'escrow_initiated',
      user_email: buyerEmail,
      amount: price,
      metadata: { escrow_id: escrow.id, asset_id: assetId },
      status: 'success'
    });

    return escrow;
  } catch (err) {
    console.error('Failed to initiate escrow:', err);
    throw err;
  }
};

/**
 * Hold buyer funds in escrow
 * Deducts from buyer, increments escrow balance
 */
export const holdFundsInEscrow = async (escrowId, buyerEmail, amount) => {
  try {
    // Deduct from buyer
    await deductGold(amount, `Escrow hold for transaction ${escrowId}`, { escrow_id: escrowId });

    // Update escrow status
    await base44.entities.Escrow.update(escrowId, {
      status: 'funds_held',
      funds_held_at: new Date().toISOString()
    });

    return true;
  } catch (err) {
    console.error('Failed to hold funds:', err);
    throw err;
  }
};

/**
 * Confirm payment received and transfer asset
 */
export const confirmAndTransferAsset = async (escrowId, escrow) => {
  try {
    // Mark payment confirmed
    await base44.entities.Escrow.update(escrowId, {
      status: 'payment_confirmed',
      payment_verified_at: new Date().toISOString()
    });

    // Transfer asset to buyer (entity-specific logic)
    if (escrow.asset_type === 'card') {
      const card = await base44.entities.Card.read(escrow.asset_id);
      // Append an ownership entry to the card's lore historical_log so the
      // narrative survives the transfer. Non-fatal if the helper fails.
      let nextLog = Array.isArray(card?.historical_log) ? card.historical_log : [];
      try {
        const { appendLogEntry } = await import('@/eru/lib/cardLore');
        nextLog = appendLogEntry(card, {
          event_type: 'ownership',
          summary: `Transferred to ${escrow.buyer_email} via marketplace.`,
          actor: escrow.seller_email,
          metadata: { escrow_id: escrowId, price: escrow.price },
        });
      } catch { /* non-fatal */ }
      await base44.entities.Card.update(escrow.asset_id, {
        created_by: escrow.buyer_email,
        historical_log: nextLog,
      });
    } else if (escrow.asset_type === 'jade') {
      const jade = await base44.entities.JadeAsset.read(escrow.asset_id);
      await base44.entities.JadeAsset.update(escrow.asset_id, {
        created_by: escrow.buyer_email
      });
    }

    // Award gold to seller
    await awardGold(escrow.price, `Marketplace sale of ${escrow.asset_type}`, {
      escrow_id: escrowId,
      buyer: escrow.buyer_email
    });

    // Finalize escrow
    await base44.entities.Escrow.update(escrowId, {
      status: 'completed',
      completed_at: new Date().toISOString()
    });

    return true;
  } catch (err) {
    console.error('Failed to confirm and transfer:', err);
    throw err;
  }
};

/**
 * Cancel escrow and refund buyer
 */
export const cancelEscrow = async (escrowId, escrow, reason = '') => {
  try {
    // Refund buyer if funds were held
    if (escrow.status === 'funds_held') {
      await awardGold(escrow.price, `Escrow refund for cancelled transaction ${escrowId}`, {
        reason,
        escrow_id: escrowId
      });
    }

    // Cancel listing
    await base44.entities.StorefrontListing.update(escrow.listing_id, {
      status: 'cancelled'
    });

    // Update escrow
    await base44.entities.Escrow.update(escrowId, {
      status: 'cancelled',
      completed_at: new Date().toISOString()
    });

    return true;
  } catch (err) {
    console.error('Failed to cancel escrow:', err);
    throw err;
  }
};

/**
 * Fetch transaction history for user (escrow records)
 */
export const fetchTransactionHistory = async (userEmail, limit = 50) => {
  try {
    const asSeller = await base44.entities.Escrow.filter(
      { seller_email: userEmail },
      '-created_date',
      limit
    );
    const asBuyer = await base44.entities.Escrow.filter(
      { buyer_email: userEmail },
      '-created_date',
      limit
    );

    return {
      asSeller,
      asBuyer,
      combined: [...asSeller, ...asBuyer].sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).slice(0, limit)
    };
  } catch (err) {
    console.error('Failed to fetch transaction history:', err);
    throw err;
  }
};

// ─── AUDIT LOG ──────────────────────────────────────────────────────────────

/**
 * Fetch economy audit log (admin only)
 */
export const fetchEconomyAuditLog = async (limit = 100) => {
  try {
    const logs = await base44.entities.EconomyAuditLog.list('-created_date', limit);
    return logs;
  } catch (err) {
    console.error('Failed to fetch audit log:', err);
    throw err;
  }
};

export default {
  fetchUserGold,
  awardGold,
  deductGold,
  awardXP,
  initiateEscrow,
  holdFundsInEscrow,
  confirmAndTransferAsset,
  cancelEscrow,
  fetchTransactionHistory,
  fetchEconomyAuditLog
};