import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Inbox, Coins, Repeat, Handshake, AlertTriangle, CheckCircle2,
  Loader2, X, MessageSquare, History, ArrowLeftRight, Reply,
} from 'lucide-react';
import { base44 } from '@/eru/api/base44Client';
import CardDisplay from './CardDisplay';
import { RARITY_STYLES } from './StarterCards';
import { initiateEscrow, holdFundsInEscrow, confirmAndTransferAsset } from '@/eru/lib/economyApi';
import { createCardWithLore } from '@/eru/lib/cardLore';

/**
 * TradingPanel
 * --------------------------------------------------------------------------
 * Peer-to-peer trade hub for Card Arena.
 *
 * Flow:
 *   1. CREATE         - Pick recipient + offered card, optionally request a
 *                       specific card (swap), gold (sale), or both. Add a note.
 *   2. INBOX/SENT     - View incoming + outgoing proposals threaded by
 *                       thread_root_id so counter-offers stay grouped.
 *   3. ACCEPT         - Swap: ownership exchange via createCardWithLore /
 *                              Card.delete (existing pattern).
 *                       Sale: gold flows through existing escrow helpers.
 *   4. DECLINE / CANCEL.
 *   5. COUNTER-OFFER  - Marks original `countered`, creates a new proposal
 *                       with parent_proposal_id + thread_root_id pointing back.
 *
 * History is implicit: the entity is append-only (declined/completed/
 * cancelled/countered are terminal statuses) so trade history is the full
 * list of past proposals where you are proposer or recipient.
 */
