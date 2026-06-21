import { useState } from 'react';
import { Lock, Globe2, Mic } from 'lucide-react';

const INITIAL_FORM = {
  name: '',
  description: '',
  visibility: 'open',
  voice_enabled: true,
};

export default function CreateChatPanel({ onCreate }) {
  const [form, setForm] = useState(INITIAL_FORM);

  const submit = () => {
    if (!form.name.trim()) return;
    onCreate(form);
    setForm(INITIAL_FORM);
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <h3 className="text-sm font-semibold">Create personal or friends chat</h3>
      <input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Chat name" className="w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm text-foreground outline-none" />
      <textarea value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} placeholder="What is this room for?" className="w-full min-h-[88px] rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm text-foreground outline-none resize-none" />
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => setForm((prev) => ({ ...prev, visibility: 'open' }))} className={`rounded-xl border px-3 py-3 text-left ${form.visibility === 'open' ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-secondary text-muted-foreground'}`}>
          <Globe2 className="w-4 h-4 mb-2" />
          <p className="text-xs font-semibold">Open room</p>
          <p className="text-[11px] mt-1">Anyone can join</p>
        </button>
        <button onClick={() => setForm((prev) => ({ ...prev, visibility: 'private' }))} className={`rounded-xl border px-3 py-3 text-left ${form.visibility === 'private' ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-secondary text-muted-foreground'}`}>
          <Lock className="w-4 h-4 mb-2" />
          <p className="text-xs font-semibold">Private room</p>
          <p className="text-[11px] mt-1">Invite only</p>
        </button>
      </div>
      <label className="flex items-center gap-2 rounded-xl border border-border bg-secondary px-3 py-3 text-sm text-foreground">
        <input type="checkbox" checked={form.voice_enabled} onChange={(e) => setForm((prev) => ({ ...prev, voice_enabled: e.target.checked }))} className="accent-primary" />
        <Mic className="w-4 h-4 text-primary" /> Enable voice communication
      </label>
      <button onClick={submit} className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground">Create chat</button>
    </div>
  );
}