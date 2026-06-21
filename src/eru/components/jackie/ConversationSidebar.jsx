import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/eru/api/base44Client';
import { MessageSquare, Save, Pencil, Trash2, Check, Plus, ChevronDown, ChevronUp } from 'lucide-react';

const BLANK_FORM = { title: '' };

export default function ConversationSidebar({ messages, onLoadConversation, onNewConversation }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draftTitle, setDraftTitle] = useState(BLANK_FORM.title);
  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [mobileExpanded, setMobileExpanded] = useState(false);

  const currentTranscript = useMemo(() => JSON.stringify(messages || []), [messages]);

  const loadConversations = async () => {
    setLoading(true);
    const rows = await base44.entities.JackieSaved.filter({ tag: 'conversation' }, '-updated_date', 100);
    setConversations(rows);
    setLoading(false);
  };

  useEffect(() => {
    loadConversations();
  }, []);

  const saveConversation = async () => {
    if (!messages?.length) return;
    await base44.entities.JackieSaved.create({
      title: draftTitle.trim() || `Chat ${new Date().toLocaleString()}`,
      content: currentTranscript,
      tag: 'conversation',
      asset_type: 'text',
      folder: 'Conversations',
    });
    setDraftTitle(BLANK_FORM.title);
    loadConversations();
  };

  const renameConversation = async (id) => {
    if (!editingTitle.trim()) return;
    await base44.entities.JackieSaved.update(id, { title: editingTitle.trim() });
    setEditingId(null);
    setEditingTitle('');
    loadConversations();
  };

  const deleteConversation = async (id) => {
    await base44.entities.JackieSaved.delete(id);
    loadConversations();
  };

  const openConversation = (item) => {
    try {
      const parsed = JSON.parse(item.content || '[]');
      onLoadConversation(parsed);
    } catch {
      onLoadConversation([]);
    }
  };

  return (
    <div className="w-full md:w-80 md:min-w-80 border-b md:border-b-0 md:border-r border-border bg-card/60 backdrop-blur">

      {/* Mobile compact header — tap to expand the full panel */}
      <div className="flex items-center justify-between gap-2 px-4 py-2.5 md:hidden">
        <div className="flex items-center gap-2 min-w-0">
          <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 text-primary" />
          <p className="text-xs font-semibold text-foreground truncate">Conversations</p>
          {conversations.length > 0 && (
            <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">{conversations.length}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={onNewConversation} className="inline-flex items-center gap-1 rounded-xl border border-border bg-secondary px-2.5 py-1.5 text-xs text-muted-foreground">
            <Plus className="w-3 h-3" /> New
          </button>
          <button onClick={() => setMobileExpanded(p => !p)} className="inline-flex items-center gap-1 rounded-xl border border-border bg-secondary px-2.5 py-1.5 text-xs text-muted-foreground">
            {mobileExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Mobile expanded panel */}
      {mobileExpanded && (
        <div className="md:hidden px-4 pb-3 space-y-3 border-t border-border/50">
          <div className="space-y-2 rounded-xl border border-border bg-secondary/20 p-3 mt-3">
            <input
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              placeholder="Conversation name"
              style={{ fontSize: '16px' }}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground outline-none"
            />
            <button
              onClick={saveConversation}
              disabled={!messages?.length}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-40"
            >
              <Save className="w-3.5 h-3.5" /> Save current chat
            </button>
          </div>
          <div className="max-h-[12rem] overflow-y-auto overscroll-contain touch-pan-y space-y-2">
            {loading ? (
              <div className="py-4 text-center text-xs text-muted-foreground">Loading...</div>
            ) : conversations.length === 0 ? (
              <div className="py-4 text-center text-xs text-muted-foreground">No saved conversations yet.</div>
            ) : conversations.map((item) => (
              <div key={item.id} className="rounded-xl border border-border bg-secondary/10 p-3">
                <button onClick={() => { openConversation(item); setMobileExpanded(false); }} className="w-full text-left text-xs font-semibold text-foreground truncate">
                  {item.title || 'Untitled chat'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Desktop full panel */}
      <div className="hidden md:block">
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-foreground">Conversations</p>
              <p className="text-[11px] text-muted-foreground">Save and revisit past Jackie chats.</p>
            </div>
            <button
              onClick={onNewConversation}
              className="inline-flex items-center gap-1 rounded-xl border border-border bg-secondary px-2.5 py-1.5 text-xs text-muted-foreground"
            >
              <Plus className="w-3.5 h-3.5" /> New
            </button>
          </div>

          <div className="space-y-2 rounded-xl border border-border bg-secondary/20 p-3">
            <input
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              placeholder="Conversation name"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground outline-none"
            />
            <button
              onClick={saveConversation}
              disabled={!messages?.length}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-40"
            >
              <Save className="w-3.5 h-3.5" /> Save current chat
            </button>
          </div>
        </div>

        <div className="max-h-[calc(100dvh-14rem)] overflow-y-auto overscroll-contain touch-pan-y [-webkit-overflow-scrolling:touch] px-4 pb-4 space-y-2">
        {loading ? (
          <div className="py-8 text-center text-xs text-muted-foreground">Loading conversations...</div>
        ) : conversations.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">No saved conversations yet.</div>
        ) : conversations.map((item) => (
          <div key={item.id} className="rounded-xl border border-border bg-secondary/10 p-3">
            <div className="flex items-start gap-2">
              <button
                onClick={() => openConversation(item)}
                className="flex min-w-0 flex-1 items-start gap-2 text-left"
              >
                <div className="mt-0.5 rounded-lg bg-primary/10 p-1.5 text-primary">
                  <MessageSquare className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  {editingId === item.id ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        className="flex-1 rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground outline-none"
                        autoFocus
                      />
                      <button onClick={(e) => { e.stopPropagation(); renameConversation(item.id); }} className="text-primary">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="truncate text-xs font-semibold text-foreground">{item.title || 'Untitled chat'}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2">
                        {(() => {
                          try {
                            const parsed = JSON.parse(item.content || '[]');
                            return parsed?.[0]?.content || 'Saved conversation';
                          } catch {
                            return 'Saved conversation';
                          }
                        })()}
                      </p>
                    </>
                  )}
                </div>
              </button>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setEditingId(item.id);
                    setEditingTitle(item.title || '');
                  }}
                  className="rounded-lg border border-border bg-background p-1.5 text-muted-foreground"
                >
                  <Pencil className="w-3 h-3" />
                </button>
                <button
                  onClick={() => deleteConversation(item.id)}
                  className="rounded-lg border border-destructive/20 bg-destructive/10 p-1.5 text-destructive"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        ))}
        </div>
      </div>
    </div>
  );
}