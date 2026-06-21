import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, CheckCircle2, Loader2, Sparkles, Target, AlertTriangle, RefreshCcw } from 'lucide-react';
import { base44 } from '@/eru/api/base44Client';
import { ensureDailyQuests, claimQuest, summarizeQuests } from '@/eru/lib/dailyQuests';

/**
 * DailyQuestPanel
 * --------------------------------------------------------------------------
 * Compact, mobile-first daily quest list. Drops into any tab or page:
 *   <DailyQuestPanel onGoldChange={(newBalance) => setGold(newBalance)} />
 *
 * - Auto-loads today's quests on mount (creates them if missing).
 * - Listens for the global `daily-quests-changed` event so progress updates
 *   live across the app without prop drilling.
 * - Claim button awards gold via the existing economy API.
 */
export default function DailyQuestPanel({ onGoldChange, compact = false }) {
  const [quests, setQuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const me = await base44.auth.me();
      const list = await ensureDailyQuests(me?.email);
      setQuests(list || []);
    } catch (err) {
      setError('Could not load daily quests.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const handler = () => load();
    window.addEventListener('daily-quests-changed', handler);
    return () => window.removeEventListener('daily-quests-changed', handler);
  }, [load]);

  const handleClaim = async (quest) => {
    setError(null);
    setClaiming(quest.id);
    const result = await claimQuest(quest.id);
    setClaiming(null);
    if (!result.ok) {
      setError(result.error || 'Claim failed.');
      return;
    }
    if (typeof result.newGoldBalance === 'number') onGoldChange?.(result.newGoldBalance);
    load();
  };

  const summary = summarizeQuests(quests);
  const sorted = [...quests].sort((a, b) => {
    const order = { completed: 0, active: 1, claimed: 2 };
    return (order[a.status] ?? 3) - (order[b.status] ?? 3);
  });

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-900/25 to-orange-900/15 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Target className="w-5 h-5 text-amber-300 shrink-0" />
            <h3 className="text-base font-bold text-amber-100 truncate">Daily Quests</h3>
          </div>
          <button
            onClick={load}
            className="text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            aria-label="Refresh quests"
          >
            <RefreshCcw className="w-3 h-3" /> Refresh
          </button>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Resets daily · {summary.completed} ready to claim · {summary.claimed}/{quests.length} done
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300 flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5" /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-secondary/10 p-4 text-center text-xs text-muted-foreground">
          No quests for today. Check back tomorrow.
        </div>
      ) : (
        <ul className="space-y-2">
          <AnimatePresence initial={false}>
            {sorted.map((q) => (
              <QuestRow
                key={q.id}
                quest={q}
                claiming={claiming === q.id}
                compact={compact}
                onClaim={() => handleClaim(q)}
              />
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}

function QuestRow({ quest, claiming, compact, onClaim }) {
  const pct = Math.min(100, Math.round(((quest.progress || 0) / Math.max(1, quest.goal)) * 100));
  const isClaimed = quest.status === 'claimed';
  const isReady = quest.status === 'completed';

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className={`rounded-xl border p-3 transition-colors ${
        isReady ? 'border-amber-500/45 bg-amber-500/5' : isClaimed ? 'border-border/60 bg-secondary/20 opacity-70' : 'border-border bg-card'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-foreground truncate">{quest.title}</p>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold rounded-full px-2 py-0.5 border border-yellow-500/30 bg-yellow-500/10 text-yellow-300">
              <Coins className="w-3 h-3" /> {quest.reward_gold}
            </span>
            {isClaimed && (
              <span className="text-[10px] font-semibold rounded-full px-2 py-0.5 border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 inline-flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Claimed
              </span>
            )}
          </div>
          {!compact && (
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{quest.description}</p>
          )}

          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className={`h-full ${isReady || isClaimed ? 'bg-amber-400' : 'bg-primary'}`}
              />
            </div>
            <span className="text-[10px] tabular-nums text-muted-foreground shrink-0">
              {Math.min(quest.goal, quest.progress || 0)}/{quest.goal}
            </span>
          </div>
        </div>

        {isReady && !isClaimed && (
          <button
            onClick={onClaim}
            disabled={claiming}
            className="shrink-0 inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-semibold px-3 py-2 disabled:opacity-40"
          >
            {claiming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            Claim
          </button>
        )}
      </div>
    </motion.li>
  );
}