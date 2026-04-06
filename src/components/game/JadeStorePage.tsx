import { useState, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { JADE_STORE_PACKS, getFeaturedPacks, getPacksByCategory, getBestValuePacks, getMostPopularPacks, getLimitedPacks, sortByScore } from '@/game/jadeStoreData';
import { JADE_RARITY_CONFIG, CATEGORY_META, type JadePack, type JadeStoreCategory, type JadeRarity, type JadePackScores, type JadePackReward } from '@/game/jadeTypes';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, Star, TrendingUp, Clock, Crown, Sparkles, ShieldCheck, ChevronRight, BarChart3, Eye, EyeOff, Filter, Layers, Heart, Scale, Check } from 'lucide-react';
import { useGame } from '@/game/GameContext';
import { toast } from 'sonner';
import type { BagItem, GearRarity } from '@/game/types';
import {
  checkRateLimit, generateTransactionId, acquireTransactionLock, releaseTransactionLock,
  logTransaction, checkServerDedup, atomicDiamondSpend, saveStateChecksum,
} from '@/game/transactionGuard';

// ── Rarity border/glow styles ──
function rarityStyle(rarity: JadeRarity) {
  const cfg = JADE_RARITY_CONFIG[rarity];
  return { boxShadow: cfg.glow, borderColor: cfg.color };
}

function RarityBadge({ rarity }: { rarity: JadeRarity }) {
  const cfg = JADE_RARITY_CONFIG[rarity];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border"
      style={{ color: cfg.color, borderColor: cfg.color, background: `${cfg.color}15` }}
    >
      {cfg.label}
    </span>
  );
}

function PackBadges({ pack }: { pack: JadePack }) {
  return (
    <div className="flex flex-wrap gap-1">
      {pack.bestValue && <Badge className="bg-emerald-600/80 text-white text-[9px] border-0">Best Value</Badge>}
      {pack.mostPopular && <Badge className="bg-amber-600/80 text-white text-[9px] border-0">Most Popular</Badge>}
      {pack.isLimited && <Badge className="bg-red-600/80 text-white text-[9px] border-0">Limited</Badge>}
      {pack.isNew && <Badge className="bg-cyan-600/80 text-white text-[9px] border-0">New</Badge>}
      {pack.featured && <Badge className="bg-purple-600/80 text-white text-[9px] border-0">Featured</Badge>}
    </div>
  );
}

// ── Score Bar (for admin view) ──
function ScoreBar({ label, value, max = 10 }: { label: string; value: number; max?: number }) {
  const pct = (value / max) * 100;
  const color = value >= 8 ? 'bg-emerald-500' : value >= 5 ? 'bg-amber-500' : 'bg-red-400';
  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] text-muted-foreground w-20 shrink-0 text-right">{label}</span>
      <div className="flex-1 h-1.5 bg-muted/40 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] font-bold text-foreground w-4">{value}</span>
    </div>
  );
}

function ScorePanel({ scores }: { scores: JadePackScores }) {
  return (
    <div className="space-y-1 p-3 rounded-lg bg-muted/10 border border-border/30">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
        <BarChart3 className="w-3 h-3" /> Admin Scores
      </p>
      <ScoreBar label="Visual" value={scores.visual_desirability} />
      <ScoreBar label="Value" value={scores.perceived_value} />
      <ScoreBar label="Margin" value={scores.real_margin} />
      <ScoreBar label="Beginner" value={scores.beginner_friendliness} />
      <ScoreBar label="Collector" value={scores.collector_appeal} />
      <ScoreBar label="Whale" value={scores.whale_appeal} />
      <ScoreBar label="Urgency" value={scores.urgency_strength} />
      <ScoreBar label="Prestige" value={scores.prestige_strength} />
      <ScoreBar label="Retention" value={scores.retention_contribution} />
      <div className="border-t border-border/30 pt-1 mt-1">
        <ScoreBar label="Overall" value={scores.overall_attractiveness} />
      </div>
    </div>
  );
}

