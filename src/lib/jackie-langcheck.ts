/**
 * Jackie Language Self-Check
 * ---------------------------
 * Before answering a "write me code in X" request, Jackie generates a small
 * canonical snippet for the requested language/dialect, then *validates* it
 * with cheap deterministic checks (syntax shape, required keywords, executor
 * fingerprint). If the snippet passes, full code is allowed; otherwise Jackie
 * must clarify the dialect or fall back to a safer kindred language.
 *
 * No network calls live here directly — generation is delegated to the
 * `jackie-langcheck` edge function, which calls Lovable AI Gateway with a
 * tightly scoped prompt. This file owns parsing, validation and the public
 * verifyLanguage() API used by the Control Panel + orchestrator.
 */

import { supabase } from "@/integrations/supabase/client";

export type LangVerdict = "pass" | "fail" | "uncertain";

export interface LangCheckResult {
  language: string;
  dialect?: string;
  verdict: LangVerdict;
  snippet: string;
  reasons: string[];
  modelUsed: string;
  durationMs: number;
}

/**
 * Canonical "hello" intent per language family.
 * The snippet must:
 *  - print "jackie-ok" (literal, lowercased) so we can fingerprint output
 *  - contain at least one of the structural tokens listed in `must`
 *  - not contain any of `mustNot` (catches generic placeholder spew)
 */
interface DialectRule {
  must: string[];      // at least ONE must appear
  mustAll?: string[];  // ALL must appear
  mustNot?: string[];
  fingerprint?: RegExp;
}

const FINGERPRINT = /jackie[-_ ]?ok/i;

