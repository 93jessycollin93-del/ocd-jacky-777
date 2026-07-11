import { useEffect, useMemo, useState } from 'react';
import { Network, Search } from 'lucide-react';
import { base44 } from '@/eru/api/base44Client';

const COLORS = [
  'bg-primary/15 text-primary border-primary/20',
  'bg-blue-400/15 text-blue-400 border-blue-400/20',
  'bg-purple-400/15 text-purple-400 border-purple-400/20',
  'bg-yellow-400/15 text-yellow-400 border-yellow-400/20',
  'bg-pink-400/15 text-pink-400 border-pink-400/20',
];

export default function KnowledgeMap({ bots }) {
  const [chunks, setChunks] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    base44.entities.BotMemoryChunk.list('-created_date', 300).then(setChunks).catch(() => {});
  }, []);

  const botNameMap = useMemo(() => Object.fromEntries((bots || []).map((bot) => [bot.id, bot.name])), [bots]);

  const topicGraph = useMemo(() => {
    const topicMap = new Map();
    const edgeMap = new Map();

    chunks.forEach((chunk) => {
      const keywords = [...new Set((chunk.keywords || []).map((keyword) => keyword.toLowerCase().trim()).filter(Boolean))].slice(0, 8);
      if (keywords.length === 0) return;

      keywords.forEach((keyword) => {
        if (!topicMap.has(keyword)) {
          topicMap.set(keyword, {
            keyword,
            count: 0,
            summaries: new Set(),
            bots: new Set(),
          });
        }
        const item = topicMap.get(keyword);
        item.count += 1;
        item.bots.add(chunk.bot_id);
        if (chunk.summary) item.summaries.add(chunk.summary);
      });

      for (let i = 0; i < keywords.length; i += 1) {
        for (let j = i + 1; j < keywords.length; j += 1) {
          const pair = [keywords[i], keywords[j]].sort();
          const edgeKey = pair.join('::');
          edgeMap.set(edgeKey, (edgeMap.get(edgeKey) || 0) + 1);
        }
      }
    });

    return {
      topics: [...topicMap.values()]
        .filter((item) => {
          const haystack = [item.keyword, ...item.summaries].join(' ').toLowerCase();
          return haystack.includes(search.toLowerCase());
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 24),
      edges: edgeMap,
    };
  }, [chunks, search]);

  const visibleKeywords = new Set(topicGraph.topics.map((topic) => topic.keyword));
  const visibleEdges = [...topicGraph.edges.entries()]
    .map(([key, weight]) => {
      const [source, target] = key.split('::');
      return { source, target, weight };
    })
    .filter((edge) => visibleKeywords.has(edge.source) && visibleKeywords.has(edge.target) && edge.weight > 0)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 30);

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Network className="w-4 h-4 text-primary" />
          <p className="text-sm font-semibold">Knowledge Map</p>
        </div>
        <p className="text-xs text-muted-foreground">This map clusters topics found in archived bot memory, showing how programming ideas and concepts connect across active bots.</p>
        <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search topics or summaries..."
            className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-4">
        <p className="text-xs font-semibold text-foreground">Topic nodes</p>
        {topicGraph.topics.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {topicGraph.topics.map((topic, index) => (
              <div key={topic.keyword} className={`rounded-2xl border px-3 py-2 ${COLORS[index % COLORS.length]}`}>
                <p className="text-xs font-semibold capitalize">{topic.keyword}</p>
                <p className="text-[10px] opacity-80">{topic.count} memory links · {topic.bots.size} bots</p>
                <p className="mt-1 max-w-[220px] text-[10px] opacity-80 line-clamp-2">{[...topic.summaries][0]}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No mapped topics yet.</div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <p className="text-xs font-semibold text-foreground">Topic relationships</p>
        {visibleEdges.length > 0 ? (
          <div className="space-y-2">
            {visibleEdges.map((edge) => (
              <div key={`${edge.source}-${edge.target}`} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground capitalize">{edge.source} <span className="text-muted-foreground">↔</span> {edge.target}</p>
                  <p className="text-[10px] text-muted-foreground">Shared across archived summaries and keyword groups</p>
                </div>
                <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary">{edge.weight} links</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No topic relationships yet.</div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <p className="text-xs font-semibold text-foreground">Bots in the map</p>
        <div className="flex flex-wrap gap-2">
          {[...new Set(chunks.map((chunk) => chunk.bot_id))].filter(Boolean).map((botId) => (
            <span key={botId} className="rounded-full border border-border bg-secondary px-3 py-1.5 text-[10px] text-muted-foreground">
              {botNameMap[botId] || 'Unknown bot'}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}