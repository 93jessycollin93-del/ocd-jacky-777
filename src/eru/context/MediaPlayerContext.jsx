/**
 * MediaPlayerContext — the app's single, root-level playback store.
 * ----------------------------------------------------------------
 * Mounted once above the router (see App.jsx) so playback survives navigation
 * between sections. Pages call `useMediaPlayer()` to start tracks, control
 * playback, and manage the temporary up-next queue. The persistent player UI
 * (PersistentPlayer, mounted in Layout) reads the same state.
 *
 * The queue is a TEMPORARY play queue, separate from saved playlists: you can
 * add tracks to "up next" without editing any playlist.
 *
 * Gapless / crossfade: the context always tells the engine what plays next (via
 * setNext) whenever `current` or `queue` changes, so the engine can preload it
 * and, when crossfade is enabled, overlap into it near the end. The engine then
 * fires onAdvance and this store moves its pointers to match — no reload.
 */

import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import * as audioEngine from '@/eru/lib/audioEngine';
import { recordPlay } from '@/eru/lib/mediaLibrary';

const MediaPlayerContext = createContext(null);

const CROSSFADE_KEY = 'media_crossfade_sec';
const MAX_CROSSFADE = 12;

function loadCrossfade() {
  try {
    const v = parseFloat(localStorage.getItem(CROSSFADE_KEY));
    return Number.isFinite(v) ? Math.max(0, Math.min(MAX_CROSSFADE, v)) : 0;
  } catch {
    return 0;
  }
}

