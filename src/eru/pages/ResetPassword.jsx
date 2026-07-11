import { useState } from 'react';
import { base44 } from '@/eru/api/base44Client';
import { Lock, Eye, EyeOff, Loader2 } from 'lucide-react';

export default function ResetPassword() {
  const params = new URLSearchParams(window.location.search);
  const resetToken = params.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!password || !confirm) { setError('Please fill in both fields.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setLoading(true);
    try {
      await base44.auth.resetPassword({ resetToken, newPassword: password });
      setDone(true);
    } catch (err) {
      setError(err?.message || 'Reset failed. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-primary/10 blur-[120px]" />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/15 border border-primary/30 mb-4">
            <span className="text-2xl font-black text-primary tracking-tight">E</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {done ? 'Password updated' : 'Set new password'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {done ? 'You can now sign in with your new password.' : 'Choose a strong password.'}
          </p>
        </div>

        <div className="eru-theme-card rounded-2xl border border-border p-6">
          {done ? (
            <a
              href="/login"
              className="flex items-center justify-center w-full rounded-xl bg-primary text-primary-foreground font-semibold py-3 text-sm hover:bg-primary/90 active:scale-95 transition"
            >
              Sign In
            </a>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="New password (min 8 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  autoFocus
                  className="w-full pl-10 pr-10 py-3 rounded-xl bg-secondary/60 border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/40 transition"
                />
                <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1} data-no-min-touch>
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  type="password"
                  placeholder="Confirm new password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-secondary/60 border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/40 transition"
                />
              </div>

              {error && <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground font-semibold py-3 text-sm hover:bg-primary/90 active:scale-95 transition disabled:opacity-60"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Update Password
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}