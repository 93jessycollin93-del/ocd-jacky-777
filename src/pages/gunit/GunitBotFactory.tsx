import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bot, Copy, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function GunitBotFactory() {
  const [description, setDescription] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    if (!description.trim()) return;
    setLoading(true);
    setCode("");

    try {
      const { data, error } = await supabase.functions.invoke("gunit-bot-gen", {
        body: { description: description.trim() },
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }

      setCode(data.code || "");
      toast.success(`Bot "${data.name}" generated and saved.`);
    } catch (e: any) {
      toast.error(e.message || "Generation failed");
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadCode = () => {
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bot.py";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-2">
        <Bot className="w-4 h-4 text-[#00e5ff]" />
        <h2 className="font-mono text-sm tracking-widest text-[#00e5ff]">BOT FACTORY</h2>
      </div>

      {/* Input */}
      <div className="bg-[#0a0a0f] border border-[#ffffff10] rounded p-4 space-y-3">
        <label className="font-mono text-[10px] tracking-widest text-[#808080]">DESCRIBE YOUR BOT</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="A Telegram bot that converts currencies, tracks crypto prices, and sends daily alerts..."
          className="w-full bg-[#050508] border border-[#ffffff10] rounded p-3 font-mono text-xs text-[#c0c0c0] placeholder:text-[#404040] resize-none h-24 focus:outline-none focus:border-[#00e5ff30]"
        />
        <button
          onClick={generate}
          disabled={loading || !description.trim()}
          className="px-4 py-2 bg-[#00e5ff15] border border-[#00e5ff30] rounded font-mono text-xs text-[#00e5ff] hover:bg-[#00e5ff25] disabled:opacity-30 transition-all flex items-center gap-2"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bot className="w-3.5 h-3.5" />}
          {loading ? "GENERATING..." : "GENERATE BOT"}
        </button>
      </div>

      {/* Output */}
      {code && (
        <div className="bg-[#0a0a0f] border border-[#00ff8820] rounded">
          <div className="flex items-center justify-between px-4 py-2 border-b border-[#ffffff08]">
            <span className="font-mono text-[10px] tracking-widest text-[#00ff88]">GENERATED CODE</span>
            <div className="flex gap-2">
              <button onClick={copyCode} className="px-2 py-1 bg-[#ffffff06] rounded font-mono text-[10px] text-[#808080] hover:text-[#00ff88] transition-colors flex items-center gap-1">
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? "COPIED" : "COPY"}
              </button>
              <button onClick={downloadCode} className="px-2 py-1 bg-[#ffffff06] rounded font-mono text-[10px] text-[#808080] hover:text-[#00e5ff] transition-colors">
                DOWNLOAD
              </button>
            </div>
          </div>
          <pre className="p-4 overflow-x-auto max-h-[500px] overflow-y-auto">
            <code className="font-mono text-xs text-[#c0c0c0] whitespace-pre-wrap">{code}</code>
          </pre>
        </div>
      )}
    </div>
  );
}
