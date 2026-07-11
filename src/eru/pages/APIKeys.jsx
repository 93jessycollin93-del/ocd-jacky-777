import { useState, useEffect } from 'react';
import { base44 } from '@/eru/api/base44Client';
import {
  Key, Plus, X, Copy, Check, AlertTriangle, Trash2, Crown,
  Zap, Eye, BookOpen, Rocket, Star, Shield, Bot, Activity, Globe,
  Brain, Code, Lock, Unlock, ChevronDown,
  ChevronUp, BarChart2, Sparkles, Network, TrendingUp
} from 'lucide-react';

// ─── CAPABILITY SCOPES ────────────────────────────────────────────────────────
const BOT_CAPABILITIES = [
  { id: 'bot:chat',        label: 'Bot Chat',        icon: Bot,       color: 'text-blue-400',   desc: 'Send/receive messages with bots' },
  { id: 'bot:create',      label: 'Bot Create',      icon: Plus,      color: 'text-green-400',  desc: 'Create and configure new bots' },
  { id: 'bot:memory',      label: 'Bot Memory',      icon: Brain,     color: 'text-purple-400', desc: 'Read/write bot memory & context' },
  { id: 'bot:automate',    label: 'Automations',     icon: Zap,       color: 'text-yellow-400', desc: 'Trigger and manage bot automations' },
  { id: 'bot:squad',       label: 'Squad Pipelines', icon: Network,   color: 'text-cyan-400',   desc: 'Execute multi-agent pipelines' },
  { id: 'bot:websearch',   label: 'Web Search',      icon: Globe,     color: 'text-orange-400', desc: 'Allow bots to fetch live web data' },
  { id: 'bot:code',        label: 'Code Engine',     icon: Code,      color: 'text-pink-400',   desc: 'Bots can generate and run code tasks' },
  { id: 'bot:analytics',   label: 'Analytics',       icon: BarChart2, color: 'text-indigo-400', desc: 'Read bot XP, stats, and performance' },
  { id: 'jackie:read',     label: 'Jackie Read',     icon: Sparkles,  color: 'text-primary',    desc: 'Read Jackie AI conversations' },
  { id: 'jackie:write',    label: 'Jackie Write',    icon: Sparkles,  color: 'text-primary',    desc: 'Send messages to Jackie AI' },
  { id: 'markets:read',    label: 'Markets Read',    icon: TrendingUp,color: 'text-green-400',  desc: 'Read market data and prices' },
  { id: 'portfolio:read',  label: 'Portfolio',       icon: Star,      color: 'text-yellow-400', desc: 'Read portfolio and holdings' },
  { id: 'messages:read',   label: 'Messages',        icon: Activity,  color: 'text-blue-400',   desc: 'Read message history' },
  { id: 'admin:all',       label: 'Admin All',       icon: Crown,     color: 'text-red-400',    desc: 'Full admin access — use with care' },
];

const TIERS = [
  {
    id: 1, label: 'Observer', icon: Eye, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20',
    desc: 'Read-only market + portfolio data. No bot access.',
    scopes: ['markets:read', 'portfolio:read'],
    botScopes: [],
  },
  {
    id: 2, label: 'Builder', icon: BookOpen, color: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/20',
    desc: 'Chat with existing bots, read analytics.',
    scopes: ['markets:read', 'portfolio:read', 'bot:chat', 'bot:analytics', 'messages:read'],
    botScopes: ['bot:chat', 'bot:analytics'],
  },
  {
    id: 3, label: 'Operator', icon: Zap, color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/20',
    desc: 'Create bots, use memory, trigger automations.',
    scopes: ['markets:read', 'portfolio:read', 'bot:chat', 'bot:create', 'bot:memory', 'bot:automate', 'bot:analytics', 'messages:read', 'jackie:read'],
    botScopes: ['bot:chat', 'bot:create', 'bot:memory', 'bot:automate', 'bot:analytics'],
  },
  {
    id: 4, label: 'Publisher', icon: Rocket, color: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/20',
    desc: 'Full bot suite + Jackie + web search + code engine.',
    scopes: ['markets:read', 'portfolio:read', 'bot:chat', 'bot:create', 'bot:memory', 'bot:automate', 'bot:squad', 'bot:websearch', 'bot:code', 'bot:analytics', 'messages:read', 'jackie:read', 'jackie:write'],
    botScopes: ['bot:chat', 'bot:create', 'bot:memory', 'bot:automate', 'bot:squad', 'bot:websearch', 'bot:code', 'bot:analytics'],
  },
  {
    id: 5, label: 'Automator', icon: Crown, color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20',
    desc: 'Every capability unlocked. Full autonomous bot control.',
    scopes: BOT_CAPABILITIES.map(c => c.id),
    botScopes: BOT_CAPABILITIES.filter(c => c.id.startsWith('bot:')).map(c => c.id),
  },
];

