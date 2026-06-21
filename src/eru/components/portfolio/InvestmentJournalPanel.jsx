import { useEffect, useState } from 'react';
import { NotebookPen, Plus } from 'lucide-react';
import { base44 } from '@/eru/api/base44Client';

const EMPTY_ENTRY = {
  title: '',
  asset_symbol: '',
  trade_type: 'note',
  notes: '',
  performance_goal: '',
  emotional_state: 'calm',
  outcome: 'open',
  tags: '',
};

export default function InvestmentJournalPanel() {
  const [entries, setEntries] = useState([]);
  const [form, setForm] = useState(EMPTY_ENTRY);
  const [showForm, setShowForm] = useState(false);

  const loadEntries = async () => {
    const data = await base44.entities.InvestmentJournalEntry.list('-created_date', 50);
    setEntries(data || []);
  };

  useEffect(() => {
    loadEntries();
  }, []);

  const saveEntry = async () => {
    if (!form.title.trim()) return;
    await base44.entities.InvestmentJournalEntry.create({
      ...form,
      tags: form.tags ? form.tags.split(',').map((item) => item.trim()).filter(Boolean) : [],
    });
    setForm(EMPTY_ENTRY);
    setShowForm(false);
    loadEntries();
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <NotebookPen className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Investment Journal</h3>
        </div>
        <button onClick={() => setShowForm((prev) => !prev)} className="flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-lg text-xs font-medium">
          <Plus className="w-3 h-3" /> New Entry
        </button>
      </div>

      {showForm && (
        <div className="bg-secondary rounded-xl border border-border/50 p-3 space-y-2">
          <input value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} placeholder="Entry title" className="w-full bg-card border border-border rounded-lg px-3 py-2 text-xs outline-none" />
          <div className="grid grid-cols-2 gap-2">
            <input value={form.asset_symbol} onChange={(e) => setForm((prev) => ({ ...prev, asset_symbol: e.target.value }))} placeholder="Asset" className="bg-card border border-border rounded-lg px-3 py-2 text-xs outline-none" />
            <select value={form.trade_type} onChange={(e) => setForm((prev) => ({ ...prev, trade_type: e.target.value }))} className="bg-card border border-border rounded-lg px-3 py-2 text-xs outline-none">
              <option value="buy">Buy</option>
              <option value="sell">Sell</option>
              <option value="hold">Hold</option>
              <option value="rebalance">Rebalance</option>
              <option value="note">Note</option>
            </select>
            <select value={form.emotional_state} onChange={(e) => setForm((prev) => ({ ...prev, emotional_state: e.target.value }))} className="bg-card border border-border rounded-lg px-3 py-2 text-xs outline-none">
              <option value="confident">Confident</option>
              <option value="calm">Calm</option>
              <option value="fearful">Fearful</option>
              <option value="greedy">Greedy</option>
              <option value="uncertain">Uncertain</option>
              <option value="disciplined">Disciplined</option>
            </select>
            <select value={form.outcome} onChange={(e) => setForm((prev) => ({ ...prev, outcome: e.target.value }))} className="bg-card border border-border rounded-lg px-3 py-2 text-xs outline-none">
              <option value="open">Open</option>
              <option value="win">Win</option>
              <option value="loss">Loss</option>
              <option value="mixed">Mixed</option>
              <option value="watching">Watching</option>
            </select>
          </div>
          <input value={form.performance_goal} onChange={(e) => setForm((prev) => ({ ...prev, performance_goal: e.target.value }))} placeholder="Performance goal" className="w-full bg-card border border-border rounded-lg px-3 py-2 text-xs outline-none" />
          <input value={form.tags} onChange={(e) => setForm((prev) => ({ ...prev, tags: e.target.value }))} placeholder="Tags separated by commas" className="w-full bg-card border border-border rounded-lg px-3 py-2 text-xs outline-none" />
          <textarea value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} placeholder="What happened? What did you learn?" className="w-full min-h-[90px] bg-card border border-border rounded-lg px-3 py-2 text-xs outline-none resize-none" />
          <div className="flex gap-2">
            <button onClick={saveEntry} className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-semibold">Save Entry</button>
            <button onClick={() => setShowForm(false)} className="flex-1 py-2 bg-card border border-border rounded-lg text-xs text-muted-foreground">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {entries.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No journal entries yet. Track trades, emotions, and lessons here.</p>
        ) : entries.map((entry) => (
          <div key={entry.id} className="bg-secondary rounded-xl border border-border/50 p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-semibold">{entry.title}</p>
                <p className="text-[10px] text-muted-foreground uppercase">{entry.trade_type} · {entry.asset_symbol || 'General'} · {entry.emotional_state}</p>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">{entry.outcome}</span>
            </div>
            {entry.performance_goal && <p className="text-[10px] text-muted-foreground">Goal: {entry.performance_goal}</p>}
            {entry.notes && <p className="text-xs text-foreground leading-relaxed">{entry.notes}</p>}
            {entry.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {entry.tags.map((tag) => <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-card border border-border text-muted-foreground">#{tag}</span>)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}