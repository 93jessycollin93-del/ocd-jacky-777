import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import { isOffline, storedUser } from "@/lib/offline-session";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  /** True when `user` comes from the device's saved session because the app is offline (no live session). */
  offline: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  offline: false,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const apply = (next: Session | null) => {
      const fallback = !next && isOffline() ? storedUser() : null;
      setSession(next);
      setUser(next?.user ?? fallback);
      setOffline(!!fallback);
      setLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => apply(next));

    // Offline, refreshing an expired token can retry for up to ~30 s; open saved pages straight away instead.
    if (isOffline() && storedUser()) apply(null);
    supabase.auth.getSession().then(({ data: { session: next } }) => apply(next));

    // Back online: let Supabase refresh the real session (or report that it's gone).
    const onOnline = () => {
      supabase.auth.getSession().then(({ data: { session: next } }) => apply(next));
    };
    window.addEventListener("online", onOnline);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("online", onOnline);
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, offline, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