const generateRawKey = () => {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `sk_live_${Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')}`;
};

const hashKey = async (raw) => {
  const enc = new TextEncoder().encode(raw);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
};

const timeAgo = (ts) => {
  if (!ts) return 'Never';
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

function ScopeTag({ scope }) {
  const cap = BOT_CAPABILITIES.find(c => c.id === scope);
  const Icon = cap?.icon || Key;
  const color = cap?.color || 'text-muted-foreground';
  const isBotScope = scope.startsWith('bot:');
  return (
    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-medium font-mono ${isBotScope ? 'bg-primary/10 border border-primary/20 text-primary' : 'bg-secondary border border-border ' + color}`}>
      <Icon className="w-2.5 h-2.5" /> {scope}
    </span>
  );
}

function KeyCard({ k, bots, onRevoke, onDelete, onRefresh, revoking }) {
  const [expanded, setExpanded] = useState(false);
  const tier = TIERS.slice().reverse().find(t => t.scopes.every(s => k.permissions?.includes(s)));
  const TierIcon = tier?.icon || Key;
  const botScopes = (k.permissions || []).filter(p => p.startsWith('bot:'));
  const linkedBot = bots.find(b => b.id === k.bot_id);

  return (
    <div className={`bg-card border rounded-2xl overflow-hidden transition-all ${k.status === 'revoked' ? 'opacity-40 border-border/50' : 'border-border hover:border-primary/20'}`}>
      <div className="px-4 py-3 flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${tier?.bg || 'bg-secondary'} border ${tier?.border || 'border-border'}`}>
          <TierIcon className={`w-4 h-4 ${tier?.color || 'text-muted-foreground'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-bold text-sm truncate">{k.name}</p>
            {tier && <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${tier.bg} ${tier.color} border ${tier.border} flex-shrink-0`}>T{tier.id} · {tier.label}</span>}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <code className="text-[9px] text-muted-foreground font-mono">{k.key_prefix}</code>
            {linkedBot && (
              <span className="text-[9px] text-primary flex items-center gap-0.5"><Bot className="w-2.5 h-2.5" />{linkedBot.name}</span>
            )}
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ml-auto ${k.status === 'active' ? 'bg-green-400/10 text-green-400' : 'bg-red-400/10 text-red-400'}`}>
              {k.status}
            </span>
          </div>
        </div>
        <button onClick={() => setExpanded(e => !e)} className="p-1 text-muted-foreground">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-border px-4 py-3 space-y-3">
          {/* Bot capabilities highlight */}
          {botScopes.length > 0 && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-2.5">
              <p className="text-[9px] font-bold text-primary mb-1.5 uppercase tracking-wider flex items-center gap-1"><Bot className="w-3 h-3" /> Bot Capabilities</p>
              <div className="flex flex-wrap gap-1">
                {botScopes.map(s => {
                  const cap = BOT_CAPABILITIES.find(c => c.id === s);
                  const Icon = cap?.icon || Bot;
                  return (
                    <span key={s} className="flex items-center gap-0.5 px-2 py-0.5 rounded-lg bg-primary/10 border border-primary/20 text-[9px] font-medium text-primary">
                      <Icon className="w-2.5 h-2.5" /> {cap?.label || s}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* All scopes */}
          <div>
            <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider mb-1.5">All Permissions</p>
            <div className="flex flex-wrap gap-1">
              {(k.permissions || []).map(s => <ScopeTag key={s} scope={s} />)}
            </div>
          </div>

          {/* Usage info */}
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="bg-secondary rounded-lg p-2">
              <p className="text-muted-foreground">Last Used</p>
              <p className="font-medium">{timeAgo(k.last_used_at)}</p>
            </div>
            <div className="bg-secondary rounded-lg p-2">
              <p className="text-muted-foreground">Created</p>
              <p className="font-medium">{new Date(k.created_date).toLocaleDateString()}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            {k.status === 'active' && (
              <button onClick={() => onRevoke(k)} disabled={revoking === k.id}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 rounded-xl text-xs font-medium">
                <Lock className="w-3 h-3" /> {revoking === k.id ? 'Revoking…' : 'Revoke'}
              </button>
            )}
            {k.status === 'revoked' && (
              <button onClick={() => onRefresh(k)}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-green-400/10 text-green-400 border border-green-400/20 rounded-xl text-xs font-medium">
                <Unlock className="w-3 h-3" /> Reactivate
              </button>
            )}
            <button onClick={() => onDelete(k.id)}
              className="flex items-center gap-1 px-3 py-1.5 bg-destructive/10 text-destructive border border-destructive/20 rounded-xl text-xs font-medium">
              <Trash2 className="w-3 h-3" /> Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function APIKeys() {
  const [keys, setKeys] = useState([]);
  const [bots, setBots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('keys');
  const [showCreate, setShowCreate] = useState(false);
  const [revoking, setRevoking] = useState(null);
  const [newKeyRaw, setNewKeyRaw] = useState(null);
  const [copied, setCopied] = useState(false);

  // Create form state
  const [form, setForm] = useState({ name: '', selectedTier: null, botId: '', customScopes: [], useCustom: false });

  const load = async () => {
    setLoading(true);
    const [k, b] = await Promise.all([
      base44.entities.ApiKey.list('-created_date', 50),
      base44.entities.UserBot.filter({ status: 'active' }, '-created_date', 50),
    ]);
    setKeys(k);
    setBots(b);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const getEffectiveScopes = () => {
    if (form.useCustom) return form.customScopes;
    if (form.selectedTier) return TIERS.find(t => t.id === form.selectedTier)?.scopes || [];
    return [];
  };

  const createKey = async () => {
    const scopes = getEffectiveScopes();
    if (!form.name.trim() || scopes.length === 0) return;
    const raw = generateRawKey();
    const hashed = await hashKey(raw);
    await base44.entities.ApiKey.create({
      name: form.name.trim(),
      hashed_key: hashed,
      key_prefix: raw.slice(0, 15) + '...',
      permissions: scopes,
      status: 'active',
      bot_id: form.botId || null,
    });
    setNewKeyRaw(raw);
    setForm({ name: '', selectedTier: null, botId: '', customScopes: [], useCustom: false });
    setShowCreate(false);
    load();
  };

  const revokeKey = async (k) => {
    setRevoking(k.id);
    await base44.entities.ApiKey.update(k.id, { status: 'revoked' });
    setRevoking(null);
    load();
  };

  const reactivateKey = async (k) => {
    await base44.entities.ApiKey.update(k.id, { status: 'active' });
    load();
  };

  const deleteKey = async (id) => {
    await base44.entities.ApiKey.delete(id);
    load();
  };

  const copy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleCustomScope = (scope) => {
    setForm(f => ({
      ...f,
      customScopes: f.customScopes.includes(scope)
        ? f.customScopes.filter(s => s !== scope)
        : [...f.customScopes, scope]
    }));
  };

  const activeKeys = keys.filter(k => k.status === 'active');
  const revokedKeys = keys.filter(k => k.status === 'revoked');
  const botLinkedKeys = keys.filter(k => k.bot_id);

  // Summary stats
  const botCapableKeys = keys.filter(k => (k.permissions || []).some(p => p.startsWith('bot:')));

  return (
    <div className="flex flex-col min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold flex items-center gap-2">
              <Key className="w-4 h-4 text-primary" /> API Keys
              <span className="text-[10px] font-medium px-2 py-0.5 bg-primary/10 text-primary rounded-full border border-primary/20">Bot-Integrated</span>
            </h2>
            <p className="text-[10px] text-muted-foreground mt-0.5">Tiered access with full bot capability control</p>
          </div>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 bg-primary text-primary-foreground rounded-xl px-3 py-2 text-xs font-semibold">
            <Plus className="w-3.5 h-3.5" /> New Key
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-0 border-b border-border">
        {[
          { label: 'Total', val: keys.length, color: 'text-foreground' },
          { label: 'Active', val: activeKeys.length, color: 'text-green-400' },
          { label: 'Bot-Linked', val: botLinkedKeys.length, color: 'text-primary' },
          { label: 'Bot-Capable', val: botCapableKeys.length, color: 'text-purple-400' },
        ].map(({ label, val, color }) => (
          <div key={label} className="text-center py-2.5 border-r border-border last:border-r-0">
            <p className={`text-base font-bold ${color}`}>{val}</p>
            <p className="text-[9px] text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {[
          { id: 'keys', label: 'My Keys', icon: Key },
          { id: 'tiers', label: 'Tiers & Scopes', icon: Shield },
          { id: 'bot-bridge', label: 'Bot Bridge', icon: Bot },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-medium transition-colors ${activeTab === t.id ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}>
            <t.icon className="w-3 h-3" />{t.label}
          </button>
        ))}
      </div>

      {/* New Key Banner */}
      {newKeyRaw && (
        <div className="mx-4 mt-4 bg-primary/10 border border-primary/30 rounded-2xl p-4 space-y-2">
          <p className="text-xs font-bold text-primary flex items-center gap-2"><Shield className="w-3.5 h-3.5" /> Copy your key — shown ONCE only</p>
          <div className="flex items-center gap-2 bg-secondary border border-border rounded-xl px-3 py-2">
            <code className="flex-1 text-[10px] text-primary font-mono break-all">{newKeyRaw}</code>
            <button onClick={() => copy(newKeyRaw)} className="flex-shrink-0 bg-primary text-primary-foreground rounded-lg p-1.5">
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <button onClick={() => setNewKeyRaw(null)} className="w-full text-[10px] text-muted-foreground">I've saved my key — dismiss</button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">

        {/* ─── KEYS TAB ─────────────────────────────────────────────────────── */}
        {activeTab === 'keys' && (
          <>
            <div className="flex items-start gap-2 bg-yellow-400/5 border border-yellow-400/20 rounded-xl px-3 py-2">
              <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-yellow-400">Keys are SHA-256 hashed. Raw key shown only once at creation. Bot-scoped keys give external apps direct AI agent control.</p>
            </div>

            {loading ? (
              <div className="flex justify-center py-10"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
            ) : keys.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <div className="w-14 h-14 mx-auto rounded-full bg-secondary flex items-center justify-center">
                  <Key className="w-7 h-7 text-muted-foreground/30" />
                </div>
                <p className="text-sm text-muted-foreground">No API keys yet</p>
                <button onClick={() => setShowCreate(true)} className="bg-primary text-primary-foreground rounded-xl px-4 py-2 text-sm font-semibold">
                  Create your first key
                </button>
              </div>
            ) : (
              <>
                {activeKeys.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Active ({activeKeys.length})</p>
                    {activeKeys.map(k => <KeyCard key={k.id} k={k} bots={bots} onRevoke={revokeKey} onDelete={deleteKey} onRefresh={reactivateKey} revoking={revoking} />)}
                  </div>
                )}
                {revokedKeys.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Revoked ({revokedKeys.length})</p>
                    {revokedKeys.map(k => <KeyCard key={k.id} k={k} bots={bots} onRevoke={revokeKey} onDelete={deleteKey} onRefresh={reactivateKey} revoking={revoking} />)}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ─── TIERS TAB ────────────────────────────────────────────────────── */}
        {activeTab === 'tiers' && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Each tier builds on the previous and unlocks more bot capabilities. Bot-scoped permissions are highlighted in green.</p>
            {TIERS.map(tier => {
              const Icon = tier.icon;
              const botScopes = tier.scopes.filter(s => s.startsWith('bot:'));
              const otherScopes = tier.scopes.filter(s => !s.startsWith('bot:'));
              return (
                <div key={tier.id} className={`rounded-2xl border p-4 space-y-3 ${tier.bg} ${tier.border}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl ${tier.bg} border ${tier.border} flex items-center justify-center`}>
                      <Icon className={`w-4 h-4 ${tier.color}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-bold ${tier.color}`}>Tier {tier.id} — {tier.label}</p>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${tier.bg} ${tier.color} border ${tier.border}`}>{tier.scopes.length} scopes</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{tier.desc}</p>
                    </div>
                  </div>
                  {botScopes.length > 0 && (
                    <div>
                      <p className="text-[9px] font-bold text-primary mb-1.5 uppercase tracking-wider flex items-center gap-1"><Bot className="w-3 h-3" /> Bot Capabilities</p>
                      <div className="flex flex-wrap gap-1">
                        {botScopes.map(s => {
                          const cap = BOT_CAPABILITIES.find(c => c.id === s);
                          const Icon = cap?.icon || Bot;
                          return (
                            <div key={s} className="flex items-center gap-0.5 px-2 py-0.5 rounded-lg bg-primary/15 border border-primary/20 text-[9px] font-medium text-primary">
                              <Icon className="w-2.5 h-2.5" /> {cap?.label || s}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {otherScopes.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {otherScopes.map(s => <ScopeTag key={s} scope={s} />)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ─── BOT BRIDGE TAB ───────────────────────────────────────────────── */}
        {activeTab === 'bot-bridge' && (
          <div className="space-y-4">
            <div className="bg-blue-400/5 border border-blue-400/20 rounded-2xl p-4">
              <p className="text-xs font-bold text-blue-400 mb-2 flex items-center gap-2"><Network className="w-3.5 h-3.5" /> API Key → Bot Bridge</p>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Link API keys directly to specific bots. A linked key grants external apps permission to invoke that bot's capabilities — chat, memory, automations, pipelines — via API. The bot uses its own instructions and XP system when called through the key.
              </p>
            </div>

            {/* Capability reference */}
            <div className="space-y-2">
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">All Bot Capabilities Reference</p>
              {BOT_CAPABILITIES.filter(c => c.id.startsWith('bot:')).map(cap => {
                const Icon = cap.icon;
                const keysWithCap = keys.filter(k => k.status === 'active' && (k.permissions || []).includes(cap.id));
                return (
                  <div key={cap.id} className="bg-card border border-border rounded-xl px-3 py-2.5 flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                      <Icon className={`w-3.5 h-3.5 ${cap.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold">{cap.label}</p>
                      <p className="text-[9px] text-muted-foreground">{cap.desc}</p>
                    </div>
                    <div className="flex-shrink-0">
                      {keysWithCap.length > 0 ? (
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-green-400/10 text-green-400 border border-green-400/20 font-medium">{keysWithCap.length} key{keysWithCap.length !== 1 ? 's' : ''}</span>
                      ) : (
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">no keys</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bot → Key map */}
            {bots.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Bot → Key Bindings</p>
                {bots.map(bot => {
                  const linkedKeys = keys.filter(k => k.bot_id === bot.id && k.status === 'active');
                  return (
                    <div key={bot.id} className="bg-card border border-border rounded-xl px-3 py-2.5 flex items-center gap-3">
                      <span className="text-lg">🤖</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold">{bot.name}</p>
                        <p className="text-[9px] text-muted-foreground capitalize">{bot.role} · Lv{bot.level || 1}</p>
                      </div>
                      {linkedKeys.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {linkedKeys.map(k => (
                            <span key={k.id} className="text-[9px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-mono">{k.key_prefix}</span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[9px] text-muted-foreground">No keys linked</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Usage guide */}
            <div className="bg-card border border-border rounded-2xl p-4 space-y-2">
              <p className="text-xs font-semibold flex items-center gap-2"><Code className="w-3.5 h-3.5 text-primary" /> API Usage Reference</p>
              <div className="bg-secondary rounded-xl p-3 font-mono text-[9px] text-foreground/80 space-y-1.5 leading-relaxed">
                <p className="text-muted-foreground"># Chat with a bot via API key</p>
                <p>POST /api/bot/chat</p>
                <p className="text-primary">Authorization: Bearer sk_live_...</p>
                <p>{'{'} "bot_id": "...", "message": "..." {'}'}</p>
                <br/>
                <p className="text-muted-foreground"># Trigger an automation</p>
                <p>POST /api/bot/automate</p>
                <p className="text-primary">Authorization: Bearer sk_live_...</p>
                <p>{'{'} "automation_id": "...", "payload": {'{'}{'}'}  {'}'}</p>
                <br/>
                <p className="text-muted-foreground"># Run a squad pipeline</p>
                <p>POST /api/bot/squad</p>
                <p className="text-primary">Authorization: Bearer sk_live_...</p>
                <p>{'{'} "pipeline_id": "...", "input": "..." {'}'}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── CREATE MODAL ─────────────────────────────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end" onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-md mx-auto bg-card rounded-t-2xl border-t border-border max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
              <p className="font-bold text-sm flex items-center gap-2"><Key className="w-4 h-4 text-primary" /> Create API Key</p>
              <button onClick={() => setShowCreate(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Key Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Trader Bot Production, Squad Runner…"
                  className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary/50" />
              </div>

              {/* Link to a bot */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Link to Bot (optional)</label>
                <p className="text-[10px] text-muted-foreground">Keys linked to a bot will authenticate as that bot when called externally.</p>
                <select value={form.botId} onChange={e => setForm(f => ({ ...f, botId: e.target.value }))}
                  className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary/50">
                  <option value="">No bot link (general access)</option>
                  {bots.map(b => <option key={b.id} value={b.id}>🤖 {b.name} ({b.role})</option>)}
                </select>
              </div>

              {/* Tier OR Custom */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-muted-foreground">Permissions</label>
                  <button onClick={() => setForm(f => ({ ...f, useCustom: !f.useCustom, selectedTier: null, customScopes: [] }))}
                    className="text-[10px] text-primary underline">{form.useCustom ? 'Use tier preset' : 'Custom scopes'}</button>
                </div>

                {!form.useCustom ? (
                  <div className="space-y-2">
                    {TIERS.map(tier => {
                      const Icon = tier.icon;
                      const sel = form.selectedTier === tier.id;
                      return (
                        <button key={tier.id} onClick={() => setForm(f => ({ ...f, selectedTier: tier.id }))}
                          className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${sel ? `${tier.bg} ${tier.border}` : 'border-border bg-secondary/40'}`}>
                          <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${sel ? tier.color : 'text-muted-foreground'}`} />
                          <div className="flex-1">
                            <p className={`text-xs font-bold ${sel ? tier.color : 'text-foreground'}`}>T{tier.id} — {tier.label}</p>
                            <p className="text-[9px] text-muted-foreground mt-0.5">{tier.desc}</p>
                            {sel && tier.scopes.filter(s => s.startsWith('bot:')).length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {tier.scopes.filter(s => s.startsWith('bot:')).map(s => {
                                  const cap = BOT_CAPABILITIES.find(c => c.id === s);
                                  const CI = cap?.icon || Bot;
                                  return <span key={s} className="flex items-center gap-0.5 text-[8px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-full font-medium"><CI className="w-2 h-2" />{cap?.label}</span>;
                                })}
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <p className="text-[10px] text-muted-foreground">Select individual capabilities:</p>
                    {BOT_CAPABILITIES.map(cap => {
                      const Icon = cap.icon;
                      const sel = form.customScopes.includes(cap.id);
                      return (
                        <button key={cap.id} onClick={() => toggleCustomScope(cap.id)}
                          className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl border text-left transition-all ${sel ? 'border-primary bg-primary/5' : 'border-border bg-secondary/40'}`}>
                          <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${cap.color}`} />
                          <div className="flex-1">
                            <p className="text-xs font-medium">{cap.label}</p>
                            <p className="text-[9px] text-muted-foreground">{cap.desc}</p>
                          </div>
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${sel ? 'bg-primary border-primary' : 'border-border'}`}>
                            {sel && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="px-4 py-3 border-t border-border flex-shrink-0">
              <button onClick={createKey} disabled={!form.name.trim() || getEffectiveScopes().length === 0}
                className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-bold text-sm disabled:opacity-40 flex items-center justify-center gap-2">
                <Key className="w-4 h-4" /> Generate Secure Key ({getEffectiveScopes().length} permissions)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}