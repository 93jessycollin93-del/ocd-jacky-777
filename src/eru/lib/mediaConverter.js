/**
 * Media Converter — client config & helpers.
 *
 * Talks to the standalone converter service (Node + Express running yt-dlp +
 * ffmpeg on a VPS). The service base URL is provided at build time via
 *   VITE_MEDIA_CONVERTER_URL=https://media-converter-production.up.railway.app
 *
 * The converter CANNOT live in the Base44 serverless backend because yt-dlp and
 * ffmpeg spawn processes and write temp files. See /media-converter for the
 * service itself.
 */

export const CONVERTER_BASE_URL =
  (import.meta.env?.VITE_MEDIA_CONVERTER_URL || '').replace(/\/$/, '');

/** True when a converter URL has been configured. */
export const isConverterConfigured = () => Boolean(CONVERTER_BASE_URL);

/** The exact terms the user must acknowledge before converting. */
export const ACK_TERMS =
  'Only convert content you own or that is licensed for free use. ' +
  'You are responsible for ensuring you have the rights.';

/** Audio formats — rendered as a row of tappable buttons. */
export const AUDIO_FORMATS = [
  { id: 'mp3', label: 'MP3' },
  { id: 'm4a', label: 'M4A' },
  { id: 'wav', label: 'WAV' },
];

/** Video formats (mp4) — one button per resolution. */
export const VIDEO_FORMATS = [
  { id: '240p', label: '240p' },
  { id: '360p', label: '360p' },
  { id: '480p', label: '480p' },
  { id: '720p', label: '720p' },
  { id: '1080p', label: '1080p' },
];

const ALL_FORMAT_IDS = new Set(
  [...AUDIO_FORMATS, ...VIDEO_FORMATS].map((f) => f.id),
);

export const isValidFormat = (id) => ALL_FORMAT_IDS.has(id);

