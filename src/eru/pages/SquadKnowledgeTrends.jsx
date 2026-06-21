import { useEffect, useState } from 'react';
import { base44 } from '@/eru/api/base44Client';
import SquadKnowledgeTrendsDashboard from '../components/ailab/SquadKnowledgeTrendsDashboard.jsx';

export default function SquadKnowledgeTrends() {
  const [knowledgeItems, setKnowledgeItems] = useState([]);
  const [bots, setBots] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.SquadKnowledge.list('-updated_date', 200),
      base44.entities.UserBot.list('-updated_date', 200),
    ]).then(([knowledgeRows, botRows]) => {
      setKnowledgeItems(knowledgeRows || []);
      setBots(botRows || []);
      setLoading(false);
    });
  }, []);

  return (
    <div className="min-h-screen bg-background px-4 py-4 md:px-6 md:py-6">
      <div className="mx-auto max-w-7xl space-y-4">
        {loading ? (
          <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <SquadKnowledgeTrendsDashboard knowledgeItems={knowledgeItems} bots={bots} />
        )}
      </div>
    </div>
  );
}