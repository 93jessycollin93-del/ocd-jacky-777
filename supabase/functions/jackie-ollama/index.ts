// Bridge to a self-hosted Ollama instance (localhost via tunnel, home GPU, VPS).
// Requires OLLAMA_BASE_URL (e.g. https://ollama.mydomain.com or a Cloudflare Tunnel URL).
// Optional OLLAMA_API_KEY if the endpoint is protected.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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

// Ollama returns NDJSON. Rewrap into OpenAI-compatible SSE so the same client parser works.
function ndjsonToSse(readable: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buf = "";
  return new ReadableStream({
    async start(controller) {
      const reader = readable.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buf.indexOf("\n")) !== -1) {
          const line = buf.slice(0, idx).trim();
          buf = buf.slice(idx + 1);
          if (!line) continue;
          try {
            const j = JSON.parse(line);
            const content = j.message?.content ?? j.response ?? "";
            const chunk = { choices: [{ delta: { content } }] };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
            if (j.done) controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          } catch { /* skip */ }
        }
      }
      controller.close();
    },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const un = await requireUser(req);
  if (un) return un;

  const base = Deno.env.get("OLLAMA_BASE_URL");
  if (!base) {
    return new Response(
      JSON.stringify({
        error: "OLLAMA_BASE_URL not configured. Add it in Cloud → Secrets. Expose your local Ollama via a Cloudflare Tunnel or ngrok, then paste the URL (e.g. https://ollama.mydomain.com).",
        needs_secret: "OLLAMA_BASE_URL",
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const { messages, model, system } = await req.json();
    const selected = model || "llama3.2:3b";
    const optionalKey = Deno.env.get("OLLAMA_API_KEY");
    const resp = await fetch(`${base.replace(/\/$/, "")}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(optionalKey ? { Authorization: `Bearer ${optionalKey}` } : {}),
      },
      body: JSON.stringify({
        model: selected,
        messages: [
          ...(system ? [{ role: "system", content: system }] : []),
          ...messages,
        ],
        stream: true,
      }),
    });
    if (!resp.ok || !resp.body) {
      const text = await resp.text().catch(() => "");
      return new Response(JSON.stringify({ error: `Ollama ${resp.status}: ${text || "no body"}` }), {
        status: resp.status || 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(ndjsonToSse(resp.body), {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
