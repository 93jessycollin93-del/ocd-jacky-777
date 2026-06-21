import { useEffect, useMemo, useState } from 'react';
import { Brain, Network, Search } from 'lucide-react';
import { base44 } from '@/eru/api/base44Client';

const NODE_STYLES = [
  'border-primary/20 bg-primary/10 text-primary',
  'border-blue-400/20 bg-blue-400/10 text-blue-300',
  'border-purple-400/20 bg-purple-400/10 text-purple-300',
  'border-yellow-400/20 bg-yellow-400/10 text-yellow-300',
  'border-pink-400/20 bg-pink-400/10 text-pink-300',
];

function normalizeKeyword(value) {
  return String(value || '').toLowerCase().trim();
}

export default function BotMemoryChunkRelationshipMap({ bots = [] }) {
  const [chunks, setChunks] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedBot, setSelectedBot] = useState('all');

  useEffect(() => {
    base44.entities.BotMemoryChunk.list('-created_date', 300).then(setChunks).catch(() => {});
  }, []);

  const botNameMap = useMemo(() => Object.fromEntries(bots.map((bot) => [bot.id, bot.name])), [bots]);

  const filteredChunks = useMemo(() => chunks.filter((chunk) => {
    const botMatch = selectedBot === 'all' || chunk.bot_id === selectedBot;
    const haystack = [chunk.summary, ...(chunk.keywords || [])].join(' ').toLowerCase();
    const searchMatch = haystack.includes(search.toLowerCase());
    return botMatch && searchMatch;
  }), [chunks, search, selectedBot]);

  const graph = useMemo(() => {
    const topicMap = new Map();
    const edgeMap = new Map();

    filteredChunks.forEach((chunk) => {
      const keywords = Array.from(new Set((chunk.keywords || []).map(normalizeKeyword).filter(Boolean))).slice(0, 10);
      if (keywords.length === 0) return;

      keywords.forEach((keyword) => {
        if (!topicMap.has(keyword)) {
          topicMap.set(keyword, {
            keyword,
            chunkCount: 0,
            botIds: new Set(),
            tiers: new Set(),
            summaries: [],
          });
        }
        const item = topicMap.get(keyword);
        item.chunkCount += 1;
        item.botIds.add(chunk.bot_id);
        item.tiers.add(chunk.storage_tier || 'warm');
        if (chunk.summary && item.summaries.length < 3) item.summaries.push(chunk.summary);
      });

      for (let i = 0; i < keywords.length; i += 1) {
        for (let j = i + 1; j < keywords.length; j += 1) {
          const pair = [keywords[i], keywords[j]].sort();
          const key = pair.join('::');
          if (!edgeMap.has(key)) {
            edgeMap.set(key, { source: pair[0], target: pair[1], weight: 0, botIds: new Set() });
          }
          const edge = edgeMap.get(key);
          edge.weight += 1;
          edge.botIds.add(chunk.bot_id);
        }
      }
    });

    const topics = [...topicMap.values()]
      .sort((a, b) => b.chunkCount - a.chunkCount || b.botIds.size - a.botIds.size)
      .slice(0, 24);
    const visible = new Set(topics.map((topic) => topic.keyword));
    const edges = [...edgeMap.values()]
      .filter((edge) => visible.has(edge.source) && visible.has(edge.target))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 28);

    return { topics, edges };
  }, [filteredChunks]);

  const strongestTopics = graph.topics.slice(0, 6);
  const strongestEdges = graph.edges.slice(0, 8);

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Network className="w-4 h-4 text-primary" />
          <p className="text-sm font-semibold">Memory Chunk Relationship Map</p>
        </div>
        <p className="text-xs text-muted-foreground">See which knowledge topics appear most often in archived bot memory chunks and how strongly those concepts connect across your agent fleet.</p>
        <div className="grid gap-2 md:grid-cols-[minmax(0,180px)_1fr]">
          <select value={selectedBot} onChange={(e) => setSelectedBot(e.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground outline-none">
            <option value="all">All bots</option>
            {bots.map((bot) => <option key={bot.id} value={bot.id}>{bot.name}</option>)}
          </select>
          <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search topics, concepts, or summaries..."
              className="flex-1 bg-transparent text-xs outline-none text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <p className="text-lg font-bold text-primary">{filteredChunks.length}</p>
          <p className="text-[10px] text-muted-foreground">Indexed chunks</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <p className="text-lg font-bold text-blue-300">{graph.topics.length}</p>
          <p className="text-[10px] text-muted-foreground">Visible topics</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <p className="text-lg font-bold text-purple-300">{graph.edges.length}</p>
          <p className="text-[10px] text-muted-foreground">Topic links</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-primary" />
          <p className="text-xs font-semibold text-foreground">Most understood topics</p>
        </div>
        {graph.topics.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {graph.topics.map((topic, index) => (
              <div key={topic.keyword} className={`rounded-2xl border px-3 py-2 ${NODE_STYLES[index % NODE_STYLES.length]}`}>
                <p className="text-xs font-semibold capitalize">{topic.keyword}</p>
                <p className="text-[10px] opacity-80">{topic.chunkCount} chunks · {topic.botIds.size} bots</p>
                <p className="text-[10px] opacity-70">{[...topic.tiers].join(', ')} memory</p>
                {topic.summaries[0] && <p className="mt-1 max-w-[220px] text-[10px] opacity-80 line-clamp-2">{topic.summaries[0]}</p>}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No topic relationships found yet.</div>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr,0.85fr]">
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <p className="text-xs font-semibold text-foreground">Strongest concept relationships</p>
          {strongestEdges.length > 0 ? (
            <div className="space-y-2">
              {strongestEdges.map((edge) => (
                <div key={`${edge.source}-${edge.target}`} className="rounded-xl border border-border bg-background px-3 py-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-medium text-foreground capitalize">{edge.source} <span className="text-muted-foreground">↔</span> {edge.target}</p>
                    <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary">{edge.weight} links</span>
                  </div>
                  <p className="mt-1 text-[10px] text-muted-foreground">Shared by {edge.botIds.size} bots across archived memory chunks.</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No strong topic links yet.</div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <p className="text-xs font-semibold text-foreground">Fleet understanding snapshot</p>
          {strongestTopics.length > 0 ? (
            <div className="space-y-2">
              {strongestTopics.map((topic) => (
                <div key={topic.keyword} className="rounded-xl border border-border bg-background p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold text-foreground capitalize">{topic.keyword}</p>
                    <span className="text-[10px] text-primary font-semibold">{topic.chunkCount}</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, topic.chunkCount * 10)}%` }} />
                  </div>
                  <p className="mt-2 text-[10px] text-muted-foreground">
                    Seen in {(Array.from(topic.botIds).map((botId) => botNameMap[botId] || 'Unknown bot')).join(', ')}.
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No understanding signals available yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}