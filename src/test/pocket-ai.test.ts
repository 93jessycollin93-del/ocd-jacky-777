import { beforeEach, describe, expect, it } from "vitest";
import { MODELS, addCustomModel, allModels, checkModelUrl, customModels, formatBytes, removeCustomModel } from "@/lib/pocket/catalog";
import { stripThinking } from "@/lib/pocket/text";
import { loadChat, loadSettings, saveChat } from "@/lib/pocket/settings";
import { storedUser } from "@/lib/offline-session";

beforeEach(() => localStorage.clear());

describe("Pocket AI catalog", () => {
  it("points Bonsai 1.7B at the 248 MB Q1_0 file with its published size and hash", () => {
    const m = MODELS.find((x) => x.id === "bonsai-1.7b")!;
    expect(m.url).toBe("https://huggingface.co/prism-ml/Bonsai-1.7B-gguf/resolve/main/Bonsai-1.7B-Q1_0.gguf");
    expect(m.bytes).toBe(248_302_272);
    expect(m.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(m.recommended).toBe(true);
    expect(m.sampling).toEqual({ temperature: 0.5, top_p: 0.85, top_k: 20, min_p: 0 });
  });

  it("gives every built-in model a unique id, an https .gguf URL and a size", () => {
    expect(new Set(MODELS.map((m) => m.id)).size).toBe(MODELS.length);
    for (const m of MODELS) {
      expect(checkModelUrl(m.url)).toBeNull();
      expect(m.bytes).toBeGreaterThan(0);
    }
  });

  it("only accepts https links to .gguf files", () => {
    expect(checkModelUrl("nope")).toMatch(/valid link/);
    expect(checkModelUrl("http://example.com/a.gguf")).toMatch(/https/);
    expect(checkModelUrl("https://example.com/a.bin")).toMatch(/\.gguf/);
    expect(checkModelUrl("https://example.com/m/Model-Q4_K_M.gguf")).toBeNull();
    expect(checkModelUrl("http://127.0.0.1:5299/tiny.gguf")).toBeNull();
  });

  it("adds, de-duplicates and removes custom models", () => {
    const url = "https://example.com/m/My%20Model-Q4.gguf";
    const m = addCustomModel(url);
    expect(m.name).toBe("My Model-Q4");
    expect(m.custom).toBe(true);
    addCustomModel(url);
    expect(customModels()).toHaveLength(1);
    expect(allModels()).toHaveLength(MODELS.length + 1);
    removeCustomModel(url);
    expect(customModels()).toHaveLength(0);
  });

  it("formats sizes", () => {
    expect(formatBytes(248_302_272)).toBe("248 MB");
    expect(formatBytes(1_158_654_496)).toBe("1.16 GB");
    expect(formatBytes(512)).toBe("512 B");
  });
});

describe("reasoning blocks", () => {
  it("hides finished and unfinished <think> blocks", () => {
    expect(stripThinking("<think>\n\n</think>\n\nHello")).toBe("Hello");
    expect(stripThinking("<think>planning the answer")).toBe("");
    expect(stripThinking("Plain answer")).toBe("Plain answer");
    expect(stripThinking("<think>a</think>One <think>b</think>Two")).toBe("One Two");
  });
});

describe("Pocket AI settings and chat", () => {
  it("falls back to defaults and survives corrupt storage", () => {
    localStorage.setItem("pocket:settings", "{bad json");
    expect(loadSettings().modelId).toBe("bonsai-1.7b");
    localStorage.setItem("pocket:chat", '[{"role":"user","content":"hi"},{"role":"evil"},null]');
    expect(loadChat()).toEqual([{ role: "user", content: "hi" }]);
  });

  it("keeps at most 200 messages and drops empty placeholders", () => {
    const many = Array.from({ length: 250 }, (_, i) => ({ role: "user" as const, content: `m${i}` }));
    saveChat([...many, { role: "assistant", content: "" }]);
    const saved = loadChat();
    expect(saved).toHaveLength(200);
    expect(saved[199].content).toBe("m249");
  });
});

describe("offline sign-in fallback", () => {
  it("reads the user from the saved Supabase session, and nothing after sign-out", () => {
    expect(storedUser()).toBeNull();
    localStorage.setItem("sb-abcd-auth-token", JSON.stringify({ access_token: "x", user: { id: "u1", email: "a@b.c" } }));
    expect(storedUser()?.id).toBe("u1");
    localStorage.removeItem("sb-abcd-auth-token");
    expect(storedUser()).toBeNull();
  });

  it("ignores unrelated or corrupt keys", () => {
    localStorage.setItem("other-auth-token", JSON.stringify({ user: { id: "x" } }));
    localStorage.setItem("sb-zz-auth-token", "{not json");
    expect(storedUser()).toBeNull();
  });
});
