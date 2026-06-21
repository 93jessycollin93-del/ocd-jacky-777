import { useEffect, useState } from 'react';
import { LineChart, Sparkles } from 'lucide-react';
import { base44 } from '@/eru/api/base44Client';
import { useAuth } from '@/eru/lib/AuthContext';
import CardWinsChart from '@/eru/components/progress/CardWinsChart';
import StabilityTrendChart from '@/eru/components/progress/StabilityTrendChart';
import MarketActivityChart from '@/eru/components/progress/MarketActivityChart';
import StudyRecommendations from '@/eru/components/progress/StudyRecommendations';

/**
 * PlayerProgress
 * ----------------------------------------------------------------------------
 * Personal player progress dashboard — three focused charts:
 *  1. Card battle wins (last 14 days, stacked wins/losses)
 *  2. Collection stability trend (per-card stability over time)
 *  3. Market activity (listings + verified trades over time)
 *
 * Read-only — pulls each player's own scoped data via existing entities.
 * No business logic changes. Mobile-first stacked layout, two columns on lg.
 */
export default function PlayerProgress() {
  const { currentUser } = useAuth();
  const [battles, setBattles] = useState([]);
  const [cards, setCards] = useState([]);
  const [listings, setListings] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!currentUser?.email) return;
      setLoading(true);
      const [b, c, l, t] = await Promise.all([
        base44.entities.CardBattleHistory.filter({ created_by: currentUser.email }, '-created_date', 200).catch(() => []),
        base44.entities.Card.filter({ created_by: currentUser.email }, '-created_date', 300).catch(() => []),
        base44.entities.CardListing.filter({ created_by: currentUser.email }, '-created_date', 200).catch(() => []),
        base44.entities.Transaction.filter({ buyer_email: currentUser.email }, '-created_date', 200).catch(() => []),
      ]);
      if (!mounted) return;
      setBattles(b || []);
      setCards(c || []);
      setListings(l || []);
      setTransactions(t || []);
      setLoading(false);
    };
    load();
    return () => { mounted = false; };
  }, [currentUser?.email]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="px-4 py-4 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <LineChart className="w-4 h-4 text-primary" />
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Your progress</p>
        </div>
        <h1 className="text-xl font-semibold text-foreground mt-1">Player Progress</h1>
        <p className="text-sm text-muted-foreground mt-1 inline-flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          Track your battle record, collection stability, and market trend.
        </p>
      </div>

      <div className="px-4 py-4 max-w-5xl mx-auto space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <CardWinsChart battles={battles} loading={loading} />
          <StabilityTrendChart cards={cards} loading={loading} />
        </div>
        <MarketActivityChart listings={listings} transactions={transactions} loading={loading} />
        <StudyRecommendations />
      </div>
    </div>
  );
}