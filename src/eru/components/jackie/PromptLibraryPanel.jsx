import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/eru/api/base44Client';
import { BookText, Plus, Search, Star, Trash2, ArrowRight, Save } from 'lucide-react';

const BLANK = {
  title: '',
  content: '',
  tag: 'prompt',
  asset_type: 'text',
  folder: 'Prompt Library',
  pinned: false,
};

export default function PromptLibraryPanel({ onInject, onAppend }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(BLANK);

  const loadItems = async () => {
    setLoading(true);
    const rows = await base44.entities.JackieSaved.filter({ tag: 'prompt' }, '-updated_date', 100);
    setItems(rows);
    setLoading(false);
  };

  useEffect(() => {
    loadItems();
  }, []);

  const filteredItems = useMemo(() => {
    return [...items]
      .filter((item) => {
        const text = `${item.title || ''} ${item.content || ''}`.toLowerCase();
        return !search || text.includes(search.toLowerCase());
      })
      .sort((a, b) => Number(b.pinned) - Number(a.pinned));
  }, [items, search]);

  const savePrompt = async () => {
    if (!form.content.trim()) return;
    await base44.entities.JackieSaved.create({
      ...form,
      title: form.title.trim() || form.content.trim().slice(0, 48),
    });
    setForm(BLANK);
    setShowForm(false);
    loadItems();
  };

  const togglePin = async (item) => {
    await base44.entities.JackieSaved.update(item.id, { pinned: !item.pinned });
    loadItems();
  };

  const removePrompt = async (id) => {
    await base44.entities.JackieSaved.delete(id);
    loadItems();
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <BookText className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">Prompt Library</h3>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Save reusable prompts and inject them into chat in one tap.</p>
        </div>
        <button
          onClick={() => setShowForm((prev) => !prev)}
          className="inline-flex items-center gap-1 rounded-xl border border-primary/20 bg-primary/10 px-3 py-2 text-xs font-medium text-primary"
        >
          <Plus className="w-3.5 h-3.5" /> New
        </button>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-border bg-secondary px-3 py-2">
        <Search className="w-3.5 h-3.5 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search saved prompts..."
          className="flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
        />
      </div>

      {showForm && (
        <div className="space-y-2 rounded-xl border border-border bg-secondary/20 p-3">
          <input
            value={form.title}
            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            placeholder="Prompt title"
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none"
          />
          <textarea
            value={form.content}
            onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
            placeholder="Write the prompt or system instruction block..."
            rows={4}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={savePrompt}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
            >
              <Save className="w-3.5 h-3.5" /> Save prompt
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="rounded-xl border border-border bg-background px-3 py-2 text-xs text-muted-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
        {loading ? (
          <div className="py-8 text-center text-xs text-muted-foreground">Loading prompts...</div>
        ) : filteredItems.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">No saved prompts yet.</div>
        ) : filteredItems.map((item) => (
          <div key={item.id} className="rounded-xl border border-border bg-secondary/10 p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">{item.title || 'Untitled prompt'}</p>
                <p className="mt-1 text-[11px] text-muted-foreground line-clamp-3 whitespace-pre-wrap">{item.content}</p>
              </div>
              <button
                onClick={() => togglePin(item)}
                className={`rounded-lg border px-2 py-1 ${item.pinned ? 'border-primary/20 bg-primary/10 text-primary' : 'border-border bg-background text-muted-foreground'}`}
              >
                <Star className="w-3 h-3" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onInject(item.content)}
                className="inline-flex items-center gap-1 rounded-lg border border-primary/20 bg-primary/10 px-2.5 py-1.5 text-[11px] font-medium text-primary"
              >
                <ArrowRight className="w-3 h-3" /> Replace input
              </button>
              <button
                onClick={() => onAppend(item.content)}
                className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-[11px] text-muted-foreground"
              >
                Append
              </button>
              <button
                onClick={() => removePrompt(item.id)}
                className="inline-flex items-center gap-1 rounded-lg border border-destructive/20 bg-destructive/10 px-2.5 py-1.5 text-[11px] text-destructive"
              >
                <Trash2 className="w-3 h-3" /> Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}