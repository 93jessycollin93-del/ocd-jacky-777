import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X, Youtube, Loader2, CheckCircle2, AlertTriangle,
  Music, Clock, AlertCircle, Play,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  isYouTubeUrl, isPlaylistUrl, isConverterConfigured,
  fetchMediaMetadata, convertMedia, friendlyConverterError, ACK_TERMS,
} from '@/eru/lib/mediaConverter';
import { importConvertedTrack, listTracks } from '@/eru/lib/mediaLibrary';
import { useMediaPlayer } from '@/eru/context/MediaPlayerContext';

/** Hash a string to a consistent integer for colour selection. */
function hashStr(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const GRADIENT_PALETTES = [
  'from-violet-600 to-indigo-500',
  'from-rose-500 to-pink-400',
  'from-emerald-600 to-teal-400',
  'from-orange-500 to-amber-400',
  'from-cyan-600 to-blue-500',
  'from-fuchsia-600 to-purple-500',
];

function CoverPlaceholder({ title, className = '' }) {
  const idx = hashStr(title || '') % GRADIENT_PALETTES.length;
  const initials = (title || '?')
    .split(/\s+/).slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '').join('');
  return (
    <div className={`bg-gradient-to-br ${GRADIENT_PALETTES[idx]} flex items-center justify-center rounded-lg ${className}`}>
      <span className="text-xs font-bold text-white/90 select-none">{initials}</span>
    </div>
  );
}

