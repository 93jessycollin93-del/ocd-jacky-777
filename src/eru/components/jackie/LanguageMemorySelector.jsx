import { useEffect, useMemo, useState } from 'react';
import { BrainCircuit, Sparkles } from 'lucide-react';
import { base44 } from '@/eru/api/base44Client';

export default function LanguageMemorySelector({ selectedMemoryId, onSelect, onApplyReference }) {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    base44.entities.ProgrammingLanguageMemory.list('-memory_priority', 100).then(setItems).catch(() => {});
  }, []);

  const filtered = useMemo(() => items.filter((item) => {
    const text = [item.name, item.slug, item.summary].join(' ').toLowerCase();
    return text.includes(search.toLowerCase());
  }), [items, search]);

  const selected = items.find((item) => item.id === selectedMemoryId) || null;

  return (
    <div className="rounded-xl border border-border bg-card p-3 space-y-3">
      <div className="flex items-center gap-2">
        <BrainCircuit className="w-4 h-4 text-primary" />
        <p className="text-xs font-semibold text-foreground">Programming memory reference</p>
      </div>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search language memory..."
        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground outline-none"
      />
      <select
        value={selectedMemoryId}
        onChange={(e) => onSelect(e.target.value)}
        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground outline-none"
      >
        <option value="">No reference selected</option>
        {filtered.map((item) => (
          <option key={item.id} value={item.id}>{item.name}</option>
        ))}
      </select>
      {selected && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2">
          <p className="text-xs font-semibold text-primary">{selected.name}</p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">{selected.summary}</p>
          <div className="flex flex-wrap gap-1.5">
            {(selected.core_concepts || []).slice(0, 6).map((concept) => (
              <span key={concept} className="rounded-full border border-primary/20 bg-primary/10 px-2 py-1 text-[10px] text-primary">{concept}</span>
            ))}
          </div>
          <button
            onClick={() => onApplyReference(selected)}
            className="inline-flex items-center gap-1 rounded-lg border border-primary/20 bg-background px-2.5 py-1.5 text-[11px] font-medium text-primary"
          >
            <Sparkles className="w-3 h-3" /> Use as AI reference
          </button>
        </div>
      )}
    </div>
  );
}