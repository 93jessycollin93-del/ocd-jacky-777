import { useState, useEffect, useMemo } from 'react';
import { Star, Download, MessageSquare, Search, Send, X, Sparkles, Briefcase, Blocks, Bot, ArrowUpDown, TrendingUp, Globe, Lock, Upload, ShoppingCart, RefreshCcw } from 'lucide-react';
import { base44 } from '@/eru/api/base44Client';
import { useAuth } from '@/eru/lib/AuthContext';
import BotMarketplaceTradeSheet from './BotMarketplaceTradeSheet';
import { ALL_MARKET_CURRENCIES, DEFAULT_PRICE_OPTIONS } from './botMarketplaceCurrencies';

const ROLE_EMOJI = { assistant: '🤖', trader: '📈', game_helper: '🎮', social: '💬', custom: '⚙️' };
const CATEGORY_OPTIONS = ['All', 'Assistant', 'Trading', 'Gaming', 'Social', 'Custom'];
const INDUSTRY_OPTIONS = ['All', 'General', 'Finance', 'Ecommerce', 'Support', 'Education', 'Marketing', 'Gaming'];

const DEFAULT_MARKET_SETUP = {
  marketplace_sale_mode: 'sell_or_trade',
  marketplace_price: '',
  marketplace_currency: 'USD',
  marketplace_trade_notes: '',
  marketplace_accepts_trade_offers: true,
  marketplace_accepts_money_offers: true,
  marketplace_accepts_crypto_offers: true,
  marketplace_offer_anything: false,
};
const SORT_OPTIONS = [
  { value: 'featured', label: 'Featured' },
  { value: 'popularity', label: 'Popularity' },
  { value: 'rating', label: 'Rating' },
  { value: 'newestReviews', label: 'Most Reviewed' },
  { value: 'name', label: 'Name' },
];

const getCategory = (bot) => ({
  assistant: 'Assistant',
  trader: 'Trading',
  game_helper: 'Gaming',
  social: 'Social',
  custom: 'Custom',
}[bot.role] || 'Assistant');

const getIndustry = (bot) => {
  const text = `${bot.name || ''} ${bot.description || ''} ${bot.instructions || ''}`.toLowerCase();
  if (text.includes('trade') || text.includes('market') || text.includes('portfolio') || text.includes('crypto') || text.includes('finance')) return 'Finance';
  if (text.includes('shop') || text.includes('store') || text.includes('ecommerce') || text.includes('sales')) return 'Ecommerce';
  if (text.includes('support') || text.includes('help desk') || text.includes('customer')) return 'Support';
  if (text.includes('learn') || text.includes('education') || text.includes('teach') || text.includes('course')) return 'Education';
  if (text.includes('marketing') || text.includes('growth') || text.includes('seo') || text.includes('campaign')) return 'Marketing';
  if (text.includes('game') || text.includes('guild') || text.includes('player')) return 'Gaming';
  return 'General';
};

