import { useRef, useState, useCallback } from 'react';
import { RefreshCw, Loader2 } from 'lucide-react';

/**
 * PullToRefresh — lightweight, dependency-free pull-to-refresh wrapper.
 * Triggers `onRefresh` (sync or async) after the user pulls past the
 * threshold from the top of the page. Designed for Android/iOS gestures;
 * falls back gracefully on desktop (no behavior change there).
 *
 * Usage:
 *   <PullToRefresh onRefresh={async () => { await reload(); }}>
 *     <Page />
 *   </PullToRefresh>
 */
const THRESHOLD = 70;
const MAX_PULL = 110;

export default function PullToRefresh({ onRefresh, children }) {
  const startY = useRef(null);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const onTouchStart = useCallback((e) => {
    // Only arm gesture when scrolled to the very top.
    if (window.scrollY > 0) { startY.current = null; return; }
    startY.current = e.touches[0].clientY;
  }, []);

  const onTouchMove = useCallback((e) => {
    if (startY.current == null || refreshing) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta <= 0) return;
    // Soft resistance — pull dampens past threshold.
    const damped = Math.min(MAX_PULL, delta * 0.5);
    setPull(damped);
  }, [refreshing]);

  const onTouchEnd = useCallback(async () => {
    const triggered = pull >= THRESHOLD;
    startY.current = null;
    if (triggered && !refreshing) {
      setRefreshing(true);
      setPull(THRESHOLD);
      try { await onRefresh?.(); } catch { /* swallow — caller logs */ }
      setRefreshing(false);
    }
    setPull(0);
  }, [pull, refreshing, onRefresh]);

  const progress = Math.min(1, pull / THRESHOLD);

  return (
    <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <div
        className="flex items-center justify-center overflow-hidden text-muted-foreground"
        style={{ height: pull, transition: refreshing ? 'height 200ms ease' : 'none' }}
        aria-hidden={pull === 0}
      >
        {refreshing ? (
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        ) : pull > 0 ? (
          <RefreshCw
            className="h-4 w-4 text-primary"
            style={{ transform: `rotate(${progress * 360}deg)`, opacity: progress }}
          />
        ) : null}
      </div>
      {children}
    </div>
  );
}