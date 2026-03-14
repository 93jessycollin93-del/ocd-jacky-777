import { useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { streamChat, type ChatMessage } from "@/lib/jackie-stream";
import { toast } from "sonner";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  memoryTier?: 1 | 2 | 3;
  securityFlag?: string;
}

const Sidebar = ({
  activeFolder,
  onFolderClick,
}: {
  activeFolder: string;
  onFolderClick: (f: string) => void;
}) => {
  const folders = [
    { name: "chats/", path: "chats" },
    { name: "notes/", path: "notes" },
    { name: "decisions/", path: "decisions" },
    { name: "transcripts/", path: "transcripts" },
  ];

  const coreFiles = [
    "CORE_IDENTITY.md",
    "BEHAVIOR_RULES.md",
    "MEMORY_MODEL.md",
    "SECURITY_PRINCIPLES.md",
    "ARCHITECTURE.md",
    "ROADMAP.md",
  ];

  return (
    <aside className="hidden md:flex w-[280px] min-h-screen border-r border-border bg-sidebar flex-col">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="font-mono text-lg font-bold text-primary tracking-wider">
            J
          </span>
          <span className="font-mono text-xs uppercase tracking-widest text-sidebar-foreground">
            Knowledge Vault
          </span>
        </div>
      </div>

      <div className="p-4 space-y-1">
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
          Knowledge
        </div>
        {folders.map((folder) => (
          <button
            key={folder.path}
            onClick={() => onFolderClick(folder.path)}
            className={`w-full text-left px-2 py-1.5 font-mono text-sm btn-mechanical rounded-sm transition-colors duration-150 ${
              activeFolder === folder.path
                ? "bg-secondary text-foreground"
                : "text-sidebar-foreground hover:bg-secondary/50"
            }`}
          >
            {folder.name}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-1 border-t border-border">
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
          Core
        </div>
        {coreFiles.map((file) => (
          <div
            key={file}
            className="px-2 py-1 font-mono text-xs text-muted-foreground truncate"
          >
            {file}
          </div>
        ))}
      </div>

      <div className="mt-auto p-4 border-t border-border">
        <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          System_Status: Grounded
        </div>
        <div className="font-mono text-[10px] uppercase tracking-wider text-primary mt-1">
          Memory: Active
        </div>
      </div>
    </aside>
  );
};

const MemoryDots = ({ tier }: { tier: 1 | 2 | 3 }) => (
  <div className="flex gap-1 items-center">
    {[1, 2, 3].map((i) => (
      <span
        key={i}
        className={`memory-dot ${i <= tier ? "active" : ""}`}
      />
    ))}
  </div>
);

const JackieMessage = ({ message }: { message: Message }) => (
  <div className="space-y-3 stagger-enter">
    <div className="flex items-center justify-between">
      <span className="jackie-badge">Jackie here—</span>
      {message.memoryTier && <MemoryDots tier={message.memoryTier} />}
    </div>

    {message.securityFlag && (
      <div className="jackie-security-flag">
        <div className="font-mono text-xs font-semibold uppercase tracking-wider mb-1">
          Critical: {message.securityFlag}
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

const UserMessage = ({ message }: { message: Message }) => (
  <div className="space-y-2">
    <div className="text-muted-foreground leading-relaxed text-sm whitespace-pre-wrap">
      {message.content}
    </div>
    <div className="font-mono text-[10px] text-muted-foreground/50">
      {message.timestamp.toLocaleTimeString("en-US", { hour12: false })}
    </div>
  </div>
);

const Index = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [activeFolder, setActiveFolder] = useState("chats");
  const [isProcessing, setIsProcessing] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    setTimeout(() => {
      feedRef.current?.scrollTo({
        top: feedRef.current.scrollHeight,
        behavior: "smooth",
      });
    }, 50);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    const userText = input.trim();
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: userText,
      timestamp: new Date(),
    };

    const newHistory: ChatMessage[] = [
      ...chatHistory,
      { role: "user", content: userText },
    ];

    setMessages((prev) => [...prev, userMsg]);
    setChatHistory(newHistory);
    setInput("");
    setIsProcessing(true);
    scrollToBottom();

    const assistantId = (Date.now() + 1).toString();
    let assistantContent = "";

    // Create placeholder assistant message
    setMessages((prev) => [
      ...prev,
      {
        id: assistantId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
        memoryTier: 1,
      },
    ]);

    await streamChat({
      messages: newHistory,
      onDelta: (chunk) => {
        assistantContent += chunk;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: assistantContent } : m
          )
        );
        scrollToBottom();
      },
      onDone: () => {
        setChatHistory((prev) => [
          ...prev,
          { role: "assistant", content: assistantContent },
        ]);
        setIsProcessing(false);
      },
      onError: (err) => {
        toast.error(err);
        // Remove the empty assistant message
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
        setIsProcessing(false);
      },
    });
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar activeFolder={activeFolder} onFolderClick={setActiveFolder} />

      <main className="flex-1 flex flex-col min-h-screen">
        {/* Processing bar */}
        {isProcessing && (
          <div className="h-[2px] bg-secondary overflow-hidden flex-shrink-0">
            <div
              className="h-full bg-primary"
              style={{
                animation: "progressSlide 1.5s ease-in-out infinite",
              }}
            />
          </div>
        )}

        {/* Feed */}
        <div className="flex-1 overflow-y-auto" ref={feedRef}>
          <div className="max-w-[768px] p-4 space-y-6">
            {messages.length === 0 && (
              <div className="flex flex-col items-start justify-center min-h-[60vh] space-y-4">
                <span className="font-mono text-4xl font-bold text-primary">
                  J
                </span>
                <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                  System_Status: Grounded. Memory: Active.
                </div>
                <p className="text-muted-foreground text-sm max-w-md">
                  Jackie is ready. Type a command, ask a question, paste some
                  code, or start building.
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

        {/* Command line input */}
        <div className="border-t border-border p-4 flex-shrink-0">
          <form onSubmit={handleSubmit} className="max-w-[768px]">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground select-none">
                ›
              </span>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="..."
                className="jackie-input flex-1"
                disabled={isProcessing}
              />
              <span className="font-mono text-xs text-muted-foreground select-none">
                ⏎
              </span>
            </div>
          </form>
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
