import { LifeBuoy, CheckCircle2 } from 'lucide-react';
import { base44 } from '@/eru/api/base44Client';

export default function TelegramHandoffInbox({ bot, sessions = [], onRefresh }) {
  if (!bot) return null;

  const handoffSessions = sessions.filter((session) => session.human_handoff_status === 'requested' || session.human_handoff_status === 'active');

  const resolveHandoff = async (session) => {
    await base44.entities.TelegramBotSession.update(session.id, {
      human_handoff_requested: false,
      human_handoff_status: 'resolved',
      human_handoff_resolved_at: new Date().toISOString()
    });
    onRefresh?.();
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <LifeBuoy className="w-4 h-4 text-amber-400" />
        <p className="text-sm font-semibold text-foreground">Human handoff inbox</p>
      </div>
      {handoffSessions.length === 0 ? (
        <p className="text-xs text-muted-foreground">No live handoff requests for this bot.</p>
      ) : (
        <div className="space-y-2">
          {handoffSessions.map((session) => (
            <div key={session.id} className="rounded-xl border border-border bg-background p-3 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-foreground">{session.telegram_username || session.telegram_chat_id}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">{session.human_handoff_reason || 'Requested human review'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => resolveHandoff(session)}
                  className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1.5 text-[11px] font-medium text-emerald-400"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Resolve
                </button>
              </div>
              <div className="rounded-lg border border-border bg-card p-2.5">
                <p className="text-[10px] uppercase text-muted-foreground">Latest message</p>
                <p className="mt-1 text-xs text-foreground whitespace-pre-wrap">{session.last_user_message || 'No message'}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}