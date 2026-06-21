import { useEffect, useMemo, useState } from 'react';
import { Star, Download, MessageSquare, Search, Send, X, Filter, Tag, Bot, Sparkles, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { base44 } from '@/eru/api/base44Client';
import { useAuth } from '@/eru/lib/AuthContext';

const ROLE_EMOJI = { assistant: '🤖', trader: '📈', game_helper: '🎮', social: '💬', custom: '⚙️' };
const CATEGORY_LABELS = ['All', 'Assistant', 'Trading', 'Gaming', 'Social', 'Custom'];
const INDUSTRY_OPTIONS = ['All', 'General', 'Finance', 'Gaming', 'Ecommerce', 'Education', 'Marketing', 'Support'];

function mapRoleToCategory(role) {
  if (role === 'trader') return 'Trading';
  if (role === 'game_helper') return 'Gaming';
  if (role === 'social') return 'Social';
  if (role === 'custom') return 'Custom';
  return 'Assistant';
}

function detectIndustry(bot) {
  const haystack = `${bot.name || ''} ${bot.description || ''} ${bot.instructions || ''}`.toLowerCase();
  if (haystack.includes('trade') || haystack.includes('market') || haystack.includes('crypto') || haystack.includes('finance')) return 'Finance';
  if (haystack.includes('game') || haystack.includes('player') || haystack.includes('quest')) return 'Gaming';
  if (haystack.includes('shop') || haystack.includes('store') || haystack.includes('product') || haystack.includes('ecommerce')) return 'Ecommerce';
  if (haystack.includes('learn') || haystack.includes('teach') || haystack.includes('course') || haystack.includes('education')) return 'Education';
  if (haystack.includes('marketing') || haystack.includes('campaign') || haystack.includes('copy')) return 'Marketing';
  if (haystack.includes('support') || haystack.includes('helpdesk') || haystack.includes('customer')) return 'Support';
  return 'General';
}

function StarRow({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <button key={s} onClick={() => onChange?.(s)}>
          <Star className={`w-4 h-4 ${s <= value ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
        </button>
      ))}
    </div>
  );
}

function BotMarketplaceCard({ bot, ratings, onInstall, onRate }) {
  const [showComments, setShowComments] = useState(false);
  const [comment, setComment] = useState('');
  const [myRating, setMyRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const botRatings = ratings.filter((r) => r.bot_id === bot.id);
  const avg = botRatings.length ? (botRatings.reduce((s, r) => s + r.rating, 0) / botRatings.length).toFixed(1) : '—';
  const category = mapRoleToCategory(bot.role);
  const industry = detectIndustry(bot);

  const submitRating = async () => {
    if (!myRating) return;
    setSubmitting(true);
    await onRate(bot, myRating, comment);
    setComment('');
    setMyRating(0);
    setSubmitting(false);
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-xl flex-shrink-0">
          {ROLE_EMOJI[bot.role] || '🤖'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold">{bot.name}</p>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">{category}</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border">{industry}</span>
          </div>
          <p className="text-[10px] text-muted-foreground capitalize">by {bot.created_by?.split('@')[0]} · {bot.response_style || 'balanced'}</p>
          <div className="flex items-center gap-1 mt-1">
            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
            <span className="text-xs font-medium text-yellow-400">{avg}</span>
            <span className="text-[9px] text-muted-foreground">({botRatings.length} reviews)</span>
          </div>
        </div>
        <button
          onClick={() => onInstall(bot)}
          className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-xl text-xs font-semibold flex-shrink-0"
        >
          <Download className="w-3 h-3" /> Install
        </button>
      </div>

      {bot.description && <p className="text-xs text-muted-foreground leading-relaxed">{bot.description}</p>}
      {bot.personality && <p className="text-[10px] text-foreground/60 italic">“{bot.personality}”</p>}

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-secondary/60 border border-border p-2">
          <p className="text-[9px] text-muted-foreground uppercase">Uses</p>
          <p className="text-sm font-semibold mt-1">{bot.usage_count || 0}</p>
        </div>
        <div className="rounded-xl bg-secondary/60 border border-border p-2">
          <p className="text-[9px] text-muted-foreground uppercase">Level</p>
          <p className="text-sm font-semibold mt-1">{bot.level || 1}</p>
        </div>
        <div className="rounded-xl bg-secondary/60 border border-border p-2">
          <p className="text-[9px] text-muted-foreground uppercase">Memory</p>
          <p className="text-sm font-semibold mt-1">{bot.memory_enabled ? 'On' : 'Off'}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1 border-t border-border/50">
        <button
          onClick={() => setShowComments((c) => !c)}
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
        >
          <MessageSquare className="w-3 h-3" /> View reviews
        </button>
      </div>

      {showComments && (
        <div className="space-y-2 border-t border-border/50 pt-2">
          {botRatings.slice(0, 5).map((r) => (
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
              <input
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Optional comment…"
                className="flex-1 bg-background border border-border rounded-lg px-2 py-1.5 text-[10px] outline-none"
              />
              <button onClick={submitRating} disabled={!myRating || submitting} className="p-1.5 bg-primary text-primary-foreground rounded-lg disabled:opacity-40">
                <Send className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BotMarketplace({ onInstalled, compact = false, showPageLink = false }) {
  const { currentUser } = useAuth();
  const [bots, setBots] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [industry, setIndustry] = useState('All');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  const load = async () => {
    setLoading(true);
    const [b, r] = await Promise.all([
      base44.entities.UserBot.filter({ is_public: true }, '-usage_count', 100),
      base44.entities.BotRating.list('-created_date', 300),
    ]);
    setBots(b || []);
    setRatings(r || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const install = async (bot) => {
    await base44.entities.UserBot.create({
      name: `${bot.name} (Clone)`,
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
    setToast(`✅ "${bot.name}" cloned to your AI Lab!`);
    setTimeout(() => setToast(''), 3000);
    onInstalled?.();
  };

  const rate = async (bot, rating, comment) => {
    await base44.entities.BotRating.create({
      bot_id: bot.id,
      bot_name: bot.name,
      rating,
      comment,
      user_email: currentUser?.email,
    });
    load();
  };

  const filtered = useMemo(() => {
    return bots.filter((bot) => {
      const matchesSearch = !search || [bot.name, bot.description, bot.role, bot.instructions].filter(Boolean).join(' ').toLowerCase().includes(search.toLowerCase());
      const matchesCategory = category === 'All' || mapRoleToCategory(bot.role) === category;
      const matchesIndustry = industry === 'All' || detectIndustry(bot) === industry;
      return matchesSearch && matchesCategory && matchesIndustry;
    }).sort((a, b) => {
      const aRatings = ratings.filter((item) => item.bot_id === a.id);
      const bRatings = ratings.filter((item) => item.bot_id === b.id);
      const aScore = (a.usage_count || 0) + aRatings.length * 5;
      const bScore = (b.usage_count || 0) + bRatings.length * 5;
      return bScore - aScore;
    });
  }, [bots, search, category, industry, ratings]);

  return (
    <div className="px-4 py-4 space-y-4">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-primary text-primary-foreground text-xs font-semibold px-4 py-2 rounded-xl shadow-lg flex items-center gap-2">
          {toast} <button onClick={() => setToast('')}><X className="w-3 h-3" /></button>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <div className="grid gap-3 md:grid-cols-[1.3fr,0.7fr] md:items-start">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Bot className="w-4 h-4 text-primary" />
                <p className="text-sm font-semibold">Bot Marketplace</p>
              </div>
              <p className="text-xs text-muted-foreground">Discover, install, rate, review, and share pre-built AI bots by category and industry.</p>
            </div>
            {showPageLink && (
              <Link to="/bot-marketplace" className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-medium">
                <Sparkles className="w-3.5 h-3.5" /> Open full marketplace
              </Link>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-border bg-secondary/40 p-3 text-center">
              <p className="text-[10px] text-muted-foreground">Public bots</p>
              <p className="mt-1 text-lg font-semibold text-foreground">{bots.length}</p>
            </div>
            <div className="rounded-xl border border-border bg-secondary/40 p-3 text-center">
              <p className="text-[10px] text-muted-foreground">Reviews</p>
              <p className="mt-1 text-lg font-semibold text-foreground">{ratings.length}</p>
            </div>
            <div className="rounded-xl border border-border bg-secondary/40 p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground"><TrendingUp className="w-3.5 h-3.5" /><p className="text-[10px]">Trending</p></div>
              <p className="mt-1 text-lg font-semibold text-foreground">{filtered.slice(0, 3).length}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-secondary border border-border rounded-xl px-3 py-2">
          <Search className="w-3.5 h-3.5 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search bots, flows, roles, or use cases…" className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div className="flex items-center gap-2 overflow-x-auto">
            <Filter className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            {CATEGORY_LABELS.map((item) => (
              <button key={item} onClick={() => setCategory(item)} className={`px-3 py-1.5 rounded-full text-[10px] font-medium whitespace-nowrap border ${category === item ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary text-muted-foreground border-border'}`}>
                {item}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 overflow-x-auto">
            <Tag className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            {INDUSTRY_OPTIONS.map((item) => (
              <button key={item} onClick={() => setIndustry(item)} className={`px-3 py-1.5 rounded-full text-[10px] font-medium whitespace-nowrap border ${industry === item ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary text-muted-foreground border-border'}`}>
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <p>{filtered.length} bots found</p>
          <p>Install clones a template into your workspace</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm">No marketplace bots match your filters</p>
          <p className="text-xs mt-1">Mark your bots as public in AI Lab to share them here</p>
        </div>
      ) : (
        <div className={compact ? 'space-y-3' : 'grid grid-cols-1 xl:grid-cols-2 gap-4'}>
          {filtered.map((bot) => (
            <BotMarketplaceCard key={bot.id} bot={bot} ratings={ratings} onInstall={install} onRate={rate} />
          ))}
        </div>
      )}
    </div>
  );
}