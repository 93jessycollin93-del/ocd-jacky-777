import { useEffect, useState } from 'react';
import { Store, Coins, Gem, Sparkles } from 'lucide-react';
import { base44 } from '@/eru/api/base44Client';
import BazarBalanceCard from '@/eru/components/bazar/BazarBalanceCard';
import BazarProductCard from '@/eru/components/bazar/BazarProductCard';
import BazarCheckoutDialog, { priceInGold } from '@/eru/components/bazar/BazarCheckoutDialog';
import { createPendingTransaction, markPendingVerification, verifyTransaction, failTransaction } from '@/eru/lib/paymentGuards';
import { generateTonPaymentRef } from '@/eru/lib/tonPayment';
import { FALLBACK_TON_USD } from '@/eru/lib/tonConfig';

const DEFAULT_PRODUCTS = [
  {
    title: 'Starter Pulse',
    description: '+ 1 GOLD · + 1 JADEITE · + 1 Random Micro Bonus',
    resource_code: 'BUNDLE',
    tier_label: '$1 Pack',
    amount: 1,
    display_unit: 'Starter Pack',
    price_usd: 1,
    sort_order: 1,
    badge: 'Entry',
    rewards: { gold: 1, jadeite: 1, bonuses: ['1 Random Micro Bonus'] },
  },
  {
    title: 'Initiate Bundle',
    description: '+ 6 GOLD · + 6 JADEITE · + 2 Random Bonuses',
    resource_code: 'BUNDLE',
    tier_label: '$5 Pack',
    amount: 1,
    display_unit: 'Initiate Pack',
    price_usd: 5,
    sort_order: 2,
    rewards: { gold: 6, jadeite: 6, bonuses: ['2 Random Bonuses'] },
  },
  {
    title: 'Builder Pack',
    description: '+ 13 GOLD · + 13 JADEITE · + Small Rare Chance Drop',
    resource_code: 'BUNDLE',
    tier_label: '$10 Pack',
    amount: 1,
    display_unit: 'Builder Pack',
    price_usd: 10,
    sort_order: 3,
    badge: 'Popular',
    rewards: { gold: 13, jadeite: 13, bonuses: ['Small Rare Chance Drop'] },
  },
  {
    title: 'Growth Surge',
    description: '+ 28 GOLD · + 28 JADEITE · + Guaranteed Rare Material',
    resource_code: 'BUNDLE',
    tier_label: '$20 Pack',
    amount: 1,
    display_unit: 'Growth Pack',
    price_usd: 20,
    sort_order: 4,
    rewards: { gold: 28, jadeite: 28, bonuses: ['Guaranteed Rare Material'] },
  },
  {
    title: 'Expansion Crate',
    description: '+ 80 GOLD · + 80 JADEITE · + Epic Drop Chance · + Resource Multiplier (limited time)',
    resource_code: 'BUNDLE',
    tier_label: '$50 Pack',
    amount: 1,
    display_unit: 'Expansion Crate',
    price_usd: 50,
    sort_order: 5,
    rewards: { gold: 80, jadeite: 80, bonuses: ['Epic Drop Chance', 'Resource Multiplier (limited time)'] },
  },
  {
    title: 'Dominator Cache',
    description: '+ 180 GOLD · + 180 JADEITE · + Guaranteed Epic Drop · + Bonus Refinement Materials · + Temporary Boost Buff',
    resource_code: 'BUNDLE',
    tier_label: '$100 Pack',
    amount: 1,
    display_unit: 'Dominator Cache',
    price_usd: 100,
    sort_order: 6,
    badge: 'Elite',
    rewards: { gold: 180, jadeite: 180, bonuses: ['Guaranteed Epic Drop', 'Bonus Refinement Materials', 'Temporary Boost Buff'] },
  },
  {
    title: 'Warlord Reserve',
    description: '+ 300 GOLD · + 300 JADEITE · + Legendary Drop Chance · + Exclusive Asset Unlock',
    resource_code: 'BUNDLE',
    tier_label: '$150 Pack',
    amount: 1,
    display_unit: 'Warlord Reserve',
    price_usd: 150,
    sort_order: 7,
    rewards: { gold: 300, jadeite: 300, bonuses: ['Legendary Drop Chance', 'Exclusive Asset Unlock'] },
  },
  {
    title: 'Sovereign Vault',
    description: '+ 600 GOLD · + 600 JADEITE · + Guaranteed Legendary Asset · + Exclusive Visual Skin · + Permanent Efficiency Boost · + Priority Processing · + Ultra Rare Drop Chance',
    resource_code: 'BUNDLE',
    tier_label: '$250 Pack',
    amount: 1,
    display_unit: 'Sovereign Vault',
    price_usd: 250,
    sort_order: 8,
    badge: 'Mythic',
    rewards: { gold: 600, jadeite: 600, bonuses: ['Guaranteed Legendary Asset', 'Exclusive Visual Skin', 'Permanent Efficiency Boost (minor but meaningful)', 'Priority Processing (faster crafting/refinement)', 'Ultra Rare Drop Chance'] },
  },
];

