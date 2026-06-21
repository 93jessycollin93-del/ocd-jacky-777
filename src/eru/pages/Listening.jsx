import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  BarChart3,
  Play,
  Pause,
  Loader2,
  History,
  Flame,
  Music2,
} from 'lucide-react';

import { getListeningStats } from '@/eru/lib/mediaLibrary';
import { useMediaPlayer } from '@/eru/context/MediaPlayerContext';

function fmt(s) {
  if (!s || !Number.isFinite(s)) return '';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}

/** Compact relative time, e.g. "just now", "5m ago", "3d ago". */
function relTime(iso) {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diff = Math.max(0, Date.now() - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return new Date(iso).toLocaleDateString();
}

const TABS = [
  { id: 'recent', label: 'Recent', icon: History },
  { id: 'top', label: 'Most played', icon: Flame },
];

/**
 * Listening — stats from recorded play history (Phase 7). PlayHistory is written
 * on every play, so this needs no new tracking. Shows recently-played and
 * most-played tracks, both playable through the app-wide player.
 */
export default function Listening() {
  const [stats, setStats] = useState({ recent: [], top: [], totalPlays: 0, uniqueTracks: 0 });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('recent');
  const { current, isPlaying, playList, togglePlay } = useMediaPlayer();

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setStats(await getListeningStats());
    } catch {
      setStats({ recent: [], top: [], totalPlays: 0, uniqueTracks: 0 });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const list = tab === 'recent' ? stats.recent : stats.top;

  const onPlay = (index) => {
    const track = list[index];
    if (current?.id === track.id) togglePlay();
    else playList(list, index);
  };

  const hasHistory = stats.totalPlays > 0;

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
        <div className="mt-1 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Media
            </p>
            <h1 className="text-lg font-semibold leading-tight text-foreground">Listening</h1>
          </div>
        </div>
        {hasHistory && (
          <p className="mt-1 text-[11px] text-muted-foreground">
            {stats.totalPlays} play{stats.totalPlays === 1 ? '' : 's'} ·{' '}
            {stats.uniqueTracks} track{stats.uniqueTracks === 1 ? '' : 's'}
          </p>
        )}
      </header>

      <div className="mx-auto w-full max-w-3xl flex-1 space-y-3 px-4 py-4">
        {/* Tabs */}
        {hasHistory && (
          <div className="flex overflow-hidden rounded-xl border border-border">
            {TABS.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex h-10 flex-1 items-center justify-center gap-1.5 text-[13px] font-medium transition-colors ${
                    tab === t.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card text-muted-foreground hover:bg-accent'
                  }`}
                >
                  <Icon className="h-4 w-4" /> {t.label}
                </button>
              );
            })}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : !hasHistory ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
            <Music2 className="mx-auto h-8 w-8 text-muted-foreground/60" />
            <p className="mt-3 text-sm font-medium text-foreground">Nothing played yet</p>
            <p className="mt-1 text-[12px] text-muted-foreground">
              Play tracks from your library and your stats will appear here.
            </p>
            <Link
              to="/music"
              className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90"
            >
              Go to library
            </Link>
          </div>
        ) : list.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-[13px] text-muted-foreground">
            No tracks to show here yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {list.map((track, index) => {
              const active = current?.id === track.id;
              return (
                <li
                  key={track.id}
                  className={`flex items-center gap-3 rounded-2xl border p-2.5 transition-colors ${
                    active ? 'border-primary/40 bg-primary/5' : 'border-border bg-card'
                  }`}
                >
                  {tab === 'top' && (
                    <span className="w-5 flex-shrink-0 text-center text-[13px] font-semibold tabular-nums text-muted-foreground">
                      {index + 1}
                    </span>
                  )}
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
                  <span className="flex-shrink-0 text-[11px] tabular-nums text-muted-foreground">
                    {tab === 'top'
                      ? `${track.plays} play${track.plays === 1 ? '' : 's'}`
                      : relTime(track.played_at)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
