import { Search, Swords, Users } from 'lucide-react';

export default function ChallengePanel({
  users = [],
  openChallenges = [],
  deckMode = 10,
  selectedQueueMode = 'pvp_ladder',
  onCreateOpenChallenge,
  onInvitePlayer,
  inviteSearch,
  setInviteSearch,
}) {
  const filteredUsers = users.filter((row) => {
    const haystack = [row.full_name, row.email].filter(Boolean).join(' ').toLowerCase();
    return haystack.includes((inviteSearch || '').toLowerCase());
  });

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">Direct challenges</p>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">Use open challenges, direct invites, or public/friends-style callouts. Every challenge shows the chosen deck size clearly to both players.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={onCreateOpenChallenge} className="rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">
            Post open challenge
          </button>
          <span className="rounded-xl border border-border bg-card px-3 py-2 text-[11px] text-muted-foreground">
            Mode: {selectedQueueMode === 'pvp_duo' ? '2v2' : '1v1'} · Deck size: {deckMode}
          </span>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">Invite a specific player</p>
        </div>
        <input
          value={inviteSearch}
          onChange={(e) => setInviteSearch(e.target.value)}
          placeholder="Search by player name or email"
          className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground outline-none"
        />
        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {filteredUsers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-secondary/20 p-3 text-xs text-muted-foreground">No players found.</div>
          ) : filteredUsers.map((row) => (
            <div key={row.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-secondary/20 px-3 py-3">
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-foreground">{row.full_name || row.email}</p>
                <p className="truncate text-[10px] text-muted-foreground">{row.email}</p>
              </div>
              <button onClick={() => onInvitePlayer(row)} className="rounded-lg border border-primary/20 bg-primary/10 px-3 py-1.5 text-[11px] font-semibold text-primary">
                Challenge
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Swords className="w-4 h-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">Open challenge board</p>
        </div>
        <div className="space-y-2">
          {openChallenges.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-secondary/20 p-3 text-xs text-muted-foreground">No open challenges posted yet.</div>
          ) : openChallenges.map((challenge) => (
            <div key={challenge.id} className="rounded-xl border border-border bg-secondary/20 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-foreground">{challenge.display_name || challenge.user_email}</p>
                  <p className="text-[10px] text-muted-foreground">Deck: {challenge.deck_mode}-card · {challenge.queue_mode === 'pvp_duo' ? '2v2' : '1v1'}</p>
                </div>
                <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-medium text-primary">Open</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}