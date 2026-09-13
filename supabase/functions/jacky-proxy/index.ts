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

// Writes to these paths need more than a signed-in caller. `/api/control` is
// the engine's master on/off switch: flipping it pauses inference for everyone
// sharing the engine, so being logged in is not enough. Reads still require
// sign-in — authentication runs before any of this — but not the admin role:
// the current mode is not sensitive, and dashboards show it to every user.
const ADMIN_ONLY_WRITES = new Set(["/api/control"]);

/**
 * Whether the engine path may be relayed at all. Expects an already-canonical
 * `/api/...` path: checking a raw one would let a differently-spelled variant
 * of a blocked path miss the allowlist and be forwarded anyway.
 */
function isAllowed(path: string): boolean {
  if (ALLOWED_EXACT.has(path)) return true;
  return ALLOWED_PATTERNS.some((re) => re.test(path));
}

/**
 * Folds a bare path (`status`, `squads/coding/ask`) or an already-full one
 * (`/api/status`) into one canonical `/api/...` form, so the allowlist has a
 * single spelling to check regardless of which caller sent the request.
 * `jackyClient.ts` always sends full paths; kept for parity with the other two
 * relays and in case a future caller sends the bare form.
 */
function canonicalizePath(raw: string): string {
  const trimmed = raw.trim().replace(/^\/+/, '');
  return `/api/${trimmed.replace(/^api\//, '')}`;
}

// Reads default fast; inference needs room to think.
const READ_TIMEOUT_MS = 8_000;
const INFERENCE_TIMEOUT_MS = 60_000;

/**
 * JSON response carrying the CORS headers. Every response with a body goes
 * through here — a bare `Response` omits them, and the browser then reports a
 * CORS failure instead of the status and message actually sent. The only
 * exception is the bodiless OPTIONS preflight, which sets them itself.
 */
function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type SupabaseClient = ReturnType<typeof createClient>;

/**
 * Resolves a client bound to the caller's token, or the 401 to return instead.
 *
 * The subject is verified but not carried: `has_role()` reads `auth.uid()`
 * itself, so nothing downstream needs to pass an identity around (and cannot
 * pass the wrong one). It is still checked here — a token with no subject would
 * leave `auth.uid()` NULL inside the function and deny, but as a confusing 403
 * rather than the 401 this actually is.
 */
async function authenticate(
  req: Request,
): Promise<{ error: Response } | { sb: SupabaseClient }> {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) {
    return { error: json({ error: "Unauthorized" }, 401) };
  }

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: auth } } },
  );
  const { data, error } = await sb.auth.getClaims(auth.replace("Bearer ", ""));
  if (error || !data?.claims?.sub) {
    return { error: json({ error: "Unauthorized" }, 401) };
  }
  return { sb };
}

/**
 * Null when the caller may perform an admin-only write, otherwise the response
 * to return. Authentication is not authorization: `getClaims` proves only that
 * someone is signed in, and it hands back the Postgres role (`authenticated`),
 * never an application one. The application role lives in `public.user_roles`
 * and is read through the `has_role()` security-definer function, which
 * resolves the user from the request's own JWT rather than from an argument.
 */
async function requireAdmin(sb: SupabaseClient, enginePath: string): Promise<Response | null> {
  const { data, error } = await sb.rpc("has_role", { _role: "admin" });

  if (error) {
    // Fail closed, but say which thing is broken. A missing function means the
    // roles migration has not been applied to this project — an operator
    // problem, and a bare 403 would send someone hunting a permissions bug
    // that isn't there.
    console.error("has_role RPC failed:", error.message);
    return json({
      error: "Role check unavailable",
      detail:
        "public.has_role() did not answer. Apply the user_roles migration to this project.",
    }, 503);
  }

  if (data !== true) {
    return json({
      error: "Admin role required",
      detail: `${enginePath} changes engine state for everyone, so writes are restricted to admins.`,
    }, 403);
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const authed = await authenticate(req);
  if ("error" in authed) return authed.error;
  const sb = authed.sb;

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
  const enginePath = canonicalizePath(path);
  if (!isAllowed(enginePath)) {
    // Explicit about the reason — a silent 404 here is a debugging trap.
    return json({ error: `Path not allowlisted by jacky-proxy: ${enginePath}` }, 403);
  }

  // The method the ENGINE should see. In SDK style this is always declared in
  // the envelope, because the SDK itself can only issue POSTs.
  //
  // Compared case-insensitively, matching eru's relay. A strict `=== "POST"`
  // read `{ method: "post" }` as a GET, so the engine answered with the current
  // state and the write silently did not happen — indistinguishable from
  // success at the call site. Failing safe, but failing quietly.
  const method =
    String(envelope.method || "").toUpperCase() === "POST" ||
    (!envelope.path && req.method === "POST")
      ? "POST"
      : "GET";

  // Checked after the method is resolved, not before: the engine path alone
  // does not say whether this call reads the switch or flips it.
  if (method === "POST" && ADMIN_ONLY_WRITES.has(enginePath)) {
    const denied = await requireAdmin(sb, enginePath);
    if (denied) return denied;
  }

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
    const upstream = await fetch(base + enginePath, {
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
