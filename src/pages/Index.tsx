import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { streamChat, JACKIE_MODELS, type ChatMessage, type JackieModelId } from "@/lib/jackie-stream";
import {
  listConversations,
  createConversation,
  deleteConversation,
  getMessages,
  saveMessage,
  generateTitle,
  updateConversationTitle,
  updateConversationModel,
  getConversationModel,
  type Conversation,
} from "@/lib/jackie-db";
import {
  uploadAttachment,
  getMessageAttachments,
  type Attachment,
} from "@/lib/jackie-attachments";
import { detectSecurityFlag, detectMemoryTier } from "@/lib/jackie-security";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { voiceManager } from "@/lib/voice-manager";
import { ChatMediaBar, type PendingFile } from "@/components/ChatMediaBar";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { AttachmentDisplay } from "@/components/AttachmentDisplay";
import { toast } from "sonner";
import { Plus, Trash2, MessageSquare, LogOut, Send, Menu, X, Sun, Moon, Volume2, VolumeX, Download, Mic, ChevronDown, Zap, DollarSign, Search, Tag, XCircle } from "lucide-react";
import {
  listTags,
  createTag,
  deleteTag,
  getTagConversationMap,
  addTagToConversation,
  removeTagFromConversation,
  TAG_COLOR_MAP,
  TAG_COLORS,
  type Tag as TagType,
} from "@/lib/jackie-tags";