export default function TradingPanel({ gold, onGoldChange }) {
  const [me, setMe] = useState(null);
  const [users, setUsers] = useState([]);
  const [myCards, setMyCards] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('inbox'); // inbox | sent | new | history
  const [toast, setToast] = useState(null);

  // form state
  const [recipient, setRecipient] = useState('');
  const [offeredCard, setOfferedCard] = useState(null);
  const [requestType, setRequestType] = useState('swap'); // swap | sale | mixed
  const [requestedCard, setRequestedCard] = useState(null);
  const [goldRequested, setGoldRequested] = useState('');
  const [goldOffered, setGoldOffered] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // counter-offer state
  const [counterTo, setCounterTo] = useState(null);
  const [actingOn, setActingOn] = useState(null);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    const [meRes, userRows, myCardRows, props] = await Promise.all([
      base44.auth.me().catch(() => null),
      base44.entities.User.list().catch(() => []),
      base44.entities.Card.list('-created_date', 200).catch(() => []),
      base44.entities.CardTradeProposal.list('-created_date', 200).catch(() => []),
    ]);
    setMe(meRes);
    setUsers(userRows.filter((u) => u.email !== meRes?.email));
    setMyCards(myCardRows.filter((c) => c?.id && !String(c.id).startsWith('s') && !String(c.id).startsWith('ai_')));
    setProposals(props);
    setLoading(false);
  };

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2400);
  };

  // ─── Threading: group proposals by thread_root_id ────────────────────────
  const threaded = useMemo(() => {
    const byThread = new Map();
    proposals.forEach((p) => {
      const root = p.thread_root_id || p.id;
      if (!byThread.has(root)) byThread.set(root, []);
      byThread.get(root).push(p);
    });
    // Sort each thread oldest→newest, return array of threads sorted by latest activity.
    return Array.from(byThread.values())
      .map((thread) => thread.sort((a, b) => new Date(a.created_date) - new Date(b.created_date)))
      .sort((a, b) => new Date(b[b.length - 1].created_date) - new Date(a[a.length - 1].created_date));
  }, [proposals]);

  const inbox = useMemo(
    () => threaded.filter((thread) => {
      const latest = thread[thread.length - 1];
      return latest.recipient_email === me?.email && latest.status === 'pending';
    }),
    [threaded, me?.email],
  );
  const sent = useMemo(
    () => threaded.filter((thread) => {
      const latest = thread[thread.length - 1];
      return latest.proposer_email === me?.email && latest.status === 'pending';
    }),
    [threaded, me?.email],
  );
  const history = useMemo(
    () => threaded.filter((thread) => {
      const latest = thread[thread.length - 1];
      return ['accepted', 'declined', 'cancelled', 'completed'].includes(latest.status);
    }),
    [threaded],
  );

  // ─── Form helpers ─────────────────────────────────────────────────────────
  const resetForm = () => {
    setRecipient('');
    setOfferedCard(null);
    setRequestType('swap');
    setRequestedCard(null);
    setGoldRequested('');
    setGoldOffered('');
    setNote('');
    setCounterTo(null);
  };

  const validateForm = () => {
    if (!recipient) return 'Pick a recipient.';
    if (!offeredCard) return 'Pick a card to offer.';
    if (requestType === 'swap' && !requestedCard) return 'Pick the card you want.';
    if (requestType === 'sale' && (!goldRequested || Number(goldRequested) < 1)) return 'Enter the gold amount you want.';
    if (requestType === 'mixed' && !requestedCard && (!goldRequested || Number(goldRequested) < 1)) return 'Pick a card or gold amount you want.';
    if (goldOffered && Number(goldOffered) > (gold || 0)) return 'You don’t have enough gold to offer.';
    return null;
  };

  const submitProposal = async () => {
    const err = validateForm();
    if (err) { showToast(err, 'error'); return; }
    setSubmitting(true);

    const isCounter = !!counterTo;
    const parent = counterTo || null;
    const threadRoot = parent?.thread_root_id || parent?.id;

    // If countering, mark the original as 'countered'.
    if (isCounter && parent) {
      await base44.entities.CardTradeProposal.update(parent.id, { status: 'countered' }).catch(() => null);
    }

    await base44.entities.CardTradeProposal.create({
      proposer_email: me.email,
      recipient_email: isCounter ? parent.proposer_email : recipient,
      proposal_type: isCounter ? 'counter' : (requestType === 'sale' ? 'sale' : 'swap'),
      status: 'pending',
      offered_card_id: offeredCard.id,
      offered_card_snapshot: offeredCard,
      requested_card_id: requestedCard?.id,
      requested_card_snapshot: requestedCard || undefined,
      sale_price_gold: requestType === 'sale' ? Number(goldRequested) : (requestType === 'mixed' && goldRequested ? Number(goldRequested) : undefined),
      gold_offered: goldOffered ? Number(goldOffered) : undefined,
      message: note,
      parent_proposal_id: parent?.id,
      thread_root_id: threadRoot,
    });

    showToast(isCounter ? 'Counter-offer sent' : 'Trade proposal sent');
    resetForm();
    setTab(isCounter ? 'sent' : 'sent');
    setSubmitting(false);
    await loadAll();
  };

  // ─── Acceptance handlers ──────────────────────────────────────────────────
  const acceptProposal = async (proposal) => {
    setActingOn(proposal.id);
    try {
      const wantsGold = Number(proposal.sale_price_gold || 0);
      const offersGold = Number(proposal.gold_offered || 0);

      // Sale-only flow
      if (proposal.proposal_type === 'sale' || (wantsGold > 0 && !proposal.requested_card_id)) {
        if ((gold || 0) < wantsGold) { showToast('Not enough gold to accept.', 'error'); return; }
        const escrow = await initiateEscrow(proposal.id, proposal.proposer_email, me.email, proposal.offered_card_id, 'card', wantsGold, 'GOLD');
        await holdFundsInEscrow(escrow.id, me.email, wantsGold);
        await confirmAndTransferAsset(escrow.id, { ...escrow, asset_type: 'card', price: wantsGold, buyer_email: me.email, listing_id: proposal.id });
        await base44.entities.CardTradeProposal.update(proposal.id, { status: 'completed', escrow_id: escrow.id, escrow_status: 'completed' });
        onGoldChange?.((gold || 0) - wantsGold);
        showToast('Trade completed via escrow.');
        await loadAll();
        return;
      }

      // Swap (with optional gold supplements)
      const myRequestedCard = proposal.requested_card_id
        ? myCards.find((card) => card.id === proposal.requested_card_id)
        : null;
      if (proposal.requested_card_id && !myRequestedCard) {
        showToast('Requested card is no longer in your collection.', 'error');
        return;
      }
      if (wantsGold > 0 && (gold || 0) < wantsGold) { showToast('Not enough gold to accept.', 'error'); return; }

      // Card exchange (existing pattern from Marketplace.jsx)
      await createCardWithLore(proposal.offered_card_snapshot, {
        source: 'ownership',
        summary: `Acquired via trade from ${proposal.proposer_email}.`,
        actor: proposal.proposer_email,
        metadata: { proposal_id: proposal.id, kind: 'trade_in' },
      });
      if (myRequestedCard) {
        await createCardWithLore(myRequestedCard, {
          source: 'ownership',
          summary: `Sent via trade to ${proposal.proposer_email}.`,
          actor: me.email,
          metadata: { proposal_id: proposal.id, kind: 'trade_out' },
        });
        await base44.entities.Card.delete(myRequestedCard.id).catch(() => null);
      }

      // Gold supplements via escrow (recipient pays wantsGold OR proposer pays offersGold).
      if (wantsGold > 0) {
        const e = await initiateEscrow(proposal.id, proposal.proposer_email, me.email, proposal.offered_card_id, 'card', wantsGold, 'GOLD');
        await holdFundsInEscrow(e.id, me.email, wantsGold);
        await confirmAndTransferAsset(e.id, { ...e, asset_type: 'card', price: wantsGold, buyer_email: me.email, listing_id: proposal.id });
        onGoldChange?.((gold || 0) - wantsGold);
      }
      if (offersGold > 0) {
        const e = await initiateEscrow(proposal.id, me.email, proposal.proposer_email, proposal.offered_card_id, 'card', offersGold, 'GOLD');
        await holdFundsInEscrow(e.id, proposal.proposer_email, offersGold);
        await confirmAndTransferAsset(e.id, { ...e, asset_type: 'card', price: offersGold, buyer_email: proposal.proposer_email, listing_id: proposal.id });
        onGoldChange?.((gold || 0) + offersGold);
      }

      await base44.entities.CardTradeProposal.update(proposal.id, { status: 'completed' });
      showToast('Trade completed.');
      await loadAll();
    } finally {
      setActingOn(null);
    }
  };

  const declineProposal = async (proposal) => {
    setActingOn(proposal.id);
    await base44.entities.CardTradeProposal.update(proposal.id, { status: 'declined' });
    setActingOn(null);
    showToast('Proposal declined.');
    await loadAll();
  };

  const cancelProposal = async (proposal) => {
    setActingOn(proposal.id);
    await base44.entities.CardTradeProposal.update(proposal.id, { status: 'cancelled' });
    setActingOn(null);
    showToast('Proposal cancelled.');
    await loadAll();
  };

  const startCounter = (proposal) => {
    setCounterTo(proposal);
    // Pre-fill mirror: I want what they offered, I offer what they wanted.
    setRecipient(proposal.proposer_email);
    setOfferedCard(proposal.requested_card_snapshot || null);
    setRequestedCard(proposal.offered_card_snapshot || null);
    setRequestType(proposal.requested_card_id ? 'swap' : 'sale');
    setGoldRequested(proposal.gold_offered ? String(proposal.gold_offered) : '');
    setGoldOffered(proposal.sale_price_gold ? String(proposal.sale_price_gold) : '');
    setNote('');
    setTab('new');
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <Toast toast={toast} />

      <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-900/20 to-orange-900/10 p-4">
        <div className="flex items-center gap-2">
          <ArrowLeftRight className="w-5 h-5 text-amber-300" />
          <h3 className="text-base font-bold text-amber-100">Trading Hub</h3>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Send peer-to-peer offers. Swap cards, exchange gold, or counter back and forth — gold deals are protected by escrow.
        </p>
      </div>

      <div className="flex gap-1 bg-secondary rounded-xl p-1">
        {[
          { id: 'inbox',   label: `Inbox${inbox.length ? ` (${inbox.length})` : ''}`,  icon: Inbox },
          { id: 'sent',    label: 'Sent',          icon: Send },
          { id: 'new',     label: counterTo ? 'Counter' : 'New Trade', icon: Reply },
          { id: 'history', label: 'History',       icon: History },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => { if (t.id !== 'new') setCounterTo(null); setTab(t.id); }}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors
              ${tab === t.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 text-primary animate-spin" /></div>
      ) : (
        <>
          {tab === 'inbox' && <ThreadList threads={inbox} me={me} actingOn={actingOn} onAccept={acceptProposal} onDecline={declineProposal} onCounter={startCounter} emptyMessage="No incoming proposals." />}
          {tab === 'sent' && <ThreadList threads={sent} me={me} actingOn={actingOn} onCancel={cancelProposal} emptyMessage="No outgoing proposals." />}
          {tab === 'history' && <ThreadList threads={history} me={me} readOnly emptyMessage="No completed trades yet." />}
          {tab === 'new' && (
            <NewProposalForm
              counterTo={counterTo}
              recipient={recipient} setRecipient={setRecipient}
              users={users}
              myCards={myCards}
              offeredCard={offeredCard} setOfferedCard={setOfferedCard}
              requestType={requestType} setRequestType={setRequestType}
              requestedCard={requestedCard} setRequestedCard={setRequestedCard}
              goldRequested={goldRequested} setGoldRequested={setGoldRequested}
              goldOffered={goldOffered} setGoldOffered={setGoldOffered}
              gold={gold}
              note={note} setNote={setNote}
              submitting={submitting}
              onSubmit={submitProposal}
              onCancelCounter={() => { setCounterTo(null); resetForm(); }}
            />
          )}
        </>
      )}
    </div>
  );
}

