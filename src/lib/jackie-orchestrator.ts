// Jackie Multi-Model Orchestrator
// Routes tasks to the best model for the job, with fallback + optional parallel execution.
// All model calls go through the jackie-orchestrate edge function (never direct from client).

import { supabase } from "@/integrations/supabase/client";

export type TaskKind = "reasoning" | "coding" | "fast" | "long-context" | "auto";

export type ModelEntry = {
  id: string;
  label: string;
  kind: TaskKind[];
  cost: 1 | 2 | 3;
  speed: 1 | 2 | 3; // 3 = fastest
};

export const ORCHESTRATOR_MODELS: ModelEntry[] = [
  { id: "google/gemini-2.5-pro",         label: "Gemini 2.5 Pro",   kind: ["reasoning", "long-context"], cost: 3, speed: 1 },
  { id: "google/gemini-3-flash-preview", label: "Gemini 3 Flash",   kind: ["fast", "coding", "auto"],    cost: 2, speed: 3 },
  { id: "google/gemini-2.5-flash",       label: "Gemini 2.5 Flash", kind: ["fast", "auto"],              cost: 2, speed: 3 },
  { id: "google/gemini-2.5-flash-lite",  label: "Gemini Lite",      kind: ["fast"],                      cost: 1, speed: 3 },
  { id: "openai/gpt-5",                  label: "GPT-5",            kind: ["reasoning", "coding"],       cost: 3, speed: 1 },
  { id: "openai/gpt-5-mini",             label: "GPT-5 Mini",       kind: ["coding", "auto"],            cost: 2, speed: 2 },
];

const HEURISTICS: { test: RegExp; kind: TaskKind }[] = [
  { test: /\b(code|function|refactor|bug|typescript|react|sql|api|class|component)\b/i, kind: "coding" },
  { test: /\b(why|explain|reason|prove|analy[sz]e|strategy|plan|architecture|trade-?off)\b/i, kind: "reasoning" },
  { test: /\b(summari[sz]e|tl;dr|book|chapter|document|long|transcript|article)\b/i, kind: "long-context" },
  { test: /\b(quick|fast|short|one-?liner|tldr|hi|hello|status)\b/i, kind: "fast" },
];

export function pickKind(prompt: string): TaskKind {
  for (const h of HEURISTICS) if (h.test.test(prompt)) return h.kind;
  return prompt.length > 4000 ? "long-context" : "fast";
}

export function pickModel(kind: TaskKind, override?: string): ModelEntry {
  if (override) {
    const found = ORCHESTRATOR_MODELS.find((m) => m.id === override);
    if (found) return found;
  }
  const candidates = ORCHESTRATOR_MODELS.filter((m) => m.kind.includes(kind));
  if (candidates.length === 0) return ORCHESTRATOR_MODELS[1];
  // Prefer best fit: reasoning/long-context → highest cost (most capable); fast → highest speed
  if (kind === "reasoning" || kind === "long-context") {
    return candidates.sort((a, b) => b.cost - a.cost)[0];
  }
  return candidates.sort((a, b) => b.speed - a.speed)[0];
}

export type OrchestrateResult = {
  modelUsed: string;
  kind: TaskKind;
  output: string;
  attemptedFallback: boolean;
  durationMs: number;
};

export async function orchestrate(opts: {
  prompt: string;
  system?: string;
  kind?: TaskKind;
  modelOverride?: string;
}): Promise<OrchestrateResult> {
  const kind: TaskKind = opts.kind && opts.kind !== "auto" ? opts.kind : pickKind(opts.prompt);
  const primary = pickModel(kind, opts.modelOverride);
  const fallback = ORCHESTRATOR_MODELS.find(
    (m) => m.id !== primary.id && m.kind.includes(kind)
  ) || ORCHESTRATOR_MODELS[1];

  const started = Date.now();
  let attemptedFallback = false;

  const invoke = async (modelId: string) => {
    const { data, error } = await supabase.functions.invoke("jackie-orchestrate", {
      body: { model: modelId, system: opts.system, prompt: opts.prompt },
    });
    if (error) throw new Error(error.message || "orchestrate failed");
    if ((data as any)?.error) throw new Error((data as any).error);
    return (data as { output: string }).output;
  };

  try {
    const output = await invoke(primary.id);
    return { modelUsed: primary.id, kind, output, attemptedFallback, durationMs: Date.now() - started };
  } catch (e) {
    attemptedFallback = true;
    const output = await invoke(fallback.id);
    return { modelUsed: fallback.id, kind, output, attemptedFallback, durationMs: Date.now() - started };
  }
}

// Parallel multi-model execution: run the same prompt on N models, return all.
export async function orchestrateParallel(opts: {
  prompt: string;
  system?: string;
  models: string[];
}): Promise<{ modelId: string; output: string; error?: string }[]> {
  return Promise.all(
    opts.models.map(async (modelId) => {
      try {
        const r = await orchestrate({ prompt: opts.prompt, system: opts.system, modelOverride: modelId });
        return { modelId, output: r.output };
      } catch (e) {
        return { modelId, output: "", error: e instanceof Error ? e.message : "failed" };
      }
    })
  );
}
