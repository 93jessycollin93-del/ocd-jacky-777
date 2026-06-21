import { useEffect, useMemo, useState } from 'react';
import { Library as LibraryIcon, Loader2, Search, BookOpen, Filter, BarChart3 } from 'lucide-react';
import { loadCardCatalog, summarizeCatalog, uniqueOrigins } from '@/eru/lib/cardCatalog';
import LibraryCardTile from '@/eru/components/library/LibraryCardTile';
import CardAnalyticsPanel from '@/eru/components/library/CardAnalyticsPanel';

const ELEMENT_OPTIONS = ['all', 'fire', 'water', 'earth', 'wind', 'shadow', 'light'];
const RARITY_OPTIONS = ['all', 'common', 'rare', 'epic', 'legendary', 'mythic'];
const STATUS_OPTIONS = [
  { id: 'all', label: 'All' },
  { id: 'discovered', label: 'Discovered' },
  { id: 'undiscovered', label: 'Undiscovered' },
];

/**
 * Library / Encyclopedia
 * --------------------------------------------------------------------------
 * Global catalog of every known card. Filterable by element, rarity, origin,
 * and discovery status. Scoped automatically against the player's owned
 * cards so each user sees their personal completion progress.
 *
 * Built on `lib/cardCatalog` so adding new card sources later (master entity,
 * pack/expansion seeds) does not require changes to this page.
 */
export default function Library() {
  const [view, setView] = useState('catalog'); // 'catalog' | 'analytics'
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [element, setElement] = useState('all');
  const [rarity, setRarity] = useState('all');
  const [origin, setOrigin] = useState('all');
  const [status, setStatus] = useState('all');
  const [query, setQuery] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const data = await loadCardCatalog();
      if (mounted) {
        setEntries(data);
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const origins = useMemo(() => uniqueOrigins(entries), [entries]);
  const summary = useMemo(() => summarizeCatalog(entries), [entries]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (element !== 'all' && e.element !== element) return false;
      if (rarity !== 'all' && e.rarity !== rarity) return false;
      if (origin !== 'all' && e.origin !== origin) return false;
      if (status === 'discovered' && !e.discovered) return false;
      if (status === 'undiscovered' && e.discovered) return false;
      if (q && !(e.card.name || '').toLowerCase().includes(q)) return false;
      return true;
    });
  }, [entries, element, rarity, origin, status, query]);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="px-4 py-4 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <LibraryIcon className="w-4 h-4 text-primary" />
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Encyclopedia</p>
        </div>
        <h1 className="text-xl font-semibold text-foreground mt-1">Card Library</h1>
        <p className="text-sm text-muted-foreground mt-1 inline-flex items-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5 text-primary" />
          A global catalog of all known cards. Track what you've collected, discover what remains.
        </p>
      </div>

      <div className="px-4 py-4 max-w-5xl mx-auto space-y-4">
        {/* View tabs */}
        <div className="flex gap-1 bg-secondary rounded-xl p-1">
          {[
            { id: 'catalog',   label: 'Catalog',   icon: BookOpen },
            { id: 'analytics', label: 'Analytics', icon: BarChart3 },
          ].map((opt) => (
            <button
              key={opt.id}
              onClick={() => setView(opt.id)}
              className={`flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors
                ${view === opt.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <opt.icon className="w-3.5 h-3.5" /> {opt.label}
            </button>
          ))}
        </div>

        {view === 'analytics' ? <CardAnalyticsPanel /> : (
        <>
        {/* Summary */}
        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <div className="flex items-end gap-3 flex-wrap">
            <div>
              <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Discovered</p>
              <p className="text-2xl font-semibold text-foreground">
                {summary.discovered}
                <span className="text-base font-normal text-muted-foreground"> / {summary.total}</span>
              </p>
            </div>
            <div className="ml-auto rounded-full bg-primary/10 border border-primary/20 px-2.5 py-1 text-[11px] font-semibold text-primary">
              {summary.pct}% complete
            </div>
          </div>
          <div className="h-2 rounded-full bg-secondary overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${summary.pct}%` }} />
          </div>
          <p className="text-[11px] text-muted-foreground">{summary.undiscovered} card{summary.undiscovered === 1 ? '' : 's'} still undiscovered.</p>
        </div>

        {/* Filters */}
        <div className="bg-card border border-border rounded-2xl p-3 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name…"
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-border bg-background text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <FilterGroup label="Status" value={status} onChange={setStatus}
            options={STATUS_OPTIONS.map((s) => ({ id: s.id, label: s.label }))} />

          <FilterGroup label="Element" value={element} onChange={setElement}
            options={ELEMENT_OPTIONS.map((e) => ({ id: e, label: e === 'all' ? 'All' : cap(e) }))} />

          <FilterGroup label="Rarity" value={rarity} onChange={setRarity}
            options={RARITY_OPTIONS.map((r) => ({ id: r, label: r === 'all' ? 'All' : cap(r) }))} />

          <FilterGroup label="Origin" value={origin} onChange={setOrigin}
            options={[{ id: 'all', label: 'All' }, ...origins.map((o) => ({ id: o, label: o }))]} />
        </div>

        {/* Result meta */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
          <Filter className="w-3 h-3" />
          <span>{filtered.length} card{filtered.length === 1 ? '' : 's'} matching</span>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="h-40 flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-secondary/10 p-8 text-center text-sm text-muted-foreground">
            No cards match your current filters.
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
            {filtered.map((entry) => (
              <LibraryCardTile key={entry.key} entry={entry} />
            ))}
          </div>
        )}
        </>
        )}
      </div>
    </div>
  );
}

function FilterGroup({ label, value, onChange, options }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-1.5">{label}</p>
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {options.map((opt) => (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-medium border whitespace-nowrap transition-colors ${
              value === opt.id
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-secondary border-border text-muted-foreground hover:border-primary/30'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function cap(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}