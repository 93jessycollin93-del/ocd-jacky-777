import { Suspense } from 'react';
import { Link } from 'react-router-dom';
import { Store, Trash2 } from 'lucide-react';
import { APP_STORE_MODULES } from '@/eru/lib/appStoreModules';
import { useInstalledModules } from '@/eru/hooks/useInstalledModules';

// Renders all currently-installed App Store modules on the dashboard. Each
// module is wrapped in a small frame with its name and a quick-uninstall
// button so the dashboard stays organized and reversible.
export default function InstalledModulesRenderer() {
  const { installed, uninstall } = useInstalledModules();

  if (installed.length === 0) return null;

  const modules = installed
    .map((id) => APP_STORE_MODULES.find((m) => m.id === id))
    .filter(Boolean);

  if (modules.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Store className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold">Installed Modules</p>
          <span className="rounded-full border border-border bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">
            {modules.length}
          </span>
        </div>
        <Link
          to="/app-store"
          className="rounded-xl border border-border bg-secondary px-3 py-1.5 text-[11px] font-medium text-foreground hover:border-primary/30"
        >
          Browse store
        </Link>
      </div>

      <div className="space-y-3">
        {modules.map((module) => {
          const Component = module.component;
          return (
            <div key={module.id} className="rounded-2xl border border-border bg-card/60 p-2">
              <div className="mb-1 flex items-center justify-between px-2 pt-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-base">{module.icon}</span>
                  <p className="truncate text-[11px] font-medium text-muted-foreground">{module.name}</p>
                </div>
                <button
                  onClick={() => uninstall(module.id)}
                  className="inline-flex items-center gap-1 rounded-lg border border-border bg-secondary/70 px-2 py-1 text-[10px] text-muted-foreground hover:border-destructive/30 hover:text-destructive"
                  aria-label={`Uninstall ${module.name}`}
                >
                  <Trash2 className="h-3 w-3" /> Remove
                </button>
              </div>
              <Suspense
                fallback={
                  <div className="flex h-24 items-center justify-center text-xs text-muted-foreground">
                    Loading {module.name}…
                  </div>
                }
              >
                <Component />
              </Suspense>
            </div>
          );
        })}
      </div>
    </div>
  );
}