interface DisplayMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  memoryTier?: 1 | 2 | 3;
  securityFlag?: string | null;
  attachments?: Attachment[];
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
  isMobileOpen,
  onCloseMobile,
  theme,
  onToggleTheme,
  tags,
  tagMap,
  activeTagFilter,
  onSetTagFilter,
  onCreateTag,
  onDeleteTag,
  onToggleTag,
}: {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onSignOut: () => void;
  userEmail: string;
  coreFiles: string[];
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  theme: string;
  onToggleTheme: () => void;
  tags: TagType[];
  tagMap: Record<string, string[]>;
  activeTagFilter: string | null;
  onSetTagFilter: (tagId: string | null) => void;
  onCreateTag: (name: string, color: string) => void;
  onDeleteTag: (id: string) => void;
  onToggleTag: (convId: string, tagId: string, has: boolean) => void;
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewTag, setShowNewTag] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState<string>("blue");
  const [tagMenuConvId, setTagMenuConvId] = useState<string | null>(null);
  const handleSelect = (id: string) => {
    onSelect(id);
    onCloseMobile?.();
  };

  let filtered = searchQuery.trim()
    ? conversations.filter((c) =>
        c.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : conversations;

  if (activeTagFilter) {
    const taggedConvIds = new Set(
      Object.entries(tagMap)
        .filter(([, tids]) => tids.includes(activeTagFilter))
        .map(([cid]) => cid)
    );
    filtered = filtered.filter((c) => taggedConvIds.has(c.id));
  }

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 md:hidden" onClick={onCloseMobile} />
      )}
      <aside
        className={`
          w-[280px] min-h-screen border-r border-border bg-sidebar flex-col
          hidden md:flex
          ${isMobileOpen ? "!flex fixed inset-y-0 left-0 z-50" : ""}
        `}
      >
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-mono text-lg font-bold text-primary tracking-wider">J</span>
              <span className="font-mono text-xs uppercase tracking-widest text-sidebar-foreground">
                Jackie
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={onNew}
                className="p-1.5 rounded-sm text-muted-foreground hover:text-foreground hover:bg-secondary btn-mechanical transition-colors duration-150"
                title="New conversation"
              >
                <Plus size={14} />
              </button>
              <button
                onClick={onToggleTheme}
                className="p-1.5 rounded-sm text-muted-foreground hover:text-foreground hover:bg-secondary btn-mechanical transition-colors duration-150"
                title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              >
                {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
              </button>
              {isMobileOpen && (
                <button
                  onClick={onCloseMobile}
                  className="p-1.5 rounded-sm text-muted-foreground hover:text-foreground hover:bg-secondary btn-mechanical transition-colors duration-150 md:hidden"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
          {/* Search */}
          <div className="mt-3 relative">
            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations…"
              className="w-full pl-7 pr-2 py-1.5 rounded-sm bg-secondary/50 border border-border font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>
          {/* Tag filters */}
          {tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {tags.map((t) => (
                <button
                  key={t.id}
                  onClick={() => onSetTagFilter(activeTagFilter === t.id ? null : t.id)}
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm font-mono text-[10px] border transition-all ${
                    TAG_COLOR_MAP[t.color] || TAG_COLOR_MAP.blue
                  } ${activeTagFilter === t.id ? "ring-1 ring-primary" : "opacity-70 hover:opacity-100"}`}
                >
                  {t.name}
                  {activeTagFilter === t.id && <X size={8} />}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          <div className="px-2 py-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground flex items-center justify-between">
            <span>Conversations {(searchQuery || activeTagFilter) && `(${filtered.length})`}</span>
          </div>
          {filtered.length === 0 && (
            <div className="px-2 py-2 text-xs text-muted-foreground">
              {searchQuery || activeTagFilter ? "No matches found." : "No conversations yet."}
            </div>
          )}
          {filtered.map((conv) => {
            const convTags = (tagMap[conv.id] || []).map((tid) => tags.find((t) => t.id === tid)).filter(Boolean) as TagType[];
            return (
              <div
                key={conv.id}
                className={`group flex flex-col rounded-sm transition-colors duration-150 ${
                  activeId === conv.id
                    ? "bg-secondary text-foreground"
                    : "text-sidebar-foreground hover:bg-secondary/50"
                }`}
              >
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleSelect(conv.id)}
                    className="flex-1 text-left px-2 py-1.5 font-mono text-xs truncate btn-mechanical flex items-center gap-2"
                  >
                    <MessageSquare size={12} className="flex-shrink-0 text-muted-foreground" />
                    {conv.title}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setTagMenuConvId(tagMenuConvId === conv.id ? null : conv.id); }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-foreground transition-opacity duration-150"
                    title="Manage tags"
                  >
                    <Tag size={10} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(conv.id); }}
                    className="opacity-0 group-hover:opacity-100 p-1 mr-1 text-muted-foreground hover:text-destructive transition-opacity duration-150"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                {/* Tag badges */}
                {convTags.length > 0 && (
                  <div className="flex flex-wrap gap-1 px-2 pb-1">
                    {convTags.map((t) => (
                      <span key={t.id} className={`px-1 py-0 rounded-sm font-mono text-[9px] border ${TAG_COLOR_MAP[t.color] || TAG_COLOR_MAP.blue}`}>
                        {t.name}
                      </span>
                    ))}
                  </div>
                )}
                {/* Tag menu */}
                {tagMenuConvId === conv.id && (
                  <div className="mx-2 mb-1 p-2 bg-popover border border-border rounded-sm space-y-1">
                    {tags.map((t) => {
                      const has = (tagMap[conv.id] || []).includes(t.id);
                      return (
                        <button
                          key={t.id}
                          onClick={() => onToggleTag(conv.id, t.id, has)}
                          className={`w-full text-left px-2 py-1 rounded-sm font-mono text-[10px] flex items-center gap-2 hover:bg-secondary transition-colors ${has ? "text-foreground" : "text-muted-foreground"}`}
                        >
                          <span className={`w-2 h-2 rounded-full ${has ? "bg-primary" : "bg-muted-foreground/30"}`} />
                          <span className={`px-1 rounded-sm border ${TAG_COLOR_MAP[t.color] || TAG_COLOR_MAP.blue}`}>{t.name}</span>
                        </button>
                      );
                    })}
                    {tags.length === 0 && <div className="text-[10px] text-muted-foreground">No tags yet</div>}
                    <button
                      onClick={() => setShowNewTag(true)}
                      className="w-full text-left px-2 py-1 font-mono text-[10px] text-primary hover:bg-secondary rounded-sm"
                    >
                      + New tag
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {/* New tag popover */}
          {showNewTag && (
            <div className="mx-2 mt-2 p-2 bg-popover border border-border rounded-sm space-y-2">
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="Tag name"
                className="w-full px-2 py-1 bg-secondary/50 border border-border rounded-sm font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                autoFocus
              />
              <div className="flex flex-wrap gap-1">
                {TAG_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setNewTagColor(c)}
                    className={`w-4 h-4 rounded-full border-2 ${newTagColor === c ? "border-foreground" : "border-transparent"} ${TAG_COLOR_MAP[c]?.split(" ")[0] || "bg-blue-500/20"}`}
                  />
                ))}
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => {
                    if (newTagName.trim()) {
                      onCreateTag(newTagName.trim(), newTagColor);
                      setNewTagName("");
                      setShowNewTag(false);
                    }
                  }}
                  className="px-2 py-1 bg-primary text-primary-foreground font-mono text-[10px] rounded-sm hover:opacity-90"
                >
                  Create
                </button>
                <button
                  onClick={() => { setShowNewTag(false); setNewTagName(""); }}
                  className="px-2 py-1 font-mono text-[10px] text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
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
          <div className="flex items-center gap-2">
            <button
              onClick={onSignOut}
              className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:text-destructive transition-colors"
            >
              <LogOut size={10} />
              Sign Out
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

// ─── Memory Dots ───────────────────────────────────────────

const MemoryDots = ({ tier }: { tier: 1 | 2 | 3 }) => (
  <div className="flex gap-1 items-center" title={`Memory tier: ${["Ephemeral", "Durable", "Gold"][tier - 1]}`}>
    {[1, 2, 3].map((i) => (
      <span key={i} className={`memory-dot ${i <= tier ? "active" : ""}`} />
    ))}
  </div>
);

// ─── Messages ──────────────────────────────────────────────

const JackieMessage = ({ message }: { message: DisplayMessage }) => {
  const [speaking, setSpeaking] = useState(false);

  const toggleSpeak = async () => {
    if (speaking) {
      voiceManager.stop();
      setSpeaking(false);
    } else {
      setSpeaking(true);
      try {
        await voiceManager.speak(message.content);
      } catch {
        // ignore
      }
      setSpeaking(false);
    }
  };

  return (
    <div className="space-y-3 stagger-enter">
      <div className="flex items-center justify-between">
        <span className="jackie-badge">Jackie here—</span>
        <div className="flex items-center gap-2">
          {voiceManager.isSupported() && (
            <button
              onClick={toggleSpeak}
              className="p-1 rounded-sm text-muted-foreground hover:text-primary transition-colors"
              title={speaking ? "Stop speaking" : "Read aloud"}
            >
              {speaking ? <VolumeX size={12} /> : <Volume2 size={12} />}
            </button>
          )}
          {message.memoryTier && <MemoryDots tier={message.memoryTier} />}
        </div>
      </div>

      {message.securityFlag && (
        <div className="jackie-security-flag">
          <div className="font-mono text-xs font-semibold uppercase tracking-wider mb-1">
            ⚠ {message.securityFlag}
          </div>
        </div>
      )}

      <div className="text-foreground leading-relaxed prose prose-sm max-w-none dark:prose-invert">
        <ReactMarkdown>{message.content}</ReactMarkdown>
      </div>

      {message.attachments && message.attachments.length > 0 && (
        <AttachmentDisplay attachments={message.attachments} />
      )}

      <div className="font-mono text-[10px] text-muted-foreground">
        {message.timestamp.toLocaleTimeString("en-US", { hour12: false })}
      </div>
    </div>
  );
};

const UserMessage = ({ message }: { message: DisplayMessage }) => (
  <div className="space-y-2">
    <div className="text-muted-foreground leading-relaxed text-sm whitespace-pre-wrap">
      {message.content}
    </div>
    {message.attachments && message.attachments.length > 0 && (
      <AttachmentDisplay attachments={message.attachments} />
    )}
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
  const { theme, toggleTheme } = useTheme();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [selectedModel, setSelectedModel] = useState<JackieModelId>("google/gemini-2.5-pro");
  const [tags, setTags] = useState<TagType[]>([]);
  const [tagMap, setTagMap] = useState<Record<string, string[]>>({});
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);

  const changeModel = useCallback(async (model: JackieModelId) => {
    setSelectedModel(model);
    if (activeConvId) {
      try { await updateConversationModel(activeConvId, model); } catch { /* best effort */ }
    }
  }, [activeConvId]);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);
  const feedRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const loadTags = useCallback(async () => {
    try {
      const [t, m] = await Promise.all([listTags(), getTagConversationMap()]);
      setTags(t);
      setTagMap(m);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    loadConversations(true);
    loadTags();
  }, []);

  const handleCreateTag = async (name: string, color: string) => {
    try {
      await createTag(name, color);
      await loadTags();
    } catch (e: any) {
      toast.error(e.message?.includes("duplicate") ? "Tag already exists" : "Failed to create tag");
    }
  };

  const handleDeleteTag = async (id: string) => {
    try {
      await deleteTag(id);
      if (activeTagFilter === id) setActiveTagFilter(null);
      await loadTags();
    } catch { toast.error("Failed to delete tag"); }
  };

  const handleToggleTag = async (convId: string, tagId: string, has: boolean) => {
    try {
      if (has) await removeTagFromConversation(convId, tagId);
      else await addTagToConversation(convId, tagId);
      await loadTags();
    } catch { toast.error("Failed to update tag"); }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + "px";
    }
  }, [input]);

  const loadConversations = async (autoSelect = false) => {
    try {
      const convs = await listConversations();
      setConversations(convs);
      if (autoSelect && convs.length > 0 && !activeConvId) {
        setActiveConvId(convs[0].id);
        loadMessages(convs[0].id);
      }
    } catch (e) {
      console.error("Failed to load conversations:", e);
    }
  };

  const loadMessages = useCallback(async (convId: string) => {
    try {
      const msgs = await getMessages(convId);
      const display: DisplayMessage[] = await Promise.all(
        msgs.map(async (m) => {
          let attachments: Attachment[] = [];
          try {
            attachments = await getMessageAttachments(m.id);
          } catch { /* no attachments */ }
          return {
            id: m.id,
            role: m.role as "user" | "assistant",
            content: m.content,
            timestamp: new Date(m.created_at),
            memoryTier: (m.memory_tier as 1 | 2 | 3) ?? 1,
            securityFlag: m.security_flag,
            attachments,
          };
        })
      );
      setMessages(display);
      setChatHistory(
        msgs.map((m) => ({ role: m.role as "user" | "assistant", content: m.content }))
      );
    } catch (e) {
      console.error("Failed to load messages:", e);
    }
  }, []);

  const selectConversation = useCallback(
    async (id: string) => {
      setActiveConvId(id);
      loadMessages(id);
      try {
        const model = await getConversationModel(id);
        if (model) setSelectedModel(model as JackieModelId);
      } catch { /* use current */ }
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
    if ((!input.trim() && pendingFiles.length === 0) || isProcessing) return;

    const userText = input.trim();
    const filesToUpload = [...pendingFiles];
    setInput("");
    setPendingFiles([]);
    setIsProcessing(true);

    let convId = activeConvId;
    if (!convId) {
      try {
        const conv = await createConversation(generateTitle(userText || "Attachment"));
        convId = conv.id;
        setActiveConvId(convId);
        await updateConversationModel(convId, selectedModel);
        await loadConversations();
      } catch {
        toast.error("Failed to create conversation.");
        setIsProcessing(false);
        return;
      }
    }

    // Upload attachments
    let uploadedAttachments: Attachment[] = [];
    if (filesToUpload.length > 0) {
      try {
        uploadedAttachments = await Promise.all(
          filesToUpload.map((pf) => uploadAttachment(pf.file, convId!))
        );
        // Clean up previews
        filesToUpload.forEach((pf) => { if (pf.preview) URL.revokeObjectURL(pf.preview); });
      } catch {
        toast.error("Failed to upload attachments.");
      }
    }

    const displayContent = userText || (uploadedAttachments.length > 0 ? `[${uploadedAttachments.length} file(s) attached]` : "");

    const userMsg: DisplayMessage = {
      id: Date.now().toString(),
      role: "user",
      content: displayContent,
      timestamp: new Date(),
      attachments: uploadedAttachments,
    };
    setMessages((prev) => [...prev, userMsg]);
    scrollToBottom();

    try {
      await saveMessage({ conversation_id: convId, role: "user", content: displayContent });
    } catch {
      console.error("Failed to persist user message");
    }

    const newHistory: ChatMessage[] = [...chatHistory, { role: "user", content: displayContent }];
    setChatHistory(newHistory);

    const assistantTempId = (Date.now() + 1).toString();
    let assistantContent = "";

    setMessages((prev) => [
      ...prev,
      { id: assistantTempId, role: "assistant", content: "", timestamp: new Date(), memoryTier: 1 },
    ]);

    await streamChat({
      messages: newHistory,
      model: selectedModel,
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

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items);
    const imageItems = items.filter((item) => item.type.startsWith("image/"));
    if (imageItems.length === 0) return;

    e.preventDefault();
    const newPending: PendingFile[] = imageItems
      .map((item) => {
        const file = item.getAsFile();
        if (!file) return null;
        return {
          file,
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          preview: URL.createObjectURL(file),
        };
      })
      .filter(Boolean) as PendingFile[];

    if (newPending.length > 0) {
      setPendingFiles((prev) => [...prev, ...newPending]);
      toast.success(`${newPending.length} image${newPending.length > 1 ? "s" : ""} pasted`);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.types.includes("Files")) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;
    const newPending: PendingFile[] = files.map((file) => ({
      file,
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
    }));
    setPendingFiles((prev) => [...prev, ...newPending]);
    toast.success(`${files.length} file${files.length > 1 ? "s" : ""} added`);
  };

  const exportChat = () => {
    if (messages.length === 0) return;
    const conv = conversations.find((c) => c.id === activeConvId);
    const lines = messages.map(
      (m) => `[${m.timestamp.toISOString()}] ${m.role.toUpperCase()}: ${m.content}`
    );
    const blob = new Blob([lines.join("\n\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `jackie-chat_${conv?.title || "export"}_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Chat exported.");
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
        isMobileOpen={sidebarOpen}
        onCloseMobile={() => setSidebarOpen(false)}
        theme={theme}
        onToggleTheme={toggleTheme}
        tags={tags}
        tagMap={tagMap}
        activeTagFilter={activeTagFilter}
        onSetTagFilter={setActiveTagFilter}
        onCreateTag={handleCreateTag}
        onDeleteTag={handleDeleteTag}
        onToggleTag={handleToggleTag}
      />

      <main
        className="flex-1 flex flex-col min-h-screen relative"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {isDragging && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 border-2 border-dashed border-primary rounded-sm pointer-events-none">
            <div className="flex flex-col items-center gap-2">
              <Download size={32} className="text-primary" />
              <span className="font-mono text-xs uppercase tracking-widest text-primary">
                Drop files here
              </span>
            </div>
          </div>
        )}
        {/* Mobile header */}
        <div className="flex items-center gap-2 p-3 border-b border-border md:hidden flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-sm text-muted-foreground hover:text-foreground hover:bg-secondary btn-mechanical transition-colors"
          >
            <Menu size={18} />
          </button>
          <span className="font-mono text-sm font-bold text-primary tracking-wider">J</span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground flex-1">Jackie</span>
          {messages.length > 0 && (
            <button
              onClick={exportChat}
              className="p-1.5 rounded-sm text-muted-foreground hover:text-foreground hover:bg-secondary btn-mechanical transition-colors"
              title="Export chat"
            >
              <Download size={16} />
            </button>
          )}
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-sm text-muted-foreground hover:text-foreground hover:bg-secondary btn-mechanical transition-colors"
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>

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
            <ChatMediaBar
              pendingFiles={pendingFiles}
              onFilesAdded={(files) => setPendingFiles((prev) => [...prev, ...files])}
              onFileRemoved={(id) => setPendingFiles((prev) => prev.filter((f) => f.id !== id))}
              disabled={isProcessing}
            />
            <div className="flex items-end gap-2">
              <span className="font-mono text-xs text-muted-foreground select-none pb-3">›</span>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder="..."
                className="jackie-input flex-1 resize-none overflow-hidden"
                style={{ minHeight: "44px", maxHeight: "200px" }}
                disabled={isProcessing}
                rows={1}
              />
              <VoiceRecorder
                onRecordingComplete={(file) => {
                  const pf: PendingFile = {
                    file,
                    id: `${Date.now()}-voice`,
                    preview: URL.createObjectURL(file),
                  };
                  setPendingFiles((prev) => [...prev, pf]);
                }}
                disabled={isProcessing}
              />
              <button
                onClick={handleSubmit}
                disabled={isProcessing || (!input.trim() && pendingFiles.length === 0)}
                className="p-3 rounded-sm bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-30 transition-opacity btn-mechanical flex-shrink-0"
                title="Send (Enter)"
              >
                <Send size={16} />
              </button>
            </div>
            <div className="flex items-center justify-between mt-1.5 ml-5">
              <div className="relative">
                <button
                  onClick={() => setModelMenuOpen((prev) => !prev)}
                  className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  {JACKIE_MODELS.find((m) => m.id === selectedModel)?.label ?? "Model"}
                  <ChevronDown size={10} />
                </button>
                {modelMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setModelMenuOpen(false)} />
                    <div className="absolute bottom-full left-0 mb-1 z-50 bg-popover border border-border rounded-sm shadow-lg py-1 min-w-[260px]">
                      {JACKIE_MODELS.map((m) => {
                        const costLabel = ["$", "$$", "$$$"][m.cost - 1];
                        const speedDots = Array.from({ length: 3 }, (_, i) => i < m.speed);
                        return (
                          <button
                            key={m.id}
                            onClick={() => {
                              changeModel(m.id);
                              setModelMenuOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 font-mono text-xs hover:bg-secondary transition-colors flex items-center gap-3 ${
                              selectedModel === m.id ? "text-primary bg-secondary/50" : "text-popover-foreground"
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">{m.label}</span>
                                {selectedModel === m.id && <span className="text-[9px] text-primary">●</span>}
                              </div>
                              <span className="text-[10px] text-muted-foreground">{m.description}</span>
                            </div>
                            <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                              <span className={`text-[10px] font-semibold ${m.cost === 1 ? "text-green-500" : m.cost === 2 ? "text-yellow-500" : "text-orange-500"}`}>
                                {costLabel}
                              </span>
                              <div className="flex gap-0.5" title={`Speed: ${m.speed}/3`}>
                                {speedDots.map((active, i) => (
                                  <Zap key={i} size={8} className={active ? "text-primary fill-primary" : "text-muted-foreground/30"} />
                                ))}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
              <span className="font-mono text-[10px] text-muted-foreground">
                Enter to send · Shift+Enter for new line
              </span>
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
        .prose pre { background: hsl(var(--secondary)); border: 1px solid hsl(var(--border)); border-radius: 2px; }
        .prose code { font-family: var(--font-mono); font-size: 13px; }
        .prose p code { background: hsl(var(--secondary)); padding: 2px 6px; border-radius: 2px; }
        .prose a { color: hsl(var(--primary)); }
        .prose strong { color: hsl(var(--foreground)); }
        .prose h1, .prose h2, .prose h3 { font-family: var(--font-mono); text-transform: uppercase; letter-spacing: 0.05em; color: hsl(var(--foreground)); }
        .prose ul, .prose ol { color: hsl(var(--foreground) / 0.8); }
      `}</style>
    </div>
  );
};

export default Index;
