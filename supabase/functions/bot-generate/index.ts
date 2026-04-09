import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { name, purpose, platform, behaviorStyle, logicModules, language } = await req.json();

    if (!name || !platform || !language) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const modulesDesc = (logicModules || []).map((m: string) => {
      const map: Record<string, string> = {
        "io-response": "Input/Output response handler that processes user messages and returns structured replies",
        "api-fetcher": "API fetcher module that makes HTTP requests to external APIs with configurable endpoints",
        "file-converter": "File conversion module supporting format transformations (e.g. audio, video, documents)",
        "scraper": "Web scraper module that extracts data from URLs with rate limiting and error handling",
        "auto-reply": "Auto-reply trigger system that responds to specific keywords or patterns automatically",
        "scheduler": "Scheduled task runner for periodic actions (cron-style)",
        "auth-guard": "Authentication middleware that validates API keys or tokens before processing",
      };
      return map[m] || m;
    }).join("\n- ");

    const platformMap: Record<string, string> = {
      telegram: "Telegram Bot API (node-telegram-bot-api for Node.js or python-telegram-bot for Python)",
      web: "Express.js REST API server (Node.js) or FastAPI server (Python) with WebSocket support",
      discord: "Discord.js (Node.js) or discord.py (Python) bot",
      api: "Standalone REST API with Express (Node.js) or FastAPI (Python)",
    };

    const prompt = `Generate a complete, production-ready ${language === "nodejs" ? "Node.js (TypeScript)" : "Python"} bot project.

Bot Name: ${name}
Purpose: ${purpose || "General purpose bot"}
Platform: ${platformMap[platform] || platform}
Behavior Style: ${behaviorStyle || "assistant"} — the bot should match this personality in its responses
Language: ${language === "nodejs" ? "Node.js with TypeScript" : "Python 3.10+"}

Required Logic Modules:
- ${modulesDesc || "Basic I/O response handler"}

Requirements:
1. Include a complete package.json (Node.js) or requirements.txt (Python) with all dependencies
2. Include a .env.example with all required environment variables
3. Include a README.md with setup instructions
4. Use proper error handling throughout
5. Add rate limiting for all incoming requests
6. Include input validation on all user inputs
7. Structure the code in a clean, modular way with separate files for each concern
8. Include comments explaining key sections
9. Make the bot production-ready (logging, graceful shutdown, health checks)
10. Never hardcode secrets — always use environment variables

Output the FULL project as a single code block. Use clear file separators like:
// === FILE: filename.ext ===
for each file. Include every file needed to run the bot.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: "You are an expert bot developer. Generate clean, production-ready bot code. Output ONLY code with file separators. No explanations outside of code comments.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const code = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ code }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("bot-generate error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
