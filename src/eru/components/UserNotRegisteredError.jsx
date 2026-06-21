import { ShieldAlert, LogIn, RefreshCw } from 'lucide-react';
import { base44 } from '@/eru/api/base44Client';

/**
 * UserNotRegisteredError
 * ----------------------------------------------------------------------------
 * Shown when an authenticated request returns "user_not_registered". Restyled
 * to match ERU's dark/cosmic visual language and to expose clear next-step
 * affordances (sign in with another account / retry).
 * --------------------------------------------------------------------------*/
export default function UserNotRegisteredError() {
  const handleRelogin = () => {
    try { base44.auth.logout(); } catch {}
    try { base44.auth.redirectToLogin(window.location.href); } catch {}
  };

  const handleRetry = () => window.location.reload();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md rounded-2xl border border-yellow-400/30 bg-card/80 backdrop-blur-sm p-6 shadow-2xl space-y-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center text-yellow-300 flex-shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-semibold text-foreground">Access restricted</h1>
            <p className="text-xs text-muted-foreground">Your account isn’t registered for this app yet.</p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-secondary/40 p-3 space-y-1.5 text-xs text-muted-foreground">
          <p className="text-foreground font-medium text-xs">If you believe this is a mistake:</p>
          <ul className="space-y-1 list-disc list-inside leading-relaxed">
            <li>Verify you’re signed in with the correct account</li>
            <li>Ask an owner/admin to invite your email</li>
            <li>Try signing out and signing back in</li>
          </ul>
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-2">
          <button
            onClick={handleRetry}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-secondary py-2.5 text-sm font-medium text-foreground"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
          <button
            onClick={handleRelogin}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground"
          >
            <LogIn className="w-3.5 h-3.5" /> Sign in again
          </button>
        </div>
      </div>
    </div>
  );
}