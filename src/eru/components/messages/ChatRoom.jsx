import { useMemo, useState } from 'react';
import { Lock, Globe2, Mic, MicOff, Send, UserPlus, Package, BadgeDollarSign } from 'lucide-react';
import { useRealtimeEntityList } from '@/eru/hooks/useLiveSync';

export default function ChatRoom({ chat, onSendMessage, onInvite }) {
  const [draft, setDraft] = useState('');
  const [voiceLive, setVoiceLive] = useState(false);
  const { data: listings } = useRealtimeEntityList('StorefrontListing', { sort: '-updated_date', limit: 4 });
  const { data: jadeAssets } = useRealtimeEntityList('JadeAsset', { sort: '-updated_date', limit: 4 });

  const shareCards = useMemo(() => [
    ...listings.slice(0, 2).map((item) => ({ id: item.id, title: item.title, meta: `${item.sale_mode} · $${Number(item.base_price || 0).toLocaleString()}`, icon: BadgeDollarSign })),
    ...jadeAssets.slice(0, 2).map((item) => ({ id: item.id, title: item.name || 'Jade Asset', meta: item.category || 'Collection asset', icon: Package })),
  ], [listings, jadeAssets]);

  const handleSend = () => {
    if (!draft.trim()) return;
    onSendMessage(chat.id, { author: 'You', text: draft.trim(), type: 'text' });
    setDraft('');
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold">{chat.name}</h3>
            {chat.visibility === 'open' ? <Globe2 className="w-3.5 h-3.5 text-primary" /> : <Lock className="w-3.5 h-3.5 text-muted-foreground" />}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">{chat.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => onInvite(chat.id)} className="inline-flex items-center gap-1 rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-muted-foreground">
            <UserPlus className="w-3.5 h-3.5" /> Invite
          </button>
          {chat.voice_enabled && (
            <button onClick={() => setVoiceLive((prev) => !prev)} className={`inline-flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-semibold ${voiceLive ? 'bg-primary text-primary-foreground' : 'border border-border bg-secondary text-muted-foreground'}`}>
              {voiceLive ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
              {voiceLive ? 'Voice live' : 'Enable voice'}
            </button>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-secondary/30 p-3">
        <p className="text-[11px] font-semibold mb-2">Share assets and offers</p>
        <div className="grid gap-2 md:grid-cols-2">
          {shareCards.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} onClick={() => onSendMessage(chat.id, { author: 'You', text: `${item.title} · ${item.meta}`, type: 'share' })} className="rounded-xl border border-border bg-background px-3 py-3 text-left">
                <div className="flex items-center gap-2 mb-1"><Icon className="w-3.5 h-3.5 text-primary" /><p className="text-xs font-semibold">{item.title}</p></div>
                <p className="text-[11px] text-muted-foreground">{item.meta}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
        {chat.messages.map((message) => (
          <div key={message.id} className={`rounded-2xl px-4 py-3 ${message.author === 'You' ? 'bg-primary text-primary-foreground ml-8' : 'bg-secondary/50 text-foreground mr-8'}`}>
            <p className={`text-[11px] mb-1 ${message.author === 'You' ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>{message.author}</p>
            <p className="text-sm leading-relaxed">{message.text}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Message the chat..." className="flex-1 rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm text-foreground outline-none" />
        <button onClick={handleSend} className="rounded-xl bg-primary p-2.5 text-primary-foreground"><Send className="w-4 h-4" /></button>
      </div>
    </div>
  );
}