import { useState, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { toast } from "sonner";
import {
  listProjects, createProject, deleteProject, updateProject,
  listEntries, createEntry, updateEntry, deleteEntry,
  DESIGN_CATEGORIES, getProjectContext,
  type GameProject, type DesignEntry, type DesignCategory, type DesignEntryStatus,
} from "@/lib/jackie-design";
import { streamChat, JACKIE_MODELS, type ChatMessage, type JackieModelId } from "@/lib/jackie-stream";
import {
  Plus, Trash2, ArrowLeft, Save, Eye, Edit3, Send, Menu, X, Sun, Moon, MessageSquare, ChevronDown, Gamepad2,
} from "lucide-react";

// ─── Status badge ──────────────────────────────────────────
const StatusBadge = ({ status, onChange }: { status: DesignEntryStatus; onChange: (s: DesignEntryStatus) => void }) => {
  const colors: Record<DesignEntryStatus, string> = {
    draft: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    approved: "bg-primary/20 text-primary border-primary/30",
    implemented: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  };
  const next: Record<DesignEntryStatus, DesignEntryStatus> = { draft: "approved", approved: "implemented", implemented: "draft" };
  return (
    <button onClick={() => onChange(next[status])} className={`px-2 py-0.5 rounded-sm border font-mono text-[10px] uppercase tracking-wider ${colors[status]}`}>
      {status}
    </button>
  );
};

// ─── Design Hub Page ───────────────────────────────────────
const Design = () => {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // Projects
  const [projects, setProjects] = useState<GameProject[]>([]);
  const [activeProject, setActiveProject] = useState<GameProject | null>(null);
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectGenre, setNewProjectGenre] = useState("");
  const [newProjectVision, setNewProjectVision] = useState("");

  // Entries
  const [entries, setEntries] = useState<DesignEntry[]>([]);
  const [activeCategory, setActiveCategory] = useState<DesignCategory | null>(null);
  const [activeEntry, setActiveEntry] = useState<DesignEntry | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [showNewEntry, setShowNewEntry] = useState(false);
  const [newEntryTitle, setNewEntryTitle] = useState("");

  // Chat
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatStreaming, setChatStreaming] = useState(false);
  const [showChat, setShowChat] = useState(false);

  // Mobile
  const [mobileSidebar, setMobileSidebar] = useState(false);

  // ─── Load ────────────────────────────────────────────────
  const loadProjects = useCallback(async () => {
    try {
      setProjects(await listProjects());
    } catch { /* ignore */ }
  }, []);

  const loadEntries = useCallback(async () => {
    if (!activeProject) return;
    try {
      setEntries(await listEntries(activeProject.id, activeCategory || undefined));
    } catch { /* ignore */ }
  }, [activeProject, activeCategory]);

  useEffect(() => { loadProjects(); }, [loadProjects]);
  useEffect(() => { loadEntries(); }, [loadEntries]);

  // ─── Project actions ─────────────────────────────────────
  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    try {
      const p = await createProject(newProjectName.trim(), newProjectGenre.trim() || undefined, undefined, newProjectVision.trim() || undefined);
      setProjects([p, ...projects]);
      setActiveProject(p);
      setShowNewProject(false);
      setNewProjectName(""); setNewProjectGenre(""); setNewProjectVision("");
      toast.success("Project created");
    } catch (e: any) { toast.error(e.message || "Failed"); }
  };

  const handleDeleteProject = async (id: string) => {
    try {
      await deleteProject(id);
      if (activeProject?.id === id) { setActiveProject(null); setEntries([]); setActiveEntry(null); }
      setProjects(projects.filter((p) => p.id !== id));
      toast.success("Project deleted");
    } catch { toast.error("Failed"); }
  };

  // ─── Entry actions ───────────────────────────────────────
  const handleCreateEntry = async () => {
    if (!activeProject || !newEntryTitle.trim()) return;
    try {
      const e = await createEntry({ project_id: activeProject.id, title: newEntryTitle.trim(), category: activeCategory || "general" });
      setEntries([...entries, e as DesignEntry]);
      setActiveEntry(e as DesignEntry);
      setEditMode(true);
      setEditTitle(e.title);
      setEditContent(e.content);
      setShowNewEntry(false);
      setNewEntryTitle("");
    } catch (e: any) { toast.error(e.message || "Failed"); }
  };

  const handleSaveEntry = async () => {
    if (!activeEntry) return;
    try {
      await updateEntry(activeEntry.id, { title: editTitle, content: editContent });
      const updated = { ...activeEntry, title: editTitle, content: editContent };
      setActiveEntry(updated);
      setEntries(entries.map((e) => (e.id === updated.id ? updated : e)));
      setEditMode(false);
      toast.success("Saved");
    } catch { toast.error("Failed to save"); }
  };

  const handleStatusChange = async (entry: DesignEntry, status: DesignEntryStatus) => {
    try {
      await updateEntry(entry.id, { status });
      const updated = { ...entry, status };
      if (activeEntry?.id === entry.id) setActiveEntry(updated);
      setEntries(entries.map((e) => (e.id === entry.id ? updated : e)));
    } catch { toast.error("Failed"); }
  };

  const handleDeleteEntry = async (id: string) => {
    try {
      await deleteEntry(id);
      if (activeEntry?.id === id) setActiveEntry(null);
      setEntries(entries.filter((e) => e.id !== id));
    } catch { toast.error("Failed"); }
  };

  // ─── Chat with context ──────────────────────────────────
  const handleChatSend = async () => {
    if (!chatInput.trim() || chatStreaming) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", content: userMsg }]);

    // Build context
    let context = "";
    if (activeProject) {
      try { context = await getProjectContext(activeProject.id); } catch { /* ignore */ }
    }
    if (activeEntry) {
      context += `\n\n## Currently Editing: ${activeEntry.title}\nCategory: ${activeEntry.category}\nStatus: ${activeEntry.status}\nContent:\n${activeEntry.content}`;
    }

    const allMessages: ChatMessage[] = [
      ...chatMessages.map((m) => ({ role: m.role, content: m.content })),
      { role: "user" as const, content: userMsg },
    ];

    setChatStreaming(true);
    let assistantContent = "";
    setChatMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    await streamChat({
      messages: allMessages,
      model: "google/gemini-2.5-pro",
      onDelta: (text) => {
        assistantContent += text;
        setChatMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: "assistant", content: assistantContent };
          return copy;
        });
      },
      onDone: () => setChatStreaming(false),
      onError: (err) => {
        toast.error(err);
        setChatStreaming(false);
      },
      context,
    });
  };

  // ─── Project list view ──────────────────────────────────
  if (!activeProject) {
    return (
      <div className={`min-h-screen bg-background text-foreground ${theme}`}>
        <div className="max-w-3xl mx-auto p-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Gamepad2 className="text-primary" size={24} />
              <h1 className="font-mono text-xl font-bold tracking-tight">Game Design Hub</h1>
            </div>
            <div className="flex items-center gap-2">
              <a href="/" className="font-mono text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                <MessageSquare size={12} /> Chat
              </a>
              <button onClick={toggleTheme} className="p-1.5 rounded-sm text-muted-foreground hover:text-foreground hover:bg-secondary">
                {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
              </button>
            </div>
          </div>

          <button onClick={() => setShowNewProject(true)} className="w-full mb-4 p-3 border border-dashed border-border rounded-sm font-mono text-sm text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors flex items-center justify-center gap-2">
            <Plus size={14} /> New Game Project
          </button>

          {showNewProject && (
            <div className="mb-4 p-4 bg-card border border-border rounded-sm space-y-3">
              <input value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} placeholder="Project name" className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-sm font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" autoFocus />
              <input value={newProjectGenre} onChange={(e) => setNewProjectGenre(e.target.value)} placeholder="Genre (e.g. Strategy, RPG)" className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-sm font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
              <textarea value={newProjectVision} onChange={(e) => setNewProjectVision(e.target.value)} placeholder="Vision statement..." rows={3} className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-sm font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none" />
              <div className="flex gap-2">
                <button onClick={handleCreateProject} className="px-4 py-2 bg-primary text-primary-foreground font-mono text-xs rounded-sm hover:opacity-90">Create</button>
                <button onClick={() => setShowNewProject(false)} className="px-4 py-2 font-mono text-xs text-muted-foreground hover:text-foreground">Cancel</button>
              </div>
            </div>
          )}

          {projects.length === 0 && !showNewProject && (
            <div className="text-center py-16 text-muted-foreground font-mono text-sm">
              No game projects yet. Create one to start designing.
            </div>
          )}

          <div className="space-y-2">
            {projects.map((p) => (
              <div key={p.id} className="group p-4 bg-card border border-border rounded-sm hover:border-primary/30 transition-colors cursor-pointer" onClick={() => setActiveProject(p)}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-mono text-sm font-semibold">{p.name}</h3>
                    {p.genre && <span className="font-mono text-[10px] text-primary uppercase tracking-wider">{p.genre}</span>}
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteProject(p.id); }} className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-opacity">
                    <Trash2 size={14} />
                  </button>
                </div>
                {p.vision_statement && <p className="mt-1 font-mono text-xs text-muted-foreground line-clamp-2">{p.vision_statement}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── Design workspace ───────────────────────────────────
  return (
    <div className={`min-h-screen bg-background text-foreground flex ${theme}`}>
      {/* Mobile overlay */}
      {mobileSidebar && <div className="fixed inset-0 z-40 bg-black/60 md:hidden" onClick={() => setMobileSidebar(false)} />}

      {/* Category sidebar */}
      <aside className={`w-[220px] min-h-screen border-r border-border bg-sidebar flex-col hidden md:flex ${mobileSidebar ? "!flex fixed inset-y-0 left-0 z-50" : ""}`}>
        <div className="p-3 border-b border-border">
          <div className="flex items-center justify-between">
            <button onClick={() => setActiveProject(null)} className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-foreground">
              <ArrowLeft size={12} /> Projects
            </button>
            <div className="flex gap-1">
              <a href="/" className="p-1 text-muted-foreground hover:text-foreground" title="Chat"><MessageSquare size={12} /></a>
              <button onClick={toggleTheme} className="p-1 text-muted-foreground hover:text-foreground">
                {theme === "dark" ? <Sun size={12} /> : <Moon size={12} />}
              </button>
            </div>
          </div>
          <h2 className="mt-2 font-mono text-sm font-bold truncate">{activeProject.name}</h2>
          {activeProject.genre && <span className="font-mono text-[10px] text-primary uppercase tracking-wider">{activeProject.genre}</span>}
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          <button
            onClick={() => { setActiveCategory(null); setActiveEntry(null); }}
            className={`w-full text-left px-2 py-1.5 rounded-sm font-mono text-xs flex items-center gap-2 transition-colors ${!activeCategory ? "bg-secondary text-foreground" : "text-sidebar-foreground hover:bg-secondary/50"}`}
          >
            📋 All Categories
          </button>
          {DESIGN_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => { setActiveCategory(cat.id); setActiveEntry(null); }}
              className={`w-full text-left px-2 py-1.5 rounded-sm font-mono text-xs flex items-center gap-2 transition-colors ${activeCategory === cat.id ? "bg-secondary text-foreground" : "text-sidebar-foreground hover:bg-secondary/50"}`}
            >
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>

        <div className="p-3 border-t border-border">
          <button onClick={() => setShowChat(!showChat)} className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-sm font-mono text-xs transition-colors ${showChat ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}>
            <MessageSquare size={12} /> {showChat ? "Hide Jackie" : "Ask Jackie"}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <div className="md:hidden flex items-center gap-2 p-3 border-b border-border">
          <button onClick={() => setMobileSidebar(true)} className="p-1 text-muted-foreground"><Menu size={16} /></button>
          <span className="font-mono text-sm font-bold truncate">{activeProject.name}</span>
        </div>

        <div className="flex-1 flex min-h-0">
          {/* Entry list + editor */}
          <div className={`flex-1 flex flex-col min-w-0 ${showChat ? "md:w-[60%]" : ""}`}>
            {!activeEntry ? (
              /* Entry list */
              <div className="flex-1 overflow-y-auto p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-mono text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    {activeCategory ? DESIGN_CATEGORIES.find((c) => c.id === activeCategory)?.label : "All Entries"} ({entries.length})
                  </h3>
                  <button onClick={() => setShowNewEntry(true)} className="flex items-center gap-1 px-2 py-1 rounded-sm font-mono text-xs text-primary hover:bg-secondary transition-colors">
                    <Plus size={12} /> New Entry
                  </button>
                </div>

                {showNewEntry && (
                  <div className="mb-3 p-3 bg-card border border-border rounded-sm flex gap-2">
                    <input value={newEntryTitle} onChange={(e) => setNewEntryTitle(e.target.value)} placeholder="Entry title..." className="flex-1 px-2 py-1 bg-secondary/50 border border-border rounded-sm font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" autoFocus onKeyDown={(e) => e.key === "Enter" && handleCreateEntry()} />
                    <button onClick={handleCreateEntry} className="px-3 py-1 bg-primary text-primary-foreground font-mono text-xs rounded-sm">Add</button>
                    <button onClick={() => { setShowNewEntry(false); setNewEntryTitle(""); }} className="px-2 py-1 font-mono text-xs text-muted-foreground">✕</button>
                  </div>
                )}

                {entries.length === 0 && !showNewEntry && (
                  <div className="text-center py-16 text-muted-foreground font-mono text-sm">
                    No entries yet. Add your first design entry.
                  </div>
                )}

                <div className="space-y-1">
                  {entries.map((entry) => {
                    const cat = DESIGN_CATEGORIES.find((c) => c.id === entry.category);
                    return (
                      <div key={entry.id} className="group flex items-center gap-2 p-2 rounded-sm hover:bg-secondary/50 cursor-pointer transition-colors" onClick={() => { setActiveEntry(entry); setEditTitle(entry.title); setEditContent(entry.content); setEditMode(false); }}>
                        <span className="text-sm flex-shrink-0">{cat?.icon || "📋"}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-mono text-xs font-medium truncate">{entry.title}</div>
                          <div className="font-mono text-[10px] text-muted-foreground truncate">{entry.content.slice(0, 80) || "Empty"}</div>
                        </div>
                        <StatusBadge status={entry.status} onChange={(s) => handleStatusChange(entry, s)} />
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteEntry(entry.id); }} className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Entry editor */
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex items-center gap-2 p-3 border-b border-border">
                  <button onClick={() => setActiveEntry(null)} className="p-1 text-muted-foreground hover:text-foreground"><ArrowLeft size={14} /></button>
                  <span className="text-sm flex-shrink-0">{DESIGN_CATEGORIES.find((c) => c.id === activeEntry.category)?.icon}</span>
                  {editMode ? (
                    <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="flex-1 px-2 py-1 bg-secondary/50 border border-border rounded-sm font-mono text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
                  ) : (
                    <h3 className="flex-1 font-mono text-sm font-semibold truncate">{activeEntry.title}</h3>
                  )}
                  <StatusBadge status={activeEntry.status} onChange={(s) => handleStatusChange(activeEntry, s)} />
                  {editMode ? (
                    <button onClick={handleSaveEntry} className="flex items-center gap-1 px-2 py-1 bg-primary text-primary-foreground rounded-sm font-mono text-xs"><Save size={12} /> Save</button>
                  ) : (
                    <button onClick={() => setEditMode(true)} className="flex items-center gap-1 px-2 py-1 text-muted-foreground hover:text-foreground font-mono text-xs"><Edit3 size={12} /> Edit</button>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  {editMode ? (
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full h-full min-h-[400px] p-3 bg-secondary/30 border border-border rounded-sm font-mono text-sm text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary/50"
                      placeholder="Write your design content in markdown..."
                    />
                  ) : (
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      {activeEntry.content ? <ReactMarkdown>{activeEntry.content}</ReactMarkdown> : <p className="text-muted-foreground italic">No content yet. Click Edit to start writing.</p>}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Jackie chat panel */}
          {showChat && (
            <div className="hidden md:flex w-[360px] border-l border-border flex-col bg-card">
              <div className="p-3 border-b border-border">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-primary">Jackie — Design Co-Pilot</span>
                  <button onClick={() => setShowChat(false)} className="p-1 text-muted-foreground hover:text-foreground"><X size={12} /></button>
                </div>
                {activeEntry && <div className="mt-1 font-mono text-[10px] text-muted-foreground truncate">Context: {activeEntry.title}</div>}
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {chatMessages.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground font-mono text-xs">
                    Ask Jackie about your game design. She has full context of your project.
                  </div>
                )}
                {chatMessages.map((msg, i) => (
                  <div key={i} className={msg.role === "user" ? "text-right" : ""}>
                    {msg.role === "assistant" && <span className="jackie-badge text-[10px] mb-1">Jackie</span>}
                    <div className={`inline-block max-w-full text-left ${msg.role === "user" ? "bg-secondary/50 px-3 py-2 rounded-sm" : ""}`}>
                      {msg.role === "assistant" ? (
                        <div className="prose prose-sm max-w-none dark:prose-invert text-xs"><ReactMarkdown>{msg.content || "..."}</ReactMarkdown></div>
                      ) : (
                        <p className="font-mono text-xs">{msg.content}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 border-t border-border">
                <div className="flex gap-2">
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleChatSend()}
                    placeholder="Ask about your design..."
                    className="flex-1 px-2 py-1.5 bg-secondary/50 border border-border rounded-sm font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                    disabled={chatStreaming}
                  />
                  <button onClick={handleChatSend} disabled={chatStreaming || !chatInput.trim()} className="p-1.5 bg-primary text-primary-foreground rounded-sm disabled:opacity-50">
                    <Send size={12} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Design;