// ── Pack Card ──
function PackCard({ pack, onSelect, showScores, isComparing, onToggleCompare, isWishlisted, onToggleWishlist }: {
  pack: JadePack;
  onSelect: (p: JadePack) => void;
  showScores: boolean;
  isComparing: boolean;
  onToggleCompare: (p: JadePack) => void;
  isWishlisted: boolean;
  onToggleWishlist: (p: JadePack) => void;
}) {
  const cfg = JADE_RARITY_CONFIG[pack.rarity];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="relative"
    >
      <motion.button
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => onSelect(pack)}
        className="relative w-full flex flex-col rounded-xl border-2 p-3 text-left transition-all duration-200 overflow-hidden group bg-card"
        style={rarityStyle(pack.rarity)}
      >
        {/* Glow overlay */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
          style={{ background: `radial-gradient(circle at 50% 0%, ${cfg.color}20, transparent 70%)` }}
        />

        {/* Badges row */}
        <div className="absolute top-2 right-2 z-10">
          <PackBadges pack={pack} />
        </div>

        {/* Icon + Name */}
        <div className="flex items-start gap-2 mb-2">
          <span className="text-2xl">{pack.icon}</span>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-foreground truncate">{pack.name}</h3>
            <p className="text-[10px] text-muted-foreground truncate italic">{pack.subtitle}</p>
          </div>
        </div>

        {/* Rarity + Category */}
        <div className="flex items-center gap-1.5 mb-2">
          <RarityBadge rarity={pack.rarity} />
          <span className="text-[9px] text-muted-foreground">{CATEGORY_META[pack.category].icon} {CATEGORY_META[pack.category].label}</span>
        </div>

        {/* Rewards preview */}
        <div className="flex flex-wrap gap-1 mb-2 flex-1">
          {pack.coreRewards.slice(0, 3).map((r, i) => (
            <span key={i} className="text-[10px] text-muted-foreground bg-muted/40 rounded px-1.5 py-0.5">
              {r.icon} {r.quantity}× {r.name.length > 14 ? r.name.slice(0, 14) + '…' : r.name}
            </span>
          ))}
          {pack.coreRewards.length > 3 && (
            <span className="text-[10px] text-muted-foreground">+{pack.coreRewards.length - 3} more</span>
          )}
        </div>

        {/* Price row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <span className="text-sm font-bold text-foreground">{pack.priceDiamonds.toLocaleString()}</span>
            <span className="text-[10px] text-muted-foreground">diamonds</span>
          </div>
          {pack.priceUsd && (
            <span className="text-[10px] font-semibold text-primary">${pack.priceUsd}</span>
          )}
        </div>

        {/* Overall score mini indicator */}
        {showScores && (
          <div className="mt-2 flex items-center gap-1">
            <div className="flex-1 h-1 bg-muted/40 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${(pack.scores.overall_attractiveness / 10) * 100}%` }}
              />
            </div>
            <span className="text-[9px] font-bold text-primary">{pack.scores.overall_attractiveness}/10</span>
          </div>
        )}
      </motion.button>

      {/* Wishlist toggle */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleWishlist(pack); }}
        className={`absolute top-2 left-2 z-20 p-1.5 rounded-full transition-all ${
          isWishlisted ? 'bg-red-500/20 text-red-400' : 'bg-muted/60 text-muted-foreground hover:bg-muted'
        }`}
      >
        <Heart className={`w-3 h-3 ${isWishlisted ? 'fill-current' : ''}`} />
      </button>

      {/* Compare toggle */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleCompare(pack); }}
        className={`absolute bottom-2 right-2 z-20 p-1.5 rounded-full transition-all ${
          isComparing ? 'bg-primary text-primary-foreground' : 'bg-muted/60 text-muted-foreground hover:bg-muted'
        }`}
      >
        <Scale className="w-3 h-3" />
      </button>
    </motion.div>
  );
}

