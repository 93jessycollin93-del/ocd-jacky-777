import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, SkipForward, Swords, Shield } from 'lucide-react';
import CardDisplay from './CardDisplay';

function pickCardFromMessage(message = '', deck = []) {
  const normalized = message.toLowerCase();
  return deck.find((card) => normalized.includes((card.name || '').toLowerCase())) || null;
}

export default function BattleReplayViewer({ match }) {
  const steps = match?.turn_log || [];
  const [playing, setPlaying] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  const replayEntries = useMemo(() => steps.map((entry) => ({
    ...entry,
    playedCard: pickCardFromMessage(
      entry.message,
      entry.actor === 'player' ? (match?.player_deck_snapshot || []) : (match?.opponent_deck_snapshot || [])
    )
  })), [steps, match]);

  const activeEntry = replayEntries[stepIndex] || null;

  useEffect(() => {
    if (!playing || replayEntries.length === 0) return;
    if (stepIndex >= replayEntries.length - 1) {
      setPlaying(false);
      return;
    }
    const timer = setTimeout(() => setStepIndex((prev) => Math.min(prev + 1, replayEntries.length - 1)), 1400);
    return () => clearTimeout(timer);
  }, [playing, stepIndex, replayEntries.length]);

  useEffect(() => {
    setPlaying(false);
    setStepIndex(0);
  }, [match?.id]);

  if (!match) return null;

  const hpBase = match?.deck_mode ? 25 + Math.round((Number(match.deck_mode) - 10) * 0.8) : 25;
  const hpPool = hpBase * Math.max(1, Number(match.team_size || 1));

  return (
    <div className="rounded-xl border border-border bg-secondary/30 p-3 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold">Battle Replay</p>
          <p className="text-[10px] text-muted-foreground mt-1">Play through the saved turn log to watch the match unfold step by step. Deck mode: {match.deck_mode || 10}-card · {(match.team_size || 1) === 2 ? '2v2' : '1v1'}.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setStepIndex(0)} className="rounded-lg bg-card px-2.5 py-2 text-xs text-muted-foreground hover:text-foreground">
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setPlaying((prev) => !prev)} className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground flex items-center gap-1.5">
            {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {playing ? 'Pause' : 'Replay'}
          </button>
          <button onClick={() => setStepIndex((prev) => Math.min(prev + 1, Math.max(replayEntries.length - 1, 0)))} className="rounded-lg bg-card px-2.5 py-2 text-xs text-muted-foreground hover:text-foreground">
            <SkipForward className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-secondary p-3">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>You</span>
                <span>HP {activeEntry?.player_hp ?? match.player_hp_end}</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-background overflow-hidden">
                <motion.div
                  className="h-full bg-green-500"
                  animate={{ width: `${Math.max(0, Math.min(100, (((activeEntry?.player_hp ?? match.player_hp_end) || 0) / hpPool) * 100))}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-primary font-semibold">Board {activeEntry?.player_board ?? match.player_board_power}</p>
            </div>

            <div className="rounded-xl bg-secondary p-3">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>{match.opponent_name}</span>
                <span>HP {activeEntry?.opponent_hp ?? match.opponent_hp_end}</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-background overflow-hidden">
                <motion.div
                  className="h-full bg-red-500"
                  animate={{ width: `${Math.max(0, Math.min(100, (((activeEntry?.opponent_hp ?? match.opponent_hp_end) || 0) / hpPool) * 100))}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-primary font-semibold">Board {activeEntry?.opponent_board ?? match.opponent_board_power}</p>
            </div>
          </div>

          <div className="mt-4 min-h-[10rem] rounded-xl border border-dashed border-border bg-background/40 p-4 flex flex-col items-center justify-center text-center">
            <AnimatePresence mode="wait">
              {activeEntry ? (
                <motion.div
                  key={`${activeEntry.turn}-${stepIndex}`}
                  initial={{ opacity: 0, y: 16, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -12, scale: 0.96 }}
                  className="space-y-3 flex flex-col items-center"
                >
                  <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] uppercase tracking-widest ${activeEntry.actor === 'player' ? 'bg-primary/10 text-primary' : 'bg-red-500/10 text-red-300'}`}>
                    {activeEntry.actor === 'player' ? <Swords className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
                    Turn {activeEntry.turn} · {activeEntry.actor}
                  </div>
                  {activeEntry.playedCard ? <CardDisplay card={{ ...activeEntry.playedCard, id: `${activeEntry.playedCard.name}-${stepIndex}` }} size="sm" glowing /> : null}
                  <p className="text-sm font-medium text-foreground max-w-md">{activeEntry.message}</p>
                  <p className="text-[11px] text-muted-foreground">HP {activeEntry.player_hp}-{activeEntry.opponent_hp} · Board {activeEntry.player_board}-{activeEntry.opponent_board}</p>
                </motion.div>
              ) : (
                <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Ready to replay</p>
                  <p className="text-[11px] text-muted-foreground">Press replay to animate the saved battle sequence.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-xs font-semibold">Timeline</p>
          <div className="mt-3 space-y-2 max-h-[22rem] overflow-y-auto pr-1">
            {replayEntries.map((entry, index) => (
              <button
                key={`${entry.turn}-${index}`}
                onClick={() => {
                  setPlaying(false);
                  setStepIndex(index);
                }}
                className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${index === stepIndex ? 'border-primary bg-primary/10' : 'border-border bg-secondary/40 hover:border-primary/30'}`}
              >
                <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                  <span className="uppercase">{entry.actor}</span>
                  <span>Turn {entry.turn}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-foreground">{entry.message}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}