import { useEffect, useMemo, useState } from 'react';
import { BrainCircuit, Search, Code2 } from 'lucide-react';
import { base44 } from '@/eru/api/base44Client';

export default function ProgrammingMemoryPanel() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    base44.entities.ProgrammingLanguageMemory.list('-memory_priority', 100).then(setItems).catch(() => {});
  }, []);

  const filtered = useMemo(() => items.filter(item => {
    const text = [item.name, item.slug, item.summary, ...(item.core_concepts || [])].join(' ').toLowerCase();
    return text.includes(search.toLowerCase());
  }), [items, search]);

  const master = filtered.find(item => item.category === 'core');
  const languages = filtered.filter(item => item.category === 'language');

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-center gap-2 mb-2">
          <BrainCircuit className="w-4 h-4 text-primary" />
          <p className="text-sm font-semibold">Programming Memory Core</p>
        </div>
        <p className="text-xs text-muted-foreground">Jackie now carries a permanent coding memory pack with a master knowledge layer plus per-language references for fast recall and active use across chat, AI Lab, and all bots for coding and complex technical work.</p>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
        <Search className="w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search languages or concepts..."
          className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground"
        />
      </div>

      {master && (
        <div className="rounded-xl border border-primary/20 bg-card p-4 space-y-3">
          <p className="text-sm font-semibold text-primary">{master.name}</p>
          <p className="text-xs text-muted-foreground leading-relaxed">{master.summary}</p>
          <div className="flex flex-wrap gap-1.5">
            {(master.core_concepts || []).map((concept) => (
              <span key={concept} className="rounded-full border border-primary/20 bg-primary/10 px-2 py-1 text-[10px] text-primary">{concept}</span>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {languages.map((item) => (
          <div key={item.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-primary" />
              <p className="text-sm font-semibold">{item.name}</p>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{item.summary}</p>
            <div className="flex flex-wrap gap-1.5">
              {(item.best_for || []).slice(0, 4).map((tag) => (
                <span key={tag} className="rounded-full border border-border bg-secondary px-2 py-1 text-[10px] text-muted-foreground">{tag}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}