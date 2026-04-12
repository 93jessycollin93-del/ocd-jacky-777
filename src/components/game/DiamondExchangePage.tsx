import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '@/game/GameContext';
import { Diamond, Crown, Star, Coins, Shield, Zap, Gift, Clock, Check, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  checkRateLimit, generateTransactionId, acquireTransactionLock, releaseTransactionLock,
  logTransaction, checkServerDedup, atomicDiamondGrant, saveStateChecksum,
} from '@/game/transactionGuard';

// ── Diamond Package Definitions ──
interface DiamondPackage {
  id: string;
  name: string;
  diamonds: number;
  bonusDiamonds: number;
  priceUsd: number;
  priceTon?: number;
  priceStars?: number;
  tag?: string;
  icon: string;
  popular?: boolean;
  bestValue?: boolean;
  limited?: boolean;
}

const DIAMOND_PACKAGES: DiamondPackage[] = [
  // Micro tier
  { id: 'dm-01', name: 'Spark', diamonds: 30, bonusDiamonds: 0, priceUsd: 0.99, priceStars: 50, icon: '✨' },
  { id: 'dm-02', name: 'Glimmer', diamonds: 80, bonusDiamonds: 5, priceUsd: 2.99, priceStars: 150, icon: '💫' },
  { id: 'dm-03', name: 'Shard', diamonds: 170, bonusDiamonds: 15, priceUsd: 4.99, priceStars: 250, priceTon: 1, icon: '🔷', popular: true },
  // Core tier
  { id: 'dm-04', name: 'Crystal', diamonds: 500, bonusDiamonds: 60, priceUsd: 14.99, priceStars: 750, priceTon: 3, icon: '💎', tag: 'Popular' },
  { id: 'dm-05', name: 'Prism', diamonds: 1100, bonusDiamonds: 180, priceUsd: 29.99, priceStars: 1500, priceTon: 6, icon: '🌟', bestValue: true, tag: 'Best Value' },
  // Premium tier
  { id: 'dm-06', name: 'Sovereign Cache', diamonds: 2500, bonusDiamonds: 500, priceUsd: 49.99, priceTon: 10, icon: '👑', tag: '+20% Bonus' },
  { id: 'dm-07', name: 'Imperial Vault', diamonds: 5500, bonusDiamonds: 1500, priceUsd: 99.99, priceTon: 20, icon: '🏛️', tag: '+27% Bonus' },
  // Whale tier
  { id: 'dm-08', name: 'Dynasty Reserve', diamonds: 15000, bonusDiamonds: 5000, priceUsd: 249.99, priceTon: 50, icon: '🐉', tag: '+33% Bonus', limited: true },
  // Legendary tier
  { id: 'dm-09', name: 'Eternal Throne', diamonds: 100000, bonusDiamonds: 40000, priceUsd: 999.99, priceTon: 200, icon: '⚜️', tag: '+40% Bonus', limited: true },
  // Titan tier
  { id: 'dm-10', name: 'Titan Ascendancy', diamonds: 10000000, bonusDiamonds: 5000000, priceUsd: 49999.99, priceTon: 10000, icon: '🌠', tag: '+50% Bonus', limited: true },
];

// ── First Purchase Bonus ──
const FIRST_PURCHASE_BONUS_KEY = 'diamond_first_purchase';

// ── Daily Login Diamond Rewards ──
export const DAILY_LOGIN_DIAMONDS: number[] = [
  0, 0, 2, 0, 0, 3, 0, // Week 1: 5 diamonds
  0, 0, 3, 0, 0, 4, 0, // Week 2: 7 diamonds
  0, 0, 4, 0, 0, 5, 0, // Week 3: 9 diamonds
  0, 0, 5, 0, 0, 8, 15, // Week 4: 28 diamonds (big month-end reward)
];

// ── Battle Pass Diamond Milestones ──
export const BATTLE_PASS_DIAMOND_MILESTONES: Record<number, number> = {
  5: 3,    // Level 5: 3 diamonds
  10: 5,   // Level 10: 5 diamonds
  15: 5,
  20: 8,
  25: 10,
  30: 15,  // Level 30: 15 diamonds
  35: 10,
  40: 15,
  45: 20,
  50: 30,  // Level 50: 30 diamonds (season cap)
};

// ── Tournament Diamond Prizes ──
export const TOURNAMENT_DIAMOND_PRIZES = {
  quickMatch: { win: 1, loss: 0 },           // 1 diamond per win
  tournament: { first: 15, second: 8, third: 5, participation: 1 },
  weeklyChampion: 50,
};

type PaymentMethod = 'usd' | 'ton' | 'stars';

