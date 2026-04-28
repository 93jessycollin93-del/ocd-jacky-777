// Jackie Global Control Layer
// - Action registry (modules register controllable actions)
// - Command bus (/control /execute /build /analyze /swarm)
// - Role-based safety (user / admin / owner)
// - Audit log (localStorage cache + DB persistence when authenticated)

import {
  pushAuditRemote,
  clearAuditRemote,
  savePrefsRemote,
  fetchPrefsRemote,
  fetchAuditRemote,
} from "./jackie-control-sync";

export type Role = "user" | "admin" | "owner";

export type ControlAction = {
  id: string;             // e.g. "ui.theme.toggle"
  module: string;         // e.g. "ui", "vault", "play"
  description: string;
  minRole: Role;
  run: (args?: Record<string, unknown>) => Promise<string> | string;
};

export type AuditEntry = {
  ts: number;
  actor: Role;
  command: string;
  actionId?: string;
  args?: Record<string, unknown>;
  result: "ok" | "error" | "denied";
  message: string;
};

const ROLE_RANK: Record<Role, number> = { user: 0, admin: 1, owner: 2 };
const AUDIT_KEY = "jackie.control.audit.v1";
const ROLE_KEY = "jackie.control.role.v1";
const MODEL_OVERRIDE_KEY = "jackie.control.model_override.v1";
const MAX_AUDIT = 200;

const registry = new Map<string, ControlAction>();
const listeners = new Set<() => void>();

export function getRole(): Role {
  try {
    const r = localStorage.getItem(ROLE_KEY) as Role | null;
    return r === "admin" || r === "owner" ? r : "owner"; // default owner = single-user app
  } catch {
    return "owner";
  }
}
export function setRole(r: Role) {
  try { localStorage.setItem(ROLE_KEY, r); } catch { /* ignore */ }
  void savePrefsRemote({ role: r, modelOverride: getModelOverride() });
  notify();
}

export function getModelOverride(): string | null {
  try { return localStorage.getItem(MODEL_OVERRIDE_KEY); } catch { return null; }
}
export function setModelOverride(modelId: string | null) {
  try {
    if (modelId) localStorage.setItem(MODEL_OVERRIDE_KEY, modelId);
    else localStorage.removeItem(MODEL_OVERRIDE_KEY);
  } catch { /* ignore */ }
  void savePrefsRemote({ role: getRole(), modelOverride: modelId });
  notify();
}

// Hydrate role + model override from DB on startup (if signed in)
export async function hydrateControlPrefs(): Promise<void> {
  const remote = await fetchPrefsRemote();
  if (!remote) return;
  try {
    localStorage.setItem(ROLE_KEY, remote.role);
    if (remote.modelOverride) localStorage.setItem(MODEL_OVERRIDE_KEY, remote.modelOverride);
    else localStorage.removeItem(MODEL_OVERRIDE_KEY);
  } catch { /* ignore */ }
  notify();
}

export function registerAction(action: ControlAction) {
  registry.set(action.id, action);
  notify();
}
export function unregisterAction(id: string) {
  registry.delete(id);
  notify();
}
export function listActions(): ControlAction[] {
  return Array.from(registry.values()).sort((a, b) => a.id.localeCompare(b.id));
}

export function loadAudit(): AuditEntry[] {
  try {
    const raw = localStorage.getItem(AUDIT_KEY);
    return raw ? (JSON.parse(raw) as AuditEntry[]) : [];
  } catch {
    return [];
  }
}
function saveAudit(entries: AuditEntry[]) {
  try { localStorage.setItem(AUDIT_KEY, JSON.stringify(entries.slice(0, MAX_AUDIT))); } catch { /* ignore */ }
}
export function appendAudit(entry: AuditEntry) {
  const next = [entry, ...loadAudit()].slice(0, MAX_AUDIT);
  saveAudit(next);
  void pushAuditRemote(entry);
  notify();
}
export function clearAudit() {
  saveAudit([]);
  void clearAuditRemote();
  notify();
}

// Hydrate audit log from DB (replaces local cache when remote present)
export async function hydrateAudit(): Promise<void> {
  const remote = await fetchAuditRemote(MAX_AUDIT);
  if (remote.length > 0) {
    saveAudit(remote);
    notify();
  }
}

export function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function notify() {
  for (const l of listeners) {
    try { l(); } catch { /* ignore */ }
  }
}

// Permission check
export function canRun(action: ControlAction, role: Role = getRole()): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[action.minRole];
}

