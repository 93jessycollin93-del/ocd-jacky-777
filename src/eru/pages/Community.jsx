import { useEffect, useMemo, useState, useCallback } from 'react';
import { base44 } from '@/eru/api/base44Client';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle, Send, Users, Loader2, AlertCircle, Gem, Paperclip, X } from 'lucide-react';

const handleOf = (email = '') => email.split('@')[0] || 'someone';
const initialOf = (email = '') => (email.trim()[0] || '?').toUpperCase();
const timeAgo = (iso) => {
  try { return formatDistanceToNow(new Date(iso), { addSuffix: true }); } catch { return ''; }
};

const JADE_COLOR_LABEL = {
  imperial_green: 'Imperial Green',
  lavender: 'Lavender',
  ice: 'Ice White',
  russet: 'Russet',
  black: 'Black Jade',
};
const jadeLabel = (j) =>
  `${JADE_COLOR_LABEL[j.color_type] || 'Jade'} · ${j.volume_kg ?? '?'}kg · ${j.composite_score ?? 0}%`;

// The Community entities are created in the Base44 Builder; until they exist,
// `base44.entities.X` is undefined. Guard so the page shows a friendly
// "setting up" state instead of throwing.
const COMMUNITY_ENTITIES = ['CommunityPost', 'CommunityPostReaction', 'CommunityPostComment'];
const communityReady = () =>
  COMMUNITY_ENTITIES.every((n) => typeof base44?.entities?.[n]?.list === 'function');

