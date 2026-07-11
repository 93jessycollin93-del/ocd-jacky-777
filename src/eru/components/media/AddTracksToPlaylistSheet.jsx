import { useEffect, useState, useMemo } from 'react';
import { X, Plus, Check, Loader2, Search, Music2 } from 'lucide-react';
import { toast } from 'sonner';

import { listTracks, addTrackToPlaylist } from '@/eru/lib/mediaLibrary';

/**
 * AddTracksToPlaylistSheet — pick tracks from the library to add into a
 * playlist. Tracks already present are shown as added; the rest get a one-tap
 * add. Calls onChanged() after each add so the detail page refreshes.
 *
 * By default adds via mediaLibrary.addTrackToPlaylist; pass `addFn(trackId)` to
 * route adds elsewhere (e.g. the collaborative service-role function).
 */
export default function AddTracksToPlaylistSheet({
  playlistId,
  existingTrackIds,
  userEmail = '',
  addFn,
  onClose,
  onChanged,
}) {
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [added, setAdded] = useState(() => new Set(existingTrackIds || []));

  useEffect(() => {
    listTracks()
      .then(setTracks)
      .catch(() => setTracks([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tracks;
    return tracks.filter((t) =>
      [t.title, t.artist, t.format].filter(Boolean).some((v) => v.toLowerCase().includes(q)),
    );
  }, [tracks, query]);

  async function add(track) {
    if (busyId || added.has(track.id)) return;
    setBusyId(track.id);
    try {
      if (addFn) await addFn(track.id);
      else await addTrackToPlaylist(playlistId, track.id, userEmail);
      setAdded((prev) => new Set(prev).add(track.id));
      onChanged?.();
    } catch (err) {
      toast.error(err?.message || 'Could not add track.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Add tracks"
    >
      <div
        className="mx-auto w-full max-w-screen-sm rounded-t-2xl border border-border bg-card p-4"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Add tracks</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-accent"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your library…"
            className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm text-foreground outline-none focus:border-primary"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-secondary/20 p-4 text-center text-[12px] text-muted-foreground">
            {tracks.length === 0 ? 'Your library is empty.' : 'No tracks match.'}
          </p>
        ) : (
          <ul className="max-h-[50vh] space-y-1 overflow-y-auto">
            {filtered.map((track) => {
              const isAdded = added.has(track.id);
              return (
                <li
                  key={track.id}
                  className="flex items-center gap-3 rounded-xl border border-border bg-background/40 p-2.5"
                >
                  <Music2 className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-foreground">{track.title}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {track.artist || 'Unknown artist'}
                    </p>
                  </div>
                  <button
                    onClick={() => add(track)}
                    disabled={isAdded || busyId === track.id}
                    aria-label={isAdded ? 'Already added' : 'Add track'}
                    className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
                      isAdded ? 'text-primary' : 'text-muted-foreground hover:bg-accent'
                    }`}
                  >
                    {busyId === track.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isAdded ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Plus className="h-4 w-4" />
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
