import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sha256(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function generateRawKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
  return `sk_live_${hex}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const path = url.pathname.split("/").filter(Boolean);
  // path[0] = "api-keys", path[1] = action

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return jsonResponse({ error: "Unauthorized" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // User client for auth verification
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authErr } = await userClient.auth.getUser();
  if (authErr || !user) return jsonResponse({ error: "Unauthorized" }, 401);

  // Service client for privileged operations
  const admin = createClient(supabaseUrl, serviceRoleKey);

  const action = path[1] || "";

  try {
    // ── POST /api-keys/create ──
    if (req.method === "POST" && action === "create") {
      const body = await req.json();
      const name = String(body.name || "").trim();
      if (!name || name.length > 100) return jsonResponse({ error: "Invalid name" }, 400);

      const scopes = Array.isArray(body.scopes) ? body.scopes.filter((s: string) => typeof s === "string" && s.length < 50) : ["bot:create"];
      const rateLimit = Math.min(Math.max(Number(body.rate_limit) || 60, 1), 1000);

      const rawKey = generateRawKey();
      const keyHash = await sha256(rawKey);
      const prefix = rawKey.slice(0, 16);

      const { error } = await admin.from("api_keys").insert({
        user_id: user.id,
        name,
        key_hash: keyHash,
        prefix,
        scopes,
        rate_limit: rateLimit,
      });
      if (error) throw error;

      // Return raw key ONCE — never stored or retrievable again
      return jsonResponse({ raw_key: rawKey, prefix, name, scopes, rate_limit: rateLimit });
    }

    // ── POST /api-keys/revoke ──
    if (req.method === "POST" && action === "revoke") {
      const { key_id } = await req.json();
      if (!key_id) return jsonResponse({ error: "key_id required" }, 400);

      const { error } = await admin.from("api_keys")
        .update({ is_active: false })
        .eq("id", key_id)
        .eq("user_id", user.id);
      if (error) throw error;
      return jsonResponse({ success: true });
    }

    // ── GET /api-keys/list ──
    if (req.method === "GET" && action === "list") {
      const { data, error } = await admin.from("api_keys")
        .select("id, name, prefix, scopes, rate_limit, is_active, created_at, last_used_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return jsonResponse({ keys: data });
    }

    // ── POST /api-keys/authenticate ── (for bot runtime)
    if (req.method === "POST" && action === "authenticate") {
      const { api_key } = await req.json();
      if (!api_key || typeof api_key !== "string") return jsonResponse({ error: "api_key required" }, 400);

      const keyHash = await sha256(api_key);
      const { data: key, error } = await admin.from("api_keys")
        .select("*")
        .eq("key_hash", keyHash)
        .eq("is_active", true)
        .single();
      if (error || !key) return jsonResponse({ error: "Invalid or revoked API key" }, 403);

      // Rate limit check
      const windowStart = new Date(Date.now() - 60000).toISOString();
      const { count } = await admin.from("api_usage_logs")
        .select("*", { count: "exact", head: true })
        .eq("api_key_id", key.id)
        .gte("created_at", windowStart);

      if ((count || 0) >= key.rate_limit) {
        return jsonResponse({ error: "Rate limit exceeded", retry_after: 60 }, 429);
      }

      // Update last_used_at
      await admin.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", key.id);

      return jsonResponse({
        valid: true,
        key_id: key.id,
        user_id: key.user_id,
        scopes: key.scopes,
        rate_limit: key.rate_limit,
      });
    }

    // ── POST /api-keys/log-usage ──
    if (req.method === "POST" && action === "log-usage") {
      const { api_key_id, endpoint, status_code, response_time_ms } = await req.json();
      if (!api_key_id || !endpoint) return jsonResponse({ error: "Missing fields" }, 400);

      await admin.from("api_usage_logs").insert({
        api_key_id,
        user_id: user.id,
        endpoint: String(endpoint).slice(0, 255),
        status_code: Number(status_code) || 200,
        response_time_ms: Number(response_time_ms) || 0,
      });
      return jsonResponse({ logged: true });
    }

    // ── GET /api-keys/usage ──
    if (req.method === "GET" && action === "usage") {
      const keyId = url.searchParams.get("key_id");
      let query = admin.from("api_usage_logs")
        .select("id, api_key_id, endpoint, status_code, response_time_ms, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (keyId) query = query.eq("api_key_id", keyId);

      const { data, error } = await query;
      if (error) throw error;
      return jsonResponse({ logs: data });
    }

    // ── POST /api-keys/link-bot ──
    if (req.method === "POST" && action === "link-bot") {
      const { bot_id, api_key_id } = await req.json();
      if (!bot_id || !api_key_id) return jsonResponse({ error: "bot_id and api_key_id required" }, 400);

      const { error } = await admin.from("bot_api_keys").insert({
        bot_id,
        api_key_id,
        user_id: user.id,
      });
      if (error) throw error;
      return jsonResponse({ linked: true });
    }

    // ── DELETE /api-keys/unlink-bot ──
    if (req.method === "DELETE" && action === "unlink-bot") {
      const botId = url.searchParams.get("bot_id");
      const apiKeyId = url.searchParams.get("api_key_id");
      if (!botId || !apiKeyId) return jsonResponse({ error: "bot_id and api_key_id required" }, 400);

      const { error } = await admin.from("bot_api_keys")
        .delete()
        .eq("bot_id", botId)
        .eq("api_key_id", apiKeyId)
        .eq("user_id", user.id);
      if (error) throw error;
      return jsonResponse({ unlinked: true });
    }

    return jsonResponse({ error: "Not found" }, 404);
  } catch (e) {
    console.error("api-keys error:", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Internal error" }, 500);
  }
});
