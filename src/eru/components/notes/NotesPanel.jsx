import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/eru/api/base44Client';
import { StickyNote, Plus, Pin, PinOff, Trash2, Share2, X, Search, Save, Users, Check, Globe } from 'lucide-react';
import { useAuth } from '@/eru/lib/AuthContext';

const COLOR_STYLES = {
  default: 'bg-card border-border',
  amber: 'bg-amber-500/10 border-amber-500/30',
  rose: 'bg-rose-500/10 border-rose-500/30',
  emerald: 'bg-emerald-500/10 border-emerald-500/30',
  sky: 'bg-sky-500/10 border-sky-500/30',
  violet: 'bg-violet-500/10 border-violet-500/30',
};
const COLOR_DOTS = {
  default: 'bg-muted-foreground/40',
  amber: 'bg-amber-400',
  rose: 'bg-rose-400',
  emerald: 'bg-emerald-400',
  sky: 'bg-sky-400',
  violet: 'bg-violet-400',
};
const COLOR_OPTIONS = ['default', 'amber', 'rose', 'emerald', 'sky', 'violet'];

function formatRelative(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function NotesPanel({ open, onClose }) {
  const { user } = useAuth();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeId, setActiveId] = useState(null);
  const [draft, setDraft] = useState({ title: '', body: '', color: 'default' });
  const [saving, setSaving] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareInput, setShareInput] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const rows = await base44.entities.Note.list('-updated_date', 200);
      setNotes(rows || []);
    } catch {
      setNotes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    load();
  }, [open]);

  const active = useMemo(() => notes.find((n) => n.id === activeId) || null, [notes, activeId]);

  // Sync draft when active changes
  useEffect(() => {
    if (active) {
      setDraft({ title: active.title || '', body: active.body || '', color: active.color || 'default' });
    } else {
      setDraft({ title: '', body: '', color: 'default' });
    }
    setShareOpen(false);
    setShareInput('');
  }, [activeId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? notes.filter((n) => (n.title || '').toLowerCase().includes(q) || (n.body || '').toLowerCase().includes(q))
      : notes;
    return [...list].sort((a, b) => Number(b.pinned || 0) - Number(a.pinned || 0));
  }, [notes, search]);

  const createNew = async () => {
    setSaving(true);
    try {
      const created = await base44.entities.Note.create({ title: 'Untitled note', body: '', color: 'default' });
      setNotes((prev) => [created, ...prev]);
      setActiveId(created.id);
    } finally {
      setSaving(false);
    }
  };

  const saveActive = async () => {
    if (!active) return;
    setSaving(true);
    try {
      const updated = await base44.entities.Note.update(active.id, {
        title: draft.title || 'Untitled note',
        body: draft.body || '',
        color: draft.color || 'default',
      });
      setNotes((prev) => prev.map((n) => (n.id === active.id ? { ...n, ...updated } : n)));
    } finally {
      setSaving(false);
    }
  };

  const togglePin = async (note) => {
    const updated = await base44.entities.Note.update(note.id, { pinned: !note.pinned });
    setNotes((prev) => prev.map((n) => (n.id === note.id ? { ...n, ...updated } : n)));
  };

  const deleteNote = async (note) => {
    await base44.entities.Note.delete(note.id);
    setNotes((prev) => prev.filter((n) => n.id !== note.id));
    if (activeId === note.id) setActiveId(null);
  };

  const addShare = async () => {
    if (!active || !shareInput.trim()) return;
    const email = shareInput.trim().toLowerCase();
    const next = Array.from(new Set([...(active.shared_with || []), email]));
    const updated = await base44.entities.Note.update(active.id, { shared_with: next });
    setNotes((prev) => prev.map((n) => (n.id === active.id ? { ...n, ...updated } : n)));
    setShareInput('');
  };

  const removeShare = async (email) => {
    if (!active) return;
    const next = (active.shared_with || []).filter((e) => e !== email);
    const updated = await base44.entities.Note.update(active.id, { shared_with: next });
    setNotes((prev) => prev.map((n) => (n.id === active.id ? { ...n, ...updated } : n)));
  };

  const togglePublic = async () => {
    if (!active) return;
    const updated = await base44.entities.Note.update(active.id, { is_public: !active.is_public });
    setNotes((prev) => prev.map((n) => (n.id === active.id ? { ...n, ...updated } : n)));
  };

  const isOwner = active ? active.created_by === user?.email : true;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4" onClick={onClose}>
      <div
        className="w-full md:max-w-4xl bg-card text-foreground border border-border rounded-t-2xl md:rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ height: 'min(90dvh, 720px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
              <StickyNote className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight">Notes</p>
              <p className="text-[10px] text-muted-foreground leading-tight">Save, share, and edit your notes.</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={createNew}
              disabled={saving}
              className="inline-flex items-center gap-1 rounded-lg bg-primary text-primary-foreground px-2.5 py-1.5 text-xs font-semibold hover:opacity-90 disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" /> New
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body: list + editor */}
        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[260px_1fr]">
          {/* List */}
          <aside className={`border-b md:border-b-0 md:border-r border-border flex flex-col min-h-0 ${active ? 'hidden md:flex' : 'flex'}`}>
            <div className="p-2 border-b border-border flex-shrink-0">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search notes"
                  className="w-full pl-7 pr-2 py-1.5 text-xs rounded-lg bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain">
              {loading ? (
                <div className="p-4 text-xs text-muted-foreground">Loading…</div>
              ) : filtered.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  No notes yet. Tap <span className="font-semibold text-foreground">New</span> to create one.
                </div>
              ) : (
                <ul className="p-2 space-y-1">
                  {filtered.map((n) => {
                    const sharedCount = (n.shared_with || []).length + (n.is_public ? 1 : 0);
                    return (
                      <li key={n.id}>
                        <button
                          onClick={() => setActiveId(n.id)}
                          className={`w-full text-left px-2.5 py-2 rounded-lg border transition-colors ${activeId === n.id ? 'border-primary/50 bg-primary/5' : 'border-transparent hover:bg-secondary'}`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${COLOR_DOTS[n.color] || COLOR_DOTS.default}`} />
                            <p className="text-xs font-semibold truncate flex-1">{n.title || 'Untitled note'}</p>
                            {n.pinned && <Pin className="w-3 h-3 text-primary flex-shrink-0" />}
                          </div>
                          <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{n.body || 'Empty note'}</p>
                          <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                            <span>{formatRelative(n.updated_date || n.created_date)}</span>
                            {sharedCount > 0 && (
                              <span className="inline-flex items-center gap-0.5">
                                <Users className="w-2.5 h-2.5" /> {sharedCount}
                              </span>
                            )}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </aside>

          {/* Editor */}
          <section className={`flex flex-col min-h-0 ${active ? 'flex' : 'hidden md:flex'}`}>
            {!active ? (
              <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground p-6 text-center">
                Select a note from the list, or create a new one.
              </div>
            ) : (
              <>
                {/* Editor toolbar */}
                <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border flex-shrink-0">
                  <div className="flex items-center gap-1 md:hidden">
                    <button onClick={() => setActiveId(null)} className="text-xs text-primary px-2 py-1">← Back</button>
                  </div>
                  <div className="flex items-center gap-1 flex-wrap">
                    {COLOR_OPTIONS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setDraft((d) => ({ ...d, color: c }))}
                        disabled={!isOwner}
                        title={c}
                        className={`w-5 h-5 rounded-full border-2 ${draft.color === c ? 'border-foreground' : 'border-transparent'} ${COLOR_DOTS[c]} disabled:opacity-50`}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-1">
                    {isOwner && (
                      <>
                        <button
                          onClick={() => togglePin(active)}
                          title={active.pinned ? 'Unpin' : 'Pin'}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary"
                        >
                          {active.pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => setShareOpen((s) => !s)}
                          title="Share"
                          className={`p-1.5 rounded-lg hover:bg-secondary ${shareOpen ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteNote(active)}
                          title="Delete"
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={saveActive}
                          disabled={saving}
                          className="inline-flex items-center gap-1 rounded-lg bg-primary text-primary-foreground px-2.5 py-1.5 text-xs font-semibold hover:opacity-90 disabled:opacity-50"
                        >
                          <Save className="w-3.5 h-3.5" /> Save
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Share row */}
                {shareOpen && isOwner && (
                  <div className="px-3 py-2 border-b border-border bg-secondary/30 flex-shrink-0 space-y-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={togglePublic}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] ${active.is_public ? 'border-primary/50 bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}
                      >
                        <Globe className="w-3 h-3" /> {active.is_public ? 'Public — anyone can view' : 'Private'}
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        value={shareInput}
                        onChange={(e) => setShareInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') addShare(); }}
                        placeholder="Share with email…"
                        className="flex-1 px-2 py-1.5 text-xs rounded-lg bg-card border border-border focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                      <button onClick={addShare} className="inline-flex items-center gap-1 rounded-lg bg-primary text-primary-foreground px-2 py-1.5 text-xs font-semibold">
                        <Check className="w-3 h-3" /> Add
                      </button>
                    </div>
                    {(active.shared_with || []).length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {(active.shared_with || []).map((email) => (
                          <span key={email} className="inline-flex items-center gap-1 rounded-full bg-card border border-border px-2 py-0.5 text-[10px]">
                            {email}
                            <button onClick={() => removeShare(email)} className="text-muted-foreground hover:text-destructive">
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Editor body */}
                <div className={`flex-1 min-h-0 overflow-y-auto p-3 md:p-4 ${COLOR_STYLES[draft.color] || COLOR_STYLES.default}`}>
                  <input
                    value={draft.title}
                    onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                    placeholder="Title"
                    disabled={!isOwner}
                    className="w-full bg-transparent text-base md:text-lg font-semibold focus:outline-none disabled:opacity-70"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1 mb-3">
                    {isOwner ? `Updated ${formatRelative(active.updated_date || active.created_date)}` : `Shared by ${active.created_by}`}
                  </p>
                  <textarea
                    value={draft.body}
                    onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
                    placeholder="Start typing…"
                    disabled={!isOwner}
                    className="w-full min-h-[40dvh] bg-transparent text-sm leading-relaxed focus:outline-none resize-none disabled:opacity-70"
                  />
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}