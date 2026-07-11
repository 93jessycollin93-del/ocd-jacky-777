import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/eru/api/base44Client';
import { Send, ShoppingCart, ShieldCheck, HandCoins, AlertTriangle } from 'lucide-react';

export default function TradeNegotiationChatRoom({ chat, currentUserEmail }) {
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [escrow, setEscrow] = useState(null);
  const [escrowPrice, setEscrowPrice] = useState('');
  const [creatingEscrow, setCreatingEscrow] = useState(false);
  const [updatingEscrow, setUpdatingEscrow] = useState(false);

  const isSeller = currentUserEmail === chat.seller_email;
  const isBuyer = currentUserEmail === chat.buyer_email;

  const loadEscrow = async () => {
    if (!base44.entities?.Escrow) return;
    const rows = await base44.entities.Escrow.filter({ listing_id: chat.post_id }, '-updated_date', 10);
    const match = (rows || []).find((item) => item.buyer_email === chat.buyer_email && item.seller_email === chat.seller_email && item.asset_id === chat.asset_id);
    setEscrow(match || null);
  };

  useEffect(() => {
    loadEscrow();
  }, [chat.id]);

  useEffect(() => {
    if (!base44.entities?.Escrow) return;
    const unsubscribe = base44.entities.Escrow.subscribe(() => loadEscrow());
    return unsubscribe;
  }, [chat.id]);

  const escrowStatusTone = useMemo(() => {
    if (!escrow) return 'text-muted-foreground';
    if (escrow.status === 'completed') return 'text-primary';
    if (escrow.status === 'disputed') return 'text-red-400';
    if (escrow.status === 'cancelled') return 'text-yellow-400';
    return 'text-foreground';
  }, [escrow]);

  const handleSend = async () => {
    if (!draft.trim() || !base44.entities?.TradeNegotiationChat) return;
    setSending(true);
    try {
      const nextMessages = [
        ...(chat.messages || []),
        {
          id: `m-${Date.now()}`,
          author: currentUserEmail === chat.seller_email ? 'Seller' : 'Buyer',
          author_email: currentUserEmail,
          text: draft.trim(),
          created_at: new Date().toISOString(),
        },
      ];
      await base44.entities.TradeNegotiationChat.update(chat.id, {
        messages: nextMessages,
        last_message: draft.trim(),
      });
      setDraft('');
    } finally {
      setSending(false);
    }
  };

  const handleMoveToOrder = async () => {
    if (!base44.entities?.Order || !base44.entities?.TradeNegotiationChat) return;
    setCreatingOrder(true);
    try {
      const order = await base44.entities.Order.create({
        order_number: `NEG-${Date.now()}`,
        buyer_email: chat.buyer_email,
        asset_type: chat.asset_type === 'listing' ? 'item' : chat.asset_type,
        asset_id: chat.asset_id,
        quantity: 1,
        base_price: Number(escrow?.price || 0),
        currency: escrow?.currency || 'GOLD',
        status: 'pending',
        payment_method: 'wallet',
        metadata: {
          negotiation_chat_id: chat.id,
          negotiation_post_id: chat.post_id,
          escrow_id: escrow?.id || null,
        },
      });
      await base44.entities.TradeNegotiationChat.update(chat.id, {
        status: 'moved_to_order',
        linked_order_id: order.id,
      });
    } finally {
      setCreatingOrder(false);
    }
  };

  const handleCreateEscrow = async () => {
    if (!base44.entities?.Escrow || !escrowPrice) return;
    setCreatingEscrow(true);
    try {
      const created = await base44.entities.Escrow.create({
        listing_id: chat.post_id,
        seller_email: chat.seller_email,
        buyer_email: chat.buyer_email,
        asset_type: chat.asset_type === 'listing' ? 'collectible' : chat.asset_type,
        asset_id: chat.asset_id,
        asset_label: chat.post_title,
        price: Number(escrowPrice),
        currency: 'GOLD',
        status: 'pending',
        deal_note: `Escrow created from negotiation chat ${chat.post_title}`,
      });
      setEscrow(created);
      setEscrowPrice('');
    } finally {
      setCreatingEscrow(false);
    }
  };

  const updateEscrow = async (data) => {
    if (!escrow?.id || !base44.entities?.Escrow) return;
    setUpdatingEscrow(true);
    try {
      await base44.entities.Escrow.update(escrow.id, data);
      await loadEscrow();
    } finally {
      setUpdatingEscrow(false);
    }
  };

  const markFundsHeld = () => updateEscrow({
    buyer_marked_paid: true,
    buyer_marked_paid_at: new Date().toISOString(),
    funds_held_at: new Date().toISOString(),
    status: 'funds_held',
  });

  const verifyAssetTransfer = () => updateEscrow({
    seller_marked_received: true,
    seller_marked_received_at: new Date().toISOString(),
    payment_verified_at: new Date().toISOString(),
    status: 'asset_transferred',
  });

  const requestRelease = () => updateEscrow(isBuyer ? {
    buyer_release_requested: true,
    status: escrow?.seller_release_requested ? 'completed' : escrow?.status,
    completed_at: escrow?.seller_release_requested ? new Date().toISOString() : escrow?.completed_at,
  } : {
    seller_release_requested: true,
    status: escrow?.buyer_release_requested ? 'completed' : escrow?.status,
    completed_at: escrow?.buyer_release_requested ? new Date().toISOString() : escrow?.completed_at,
  });

  const openDispute = () => {
    const reason = window.prompt('What is the issue with this escrow?');
    if (!reason) return;
    updateEscrow({
      dispute_opened_by: currentUserEmail,
      dispute_reason: reason,
      status: 'disputed',
    });
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Negotiation: {chat.post_title}</h3>
          <p className="mt-1 text-[11px] text-muted-foreground">Seller: {chat.seller_email} · Buyer: {chat.buyer_email}</p>
        </div>
        <button onClick={handleMoveToOrder} disabled={creatingOrder || chat.status === 'moved_to_order' || !escrow || escrow.status !== 'completed'} className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50">
          <ShoppingCart className="h-3.5 w-3.5" /> {chat.status === 'moved_to_order' ? 'Order created' : creatingOrder ? 'Creating...' : 'Move to order'}
        </button>
      </div>

      <div className="rounded-2xl border border-border bg-secondary/20 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <div>
            <p className="text-sm font-semibold text-foreground">Escrow protection</p>
            <p className="text-[11px] text-muted-foreground">The asset stays in escrow workflow until both sides verify and release the exchange.</p>
          </div>
        </div>

        {!escrow ? (
          <div className="space-y-3">
            <input value={escrowPrice} onChange={(e) => setEscrowPrice(e.target.value)} placeholder="Agreed price in GOLD" className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none" />
            <button onClick={handleCreateEscrow} disabled={!escrowPrice || creatingEscrow} className="w-full rounded-xl bg-primary px-3 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-50">
              {creatingEscrow ? 'Creating escrow...' : 'Start escrow'}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card px-3 py-2">
              <div>
                <p className="text-xs text-muted-foreground">Escrow status</p>
                <p className={`text-sm font-semibold ${escrowStatusTone}`}>{escrow.status}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Protected amount</p>
                <p className="text-sm font-semibold text-foreground">{escrow.price} {escrow.currency}</p>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-3 text-[11px] text-muted-foreground">
              <div className="rounded-lg border border-border bg-card px-3 py-2 flex items-center gap-2"><HandCoins className="w-3.5 h-3.5 text-primary" /> {escrow.buyer_marked_paid ? 'Funds held' : 'Awaiting buyer hold'}</div>
              <div className="rounded-lg border border-border bg-card px-3 py-2 flex items-center gap-2"><ShieldCheck className="w-3.5 h-3.5 text-primary" /> {escrow.seller_marked_received ? 'Asset verified' : 'Awaiting seller verify'}</div>
              <div className="rounded-lg border border-border bg-card px-3 py-2 flex items-center gap-2"><AlertTriangle className="w-3.5 h-3.5 text-primary" /> {escrow.completed_at ? 'Released' : 'Awaiting dual release'}</div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {isBuyer && !escrow.buyer_marked_paid && (
                <button onClick={markFundsHeld} disabled={updatingEscrow} className="h-10 rounded-xl border border-primary/20 bg-primary/10 px-3 text-xs font-medium text-primary disabled:opacity-50">I placed funds in escrow</button>
              )}
              {isSeller && escrow.buyer_marked_paid && !escrow.seller_marked_received && (
                <button onClick={verifyAssetTransfer} disabled={updatingEscrow} className="h-10 rounded-xl border border-primary/20 bg-primary/10 px-3 text-xs font-medium text-primary disabled:opacity-50">I delivered the asset</button>
              )}
              {escrow.status !== 'completed' && escrow.status !== 'cancelled' && (
                <button onClick={requestRelease} disabled={updatingEscrow || !escrow.buyer_marked_paid || !escrow.seller_marked_received} className="h-10 rounded-xl border border-border bg-card px-3 text-xs font-medium text-foreground disabled:opacity-50">Release escrow</button>
              )}
              {escrow.status !== 'completed' && escrow.status !== 'disputed' && (
                <button onClick={openDispute} disabled={updatingEscrow} className="h-10 rounded-xl border border-red-400/20 bg-red-400/5 px-3 text-xs font-medium text-red-400 disabled:opacity-50">Open dispute</button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
        {(chat.messages || []).map((message) => (
          <div key={message.id} className={`rounded-2xl px-4 py-3 ${message.author_email === currentUserEmail ? 'bg-primary text-primary-foreground ml-8' : 'bg-secondary/50 text-foreground mr-8'}`}>
            <p className={`text-[11px] mb-1 ${message.author_email === currentUserEmail ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>{message.author}</p>
            <p className="text-sm leading-relaxed">{message.text}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Send private negotiation message..." className="flex-1 rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm text-foreground outline-none" />
        <button onClick={handleSend} disabled={sending} className="rounded-xl bg-primary p-2.5 text-primary-foreground disabled:opacity-50"><Send className="w-4 h-4" /></button>
      </div>
    </div>
  );
}