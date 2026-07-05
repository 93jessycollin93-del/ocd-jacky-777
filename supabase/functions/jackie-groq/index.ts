// Streaming chat via Groq (free tier: 14.4k req/day, real Llama models).
// Requires GROQ_API_KEY secret. User can add it in Cloud → Secrets.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Free-tier Groq models (chat completions API). Update as Groq's catalog changes.
const ALLOWED = new Set([
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "llama-3.2-11b-vision-preview",
  "llama-3.2-90b-vision-preview",
  "llama-3.2-3b-preview",
  "llama-3.2-1b-preview",
  "llama-guard-3-8b",
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "meta-llama/llama-4-maverick-17b-128e-instruct",
  "mixtral-8x7b-32768",
  "gemma2-9b-it",
  "qwen/qwen3-32b",
  "deepseek-r1-distill-llama-70b",
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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const un = await requireUser(req);
  if (un) return un;

  const key = Deno.env.get("GROQ_API_KEY");
  if (!key) {
    return new Response(
      JSON.stringify({
        error: "GROQ_API_KEY not configured. Add it in Cloud → Secrets. Get a free key at console.groq.com/keys",
        needs_secret: "GROQ_API_KEY",
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const { messages, model, system } = await req.json();
    const selected = ALLOWED.has(model) ? model : "llama-3.3-70b-versatile";
    const body = {
      model: selected,
      messages: [
        ...(system ? [{ role: "system", content: system }] : []),
        ...messages,
      ],
      stream: true,
    };
    const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      const text = await resp.text();
      return new Response(JSON.stringify({ error: `Groq ${resp.status}: ${text}` }), {
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