export default function DiamondExchangePage() {
  const { state, setState } = useGame();
  const [selectedPkg, setSelectedPkg] = useState<DiamondPackage | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('stars');
  const [processing, setProcessing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const isFirstPurchase = !localStorage.getItem(FIRST_PURCHASE_BONUS_KEY);

  const handlePurchase = useCallback((pkg: DiamondPackage) => {
    setSelectedPkg(pkg);
    setShowConfirm(true);
  }, []);

  const processingRef = useRef(false);

  const confirmPurchase = useCallback(async () => {
    if (!selectedPkg || processingRef.current) return;

    // 1. Rate limit check
    const rateCheck = checkRateLimit('diamond_exchange');
    if (!rateCheck.allowed) {
      toast.error(`Too fast! Try again in ${Math.ceil(rateCheck.retryAfterMs / 1000)}s`);
      return;
    }

    // 2. Generate unique transaction ID
    const txId = generateTransactionId('diamond_exchange');

    // 3. Acquire local lock (prevent double-click)
    if (!acquireTransactionLock(txId)) {
      toast.error('Transaction already processing');
      return;
    }

    processingRef.current = true;
    setProcessing(true);

    try {
      // 4. Server-side deduplication
      const dedupOk = await checkServerDedup(txId, 'diamond_exchange');
      if (!dedupOk) {
        toast.error('Duplicate transaction blocked');
        return;
      }

      // 5. Calculate diamonds (atomic)
      const firstBonus = isFirstPurchase ? Math.round(selectedPkg.diamonds * 0.5) : 0;
      const totalDiamonds = selectedPkg.diamonds + selectedPkg.bonusDiamonds + firstBonus;

      // 6. Atomic state update
      setState(prev => {
        const { newState, txRecord } = atomicDiamondGrant(
          prev, totalDiamonds, 'diamond_exchange', selectedPkg.id,
          { packageName: selectedPkg.name, paymentMethod, firstBonus, txId }
        );

        // Log transaction asynchronously
        logTransaction(txRecord);
        saveStateChecksum(newState);

        return newState;
      });

      // 7. Mark first purchase server-side
      if (isFirstPurchase) {
        localStorage.setItem(FIRST_PURCHASE_BONUS_KEY, txId); // Store txId not just timestamp
      }

      toast.success(
        `💎 ${totalDiamonds.toLocaleString()} diamonds acquired!` +
        (firstBonus > 0 ? ` (includes ${firstBonus} first-purchase bonus!)` : '')
      );
    } finally {
      releaseTransactionLock(txId);
      processingRef.current = false;
      setProcessing(false);
      setShowConfirm(false);
      setSelectedPkg(null);
    }
  }, [selectedPkg, isFirstPurchase, setState, paymentMethod]);

  const getPrice = (pkg: DiamondPackage): string => {
    switch (paymentMethod) {
      case 'usd': return `$${pkg.priceUsd}`;
      case 'ton': return pkg.priceTon ? `${pkg.priceTon} TON` : `$${pkg.priceUsd}`;
      case 'stars': return pkg.priceStars ? `⭐ ${pkg.priceStars}` : `$${pkg.priceUsd}`;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center space-y-1">
        <h1 className="text-xl font-bold text-foreground flex items-center justify-center gap-2">
          💎 Diamond Exchange
        </h1>
        <p className="text-xs text-muted-foreground">
          The only way to acquire diamonds. Premium, permanent, powerful.
        </p>
        <div className="inline-flex items-center gap-2 bg-card rounded-full px-4 py-1.5 border border-border/30">
          <span className="text-lg">💎</span>
          <span className="text-sm font-bold text-cyan-400">{(state.resources.diamonds || 0).toLocaleString()}</span>
          <span className="text-[10px] text-muted-foreground">balance</span>
        </div>
      </div>

      {/* First Purchase Banner */}
      {isFirstPurchase && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-xl border-2 border-amber-500/40 bg-amber-500/10 p-3 text-center"
        >
          <p className="text-xs font-bold text-amber-400 flex items-center justify-center gap-1">
            <Gift className="w-3.5 h-3.5" /> First Purchase: +50% Bonus Diamonds!
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">One-time reward on your first diamond purchase</p>
        </motion.div>
      )}

      {/* Payment Method Selector */}
      <div className="flex gap-2">
        {(['stars', 'ton', 'usd'] as PaymentMethod[]).map(method => (
          <button
            key={method}
            onClick={() => setPaymentMethod(method)}
            className={`flex-1 rounded-lg py-2.5 px-3 text-xs font-semibold transition-all min-h-[44px] ${
              paymentMethod === method
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'bg-card border border-border/30 text-muted-foreground'
            }`}
          >
            {method === 'stars' && '⭐ Stars'}
            {method === 'ton' && '💠 TON'}
            {method === 'usd' && '💵 USD'}
          </button>
        ))}
      </div>

      {/* Security Notice */}
      <div className="flex items-start gap-2 rounded-lg bg-muted/30 p-2.5 border border-border/20">
        <Shield className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
        <div>
          <p className="text-[10px] text-muted-foreground">
            All transactions are verified and irreversible. Diamonds cannot be traded, transferred, or refunded.
            Confirm every purchase carefully.
          </p>
        </div>
      </div>

      {/* Package Grid */}
      <div className="space-y-2.5">
        {DIAMOND_PACKAGES.map((pkg) => {
          const totalWithBonus = pkg.diamonds + pkg.bonusDiamonds + (isFirstPurchase ? Math.round(pkg.diamonds * 0.5) : 0);
          const valuePerDollar = Math.round(totalWithBonus / pkg.priceUsd);

          return (
            <motion.button
              key={pkg.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => handlePurchase(pkg)}
              className={`w-full text-left rounded-xl border p-3.5 transition-all active:scale-[0.98] ${
                pkg.bestValue
                  ? 'border-primary/50 bg-primary/5 shadow-[0_0_20px_hsl(var(--primary)/0.1)]'
                  : pkg.popular
                  ? 'border-amber-500/30 bg-card/80'
                  : 'border-border/30 bg-card/60'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{pkg.icon}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-foreground">{pkg.name}</span>
                      {pkg.tag && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                          pkg.bestValue ? 'bg-primary/20 text-primary' :
                          pkg.limited ? 'bg-red-500/20 text-red-400' :
                          'bg-amber-500/20 text-amber-400'
                        }`}>
                          {pkg.tag}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs font-semibold text-cyan-400">💎 {pkg.diamonds.toLocaleString()}</span>
                      {pkg.bonusDiamonds > 0 && (
                        <span className="text-[10px] text-emerald-400">+{pkg.bonusDiamonds}</span>
                      )}
                      {isFirstPurchase && (
                        <span className="text-[10px] text-amber-400">+{Math.round(pkg.diamonds * 0.5)} first!</span>
                      )}
                    </div>
                    <p className="text-[9px] text-muted-foreground mt-0.5">
                      {valuePerDollar} 💎/$ value
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-foreground">{getPrice(pkg)}</span>
                  {pkg.limited && (
                    <p className="text-[9px] text-red-400 mt-0.5">Limited stock</p>
                  )}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Diamond Drip Info */}
      <Card className="border-border/30">
        <CardContent className="p-3.5 space-y-2.5">
          <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-cyan-400" /> Free Diamond Drips
          </h3>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> Daily Login (Day 3,6,10...)</span>
              <span className="text-cyan-400 font-semibold">2-15 💎</span>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-muted-foreground flex items-center gap-1"><Star className="w-3 h-3" /> Battle Pass Milestones</span>
              <span className="text-cyan-400 font-semibold">3-30 💎</span>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-muted-foreground flex items-center gap-1"><Crown className="w-3 h-3" /> Tournament Wins</span>
              <span className="text-cyan-400 font-semibold">1-50 💎</span>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-muted-foreground flex items-center gap-1"><Gift className="w-3 h-3" /> Monthly Streak (28 days)</span>
              <span className="text-cyan-400 font-semibold">15 💎</span>
            </div>
          </div>
          <p className="text-[9px] text-muted-foreground italic">
            Free drips are capped at ~49 💎/month. Premium play earns faster.
          </p>
        </CardContent>
      </Card>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirm && selectedPkg && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            onClick={() => !processing && setShowConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl bg-card border border-border/40 p-5 space-y-4"
            >
              <div className="text-center space-y-2">
                <span className="text-4xl">{selectedPkg.icon}</span>
                <h2 className="text-lg font-bold text-foreground">{selectedPkg.name}</h2>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-xl font-bold text-cyan-400">💎 {(selectedPkg.diamonds + selectedPkg.bonusDiamonds + (isFirstPurchase ? Math.round(selectedPkg.diamonds * 0.5) : 0)).toLocaleString()}</span>
                </div>
                {isFirstPurchase && (
                  <p className="text-[10px] text-amber-400">Includes +50% first-purchase bonus!</p>
                )}
              </div>

              <div className="rounded-lg bg-muted/30 p-3 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Base diamonds</span>
                  <span className="text-foreground">{selectedPkg.diamonds.toLocaleString()}</span>
                </div>
                {selectedPkg.bonusDiamonds > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Bonus</span>
                    <span className="text-emerald-400">+{selectedPkg.bonusDiamonds.toLocaleString()}</span>
                  </div>
                )}
                {isFirstPurchase && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">First purchase</span>
                    <span className="text-amber-400">+{Math.round(selectedPkg.diamonds * 0.5).toLocaleString()}</span>
                  </div>
                )}
                <div className="border-t border-border/30 pt-1.5 flex justify-between text-xs font-bold">
                  <span className="text-muted-foreground">Total</span>
                  <span className="text-cyan-400">{getPrice(selectedPkg)}</span>
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 p-2.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                <p className="text-[10px] text-amber-400">
                  This purchase is final and irreversible. Diamonds cannot be refunded or transferred.
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 min-h-[44px]"
                  onClick={() => setShowConfirm(false)}
                  disabled={processing}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 min-h-[44px] bg-cyan-600 hover:bg-cyan-500 text-white"
                  onClick={confirmPurchase}
                  disabled={processing}
                >
                  {processing ? (
                    <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1 }}>
                      Processing…
                    </motion.span>
                  ) : (
                    <><Check className="w-4 h-4 mr-1" /> Confirm {getPrice(selectedPkg)}</>
                  )}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
