import { ScrollArea } from '@/eru/components/ui/scroll-area';
import { History, Swords, Shield, Crown } from 'lucide-react';
import BattleReplayViewer from './BattleReplayViewer';

export default function BattleHistoryPanel({ matches, selectedMatch, onSelect, loading }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="border-b border-border px-4 py-3">
          <p className="text-sm font-semibold flex items-center gap-2"><History className="w-4 h-4 text-primary" /> Battle History</p>
          <p className="text-[11px] text-muted-foreground mt-1">Review finished matches turn by turn.</p>
        </div>
        <ScrollArea className="h-[24rem] lg:h-[36rem]">
          <div className="p-3 space-y-2">
            {loading ? (
              <p className="text-xs text-muted-foreground px-1 py-4 text-center">Loading battle history...</p>
            ) : matches.length === 0 ? (
              <p className="text-xs text-muted-foreground px-1 py-4 text-center">No finished battles yet.</p>
            ) : matches.map((match) => (
              <button
                key={match.id}
                onClick={() => onSelect(match)}
                className={`w-full rounded-xl border p-3 text-left transition-colors ${selectedMatch?.id === match.id ? 'border-primary bg-primary/10' : 'border-border bg-secondary/40 hover:border-primary/30'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">vs {match.opponent_name}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{match.opponent_faction} · Turn {match.turns_played || 0} · {match.deck_mode || 10}-card · {(match.team_size || 1) === 2 ? '2v2' : '1v1'}</p>
                  </div>
                  <span className={`text-[10px] font-bold uppercase ${match.result === 'win' ? 'text-green-400' : 'text-red-400'}`}>
                    {match.result}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{new Date(match.created_date).toLocaleDateString()}</span>
                  <span>{match.player_board_power} - {match.opponent_board_power}</span>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="border-b border-border px-4 py-3">
          <p className="text-sm font-semibold flex items-center gap-2"><Crown className="w-4 h-4 text-primary" /> Match Review</p>
          <p className="text-[11px] text-muted-foreground mt-1">Study decks, outcome, and the full turn log.</p>
        </div>

        {!selectedMatch ? (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">Select a finished match to review it.</div>
        ) : (
          <div className="p-4 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl bg-secondary p-3">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Result</p>
                <p className={`mt-1 text-sm font-bold uppercase ${selectedMatch.result === 'win' ? 'text-green-400' : 'text-red-400'}`}>{selectedMatch.result}</p>
              </div>
              <div className="rounded-xl bg-secondary p-3">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Opponent</p>
                <p className="mt-1 text-sm font-bold text-foreground">{selectedMatch.opponent_name}</p>
              </div>
              <div className="rounded-xl bg-secondary p-3">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Board Score</p>
                <p className="mt-1 text-sm font-bold text-foreground">{selectedMatch.player_board_power} - {selectedMatch.opponent_board_power}</p>
              </div>
              <div className="rounded-xl bg-secondary p-3">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Turns</p>
                <p className="mt-1 text-sm font-bold text-foreground">{selectedMatch.turns_played || 0}</p>
              </div>
              <div className="rounded-xl bg-secondary p-3">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Deck Mode</p>
                <p className="mt-1 text-sm font-bold text-foreground">{selectedMatch.deck_mode || 10}-card</p>
              </div>
              <div className="rounded-xl bg-secondary p-3">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Format</p>
                <p className="mt-1 text-sm font-bold text-foreground">{(selectedMatch.team_size || 1) === 2 ? '2v2' : '1v1'}</p>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-border bg-secondary/30 p-3">
                <p className="text-xs font-semibold flex items-center gap-2"><Swords className="w-3.5 h-3.5 text-primary" /> Your Deck</p>
                <div className="mt-3 space-y-2">
                  {(selectedMatch.player_deck_snapshot || []).map((card, index) => (
                    <div key={`${card.name}-${index}`} className="flex items-center justify-between rounded-lg bg-card px-3 py-2 text-xs">
                      <div>
                        <p className="font-medium text-foreground">{card.name}</p>
                        <p className="text-[10px] text-muted-foreground">{card.element} · {card.rarity}</p>
                      </div>
                      <p className="text-muted-foreground">{card.power}/{card.guard}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-secondary/30 p-3">
                <p className="text-xs font-semibold flex items-center gap-2"><Shield className="w-3.5 h-3.5 text-primary" /> Opponent Deck</p>
                <div className="mt-3 space-y-2">
                  {(selectedMatch.opponent_deck_snapshot || []).map((card, index) => (
                    <div key={`${card.name}-${index}`} className="flex items-center justify-between rounded-lg bg-card px-3 py-2 text-xs">
                      <div>
                        <p className="font-medium text-foreground">{card.name}</p>
                        <p className="text-[10px] text-muted-foreground">{card.element} · {card.rarity}</p>
                      </div>
                      <p className="text-muted-foreground">{card.power}/{card.guard}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <BattleReplayViewer match={selectedMatch} />

            <div className="rounded-xl border border-border bg-secondary/30 p-3">
              <p className="text-xs font-semibold">Turn-by-turn log</p>
              <ScrollArea className="mt-3 h-[18rem]">
                <div className="space-y-2 pr-3">
                  {(selectedMatch.turn_log || []).map((entry, index) => (
                    <div key={`${entry.turn}-${index}`} className="rounded-lg bg-card px-3 py-2">
                      <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                        <span className="uppercase">{entry.actor}</span>
                        <span>Turn {entry.turn}</span>
                      </div>
                      <p className="mt-1 text-xs text-foreground">{entry.message}</p>
                      <p className="mt-1 text-[10px] text-muted-foreground">HP {entry.player_hp}-{entry.opponent_hp} · Board {entry.player_board}-{entry.opponent_board}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}