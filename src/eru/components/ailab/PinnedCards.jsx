import { useState, useEffect } from 'react';
import { Pin, Plus, Bot, X, Sparkles } from 'lucide-react';
import { base44 } from '@/eru/api/base44Client';
import { useAuth } from '@/eru/lib/AuthContext';

const COLOR_MAP = {
  green:  'border-green-400/30 bg-green-400/5',
  blue:   'border-blue-400/30 bg-blue-400/5',
  yellow: 'border-yellow-400/30 bg-yellow-400/5',
  purple: 'border-purple-400/30 bg-purple-400/5',
  red:    'border-red-400/30 bg-red-400/5',
};
const TYPE_EMOJI = { insight: '💡', summary: '📋', alert: '🚨', report: '📊' };
const COLORS = Object.keys(COLOR_MAP);

const BLANK = { title: '', content: '', bot_id: '', bot_name: '', card_type: 'insight', color: 'green' };

export default function PinnedCards({ bots }) {
  const { currentUser } = useAuth();
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [generating, setGenerating] = useState(false);

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.PinnedCard.list('-created_date', 50);
    setCards(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.title || !form.content) return;
    const bot = bots?.find(b => b.id === form.bot_id);
    await base44.entities.PinnedCard.create({ ...form, bot_name: bot?.name || '', user_email: currentUser?.email });
    setForm(BLANK); setShowForm(false); load();
  };

  const del = async (id) => { await base44.entities.PinnedCard.delete(id); load(); };

  const generateInsight = async () => {
    const bot = bots?.find(b => b.id === form.bot_id);
    if (!bot || !form.title) return;
    setGenerating(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are ${bot.name}. ${bot.instructions || ''}\n\nGenerate a concise, insightful ${form.card_type} about: "${form.title}". Be specific and useful. Max 3 sentences.`,
      add_context_from_internet: true,
      model: 'gemini_3_flash',
    });
    setForm(f => ({ ...f, content: result }));
    setGenerating(false);
  };

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold flex items-center gap-2"><Pin className="w-3.5 h-3.5 text-primary" /> Pinned Cards</p>
          <p className="text-[10px] text-muted-foreground">Pin bot insights to your personal dashboard</p>
        </div>
        <button onClick={() => setShowForm(s => !s)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-xl text-xs font-semibold">
          <Plus className="w-3 h-3" /> New Card
        </button>
      </div>

      {showForm && (
        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="Card title (e.g. BTC Weekly Summary)"
            className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-xs outline-none" />

          <div className="grid grid-cols-2 gap-2">
            <select value={form.bot_id} onChange={e => setForm(f => ({ ...f, bot_id: e.target.value }))}
              className="bg-secondary border border-border rounded-xl px-3 py-2 text-xs outline-none">
              <option value="">Select bot (optional)</option>
              {bots?.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <select value={form.card_type} onChange={e => setForm(f => ({ ...f, card_type: e.target.value }))}
              className="bg-secondary border border-border rounded-xl px-3 py-2 text-xs outline-none">
              {['insight','summary','alert','report'].map(t => <option key={t} value={t}>{TYPE_EMOJI[t]} {t}</option>)}
            </select>
          </div>

          <div className="flex gap-2">
            {COLORS.map(c => (
              <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                className={`w-6 h-6 rounded-full border-2 ${form.color === c ? 'border-white' : 'border-transparent'} bg-${c}-400`} />
            ))}
          </div>

          <div className="relative">
            <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              placeholder="Card content or insight…"
              className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-xs outline-none resize-none min-h-[80px]" />
            {form.bot_id && form.title && (
              <button onClick={generateInsight} disabled={generating}
                className="absolute bottom-2 right-2 flex items-center gap-1 text-[9px] px-2 py-1 bg-primary/10 text-primary border border-primary/20 rounded-lg disabled:opacity-40">
                <Sparkles className="w-3 h-3" /> {generating ? 'Generating…' : 'AI Generate'}
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <button onClick={save} disabled={!form.title || !form.content}
              className="flex-1 bg-primary text-primary-foreground rounded-xl py-2 text-xs font-semibold disabled:opacity-40">
              Pin Card
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-border rounded-xl text-xs text-muted-foreground">
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : cards.length === 0 ? (
        <div className="text-center py-10">
          <Pin className="w-10 h-10 text-muted-foreground/20 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No pinned cards yet</p>
          <p className="text-[10px] text-muted-foreground/60 mt-1">Create cards to pin bot insights to this dashboard</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {cards.map(card => (
            <div key={card.id} className={`rounded-2xl border p-4 space-y-2 ${COLOR_MAP[card.color] || COLOR_MAP.green}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="mr-1">{TYPE_EMOJI[card.card_type] || '💡'}</span>
                  <span className="text-xs font-bold">{card.title}</span>
                </div>
                <button onClick={() => del(card.id)} className="text-muted-foreground hover:text-red-400 flex-shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-[10px] text-foreground/80 leading-relaxed">{card.content}</p>
              {card.bot_name && (
                <p className="text-[9px] text-muted-foreground flex items-center gap-1">
                  <Bot className="w-3 h-3" /> {card.bot_name} · {new Date(card.created_date).toLocaleDateString()}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}