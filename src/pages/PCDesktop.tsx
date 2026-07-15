import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, ExternalLink, RotateCw, Monitor } from "lucide-react";

/**
 * The PC — Visual Computer, embedded whole.
 *
 * The full PC build ships untouched under /public/pc-os/ (its own React 19
 * runtime, apps, persistence and styling), so nothing about it is
 * compromised. This page frames it inside Jackie with a slim header.
 *
 * Deep links: /pc?app=<pc-app-id> boots the PC with that app open
 * (e.g. /pc?app=jacky opens JACKY v3).
 */
const PCDesktop = () => {
  const [params] = useSearchParams();
  const [loaded, setLoaded] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const src = useMemo(() => {
    const app = params.get("app");
    const mode = params.get("pc") ?? "full";
    const query = new URLSearchParams({ pc: mode });
    if (app) query.set("app", app);
    return `/pc-os/index.html?${query.toString()}`;
  }, [params]);

  return (
    <div className="h-screen w-full flex flex-col bg-background">
      <header className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-sidebar flex-shrink-0">
        <Link
          to="/"
          className="flex items-center gap-1.5 px-2 py-1 rounded-sm font-mono text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          title="Back to Jackie"
        >
          <ArrowLeft size={14} />
          Jackie
        </Link>
        <div className="flex items-center gap-2">
          <Monitor size={14} className="text-primary" />
          <span className="font-mono text-xs uppercase tracking-widest text-foreground">
            The PC · Visual Computer
          </span>
        </div>
        <div className="flex-1" />
        {!loaded && (
          <span className="font-mono text-[10px] text-muted-foreground animate-pulse">
            booting…
          </span>
        )}
        <button
          type="button"
          onClick={() => {
            setLoaded(false);
            setReloadKey((k) => k + 1);
          }}
          className="p-1.5 rounded-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          title="Reload the PC"
        >
          <RotateCw size={14} />
        </button>
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 rounded-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          title="Open the PC in its own tab"
        >
          <ExternalLink size={14} />
        </a>
      </header>
      <iframe
        key={reloadKey}
        src={src}
        title="The PC — Visual Computer"
        className="flex-1 w-full border-0"
        allow="clipboard-read; clipboard-write; microphone; camera; fullscreen"
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
};

export default PCDesktop;
