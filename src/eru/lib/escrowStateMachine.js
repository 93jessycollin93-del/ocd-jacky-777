export const ESCROW_STATUS_META = {
  pending: { label: 'Pending', tone: 'text-muted-foreground', badge: 'bg-secondary text-foreground' },
  funds_held: { label: 'Funds held', tone: 'text-blue-400', badge: 'bg-blue-500/10 text-blue-400' },
  payment_confirmed: { label: 'Payment verified', tone: 'text-primary', badge: 'bg-primary/10 text-primary' },
  asset_transferred: { label: 'Asset transferred', tone: 'text-yellow-300', badge: 'bg-yellow-400/10 text-yellow-300' },
  completed: { label: 'Completed', tone: 'text-green-400', badge: 'bg-green-500/10 text-green-400' },
  disputed: { label: 'Disputed', tone: 'text-red-400', badge: 'bg-red-500/10 text-red-400' },
  cancelled: { label: 'Cancelled', tone: 'text-yellow-400', badge: 'bg-yellow-500/10 text-yellow-400' },
};

export function getEscrowStatusMeta(status) {
  return ESCROW_STATUS_META[status] || ESCROW_STATUS_META.pending;
}

export function getEscrowStepState(escrow) {
  const fundsHeld = Boolean(escrow?.buyer_marked_paid);
  const paymentVerified = Boolean(escrow?.payment_verified_at) || escrow?.status === 'payment_confirmed' || escrow?.status === 'asset_transferred' || escrow?.status === 'completed';
  const assetTransferred = Boolean(escrow?.seller_marked_received) || escrow?.status === 'asset_transferred' || escrow?.status === 'completed';
  const released = Boolean(escrow?.completed_at) || escrow?.status === 'completed';

  return { fundsHeld, paymentVerified, assetTransferred, released };
}

export function getNextEscrowPatch(escrow, action, actorEmail) {
  const now = new Date().toISOString();

  if (action === 'mark_paid') {
    return {
      buyer_marked_paid: true,
      buyer_marked_paid_at: now,
      funds_held_at: now,
      status: 'funds_held',
    };
  }

  if (action === 'verify_payment') {
    return {
      payment_verified_at: now,
      payment_verification_status: 'verified',
      status: 'payment_confirmed',
    };
  }

  if (action === 'mark_asset_transferred') {
    return {
      seller_marked_received: true,
      seller_marked_received_at: now,
      asset_transferred_at: now,
      status: escrow?.payment_verified_at || escrow?.status === 'payment_confirmed' ? 'asset_transferred' : escrow?.status,
    };
  }

  if (action === 'request_release') {
    const buyerRequested = actorEmail === escrow?.buyer_email ? true : Boolean(escrow?.buyer_release_requested);
    const sellerRequested = actorEmail === escrow?.seller_email ? true : Boolean(escrow?.seller_release_requested);
    const canComplete = buyerRequested && sellerRequested && (escrow?.seller_marked_received || escrow?.status === 'asset_transferred');

    return {
      buyer_release_requested: buyerRequested,
      seller_release_requested: sellerRequested,
      status: canComplete ? 'completed' : escrow?.status,
      completed_at: canComplete ? now : escrow?.completed_at,
    };
  }

  return {};
}