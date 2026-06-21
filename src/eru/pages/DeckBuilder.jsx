import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, Plus, Trash2, Save, Edit3, X, Sword, Loader2, AlertTriangle, CheckCircle2, Bot } from 'lucide-react';
import { base44 } from '@/eru/api/base44Client';
import { STARTER_CARDS, ELEMENT_COLORS } from '@/eru/components/cards/StarterCards';
import CardDisplay from '@/eru/components/cards/CardDisplay';
import BattleView from '@/eru/components/cards/BattleView';

const DECK_SIZE = 10;
const JACKIE_OPPONENT = {
  name: 'Jackie Sparring AI',
  faction: 'Dawn Conclave',
  difficulty: 2,
};

/**
 * DeckBuilder
 * --------------------------------------------------------------------------
 * Dedicated page for constructing & naming custom decks of exactly 10 cards.
 * Reuses the existing Card collection, PlayerDeck entity, BattleView (AI
 * sparring), and CardDisplay component. Mobile-first, compact tabs friendly.
 *
 * Flows:
 *   - List saved decks (create / edit / delete / set active)
 *   - Edit one deck: name + 10-card selection from collection
 *   - Test Deck → opens an inline AI match against Jackie (results NOT saved
 *     to PlayerDeck win/loss totals — this is a sparring test, kept simple).
 */
