import { useEffect, useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Compass,
  Search,
  Loader2,
  ChevronRight,
  Globe,
  ListMusic,
  X,
} from 'lucide-react';

import { listPublicPlaylists } from '@/eru/lib/mediaLibrary';

/**
 * Discover — community browse of public playlists (Phase 6).
 *
 * Lists playlists other users marked public (via the listPublicPlaylists server
 * function) and links each to the shared view at /p/:id, where the tracks
 * stream through the app-wide player. Search filters the loaded set client-side.
 */
export default function Discover() {
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setPlaylists(await listPublicPlaylists({ limit: 100 }));
    } catch {
      setError('Could not load community playlists.');
      setPlaylists([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return playlists;
    return playlists.filter((p) =>
      [p.name, p.description, p.owner].filter(Boolean).some((v) => v.toLowerCase().includes(q)),
    );
  }, [playlists, query]);

  return (
    <div
      className="flex min-h-screen flex-col bg-background pb-40"
      style={{
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
      }}
    >
      <header className="border-b border-border bg-card/80 px-4 py-3">
        <Link
          to="/music"
          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> Library
        </Link>
        <div className="mt-1 flex items-center gap-2">
          <Compass className="h-5 w-5 text-primary" />
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Community
            </p>
            <h1 className="text-lg font-semibold leading-tight text-foreground">Discover</h1>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-3xl flex-1 space-y-3 px-4 py-4">
        {/* Search */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search public playlists…"
            className="h-10 w-full rounded-xl border border-border bg-card pl-9 pr-9 text-sm text-foreground outline-none focus:border-primary"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full hover:bg-accent"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : error ? (
          <p className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-[13px] text-muted-foreground">
            {error}
          </p>
        ) : playlists.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
            <Globe className="mx-auto h-8 w-8 text-muted-foreground/60" />
            <p className="mt-3 text-sm font-medium text-foreground">No public playlists yet</p>
            <p className="mt-1 text-[12px] text-muted-foreground">
              Make one of your playlists public to share it with the community.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-[13px] text-muted-foreground">
            No playlists match your search.
          </p>
        ) : (
          <ul className="space-y-2">
            {filtered.map((p) => (
              <li key={p.id}>
                <Link
                  to={`/p/${p.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition-colors hover:bg-accent"
                >
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-secondary/40">
                    <ListMusic className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{p.name}</p>
                    {p.description && (
                      <p className="truncate text-[11px] text-muted-foreground">{p.description}</p>
                    )}
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      by {p.owner} · {p.track_count} track{p.track_count === 1 ? '' : 's'}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
