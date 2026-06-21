import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Music,
  Film,
  Download,
  Link2,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  LibraryBig,
  Youtube,
} from 'lucide-react';
import YouTubeImportSheet from '@/eru/components/media/YouTubeImportSheet';
import { toast } from 'sonner';

import { Input } from '@/eru/components/ui/input';
import { Checkbox } from '@/eru/components/ui/checkbox';
import {
  AUDIO_FORMATS,
  VIDEO_FORMATS,
  ACK_TERMS,
  CONVERTER_BASE_URL,
  isConverterConfigured,
  isHttpUrl,
  isValidFormat,
  convertMedia,
  triggerDownload,
  friendlyConverterError,
} from '@/eru/lib/mediaConverter';
import { importConvertedTrack } from '@/eru/lib/mediaLibrary';

/**
 * MediaConverter — paste a YouTube/TikTok/etc. URL and download it as audio
 * (MP3/M4A/WAV) or an MP4 video (240p–1080p).
 *
 * The heavy lifting (yt-dlp + ffmpeg) happens in the standalone converter
 * service, because those tools can't run on the Base44 serverless backend.
 * This page just collects input, enforces the terms acknowledgment, and streams
 * the result back as a download. Configure VITE_MEDIA_CONVERTER_URL to point at
 * your deployed service.
 */
