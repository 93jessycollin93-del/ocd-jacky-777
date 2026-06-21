/**
 * audioEngine — a two-deck wrapper around Howler.js for gapless / crossfaded
 * playback.
 * ----------------------------------------------------------------------------
 * The engine owns audio only; it knows nothing about tracks, playlists or the
 * queue. The React layer (MediaPlayerContext) drives it by:
 *   1. load(url)        — play a track now (hard switch; cancels any crossfade).
 *   2. setNext(url)     — tell the engine what plays next, so it can preload and
 *                          (when crossfade is on) overlap into it near the end.
 *   3. setCrossfade(s)  — overlap duration in seconds; 0 = gapless (preloaded
 *                          next starts the instant the current track ends).
 *
 * Two Howl "decks" exist at most: `primary` (audible) and `incoming` (the
 * preloaded next track). When the current track nears its end the engine
 * promotes `incoming` to `primary`, fading between them, and fires onAdvance so
 * the context can move its queue/current pointers to match — no reload needed.
 */

import { Howl, Howler } from 'howler';

let primary = null;
let incoming = null;
let primaryUrl = null;
let incomingUrl = null;
let crossfadeSec = 0;
let crossfading = false;
let raf = null;

const handlers = {
  onProgress: null, // (seconds, duration) => void
  onEnd: null, // () => void   — track ended with nothing queued
  onAdvance: null, // () => void   — engine moved to the preloaded next track
  onPlay: null,
  onPause: null,
  onLoad: null, // (duration) => void
  onError: null,
};

const clamp = (v) => Math.max(0, Math.min(1, v));

export function setHandlers(next = {}) {
  Object.assign(handlers, next);
}

function stopLoop() {
  if (raf) cancelAnimationFrame(raf);
  raf = null;
}

function startLoop() {
  stopLoop();
  const tick = () => {
    step();
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
}

function step() {
  if (!primary) return;
  if (!primary.playing()) return;
  const pos = primary.seek() || 0;
  const dur = primary.duration() || 0;
  handlers.onProgress?.(pos, dur);

  // Begin crossfade once the current track is within `crossfadeSec` of the end
  // and a next track is preloaded.
  if (crossfadeSec > 0 && incoming && !crossfading && dur > 0) {
    const remaining = dur - pos;
    if (remaining > 0.05 && remaining <= crossfadeSec) {
      beginCrossfade();
    }
  }
}

// A single factory for both decks. Lifecycle callbacks act only when the firing
// Howl is the current `primary`, so a preloaded `incoming` stays silent until
// it is promoted.
function createHowl(url) {
  const h = new Howl({
    src: [url],
    html5: true, // stream long audio instead of fully buffering
    volume: 1,
    onplay: () => {
      if (h === primary) {
        handlers.onPlay?.();
        startLoop();
      }
    },
    onpause: () => {
      if (h === primary) handlers.onPause?.();
    },
    onend: () => {
      if (h === primary) onPrimaryEnd();
    },
    onload: () => {
      if (h === primary) handlers.onLoad?.(h.duration() || 0);
    },
    onloaderror: (_id, err) => handlers.onError?.(err),
    onplayerror: (_id, err) => {
      handlers.onError?.(err);
      // Autoplay can be blocked until a user gesture; retry on unlock.
      h.once('unlock', () => {
        if (h === primary) h.play();
      });
    },
  });
  return h;
}

/** Play a URL now. Hard reset: cancels crossfade and drops any preloaded next. */
export function load(url, { autoplay = true, volume } = {}) {
  unload();
  if (volume != null) Howler.volume(clamp(volume));
  primary = createHowl(url);
  primaryUrl = url;
  if (autoplay) primary.play();
  return primary;
}

/**
 * Preload (or clear) the next track. Idempotent: passing the URL that is already
 * preloaded is a no-op, so the context can call this freely on queue changes.
 */
export function setNext(url) {
  if (crossfading) return; // don't disturb an in-flight transition
  if (url && url === incomingUrl && incoming) return;
  if (incoming) {
    try { incoming.unload(); } catch { /* ignore */ }
    incoming = null;
    incomingUrl = null;
  }
  if (!url) return;
  incoming = createHowl(url); // html5 preload begins buffering
  incomingUrl = url;
}

export function setCrossfade(seconds) {
  crossfadeSec = Math.max(0, Number(seconds) || 0);
}

function beginCrossfade() {
  if (crossfading || !incoming) return;
  crossfading = true;
  const old = primary;
  const nu = incoming;
  const ms = Math.max(200, crossfadeSec * 1000);

  // Swap pointers first so lifecycle callbacks treat `nu` as primary.
  primary = nu;
  primaryUrl = incomingUrl;
  incoming = null;
  incomingUrl = null;

  nu.volume(0);
  nu.play();
  nu.fade(0, 1, ms);

  if (old) {
    try { old.fade(old.volume() || 1, 0, ms); } catch { /* ignore */ }
    setTimeout(() => {
      try { old.stop(); old.unload(); } catch { /* ignore */ }
    }, ms + 80);
  }

  crossfading = false; // pointers swapped + incoming cleared → no re-trigger
  handlers.onAdvance?.();
}

function onPrimaryEnd() {
  if (incoming) {
    // Gapless: promote the preloaded next immediately (no overlap).
    const old = primary;
    const nu = incoming;
    primary = nu;
    primaryUrl = incomingUrl;
    incoming = null;
    incomingUrl = null;
    if (old) {
      try { old.stop(); old.unload(); } catch { /* ignore */ }
    }
    nu.volume(1);
    nu.play();
    handlers.onAdvance?.();
  } else {
    stopLoop();
    handlers.onEnd?.();
  }
}

export function play() {
  primary?.play();
}

export function pause() {
  primary?.pause();
}

export function togglePlay() {
  if (!primary) return;
  if (primary.playing()) primary.pause();
  else primary.play();
}

export function isPlaying() {
  return Boolean(primary?.playing());
}

export function seek(seconds) {
  primary?.seek(seconds);
}

export function getPosition() {
  return primary ? primary.seek() || 0 : 0;
}

export function getDuration() {
  return primary ? primary.duration() || 0 : 0;
}

/** Master volume 0..1. */
export function setVolume(v) {
  Howler.volume(clamp(v));
}

export function unload() {
  stopLoop();
  crossfading = false;
  if (incoming) {
    try { incoming.unload(); } catch { /* ignore */ }
    incoming = null;
    incomingUrl = null;
  }
  if (primary) {
    try { primary.unload(); } catch { /* ignore */ }
    primary = null;
    primaryUrl = null;
  }
}
