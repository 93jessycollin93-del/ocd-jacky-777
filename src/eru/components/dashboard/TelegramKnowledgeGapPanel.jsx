import { useMemo } from 'react';
import { base44 } from '@/eru/api/base44Client';
import { AlertTriangle, BookPlus, Bot } from 'lucide-react';

export default function TelegramKnowledgeGapPanel({ gaps = [], bots = [] }) {
  const openGaps = useMemo(() => {
    const botMap = new Map((bots || []).map((bot) => [bot.id, bot.name]));
    return (gaps || [])
      .filter((gap) => gap.status === 'open')
      .map((gap) => ({ ...gap, botName: botMap.get(gap.bot_id) || 'Unknown bot' }))
      .sort((a, b) => Number(b.confidence_score || 0) - Number(a.confidence_score || 0));
  }, [gaps, bots]);

  const addPrompt = async (gap) => {
    const content = `Topic: ${gap.suggested_topic}\n\nUser question gap: ${gap.user_question}\n\nSuggested keywords: ${(gap.suggested_keywords || []).join(', ')}`;
    await base44.entities.KnowledgeBaseDocument.create({
      title: gap.title,
      source_type: 'text',
      content,
      keywords: gap.suggested_keywords || [],
      linked_bot_ids: [gap.bot_id],
      status: 'active'
    });
    await base44.entities.TelegramKnowledgeGap.update(gap.id, { status: 'resolved' });
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Knowledge gaps</p>
          <p className="mt-1 text-xs text-muted-foreground">Low-confidence replies that likely need more knowledge base context.</p>
        </div>
        <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-2.5">
          <AlertTriangle className="w-4 h-4 text-yellow-300" />
        </div>
      </div>

      <div className="space-y-2">
        {openGaps.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-secondary/20 px-3 py-4 text-xs text-muted-foreground">No open knowledge gaps found.</div>
        ) : openGaps.slice(0, 6).map((gap) => (
          <div key={gap.id} className="rounded-xl border border-border bg-secondary/20 p-3 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{gap.title}</p>
                <p className="mt-1 text-[11px] text-muted-foreground flex items-center gap-1"><Bot className="w-3 h-3" /> {gap.botName}</p>
              </div>
              <span className="text-[10px] rounded-full bg-yellow-500/10 text-yellow-200 px-2 py-1 border border-yellow-500/20">{Number(gap.confidence_score || 0)} score</span>
            </div>
            <div className="space-y-1 text-xs">
              <p className="text-muted-foreground">Missing topic</p>
              <p className="text-foreground">{gap.suggested_topic}</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(gap.suggested_keywords || []).map((keyword) => (
                <span key={keyword} className="text-[10px] rounded-full bg-primary/10 text-primary px-2 py-1 border border-primary/20">{keyword}</span>
              ))}
            </div>
            <button onClick={() => addPrompt(gap)} className="w-full h-10 rounded-xl bg-primary text-primary-foreground text-xs font-medium inline-flex items-center justify-center gap-2">
              <BookPlus className="w-4 h-4" /> Add suggested knowledge context
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}