import { useState } from 'react';
import { X, Tag as TagIcon, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { assignTag, unassignTag } from '@/eru/lib/mediaLibrary';

/**
 * TrackTagEditor — bottom sheet for adding/removing tags on a single track.
 *
 * Tags are free-form and many-to-many (Tag + TrackTag entities). Typing a new
 * name creates the tag; existing tags surface as suggestions. All writes go
 * through mediaLibrary; on any change we call onChanged() so the parent reloads
 * its tag map.
 */
export default function TrackTagEditor({ track, tags = [], allTags = [], onClose, onChanged }) {
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);

  const assignedIds = new Set(tags.map((t) => t.tag_id));
  const suggestions = allTags
    .filter((t) => !assignedIds.has(t.id))
    .filter((t) => t.name.toLowerCase().includes(input.trim().toLowerCase()))
    .slice(0, 8);

  async function add(name) {
    const value = (name ?? input).trim();
    if (!value || busy) return;
    setBusy(true);
    try {
      await assignTag(track.id, value);
      setInput('');
      onChanged?.();
    } catch (err) {
      toast.error(err?.message || 'Could not add tag.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(tagId) {
    if (busy) return;
    setBusy(true);
    try {
      await unassignTag(track.id, tagId);
      onChanged?.();
    } catch (err) {
      toast.error(err?.message || 'Could not remove tag.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Edit tags"
    >
      <div
        className="mx-auto w-full max-w-screen-sm rounded-t-2xl border border-border bg-card p-4"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <TagIcon className="h-4 w-4 flex-shrink-0 text-primary" />
            <h2 className="truncate text-sm font-semibold text-foreground">
              Tags · {track.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-accent"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Assigned tags */}
        {tags.length > 0 ? (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <span
                key={t.id}
                className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 py-1 pl-2.5 pr-1 text-[12px] text-foreground"
              >
                {t.tag_name}
                <button
                  onClick={() => remove(t.tag_id)}
                  aria-label={`Remove ${t.tag_name}`}
                  className="flex h-4 w-4 items-center justify-center rounded-full hover:bg-accent"
                >
                  <X className="h-3 w-3 text-muted-foreground" />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="mb-3 text-[12px] text-muted-foreground">No tags yet.</p>
        )}

        {/* Add input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
          className="flex items-center gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Add a tag…"
            className="h-10 flex-1 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={!input.trim() || busy}
            aria-label="Add tag"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </button>
        </form>

        {/* Suggestions from existing tags */}
        {suggestions.length > 0 && (
          <div className="mt-3">
            <p className="mb-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
              Existing tags
            </p>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((t) => (
                <button
                  key={t.id}
                  onClick={() => add(t.name)}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-background/40 px-2.5 py-1 text-[12px] text-foreground hover:bg-accent"
                >
                  <Plus className="h-3 w-3 text-muted-foreground" /> {t.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
