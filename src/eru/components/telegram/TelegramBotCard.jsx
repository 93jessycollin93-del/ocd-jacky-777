import { Bot, MessageSquare, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';

const STATUS_STYLES = {
  active: 'bg-green-500/10 text-green-400 border-green-500/20',
  error: 'bg-red-500/10 text-red-400 border-red-500/20',
  connecting: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  draft: 'bg-secondary text-muted-foreground border-border',
  disabled: 'bg-secondary text-muted-foreground border-border',
};

export default function TelegramBotCard({ bot, active, onSelect }) {
  return (
    <button onClick={() => onSelect(bot)} className={`w-full text-left rounded-2xl border p-4 transition-colors ${active ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{bot.name}</p>
            <p className="text-xs text-muted-foreground truncate">@{bot.bot_username}</p>
          </div>
        </div>
        <span className={`px-2 py-1 rounded-full border text-[10px] font-medium ${STATUS_STYLES[bot.status] || STATUS_STYLES.draft}`}>
          {bot.status}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5"><MessageSquare className="w-3.5 h-3.5" /> {bot.total_messages || 0} messages</div>
        <div className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> {bot.conversation_count || 0} chats</div>
      </div>
      <div className="mt-3 text-[11px] text-muted-foreground line-clamp-2">
        {bot.personality_prompt}
      </div>
      {bot.last_error ? (
        <div className="mt-3 flex items-start gap-2 text-[11px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-2.5 py-2">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span className="line-clamp-2">{bot.last_error}</span>
        </div>
      ) : (
        <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
          <Clock className="w-3.5 h-3.5" />
          {bot.last_message_at ? `Last activity ${new Date(bot.last_message_at).toLocaleString()}` : 'No messages yet'}
        </div>
      )}
    </button>
  );
}