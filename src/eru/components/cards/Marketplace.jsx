import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/eru/api/base44Client';
import { initiateEscrow, holdFundsInEscrow, confirmAndTransferAsset } from '@/eru/lib/economyApi';
import { createCardWithLore } from '@/eru/lib/cardLore';
import CardDisplay from './CardDisplay';
import { RARITY_STYLES, ELEMENT_COLORS } from './StarterCards';
import { Tag, ShoppingCart, Plus, X, Loader2, Coins, AlertTriangle, CheckCircle2, Repeat, Send, Handshake, Edit2, Check } from 'lucide-react';
import MobileSelect from '@/eru/components/mobile/MobileSelect';
import PullToRefresh from '@/eru/components/mobile/PullToRefresh';

const LISTING_FEE_PCT = 0.05; // 5% listing fee

export default function Marketplace({ gold, onGoldChange }) {
  const [listings, setListings] = useState([]);
  const [myCards, setMyCards] = useState([]);
  const [myListings, setMyListings] = useState([]);
  const [tradeProposals, setTradeProposals] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('browse'); // browse | my_listings | sell | trade
  const [filterRarity, setFilterRarity] = useState('all');
  const [filterElement, setFilterElement] = useState('all');
  const [selectedCard, setSelectedCard] = useState(null);
  const [tradeTargetCard, setTradeTargetCard] = useState(null);
  const [tradeRecipient, setTradeRecipient] = useState('');
  const [tradeType, setTradeType] = useState('swap');
  const [tradePrice, setTradePrice] = useState('');
  const [tradeMessage, setTradeMessage] = useState('');
  const [listPrice, setListPrice] = useState('');
  const [posting, setPosting] = useState(false);
  const [buying, setBuying] = useState(null);
  const [editingListingId, setEditingListingId] = useState(null);
  const [editingListingPrice, setEditingListingPrice] = useState('');
  const [proposalActionId, setProposalActionId] = useState(null);
  const [toast, setToast] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadAll();
    base44.auth.me().then(u => setUser(u)).catch(() => {});
  }, []);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadAll = async () => {
    setLoading(true);
    const me = await base44.auth.me().catch(() => null);
    const [all, cards, proposals, userRows] = await Promise.all([
      base44.entities.CardListing.filter({ status: 'active' }, '-created_date', 50),
      base44.entities.Card.list('-created_date', 100),
      base44.entities.CardTradeProposal.list('-created_date', 100).catch(() => []),
      base44.entities.User.list().catch(() => []),
    ]);
    setListings(all.filter(l => l.seller_email !== me?.email));
    setMyListings(all.filter(l => l.seller_email === me?.email));
    setMyCards(cards);
    setTradeProposals(proposals);
    setUsers(userRows.filter((row) => row.email !== me?.email));
    setLoading(false);
  };

  const listCard = async () => {
    const price = parseInt(listPrice);
    if (!selectedCard || !price || price < 1) return;
    const fee = Math.ceil(price * LISTING_FEE_PCT);
    const totalCost = fee;
    if (gold < totalCost) { showToast(`Need ${totalCost}g listing fee`, 'error'); return; }

    setPosting(true);
    const me = await base44.auth.me().catch(() => null);
    await base44.entities.CardListing.create({
      card_name: selectedCard.name,
      card_data: selectedCard,
      price_gold: price,
      seller_email: me?.email || 'unknown',
      seller_display: me?.email ? me.email.split('@')[0] : 'seller',
      status: 'active',
      card_entity_id: selectedCard.id || '',
    });
    onGoldChange(gold - fee);
    showToast(`Listed for ${price}g (−${fee}g fee)`);
    setSelectedCard(null);
    setListPrice('');
    setPosting(false);
    await loadAll();
    setTab('my_listings');
  };

  const buyCard = async (listing) => {
    if (gold < listing.price_gold) { showToast('Not enough gold!', 'error'); return; }
    setBuying(listing.id);
    const me = await base44.auth.me();
    const escrow = await initiateEscrow(listing.id, listing.seller_email, me.email, listing.card_entity_id, 'card', listing.price_gold, 'GOLD');
    await holdFundsInEscrow(escrow.id, me.email, listing.price_gold);
    await confirmAndTransferAsset(escrow.id, { ...escrow, asset_type: 'card', price: listing.price_gold, buyer_email: me.email, listing_id: listing.id });
    await base44.entities.CardListing.update(listing.id, { status: 'sold' });
    onGoldChange(gold - listing.price_gold);
    showToast(`Bought ${listing.card_name} for ${listing.price_gold}g through escrow!`);
    setBuying(null);
    await loadAll();
  };

  const cancelListing = async (listing) => {
    await base44.entities.CardListing.update(listing.id, { status: 'cancelled' });
    showToast('Listing cancelled');
    await loadAll();
  };

  // Edit a card listing's price. Soft-edit only — keeps status and audit
  // trail intact. Ownership is enforced by Base44 entity rules; the UI
  // gate below only shows Edit on the seller's own listings (myListings).
  const startEditListing = (listing) => {
    setEditingListingId(listing.id);
    setEditingListingPrice(String(listing.price_gold ?? ''));
  };
  const cancelEditListing = () => {
    setEditingListingId(null);
    setEditingListingPrice('');
  };
  const saveEditListing = async (listing) => {
    const next = parseInt(editingListingPrice);
    if (!next || next < 1) { showToast('Enter a valid price', 'error'); return; }
    if (next === listing.price_gold) { cancelEditListing(); return; }
    await base44.entities.CardListing.update(listing.id, { price_gold: next });
    showToast(`Price updated to ${next}g`);
    cancelEditListing();
    await loadAll();
  };

  const submitTradeProposal = async () => {
    if (!selectedCard || !tradeRecipient) return;
    if (tradeType === 'swap' && !tradeTargetCard) {
      showToast('Choose a requested card for the swap', 'error');
      return;
    }
    if (tradeType === 'sale' && (!tradePrice || parseInt(tradePrice) < 1)) {
      showToast('Enter a valid sale price', 'error');
      return;
    }

    await base44.entities.CardTradeProposal.create({
      proposer_email: user.email,
      recipient_email: tradeRecipient,
      proposal_type: tradeType,
      offered_card_id: selectedCard.id,
      offered_card_snapshot: selectedCard,
      requested_card_id: tradeTargetCard?.id,
      requested_card_snapshot: tradeTargetCard || undefined,
      sale_price_gold: tradeType === 'sale' ? parseInt(tradePrice) : undefined,
      message: tradeMessage,
      status: 'pending'
    });

    showToast(tradeType === 'swap' ? 'Swap proposal sent' : 'Direct sale offer sent');
    setSelectedCard(null);
    setTradeTargetCard(null);
    setTradeRecipient('');
    setTradeType('swap');
    setTradePrice('');
    setTradeMessage('');
    await loadAll();
  };

  const acceptProposal = async (proposal) => {
    setProposalActionId(proposal.id);
    if (proposal.proposal_type === 'sale') {
      if (gold < proposal.sale_price_gold) {
        showToast('Not enough gold for this direct offer', 'error');
        setProposalActionId(null);
        return;
      }
      const escrow = await initiateEscrow(proposal.id, proposal.proposer_email, user.email, proposal.offered_card_id, 'card', proposal.sale_price_gold, 'GOLD');
      await holdFundsInEscrow(escrow.id, user.email, proposal.sale_price_gold);
      await confirmAndTransferAsset(escrow.id, { ...escrow, asset_type: 'card', price: proposal.sale_price_gold, buyer_email: user.email, listing_id: proposal.id });
      await base44.entities.CardTradeProposal.update(proposal.id, { status: 'completed', escrow_id: escrow.id, escrow_status: 'completed' });
      onGoldChange(gold - proposal.sale_price_gold);
      showToast('Direct purchase completed through escrow');
    } else {
      const myRequestedCard = myCards.find((card) => card.id === proposal.requested_card_id);
      if (!myRequestedCard) {
        showToast('Requested card is no longer in your collection', 'error');
        setProposalActionId(null);
        return;
      }
      await createCardWithLore(proposal.offered_card_snapshot, {
        source: 'ownership',
        summary: `Acquired via swap from ${proposal.proposer_email}.`,
        actor: proposal.proposer_email,
        metadata: { proposal_id: proposal.id, kind: 'swap_in' },
      });
      await createCardWithLore(myRequestedCard, {
        source: 'ownership',
        summary: `Sent via swap to ${proposal.proposer_email}.`,
        actor: user?.email,
        metadata: { proposal_id: proposal.id, kind: 'swap_out' },
      });
      await base44.entities.CardTradeProposal.update(proposal.id, { status: 'completed' });
      showToast('Swap completed');
    }
    setProposalActionId(null);
    await loadAll();
  };

  const declineProposal = async (proposal) => {
    setProposalActionId(proposal.id);
    await base44.entities.CardTradeProposal.update(proposal.id, { status: 'declined' });
    setProposalActionId(null);
    showToast('Trade proposal declined');
    await loadAll();
  };

  const filtered = listings.filter(l => {
    const card = l.card_data;
    if (filterRarity !== 'all' && card?.rarity !== filterRarity) return false;
    if (filterElement !== 'all' && card?.element !== filterElement) return false;
    return true;
  });

  const fee = listPrice ? Math.ceil(parseInt(listPrice || 0) * LISTING_FEE_PCT) : 0;

  // Pull-to-refresh: re-runs the existing data loader.
  const handleRefresh = async () => {
    await loadAll();
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="space-y-4">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className={`fixed top-16 left-4 right-4 max-w-md mx-auto z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium shadow-xl
              ${toast.type === 'error' ? 'bg-red-900/80 border-red-500/40 text-red-300' : 'bg-green-900/80 border-green-500/40 text-green-300'}`}>
            {toast.type === 'error' ? <AlertTriangle className="w-4 h-4 flex-shrink-0" /> : <CheckCircle2 className="w-4 h-4 flex-shrink-0" />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sub-tabs */}
      <div className="flex gap-1 bg-secondary rounded-xl p-1">
        {[
          { id: 'browse',      label: 'Browse' },
          { id: 'sell',        label: 'Sell Card' },
          { id: 'trade',       label: 'Trade' },
          { id: 'my_listings', label: 'My Listings' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors
              ${tab === t.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 text-primary animate-spin" /></div>
      ) : (
        <>
          {/* BROWSE */}
          {tab === 'browse' && (
            <div className="space-y-3">
              {/* Filters */}
              <div className="grid grid-cols-2 gap-2">
                <MobileSelect
                  value={filterRarity}
                  onChange={setFilterRarity}
                  title="Filter by rarity"
                  options={[
                    { value: 'all', label: 'All Rarities' },
                    ...['common','rare','epic','legendary','mythic'].map(r => ({ value: r, label: r.charAt(0).toUpperCase() + r.slice(1) })),
                  ]}
                />
                <MobileSelect
                  value={filterElement}
                  onChange={setFilterElement}
                  title="Filter by element"
                  options={[
                    { value: 'all', label: 'All Elements' },
                    ...['fire','water','earth','wind','shadow','light'].map(e => ({ value: e, label: e.charAt(0).toUpperCase() + e.slice(1) })),
                  ]}
                />
              </div>

              {filtered.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No active listings yet</p>
                  <p className="text-[10px] mt-1 opacity-60">Be the first to list a card!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filtered.map(l => {
                    const card = l.card_data;
                    const el = ELEMENT_COLORS[card?.element] || ELEMENT_COLORS.fire;
                    const rar = RARITY_STYLES[card?.rarity] || RARITY_STYLES.common;
                    const canAfford = gold >= l.price_gold;
                    return (
                      <motion.div
                        key={l.id}
                        layout
                        whileHover={{ y: -2 }}
                        transition={{ type: 'spring', stiffness: 320, damping: 24 }}
                        className="group relative bg-card border border-border rounded-xl px-3 py-3.5 flex items-center gap-4 hover:border-primary/40 hover:shadow-[0_8px_24px_-12px_hsl(var(--primary)/0.35)] transition-colors duration-200"
                      >
                        <div className="flex-shrink-0 transition-transform duration-300 ease-out group-hover:scale-[1.04]">
                          {card && <CardDisplay card={card} size="sm" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors duration-200">{l.card_name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[10px] ${rar.color}`}>{rar.label}</span>
                            <span className={`text-[10px] ${el.text}`}>{el.icon} {card?.element}</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1">by @{l.seller_display}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold text-yellow-400 flex items-center gap-1 justify-end">
                            <Coins className="w-3 h-3" />{l.price_gold}g
                          </p>
                          <button
                            onClick={() => buyCard(l)}
                            disabled={!canAfford || buying === l.id}
                            className={`mt-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200
                              ${canAfford ? 'bg-primary text-primary-foreground hover:opacity-90 hover:shadow-[0_0_0_1px_hsl(var(--primary)/0.5)] active:scale-95' : 'bg-secondary text-muted-foreground cursor-not-allowed'}`}>
                            {buying === l.id ? <Loader2 className="w-3 h-3 animate-spin" /> : canAfford ? 'Buy' : 'No gold'}
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* SELL */}
          {tab === 'sell' && (
            <div className="space-y-4">
              <div className="bg-yellow-400/5 border border-yellow-400/20 rounded-xl px-3 py-2 text-xs text-yellow-400 flex items-center gap-2">
                <Tag className="w-3.5 h-3.5 flex-shrink-0" />
                Listing fee: 5% of asking price, charged upfront
              </div>

              {/* Pick card */}
              <div>
                <p className="text-xs font-semibold mb-2">Select a card to list</p>
                {myCards.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No cards in your collection yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {myCards.map(card => (
                      <CardDisplay key={card.id} card={card} size="sm"
                        selected={selectedCard?.id === card.id}
                        onClick={c => setSelectedCard(prev => prev?.id === c.id ? null : c)} />
                    ))}
                  </div>
                )}
              </div>

              {selectedCard && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                  <div className="bg-card border border-primary/30 rounded-xl p-3 flex items-center gap-3">
                    <CardDisplay card={selectedCard} size="sm" glowing />
                    <div>
                      <p className="text-sm font-semibold">{selectedCard.name}</p>
                      <p className={`text-xs ${RARITY_STYLES[selectedCard.rarity]?.color}`}>
                        {RARITY_STYLES[selectedCard.rarity]?.label}
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Asking Price (Gold)</label>
                    <input
                      type="number" min="1" value={listPrice}
                      onChange={e => setListPrice(e.target.value)}
                      placeholder="e.g. 150"
                      className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm outline-none font-mono" />
                  </div>

                  {listPrice && parseInt(listPrice) > 0 && (
                    <div className="bg-secondary/60 rounded-xl p-3 space-y-1 text-xs">
                      <div className="flex justify-between"><span className="text-muted-foreground">Asking price</span><span className="font-mono text-yellow-400">{listPrice}g</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Listing fee (5%)</span><span className="font-mono text-red-400">−{fee}g</span></div>
                      <div className="flex justify-between font-semibold border-t border-border pt-1 mt-1">
                        <span>You pay now</span><span className="text-foreground font-mono">{fee}g</span>
                      </div>
                      {gold < fee && (
                        <p className="text-red-400 flex items-center gap-1 mt-1">
                          <AlertTriangle className="w-3 h-3" /> Not enough gold ({gold}g available)
                        </p>
                      )}
                    </div>
                  )}

                  <button onClick={listCard} disabled={!listPrice || parseInt(listPrice) < 1 || gold < fee || posting}
                    className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm disabled:opacity-40 flex items-center justify-center gap-2">
                    {posting ? <><Loader2 className="w-4 h-4 animate-spin" /> Listing...</> : <><Plus className="w-4 h-4" /> List for Sale</>}
                  </button>
                </motion.div>
              )}
            </div>
          )}

          {/* TRADE */}
          {tab === 'trade' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
                Direct trades let players offer a card swap or a private card sale, with gold deals finalized through escrow for safety.
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Send className="w-4 h-4 text-primary" />
                    <p className="text-sm font-semibold">Create proposal</p>
                  </div>

                  <MobileSelect
                    value={tradeRecipient}
                    onChange={setTradeRecipient}
                    placeholder="Choose player"
                    title="Choose recipient"
                    options={users.map((row) => ({ value: row.email, label: row.full_name || row.email }))}
                  />

                  <div className="flex gap-2">
                    <button onClick={() => setTradeType('swap')} className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold ${tradeType === 'swap' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
                      <Repeat className="w-3.5 h-3.5 inline mr-1" />Swap
                    </button>
                    <button onClick={() => setTradeType('sale')} className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold ${tradeType === 'sale' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
                      <Coins className="w-3.5 h-3.5 inline mr-1" />Sale
                    </button>
                  </div>

                  <div>
                    <p className="text-xs font-semibold mb-2">Your offered card</p>
                    <div className="flex flex-wrap gap-2">
                      {myCards.map(card => (
                        <CardDisplay key={card.id} card={card} size="sm" selected={selectedCard?.id === card.id} onClick={c => setSelectedCard(prev => prev?.id === c.id ? null : c)} />
                      ))}
                    </div>
                  </div>

                  {tradeType === 'swap' && (
                    <div>
                      <p className="text-xs font-semibold mb-2">Requested card from marketplace view</p>
                      <div className="flex flex-wrap gap-2">
                        {listings.slice(0, 8).map((listing) => (
                          <CardDisplay key={listing.id} card={listing.card_data} size="sm" selected={tradeTargetCard?.id === listing.card_data?.id} onClick={() => setTradeTargetCard(listing.card_data)} />
                        ))}
                      </div>
                    </div>
                  )}

                  {tradeType === 'sale' && (
                    <input value={tradePrice} onChange={(e) => setTradePrice(e.target.value)} type="number" min="1" placeholder="Private sale price in gold" className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm outline-none" />
                  )}

                  <textarea value={tradeMessage} onChange={(e) => setTradeMessage(e.target.value)} placeholder="Optional note for the other player" className="w-full min-h-[90px] bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm outline-none resize-none" />

                  <button onClick={submitTradeProposal} className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground">Send Proposal</button>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Handshake className="w-4 h-4 text-primary" />
                    <p className="text-sm font-semibold">Incoming & outgoing</p>
                  </div>
                  <div className="space-y-2">
                    {tradeProposals.length === 0 ? (
                      <div className="rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground">No trade proposals yet.</div>
                    ) : tradeProposals.map((proposal) => {
                      const isRecipient = proposal.recipient_email === user?.email;
                      return (
                        <div key={proposal.id} className="rounded-xl border border-border bg-card p-3 space-y-3">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold">{proposal.proposal_type === 'swap' ? 'Card Swap' : 'Direct Sale'}</p>
                              <p className="text-[10px] text-muted-foreground">{isRecipient ? `From ${proposal.proposer_email}` : `To ${proposal.recipient_email}`}</p>
                            </div>
                            <span className="rounded-full bg-secondary px-2 py-1 text-[10px] uppercase text-muted-foreground">{proposal.status}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            {proposal.offered_card_snapshot && <CardDisplay card={proposal.offered_card_snapshot} size="sm" />}
                            {proposal.proposal_type === 'swap' && proposal.requested_card_snapshot && <CardDisplay card={proposal.requested_card_snapshot} size="sm" />}
                          </div>
                          {proposal.message && <p className="text-xs text-muted-foreground">“{proposal.message}”</p>}
                          {proposal.proposal_type === 'sale' && <p className="text-xs font-semibold text-yellow-400">Price: {proposal.sale_price_gold}g</p>}
                          {isRecipient && proposal.status === 'pending' && (
                            <div className="flex gap-2">
                              <button onClick={() => acceptProposal(proposal)} disabled={proposalActionId === proposal.id} className="flex-1 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-40">Accept</button>
                              <button onClick={() => declineProposal(proposal)} disabled={proposalActionId === proposal.id} className="flex-1 rounded-xl bg-secondary px-3 py-2 text-xs font-semibold">Decline</button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MY LISTINGS */}
          {tab === 'my_listings' && (
            <div className="space-y-3">
              {myListings.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <Tag className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No active listings</p>
                  <button onClick={() => setTab('sell')} className="text-xs text-primary mt-2">List a card →</button>
                </div>
              ) : (
                myListings.map(l => {
                  const card = l.card_data;
                  const rar = RARITY_STYLES[card?.rarity] || RARITY_STYLES.common;
                  return (
                    <motion.div
                      key={l.id}
                      layout
                      whileHover={{ y: -2 }}
                      transition={{ type: 'spring', stiffness: 320, damping: 24 }}
                      className="group bg-card border border-border rounded-xl px-3 py-3.5 flex items-center gap-4 hover:border-primary/40 hover:shadow-[0_8px_24px_-12px_hsl(var(--primary)/0.35)] transition-colors duration-200"
                    >
                      <div className="flex-shrink-0 transition-transform duration-300 ease-out group-hover:scale-[1.04]">
                        {card && <CardDisplay card={card} size="sm" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors duration-200">{l.card_name}</p>
                        <p className={`text-[10px] mt-1 ${rar.color}`}>{rar.label}</p>
                        <p className="text-[10px] text-green-400 mt-1">● Active</p>
                      </div>
                      <div className="text-right flex-shrink-0 space-y-1">
                        {editingListingId === l.id ? (
                          <div className="flex items-center gap-1 justify-end">
                            <input
                              type="number"
                              value={editingListingPrice}
                              onChange={(e) => setEditingListingPrice(e.target.value)}
                              className="w-16 bg-secondary border border-border rounded-md px-1 py-0.5 text-xs text-right outline-none"
                              placeholder="g"
                              autoFocus
                            />
                            <button onClick={() => saveEditListing(l)} className="p-1 rounded text-green-400 hover:bg-green-500/10" title="Save price">
                              <Check className="w-3 h-3" />
                            </button>
                            <button onClick={cancelEditListing} className="p-1 rounded text-muted-foreground hover:bg-secondary" title="Cancel edit">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <p className="text-sm font-bold text-yellow-400 flex items-center gap-1 justify-end">
                            <Coins className="w-3 h-3" />{l.price_gold}g
                          </p>
                        )}
                        <div className="flex items-center gap-2 justify-end">
                          {editingListingId !== l.id && (
                            <button onClick={() => startEditListing(l)}
                              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                              title="Edit price">
                              <Edit2 className="w-3 h-3" /> Edit
                            </button>
                          )}
                          <button onClick={() => cancelListing(l)}
                            className="flex items-center gap-1 text-[10px] text-red-400 hover:text-red-300 transition-colors"
                            title="Cancel listing (soft delete)">
                            <X className="w-3 h-3" /> Cancel
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          )}
        </>
      )}
    </div>
    </PullToRefresh>
  );
}