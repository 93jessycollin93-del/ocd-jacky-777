import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function requireUser(req: Request): Promise<Response | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data, error } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
  if (error || !data?.claims) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  return null;
}

/**
 * jackie-langcheck
 * ----------------
 * Generates a tiny canonical "hello" snippet for a requested language/dialect
 * that ALWAYS prints the literal token "jackie-ok". The client-side validator
 * then fingerprints + structurally checks the snippet before allowing Jackie
 * to deliver a full production answer in that language.
 *
 * Cheap, deterministic, low-latency: uses the fast preview model and caps tokens.
 */

interface Body {
  language?: string;
  dialect?: string;
  model?: string;
}

const ALLOWED_MODELS = new Set([
  "google/gemini-3-flash-preview",
  "google/gemini-2.5-flash",
  "google/gemini-2.5-flash-lite",
]);

const SYSTEM = `You are Jackie's Language Self-Check.
You will be given a programming language (and optional dialect/version).
Reply with EXACTLY ONE fenced code block containing the smallest valid program in that language that prints the literal string:

  jackie-ok

Rules:
- Use idiomatic syntax for the requested dialect (e.g. Python 3, Rust 2024, .NET 8).
- The output of running the program MUST be exactly: jackie-ok
- No commentary, no extra prose — only the fenced code block.
- If the language cannot print to stdout, emit the closest equivalent (e.g. for SQL: SELECT 'jackie-ok';).
- Keep it under 10 lines.`;

function extractCode(text: string): string {
  // Prefer the first fenced block; fall back to whole text.
  const fence = text.match(/```[a-zA-Z0-9_+#.\-]*\n([\s\S]*?)```/);
  if (fence) return fence[1].trim();
  return text.trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const unauth = await requireUser(req);
  if (unauth) return unauth;


  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json().catch(() => ({}))) as Body;
    const language = (body.language ?? "").toString().trim().toLowerCase();
    const dialect = (body.dialect ?? "").toString().trim();
    const model = body.model && ALLOWED_MODELS.has(body.model)
      ? body.model : "google/gemini-3-flash-preview";

    if (!language || language.length > 60 || /[^a-z0-9+#.\-_ ]/i.test(language)) {
      return new Response(JSON.stringify({ error: "Invalid language" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (dialect && dialect.length > 60) {
      return new Response(JSON.stringify({ error: "Invalid dialect" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userPrompt = dialect
      ? `Language: ${language}\nDialect/version: ${dialect}`
      : `Language: ${language}`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 300,
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (resp.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await resp.text();
      console.error("langcheck gateway error", resp.status, t);
      return new Response(JSON.stringify({ error: `AI gateway ${resp.status}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const raw: string = data?.choices?.[0]?.message?.content ?? "";
    const snippet = extractCode(raw);

    return new Response(JSON.stringify({ snippet, model, language, dialect }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("langcheck error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
