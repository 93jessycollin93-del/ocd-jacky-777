// Eru ↔ Jackie bridge: safely expose `base44` even when Base44 env is absent.
// When VITE_BASE44_APP_ID is missing, returns a Proxy that no-ops gracefully
// (list/find/create resolve to [] / null; auth.me() resolves to the Jackie user).
import { createClient } from '@base44/sdk';
import { supabase } from '@/integrations/supabase/client';

const appId = import.meta.env.VITE_BASE44_APP_ID;
const appBaseUrl = import.meta.env.VITE_BASE44_APP_BASE_URL;

let realClient = null;
if (appId) {
  try {
    realClient = createClient({
      appId,
      appBaseUrl,
      serverUrl: '',
      requiresAuth: false,
    });
  } catch (err) {
    console.warn('[eru/base44] init failed, using shim:', err);
  }
}

// Map a Base44 user-shape to Jackie's Supabase session
async function jackieUser() {
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return null;
  return {
    id: u.id,
    email: u.email,
    full_name: u.user_metadata?.full_name || u.email?.split('@')[0] || 'Operator',
    role: u.user_metadata?.role || 'user',
    isAdmin: u.user_metadata?.role === 'admin',
    avatar_url: u.user_metadata?.avatar_url,
  };
}

const noopList = async () => [];
const noopOne = async () => null;
const noopVoid = async () => undefined;

const entityShim = new Proxy({}, {
  get(_t, _name) {
    return new Proxy({}, {
      get(_e, op) {
        if (op === 'list' || op === 'filter' || op === 'find') return noopList;
        if (op === 'get' || op === 'create' || op === 'update' || op === 'me') return noopOne;
        if (op === 'delete' || op === 'bulkCreate') return noopVoid;
        return noopOne;
      },
    });
  },
});

const integrationsShim = new Proxy({}, {
  get() { return async () => ({ ok: false, offline: true }); },
});

const authShim = {
  me: jackieUser,
  login: async () => { window.location.href = '/auth'; },
  logout: async () => { await supabase.auth.signOut(); window.location.href = '/auth'; },
  isAuthenticated: async () => !!(await jackieUser()),
};

const functionsShim = new Proxy({}, {
  get() { return async () => ({ data: null, offline: true }); },
});

const shim = {
  entities: entityShim,
  integrations: integrationsShim,
  auth: authShim,
  functions: functionsShim,
  offline: true,
};

export const base44 = realClient ?? shim;
export const isBase44Live = !!realClient;
