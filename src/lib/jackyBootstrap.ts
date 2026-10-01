/**
 * Wires the shared `jackyClient` to Jackie's platform.
 *
 * `jackyClient.ts` is byte-identical in all four fleet repos, so it carries no
 * knowledge of Supabase. This file is the seam: it hands the client an invoker
 * that routes every engine call through the `jacky-proxy` edge function, which
 * holds the engine URL and token in Supabase secrets and requires a signed-in
 * session. See `supabase/functions/jacky-proxy/index.ts`.
 *
 * Import once, as early as possible — `src/main.tsx` or `src/App.tsx`:
 *
 *     import '@/lib/jackyBootstrap';
 *
 * Idempotent, so a stray second import is harmless.
 */

import { supabase } from '@/integrations/supabase/client';
import { jackyClient } from '@/lib/jackyClient';

let wired = false;

export function bootstrapJacky() {
  if (wired) return jackyClient;
  wired = true;

  jackyClient.setProxyInvoker(async (path, init) => {
    // The edge function requires a session. Checking here turns an opaque 401
    // into a link state the UI can explain.
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Not signed in — Jacky engine access requires a Supabase session');
    }

    // The SDK can only issue POSTs, so the engine path and method ride in the
    // body — the envelope shape jacky-proxy expects.
    const { data, error } = await supabase.functions.invoke('jacky-proxy', {
      body: { path, method: init.method, body: init.body },
    });

    if (error) throw new Error(error.message || 'jacky-proxy invoke failed');
    // The proxy passes engine-level errors through in the payload rather than as
    // a transport failure; surface them as thrown errors so jackyClient flips
    // the link state instead of handing a bad payload to a dashboard.
    if (data && typeof data === 'object' && 'error' in data && data.error) {
      throw new Error(String((data as { error: unknown }).error));
    }
    return data;
  });

  return jackyClient;
}

export default bootstrapJacky();
