import { useRef, useState } from 'react';
import { ImagePlus, Upload, Loader2, Trash2, Video } from 'lucide-react';
import { base44 } from '@/eru/api/base44Client';

/**
 * MediaUploader
 * ------------------------------------------------------------------
 * Compact, reusable uploader for storefront listings. Handles:
 *   • Picking files (image or video) from the device — works in
 *     Telegram Mini App / mobile browsers via native <input type="file">.
 *   • Uploading them through base44.integrations.Core.UploadFile.
 *   • Pasting an existing media URL (kept for backwards-compat).
 *   • Previewing each item, including videos.
 *   • Removing individual items.
 *
 * Props:
 *   urls       — string[] of current media URLs (filtered + non-empty).
 *   onChange(next) — replace the array with `next`.
 *   max        — soft cap for items (default 6).
 */
const MAX_SIZE_MB = 25;
const ACCEPT = 'image/*,video/*';

function isVideo(url = '') { return /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url); }

export default function MediaUploader({ urls = [], onChange, max = 6 }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [pasting, setPasting] = useState('');
  const [error, setError] = useState('');

  const update = (next) => onChange(next.filter((u, i, arr) => u && arr.indexOf(u) === i).slice(0, max));

  const handleFiles = async (fileList) => {
    setError('');
    const files = Array.from(fileList || []);
    if (!files.length) return;
    const slot = Math.max(0, max - urls.length);
    if (slot === 0) { setError(`Limit of ${max} files reached.`); return; }

    setUploading(true);
    try {
      const accepted = files.slice(0, slot);
      const uploaded = [];
      for (const file of accepted) {
        if (file.size > MAX_SIZE_MB * 1024 * 1024) {
          setError(`${file.name} is over ${MAX_SIZE_MB}MB — skipped.`);
          continue;
        }
        const res = await base44.integrations.Core.UploadFile({ file });
        if (res?.file_url) uploaded.push(res.file_url);
      }
      if (uploaded.length) update([...urls, ...uploaded]);
    } catch (err) {
      setError(err?.message || 'Upload failed.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handlePaste = () => {
    if (!pasting.trim()) return;
    if (urls.length >= max) { setError(`Limit of ${max} items reached.`); return; }
    update([...urls, pasting.trim()]);
    setPasting('');
  };

  const removeAt = (idx) => update(urls.filter((_, i) => i !== idx));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Media for buyers <span className="text-muted-foreground/60">({urls.length}/{max})</span></p>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading || urls.length >= max}
          className="flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary disabled:opacity-50"
        >
          {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
          {uploading ? 'Uploading…' : 'Upload'}
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {urls.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {urls.map((url, idx) => (
            <div key={`${url}-${idx}`} className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-secondary">
              {isVideo(url) ? (
                <video src={url} className="h-full w-full object-cover" muted />
              ) : (
                <img src={url} alt={`media-${idx}`} className="h-full w-full object-cover" loading="lazy" />
              )}
              <button
                type="button"
                onClick={() => removeAt(idx)}
                className="absolute right-1 top-1 rounded-md bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
                aria-label="Remove media"
              >
                <Trash2 className="h-3 w-3" />
              </button>
              {isVideo(url) && (
                <span className="absolute bottom-1 left-1 inline-flex items-center gap-0.5 rounded bg-black/60 px-1 py-0.5 text-[9px] text-white">
                  <Video className="h-2.5 w-2.5" /> video
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          value={pasting}
          onChange={(e) => setPasting(e.target.value)}
          placeholder="Or paste an image / video URL"
          className="flex-1 rounded-lg border border-border bg-secondary px-3 py-2 text-xs outline-none"
        />
        <button
          type="button"
          onClick={handlePaste}
          disabled={!pasting.trim() || urls.length >= max}
          className="rounded-lg border border-border bg-secondary px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          <ImagePlus className="h-3.5 w-3.5" />
        </button>
      </div>

      {error && <p className="text-[11px] text-destructive">{error}</p>}
    </div>
  );
}