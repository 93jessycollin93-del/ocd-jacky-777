import { useState, useCallback } from 'react';
import { useGame } from '@/game/GameContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { BUILDINGS, RESEARCH, TROOPS } from '@/game/data';
import { streamChat, ChatMessage } from '@/lib/jackie-stream';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';

function buildGameSummary(state: ReturnType<typeof useGame>['state']) {
  const keepLvl = state.buildings.find(b => b.id === 'keep')?.level || 0;
  const buildings = state.buildings.filter(b => b.level > 0).map(b => `${b.id} Lv${b.level}`).join(', ');
  const troops = state.troops.filter(t => t.count > 0).map(t => `${t.id} x${t.count}`).join(', ');
  const research = state.research.filter(r => r.level > 0).map(r => `${r.id} Lv${r.level}`).join(', ');
  const mats = state.rareMaterials || { essence: 0, arcane_dust: 0, mithril: 0, dragon_scale: 0 };
  const activeMarchCount = state.marches.filter(m => !m.completed).length;
  const completedMarchCount = state.marches.filter(m => m.completed && !m.result).length;

  let power = 0;
  for (const t of state.troops) {
    const def = TROOPS.find(d => d.id === t.id);
    if (def) power += (def.attack + def.defense + def.health) * t.count;
  }
  for (const b of state.buildings) power += b.level * 50;
  for (const r of state.research) power += r.level * 80;

  return `## Player Realm State
- **Ruler**: ${state.realmName}
- **Keep Level**: ${keepLvl}
- **Estimated Power**: ${power.toLocaleString()}
- **Resources**: Food ${state.resources.food.toLocaleString()}, Wood ${state.resources.wood.toLocaleString()}, Stone ${state.resources.stone.toLocaleString()}, Iron ${state.resources.iron.toLocaleString()}, Gold ${state.resources.gold.toLocaleString()}
- **Diamonds**: ${state.resources.diamonds?.toLocaleString() ?? 0}
- **Buildings**: ${buildings || 'None'}
- **Troops**: ${troops || 'None'}
- **Research**: ${research || 'None'}
- **Active Marches**: ${activeMarchCount}, **Uncollected**: ${completedMarchCount}
- **Rare Materials**: Essence ${mats.essence}, Arcane Dust ${mats.arcane_dust}, Mithril ${mats.mithril}, Dragon Scale ${mats.dragon_scale}
- **Unlocked Heroes**: ${state.unlockedHeroes?.join(', ') || 'None'}`;
}

const ORACLE_SYSTEM_CONTEXT = `You are the Oracle — a mystical strategic advisor inside a mobile strategy game (Lords Mobile / Rise of Kingdoms style).

Your role:
- Analyze the player's current realm state and give actionable strategic advice
- Prioritize recommendations by urgency (critical → important → nice-to-have)
- Be concise, use game terminology, and use emoji for visual flair
- If the player asks a question, answer it in context of their realm state
- Suggest specific next steps (e.g. "Upgrade Keep to Lv5 to unlock Academy")
- Warn about weaknesses (low resources, no troops, idle marches)
- Be encouraging but honest — don't sugarcoat bad situations

Format: Use markdown with headers, bullet points, and bold for emphasis. Keep responses under 300 words unless the player asks for detail.`;

export default function AIPage() {
  const { state } = useGame();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const gameSummary = buildGameSummary(state);

  const askOracle = useCallback(async (question?: string) => {
    setLoading(true);
    setError('');

    const userContent = question?.trim()
      ? question
      : 'Analyze my realm and give me your top strategic recommendations.';

    const userMsg: ChatMessage = { role: 'user', content: userContent };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');

    let assistantText = '';
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    await streamChat({
      messages: newMessages,
      model: 'google/gemini-2.5-flash',
      context: `${ORACLE_SYSTEM_CONTEXT}\n\n${gameSummary}`,
      onDelta: (chunk) => {
        assistantText += chunk;
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: assistantText };
          return updated;
        });
      },
      onDone: () => setLoading(false),
      onError: (msg) => {
        setError(msg);
        setLoading(false);
        // Remove empty assistant message
        setMessages(prev => prev.filter((m, i) => !(i === prev.length - 1 && m.role === 'assistant' && !m.content)));
      },
    });
  }, [messages, gameSummary]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() && messages.length > 0) return;
    askOracle(input.trim() || undefined);
  };

  // Calculate power for display
  let power = 0;
  for (const t of state.troops) {
    const def = TROOPS.find(d => d.id === t.id);
    if (def) power += (def.attack + def.defense + def.health) * t.count;
  }
  for (const b of state.buildings) power += b.level * 50;
  for (const r of state.research) power += r.level * 80;

  return (
    <div className="p-4 space-y-4 flex flex-col h-full max-h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl text-foreground">🔮 Oracle</h2>
          <p className="text-xs text-muted-foreground">AI-powered strategic advisor</p>
        </div>
        <Card className="bg-card/80 border-primary/30">
          <CardContent className="p-2 px-3 text-center">
            <div className="text-lg font-bold text-foreground">{power.toLocaleString()}</div>
            <div className="text-[10px] text-muted-foreground">Power</div>
          </CardContent>
        </Card>
      </div>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto space-y-3 min-h-0">
        {messages.length === 0 && (
          <Card className="bg-card/60 border-border/30">
            <CardContent className="p-4 text-center space-y-3">
              <div className="text-3xl">🔮</div>
              <p className="text-sm text-muted-foreground">
                The Oracle awaits your counsel. Ask a question or request a full realm analysis.
              </p>
              <Button
                size="sm"
                onClick={() => askOracle()}
                disabled={loading}
                className="bg-primary/90 hover:bg-primary text-primary-foreground"
              >
                {loading ? 'Consulting...' : '✨ Analyze My Realm'}
              </Button>
            </CardContent>
          </Card>
        )}

        {messages.map((msg, i) => (
          <Card
            key={i}
            className={`bg-card/80 ${msg.role === 'user' ? 'border-primary/30 ml-8' : 'border-border/30 mr-4'}`}
          >
            <CardContent className="p-3">
              <div className="text-[10px] text-muted-foreground mb-1 font-semibold uppercase tracking-wider">
                {msg.role === 'user' ? '👤 You' : '🔮 Oracle'}
              </div>
              {msg.role === 'assistant' ? (
                <div className="text-sm text-foreground prose prose-sm prose-invert max-w-none">
                  {msg.content ? (
                    <MarkdownRenderer content={msg.content} />
                  ) : (
                    <span className="text-muted-foreground animate-pulse">Consulting the stars...</span>
                  )}
                </div>
              ) : (
                <p className="text-sm text-foreground">{msg.content}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {error && (
        <p className="text-xs text-destructive text-center">{error}</p>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask the Oracle... (e.g. 'What should I build next?')"
          className="min-h-[40px] max-h-[80px] text-sm bg-card/80 border-border/50 resize-none"
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
        />
        <Button
          type="submit"
          size="sm"
          disabled={loading || (!input.trim() && messages.length === 0)}
          className="shrink-0 bg-primary/90 hover:bg-primary text-primary-foreground self-end"
        >
          {loading ? '...' : '🔮'}
        </Button>
      </form>
    </div>
  );
}
