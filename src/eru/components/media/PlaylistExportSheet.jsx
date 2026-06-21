import { X, FileText, FileJson, Download } from 'lucide-react';
import { toast } from 'sonner';

import { toM3U, toPlaylistJSON, downloadText, slugify } from '@/eru/lib/playlistIO';

/**
 * PlaylistExportSheet — download a playlist as M3U (interop with other players)
 * or JSON (lossless eru-playlist round-trip). Pure client-side; serialization
 * lives in playlistIO.
 */
export default function PlaylistExportSheet({ playlist, tracks = [], onClose }) {
  const base = slugify(playlist?.name);

  function exportM3U() {
    if (!tracks.length) return;
    downloadText(`${base}.m3u`, toM3U(playlist, tracks), 'audio/x-mpegurl');
    toast.success('Exported as M3U.');
    onClose?.();
  }

  function exportJSON() {
    if (!tracks.length) return;
    const json = JSON.stringify(toPlaylistJSON(playlist, tracks), null, 2);
    downloadText(`${base}.json`, json, 'application/json');
    toast.success('Exported as JSON.');
    onClose?.();
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Export playlist"
    >
      <div
        className="mx-auto w-full max-w-screen-sm rounded-t-2xl border border-border bg-card p-4"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Download className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Export playlist</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-accent"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <div className="space-y-2">
          <button
            onClick={exportM3U}
            disabled={!tracks.length}
            className="flex w-full items-center gap-3 rounded-xl border border-border bg-background/40 p-3 text-left hover:bg-accent disabled:opacity-50"
          >
            <FileText className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">M3U</p>
              <p className="text-[11px] text-muted-foreground">
                Standard playlist file other players can open.
              </p>
            </div>
          </button>
          <button
            onClick={exportJSON}
            disabled={!tracks.length}
            className="flex w-full items-center gap-3 rounded-xl border border-border bg-background/40 p-3 text-left hover:bg-accent disabled:opacity-50"
          >
            <FileJson className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">JSON</p>
              <p className="text-[11px] text-muted-foreground">
                Full backup that re-imports here exactly.
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
