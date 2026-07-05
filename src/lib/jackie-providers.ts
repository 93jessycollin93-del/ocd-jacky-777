// Central registry of AI providers Jackie can talk to.
// Each entry defines the edge function endpoint + supported models.
// Add a key in Cloud → Secrets to activate the provider.

export type ProviderId = "lovable" | "groq" | "openrouter" | "ollama";

export interface ModelDef {
  id: string;
  label: string;
  note?: string;
  free?: boolean;
  vision?: boolean;
  reasoning?: boolean;
}

export interface ProviderDef {
  id: ProviderId;
  label: string;
  fn: string; // edge function name
  requiresSecret?: string;
  helpUrl?: string;
  free: boolean;
  description: string;
  models: ModelDef[];
}

export const PROVIDERS: ProviderDef[] = [
  {
    id: "lovable",
    label: "Lovable AI Gateway",
    fn: "jackie-chat",
    free: true,
    description: "Zero-config gateway (Gemini + GPT). Uses your workspace credits.",
    models: [
      { id: "google/gemini-3-flash-preview", label: "Gemini 3 Flash", free: true, vision: true },
      { id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro", vision: true, reasoning: true },
      { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash", vision: true },
      { id: "google/gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite", free: true, vision: true },
      { id: "openai/gpt-5", label: "GPT-5" },
      { id: "openai/gpt-5-mini", label: "GPT-5 Mini" },
    ],
  },
  {
    id: "groq",
    label: "Groq (Llama, real)",
    fn: "jackie-groq",
    requiresSecret: "GROQ_API_KEY",
    helpUrl: "https://console.groq.com/keys",
    free: true,
    description: "Free tier ~14.4k req/day. Fastest inference (300-1000 tok/s). Real Meta Llama models.",
    models: [
      { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B", free: true, note: "Best general" },
      { id: "meta-llama/llama-4-scout-17b-16e-instruct", label: "Llama 4 Scout 17B", free: true },
      { id: "meta-llama/llama-4-maverick-17b-128e-instruct", label: "Llama 4 Maverick 17B", free: true },
      { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B Instant", free: true, note: "Fastest" },
      { id: "llama-3.2-11b-vision-preview", label: "Llama 3.2 11B Vision", free: true, vision: true },
      { id: "llama-3.2-90b-vision-preview", label: "Llama 3.2 90B Vision", free: true, vision: true },
      { id: "llama-3.2-3b-preview", label: "Llama 3.2 3B", free: true },
      { id: "llama-3.2-1b-preview", label: "Llama 3.2 1B", free: true },
      { id: "llama-guard-3-8b", label: "Llama Guard 3 8B", free: true, note: "Safety classifier" },
      { id: "mixtral-8x7b-32768", label: "Mixtral 8x7B" },
      { id: "gemma2-9b-it", label: "Gemma 2 9B", free: true },
      { id: "qwen/qwen3-32b", label: "Qwen 3 32B", free: true },
      { id: "deepseek-r1-distill-llama-70b", label: "DeepSeek R1 Distill 70B", free: true, reasoning: true },
    ],
  },
  {
    id: "openrouter",
    label: "OpenRouter (broad free tier)",
    fn: "jackie-openrouter",
    requiresSecret: "OPENROUTER_API_KEY",
    helpUrl: "https://openrouter.ai/keys",
    free: true,
    description: "One key → hundreds of models. Free tier hits real Llama, DeepSeek, Qwen, Gemma.",
    models: [
      { id: "meta-llama/llama-3.3-70b-instruct:free", label: "Llama 3.3 70B", free: true },
      { id: "meta-llama/llama-3.1-405b-instruct:free", label: "Llama 3.1 405B", free: true, note: "Biggest" },
      { id: "meta-llama/llama-4-maverick:free", label: "Llama 4 Maverick", free: true },
      { id: "meta-llama/llama-4-scout:free", label: "Llama 4 Scout", free: true },
      { id: "meta-llama/llama-3.2-3b-instruct:free", label: "Llama 3.2 3B", free: true },
      { id: "meta-llama/llama-3.2-1b-instruct:free", label: "Llama 3.2 1B", free: true },
      { id: "meta-llama/llama-3.1-8b-instruct:free", label: "Llama 3.1 8B", free: true },
      { id: "deepseek/deepseek-r1:free", label: "DeepSeek R1", free: true, reasoning: true },
      { id: "deepseek/deepseek-chat:free", label: "DeepSeek V3", free: true },
      { id: "qwen/qwen-2.5-72b-instruct:free", label: "Qwen 2.5 72B", free: true },
      { id: "qwen/qwen-2.5-coder-32b-instruct:free", label: "Qwen 2.5 Coder 32B", free: true, note: "Coding" },
      { id: "google/gemma-3-27b-it:free", label: "Gemma 3 27B", free: true },
      { id: "google/gemma-2-9b-it:free", label: "Gemma 2 9B", free: true },
      { id: "mistralai/mistral-small-3.1-24b-instruct:free", label: "Mistral Small 3.1 24B", free: true },
      { id: "mistralai/mistral-7b-instruct:free", label: "Mistral 7B", free: true },
      { id: "nousresearch/hermes-3-llama-3.1-405b:free", label: "Hermes 3 405B", free: true },
      { id: "microsoft/phi-3-mini-128k-instruct:free", label: "Phi-3 Mini 128k", free: true },
    ],
  },
  {
    id: "ollama",
    label: "Ollama (self-hosted)",
    fn: "jackie-ollama",
    requiresSecret: "OLLAMA_BASE_URL",
    helpUrl: "https://ollama.com/download",
    free: true,
    description: "Your own GPU/laptop. Expose via Cloudflare Tunnel and paste the URL. 100% private.",
    models: [
      { id: "llama3.3:70b", label: "Llama 3.3 70B", free: true, note: "Best general (~40GB VRAM)" },
      { id: "llama3.2:3b", label: "Llama 3.2 3B", free: true, note: "Runs on laptop" },
      { id: "llama3.2:1b", label: "Llama 3.2 1B", free: true, note: "Runs on phone" },
      { id: "llama3.2-vision:11b", label: "Llama 3.2 Vision 11B", free: true, vision: true },
      { id: "qwen2.5-coder:32b", label: "Qwen 2.5 Coder 32B", free: true, note: "Best local coder" },
      { id: "deepseek-coder-v2:16b", label: "DeepSeek Coder V2 16B", free: true, note: "Fast coder" },
      { id: "deepseek-r1:32b", label: "DeepSeek R1 32B", free: true, reasoning: true },
      { id: "codellama:34b", label: "CodeLlama 34B", free: true },
      { id: "codellama:13b", label: "CodeLlama 13B", free: true },
      { id: "codellama:7b", label: "CodeLlama 7B", free: true },
      { id: "gemma2:9b", label: "Gemma 2 9B", free: true },
      { id: "mistral:7b", label: "Mistral 7B", free: true },
      { id: "phi3:mini", label: "Phi-3 Mini", free: true },
      { id: "starcoder2:15b", label: "StarCoder2 15B", free: true },
    ],
  },
];

export function findProvider(id: ProviderId): ProviderDef | undefined {
  return PROVIDERS.find((p) => p.id === id);
}

// Suggested agent presets (Ollama). At least 3, as requested.
export const OLLAMA_AGENTS = [
  {
    name: "Jackie-Coder",
    model: "qwen2.5-coder:32b",
    system: "You are Jackie-Coder. Terse, output only code, TypeScript+Tailwind, no markdown fences unless asked.",
    role: "Code generation & refactor",
  },
  {
    name: "Jackie-Reasoner",
    model: "deepseek-r1:32b",
    system: "You are Jackie-Reasoner. Think step-by-step. Show reasoning, then a bold conclusion.",
    role: "Complex reasoning, planning, debugging",
  },
  {
    name: "Jackie-Guardian",
    model: "llama-guard-3-8b",
    system: "You are Jackie-Guardian. Classify input for safety. Output JSON: {safe:bool, categories:[]}.",
    role: "Security/safety filter (via Groq or Ollama)",
  },
  {
    name: "Jackie-Fast",
    model: "llama3.2:3b",
    system: "You are Jackie-Fast. Short replies. No preamble.",
    role: "Latency-critical chat / mobile / offline",
  },
  {
    name: "Jackie-Vision",
    model: "llama3.2-vision:11b",
    system: "You are Jackie-Vision. Describe images factually and concisely.",
    role: "Image understanding",
  },
];
