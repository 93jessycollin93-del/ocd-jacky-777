import { Users, MessageSquare, Plus, ShieldCheck } from 'lucide-react';

const COLLABS = [
  { name: 'Alex Chen', role: 'Advisor', focus: 'Risk review and portfolio balance' },
  { name: 'Maya Brooks', role: 'Friend', focus: 'Weekly market ideas and trade watchlist' }
];

export default function InvestmentCollaborationPanel() {
  return (
    <div className="px-4 pb-4">
      <div className="bg-card border border-border rounded-2xl p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">Collaboration</h3>
          </div>
          <button className="text-[10px] px-2.5 py-1 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
            <Plus className="w-3 h-3" /> Invite
          </button>
        </div>
        <div className="mb-3 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 flex items-start gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-primary mt-0.5" />
          <p className="text-[10px] text-muted-foreground leading-relaxed">Collaborate on strategy ideas, share notes, and keep advisor feedback in one place.</p>
        </div>
        <div className="space-y-2">
          {COLLABS.map((person) => (
            <div key={person.name} className="rounded-xl bg-secondary/50 border border-border px-3 py-3 flex flex-col sm:flex-row items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
                {person.name.split(' ').map((part) => part[0]).join('')}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-xs font-semibold">{person.name}</p>
                  <span className="text-[10px] text-muted-foreground">{person.role}</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">{person.focus}</p>
              </div>
              <button className="text-[10px] px-2 py-1 rounded-lg bg-secondary border border-border text-muted-foreground flex items-center gap-1 self-start sm:self-auto">
                <MessageSquare className="w-3 h-3" /> Chat
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}