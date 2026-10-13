// Pocket AI settings, personas and the saved conversation, kept in this browser's localStorage.

export interface PocketSettings {
  modelId: string;
  personaId: string;
  customSystem: string;
  temperature: number;
  maxTokens: number;
  nCtx: number;
  preferGpu: boolean;
}

export interface PocketMessage {
  role: "user" | "assistant";
  content: string;
  stats?: { tps: number; tokens: number };
}

export const PERSONAS = [
  { id: "assistant", emoji: "🤖", name: "Assistant", system: "You are a helpful, concise assistant running privately on the user's device. Answer clearly and briefly." },
  { id: "jackie", emoji: "🛰️", name: "Jackie", system: "You are Jackie, a sharp, upbeat field assistant. Be direct, practical and brief; use short bullet points when listing steps." },
  { id: "coder", emoji: "💻", name: "Coder", system: "You are an expert programmer. Give working code first, then one or two lines of explanation. Use markdown code blocks." },
  { id: "tutor", emoji: "📚", name: "Tutor", system: "You are a patient tutor. Explain step by step with simple examples, and check understanding with a short question at the end." },
  { id: "custom", emoji: "✏️", name: "Custom", system: "" },
];

const SETTINGS_KEY = "pocket:settings";
const CHAT_KEY = "pocket:chat";

const DEFAULTS: PocketSettings = {
  modelId: "bonsai-1.7b",
  personaId: "assistant",
  customSystem: "",
  temperature: 0.5,
  maxTokens: 512,
  nCtx: 4096,
  preferGpu: true,
};

export function loadSettings(): PocketSettings {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}") };
  } catch {
    return DEFAULTS;
  }
}

export function saveSettings(s: PocketSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    /* storage full or blocked */
  }
}

export function loadChat(): PocketMessage[] {
  try {
    const list = JSON.parse(localStorage.getItem(CHAT_KEY) ?? "[]");
    return Array.isArray(list) ? list.filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string") : [];
  } catch {
    return [];
  }
}

export function saveChat(messages: PocketMessage[]) {
  try {
    // Keep the last 200 messages so the saved chat can't grow without limit.
    localStorage.setItem(CHAT_KEY, JSON.stringify(messages.filter((m) => m.content).slice(-200)));
  } catch {
    /* storage full or blocked */
  }
}
