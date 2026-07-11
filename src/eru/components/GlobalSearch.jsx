import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Loader2, FileText, CheckSquare, User, ExternalLink } from 'lucide-react';
import { base44 } from '@/eru/api/base44Client';

const TYPE_ICONS = {
  file: FileText,
  task: CheckSquare,
  contact: User,
};

const SOURCE_COLORS = {
  'Google Drive': 'text-blue-400',
  'Dropbox': 'text-blue-500',
  'OneDrive': 'text-blue-600',
  'ClickUp': 'text-purple-400',
  'Linear': 'text-indigo-400',
  'Wrike': 'text-green-400',
  'Salesforce': 'text-sky-400',
  'LinkedIn': 'text-blue-300',
};

function ResultItem({ result }) {
  const Icon = TYPE_ICONS[result.type] || FileText;
  const colorClass = SOURCE_COLORS[result.source] || 'text-muted-foreground';

  return (
    <a
      href={result.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start gap-3 px-4 py-3 hover:bg-secondary/60 transition-colors group"
    >
      <div className="mt-0.5 text-lg flex-shrink-0">{result.icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{result.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`text-[10px] font-semibold ${colorClass}`}>{result.source}</span>
          <span className="text-[10px] text-muted-foreground capitalize">{result.subtitle}</span>
          {result.meta && <span className="text-[10px] text-muted-foreground">{result.meta}</span>}
        </div>
      </div>
      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 flex-shrink-0 mt-1 transition-opacity" />
    </a>
  );
}

function GroupedResults({ results }) {
  const grouped = results.reduce((acc, r) => {
    if (!acc[r.source]) acc[r.source] = [];
    acc[r.source].push(r);
    return acc;
  }, {});

  return (
    <div>
      {Object.entries(grouped).map(([source, items]) => (
        <div key={source}>
          <div className="px-4 py-1.5 bg-muted/30 border-y border-border">
            <p className={`text-[10px] font-bold uppercase tracking-widest ${SOURCE_COLORS[source] || 'text-muted-foreground'}`}>{source}</p>
          </div>
          {items.map((r, i) => <ResultItem key={r.id || i} result={r} />)}
        </div>
      ))}
    </div>
  );
}

export default function GlobalSearch({ open, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setResults([]);
      setSearched(false);
    }
  }, [open]);

  const doSearch = useCallback(async (q) => {
    if (q.trim().length < 2) { setResults([]); setSearched(false); return; }
    setLoading(true);
    setSearched(true);
    try {
      const res = await base44.functions.invoke('globalSearch', { query: q });
      setResults(res.data?.results || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 500);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'Enter') { clearTimeout(debounceRef.current); doSearch(query); }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-start justify-center pt-16 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[75dvh] min-h-0"
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border flex-shrink-0">
          <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Search across all connected apps..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {loading ? (
            <Loader2 className="w-4 h-4 text-muted-foreground animate-spin flex-shrink-0" />
          ) : query ? (
            <button onClick={() => { setQuery(''); setResults([]); setSearched(false); }} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          ) : null}
        </div>

        {/* Sources hint */}
        {!searched && (
          <div className="px-4 py-4 flex-shrink-0">
            <p className="text-xs text-muted-foreground mb-3">Search across connected apps:</p>
            <div className="flex flex-wrap gap-1.5">
              {['Google Drive','Dropbox','OneDrive','ClickUp','Linear','Wrike','Salesforce','LinkedIn'].map(s => (
                <span key={s} className={`text-[10px] px-2 py-0.5 rounded-full bg-secondary border border-border font-medium ${SOURCE_COLORS[s] || ''}`}>{s}</span>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {searched && !loading && (
          <div className="overflow-y-auto overscroll-contain touch-pan-y [-webkit-overflow-scrolling:touch] flex-1 min-h-0">
            {results.length === 0 ? (
              <div className="text-center py-10">
                <Search className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No results found</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Try a different search term or connect more apps</p>
              </div>
            ) : (
              <>
                <div className="px-4 py-2 border-b border-border">
                  <p className="text-[10px] text-muted-foreground">{results.length} result{results.length !== 1 ? 's' : ''} found</p>
                </div>
                <GroupedResults results={results} />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}