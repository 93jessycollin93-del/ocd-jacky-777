import { useEffect, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Play,
  Pause,
  Loader2,
  Music2,
  Globe,
  Link2,
  Lock,
  ListPlus,
} from 'lucide-react';
import { toast } from 'sonner';

import { getSharedPlaylist } from '@/eru/lib/mediaLibrary';
import { useMediaPlayer } from '@/eru/context/MediaPlayerContext';

const VISIBILITY_BADGE = {
  private: { icon: Lock, label: 'Private' },
  unlisted: { icon: Link2, label: 'Unlisted' },
  public: { icon: Globe, label: 'Public' },
};

function fmt(s) {
  if (!s || !Number.isFinite(s)) return '';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}

/**
 * SharedPlaylist — public view of a shared (public/unlisted) playlist at /p/:id.
 *
 * Reads through the getSharedPlaylist server function, which only returns
 * public/unlisted playlists (or the owner's own); private playlists resolve to a
 * "not available" message. Any authenticated viewer can play the tracks through
 * the app-wide persistent player.
 */
export default function SharedPlaylist() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { current, isPlaying, playList, togglePlay, addManyToQueue } = useMediaPlayer();

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getSharedPlaylist(id);
      if (!result?.playlist) {
        setError('This playlist is private or unavailable.');
      } else {
        setData(result);
      }
    } catch {
      setError('This playlist is private or unavailable.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const tracks = data?.tracks || [];
  const playlist = data?.playlist;

  const onPlay = (index) => {
    const track = tracks[index];
    if (current?.id === track.id) togglePlay();
    else playList(tracks, index);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (error || !playlist) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background p-6 text-center">
        <Lock className="h-8 w-8 text-muted-foreground/60" />
        <p className="max-w-xs text-sm text-foreground">{error || 'Playlist not available.'}</p>
        <Link to="/music" className="text-[13px] text-primary hover:underline">
          Go to your library
        </Link>
      </div>
    );
  }

  const badge = VISIBILITY_BADGE[playlist.visibility] || VISIBILITY_BADGE.unlisted;
  const Badge = badge.icon;

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
        <div className="mt-1">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Shared playlist
          </p>
          <h1 className="text-xl font-semibold leading-tight text-foreground">{playlist.name}</h1>
          {playlist.description && (
            <p className="mt-0.5 line-clamp-2 text-[12px] text-muted-foreground">
              {playlist.description}
            </p>
          )}
          <p className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Badge className="h-3 w-3" /> {badge.label} · by {playlist.owner} · {tracks.length} track
            {tracks.length === 1 ? '' : 's'}
          </p>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={() => tracks.length && playList(tracks, 0)}
            disabled={tracks.length === 0}
            className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
          >
            <Play className="h-4 w-4" /> Play all
          </button>
          <button
            onClick={() => {
              if (!tracks.length) return;
              addManyToQueue(tracks);
              toast.success(`Added ${tracks.length} to the queue.`);
            }}
            disabled={tracks.length === 0}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-border px-3 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50"
          >
            <ListPlus className="h-4 w-4" /> Queue
          </button>
        </div>
      </header>

      <div className="mx-auto w-full max-w-3xl flex-1 space-y-2 px-4 py-4">
        {tracks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
            <Music2 className="mx-auto h-8 w-8 text-muted-foreground/60" />
            <p className="mt-3 text-sm font-medium text-foreground">This playlist is empty.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {tracks.map((track, index) => {
              const active = current?.id === track.id;
              return (
                <li
                  key={track.id}
                  className={`flex items-center gap-3 rounded-2xl border p-2.5 transition-colors ${
                    active ? 'border-primary/40 bg-primary/5' : 'border-border bg-card'
                  }`}
                >
                  <span className="w-5 flex-shrink-0 text-center text-[12px] tabular-nums text-muted-foreground">
                    {index + 1}
                  </span>
                  <button
                    onClick={() => onPlay(index)}
                    aria-label={active && isPlaying ? 'Pause' : 'Play'}
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow hover:bg-primary/90"
                  >
                    {active && isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{track.title}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {track.artist || 'Unknown artist'}
                      {track.duration_sec ? ` · ${fmt(track.duration_sec)}` : ''}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