export default function MediaConverter() {
  const [ytSheetOpen, setYtSheetOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [format, setFormat] = useState('mp3');
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [lastResult, setLastResult] = useState(null); // { blob, filename } for "Save to library"
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const abortRef = useRef(null);

  const configured = isConverterConfigured();
  const urlValid = isHttpUrl(url);
  const canSubmit =
    configured && urlValid && isValidFormat(format) && acknowledged && !busy;

  async function handleConvert(e) {
    e?.preventDefault();
    if (!canSubmit) return;

    setBusy(true);
    setDone(false);
    setLastResult(null);
    setSaved(false);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const { blob, filename } = await convertMedia({
        url: url.trim(),
        format,
        acknowledged: true,
        signal: controller.signal,
      });
      triggerDownload(blob, filename);
      setLastResult({ blob, filename });
      setDone(true);
      toast.success('Conversion ready — your download should start.');
    } catch (err) {
      if (err?.name === 'AbortError') {
        toast('Conversion cancelled.');
      } else {
        toast.error(friendlyConverterError(err));
      }
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  }

  function handleCancel() {
    abortRef.current?.abort();
  }

  async function handleSaveToLibrary() {
    if (!lastResult || saving) return;
    setSaving(true);
    try {
      await importConvertedTrack({
        blob: lastResult.blob,
        filename: lastResult.filename,
        sourceUrl: url.trim(),
        format,
      });
      setSaved(true);
      toast.success('Saved to your library.');
    } catch (err) {
      toast.error(err?.message || 'Could not save to library.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="flex min-h-screen flex-col bg-background pb-24"
      style={{
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
      }}
    >
      {/* Header */}
      <header className="border-b border-border bg-card/80 px-4 py-3">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> Home
        </Link>
        <div className="mt-1 flex items-center gap-2">
          <Music className="h-5 w-5 text-primary" />
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Tools
            </p>
            <h1 className="text-lg font-semibold leading-tight text-foreground">
              Media Converter
            </h1>
          </div>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Paste a link, pick a format, and download it as audio or video.
        </p>
      </header>

      <div className="mx-auto w-full max-w-3xl flex-1 space-y-4 px-4 py-4">
        {/* Not-configured notice */}
        {!configured && (
          <div className="flex items-start gap-2 rounded-2xl border border-yellow-500/40 bg-yellow-500/10 p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-yellow-400" />
            <p className="text-[11px] text-yellow-200">
              The converter service isn&apos;t configured yet. Set{' '}
              <code className="font-mono">VITE_MEDIA_CONVERTER_URL</code> to your
              deployed service URL and rebuild.
            </p>
          </div>
        )}

        {/* YouTube quick-import shortcut */}
        <button
          type="button"
          onClick={() => setYtSheetOpen(true)}
          className="flex w-full items-center gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-left transition-colors hover:bg-red-500/15"
        >
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-red-500/20">
            <Youtube className="h-5 w-5 text-red-400" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Import from YouTube</p>
            <p className="text-[11px] text-muted-foreground">
              Paste a YouTube URL → preview metadata → save straight to your library
            </p>
          </div>
        </button>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">or convert &amp; download</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={handleConvert} className="space-y-4">
          {/* URL input */}
          <section className="rounded-2xl border border-border bg-card p-4">
            <label
              htmlFor="media-url"
              className="mb-2 flex items-center gap-2 text-xs font-semibold text-foreground"
            >
              <Link2 className="h-3.5 w-3.5 text-primary" /> Media URL
            </label>
            <Input
              id="media-url"
              type="url"
              inputMode="url"
              autoComplete="off"
              placeholder="https://www.youtube.com/watch?v=…"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setDone(false);
              }}
              disabled={busy}
            />
            {url && !urlValid && (
              <p className="mt-1.5 text-[11px] text-destructive">
                Enter a valid http(s) URL.
              </p>
            )}
          </section>

          {/* Format selector — tappable buttons */}
          <section className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-foreground">
              <Music className="h-3.5 w-3.5 text-primary" /> Audio
            </div>
            <div className="grid grid-cols-3 gap-2">
              {AUDIO_FORMATS.map((f) => (
                <FormatButton
                  key={f.id}
                  active={format === f.id}
                  disabled={busy}
                  onClick={() => setFormat(f.id)}
                  label={f.label}
                />
              ))}
            </div>

            <div className="mb-2 mt-4 flex items-center gap-2 text-xs font-semibold text-foreground">
              <Film className="h-3.5 w-3.5 text-primary" /> Video (MP4)
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {VIDEO_FORMATS.map((f) => (
                <FormatButton
                  key={f.id}
                  active={format === f.id}
                  disabled={busy}
                  onClick={() => setFormat(f.id)}
                  label={f.label}
                />
              ))}
            </div>
          </section>

          {/* Terms acknowledgment */}
          <section className="rounded-2xl border border-border bg-card p-4">
            <label className="flex cursor-pointer items-start gap-3">
              <Checkbox
                checked={acknowledged}
                onCheckedChange={(v) => setAcknowledged(v === true)}
                disabled={busy}
                className="mt-0.5"
              />
              <span className="text-[11px] leading-relaxed text-muted-foreground">
                {ACK_TERMS}
              </span>
            </label>
          </section>

          {/* Action */}
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Converting…
                </>
              ) : done ? (
                <>
                  <CheckCircle2 className="h-4 w-4" /> Done — convert another
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" /> Convert &amp; download
                </>
              )}
            </button>
            {busy && (
              <button
                type="button"
                onClick={handleCancel}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-border bg-transparent px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                Cancel
              </button>
            )}
          </div>

          {busy && (
            <p className="text-center text-[11px] text-muted-foreground">
              Downloading and transcoding on the server — this can take a moment
              for longer videos.
            </p>
          )}

          {/* After a successful conversion, offer to save it into the library
              so it plays in the app's persistent player. */}
          {lastResult && !busy && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSaveToLibrary}
                disabled={saving || saved}
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/10 text-sm font-semibold text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                  </>
                ) : saved ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" /> Saved
                  </>
                ) : (
                  <>
                    <LibraryBig className="h-4 w-4" /> Save to library
                  </>
                )}
              </button>
              {saved && (
                <Link
                  to="/music"
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-border px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent"
                >
                  Open
                </Link>
              )}
            </div>
          )}
        </form>

        {/* Tiny footer hint about where the work happens */}
        {configured && (
          <p className="text-center text-[10px] text-muted-foreground/70">
            Powered by your converter service at{' '}
            <span className="font-mono">{CONVERTER_BASE_URL}</span>
          </p>
        )}
      </div>

      <YouTubeImportSheet open={ytSheetOpen} onClose={() => setYtSheetOpen(false)} />
    </div>
  );
}

/** A single tappable format button, styled to match the app's buttons. */
function FormatButton({ active, disabled, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={
        'inline-flex h-10 items-center justify-center rounded-xl border text-sm font-medium transition-colors disabled:opacity-50 ' +
        (active
          ? 'border-primary bg-primary/15 text-primary'
          : 'border-border bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground')
      }
    >
      {label}
    </button>
  );
}