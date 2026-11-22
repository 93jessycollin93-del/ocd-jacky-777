import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

// Every edge function that reaches an outside service must stay off until the owner
// turns its group on in the ONLINE_FEATURES secret. See
// Jackie/knowledge/notes/2026-11-05_offline_by_default.md.
const FUNCTIONS_DIR = path.resolve(__dirname, "../../supabase/functions");

const GATED: Record<string, string> = {
  "bot-generate": "cloud_ai",
  "gunit-agent-cycle": "cloud_ai",
  "gunit-bot-gen": "cloud_ai",
  "gunit-chat": "cloud_ai",
  "jackie-chat": "cloud_ai",
  "jackie-groq": "cloud_ai",
  "jackie-image": "cloud_ai",
  "jackie-langcheck": "cloud_ai",
  "jackie-openrouter": "cloud_ai",
  "jackie-orchestrate": "cloud_ai",
  "jackie-ollama": "pc_bridge",
  "jacky-proxy": "pc_bridge",
  "telegram-validate": "telegram",
};

// Hosts that are only imports, plus the project's own Supabase.
const IMPORT_HOSTS = new Set(["deno.land", "esm.sh"]);
const OUTSIDE_ENV = /Deno\.env\.get\(["'](LOVABLE_API_KEY|GROQ_API_KEY|OPENROUTER_API_KEY|OLLAMA_BASE_URL|JACKY_API_BASE|TELEGRAM_API_KEY)["']\)/;

const source = (name: string) => readFileSync(path.join(FUNCTIONS_DIR, name, "index.ts"), "utf8");
const functionNames = readdirSync(FUNCTIONS_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory() && !d.name.startsWith("_"))
  .map((d) => d.name);

function reachesOutside(code: string): boolean {
  const hosts = [...code.matchAll(/https:\/\/([a-z0-9.-]+)/gi)].map((m) => m[1].toLowerCase());
  return OUTSIDE_ENV.test(code) || hosts.some((h) => !IMPORT_HOSTS.has(h));
}

function loadGate(code: string) {
  const match = /function offlineResponse\(group: string\): Response \| null \{[\s\S]*?\n\}\n/.exec(code);
  if (!match) throw new Error("offlineResponse helper not found");
  const js = match[0].replace("(group: string): Response | null", "(group)");
  return (env: string | undefined) => {
    const Deno = { env: { get: (k: string) => (k === "ONLINE_FEATURES" ? env : undefined) } };
    const corsHeaders = { "Access-Control-Allow-Origin": "*" };
    return new Function("Deno", "corsHeaders", `${js}; return offlineResponse;`)(Deno, corsHeaders) as (
      group: string,
    ) => Response | null;
  };
}

describe("offline by default (ONLINE_FEATURES)", () => {
  it("gates every edge function that reaches outside", () => {
    const outside = functionNames.filter((n) => reachesOutside(source(n)));
    expect(outside.sort()).toEqual(Object.keys(GATED).sort());
  });

  it.each(Object.entries(GATED))("%s checks its group right after the CORS preflight", (name, group) => {
    const code = source(name);
    const handler = code.slice(code.search(/^(Deno\.)?serve\(/m));
    const firstStatements = handler
      .split("\n")
      .slice(1)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("//"));
    const preflightEnd = firstStatements.findIndex((l) => /^}$|OPTIONS.*return/.test(l));
    expect(firstStatements[preflightEnd + 1]).toMatch(new RegExp(`^const offline = offlineResponse\\(["']${group}["']\\);?$`));
    expect(firstStatements[preflightEnd + 2]).toMatch(/^if \(offline\) return offline;?$/);
  });

  it("blocks unless the group or 'all' is listed", async () => {
    const gate = loadGate(source("jackie-chat"));
    for (const env of [undefined, "", " ", "false", "cloud_ai_extra", "pc_bridge"]) {
      const res = gate(env)("cloud_ai");
      expect(res?.status, String(env)).toBe(403);
      expect(res?.headers.get("Access-Control-Allow-Origin")).toBe("*");
      expect(await res?.json()).toMatchObject({ ok: false, error: "offline_mode", group: "cloud_ai" });
    }
    for (const env of ["cloud_ai", " Cloud_AI , pc_bridge", "all", "telegram,ALL"]) {
      expect(gate(env)("cloud_ai"), env).toBeNull();
    }
  });
});
