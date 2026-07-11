import { Link, useLocation } from 'react-router-dom';
import { Store } from 'lucide-react';

export default function BazarStandDock() {
  const location = useLocation();
  const active = location.pathname === '/bazar-stand';

  return (
    <div className="fixed bottom-24 right-4 z-40 md:bottom-6 md:right-6">
      <Link
        to="/bazar-stand"
        className={`flex items-center gap-2 rounded-full border px-4 py-3 shadow-2xl backdrop-blur-md transition-colors ${active ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card/95 text-foreground hover:border-primary/40'}`}
      >
        <Store className="h-4 w-4" />
        <span className="text-xs font-semibold">Bazar Stand</span>
      </Link>
    </div>
  );
}