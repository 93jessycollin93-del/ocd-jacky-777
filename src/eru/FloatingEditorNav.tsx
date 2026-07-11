import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Command, Code2, Search, X, Sparkles, ChevronUp } from 'lucide-react';
import { ERU_ROUTES } from './routes.generated';

const JACKIE_ROUTES: { path: string; label: string }[] = [
  { path: '/', label: 'Hub' },
  { path: '/control', label: 'Jackie Control' },
  { path: '/sphere', label: 'Sphere Command' },
  { path: '/veilops', label: 'VeilOps' },
  { path: '/bots', label: 'Bot Foundry' },
  { path: '/swarm', label: 'Bot Swarm' },
  { path: '/vault', label: 'Vault' },
  { path: '/gunit', label: 'G-UNIT' },
  { path: '/play', label: 'Play' },
  { path: '/keys', label: 'API Keys' },
  { path: '/eru/visualizers', label: 'Visualizer Lab' },
];

const STORAGE_KEY = 'jackie.floating.scratchpad';

/**
 * Floating dock present on every authenticated route. Combines:
 *   • a router palette (Cmd/Ctrl+K) over Jackie + Eru routes
 *   • an inline scratchpad that persists to localStorage
 *   • a tiny "ask Jackie" stub that opens the orchestrator
 */
export default function FloatingEditorNav() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'nav' | 'editor'>('nav');
  const [query, setQuery] = useState('');
  const [code, setCode] = useState(() => (typeof window === 'undefined' ? '' : localStorage.getItem(STORAGE_KEY) || ''));
  const navigate = useNavigate();
  const loc = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);

  // Cmd/Ctrl+K toggles, Esc closes
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
        setMode('nav');
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => { if (open && mode === 'nav') inputRef.current?.focus(); }, [open, mode]);
  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, code); } catch {} }, [code]);

  const all = useMemo(() => {
    const eru = ERU_ROUTES.map((r) => ({
      path: '/eru/' + r.path,
      label: 'Eru · ' + r.name,
    }));
    return [...JACKIE_ROUTES, ...eru];
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return all.slice(0, 12);
    return all.filter((r) => r.label.toLowerCase().includes(q) || r.path.toLowerCase().includes(q)).slice(0, 20);
  }, [query, all]);

  if (loc.pathname.startsWith('/auth') || loc.pathname.startsWith('/hub')) return null;

  return (
    <>
      {/* Launcher */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-[60] flex h-12 items-center gap-2 rounded-full border border-border bg-background/80 px-4 text-sm font-medium shadow-lg backdrop-blur transition hover:bg-accent"
        title="Open command dock (Ctrl+K)"
      >
        <Command className="h-4 w-4 text-primary" />
        <span className="hidden sm:inline">Dock</span>
        <span className="hidden rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground sm:inline">⌘K</span>
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-20 right-5 z-[60] w-[360px] max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-background/95 shadow-2xl backdrop-blur md:w-[420px]">
          <div className="flex items-center gap-1 border-b border-border px-2 py-1.5">
            <button
              type="button"
              onClick={() => setMode('nav')}
              className={`flex items-center gap-1 rounded px-2 py-1 text-xs ${mode === 'nav' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent'}`}
            >
              <Search className="h-3 w-3" /> Jump
            </button>
            <button
              type="button"
              onClick={() => setMode('editor')}
              className={`flex items-center gap-1 rounded px-2 py-1 text-xs ${mode === 'editor' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent'}`}
            >
              <Code2 className="h-3 w-3" /> Scratchpad
            </button>
            <a
              href="/control"
              className="ml-auto flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-accent"
            >
              <Sparkles className="h-3 w-3" /> Ask Jackie
            </a>
            <button type="button" onClick={() => setOpen(false)} className="rounded p-1 text-muted-foreground hover:bg-accent">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {mode === 'nav' ? (
            <div className="p-2">
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Jump to a page in Jackie or Eru…"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && results[0]) { navigate(results[0].path); setOpen(false); }
                }}
              />
              <div className="mt-2 max-h-72 overflow-y-auto">
                {results.length === 0 && (
                  <div className="px-3 py-6 text-center text-xs text-muted-foreground">No matches.</div>
                )}
                {results.map((r) => (
                  <Link
                    key={r.path + r.label}
                    to={r.path}
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-between rounded px-3 py-2 text-sm hover:bg-accent"
                  >
                    <span className="truncate">{r.label}</span>
                    <span className="ml-3 truncate font-mono text-[10px] text-muted-foreground">{r.path}</span>
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-2">
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                spellCheck={false}
                placeholder="// snippets, notes, todos — stays in this browser"
                className="h-72 w-full resize-none rounded-md border border-border bg-background p-3 font-mono text-xs outline-none focus:ring-1 focus:ring-primary"
              />
              <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
                <span>{code.length} chars · localStorage</span>
                <button
                  type="button"
                  onClick={() => setCode('')}
                  className="rounded px-2 py-0.5 hover:bg-accent"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-border px-3 py-1.5 text-[10px] text-muted-foreground">
            <span>Ctrl+K to toggle · Esc to close</span>
            <ChevronUp className="h-3 w-3" />
          </div>
        </div>
      )}
    </>
  );
}