/** Lightweight http(s) URL check for the input field. */
export function isHttpUrl(value) {
  if (typeof value !== 'string') return false;
  try {
    const u = new URL(value.trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Pull a filename out of a Content-Disposition header, if present. */
function filenameFromDisposition(disposition, fallback) {
  if (!disposition) return fallback;
  const match = /filename\*?=(?:UTF-8'')?["']?([^"';\n]+)/i.exec(disposition);
  if (match && match[1]) {
    try {
      return decodeURIComponent(match[1]);
    } catch {
      return match[1];
    }
  }
  return fallback;
}

/**
 * Fetch lightweight metadata for a URL from the converter's /metadata endpoint.
 * Returns null on any failure — never blocks conversion.
 * @param {string} url
 * @param {{ signal?: AbortSignal }} [opts]
 * @returns {Promise<{ title, artist, duration_sec, cover_url, source } | null>}
 */
export async function fetchMediaMetadata(url, { signal } = {}) {
  if (!isConverterConfigured()) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  // Chain the caller's signal
  if (signal) signal.addEventListener('abort', () => controller.abort());
  try {
    const res = await fetch(
      `${CONVERTER_BASE_URL}/metadata?url=${encodeURIComponent(url)}`,
      { signal: controller.signal },
    );
    if (!res.ok) {
      let msg = `Metadata fetch failed (${res.status}).`;
      try { const d = await res.json(); if (d?.error) msg = d.error; } catch {}
      throw new Error(msg);
    }
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Call POST /convert, returning the converted file as a Blob plus its filename.
 * Retries up to 2 times on network errors or 5xx — never on 4xx.
 * Throws an Error with a human-readable `.message` on failure.
 *
 * @returns {Promise<{ blob: Blob, filename: string }>}
 */
export async function convertMedia({ url, format, acknowledged, signal }) {
  if (!isConverterConfigured()) {
    throw new Error(
      'The converter service URL is not configured (VITE_MEDIA_CONVERTER_URL).',
    );
  }

  const MAX_RETRIES = 2;
  let lastErr;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    // Don't retry if caller already aborted
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

    try {
      const res = await fetch(`${CONVERTER_BASE_URL}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, format, acknowledged }),
        signal,
      });

      if (!res.ok) {
        let message = friendlyConverterError({ status: res.status });
        try {
          const data = await res.json();
          if (data?.error) message = friendlyConverterError({ status: res.status, message: data.error });
        } catch {}
        const err = new Error(message);
        err.status = res.status;
        // 4xx = definitive answer, don't retry
        if (res.status >= 400 && res.status < 500) throw err;
        lastErr = err;
        if (attempt < MAX_RETRIES) await _delay(3000);
        continue;
      }

      const blob = await res.blob();
      const filename = filenameFromDisposition(
        res.headers.get('Content-Disposition'),
        `download.${format.includes('p') ? 'mp4' : format}`,
      );
      return { blob, filename };
    } catch (err) {
      if (err?.name === 'AbortError') throw err;
      if (err?.status >= 400 && err?.status < 500) throw err; // 4xx — propagate immediately
      lastErr = err;
      if (attempt < MAX_RETRIES) await _delay(3000);
    }
  }

  throw lastErr || new Error('Conversion failed after retries.');
}

function _delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** True when a URL looks like a YouTube/youtu.be link. */
export function isPlaylistUrl(value) {
  if (typeof value !== 'string') return false;
  return /[?&]list=/i.test(value) && !/[?&]v=/i.test(value);
}

export function isYouTubeUrl(value) {
  if (typeof value !== 'string') return false;
  return /(youtube\.com|youtu\.be|yesplaylist)/i.test(value);
}

/** True when a URL is likely a YouTube livestream or premiere. */
function looksLikeLivestream(data) {
  return (
    data?.is_live === true ||
    data?.live_status === 'is_live' ||
    data?.live_status === 'is_upcoming' ||
    (data?.duration === 0 && data?.is_live !== false)
  );
}

/**
 * Fetch lightweight metadata for a YouTube URL WITHOUT downloading the file.
 * Calls GET /metadata on the converter service with an 8-second timeout.
 * Returns sensible defaults on any failure so the UI always has something.
 *
 * @param {string} url  A YouTube URL
 * @returns {Promise<{ title: string, artist: string, duration_sec: number, cover_url: string, format: string, url: string, _warn?: string }>}
 */
export async function ytMetadataPreview(url) {
  const shortUrl = url.length > 60 ? url.slice(0, 57) + '…' : url;
  const defaults = {
    title: `Unknown Title — ${shortUrl}`,
    artist: 'YouTube',
    duration_sec: 0,
    cover_url: '',
    format: 'mp3',
    url,
  };

  if (!isConverterConfigured()) return defaults;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  const doFetch = async () => {
    const res = await fetch(
      `${CONVERTER_BASE_URL}/metadata?url=${encodeURIComponent(url)}`,
      { signal: controller.signal },
    );
    if (res.status === 403 || res.status === 404) {
      throw new Error('This video isn\'t available (private or geo-restricted).');
    }
    if (!res.ok) {
      let msg = 'Metadata fetch failed.';
      try { const d = await res.json(); if (d?.error) msg = d.error; } catch {}
      throw new Error(msg);
    }
    return res.json();
  };

  try {
    let data = null;
    for (let n = 0; n <= 2; n++) {
      try {
        data = await doFetch();
        break;
      } catch (err) {
        if (err?.name === 'AbortError') break;
        if (err?.message?.includes('isn\'t available')) throw err;
        if (n === 2) break;
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
    if (!data) return defaults;

    // Livestream / premiere guard
    if (looksLikeLivestream(data)) {
      throw new Error('LIVESTREAM');
    }

    const duration_sec = Math.round(data.duration || 0);
    const result = {
      title: (data.title || '').trim() || defaults.title,
      artist: (data.uploader || data.channel || '').trim() || 'YouTube',
      duration_sec,
      cover_url: data.thumbnail || '',
      format: 'mp3',
      url,
    };

    // Warn for very long videos (>1 hour)
    if (duration_sec > 3600) {
      result._warn = 'This is a long video — conversion may take 2–3 minutes.';
    }

    return result;
  } catch (err) {
    if (err?.message === 'LIVESTREAM') {
      const e = new Error('LIVESTREAM');
      throw e;
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Make a raw yt-dlp / converter error message human-friendly.
 * Accepts an Error, a string, or an object with { status, message }.
 * @param {string|Error|{ status?: number, message?: string }} err
 * @returns {string}
 */
export function friendlyConverterError(err) {
  const status = err?.status;
  const msg = (typeof err === 'string' ? err : err?.message) || '';

  if (status === 404) return "That video isn't available. It may be private or region-locked.";
  if (status === 422) return msg || "That URL isn't supported or is a playlist URL.";
  if (status === 504) return "That took too long. Long videos can take a few minutes — try again.";

  if (msg === 'LIVESTREAM')
    return "This looks like a livestream or premiere. Try a finished video instead.";
  if (/isn't available|private|unavailable|removed/i.test(msg))
    return "That video isn't available. It may be private or region-locked.";
  if (/age.restrict/i.test(msg))
    return "That video is age-restricted and can't be fetched.";
  if (/network|ECONNREFUSED|fetch failed|failed to fetch/i.test(msg))
    return "Couldn't reach the converter. Check your connection and retry.";
  if (/format|no formats/i.test(msg))
    return "No downloadable format found for that URL.";
  if (/copyright|blocked/i.test(msg))
    return "That video is blocked due to copyright restrictions.";
  if (/playlist/i.test(msg))
    return "Paste a single video URL, not a playlist.";
  if (!msg || msg.length > 200) return "Couldn't fetch that video. Is the URL public?";
  return msg;
}

/** Trigger a browser download for a Blob. */
export function triggerDownload(blob, filename) {
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke after a tick so the download has a chance to start.
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}