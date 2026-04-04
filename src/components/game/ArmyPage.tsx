import { useState, useMemo, useEffect } from 'react';
import { useGame } from '@/game/GameContext';
import { useI18n } from '@/game/i18n';
import { TROOPS, RESOURCE_ICONS, BUILDINGS } from '@/game/data';
import CountdownTimer from '@/components/game/CountdownTimer';
import TooltipWrapper from '@/components/game/TooltipWrapper';
import { motion, AnimatePresence } from 'framer-motion';

const CLASS_COLORS: Record<string, string> = {
  infantry: 'from-blue-600/20 to-blue-800/20 border-blue-500/40',
  cavalry: 'from-amber-600/20 to-amber-800/20 border-amber-500/40',
  ranged: 'from-green-600/20 to-green-800/20 border-green-500/40',
};

const CLASS_ICONS: Record<string, string> = {
  infantry: '🗡️',
  cavalry: '🐎',
  ranged: '🏹',
};

// ── Troop Class Matchup System ──
const CLASS_ADVANTAGES: Record<string, { strong: string; weak: string; strongLabel: string; weakLabel: string }> = {
  infantry: { strong: 'ranged', weak: 'cavalry', strongLabel: '🗡️ > 🏹', weakLabel: '🗡️ < 🐎' },
  cavalry: { strong: 'infantry', weak: 'ranged', strongLabel: '🐎 > 🗡️', weakLabel: '🐎 < 🏹' },
  ranged: { strong: 'cavalry', weak: 'infantry', strongLabel: '🏹 > 🐎', weakLabel: '🏹 < 🗡️' },
};

// ── Battle Animation Component with Class Matchups ──
function BattleSequence({ report, onDone }: {
  report: {
    attackerClass?: string;
    defenderClass?: string;
    defenderPower: number;
    victory: boolean;
  };
  onDone: () => void;
}) {
  const [phase, setPhase] = useState<'charge' | 'clash' | 'result'>('charge');
  const advantage = report.attackerClass && report.defenderClass
    ? CLASS_ADVANTAGES[report.attackerClass]
    : null;
  const hasAdvantage = advantage?.strong === report.defenderClass;
  const hasDisadvantage = advantage?.weak === report.defenderClass;

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('clash'), 1200);
    const t2 = setTimeout(() => setPhase('result'), 2800);
    const t3 = setTimeout(onDone, 4200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  const attackerIcon = report.attackerClass ? CLASS_ICONS[report.attackerClass] || '⚔️' : '⚔️';
  const defenderIcon = report.defenderClass ? CLASS_ICONS[report.defenderClass] || '🛡️' : '🛡️';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
    >
      <div className="relative w-80 h-56">
        {/* Class matchup indicator */}
        {(hasAdvantage || hasDisadvantage) && phase !== 'result' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`absolute top-0 inset-x-0 text-center text-xs font-display px-3 py-1.5 rounded-lg mx-auto w-fit ${
              hasAdvantage
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'bg-red-500/20 text-red-400 border border-red-500/30'
            }`}
          >
            {hasAdvantage ? `⬆️ Class Advantage! ${advantage?.strongLabel}` : `⬇️ Class Disadvantage! ${advantage?.weakLabel}`}
          </motion.div>
        )}

        {/* Attacker troops (left side) */}
        <motion.div
          className="absolute left-4 top-1/2 -translate-y-1/2 text-4xl"
          animate={
            phase === 'charge' ? { x: [0, 20, 40, 60] } :
            phase === 'clash' ? { x: 90, scale: [1, 1.3, 1], rotate: [-5, 5, -5, 0] } :
            { x: 90, opacity: report.victory ? 1 : 0.3 }
          }
          transition={{ duration: phase === 'charge' ? 1.2 : 0.6 }}
        >
          {attackerIcon}
        </motion.div>

        {/* VS indicator */}
        {phase === 'charge' && (
          <motion.div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-display text-2xl text-muted-foreground"
            animate={{ scale: [0.8, 1.1, 0.8], opacity: [0.3, 0.7, 0.3] }}
            transition={{ repeat: Infinity, duration: 1 }}
          >
            VS
          </motion.div>
        )}

        {/* Clash sparks */}
        {phase === 'clash' && (
          <>
            {[...Array(10)].map((_, i) => (
              <motion.div
                key={i}
                className={`absolute left-1/2 top-1/2 w-2 h-2 rounded-full ${hasAdvantage ? 'bg-green-400' : hasDisadvantage ? 'bg-red-400' : 'bg-primary'}`}
                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                animate={{
                  x: (Math.random() - 0.5) * 140,
                  y: (Math.random() - 0.5) * 100,
                  opacity: 0,
                  scale: 0,
                }}
                transition={{ duration: 0.6 + Math.random() * 0.4, delay: Math.random() * 0.2 }}
              />
            ))}
            <motion.div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-5xl"
              initial={{ scale: 0, rotate: 0 }}
              animate={{ scale: [0, 2, 0], rotate: 180 }}
              transition={{ duration: 0.8 }}
            >
              💥
            </motion.div>
          </>
        )}

        {/* Defender troops (right side) */}
        <motion.div
          className="absolute right-4 top-1/2 -translate-y-1/2 text-4xl"
          animate={
            phase === 'charge' ? { x: [0, -20, -40, -60] } :
            phase === 'clash' ? { x: -90, scale: [1, 1.3, 1], rotate: [5, -5, 5, 0] } :
            { x: -90, opacity: report.victory ? 0.3 : 1 }
          }
          transition={{ duration: phase === 'charge' ? 1.2 : 0.6 }}
        >
          {defenderIcon}
        </motion.div>

        {/* Power comparison bar */}
        {phase === 'charge' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute bottom-14 inset-x-4 text-center"
          >
            <p className="text-[10px] text-muted-foreground font-display mb-1">Enemy Power: {report.defenderPower.toLocaleString()}</p>
          </motion.div>
        )}

        {/* Result banner */}
        {phase === 'result' && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute inset-x-0 bottom-2 text-center"
          >
            <div className={`inline-block px-6 py-2 rounded-lg font-display text-lg ${
              report.victory
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'bg-red-500/20 text-red-400 border border-red-500/30'
            }`}>
              {report.victory ? '⚔️ Victory!' : '💀 Defeat'}
            </div>
            {hasAdvantage && report.victory && (
              <p className="text-[10px] text-green-400 mt-1">Class advantage bonus applied!</p>
            )}
          </motion.div>
        )}

        {/* Screen shake on clash */}
        {phase === 'clash' && (
          <motion.div
            className="absolute inset-0"
            animate={{ x: [0, -4, 4, -2, 2, 0], y: [0, 2, -2, 1, -1, 0] }}
            transition={{ duration: 0.3 }}
          />
        )}
      </div>
    </motion.div>
  );
}

