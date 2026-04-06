import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { JADE_STORE_PACKS, getFeaturedPacks, getPacksByCategory, sortByScore } from '@/game/jadeStoreData';
import { JADE_RARITY_CONFIG, CATEGORY_META, type JadePack, type JadeStoreCategory, type JadeRarity } from '@/game/jadeTypes';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, Star, TrendingUp, Clock, Crown, Sparkles, ShieldCheck, ChevronRight } from 'lucide-react';

// ── Rarity border/glow styles ──
function rarityStyle(rarity: JadeRarity) {
  const cfg = JADE_RARITY_CONFIG[rarity];
  return {
    boxShadow: cfg.glow,
    borderColor: cfg.color,
  };
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
    </div>
  );
}

// ── Pack Card ──
function PackCard({ pack, onSelect }: { pack: JadePack; onSelect: (p: JadePack) => void }) {
  const cfg = JADE_RARITY_CONFIG[pack.rarity];

  return (
    <motion.button
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(pack)}
      className="relative flex flex-col rounded-xl border-2 p-3 text-left transition-all duration-200 overflow-hidden group"
      style={rarityStyle(pack.rarity)}
    >
      {/* Glow overlay */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        style={{ background: `radial-gradient(circle at 50% 0%, ${cfg.color}20, transparent 70%)` }}
      />

      {/* Badges */}
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

      {/* Rarity */}
      <div className="mb-2">
        <RarityBadge rarity={pack.rarity} />
      </div>

      {/* Quick rewards preview */}
      <div className="flex flex-wrap gap-1 mb-2 flex-1">
        {pack.coreRewards.slice(0, 3).map((r, i) => (
          <span key={i} className="text-[10px] text-muted-foreground bg-muted/40 rounded px-1.5 py-0.5">
            {r.icon} {r.quantity}x {r.name.length > 15 ? r.name.slice(0, 15) + '…' : r.name}
          </span>
        ))}
        {pack.coreRewards.length > 3 && (
          <span className="text-[10px] text-muted-foreground">+{pack.coreRewards.length - 3} more</span>
        )}
      </div>

      {/* Price */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <span className="text-sm font-bold text-foreground">{pack.priceGold.toLocaleString()}</span>
          <span className="text-[10px] text-muted-foreground">gold</span>
        </div>
        {pack.priceUsd && (
          <span className="text-[10px] font-semibold text-primary">${pack.priceUsd}</span>
        )}
      </div>
    </motion.button>
  );
}

// ── Pack Detail Modal ──
function PackModal({ pack, onClose }: { pack: JadePack; onClose: () => void }) {
  const cfg = JADE_RARITY_CONFIG[pack.rarity];

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
        className="bg-card border-2 rounded-2xl max-w-md w-full max-h-[80vh] overflow-y-auto shadow-2xl"
        style={{ borderColor: cfg.color, boxShadow: `${cfg.glow}, 0 25px 50px -12px rgb(0 0 0 / 0.5)` }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative p-5 border-b border-border/50">
          <div
            className="absolute inset-0 opacity-20 pointer-events-none"
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
              <div className="mt-1 flex items-center gap-2">
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
              <div className="rounded-lg bg-muted/30 p-2 text-center col-span-2">
                <p className="text-[10px] text-muted-foreground uppercase">Purchase Limit</p>
                <p className="text-sm font-bold text-foreground">{pack.purchaseLimit}× per account</p>
              </div>
            )}
          </div>

          {/* Buy */}
          <div className="mt-5 flex items-center gap-3">
            <Button className="flex-1 h-12 text-base font-bold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70">
              <Crown className="w-4 h-4 mr-2" />
              {pack.priceGold.toLocaleString()} Gold
            </Button>
            {pack.priceUsd && (
              <Button variant="outline" className="h-12 px-4 text-sm font-semibold border-primary/40 text-primary">
                ${pack.priceUsd}
              </Button>
            )}
          </div>

          {/* Fairness notice */}
          <div className="mt-3 flex items-start gap-2 text-[10px] text-muted-foreground">
            <ShieldCheck className="w-3 h-3 mt-0.5 shrink-0" />
            <span>All odds and rarity tiers are transparently displayed. Pity progress carries across purchases. See Terms for full details.</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Featured Hero Banner ──
function HeroBanner({ packs, onSelect }: { packs: JadePack[]; onSelect: (p: JadePack) => void }) {
  const [idx, setIdx] = useState(0);
  const featured = packs.slice(0, 3);
  const current = featured[idx];
  if (!current) return null;
  const cfg = JADE_RARITY_CONFIG[current.rarity];

  return (
    <div className="relative rounded-2xl overflow-hidden border-2 mb-6" style={{ borderColor: cfg.color, boxShadow: cfg.glow }}>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: `linear-gradient(135deg, ${cfg.color}25, transparent 60%, ${cfg.color}10)` }}
      />
      <div className="relative z-10 p-6 flex items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <RarityBadge rarity={current.rarity} />
            <PackBadges pack={current} />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-1">{current.icon} {current.name}</h2>
          <p className="text-sm text-muted-foreground italic mb-3">{current.subtitle}</p>
          {current.emotionalHook && (
            <p className="text-xs text-primary/80 italic mb-3">"{current.emotionalHook}"</p>
          )}
          <Button onClick={() => onSelect(current)} className="bg-gradient-to-r from-primary to-primary/80">
            View Details <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
        <div className="text-6xl">{current.icon}</div>
      </div>
      {/* Dots */}
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

// ── Category Section ──
const CATEGORIES = Object.keys(CATEGORY_META) as JadeStoreCategory[];

export default function JadeStorePage() {
  const [selectedPack, setSelectedPack] = useState<JadePack | null>(null);
  const [activeCategory, setActiveCategory] = useState<JadeStoreCategory | 'featured' | 'all'>('featured');
  const [sortBy, setSortBy] = useState<'default' | 'price_low' | 'price_high' | 'attractiveness' | 'prestige'>('default');

  const featured = useMemo(() => getFeaturedPacks(), []);

  const displayPacks = useMemo(() => {
    let packs: JadePack[];
    if (activeCategory === 'featured') {
      packs = featured;
    } else if (activeCategory === 'all') {
      packs = JADE_STORE_PACKS;
    } else {
      packs = getPacksByCategory(activeCategory);
    }

    switch (sortBy) {
      case 'price_low': return [...packs].sort((a, b) => a.priceGold - b.priceGold);
      case 'price_high': return [...packs].sort((a, b) => b.priceGold - a.priceGold);
      case 'attractiveness': return sortByScore(packs, 'overall_attractiveness');
      case 'prestige': return sortByScore(packs, 'prestige_strength');
      default: return packs;
    }
  }, [activeCategory, sortBy, featured]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            🏛️ <span className="bg-gradient-to-r from-emerald-400 to-amber-400 bg-clip-text text-transparent">Royal Jade Vault</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Sacred jade. Reserve-grade material. Lineage-bound prestige.</p>
        </div>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as typeof sortBy)}
          className="text-xs bg-muted/50 border border-border rounded-lg px-2 py-1.5 text-foreground"
        >
          <option value="default">Default</option>
          <option value="price_low">Price: Low → High</option>
          <option value="price_high">Price: High → Low</option>
          <option value="attractiveness">Most Attractive</option>
          <option value="prestige">Most Prestige</option>
        </select>
      </div>

      {/* Category nav */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setActiveCategory('featured')}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
            activeCategory === 'featured' ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted'
          }`}
        >
          ⭐ Featured
        </button>
        <button
          onClick={() => setActiveCategory('all')}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
            activeCategory === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted'
          }`}
        >
          📦 All ({JADE_STORE_PACKS.length})
        </button>
        {CATEGORIES.map(cat => {
          const meta = CATEGORY_META[cat];
          const count = getPacksByCategory(cat).length;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                activeCategory === cat ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              }`}
            >
              {meta.icon} {meta.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Hero banner for featured */}
      {activeCategory === 'featured' && <HeroBanner packs={featured} onSelect={setSelectedPack} />}

      {/* Category description */}
      {activeCategory !== 'featured' && activeCategory !== 'all' && (
        <div className="rounded-xl bg-muted/20 border border-border/30 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="text-lg">{CATEGORY_META[activeCategory].icon}</span>
            <div>
              <h2 className="text-sm font-bold text-foreground">{CATEGORY_META[activeCategory].label}</h2>
              <p className="text-[10px] text-muted-foreground">{CATEGORY_META[activeCategory].description}</p>
            </div>
          </div>
        </div>
      )}

      {/* Pack grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {displayPacks.map(pack => (
          <PackCard key={pack.id} pack={pack} onSelect={setSelectedPack} />
        ))}
      </div>

      {displayPacks.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm">No packs in this category yet.</div>
      )}

      {/* Pack detail modal */}
      <AnimatePresence>
        {selectedPack && <PackModal pack={selectedPack} onClose={() => setSelectedPack(null)} />}
      </AnimatePresence>

      {/* Fairness footer */}
      <div className="border-t border-border/30 pt-4 mt-6">
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
