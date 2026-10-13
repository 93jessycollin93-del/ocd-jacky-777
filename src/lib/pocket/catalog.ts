// Models Pocket AI can download and run on the device. Bonsai is PrismML's 1-bit family (Apache-2.0), in the
// Q1_0 GGUF format that mainline llama.cpp (and so wllama) runs on CPU and WebGPU. Sizes and SHA-256 hashes are
// the published values (the same ones PocketPal ships); downloads are checked against them.

export interface Sampling {
  temperature: number;
  top_p: number;
  top_k: number;
  min_p: number;
}

export interface PocketModel {
  id: string;
  name: string;
  url: string;
  /** Exact file size in bytes, when known; downloads of a different size are rejected. */
  bytes?: number;
  sha256?: string;
  params: string;
  note: string;
  recommended?: boolean;
  /** Context window to load with (tokens). */
  nCtx: number;
  sampling: Sampling;
  custom?: boolean;
}

/** PrismML's recommended settings for Bonsai 1.7B/4B/8B, with thinking turned off. */
export const BONSAI_SAMPLING: Sampling = { temperature: 0.5, top_p: 0.85, top_k: 20, min_p: 0 };

const bonsai = (size: string) =>
  `https://huggingface.co/prism-ml/Bonsai-${size}-gguf/resolve/main/Bonsai-${size}-Q1_0.gguf`;

export const MODELS: PocketModel[] = [
  {
    id: "bonsai-1.7b",
    name: "Bonsai 1.7B",
    url: bonsai("1.7B"),
    bytes: 248_302_272,
    sha256: "3d7c6c90dd98717a203adb22d5eacd2581850e40aa5327e144b97766cae5f7e3",
    params: "1.7B · 1-bit",
    note: "Small and quick. Runs on most phones.",
    recommended: true,
    nCtx: 4096,
    sampling: BONSAI_SAMPLING,
  },
  {
    id: "bonsai-4b",
    name: "Bonsai 4B",
    url: bonsai("4B"),
    bytes: 572_270_624,
    sha256: "4524b3f997f0f06444e568d1f26e2efd69effa3218c7ad3047432fb171e42168",
    params: "4B · 1-bit",
    note: "Smarter, about twice as slow. Best on laptops and recent phones.",
    nCtx: 4096,
    sampling: BONSAI_SAMPLING,
  },
  {
    id: "bonsai-8b",
    name: "Bonsai 8B",
    url: bonsai("8B"),
    bytes: 1_158_654_496,
    sha256: "284a335a3fb2ced3b1b01fcb40b08aa783e3b70832767f0dd2e3fdfa134bd54",
    params: "8B · 1-bit",
    note: "The strongest. Needs a computer with plenty of memory.",
    nCtx: 4096,
    sampling: BONSAI_SAMPLING,
  },
];

const CUSTOM_KEY = "pocket:custom-models";

/** Models the user added by URL (any GGUF link, e.g. a Hugging Face "resolve" URL). */
export function customModels(): PocketModel[] {
  try {
    const list = JSON.parse(localStorage.getItem(CUSTOM_KEY) ?? "[]") as { id: string; name: string; url: string }[];
    return list.map((m) => ({
      ...m,
      params: "Custom",
      note: "Added by link",
      nCtx: 4096,
      sampling: { temperature: 0.7, top_p: 0.9, top_k: 40, min_p: 0.05 },
      custom: true,
    }));
  } catch {
    return [];
  }
}

/** Checks a link the user pasted; returns an error message, or null when it's usable. */
export function checkModelUrl(url: string): string | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return "That isn't a valid link.";
  }
  if (u.protocol !== "https:" && u.hostname !== "localhost" && u.hostname !== "127.0.0.1") return "Use an https:// link.";
  if (!u.pathname.toLowerCase().endsWith(".gguf")) return "The link must point to a .gguf file.";
  return null;
}

export function addCustomModel(url: string, name?: string): PocketModel {
  const list = JSON.parse(localStorage.getItem(CUSTOM_KEY) ?? "[]") as { id: string; name: string; url: string }[];
  const existing = list.find((m) => m.url === url);
  if (!existing) {
    const file = decodeURIComponent(url.split("/").pop() ?? "model.gguf");
    list.push({ id: `custom-${Date.now().toString(36)}`, name: name?.trim() || file.replace(/\.gguf$/i, ""), url });
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(list));
  }
  return customModels().find((m) => m.url === url)!;
}

export function removeCustomModel(url: string) {
  const list = JSON.parse(localStorage.getItem(CUSTOM_KEY) ?? "[]") as { url: string }[];
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(list.filter((m) => m.url !== url)));
}

export const allModels = () => [...MODELS, ...customModels()];

export function formatBytes(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)} GB`;
  if (n >= 1e6) return `${Math.round(n / 1e6)} MB`;
  if (n >= 1e3) return `${Math.round(n / 1e3)} KB`;
  return `${n} B`;
}
