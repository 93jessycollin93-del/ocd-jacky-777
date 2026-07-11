import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, Pin, MessageSquareQuote, ChevronRight, Loader2 } from 'lucide-react';
import { base44 } from '@/eru/api/base44Client';

/**
 * SavedContentSection
 * ----------------------------------------------------------------------------
 * Read-only summary of the user's saved content surfaces:
 *   - Saved Jackie items
 *   - Pinned cards
 *   - Saved notes
 * Each row links to the full surface for management. No destructive actions
 * here — the page is a lightweight overview / hub.
 */
function CountRow({ icon: Icon, title, description, count, to, loading }) {
  const inner = (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-secondary/20 px-3 py-3 hover:bg-secondary/40 transition-colors">
      <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground leading-snug">{description}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
        ) : (
          <span className="rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[11px] font-semibold text-primary">{count}</span>
        )}
        {to && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </div>
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
}

export default function SavedContentSection({ userEmail }) {
  const [counts, setCounts] = useState({ saved: 0, pinned: 0, notes: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!userEmail) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const [saved, pinned, notes] = await Promise.all([
        base44.entities.JackieSaved?.filter?.({ created_by: userEmail }, '-created_date', 200).catch(() => []) || [],
        base44.entities.PinnedCard?.filter?.({ created_by: userEmail }, '-created_date', 200).catch(() => []) || [],
        base44.entities.Note?.filter?.({ created_by: userEmail }, '-created_date', 200).catch(() => []) || [],
      ]);
      if (!mounted) return;
      setCounts({
        saved: saved?.length || 0,
        pinned: pinned?.length || 0,
        notes: notes?.length || 0,
      });
      setLoading(false);
    };
    load();
    return () => { mounted = false; };
  }, [userEmail]);

  return (
    <section className="bg-card border border-border rounded-2xl p-4 space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-foreground inline-flex items-center gap-2">
          <Bookmark className="w-4 h-4 text-primary" /> Saved content
        </h3>
        <p className="text-xs text-muted-foreground mt-1">Quick access to everything you've bookmarked or pinned.</p>
      </div>

      <div className="space-y-2">
        <CountRow
          icon={MessageSquareQuote}
          title="Saved Jackie replies"
          description="AI replies, prompts, and snippets you've saved for later."
          count={counts.saved}
          to="/jackie"
          loading={loading}
        />
        <CountRow
          icon={Pin}
          title="Pinned cards"
          description="Cards pinned across your collection and bot workspaces."
          count={counts.pinned}
          to="/arena"
          loading={loading}
        />
        <CountRow
          icon={Bookmark}
          title="Notes"
          description="Personal notes attached to bots, pages, and dashboards."
          count={counts.notes}
          loading={loading}
        />
      </div>
    </section>
  );
}