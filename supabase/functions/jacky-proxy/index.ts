// jacky-proxy — eYe Wave 1 edge bridge to the real Jacky Flask engine.
//
// Mirrors jackie-ollama's pattern (CORS + Supabase-auth gate + env-configured
// upstream). Keeps the jacky host + token server-side and sidesteps CORS so
// Jackie can show real RTX-3090 telemetry and route real inference through the
// same engine PC uses. Matches the shared jackyClient contract.
//
// Env: JACKY_API_BASE (jacky host root, e.g. https://sas.example.com) and
// optional JACKY_API_TOKEN.
//
// Invoke (POST) with a JSON body:
//   { "path": "status" }
//   { "path": "ask", "method": "POST", "body": { "prompt": "…", "task_type": "general" } }
// Returns: { ok, status, data } — data is the upstream JSON.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
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

const ALLOWED = new Set(["GET", "POST"]);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const un = await requireUser(req);
  if (un) return un;

  const base = (Deno.env.get("JACKY_API_BASE") || "").replace(/\/+$/, "");
  const token = Deno.env.get("JACKY_API_TOKEN") || "";
  if (!base) {
    return json(
      { error: "jacky link not configured", detail: "Set the JACKY_API_BASE secret to your jacky host root." },
      503,
    );
  }

  const payload = await req.json().catch(() => ({} as Record<string, unknown>));
  const rawPath = String((payload as any).path || "").replace(/^\/+/, "");
  if (!rawPath) return json({ error: "missing 'path'" }, 400);
  const method = String((payload as any).method || "GET").toUpperCase();
  if (!ALLOWED.has(method)) return json({ error: `method ${method} not allowed` }, 405);

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const upstream = await fetch(`${base}/api/${rawPath}`, {
      method,
      headers,
      body: method === "POST" ? JSON.stringify((payload as any).body ?? {}) : undefined,
      signal: controller.signal,
    });
    const text = await upstream.text();
    let data: unknown;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }
    return json({ ok: upstream.ok, status: upstream.status, data }, upstream.ok ? 200 : 502);
  } catch (e) {
    return json({ error: "jacky upstream unreachable", detail: String((e as Error)?.message || e) }, 502);
  } finally {
    clearTimeout(timer);
  }
});
