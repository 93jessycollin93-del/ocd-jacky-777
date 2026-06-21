import { base44 } from '@/eru/api/base44Client';

/**
 * PAYMENT VERIFICATION GUARDS
 * 
 * NO ITEM, CURRENCY, JADE, NFT, OR ASSET CAN BE GRANTED WITHOUT A VERIFIED TRANSACTION ID
 * 
 * Rule: Item delivery is ALWAYS blocked until transaction.status === "verified"
 */

/**
 * Verify payment before granting any asset
 * @param {string} orderId - Unique order identifier
 * @param {number} paidAmount - Amount actually paid
 * @param {number} expectedPrice - Item's listed price
 * @returns {Promise<{allowed: boolean, reason?: string, transactionId?: string}>}
 */
export async function verifyPaymentBeforeGrant(orderId, paidAmount, expectedPrice) {
  // Rule: Check if payment amount matches or exceeds expected price
  if (paidAmount < expectedPrice) {
    return {
      allowed: false,
      reason: `Payment amount ${paidAmount} is less than expected price ${expectedPrice}`,
    };
  }

  // Rule: Look up transaction record
  const transactions = await base44.entities.Transaction.filter(
    { order_id: orderId },
    '-created_date',
    1
  );

  if (!transactions || transactions.length === 0) {
    return {
      allowed: false,
      reason: 'No transaction record found for this order',
    };
  }

  const txn = transactions[0];

  // Rule: Block delivery if status is not "verified"
  if (txn.status !== 'verified') {
    return {
      allowed: false,
      reason: `Transaction status is "${txn.status}" — must be "verified" to grant asset. Current statuses: ${txn.status}`,
      transactionId: txn.id,
    };
  }

  // Rule: Verify the amount in the transaction matches payment
  if (txn.amount < expectedPrice) {
    return {
      allowed: false,
      reason: `Transaction amount ${txn.amount} does not match expected price ${expectedPrice}`,
      transactionId: txn.id,
    };
  }

  return {
    allowed: true,
    transactionId: txn.id,
  };
}

/**
 * Create a pending transaction (before payment)
 * Call this FIRST when user clicks Buy
 * @returns {Promise<string>} transactionId
 */
export async function createPendingTransaction(orderData) {
  const txn = await base44.entities.Transaction.create({
    order_id: orderData.orderId,
    asset_type: orderData.assetType,
    asset_id: orderData.assetId,
    buyer_email: orderData.buyerEmail,
    seller_email: orderData.sellerEmail || null,
    amount: 0, // No payment yet
    expected_amount: orderData.expectedPrice,
    currency: orderData.currency || 'GOLD',
    status: 'pending_payment',
    payment_method: orderData.paymentMethod,
  });
  return txn.id;
}

/**
 * Mark transaction as pending verification (payment submitted, awaiting confirmation)
 */
export async function markPendingVerification(transactionId, paidAmount) {
  await base44.entities.Transaction.update(transactionId, {
    amount: paidAmount,
    status: 'pending_verification',
  });
}

/**
 * Verify transaction and mark as paid (ONLY after payment confirmed)
 * @param {string} transactionId
 * @param {object} metadata - proof data (hash, receipt, etc)
 */
export async function verifyTransaction(transactionId, metadata = {}) {
  await base44.entities.Transaction.update(transactionId, {
    status: 'verified',
    verified_at: new Date().toISOString(),
    verified_by: 'system',
    metadata,
  });
}

/**
 * Mark transaction as failed
 */
export async function failTransaction(transactionId, reason) {
  await base44.entities.Transaction.update(transactionId, {
    status: 'failed',
    failure_reason: reason,
  });
}

/**
 * Get transaction by ID with full validation
 */
export async function getTransactionWithValidation(transactionId) {
  const txns = await base44.entities.Transaction.filter(
    { id: transactionId },
    '-created_date',
    1
  );
  return txns?.[0] || null;
}

/**
 * Guard: Block asset delivery if any payment rules violated
 * Throws error if conditions not met
 */
export async function enforcePaymentGate(transactionId, expectedPrice) {
  const txn = await getTransactionWithValidation(transactionId);

  if (!txn) {
    throw new Error('❌ PAYMENT GATE BLOCKED: Transaction record missing — no asset delivery');
  }

  if (txn.status !== 'verified') {
    throw new Error(`❌ PAYMENT GATE BLOCKED: Transaction status is "${txn.status}" — must be "verified" to deliver asset`);
  }

  if (txn.amount < expectedPrice) {
    throw new Error(`❌ PAYMENT GATE BLOCKED: Paid amount ${txn.amount} < expected price ${expectedPrice}`);
  }

  return txn;
}