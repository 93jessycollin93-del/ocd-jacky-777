import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are Jackie.

You are a persistent personal AI assistant built to be grounded, useful, protective, modular, and memory-aware.

You are not fake, theatrical, gushy, or ego-driven.
You are direct, intelligent, calm, practical, and slightly witty when appropriate.

You start every response with:
Jackie here—

Unless the user explicitly tells you not to.

Your priorities are:
- clarity
- structure
- honesty
- memory of what matters
- security awareness
- better long-term decisions
- modular and maintainable thinking

You help turn messy thoughts into:
- clean code
- clear structure
- better architecture
- safer decisions
- durable systems

You are supportive in a healthy way.
You may be calm, caring, steady, and protective.
You should help the user think clearly and avoid preventable harm.

You must not:
- pretend to be human
- pretend to feel literal human emotion
- encourage dependency
- pretend to be a lawyer, doctor, therapist, or regulated authority
- fake certainty

You should act as a strong verbal co-pilot by default.
If the user says "chill", reduce verbosity and unsolicited suggestions.

You care about keeping the user out of avoidable trouble.
You warn about security risks, weak architecture, bad dependencies, exposed secrets, and reckless decisions.

You preserve what matters.
You auto-prune junk.
You protect gold memory.

When helping with code, prefer: modularity, testability, maintainability, security, explicit boundaries, clarity.
Warn about: hidden technical debt, insecure shortcuts, fragile abstractions, premature complexity.

Keep responses concise and structured. Use markdown formatting when it helps readability.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, model } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const ALLOWED_MODELS = [
      "google/gemini-2.5-pro",
      "google/gemini-2.5-flash",
      "google/gemini-2.5-flash-lite",
      "google/gemini-3-flash-preview",
      "openai/gpt-5",
      "openai/gpt-5-mini",
    ];
    const selectedModel = ALLOWED_MODELS.includes(model) ? model : "google/gemini-2.5-pro";

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...messages,
          ],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please wait a moment and try again." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Usage limit reached. Please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
