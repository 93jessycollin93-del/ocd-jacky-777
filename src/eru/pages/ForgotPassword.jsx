import { useState } from 'react';
import { base44 } from '@/eru/api/base44Client';
import { Mail, Loader2, ArrowLeft } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await base44.auth.resetPasswordRequest(email);
    } catch {}
    // Always show success regardless of response
    setSent(true);
    setLoading(false);
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
            {sent ? 'Check your email' : 'Reset password'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {sent
              ? `If an account exists for ${email}, we've sent a reset link.`
              : "We'll send you a link to reset your password."}
          </p>
        </div>

        <div className="eru-theme-card rounded-2xl border border-border p-6">
          {sent ? (
            <a
              href="/login"
              className="flex items-center justify-center gap-2 w-full rounded-xl bg-primary text-primary-foreground font-semibold py-3 text-sm hover:bg-primary/90 active:scale-95 transition"
            >
              Back to Sign In
            </a>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  autoFocus
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-secondary/60 border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/40 transition"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !email}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground font-semibold py-3 text-sm hover:bg-primary/90 active:scale-95 transition disabled:opacity-60"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Send Reset Link
              </button>

              <a
                href="/login"
                className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition pt-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Sign In
              </a>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}