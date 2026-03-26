import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { streamChat, type ChatMessage } from "@/lib/jackie-stream";
import {
  listConversations,
  createConversation,
  deleteConversation,
  getMessages,
  saveMessage,
  generateTitle,
  updateConversationTitle,
  type Conversation,
} from "@/lib/jackie-db";
import { detectSecurityFlag, detectMemoryTier } from "@/lib/jackie-security";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Plus, Trash2, MessageSquare, LogOut, Send, Menu, X } from "lucide-react";

interface DisplayMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  memoryTier?: 1 | 2 | 3;
  securityFlag?: string | null;
}

// ─── Sidebar ───────────────────────────────────────────────

const Sidebar = ({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  onSignOut,
  userEmail,
  coreFiles,
}: {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onSignOut: () => void;
  userEmail: string;
  coreFiles: string[];
}) => (
  <aside className="hidden md:flex w-[280px] min-h-screen border-r border-border bg-sidebar flex-col">
    <div className="p-4 border-b border-border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono text-lg font-bold text-primary tracking-wider">J</span>
          <span className="font-mono text-xs uppercase tracking-widest text-sidebar-foreground">
            Jackie
          </span>
        </div>
        <button
          onClick={onNew}
          className="p-1.5 rounded-sm text-muted-foreground hover:text-foreground hover:bg-secondary btn-mechanical transition-colors duration-150"
          title="New conversation"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>

    <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
      <div className="px-2 py-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        Conversations
      </div>
      {conversations.length === 0 && (
        <div className="px-2 py-2 text-xs text-muted-foreground">No conversations yet.</div>
      )}
      {conversations.map((conv) => (
        <div
          key={conv.id}
          className={`group flex items-center gap-1 rounded-sm transition-colors duration-150 ${
            activeId === conv.id
              ? "bg-secondary text-foreground"
              : "text-sidebar-foreground hover:bg-secondary/50"
          }`}
        >
          <button
            onClick={() => onSelect(conv.id)}
            className="flex-1 text-left px-2 py-1.5 font-mono text-xs truncate btn-mechanical flex items-center gap-2"
          >
            <MessageSquare size={12} className="flex-shrink-0 text-muted-foreground" />
            {conv.title}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(conv.id);
            }}
            className="opacity-0 group-hover:opacity-100 p-1 mr-1 text-muted-foreground hover:text-destructive transition-opacity duration-150"
          >
            <Trash2 size={12} />
          </button>
        </div>
      ))}
    </div>

    <div className="p-2 border-t border-border space-y-0.5">
      <div className="px-2 py-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        Core
      </div>
      {coreFiles.map((file) => (
        <div key={file} className="px-2 py-1 font-mono text-[11px] text-muted-foreground truncate">
          {file}
        </div>
      ))}
    </div>

    <div className="p-4 border-t border-border space-y-2">
      <div className="font-mono text-[10px] text-muted-foreground truncate" title={userEmail}>
        {userEmail}
      </div>
      <button
        onClick={onSignOut}
        className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:text-destructive transition-colors"
      >
        <LogOut size={10} />
        Sign Out
      </button>
    </div>
  </aside>
);

// ─── Memory Dots ───────────────────────────────────────────

const MemoryDots = ({ tier }: { tier: 1 | 2 | 3 }) => (
  <div className="flex gap-1 items-center" title={`Memory tier: ${["Ephemeral", "Durable", "Gold"][tier - 1]}`}>
    {[1, 2, 3].map((i) => (
      <span key={i} className={`memory-dot ${i <= tier ? "active" : ""}`} />
    ))}
  </div>
);

// ─── Messages ──────────────────────────────────────────────

