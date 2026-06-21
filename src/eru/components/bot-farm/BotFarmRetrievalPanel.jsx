import { useMemo, useState } from 'react';
import { base44 } from '@/eru/api/base44Client';
import { Brain, RefreshCw, Search } from 'lucide-react';

export default function BotFarmRetrievalPanel({ bots }) {
  const [query, setQuery] = useState('');
  const [selectedBot, setSelectedBot] = useState('all');
  const [results, setResults] = useState([]);
  const [indexing, setIndexing] = useState(false);
  const [searching, setSearching] = useState(false);

  const activeBotOptions = useMemo(() => bots || [], [bots]);

  const handleIndex = async () => {
    setIndexing(true);
    await base44.functions.invoke('indexBotSemanticMemory', {});
    setIndexing(false);
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    const response = await base44.functions.invoke('searchBotSemanticMemory', {
      query,
      botId: selectedBot === 'all' ? undefined : selectedBot,
      limit: 8,
    });
    setResults(response.data?.results || []);
    setSearching(false);
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Brain className="w-4 h-4 text-primary" />
        <div>
          <p className="text-sm font-semibold text-foreground">Semantic Retrieval Layer</p>
          <p className="text-[11px] text-muted-foreground">Searches successful outcomes, maintenance patterns, and archived AI memory together.</p>
        </div>
      </div>

      <div className="flex flex-col gap-2 md:flex-row">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 flex-1">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search mission wins, fixes, and memory patterns..."
            className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
        <select value={selectedBot} onChange={(e) => setSelectedBot(e.target.value)} className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none md:w-52">
          <option value="all">All bots</option>
          {activeBotOptions.map((bot) => <option key={bot.id} value={bot.id}>{bot.name}</option>)}
        </select>
        <div className="flex gap-2">
          <button onClick={handleSearch} disabled={!query.trim() || searching} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40">
            {searching ? 'Searching...' : 'Search'}
          </button>
          <button onClick={handleIndex} disabled={indexing} className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground disabled:opacity-40">
            <RefreshCw className={`w-4 h-4 ${indexing ? 'animate-spin' : ''}`} />
            {indexing ? 'Indexing...' : 'Reindex'}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {results.map((item) => (
          <div key={item.id} className="rounded-xl border border-border bg-background p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold text-foreground">{item.title}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{item.summary}</p>
              </div>
              <div className="flex gap-2 text-[10px] text-muted-foreground sm:flex-col sm:text-right">
                <span>match {item.semantic_score || 0}</span>
                <span>{String(item.memory_category || '').replaceAll('_', ' ')}</span>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(item.keywords || []).slice(0, 6).map((keyword) => (
                <span key={keyword} className="rounded-full border border-primary/20 bg-primary/10 px-2 py-1 text-[10px] text-primary">{keyword}</span>
              ))}
            </div>
          </div>
        ))}
        {results.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
            Run a search to surface reusable patterns.
          </div>
        )}
      </div>
    </section>
  );
}