import { useEffect, useMemo, useState } from 'react';
import { Layers3, Search, Download, Gauge, Sparkles } from 'lucide-react';
import { base44 } from '@/eru/api/base44Client';

export default function TieredMemoryPanel({ bots }) {
  const [memories, setMemories] = useState([]);
  const [chunks, setChunks] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [selectedBot, setSelectedBot] = useState('all');
  const [search, setSearch] = useState('');
  const [archiving, setArchiving] = useState(false);
  const [refreshingProfiles, setRefreshingProfiles] = useState(false);

  const load = async () => {
    const [memoryRows, chunkRows, profileRows] = await Promise.all([
      base44.entities.BotMemory.list('-created_date', 300),
      base44.entities.BotMemoryChunk.list('-created_date', 200),
      base44.entities.BotMemoryProfile.list('-updated_date', 200),
    ]);
    setMemories(memoryRows);
    setChunks(chunkRows);
    setProfiles(profileRows);
  };

  useEffect(() => { load(); }, []);

  const filteredChunks = useMemo(() => chunks.filter((chunk) => {
    const botMatch = selectedBot === 'all' || chunk.bot_id === selectedBot;
    const text = [chunk.summary, ...(chunk.keywords || [])].join(' ').toLowerCase();
    const searchMatch = text.includes(search.toLowerCase());
    return botMatch && searchMatch;
  }), [chunks, selectedBot, search]);

  const handleArchive = async () => {
    if (selectedBot === 'all') return;
    setArchiving(true);
    await base44.functions.invoke('archiveBotMemory', { botId: selectedBot });
    await load();
    setArchiving(false);
  };

  const getBotName = (botId) => bots?.find((bot) => bot.id === botId)?.name || 'Unknown bot';
  const selectedProfile = selectedBot === 'all' ? null : profiles.find((profile) => profile.bot_id === selectedBot);

  const handleRefreshProfiles = async () => {
    setRefreshingProfiles(true);
    await base44.functions.invoke('summarizeInactiveBotMemory', { inactivityHours: 999999, chunkSize: 20 });
    await load();
    setRefreshingProfiles(false);
  };

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Layers3 className="w-4 h-4 text-primary" />
          <p className="text-sm font-semibold">Tiered Memory Storage</p>
        </div>
        <p className="text-xs text-muted-foreground">Hot memory stays in BotMemory for recent context, while warm and cold memory is chunked, scored, profiled, archived in private storage, and indexed for stronger retrieval.</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <p className="text-lg font-bold text-primary">{memories.length}</p>
          <p className="text-[10px] text-muted-foreground">Hot items</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <p className="text-lg font-bold text-blue-400">{chunks.length}</p>
          <p className="text-[10px] text-muted-foreground">Indexed chunks</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <p className="text-lg font-bold text-purple-400">{chunks.filter((item) => item.storage_tier === 'cold').length}</p>
          <p className="text-[10px] text-muted-foreground">Cold archives</p>
        </div>
      </div>

      <div className="flex flex-col gap-2 md:flex-row">
        <select value={selectedBot} onChange={(e) => setSelectedBot(e.target.value)} className="flex-1 rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none">
          <option value="all">All bots</option>
          {(bots || []).map((bot) => <option key={bot.id} value={bot.id}>{bot.name}</option>)}
        </select>
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 flex-1">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search summaries or keywords..." className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground" />
        </div>
        <div className="flex gap-2">
          <button onClick={handleArchive} disabled={selectedBot === 'all' || archiving} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40">
            {archiving ? 'Archiving...' : 'Archive bot memory'}
          </button>
          <button onClick={handleRefreshProfiles} disabled={refreshingProfiles} className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground disabled:opacity-40">
            {refreshingProfiles ? 'Refreshing...' : 'Refresh profiles'}
          </button>
        </div>
      </div>

      {selectedProfile && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4 text-primary" />
            <p className="text-sm font-semibold">Memory profile</p>
          </div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <div className="rounded-xl border border-border bg-background p-3"><p className="text-[10px] text-muted-foreground">Health</p><p className="mt-1 text-lg font-semibold text-foreground">{selectedProfile.memory_health_score || 0}</p></div>
            <div className="rounded-xl border border-border bg-background p-3"><p className="text-[10px] text-muted-foreground">Hot</p><p className="mt-1 text-lg font-semibold text-foreground">{selectedProfile.hot_memory_count || 0}</p></div>
            <div className="rounded-xl border border-border bg-background p-3"><p className="text-[10px] text-muted-foreground">Archived</p><p className="mt-1 text-lg font-semibold text-foreground">{selectedProfile.archived_chunk_count || 0}</p></div>
            <div className="rounded-xl border border-border bg-background p-3"><p className="text-[10px] text-muted-foreground">Strategy</p><p className="mt-1 text-lg font-semibold text-foreground">{selectedProfile.retrieval_strategy || 'balanced'}</p></div>
          </div>
          {(selectedProfile.top_keywords || []).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {(selectedProfile.top_keywords || []).map((keyword) => (
                <span key={keyword} className="rounded-full border border-primary/20 bg-primary/10 px-2 py-1 text-[10px] text-primary">{keyword}</span>
              ))}
            </div>
          )}
          {selectedProfile.memory_prompt_block && (
            <div className="rounded-xl border border-border bg-background p-3">
              <div className="mb-2 flex items-center gap-2 text-[11px] font-medium text-foreground"><Sparkles className="w-3.5 h-3.5 text-primary" />Prompt memory block</div>
              <p className="text-[11px] leading-relaxed text-muted-foreground whitespace-pre-wrap">{selectedProfile.memory_prompt_block}</p>
            </div>
          )}
        </div>
      )}

      <div className="space-y-3">
        {filteredChunks.map((chunk) => (
          <div key={chunk.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{getBotName(chunk.bot_id)}</p>
                <p className="text-[10px] text-muted-foreground">{chunk.storage_tier} tier · {chunk.message_count} messages · score {chunk.retrieval_score || 0}</p>
              </div>
              {chunk.archive_signed_url && (
                <a href={chunk.archive_signed_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary">
                  <Download className="w-3 h-3" /> Archive
                </a>
              )}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{chunk.summary}</p>
            <div className="flex flex-wrap gap-1.5">
              {(chunk.keywords || []).slice(0, 8).map((keyword) => (
                <span key={keyword} className="rounded-full border border-border bg-secondary px-2 py-1 text-[10px] text-muted-foreground">{keyword}</span>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground md:grid-cols-4">
              <div className="rounded-lg border border-border bg-background px-2 py-2">Category <span className="text-foreground">{chunk.memory_category || 'conversation'}</span></div>
              <div className="rounded-lg border border-border bg-background px-2 py-2">Quality <span className="text-foreground">{chunk.quality_score || 0}</span></div>
              <div className="rounded-lg border border-border bg-background px-2 py-2">Uses <span className="text-foreground">{chunk.access_count || 0}</span></div>
              <div className="rounded-lg border border-border bg-background px-2 py-2">Compress <span className="text-foreground">{chunk.compression_ratio || 1}x</span></div>
            </div>
          </div>
        ))}
        {filteredChunks.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No archived memory chunks yet.
          </div>
        )}
      </div>
    </div>
  );
}