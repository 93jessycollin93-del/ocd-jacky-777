// Unified streaming client — routes to any provider edge function.
// Every provider function returns OpenAI-compatible SSE (`data: {...}\n`).
import type { ProviderId } from "./jackie-providers";
import { findProvider } from "./jackie-providers";
import { supabase } from "@/integrations/supabase/client";

export type ChatMessage = { role: "user" | "assistant" | "system"; content: string };

export async function streamProviderChat({
  provider,
  model,
  messages,
  system,
  onDelta,
  onDone,
  onError,
}: {
  provider: ProviderId;
  model: string;
  messages: ChatMessage[];
  system?: string;
  onDelta: (t: string) => void;
  onDone: () => void;
  onError: (e: string) => void;
}) {
  const def = findProvider(provider);
  if (!def) return onError(`Unknown provider: ${provider}`);

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return onError("Not signed in.");

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${def.fn}`;
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ messages, model, system }),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => null);
      if (err?.needs_secret) {
        onError(`Missing secret ${err.needs_secret}. ${err.error}`);
      } else {
        onError(err?.error || `HTTP ${resp.status}`);
      }
      return;
    }
    if (!resp.body) return onError("No stream body");

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let idx: number;
      while ((idx = buf.indexOf("\n")) !== -1) {
        let line = buf.slice(0, idx);
        buf = buf.slice(idx + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (!line.startsWith("data: ")) continue;
        const payload = line.slice(6).trim();
        if (payload === "[DONE]") { onDone(); return; }
        try {
          const j = JSON.parse(payload);
          const c = j.choices?.[0]?.delta?.content;
          if (c) onDelta(c);
        } catch { /* partial */ }
      }
    }
    onDone();
  } catch (e) {
    onError(e instanceof Error ? e.message : "Connection failed");
  }
}
