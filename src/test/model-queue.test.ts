import { describe, it, expect } from "vitest";
import {
  QUEUE,
  PHASES,
  modelsInPhase,
  queueOrder,
  getModel,
  categoryOf,
  memoryTier,
  paramsInMillions,
  buildManifest,
  runtimeTargets,
} from "@/lib/model-queue";

const REPO_ID = /^[A-Za-z0-9][\w.-]*\/[\w.-]+$/;

describe("model queue catalog", () => {
  it("has unique model ids and unique Hub repos", () => {
    const ids = QUEUE.models.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    const repos = QUEUE.models.flatMap((m) => (m.repo ? [m.repo] : []));
    expect(new Set(repos).size).toBe(repos.length);
  });

  it("gives every Hub model a well-formed repo id and every other source a URL", () => {
    for (const m of QUEUE.models) {
      if ((m.source ?? "huggingface") === "huggingface") {
        expect(m.repo, m.id).toMatch(REPO_ID);
      } else {
        expect(m.url, m.id).toMatch(/^https:\/\//);
      }
      for (const v of Object.values(m.variants ?? {})) expect(v?.repo, m.id).toMatch(REPO_ID);
    }
  });

  it("only uses declared folders, formats and fallbacks", () => {
    const folders = new Set(QUEUE.folders);
    const formats = new Set(Object.keys(QUEUE.format_runtimes));
    for (const m of QUEUE.models) {
      expect(folders.has(m.folder), `${m.id} folder ${m.folder}`).toBe(true);
      expect(m.formats.length, m.id).toBeGreaterThan(0);
      for (const f of m.formats) expect(formats.has(f), `${m.id} format ${f}`).toBe(true);
      for (const f of Object.keys(m.variants ?? {})) expect(m.formats, `${m.id} variant ${f}`).toContain(f);
      for (const fb of m.fallbacks ?? []) {
        expect(getModel(fb), `${m.id} fallback ${fb}`).toBeDefined();
        expect(fb).not.toBe(m.id);
      }
    }
  });

  it("explains every correction", () => {
    for (const m of QUEUE.models.filter((x) => x.requested_as)) {
      expect(m.note, m.id).toBeTruthy();
      expect(m.requested_as).not.toBe(m.repo);
    }
  });

  it("puts each model in at most one phase and covers the catalog exactly once", () => {
    const phased = (["1", "2", "3"] as const).flatMap((p) => QUEUE.phases[p]);
    expect(new Set(phased).size).toBe(phased.length);
    for (const id of phased) expect(getModel(id), id).toBeDefined();
    const order = queueOrder().map((m) => m.id);
    expect(order).toHaveLength(QUEUE.models.length);
    expect(new Set(order).size).toBe(QUEUE.models.length);
    expect(PHASES.map((p) => modelsInPhase(p.id).length).reduce((a, b) => a + b, 0)).toBe(QUEUE.models.length);
  });

  it("keeps Phase 1 to the core mobile set, in order", () => {
    expect(modelsInPhase("1").map((m) => m.id)).toEqual([
      "smollm2-360m-instruct",
      "qwen2.5-0.5b-instruct",
      "smollm2-1.7b-instruct",
      "qwen2.5-coder-1.5b-instruct",
      "whisper-tiny",
      "whisper-base",
      "all-minilm-l6-v2",
      "bge-small-en-v1.5",
      "nomic-embed-text-v1.5",
      "yolov8n",
      "mobilenet-v3-small",
      "mobilesam",
      "depth-anything-v2-small",
      "florence-2-base",
      "smolvlm-256m",
    ]);
  });

  it("flags gated Gemma repos and replaces IDs that do not exist", () => {
    for (const m of QUEUE.models.filter((x) => x.repo?.startsWith("google/gemma"))) {
      expect(m.flags, m.id).toContain("gated");
    }
    const repos = new Set(QUEUE.models.map((m) => m.repo));
    for (const bad of ["microsoft/Florence-2-small", "allenai/OLMo-300M", "stabilityai/stablelm-2-1.6b", "BAAI/Emu3-Vision"]) {
      expect(repos.has(bad), bad).toBe(false);
    }
  });
});

describe("model queue helpers", () => {
  it("parses parameter counts", () => {
    expect(paramsInMillions("360M")).toBe(360);
    expect(paramsInMillions("1.7B")).toBe(1700);
    expect(paramsInMillions("2MB")).toBeNull();
    expect(paramsInMillions(undefined)).toBeNull();
  });

  it("derives memory tiers, honouring explicit embedding tiers", () => {
    expect(memoryTier(getModel("smollm2-360m-instruct")!)).toBe("balanced");
    expect(memoryTier(getModel("tinystories-1m")!)).toBe("fast");
    expect(memoryTier(getModel("phi-3.5-mini-instruct")!)).toBe("quality");
    expect(memoryTier(getModel("bge-base-en-v1.5")!)).toBe("quality");
    expect(memoryTier(getModel("bge-micro-v2")!)).toBe("fast");
  });

  it("maps formats to runtimes without duplicates", () => {
    expect(runtimeTargets(["safetensors", "gguf", "onnx", "gguf"])).toEqual(["transformers", "llama.cpp", "onnxruntime"]);
  });

  it("builds the manifest shape from the queue plan", () => {
    expect(buildManifest(getModel("smollm2-360m-instruct")!)).toEqual({
      name: "SmolLM2-360M-Instruct",
      source: "HuggingFaceTB/SmolLM2-360M-Instruct",
      task: "Lightweight dialogue and orchestration",
      parameters: "360M",
      formats: ["safetensors", "gguf", "onnx"],
      quantizations: ["q8_0"],
      runtime_targets: ["transformers", "llama.cpp", "onnxruntime"],
      memory_tier: "balanced",
      fallbacks: ["Qwen/Qwen2.5-0.5B-Instruct", "HuggingFaceTB/SmolLM-360M"],
    });
  });

  it("derives category from folder", () => {
    expect(categoryOf(getModel("whisper-tiny")!)).toBe("audio");
    expect(categoryOf(getModel("yolov8n")!)).toBe("vision");
  });
});
