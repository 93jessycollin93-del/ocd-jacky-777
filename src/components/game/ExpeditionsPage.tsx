import { useState } from 'react';
import { useGame } from '@/game/GameContext';
import { useI18n } from '@/game/i18n';
import { EXPEDITIONS, TROOPS, HEROES, getMaxMarchSize, RESOURCE_ICONS } from '@/game/data';
import { MarchSpeed, MarchFormation } from '@/game/types';
import TooltipWrapper from '@/components/game/TooltipWrapper';

const SPEED_OPTIONS: { id: MarchSpeed; icon: string; timeMult: string; lossMult: string }[] = [
  { id: 'cautious', icon: '🐢', timeMult: '×1.5', lossMult: '−30% losses' },
  { id: 'standard', icon: '🚶', timeMult: '×1.0', lossMult: 'Normal' },
  { id: 'forced', icon: '🏃', timeMult: '×0.6', lossMult: '+20% losses' },
  { id: 'sprint', icon: '⚡', timeMult: '×0.35', lossMult: '+50% losses' },
];

const FORMATION_OPTIONS: { id: MarchFormation; icon: string; bonus: string }[] = [
  { id: 'line', icon: '═══', bonus: 'Balanced ATK/DEF' },
  { id: 'wedge', icon: '▷▷▷', bonus: '+15% ATK, −10% DEF' },
  { id: 'shield_wall', icon: '▐█▌', bonus: '−15% ATK, +20% DEF' },
  { id: 'scattered', icon: '· · ·', bonus: '−5% all, dodge bonus' },
];

