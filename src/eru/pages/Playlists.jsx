import { useEffect, useState, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ListMusic,
  Plus,
  Loader2,
  ChevronRight,
  Lock,
  Globe,
  Link2,
  Compass,
  Upload,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  listPlaylists,
  createPlaylist,
  importPlaylist,
  listCollaborativePlaylists,
} from '@/eru/lib/mediaLibrary';
import { parsePlaylistFile } from '@/eru/lib/playlistIO';
import { useAuth } from '@/eru/lib/AuthContext';

const VISIBILITY_BADGE = {
  private: { icon: Lock, label: 'Private' },
  unlisted: { icon: Link2, label: 'Unlisted' },
  public: { icon: Globe, label: 'Public' },
};

/**
 * Playlists — list and create the user's playlists (Phase 3). Each card links to
 * the playlist detail page, where tracks are managed. Visibility is shown as a
 * badge; switching to shared/public is handled in the sharing phase.
 */
export default function Playlists() {
  const [playlists, setPlaylists] = useState([]);
  const [shared, setShared] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [mine, sharedWithMe] = await Promise.all([
        listPlaylists(),
        listCollaborativePlaylists().catch(() => []),
      ]);
      setPlaylists(mine);
      setShared(sharedWithMe);
    } catch {
      setPlaylists([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function create(e) {
    e.preventDefault();
    const value = name.trim();
    if (!value || creating) return;
    setCreating(true);
    try {
      await createPlaylist({ name: value });
      setName('');
      toast.success(`Created “${value}”.`);
      refresh();
    } catch (err) {
      toast.error(err?.message || 'Could not create playlist.');
    } finally {
      setCreating(false);
    }
  }

  async function onImportFile(e) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-importing the same file
    if (!file || importing) return;
    setImporting(true);
    try {
      const text = await file.text();
      const parsed = parsePlaylistFile(file.name, text);
      if (!parsed.tracks.length) {
        toast.error('No tracks found in that file.');
        return;
      }
      const { playlist, added, total } = await importPlaylist(parsed, {
        userEmail: user?.email || '',
      });
      toast.success(`Imported “${playlist.name}” — ${added} of ${total} tracks.`);
      navigate(`/playlists/${playlist.id}`);
    } catch (err) {
      toast.error(err?.message || 'Could not import that file.');
    } finally {
      setImporting(false);
    }
  }

  return (
    <div
      className="flex min-h-screen flex-col bg-background pb-40"
      style={{
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
      }}
    >
      <header className="border-b border-border bg-card/80 px-4 py-3">
        <Link
          to="/music"
          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> Library
        </Link>
        <div className="mt-1 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ListMusic className="h-5 w-5 text-primary" />
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Media
              </p>
              <h1 className="text-lg font-semibold leading-tight text-foreground">
                Playlists
              </h1>
            </div>
          </div>
          <Link
            to="/discover"
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border px-3 text-sm font-medium text-foreground hover:bg-accent"
          >
            <Compass className="h-4 w-4" /> Discover
          </Link>
        </div>
      </header>

      <div className="mx-auto w-full max-w-3xl flex-1 space-y-3 px-4 py-4">
        {/* Create */}
        <form onSubmit={create} className="flex items-center gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New playlist name…"
            className="h-10 flex-1 rounded-xl border border-border bg-card px-3 text-sm text-foreground outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={!name.trim() || creating}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Create
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            aria-label="Import playlist"
            title="Import M3U or JSON"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border text-foreground hover:bg-accent disabled:opacity-50"
          >
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".m3u,.m3u8,.json,audio/x-mpegurl,application/json"
            onChange={onImportFile}
            className="hidden"
          />
        </form>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : playlists.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
            <ListMusic className="mx-auto h-8 w-8 text-muted-foreground/60" />
            <p className="mt-3 text-sm font-medium text-foreground">No playlists yet</p>
            <p className="mt-1 text-[12px] text-muted-foreground">
              Create one above, then add tracks from your library.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {playlists.map((p) => {
              const badge = VISIBILITY_BADGE[p.visibility] || VISIBILITY_BADGE.private;
              const Badge = badge.icon;
              return (
                <li key={p.id}>
                  <Link
                    to={`/playlists/${p.id}`}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition-colors hover:bg-accent"
                  >
                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-secondary/40">
                      <ListMusic className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{p.name}</p>
                      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <Badge className="h-3 w-3" /> {badge.label} ·{' '}
                        {p.track_count || 0} track{(p.track_count || 0) === 1 ? '' : 's'}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        {/* Shared with me (collaborative playlists owned by others) */}
        {shared.length > 0 && (
          <div className="space-y-2 pt-2">
            <p className="flex items-center gap-1.5 px-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              <Users className="h-3.5 w-3.5" /> Shared with me
            </p>
            <ul className="space-y-2">
              {shared.map((p) => (
                <li key={p.id}>
                  <Link
                    to={`/collab/${p.id}`}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition-colors hover:bg-accent"
                  >
                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-secondary/40">
                      <Users className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{p.name}</p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        by {p.owner} · {p.track_count || 0} track
                        {(p.track_count || 0) === 1 ? '' : 's'}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
