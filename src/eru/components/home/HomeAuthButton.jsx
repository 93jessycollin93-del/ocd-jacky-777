import { useEffect, useState } from 'react';
import { LogIn, LogOut, User } from 'lucide-react';
import { base44 } from '@/eru/api/base44Client';

/**
 * HomeAuthButton — top-right sign in / sign out control, like most apps.
 * Checks auth state on mount, shows the user's name (when available) and a
 * Sign out button, or a Sign in button for guests. Pure auth UI — no other
 * business logic. Login/logout are handled entirely by the Base44 platform.
 */
export default function HomeAuthButton() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    base44.auth
      .me()
      .then((me) => mounted && setUser(me))
      .catch(() => mounted && setUser(null))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return <div className="h-9 w-24 rounded-xl bg-secondary/60 animate-pulse" />;
  }

  if (user) {
    const name = user.full_name?.split(' ')[0] || 'Account';
    return (
      <div className="flex items-center gap-2">
        <span className="hidden sm:flex items-center gap-1.5 rounded-xl border border-border bg-secondary/60 px-2.5 py-1.5 text-xs font-medium text-foreground">
          <User className="h-3.5 w-3.5 text-primary" />
          <span className="max-w-[120px] truncate">{name}</span>
        </span>
        <button
          onClick={() => base44.auth.logout()}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-secondary/60 px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-primary/40 hover:text-primary"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Sign out</span>
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => base44.auth.redirectToLogin()}
      className="eru-neon-cta inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold"
    >
      <LogIn className="h-3.5 w-3.5" />
      <span>Sign in</span>
    </button>
  );
}