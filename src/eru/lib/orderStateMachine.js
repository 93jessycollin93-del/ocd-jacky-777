/**
 * STRICT ORDER STATE MACHINE
 * 
 * Valid order states and transitions:
 * 
 *  pending → pending_payment → pending_verification → paid → [asset granted] ✓
 *         ↘ failed (validation error)
 *  
 *  pending_verification → failed (payment rejected)
 *                      → paid (payment verified)
 *  
 *  paid → [asset delivery] (immutable, final state for completed orders)
 *      → refunded (only if refund approved)
 *  
 * INVALID TRANSITIONS / STATES:
 * ❌ pending → paid (skip payment verification)
 * ❌ pending → asset_granted (skip payment entirely)
 * ❌ state: "completed_without_payment"
 * ❌ state: "free_purchase"
 * ❌ state: "instant_grant"
 * ❌ Any direct jump to paid without pending_verification
 */

const VALID_STATES = [
  'pending',
  'pending_payment',
  'pending_verification',
  'paid',
  'failed',
  'refunded',
];

const STATE_TRANSITIONS = {
  pending: ['pending_payment', 'failed'],
  pending_payment: ['pending_verification', 'failed'],
  pending_verification: ['paid', 'failed'],
  paid: ['refunded'], // paid is terminal except for refunds
  failed: [], // terminal state
  refunded: [], // terminal state
};

/**
 * Validate state transition
 * @throws {Error} if transition is invalid
 */
export function validateStateTransition(currentState, nextState) {
  if (!VALID_STATES.includes(currentState)) {
    throw new Error(`❌ INVALID STATE: "${currentState}" is not a valid order state`);
  }

  if (!VALID_STATES.includes(nextState)) {
    throw new Error(`❌ INVALID STATE: "${nextState}" is not a valid order state`);
  }

  const allowed = STATE_TRANSITIONS[currentState];
  if (!allowed.includes(nextState)) {
    throw new Error(
      `❌ INVALID TRANSITION: "${currentState}" → "${nextState}" is not allowed. ` +
      `Valid transitions: ${allowed.join(', ') || 'none (terminal state)'}`
    );
  }
}

/**
 * Enforce state machine rules before granting any asset
 * @throws {Error} if order cannot be transitioned to paid state
 */
export async function enforceOrderStateGate(order, targetState = 'paid') {
  if (!order) {
    throw new Error('❌ ORDER GATE: Order does not exist');
  }

  // Current state must allow transition to target
  try {
    validateStateTransition(order.status, targetState);
  } catch (err) {
    throw new Error(`❌ ORDER GATE: ${err.message}`);
  }

  // If target is 'paid', verify prerequisites
  if (targetState === 'paid') {
    if (!order.payment_id) {
      throw new Error('❌ ORDER GATE: No payment_id recorded — cannot mark as paid');
    }

    if (order.verification_status !== 'verified') {
      throw new Error(
        `❌ ORDER GATE: Payment verification status is "${order.verification_status}" ` +
        `— must be "verified" before marking order as paid`
      );
    }

    if (order.amount_paid === undefined || order.amount_paid === null) {
      throw new Error('❌ ORDER GATE: amount_paid is not set — cannot grant asset');
    }

    if (order.amount_paid < order.base_price) {
      throw new Error(
        `❌ ORDER GATE: Amount paid (${order.amount_paid}) is less than base price (${order.base_price})`
      );
    }

    if (!order.payment_webhook_verified) {
      throw new Error('❌ ORDER GATE: Webhook signature not verified — potential fraud');
    }
  }
}

/**
 * Safe state transition with validation
 */
export async function transitionOrder(order, nextState, reason = '') {
  validateStateTransition(order.status, nextState);

  return {
    ...order,
    status: nextState,
    state_transition_at: new Date().toISOString(),
    state_transition_reason: reason,
  };
}

/**
 * Check if order is in a state where asset can be granted
 */
export function canGrantAsset(order) {
  return order && order.status === 'paid' && order.verification_status === 'verified';
}

/**
 * Check if order is in a terminal state
 */
export function isTerminalState(status) {
  return ['paid', 'failed', 'refunded'].includes(status);
}