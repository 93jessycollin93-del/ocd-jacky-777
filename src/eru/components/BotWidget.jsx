import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Send, ChevronDown, Zap, Globe, GripVertical } from 'lucide-react';
import { base44 } from '@/eru/api/base44Client';
import { getCachedOrFetch } from '@/eru/lib/metadataCache';

const ROLE_ICONS = { assistant: '🤖', trader: '📈', game_helper: '🎮', social: '💬', security: '🛡️', custom: '⚡' };

export default function BotWidget({ prefs, updateWidget }) {
  const { pathname } = useLocation();
  const [bot, setBot] = useState(null);
  const [connectedBots, setConnectedBots] = useState([]);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [consulting, setConsulting] = useState(null);
  const [webSearch, setWebSearch] = useState(false); // which connected bot is being consulted
  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const bottomRef = useRef(null);
  const fetchingBotRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    const applyBotState = (allBots) => {
      const assigned = allBots.find((item) => item.status === 'active' && (item.page_assignments || []).includes(pathname));
      if (!assigned) {
        if (!mounted) return;
        setBot(null);
        setConnectedBots([]);
        setMessages([]);
        return;
      }

      if (!mounted) return;
      setBot(assigned);
      setMessages([{ role: 'bot', text: `Hi! I'm ${assigned.name}. ${assigned.description || 'How can I help?'}` }]);
      const linkedIds = assigned.connected_bot_ids || [];
      setConnectedBots(linkedIds.length > 0 ? allBots.filter((item) => linkedIds.includes(item.id)) : []);
    };

    const fetchBot = async () => {
      if (fetchingBotRef.current) return;
      fetchingBotRef.current = true;
      try {
        const allBots = await getCachedOrFetch({
          key: 'bot_widget_user_bots',
          maxAgeMs: 5 * 60 * 1000,
          fetcher: () => base44.entities.UserBot.list('-created_date', 100).catch(() => [])
        });
        applyBotState(allBots || []);
      } catch (error) {
        if (error?.status !== 429) {
          throw error;
        }
      } finally {
        fetchingBotRef.current = false;
      }
    };

    setOpen(false);
    fetchBot().catch(() => {});

    return () => {
      mounted = false;
    };
  }, [pathname]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, consulting]);

  const send = async () => {
    if (!input.trim() || loading || !bot) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    // Check if we should consult a connected bot first
    let consultResult = '';
    if (connectedBots.length > 0 && bot.handoff_instructions) {
      // Ask the primary bot if it needs to delegate
      const delegateCheck = await base44.integrations.Core.InvokeLLM({
        prompt: `You are ${bot.name}. Handoff rules: ${bot.handoff_instructions}\nConnected bots: ${connectedBots.map(b => `${b.name} (${b.role}): ${b.description}`).join(', ')}\n\nUser asked: "${userMsg}"\n\nShould you delegate this to one of the connected bots? Reply with ONLY the bot name to delegate to, or "none" if you handle it yourself.`,
      });
      const delegateTo = connectedBots.find(b => delegateCheck.toLowerCase().includes(b.name.toLowerCase()));
      if (delegateTo) {
        setConsulting(delegateTo.name);
        await new Promise(r => setTimeout(r, 800));
        const subResp = await base44.integrations.Core.InvokeLLM({
          prompt: `You are ${delegateTo.name}. ${delegateTo.instructions || ''}\nPersonality: ${delegateTo.personality || 'helpful'}\nResponse style: ${delegateTo.response_style || 'detailed'}\n\nUser: ${userMsg}\n\n${delegateTo.name}:`,
        });
        consultResult = `[Delegated to ${delegateTo.name}]: ${subResp}`;
        setConsulting(null);
      }
    }

    const ragResponse = await base44.functions.invoke('retrieveKnowledgeBaseContext', { query: userMsg, botId: bot.id, limit: 5 }).catch(() => ({ data: { results: [], context: '' } }));
    const knowledgeContext = ragResponse.data?.context || '';
    const sourceGuardrail = knowledgeContext
      ? `Primary knowledge base context:\n${knowledgeContext}\n\nUse the knowledge base as the primary source of truth. If the answer is not in these sources, say so clearly before using any general knowledge.`
      : 'No matching knowledge base sources were retrieved. Answer normally, but do not pretend you found supporting docs.';

    const prompt = consultResult
      ? `You are ${bot.name}. ${bot.instructions || ''}\n${sourceGuardrail}\nA connected bot provided this: ${consultResult}\nSummarize and present this to the user helpfully.\n\nUser original question: ${userMsg}\n\n${bot.name}:`
      : `You are ${bot.name}. ${bot.instructions || ''}\nPersonality: ${bot.personality || 'helpful'}\nResponse style: ${bot.response_style || 'detailed'}\nContext: User is on the page "${pathname}".\n${sourceGuardrail}\n\nUser: ${userMsg}\n\n${bot.name}:`;

    const res = await base44.integrations.Core.InvokeLLM({
      prompt,
      ...(webSearch ? { add_context_from_internet: true, model: 'gemini_3_flash' } : {}),
    });
    setMessages(prev => [...prev, { role: 'bot', text: res, delegated: !!consultResult }]);

    // Award XP silently
    const newXp = (bot.xp || 0) + 10;
    const newLevel = Math.min(10, Math.floor(newXp / 100) + 1);
    await base44.entities.UserBot.update(bot.id, {
      xp: newXp, level: newLevel,
      usage_count: (bot.usage_count || 0) + 1,
      last_interaction: new Date().toISOString(),
    });

    setLoading(false);
  };

  const botChatPrefs = prefs?.botChat;

  useEffect(() => {
    const handleOpen = () => {
      if (!bot) {
        window.dispatchEvent(new CustomEvent('bot-chat-unavailable'));
        return;
      }
      setOpen(true);
    };
    window.addEventListener('open-bot-chat', handleOpen);
    return () => window.removeEventListener('open-bot-chat', handleOpen);
  }, [bot]);

  const handleMouseDown = (e) => {
    setDragging(true);
    const rect = e.currentTarget.getBoundingClientRect();
    setOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleMouseMove = (e) => {
    if (!dragging) return;
    const newX = Math.max(0, Math.min(e.clientX - offset.x, window.innerWidth - 220));
    const newY = Math.max(0, Math.min(e.clientY - offset.y, window.innerHeight - 64));
    updateWidget('botChat', { x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setDragging(false);
  };

  if (!bot || botChatPrefs?.visible === false) return null;

  return (
    <>
      {/* Floating trigger */}
      {!open && (
        <button
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={() => !dragging && setOpen(true)}
          style={botChatPrefs?.x !== null && botChatPrefs?.y !== null ? { left: `${botChatPrefs.x}px`, top: `${botChatPrefs.y}px`, right: 'auto', bottom: 'auto' } : undefined}
          className="eru-skin-widget-bot fixed bottom-20 right-4 z-40 flex items-center gap-2 bg-card border border-primary/30 shadow-lg rounded-2xl px-3 py-2.5 text-sm font-medium hover:border-primary transition-all cursor-move"
        >
          <span className="text-base">{ROLE_ICONS[bot.role] || '🤖'}</span>
          <span className="text-xs text-foreground">{bot.name}</span>
          {connectedBots.length > 0 && (
            <span className="text-[9px] bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded-full">
              +{connectedBots.length} linked
            </span>
          )}
          <GripVertical className="w-3 h-3 text-muted-foreground" />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-0 right-0 left-0 z-50 max-w-md mx-auto flex flex-col bg-card border-t border-l border-r border-border rounded-t-2xl shadow-2xl min-h-0" style={{ height: '60dvh' }}>
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border flex-shrink-0">
            <span className="text-xl">{ROLE_ICONS[bot.role] || '🤖'}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">{bot.name}</p>
              <p className="text-[9px] text-muted-foreground">{bot.description || bot.role}</p>
            </div>
            {connectedBots.length > 0 && (
              <div className="flex items-center gap-1">
                {connectedBots.slice(0, 3).map(cb => (
                  <span key={cb.id} title={cb.name} className="text-sm">{ROLE_ICONS[cb.role] || '🤖'}</span>
                ))}
                <span className="text-[9px] text-muted-foreground ml-0.5">network</span>
              </div>
            )}
            <button onClick={() => setWebSearch(w => !w)}
              title={webSearch ? 'Web search ON' : 'Web search OFF'}
              className={`p-1.5 rounded-lg border transition-all ${webSearch ? 'border-blue-400/50 text-blue-400 bg-blue-400/10' : 'border-border text-muted-foreground'}`}>
              <Globe className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setOpen(false)} className="text-muted-foreground p-1">
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y [-webkit-overflow-scrolling:touch] px-4 py-3 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'}`}>
                  {m.delegated && <p className="text-[8px] text-muted-foreground mb-1 flex items-center gap-1"><Zap className="w-2.5 h-2.5" /> via bot network</p>}
                  {m.text}
                </div>
              </div>
            ))}
            {consulting && (
              <div className="flex justify-start">
                <div className="bg-secondary rounded-2xl px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
                  <div className="w-3 h-3 border border-primary border-t-transparent rounded-full animate-spin" />
                  Consulting {consulting}…
                </div>
              </div>
            )}
            {loading && !consulting && (
              <div className="flex justify-start">
                <div className="bg-secondary rounded-2xl px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
                  <div className="w-3 h-3 border border-primary border-t-transparent rounded-full animate-spin" />
                  {bot.name} is thinking…
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-4 py-3 border-t border-border flex gap-2 flex-shrink-0">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder={`Ask ${bot.name}…`}
              className="flex-1 bg-secondary border border-border rounded-xl px-3 py-2 text-xs outline-none text-foreground"
            />
            <button onClick={send} disabled={!input.trim() || loading}
              className="bg-primary text-primary-foreground rounded-xl px-3 py-2 disabled:opacity-40">
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}