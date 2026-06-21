import { base44 } from '@/eru/api/base44Client';
import { enforcePaymentGate } from '@/eru/lib/paymentGuards';

/**
 * ASSET GRANT SYSTEM
 * 
 * ALL asset grants (Jade, NFT, Card, Item, Collectible, Currency) must:
 * 1. Have a verified Transaction record
 * 2. Pass payment verification gate
 * 3. Match the exact asset_id in the transaction
 */

/**
 * Grant Jade to user (ONLY after payment verified)
 */
export async function grantJade(userId, jadeId, transactionId, price) {
  // Enforce payment gate — throws if not verified
  const txn = await enforcePaymentGate(transactionId, price);

  // Verify transaction is for this exact jade
  if (txn.asset_id !== jadeId || txn.asset_type !== 'jade') {
    throw new Error('❌ ASSET MISMATCH: Transaction asset does not match grant request');
  }

  // Transfer jade to user
  const jade = await base44.entities.JadeAsset.read(jadeId);
  await base44.entities.JadeAsset.update(jadeId, {
    ownership_timeline: [
      ...(jade.ownership_timeline || []),
      { owner: userId, acquired_at: new Date().toISOString() },
    ],
    is_listed: false,
  });

  return { success: true, jadeId, transactionId };
}

/**
 * Grant NFT to user (ONLY after payment verified)
 */
export async function grantNFT(userId, nftId, transactionId, price) {
  const txn = await enforcePaymentGate(transactionId, price);

  if (txn.asset_id !== nftId || txn.asset_type !== 'nft') {
    throw new Error('❌ ASSET MISMATCH: Transaction asset does not match grant request');
  }

  // Ownership transfer logic — update your NFT entity
  // Example: await base44.entities.NFT.update(nftId, { owner: userId });

  return { success: true, nftId, transactionId };
}

/**
 * Grant Card to user (ONLY after payment verified)
 */
export async function grantCard(userId, cardId, transactionId, price) {
  const txn = await enforcePaymentGate(transactionId, price);

  if (txn.asset_id !== cardId || txn.asset_type !== 'card') {
    throw new Error('❌ ASSET MISMATCH: Transaction asset does not match grant request');
  }

  // Ownership transfer logic
  const card = await base44.entities.Card.read(cardId);
  await base44.entities.Card.update(cardId, {
    quantity: (card.quantity || 1) + 1,
  });

  return { success: true, cardId, transactionId };
}

/**
 * Grant Item/Collectible to user (ONLY after payment verified)
 */
export async function grantCollectible(userId, itemId, transactionId, price, itemType = 'item') {
  const txn = await enforcePaymentGate(transactionId, price);

  if (txn.asset_id !== itemId || (txn.asset_type !== itemType && txn.asset_type !== 'collectible')) {
    throw new Error('❌ ASSET MISMATCH: Transaction asset does not match grant request');
  }

  // Ownership transfer logic — implement based on your schema

  return { success: true, itemId, transactionId };
}

/**
 * Grant Currency/Balance to user (ONLY after payment verified)
 */
export async function grantCurrency(userId, amount, transactionId) {
  const txn = await enforcePaymentGate(transactionId, amount);

  if (txn.asset_type !== 'currency') {
    throw new Error('❌ ASSET MISMATCH: Transaction is not for currency');
  }

  // Update user balance
  const user = await base44.auth.me();
  const currentBalance = user.balance || 0;
  await base44.auth.updateMe({ balance: currentBalance + amount });

  return { success: true, amount, transactionId };
}

/**
 * Safe wrapper: Try to grant, catch payment failures
 */
export async function safeGrant(grantFn) {
  try {
    return await grantFn();
  } catch (err) {
    if (err.message.includes('PAYMENT GATE BLOCKED') || err.message.includes('ASSET MISMATCH')) {
      console.error('🔒 Payment verification failed:', err.message);
      throw new Error(`Payment verification failed: ${err.message}`);
    }
    throw err;
  }
}