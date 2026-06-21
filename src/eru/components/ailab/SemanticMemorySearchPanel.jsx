import { useState } from 'react';
import { base44 } from '@/eru/api/base44Client';
import { Brain, Search } from 'lucide-react';

export default function SemanticMemorySearchPanel({ bots }) {
  const [query, setQuery] = useState('');
  const [selectedBot, setSelectedBot] = useState('all');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    const response = await base44.functions.invoke('searchBotSemanticMemory', {
      query,
      botId: selectedBot === 'all' ? undefined : selectedBot,
      limit: 10,
    });
    setResults(response.data?.results || []);
    setSearching(false);
  };

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-primary" />
          <p className="text-sm font-semibold">Semantic Memory Search</p>
        </div>
        <p className="text-xs text-muted-foreground">Cross-search Bot Farm outcomes, maintenance recovery patterns, squad knowledge, and archived bot memory.</p>
        <div className="flex flex-col gap-2 md:flex-row">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 flex-1">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search semantically across memory layers..."
              className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
          <select value={selectedBot} onChange={(e) => setSelectedBot(e.target.value)} className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none md:w-52">
            <option value="all">All bots</option>
            {(bots || []).map((bot) => <option key={bot.id} value={bot.id}>{bot.name}</option>)}
          </select>
          <button onClick={handleSearch} disabled={!query.trim() || searching} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40">
            {searching ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {results.map((item) => (
          <div key={item.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">{item.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.summary}</p>
              </div>
              <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-1 text-[10px] text-primary">{item.semantic_score || 0}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(item.keywords || []).slice(0, 8).map((keyword) => (
                <span key={keyword} className="rounded-full border border-border bg-secondary px-2 py-1 text-[10px] text-muted-foreground">{keyword}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}