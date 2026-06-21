/**
 * playlistIO — pure (no-SDK) serialization/parsing for playlist import & export.
 * ----------------------------------------------------------------------------
 * Two interchange formats:
 *   • M3U (extended) — the de-facto playlist format, for interop with other
 *     players. #EXTINF carries duration + "Artist - Title"; the next line is the
 *     track URL.
 *   • JSON ("eru-playlist") — lossless round-trip of our own playlists.
 *
 * The actual entity writes happen in mediaLibrary.importPlaylist; this module
 * only turns playlists into text and text back into plain track objects.
 */

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

/** Serialize a playlist + tracks to extended M3U text. */
export function toM3U(playlist, tracks = []) {
  const lines = ['#EXTM3U', `#PLAYLIST:${playlist?.name || 'Playlist'}`];
  for (const t of tracks) {
    const dur = Math.round(t.duration_sec || 0);
    const artist = t.artist ? `${t.artist} - ` : '';
    lines.push(`#EXTINF:${dur},${artist}${t.title || 'Untitled'}`);
    lines.push(t.file_url || '');
  }
  return `${lines.join('\n')}\n`;
}

/** Serialize a playlist + tracks to our JSON interchange object. */
export function toPlaylistJSON(playlist, tracks = []) {
  return {
    format: 'eru-playlist',
    version: 1,
    name: playlist?.name || 'Playlist',
    description: playlist?.description || '',
    exported_at: new Date().toISOString(),
    tracks: tracks.map((t) => ({
      title: t.title || 'Untitled',
      artist: t.artist || '',
      album: t.album || '',
      duration_sec: t.duration_sec || 0,
      file_url: t.file_url || '',
      format: t.format || '',
      kind: t.kind || 'audio',
      cover_url: t.cover_url || '',
    })),
  };
}

// ---------------------------------------------------------------------------
// Import / parsing
// ---------------------------------------------------------------------------

function deriveTitleFromUrl(url) {
  try {
    const path = String(url).split(/[?#]/)[0];
    const name = path.substring(path.lastIndexOf('/') + 1);
    return decodeURIComponent(name).replace(/\.[a-z0-9]+$/i, '') || 'Untitled';
  } catch {
    return 'Untitled';
  }
}

/** Parse extended M3U text into plain track objects. */
export function parseM3U(text) {
  const lines = String(text).split(/\r?\n/);
  const tracks = [];
  let pending = null;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('#EXTINF:')) {
      const meta = line.slice('#EXTINF:'.length);
      const comma = meta.indexOf(',');
      const dur = parseFloat(meta.slice(0, comma >= 0 ? comma : meta.length));
      const rest = comma >= 0 ? meta.slice(comma + 1) : '';
      let artist = '';
      let title = rest;
      const dash = rest.indexOf(' - ');
      if (dash >= 0) {
        artist = rest.slice(0, dash);
        title = rest.slice(dash + 3);
      }
      pending = {
        duration_sec: Number.isFinite(dur) && dur > 0 ? dur : 0,
        artist: artist.trim(),
        title: title.trim(),
      };
      continue;
    }
    if (line.startsWith('#')) continue; // other directives (e.g. #PLAYLIST)
    tracks.push({
      title: pending?.title || deriveTitleFromUrl(line),
      artist: pending?.artist || '',
      duration_sec: pending?.duration_sec || 0,
      file_url: line,
    });
    pending = null;
  }
  return tracks;
}

/** Parse our JSON interchange into { name, description, tracks }. */
export function parsePlaylistJSON(text) {
  const data = typeof text === 'string' ? JSON.parse(text) : text;
  const rows = Array.isArray(data?.tracks) ? data.tracks : [];
  return {
    name: data?.name || 'Imported playlist',
    description: data?.description || '',
    tracks: rows
      .map((t) => ({
        title: t.title || 'Untitled',
        artist: t.artist || '',
        album: t.album || '',
        duration_sec: Number(t.duration_sec) || 0,
        file_url: t.file_url || '',
        format: t.format || '',
        kind: t.kind || 'audio',
        cover_url: t.cover_url || '',
      }))
      .filter((t) => t.file_url),
  };
}

/**
 * Parse a file's text into { name, description, tracks }, auto-detecting JSON vs
 * M3U from the filename and content.
 */
export function parsePlaylistFile(filename = '', text = '') {
  const isJson = /\.json$/i.test(filename) || text.trim().startsWith('{');
  if (isJson) return parsePlaylistJSON(text);
  const base = filename.replace(/\.[^.]+$/, '') || 'Imported playlist';
  return { name: base, description: '', tracks: parseM3U(text) };
}

// ---------------------------------------------------------------------------
// Browser helpers
// ---------------------------------------------------------------------------

export function slugify(name) {
  return (
    String(name || 'playlist')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'playlist'
  );
}

/** Trigger a client-side download of text content. */
export function downloadText(filename, text, mime = 'text/plain') {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