export default function Community() {
  const [me, setMe] = useState(null);
  const [posts, setPosts] = useState([]);
  const [reactions, setReactions] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [setupPending, setSetupPending] = useState(false);

  const [body, setBody] = useState('');
  const [posting, setPosting] = useState(false);
  const [openComments, setOpenComments] = useState(() => new Set());
  const [commentDrafts, setCommentDrafts] = useState({});
  const [busyPost, setBusyPost] = useState(null);

  // Attach-a-jade composer state (Phase 1: share-an-asset posts).
  const [attaching, setAttaching] = useState(false);
  const [myJades, setMyJades] = useState(null); // null = not loaded yet
  const [jadesLoading, setJadesLoading] = useState(false);
  const [selectedJade, setSelectedJade] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    if (!communityReady()) {
      setSetupPending(true);
      setLoading(false);
      return;
    }
    setSetupPending(false);
    try {
      const meRes = await base44.auth.me();
      // Reads are gated by RLS to public rows (+ the caller's own).
      const [postRows, reactionRows, commentRows] = await Promise.all([
        base44.entities.CommunityPost.list('-created_date', 100),
        base44.entities.CommunityPostReaction.list('-created_date', 1000),
        base44.entities.CommunityPostComment.list('-created_date', 1000),
      ]);
      setMe(meRes);
      setPosts(postRows || []);
      setReactions(reactionRows || []);
      setComments(commentRows || []);
    } catch (err) {
      console.error('Community load failed:', err);
      setError(err?.message || 'Could not load the community feed.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Derive per-post tallies from the fetched rows (source of truth), rather
  // than a client-incremented counter that could be tampered with.
  const reactionsByPost = useMemo(() => {
    const map = {};
    for (const r of reactions) (map[r.post_id] ||= []).push(r);
    return map;
  }, [reactions]);

  const commentsByPost = useMemo(() => {
    const map = {};
    for (const c of comments) (map[c.post_id] ||= []).push(c);
    for (const id of Object.keys(map)) {
      map[id].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
    }
    return map;
  }, [comments]);

  const myReactionFor = useCallback(
    (postId) => reactions.find((r) => r.post_id === postId && r.created_by === me?.email) || null,
    [reactions, me]
  );

  // Lazily load the caller's own jade only when they open the attach picker,
  // so the feed itself never pays for this query.
  const openAttach = useCallback(async () => {
    setAttaching((v) => !v);
    if (myJades !== null || jadesLoading || !me?.email) return;
    setJadesLoading(true);
    try {
      const rows = await base44.entities.JadeAsset.list('-created_date', 100);
      setMyJades((rows || []).filter((j) => j.created_by === me.email));
    } catch (err) {
      console.error('Could not load your jade:', err);
      setMyJades([]);
    } finally {
      setJadesLoading(false);
    }
  }, [myJades, jadesLoading, me]);

  const handlePost = async () => {
    const text = body.trim();
    if ((!text && !selectedJade) || posting) return;
    setPosting(true);
    try {
      const payload = selectedJade
        ? {
            body: text || `Sharing my ${jadeLabel(selectedJade)}`,
            post_type: 'jade',
            ref_id: selectedJade.id,
            ref_label: jadeLabel(selectedJade),
            is_public: true,
          }
        : { body: text, post_type: 'text', is_public: true };
      const created = await base44.entities.CommunityPost.create(payload);
      // Prepend optimistically so it shows immediately even before a reload.
      setPosts((prev) => [
        { ...payload, ...created, created_by: me?.email, created_date: new Date().toISOString() },
        ...prev,
      ]);
      setBody('');
      setSelectedJade(null);
      setAttaching(false);
    } catch (err) {
      console.error('Post failed:', err);
      setError(err?.message || 'Could not publish your post.');
    } finally {
      setPosting(false);
    }
  };

  const toggleLike = async (postId) => {
    if (busyPost) return;
    setBusyPost(postId);
    const existing = myReactionFor(postId);
    try {
      if (existing) {
        await base44.entities.CommunityPostReaction.delete(existing.id);
        setReactions((prev) => prev.filter((r) => r.id !== existing.id));
      } else {
        const created = await base44.entities.CommunityPostReaction.create({
          post_id: postId,
          reaction: 'like',
          is_public: true,
        });
        setReactions((prev) => [{ ...created, post_id: postId, created_by: me?.email }, ...prev]);
      }
    } catch (err) {
      console.error('Reaction failed:', err);
      setError(err?.message || 'Could not update your reaction.');
    } finally {
      setBusyPost(null);
    }
  };

  const toggleCommentsOpen = (postId) => {
    setOpenComments((prev) => {
      const next = new Set(prev);
      next.has(postId) ? next.delete(postId) : next.add(postId);
      return next;
    });
  };

  const addComment = async (postId) => {
    const text = (commentDrafts[postId] || '').trim();
    if (!text || busyPost) return;
    setBusyPost(postId);
    try {
      const created = await base44.entities.CommunityPostComment.create({
        post_id: postId,
        body: text,
        is_public: true,
      });
      setComments((prev) => [
        { ...created, post_id: postId, body: text, created_by: me?.email, created_date: new Date().toISOString() },
        ...prev,
      ]);
      setCommentDrafts((prev) => ({ ...prev, [postId]: '' }));
    } catch (err) {
      console.error('Comment failed:', err);
      setError(err?.message || 'Could not post your comment.');
    } finally {
      setBusyPost(null);
    }
  };

  if (setupPending) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6 text-foreground">
        <header className="mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-semibold">Community</h1>
        </header>
        <div className="rounded-2xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
          Community is being set up — check back soon.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 space-y-4 text-foreground">
      <header className="flex items-center gap-2">
        <Users className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-semibold">Community</h1>
      </header>

      {/* Composer */}
      <div className="rounded-2xl border border-border bg-card p-3 space-y-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={2000}
          rows={3}
          placeholder="Share something with the community…"
          className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        {selectedJade && (
          <div className="flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-3 py-2">
            <Gem className="w-4 h-4 text-primary shrink-0" />
            <span className="flex-1 truncate text-sm text-primary">{jadeLabel(selectedJade)}</span>
            <button onClick={() => setSelectedJade(null)} className="text-primary/70 hover:text-primary" aria-label="Remove attachment">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {attaching && !selectedJade && (
          <div className="rounded-xl border border-border bg-secondary/40 p-2">
            {jadesLoading ? (
              <div className="flex items-center justify-center py-4 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /></div>
            ) : (myJades && myJades.length > 0) ? (
              <div className="max-h-40 space-y-1 overflow-y-auto">
                {myJades.map((j) => (
                  <button
                    key={j.id}
                    onClick={() => { setSelectedJade(j); setAttaching(false); }}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-secondary"
                  >
                    <Gem className="w-4 h-4 text-primary shrink-0" />
                    <span className="truncate">{jadeLabel(j)}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="px-2 py-3 text-center text-xs text-muted-foreground">You don't own any jade yet.</p>
            )}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-muted-foreground">{body.length}/2000</span>
            <button
              onClick={openAttach}
              className={`inline-flex items-center gap-1 text-[11px] transition-colors ${attaching ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Paperclip className="w-3.5 h-3.5" /> Attach jade
            </button>
          </div>
          <button
            onClick={handlePost}
            disabled={(!body.trim() && !selectedJade) || posting}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Post
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={load} className="text-xs underline">Retry</button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
          No posts yet — be the first to share something.
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => {
            const likeRows = reactionsByPost[post.id] || [];
            const postComments = commentsByPost[post.id] || [];
            const liked = !!myReactionFor(post.id);
            const commentsOpen = openComments.has(post.id);
            return (
              <article key={post.id} className="rounded-2xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                    {initialOf(post.created_by)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">@{handleOf(post.created_by)}</p>
                    <p className="text-[11px] text-muted-foreground">{timeAgo(post.created_date)}</p>
                  </div>
                </div>

                <p className="whitespace-pre-wrap break-words text-sm">{post.body}</p>

                {post.post_type === 'jade' && post.ref_label && (
                  <Link
                    to="/jta"
                    className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 transition-colors hover:bg-primary/10"
                  >
                    <Gem className="w-4 h-4 text-primary shrink-0" />
                    <span className="truncate text-sm font-medium text-primary">{post.ref_label}</span>
                    <span className="ml-auto text-[10px] uppercase tracking-wide text-muted-foreground">Jade</span>
                  </Link>
                )}

                <div className="flex items-center gap-4 pt-1">
                  <button
                    onClick={() => toggleLike(post.id)}
                    disabled={busyPost === post.id}
                    className={`inline-flex items-center gap-1.5 text-sm transition-colors disabled:opacity-50 ${liked ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    <Heart className="w-4 h-4" fill={liked ? 'currentColor' : 'none'} />
                    {likeRows.length}
                  </button>
                  <button
                    onClick={() => toggleCommentsOpen(post.id)}
                    className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                  >
                    <MessageCircle className="w-4 h-4" />
                    {postComments.length}
                  </button>
                </div>

                {commentsOpen && (
                  <div className="space-y-2 border-t border-border pt-3">
                    {postComments.map((c) => (
                      <div key={c.id} className="flex gap-2">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-semibold text-muted-foreground">
                          {initialOf(c.created_by)}
                        </div>
                        <div className="min-w-0 flex-1 rounded-xl bg-secondary/60 px-3 py-1.5">
                          <p className="text-[11px] font-medium text-muted-foreground">@{handleOf(c.created_by)}</p>
                          <p className="whitespace-pre-wrap break-words text-sm">{c.body}</p>
                        </div>
                      </div>
                    ))}
                    <div className="flex items-center gap-2">
                      <input
                        value={commentDrafts[post.id] || ''}
                        onChange={(e) => setCommentDrafts((prev) => ({ ...prev, [post.id]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === 'Enter') addComment(post.id); }}
                        maxLength={1000}
                        placeholder="Write a comment…"
                        className="flex-1 rounded-xl border border-border bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
                      />
                      <button
                        onClick={() => addComment(post.id)}
                        disabled={!(commentDrafts[post.id] || '').trim() || busyPost === post.id}
                        className="inline-flex items-center justify-center rounded-xl bg-primary px-3 py-2 text-primary-foreground disabled:opacity-50"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
