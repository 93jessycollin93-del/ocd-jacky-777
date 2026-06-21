import { useState } from 'react';
import { MessageSquareMore, PencilLine, SendHorizonal, Target } from 'lucide-react';

const INITIAL_NOTES = [
  {
    id: 1,
    author: 'Alex Chen',
    role: 'Advisor',
    text: 'Reduce concentration risk by trimming oversized crypto positions and rotating a portion into lower-volatility assets.'
  },
  {
    id: 2,
    author: 'You',
    role: 'Builder',
    text: 'I want to keep upside exposure but set a clearer max allocation per position and review monthly.'
  }
];

export default function StrategyWorkspace() {
  const [strategyTitle, setStrategyTitle] = useState('Balanced Growth Strategy');
  const [summary, setSummary] = useState('Build a more disciplined investment plan with clearer risk limits, shared notes, and regular review points.');
  const [comment, setComment] = useState('');
  const [notes, setNotes] = useState(INITIAL_NOTES);

  const handleAddComment = () => {
    if (!comment.trim()) return;
    setNotes((prev) => [
      ...prev,
      { id: Date.now(), author: 'You', role: 'Builder', text: comment.trim() }
    ]);
    setComment('');
  };

  return (
    <div className="px-4 pb-4">
      <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Shared Strategy Workspace</h3>
        </div>

        <div className="space-y-2">
          <div className="rounded-xl bg-secondary/50 border border-border p-3">
            <div className="flex items-center gap-2 mb-2">
              <PencilLine className="w-3.5 h-3.5 text-primary" />
              <span className="text-[11px] text-muted-foreground">Strategy title</span>
            </div>
            <input
              value={strategyTitle}
              onChange={(e) => setStrategyTitle(e.target.value)}
              className="w-full bg-transparent text-sm font-semibold outline-none text-foreground"
            />
          </div>

          <div className="rounded-xl bg-secondary/50 border border-border p-3">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquareMore className="w-3.5 h-3.5 text-primary" />
              <span className="text-[11px] text-muted-foreground">Shared summary</span>
            </div>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="w-full min-h-[96px] bg-transparent text-xs leading-relaxed outline-none resize-none text-foreground"
            />
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Discussion</p>
          <div className="space-y-2">
            {notes.map((note) => (
              <div key={note.id} className="rounded-xl border border-border bg-secondary/40 p-3">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <p className="text-xs font-semibold text-foreground">{note.author}</p>
                  <span className="text-[10px] text-muted-foreground">{note.role}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{note.text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-background/40 p-3">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add a note for your friend or advisor..."
            className="w-full min-h-[72px] bg-transparent text-xs outline-none resize-none text-foreground placeholder:text-muted-foreground"
          />
          <div className="flex justify-end mt-2">
            <button
              onClick={handleAddComment}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-3 py-2 text-xs font-medium"
            >
              <SendHorizonal className="w-3.5 h-3.5" /> Add Comment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}