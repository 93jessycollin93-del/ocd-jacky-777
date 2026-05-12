import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "sonner";


type AuthView = "login" | "signup" | "forgot" | "reset";

const DEMO_EMAIL = "demo@jackie.dev";
const DEMO_PASSWORD = "J4ck!3_D3m0#2026xQ";

const Auth = () => {
  const navigate = useNavigate();
  const [view, setView] = useState<AuthView>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (view === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth?view=reset`,
        });
        if (error) throw error;
        toast.success("Password reset link sent. Check your email.");
        return;
      }

      if (view === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (view === "signup") {
        if (password.length < 6) {
          toast.error("Password must be at least 6 characters.");
          return;
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Check your email to confirm your account.");
      }
    } catch (err: any) {
      toast.error(err.message || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  // Handle password reset (user arrives via reset link)
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated. You can now sign in.");
      setView("login");
      setPassword("");
    } catch (err: any) {
      toast.error(err.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  // Detect if arriving from a reset link
  useState(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("view") === "reset") setView("reset");
  });

  const headingMap: Record<AuthView, string> = {
    login: "Authenticate",
    signup: "Create Account",
    forgot: "Reset Password",
    reset: "New Password",
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <span className="font-mono text-5xl font-bold text-primary">J</span>
            <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              {headingMap[view]}
            </div>
          </div>
          
        </div>

        {/* Reset password form */}
        {view === "reset" ? (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-1">
              <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                New Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="jackie-input"
                placeholder="••••••••"
                required
                minLength={6}
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-sm font-mono text-sm uppercase tracking-wider bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 btn-mechanical"
            >
              {loading ? "..." : "Update Password"}
            </button>
            <button
              type="button"
              onClick={() => setView("login")}
              className="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Back to sign in
            </button>
          </form>
        ) : view === "forgot" ? (
          /* Forgot password form */
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="jackie-input"
                placeholder="you@example.com"
                required
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-sm font-mono text-sm uppercase tracking-wider bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 btn-mechanical"
            >
              {loading ? "..." : "Send Reset Link"}
            </button>
            <button
              type="button"
              onClick={() => setView("login")}
              className="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Back to sign in
            </button>
          </form>
        ) : (
          /* Login / Signup form */
          <>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="jackie-input"
                  placeholder="you@example.com"
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-1">
                <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="jackie-input"
                  placeholder="••••••••"
                  required
                  minLength={6}
                  disabled={loading}
                />
              </div>

              {view === "login" && (
                <button
                  type="button"
                  onClick={() => setView("forgot")}
                  className="font-mono text-[10px] text-muted-foreground hover:text-primary transition-colors"
                >
                  Forgot password?
                </button>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-sm font-mono text-sm uppercase tracking-wider bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 btn-mechanical"
              >
                {loading ? "..." : view === "login" ? "Sign In" : "Sign Up"}
              </button>
            </form>

            {view === "login" && (
              <button
                onClick={async () => {
                  setLoading(true);
                  setEmail(DEMO_EMAIL);
                  setPassword(DEMO_PASSWORD);
                  try {
                    // Try sign in first, if fails create the demo account then sign in
                    const { error } = await supabase.auth.signInWithPassword({
                      email: DEMO_EMAIL,
                      password: DEMO_PASSWORD,
                    });
                    if (error) {
                      // Create demo account
                      const { error: signUpErr } = await supabase.auth.signUp({
                        email: DEMO_EMAIL,
                        password: DEMO_PASSWORD,
                      });
                      if (signUpErr) throw signUpErr;
                      // Try login again
                      const { error: retryErr } = await supabase.auth.signInWithPassword({
                        email: DEMO_EMAIL,
                        password: DEMO_PASSWORD,
                      });
                      if (retryErr) throw retryErr;
                    }
                    toast.success("Welcome, demo user!");
                  } catch (err: any) {
                    toast.error(err.message || "Demo login failed.");
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className="w-full py-3 rounded-sm font-mono text-sm uppercase tracking-wider border-2 border-primary/50 bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50 btn-mechanical flex items-center justify-center gap-2"
              >
                ⚡ Demo — Press &amp; Enter
              </button>
            )}

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-background px-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  or
                </span>
              </div>
            </div>

            <button
              onClick={async () => {
                setLoading(true);
                const { error } = await lovable.auth.signInWithOAuth("google" as any, {
                  redirect_uri: window.location.origin,
                });
                if (error) toast.error(error.message || "Google sign-in failed.");
                setLoading(false);
              }}
              disabled={loading}
              className="w-full py-3 rounded-sm font-mono text-sm uppercase tracking-wider border border-border bg-background text-foreground hover:bg-accent transition-colors disabled:opacity-50 btn-mechanical flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>

            <button
              onClick={() => setView(view === "login" ? "signup" : "login")}
              className="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {view === "login" ? "Need an account? Sign up" : "Already have an account? Sign in"}
            </button>

            {/* Sandbox mode */}
            <button
              onClick={() => {
                sessionStorage.setItem("sandbox", "true");
                navigate("/sandbox");
              }}
              className="w-full py-3 rounded-sm font-mono text-sm uppercase tracking-wider border border-dashed border-primary/30 text-primary/70 hover:text-primary hover:border-primary/60 hover:bg-primary/5 transition-all disabled:opacity-50 btn-mechanical flex items-center justify-center gap-2"
            >
              🧪 Sandbox Mode
            </button>

          </>
        )}
      </div>
    </div>
  );
};

export default Auth;
