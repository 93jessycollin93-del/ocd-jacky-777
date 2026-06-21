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

const PLAN_TOOL = {
  type: "function",
  function: {
    name: "design_bot",
    description: "Infer the optimal bot configuration from a free-form user description.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Concise PascalCase or kebab-case bot name" },
        purpose: { type: "string", description: "1–2 sentence purpose statement" },
        platform: { type: "string", enum: ["telegram", "web", "discord", "api"] },
        behaviorStyle: {
          type: "string",
          enum: ["assistant", "aggressive", "passive", "scraper", "converter", "custom"],
        },
        language: { type: "string", enum: ["nodejs", "python"] },
        logicModules: {
          type: "array",
          items: {
            type: "string",
            enum: [
              "io-response",
              "api-fetcher",
              "file-converter",
              "scraper",
              "auto-reply",
              "scheduler",
              "auth-guard",
            ],
          },
        },
        rationale: { type: "string", description: "Short explanation of choices" },
      },
      required: ["name", "purpose", "platform", "behaviorStyle", "language", "logicModules", "rationale"],
      additionalProperties: false,
    },
  },
} as const;

async function callGateway(body: unknown, apiKey: string) {
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const txt = await resp.text();
    const err: any = new Error(`Gateway ${resp.status}: ${txt}`);
    err.status = resp.status;
    throw err;
  }
  return resp.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const unauth = await requireUser(req);
  if (unauth) return unauth;


  try {
    const payload = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Mode A: fully automatic — user provided just a description
    let plan: {
      name: string;
      purpose: string;
      platform: string;
      behaviorStyle: string;
      language: string;
      logicModules: string[];
      rationale?: string;
    };

    if (payload.description && !payload.name) {
      const planResp = await callGateway(
        {
          model: "google/gemini-3-flash-preview",
          messages: [
            {
              role: "system",
              content:
                "You are a senior bot architect. Given a short user description, infer the best configuration. Choose the simplest viable platform and language. Pick only the modules truly needed.",
            },
            { role: "user", content: String(payload.description).slice(0, 2000) },
          ],
          tools: [PLAN_TOOL],
          tool_choice: { type: "function", function: { name: "design_bot" } },
        },
        LOVABLE_API_KEY,
      );
      const args =
        planResp.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
      if (!args) throw new Error("Planner returned no plan");
      plan = JSON.parse(args);
    } else {
      // Mode B: explicit fields
      plan = {
        name: payload.name,
        purpose: payload.purpose ?? "",
        platform: payload.platform,
        behaviorStyle: payload.behaviorStyle ?? "assistant",
        language: payload.language,
        logicModules: payload.logicModules ?? ["io-response"],
      };
      if (!plan.name || !plan.platform || !plan.language) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const moduleMap: Record<string, string> = {
      "io-response": "Input/Output response handler that processes user messages and returns structured replies",
      "api-fetcher": "API fetcher module that makes HTTP requests to external APIs with configurable endpoints",
      "file-converter": "File conversion module supporting format transformations",
      scraper: "Web scraper module that extracts data from URLs with rate limiting",
      "auto-reply": "Auto-reply trigger system that responds to specific keywords or patterns",
      scheduler: "Scheduled task runner for periodic actions (cron-style)",
      "auth-guard": "Authentication middleware that validates API keys or tokens",
    };
    const platformMap: Record<string, string> = {
      telegram: "Telegram Bot API (node-telegram-bot-api or python-telegram-bot)",
      web: "Express.js (Node.js) or FastAPI (Python) REST + WebSocket",
      discord: "Discord.js (Node.js) or discord.py (Python)",
      api: "Standalone REST API (Express or FastAPI)",
    };

    const modulesDesc = plan.logicModules.map((m) => moduleMap[m] ?? m).join("\n- ");

    const prompt = `Generate a complete, production-ready ${
      plan.language === "nodejs" ? "Node.js (TypeScript)" : "Python 3.10+"
    } bot project.

Bot Name: ${plan.name}
Purpose: ${plan.purpose || "General purpose bot"}
Platform: ${platformMap[plan.platform] ?? plan.platform}
Behavior Style: ${plan.behaviorStyle} — match this personality in responses
Language: ${plan.language === "nodejs" ? "Node.js with TypeScript" : "Python 3.10+"}

Required Modules:
- ${modulesDesc}

Requirements:
1. Complete package.json or requirements.txt
2. .env.example for all secrets
3. README.md with setup
4. Robust error handling, rate limiting, input validation
5. Modular file structure (one concern per file)
6. Logging, graceful shutdown, /health endpoint
7. Never hardcode secrets

Output the FULL project as a single fenced code block. Use file separators:
// === FILE: path/to/file.ext ===`;

    const codeResp = await callGateway(
      {
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "You are an expert bot developer. Generate clean, production-ready code with file separators. No prose outside code comments.",
          },
          { role: "user", content: prompt },
        ],
      },
      LOVABLE_API_KEY,
    );

    const code = codeResp.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ code, plan }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    const status = e?.status === 429 ? 429 : e?.status === 402 ? 402 : 500;
    const error =
      status === 429
        ? "Rate limited. Please try again in a moment."
        : status === 402
        ? "AI credits exhausted. Please add funds."
        : e?.message || "Unknown error";
    console.error("bot-generate error:", e);
    return new Response(JSON.stringify({ error }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