function fmt(s) {
  if (!s || s <= 0) return '?:??';
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

const AUDIO_FORMATS = [
  { id: 'mp3', label: 'MP3' },
  { id: 'm4a', label: 'M4A' },
  { id: 'wav', label: 'WAV' },
];

export default function YouTubeImportSheet({ open, onClose }) {
  const navigate = useNavigate();
  const { playTrack } = useMediaPlayer();

  const [url, setUrl] = useState('');
  const [previewing, setPreviewing] = useState(false);
  const [meta, setMeta] = useState(null);   // { title, artist, duration_sec, cover_url }
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [format, setFormat] = useState('mp3');
  const [acknowledged, setAcknowledged] = useState(false);
  const [metaError, setMetaError] = useState('');
  const [warn, setWarn] = useState('');

  // convert state
  const [converting, setConverting] = useState(false);
  const [savedTrack, setSavedTrack] = useState(null);
  const [convertError, setConvertError] = useState('');

  // duplicate detection
  const [dupTrack, setDupTrack] = useState(null);
  const [dupConfirmed, setDupConfirmed] = useState(false);

  const previewTimer = useRef(null);
  const abortRef = useRef(null);

  const configured = isConverterConfigured();

  // Reset on open/close
  useEffect(() => {
    if (!open) {
      clearTimeout(previewTimer.current);
      abortRef.current?.abort();
      setUrl(''); setMeta(null); setTitle(''); setArtist('');
      setMetaError(''); setWarn(''); setConverting(false);
      setSavedTrack(null); setConvertError('');
      setDupTrack(null); setDupConfirmed(false);
      setAcknowledged(false);
    }
  }, [open]);

  // Debounced metadata + dup check on URL change
  useEffect(() => {
    clearTimeout(previewTimer.current);
    setMeta(null); setMetaError(''); setWarn('');
    setSavedTrack(null); setConvertError('');
    setDupTrack(null); setDupConfirmed(false);

    const trimmed = url.trim();
    if (!trimmed || !isYouTubeUrl(trimmed)) return;

    if (isPlaylistUrl(trimmed)) {
      setMetaError('Paste a single video URL, not a playlist.');
      return;
    }

    previewTimer.current = setTimeout(async () => {
      setPreviewing(true);
      try {
        // Run metadata fetch + dup check in parallel
        const [data, existing] = await Promise.all([
          fetchMediaMetadata(trimmed),
          listTracks({ limit: 500 }).catch(() => []),
        ]);

        // Dup detection by source_url
        const dup = existing.find((t) => t.source_url === trimmed || t.file_url === trimmed);
        if (dup) setDupTrack(dup);

        if (data) {
          setMeta(data);
          setTitle(data.title || '');
          setArtist(data.artist || data.uploader || 'YouTube');
          if ((data.duration_sec || 0) > 3600) {
            setWarn('This video is over an hour — conversion may take several minutes.');
          }
          if (data.is_live || data.live_status === 'is_live' || data.live_status === 'is_upcoming') {
            setMetaError("This looks like a live stream or premiere. Try a finished video.");
          }
        } else {
          // Metadata failed — editable fallback
          setTitle('Unknown title');
          setArtist('YouTube');
        }
      } catch {
        setTitle('Unknown title');
        setArtist('YouTube');
      } finally {
        setPreviewing(false);
      }
    }, 800);

    return () => clearTimeout(previewTimer.current);
  }, [url]);

  const urlIsYt = isYouTubeUrl(url.trim());
  const urlInvalid = url.length > 5 && !urlIsYt;
  const metaReady = !previewing && (meta !== null || title); // has something to show
  const isLive = !!(meta?.is_live || meta?.live_status === 'is_live' || meta?.live_status === 'is_upcoming');
  const canConvert = configured && urlIsYt && !isPlaylistUrl(url.trim()) && !isLive
    && metaReady && title && acknowledged && !converting && !savedTrack;

  async function handleConvert() {
    if (!canConvert) return;
    setConvertError('');
    setConverting(true);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const { blob, filename } = await convertMedia({
        url: url.trim(),
        format,
        acknowledged: true,
        signal: controller.signal,
      });

      const track = await importConvertedTrack({
        blob,
        filename,
        sourceUrl: url.trim(),
        format,
        metadata: {
          title: title.trim() || 'Unknown title',
          artist: artist.trim() || 'YouTube',
          duration_sec: meta?.duration_sec || 0,
          cover_url: meta?.cover_url || meta?.thumbnail || '',
        },
      });

      setSavedTrack(track);
      toast.success('Added to your library.');
    } catch (err) {
      if (err?.name === 'AbortError') {
        setConvertError('Conversion cancelled.');
      } else {
        setConvertError(friendlyConverterError(err));
      }
    } finally {
      setConverting(false);
      abortRef.current = null;
    }
  }

  function handleImportAnother() {
    setUrl(''); setMeta(null); setTitle(''); setArtist('');
    setMetaError(''); setWarn(''); setConverting(false);
    setSavedTrack(null); setConvertError('');
    setDupTrack(null); setDupConfirmed(false);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-3xl border-t border-border bg-card shadow-2xl"
        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 0px))' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border/50">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-500/15">
              <Youtube className="h-4 w-4 text-red-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Import from YouTube</p>
              <p className="text-[10px] text-muted-foreground">Convert & save to your library</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 px-5 pt-3 pb-3 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 60px)' }}>
          {/* Converter not configured */}
          {!configured && (
            <div className="flex items-start gap-2 rounded-xl border border-yellow-500/40 bg-yellow-500/10 px-3 py-2.5">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-yellow-400" />
              <p className="text-[11px] text-yellow-200">
                The converter service isn't configured. Set <code className="font-mono">VITE_MEDIA_CONVERTER_URL</code> to enable imports.
              </p>
            </div>
          )}

          {/* URL input */}
          <div>
            <input
              type="url"
              inputMode="url"
              autoComplete="off"
              placeholder="https://www.youtube.com/watch?v=…"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={converting}
              className="w-full rounded-xl border border-border bg-secondary/60 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/40 disabled:opacity-60"
            />
            {urlInvalid && (
              <p className="mt-1 text-[11px] text-destructive">
                That doesn't look like a YouTube URL.
              </p>
            )}
          </div>

          {/* Loading skeleton */}
          {previewing && (
            <div className="flex items-center gap-2 rounded-xl border border-border bg-secondary/40 px-3 py-2.5">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <p className="text-[12px] text-muted-foreground">Fetching video info…</p>
            </div>
          )}

          {/* Error (metadata/livestream) */}
          {metaError && !previewing && (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
              <p className="text-[12px] text-destructive">{metaError}</p>
            </div>
          )}

          {/* Long video warning */}
          {warn && !previewing && !metaError && (
            <div className="flex items-start gap-2 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-3 py-2.5">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-yellow-400" />
              <p className="text-[12px] text-yellow-300">{warn}</p>
            </div>
          )}

          {/* Duplicate warning */}
          {dupTrack && !dupConfirmed && !savedTrack && (
            <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-3 py-2.5 space-y-1.5">
              <p className="text-[12px] text-yellow-300">
                "<span className="font-medium">{dupTrack.title}</span>" is already in your library.
              </p>
              <button
                onClick={() => setDupConfirmed(true)}
                className="text-[11px] underline text-yellow-400 hover:text-yellow-300"
              >
                Import again anyway
              </button>
            </div>
          )}

          {/* Editable metadata — show once we have a URL and not loading */}
          {urlIsYt && !previewing && !metaError && title !== '' && !savedTrack && (
            <div className="rounded-xl border border-border bg-secondary/30 overflow-hidden">
              <div className="flex gap-3 p-3">
                <div className="flex-shrink-0">
                  {(meta?.cover_url || meta?.thumbnail) ? (
                    <img
                      src={meta.cover_url || meta.thumbnail}
                      alt=""
                      className="h-16 w-16 rounded-lg object-cover"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  ) : (
                    <CoverPlaceholder title={title} className="h-16 w-16" />
                  )}
                </div>
                <div className="flex-1 min-w-0 space-y-1.5">
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Title"
                    disabled={converting}
                    className="w-full rounded-lg border border-border bg-secondary/60 px-2 py-1 text-[12px] font-medium text-foreground placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/30 disabled:opacity-50"
                  />
                  <input
                    type="text"
                    value={artist}
                    onChange={(e) => setArtist(e.target.value)}
                    placeholder="Artist / Channel"
                    disabled={converting}
                    className="w-full rounded-lg border border-border bg-secondary/60 px-2 py-1 text-[11px] text-muted-foreground placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/30 disabled:opacity-50"
                  />
                  {meta?.duration_sec > 0 && (
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{fmt(meta.duration_sec)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Format selector */}
          {urlIsYt && !previewing && !metaError && !savedTrack && (
            <div className="flex gap-2">
              {AUDIO_FORMATS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFormat(f.id)}
                  disabled={converting}
                  className={`inline-flex h-9 flex-1 items-center justify-center rounded-xl border text-[12px] font-medium transition-colors disabled:opacity-50 ${
                    format === f.id
                      ? 'border-primary bg-primary/15 text-primary'
                      : 'border-border bg-transparent text-foreground hover:bg-accent'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}

          {/* Terms acknowledgment */}
          {urlIsYt && !previewing && !metaError && !savedTrack && (
            <label className="flex cursor-pointer items-start gap-2.5">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                disabled={converting}
                className="mt-0.5 accent-primary"
              />
              <span className="text-[11px] leading-relaxed text-muted-foreground">{ACK_TERMS}</span>
            </label>
          )}

          {/* Convert error */}
          {convertError && (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
              <p className="text-[12px] text-destructive">{convertError}</p>
            </div>
          )}

          {/* Converting progress */}
          {converting && (
            <div className="flex items-center gap-2 rounded-xl border border-border bg-secondary/40 px-3 py-2.5">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <p className="text-[12px] text-muted-foreground">
                Converting… this can take a minute for longer videos.
              </p>
            </div>
          )}

          {/* Success */}
          {savedTrack && (
            <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2.5">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <p className="text-[12px] font-medium text-primary">Added to library!</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            {!savedTrack ? (
              <button
                onClick={handleConvert}
                disabled={!canConvert || (dupTrack && !dupConfirmed)}
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                {converting ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Converting…</>
                ) : (
                  <><Music className="h-4 w-4" /> Convert &amp; save to library</>
                )}
              </button>
            ) : (
              <>
                <button
                  onClick={() => { playTrack(savedTrack); onClose(); }}
                  className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground"
                >
                  <Play className="h-4 w-4" /> Play now
                </button>
                <button
                  onClick={handleImportAnother}
                  className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-transparent text-sm font-medium text-foreground hover:bg-secondary/60"
                >
                  Import another
                </button>
                <button
                  onClick={() => { onClose(); navigate('/music'); }}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-transparent px-3 text-sm font-medium text-foreground hover:bg-secondary/60"
                >
                  Library
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}