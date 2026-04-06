import { useState, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { JADE_STORE_PACKS, sortByScore } from '@/game/jadeStoreData';
import { JADE_RARITY_CONFIG, CATEGORY_META, type JadePack, type JadeStoreCategory, type JadePackScores } from '@/game/jadeTypes';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Pin, PinOff, Copy, Download, Upload, Search, SlidersHorizontal,
  GripVertical, Star, TrendingUp, Crown, Sparkles, BarChart3, X,
  Eye, EyeOff, FlaskConical, Check, ChevronDown, ChevronUp, Filter
} from 'lucide-react';
import { toast } from 'sonner';

// ── Types ──
interface ABVariant {
  id: string;
  field: 'name' | 'subtitle' | 'priceDiamonds' | 'emotionalHook';
  original: string;
  variant: string;
  active: boolean;
}

interface AdminPackState {
  pinned: boolean;
  hidden: boolean;
  abVariants: ABVariant[];
  notes: string;
  customOrder: number;
}

type SortMode = 'custom' | 'price_asc' | 'price_desc' | 'overall' | 'margin' | 'whale' | 'beginner' | 'prestige' | 'retention';

// ── Score Bar ──
function MiniScore({ label, value }: { label: string; value: number }) {
  const color = value >= 8 ? 'text-emerald-400' : value >= 5 ? 'text-amber-400' : 'text-red-400';
  return (
    <span className={`text-[9px] font-bold ${color}`} title={label}>{value}</span>
  );
}