// ── Comparison Panel ──
function ComparisonPanel({ packs, onClose, onRemove }: { packs: JadePack[]; onClose: () => void; onRemove: (id: string) => void }) {
  if (packs.length === 0) return null;

  const scoreKeys: (keyof JadePackScores)[] = [
    'visual_desirability', 'perceived_value', 'real_margin', 'beginner_friendliness',
    'collector_appeal', 'whale_appeal', 'urgency_strength', 'prestige_strength',
    'retention_contribution', 'overall_attractiveness'
  ];
  const labels: Record<string, string> = {
    visual_desirability: 'Visual', perceived_value: 'Value', real_margin: 'Margin',
    beginner_friendliness: 'Beginner', collector_appeal: 'Collector', whale_appeal: 'Whale',
    urgency_strength: 'Urgency', prestige_strength: 'Prestige', retention_contribution: 'Retention',
    overall_attractiveness: 'Overall'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className="fixed bottom-0 left-0 right-0 z-[60] bg-card border-t-2 border-primary/40 shadow-2xl max-h-[50vh] overflow-y-auto"
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
            <Scale className="w-4 h-4" /> Compare ({packs.length})
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="border-b border-border/30">
                <th className="text-left py-1 pr-3 text-muted-foreground font-semibold">Metric</th>
                {packs.map(p => (
                  <th key={p.id} className="text-center py-1 px-2 min-w-[80px]">
                    <div className="flex flex-col items-center gap-0.5">
                      <span>{p.icon}</span>
                      <span className="font-bold text-foreground truncate max-w-[80px]">{p.name}</span>
                      <button onClick={() => onRemove(p.id)} className="text-red-400 hover:text-red-300">✕</button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/20">
                <td className="py-1 pr-3 text-muted-foreground">Price</td>
                {packs.map(p => (
                  <td key={p.id} className="text-center py-1 font-bold text-foreground">{p.priceDiamonds.toLocaleString()}</td>
                ))}
              </tr>
              <tr className="border-b border-border/20">
                <td className="py-1 pr-3 text-muted-foreground">Rarity</td>
                {packs.map(p => (
                  <td key={p.id} className="text-center py-1"><RarityBadge rarity={p.rarity} /></td>
                ))}
              </tr>
              {scoreKeys.map(key => {
                const maxVal = Math.max(...packs.map(p => p.scores[key]));
                return (
                  <tr key={key} className="border-b border-border/20">
                    <td className="py-1 pr-3 text-muted-foreground">{labels[key]}</td>
                    {packs.map(p => (
                      <td key={p.id} className={`text-center py-1 font-bold ${p.scores[key] === maxVal ? 'text-primary' : 'text-foreground'}`}>
                        {p.scores[key]}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}

// ── Rarity mapping ──
const JADE_TO_GEAR_RARITY: Record<string, GearRarity> = {
  rough: 'common', polished: 'uncommon', refined: 'rare',
  gilded: 'ultra_rare', sovereign: 'legendary', imperial: 'mythic', singularity: 'mythic',
};

function rewardsToItems(rewards: JadePackReward[], packId: string): BagItem[] {
  return rewards.filter(r => r.guaranteed || Math.random() * 100 < (r.weight ?? 0)).map(r => ({
    id: `${packId}-${r.name}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: r.name,
    icon: r.icon,
    category: 'resources' as const,
    rarity: JADE_TO_GEAR_RARITY[r.rarity] || 'common',
    quantity: r.quantity,
    description: `From pack purchase`,
    obtainedAt: Date.now(),
  }));
}

// ── Pack Detail Modal ──
function PackModal({ pack, onClose, showScores }: { pack: JadePack; onClose: () => void; showScores: boolean }) {
  const cfg = JADE_RARITY_CONFIG[pack.rarity];
  const { state, setState, saveState, canAfford } = useGame();
  const [purchasing, setPurchasing] = useState(false);
  const [purchased, setPurchased] = useState(false);
  const processingRef = useRef(false);
  const playerDiamonds = state.resources.diamonds;
  const affordable = playerDiamonds >= pack.priceDiamonds;

  const handlePurchase = useCallback(async () => {
    if (!affordable || purchasing || processingRef.current) return;

    // Rate limit
    const rateCheck = checkRateLimit('jade_store');
    if (!rateCheck.allowed) {
      toast.error(`Too fast! Wait ${Math.ceil(rateCheck.retryAfterMs / 1000)}s`);
      return;
    }

    const txId = generateTransactionId('jade_store');
    if (!acquireTransactionLock(txId)) {
      toast.error('Transaction in progress');
      return;
    }

    processingRef.current = true;
    setPurchasing(true);

    try {
      const dedupOk = await checkServerDedup(txId, 'jade_store');
      if (!dedupOk) {
        toast.error('Duplicate purchase blocked');
        return;
      }

      setState(prev => {
        // Atomic balance check inside setState
        const { newState: afterSpend, success, txRecord } = atomicDiamondSpend(
          prev, pack.priceDiamonds, 'jade_store', pack.id
        );
        if (!success) {
          toast.error('Insufficient diamonds');
          return prev;
        }

        const newItems = rewardsToItems([...pack.coreRewards, ...(pack.bonusRewards || [])], pack.id);
        const newBag = [...(afterSpend.bag || []), ...newItems];

        const currentPity = afterSpend.gachaPity || {};
        const newPity = { ...currentPity };
        const pityKey = `jade_store_${pack.category}`;
        newPity[pityKey] = (newPity[pityKey] || 0) + pack.pityContribution;

        const finalState = { ...afterSpend, bag: newBag, gachaPity: newPity };
        saveState(finalState);
        saveStateChecksum(finalState);

        // Log transaction
        if (txRecord) logTransaction(txRecord);

        toast.success(`Acquired ${pack.name}`, {
          description: `${newItems.length} items added to your bag`,
        });

        return finalState;
      });

      setPurchased(true);
      setTimeout(() => setPurchased(false), 2000);
    } finally {
      releaseTransactionLock(txId);
      processingRef.current = false;
      setPurchasing(false);
    }
  }, [affordable, purchasing, pack, setState, saveState]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-background/90 backdrop-blur-md p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-card border-2 rounded-2xl max-w-md w-full max-h-[85vh] overflow-y-auto shadow-2xl"
        style={{ borderColor: cfg.color, boxShadow: `${cfg.glow}, 0 25px 50px -12px rgb(0 0 0 / 0.5)` }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative p-5 border-b border-border/50">
          <div
            className="absolute inset-0 opacity-20 pointer-events-none rounded-t-2xl"
            style={{ background: `linear-gradient(180deg, ${cfg.color}30, transparent)` }}
          />
          <button onClick={onClose} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground z-10">
            <X className="w-5 h-5" />
          </button>
          <div className="relative z-10 flex items-center gap-3">
            <span className="text-4xl">{pack.icon}</span>
            <div>
              <h2 className="text-lg font-bold text-foreground">{pack.name}</h2>
              <p className="text-sm text-muted-foreground italic">{pack.subtitle}</p>
              <div className="mt-1 flex items-center gap-2 flex-wrap">
                <RarityBadge rarity={pack.rarity} />
                <PackBadges pack={pack} />
              </div>
            </div>
          </div>
        </div>

        {/* Emotional hook */}
        {pack.emotionalHook && (
          <div className="px-5 py-3 border-b border-border/30">
            <p className="text-xs italic text-primary/80">"{pack.emotionalHook}"</p>
          </div>
        )}

        {/* Rewards */}
        <div className="p-5 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Guaranteed Contents
          </h3>
          <div className="space-y-1.5">
            {pack.coreRewards.filter(r => r.guaranteed).map((r, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: `${JADE_RARITY_CONFIG[r.rarity].color}10` }}>
                <div className="flex items-center gap-2">
                  <span>{r.icon}</span>
                  <span className="text-sm text-foreground">{r.name}</span>
                  <RarityBadge rarity={r.rarity} />
                </div>
                <span className="text-sm font-bold text-foreground">×{r.quantity}</span>
              </div>
            ))}
          </div>

          {pack.coreRewards.some(r => !r.guaranteed) && (
            <>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mt-4 flex items-center gap-1">
                <Star className="w-3 h-3" /> Chance Items
              </h3>
              <div className="space-y-1.5">
                {pack.coreRewards.filter(r => !r.guaranteed).map((r, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg px-3 py-2 bg-muted/20 border border-dashed border-border/40">
                    <div className="flex items-center gap-2">
                      <span>{r.icon}</span>
                      <span className="text-sm text-foreground">{r.name}</span>
                      <RarityBadge rarity={r.rarity} />
                    </div>
                    <span className="text-xs text-muted-foreground">chance</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Pity + Meta */}
          <div className="grid grid-cols-2 gap-2 mt-4">
            <div className="rounded-lg bg-muted/30 p-2 text-center">
              <p className="text-[10px] text-muted-foreground uppercase">Pity Progress</p>
              <p className="text-sm font-bold text-primary">+{pack.pityContribution}</p>
            </div>
            <div className="rounded-lg bg-muted/30 p-2 text-center">
              <p className="text-[10px] text-muted-foreground uppercase">Availability</p>
              <p className="text-sm font-bold text-foreground capitalize">{pack.rotationType}</p>
            </div>
            {pack.purchaseLimit && (
              <div className="rounded-lg bg-muted/30 p-2 text-center">
                <p className="text-[10px] text-muted-foreground uppercase">Limit</p>
                <p className="text-sm font-bold text-foreground">{pack.purchaseLimit}× per acct</p>
              </div>
            )}
            <div className="rounded-lg bg-muted/30 p-2 text-center">
              <p className="text-[10px] text-muted-foreground uppercase">Your Diamonds</p>
              <p className={`text-sm font-bold ${affordable ? 'text-emerald-400' : 'text-red-400'}`}>{playerDiamonds.toLocaleString()}</p>
            </div>
          </div>

          {/* Admin scores */}
          {showScores && (
            <div className="mt-4">
              <ScorePanel scores={pack.scores} />
              {pack.adminNotes && (
                <p className="mt-2 text-[10px] text-muted-foreground italic border-l-2 border-primary/30 pl-2">{pack.adminNotes}</p>
              )}
            </div>
          )}

          {/* Buy */}
          <div className="mt-5 flex items-center gap-3">
            <Button
              className="flex-1 h-12 text-base font-bold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 disabled:opacity-40"
              disabled={!affordable || purchasing || purchased}
              onClick={handlePurchase}
            >
              {purchased ? (
                <><Check className="w-4 h-4 mr-2" /> Acquired</>
              ) : purchasing ? (
                <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 1 }}>Opening Vault…</motion.span>
              ) : (
                <><Crown className="w-4 h-4 mr-2" /> {pack.priceDiamonds.toLocaleString()} 💎</>
              )}
            </Button>
            {pack.priceUsd && (
              <Button variant="outline" className="h-12 px-4 text-sm font-semibold border-primary/40 text-primary">
                ${pack.priceUsd}
              </Button>
            )}
          </div>
          {!affordable && !purchasing && !purchased && (
            <p className="text-[10px] text-red-400 text-center mt-1">Insufficient diamonds — need {(pack.priceDiamonds - playerDiamonds).toLocaleString()} more</p>
          )}

          {/* Fairness notice */}
          <div className="mt-3 flex items-start gap-2 text-[10px] text-muted-foreground">
            <ShieldCheck className="w-3 h-3 mt-0.5 shrink-0" />
            <span>All odds and rarity tiers are transparently displayed. Pity progress carries across purchases.</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Featured Hero Banner ──
function HeroBanner({ packs, onSelect }: { packs: JadePack[]; onSelect: (p: JadePack) => void }) {
  const [idx, setIdx] = useState(0);
  const featured = packs.slice(0, 5);
  const current = featured[idx];
  if (!current) return null;
  const cfg = JADE_RARITY_CONFIG[current.rarity];

  return (
    <div className="relative rounded-2xl overflow-hidden border-2 mb-4" style={{ borderColor: cfg.color, boxShadow: cfg.glow }}>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: `linear-gradient(135deg, ${cfg.color}25, transparent 60%, ${cfg.color}10)` }}
      />
      <div className="relative z-10 p-5 flex items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <RarityBadge rarity={current.rarity} />
            <PackBadges pack={current} />
          </div>
          <h2 className="text-lg font-bold text-foreground mb-1">{current.icon} {current.name}</h2>
          <p className="text-xs text-muted-foreground italic mb-2">{current.subtitle}</p>
          {current.emotionalHook && (
            <p className="text-[10px] text-primary/80 italic mb-3">"{current.emotionalHook}"</p>
          )}
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => onSelect(current)} className="bg-gradient-to-r from-primary to-primary/80">
              View <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
            <span className="text-sm font-bold text-foreground">{current.priceDiamonds.toLocaleString()} 💎</span>
            {current.priceUsd && <span className="text-xs text-primary">(${current.priceUsd})</span>}
          </div>
        </div>
        <span className="text-5xl hidden sm:block">{current.icon}</span>
      </div>
      {featured.length > 1 && (
        <div className="relative z-10 flex justify-center gap-2 pb-3">
          {featured.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={`w-2 h-2 rounded-full transition-all ${i === idx ? 'bg-primary w-5' : 'bg-muted-foreground/30'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Sort options ──
type SortKey = 'default' | 'price_low' | 'price_high' | 'attractiveness' | 'prestige' |
  'margin' | 'whale' | 'beginner' | 'collector' | 'urgency' | 'retention' | 'value';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'default', label: 'Default' },
  { value: 'price_low', label: 'Price ↑' },
  { value: 'price_high', label: 'Price ↓' },
  { value: 'attractiveness', label: '⭐ Overall' },
  { value: 'prestige', label: '👑 Prestige' },
  { value: 'margin', label: '📈 Margin' },
  { value: 'whale', label: '🐋 Whale' },
  { value: 'beginner', label: '🌱 Beginner' },
  { value: 'collector', label: '🏛️ Collector' },
  { value: 'urgency', label: '⏱️ Urgency' },
  { value: 'retention', label: '🔄 Retention' },
  { value: 'value', label: '💎 Value' },
];

const SCORE_MAP: Record<SortKey, keyof JadePackScores | null> = {
  default: null, price_low: null, price_high: null,
  attractiveness: 'overall_attractiveness', prestige: 'prestige_strength',
  margin: 'real_margin', whale: 'whale_appeal', beginner: 'beginner_friendliness',
  collector: 'collector_appeal', urgency: 'urgency_strength', retention: 'retention_contribution',
  value: 'perceived_value',
};

// ── Quick filter presets ──
type QuickFilter = 'all' | 'best_value' | 'most_popular' | 'limited' | 'new' | 'micro' | 'whale_tier' | 'wishlist';

const CATEGORIES = Object.keys(CATEGORY_META) as JadeStoreCategory[];

export default function JadeStorePage() {
  const { state } = useGame();
  const [selectedPack, setSelectedPack] = useState<JadePack | null>(null);
  const [activeCategory, setActiveCategory] = useState<JadeStoreCategory | 'featured' | 'all'>('featured');
  const [sortBy, setSortBy] = useState<SortKey>('default');
  const [showScores, setShowScores] = useState(false);
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [comparePacks, setComparePacks] = useState<JadePack[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const [wishlist, setWishlist] = useState<Set<string>>(() => {
    try { const saved = localStorage.getItem('jade_wishlist'); return saved ? new Set(JSON.parse(saved)) : new Set(); }
    catch { return new Set(); }
  });

  const toggleWishlist = useCallback((pack: JadePack) => {
    setWishlist(prev => {
      const next = new Set(prev);
      if (next.has(pack.id)) next.delete(pack.id); else next.add(pack.id);
      localStorage.setItem('jade_wishlist', JSON.stringify([...next]));
      return next;
    });
  }, []);

  const featured = useMemo(() => getFeaturedPacks(), []);

  const toggleCompare = useCallback((pack: JadePack) => {
    setComparePacks(prev => {
      const exists = prev.find(p => p.id === pack.id);
      if (exists) return prev.filter(p => p.id !== pack.id);
      if (prev.length >= 4) return prev;
      return [...prev, pack];
    });
  }, []);

  const displayPacks = useMemo(() => {
    let packs: JadePack[];
    if (activeCategory === 'featured') {
      packs = featured;
    } else if (activeCategory === 'all') {
      packs = [...JADE_STORE_PACKS];
    } else {
      packs = getPacksByCategory(activeCategory);
    }

    // Quick filters
    switch (quickFilter) {
      case 'best_value': packs = packs.filter(p => p.bestValue); break;
      case 'most_popular': packs = packs.filter(p => p.mostPopular); break;
      case 'limited': packs = packs.filter(p => p.isLimited); break;
      case 'new': packs = packs.filter(p => p.isNew); break;
      case 'micro': packs = packs.filter(p => p.priceTier === 'micro' || p.priceTier === 'entry'); break;
      case 'whale_tier': packs = packs.filter(p => p.priceTier === 'whale' || p.priceTier === 'absurd'); break;
      case 'wishlist': packs = packs.filter(p => wishlist.has(p.id)); break;
    }

    // Sort
    const scoreKey = SCORE_MAP[sortBy];
    if (sortBy === 'price_low') return [...packs].sort((a, b) => a.priceDiamonds - b.priceDiamonds);
    if (sortBy === 'price_high') return [...packs].sort((a, b) => b.priceDiamonds - a.priceDiamonds);
    if (scoreKey) return sortByScore(packs, scoreKey);
    return packs;
  }, [activeCategory, sortBy, quickFilter, featured, wishlist]);

  return (
    <div className="space-y-3 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
            🏛️ <span className="bg-gradient-to-r from-emerald-400 to-amber-400 bg-clip-text text-transparent">Royal Jade Vault</span>
          </h1>
          <p className="text-[10px] text-muted-foreground">Sacred jade · Reserve-grade · Lineage-bound</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right mr-1">
            <p className="text-[10px] text-muted-foreground">Balance</p>
            <p className="text-sm font-bold text-cyan-400">{state.resources.diamonds.toLocaleString()} 💎</p>
          </div>
          {/* Admin toggle */}
          <button
            onClick={() => setShowScores(!showScores)}
            className={`p-1.5 rounded-lg transition-all ${showScores ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted'}`}
            title="Toggle admin scores"
          >
            <BarChart3 className="w-4 h-4" />
          </button>
          {/* Compare button */}
          {comparePacks.length > 0 && (
            <button
              onClick={() => setShowCompare(!showCompare)}
              className="p-1.5 rounded-lg bg-primary text-primary-foreground relative"
            >
              <Scale className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[8px] rounded-full flex items-center justify-center font-bold">
                {comparePacks.length}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Sort + Quick filters */}
      <div className="space-y-2">
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as SortKey)}
            className="text-[10px] bg-muted/50 border border-border rounded-lg px-2 py-1 text-foreground shrink-0"
          >
            {SORT_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {(['all', 'best_value', 'most_popular', 'limited', 'new', 'micro', 'whale_tier'] as QuickFilter[]).map(f => {
            const labels: Record<QuickFilter, string> = {
              all: '📦 All', best_value: '💚 Best Value', most_popular: '🔥 Popular',
              limited: '⏳ Limited', new: '✨ New', micro: '💰 Budget', whale_tier: '🐋 Whale', wishlist: '❤️ Wishlist'
            };
            return (
              <button
                key={f}
                onClick={() => setQuickFilter(f)}
                className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all ${
                  quickFilter === f ? 'bg-primary text-primary-foreground' : 'bg-muted/40 text-muted-foreground hover:bg-muted'
                }`}
              >
                {labels[f]}
              </button>
            );
          })}
        </div>

        {/* Category nav */}
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setActiveCategory('featured')}
            className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all ${
              activeCategory === 'featured' ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted'
            }`}
          >
            ⭐ Featured
          </button>
          <button
            onClick={() => setActiveCategory('all')}
            className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all ${
              activeCategory === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted'
            }`}
          >
            All ({JADE_STORE_PACKS.length})
          </button>
          {CATEGORIES.map(cat => {
            const meta = CATEGORY_META[cat];
            const count = getPacksByCategory(cat).length;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all ${
                  activeCategory === cat ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                }`}
              >
                {meta.icon} {meta.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Hero banner */}
      {activeCategory === 'featured' && quickFilter === 'all' && <HeroBanner packs={featured} onSelect={setSelectedPack} />}

      {/* Category description */}
      {activeCategory !== 'featured' && activeCategory !== 'all' && (
        <div className="rounded-xl bg-muted/20 border border-border/30 px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">{CATEGORY_META[activeCategory].icon}</span>
            <div>
              <h2 className="text-sm font-bold text-foreground">{CATEGORY_META[activeCategory].label}</h2>
              <p className="text-[10px] text-muted-foreground">{CATEGORY_META[activeCategory].description}</p>
            </div>
          </div>
        </div>
      )}

      {/* Pack count */}
      <p className="text-[10px] text-muted-foreground">{displayPacks.length} packs</p>

      {/* Pack grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <AnimatePresence mode="popLayout">
          {displayPacks.map(pack => (
            <PackCard
              key={pack.id}
              pack={pack}
              onSelect={setSelectedPack}
              showScores={showScores}
              isComparing={!!comparePacks.find(p => p.id === pack.id)}
              onToggleCompare={toggleCompare}
              isWishlisted={wishlist.has(pack.id)}
              onToggleWishlist={toggleWishlist}
            />
          ))}
        </AnimatePresence>
      </div>

      {displayPacks.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm">No packs match these filters.</div>
      )}

      {/* Pack detail modal */}
      <AnimatePresence>
        {selectedPack && <PackModal pack={selectedPack} onClose={() => setSelectedPack(null)} showScores={showScores} />}
      </AnimatePresence>

      {/* Comparison panel */}
      <AnimatePresence>
        {showCompare && (
          <ComparisonPanel
            packs={comparePacks}
            onClose={() => setShowCompare(false)}
            onRemove={(id) => setComparePacks(prev => prev.filter(p => p.id !== id))}
          />
        )}
      </AnimatePresence>

      {/* Fairness footer */}
      <div className="border-t border-border/30 pt-3 mt-4">
        <div className="flex items-start gap-2 text-[10px] text-muted-foreground">
          <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-primary/60" />
          <p>
            <strong className="text-foreground/80">Fairness Commitment:</strong> All rarity odds are transparently displayed.
            Pity progress carries across purchases. Collectible value and liquid value are clearly distinguished.
            The platform maintains reserve health for long-term ecosystem sustainability.
          </p>
        </div>
      </div>
    </div>
  );
}
