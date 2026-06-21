import { useMemo, useState } from 'react';
import { base44 } from '@/eru/api/base44Client';
import { Database, Search } from 'lucide-react';
import SquadKnowledgeMetrics from './SquadKnowledgeMetrics';
import SquadKnowledgeRecordCard from './SquadKnowledgeRecordCard';

function getMatches(entry, query) {
  const text = [entry.goal, entry.result_summary, entry.source_squad_name, ...(entry.keywords || [])].join(' ').toLowerCase();
  return query.toLowerCase().split(' ').filter((word) => word.length > 2 && text.includes(word)).length;
}

export default function SquadKnowledgePanel({ knowledgeItems, search, setSearch, bots = [], onRefresh }) {
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({ goal: '', source_squad_name: '', result_summary: '', keywords: '' });

  const filtered = useMemo(() => {
    if (!search.trim()) return knowledgeItems;
    return [...knowledgeItems]
      .map((entry) => ({ entry, matches: getMatches(entry, search) }))
      .filter((item) => item.matches > 0)
      .sort((a, b) => b.matches - a.matches)
      .map((item) => item.entry);
  }, [knowledgeItems, search]);

  const handleEdit = (entry) => {
    setEditingId(entry.id);
    setDraft({
      goal: entry.goal || '',
      source_squad_name: entry.source_squad_name || '',
      result_summary: entry.result_summary || '',
      keywords: (entry.keywords || []).join(', '),
    });
  };

  const handleSave = async () => {
    if (!editingId) return;
    await base44.entities.SquadKnowledge.update(editingId, {
      goal: draft.goal,
      source_squad_name: draft.source_squad_name,
      result_summary: draft.result_summary,
      keywords: draft.keywords.split(',').map((item) => item.trim()).filter(Boolean),
    });
    setEditingId(null);
    onRefresh?.();
  };

  const handleDelete = async (entryId) => {
    await base44.entities.SquadKnowledge.delete(entryId);
    if (editingId === entryId) setEditingId(null);
    onRefresh?.();
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Database className="w-4 h-4 text-primary" />
        <div>
          <p className="text-xs font-semibold text-foreground">SquadKnowledge Manager</p>
          <p className="text-[10px] text-muted-foreground">Search, edit, delete, and analyze stored execution knowledge and successful matches.</p>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2">
        <Search className="w-3.5 h-3.5 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search goals, summaries, squad names, or keywords"
          className="w-full bg-transparent text-xs text-foreground outline-none"
        />
      </div>

      <SquadKnowledgeMetrics knowledgeItems={filtered} bots={bots} />

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">No matching knowledge yet.</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((entry) => (
            <SquadKnowledgeRecordCard
              key={entry.id}
              entry={entry}
              editingId={editingId}
              draft={draft}
              onEdit={() => handleEdit(entry)}
              onChange={(field, value) => setDraft((prev) => ({ ...prev, [field]: value }))}
              onSave={handleSave}
              onCancel={() => setEditingId(null)}
              onDelete={() => handleDelete(entry.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}