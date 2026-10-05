// Jackie's compact on-device model queue — typed view over src/data/model-queue.json.
// The same JSON drives scripts/download_models.py, so edit the catalog, not this file.
import catalog from "@/data/model-queue.json";

export type ModelFormat =
  | "safetensors" | "pytorch" | "onnx" | "gguf" | "ggml" | "tflite"
  | "coreml" | "executorch" | "openvino" | "ctranslate2" | "diffusers";
export type ModelFlag = "gated" | "non-commercial" | "custom-license" | "agpl" | "remote-code" | "large";
export type ModelPriority = "essential" | "high" | "normal";
export type MemoryTier = "fast" | "balanced" | "quality";
export type QueuePhase = "1" | "2" | "3" | "backlog";
export type ModelCategory = "text" | "embeddings" | "audio" | "vision" | "multimodal";

export interface ModelVariant {
  repo: string;
  quant?: string;
  include?: string[];
}

export interface QueueModel {
  id: string;
  name: string;
  source?: "huggingface" | "github";
  repo?: string;
  url?: string;
  task: string;
  folder: string;
  params?: string;
  priority: ModelPriority;
  formats: ModelFormat[];
  include?: string[];
  variants?: Partial<Record<ModelFormat, ModelVariant>>;
  memory_tier?: MemoryTier;
  flags?: ModelFlag[];
  fallbacks?: string[];
  /** The id from the original queue when it was wrong or ambiguous. */
  requested_as?: string;
  note?: string;
}

export interface QueueCatalog {
  version: number;
  updated: string;
  memory_tiers: { fast_max_millions: number; balanced_max_millions: number };
  format_runtimes: Record<ModelFormat, string[]>;
  folders: string[];
  phases: Record<"1" | "2" | "3", string[]>;
  models: QueueModel[];
}

export const QUEUE = catalog as unknown as QueueCatalog;

const BY_ID = new Map(QUEUE.models.map((m) => [m.id, m]));
const PHASE_OF = new Map<string, QueuePhase>();
for (const phase of ["1", "2", "3"] as const) {
  for (const id of QUEUE.phases[phase]) PHASE_OF.set(id, phase);
}

export const PHASES: { id: QueuePhase; label: string; blurb: string }[] = [
  { id: "1", label: "Phase 1", blurb: "Core mobile intelligence" },
  { id: "2", label: "Phase 2", blurb: "Balanced quality" },
  { id: "3", label: "Phase 3", blurb: "Specialized experimentation" },
  { id: "backlog", label: "Backlog", blurb: "Everything else, by category" },
];

export const FLAG_LABELS: Record<ModelFlag, string> = {
  gated: "Gated: accept the license on the Hub first",
  "non-commercial": "Non-commercial license",
  "custom-license": "Custom license: review before shipping",
  agpl: "AGPL-3.0",
  "remote-code": "Needs trust_remote_code",
  large: "Large download",
};

export function getModel(id: string): QueueModel | undefined {
  return BY_ID.get(id);
}

export function categoryOf(model: QueueModel): ModelCategory {
  return model.folder.split("/")[0] as ModelCategory;
}

export function phaseOf(model: QueueModel): QueuePhase {
  return PHASE_OF.get(model.id) ?? "backlog";
}

/** Models in queue order: explicit phase lists first, backlog in catalog order. */
export function modelsInPhase(phase: QueuePhase): QueueModel[] {
  if (phase === "backlog") return QUEUE.models.filter((m) => !PHASE_OF.has(m.id));
  return QUEUE.phases[phase].map((id) => BY_ID.get(id)!).filter(Boolean);
}

export function queueOrder(): QueueModel[] {
  return PHASES.flatMap((p) => modelsInPhase(p.id));
}

/** "360M" → 360, "1.7B" → 1700, "2MB"/unknown → null. */
export function paramsInMillions(params?: string): number | null {
  const match = /^\s*([\d.]+)\s*([KMB])\s*$/i.exec(params ?? "");
  if (!match) return null;
  const scale = { K: 1e-3, M: 1, B: 1e3 }[match[2].toUpperCase() as "K" | "M" | "B"];
  return parseFloat(match[1]) * scale;
}

export function memoryTier(model: QueueModel): MemoryTier {
  if (model.memory_tier) return model.memory_tier;
  const millions = paramsInMillions(model.params);
  if (millions === null) return "balanced";
  if (millions <= QUEUE.memory_tiers.fast_max_millions) return "fast";
  return millions <= QUEUE.memory_tiers.balanced_max_millions ? "balanced" : "quality";
}

export function runtimeTargets(formats: ModelFormat[]): string[] {
  return [...new Set(formats.flatMap((f) => QUEUE.format_runtimes[f] ?? []))];
}

export function hubUrl(model: QueueModel): string {
  return model.repo ? `https://huggingface.co/${model.repo}` : model.url ?? "";
}

export function downloadCommand(model: QueueModel): string {
  return `python scripts/download_models.py --only ${model.id}`;
}

/** The per-model manifest shape from the queue plan (download-time fields are added by the script). */
export function buildManifest(model: QueueModel) {
  return {
    name: model.name,
    source: model.repo ?? model.url,
    task: model.task,
    parameters: model.params ?? null,
    formats: model.formats,
    quantizations: Object.values(model.variants ?? {}).flatMap((v) => (v?.quant ? [v.quant] : [])),
    runtime_targets: runtimeTargets(model.formats),
    memory_tier: memoryTier(model),
    fallbacks: (model.fallbacks ?? []).map((id) => BY_ID.get(id)?.repo ?? id),
  };
}