export default function BazarStand() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buyingId, setBuyingId] = useState(null);
  const [userState, setUserState] = useState({ gold: 0, jadeite: 0, bonus_cards: 0 });
  // Currently selected product for the checkout dialog (null when closed).
  const [checkoutProduct, setCheckoutProduct] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [me, rows] = await Promise.all([
        base44.auth.me(),
        base44.entities.BazarProduct.list('sort_order', 100).catch(() => []),
      ]);
      setUserState({ gold: me?.gold || 0, jadeite: me?.jadeite || 0, bonus_cards: me?.bonus_cards || 0 });
      setProducts(rows?.length ? rows.filter((item) => item.is_active !== false) : DEFAULT_PRODUCTS);
      setLoading(false);
    };

    load();
  }, []);

  const sortedProducts = [...products].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  // Open the secure checkout dialog. Actual purchase happens in handleConfirm.
  const handleBuy = (product) => setCheckoutProduct(product);

  /**
   * Order flow (driven by BazarCheckoutDialog):
   *   1. Create a Transaction in `pending_payment` (no rewards yet).
   *   2. Settle the payment per method:
   *        wallet → debit GOLD locally → mark verified instantly
   *        card / crypto → mark `pending_verification` (admin/webhook flips to verified)
   *   3. Only after status === "verified" do we credit rewards via grantBazarRewards().
   * This routes BazarStand through the existing paymentGuards / state machine
   * instead of insta-granting like before.
   */
  const handleConfirm = async ({ method }) => {
    if (!checkoutProduct) return { ok: false, message: 'No product selected.' };
    setBuyingId(checkoutProduct.title);

    const me = await base44.auth.me();
    const product = checkoutProduct;
    const orderId = `bazar_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const priceUsd = Number(product.price_usd || 0);

    let transactionId = null;
    try {
      // Step 1 — create pending transaction (currency-type purchase)
      transactionId = await createPendingTransaction({
        orderId,
        assetType: 'currency',
        assetId: product.tier_label || product.title,
        buyerEmail: me?.email,
        expectedPrice: priceUsd,
        currency: 'USD',
        paymentMethod: method === 'wallet' ? 'wallet_balance' : method,
      });

      if (method === 'wallet') {
        // Wallet payment — debit GOLD, then verify and grant
        const walletCost = priceInGold(priceUsd);
        if ((me?.gold || 0) < walletCost) throw new Error('Insufficient wallet balance.');

        const goldAfterDebit = (me.gold || 0) - walletCost;
        await base44.auth.updateMe({ gold: goldAfterDebit });

        await markPendingVerification(transactionId, priceUsd);
        await verifyTransaction(transactionId, { settlement: 'wallet', gold_charged: walletCost });

        const granted = await grantBazarRewards({ product, transactionId, orderId, walletGoldOverride: goldAfterDebit });
        return { ok: true, message: `Rewards delivered. New balance: ${granted.gold.toLocaleString()} GOLD.` };
      }

      // External methods (card / crypto) — mark pending verification, await admin/webhook
      await markPendingVerification(transactionId, priceUsd);

      // For TON crypto, generate a unique payment reference + indicative TON amount
      // and attach it to the transaction so the verifier can match the on-chain transfer.
      let tonPayment = null;
      if (method === 'crypto') {
        const paymentRef = generateTonPaymentRef();
        const amountTon = Number((priceUsd / FALLBACK_TON_USD).toFixed(4));
        await base44.entities.Transaction.update(transactionId, {
          metadata: { chain: 'ton', network: 'mainnet', payment_ref: paymentRef, amount_ton: amountTon },
        }).catch(() => null);
        tonPayment = { transactionId, paymentRef, amountTon };
      }

      await base44.entities.EconomyAuditLog.create({
        action: 'bazar_purchase_pending',
        user_email: me?.email,
        amount: priceUsd,
        reason: `Pending ${method} verification — ${product.title}`,
        metadata: { order_id: orderId, transaction_id: transactionId, method, ...(tonPayment || {}) },
        status: 'pending',
      }).catch(() => null);

      return {
        ok: true,
        message: method === 'crypto'
          ? `Send the exact TON amount with the payment comment below, then tap "verify".`
          : `Order received. Your ${product.title} will be delivered after payment is verified.`,
        tonPayment,
      };
    } catch (err) {
      if (transactionId) await failTransaction(transactionId, err?.message || 'Checkout error').catch(() => null);
      throw err;
    } finally {
      setBuyingId(null);
    }
  };

  /**
   * Credits the user with the pack rewards. Only called after a Transaction
   * has been verified — the payment gate inside grantCurrency would also
   * block invalid grants, but for the bundle/in-app currency case we apply
   * gold/jadeite/bonus_cards directly under the verified-transaction guard
   * we already enforced above.
   */
  const grantBazarRewards = async ({ product, transactionId, orderId, walletGoldOverride }) => {
    const me = await base44.auth.me();
    const rewardGold = Number(product.rewards?.gold || product.gold_amount || 0);
    const rewardJadeite = Number(product.rewards?.jadeite || product.jadeite_amount || 0);
    const bonusCards = 1;

    const baseGold = walletGoldOverride !== undefined ? walletGoldOverride : (me?.gold || 0);
    const nextGold = baseGold + rewardGold;
    const nextJadeite = (me?.jadeite || 0) + rewardJadeite;
    const nextBonusCards = (me?.bonus_cards || 0) + bonusCards;

    await base44.auth.updateMe({ gold: nextGold, jadeite: nextJadeite, bonus_cards: nextBonusCards });
    await base44.entities.EconomyAuditLog.create({
      action: 'bazar_purchase',
      user_email: me?.email,
      amount: Number(product.price_usd || 0),
      reason: `Purchased ${product.title}`,
      metadata: {
        resource_code: product.resource_code,
        tier_label: product.tier_label,
        price_usd: product.price_usd,
        rewards: product.rewards || null,
        bonus_cards_awarded: bonusCards,
        order_id: orderId,
        transaction_id: transactionId,
      },
      status: 'success',
    }).catch(() => null);

    setUserState({ gold: nextGold, jadeite: nextJadeite, bonus_cards: nextBonusCards });
    return { gold: nextGold, jadeite: nextJadeite, bonus_cards: nextBonusCards };
  };

  return (
    <div className="min-h-screen bg-background px-4 py-4 pb-24 space-y-4">
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
            <Store className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Bazar Stand</h1>
            <p className="mt-1 text-sm text-muted-foreground">Internal store for app users to purchase in-game currency, credits, and reserve resources.</p>
          </div>
        </div>
      </div>

      <BazarBalanceCard gold={userState.gold} jadeite={userState.jadeite} />

      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 h-4 w-4 text-primary" />
          <div className="space-y-1 text-xs text-muted-foreground">
            <p><span className="font-semibold text-foreground">Launch Rewards</span></p>
            <p><span className="text-yellow-400">Every pack purchase</span> now grants 1 bonus card automatically.</p>
            <p><span className="text-emerald-400">Every $1 spent on Monolith jade chunks</span> grants 1 bonus card automatically.</p>
            <p>Clear launch-ready rewards make the store easier to understand at first glance.</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">Loading Bazar Stand…</div>
      ) : (
        <div className="space-y-6">
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Coins className="h-4 w-4 text-yellow-400" />
              <Gem className="h-4 w-4 text-emerald-400" />
              <h2 className="text-sm font-semibold text-foreground">Bazar packs</h2>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {sortedProducts.map((product) => (
                <BazarProductCard key={product.title} product={product} onBuy={handleBuy} buying={buyingId === product.title} />
              ))}
            </div>
          </section>
        </div>
      )}

      {checkoutProduct && (
        <BazarCheckoutDialog
          product={checkoutProduct}
          walletGold={userState.gold}
          onClose={() => setCheckoutProduct(null)}
          onConfirm={handleConfirm}
        />
      )}
    </div>
  );
}