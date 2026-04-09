import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import {
  Bot, Zap, Code, Download, Copy, ChevronRight, ChevronLeft,
  Globe, MessageSquare, Cpu, Shield, FileCode, Search,
  Clock, Layers, ArrowLeft, Check, Loader2, Save,
} from "lucide-react";

// ── Types ──
type Platform = "telegram" | "web" | "discord" | "api";
type BehaviorStyle = "assistant" | "aggressive" | "passive" | "scraper" | "converter" | "custom";
type Language = "nodejs" | "python";
type LogicModule = "io-response" | "api-fetcher" | "file-converter" | "scraper" | "auto-reply" | "scheduler" | "auth-guard";

interface BotConfig {
  name: string;
  purpose: string;
  platform: Platform;
  behaviorStyle: BehaviorStyle;
  language: Language;
  logicModules: LogicModule[];
}

const PLATFORMS: { id: Platform; label: string; icon: React.ReactNode; desc: string }[] = [
  { id: "telegram", label: "Telegram", icon: <MessageSquare size={20} />, desc: "Telegram Bot API" },
  { id: "web", label: "Web API", icon: <Globe size={20} />, desc: "REST + WebSocket" },
  { id: "discord", label: "Discord", icon: <Bot size={20} />, desc: "Discord.js / discord.py" },
  { id: "api", label: "API-Only", icon: <Cpu size={20} />, desc: "Standalone REST API" },
];

const BEHAVIORS: { id: BehaviorStyle; label: string; desc: string }[] = [
  { id: "assistant", label: "Assistant", desc: "Helpful and conversational" },
  { id: "aggressive", label: "Aggressive", desc: "Proactive, fast, direct" },
  { id: "passive", label: "Passive", desc: "Waits for commands, minimal" },
  { id: "scraper", label: "Scraper", desc: "Data extraction focused" },
  { id: "converter", label: "Converter", desc: "File/format conversion" },
  { id: "custom", label: "Custom", desc: "Define your own style" },
];

const LOGIC_MODULES: { id: LogicModule; label: string; icon: React.ReactNode; desc: string }[] = [
  { id: "io-response", label: "I/O Response", icon: <MessageSquare size={16} />, desc: "Process inputs → generate outputs" },
  { id: "api-fetcher", label: "API Fetcher", icon: <Globe size={16} />, desc: "Call external APIs dynamically" },
  { id: "file-converter", label: "File Converter", icon: <FileCode size={16} />, desc: "Convert between file formats" },
  { id: "scraper", label: "Web Scraper", icon: <Search size={16} />, desc: "Extract data from websites" },
  { id: "auto-reply", label: "Auto-Reply", icon: <Zap size={16} />, desc: "Trigger-based auto responses" },
  { id: "scheduler", label: "Scheduler", icon: <Clock size={16} />, desc: "Run tasks on a schedule" },
  { id: "auth-guard", label: "Auth Guard", icon: <Shield size={16} />, desc: "API key / token validation" },
];

const STEPS = ["Configure", "Logic", "Generate"];