export default function ArmyPage() {
  const { state, trainTroops, canAfford, getBuildingLevel } = useGame();
  const { t } = useI18n();
  const [trainCounts, setTrainCounts] = useState<Record<string, number>>({});
  const [selectedTroop, setSelectedTroop] = useState<string | null>(null);
  const hasBarracks = getBuildingLevel('barracks') > 0;

  // Derive battle reports from completed marches
  const battleReports = useMemo(() =>
    state.marches.filter(m => m.result).map(m => {
      // Determine dominant attacker class from troops
      const troopCounts: Record<string, number> = {};
      if (m.troops) {
        m.troops.forEach(({ troopId, count }) => {
          const def = TROOPS.find(d => d.id === troopId);
          if (def) troopCounts[def.troopClass] = (troopCounts[def.troopClass] || 0) + count;
        });
      }
      const dominantClass = Object.entries(troopCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'infantry';
      return {
        expeditionId: m.expeditionId,
        victory: m.result!.victory,
        defenderPower: m.result!.enemyPower,
        attackerClass: dominantClass,
      };
    }),
  [state.marches]);

  const [battleAnim, setBattleAnim] = useState<{ attackerClass?: string; defenderClass?: string; defenderPower: number; victory: boolean } | null>(null);
  const [lastReportCount, setLastReportCount] = useState(battleReports.length);

  // Watch for new battle reports to trigger animation
  useEffect(() => {
    if (battleReports.length > lastReportCount) {
      const latest = battleReports[battleReports.length - 1];
      if (latest) {
        setBattleAnim({
          attackerClass: latest.attackerClass,
          defenderClass: ['infantry', 'cavalry', 'ranged'][Math.floor(Math.random() * 3)],
          defenderPower: latest.defenderPower || 0,
          victory: !!latest.victory,
        });
      }
      setLastReportCount(battleReports.length);
    }
  }, [battleReports, lastReportCount]);

  const totalPower = useMemo(() => {
    return state.troops.reduce((sum, tr) => {
      const def = TROOPS.find(d => d.id === tr.id);
      if (!def) return sum;
      return sum + tr.count * (def.attack + def.defense + def.health);
    }, 0);
  }, [state.troops]);

  const totalTroops = state.troops.reduce((s, t) => s + t.count, 0);

  const counterInfo: Record<string, string> = {
    infantry: t('army.counterInfantry'),
    cavalry: t('army.counterCavalry'),
    ranged: t('army.counterRanged'),
  };

  return (
    <div className="space-y-4">
      {/* Battle Animation Overlay */}
      <AnimatePresence>
        {battleAnim && (
          <BattleSequence report={battleAnim} onDone={() => setBattleAnim(null)} />
        )}
      </AnimatePresence>

      <h2 className="font-display text-2xl ink-shadow text-foreground">{t('army.title')}</h2>

      {!hasBarracks && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-accent/10 medieval-border rounded-md p-3 text-sm text-accent">
          {t('army.locked')}
        </motion.div>
      )}

      {/* Army Overview Panel */}
      <div className="bg-card medieval-border rounded-md p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-sm text-muted-foreground">{t('army.roster')}</h3>
          <div className="flex gap-3 text-xs">
            <span className="text-primary font-display">⚡ {totalPower.toLocaleString()} Power</span>
            <span className="text-muted-foreground">👥 {totalTroops.toLocaleString()} Total</span>
          </div>
        </div>

        {/* Class breakdown */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          {(['infantry', 'cavalry', 'ranged'] as const).map(cls => {
            const count = state.troops
              .filter(tr => TROOPS.find(d => d.id === tr.id)?.troopClass === cls)
              .reduce((s, tr) => s + tr.count, 0);
            const pct = totalTroops > 0 ? (count / totalTroops) * 100 : 0;
            return (
              <div key={cls} className="bg-muted/50 rounded-lg p-2 text-center">
                <span className="text-lg">{CLASS_ICONS[cls]}</span>
                <p className="text-[10px] text-muted-foreground capitalize mt-0.5">{t(`troopClass.${cls}`)}</p>
                <p className="text-sm font-display text-foreground">{count.toLocaleString()}</p>
                <div className="w-full h-1 bg-muted rounded-full mt-1 overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} className="h-full bg-primary rounded-full" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Active roster */}
        <div className="flex flex-wrap gap-2 text-sm">
          {state.troops.filter(tr => tr.count > 0).map(tr => {
            const def = TROOPS.find(d => d.id === tr.id);
            return (
              <motion.span key={tr.id} whileHover={{ scale: 1.05 }} className="px-2 py-1 bg-muted/50 rounded text-xs text-foreground cursor-pointer" onClick={() => setSelectedTroop(selectedTroop === tr.id ? null : tr.id)}>
                {def?.icon} {t(`troop.${tr.id}.name`)}: <strong>{tr.count.toLocaleString()}</strong>
              </motion.span>
            );
          })}
          {state.troops.every(tr => tr.count === 0) && <span className="text-muted-foreground text-xs">{t('army.noTroops')}</span>}
        </div>
      </div>

      {/* Recent Battles */}
      {battleReports.length > 0 && (
        <div className="bg-card medieval-border rounded-md p-3">
          <h3 className="font-display text-sm text-muted-foreground mb-2">⚔️ Recent Battles</h3>
          <div className="space-y-1.5 max-h-[120px] overflow-y-auto">
            {battleReports.slice(-5).reverse().map((report, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`flex items-center gap-2 text-xs p-2 rounded-lg border ${
                  report.victory
                    ? 'bg-green-500/5 border-green-500/20 text-green-400'
                    : 'bg-red-500/5 border-red-500/20 text-red-400'
                }`}
              >
                <span className="text-sm">{report.victory ? '🏆' : '💀'}</span>
                <span className="flex-1 text-foreground">{report.expeditionId || 'Battle'}</span>
                <span className="text-[10px] text-muted-foreground">Power: {report.defenderPower || '?'}</span>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Troop Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {TROOPS.map((def, idx) => {
          const ts = state.troops.find(tr => tr.id === def.id)!;
          const locked = def.unlockRequires && getBuildingLevel(def.unlockRequires.buildingId) < def.unlockRequires.level;
          const count = trainCounts[def.id] || 1;
          const totalCost: Record<string, number> = {};
          for (const [k, v] of Object.entries(def.cost)) {
            totalCost[k] = (v as number) * count;
          }
          const isSelected = selectedTroop === def.id;

          return (
            <motion.div
              key={def.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              className={`bg-card medieval-border rounded-md p-4 border bg-gradient-to-br transition-all ${locked || !hasBarracks ? 'opacity-50' : ''} ${CLASS_COLORS[def.troopClass] || ''} ${isSelected ? 'ring-2 ring-primary shadow-lg' : ''}`}
              onClick={() => setSelectedTroop(isSelected ? null : def.id)}
            >
              <TooltipWrapper content={counterInfo[def.troopClass]}>
                <h3 className="font-display text-base text-foreground cursor-help flex items-center gap-2">
                  <motion.span
                    animate={ts.training > 0 ? { rotate: [0, -5, 5, 0] } : {}}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="text-xl"
                  >
                    {def.icon}
                  </motion.span>
                  {t(`troop.${def.id}.name`)}
                  <span className="ml-auto text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">T{def.tier} {CLASS_ICONS[def.troopClass]}</span>
                </h3>
              </TooltipWrapper>

              {/* Stats with visual bars */}
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-3">
                {[
                  { label: '⚔️ ATK', val: def.attack, max: 50 },
                  { label: '🛡️ DEF', val: def.defense, max: 50 },
                  { label: '❤️ HP', val: def.health, max: 100 },
                  { label: '💨 SPD', val: def.speed, max: 30 },
                ].map(stat => (
                  <div key={stat.label} className="flex items-center gap-1.5">
                    <span className="text-[10px] text-muted-foreground w-12">{stat.label}</span>
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${(stat.val / stat.max) * 100}%` }} transition={{ duration: 0.6, delay: idx * 0.04 + 0.2 }} className="h-full bg-primary/70 rounded-full" />
                    </div>
                    <span className="text-[10px] text-foreground w-5 text-right">{stat.val}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-muted-foreground">{t('army.owned', ts.count)}</p>
                {ts.count > 0 && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex">
                    {Array.from({ length: Math.min(5, Math.ceil(ts.count / 10)) }).map((_, i) => (
                      <span key={i} className="text-[8px] -ml-0.5">{def.icon}</span>
                    ))}
                  </motion.div>
                )}
              </div>

              {ts.training > 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 flex items-center gap-2 text-sm bg-primary/10 rounded-lg p-2">
                  <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: 'linear' }} className="text-lg">⚙️</motion.span>
                  <span className="text-muted-foreground text-xs">{t('army.training', ts.training)}</span>
                  <CountdownTimer endTime={ts.trainingEndTime!} />
                </motion.div>
              ) : locked ? (
                <p className="mt-3 text-xs text-accent">🔒 {t(`building.${def.unlockRequires!.buildingId}.name`)} {t('city.level', def.unlockRequires!.level)}</p>
              ) : (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <input type="number" min={1} max={50} value={count} onClick={e => e.stopPropagation()} onChange={e => setTrainCounts(p => ({ ...p, [def.id]: Math.max(1, +e.target.value) }))} className="w-16 px-2 py-1 bg-muted border border-border rounded text-sm text-foreground" />
                    <div className="flex flex-wrap gap-1 text-xs text-muted-foreground">
                      {Object.entries(totalCost).map(([k, v]) => (
                        <span key={k} className={!canAfford({ [k]: v }) ? 'text-destructive' : ''}>{RESOURCE_ICONS[k]}{v}</span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); trainTroops(def.id, count) && setTrainCounts(p => ({ ...p, [def.id]: 1 })); }}
                    disabled={!canAfford(totalCost) || !hasBarracks}
                    className="w-full px-3 py-2 bg-primary text-primary-foreground rounded text-sm font-display hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {t('army.trainBtn', count)}
                  </button>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
