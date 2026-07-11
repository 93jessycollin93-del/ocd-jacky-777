import { useEffect, useState } from 'react';
import { X, Plus, ListMusic, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';

import {
  listPlaylists,
  createPlaylist,
  addTrackToPlaylist,
  moveTracksToPlaylist,
} from '@/eru/lib/mediaLibrary';

/**
 * AddToPlaylistSheet — bottom sheet to add one or more tracks to an existing
 * playlist, or to a brand-new one created inline. Pass a single `track` or a
 * `tracks` array (bulk). Membership is deduped by mediaLibrary.addTrackToPlaylist
 * (a no-op for tracks already present).
 */
export default function AddToPlaylistSheet({ track, tracks, userEmail = '', onClose, onAdded }) {
  const items = tracks?.length ? tracks : track ? [track] : [];
  const trackIds = items.map((t) => t.id);
  const label = items.length === 1 ? `“${items[0]?.title}”` : `${items.length} tracks`;

  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [addedIds, setAddedIds] = useState(new Set());
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    listPlaylists()
      .then(setPlaylists)
      .catch(() => setPlaylists([]))
      .finally(() => setLoading(false));
  }, []);

  async function addTo(playlist) {
    if (busyId) return;
    setBusyId(playlist.id);
    try {
      if (trackIds.length === 1) {
        const link = await addTrackToPlaylist(playlist.id, trackIds[0], userEmail);
        toast.success(link ? `Added to “${playlist.name}”.` : `Already in “${playlist.name}”.`);
      } else {
        await moveTracksToPlaylist(trackIds, playlist.id, userEmail);
        toast.success(`Added ${trackIds.length} tracks to “${playlist.name}”.`);
      }
      setAddedIds((prev) => new Set(prev).add(playlist.id));
      onAdded?.();
    } catch (err) {
      toast.error(err?.message || 'Could not add to playlist.');
    } finally {
      setBusyId(null);
    }
  }

  async function createAndAdd(e) {
    e.preventDefault();
    const name = newName.trim();
    if (!name || creating) return;
    setCreating(true);
    try {
      const playlist = await createPlaylist({ name });
      await moveTracksToPlaylist(trackIds, playlist.id, userEmail);
      toast.success(`Created “${name}” and added ${trackIds.length === 1 ? 'the track' : `${trackIds.length} tracks`}.`);
      onAdded?.();
      onClose?.();
    } catch (err) {
      toast.error(err?.message || 'Could not create playlist.');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Add to playlist"
    >
      <div
        className="mx-auto w-full max-w-screen-sm rounded-t-2xl border border-border bg-card p-4"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <ListMusic className="h-4 w-4 flex-shrink-0 text-primary" />
            <h2 className="truncate text-sm font-semibold text-foreground">
              Add {label} to playlist
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

        {/* Create new */}
        <form onSubmit={createAndAdd} className="mb-3 flex items-center gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New playlist name…"
            className="h-10 flex-1 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={!newName.trim() || creating}
            aria-label="Create playlist and add"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50"
          >
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </button>
        </form>

        {/* Existing playlists */}
        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : playlists.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-secondary/20 p-4 text-center text-[12px] text-muted-foreground">
            No playlists yet — create one above.
          </p>
        ) : (
          <ul className="max-h-[45vh] space-y-1 overflow-y-auto">
            {playlists.map((p) => {
              const added = addedIds.has(p.id);
              return (
                <li key={p.id}>
                  <button
                    onClick={() => addTo(p)}
                    disabled={busyId === p.id}
                    className="flex w-full items-center gap-3 rounded-xl border border-border bg-background/40 p-2.5 text-left hover:bg-accent disabled:opacity-60"
                  >
                    <ListMusic className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-foreground">{p.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {p.track_count || 0} track{(p.track_count || 0) === 1 ? '' : 's'}
                      </p>
                    </div>
                    {busyId === p.id ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : added ? (
                      <Check className="h-4 w-4 text-primary" />
                    ) : (
                      <Plus className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
