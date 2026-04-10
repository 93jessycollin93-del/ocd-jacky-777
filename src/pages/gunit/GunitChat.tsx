import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { MessageSquare, Send, Loader2 } from "lucide-react";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";

interface Message {
  id?: string;
  role: "user" | "assistant";
  content: string;
  created_at?: string;
}

export default function GunitChat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("gunit_memory")
      .select("id, role, content, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(50)
      .then(({ data }) => {
        if (data) setMessages(data as Message[]);
      });
  }, [user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setLoading(true);

    const userMsg: Message = { role: "user", content: text, created_at: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);

    let assistantContent = "";
    setMessages((prev) => [...prev, { role: "assistant", content: "", created_at: new Date().toISOString() }]);

    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gunit-chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ message: text }),
        }
      );

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Request failed" }));
        throw new Error(err.error || `Error ${resp.status}`);
      }

      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let nl: number;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, nl).trim();
          buffer = buffer.slice(nl + 1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6);
          if (json === "[DONE]") break;
          try {
            const parsed = JSON.parse(json);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages((prev) => {
                const copy = [...prev];
                copy[copy.length - 1] = { ...copy[copy.length - 1], content: assistantContent };
                return copy;
              });
            }
          } catch {}
        }
      }
    } catch (e: any) {
      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = { ...copy[copy.length - 1], content: `⚠ ${e.message}` };
        return copy;
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] max-w-4xl">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="w-4 h-4 text-[#00ff88]" />
        <h2 className="font-mono text-sm tracking-widest text-[#00ff88]">MEMORY BRAIN</h2>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-4">
        {messages.length === 0 && (
          <div className="text-center py-12 font-mono text-xs text-[#404040]">
            G-UNIT AWAITING COMMAND...
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] rounded p-3 ${
              msg.role === "user"
                ? "bg-[#00e5ff10] border border-[#00e5ff20]"
                : "bg-[#0a0a0f] border border-[#00ff8815]"
            }`}>
              <div className="flex items-center gap-2 mb-1">
                <span className={`font-mono text-[9px] tracking-widest ${msg.role === "user" ? "text-[#00e5ff60]" : "text-[#00ff8860]"}`}>
                  {msg.role === "user" ? "YOU" : "G-UNIT"}
                </span>
                {msg.created_at && (
                  <span className="font-mono text-[9px] text-[#404040]">
                    {format(new Date(msg.created_at), "HH:mm")}
                  </span>
                )}
              </div>
              <div className="font-mono text-xs text-[#c0c0c0] prose prose-sm prose-invert max-w-none">
                <ReactMarkdown>{msg.content || "..."}</ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 pt-2 border-t border-[#ffffff08]">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
          placeholder="Enter command..."
          className="flex-1 bg-[#0a0a0f] border border-[#ffffff10] rounded px-3 py-2.5 font-mono text-xs text-[#c0c0c0] placeholder:text-[#404040] focus:outline-none focus:border-[#00ff8830]"
        />
        <button
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          className="px-4 bg-[#00ff8815] border border-[#00ff8830] rounded text-[#00ff88] hover:bg-[#00ff8825] disabled:opacity-30 transition-all"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
