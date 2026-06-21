import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Coins, Layers, ChevronUp, Sword, Shield, AlertTriangle, Loader2, CheckCircle2, Sparkles } from 'lucide-react';
import CardDisplay from './CardDisplay';
import {
  MAX_LEVEL,
  nextLevel,
  isMaxLevel,
  goldCostForNext,
  duplicatesForNext,
  computeStatsForLevel,
  findDuplicateCandidates,
  runLevelUp,
} from '@/eru/lib/cardLeveling';
import { deductGold } from '@/eru/lib/economyApi';
import { reportQuestEvent } from '@/eru/lib/dailyQuests';

/**
 * LevelUpDialog
 * --------------------------------------------------------------------------
 * Modal that lets the player invest gold OR duplicate copies to raise a card's
 * level. Mobile-first, compact. Always preserves the existing UI patterns.
 */
export default function LevelUpDialog({ card, ownedCards = [], gold = 0, onClose, onLeveled }) {
  const [method, setMethod] = useState('gold'); // 'gold' | 'duplicate'
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const target = useMemo(() => nextLevel(card), [card]);
  const maxed = isMaxLevel(card);
  const goldCost = useMemo(() => goldCostForNext(card), [card]);
  const dupNeed = useMemo(() => duplicatesForNext(card), [card]);
  const dupCandidates = useMemo(() => findDuplicateCandidates(card, ownedCards), [card, ownedCards]);

  const previewStats = useMemo(
    () => (target ? computeStatsForLevel(card, target) : { power: card?.power || 0, guard: card?.guard || 0 }),
    [card, target],
  );

  const canAffordGold = goldCost != null && gold >= goldCost;
  const canAffordDup = dupNeed != null && dupCandidates.length >= dupNeed;
  const canSubmit = !maxed && (method === 'gold' ? canAffordGold : canAffordDup);

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);
    const result = await runLevelUp(card, {
      method,
      gold,
      ownedCards,
      debitGold: async (amount, reason) => deductGold(amount, reason, { card_id: card.id, card_name: card.name, target_level: target }),
    });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error || 'Level-up failed.');
      return;
    }
    setSuccess(result);
    onLeveled?.(result);
    reportQuestEvent('level_up', { card_id: card.id, new_level: result.newLevel });
  };

  if (!card) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 12 }}
        transition={{ duration: 0.22 }}
        className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-amber-500/30 bg-card max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 p-4 border-b border-border">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.2em] text-amber-300">Level Up</p>
            <h4 className="text-base font-semibold text-foreground truncate">{card.name}</h4>
            <p className="text-[11px] text-muted-foreground">
              Level <span className="text-foreground font-medium">{card.level || 1}</span>
              {' '}/ {MAX_LEVEL}
            </p>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Card preview + stat delta */}
          <div className="flex items-center gap-4 justify-center">
            <CardDisplay card={card} size="md" />
            <div className="flex flex-col items-center gap-1 text-muted-foreground">
              <ChevronUp className="w-5 h-5 text-amber-300" />
              <p className="text-[10px] uppercase tracking-wider">L{card.level || 1} → L{target ?? card.level ?? MAX_LEVEL}</p>
            </div>
            <CardDisplay
              card={maxed ? card : { ...card, power: previewStats.power, guard: previewStats.guard, level: target }}
              size="md"
              glowing={!maxed}
            />
          </div>

          {!maxed && (
            <div className="grid grid-cols-2 gap-2">
              <StatPreview icon={Sword} label="Power" current={card.power} next={previewStats.power} accent="text-red-400" />
              <StatPreview icon={Shield} label="Guard" current={card.guard} next={previewStats.guard} accent="text-blue-400" />
            </div>
          )}

          {maxed ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-3 text-center text-xs text-amber-200 inline-flex items-center justify-center gap-2 w-full">
              <Sparkles className="w-3.5 h-3.5" /> This card is at max level.
            </div>
          ) : (
            <>
              {/* Method picker */}
              <div className="flex gap-1 bg-secondary rounded-xl p-1">
                {[
                  { id: 'gold',      label: 'Gold',       icon: Coins },
                  { id: 'duplicate', label: 'Duplicates', icon: Layers },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setMethod(opt.id)}
                    className={`flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors
                      ${method === opt.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    <opt.icon className="w-3.5 h-3.5" /> {opt.label}
                  </button>
                ))}
              </div>

              {/* Cost summary */}
              {method === 'gold' ? (
                <div className="rounded-xl border border-border bg-secondary/30 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Cost</p>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <p className="text-xl font-bold text-yellow-400 inline-flex items-center gap-1">
                      <Coins className="w-4 h-4" /> {goldCost?.toLocaleString()}
                    </p>
                    <p className="text-[11px] text-muted-foreground">/ {gold.toLocaleString()} owned</p>
                  </div>
                  {!canAffordGold && (
                    <p className="text-[10px] text-red-400 mt-1">Not enough gold.</p>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-border bg-secondary/30 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Consume duplicates</p>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <p className="text-xl font-bold text-purple-300 inline-flex items-center gap-1">
                      <Layers className="w-4 h-4" /> {dupNeed}
                    </p>
                    <p className="text-[11px] text-muted-foreground">/ {dupCandidates.length} available</p>
                  </div>
                  {!canAffordDup && (
                    <p className="text-[10px] text-red-400 mt-1">
                      Need {dupNeed - dupCandidates.length} more duplicate copy{(dupNeed - dupCandidates.length) === 1 ? '' : 'ies'}.
                    </p>
                  )}
                </div>
              )}

              {error && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300 flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5" /> {error}
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={!canSubmit || submitting}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold py-3 disabled:opacity-40"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronUp className="w-4 h-4" />}
                {submitting ? 'Leveling…' : `Level Up → L${target}`}
              </button>
            </>
          )}
        </div>

        <AnimatePresence>
          {success && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-10 flex items-center justify-center bg-card/95 backdrop-blur-sm p-6"
            >
              <div className="text-center space-y-3 max-w-[260px]">
                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 220, damping: 18 }}
                  className="mx-auto w-14 h-14 rounded-full bg-amber-500/15 border border-amber-500/40 flex items-center justify-center"
                >
                  <Sparkles className="w-6 h-6 text-amber-300" />
                </motion.div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-amber-300">Level Up Complete</p>
                  <p className="text-base font-semibold text-foreground mt-0.5">{card.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Now level <span className="text-amber-300 font-semibold">{success.newLevel}</span>
                    {' · '}
                    <span className="text-red-400">+{success.card.power - card.power} PWR</span>
                    {' / '}
                    <span className="text-blue-400">+{success.card.guard - card.guard} GRD</span>
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold py-2.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Continue
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

function StatPreview({ icon: Icon, label, current, next, accent }) {
  const delta = (next || 0) - (current || 0);
  return (
    <div className="rounded-xl border border-border bg-secondary/30 p-2.5">
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1">
        <Icon className="w-3 h-3" /> {label}
      </p>
      <div className="flex items-baseline gap-1.5 mt-0.5">
        <span className={`text-base font-bold ${accent}`}>{current}</span>
        <span className="text-muted-foreground text-xs">→</span>
        <span className={`text-base font-bold ${accent}`}>{next}</span>
        {delta > 0 && <span className="text-[10px] text-emerald-400 ml-auto">+{delta}</span>}
      </div>
    </div>
  );
}