function StarRow({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5].map(s => (
        <button key={s} onClick={() => onChange?.(s)}>
          <Star className={`w-4 h-4 ${s <= value ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
        </button>
      ))}
    </div>
  );
}

function BotCard({ bot, ratings, onInstall, onRate, onBuy, onTrade }) {
  const [showComments, setShowComments] = useState(false);
  const [comment, setComment] = useState('');
  const [myRating, setMyRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const botRatings = ratings.filter(r => r.bot_id === bot.id);
  const avg = botRatings.length ? (botRatings.reduce((s, r) => s + r.rating, 0) / botRatings.length).toFixed(1) : '—';
  const category = getCategory(bot);
  const industry = getIndustry(bot);
  const priceOptions = (bot.marketplace_price_options || []).length > 0
    ? bot.marketplace_price_options
    : bot.marketplace_price
      ? [{ currency: bot.marketplace_currency || 'USD', amount: bot.marketplace_price }]
      : [];

  const submitRating = async () => {
    if (!myRating) return;
    setSubmitting(true);
    await onRate(bot, myRating, comment);
    setComment(''); setMyRating(0); setSubmitting(false);
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
      <div className="flex items-start gap-3">
        <span className="text-2xl">{ROLE_EMOJI[bot.role] || '🤖'}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold">{bot.name}</p>
          <p className="text-[10px] text-muted-foreground capitalize">{bot.role} · by {bot.created_by?.split('@')[0]}</p>
          <div className="flex items-center gap-1 mt-0.5">
            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
            <span className="text-xs font-medium text-yellow-400">{avg}</span>
            <span className="text-[9px] text-muted-foreground">({botRatings.length})</span>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <button onClick={() => onInstall(bot)}
            className="flex items-center justify-center gap-1 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
            <Download className="w-3 h-3" /> Install
          </button>
          <div className="flex gap-2">
            <button onClick={() => onBuy(bot)} className="flex items-center gap-1 rounded-xl border border-border bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground">
              <ShoppingCart className="h-3 w-3" /> Buy
            </button>
            <button onClick={() => onTrade(bot)} className="flex items-center gap-1 rounded-xl border border-border bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground">
              <RefreshCcw className="h-3 w-3" /> Trade
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-medium text-primary">{category}</span>
        <span className="rounded-full border border-border bg-secondary px-2.5 py-1 text-[10px] font-medium text-muted-foreground">{industry}</span>
      </div>
      {bot.description && <p className="text-[10px] text-muted-foreground leading-relaxed">{bot.description}</p>}
      {bot.personality && <p className="text-[10px] text-foreground/60 italic">"{bot.personality}"</p>}
      {priceOptions.length > 0 && (
        <div className="rounded-xl border border-border bg-secondary/30 p-2.5">
          <p className="text-[10px] font-semibold text-foreground">Price options</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {priceOptions.map((option, index) => (
              <span key={`${option.currency}_${index}`} className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-medium text-primary">
                {option.amount} {option.currency}
              </span>
            ))}
          </div>
        </div>
      )}
      {bot.marketplace_trade_notes && <p className="rounded-xl border border-border bg-secondary/20 px-3 py-2 text-[10px] text-muted-foreground">Trade terms: {bot.marketplace_trade_notes}</p>}

      <div className="flex items-center gap-2 pt-1 border-t border-border/50">
        <span className="text-[9px] text-muted-foreground">⚡ {bot.usage_count || 0} uses · Lv{bot.level || 1}</span>
        <button onClick={() => setShowComments(c => !c)}
          className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground">
          <MessageSquare className="w-3 h-3" /> {botRatings.length} reviews
        </button>
      </div>

      {showComments && (
        <div className="space-y-2 border-t border-border/50 pt-2">
          {botRatings.slice(0, 5).map(r => (
            <div key={r.id} className="bg-secondary rounded-lg px-2.5 py-2">
              <div className="flex items-center gap-1.5 mb-1">
                <StarRow value={r.rating} />
                <span className="text-[9px] text-muted-foreground">{r.created_by?.split('@')[0]}</span>
              </div>
              {r.comment && <p className="text-[10px] text-foreground/80">{r.comment}</p>}
            </div>
          ))}

          <div className="bg-secondary rounded-xl p-2.5 space-y-2">
            <p className="text-[10px] font-semibold text-muted-foreground">Leave a review</p>
            <StarRow value={myRating} onChange={setMyRating} />
            <div className="flex gap-2">
              <input value={comment} onChange={e => setComment(e.target.value)}
                placeholder="Optional comment…"
                className="flex-1 bg-background border border-border rounded-lg px-2 py-1.5 text-[10px] outline-none" />
              <button onClick={submitRating} disabled={!myRating || submitting}
                className="p-1.5 bg-primary text-primary-foreground rounded-lg disabled:opacity-40">
                <Send className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DiscoverMarketplace({ onInstalled, embedded = false }) {
  const { currentUser } = useAuth();
  const [bots, setBots] = useState([]);
  const [myBots, setMyBots] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [industry, setIndustry] = useState('All');
  const [sortBy, setSortBy] = useState('featured');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [editingBotId, setEditingBotId] = useState('');
  const [tradeBot, setTradeBot] = useState(null);
  const [marketForm, setMarketForm] = useState(DEFAULT_MARKET_SETUP);

  const load = async () => {
    setLoading(true);
    const [b, r, mine] = await Promise.all([
      base44.entities.UserBot.filter({ is_public: true }, '-usage_count', 100),
      base44.entities.BotRating.list('-created_date', 300),
      currentUser?.email ? base44.entities.UserBot.filter({ created_by: currentUser.email }, '-created_date', 50) : Promise.resolve([]),
    ]);
    setBots(b || []);
    setRatings(r || []);
    setMyBots(mine || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [currentUser?.email]);

  const install = async (bot) => {
    const existingNames = new Set(myBots.map((item) => item.name));
    const clonedName = existingNames.has(`${bot.name} (Clone)`) ? `${bot.name} (Clone ${Date.now().toString().slice(-4)})` : `${bot.name} (Clone)`;
    await base44.entities.UserBot.create({
      name: clonedName,
      description: bot.description,
      role: bot.role,
      personality: bot.personality,
      instructions: bot.instructions,
      response_style: bot.response_style,
      handoff_instructions: bot.handoff_instructions,
      memory_enabled: bot.memory_enabled,
      page_assignments: bot.page_assignments || [],
      connected_bot_ids: [],
      status: 'active',
      is_public: false,
      usage_count: 0,
      xp: 0,
      level: 1,
    });
    await base44.entities.UserBot.update(bot.id, { usage_count: (bot.usage_count || 0) + 1 });
    setToast(`✅ "${bot.name}" installed to your AI Lab.`);
    setTimeout(() => setToast(''), 3000);
    onInstalled?.();
    load();
  };

  const rate = async (bot, rating, comment) => {
    const existing = ratings.find((item) => item.bot_id === bot.id && item.created_by === currentUser?.email);
    if (existing) {
      await base44.entities.BotRating.update(existing.id, { rating, comment, user_email: currentUser?.email, bot_name: bot.name });
    } else {
      await base44.entities.BotRating.create({ bot_id: bot.id, bot_name: bot.name, rating, comment, user_email: currentUser?.email });
    }
    load();
  };

  const togglePublish = async (bot) => {
    await base44.entities.UserBot.update(bot.id, { is_public: !bot.is_public });
    setToast(bot.is_public ? `🔒 "${bot.name}" removed from marketplace.` : `🌍 "${bot.name}" published to marketplace.`);
    setTimeout(() => setToast(''), 3000);
    load();
  };

  const startEditing = (bot) => {
    setEditingBotId(bot.id);
    setMarketForm({
      marketplace_sale_mode: bot.marketplace_sale_mode || 'sell_or_trade',
      marketplace_price: bot.marketplace_price || '',
      marketplace_currency: bot.marketplace_currency || 'USD',
      marketplace_trade_notes: bot.marketplace_trade_notes || '',
      marketplace_accepts_trade_offers: bot.marketplace_accepts_trade_offers ?? true,
      marketplace_accepts_money_offers: bot.marketplace_accepts_money_offers ?? true,
      marketplace_accepts_crypto_offers: bot.marketplace_accepts_crypto_offers ?? true,
      marketplace_offer_anything: bot.marketplace_offer_anything ?? false,
    });
  };

  const saveMarketSetup = async (bot) => {
    const currencies = Array.from(new Set([
      marketForm.marketplace_currency,
      ...DEFAULT_PRICE_OPTIONS,
    ])).filter(Boolean);

    await base44.entities.UserBot.update(bot.id, {
      marketplace_sale_mode: marketForm.marketplace_sale_mode,
      marketplace_price: marketForm.marketplace_price ? Number(marketForm.marketplace_price) : undefined,
      marketplace_currency: marketForm.marketplace_currency,
      marketplace_trade_notes: marketForm.marketplace_trade_notes,
      marketplace_accepts_trade_offers: marketForm.marketplace_accepts_trade_offers,
      marketplace_accepts_money_offers: marketForm.marketplace_accepts_money_offers,
      marketplace_accepts_crypto_offers: marketForm.marketplace_accepts_crypto_offers,
      marketplace_offer_anything: marketForm.marketplace_offer_anything,
      marketplace_price_options: marketForm.marketplace_price ? currencies.map((currency) => ({
        currency,
        amount: Number(marketForm.marketplace_price),
      })) : [],
    });

    setEditingBotId('');
    setToast(`🛒 "${bot.name}" shop setup saved.`);
    setTimeout(() => setToast(''), 3000);
    load();
  };

  const buyBot = async (bot) => {
    const options = (bot.marketplace_price_options || []).length > 0
      ? bot.marketplace_price_options
      : bot.marketplace_price
        ? [{ currency: bot.marketplace_currency || 'USD', amount: bot.marketplace_price }]
        : [];

    const chosen = options[0];
    if (!chosen) {
      setToast(`ℹ️ "${bot.name}" has no saved price yet.`);
      setTimeout(() => setToast(''), 3000);
      return;
    }

    await base44.entities.Order.create({
      order_number: `BOT-${Date.now()}`,
      buyer_email: currentUser.email,
      asset_type: 'bot',
      asset_id: bot.id,
      base_price: Number(chosen.amount),
      currency: chosen.currency,
      payment_method: chosen.currency === 'TELEGRAM_STARS' ? 'wallet' : ALL_MARKET_CURRENCIES.includes(chosen.currency) ? 'crypto' : 'stripe',
      status: 'pending_payment',
      metadata: {
        bot_name: bot.name,
        seller_email: bot.created_by,
        price_options: options,
      }
    });

    setToast(`🧾 Order created for "${bot.name}".`);
    setTimeout(() => setToast(''), 3000);
  };

  const botInsights = useMemo(() => {
    const ratingsByBot = ratings.reduce((acc, rating) => {
      if (!acc[rating.bot_id]) acc[rating.bot_id] = [];
      acc[rating.bot_id].push(rating);
      return acc;
    }, {});

    return bots.reduce((acc, bot) => {
      const botRatings = ratingsByBot[bot.id] || [];
      const reviewCount = botRatings.length;
      const averageRating = reviewCount ? botRatings.reduce((sum, item) => sum + item.rating, 0) / reviewCount : 0;
      const popularityScore = (bot.usage_count || 0) + (reviewCount * 8) + (averageRating * 20);
      const featuredScore = popularityScore + ((bot.level || 1) * 3);
      acc[bot.id] = { reviewCount, averageRating, popularityScore, featuredScore };
      return acc;
    }, {});
  }, [bots, ratings]);

  const featured = useMemo(() => {
    return [...bots]
      .sort((a, b) => (botInsights[b.id]?.featuredScore || 0) - (botInsights[a.id]?.featuredScore || 0))
      .slice(0, embedded ? 3 : 4);
  }, [bots, botInsights, embedded]);

  const marketplaceStats = useMemo(() => {
    const totalReviews = ratings.length;
    const avgRating = totalReviews ? (ratings.reduce((sum, item) => sum + item.rating, 0) / totalReviews).toFixed(1) : '—';
    return { totalReviews, avgRating };
  }, [ratings]);

  const filtered = useMemo(() => {
    const filteredBots = bots.filter((b) => {
      const matchesSearch = !search || b.name.toLowerCase().includes(search.toLowerCase()) || (b.description || '').toLowerCase().includes(search.toLowerCase()) || (b.role || '').includes(search.toLowerCase());
      const matchesCategory = category === 'All' || getCategory(b) === category;
      const matchesIndustry = industry === 'All' || getIndustry(b) === industry;
      return matchesSearch && matchesCategory && matchesIndustry;
    });

    return filteredBots.sort((a, b) => {
      const aInsights = botInsights[a.id] || { reviewCount: 0, averageRating: 0, popularityScore: 0, featuredScore: 0 };
      const bInsights = botInsights[b.id] || { reviewCount: 0, averageRating: 0, popularityScore: 0, featuredScore: 0 };

      if (sortBy === 'popularity') return bInsights.popularityScore - aInsights.popularityScore;
      if (sortBy === 'rating') return bInsights.averageRating - aInsights.averageRating || bInsights.reviewCount - aInsights.reviewCount;
      if (sortBy === 'newestReviews') return bInsights.reviewCount - aInsights.reviewCount;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return bInsights.featuredScore - aInsights.featuredScore;
    });
  }, [bots, search, category, industry, sortBy, botInsights]);

  return (
    <div className="px-4 py-4 space-y-4">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-primary text-primary-foreground text-xs font-semibold px-4 py-2 rounded-xl shadow-lg flex items-center gap-2">
          {toast} <button onClick={() => setToast('')}><X className="w-3 h-3" /></button>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground"><Bot className="h-4 w-4" /><span className="text-xs uppercase">Templates</span></div>
          <p className="mt-2 text-2xl font-semibold">{bots.length}</p>
          <p className="text-xs text-muted-foreground">Public bots available to install</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground"><Globe className="h-4 w-4" /><span className="text-xs uppercase">Published</span></div>
          <p className="mt-2 text-2xl font-semibold">{myBots.filter((bot) => bot.is_public).length}</p>
          <p className="text-xs text-muted-foreground">Your bots live in marketplace</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground"><Star className="h-4 w-4" /><span className="text-xs uppercase">Avg rating</span></div>
          <p className="mt-2 text-2xl font-semibold">{marketplaceStats.avgRating}</p>
          <p className="text-xs text-muted-foreground">Based on all user reviews</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground"><MessageSquare className="h-4 w-4" /><span className="text-xs uppercase">Reviews</span></div>
          <p className="mt-2 text-2xl font-semibold">{marketplaceStats.totalReviews}</p>
          <p className="text-xs text-muted-foreground">Community feedback across bots</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-sm font-medium"><Upload className="h-4 w-4 text-primary" /> Publish your bots</div>
          <p className="text-[11px] text-muted-foreground">Bots marked public are discoverable and can be configured for buy, sell, crypto, Telegram Stars, and open trade offers.</p>
        </div>
        {myBots.length === 0 ? (
          <p className="text-xs text-muted-foreground">Create a bot in AI Lab first, then publish it here.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {myBots.map((bot) => (
              <div key={bot.id} className="rounded-xl border border-border bg-secondary/30 p-3 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{bot.name}</p>
                    <p className="text-[10px] text-muted-foreground">{getCategory(bot)} · {getIndustry(bot)}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium border ${bot.is_public ? 'bg-primary/10 text-primary border-primary/20' : 'bg-secondary text-muted-foreground border-border'}`}>
                    {bot.is_public ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                    {bot.is_public ? 'Public' : 'Private'}
                  </span>
                </div>
                {bot.description && <p className="text-[10px] text-muted-foreground line-clamp-2">{bot.description}</p>}
                <div className="rounded-xl border border-border bg-card/60 p-3 space-y-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <select value={editingBotId === bot.id ? marketForm.marketplace_sale_mode : (bot.marketplace_sale_mode || 'sell_or_trade')} onChange={(e) => setMarketForm((prev) => ({ ...prev, marketplace_sale_mode: e.target.value }))} disabled={editingBotId !== bot.id} className="h-10 rounded-lg border border-border bg-background px-3 text-xs outline-none disabled:opacity-60">
                      <option value="sell">Sell</option>
                      <option value="trade">Trade</option>
                      <option value="sell_or_trade">Sell or trade</option>
                    </select>
                    <div className="grid grid-cols-[1fr,110px] gap-2">
                      <input value={editingBotId === bot.id ? marketForm.marketplace_price : (bot.marketplace_price || '')} onChange={(e) => setMarketForm((prev) => ({ ...prev, marketplace_price: e.target.value }))} disabled={editingBotId !== bot.id} placeholder="Base price" className="h-10 rounded-lg border border-border bg-background px-3 text-xs outline-none disabled:opacity-60" />
                      <select value={editingBotId === bot.id ? marketForm.marketplace_currency : (bot.marketplace_currency || 'USD')} onChange={(e) => setMarketForm((prev) => ({ ...prev, marketplace_currency: e.target.value }))} disabled={editingBotId !== bot.id} className="h-10 rounded-lg border border-border bg-background px-3 text-xs outline-none disabled:opacity-60">
                        {ALL_MARKET_CURRENCIES.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
                      </select>
                    </div>
                  </div>
                  <textarea value={editingBotId === bot.id ? marketForm.marketplace_trade_notes : (bot.marketplace_trade_notes || '')} onChange={(e) => setMarketForm((prev) => ({ ...prev, marketplace_trade_notes: e.target.value }))} disabled={editingBotId !== bot.id} placeholder="Accept bots, money, crypto, Telegram Stars, bundles, services, or any custom trade terms..." className="min-h-[88px] w-full rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none disabled:opacity-60" />
                  <div className="flex flex-wrap gap-2">
                    {[
                      ['marketplace_accepts_trade_offers', 'Bot trades'],
                      ['marketplace_accepts_money_offers', 'Money offers'],
                      ['marketplace_accepts_crypto_offers', 'Crypto offers'],
                      ['marketplace_offer_anything', 'Offer anything'],
                    ].map(([key, label]) => {
                      const checked = editingBotId === bot.id ? marketForm[key] : (bot[key] ?? false);
                      return (
                        <button key={key} type="button" onClick={() => editingBotId === bot.id && setMarketForm((prev) => ({ ...prev, [key]: !prev[key] }))} className={`rounded-full border px-2.5 py-1 text-[10px] font-medium ${checked ? 'border-primary/20 bg-primary/10 text-primary' : 'border-border bg-secondary text-muted-foreground'} ${editingBotId !== bot.id ? 'cursor-default' : ''}`}>
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex gap-2">
                    {editingBotId === bot.id ? (
                      <>
                        <button onClick={() => saveMarketSetup(bot)} className="flex-1 rounded-xl bg-primary py-2 text-xs font-semibold text-primary-foreground">Save shop setup</button>
                        <button onClick={() => setEditingBotId('')} className="rounded-xl border border-border px-3 py-2 text-xs font-semibold text-muted-foreground">Cancel</button>
                      </>
                    ) : (
                      <button onClick={() => startEditing(bot)} className="flex-1 rounded-xl border border-border bg-background py-2 text-xs font-semibold text-foreground">Edit buy/sell/trade</button>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => togglePublish(bot)}
                  className={`w-full rounded-xl py-2 text-xs font-semibold ${bot.is_public ? 'bg-secondary border border-border text-muted-foreground' : 'bg-primary text-primary-foreground'}`}
                >
                  {bot.is_public ? 'Unpublish from marketplace' : 'Publish to marketplace'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium"><Sparkles className="h-4 w-4 text-primary" /> Featured bots</div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {featured.map((bot) => {
            const insights = botInsights[bot.id] || { reviewCount: 0, averageRating: 0, popularityScore: 0 };
            const avg = insights.reviewCount ? insights.averageRating.toFixed(1) : 'New';
            return (
              <div key={bot.id} className="rounded-xl border border-border bg-secondary/40 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{bot.name}</p>
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-semibold text-primary">Featured</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{getIndustry(bot)}</p>
                  </div>
                  <span className="text-xl">{ROLE_EMOJI[bot.role] || '🤖'}</span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Star className="h-3 w-3 fill-yellow-400 text-yellow-400" /> {avg}</span>
                  <span className="inline-flex items-center gap-1"><TrendingUp className="h-3 w-3" /> {bot.usage_count || 0} uses</span>
                  <span>{getCategory(bot)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr),180px,180px,180px]">
          <div className="flex items-center gap-2 bg-secondary border border-border rounded-xl px-3 py-2">
            <Search className="w-3.5 h-3.5 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search bots, use cases, or roles…"
              className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground" />
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-border bg-secondary px-3 py-2">
            <Blocks className="h-3.5 w-3.5 text-muted-foreground" />
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-transparent text-xs outline-none">
              {CATEGORY_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-border bg-secondary px-3 py-2">
            <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
            <select value={industry} onChange={(e) => setIndustry(e.target.value)} className="w-full bg-transparent text-xs outline-none">
              {INDUSTRY_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-border bg-secondary px-3 py-2">
            <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-full bg-transparent text-xs outline-none">
              {SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
          </div>

        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">{filtered.length} bots matched · sorted by {SORT_OPTIONS.find((option) => option.value === sortBy)?.label.toLowerCase()}</p>
          <p className="text-[10px] text-muted-foreground/60">Install copies the bot into your workspace so you can customize it.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm">No public bots match your filters</p>
          <p className="text-xs mt-1">Publish your bots above to share them with the marketplace</p>
        </div>
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {filtered.map(bot => <BotCard key={bot.id} bot={bot} ratings={ratings} onInstall={install} onRate={rate} onBuy={buyBot} onTrade={setTradeBot} />)}
        </div>
      )}

      {tradeBot && (
        <BotMarketplaceTradeSheet
          bot={tradeBot}
          myBots={myBots}
          currentUser={currentUser}
          onClose={() => setTradeBot(null)}
          onSubmitted={() => {
            setToast(`🤝 Offer sent for "${tradeBot.name}".`);
            setTimeout(() => setToast(''), 3000);
            load();
          }}
        />
      )}
    </div>
  );
}