export function MediaPlayerProvider({ children }) {
  const [current, setCurrent] = useState(null); // the playing Track
  const [queue, setQueue] = useState([]); // upcoming Tracks (up-next)
  const [history, setHistory] = useState([]); // played Tracks (for "previous")
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [crossfade, setCrossfadeState] = useState(loadCrossfade);

  // Keep the latest queue/current in refs so engine callbacks (registered once)
  // always see fresh values without re-binding handlers on every render.
  const queueRef = useRef(queue);
  const currentRef = useRef(current);
  const volumeRef = useRef(volume);
  const pendingNextRef = useRef(null); // the Track currently preloaded as "next"
  queueRef.current = queue;
  currentRef.current = current;
  volumeRef.current = volume;

  const playTrackInternal = useCallback((track, { recordHistory = true } = {}) => {
    if (!track?.file_url) return;
    setCurrent(track);
    setPosition(0);
    setDuration(track.duration_sec || 0);
    audioEngine.load(track.file_url, { autoplay: true, volume: volumeRef.current });
    if (recordHistory) recordPlay(track).catch(() => {});
  }, []);

  // Register engine handlers exactly once, on mount.
  useEffect(() => {
    audioEngine.setCrossfade(crossfade);
    audioEngine.setHandlers({
      onPlay: () => setIsPlaying(true),
      onPause: () => setIsPlaying(false),
      onProgress: (secs, dur) => {
        setPosition(secs);
        if (dur) setDuration(dur);
      },
      onLoad: (dur) => setDuration(dur),
      // Engine reached the end with nothing preloaded → stop.
      onEnd: () => {
        setIsPlaying(false);
        setPosition(0);
      },
      // Engine moved to the preloaded next track (gapless or crossfade). Move
      // our pointers to match; the [current, queue] effect re-arms the next.
      onAdvance: () => {
        const advanced = pendingNextRef.current;
        if (!advanced) return;
        const playing = currentRef.current;
        if (playing) setHistory((h) => [...h, playing]);
        setCurrent(advanced);
        setPosition(0);
        setDuration(advanced.duration_sec || 0);
        setQueue((q) => q.slice(1));
        recordPlay(advanced).catch(() => {});
      },
      onError: () => setIsPlaying(false),
    });
    return () => audioEngine.unload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tell the engine what plays next whenever current/queue changes, so it can
  // preload it (and crossfade into it). setNext is idempotent.
  useEffect(() => {
    const nx = queue[0] || null;
    pendingNextRef.current = nx;
    audioEngine.setNext(nx?.file_url || null);
  }, [current, queue]);

  // Apply crossfade changes to the engine.
  useEffect(() => {
    audioEngine.setCrossfade(crossfade);
  }, [crossfade]);

  // ---- Public API --------------------------------------------------------

  /** Play a single track now. Optionally seed the up-next queue. */
  const playTrack = useCallback((track, nextQueue = null) => {
    if (Array.isArray(nextQueue)) setQueue(nextQueue);
    playTrackInternal(track);
  }, [playTrackInternal]);

  /** Play a list of tracks (e.g. a playlist) starting at `startIndex`. */
  const playList = useCallback((tracks = [], startIndex = 0) => {
    if (!tracks.length) return;
    const idx = Math.max(0, Math.min(startIndex, tracks.length - 1));
    setQueue(tracks.slice(idx + 1));
    setHistory([]);
    playTrackInternal(tracks[idx]);
  }, [playTrackInternal]);

  const togglePlay = useCallback(() => audioEngine.togglePlay(), []);

  /** Manual skip: hard switch to the next queued track (no crossfade). */
  const next = useCallback(() => {
    const q = queueRef.current;
    if (q.length === 0) return;
    const [nx, ...rest] = q;
    if (currentRef.current) setHistory((h) => [...h, currentRef.current]);
    setQueue(rest);
    playTrackInternal(nx);
  }, [playTrackInternal]);

  const previous = useCallback(() => {
    // Restart current if we're more than 3s in; otherwise go to previous track.
    if (position > 3 || history.length === 0) {
      audioEngine.seek(0);
      setPosition(0);
      return;
    }
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    if (currentRef.current) setQueue((q) => [currentRef.current, ...q]);
    playTrackInternal(prev, { recordHistory: false });
  }, [position, history, playTrackInternal]);

  const seek = useCallback((secs) => {
    audioEngine.seek(secs);
    setPosition(secs);
  }, []);

  const setVolume = useCallback((v) => {
    setVolumeState(v);
    audioEngine.setVolume(v);
  }, []);

  const setCrossfade = useCallback((sec) => {
    const v = Math.max(0, Math.min(MAX_CROSSFADE, Number(sec) || 0));
    setCrossfadeState(v);
    try { localStorage.setItem(CROSSFADE_KEY, String(v)); } catch { /* ignore */ }
  }, []);

  // ---- Queue (up-next) ----------------------------------------------------

  const addToQueue = useCallback((track) => {
    setQueue((q) => [...q, track]);
  }, []);

  const addManyToQueue = useCallback((tracks = []) => {
    setQueue((q) => [...q, ...tracks]);
  }, []);

  const removeFromQueue = useCallback((index) => {
    setQueue((q) => q.filter((_, i) => i !== index));
  }, []);

  const clearQueue = useCallback(() => setQueue([]), []);

  const playFromQueue = useCallback((index) => {
    setQueue((q) => {
      const track = q[index];
      if (!track) return q;
      if (currentRef.current) setHistory((h) => [...h, currentRef.current]);
      playTrackInternal(track);
      return q.filter((_, i) => i !== index);
    });
  }, [playTrackInternal]);

  const value = useMemo(() => ({
    current,
    queue,
    isPlaying,
    position,
    duration,
    volume,
    crossfade,
    hasTrack: Boolean(current),
    playTrack,
    playList,
    togglePlay,
    next,
    previous,
    seek,
    setVolume,
    setCrossfade,
    addToQueue,
    addManyToQueue,
    removeFromQueue,
    clearQueue,
    playFromQueue,
  }), [
    current, queue, isPlaying, position, duration, volume, crossfade,
    playTrack, playList, togglePlay, next, previous, seek, setVolume, setCrossfade,
    addToQueue, addManyToQueue, removeFromQueue, clearQueue, playFromQueue,
  ]);

  return (
    <MediaPlayerContext.Provider value={value}>
      {children}
    </MediaPlayerContext.Provider>
  );
}

export function useMediaPlayer() {
  const ctx = useContext(MediaPlayerContext);
  if (!ctx) {
    throw new Error('useMediaPlayer must be used within a MediaPlayerProvider');
  }
  return ctx;
}
