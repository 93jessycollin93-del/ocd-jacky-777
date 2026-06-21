import { X, Trash2, Play, Music2, GripVertical } from 'lucide-react';
import { useMediaPlayer } from '@/eru/context/MediaPlayerContext';

/**
 * QueuePanel — the temporary "up next" queue, shown as a bottom sheet.
 *
 * This queue is separate from saved playlists: adding to it never edits a
 * playlist. Shows the now-playing track plus upcoming tracks; supports tap-to-
 * play, remove, and clear. (Drag-to-reorder of the queue arrives with the
 * playlist drag-reorder phase.)
 */
export default function QueuePanel({ onClose }) {
  const { current, queue, playFromQueue, removeFromQueue, clearQueue } = useMediaPlayer();

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Play queue"
    >
      <div
        className="mx-auto w-full max-w-screen-sm rounded-t-2xl border border-border bg-card p-4"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Up next</h2>
          <div className="flex items-center gap-2">
            {queue.length > 0 && (
              <button
                onClick={clearQueue}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] text-muted-foreground hover:bg-accent"
              >
                <Trash2 className="h-3 w-3" /> Clear
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="Close"
              className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-accent"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Now playing */}
        {current && (
          <div className="mb-3">
            <p className="mb-1 text-[10px] uppercase tracking-widest text-muted-foreground">
              Now playing
            </p>
            <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/10 p-2">
              <Music2 className="h-4 w-4 flex-shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{current.title}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {current.artist || 'Unknown artist'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Queue list */}
        {queue.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-secondary/20 p-4 text-center text-[11px] text-muted-foreground">
            The queue is empty. Use “Add to queue” on any track.
          </p>
        ) : (
          <ul className="max-h-[50vh] space-y-1 overflow-y-auto">
            {queue.map((track, index) => (
              <li
                key={`${track.id}-${index}`}
                className="flex items-center gap-2 rounded-xl border border-border bg-background/40 p-2"
              >
                <GripVertical className="h-4 w-4 flex-shrink-0 text-muted-foreground/50" />
                <button
                  onClick={() => playFromQueue(index)}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <Play className="h-3.5 w-3.5 flex-shrink-0 text-primary" />
                  <div className="min-w-0">
                    <p className="truncate text-sm text-foreground">{track.title}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {track.artist || 'Unknown artist'}
                    </p>
                  </div>
                </button>
                <button
                  onClick={() => removeFromQueue(index)}
                  aria-label="Remove from queue"
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full hover:bg-accent"
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
