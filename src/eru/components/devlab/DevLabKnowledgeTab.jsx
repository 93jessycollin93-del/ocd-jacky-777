import { useState } from 'react';
import { BookOpen, Pin, Plus, Trash2, ShieldCheck } from 'lucide-react';
import ConfirmDialog from '@/eru/components/ConfirmDialog';

const CATEGORIES = [
  { value: 'golden_rule',   label: 'Golden Rule' },
  { value: 'design_system', label: 'Design System' },
  { value: 'api_spec',      label: 'API Spec' },
  { value: 'security',      label: 'Security' },
  { value: 'business_logic',label: 'Business Logic' },
  { value: 'stack_note',    label: 'Stack Note' },
  { value: 'other',         label: 'Other' },
];

/**
 * DevLabKnowledgeTab — pinned Golden Rules at the top, then the project's
 * knowledge documents grouped by category. Inline editor for owners.
 */
export default function DevLabKnowledgeTab({ docs = [], onCreate, onUpdate, onDelete, isOwner }) {
  const [draft, setDraft] = useState({ title: '', body: '', category: 'business_logic' });
  const [pendingDelete, setPendingDelete] = useState(null);
  const [editingId, setEditingId] = useState(null);

  const pinned = docs.filter((d) => d.importance === 'pinned');
  const rest = docs.filter((d) => d.importance !== 'pinned');

  const handleCreate = async () => {
    if (!draft.title.trim() || !draft.body.trim()) return;
    await onCreate(draft);
    setDraft({ title: '', body: '', category: 'business_logic' });
  };

  return (
    <div className="space-y-3">
      {pinned.length > 0 && (
        <section className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
          <p className="flex items-center gap-2 text-xs font-semibold text-primary">
            <ShieldCheck className="h-3.5 w-3.5" /> Golden Rules
          </p>
          <ul className="mt-3 space-y-2">
            {pinned.map((d) => (
              <li key={d.id} className="rounded-xl border border-primary/20 bg-card/60 p-3">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <Pin className="h-3 w-3 text-primary" />
                  {d.title}
                </p>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{d.body}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {isOwner && (
        <section className="rounded-2xl border border-border bg-card p-4 space-y-2">
          <p className="text-xs font-semibold text-foreground">Add a knowledge document</p>
          <input
            value={draft.title}
            onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))}
            placeholder="Title"
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none"
          />
          <textarea
            value={draft.body}
            onChange={(e) => setDraft((p) => ({ ...p, body: e.target.value }))}
            placeholder="Paste rules, design notes, API specs, or business logic…"
            rows={4}
            className="w-full resize-y rounded-xl border border-border bg-background px-3 py-2.5 text-xs font-mono text-foreground outline-none"
          />
          <div className="flex gap-2">
            <select
              value={draft.category}
              onChange={(e) => setDraft((p) => ({ ...p, category: e.target.value }))}
              className="flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-xs text-foreground outline-none"
            >
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <button
              onClick={handleCreate}
              disabled={!draft.title.trim() || !draft.body.trim()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
          </div>
        </section>
      )}

      <section className="space-y-2">
        <p className="flex items-center gap-2 text-xs font-semibold text-foreground">
          <BookOpen className="h-3.5 w-3.5 text-primary" /> Project knowledge
        </p>
        {rest.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-card p-4 text-xs text-muted-foreground text-center">
            No additional knowledge yet.
          </p>
        ) : rest.map((d) => (
          <article key={d.id} className="rounded-2xl border border-border bg-card p-3">
            {editingId === d.id ? (
              <KnowledgeEditor
                doc={d}
                onSave={async (next) => { await onUpdate(d.id, next); setEditingId(null); }}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <>
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{d.title}</p>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{d.category}</p>
                  </div>
                  {isOwner && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => setEditingId(d.id)}
                        className="rounded-lg border border-border bg-secondary px-2 py-1 text-[10px] text-muted-foreground"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setPendingDelete(d)}
                        className="rounded-lg border border-border bg-secondary px-2 py-1 text-[10px] text-muted-foreground hover:text-destructive"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
                <p className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground leading-relaxed">{d.body}</p>
              </>
            )}
          </article>
        ))}
      </section>

      <ConfirmDialog
        open={!!pendingDelete}
        title={`Delete "${pendingDelete?.title}"?`}
        description="This removes the document for this project. Cannot be undone."
        confirmLabel="Delete"
        tone="danger"
        onCancel={() => setPendingDelete(null)}
        onConfirm={async () => {
          await onDelete(pendingDelete);
          setPendingDelete(null);
        }}
      />
    </div>
  );
}

function KnowledgeEditor({ doc, onSave, onCancel }) {
  const [draft, setDraft] = useState({ title: doc.title, body: doc.body, category: doc.category });
  return (
    <div className="space-y-2">
      <input
        value={draft.title}
        onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))}
        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none"
      />
      <textarea
        value={draft.body}
        onChange={(e) => setDraft((p) => ({ ...p, body: e.target.value }))}
        rows={4}
        className="w-full resize-y rounded-xl border border-border bg-background px-3 py-2 text-xs font-mono text-foreground outline-none"
      />
      <select
        value={draft.category}
        onChange={(e) => setDraft((p) => ({ ...p, category: e.target.value }))}
        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground outline-none"
      >
        {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
      </select>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="rounded-lg border border-border bg-secondary px-3 py-1.5 text-[11px] text-muted-foreground">Cancel</button>
        <button onClick={() => onSave(draft)} className="rounded-lg bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground">Save</button>
      </div>
    </div>
  );
}