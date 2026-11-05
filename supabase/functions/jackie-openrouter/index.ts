// Streaming chat via OpenRouter (free-tier Llama + many free models).
// Requires OPENROUTER_API_KEY. Get one at openrouter.ai/keys.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Any model id from openrouter.ai is accepted, but we prefer known free ids.
const KNOWN_FREE = new Set([
  "meta-llama/llama-3.3-70b-instruct:free",
  "meta-llama/llama-3.2-3b-instruct:free",
  "meta-llama/llama-3.2-1b-instruct:free",
  "meta-llama/llama-3.1-8b-instruct:free",
  "meta-llama/llama-3.1-405b-instruct:free",
  "meta-llama/llama-4-scout:free",
  "meta-llama/llama-4-maverick:free",
  "google/gemma-3-27b-it:free",
  "google/gemma-2-9b-it:free",
  "mistralai/mistral-7b-instruct:free",
  "mistralai/mistral-small-3.1-24b-instruct:free",
  "qwen/qwen-2.5-72b-instruct:free",
  "qwen/qwen-2.5-coder-32b-instruct:free",
  "deepseek/deepseek-r1:free",
  "deepseek/deepseek-chat:free",
  "nousresearch/hermes-3-llama-3.1-405b:free",
  "microsoft/phi-3-mini-128k-instruct:free",
]);

async function requireUser(req: Request): Promise<Response | null> {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: auth } } },
  );
  const { data, error } = await sb.auth.getClaims(auth.replace("Bearer ", ""));
  if (error || !data?.claims) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  return null;
}

// Offline by default: this function reaches an outside service, so it only runs
// when the owner turns its group on in the ONLINE_FEATURES secret
// (comma-separated, e.g. "cloud_ai,pc_bridge", or "all"). Empty or unset = offline.
function offlineResponse(group: string): Response | null {
  const on = (Deno.env.get("ONLINE_FEATURES") ?? "").split(",").map((g) => g.trim().toLowerCase());
  if (on.includes("all") || on.includes(group)) return null;
  return new Response(
    JSON.stringify({
      ok: false,
      error: "offline_mode",
      group,
      message: `Offline mode: "${group}" is turned off. The owner can add it to the ONLINE_FEATURES secret.`,
    }),
    { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const offline = offlineResponse("cloud_ai");
  if (offline) return offline;
  const un = await requireUser(req);
  if (un) return un;

  const key = Deno.env.get("OPENROUTER_API_KEY");
  if (!key) {
    return new Response(
      JSON.stringify({
        error: "OPENROUTER_API_KEY not configured. Add it in Cloud → Secrets. Get a free key at openrouter.ai/keys",
        needs_secret: "OPENROUTER_API_KEY",
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const { messages, model, system } = await req.json();
    const selected = (typeof model === "string" && model.length > 0)
      ? model
      : "meta-llama/llama-3.3-70b-instruct:free";
    const body = {
      model: selected,
      messages: [
        ...(system ? [{ role: "system", content: system }] : []),
        ...messages,
      ],
      stream: true,
    };
    const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://jecodedesjeux2026.lovable.app",
        "X-Title": "Jackie",
      },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      const text = await resp.text();
      return new Response(JSON.stringify({ error: `OpenRouter ${resp.status}: ${text}`, known_free: KNOWN_FREE.has(selected) }), {
        status: resp.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(resp.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
