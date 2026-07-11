import { useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ListMusic,
  Music2,
  SlidersHorizontal,
} from 'lucide-react';
import { useMediaPlayer } from '@/eru/context/MediaPlayerContext';
import QueuePanel from './QueuePanel';
import PlaybackSettingsSheet from './PlaybackSettingsSheet';

/** Seconds -> m:ss */
function fmt(s) {
  if (!s || !Number.isFinite(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}

/**
 * PersistentPlayer — the root-level mini-player bar.
 *
 * Mounted once in Layout (outside the route-swapping <Outlet>), so it keeps
 * playing and stays visible as the user moves between sections. Renders nothing
 * until a track is loaded. Sits just above the mobile tab bar; flush to the
 * bottom on desktop.
 */
export default function PersistentPlayer() {
  const {
    current,
    isPlaying,
    position,
    duration,
    queue,
    togglePlay,
    next,
    previous,
    seek,
  } = useMediaPlayer();
  const [queueOpen, setQueueOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  if (!current) return null;

  const dur = duration || current.duration_sec || 0;
  const pct = dur ? Math.min(100, (position / dur) * 100) : 0;

  return (
    <>
      <div
        className="fixed inset-x-0 z-40 border-t border-border bg-card/95 backdrop-blur-md"
        style={{
          // Clear the fixed mobile tab bar on phones; flush to bottom on md+.
          bottom: 'calc(env(safe-area-inset-bottom, 0px))',
        }}
      >
        <div className="mx-auto w-full max-w-screen-xl px-3 pb-[60px] pt-2 md:pb-2">
          {/* Seek scrubber */}
          <div className="mb-2 flex items-center gap-2">
            <span className="w-9 text-right text-[10px] tabular-nums text-muted-foreground">
              {fmt(position)}
            </span>
            <div className="relative flex-1">
              <input
                type="range"
                min={0}
                max={dur || 0}
                step={0.1}
                value={Math.min(position, dur)}
                onChange={(e) => seek(Number(e.target.value))}
                aria-label="Seek"
                className="w-full cursor-pointer accent-primary"
              />
              <div
                className="pointer-events-none absolute left-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-primary/40"
                style={{ width: `${pct}%` }}
                aria-hidden="true"
              />
            </div>
            <span className="w-9 text-[10px] tabular-nums text-muted-foreground">
              {fmt(dur)}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Cover / placeholder */}
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-secondary/40">
              {current.cover_url ? (
                <img src={current.cover_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <Music2 className="h-5 w-5 text-muted-foreground" />
              )}
            </div>

            {/* Title / artist */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">
                {current.title || 'Untitled'}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                {current.artist || 'Unknown artist'}
              </p>
            </div>

            {/* Transport */}
            <div className="flex items-center gap-1">
              <button
                onClick={previous}
                aria-label="Previous"
                className="flex h-9 w-9 items-center justify-center rounded-full text-foreground hover:bg-accent"
              >
                <SkipBack className="h-4 w-4" />
              </button>
              <button
                onClick={togglePlay}
                aria-label={isPlaying ? 'Pause' : 'Play'}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow hover:bg-primary/90"
              >
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </button>
              <button
                onClick={next}
                aria-label="Next"
                className="flex h-9 w-9 items-center justify-center rounded-full text-foreground hover:bg-accent"
              >
                <SkipForward className="h-4 w-4" />
              </button>
              <button
                onClick={() => setQueueOpen(true)}
                aria-label="Up next"
                className="relative flex h-9 w-9 items-center justify-center rounded-full text-foreground hover:bg-accent"
              >
                <ListMusic className="h-4 w-4" />
                {queue.length > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                    {queue.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setSettingsOpen(true)}
                aria-label="Playback settings"
                className="flex h-9 w-9 items-center justify-center rounded-full text-foreground hover:bg-accent"
              >
                <SlidersHorizontal className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {queueOpen && <QueuePanel onClose={() => setQueueOpen(false)} />}
      {settingsOpen && <PlaybackSettingsSheet onClose={() => setSettingsOpen(false)} />}
    </>
  );
}
