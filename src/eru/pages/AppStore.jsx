import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Store, ArrowLeft, Sparkles, Code2, ArrowRight, Plug } from 'lucide-react';
import { APP_STORE_MODULES, APP_STORE_CATEGORIES } from '@/eru/lib/appStoreModules';
import { useInstalledModules } from '@/eru/hooks/useInstalledModules';
import ModuleCard from '@/eru/components/appstore/ModuleCard';
import ModulePreviewDialog from '@/eru/components/appstore/ModulePreviewDialog';

// App Store page — browse, preview, and install dashboard modules. Mobile-
// first layout: sticky search/category bar, responsive grid, modal preview.
// All install state lives in localStorage via useInstalledModules.
export default function AppStore() {
  const { installed, install, uninstall, isInstalled } = useInstalledModules();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [previewModule, setPreviewModule] = useState(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return APP_STORE_MODULES.filter((m) => {
      const inCategory = category === 'All' || m.category === category;
      if (!inCategory) return false;
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) ||
        m.tagline.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q)
      );
    });
  }, [query, category]);

  const installedCount = installed.length;

  return (
    <div className="flex min-h-screen flex-col bg-background pb-20">
      {/* Header */}
      <div className="border-b border-border bg-card/60">
        <div className="px-4 py-3 sm:py-4">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="rounded-lg border border-border bg-secondary p-1.5 text-muted-foreground hover:text-foreground"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="min-w-0 flex-1">
              <h1 className="flex items-center gap-2 text-base font-bold sm:text-lg">
                <Store className="h-5 w-5 text-primary" />
                App Store
              </h1>
              <p className="text-[11px] text-muted-foreground sm:text-xs">
                Browse and install modules to extend your dashboard
              </p>
            </div>
            <span className="hidden rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary sm:inline-flex">
              {installedCount} installed
            </span>
          </div>
        </div>

        {/* Sticky search + categories */}
        <div className="sticky top-0 z-10 space-y-3 border-t border-border bg-card/95 px-4 py-3 backdrop-blur">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2">
            <Search className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search modules…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {APP_STORE_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`flex-shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors ${
                  category === cat
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-secondary text-muted-foreground hover:text-foreground'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Featured rooms — full pages users can open (not installable widgets) */}
      {category === 'All' && !query && (
        <div className="px-4 pt-4 space-y-3">
          <Link
            to="/dev-lab"
            className="block rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/15 via-card to-card p-4 transition-colors hover:border-primary/50"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
                <Code2 className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-primary">New Room</p>
                <p className="mt-0.5 text-sm font-bold text-foreground">Jackie Dev Lab</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Plan/Agent workspace for app changes — honest templates, manual patches, no fake AI.
                </p>
              </div>
              <ArrowRight className="mt-1 h-4 w-4 flex-shrink-0 text-primary" />
            </div>
          </Link>
          <Link
            to="/card-scanner"
            className="block rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/15 via-card to-card p-4 transition-colors hover:border-primary/50"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-primary">Verified Pricing Only</p>
                <p className="mt-0.5 text-sm font-bold text-foreground">Pokémon Card Scanner</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Identify and price cards using only real, verified sources. Zero fake data — ever.
                </p>
              </div>
              <ArrowRight className="mt-1 h-4 w-4 flex-shrink-0 text-primary" />
            </div>
          </Link>
          <Link
            to="/integrations"
            className="block rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/15 via-card to-card p-4 transition-colors hover:border-primary/50"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
                <Plug className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-primary">No Fake Connections</p>
                <p className="mt-0.5 text-sm font-bold text-foreground">Integration Command Center</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  WhatsApp Business + every integration with honest status. Connect real credentials only.
                </p>
              </div>
              <ArrowRight className="mt-1 h-4 w-4 flex-shrink-0 text-primary" />
            </div>
          </Link>
        </div>
      )}

      {/* Featured strip */}
      {category === 'All' && !query && (
        <div className="px-4 pt-4">
          <div className="eru-theme-card eru-cta-accent relative overflow-hidden rounded-2xl border border-border p-4">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-primary/15 blur-3xl"
            />
            <div className="relative flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/30 bg-primary/10">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-widest text-primary">Featured</p>
                <p className="mt-0.5 text-sm font-bold text-foreground">
                  Build your perfect dashboard
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Install only what you need. Remove anytime — your layout stays clean.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="flex-1 px-4 py-4">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/40 py-12 text-center">
            <Store className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No modules match your search</p>
            <p className="mt-1 text-xs text-muted-foreground/70">Try a different keyword or category</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((module) => (
              <ModuleCard
                key={module.id}
                module={module}
                installed={isInstalled(module.id)}
                onInstall={install}
                onUninstall={uninstall}
                onPreview={setPreviewModule}
              />
            ))}
          </div>
        )}
      </div>

      <ModulePreviewDialog
        module={previewModule}
        installed={previewModule ? isInstalled(previewModule.id) : false}
        onInstall={install}
        onUninstall={uninstall}
        onClose={() => setPreviewModule(null)}
      />
    </div>
  );
}