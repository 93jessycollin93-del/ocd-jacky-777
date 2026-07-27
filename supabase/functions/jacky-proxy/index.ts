// jacky-proxy — server-side relay to the real `jacky` Flask engine.
//
// Jackie's browser cannot call the engine directly: the origins differ and the
// engine ships no CORS headers. This function is the hop that
// `src/lib/jackyClient.ts` targets when its transport is `proxy`.
//
// Relaying rather than calling direct buys two things beyond CORS:
//   - the engine URL and token stay in Supabase secrets, never in the bundle;
//   - every call sits behind Supabase auth, so an exposed function URL is not an
//     open tunnel to the host's shell and GPU.
//
// Contract (identical to base44/functions/jackyProxy in eru, so one client file
// serves both platforms). Two equivalent request shapes:
//
//   1. SDK style — what `supabase.functions.invoke('jacky-proxy', …)` produces.
//      Always a POST, so the engine path and method travel in the body:
//        { path: '/api/status', method: 'GET' }
//        { path: '/api/ask', method: 'POST', body: { prompt: '…' } }
//
//   2. Plain fetch style, for callers not using the SDK:
//        GET  ?path=/api/status
//        POST ?path=/api/ask   with the forwarded JSON as the request body
//
// The body form wins when both are present.
//
// Secrets (Supabase → Edge Functions → Secrets):
//   JACKY_API_BASE   e.g. https://jacky.example.trycloudflare.com   (required)
//   JACKY_API_TOKEN  bearer token for the engine                    (optional)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Engine paths this proxy will relay. An allowlist rather than open forwarding:
// without it, any authenticated user could reach arbitrary paths on the host —
// including /api/shell, which the engine exposes for whitelisted PowerShell.
// Read-and-infer only; extend deliberately.
const ALLOWED_EXACT = new Set([
  "/api/status",
  "/api/metrics",
  "/api/assessment",
  "/api/ask",
  "/api/control",
  "/api/models",
  "/api/bots",
  "/api/squads",
  "/api/ecps/compress",
  "/api/ecps/decompress",
  "/api/ecps/benchmark",
]);

// Squad routes carry a name segment, so they need a pattern.
const ALLOWED_PATTERNS = [/^\/api\/squads\/[A-Za-z0-9_-]{1,64}\/(ask|discuss)$/];

// KNOWN GAP — `/api/control` is the engine's master on/off switch, so it should
// require more than a signed-in caller. Eru's equivalent gates it on
// `user.role === 'admin'`, which Base44 supplies directly. Supabase has no
// app-level role here: `getClaims` returns the Postgres role
// (`authenticated`), not an application one. Closing this properly needs the
// `user_roles` table + `has_role()` security-definer function that
// FLEET_PARITY_PLAN.md §4 already calls for — a migration, not a patch to this
// file. Until that lands, treat `/api/control` as reachable by any signed-in
// user and gate it in the UI rather than relying on this relay.

function isAllowed(path: string): boolean {
  if (ALLOWED_EXACT.has(path)) return true;
  return ALLOWED_PATTERNS.some((re) => re.test(path));
}

// Reads default fast; inference needs room to think.
const READ_TIMEOUT_MS = 8_000;
const INFERENCE_TIMEOUT_MS = 60_000;

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function requireUser(req: Request): Promise<Response | null> {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: auth } } },
  );
  const { data, error } = await sb.auth.getClaims(auth.replace("Bearer ", ""));
  if (error || !data?.claims) return json({ error: "Unauthorized" }, 401);
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const unauthorized = await requireUser(req);
  if (unauthorized) return unauthorized;

  const base = Deno.env.get("JACKY_API_BASE")?.replace(/\/+$/, "");
  if (!base) {
    return json(
      {
        error:
          "JACKY_API_BASE not configured. Add it in Supabase → Edge Functions → Secrets, " +
          "pointing at your Jacky engine (e.g. a Cloudflare tunnel URL).",
        needs_secret: "JACKY_API_BASE",
      },
      503,
    );
  }

  // Read the envelope. A POST always carries JSON here (SDK style); a bare GET
  // carries nothing and falls back to the query string.
  let envelope: { path?: unknown; method?: unknown; body?: unknown } = {};
  if (req.method === "POST") {
    try {
      envelope = await req.json();
    } catch {
      return json({ error: "Request body must be valid JSON" }, 400);
    }
  }

  const path =
    typeof envelope.path === "string" && envelope.path
      ? envelope.path
      : new URL(req.url).searchParams.get("path");

  if (!path) {
    return json(
      { error: 'Missing engine path — pass { path: "/api/status" } or ?path=/api/status' },
      400,
    );
  }
  if (!path.startsWith("/api/")) return json({ error: "path must start with /api/" }, 400);
  if (!isAllowed(path)) {
    // Explicit about the reason — a silent 404 here is a debugging trap.
    return json({ error: `Path not allowlisted by jacky-proxy: ${path}` }, 403);
  }

  // The method the ENGINE should see. In SDK style this is always declared in
  // the envelope, because the SDK itself can only issue POSTs.
  const method =
    envelope.method === "POST" || (!envelope.path && req.method === "POST") ? "POST" : "GET";

  const headers: Record<string, string> = { Accept: "application/json" };
  const token = Deno.env.get("JACKY_API_TOKEN");
  if (token) headers.Authorization = `Bearer ${token}`;

  let body: string | undefined;
  if (method === "POST") {
    headers["Content-Type"] = "application/json";
    // Envelope style nests the engine payload under `body`; fetch style sends it
    // as the whole request body.
    const payload = envelope.path ? (envelope.body ?? {}) : envelope;
    body = JSON.stringify(payload);
  }

  const timeoutMs = method === "POST" ? INFERENCE_TIMEOUT_MS : READ_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const upstream = await fetch(base + path, {
      method,
      headers,
      body,
      signal: controller.signal,
    });

    const text = await upstream.text();
    // Pass the engine's own status through so the client can distinguish a
    // broken tunnel from an engine that answered with an error.
    let payload: unknown;
    try {
      payload = JSON.parse(text);
    } catch {
      // Don't echo the upstream body back. A misconfigured tunnel typically
      // answers with someone else's HTML error page, and any signed-in user can
      // reach this relay — the status code is enough to diagnose from.
      payload = { error: "Engine returned a non-JSON response" };
    }
    return json(payload, upstream.ok ? 200 : upstream.status);
  } catch (err) {
    const aborted = err instanceof DOMException && err.name === "AbortError";
    return json(
      {
        error: aborted
          ? `Jacky engine timed out after ${timeoutMs}ms`
          : `Jacky engine unreachable: ${(err as Error).message}`,
        offline: true,
      },
      504,
    );
  } finally {
    clearTimeout(timer);
  }
});
