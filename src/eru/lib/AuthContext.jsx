// Shim: Eru's AuthContext, backed by Jackie's Supabase session.
// Pages that called `useAuth()` (Eru) get the same shape they expect, but the
// session, login/logout, and identity come from Jackie. No Base44 round-trips.
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const AuthContext = createContext(null);

function mapUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    email: u.email,
    full_name: u.user_metadata?.full_name || u.email?.split('@')[0] || 'Operator',
    role: u.user_metadata?.role || 'user',
    isAdmin: u.user_metadata?.role === 'admin',
    avatar_url: u.user_metadata?.avatar_url,
    created_date: u.created_at,
  };
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setUser(mapUser(data.session?.user));
      setIsLoadingAuth(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(mapUser(session?.user));
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  const login = useCallback(() => { window.location.href = '/auth'; }, []);
  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    window.location.href = '/auth';
  }, []);
  const refreshUser = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    setUser(mapUser(data.user));
  }, []);

  const value = {
    user,
    isAuthenticated: !!user,
    isLoadingAuth,
    isLoadingPublicSettings: false,
    authError: null,
    appPublicSettings: { id: 'jackie', public_settings: {} },
    login,
    logout,
    refreshUser,
    checkUserAuth: refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    // Standalone fallback so Eru components used outside the provider don't crash
    return {
      user: null, isAuthenticated: false, isLoadingAuth: false,
      isLoadingPublicSettings: false, authError: null, appPublicSettings: null,
      login: () => {}, logout: async () => {}, refreshUser: async () => {}, checkUserAuth: async () => {},
    };
  }
  return ctx;
};

export default AuthContext;
