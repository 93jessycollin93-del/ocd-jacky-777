import { useEffect, useState, useCallback } from 'react';
import { X, Users, UserPlus, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { listCollaborators, addCollaborator, removeCollaborator } from '@/eru/lib/mediaLibrary';

/**
 * CollaboratorsSheet — owner-only management of a playlist's collaborators.
 *
 * Collaborators can view and edit the playlist's tracks through the
 * collaborative editor (/collab/:id). Adding the first collaborator turns the
 * playlist collaborative. Uses the owner-scoped client (the owner created these
 * rows, so RLS permits it).
 */
export default function CollaboratorsSheet({ playlist, onClose, onChanged }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await listCollaborators(playlist.id));
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [playlist.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function add(e) {
    e.preventDefault();
    const value = email.trim().toLowerCase();
    if (!value || busy) return;
    if (value === (playlist.owner || '').toLowerCase()) {
      toast.error('You already own this playlist.');
      return;
    }
    setBusy(true);
    try {
      await addCollaborator(playlist.id, value);
      setEmail('');
      toast.success(`Added ${value}.`);
      await refresh();
      onChanged?.();
    } catch (err) {
      toast.error(err?.message || 'Could not add collaborator.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(row) {
    try {
      await removeCollaborator(row.id);
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      onChanged?.();
    } catch (err) {
      toast.error(err?.message || 'Could not remove collaborator.');
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Manage collaborators"
    >
      <div
        className="mx-auto w-full max-w-screen-sm rounded-t-2xl border border-border bg-card p-4"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Collaborators</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-accent"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <p className="mb-3 text-[11px] text-muted-foreground">
          Collaborators can add, remove, and reorder tracks in the shared editor.
        </p>

        <form onSubmit={add} className="mb-3 flex items-center gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Collaborator email…"
            className="h-10 flex-1 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={!email.trim() || busy}
            aria-label="Add collaborator"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
          </button>
        </form>

        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-secondary/20 p-4 text-center text-[12px] text-muted-foreground">
            No collaborators yet.
          </p>
        ) : (
          <ul className="max-h-[45vh] space-y-1 overflow-y-auto">
            {rows.map((row) => (
              <li
                key={row.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-background/40 p-2.5"
              >
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-secondary/50 text-[12px] font-semibold uppercase text-muted-foreground">
                  {(row.user_email || '?').slice(0, 1)}
                </div>
                <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                  {row.user_email}
                </span>
                <button
                  onClick={() => remove(row)}
                  aria-label={`Remove ${row.user_email}`}
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
