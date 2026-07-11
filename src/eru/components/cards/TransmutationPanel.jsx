import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Sparkles, ChevronRight, Loader2, CheckCircle2, AlertTriangle, X, Wand2 } from 'lucide-react';
import CardDisplay from './CardDisplay';
import { RARITY_STYLES } from './StarterCards';
import {
  TRANSMUTE_COUNT,
  nextRarity,
  isTransmutable,
  transmutableRarities,
  runTransmutation,
} from '@/eru/lib/transmutation';
import { reportQuestEvent } from '@/eru/lib/dailyQuests';

/**
 * TransmutationPanel
 * --------------------------------------------------------------------------
 * Three-step flow:
 *   1. Pick a source rarity                (only rarities with ≥7 cards)
 *   2. Select 7 duplicate cards            (same rarity, transmutable)
 *   3. Confirm → animated forge reveal     (new card of next-higher rarity)
 *
 * Designed to live inside CardArena (mobile-first, compact tabs friendly).
 */
export default function TransmutationPanel({ cards = [], onCardForged }) {
  const [step, setStep] = useState(1);
  const [rarity, setRarity] = useState(null);
  const [selected, setSelected] = useState([]); // array of card ids
  const [forging, setForging] = useState(false);
  const [forged, setForged] = useState(null);
  const [error, setError] = useState(null);

  const rarityOptions = useMemo(() => transmutableRarities(cards), [cards]);
  const eligibleCards = useMemo(
    () => cards.filter((c) => c?.rarity === rarity && isTransmutable(c.rarity) && c.id),
    [cards, rarity],
  );
  const target = rarity ? nextRarity(rarity) : null;
  const targetStyle = target ? RARITY_STYLES[target] : null;
  const sourceStyle = rarity ? RARITY_STYLES[rarity] : null;

  const reset = () => {
    setStep(1);
    setRarity(null);
    setSelected([]);
    setForged(null);
    setError(null);
  };

  const pickRarity = (r) => {
    setRarity(r);
    setSelected([]);
    setStep(2);
  };

  const toggleSelect = (card) => {
    setSelected((prev) => {
      if (prev.includes(card.id)) return prev.filter((id) => id !== card.id);
      if (prev.length >= TRANSMUTE_COUNT) return prev; // cap at 7
      return [...prev, card.id];
    });
  };

  const selectedCards = useMemo(
    () => selected.map((id) => eligibleCards.find((c) => c.id === id)).filter(Boolean),
    [selected, eligibleCards],
  );
  const canForge = selectedCards.length === TRANSMUTE_COUNT;

  const handleForge = async () => {
    setError(null);
    setForging(true);
    const result = await runTransmutation(selectedCards);
    setForging(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setForged(result);
    setStep(3);
    onCardForged?.(result);
    reportQuestEvent('transmutation', { source_rarity: result.sourceRarity, target_rarity: result.targetRarity });
  };

  // ────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-900/30 to-indigo-900/20 p-4">
        <div className="flex items-center gap-2">
          <Wand2 className="w-5 h-5 text-purple-300" />
          <h3 className="text-base font-bold text-purple-100">Transmutation Forge</h3>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Burn <span className="font-semibold text-purple-200">{TRANSMUTE_COUNT}</span> cards of the same rarity to forge one card of the next higher rarity.
        </p>
        <Stepper step={step} />
      </div>

      {/* STEP 1 — pick rarity */}
      {step === 1 && (
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Choose source rarity</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {rarityOptions.map((opt) => {
              const tgt = nextRarity(opt.rarity);
              const tStyle = tgt ? RARITY_STYLES[tgt] : null;
              const sStyle = RARITY_STYLES[opt.rarity];
              return (
                <button
                  key={opt.rarity}
                  onClick={() => opt.ready && pickRarity(opt.rarity)}
                  disabled={!opt.ready}
                  className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                    opt.ready
                      ? 'border-border bg-card hover:border-purple-400/40'
                      : 'border-border/50 bg-secondary/40 opacity-60 cursor-not-allowed'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold ${sStyle?.color}`}>{sStyle?.label}</span>
                      <ChevronRight className="w-3 h-3 text-muted-foreground" />
                      <span className={`text-sm font-semibold ${tStyle?.color}`}>{tStyle?.label}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      You have <span className="text-foreground font-medium">{opt.count}</span> · need {TRANSMUTE_COUNT}
                    </p>
                  </div>
                  {opt.ready ? (
                    <span className="text-[10px] font-semibold text-purple-300 bg-purple-500/10 border border-purple-500/30 rounded-full px-2 py-0.5">Ready</span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">{TRANSMUTE_COUNT - opt.count} more</span>
                  )}
                </button>
              );
            })}
          </div>
          {rarityOptions.every((o) => !o.ready) && (
            <div className="rounded-xl border border-dashed border-border bg-secondary/10 p-4 text-center text-xs text-muted-foreground">
              Collect at least {TRANSMUTE_COUNT} cards of the same rarity to unlock transmutation.
            </div>
          )}
        </div>
      )}

      {/* STEP 2 — pick 7 cards */}
      {step === 2 && rarity && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <button onClick={reset} className="text-xs text-muted-foreground hover:text-foreground">← Back</button>
              <span className="text-xs text-muted-foreground">·</span>
              <p className="text-xs truncate">
                <span className={sourceStyle?.color}>{sourceStyle?.label}</span>
                <ChevronRight className="inline w-3 h-3 text-muted-foreground" />
                <span className={targetStyle?.color}>{targetStyle?.label}</span>
              </p>
            </div>
            <span className={`text-[11px] font-semibold rounded-full px-2 py-0.5 ${canForge ? 'bg-purple-500/15 text-purple-200 border border-purple-500/30' : 'bg-secondary text-muted-foreground border border-border'}`}>
              {selected.length}/{TRANSMUTE_COUNT}
            </span>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300 flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5" /> {error}
            </div>
          )}

          <div className="flex flex-wrap gap-2 justify-center">
            {eligibleCards.map((card) => {
              const isSel = selected.includes(card.id);
              return (
                <div key={card.id} className="relative">
                  <CardDisplay
                    card={card}
                    size="sm"
                    selected={isSel}
                    onClick={() => toggleSelect(card)}
                    glowing={isSel}
                  />
                  {isSel && (
                    <span className="absolute -top-1 -right-1 z-10 inline-flex h-5 w-5 items-center justify-center rounded-full border border-purple-300/60 bg-purple-600 text-[10px] font-bold text-white">
                      {selected.indexOf(card.id) + 1}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="sticky bottom-2 flex gap-2">
            <button
              onClick={() => setSelected([])}
              disabled={selected.length === 0}
              className="px-3 py-2.5 rounded-xl bg-secondary text-xs font-medium border border-border disabled:opacity-40"
            >
              Clear
            </button>
            <button
              onClick={handleForge}
              disabled={!canForge || forging}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-semibold py-2.5 disabled:opacity-40"
            >
              {forging ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Forging…
                </>
              ) : (
                <>
                  <Flame className="w-4 h-4" />
                  Burn & Forge
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 3 — animated reveal */}
      <AnimatePresence>
        {step === 3 && forged?.card && (
          <ForgeReveal forged={forged} onClose={reset} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Stepper ───────────────────────────────────────────────────────────────
function Stepper({ step }) {
  const steps = ['Rarity', 'Select', 'Forge'];
  return (
    <div className="flex items-center gap-1.5 mt-3">
      {steps.map((label, i) => {
        const idx = i + 1;
        const active = step === idx;
        const done = step > idx;
        return (
          <div key={label} className="flex items-center gap-1.5 flex-1">
            <div className={`h-1.5 flex-1 rounded-full transition-colors ${done || active ? 'bg-purple-400' : 'bg-secondary'}`} />
            <span className={`text-[10px] font-medium whitespace-nowrap ${active ? 'text-purple-200' : done ? 'text-purple-300/70' : 'text-muted-foreground'}`}>
              {idx}. {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Forge reveal animation ────────────────────────────────────────────────
function ForgeReveal({ forged, onClose }) {
  const { card, sourceRarity, targetRarity } = forged;
  const targetStyle = RARITY_STYLES[targetRarity];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.85, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 12 }}
        transition={{ type: 'spring', stiffness: 220, damping: 22 }}
        className="relative w-full max-w-xs rounded-2xl border border-purple-500/40 bg-gradient-to-br from-[#0c0716] via-[#120a26] to-[#0a0710] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* radial glow */}
        <motion.div
          aria-hidden
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: [0, 0.7, 0.45], scale: [0.6, 1.4, 1.1] }}
          transition={{ duration: 1.4, ease: 'easeOut' }}
          className="pointer-events-none absolute inset-0 rounded-2xl"
          style={{ background: 'radial-gradient(circle at center, rgba(168,85,247,0.45), transparent 60%)' }}
        />
        {/* sparkles */}
        <motion.div
          aria-hidden
          initial={{ opacity: 0, rotate: 0 }}
          animate={{ opacity: [0, 0.4, 0], rotate: 360 }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'linear' }}
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          <Sparkles className="w-40 h-40 text-purple-400/30" />
        </motion.div>

        <button
          onClick={onClose}
          className="absolute top-2 right-2 rounded-full p-1.5 text-white/60 hover:bg-white/10 hover:text-white"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="relative text-center">
          <p className="text-[10px] uppercase tracking-[0.2em] text-purple-300">Transmutation Complete</p>
          <p className="mt-1 text-xs text-muted-foreground">
            <span className={RARITY_STYLES[sourceRarity]?.color}>{RARITY_STYLES[sourceRarity]?.label}</span>
            {' → '}
            <span className={targetStyle?.color}>{targetStyle?.label}</span>
          </p>

          <motion.div
            initial={{ scale: 0.4, opacity: 0, rotateY: 90 }}
            animate={{ scale: 1, opacity: 1, rotateY: 0 }}
            transition={{ delay: 0.35, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="my-5 flex justify-center"
          >
            <CardDisplay card={card} size="lg" glowing />
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.85 }}
            className="text-sm font-semibold text-foreground"
          >
            {card.name}
          </motion.p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="text-[11px] text-muted-foreground mt-0.5"
          >
            Added to your collection
          </motion.p>

          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.15 }}
            onClick={onClose}
            className="mt-5 inline-flex items-center justify-center gap-2 w-full rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-semibold py-2.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            Continue
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}