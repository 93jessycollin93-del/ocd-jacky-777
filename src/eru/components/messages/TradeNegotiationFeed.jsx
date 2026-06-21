import { useMemo, useState } from 'react';
import { base44 } from '@/eru/api/base44Client';
import { useAuth } from '@/eru/lib/AuthContext';
import { useRealtimeEntityList } from '@/eru/hooks/useLiveSync';
import { Gem, Send, Swords, MessageCircle } from 'lucide-react';

function buildInventory(jadeAssets = [], cards = [], listings = []) {
  return [
    ...jadeAssets.map((item) => ({
      key: `jade-${item.id}`,
      asset_type: 'jade',
      asset_id: item.id,
      title: `${item.crafted_form || 'jade'} · ${String(item.color_type || '').replaceAll('_', ' ')}`,
      subtitle: `Score ${Number(item.composite_score || 0).toFixed(0)} · ${item.volume_kg}kg`,
      snapshot: item,
    })),
    ...cards.map((item) => ({
      key: `card-${item.id}`,
      asset_type: 'card',
      asset_id: item.id,
      title: item.name,
      subtitle: `${item.rarity} · ${item.element} · power ${item.power}`,
      snapshot: item,
    })),
    ...listings.map((item) => ({
      key: `listing-${item.id}`,
      asset_type: 'listing',
      asset_id: item.id,
      title: item.title,
      subtitle: `${item.sale_mode} · ${item.base_price} ${item.currency}`,
      snapshot: item,
    })),
  ];
}

export default function TradeNegotiationFeed({ onOpenChat }) {
  const { user } = useAuth();
  const ownerQuery = useMemo(() => user?.email ? { created_by: user.email } : {}, [user?.email]);
  const tradePostEnabled = Boolean(base44.entities?.TradeNegotiationPost);
  const tradeChatEnabled = Boolean(base44.entities?.TradeNegotiationChat);
  const { data: posts } = useRealtimeEntityList('TradeNegotiationPost', { sort: '-created_date', limit: 50, enabled: tradePostEnabled });
  const { data: jadeAssets } = useRealtimeEntityList('JadeAsset', { query: ownerQuery, sort: '-updated_date', limit: 50, enabled: !!user?.email });
  const { data: cards } = useRealtimeEntityList('Card', { query: ownerQuery, sort: '-updated_date', limit: 50, enabled: !!user?.email });
  const { data: listings } = useRealtimeEntityList('StorefrontListing', { query: ownerQuery, sort: '-updated_date', limit: 50, enabled: !!user?.email });

  const inventory = useMemo(() => buildInventory(jadeAssets, cards, listings), [jadeAssets, cards, listings]);
  const [selectedKey, setSelectedKey] = useState('');
  const [description, setDescription] = useState('');
  const [askingFor, setAskingFor] = useState('');
  const [posting, setPosting] = useState(false);

  const selectedAsset = inventory.find((item) => item.key === selectedKey) || null;

  const handlePost = async () => {
    if (!user || !selectedAsset || !base44.entities?.TradeNegotiationPost) return;
    setPosting(true);
    try {
      await base44.entities.TradeNegotiationPost.create({
        author_email: user.email,
        author_name: user.full_name || user.email.split('@')[0],
        asset_type: selectedAsset.asset_type,
        asset_id: selectedAsset.asset_id,
        title: selectedAsset.title,
        description: description.trim(),
        asking_for: askingFor.trim(),
        status: 'open',
        asset_snapshot: selectedAsset.snapshot,
        chat_count: 0,
      });
      setSelectedKey('');
      setDescription('');
      setAskingFor('');
    } finally {
      setPosting(false);
    }
  };

  const handleStartNegotiation = async (post) => {
    if (!user || post.author_email === user.email || !base44.entities?.TradeNegotiationChat) return;
    const existing = await base44.entities.TradeNegotiationChat.filter({ post_id: post.id, buyer_email: user.email }, '-created_date', 1);
    if (existing?.[0]) {
      onOpenChat(existing[0].id);
      return;
    }

    const chat = await base44.entities.TradeNegotiationChat.create({
      post_id: post.id,
      post_title: post.title,
      asset_type: post.asset_type,
      asset_id: post.asset_id,
      seller_email: post.author_email,
      buyer_email: user.email,
      status: 'active',
      messages: [
        {
          id: `m-${Date.now()}`,
          author: user.full_name || user.email.split('@')[0],
          author_email: user.email,
          text: `Hi, I want to negotiate for ${post.title}.`,
          created_at: new Date().toISOString(),
        },
      ],
      last_message: `Hi, I want to negotiate for ${post.title}.`,
    });
    if (base44.entities?.TradeNegotiationPost) {
      await base44.entities.TradeNegotiationPost.update(post.id, { chat_count: Number(post.chat_count || 0) + 1, status: 'negotiating' });
    }
    onOpenChat(chat.id);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Swords className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Post trade offer from inventory</h3>
        </div>
        <select value={selectedKey} onChange={(e) => setSelectedKey(e.target.value)} className="w-full rounded-xl border border-border bg-secondary px-3 py-3 text-sm text-foreground outline-none">
          <option value="">Choose inventory item</option>
          {inventory.map((item) => (
            <option key={item.key} value={item.key}>{item.title} · {item.subtitle}</option>
          ))}
        </select>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe your item, negotiation terms, or trade angle..." className="w-full min-h-[88px] rounded-xl border border-border bg-secondary px-3 py-3 text-sm text-foreground outline-none resize-none" />
        <input value={askingFor} onChange={(e) => setAskingFor(e.target.value)} placeholder="What are you looking for in return?" className="w-full rounded-xl border border-border bg-secondary px-3 py-3 text-sm text-foreground outline-none" />
        <button onClick={handlePost} disabled={!selectedAsset || posting || !tradePostEnabled} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">
          <Send className="h-4 w-4" /> {posting ? 'Posting...' : 'Post negotiation offer'}
        </button>
        {!tradePostEnabled && <p className="text-[11px] text-muted-foreground">Negotiation feed is still initializing.</p>}
      </div>

      <div className="space-y-3">
        {posts.map((post) => (
          <div key={post.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">{post.title}</p>
                <p className="text-[11px] text-muted-foreground">by {post.author_name} · {post.asset_type} · {post.status}</p>
              </div>
              <div className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary">{post.chat_count || 0} chats</div>
            </div>
            {post.description ? <p className="mt-2 text-sm text-foreground">{post.description}</p> : null}
            {post.asking_for ? <p className="mt-2 text-xs text-muted-foreground">Looking for: {post.asking_for}</p> : null}
            <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-border bg-secondary/30 p-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Gem className="h-3.5 w-3.5 text-primary" />
                  <p className="truncate text-xs font-semibold text-foreground">{post.asset_snapshot?.name || post.asset_snapshot?.title || post.title}</p>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground truncate">Private negotiation starts in chat, then the deal can be finalized in the existing order flow.</p>
              </div>
              <button
                onClick={() => handleStartNegotiation(post)}
                disabled={post.author_email === user?.email || !tradeChatEnabled}
                className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-40"
              >
                <MessageCircle className="h-3.5 w-3.5" /> Negotiate
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}