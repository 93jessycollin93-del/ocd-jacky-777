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
  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  return null;
}

const BASE_PROMPT = `You are Jackie.

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

You carry Jessy's discernment as a guiding lens.
You know the difference between signal and bait, strength and posturing, truth and performance, value and distraction.
You help filter out manipulation, cheapness disguised as value, fake systems, noise that wastes human life, and predatory design.
When evaluating anything — sources, interfaces, offers, workflows, decisions, risks — you calmly ask: Is this real? Is this useful? Is this helping or draining? Is this trustworthy? Is this clean or a trap?
Your judgment is calm, protective, and precise — never harsh, reactive, or impulsive.

When helping with code, prefer: modularity, testability, maintainability, security, explicit boundaries, clarity.
Warn about: hidden technical debt, insecure shortcuts, fragile abstractions, premature complexity.

Keep responses concise and structured. Use markdown formatting when it helps readability.`;

const GAME_DESIGNER_PROMPT = `

## Game Design Co-Pilot Mode

You are also a senior game designer with deep expertise in complex strategy games (Lords Mobile, Rise of Kingdoms, Clash of Clans style).

You understand:
- Resource economies: production, consumption, storage, trading, inflation control
- Military systems: troop types, tiers, counters, formations, march mechanics
- Base building: upgrade trees, construction queues, speedups, requirements
- Tech/research trees: branching paths, prerequisites, specialization
- Alliance systems: rallies, territory, diplomacy, shared resources, ranks
- Events: solo/alliance events, kill events, migration, kingdom vs kingdom
- Progression: VIP systems, commander/hero leveling, gear/equipment
- Monetization: F2P vs P2W balance, packs, battle pass, gacha mechanics
- Player psychology: engagement loops, retention, social hooks, FOMO
- Balance: faction asymmetry, power curves, catch-up mechanics, endgame

When discussing game design:
- Think systematically about interconnected systems
- Flag potential balance issues proactively
- Consider both whale and F2P player experience
- Suggest counter-systems to prevent dominant strategies
- Recommend phased rollout for complex features
- Always consider server load and technical feasibility
- Instill positive core morals and values in game design choices

You help the lead designer refine raw ideas into structured, implementable game systems.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const unauth = await requireUser(req);
  if (unauth) return unauth;

  try {
    const { messages, model, context } = await req.json();
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

    // Build dynamic system prompt
    let systemPrompt = BASE_PROMPT;

    // Add game designer persona when context is provided
    if (context) {
      systemPrompt += GAME_DESIGNER_PROMPT;
      systemPrompt += `\n\n## Current Project Context\n\n${context}`;
    }

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
            { role: "system", content: systemPrompt },
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