const JackieMessage = ({ message }: { message: DisplayMessage }) => (
  <div className="space-y-3 stagger-enter">
    <div className="flex items-center justify-between">
      <span className="jackie-badge">Jackie here—</span>
      {message.memoryTier && <MemoryDots tier={message.memoryTier} />}
    </div>

    {message.securityFlag && (
      <div className="jackie-security-flag">
        <div className="font-mono text-xs font-semibold uppercase tracking-wider mb-1">
          ⚠ {message.securityFlag}
        </div>
      </div>
    )}

    <div className="text-foreground leading-relaxed prose prose-invert prose-sm max-w-none">
      <ReactMarkdown>{message.content}</ReactMarkdown>
    </div>

    <div className="font-mono text-[10px] text-muted-foreground">
      {message.timestamp.toLocaleTimeString("en-US", { hour12: false })}
    </div>
  </div>
);

const UserMessage = ({ message }: { message: DisplayMessage }) => (
  <div className="space-y-2">
    <div className="text-muted-foreground leading-relaxed text-sm whitespace-pre-wrap">
      {message.content}
    </div>
    <div className="font-mono text-[10px] text-muted-foreground/50">
      {message.timestamp.toLocaleTimeString("en-US", { hour12: false })}
    </div>
  </div>
);

// ─── Main Page ─────────────────────────────────────────────

const CORE_FILES = [
  "CORE_IDENTITY.md",
  "BEHAVIOR_RULES.md",
  "MEMORY_MODEL.md",
  "SECURITY_PRINCIPLES.md",
  "ARCHITECTURE.md",
  "ROADMAP.md",
];

