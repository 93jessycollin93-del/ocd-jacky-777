import { useEffect, useRef, useState } from 'react';
import { ExternalLink, ShieldAlert, Loader2, AlertTriangle } from 'lucide-react';

/**
 * LovableEmbed
 * ----------------------------------------------------------------------------
 * Renders an external Lovable app inside an <iframe> with graceful fallback.
 *
 * IMPORTANT: External sites frequently block iframe embedding via:
 *   - `X-Frame-Options: DENY | SAMEORIGIN`
 *   - `Content-Security-Policy: frame-ancestors ...`
 *   - Browser policies (Safari ITP, Telegram WebView quirks, mobile in-app browsers).
 *
 * When that happens the iframe silently shows a blank page — there's no reliable
 * cross-origin "blocked" event. We therefore:
 *   1. Show a loading spinner immediately.
 *   2. Start a watchdog timer. If `onLoad` never fires within BLOCK_TIMEOUT_MS,
 *      OR the user reports blocked rendering, we surface the fallback card with
 *      an "Open externally" button.
 *   3. Always expose an "Open externally" affordance even when the iframe is
 *      working — some users prefer a real tab.
 *
 * Props:
 *   - url: string | null           external URL (https required)
 *   - title: string                accessible iframe title
 *   - onBlocked?: () => void       optional callback when we fall back
 * --------------------------------------------------------------------------*/

const BLOCK_TIMEOUT_MS = 6000;

function isSafeHttpsUrl(value) {
  if (!value || typeof value !== 'string') return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export default function LovableEmbed({ url, title = 'External portal', onBlocked }) {
  const [status, setStatus] = useState('loading'); // loading | ready | blocked | invalid
  const watchdogRef = useRef(null);
  const iframeRef = useRef(null);

  const safeUrl = isSafeHttpsUrl(url) ? url : null;

  useEffect(() => {
    setStatus(safeUrl ? 'loading' : 'invalid');

    if (!safeUrl) return undefined;

    // If onLoad never fires, assume the frame is blocked by CSP/XFO.
    watchdogRef.current = window.setTimeout(() => {
      setStatus((prev) => {
        if (prev === 'loading') {
          onBlocked?.();
          return 'blocked';
        }
        return prev;
      });
    }, BLOCK_TIMEOUT_MS);

    return () => {
      if (watchdogRef.current) window.clearTimeout(watchdogRef.current);
    };
  }, [safeUrl, onBlocked]);

  const handleLoad = () => {
    if (watchdogRef.current) window.clearTimeout(watchdogRef.current);
    setStatus('ready');
  };

  const openExternal = () => {
    if (!safeUrl) return;
    window.open(safeUrl, '_blank', 'noopener,noreferrer');
  };

  if (status === 'invalid') {
    return (
      <FallbackCard
        icon={AlertTriangle}
        tone="warning"
        heading="Portal not configured"
        body="The Phoenix Investor portal URL hasn't been set yet. The owner can configure it in the portal settings."
      />
    );
  }

  return (
    <div className="relative flex flex-col h-full min-h-0 rounded-2xl border border-border bg-card overflow-hidden">
      {/* External-link pill, always visible */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border bg-card/80 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))] flex-shrink-0" />
          <p className="text-[11px] text-muted-foreground truncate">
            Powered by an external Lovable app
          </p>
        </div>
        <button
          onClick={openExternal}
          className="inline-flex items-center gap-1 rounded-lg border border-border bg-secondary/60 px-2.5 py-1 text-[11px] font-medium text-foreground hover:border-primary/40 transition-colors flex-shrink-0"
        >
          <ExternalLink className="w-3 h-3" /> Open externally
        </button>
      </div>

      {/* Iframe + overlays */}
      <div className="relative flex-1 min-h-0 bg-background">
        {status === 'loading' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/80 backdrop-blur-sm z-10">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
            <p className="text-xs text-muted-foreground">Connecting to Phoenix Investor…</p>
          </div>
        )}

        {status === 'blocked' && (
          <div className="absolute inset-0 flex items-center justify-center p-4 z-10">
            <FallbackCard
              icon={ShieldAlert}
              tone="info"
              heading="Embedding unavailable"
              body="This external app blocks being shown inside another site (CSP / X-Frame-Options). Open it securely in a new tab instead."
              actionLabel="Open Phoenix Investor externally"
              onAction={openExternal}
              footnote="Opens securely in a new tab/window."
            />
          </div>
        )}

        {safeUrl && (
          <iframe
            ref={iframeRef}
            src={safeUrl}
            title={title}
            onLoad={handleLoad}
            // Sandbox: allow the external app to run its own JS, forms, popups,
            // and same-origin cookies WITHIN its own origin. We intentionally
            // do NOT grant `allow-top-navigation` so the portal can't hijack
            // the parent app.
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
            referrerPolicy="no-referrer-when-downgrade"
            allow="clipboard-read; clipboard-write; payment"
            loading="lazy"
            className="w-full h-full border-0 bg-background"
          />
        )}
      </div>
    </div>
  );
}

function FallbackCard({ icon: Icon, tone = 'info', heading, body, actionLabel, onAction, footnote }) {
  const toneClass = tone === 'warning'
    ? 'border-yellow-400/30 bg-yellow-400/5'
    : 'border-primary/30 bg-primary/5';
  const iconClass = tone === 'warning' ? 'text-yellow-400' : 'text-primary';

  return (
    <div className={`w-full max-w-md rounded-2xl border ${toneClass} backdrop-blur-sm p-5 space-y-3 shadow-xl`}>
      <div className="flex items-center gap-2">
        <div className={`h-9 w-9 rounded-xl bg-background/40 border border-border flex items-center justify-center ${iconClass}`}>
          <Icon className="w-4 h-4" />
        </div>
        <p className="text-sm font-semibold text-foreground">{heading}</p>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{body}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <ExternalLink className="w-3.5 h-3.5" /> {actionLabel}
        </button>
      )}
      {footnote && (
        <p className="text-[10px] text-muted-foreground/70 text-center">{footnote}</p>
      )}
    </div>
  );
}