export default function DeckBuilder() {
  const [cards, setCards] = useState([]);
  const [decks, setDecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | { id?, name, card_ids, is_active }
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(null); // active deck object during AI test
  const [toast, setToast] = useState(null);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    const [owned, savedDecks] = await Promise.all([
      base44.entities.Card.list('-created_date', 200),
      base44.entities.PlayerDeck.list('-updated_date', 50).catch(() => []),
    ]);
    // Same card pool the rest of the app uses: owned cards + starter pool fallback.
    const ownedNames = new Set(owned.map((c) => c.name));
    const starters = STARTER_CARDS.filter((c) => !ownedNames.has(c.name));
    setCards([...owned, ...starters]);
    setDecks(savedDecks);
    setLoading(false);
  };

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2400);
  };

  // ─── Card lookup (deck card_ids → full card objects) ──────────────────────
  const cardById = useMemo(() => {
    const map = new Map();
    cards.forEach((c) => { if (c?.id) map.set(c.id, c); });
    return map;
  }, [cards]);

  const resolveDeckCards = (card_ids = []) =>
    card_ids.map((id) => cardById.get(id)).filter(Boolean);

  // ─── Editing ──────────────────────────────────────────────────────────────
  const startNewDeck = () => {
    setEditing({ name: '', card_ids: [], is_active: false });
  };

  const startEditDeck = (deck) => {
    setEditing({
      id: deck.id,
      name: deck.name,
      card_ids: [...(deck.card_ids || [])],
      is_active: !!deck.is_active,
    });
  };

  const cancelEdit = () => setEditing(null);

  const toggleCardInEdit = (card) => {
    setEditing((prev) => {
      if (!prev) return prev;
      const has = prev.card_ids.includes(card.id);
      if (has) return { ...prev, card_ids: prev.card_ids.filter((id) => id !== card.id) };
      if (prev.card_ids.length >= DECK_SIZE) return prev; // hard cap
      return { ...prev, card_ids: [...prev.card_ids, card.id] };
    });
  };

  const validate = (deck) => {
    if (!deck) return 'No deck.';
    if (!deck.name?.trim()) return 'Deck needs a name.';
    if ((deck.card_ids || []).length !== DECK_SIZE) return `Deck must have exactly ${DECK_SIZE} cards.`;
    return null;
  };

  const saveDeck = async () => {
    const err = validate(editing);
    if (err) { showToast(err, 'error'); return; }
    setSaving(true);
    const payload = {
      name: editing.name.trim(),
      card_ids: editing.card_ids,
      is_active: !!editing.is_active,
    };
    try {
      if (editing.id) {
        await base44.entities.PlayerDeck.update(editing.id, payload);
      } else {
        await base44.entities.PlayerDeck.create(payload);
      }
      // If marking active, demote others.
      if (editing.is_active) {
        const others = decks.filter((d) => d.id !== editing.id && d.is_active);
        await Promise.all(others.map((d) => base44.entities.PlayerDeck.update(d.id, { is_active: false }).catch(() => null)));
      }
      showToast(editing.id ? 'Deck updated' : 'Deck saved');
      setEditing(null);
      await loadAll();
    } finally {
      setSaving(false);
    }
  };

  const deleteDeck = async (deck) => {
    if (!deck?.id) return;
    await base44.entities.PlayerDeck.delete(deck.id).catch(() => null);
    showToast('Deck deleted');
    await loadAll();
  };

  const setActive = async (deck) => {
    await base44.entities.PlayerDeck.update(deck.id, { is_active: true });
    const others = decks.filter((d) => d.id !== deck.id && d.is_active);
    await Promise.all(others.map((d) => base44.entities.PlayerDeck.update(d.id, { is_active: false }).catch(() => null)));
    await loadAll();
  };

  // ─── Test Deck (AI sparring) ──────────────────────────────────────────────
  const startTest = (deck) => {
    const err = validate(deck);
    if (err) { showToast(err, 'error'); return; }
    const resolved = resolveDeckCards(deck.card_ids);
    if (resolved.length !== DECK_SIZE) {
      showToast('Some cards in this deck are missing from your collection.', 'error');
      return;
    }
    setTesting({ name: deck.name, cards: resolved });
  };

  const endTest = () => setTesting(null);

  // ─── Derived state for editor ─────────────────────────────────────────────
  const editingCards = editing ? resolveDeckCards(editing.card_ids) : [];
  const editingValidationError = editing ? validate(editing) : null;
  const editingIsValid = editing && !editingValidationError;

  // ─── Render: AI test view (full-screen takeover) ─────────────────────────
  if (testing) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="px-4 py-3 border-b border-border bg-card/80 backdrop-blur-sm flex items-center gap-2">
          <button onClick={endTest} className="text-xs text-muted-foreground hover:text-foreground">← Back</button>
          <span className="text-xs text-muted-foreground">·</span>
          <p className="text-sm font-semibold truncate flex-1">Testing: {testing.name}</p>
          <span className="inline-flex items-center gap-1 text-[10px] text-purple-300 bg-purple-500/10 border border-purple-500/30 rounded-full px-2 py-0.5">
            <Bot className="w-3 h-3" /> Sparring
          </span>
        </div>
        <div className="p-4 max-w-2xl mx-auto space-y-3">
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-[11px] text-muted-foreground">
              vs <span className="text-foreground font-medium">{JACKIE_OPPONENT.name}</span> · {JACKIE_OPPONENT.faction} · 10-card · 1v1
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Sparring matches don't affect your ladder ELO.</p>
          </div>
          <BattleView
            playerCards={testing.cards}
            opponentName={JACKIE_OPPONENT.name}
            difficulty={JACKIE_OPPONENT.difficulty}
            opponentFaction={JACKIE_OPPONENT.faction}
            mode="training"
            deckMode={DECK_SIZE}
            teamSize={1}
            onBattleEnd={(won) => {
              showToast(won ? 'Victory! Deck performed well.' : 'Defeat — try a different mix.', won ? 'success' : 'error');
              endTest();
            }}
          />
        </div>
      </div>
    );
  }

  // ─── Render: editor view ──────────────────────────────────────────────────
  if (editing) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <Toast toast={toast} />
        <div className="px-4 py-3 border-b border-border bg-card/80 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <button onClick={cancelEdit} className="text-xs text-muted-foreground hover:text-foreground">← Back</button>
            <span className="text-xs text-muted-foreground">·</span>
            <p className="text-sm font-semibold truncate flex-1">
              {editing.id ? 'Edit Deck' : 'New Deck'}
            </p>
            <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 border ${
              editingIsValid
                ? 'text-primary bg-primary/10 border-primary/30'
                : 'text-muted-foreground bg-secondary border-border'
            }`}>
              {editing.card_ids.length}/{DECK_SIZE}
            </span>
          </div>
        </div>

        <div className="p-4 max-w-3xl mx-auto space-y-4">
          {/* Name + active toggle */}
          <section className="bg-card border border-border rounded-2xl p-4 space-y-3">
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Deck name</span>
              <input
                value={editing.name}
                onChange={(e) => setEditing((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Storm Rush"
                maxLength={60}
                className="mt-1 w-full h-11 rounded-xl border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>

            <label className="flex items-center gap-3 rounded-xl border border-border bg-secondary/20 px-3 py-2.5 cursor-pointer">
              <button
                type="button"
                onClick={() => setEditing((p) => ({ ...p, is_active: !p.is_active }))}
                className={`w-10 h-6 rounded-full transition-colors relative shrink-0 ${editing.is_active ? 'bg-primary' : 'bg-secondary border border-border'}`}
                role="switch"
                aria-checked={editing.is_active}
              >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${editing.is_active ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">Set as active deck</p>
                <p className="text-[11px] text-muted-foreground">Other decks will be deactivated when saved.</p>
              </div>
            </label>
          </section>

          {/* Selected preview */}
          {editingCards.length > 0 && (
            <section className="bg-card border border-border rounded-2xl p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Selected</p>
                <button
                  onClick={() => setEditing((p) => ({ ...p, card_ids: [] }))}
                  className="text-[11px] text-muted-foreground hover:text-foreground"
                >
                  Clear
                </button>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {editingCards.map((card, idx) => (
                  <div key={`${card.id}-${idx}`} className="relative">
                    <CardDisplay card={card} size="sm" selected glowing onClick={toggleCardInEdit} />
                    <span className="absolute -top-1 -right-1 z-10 inline-flex h-5 w-5 items-center justify-center rounded-full border border-primary/60 bg-primary text-[10px] font-bold text-primary-foreground">
                      {idx + 1}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Collection picker */}
          <section className="space-y-2">
            <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground px-1">Your collection</p>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 justify-center">
                {cards.map((card) => (
                  <CardDisplay
                    key={card.id}
                    card={card}
                    size="sm"
                    selected={editing.card_ids.includes(card.id)}
                    onClick={toggleCardInEdit}
                    disabled={!editing.card_ids.includes(card.id) && editing.card_ids.length >= DECK_SIZE}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Sticky save bar */}
          <div className="sticky bottom-2 flex flex-col gap-2 bg-background/80 backdrop-blur-sm rounded-xl p-1">
            {editingValidationError && (
              <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-300 flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5" /> {editingValidationError}
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={cancelEdit} className="px-4 py-2.5 rounded-xl bg-secondary text-sm font-medium border border-border">
                Cancel
              </button>
              <button
                onClick={saveDeck}
                disabled={!editingIsValid || saving}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold py-2.5 disabled:opacity-40"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editing.id ? 'Update Deck' : 'Save Deck'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Render: list view ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background pb-24">
      <Toast toast={toast} />
      <div className="px-4 py-4 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary" />
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Deck Builder</p>
        </div>
        <h1 className="text-xl font-semibold text-foreground mt-1">Custom Decks</h1>
        <p className="text-sm text-muted-foreground mt-1">Build, name, and test {DECK_SIZE}-card decks against the AI.</p>
      </div>

      <div className="px-4 py-4 max-w-3xl mx-auto space-y-4">
        <button
          onClick={startNewDeck}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold py-3"
        >
          <Plus className="w-4 h-4" /> New Deck
        </button>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          </div>
        ) : decks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-secondary/10 p-8 text-center text-sm text-muted-foreground">
            <Layers className="w-6 h-6 mx-auto mb-2 opacity-40" />
            No saved decks yet. Build your first {DECK_SIZE}-card deck.
          </div>
        ) : (
          <div className="space-y-2">
            {decks.map((deck) => (
              <DeckRow
                key={deck.id}
                deck={deck}
                cards={resolveDeckCards(deck.card_ids)}
                onEdit={() => startEditDeck(deck)}
                onDelete={() => deleteDeck(deck)}
                onTest={() => startTest(deck)}
                onSetActive={() => setActive(deck)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────
function DeckRow({ deck, cards, onEdit, onDelete, onTest, onSetActive }) {
  const cardCount = (deck.card_ids || []).length;
  const isValid = cardCount === DECK_SIZE && cards.length === DECK_SIZE;
  const elements = Array.from(new Set(cards.map((c) => c.element).filter(Boolean)));

  return (
    <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-foreground truncate">{deck.name}</p>
            {deck.is_active && (
              <span className="text-[10px] font-semibold text-primary bg-primary/10 border border-primary/30 rounded-full px-2 py-0.5">
                Active
              </span>
            )}
            <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 border ${
              isValid
                ? 'text-primary bg-primary/10 border-primary/30'
                : 'text-yellow-300 bg-yellow-500/10 border-yellow-500/30'
            }`}>
              {cardCount}/{DECK_SIZE}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            {elements.map((el) => (
              <span key={el} className={`text-[10px] px-2 py-0.5 rounded-full bg-secondary ${ELEMENT_COLORS[el]?.text}`}>
                {ELEMENT_COLORS[el]?.icon} {el}
              </span>
            ))}
            {!isValid && cardCount === DECK_SIZE && (
              <span className="text-[10px] text-yellow-300">Some cards missing from collection</span>
            )}
          </div>
          {(deck.wins > 0 || deck.losses > 0) && (
            <p className="text-[10px] text-muted-foreground mt-1">
              {deck.wins || 0}W · {deck.losses || 0}L
            </p>
          )}
        </div>
      </div>

      {cards.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {cards.slice(0, DECK_SIZE).map((c, i) => (
            <CardDisplay key={`${c.id}-${i}`} card={c} size="sm" />
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={onTest}
          disabled={!isValid}
          className="flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-semibold py-2.5 disabled:opacity-40"
        >
          <Sword className="w-4 h-4" /> Test Deck
        </button>
        <button
          onClick={onEdit}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-secondary border border-border text-sm font-medium px-3 py-2.5"
        >
          <Edit3 className="w-3.5 h-3.5" /> Edit
        </button>
        {!deck.is_active && isValid && (
          <button
            onClick={onSetActive}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-secondary border border-border text-xs font-medium px-3 py-2.5"
            title="Mark as active deck"
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Set Active
          </button>
        )}
        <button
          onClick={onDelete}
          className="inline-flex items-center justify-center rounded-xl bg-secondary border border-border px-3 py-2.5 text-red-400 hover:bg-red-500/5"
          aria-label="Delete deck"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function Toast({ toast }) {
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={`fixed top-16 left-4 right-4 max-w-md mx-auto z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium shadow-xl backdrop-blur-sm ${
            toast.type === 'error'
              ? 'bg-red-900/80 border-red-500/40 text-red-200'
              : 'bg-emerald-900/80 border-emerald-500/40 text-emerald-200'
          }`}
        >
          {toast.type === 'error' ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
          <span className="flex-1">{toast.msg}</span>
          <X className="w-3.5 h-3.5 opacity-50" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}