const RULES: Record<string, DialectRule> = {
  // --- mainstream ---
  python:      { must: ["print(", "def ", "import "], fingerprint: /print\s*\(\s*["']jackie/i },
  javascript:  { must: ["console.log", "function", "=>"], fingerprint: /console\.log\s*\(\s*["'`]jackie/i },
  typescript:  { mustAll: ["console.log"], must: [": ", "interface ", "type "], fingerprint: /console\.log/i },
  rust:        { mustAll: ["fn "], must: ["println!", "let "], fingerprint: /println!\s*\(\s*"jackie/i },
  go:          { mustAll: ["package ", "func "], must: ["fmt.Println", "fmt.Printf"], fingerprint: /fmt\.Print/i },
  java:        { mustAll: ["class "], must: ["System.out.println", "public static"], fingerprint: /System\.out/i },
  kotlin:      { must: ["fun ", "println"], fingerprint: /println\s*\(\s*"jackie/i },
  swift:       { must: ["func ", "print("], fingerprint: /print\s*\(\s*"jackie/i },
  c:           { mustAll: ["#include", "int main"], must: ["printf", "puts"], fingerprint: /printf|puts/ },
  cpp:         { mustAll: ["#include"], must: ["std::cout", "iostream"], fingerprint: /std::cout/ },
  csharp:      { mustAll: ["using "], must: ["Console.WriteLine", "class "], fingerprint: /Console\.WriteLine/ },
  ruby:        { must: ["puts ", "def "], fingerprint: /puts\s+["']jackie/i },
  php:         { mustAll: ["<?php"], must: ["echo ", "print "], fingerprint: /echo|print/ },
  // --- functional ---
  haskell:     { must: ["main =", "putStrLn"], fingerprint: /putStrLn\s+"jackie/i },
  elixir:      { must: ["IO.puts", "defmodule"], fingerprint: /IO\.puts/ },
  erlang:      { must: ["io:format", "-module"], fingerprint: /io:format/ },
  clojure:     { must: ["(println", "(defn"], fingerprint: /println/ },
  scala:       { must: ["println", "object ", "def "], fingerprint: /println/ },
  ocaml:       { must: ["print_endline", "let "], fingerprint: /print_endline/ },
  fsharp:      { must: ["printfn", "let "], fingerprint: /printfn/ },
  // --- shells / data ---
  bash:        { must: ["echo ", "#!/"], fingerprint: /echo\s+["']?jackie/i },
  powershell:  { must: ["Write-Host", "Write-Output"], fingerprint: /Write-(Host|Output)/ },
  sql:         { must: ["SELECT", "select"], fingerprint: /select\s+'jackie/i },
  // --- markup ---
  html:        { mustAll: ["<"], must: ["</", "<!doctype", "<html"], fingerprint: /jackie/i },
  css:         { must: ["{", "}"], fingerprint: /jackie/i },
  // --- web frameworks treated as TS ---
  react:       { mustAll: ["return"], must: ["</", "/>"], fingerprint: /jackie/i },
};

const ALIASES: Record<string, string> = {
  py: "python", py3: "python", python3: "python",
  js: "javascript", node: "javascript", nodejs: "javascript",
  ts: "typescript", tsx: "react", jsx: "react",
  rs: "rust",
  golang: "go",
  kt: "kotlin",
  rb: "ruby",
  cs: "csharp", "c#": "csharp", dotnet: "csharp",
  "c++": "cpp", cxx: "cpp",
  hs: "haskell",
  ex: "elixir", exs: "elixir",
  erl: "erlang",
  clj: "clojure", cljs: "clojure",
  scl: "scala",
  ml: "ocaml",
  "f#": "fsharp",
  sh: "bash", zsh: "bash",
  ps1: "powershell", pwsh: "powershell",
  postgres: "sql", postgresql: "sql", mysql: "sql", sqlite: "sql", tsql: "sql", plpgsql: "sql",
  htm: "html",
  scss: "css", sass: "css", less: "css",
};

function normalizeLanguage(input: string): { language: string; dialect?: string } {
  const raw = input.trim().toLowerCase();
  // capture "python 3.11", "rust 2024", "postgres-15" etc.
  const match = raw.match(/^([a-z+#0-9.\-_]+?)(?:[\s\-_/]+(.+))?$/);
  const head = match?.[1] ?? raw;
  const dialect = match?.[2]?.trim();
  const language = ALIASES[head] ?? head;
  return { language, dialect };
}

/**
 * Pure validator — runs locally on a candidate snippet. No network.
 */
export function validateSnippet(language: string, snippet: string): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const rule = RULES[language];

  if (!snippet || snippet.trim().length < 4) {
    return { ok: false, reasons: ["Snippet empty or too short"] };
  }
  if (!FINGERPRINT.test(snippet)) {
    reasons.push(`Missing fingerprint string "jackie-ok"`);
  }

  if (rule) {
    if (rule.fingerprint && !rule.fingerprint.test(snippet)) {
      reasons.push(`Output marker not in expected ${language} form`);
    }
    if (rule.mustAll) {
      for (const tok of rule.mustAll) {
        if (!snippet.includes(tok)) reasons.push(`Missing required token: ${tok}`);
      }
    }
    if (rule.must && !rule.must.some((t) => snippet.includes(t))) {
      reasons.push(`No idiomatic ${language} token found (expected one of: ${rule.must.join(", ")})`);
    }
    if (rule.mustNot) {
      for (const tok of rule.mustNot) {
        if (snippet.includes(tok)) reasons.push(`Forbidden token present: ${tok}`);
      }
    }
  } else {
    // Unknown / esoteric language — accept fingerprint-only verification.
    if (reasons.length === 0) reasons.push(`No structural rule for "${language}" — fingerprint-only check`);
  }

  // For unknown languages, only the fingerprint matters; pass if present.
  if (!rule) {
    return { ok: FINGERPRINT.test(snippet), reasons };
  }
  return { ok: reasons.length === 0, reasons };
}

/**
 * Ask the AI to produce a canonical snippet for `languageInput` and validate it.
 * Use this BEFORE answering with full production code.
 */
export async function verifyLanguage(languageInput: string): Promise<LangCheckResult> {
  const { language, dialect } = normalizeLanguage(languageInput);
  const started = performance.now();

  const { data, error } = await supabase.functions.invoke("jackie-langcheck", {
    body: { language, dialect },
  });

  const durationMs = Math.round(performance.now() - started);

  if (error || !data) {
    return {
      language, dialect,
      verdict: "fail",
      snippet: "",
      reasons: [error?.message || "No response from langcheck"],
      modelUsed: "n/a",
      durationMs,
    };
  }

  const snippet: string = String(data.snippet ?? "");
  const modelUsed: string = String(data.model ?? "google/gemini-3-flash-preview");

  const local = validateSnippet(language, snippet);
  let verdict: LangVerdict = local.ok ? "pass" : "fail";
  if (!RULES[language] && local.ok) verdict = "pass";
  if (!RULES[language] && !FINGERPRINT.test(snippet)) verdict = "uncertain";

  return { language, dialect, verdict, snippet, reasons: local.reasons, modelUsed, durationMs };
}

/**
 * Verify multiple dialects in one shot (e.g. user said "Python 3 + Rust 2024").
 * Returns one result per requested entry, preserving order.
 */
export async function verifyLanguages(inputs: string[]): Promise<LangCheckResult[]> {
  return Promise.all(inputs.map((i) => verifyLanguage(i)));
}