// ── Main Component ──
export default function BotFoundry() {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [generatedCode, setGeneratedCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<BotConfig>({
    name: "",
    purpose: "",
    platform: "web",
    behaviorStyle: "assistant",
    language: "nodejs",
    logicModules: ["io-response"],
  });

  const updateConfig = useCallback((partial: Partial<BotConfig>) => {
    setConfig((prev) => ({ ...prev, ...partial }));
  }, []);

  const toggleModule = useCallback((id: LogicModule) => {
    setConfig((prev) => ({
      ...prev,
      logicModules: prev.logicModules.includes(id)
        ? prev.logicModules.filter((m) => m !== id)
        : [...prev.logicModules, id],
    }));
  }, []);

  const canProceed = step === 0 ? config.name.trim().length > 0 : true;

  const handleGenerate = async () => {
    if (!user) { toast.error("Sign in required"); return; }
    setGenerating(true);
    setGeneratedCode("");
    try {
      const { data, error } = await supabase.functions.invoke("bot-generate", {
        body: {
          name: config.name,
          purpose: config.purpose,
          platform: config.platform,
          behaviorStyle: config.behaviorStyle,
          logicModules: config.logicModules,
          language: config.language,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setGeneratedCode(data.code || "// No code generated");
      toast.success("Bot code generated!");
    } catch (e: any) {
      toast.error(e.message || "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedCode);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Copy failed");
    }
  };

  const handleDownload = () => {
    const blob = new Blob([generatedCode], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${config.name.replace(/\s+/g, "-").toLowerCase()}-bot.${config.language === "nodejs" ? "ts" : "py"}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("user_bots" as any).insert({
        user_id: user.id,
        name: config.name,
        purpose: config.purpose,
        platform: config.platform,
        behavior_style: config.behaviorStyle,
        language: config.language,
        logic_modules: config.logicModules,
        generated_code: generatedCode,
        status: generatedCode ? "generated" : "draft",
      } as any);
      if (error) throw error;
      toast.success("Bot saved!");
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-4 py-3 flex items-center gap-3">
        <a href="/" className="p-2 rounded-md hover:bg-secondary transition-colors">
          <ArrowLeft size={16} className="text-muted-foreground" />
        </a>
        <Bot size={20} className="text-primary" />
        <h1 className="font-mono text-sm font-bold tracking-wide">Bot Foundry</h1>
        <div className="ml-auto flex items-center gap-1">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-1">
              <button
                onClick={() => i <= step ? setStep(i) : null}
                className={`px-2 py-1 rounded-md font-mono text-[11px] transition-colors ${
                  i === step ? "bg-primary text-primary-foreground" :
                  i < step ? "bg-primary/20 text-primary cursor-pointer" :
                  "bg-secondary text-muted-foreground"
                }`}
              >
                {i < step ? <Check size={10} className="inline mr-1" /> : null}
                {s}
              </button>
              {i < STEPS.length - 1 && <ChevronRight size={12} className="text-muted-foreground" />}
            </div>
          ))}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

          {/* Step 0: Configure */}
          {step === 0 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div>
                <label className="block font-mono text-xs text-muted-foreground mb-1.5">Bot Name *</label>
                <input
                  value={config.name}
                  onChange={(e) => updateConfig({ name: e.target.value })}
                  placeholder="e.g. DataHarvester, MediaBot"
                  maxLength={50}
                  className="w-full px-3 py-2.5 rounded-md border border-border bg-secondary/30 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div>
                <label className="block font-mono text-xs text-muted-foreground mb-1.5">Purpose</label>
                <textarea
                  value={config.purpose}
                  onChange={(e) => updateConfig({ purpose: e.target.value })}
                  placeholder="Describe what this bot should do..."
                  rows={3}
                  maxLength={500}
                  className="w-full px-3 py-2.5 rounded-md border border-border bg-secondary/30 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                />
              </div>

              <div>
                <label className="block font-mono text-xs text-muted-foreground mb-2">Platform</label>
                <div className="grid grid-cols-2 gap-2">
                  {PLATFORMS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => updateConfig({ platform: p.id })}
                      className={`flex items-center gap-3 p-3 rounded-md border transition-all text-left ${
                        config.platform === p.id
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border bg-secondary/20 text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      {p.icon}
                      <div>
                        <div className="font-mono text-xs font-medium">{p.label}</div>
                        <div className="font-mono text-[10px] opacity-70">{p.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-mono text-xs text-muted-foreground mb-2">Behavior Style</label>
                <div className="grid grid-cols-3 gap-2">
                  {BEHAVIORS.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => updateConfig({ behaviorStyle: b.id })}
                      className={`p-2.5 rounded-md border text-center transition-all ${
                        config.behaviorStyle === b.id
                          ? "border-primary bg-primary/10"
                          : "border-border bg-secondary/20 hover:border-primary/40"
                      }`}
                    >
                      <div className="font-mono text-xs font-medium">{b.label}</div>
                      <div className="font-mono text-[9px] text-muted-foreground mt-0.5">{b.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-mono text-xs text-muted-foreground mb-2">Language</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["nodejs", "python"] as Language[]).map((l) => (
                    <button
                      key={l}
                      onClick={() => updateConfig({ language: l })}
                      className={`p-3 rounded-md border text-center transition-all ${
                        config.language === l
                          ? "border-primary bg-primary/10"
                          : "border-border bg-secondary/20 hover:border-primary/40"
                      }`}
                    >
                      <div className="font-mono text-sm font-medium">
                        {l === "nodejs" ? "Node.js (TS)" : "Python"}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Logic Modules */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div>
                <h2 className="font-mono text-sm font-bold mb-1">Logic Modules</h2>
                <p className="font-mono text-xs text-muted-foreground">
                  Toggle the capabilities your bot needs. At least one module is required.
                </p>
              </div>
              <div className="space-y-2">
                {LOGIC_MODULES.map((m) => {
                  const active = config.logicModules.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      onClick={() => toggleModule(m.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-md border transition-all text-left ${
                        active
                          ? "border-primary bg-primary/10"
                          : "border-border bg-secondary/20 hover:border-primary/30"
                      }`}
                    >
                      <div className={`p-2 rounded-md ${active ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"}`}>
                        {m.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-xs font-medium">{m.label}</div>
                        <div className="font-mono text-[10px] text-muted-foreground">{m.desc}</div>
                      </div>
                      <div className={`w-5 h-5 rounded-sm border-2 flex items-center justify-center transition-colors ${
                        active ? "border-primary bg-primary" : "border-muted-foreground/30"
                      }`}>
                        {active && <Check size={12} className="text-primary-foreground" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Generate + Output */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in duration-300">
              {/* Summary */}
              <div className="p-4 rounded-md border border-border bg-secondary/20 space-y-2">
                <h3 className="font-mono text-xs font-bold">Bot Summary</h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[11px]">
                  <span className="text-muted-foreground">Name:</span>
                  <span>{config.name}</span>
                  <span className="text-muted-foreground">Platform:</span>
                  <span className="capitalize">{config.platform}</span>
                  <span className="text-muted-foreground">Style:</span>
                  <span className="capitalize">{config.behaviorStyle}</span>
                  <span className="text-muted-foreground">Language:</span>
                  <span>{config.language === "nodejs" ? "Node.js (TS)" : "Python"}</span>
                  <span className="text-muted-foreground">Modules:</span>
                  <span>{config.logicModules.length} active</span>
                </div>
                {config.purpose && (
                  <div>
                    <span className="font-mono text-[10px] text-muted-foreground">Purpose: </span>
                    <span className="font-mono text-[11px]">{config.purpose}</span>
                  </div>
                )}
              </div>

              {!generatedCode && (
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="w-full py-3 rounded-md bg-primary text-primary-foreground font-mono text-sm font-bold flex items-center justify-center gap-2 hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {generating ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Generating bot code...
                    </>
                  ) : (
                    <>
                      <Zap size={16} />
                      Generate Bot Code
                    </>
                  )}
                </button>
              )}

              {generatedCode && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Code size={14} className="text-primary" />
                    <span className="font-mono text-xs font-bold flex-1">Generated Code</span>
                    <button onClick={handleCopy} className="flex items-center gap-1 px-2 py-1 rounded-md bg-secondary text-xs font-mono hover:bg-secondary/80 transition-colors">
                      <Copy size={12} /> Copy
                    </button>
                    <button onClick={handleDownload} className="flex items-center gap-1 px-2 py-1 rounded-md bg-secondary text-xs font-mono hover:bg-secondary/80 transition-colors">
                      <Download size={12} /> Download
                    </button>
                    <button onClick={handleSave} disabled={saving} className="flex items-center gap-1 px-2 py-1 rounded-md bg-primary/20 text-primary text-xs font-mono hover:bg-primary/30 transition-colors disabled:opacity-50">
                      <Save size={12} /> {saving ? "..." : "Save"}
                    </button>
                  </div>
                  <div className="max-h-[60vh] overflow-auto rounded-md border border-border bg-[hsl(var(--secondary)/0.3)]">
                    <div className="p-4">
                      <MarkdownRenderer content={"```\n" + generatedCode + "\n```"} />
                    </div>
                  </div>
                  <button
                    onClick={() => { setGeneratedCode(""); }}
                    className="w-full py-2 rounded-md border border-border text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                  >
                    Regenerate
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Footer nav */}
      <footer className="border-t border-border px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => setStep(Math.max(0, step - 1))}
          disabled={step === 0}
          className="flex items-center gap-1 px-3 py-2 rounded-md font-mono text-xs text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
        >
          <ChevronLeft size={14} /> Back
        </button>
        {step < 2 ? (
          <button
            onClick={() => setStep(step + 1)}
            disabled={!canProceed}
            className="flex items-center gap-1 px-4 py-2 rounded-md bg-primary text-primary-foreground font-mono text-xs font-medium disabled:opacity-40 hover:bg-primary/90 transition-colors"
          >
            Next <ChevronRight size={14} />
          </button>
        ) : (
          !generatedCode && !generating && (
            <button
              onClick={handleGenerate}
              className="flex items-center gap-1 px-4 py-2 rounded-md bg-primary text-primary-foreground font-mono text-xs font-medium hover:bg-primary/90 transition-colors"
            >
              <Zap size={14} /> Generate
            </button>
          )
        )}
      </footer>
    </div>
  );
}
