// Chat presets: preferred provider + model applied to every new conversation.
// Stored in localStorage so it survives reloads without a DB round-trip.

const KEY = "jackie:chat-preset:v1";

export type ChatPreset = {
  provider: string; // e.g. "lovable" | "groq" | "openrouter" | "ollama"
  model: string;
  system?: string;
};

const DEFAULT: ChatPreset = {
  provider: "lovable",
  model: "google/gemini-2.5-pro",
};

export function getChatPreset(): ChatPreset {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT;
    const parsed = JSON.parse(raw);
    if (!parsed?.model) return DEFAULT;
    return {
      provider: parsed.provider || "lovable",
      model: parsed.model,
      system: parsed.system,
    };
  } catch {
    return DEFAULT;
  }
}

export function setChatPreset(preset: ChatPreset): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(preset));
  } catch {
    /* quota / privacy mode */
  }
}

export function clearChatPreset(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
}
