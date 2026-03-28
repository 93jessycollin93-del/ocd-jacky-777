const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/jackie-chat`;

export type ChatMessage = { role: "user" | "assistant"; content: string };

export const JACKIE_MODELS = [
  { id: "google/gemini-2.5-pro", label: "Gemini Pro", description: "Top-tier reasoning", cost: 3, speed: 1 },
  { id: "google/gemini-2.5-flash", label: "Gemini Flash", description: "Fast & capable", cost: 2, speed: 2 },
  { id: "google/gemini-2.5-flash-lite", label: "Gemini Lite", description: "Fastest & cheapest", cost: 1, speed: 3 },
  { id: "google/gemini-3-flash-preview", label: "Gemini 3 Flash", description: "Next-gen balanced", cost: 2, speed: 2 },
  { id: "openai/gpt-5", label: "GPT-5", description: "Powerful all-rounder", cost: 3, speed: 1 },
  { id: "openai/gpt-5-mini", label: "GPT-5 Mini", description: "Strong & efficient", cost: 2, speed: 2 },
] as const;

export type JackieModelId = (typeof JACKIE_MODELS)[number]["id"];

export async function streamChat({
  messages,
  model,
  onDelta,
  onDone,
  onError,
}: {
  messages: ChatMessage[];
  model?: JackieModelId;
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
}) {
  try {
    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ messages, ...(model ? { model } : {}) }),
    });

    if (!resp.ok) {
      const errorData = await resp.json().catch(() => null);
      const msg =
        resp.status === 429
          ? "Rate limit hit. Wait a moment and try again."
          : resp.status === 402
          ? "Usage limit reached. Add credits to continue."
          : errorData?.error || "Something went wrong.";
      onError(msg);
      return;
    }

    if (!resp.body) {
      onError("No response stream.");
      return;
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let done = false;

    while (!done) {
      const { done: readerDone, value } = await reader.read();
      if (readerDone) break;
      buffer += decoder.decode(value, { stream: true });

      let newlineIdx: number;
      while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
        let line = buffer.slice(0, newlineIdx);
        buffer = buffer.slice(newlineIdx + 1);

        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") {
          done = true;
          break;
        }

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) onDelta(content);
        } catch {
          buffer = line + "\n" + buffer;
          break;
        }
      }
    }

    // Flush remaining
    if (buffer.trim()) {
      for (let raw of buffer.split("\n")) {
        if (!raw) continue;
        if (raw.endsWith("\r")) raw = raw.slice(0, -1);
        if (!raw.startsWith("data: ")) continue;
        const jsonStr = raw.slice(6).trim();
        if (jsonStr === "[DONE]") continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) onDelta(content);
        } catch {
          /* ignore */
        }
      }
    }

    onDone();
  } catch (e) {
    onError(e instanceof Error ? e.message : "Connection failed.");
  }
}
