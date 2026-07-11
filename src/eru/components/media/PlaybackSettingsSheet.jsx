import { X, SlidersHorizontal } from 'lucide-react';
import { useMediaPlayer } from '@/eru/context/MediaPlayerContext';

const PRESETS = [0, 3, 6, 9, 12];

/**
 * PlaybackSettingsSheet — playback preferences (Phase 8).
 *
 * Currently a single control: crossfade duration. 0 seconds means gapless (the
 * preloaded next track starts the instant the current one ends); higher values
 * overlap the two tracks for that many seconds. The value persists via
 * MediaPlayerContext.
 */
export default function PlaybackSettingsSheet({ onClose }) {
  const { crossfade, setCrossfade } = useMediaPlayer();

  const label =
    crossfade === 0 ? 'Off · gapless' : `${crossfade} second${crossfade === 1 ? '' : 's'}`;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Playback settings"
    >
      <div
        className="mx-auto w-full max-w-screen-sm rounded-t-2xl border border-border bg-card p-4"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Playback</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-accent"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">Crossfade</p>
          <span className="text-[12px] tabular-nums text-muted-foreground">{label}</span>
        </div>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Overlap the end of one track with the start of the next. Set to off for
          gapless playback.
        </p>

        <input
          type="range"
          min={0}
          max={12}
          step={1}
          value={crossfade}
          onChange={(e) => setCrossfade(Number(e.target.value))}
          aria-label="Crossfade seconds"
          className="mt-3 w-full cursor-pointer accent-primary"
        />

        <div className="mt-2 flex items-center justify-between">
          {PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => setCrossfade(p)}
              className={`rounded-lg px-2 py-1 text-[11px] font-medium transition-colors ${
                crossfade === p
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent'
              }`}
            >
              {p === 0 ? 'Off' : `${p}s`}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
