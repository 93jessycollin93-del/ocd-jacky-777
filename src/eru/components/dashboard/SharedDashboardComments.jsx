import { useEffect, useState } from 'react';
import { base44 } from '@/eru/api/base44Client';
import { MessageSquare, Send, CheckCircle2 } from 'lucide-react';

const DASHBOARD_KEY = 'main-dashboard';
const WIDGET_OPTIONS = [
  { id: 'collector-rewards', label: 'Collector Reward Status' },
  { id: 'active-bots', label: 'Active Bots' },
  { id: 'quick-stats', label: 'Quick Stats' },
  { id: 'market-pins', label: 'Pinned Market Metrics' },
  { id: 'news-feed', label: 'News Feed' },
  { id: 'ai-insights', label: 'AI Insights' },
];

export default function SharedDashboardComments() {
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [widgetId, setWidgetId] = useState(WIDGET_OPTIONS[0].id);
  const [dataPointLabel, setDataPointLabel] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;

    const sortComments = (items) => [...items]
      .filter((item) => item.dashboard_key === DASHBOARD_KEY)
      .sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0))
      .slice(0, 20);

    const load = async () => {
      try {
        const data = await base44.entities.SharedDashboardComment.filter({ dashboard_key: DASHBOARD_KEY }, '-created_date', 20);
        if (mounted) setComments(sortComments(data || []));
      } catch (error) {
        if (error?.status !== 429) {
          throw error;
        }
      }
    };

    load().catch(() => {});
    const unsubscribe = base44.entities.SharedDashboardComment.subscribe((event) => {
      if (event.type === 'delete') {
        setComments((prev) => prev.filter((item) => item.id !== event.id));
        return;
      }
      if (event.data?.dashboard_key !== DASHBOARD_KEY) return;
      setComments((prev) => sortComments([event.data, ...prev.filter((item) => item.id !== event.id)]));
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const selectedWidget = WIDGET_OPTIONS.find((item) => item.id === widgetId);

  const submitComment = async () => {
    if (!commentText.trim()) return;
    setSubmitting(true);
    await base44.entities.SharedDashboardComment.create({
      dashboard_key: DASHBOARD_KEY,
      widget_id: widgetId,
      widget_label: selectedWidget?.label || 'Dashboard Widget',
      data_point_label: dataPointLabel.trim(),
      comment_text: commentText.trim(),
      status: 'open',
    });
    setCommentText('');
    setDataPointLabel('');
    setSubmitting(false);
  };

  const resolveComment = async (comment) => {
    await base44.entities.SharedDashboardComment.update(comment.id, { status: 'resolved' });
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-primary" />
        <p className="text-sm font-semibold">Widget comments</p>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">Add comments tied to a widget or a specific data point for shared review.</p>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <select value={widgetId} onChange={(e) => setWidgetId(e.target.value)} className="min-h-11 rounded-xl border border-border bg-secondary px-3 py-2 text-sm outline-none">
          {WIDGET_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
        </select>
        <input value={dataPointLabel} onChange={(e) => setDataPointLabel(e.target.value)} placeholder="Optional data point" className="min-h-11 rounded-xl border border-border bg-secondary px-3 py-2 text-sm outline-none" />
        <button onClick={submitComment} disabled={submitting || !commentText.trim()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
          <Send className="w-4 h-4" /> {submitting ? 'Posting...' : 'Post comment'}
        </button>
      </div>

      <textarea value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Leave a note for collaborators..." className="mt-2 min-h-[96px] w-full rounded-2xl border border-border bg-secondary px-3 py-3 text-sm outline-none" />

      <div className="mt-4 space-y-3">
        {comments.length === 0 ? (
          <p className="text-xs text-muted-foreground">No comments yet.</p>
        ) : comments.map((comment) => (
          <div key={comment.id} className="rounded-xl border border-border bg-secondary/40 p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-foreground">{comment.widget_label || 'Dashboard Widget'}</p>
                <p className="text-[10px] text-muted-foreground">
                  {comment.data_point_label ? `Data point: ${comment.data_point_label}` : 'General widget note'}
                </p>
              </div>
              {comment.status === 'resolved' ? (
                <span className="rounded-full border border-green-400/20 bg-green-400/10 px-2 py-1 text-[10px] text-green-400">Resolved</span>
              ) : (
                <button onClick={() => resolveComment(comment)} className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-1 text-[10px] text-muted-foreground">
                  <CheckCircle2 className="w-3 h-3" /> Resolve
                </button>
              )}
            </div>
            <p className="mt-2 text-sm text-foreground">{comment.comment_text}</p>
            <p className="mt-2 text-[10px] text-muted-foreground">{new Date(comment.created_date).toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}