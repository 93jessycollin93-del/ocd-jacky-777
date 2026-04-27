// DB sync for Jackie Control: audit, swarms, prefs.
// Falls back gracefully when not signed in (localStorage still works).
import { supabase } from "@/integrations/supabase/client";
import type { AuditEntry, Role } from "@/lib/jackie-control";

export type RemoteSwarm = {
  id: string;
  goal: string;
  models: string[];
  status: "running" | "done" | "error";
  results: { modelId: string; output: string; error?: string }[];
  startedAt: number;
};

async function uid(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

// ── Audit ────────────────────────────────────────────────────────────
export async function pushAuditRemote(entry: AuditEntry): Promise<void> {
  const user_id = await uid();
  if (!user_id) return;
  await supabase.from("jackie_control_audit").insert({
    user_id,
    ts: new Date(entry.ts).toISOString(),
    actor: entry.actor,
    command: entry.command,
    action_id: entry.actionId ?? null,
    args: (entry.args ?? null) as never,
    result: entry.result,
    message: entry.message,
  });
}

export async function fetchAuditRemote(limit = 200): Promise<AuditEntry[]> {
  const user_id = await uid();
  if (!user_id) return [];
  const { data, error } = await supabase
    .from("jackie_control_audit")
    .select("ts, actor, command, action_id, args, result, message")
    .eq("user_id", user_id)
    .order("ts", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data.map((r) => ({
    ts: new Date(r.ts as string).getTime(),
    actor: r.actor as Role,
    command: r.command as string,
    actionId: (r.action_id ?? undefined) as string | undefined,
    args: (r.args ?? undefined) as Record<string, unknown> | undefined,
    result: r.result as AuditEntry["result"],
    message: r.message as string,
  }));
}

export async function clearAuditRemote(): Promise<void> {
  const user_id = await uid();
  if (!user_id) return;
  await supabase.from("jackie_control_audit").delete().eq("user_id", user_id);
}

// ── Swarms ───────────────────────────────────────────────────────────
export async function createSwarmRemote(s: RemoteSwarm): Promise<void> {
  const user_id = await uid();
  if (!user_id) return;
  await supabase.from("jackie_control_swarms").insert({
    id: s.id,
    user_id,
    goal: s.goal,
    models: s.models as never,
    status: s.status,
    results: s.results as never,
    started_at: new Date(s.startedAt).toISOString(),
  });
}

export async function updateSwarmRemote(
  id: string,
  patch: Partial<Pick<RemoteSwarm, "status" | "results">>
): Promise<void> {
  const user_id = await uid();
  if (!user_id) return;
  const update: Record<string, unknown> = {};
  if (patch.status) update.status = patch.status;
  if (patch.results) update.results = patch.results;
  if (Object.keys(update).length === 0) return;
  await supabase.from("jackie_control_swarms").update(update).eq("id", id).eq("user_id", user_id);
}

export async function fetchSwarmsRemote(limit = 50): Promise<RemoteSwarm[]> {
  const user_id = await uid();
  if (!user_id) return [];
  const { data, error } = await supabase
    .from("jackie_control_swarms")
    .select("id, goal, models, status, results, started_at")
    .eq("user_id", user_id)
    .order("started_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data.map((r) => ({
    id: r.id as string,
    goal: r.goal as string,
    models: (r.models as string[]) ?? [],
    status: r.status as RemoteSwarm["status"],
    results: (r.results as RemoteSwarm["results"]) ?? [],
    startedAt: new Date(r.started_at as string).getTime(),
  }));
}

// ── Prefs ────────────────────────────────────────────────────────────
export async function fetchPrefsRemote(): Promise<{ role: Role; modelOverride: string | null } | null> {
  const user_id = await uid();
  if (!user_id) return null;
  const { data } = await supabase
    .from("jackie_control_prefs")
    .select("role, model_override")
    .eq("user_id", user_id)
    .maybeSingle();
  if (!data) return null;
  return {
    role: (data.role as Role) ?? "owner",
    modelOverride: (data.model_override as string | null) ?? null,
  };
}

export async function savePrefsRemote(p: { role: Role; modelOverride: string | null }): Promise<void> {
  const user_id = await uid();
  if (!user_id) return;
  await supabase.from("jackie_control_prefs").upsert({
    user_id,
    role: p.role,
    model_override: p.modelOverride,
  });
}
