import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import {
  Bot, Sparkles, Code, Download, Copy, ArrowLeft, Check, Loader2,
  Save, Wand2, RefreshCw, ChevronDown,
} from "lucide-react";

type Plan = {
  name: string;
  purpose: string;
  platform: string;
  behaviorStyle: string;
  language: string;
  logicModules: string[];
  rationale?: string;
};

const EXAMPLES = [
  "Telegram bot that converts YouTube links to MP3 and tracks usage",
  "Discord moderation bot with auto-replies and scheduled announcements",
  "Web API that scrapes product prices from 3 stores and returns JSON",
  "Auth-guarded REST API that proxies OpenAI with per-key rate limits",
];

export default function BotFoundry() {
  const { user } = useAuth();
  const [description, setDescription] = useState("");
  const [generating, setGenerating] = useState(false);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [code, setCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [showCode, setShowCode] = useState(true);
  const codeRef = useRef<HTMLDivElement>(null);

  const generate = useCallback(async () => {
    if (!description.trim()) { toast.error("Describe your bot first"); return; }
    if (!user) { toast.error("Sign in required"); return; }
    setGenerating(true);
    setCode("");
    setPlan(null);
    setSavedId(null);
    try {
      const { data, error } = await supabase.functions.invoke("bot-generate", {
        body: { description: description.trim() },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setPlan(data.plan);
      setCode(data.code || "");
      toast.success("Bot generated");
    } catch (e: any) {
      toast.error(e.message || "Generation failed");
    } finally {
      setGenerating(false);
    }
  }, [description, user]);

  // Auto-save on successful generation
  useEffect(() => {
    if (!code || !plan || !user || savedId) return;
    (async () => {
      setSaving(true);
      try {
        const { data, error } = await supabase.from("user_bots" as any).insert({
          user_id: user.id,
          name: plan.name,
          purpose: plan.purpose,
          platform: plan.platform,
          behavior_style: plan.behaviorStyle,
          language: plan.language,
          logic_modules: plan.logicModules,
          generated_code: code,
          status: "generated",
        } as any).select("id").single();
        if (error) throw error;
        setSavedId((data as any)?.id ?? "saved");
      } catch (e: any) {
        console.error("auto-save failed", e);
      } finally {
        setSaving(false);
      }
    })();
  }, [code, plan, user, savedId]);

  // Scroll to result when code arrives
  useEffect(() => {
    if (code && codeRef.current) {
      codeRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [code]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Copied");
    } catch { toast.error("Copy failed"); }
  };

  const download = () => {
    if (!plan) return;
    const ext = plan.language === "nodejs" ? "ts" : "py";
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${plan.name.replace(/\s+/g, "-").toLowerCase()}-bot.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-md px-4 py-3 flex items-center gap-3">
        <a href="/" className="p-2 rounded-md hover:bg-secondary transition-colors">
          <ArrowLeft size={16} className="text-muted-foreground" />
        </a>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Bot size={20} className="text-primary" />
            <Sparkles size={10} className="absolute -top-1 -right-1 text-primary animate-pulse" />
          </div>
          <h1 className="font-mono text-sm font-bold tracking-wide">Bot Foundry</h1>
          <span className="px-1.5 py-0.5 rounded-sm bg-primary/15 text-primary font-mono text-[9px] tracking-widest">
            AUTO
          </span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">

          {/* Hero */}
          <div className="text-center space-y-2 pt-4">
            <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight">
              Describe a bot. <span className="text-primary">Get a bot.</span>
            </h2>
            <p className="text-sm text-muted-foreground max-w-xl mx-auto">
              One prompt. AI infers the platform, language, and modules — and ships production-ready code.
            </p>
          </div>

          {/* Prompt card */}
          <div className="rounded-xl border border-border bg-gradient-to-b from-secondary/40 to-secondary/10 p-1 shadow-lg shadow-primary/5">
            <div className="rounded-[10px] bg-background/60 backdrop-blur-sm">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A Telegram bot that converts YouTube links to MP3 and remembers user history..."
                rows={4}
                maxLength={1000}
                disabled={generating}
                className="w-full px-4 py-4 bg-transparent font-mono text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none resize-none rounded-t-[10px]"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) generate();
                }}
              />
              <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-border/50">
                <span className="font-mono text-[10px] text-muted-foreground">
                  ⌘/Ctrl + Enter
                </span>
                <button
                  onClick={generate}
                  disabled={generating || !description.trim()}
                  className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground font-mono text-xs font-bold hover:bg-primary/90 disabled:opacity-40 transition-all hover:shadow-md hover:shadow-primary/30"
                >
                  {generating ? (
                    <><Loader2 size={14} className="animate-spin" /> Building...</>
                  ) : (
                    <><Wand2 size={14} /> Generate</>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Quick examples */}
          {!code && !generating && (
            <div className="space-y-2">
              <div className="font-mono text-[10px] tracking-widest text-muted-foreground">TRY ONE</div>
              <div className="grid sm:grid-cols-2 gap-2">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    onClick={() => setDescription(ex)}
                    className="text-left p-3 rounded-md border border-border bg-secondary/20 hover:border-primary/40 hover:bg-secondary/40 font-mono text-[11px] text-muted-foreground hover:text-foreground transition-all"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Generating skeleton */}
          {generating && (
            <div className="space-y-3 animate-pulse">
              <div className="h-20 rounded-md bg-secondary/40" />
              <div className="h-64 rounded-md bg-secondary/30" />
            </div>
          )}

          {/* Plan card */}
          {plan && (
            <div ref={codeRef} className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="font-mono text-[10px] tracking-widest text-primary">AI BLUEPRINT</div>
                  <h3 className="font-display text-lg font-bold mt-0.5">{plan.name}</h3>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-mono">
                  {savedId ? (
                    <span className="flex items-center gap-1 px-2 py-1 rounded-sm bg-primary/15 text-primary">
                      <Check size={10} /> Saved
                    </span>
                  ) : saving ? (
                    <span className="flex items-center gap-1 px-2 py-1 rounded-sm bg-secondary text-muted-foreground">
                      <Loader2 size={10} className="animate-spin" /> Saving
                    </span>
                  ) : null}
                </div>
              </div>
              <p className="font-mono text-xs text-muted-foreground">{plan.purpose}</p>
              <div className="flex flex-wrap gap-1.5">
                <Tag>{plan.platform}</Tag>
                <Tag>{plan.language === "nodejs" ? "Node.js / TS" : "Python"}</Tag>
                <Tag>{plan.behaviorStyle}</Tag>
                {plan.logicModules.map((m) => (
                  <Tag key={m} subtle>{m}</Tag>
                ))}
              </div>
              {plan.rationale && (
                <p className="font-mono text-[11px] text-muted-foreground italic border-l-2 border-primary/40 pl-3">
                  {plan.rationale}
                </p>
              )}
            </div>
          )}

          {/* Code output */}
          {code && (
            <div className="space-y-3 animate-in fade-in duration-500">
              <div className="flex items-center gap-2">
                <Code size={14} className="text-primary" />
                <span className="font-mono text-xs font-bold flex-1">Generated Project</span>
                <button onClick={() => setShowCode((s) => !s)} className="flex items-center gap-1 px-2 py-1 rounded-md bg-secondary text-xs font-mono hover:bg-secondary/80 transition-colors">
                  <ChevronDown size={12} className={`transition-transform ${showCode ? "" : "-rotate-90"}`} /> {showCode ? "Hide" : "Show"}
                </button>
                <button onClick={copy} className="flex items-center gap-1 px-2 py-1 rounded-md bg-secondary text-xs font-mono hover:bg-secondary/80 transition-colors">
                  <Copy size={12} /> Copy
                </button>
                <button onClick={download} className="flex items-center gap-1 px-2 py-1 rounded-md bg-secondary text-xs font-mono hover:bg-secondary/80 transition-colors">
                  <Download size={12} /> Download
                </button>
                <button onClick={generate} className="flex items-center gap-1 px-2 py-1 rounded-md bg-primary/15 text-primary text-xs font-mono hover:bg-primary/25 transition-colors">
                  <RefreshCw size={12} /> Regenerate
                </button>
              </div>
              {showCode && (
                <div className="max-h-[60vh] overflow-auto rounded-md border border-border bg-secondary/20">
                  <div className="p-4">
                    <MarkdownRenderer content={"```\n" + code + "\n```"} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function Tag({ children, subtle = false }: { children: React.ReactNode; subtle?: boolean }) {
  return (
    <span className={`px-2 py-0.5 rounded-sm font-mono text-[10px] tracking-wide ${
      subtle
        ? "bg-secondary text-muted-foreground border border-border"
        : "bg-primary/15 text-primary border border-primary/30"
    }`}>
      {children}
    </span>
  );
}
