import { Database, Pin, Search } from 'lucide-react';

export default function MemoryBankPanel({ entries = [], search, setSearch, pinnedIds = [], onTogglePin }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Database className="w-4 h-4 text-primary" />
        <div>
          <p className="text-xs font-semibold text-foreground">Memory Bank</p>
          <p className="text-[10px] text-muted-foreground">Browse successful squad history and pin entries for future pipeline runs.</p>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2">
        <Search className="w-3.5 h-3.5 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search memory by goal, summary, squad, or keywords"
          className="w-full bg-transparent text-xs text-foreground outline-none"
        />
      </div>

      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{entries.length} entries</span>
        <span>{pinnedIds.length} pinned</span>
      </div>

      <div className="space-y-2 max-h-[28rem] overflow-y-auto">
        {entries.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">No memory entries found.</div>
        ) : entries.map((entry) => {
          const pinned = pinnedIds.includes(entry.id);
          return (
            <div key={entry.id} className={`rounded-xl border p-3 ${pinned ? 'border-primary bg-primary/5' : 'border-border bg-background'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{entry.goal}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">{entry.source_squad_name}</p>
                </div>
                <button onClick={() => onTogglePin(entry.id)} className={`rounded-lg border px-2 py-1 text-[10px] ${pinned ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}>
                  <span className="inline-flex items-center gap-1"><Pin className="w-3 h-3" /> {pinned ? 'Pinned' : 'Pin'}</span>
                </button>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground line-clamp-4">{entry.result_summary}</p>
              {(entry.keywords || []).length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {entry.keywords.slice(0, 8).map((keyword) => (
                    <span key={keyword} className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[9px] text-primary">{keyword}</span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}