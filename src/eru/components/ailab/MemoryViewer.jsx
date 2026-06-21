import { useState, useEffect, useMemo } from 'react';
import { Brain, Trash2, User, Bot, Search, Pin, Gauge } from 'lucide-react';
import { base44 } from '@/eru/api/base44Client';

export default function MemoryViewer({ bots }) {
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBot, setSelectedBot] = useState('all');
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.BotMemory.list('-created_date', 200);
    setMemories(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const clearMemory = async (botId) => {
    const toDelete = memories.filter(m => m.bot_id === botId);
    await Promise.all(toDelete.map(m => base44.entities.BotMemory.delete(m.id)));
    load();
  };

  const filtered = useMemo(() => {
    return memories.filter((m) => {
      const botMatch = selectedBot === 'all' || m.bot_id === selectedBot;
      const text = [m.content, ...(m.retrieval_tags || []), m.memory_category].filter(Boolean).join(' ').toLowerCase();
      return botMatch && text.includes(search.toLowerCase());
    });
  }, [memories, selectedBot, search]);

  // Group by session
  const sessions = {};
  filtered.forEach(m => {
    const key = m.session_id || m.bot_id;
    if (!sessions[key]) sessions[key] = [];
    sessions[key].push(m);
  });

  const getBotName = (botId) => bots?.find(b => b.id === botId)?.name || botId?.slice(0, 8) + '…';

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="bg-purple-400/5 border border-purple-400/20 rounded-xl p-3">
        <p className="text-xs font-semibold text-purple-400 mb-1">🧠 Bot Memory</p>
        <p className="text-[10px] text-muted-foreground">All conversation history stored per bot. Memory enables contextual, persistent AI interactions.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-card border border-border rounded-xl p-2.5 text-center">
          <p className="text-lg font-bold text-purple-400">{memories.length}</p>
          <p className="text-[9px] text-muted-foreground">Memories</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-2.5 text-center">
          <p className="text-lg font-bold text-blue-400">{Object.keys(sessions).length}</p>
          <p className="text-[9px] text-muted-foreground">Sessions</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-2.5 text-center">
          <p className="text-lg font-bold text-primary">{bots?.length || 0}</p>
          <p className="text-[9px] text-muted-foreground">Bots</p>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
        <Search className="w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search memory content, tags, or categories..."
          className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground"
        />
      </div>

      {/* Bot filter */}
      {bots?.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button onClick={() => setSelectedBot('all')}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${selectedBot === 'all' ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-secondary text-muted-foreground'}`}>
            All Bots
          </button>
          {bots.map(b => (
            <button key={b.id} onClick={() => setSelectedBot(b.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${selectedBot === b.id ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-secondary text-muted-foreground'}`}>
              {b.name}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10">
          <Brain className="w-10 h-10 text-muted-foreground/20 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No memories yet</p>
          <p className="text-[10px] text-muted-foreground/60 mt-1">Memory is recorded when bots with memory_enabled interact with users</p>
        </div>
      ) : (
        <div className="space-y-3">
          {Object.entries(sessions).map(([sessionKey, msgs]) => {
            const botId = msgs[0]?.bot_id;
            return (
              <div key={sessionKey} className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                  <div>
                    <p className="text-xs font-semibold">{getBotName(botId)}</p>
                    <p className="text-[9px] text-muted-foreground">{msgs.length} messages · {new Date(msgs[0]?.created_date).toLocaleDateString()}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {[...new Set(msgs.flatMap((m) => m.retrieval_tags || []))].slice(0, 4).map((tag) => (
                        <span key={tag} className="rounded-full border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-[8px] text-primary">{tag}</span>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => clearMemory(botId)}
                    className="p-1.5 rounded-lg text-red-400 hover:bg-red-400/10 transition-all">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                <div className="p-3 space-y-2 max-h-48 overflow-y-auto">
                  {msgs.slice(0, 6).map((m, i) => (
                    <div key={i} className={`flex gap-2 text-[10px] ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`flex items-start gap-1.5 max-w-[85%] ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${m.role === 'user' ? 'bg-primary/20' : 'bg-secondary'}`}>
                          {m.role === 'user' ? <User className="w-2.5 h-2.5 text-primary" /> : <Bot className="w-2.5 h-2.5 text-muted-foreground" />}
                        </div>
                        <div>
                          <p className={`leading-relaxed rounded-xl px-2 py-1 ${m.role === 'user' ? 'bg-primary/10 text-primary' : 'bg-secondary text-foreground'}`}>
                            {m.content.slice(0, 120)}{m.content.length > 120 ? '…' : ''}
                          </p>
                          <div className="mt-1 flex flex-wrap gap-1 text-[8px] text-muted-foreground">
                            <span className="inline-flex items-center gap-1"><Gauge className="w-2.5 h-2.5" />{m.importance_score || 50}</span>
                            <span>{m.memory_category || 'conversation'}</span>
                            {m.is_pinned && <span className="inline-flex items-center gap-1 text-primary"><Pin className="w-2.5 h-2.5" />Pinned</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {msgs.length > 6 && <p className="text-[9px] text-muted-foreground text-center">+{msgs.length - 6} more messages</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}