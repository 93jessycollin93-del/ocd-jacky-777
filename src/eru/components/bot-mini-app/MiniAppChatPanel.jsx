import { MessageSquare, Send } from 'lucide-react';

export default function MiniAppChatPanel({ bot, messages, input, onInputChange, onSend }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-primary" />
        <p className="text-sm font-semibold text-foreground">Quick bot chat</p>
      </div>
      <div className="rounded-xl border border-border bg-background min-h-[220px] p-3 space-y-2">
        {messages.length === 0 ? (
          <div className="text-sm text-muted-foreground">{bot.greeting_message || 'Start chatting with this deployed bot.'}</div>
        ) : messages.map((message, index) => (
          <div key={index} className={`rounded-xl px-3 py-2 text-sm ${message.role === 'user' ? 'bg-primary text-primary-foreground ml-8' : 'bg-secondary text-foreground mr-8'}`}>
            {message.content}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSend()}
          placeholder="Message this bot..."
          className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none text-foreground"
        />
        <button onClick={onSend} className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}