// ─── Thread list + thread row ─────────────────────────────────────────────────
function ThreadList({ threads, me, actingOn, onAccept, onDecline, onCancel, onCounter, readOnly, emptyMessage }) {
  if (!threads || threads.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-secondary/10 p-6 text-center text-xs text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {threads.map((thread) => (
        <ThreadCard
          key={thread[0].id}
          thread={thread}
          me={me}
          actingOn={actingOn}
          onAccept={onAccept}
          onDecline={onDecline}
          onCancel={onCancel}
          onCounter={onCounter}
          readOnly={readOnly}
        />
      ))}
    </div>
  );
}

function ThreadCard({ thread, me, actingOn, onAccept, onDecline, onCancel, onCounter, readOnly }) {
  const latest = thread[thread.length - 1];
  const isRecipient = latest.recipient_email === me?.email;
  const isPending = latest.status === 'pending';
  const counterPart = latest.proposer_email === me?.email ? latest.recipient_email : latest.proposer_email;
  const goldRequested = Number(latest.sale_price_gold || 0);
  const goldOffered = Number(latest.gold_offered || 0);

  return (
    <div className="rounded-xl border border-border bg-card p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold flex items-center gap-1.5 truncate">
            {latest.proposal_type === 'counter' ? <Repeat className="w-3.5 h-3.5 text-amber-300" /> : latest.proposal_type === 'sale' ? <Coins className="w-3.5 h-3.5 text-yellow-400" /> : <Handshake className="w-3.5 h-3.5 text-primary" />}
            <span className="truncate">{latest.proposal_type === 'sale' ? 'Card Sale' : latest.proposal_type === 'counter' ? 'Counter-Offer' : 'Card Swap'}</span>
            {thread.length > 1 && (
              <span className="text-[10px] font-medium text-muted-foreground">· {thread.length} rounds</span>
            )}
          </p>
          <p className="text-[10px] text-muted-foreground truncate">
            {isRecipient ? `From ${counterPart}` : `To ${counterPart}`}
          </p>
        </div>
        <span className={`text-[10px] uppercase rounded-full px-2 py-0.5 border ${statusTone(latest.status)}`}>
          {latest.status}
        </span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {latest.offered_card_snapshot && (
          <CardCol label={isRecipient ? 'They offer' : 'You offer'} card={latest.offered_card_snapshot} extraGold={goldOffered} />
        )}
        <ArrowLeftRight className="w-4 h-4 text-muted-foreground" />
        {latest.requested_card_snapshot ? (
          <CardCol label={isRecipient ? 'They want' : 'You want'} card={latest.requested_card_snapshot} extraGold={goldRequested} />
        ) : goldRequested > 0 ? (
          <GoldCol label={isRecipient ? 'They want' : 'You want'} amount={goldRequested} />
        ) : null}
      </div>

      {latest.message && (
        <p className="rounded-lg bg-secondary/40 px-2.5 py-1.5 text-[11px] text-muted-foreground flex items-start gap-1.5">
          <MessageSquare className="w-3 h-3 mt-0.5 shrink-0" />
          <span className="break-words">{latest.message}</span>
        </p>
      )}

      {!readOnly && isPending && (
        <div className="flex flex-wrap gap-2">
          {isRecipient ? (
            <>
              <button
                onClick={() => onAccept?.(latest)}
                disabled={actingOn === latest.id}
                className="flex-1 min-w-[100px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold py-2 disabled:opacity-40"
              >
                {actingOn === latest.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                Accept
              </button>
              <button
                onClick={() => onCounter?.(latest)}
                disabled={actingOn === latest.id}
                className="flex-1 min-w-[100px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs font-semibold py-2 disabled:opacity-40"
              >
                <Repeat className="w-3.5 h-3.5" /> Counter
              </button>
              <button
                onClick={() => onDecline?.(latest)}
                disabled={actingOn === latest.id}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-secondary border border-border text-xs font-medium py-2 px-3"
              >
                <X className="w-3.5 h-3.5" /> Decline
              </button>
            </>
          ) : (
            <button
              onClick={() => onCancel?.(latest)}
              disabled={actingOn === latest.id}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-secondary border border-border text-xs font-medium py-2 px-3 ml-auto"
            >
              <X className="w-3.5 h-3.5" /> Cancel
            </button>
          )}
        </div>
      )}

      {thread.length > 1 && (
        <details className="rounded-lg border border-border bg-secondary/20 px-2.5 py-1.5">
          <summary className="text-[10px] uppercase tracking-wider text-muted-foreground cursor-pointer">
            Thread history ({thread.length} rounds)
          </summary>
          <ul className="mt-2 space-y-1.5">
            {thread.slice(0, -1).map((p) => (
              <li key={p.id} className="text-[10px] text-muted-foreground flex items-center gap-2">
                <span className={`rounded-full px-1.5 py-0.5 border ${statusTone(p.status)}`}>{p.status}</span>
                <span>{p.proposer_email === me?.email ? 'you' : p.proposer_email}</span>
                <span>→</span>
                <span>{p.recipient_email === me?.email ? 'you' : p.recipient_email}</span>
                <span>·</span>
                <span>{p.proposal_type}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function CardCol({ label, card, extraGold }) {
  const rar = RARITY_STYLES[card?.rarity];
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <CardDisplay card={card} size="sm" />
      <p className="text-[10px] text-foreground truncate max-w-[88px] text-center">{card?.name}</p>
      {rar && <span className={`text-[9px] ${rar.color}`}>{rar.label}</span>}
      {extraGold > 0 && (
        <span className="text-[9px] text-yellow-400 inline-flex items-center gap-0.5">
          <Coins className="w-2.5 h-2.5" /> +{extraGold}g
        </span>
      )}
    </div>
  );
}

function GoldCol({ label, amount }) {
  return (
    <div className="flex flex-col items-center gap-1 px-3">
      <span className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="w-20 h-28 rounded-xl border border-yellow-500/40 bg-yellow-500/10 flex flex-col items-center justify-center">
        <Coins className="w-6 h-6 text-yellow-400" />
        <p className="text-sm font-bold text-yellow-300 mt-1">{amount}g</p>
      </div>
    </div>
  );
}

function statusTone(status) {
  switch (status) {
    case 'pending':   return 'text-amber-300 bg-amber-500/10 border-amber-500/30';
    case 'accepted':
    case 'completed': return 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30';
    case 'declined':  return 'text-red-300 bg-red-500/10 border-red-500/30';
    case 'cancelled': return 'text-muted-foreground bg-secondary border-border';
    case 'countered': return 'text-cyan-300 bg-cyan-500/10 border-cyan-500/30';
    default: return 'text-muted-foreground bg-secondary border-border';
  }
}

// ─── New / counter proposal form ─────────────────────────────────────────────
function NewProposalForm({
  counterTo, recipient, setRecipient, users, myCards,
  offeredCard, setOfferedCard, requestType, setRequestType,
  requestedCard, setRequestedCard, goldRequested, setGoldRequested,
  goldOffered, setGoldOffered, gold, note, setNote,
  submitting, onSubmit, onCancelCounter,
}) {
  return (
    <div className="space-y-3">
      {counterTo && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 flex items-start gap-2">
          <Repeat className="w-4 h-4 text-amber-300 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-amber-200">Counter-offer to {counterTo.proposer_email}</p>
            <p className="text-[10px] text-muted-foreground">The original proposal will be marked as countered.</p>
          </div>
          <button onClick={onCancelCounter} className="text-[11px] text-muted-foreground hover:text-foreground">Cancel</button>
        </div>
      )}

      {!counterTo && (
        <Section label="Recipient">
          <select
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm outline-none"
          >
            <option value="">Choose a player…</option>
            {users.map((u) => (
              <option key={u.id} value={u.email}>{u.full_name || u.email}</option>
            ))}
          </select>
        </Section>
      )}

      <Section label="What you want">
        <div className="flex gap-1 bg-secondary rounded-xl p-1 mb-2">
          {[
            { id: 'swap',  label: 'Swap',  icon: Handshake },
            { id: 'sale',  label: 'Sale',  icon: Coins },
            { id: 'mixed', label: 'Mixed', icon: Repeat },
          ].map((opt) => (
            <button
              key={opt.id}
              onClick={() => setRequestType(opt.id)}
              className={`flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-semibold
                ${requestType === opt.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <opt.icon className="w-3.5 h-3.5" /> {opt.label}
            </button>
          ))}
        </div>

        {(requestType === 'swap' || requestType === 'mixed') && (
          <div>
            <p className="text-[10px] text-muted-foreground mb-1">Their card snapshot — you can paste a card from a counter-offer or skip if you only want gold.</p>
            <p className="text-[10px] text-muted-foreground">{requestedCard ? `Requesting: ${requestedCard.name}` : 'No specific card requested.'}</p>
            {requestedCard && (
              <button onClick={() => setRequestedCard(null)} className="text-[10px] text-red-400 mt-1">Clear</button>
            )}
          </div>
        )}

        {(requestType === 'sale' || requestType === 'mixed') && (
          <div className="mt-2">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Gold you want</label>
            <input
              type="number"
              min="1"
              value={goldRequested}
              onChange={(e) => setGoldRequested(e.target.value)}
              placeholder="e.g. 150"
              className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm outline-none font-mono mt-1"
            />
          </div>
        )}
      </Section>

      <Section label="What you offer">
        <p className="text-[10px] text-muted-foreground mb-2">Pick one card from your collection.</p>
        {myCards.length === 0 ? (
          <p className="text-xs text-muted-foreground">No cards in your collection yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2 max-h-56 overflow-y-auto">
            {myCards.map((card) => (
              <CardDisplay
                key={card.id}
                card={card}
                size="sm"
                selected={offeredCard?.id === card.id}
                onClick={(c) => setOfferedCard((prev) => (prev?.id === c.id ? null : c))}
              />
            ))}
          </div>
        )}
        <div className="mt-2">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Add gold (optional)</label>
          <input
            type="number"
            min="0"
            value={goldOffered}
            onChange={(e) => setGoldOffered(e.target.value)}
            placeholder={`Up to ${gold || 0}g`}
            className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm outline-none font-mono mt-1"
          />
        </div>
      </Section>

      <Section label="Message (optional)">
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note for the recipient…"
          className="w-full min-h-[80px] bg-secondary border border-border rounded-xl px-3 py-2 text-sm outline-none resize-none"
        />
      </Section>

      <button
        onClick={onSubmit}
        disabled={submitting}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold py-3 disabled:opacity-40"
      >
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        {counterTo ? 'Send Counter-Offer' : 'Send Proposal'}
      </button>
    </div>
  );
}

function Section({ label, children }) {
  return (
    <section className="bg-card border border-border rounded-xl p-3">
      <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-2">{label}</p>
      {children}
    </section>
  );
}

function Toast({ toast }) {
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className={`fixed top-16 left-4 right-4 max-w-md mx-auto z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium shadow-xl backdrop-blur-sm ${
            toast.type === 'error'
              ? 'bg-red-900/80 border-red-500/40 text-red-200'
              : 'bg-emerald-900/80 border-emerald-500/40 text-emerald-200'
          }`}
        >
          {toast.type === 'error' ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
          <span className="flex-1">{toast.msg}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}