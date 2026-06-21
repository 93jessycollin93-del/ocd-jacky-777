import { Lock, Mic, MessageCircle, Plus, Users, Globe2 } from 'lucide-react';

export default function ChatDirectory({ chats, activeChatId, onSelectChat, onCreateChat }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">Chats</h3>
          <p className="text-[11px] text-muted-foreground">Global, open rooms, and invite-only friend groups.</p>
        </div>
        <button onClick={onCreateChat} className="inline-flex items-center gap-1 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">
          <Plus className="w-3.5 h-3.5" /> New
        </button>
      </div>
      <div className="space-y-2">
        {chats.map((chat) => {
          const active = activeChatId === chat.id;
          return (
            <button key={chat.id} onClick={() => onSelectChat(chat.id)} className={`w-full rounded-xl border px-3 py-3 text-left transition-all ${active ? 'border-primary bg-primary/10' : 'border-border bg-secondary/40'}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold">{chat.name}</p>
                    {chat.visibility === 'open' ? <Globe2 className="w-3.5 h-3.5 text-primary" /> : <Lock className="w-3.5 h-3.5 text-muted-foreground" />}
                    {chat.voice_enabled && <Mic className="w-3.5 h-3.5 text-primary" />}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">{chat.description}</p>
                </div>
                <div className="text-right text-[11px] text-muted-foreground">
                  <div className="inline-flex items-center gap-1"><Users className="w-3 h-3" /> {chat.members.length}</div>
                  <div className="inline-flex items-center gap-1 mt-1"><MessageCircle className="w-3 h-3" /> {chat.messages.length}</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}