// ── A/B Test Editor ──
function ABTestPanel({ pack, variants, onChange }: {
  pack: JadePack;
  variants: ABVariant[];
  onChange: (variants: ABVariant[]) => void;
}) {
  const fields: { key: ABVariant['field']; label: string }[] = [
    { key: 'name', label: 'Name' },
    { key: 'subtitle', label: 'Subtitle' },
    { key: 'priceDiamonds', label: 'Price (💎)' },
    { key: 'emotionalHook', label: 'Hook' },
  ];

  const addVariant = (field: ABVariant['field']) => {
    const original = String(pack[field] ?? '');
    onChange([...variants, {
      id: `${field}-${Date.now()}`,
      field,
      original,
      variant: original,
      active: false,
    }]);
  };

  const updateVariant = (id: string, update: Partial<ABVariant>) => {
    onChange(variants.map(v => v.id === id ? { ...v, ...update } : v));
  };

  const removeVariant = (id: string) => {
    onChange(variants.filter(v => v.id !== id));
  };

  return (
    <div className="space-y-2 p-3 rounded-lg bg-muted/10 border border-border/30">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
        <FlaskConical className="w-3 h-3" /> A/B Test Variants
      </p>
      {variants.map(v => (
        <div key={v.id} className="flex items-center gap-2">
          <span className="text-[9px] text-muted-foreground w-12 shrink-0">{v.field}</span>
          <Input
            value={v.variant}
            onChange={e => updateVariant(v.id, { variant: e.target.value })}
            className="h-6 text-[10px] flex-1"
          />
          <button
            onClick={() => updateVariant(v.id, { active: !v.active })}
            className={`p-1 rounded ${v.active ? 'bg-emerald-600 text-white' : 'bg-muted/50 text-muted-foreground'}`}
            title={v.active ? 'Active' : 'Inactive'}
          >
            {v.active ? <Check className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          </button>
          <button onClick={() => removeVariant(v.id)} className="text-red-400 hover:text-red-300">
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
      <div className="flex gap-1 flex-wrap">
        {fields.map(f => (
          <button
            key={f.key}
            onClick={() => addVariant(f.key)}
            className="text-[9px] px-2 py-0.5 rounded bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          >
            + {f.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Admin Pack Row ──
function AdminPackRow({ pack, adminState, onUpdate, onDuplicate, expanded, onToggleExpand }: {
  pack: JadePack;
  adminState: AdminPackState;
  onUpdate: (update: Partial<AdminPackState>) => void;
  onDuplicate: () => void;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  const cfg = JADE_RARITY_CONFIG[pack.rarity];
  const catMeta = CATEGORY_META[pack.category];

  return (
    <Reorder.Item
      value={pack.id}
      className="touch-manipulation"
    >
      <div
        className={`rounded-xl border transition-all ${adminState.pinned ? 'border-primary/60 bg-primary/5' : 'border-border/30 bg-card/50'} ${adminState.hidden ? 'opacity-40' : ''}`}
      >
        {/* Compact row */}
        <div className="flex items-center gap-2 p-2.5">
          <GripVertical className="w-4 h-4 text-muted-foreground/40 shrink-0 cursor-grab active:cursor-grabbing" />

          {/* Icon + Name */}
          <button onClick={onToggleExpand} className="flex-1 flex items-center gap-2 text-left min-w-0">
            <span className="text-lg shrink-0">{pack.icon}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-foreground truncate">{pack.name}</span>
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: cfg.color }}
                  title={cfg.label}
                />
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-[9px] text-muted-foreground">{catMeta.icon} {pack.priceTier}</span>
                <span className="text-[9px] font-semibold text-foreground">{pack.priceDiamonds.toLocaleString()}💎</span>
              </div>
            </div>
          </button>

          {/* Scores mini row */}
          <div className="hidden sm:flex items-center gap-1">
            <MiniScore label="Overall" value={pack.scores.overall_attractiveness} />
            <MiniScore label="Margin" value={pack.scores.real_margin} />
            <MiniScore label="Whale" value={pack.scores.whale_appeal} />
          </div>

          {/* Badges */}
          <div className="flex items-center gap-0.5 shrink-0">
            {pack.bestValue && <span className="text-[8px] px-1 py-0.5 rounded bg-emerald-600/20 text-emerald-400">BV</span>}
            {pack.mostPopular && <span className="text-[8px] px-1 py-0.5 rounded bg-amber-600/20 text-amber-400">MP</span>}
            {pack.isLimited && <span className="text-[8px] px-1 py-0.5 rounded bg-red-600/20 text-red-400">LT</span>}
            {pack.isNew && <span className="text-[8px] px-1 py-0.5 rounded bg-cyan-600/20 text-cyan-400">N</span>}
            {adminState.abVariants.some(v => v.active) && <span className="text-[8px] px-1 py-0.5 rounded bg-purple-600/20 text-purple-400">AB</span>}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => onUpdate({ pinned: !adminState.pinned })}
              className={`p-1.5 rounded-lg transition-all ${adminState.pinned ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'}`}
              title={adminState.pinned ? 'Unpin' : 'Pin'}
            >
              {adminState.pinned ? <Pin className="w-3.5 h-3.5" /> : <PinOff className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => onUpdate({ hidden: !adminState.hidden })}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground"
              title={adminState.hidden ? 'Show' : 'Hide'}
            >
              {adminState.hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
            <button onClick={onDuplicate} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground" title="Duplicate">
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button onClick={onToggleExpand} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground">
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Expanded detail */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="px-3 pb-3 space-y-2 border-t border-border/20 pt-2">
                {/* Score grid */}
                <div className="grid grid-cols-5 gap-1">
                  {(Object.entries(pack.scores) as [keyof JadePackScores, number][]).map(([key, val]) => {
                    const labels: Record<string, string> = {
                      visual_desirability: 'Visual', perceived_value: 'Value', real_margin: 'Margin',
                      beginner_friendliness: 'Beginner', collector_appeal: 'Collector', whale_appeal: 'Whale',
                      urgency_strength: 'Urgency', prestige_strength: 'Prestige', retention_contribution: 'Retention',
                      overall_attractiveness: 'Overall'
                    };
                    const color = val >= 8 ? 'bg-emerald-600/20 text-emerald-400' : val >= 5 ? 'bg-amber-600/20 text-amber-400' : 'bg-red-600/20 text-red-400';
                    return (
                      <div key={key} className={`text-center rounded p-1 ${color}`}>
                        <p className="text-[8px] leading-tight">{labels[key] || key}</p>
                        <p className="text-[11px] font-bold">{val}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Rewards summary */}
                <div className="text-[10px] text-muted-foreground">
                  <strong>{pack.coreRewards.length}</strong> rewards · 
                  <strong> {pack.coreRewards.filter(r => r.guaranteed).length}</strong> guaranteed · 
                  Pity +{pack.pityContribution} · {pack.rotationType}
                  {pack.purchaseLimit && ` · Limit ${pack.purchaseLimit}×`}
                </div>

                {/* Admin notes */}
                <Input
                  placeholder="Admin notes..."
                  value={adminState.notes}
                  onChange={e => onUpdate({ notes: e.target.value })}
                  className="h-7 text-[10px]"
                />

                {/* A/B Testing */}
                <ABTestPanel
                  pack={pack}
                  variants={adminState.abVariants}
                  onChange={abVariants => onUpdate({ abVariants })}
                />

                {pack.adminNotes && (
                  <p className="text-[9px] text-muted-foreground/60 italic border-l-2 border-border/30 pl-2">{pack.adminNotes}</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Reorder.Item>
  );
}

// ── Main Admin Dashboard ──
export default function JadeAdminPage() {
  const [adminStates, setAdminStates] = useState<Record<string, AdminPackState>>(() => {
    const saved = localStorage.getItem('jade_admin_states');
    if (saved) try { return JSON.parse(saved); } catch {}
    return {};
  });
  const [orderedIds, setOrderedIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('jade_admin_order');
    if (saved) try { return JSON.parse(saved); } catch {}
    return JADE_STORE_PACKS.map(p => p.id);
  });
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<JadeStoreCategory | 'all'>('all');
  const [sortMode, setSortMode] = useState<SortMode>('custom');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getAdminState = useCallback((id: string): AdminPackState => {
    return adminStates[id] || { pinned: false, hidden: false, abVariants: [], notes: '', customOrder: 0 };
  }, [adminStates]);

  const updateAdminState = useCallback((id: string, update: Partial<AdminPackState>) => {
    setAdminStates(prev => {
      const next = { ...prev, [id]: { ...getAdminState(id), ...update } };
      localStorage.setItem('jade_admin_states', JSON.stringify(next));
      return next;
    });
  }, [getAdminState]);

  const packMap = useMemo(() => {
    const m = new Map<string, JadePack>();
    JADE_STORE_PACKS.forEach(p => m.set(p.id, p));
    return m;
  }, []);

  const displayPacks = useMemo(() => {
    let packs = JADE_STORE_PACKS.filter(p => {
      if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        return p.name.toLowerCase().includes(s) || p.id.includes(s) || p.category.includes(s) || p.priceTier.includes(s);
      }
      return true;
    });

    if (sortMode === 'custom') {
      // Pinned first, then custom order
      const orderMap = new Map(orderedIds.map((id, i) => [id, i]));
      packs.sort((a, b) => {
        const aPin = getAdminState(a.id).pinned ? 0 : 1;
        const bPin = getAdminState(b.id).pinned ? 0 : 1;
        if (aPin !== bPin) return aPin - bPin;
        return (orderMap.get(a.id) ?? 999) - (orderMap.get(b.id) ?? 999);
      });
    } else if (sortMode === 'price_asc') {
      packs = [...packs].sort((a, b) => a.priceDiamonds - b.priceDiamonds);
    } else if (sortMode === 'price_desc') {
      packs = [...packs].sort((a, b) => b.priceDiamonds - a.priceDiamonds);
    } else {
      const scoreMap: Record<string, keyof JadePackScores> = {
        overall: 'overall_attractiveness', margin: 'real_margin',
        whale: 'whale_appeal', beginner: 'beginner_friendliness',
        prestige: 'prestige_strength', retention: 'retention_contribution',
      };
      const key = scoreMap[sortMode];
      if (key) packs = sortByScore(packs, key);
    }

    return packs;
  }, [search, categoryFilter, sortMode, orderedIds, getAdminState]);

  const handleReorder = useCallback((newOrder: string[]) => {
    setOrderedIds(newOrder);
    localStorage.setItem('jade_admin_order', JSON.stringify(newOrder));
  }, []);

  const handleDuplicate = useCallback((pack: JadePack) => {
    toast.info(`Pack "${pack.name}" marked for duplication`, {
      description: 'Edit the cloned variant in A/B testing',
    });
    updateAdminState(pack.id, {
      abVariants: [
        ...getAdminState(pack.id).abVariants,
        { id: `dup-${Date.now()}`, field: 'name', original: pack.name, variant: `${pack.name} (v2)`, active: false },
      ]
    });
  }, [getAdminState, updateAdminState]);

  // Export/Import
  const handleExport = useCallback(() => {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      adminStates,
      orderedIds,
      packCount: JADE_STORE_PACKS.length,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jade-admin-catalog-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Catalog exported');
  }, [adminStates, orderedIds]);

  const handleImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (data.version !== 1) throw new Error('Unsupported format');
        if (data.adminStates) {
          setAdminStates(data.adminStates);
          localStorage.setItem('jade_admin_states', JSON.stringify(data.adminStates));
        }
        if (data.orderedIds) {
          setOrderedIds(data.orderedIds);
          localStorage.setItem('jade_admin_order', JSON.stringify(data.orderedIds));
        }
        toast.success(`Imported catalog (${data.packCount ?? '?'} packs)`);
      } catch (err) {
        toast.error('Import failed — invalid file format');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }, []);

  // Stats
  const stats = useMemo(() => {
    const pinned = Object.values(adminStates).filter(s => s.pinned).length;
    const hidden = Object.values(adminStates).filter(s => s.hidden).length;
    const abActive = Object.values(adminStates).filter(s => s.abVariants.some(v => v.active)).length;
    return { pinned, hidden, abActive, total: JADE_STORE_PACKS.length };
  }, [adminStates]);

  const CATEGORIES = Object.keys(CATEGORY_META) as JadeStoreCategory[];

  return (
    <div className="space-y-3 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-primary" />
            <span className="bg-gradient-to-r from-primary to-amber-400 bg-clip-text text-transparent">Admin Curation</span>
          </h1>
          <p className="text-[10px] text-muted-foreground">
            {stats.total} packs · {stats.pinned} pinned · {stats.hidden} hidden · {stats.abActive} A/B active
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={handleExport}>
            <Download className="w-3 h-3" /> Export
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-3 h-3" /> Import
          </Button>
          <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
        </div>
      </div>

      {/* Search + Filters */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search packs..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>
          <select
            value={sortMode}
            onChange={e => setSortMode(e.target.value as SortMode)}
            className="h-8 text-[10px] bg-muted/50 border border-border rounded-lg px-2 text-foreground shrink-0"
          >
            <option value="custom">📌 Custom Order</option>
            <option value="price_asc">💰 Price ↑</option>
            <option value="price_desc">💰 Price ↓</option>
            <option value="overall">⭐ Overall</option>
            <option value="margin">📈 Margin</option>
            <option value="whale">🐋 Whale</option>
            <option value="beginner">🌱 Beginner</option>
            <option value="prestige">👑 Prestige</option>
            <option value="retention">🔄 Retention</option>
          </select>
        </div>

        <div className="flex gap-1 overflow-x-auto scrollbar-none pb-1">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all ${
              categoryFilter === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted/40 text-muted-foreground hover:bg-muted'
            }`}
          >
            All ({stats.total})
          </button>
          {CATEGORIES.map(cat => {
            const meta = CATEGORY_META[cat];
            return (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all ${
                  categoryFilter === cat ? 'bg-primary text-primary-foreground' : 'bg-muted/40 text-muted-foreground hover:bg-muted'
                }`}
              >
                {meta.icon} {meta.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Pack list */}
      <p className="text-[10px] text-muted-foreground">{displayPacks.length} packs shown</p>

      <Reorder.Group
        axis="y"
        values={displayPacks.map(p => p.id)}
        onReorder={handleReorder}
        className="space-y-2"
      >
        {displayPacks.map(pack => (
          <AdminPackRow
            key={pack.id}
            pack={pack}
            adminState={getAdminState(pack.id)}
            onUpdate={update => updateAdminState(pack.id, update)}
            onDuplicate={() => handleDuplicate(pack)}
            expanded={expandedId === pack.id}
            onToggleExpand={() => setExpandedId(expandedId === pack.id ? null : pack.id)}
          />
        ))}
      </Reorder.Group>

      {displayPacks.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm">No packs match these filters.</div>
      )}

      {/* Shortlists */}
      <div className="border-t border-border/30 pt-4 mt-6 space-y-3">
        <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
          <BarChart3 className="w-4 h-4 text-primary" /> Quick Shortlists
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[
            { label: '⭐ Top Overall', key: 'overall_attractiveness' as keyof JadePackScores },
            { label: '📈 Top Margin', key: 'real_margin' as keyof JadePackScores },
            { label: '🐋 Whale Appeal', key: 'whale_appeal' as keyof JadePackScores },
            { label: '🌱 Beginner Best', key: 'beginner_friendliness' as keyof JadePackScores },
            { label: '👑 Most Prestige', key: 'prestige_strength' as keyof JadePackScores },
            { label: '🔄 Retention Best', key: 'retention_contribution' as keyof JadePackScores },
          ].map(({ label, key }) => {
            const top3 = sortByScore(JADE_STORE_PACKS, key).slice(0, 3);
            return (
              <div key={key} className="rounded-xl bg-muted/20 border border-border/30 p-2.5">
                <p className="text-[10px] font-bold text-muted-foreground mb-1.5">{label}</p>
                {top3.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-1.5 mb-1">
                    <span className="text-[9px] text-muted-foreground w-3">{i + 1}.</span>
                    <span className="text-xs">{p.icon}</span>
                    <span className="text-[10px] text-foreground truncate flex-1">{p.name}</span>
                    <span className="text-[10px] font-bold text-primary">{p.scores[key]}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
