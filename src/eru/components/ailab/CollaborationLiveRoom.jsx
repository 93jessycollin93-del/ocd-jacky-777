import { Bot, MessageSquareShare, User } from 'lucide-react';

export default function CollaborationLiveRoom({ messages = [], guidance, setGuidance, onSendGuidance, running }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div>
        <p className="text-sm font-semibold text-foreground">Live squad room</p>
        <p className="text-[11px] text-muted-foreground">Watch the squad think in real time and send guidance while the task is running.</p>
      </div>

      <div className="max-h-[420px] overflow-y-auto space-y-2 rounded-xl border border-border bg-background p-3">
        {messages.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">The live collaboration feed will appear here.</div>
        ) : messages.map((message, index) => {
          const isUser = message.role === 'user';
          const Icon = isUser ? User : Bot;
          return (
            <div key={`${message.role}-${index}`} className={`flex gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
              {!isUser && <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-primary/10"><Icon className="w-3.5 h-3.5 text-primary" /></div>}
              <div className={`max-w-[88%] rounded-2xl border px-3 py-2 ${isUser ? 'border-primary/20 bg-primary/10 text-primary' : 'border-border bg-card text-foreground'}`}>
                <p className="text-[10px] font-semibold uppercase tracking-wide opacity-70">{message.label}</p>
                <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed">{message.content}</p>
              </div>
              {isUser && <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground"><Icon className="w-3.5 h-3.5" /></div>}
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-border bg-background p-3 space-y-2">
        <div className="flex items-center gap-2">
          <MessageSquareShare className="w-4 h-4 text-primary" />
          <p className="text-xs font-semibold text-foreground">Guide the squad</p>
        </div>
        <textarea
          value={guidance}
          onChange={(e) => setGuidance(e.target.value)}
          placeholder="Example: prioritize risk reduction, focus on market catalysts, or challenge weak assumptions..."
          className="min-h-[84px] w-full rounded-xl border border-border bg-card px-3 py-2 text-xs text-foreground outline-none resize-none"
        />
        <button
          onClick={onSendGuidance}
          disabled={!guidance.trim() || !running}
          className="w-full rounded-xl bg-primary py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-40"
        >
          Send real-time guidance
        </button>
      </div>
    </div>
  );
}