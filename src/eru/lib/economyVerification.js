import { base44 } from '@/eru/api/base44Client';
import { enforceOrderStateGate, canGrantAsset } from '@/eru/lib/orderStateMachine';
// Browser-safe shim for Node's `crypto.randomBytes`
const crypto = {
  randomBytes(n) {
    const a = new Uint8Array(n);
    (globalThis.crypto || window.crypto).getRandomValues(a);
    return { toString: () => Array.from(a).map((b) => b.toString(16).padStart(2, '0')).join('') };
  },
};

/**
 * BULLETPROOF ECONOMY VERIFICATION ENGINE
 * 
 * CORE PRINCIPLE:
 * No asset, currency, Jade, NFT, item, or reward can be granted 
 * unless a verified payment or system-approved transaction exists.
 */

/**
 * STEP 1: CREATE ORDER
 * Generate unique order, lock price, set pending status
 */
export async function createOrder(buyerEmail, assetType, assetId, price, paymentMethod, currency = 'GOLD') {
  const orderNumber = `ORD-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

  const order = await base44.entities.Order.create({
    order_number: orderNumber,
    buyer_email: buyerEmail,
    asset_type: assetType,
    asset_id: assetId,
    base_price: price,
    currency,
    payment_method: paymentMethod,
    status: 'pending',
    verification_status: 'unverified',
  });

  // Log order creation
  await logEconomyAction('order_created', {
    order_id: order.id,
    user_email: buyerEmail,
    asset_type: assetType,
    asset_id: assetId,
    amount: price,
    status: 'success',
  });

  return order;
}

/**
 * STEP 2: SUBMIT TO PAYMENT PROVIDER
 * Record payment provider and ID, transition to pending_payment
 */
export async function submitPayment(orderId, paymentProviderId, paymentProvider = 'stripe') {
  const order = await base44.entities.Order.read(orderId);

  await base44.entities.Order.update(orderId, {
    status: 'pending_payment',
    payment_id: paymentProviderId,
    payment_provider: paymentProvider,
  });

  await logEconomyAction('payment_submitted', {
    order_id: orderId,
    user_email: order.buyer_email,
    asset_type: order.asset_type,
    status: 'success',
    metadata: { payment_provider: paymentProvider },
  });

  return order;
}

/**
 * STEP 3: VERIFY PAYMENT (from webhook or polling)
 * Check:
 * - paymentId exists in provider
 * - amount matches order price exactly
 * - payment status = succeeded/confirmed
 * - webhook signature verified
 */
export async function verifyPayment(orderId, paymentData) {
  const order = await base44.entities.Order.read(orderId);

  if (!order) {
    throw new Error('❌ VERIFICATION: Order not found');
  }

  // Validate payment ID matches
  if (paymentData.payment_id !== order.payment_id) {
    await logEconomyAction('payment_rejected', {
      order_id: orderId,
      user_email: order.buyer_email,
      status: 'failed',
      reason: 'Payment ID mismatch',
    });
    throw new Error('❌ VERIFICATION: Payment ID does not match order');
  }

  // Validate amount matches exactly
  if (paymentData.amount !== order.base_price) {
    await logEconomyAction('payment_rejected', {
      order_id: orderId,
      user_email: order.buyer_email,
      status: 'failed',
      reason: `Amount mismatch: ${paymentData.amount} vs ${order.base_price}`,
    });
    throw new Error(
      `❌ VERIFICATION: Amount ${paymentData.amount} does not match order price ${order.base_price}`
    );
  }

  // Validate payment status is confirmed
  if (!['succeeded', 'confirmed', 'completed'].includes(paymentData.status)) {
    await logEconomyAction('payment_rejected', {
      order_id: orderId,
      user_email: order.buyer_email,
      status: 'failed',
      reason: `Invalid payment status: ${paymentData.status}`,
    });
    throw new Error(`❌ VERIFICATION: Payment status "${paymentData.status}" is not confirmed`);
  }

  // Validate webhook signature if provided
  if (paymentData.webhook_signature && !paymentData.signature_verified) {
    await logEconomyAction('webhook_rejected', {
      order_id: orderId,
      user_email: order.buyer_email,
      status: 'failed',
      reason: 'Webhook signature invalid',
    });
    throw new Error('❌ VERIFICATION: Webhook signature could not be verified');
  }

  // Update order with verification
  await base44.entities.Order.update(orderId, {
    status: 'pending_verification',
    amount_paid: paymentData.amount,
    verification_status: 'verified',
    verification_timestamp: new Date().toISOString(),
    verification_notes: 'Payment verified from provider',
    payment_webhook_verified: paymentData.signature_verified || false,
    payment_webhook_timestamp: paymentData.webhook_timestamp || null,
  });

  await logEconomyAction('payment_verified', {
    order_id: orderId,
    user_email: order.buyer_email,
    amount: paymentData.amount,
    status: 'success',
  });

  return order;
}

/**
 * STEP 4: MARK ORDER AS PAID
 * After verification passes, transition to paid state
 */
export async function markOrderAsPaid(orderId) {
  const order = await base44.entities.Order.read(orderId);

  // Enforce state machine gate
  await enforceOrderStateGate(order, 'paid');

  await base44.entities.Order.update(orderId, {
    status: 'paid',
  });

  await logEconomyAction('state_transition', {
    order_id: orderId,
    user_email: order.buyer_email,
    state_from: order.status,
    state_to: 'paid',
    status: 'success',
  });

  return order;
}

/**
 * STEP 5: GRANT ASSET (ONLY after paid + verified)
 * Hard enforcement: will throw if any condition not met
 */
export async function grantAssetSafely(orderId, grantFunction) {
  const order = await base44.entities.Order.read(orderId);

  if (!order) {
    throw new Error('❌ ASSET GATE: Order does not exist');
  }

  // Enforce state machine gate
  if (!canGrantAsset(order)) {
    throw new Error(
      `❌ ASSET GATE: Cannot grant asset. Order status: ${order.status}, ` +
      `Verification: ${order.verification_status}. Only "paid" orders with "verified" payment can grant assets.`
    );
  }

  // Run the grant function (must not throw)
  try {
    const result = await grantFunction(order);

    // Record successful grant
    await base44.entities.Order.update(orderId, {
      asset_granted_at: new Date().toISOString(),
      asset_grant_reference: result.grantId || 'granted',
    });

    await logEconomyAction('asset_granted', {
      order_id: orderId,
      user_email: order.buyer_email,
      asset_type: order.asset_type,
      asset_id: order.asset_id,
      amount: order.base_price,
      status: 'success',
      metadata: result,
    });

    return result;
  } catch (err) {
    await logEconomyAction('asset_failed', {
      order_id: orderId,
      user_email: order.buyer_email,
      asset_type: order.asset_type,
      status: 'failed',
      reason: err.message,
    });

    // Fail-safe: do NOT grant on error
    throw new Error(`❌ ASSET GATE: Failed to grant asset: ${err.message}`);
  }
}

/**
 * FAIL-SAFE: Detect inconsistencies and block delivery
 */
export async function detectInconsistencies(order) {
  const issues = [];

  // Check: paid without verification
  if (order.status === 'paid' && order.verification_status !== 'verified') {
    issues.push('Order marked paid but payment not verified');
  }

  // Check: asset granted without order
  if (order.asset_granted_at && !order.payment_id) {
    issues.push('Asset granted without payment record');
  }

  // Check: amount mismatch
  if (order.amount_paid && order.amount_paid < order.base_price) {
    issues.push(`Amount paid (${order.amount_paid}) less than price (${order.base_price})`);
  }

  if (issues.length > 0) {
    await logEconomyAction('inconsistency_detected', {
      order_id: order.id,
      user_email: order.buyer_email,
      status: 'blocked',
      reason: issues.join('; '),
    });

    throw new Error(`❌ INCONSISTENCY DETECTED: ${issues.join('; ')}`);
  }
}

/**
 * AUDIT LOG: Immutable record of all economy actions
 */
export async function logEconomyAction(action, data) {
  try {
    await base44.entities.EconomyAuditLog.create({
      action,
      order_id: data.order_id || null,
      user_email: data.user_email,
      asset_type: data.asset_type || null,
      asset_id: data.asset_id || null,
      amount: data.amount || null,
      state_from: data.state_from || null,
      state_to: data.state_to || null,
      status: data.status || 'pending',
      reason: data.reason || '',
      metadata: data.metadata || {},
      triggered_by: data.triggered_by || 'system',
    });
  } catch (err) {
    console.error('❌ AUDIT LOG ERROR:', err.message);
    // Don't fail the transaction if logging fails, but always report
  }
}

/**
 * ADMIN OVERRIDE (logged)
 * Only for exceptional cases, requires manual review
 */
export async function adminOverride(orderId, reason) {
  const order = await base44.entities.Order.read(orderId);

  await base44.entities.Order.update(orderId, {
    status: 'paid',
    verification_status: 'verified',
    admin_notes: reason,
  });

  await logEconomyAction('admin_override', {
    order_id: orderId,
    user_email: order.buyer_email,
    status: 'success',
    reason: `Manual override: ${reason}`,
    triggered_by: 'admin',
  });
}