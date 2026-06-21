import { useEffect, useState } from 'react';
import { Sparkles, BookOpen } from 'lucide-react';
import { base44 } from '@/eru/api/base44Client';
import { useAuth } from '@/eru/lib/AuthContext';
import LorePopularityChart from '@/eru/components/insights/LorePopularityChart';
import ExtractionTrendChart from '@/eru/components/insights/ExtractionTrendChart';

/**
 * LoreInsights
 * ----------------------------------------------------------------------------
 * Personal summary page combining:
 *   1. Most popular card lore types in the player's collection
 *   2. Recent asset extraction (excavation event) trends
 *
 * Read-only — pulls each player's own scoped data via existing entities.
 * Mobile-first stacked layout, side-by-side from `lg`.
 */
export default function LoreInsights() {
  const { currentUser } = useAuth();
  const [cards, setCards] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!currentUser?.email) return;
      setLoading(true);
      const [c, e] = await Promise.all([
        base44.entities.Card.filter({ created_by: currentUser.email }, '-created_date', 500).catch(() => []),
        base44.entities.ExcavationEvent.filter({ user_email: currentUser.email }, '-created_date', 200).catch(() => []),
      ]);
      if (!mounted) return;
      setCards(c || []);
      setEvents(e || []);
      setLoading(false);
    };
    load();
    return () => { mounted = false; };
  }, [currentUser?.email]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="px-4 py-4 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-primary" />
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Insights</p>
        </div>
        <h1 className="text-xl font-semibold text-foreground mt-1">Lore & Extractions</h1>
        <p className="text-sm text-muted-foreground mt-1 inline-flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          The most popular lore types in your collection and your recent extraction trend.
        </p>
      </div>

      <div className="px-4 py-4 max-w-5xl mx-auto space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <LorePopularityChart cards={cards} loading={loading} />
          <ExtractionTrendChart events={events} loading={loading} />
        </div>
      </div>
    </div>
  );
}