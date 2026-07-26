// jackyClient — Jackie's native bridge to the real Jacky Flask engine.
//
// Fleet Parity Plan Wave 2 (surface). Calls the Wave 1 `jacky-proxy` edge
// function, which forwards to JACKY_API_BASE/api/* server-side (host + token in
// Supabase secrets). Response shapes mirror jacky_api.py. Each call throws on
// failure so UI can fall back to a demo state.
import { supabase } from "@/integrations/supabase/client";

export interface JackyGpu {
  available: boolean;
  temp_c?: number;
  load_percent?: number;
  mem_used_mb?: number;
  mem_total_mb?: number;
  max_temp_c?: number;
  safe_to_use?: boolean;
}

export interface JackyStatus {
  status: string;
  cpu: number;
  memory: number;
  gpu: JackyGpu;
  timestamp?: string;
}

export interface JackyAssessment {
  level?: string;
  badge?: string;
  safe_to_run_local?: boolean;
  reason?: string;
  [key: string]: unknown;
}

export interface JackyAskResult {
  status: string;
  engine?: string;
  route?: string;
  model?: string;
  response: string;
  why?: string;
  latency_s?: number;
}

interface ProxyEnvelope<T> {
  ok?: boolean;
  status?: number;
  data?: T;
  error?: string;
  detail?: string;
}

async function proxy<T>(path: string, method: "GET" | "POST" = "GET", body?: unknown): Promise<T> {
  const { data, error } = await supabase.functions.invoke<ProxyEnvelope<T>>("jacky-proxy", {
    body: { path, method, body },
  });
  if (error) throw new Error(error.message || "jacky-proxy invoke failed");
  if (!data) throw new Error("empty response from jacky-proxy");
  if (data.error) throw new Error(data.detail || data.error);
  if (data.ok === false) throw new Error(`jacky ${path} → HTTP ${data.status ?? "??"}`);
  return data.data as T;
}

export const jacky = {
  getStatus: () => proxy<JackyStatus>("status"),
  getAssessment: () => proxy<JackyAssessment>("assessment"),
  ask: (prompt: string, task_type = "general") =>
    proxy<JackyAskResult>("ask", "POST", { prompt, task_type }),
  getControl: () => proxy<{ active: boolean; thinking_mode: string }>("control"),
  askSquad: (squad: string, prompt: string) =>
    proxy<JackyAskResult>(`squads/${squad}/ask`, "POST", { prompt }),
};
