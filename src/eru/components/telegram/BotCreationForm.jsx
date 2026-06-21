import { useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';

const DEFAULT_FORM = {
  name: '',
  personality_prompt: 'You are a helpful Telegram assistant. Be clear, fast, and friendly.',
  welcome_message: 'Hi! I am live and ready to help.',
  model_preference: 'automatic',
  memory_enabled: true,
  max_memory_messages: 12,
  custom_logic_notes: '',
};

export default function BotCreationForm({ onCreate }) {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    setLoading(true);
    await onCreate(form);
    setLoading(false);
    setForm(DEFAULT_FORM);
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold">Create AI Telegram Bot</h3>
      </div>
      <input value={form.name} onChange={(e) => setField('name', e.target.value)} placeholder="Bot project name" className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm outline-none" />
      <textarea value={form.personality_prompt} onChange={(e) => setField('personality_prompt', e.target.value)} placeholder="Personality and system prompt" className="w-full min-h-[110px] bg-secondary border border-border rounded-xl px-3 py-2 text-sm outline-none resize-none" />
      <textarea value={form.welcome_message} onChange={(e) => setField('welcome_message', e.target.value)} placeholder="Welcome message for /start" className="w-full min-h-[80px] bg-secondary border border-border rounded-xl px-3 py-2 text-sm outline-none resize-none" />
      <div className="grid grid-cols-2 gap-2">
        <select value={form.model_preference} onChange={(e) => setField('model_preference', e.target.value)} className="bg-secondary border border-border rounded-xl px-3 py-2 text-sm outline-none">
          {['automatic', 'gpt_5_mini', 'gpt_5', 'claude_sonnet_4_6', 'gemini_3_flash'].map((model) => (
            <option key={model} value={model}>{model}</option>
          ))}
        </select>
        <input type="number" min="1" max="40" value={form.max_memory_messages} onChange={(e) => setField('max_memory_messages', Number(e.target.value))} className="bg-secondary border border-border rounded-xl px-3 py-2 text-sm outline-none" />
      </div>
      <textarea value={form.custom_logic_notes} onChange={(e) => setField('custom_logic_notes', e.target.value)} placeholder="Extra rules, tools, tone, routing notes" className="w-full min-h-[80px] bg-secondary border border-border rounded-xl px-3 py-2 text-sm outline-none resize-none" />
      <label className="flex items-center gap-2 text-sm text-foreground">
        <input type="checkbox" checked={form.memory_enabled} onChange={(e) => setField('memory_enabled', e.target.checked)} className="w-4 h-4 accent-primary" />
        Enable conversation memory
      </label>
      <button onClick={handleSubmit} disabled={!form.name || !form.personality_prompt || loading} className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        {loading ? 'Creating bot…' : 'Create and activate bot'}
      </button>
    </div>
  );
}