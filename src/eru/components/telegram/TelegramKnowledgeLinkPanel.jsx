import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/eru/api/base44Client';
import { BookOpen, Check, Loader2, Plus, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * TelegramKnowledgeLinkPanel — link KnowledgeBaseDocuments to a Telegram bot
 * so the webhook can ground replies in those sources.
 *
 * Honest behavior:
 *   - Lists every KB doc the current user owns.
 *   - Toggle adds/removes the bot id from `linked_bot_ids` on that doc.
 *   - Surfaces a clear empty state with a link to create knowledge.
 */
export default function TelegramKnowledgeLinkPanel({ bot }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);

  const loadDocs = async () => {
    setLoading(true);
    try {
      const list = await base44.entities.KnowledgeBaseDocument.list('-updated_date', 200);
      setDocs(list || []);
    } catch {
      setDocs([]);
    }
    setLoading(false);
  };

  useEffect(() => { loadDocs(); }, [bot?.id]);

  const linkedCount = useMemo(
    () => docs.filter((d) => (d.linked_bot_ids || []).includes(bot.id)).length,
    [docs, bot.id]
  );

  const toggleLink = async (doc) => {
    const linked = (doc.linked_bot_ids || []).includes(bot.id);
    setSavingId(doc.id);
    try {
      const next = linked
        ? (doc.linked_bot_ids || []).filter((id) => id !== bot.id)
        : [...(doc.linked_bot_ids || []), bot.id];
      await base44.entities.KnowledgeBaseDocument.update(doc.id, { linked_bot_ids: next });
      setDocs((prev) => prev.map((d) => d.id === doc.id ? { ...d, linked_bot_ids: next } : d));
    } catch { /* keep UI stable */ }
    setSavingId(null);
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <div className="flex items-start gap-2">
        <BookOpen className="h-4 w-4 text-primary mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">Knowledge sources</p>
          <p className="text-[11px] text-muted-foreground">
            Link documents so this bot answers customer questions from your real content.
            {bot.front_door_role === 'support' && ' This is a Support agent — grounded answers strongly recommended.'}
          </p>
        </div>
        <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-mono text-primary flex-shrink-0">
          {linkedCount} linked
        </span>
      </div>

      <div className="mt-3">
        {loading ? (
          <div className="flex items-center justify-center py-4 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : docs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-secondary/30 p-3 text-center">
            <p className="text-[11px] text-muted-foreground">No knowledge documents yet.</p>
            <Link
              to="/ailab"
              className="mt-2 inline-flex items-center gap-1 rounded-lg border border-border bg-secondary px-2.5 py-1 text-[11px] text-foreground hover:border-primary/40"
            >
              <Plus className="h-3 w-3" /> Add knowledge in AI Lab
              <ExternalLink className="h-3 w-3 opacity-60" />
            </Link>
          </div>
        ) : (
          <ul className="space-y-1.5 max-h-64 overflow-y-auto">
            {docs.map((doc) => {
              const linked = (doc.linked_bot_ids || []).includes(bot.id);
              const isSaving = savingId === doc.id;
              return (
                <li key={doc.id}>
                  <button
                    type="button"
                    onClick={() => toggleLink(doc)}
                    disabled={isSaving}
                    className={`w-full flex items-center gap-2 rounded-xl border px-3 py-2 text-left transition-colors ${
                      linked
                        ? 'border-primary/40 bg-primary/10'
                        : 'border-border bg-secondary/40 hover:border-primary/30'
                    }`}
                  >
                    <div className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border ${
                      linked ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card'
                    }`}>
                      {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : linked ? <Check className="h-3 w-3" /> : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-foreground">{doc.title || 'Untitled'}</p>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        {doc.source_type}{doc.faq_items?.length ? ` · ${doc.faq_items.length} FAQs` : ''}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}