// Run an action by id with audit
export async function runAction(id: string, args?: Record<string, unknown>): Promise<string> {
  const role = getRole();
  const action = registry.get(id);
  if (!action) {
    appendAudit({ ts: Date.now(), actor: role, command: `/execute ${id}`, actionId: id, args, result: "error", message: "Action not found" });
    throw new Error(`Action not found: ${id}`);
  }
  if (!canRun(action, role)) {
    appendAudit({ ts: Date.now(), actor: role, command: `/execute ${id}`, actionId: id, args, result: "denied", message: `Role ${role} cannot run ${id}` });
    throw new Error(`Permission denied: requires ${action.minRole}`);
  }
  try {
    const message = await action.run(args);
    appendAudit({ ts: Date.now(), actor: role, command: `/execute ${id}`, actionId: id, args, result: "ok", message: String(message) });
    return String(message);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Action failed";
    appendAudit({ ts: Date.now(), actor: role, command: `/execute ${id}`, actionId: id, args, result: "error", message: msg });
    throw e;
  }
}

// Universal command parser
// Supported: /control [list], /execute <action.id> [json args],
//            /build <spec>, /analyze <target>, /swarm <goal>
export type CommandResult = {
  ok: boolean;
  message: string;
  data?: unknown;
};

export async function runCommand(line: string): Promise<CommandResult> {
  const trimmed = line.trim();
  if (!trimmed.startsWith("/")) {
    return { ok: false, message: "Commands must start with /" };
  }
  const [head, ...rest] = trimmed.split(/\s+/);
  const cmd = head.toLowerCase();
  const argline = rest.join(" ").trim();
  const role = getRole();

  switch (cmd) {
    case "/control": {
      const actions = listActions();
      appendAudit({ ts: Date.now(), actor: role, command: trimmed, result: "ok", message: `Listed ${actions.length} actions` });
      return { ok: true, message: `${actions.length} registered actions`, data: actions };
    }
    case "/execute": {
      if (!argline) return { ok: false, message: "Usage: /execute <action.id> [json]" };
      const spaceIdx = argline.indexOf(" ");
      const id = spaceIdx === -1 ? argline : argline.slice(0, spaceIdx);
      const tail = spaceIdx === -1 ? "" : argline.slice(spaceIdx + 1).trim();
      let args: Record<string, unknown> | undefined;
      if (tail) {
        try { args = JSON.parse(tail); } catch { return { ok: false, message: "Invalid JSON args" }; }
      }
      try {
        const out = await runAction(id, args);
        return { ok: true, message: out };
      } catch (e) {
        return { ok: false, message: e instanceof Error ? e.message : "Failed" };
      }
    }
    case "/build":
    case "/analyze":
    case "/swarm": {
      // These are intent commands handled by the Control Panel via orchestrator/swarm runner.
      appendAudit({ ts: Date.now(), actor: role, command: trimmed, result: "ok", message: `Dispatched ${cmd}` });
      return { ok: true, message: `Dispatched ${cmd}`, data: { kind: cmd.slice(1), payload: argline } };
    }
    case "/verify": {
      if (!argline) return { ok: false, message: "Usage: /verify <language>[, <language>...]" };
      const langs = argline.split(/\s*[,|]\s*/).map((s) => s.trim()).filter(Boolean);
      appendAudit({ ts: Date.now(), actor: role, command: trimmed, result: "ok", message: `Dispatched verify (${langs.length})` });
      return { ok: true, message: `Verifying ${langs.length} language(s)`, data: { kind: "verify", payload: langs } };
    }
    default:
      return { ok: false, message: `Unknown command: ${cmd}` };
  }
}

// ─── Built-in actions (safe, role-gated) ─────────────────────────────────
function registerBuiltins() {
  registerAction({
    id: "ui.theme.toggle",
    module: "ui",
    description: "Toggle dark / light theme",
    minRole: "user",
    run: () => {
      const root = document.documentElement;
      const dark = root.classList.toggle("dark");
      try { localStorage.setItem("theme", dark ? "dark" : "light"); } catch { /* ignore */ }
      return `Theme set to ${dark ? "dark" : "light"}`;
    },
  });
  registerAction({
    id: "ui.navigate",
    module: "ui",
    description: "Navigate to a route. args: { path: string }",
    minRole: "user",
    run: (args) => {
      const path = (args?.path as string) || "/";
      window.history.pushState({}, "", path);
      window.dispatchEvent(new PopStateEvent("popstate"));
      return `Navigated to ${path}`;
    },
  });
  registerAction({
    id: "system.audit.clear",
    module: "system",
    description: "Clear the audit log",
    minRole: "admin",
    run: () => {
      clearAudit();
      return "Audit log cleared";
    },
  });
  registerAction({
    id: "system.storage.purge",
    module: "system",
    description: "Wipe non-essential local storage (keeps auth)",
    minRole: "owner",
    run: () => {
      const keep = ["theme", "supabase.auth.token", ROLE_KEY];
      const all = Object.keys(localStorage);
      let cleared = 0;
      for (const k of all) {
        if (keep.some((p) => k.includes(p))) continue;
        try { localStorage.removeItem(k); cleared++; } catch { /* ignore */ }
      }
      return `Purged ${cleared} keys`;
    },
  });
}
registerBuiltins();
