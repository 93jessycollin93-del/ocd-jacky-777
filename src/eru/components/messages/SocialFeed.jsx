import { useMemo, useState } from 'react';
import { base44 } from '@/eru/api/base44Client';
import { useAuth } from '@/eru/lib/AuthContext';
import { ImagePlus, Send, Swords, Trophy, Wallet } from 'lucide-react';
import { useRealtimeEntityList } from '@/eru/hooks/useLiveSync';

function formatDeckSnapshot(deck = []) {
  return deck.slice(0, 6).map((card) => card.name).join(', ');
}

export default function SocialFeed() {
  const { user } = useAuth();
  const { data: posts } = useRealtimeEntityList('SocialStrategyPost', { sort: '-created_date', limit: 50 });
  const { data: profiles } = useRealtimeEntityList('CardPlayerProfile', { sort: '-updated_date', limit: 100 });
  const { data: battleHistory } = useRealtimeEntityList('CardBattleHistory', { sort: '-created_date', limit: 50 });
  const [mode, setMode] = useState('deck_strategy');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tradeValue, setTradeValue] = useState('');
  const [tradeCurrency, setTradeCurrency] = useState('USD');
  const [nftLabel, setNftLabel] = useState('');
  const [nftImageUrl, setNftImageUrl] = useState('');
  const [publishing, setPublishing] = useState(false);

  const leaderboard = useMemo(() => [...profiles].sort((a, b) => (b.elo_rating || 0) - (a.elo_rating || 0)).slice(0, 5), [profiles]);
  const bestDeckByPlayer = useMemo(() => {
    const map = new Map();
    battleHistory.forEach((match) => {
      const email = match.created_by;
      const current = map.get(email);
      const score = (match.result === 'win' ? 1000 : 0) + (match.player_elo_after || 0);
      if (!current || score > current.score) {
        map.set(email, {
          email,
          deck: match.player_deck_snapshot || [],
          name: `${match.opponent_name || 'Arena'} setup`,
          score,
        });
      }
    });
    return map;
  }, [battleHistory]);

  const publishPost = async () => {
    if (!user || !title.trim()) return;
    setPublishing(true);

    const payload = {
      author_email: user.email,
      author_name: user.full_name || user.email.split('@')[0],
      post_type: mode,
      title: title.trim(),
      content: content.trim(),
      likes: 0,
      copy_count: 0,
    };

    if (mode === 'nft_trade') {
      payload.trade_title = title.trim();
      payload.trade_value = Number(tradeValue || 0);
      payload.trade_currency = tradeCurrency;
      payload.nft_label = nftLabel.trim();
      payload.nft_image_url = nftImageUrl.trim();
    }

    if (mode === 'deck_strategy') {
      const myBestDeck = bestDeckByPlayer.get(user.email);
      payload.deck_name = myBestDeck?.name || 'My strategy deck';
      payload.deck_snapshot = myBestDeck?.deck || [];
    }

    await base44.entities.SocialStrategyPost.create(payload);
    setTitle('');
    setContent('');
    setTradeValue('');
    setTradeCurrency('USD');
    setNftLabel('');
    setNftImageUrl('');
    setPublishing(false);
  };

  const likePost = async (post) => {
    await base44.entities.SocialStrategyPost.update(post.id, { likes: Number(post.likes || 0) + 1 });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Strategy Feed</h3>
          <div className="flex gap-2">
            {[
              ['deck_strategy', 'Deck'],
              ['nft_trade', 'NFT Trade'],
            ].map(([value, label]) => (
              <button key={value} onClick={() => setMode(value)} className={`rounded-full px-2.5 py-1 text-[10px] border ${mode === value ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-secondary text-muted-foreground'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={mode === 'deck_strategy' ? 'Name your deck strategy' : 'Name your NFT trade highlight'} className="w-full rounded-xl border border-border bg-secondary/50 px-3 py-3 text-sm text-foreground outline-none" />
        <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder={mode === 'deck_strategy' ? 'Explain the combo, tempo, counters, and when to use this deck...' : 'Describe the trade, why it worked, and what made it special...'} className="w-full min-h-[96px] rounded-xl border border-border bg-secondary/50 px-3 py-3 text-sm text-foreground outline-none resize-none" />

        {mode === 'nft_trade' && (
          <div className="grid gap-2 sm:grid-cols-2">
            <input value={nftLabel} onChange={(e) => setNftLabel(e.target.value)} placeholder="NFT name" className="w-full rounded-xl border border-border bg-secondary/50 px-3 py-3 text-sm text-foreground outline-none" />
            <input value={nftImageUrl} onChange={(e) => setNftImageUrl(e.target.value)} placeholder="NFT image URL" className="w-full rounded-xl border border-border bg-secondary/50 px-3 py-3 text-sm text-foreground outline-none" />
            <input type="number" value={tradeValue} onChange={(e) => setTradeValue(e.target.value)} placeholder="Trade value" className="w-full rounded-xl border border-border bg-secondary/50 px-3 py-3 text-sm text-foreground outline-none" />
            <input value={tradeCurrency} onChange={(e) => setTradeCurrency(e.target.value)} placeholder="Currency" className="w-full rounded-xl border border-border bg-secondary/50 px-3 py-3 text-sm text-foreground outline-none" />
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Swords className="w-3.5 h-3.5" /> Deck strategy</span>
            <span className="inline-flex items-center gap-1"><ImagePlus className="w-3.5 h-3.5" /> NFT showcase</span>
          </div>
          <button onClick={publishPost} disabled={!title.trim() || publishing} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-40">
            <Send className="w-3.5 h-3.5" /> {publishing ? 'Posting...' : 'Post'}
          </button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="w-4 h-4 text-primary" />
            <h4 className="text-xs font-semibold">Top ranked players</h4>
          </div>
          <div className="space-y-2">
            {leaderboard.map((player, index) => {
              const bestDeck = bestDeckByPlayer.get(player.user_email);
              return (
                <div key={player.id} className="rounded-xl border border-border bg-secondary/40 px-3 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold">#{index + 1} {player.display_name || player.user_email}</p>
                      <p className="text-[11px] text-muted-foreground">ELO {player.elo_rating || 1000} · Wins {player.wins || 0}</p>
                    </div>
                    {bestDeck?.deck?.length > 0 && (
                      <button
                        onClick={async () => {
                          await base44.entities.SocialStrategyPost.create({
                            author_email: player.user_email,
                            author_name: player.display_name || player.user_email,
                            post_type: 'deck_copy',
                            title: `${player.display_name || 'Top player'} deck showcase`,
                            content: `Featured leaderboard deck shared for community copying and study.`,
                            deck_name: bestDeck.name,
                            deck_snapshot: bestDeck.deck,
                            linked_profile_email: player.user_email,
                            likes: 0,
                            copy_count: 0,
                          });
                        }}
                        className="rounded-lg border border-primary/20 bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary"
                      >
                        Share deck
                      </button>
                    )}
                  </div>
                  {bestDeck?.deck?.length > 0 && (
                    <p className="mt-2 text-[11px] text-muted-foreground">{formatDeckSnapshot(bestDeck.deck)}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Wallet className="w-4 h-4 text-primary" />
            <h4 className="text-xs font-semibold">Copyable deck ideas</h4>
          </div>
          <div className="space-y-2">
            {posts.filter((post) => ['deck_strategy', 'deck_copy'].includes(post.post_type) && (post.deck_snapshot || []).length > 0).slice(0, 4).map((post) => (
              <div key={post.id} className="rounded-xl border border-border bg-secondary/40 px-3 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold">{post.title}</p>
                    <p className="text-[11px] text-muted-foreground">by {post.author_name}</p>
                  </div>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">{post.deck_snapshot.length} cards</span>
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">{formatDeckSnapshot(post.deck_snapshot)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {posts.map((post) => (
          <div key={post.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div>
                <p className="text-sm font-semibold">{post.author_name}</p>
                <p className="text-[11px] text-muted-foreground capitalize">{post.post_type.replace('_', ' ')}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => likePost(post)} className="text-[11px] text-muted-foreground">{post.likes || 0} likes</button>
                {(post.deck_snapshot || []).length > 0 && <span className="text-[11px] text-primary">{post.copy_count || 0} copies</span>}
              </div>
            </div>
            <p className="text-sm font-semibold text-foreground">{post.title}</p>
            {post.content && <p className="mt-2 text-sm text-foreground leading-relaxed">{post.content}</p>}
            {post.trade_title && (
              <div className="mt-3 rounded-xl border border-border bg-secondary/30 p-3">
                <p className="text-xs font-semibold text-foreground">{post.nft_label || post.trade_title}</p>
                <p className="text-[11px] text-muted-foreground">Best trade: {post.trade_value || 0} {post.trade_currency || 'USD'}</p>
                {post.nft_image_url && <img src={post.nft_image_url} alt={post.nft_label || post.trade_title} className="mt-3 h-40 w-full rounded-xl object-cover" />}
              </div>
            )}
            {(post.deck_snapshot || []).length > 0 && (
              <div className="mt-3 rounded-xl border border-border bg-secondary/30 p-3">
                <p className="text-xs font-semibold text-foreground">{post.deck_name || 'Deck composition'}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{formatDeckSnapshot(post.deck_snapshot)}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}