export default function ExpeditionsPage() {
  const { state, sendMarch, getBuildingLevel } = useGame();
  const { t } = useI18n();
  const [selectedExp, setSelectedExp] = useState<string | null>(null);
  const [selectedHero, setSelectedHero] = useState<string>('');
  const [troopSelection, setTroopSelection] = useState<Record<string, number>>({});
  const [marchSpeed, setMarchSpeed] = useState<MarchSpeed>('standard');
  const [marchFormation, setMarchFormation] = useState<MarchFormation>('line');

  const keepLevel = getBuildingLevel('keep');
  const maxMarch = getMaxMarchSize(keepLevel);
  const totalSelected = Object.values(troopSelection).reduce((s, v) => s + v, 0);

  const availableHeroes = HEROES.filter(h => state.unlockedHeroes.includes(h.id));
  const availableTroops = state.troops.filter(tr => tr.count > 0);
  const activeMarches = state.marches.filter(m => !m.result);

  const handleSend = () => {
    if (!selectedExp || totalSelected === 0) return;
    const troops = Object.entries(troopSelection)
      .filter(([, v]) => v > 0)
      .map(([troopId, count]) => ({ troopId, count }));
    const success = sendMarch(selectedExp, troops, selectedHero || undefined, marchSpeed, marchFormation);
    if (success) {
      setSelectedExp(null);
      setTroopSelection({});
      setSelectedHero('');
      setMarchSpeed('standard');
      setMarchFormation('line');
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="font-display text-2xl ink-shadow text-foreground">{t('exp.title')}</h2>
      <p className="text-sm text-muted-foreground">{t('exp.marchCapacity', maxMarch, keepLevel)}</p>

      {activeMarches.length > 0 && (
        <div className="bg-card medieval-border rounded-md p-3">
          <h3 className="font-display text-sm mb-2 text-foreground">{t('exp.activeMarches', activeMarches.length)}</h3>
          {activeMarches.map(m => {
            const totalTroops = m.troops.reduce((s, tr) => s + tr.count, 0);
            const remaining = Math.max(0, Math.ceil((m.endTime - Date.now()) / 1000));
            const minutes = Math.floor(remaining / 60);
            const secs = remaining % 60;
            const speedOpt = SPEED_OPTIONS.find(s => s.id === m.speed);
            const formOpt = FORMATION_OPTIONS.find(f => f.id === m.formation);
            return (
              <div key={m.id} className="flex justify-between items-center p-2 bg-muted rounded mb-1 text-sm">
                <span>
                  {EXPEDITIONS.find(e => e.id === m.expeditionId)?.icon} {t(`expedition.${m.expeditionId}.name`)} ({t('exp.troops', totalTroops)})
                  {speedOpt && <span className="ml-1 text-xs text-muted-foreground">{speedOpt.icon}</span>}
                  {formOpt && <span className="ml-1 text-xs text-muted-foreground">{formOpt.icon}</span>}
                </span>
                <span className="text-primary font-display text-xs">
                  {m.completed ? t('exp.complete') : `${minutes}:${secs.toString().padStart(2, '0')}`}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {EXPEDITIONS.map(exp => (
          <div
            key={exp.id}
            onClick={() => setSelectedExp(selectedExp === exp.id ? null : exp.id)}
            className={`bg-card medieval-border rounded-md p-4 cursor-pointer transition-all hover:gold-glow ${
              selectedExp === exp.id ? 'ring-2 ring-primary' : ''
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-display text-base text-foreground">{exp.icon} {t(`expedition.${exp.id}.name`)}</h3>
                <p className="text-xs text-muted-foreground mt-1">{t(`expedition.${exp.id}.desc`)}</p>
              </div>
              <TooltipWrapper content={t('exp.difficulty', exp.difficulty, exp.enemyPower)}>
                <span className="text-sm cursor-help">{'⭐'.repeat(exp.difficulty)}</span>
              </TooltipWrapper>
            </div>
            <div className="flex flex-wrap gap-2 mt-2 text-xs">
              <span className="text-accent">{t('exp.power', exp.enemyPower)}</span>
              <span className="text-muted-foreground">⏱️ {t('exp.duration', Math.floor(exp.duration / 60))}</span>
              <span className="text-forest">
                {t('exp.rewards', Object.entries(exp.rewards).map(([k, v]) => `${RESOURCE_ICONS[k]}${v}`).join(' '))}
              </span>
            </div>
          </div>
        ))}
      </div>

      {selectedExp && (
        <div className="bg-card medieval-border rounded-md p-4 space-y-4">
          <h3 className="font-display text-lg text-foreground">
            {t('exp.deployTo', t(`expedition.${selectedExp}.name`))}
          </h3>

          {/* Speed Selector */}
          <div>
            <label className="block text-sm font-display text-muted-foreground mb-2">{t('exp.marchSpeed')}</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {SPEED_OPTIONS.map(s => (
                <button
                  key={s.id}
                  onClick={() => setMarchSpeed(s.id)}
                  className={`p-2 rounded-lg border text-center transition-all text-xs ${
                    marchSpeed === s.id
                      ? 'bg-primary/20 border-primary text-foreground'
                      : 'bg-muted border-border text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  <div className="text-lg">{s.icon}</div>
                  <div className="font-display font-semibold capitalize">{t(`exp.speed.${s.id}`)}</div>
                  <div className="text-[10px] opacity-70">{s.timeMult} time</div>
                  <div className="text-[10px] opacity-70">{s.lossMult}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Formation Selector */}
          <div>
            <label className="block text-sm font-display text-muted-foreground mb-2">{t('exp.formation')}</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {FORMATION_OPTIONS.map(f => (
                <button
                  key={f.id}
                  onClick={() => setMarchFormation(f.id)}
                  className={`p-2 rounded-lg border text-center transition-all text-xs ${
                    marchFormation === f.id
                      ? 'bg-primary/20 border-primary text-foreground'
                      : 'bg-muted border-border text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  <div className="text-sm font-mono">{f.icon}</div>
                  <div className="font-display font-semibold capitalize">{t(`exp.formation.${f.id}`)}</div>
                  <div className="text-[10px] opacity-70">{f.bonus}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-display text-muted-foreground mb-1">{t('exp.commander')}</label>
            <select
              value={selectedHero}
              onChange={e => setSelectedHero(e.target.value)}
              className="w-full px-3 py-2 bg-muted border border-border rounded text-sm text-foreground"
            >
              <option value="">{t('exp.noCommander')}</option>
              {availableHeroes.map(h => (
                <option key={h.id} value={h.id}>{h.icon} {t(`hero.${h.id}.name`)} — {t(`hero.${h.id}.bonus`)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-display text-muted-foreground mb-1">
              {t('exp.selectTroops', totalSelected, maxMarch)}
            </label>
            {availableTroops.length === 0 ? (
              <p className="text-sm text-accent">{t('exp.noTroopsAvail')}</p>
            ) : (
              <div className="space-y-2">
                {availableTroops.map(tr => {
                  const def = TROOPS.find(d => d.id === tr.id);
                  if (!def) return null;
                  return (
                    <div key={tr.id} className="flex items-center gap-3 text-sm">
                      <span className="w-40">{def.icon} {t(`troop.${def.id}.name`)} ({t('exp.available', tr.count)})</span>
                      <input
                        type="range"
                        min={0}
                        max={Math.min(tr.count, maxMarch - totalSelected + (troopSelection[tr.id] || 0))}
                        value={troopSelection[tr.id] || 0}
                        onChange={e => setTroopSelection(p => ({ ...p, [tr.id]: +e.target.value }))}
                        className="flex-1 accent-primary"
                      />
                      <span className="w-12 text-right font-display">{troopSelection[tr.id] || 0}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <button
            onClick={handleSend}
            disabled={totalSelected === 0}
            className="px-4 py-2 bg-primary text-primary-foreground rounded font-display hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {t('exp.marchBtn', totalSelected)}
          </button>
        </div>
      )}
    </div>
  );
}
