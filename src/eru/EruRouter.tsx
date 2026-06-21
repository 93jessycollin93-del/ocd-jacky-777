import { lazy, Suspense, ComponentType } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ERU_ROUTES } from './routes.generated';
import EruPageShell from './EruPageShell';
import { AuthProvider } from './lib/AuthContext';
import EruErrorBoundary from './EruErrorBoundary';

const SLUG_TO_TITLE = (slug: string) =>
  slug.replace(/^\//, '').replace(/[-/:]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || 'Home';

function wrap(loader: () => Promise<any>, title: string) {
  const Lazy = lazy(async () => {
    const mod = await loader();
    const C: ComponentType<any> = mod.default ?? mod;
    return { default: (props: any) => (
      <EruPageShell title={title} badge="EXPERIMENTAL" banner="Imported from Eru — verify before operational use.">
        <EruErrorBoundary name={title}>
          <C {...props} />
        </EruErrorBoundary>
      </EruPageShell>
    ) };
  });
  return <Lazy />;
}

const Fallback = () => (
  <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
    Loading Eru module…
  </div>
);

export default function EruRouter() {
  return (
    <AuthProvider>
      <Suspense fallback={<Fallback />}>
        <Routes>
          {ERU_ROUTES.map(({ path, name, loader }) => (
            <Route key={path + name} path={path} element={wrap(loader, SLUG_TO_TITLE(path) || name)} />
          ))}
        </Routes>
      </Suspense>
    </AuthProvider>
  );
}
