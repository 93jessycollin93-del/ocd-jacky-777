import { ShieldAlert, LogIn } from 'lucide-react';
import { useAuth } from '@/eru/lib/AuthContext';
import { base44 } from '@/eru/api/base44Client';

/**
 * <PermissionGate allow={(user) => isAdmin(user)}>...</PermissionGate>
 *
 * Renders children when `allow(user)` is true, otherwise renders a polished
 * permission-denied (or sign-in) state that matches the app's cosmic/glass
 * visual language. Use as a UI gate — never as the only security boundary.
 */
export default function PermissionGate({
  allow,
  children,
  deniedTitle = 'Access restricted',
  deniedMessage = 'You don’t have permission to view this area.',
  requireAuth = true,
  fallback = null,
}) {
  const { user, isLoadingAuth } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (requireAuth && !user?.email) {
    return fallback ?? (
      <div className="min-h-[50dvh] flex items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-6 text-center space-y-3 shadow-xl">
          <div className="h-10 w-10 mx-auto rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <LogIn className="w-4 h-4" />
          </div>
          <p className="text-sm font-semibold text-foreground">Sign in required</p>
          <p className="text-xs text-muted-foreground">Please sign in to continue.</p>
          <button
            onClick={() => base44.auth.redirectToLogin(window.location.href)}
            className="w-full rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-semibold"
          >
            Sign in
          </button>
        </div>
      </div>
    );
  }

  const allowed = typeof allow === 'function' ? !!allow(user) : true;
  if (!allowed) {
    return fallback ?? (
      <div className="min-h-[50dvh] flex items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-2xl border border-yellow-400/30 bg-yellow-400/5 backdrop-blur-sm p-6 text-center space-y-3 shadow-xl">
          <div className="h-10 w-10 mx-auto rounded-xl bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center text-yellow-400">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <p className="text-sm font-semibold text-foreground">{deniedTitle}</p>
          <p className="text-xs text-muted-foreground">{deniedMessage}</p>
        </div>
      </div>
    );
  }

  return children;
}