const Index = () => {
  const { user, signOut } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadConversations();
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + "px";
    }
  }, [input]);

  const loadConversations = async () => {
    try {
      const convs = await listConversations();
      setConversations(convs);
    } catch (e) {
      console.error("Failed to load conversations:", e);
    }
  };

  const loadMessages = useCallback(async (convId: string) => {
    try {
      const msgs = await getMessages(convId);
      const display: DisplayMessage[] = msgs.map((m) => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: m.content,
        timestamp: new Date(m.created_at),
        memoryTier: (m.memory_tier as 1 | 2 | 3) ?? 1,
        securityFlag: m.security_flag,
      }));
      setMessages(display);
      setChatHistory(
        msgs.map((m) => ({ role: m.role as "user" | "assistant", content: m.content }))
      );
    } catch (e) {
      console.error("Failed to load messages:", e);
    }
  }, []);

  const selectConversation = useCallback(
    (id: string) => {
      setActiveConvId(id);
      loadMessages(id);
    },
    [loadMessages]
  );

  const startNewConversation = () => {
    setActiveConvId(null);
    setMessages([]);
    setChatHistory([]);
    setInput("");
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      await deleteConversation(id);
      if (activeConvId === id) {
        setActiveConvId(null);
        setMessages([]);
        setChatHistory([]);
      }
      await loadConversations();
    } catch {
      toast.error("Failed to delete conversation.");
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: "smooth" });
    }, 50);
  };

  const handleSubmit = async () => {
    if (!input.trim() || isProcessing) return;

    const userText = input.trim();
    setInput("");
    setIsProcessing(true);

    let convId = activeConvId;
    if (!convId) {
      try {
        const conv = await createConversation(generateTitle(userText));
        convId = conv.id;
        setActiveConvId(convId);
        await loadConversations();
      } catch {
        toast.error("Failed to create conversation.");
        setIsProcessing(false);
        return;
      }
    }

    const userMsg: DisplayMessage = {
      id: Date.now().toString(),
      role: "user",
      content: userText,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    scrollToBottom();

    try {
      await saveMessage({ conversation_id: convId, role: "user", content: userText });
    } catch {
      console.error("Failed to persist user message");
    }

    const newHistory: ChatMessage[] = [...chatHistory, { role: "user", content: userText }];
    setChatHistory(newHistory);

    const assistantTempId = (Date.now() + 1).toString();
    let assistantContent = "";

    setMessages((prev) => [
      ...prev,
      { id: assistantTempId, role: "assistant", content: "", timestamp: new Date(), memoryTier: 1 },
    ]);

    await streamChat({
      messages: newHistory,
      onDelta: (chunk) => {
        assistantContent += chunk;
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantTempId ? { ...m, content: assistantContent } : m))
        );
        scrollToBottom();
      },
      onDone: async () => {
        const securityFlag = detectSecurityFlag(assistantContent);
        const memoryTier = detectMemoryTier(assistantContent, userText);

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantTempId ? { ...m, securityFlag, memoryTier } : m
          )
        );

        setChatHistory((prev) => [...prev, { role: "assistant", content: assistantContent }]);

        try {
          await saveMessage({
            conversation_id: convId!,
            role: "assistant",
            content: assistantContent,
            memory_tier: memoryTier,
            security_flag: securityFlag,
          });

          if (newHistory.length === 1) {
            await updateConversationTitle(convId!, generateTitle(userText));
            await loadConversations();
          }
        } catch {
          console.error("Failed to persist assistant message");
        }

        setIsProcessing(false);
      },
      onError: (err) => {
        toast.error(err);
        setMessages((prev) => prev.filter((m) => m.id !== assistantTempId));
        setIsProcessing(false);
      },
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        conversations={conversations}
        activeId={activeConvId}
        onSelect={selectConversation}
        onNew={startNewConversation}
        onDelete={handleDeleteConversation}
        onSignOut={signOut}
        userEmail={user?.email ?? ""}
        coreFiles={CORE_FILES}
      />

      <main className="flex-1 flex flex-col min-h-screen">
        {isProcessing && (
          <div className="h-[2px] bg-secondary overflow-hidden flex-shrink-0">
            <div className="h-full bg-primary" style={{ animation: "progressSlide 1.5s ease-in-out infinite" }} />
          </div>
        )}

        <div className="flex-1 overflow-y-auto" ref={feedRef}>
          <div className="max-w-[768px] p-4 space-y-6">
            {messages.length === 0 && (
              <div className="flex flex-col items-start justify-center min-h-[60vh] space-y-4">
                <span className="font-mono text-4xl font-bold text-primary">J</span>
                <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                  System_Status: Grounded. Memory: Active.
                </div>
                <p className="text-muted-foreground text-sm max-w-md">
                  Jackie is ready. Type a command, ask a question, paste some code, or start building.
                </p>
              </div>
            )}
            {messages.map((msg) =>
              msg.role === "assistant" ? (
                <JackieMessage key={msg.id} message={msg} />
              ) : (
                <UserMessage key={msg.id} message={msg} />
              )
            )}
          </div>
        </div>

        {/* Command input */}
        <div className="border-t border-border p-4 flex-shrink-0">
          <div className="max-w-[768px]">
            <div className="flex items-end gap-2">
              <span className="font-mono text-xs text-muted-foreground select-none pb-3">›</span>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="..."
                className="jackie-input flex-1 resize-none overflow-hidden"
                style={{ minHeight: "44px", maxHeight: "200px" }}
                disabled={isProcessing}
                rows={1}
              />
              <button
                onClick={handleSubmit}
                disabled={isProcessing || !input.trim()}
                className="p-3 rounded-sm bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-30 transition-opacity btn-mechanical flex-shrink-0"
                title="Send (Enter)"
              >
                <Send size={16} />
              </button>
            </div>
            <div className="font-mono text-[10px] text-muted-foreground mt-1.5 ml-5">
              Enter to send · Shift+Enter for new line
            </div>
          </div>
        </div>
      </main>

      <style>{`
        @keyframes progressSlide {
          0% { width: 0%; margin-left: 0%; }
          50% { width: 60%; margin-left: 20%; }
          100% { width: 0%; margin-left: 100%; }
        }
        .prose pre { background: hsl(220 15% 8%); border: 1px solid hsl(220 15% 15%); border-radius: 2px; }
        .prose code { font-family: var(--font-mono); font-size: 13px; }
        .prose p code { background: hsl(220 15% 12%); padding: 2px 6px; border-radius: 2px; }
        .prose a { color: hsl(150 100% 50%); }
        .prose strong { color: hsl(220 10% 95%); }
        .prose h1, .prose h2, .prose h3 { font-family: var(--font-mono); text-transform: uppercase; letter-spacing: 0.05em; color: hsl(220 10% 90%); }
        .prose ul, .prose ol { color: hsl(220 10% 80%); }
      `}</style>
    </div>
  );
};

export default Index;
