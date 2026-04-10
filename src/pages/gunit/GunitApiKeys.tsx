import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Key, Copy, Check, Trash2, Plus, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  is_active: boolean;
  created_at: string;
}

export default function GunitApiKeys() {
  const { user } = useAuth();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [newRawKey, setNewRawKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const fetchKeys = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("api_keys")
      .select("id, name, prefix, is_active, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setKeys((data || []) as ApiKey[]);
  };

  useEffect(() => { fetchKeys(); }, [user]);

  const generateKey = async () => {
    if (!newKeyName.trim() || !user) return;

    // Generate key client-side, hash it, store hash
    const rawBytes = new Uint8Array(32);
    crypto.getRandomValues(rawBytes);
    const hex = Array.from(rawBytes).map((b) => b.toString(16).padStart(2, "0")).join("");
    const rawKey = `gunit_${hex}`;
    const prefix = rawKey.slice(0, 12);

    // Hash
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(rawKey));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const keyHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    const { error } = await supabase.from("api_keys").insert({
      user_id: user.id,
      name: newKeyName.trim(),
      key_hash: keyHash,
      prefix,
      scopes: ["bot:create", "bot:run"],
    });

    if (error) {
      toast.error("Failed to create key");
      return;
    }

    setNewRawKey(rawKey);
    setNewKeyName("");
    setShowKey(true);
    fetchKeys();
    toast.success("API key generated. Copy it now — it won't be shown again.");
  };

  const revokeKey = async (id: string) => {
    await supabase.from("api_keys").update({ is_active: false }).eq("id", id);
    toast.success("Key revoked");
    fetchKeys();
  };

  const copyKey = () => {
    if (newRawKey) {
      navigator.clipboard.writeText(newRawKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-2">
        <Key className="w-4 h-4 text-[#ffaa00]" />
        <h2 className="font-mono text-sm tracking-widest text-[#ffaa00]">API KEYS</h2>
      </div>

      {/* Generate */}
      <div className="flex gap-2">
        <input
          value={newKeyName}
          onChange={(e) => setNewKeyName(e.target.value)}
          placeholder="Key name (e.g. Production Bot)"
          className="flex-1 bg-[#0a0a0f] border border-[#ffffff10] rounded px-3 py-2 font-mono text-xs text-[#c0c0c0] placeholder:text-[#404040] focus:outline-none focus:border-[#ffaa0030]"
        />
        <button onClick={generateKey} disabled={!newKeyName.trim()} className="px-3 py-2 bg-[#ffaa0015] border border-[#ffaa0030] rounded font-mono text-xs text-[#ffaa00] hover:bg-[#ffaa0025] disabled:opacity-30 flex items-center gap-1">
          <Plus className="w-3 h-3" /> GENERATE
        </button>
      </div>

      {/* Newly generated key */}
      {newRawKey && (
        <div className="bg-[#ffaa0008] border border-[#ffaa0030] rounded p-3 space-y-2">
          <p className="font-mono text-[10px] text-[#ffaa00]">⚠ COPY THIS KEY NOW — IT WILL NOT BE SHOWN AGAIN</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-[#050508] rounded px-3 py-2 font-mono text-xs text-[#c0c0c0] overflow-hidden">
              {showKey ? newRawKey : "•".repeat(40)}
            </code>
            <button onClick={() => setShowKey(!showKey)} className="p-2 text-[#808080] hover:text-[#c0c0c0]">
              {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
            <button onClick={copyKey} className="p-2 text-[#808080] hover:text-[#00ff88]">
              {copied ? <Check className="w-3.5 h-3.5 text-[#00ff88]" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <button onClick={() => setNewRawKey(null)} className="font-mono text-[10px] text-[#808080] hover:text-[#c0c0c0]">
            Dismiss
          </button>
        </div>
      )}

      {/* Key List */}
      <div className="space-y-2">
        {keys.map((k) => (
          <div key={k.id} className="bg-[#0a0a0f] border border-[#ffffff10] rounded p-3 flex items-center gap-3">
            <Key className={`w-3.5 h-3.5 ${k.is_active ? "text-[#00ff88]" : "text-[#ff5555]"}`} />
            <div className="flex-1 min-w-0">
              <p className="font-mono text-xs text-[#c0c0c0]">{k.name}</p>
              <p className="font-mono text-[10px] text-[#808080]">{k.prefix}... • {format(new Date(k.created_at), "MMM d, yyyy")}</p>
            </div>
            <span className={`px-2 py-0.5 rounded font-mono text-[9px] ${k.is_active ? "bg-[#00ff8810] text-[#00ff88]" : "bg-[#ff555510] text-[#ff5555]"}`}>
              {k.is_active ? "ACTIVE" : "REVOKED"}
            </span>
            {k.is_active && (
              <button onClick={() => revokeKey(k.id)} className="p-1.5 text-[#404040] hover:text-red-400 transition-colors">
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
        {keys.length === 0 && (
          <div className="text-center py-8 font-mono text-xs text-[#404040]">No API keys yet.</div>
        )}
      </div>
    </div>
  );
}
