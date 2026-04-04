import { useGame } from '@/game/GameContext';
import { useI18n } from '@/game/i18n';
import { BUILDINGS, getBuildingCost, getUpgradeTime, getProductionRate, RESOURCE_ICONS } from '@/game/data';
import TooltipWrapper from '@/components/game/TooltipWrapper';
import CountdownTimer from '@/components/game/CountdownTimer';

export default function CityPage() {
  const { state, upgradeBuilding, canAfford, getBuildingLevel, getResearchBonus } = useGame();
  const { t } = useI18n();

  return (
    <div className="space-y-4">
      <h2 className="font-display text-2xl ink-shadow text-foreground">{t('city.title')}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {BUILDINGS.map(def => {
          const bs = state.buildings.find(b => b.id === def.id)!;
          const cost = getBuildingCost(def, bs.level);
          const affordable = canAfford(cost);
          const locked = def.unlockRequires && getBuildingLevel(def.unlockRequires.buildingId) < def.unlockRequires.level;
          const maxed = bs.level >= def.maxLevel;
          const upgradeTime = getUpgradeTime(bs.level);

          let prodInfo = '';
          if (def.produces && bs.level > 0) {
            const researchMap: Record<string, string> = { food: 'Food production', wood: 'Wood production', stone: 'Stone production', iron: 'Iron production' };
            const bonus = getResearchBonus(researchMap[def.produces] || '');
            const rate = getProductionRate(def, bs.level, bonus);
            prodInfo = `${RESOURCE_ICONS[def.produces]} ${rate.toFixed(1)}${t('city.perMin')}`;
          }

          const name = t(`building.${def.id}.name`);
          const desc = t(`building.${def.id}.desc`);

          return (
            <div key={def.id} className={`bg-card medieval-border rounded-md p-4 ${locked ? 'opacity-50' : ''}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <TooltipWrapper content={desc}>
                    <h3 className="font-display text-base text-foreground cursor-help">
                      {def.icon} {name}
                      <span className="ml-2 text-sm text-primary">{t('city.level', bs.level)}</span>
                    </h3>
                  </TooltipWrapper>
                  <p className="text-xs text-muted-foreground mt-1">{desc}</p>
                  {prodInfo && <p className="text-xs text-forest mt-1">{prodInfo}</p>}
                </div>
              </div>

              {bs.upgrading ? (
                <div className="mt-3 flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">{t('city.upgrading')}</span>
                  <CountdownTimer endTime={bs.upgradeEndTime!} />
                </div>
              ) : locked ? (
                <p className="mt-3 text-xs text-accent">
                  {t('city.requires', t(`building.${def.unlockRequires!.buildingId}.name`), def.unlockRequires!.level)}
                </p>
              ) : maxed ? (
                <p className="mt-3 text-xs text-primary font-display">{t('city.maxLevel')}</p>
              ) : (
                <div className="mt-3">
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mb-2">
                    {Object.entries(cost).map(([k, v]) => (
                      <span key={k} className={!canAfford({ [k]: v as number }) ? 'text-accent' : ''}>
                        {RESOURCE_ICONS[k]}{Math.floor(v as number)}
                      </span>
                    ))}
                    <span>⏱️{t('city.time', Math.floor(upgradeTime / 60), upgradeTime % 60)}</span>
                  </div>
                  <button
                    onClick={() => upgradeBuilding(def.id)}
                    disabled={!affordable}
                    className="px-3 py-1.5 bg-primary text-primary-foreground rounded text-sm font-display hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {t('city.upgradeBtn', bs.level + 1)}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
