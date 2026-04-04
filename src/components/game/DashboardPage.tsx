import { useGame } from '@/game/GameContext';
import { useI18n } from '@/game/i18n';
import { BUILDINGS, TROOPS, EXPEDITIONS, RESOURCE_ICONS } from '@/game/data';
import Minimap from '@/components/game/Minimap';
import HeroRoster from '@/components/game/HeroRoster';
import DashboardWorldMap from '@/components/game/DashboardWorldMap';

export default function DashboardPage() {
  const { state, completeMarch, getBuildingLevel } = useGame();
  const { t } = useI18n();

  const activeUpgrades = state.buildings.filter(b => b.upgrading);
  const activeResearch = state.research.filter(r => r.researching);
  const activeTraining = state.troops.filter(t => t.training > 0);
  const activeMarches = state.marches.filter(m => !m.result);
  const completedMarches = state.marches.filter(m => m.completed && !m.result);

  const totalTroops = state.troops.reduce((s, t) => s + t.count, 0);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-display ink-shadow text-foreground">{state.realmName}</h1>
        <p className="text-muted-foreground mt-1">{t('dashboard.keepLevel', getBuildingLevel('keep'))}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label={t('dashboard.buildings')} value={state.buildings.filter(b => b.level > 0).length.toString()} icon="🏰" />
        <StatCard label={t('dashboard.armySize')} value={totalTroops.toString()} icon="⚔️" />
        <StatCard label={t('dashboard.activeMarches')} value={activeMarches.length.toString()} icon="🚩" />
        <StatCard label={t('dashboard.heroes')} value={state.unlockedHeroes.length.toString()} icon="👑" />
      </div>

      <Minimap />

      <HeroRoster />

      <DashboardWorldMap />

      {(activeUpgrades.length > 0 || activeResearch.length > 0 || activeTraining.length > 0) && (
        <div className="bg-card medieval-border rounded-md p-4">
          <h2 className="font-display text-lg mb-3 text-foreground">{t('dashboard.activeTasks')}</h2>
          <div className="space-y-2 text-sm">
            {activeUpgrades.map(b => {
              const def = BUILDINGS.find(d => d.id === b.id);
              return (
                <div key={b.id} className="flex justify-between items-center p-2 bg-muted rounded">
                  <span>{def?.icon} {t('dashboard.upgrading', t(`building.${b.id}.name`), b.level + 1)}</span>
                  <TimeLeft endTime={b.upgradeEndTime!} />
                </div>
              );
            })}
            {activeResearch.map(r => (
              <div key={r.id} className="flex justify-between items-center p-2 bg-muted rounded">
                <span>{t('dashboard.researching', t(`research.${r.id}.name`))}</span>
                <TimeLeft endTime={r.researchEndTime!} />
              </div>
            ))}
            {activeTraining.map(ts => {
              const def = TROOPS.find(d => d.id === ts.id);
              return (
                <div key={ts.id} className="flex justify-between items-center p-2 bg-muted rounded">
                  <span>{def?.icon} {t('dashboard.training', ts.training, t(`troop.${ts.id}.name`))}</span>
                  <TimeLeft endTime={ts.trainingEndTime!} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {completedMarches.length > 0 && (
        <div className="bg-card medieval-border rounded-md p-4">
          <h2 className="font-display text-lg mb-3 text-foreground">{t('dashboard.completedExpeditions')}</h2>
          <div className="space-y-2">
            {completedMarches.map(m => {
              const exp = EXPEDITIONS.find(e => e.id === m.expeditionId);
              return (
                <div key={m.id} className="flex justify-between items-center p-2 bg-muted rounded">
                  <span>{exp?.icon} {t(`expedition.${m.expeditionId}.name`)}</span>
                  <button
                    onClick={() => completeMarch(m.id)}
                    className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm font-display hover:opacity-90 transition-opacity animate-pulse-gold"
                  >
                    {t('dashboard.viewReport')}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {state.marches.filter(m => m.result).slice(-3).reverse().map(m => {
        const r = m.result!;
        return (
          <div key={m.id} className={`medieval-border rounded-md p-4 ${r.victory ? 'bg-forest/10' : 'bg-blood/10'}`}>
            <h3 className="font-display text-sm mb-2">
              {r.victory ? t('dashboard.victory') : t('dashboard.defeat')} — {t(`expedition.${m.expeditionId}.name`)}
            </h3>
            <div className="text-xs space-y-1 text-muted-foreground">
              <p>{t('dashboard.yourPower', r.playerPower, r.enemyPower)}</p>
              {r.modifiers.length > 0 && (
                <p>{t('dashboard.modifiers', r.modifiers.map(mod => `${mod.source} (+${mod.value}%)`).join(', '))}</p>
              )}
              {r.victory && (
                <p>{t('dashboard.rewards', Object.entries(r.rewards).map(([k, v]) => `${RESOURCE_ICONS[k]}${v}`).join(' '))}</p>
              )}
              <p>{t('dashboard.losses', r.losses.filter(l => l.lost > 0).map(l => {
                const def = TROOPS.find(td => td.id === l.troopId);
                return `${def?.icon}${l.lost}`;
              }).join(' ') || t('dashboard.noLosses'))}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="bg-card medieval-border rounded-md p-3 text-center">
      <div className="text-2xl mb-1">{icon}</div>
      <div className="font-display text-lg text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function TimeLeft({ endTime }: { endTime: number }) {
  const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  return <span className="text-primary font-display text-xs">{m}:{s.toString().padStart(2, '0')}</span>;
}
