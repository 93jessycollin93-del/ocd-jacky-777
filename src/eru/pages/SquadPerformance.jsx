import { useEffect, useState } from 'react';
import { base44 } from '@/eru/api/base44Client';
import SquadPerformanceDashboard from '../components/ailab/SquadPerformanceDashboard';

export default function SquadPerformance() {
  const [squads, setSquads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.BotSquad.list('-updated_date', 100).then((rows) => {
      setSquads(rows || []);
      setLoading(false);
    });
  }, []);

  return (
    <div className="min-h-screen bg-background px-4 py-4 md:px-6 md:py-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <p className="text-sm font-semibold text-foreground">Squad Performance Dashboard</p>
          <p className="mt-1 text-xs text-muted-foreground">Track success rates, best bot combinations, and ROI from squad execution history.</p>
        </div>
        {loading ? <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div> : <SquadPerformanceDashboard squads={squads} />}
      </div>
    </div>
  );
}