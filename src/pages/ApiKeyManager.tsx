import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Key, Plus, Trash2, Copy, Eye, EyeOff, Shield, ArrowLeft,
  Activity, Clock, Check, X, Loader2, RefreshCw, Link2, Unlink,
  Bot, AlertTriangle,
} from "lucide-react";

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  rate_limit: number;
  is_active: boolean;
  created_at: string;
  last_used_at: string | null;
}

interface UsageLog {
  id: string;
  api_key_id: string;
  endpoint: string;
  status_code: number;
  response_time_ms: number;
  created_at: string;
}

interface SavedBot {
  id: string;
  name: string;
  platform: string;
  status: string;
}

const AVAILABLE_SCOPES = [
  { id: "bot:create", label: "Create Bots", desc: "Generate new bot projects" },
  { id: "bot:run", label: "Run Bots", desc: "Execute bot code" },
  { id: "file:convert", label: "File Convert", desc: "Convert file formats" },
  { id: "api:fetch", label: "API Fetch", desc: "Make external API calls" },
  { id: "scrape:web", label: "Web Scrape", desc: "Extract web data" },
  { id: "key:manage", label: "Key Manage", desc: "Manage API keys" },
];

const EDGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api-keys`;

async function apiCall(action: string, method: string, body?: Record<string, unknown>, params?: Record<string, string>) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  let url = `${EDGE_URL}/${action}`;
  if (params) {
    const sp = new URLSearchParams(params);
    url += `?${sp.toString()}`;
  }

  const resp = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error || "Request failed");
  return data;
}

export default function ApiKeyManager() {
  const { user } = useAuth();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [bots, setBots] = useState<SavedBot[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>(["bot:create"]);
  const [newKeyRateLimit, setNewKeyRateLimit] = useState(60);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"keys" | "usage" | "bots">("keys");
  const [selectedKeyId, setSelectedKeyId] = useState<string | null>(null);

  const fetchKeys = useCallback(async () => {
    try {
      const data = await apiCall("list", "GET");
      setKeys(data.keys || []);
    } catch (e: any) {
      toast.error(e.message);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    try {
      const params: Record<string, string> = {};
      if (selectedKeyId) params.key_id = selectedKeyId;
      const data = await apiCall("usage", "GET", undefined, params);
      setLogs(data.logs || []);
    } catch (e: any) {
      toast.error(e.message);
    }
  }, [selectedKeyId]);

  const fetchBots = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("user_bots" as any)
        .select("id, name, platform, status")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setBots((data as any) || []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([fetchKeys(), fetchBots()]).finally(() => setLoading(false));
  }, [user, fetchKeys, fetchBots]);

  useEffect(() => {
    if (activeTab === "usage") fetchLogs();
  }, [activeTab, fetchLogs]);

  const handleCreate = async () => {
    if (!newKeyName.trim()) { toast.error("Name required"); return; }
    setCreating(true);
    try {
      const data = await apiCall("create", "POST", {
        name: newKeyName.trim(),
        scopes: newKeyScopes,
        rate_limit: newKeyRateLimit,
      });
      setRevealedKey(data.raw_key);
      toast.success("API key created — copy it now, it won't be shown again!");
      setShowCreate(false);
      setNewKeyName("");
      await fetchKeys();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      await apiCall("revoke", "POST", { key_id: id });
      toast.success("Key revoked");
      await fetchKeys();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleCopyKey = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied");
    } catch { toast.error("Copy failed"); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={24} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-4 py-3 flex items-center gap-3">
        <a href="/" className="p-2 rounded-md hover:bg-secondary transition-colors">
          <ArrowLeft size={16} className="text-muted-foreground" />
        </a>
        <Shield size={20} className="text-primary" />
        <h1 className="font-mono text-sm font-bold tracking-wide">API Key Vault</h1>
        <div className="ml-auto flex gap-1">
          {(["keys", "usage", "bots"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-md font-mono text-[11px] transition-colors capitalize ${
                activeTab === tab ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

          {/* Revealed key banner */}
          {revealedKey && (
            <div className="p-4 rounded-md border-2 border-yellow-500/50 bg-yellow-500/10 space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-yellow-500" />
                <span className="font-mono text-xs font-bold text-yellow-500">
                  Save this key now — it will never be shown again
                </span>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 font-mono text-xs bg-background p-2 rounded-md border border-border break-all select-all">
                  {revealedKey}
                </code>
                <button onClick={() => handleCopyKey(revealedKey)} className="p-2 rounded-md bg-secondary hover:bg-secondary/80">
                  <Copy size={14} />
                </button>
              </div>
              <button onClick={() => setRevealedKey(null)} className="text-xs font-mono text-muted-foreground hover:text-foreground">
                Dismiss
              </button>
            </div>
          )}

          {/* ── KEYS TAB ── */}
          {activeTab === "keys" && (
            <>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-muted-foreground">{keys.length} key{keys.length !== 1 ? "s" : ""}</span>
                <button
                  onClick={() => setShowCreate(!showCreate)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-primary text-primary-foreground font-mono text-xs hover:bg-primary/90 transition-colors"
                >
                  <Plus size={12} /> New Key
                </button>
              </div>

              {showCreate && (
                <div className="p-4 rounded-md border border-border bg-secondary/20 space-y-3">
                  <input
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="Key name (e.g. Telegram Bot Key)"
                    maxLength={100}
                    className="w-full px-3 py-2 rounded-md border border-border bg-background font-mono text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <div>
                    <label className="font-mono text-[10px] text-muted-foreground uppercase">Scopes</label>
                    <div className="grid grid-cols-2 gap-1.5 mt-1">
                      {AVAILABLE_SCOPES.map((s) => {
                        const active = newKeyScopes.includes(s.id);
                        return (
                          <button
                            key={s.id}
                            onClick={() => setNewKeyScopes(active ? newKeyScopes.filter((x) => x !== s.id) : [...newKeyScopes, s.id])}
                            className={`flex items-center gap-2 p-2 rounded-md border text-left transition-all ${
                              active ? "border-primary bg-primary/10" : "border-border hover:border-primary/30"
                            }`}
                          >
                            <div className={`w-4 h-4 rounded-sm border-2 flex items-center justify-center ${active ? "border-primary bg-primary" : "border-muted-foreground/30"}`}>
                              {active && <Check size={10} className="text-primary-foreground" />}
                            </div>
                            <div>
                              <div className="font-mono text-[10px] font-medium">{s.label}</div>
                              <div className="font-mono text-[8px] text-muted-foreground">{s.desc}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <label className="font-mono text-[10px] text-muted-foreground uppercase">Rate Limit (req/min)</label>
                    <input
                      type="number"
                      value={newKeyRateLimit}
                      onChange={(e) => setNewKeyRateLimit(Math.min(1000, Math.max(1, Number(e.target.value))))}
                      className="w-full mt-1 px-3 py-2 rounded-md border border-border bg-background font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreate}
                      disabled={creating}
                      className="flex items-center gap-1 px-4 py-2 rounded-md bg-primary text-primary-foreground font-mono text-xs disabled:opacity-50 hover:bg-primary/90"
                    >
                      {creating ? <Loader2 size={12} className="animate-spin" /> : <Key size={12} />}
                      Generate Key
                    </button>
                    <button onClick={() => setShowCreate(false)} className="px-3 py-2 font-mono text-xs text-muted-foreground hover:text-foreground">
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {keys.map((k) => (
                  <div key={k.id} className={`p-3 rounded-md border transition-all ${k.is_active ? "border-border bg-secondary/10" : "border-destructive/30 bg-destructive/5 opacity-60"}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Key size={14} className={k.is_active ? "text-primary" : "text-destructive"} />
                      <span className="font-mono text-xs font-bold flex-1">{k.name}</span>
                      {!k.is_active && <span className="font-mono text-[9px] text-destructive bg-destructive/10 px-1.5 py-0.5 rounded">REVOKED</span>}
                      {k.is_active && (
                        <button
                          onClick={() => handleRevoke(k.id)}
                          className="p-1 rounded-md text-muted-foreground hover:text-destructive transition-colors"
                          title="Revoke key"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-1 font-mono text-[10px]">
                      <span className="text-muted-foreground">Prefix:</span>
                      <code className="text-foreground">{k.prefix}...</code>
                      <span className="text-muted-foreground">Rate limit:</span>
                      <span>{k.rate_limit}/min</span>
                      <span className="text-muted-foreground">Created:</span>
                      <span>{new Date(k.created_at).toLocaleDateString()}</span>
                      {k.last_used_at && (
                        <>
                          <span className="text-muted-foreground">Last used:</span>
                          <span>{new Date(k.last_used_at).toLocaleString()}</span>
                        </>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(k.scopes as string[]).map((s) => (
                        <span key={s} className="px-1.5 py-0.5 rounded-sm bg-primary/10 text-primary font-mono text-[9px]">{s}</span>
                      ))}
                    </div>
                  </div>
                ))}
                {keys.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground font-mono text-xs">
                    No API keys yet. Create one to get started.
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── USAGE TAB ── */}
          {activeTab === "usage" && (
            <>
              <div className="flex items-center gap-2">
                <select
                  value={selectedKeyId || ""}
                  onChange={(e) => setSelectedKeyId(e.target.value || null)}
                  className="flex-1 px-3 py-2 rounded-md border border-border bg-secondary/30 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">All keys</option>
                  {keys.filter((k) => k.is_active).map((k) => (
                    <option key={k.id} value={k.id}>{k.name} ({k.prefix}...)</option>
                  ))}
                </select>
                <button onClick={fetchLogs} className="p-2 rounded-md bg-secondary hover:bg-secondary/80">
                  <RefreshCw size={14} />
                </button>
              </div>

              <div className="space-y-1">
                {logs.map((l) => (
                  <div key={l.id} className="flex items-center gap-2 p-2 rounded-md border border-border bg-secondary/10 font-mono text-[10px]">
                    <span className={`px-1.5 py-0.5 rounded-sm font-bold ${
                      l.status_code < 300 ? "bg-green-500/20 text-green-400" :
                      l.status_code < 400 ? "bg-yellow-500/20 text-yellow-400" :
                      "bg-red-500/20 text-red-400"
                    }`}>
                      {l.status_code}
                    </span>
                    <span className="flex-1 truncate">{l.endpoint}</span>
                    <span className="text-muted-foreground">{l.response_time_ms}ms</span>
                    <span className="text-muted-foreground">{new Date(l.created_at).toLocaleTimeString()}</span>
                  </div>
                ))}
                {logs.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground font-mono text-xs">
                    No usage logs yet.
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── BOTS TAB ── */}
          {activeTab === "bots" && (
            <>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-muted-foreground">{bots.length} bot{bots.length !== 1 ? "s" : ""}</span>
                <a href="/bots" className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-primary text-primary-foreground font-mono text-xs hover:bg-primary/90">
                  <Bot size={12} /> Bot Foundry
                </a>
              </div>
              <div className="space-y-2">
                {bots.map((b) => (
                  <div key={b.id} className="p-3 rounded-md border border-border bg-secondary/10">
                    <div className="flex items-center gap-2 mb-2">
                      <Bot size={14} className="text-primary" />
                      <span className="font-mono text-xs font-bold flex-1">{b.name}</span>
                      <span className="font-mono text-[9px] px-1.5 py-0.5 rounded-sm bg-primary/10 text-primary capitalize">{b.platform}</span>
                      <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded-sm ${
                        b.status === "generated" ? "bg-green-500/10 text-green-400" : "bg-yellow-500/10 text-yellow-400"
                      }`}>{b.status}</span>
                    </div>
                    {/* Link key to bot */}
                    <div className="flex items-center gap-1 mt-2">
                      <select
                        defaultValue=""
                        className="flex-1 px-2 py-1 rounded-md border border-border bg-background font-mono text-[10px] focus:outline-none"
                        onChange={async (e) => {
                          if (!e.target.value) return;
                          try {
                            await apiCall("link-bot", "POST", { bot_id: b.id, api_key_id: e.target.value });
                            toast.success("Key linked to bot");
                          } catch (err: any) {
                            toast.error(err.message);
                          }
                          e.target.value = "";
                        }}
                      >
                        <option value="">Assign API key...</option>
                        {keys.filter((k) => k.is_active).map((k) => (
                          <option key={k.id} value={k.id}>{k.name}</option>
                        ))}
                      </select>
                      <Link2 size={10} className="text-muted-foreground" />
                    </div>
                  </div>
                ))}
                {bots.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground font-mono text-xs">
                    No bots yet. <a href="/bots" className="text-primary hover:underline">Create one in Bot Foundry</a>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
