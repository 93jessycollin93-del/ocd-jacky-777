import { useState, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '@/game/GameContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Diamond, Crown, Star, Gift, Lock, Check, Zap, Shield, Swords, Flame, Sparkles } from 'lucide-react';
import type { BattlePassReward, BattlePassState } from '@/game/types';
import { checkRateLimit, logTransaction, saveStateChecksum } from '@/game/transactionGuard';

// ── Tier Reward Definitions ──
const BATTLE_PASS_REWARDS: BattlePassReward[] = [
  // Free track
  { tier: 1, name: '50 Gold', icon: '🪙', description: 'Starter gold', type: 'free', category: 'currency', rarity: 'common' },
  { tier: 2, name: '2 Speed-Ups', icon: '⚡', description: 'Minor speedup tokens', type: 'free', category: 'consumable', rarity: 'common' },
  { tier: 3, name: '100 Gold', icon: '🪙', description: 'Gold stash', type: 'free', category: 'currency', rarity: 'common' },
  { tier: 4, name: 'Card Pack', icon: '🃏', description: 'Standard card pack', type: 'free', category: 'consumable', rarity: 'uncommon' },
  { tier: 5, name: '3 💎 Diamonds', icon: '💎', description: 'Premium diamond drip', type: 'free', category: 'currency', rarity: 'rare',
    effect: { type: 'instant_resource', value: 3, target: 'diamonds' } },
  { tier: 6, name: '200 Gold', icon: '🪙', description: 'Gold reserve', type: 'free', category: 'currency', rarity: 'common' },
  { tier: 7, name: 'Shield (1h)', icon: '🛡️', description: 'Protection shield', type: 'free', category: 'consumable', rarity: 'uncommon',
    effect: { type: 'shield', value: 1, duration: 3600 } },
  { tier: 8, name: '50 Dust', icon: '✨', description: 'Card crafting dust', type: 'free', category: 'currency', rarity: 'common' },
  { tier: 9, name: '500 Gold', icon: '🪙', description: 'Gold hoard', type: 'free', category: 'currency', rarity: 'uncommon' },
  { tier: 10, name: '5 💎 Diamonds', icon: '💎', description: 'Premium diamond cache', type: 'free', category: 'currency', rarity: 'rare',
    effect: { type: 'instant_resource', value: 5, target: 'diamonds' } },
  { tier: 11, name: '3 Speed-Ups', icon: '⚡', description: 'Speed tokens', type: 'free', category: 'consumable', rarity: 'common' },
  { tier: 12, name: '100 Dust', icon: '✨', description: 'Card dust', type: 'free', category: 'currency', rarity: 'uncommon' },
  { tier: 13, name: '1000 Gold', icon: '🪙', description: 'Gold fortune', type: 'free', category: 'currency', rarity: 'uncommon' },
  { tier: 14, name: 'Premium Pack', icon: '🎁', description: 'Premium card pack', type: 'free', category: 'consumable', rarity: 'rare' },
  { tier: 15, name: '8 💎 Diamonds', icon: '💎', description: 'Diamond milestone', type: 'free', category: 'currency', rarity: 'rare',
    effect: { type: 'instant_resource', value: 8, target: 'diamonds' } },
  { tier: 16, name: '500 Food', icon: '🌾', description: 'Food supplies', type: 'free', category: 'currency', rarity: 'common' },
  { tier: 17, name: '500 Wood', icon: '🪵', description: 'Timber shipment', type: 'free', category: 'currency', rarity: 'common' },
  { tier: 18, name: '2000 Gold', icon: '🪙', description: 'Gold treasury', type: 'free', category: 'currency', rarity: 'uncommon' },
  { tier: 19, name: '200 Dust', icon: '✨', description: 'Dust stockpile', type: 'free', category: 'currency', rarity: 'uncommon' },
  { tier: 20, name: '12 💎 Diamonds', icon: '💎', description: 'Diamond treasure', type: 'free', category: 'currency', rarity: 'ultra_rare',
    effect: { type: 'instant_resource', value: 12, target: 'diamonds' } },
  { tier: 21, name: '5000 Gold', icon: '🪙', description: 'Grand gold', type: 'free', category: 'currency', rarity: 'rare' },
  { tier: 22, name: 'Shield (4h)', icon: '🛡️', description: 'Extended shield', type: 'free', category: 'consumable', rarity: 'rare',
    effect: { type: 'shield', value: 1, duration: 14400 } },
  { tier: 23, name: '500 Dust', icon: '✨', description: 'Dust fortune', type: 'free', category: 'currency', rarity: 'rare' },
  { tier: 24, name: 'Mythic Pack', icon: '💎', description: 'Mythic card pack', type: 'free', category: 'consumable', rarity: 'ultra_rare' },
  { tier: 25, name: '15 💎 Diamonds', icon: '💎', description: 'Diamond vault', type: 'free', category: 'currency', rarity: 'ultra_rare',
    effect: { type: 'instant_resource', value: 15, target: 'diamonds' } },
  { tier: 26, name: '10000 Gold', icon: '🪙', description: 'Royal gold', type: 'free', category: 'currency', rarity: 'rare' },
  { tier: 27, name: '1000 Dust', icon: '✨', description: 'Grand dust', type: 'free', category: 'currency', rarity: 'rare' },
  { tier: 28, name: 'Shield (12h)', icon: '🛡️', description: 'Day shield', type: 'free', category: 'consumable', rarity: 'ultra_rare',
    effect: { type: 'shield', value: 1, duration: 43200 } },
  { tier: 29, name: '20000 Gold', icon: '🪙', description: 'Emperor gold', type: 'free', category: 'currency', rarity: 'ultra_rare' },
  { tier: 30, name: '30 💎 Diamonds', icon: '💎', description: 'Season finale diamonds', type: 'free', category: 'currency', rarity: 'legendary',
    effect: { type: 'instant_resource', value: 30, target: 'diamonds' } },

  // Premium track (doubles)
  { tier: 1, name: '100 Gold', icon: '👑', description: 'Premium gold', type: 'premium', category: 'currency', rarity: 'uncommon' },
  { tier: 2, name: '5 Speed-Ups', icon: '👑', description: 'Premium speedups', type: 'premium', category: 'consumable', rarity: 'uncommon' },
  { tier: 3, name: '300 Gold', icon: '👑', description: 'Premium gold', type: 'premium', category: 'currency', rarity: 'uncommon' },
  { tier: 4, name: 'Premium Pack', icon: '👑', description: 'Premium card pack', type: 'premium', category: 'consumable', rarity: 'rare' },
  { tier: 5, name: '5 💎 Diamonds', icon: '👑', description: 'Premium diamond bonus', type: 'premium', category: 'currency', rarity: 'rare',
    effect: { type: 'instant_resource', value: 5, target: 'diamonds' } },
  { tier: 10, name: '10 💎 Diamonds', icon: '👑', description: 'Premium diamond chest', type: 'premium', category: 'currency', rarity: 'ultra_rare',
    effect: { type: 'instant_resource', value: 10, target: 'diamonds' } },
  { tier: 15, name: '15 💎 Diamonds', icon: '👑', description: 'Premium diamond hoard', type: 'premium', category: 'currency', rarity: 'ultra_rare',
    effect: { type: 'instant_resource', value: 15, target: 'diamonds' } },
  { tier: 20, name: '20 💎 Diamonds', icon: '👑', description: 'Premium diamond vault', type: 'premium', category: 'currency', rarity: 'legendary',
    effect: { type: 'instant_resource', value: 20, target: 'diamonds' } },
  { tier: 25, name: '25 💎 Diamonds', icon: '👑', description: 'Premium diamond treasury', type: 'premium', category: 'currency', rarity: 'legendary',
    effect: { type: 'instant_resource', value: 25, target: 'diamonds' } },
  { tier: 30, name: '50 💎 + 👑 Title', icon: '👑', description: 'Season champion reward', type: 'premium', category: 'currency', rarity: 'mythic',
    effect: { type: 'instant_resource', value: 50, target: 'diamonds' } },
];

const XP_PER_TIER = 100;
const MAX_TIER = 30;

const RARITY_COLORS: Record<string, string> = {
  common: 'hsl(0,0%,65%)',
  uncommon: 'hsl(140,60%,50%)',
  rare: 'hsl(210,80%,60%)',
  epic: 'hsl(280,70%,60%)',
  legendary: 'hsl(45,90%,55%)',
  mythic: 'hsl(330,80%,60%)',
};

export default function BattlePassPage() {
  const { state, setState, addBattlePassXP } = useGame();
  const rawBp = state.battlePass;
  const bp = {
    season: rawBp?.season ?? 1,
    xp: rawBp?.xp ?? 0,
    tier: rawBp?.tier ?? 0,
    isPremium: rawBp?.isPremium ?? false,
    claimedFree: rawBp?.claimedFree ?? [] as number[],
    claimedPremium: rawBp?.claimedPremium ?? [] as number[],
    seasonStartedAt: rawBp?.seasonStartedAt ?? Date.now(),
  };

  const currentTier = bp.tier;
  const xpInTier = bp.xp % XP_PER_TIER;
  const totalXp = bp.xp;

  const freeRewards = useMemo(() => BATTLE_PASS_REWARDS.filter(r => r.type === 'free'), []);
  const premiumRewards = useMemo(() => BATTLE_PASS_REWARDS.filter(r => r.type === 'premium'), []);

  const claimingRef = useRef(new Set<number>());

  const claimReward = useCallback((reward: BattlePassReward) => {
    const isFree = reward.type === 'free';
    const claimed = isFree ? bp.claimedFree : bp.claimedPremium;

    if (claimed.includes(reward.tier)) return;
    if (reward.tier > currentTier) return;
    if (reward.type === 'premium' && !bp.isPremium) return;

    // Prevent double-claim via ref
    const claimKey = reward.tier * 10 + (isFree ? 0 : 1);
    if (claimingRef.current.has(claimKey)) return;
    claimingRef.current.add(claimKey);

    // Rate limit
    const rateCheck = checkRateLimit('battle_pass_claim');
    if (!rateCheck.allowed) {
      toast.error(`Slow down! Wait ${Math.ceil(rateCheck.retryAfterMs / 1000)}s`);
      claimingRef.current.delete(claimKey);
      return;
    }

    setState(prev => {
      const rawBpPrev = prev.battlePass;
      const bpPrev = {
        ...rawBpPrev,
        claimedFree: rawBpPrev?.claimedFree ?? [],
        claimedPremium: rawBpPrev?.claimedPremium ?? [],
      };

      // Re-check inside setState for atomicity
      const alreadyClaimed = isFree
        ? bpPrev.claimedFree.includes(reward.tier)
        : bpPrev.claimedPremium.includes(reward.tier);
      if (alreadyClaimed) return prev;

      const newBp = { ...bpPrev };
      if (isFree) newBp.claimedFree = [...newBp.claimedFree, reward.tier];
      else newBp.claimedPremium = [...newBp.claimedPremium, reward.tier];

      const ns = { ...prev, battlePass: newBp };

      // Grant diamond rewards
      if (reward.effect?.type === 'instant_resource' && reward.effect.target === 'diamonds') {
        const balBefore = ns.resources.diamonds || 0;
        ns.resources = { ...ns.resources, diamonds: balBefore + reward.effect.value };
        
        logTransaction({
          transaction_type: 'claim',
          currency_type: 'diamonds',
          amount: reward.effect.value,
          balance_before: balBefore,
          balance_after: ns.resources.diamonds,
          source: 'battle_pass',
          source_id: `tier_${reward.tier}_${reward.type}`,
        });
        
        toast.success(`+${reward.effect.value} 💎 Diamonds claimed!`);
      } else {
        toast.success(`${reward.name} claimed!`);
      }

      saveStateChecksum(ns);
      return ns;
    });

    // Release claim lock after a short delay
    setTimeout(() => claimingRef.current.delete(claimKey), 1000);
  }, [bp, currentTier, setState]);

  const upgradeToPremium = useCallback(() => {
    if (bp.isPremium) return;

    const rateCheck = checkRateLimit('jade_store');
    if (!rateCheck.allowed) {
      toast.error(`Wait ${Math.ceil(rateCheck.retryAfterMs / 1000)}s`);
      return;
    }

    setState(prev => {
      // Atomic check inside setState
      const currentDiamonds = prev.resources.diamonds || 0;
      if (currentDiamonds < 500) {
        toast.error('Need 500 💎 to unlock Premium Pass');
        return prev;
      }
      if (prev.battlePass?.isPremium) return prev; // Already premium

      const ns = {
        ...prev,
        resources: { ...prev.resources, diamonds: currentDiamonds - 500 },
        battlePass: { ...prev.battlePass!, isPremium: true },
      };

      logTransaction({
        transaction_type: 'spend',
        currency_type: 'diamonds',
        amount: -500,
        balance_before: currentDiamonds,
        balance_after: currentDiamonds - 500,
        source: 'battle_pass',
        source_id: 'premium_upgrade',
      });

      saveStateChecksum(ns);
      return ns;
    });
    toast.success('👑 Premium Battle Pass unlocked!');
  }, [bp, setState]);

  const seasonEnd = bp.seasonStartedAt + (30 * 24 * 60 * 60 * 1000);
  const daysLeft = Math.max(0, Math.ceil((seasonEnd - Date.now()) / (24 * 60 * 60 * 1000)));

  return (
    <div className="p-3 space-y-3 max-w-lg mx-auto">
      {/* Header */}
      <div className="text-center">
        <motion.div animate={{ rotateY: [0, 360] }} transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
          className="inline-block text-4xl mb-1">⚔️</motion.div>
        <h1 className="text-lg font-bold text-foreground">Battle Pass</h1>
        <p className="text-[10px] text-muted-foreground">Season {bp.season} · {daysLeft} days left</p>
      </div>

      {/* XP Progress */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-bold text-foreground">Tier {currentTier}/{MAX_TIER}</span>
            <span className="text-[10px] text-muted-foreground">{totalXp} XP total</span>
          </div>
          <Progress value={(xpInTier / XP_PER_TIER) * 100} className="h-2.5 mb-1" />
          <p className="text-[9px] text-muted-foreground text-right">{xpInTier}/{XP_PER_TIER} XP to next tier</p>
        </CardContent>
      </Card>

      {/* Premium Upgrade */}
      {!bp.isPremium && (
        <motion.div whileTap={{ scale: 0.98 }}>
          <Card className="border-yellow-500/30 bg-gradient-to-r from-yellow-500/5 to-amber-500/5">
            <CardContent className="p-3 flex items-center gap-3">
              <Crown size={24} className="text-yellow-400 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-bold text-foreground">Upgrade to Premium</p>
                <p className="text-[9px] text-muted-foreground">Unlock 2× rewards + exclusive diamond tiers + champion title</p>
              </div>
              <Button size="sm" className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold text-[10px]"
                onClick={upgradeToPremium}>
                <Diamond size={12} /> 500
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Reward Track */}
      <div className="space-y-1.5">
        <h2 className="text-xs font-bold text-foreground flex items-center gap-1.5">
          <Gift size={14} /> Reward Track
        </h2>

        {Array.from({ length: MAX_TIER }, (_, i) => i + 1).map(tier => {
          const free = freeRewards.find(r => r.tier === tier);
          const premium = premiumRewards.find(r => r.tier === tier);
          const reached = tier <= currentTier;
          const isDiamondTier = free?.effect?.target === 'diamonds' || premium?.effect?.target === 'diamonds';

          return (
            <motion.div key={tier} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: tier * 0.02 }}>
              <Card className={`transition-all ${isDiamondTier ? 'border-cyan-500/30 bg-cyan-500/5' : ''} ${!reached ? 'opacity-50' : ''}`}>
                <CardContent className="p-2">
                  <div className="flex items-center gap-2">
                    {/* Tier number */}
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                      reached ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    }`}>
                      {tier}
                    </div>

                    {/* Free reward */}
                    {free && (
                      <div className="flex-1 flex items-center gap-1.5">
                        <span className="text-lg">{free.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-bold text-foreground truncate">{free.name}</p>
                          <p className="text-[8px] text-muted-foreground truncate">{free.description}</p>
                        </div>
                        {reached && !bp.claimedFree.includes(tier) ? (
                          <Button size="sm" className="h-6 text-[9px] px-2" onClick={() => claimReward(free)}>
                            Claim
                          </Button>
                        ) : bp.claimedFree.includes(tier) ? (
                          <Check size={14} className="text-green-400 shrink-0" />
                        ) : (
                          <Lock size={12} className="text-muted-foreground shrink-0" />
                        )}
                      </div>
                    )}

                    {/* Premium reward */}
                    {premium && (
                      <div className="flex items-center gap-1.5 border-l border-border pl-2">
                        <Crown size={12} className="text-yellow-400 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[9px] font-bold truncate" style={{ color: RARITY_COLORS[premium.rarity] }}>
                            {premium.name}
                          </p>
                        </div>
                        {bp.isPremium && reached && !bp.claimedPremium.includes(tier) ? (
                          <Button size="sm" variant="outline" className="h-5 text-[8px] px-1.5"
                            onClick={() => claimReward(premium)}>
                            Claim
                          </Button>
                        ) : bp.claimedPremium.includes(tier) ? (
                          <Check size={10} className="text-yellow-400 shrink-0" />
                        ) : !bp.isPremium ? (
                          <Lock size={10} className="text-yellow-400/30 shrink-0" />
                        ) : (
                          <Lock size={10} className="text-muted-foreground shrink-0" />
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* XP Sources Guide */}
      <Card>
        <CardContent className="p-3">
          <h3 className="text-[10px] font-bold text-foreground mb-1.5 flex items-center gap-1"><Zap size={12} /> How to Earn XP</h3>
          <div className="grid grid-cols-2 gap-1 text-[8px] text-muted-foreground">
            <div className="flex items-center gap-1"><Swords size={9} /> Battle Victory: 25-50 XP</div>
            <div className="flex items-center gap-1"><Shield size={9} /> Building Upgrade: 15-50 XP</div>
            <div className="flex items-center gap-1"><Flame size={9} /> Research: 20-60 XP</div>
            <div className="flex items-center gap-1"><Star size={9} /> Expedition: 25-35 XP</div>
            <div className="flex items-center gap-1"><Sparkles size={9} /> Tournament Win: 50 XP</div>
            <div className="flex items-center gap-1"><Gift size={9} /> Daily Login: 10 XP</div>
          </div>
        </CardContent>
      </Card>

      {/* Diamond summary */}
      <Card className="border-cyan-500/20">
        <CardContent className="p-3 text-center">
          <p className="text-[10px] font-bold text-foreground mb-0.5">💎 Diamond Milestones</p>
          <p className="text-[8px] text-muted-foreground">
            Free track: {freeRewards.filter(r => r.effect?.target === 'diamonds').reduce((s, r) => s + (r.effect?.value || 0), 0)} 💎 total at tiers {freeRewards.filter(r => r.effect?.target === 'diamonds').map(r => r.tier).join(', ')}
          </p>
          {bp.isPremium && (
            <p className="text-[8px] text-yellow-400">
              + Premium: {premiumRewards.filter(r => r.effect?.target === 'diamonds').reduce((s, r) => s + (r.effect?.value || 0), 0)} 💎 bonus
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
