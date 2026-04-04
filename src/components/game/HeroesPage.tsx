import { useState } from 'react';
import { useGame } from '@/game/GameContext';
import { useI18n } from '@/game/i18n';
import { HEROES, GEAR_CRAFT_RECIPES, GEAR_UPGRADE_RECIPES, RARITY_ORDER, CRAFTING_MATERIAL_ICONS } from '@/game/data';
import { GearSlot, GearRarity, GearItem } from '@/game/types';

const RARITY_COLORS: Record<GearRarity, string> = {
  common: 'text-muted-foreground',
  uncommon: 'text-green-400',
  rare: 'text-blue-400',
  ultra_rare: 'text-purple-400',
  legendary: 'text-yellow-400',
  mythic: 'text-red-400',
};

const RARITY_BG: Record<GearRarity, string> = {
  common: 'border-muted-foreground/30',
  uncommon: 'border-green-400/40',
  rare: 'border-blue-400/40',
  ultra_rare: 'border-purple-400/40',
  legendary: 'border-yellow-400/40 shadow-[0_0_8px_rgba(234,179,8,0.2)]',
  mythic: 'border-red-400/40 shadow-[0_0_12px_rgba(239,68,68,0.3)]',
};

const SLOT_ICONS: Record<GearSlot, string> = { weapon: '⚔️', armor: '🛡️', accessory: '💍' };

type ViewMode = 'heroes' | 'forge' | 'upgrade';

export default function HeroesPage() {
  const { state, equipGear, unequipGear, getHeroGearBonuses, craftGear, upgradeGear, canAffordMaterials } = useGame();
  const { t } = useI18n();
  const [selectedHero, setSelectedHero] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<GearSlot | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('heroes');
  const [selectedUpgradeGear, setSelectedUpgradeGear] = useState<string | null>(null);

  const inventory = state.gearInventory || [];
  const heroEquipment = state.heroEquipment || {};
  const materials = state.craftingMaterials || {};

  const equippedGearIds = new Set(
    Object.values(heroEquipment).flatMap(slots => Object.values(slots || {}).filter(Boolean) as string[])
  );

  const getEquippedItem = (heroId: string, slot: GearSlot) => {
    const gearId = heroEquipment[heroId]?.[slot];
    return gearId ? inventory.find(g => g.id === gearId) : undefined;
  };

  return (
    <div className="space-y-4">
      <h2 className="font-display text-2xl ink-shadow text-foreground">{t('heroes.title')}</h2>

      {/* Mode tabs */}
      <div className="flex gap-2">
        {(['heroes', 'forge', 'upgrade'] as ViewMode[]).map(mode => (
          <button key={mode} onClick={() => setViewMode(mode)}
            className={`px-4 py-2 rounded font-display text-sm transition-colors ${
              viewMode === mode ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}>
            {mode === 'heroes' ? '👑' : mode === 'forge' ? '🔨' : '⬆️'} {t(`gear.tab.${mode}`)}
          </button>
        ))}
      </div>

      {/* Materials bar */}
      <div className="bg-card medieval-border rounded-md p-3">
        <p className="text-xs font-display text-muted-foreground mb-2">{t('gear.materials')}</p>
        <div className="flex flex-wrap gap-3 text-xs">
          {(Object.entries(CRAFTING_MATERIAL_ICONS) as [string, string][]).map(([mat, icon]) => (
            <span key={mat} className="flex items-center gap-1 text-foreground">
              {icon} <strong>{materials[mat as keyof typeof materials] || 0}</strong>
              <span className="text-muted-foreground">{t(`mat.${mat}`)}</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── Heroes Tab ── */}
      {viewMode === 'heroes' && (
        <>
          <p className="text-sm text-muted-foreground">{t('heroes.subtitle')}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {HEROES.map(hero => {
              const unlocked = state.unlockedHeroes.includes(hero.id);
              const gearBonuses = getHeroGearBonuses(hero.id);
              const isSelected = selectedHero === hero.id;

              return (
                <div key={hero.id} className={`bg-card medieval-border rounded-md p-5 ${!unlocked ? 'opacity-40' : ''}`}>
                  <div className="flex items-start gap-4">
                    <div className="text-4xl">{hero.icon}</div>
                    <div className="flex-1">
                      <h3 className="font-display text-lg text-foreground">{t(`hero.${hero.id}.name`)}</h3>
                      <p className="font-display text-sm text-primary">{t(`hero.${hero.id}.title`)}</p>
                      <p className="text-sm text-muted-foreground mt-2">{t(`hero.${hero.id}.desc`)}</p>
                      <div className="mt-2 inline-block px-3 py-1 bg-primary/10 rounded text-sm font-display text-primary">
                        {t(`hero.${hero.id}.bonus`)}
                      </div>
                      {unlocked && Object.values(gearBonuses).some(v => v > 0) && (
                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                          {gearBonuses.attack > 0 && <span className="text-accent">⚔️+{gearBonuses.attack}%</span>}
                          {gearBonuses.defense > 0 && <span className="text-primary">🛡️+{gearBonuses.defense}%</span>}
                          {gearBonuses.health > 0 && <span className="text-primary">❤️+{gearBonuses.health}%</span>}
                          {gearBonuses.speed > 0 && <span className="text-primary">💨+{gearBonuses.speed}%</span>}
                          {gearBonuses.gathering > 0 && <span className="text-primary">🌿+{gearBonuses.gathering}%</span>}
                        </div>
                      )}
                    </div>
                  </div>

                  {unlocked && (
                    <div className="mt-4 space-y-2">
                      <p className="text-xs font-display text-muted-foreground">{t('gear.equipment')}:</p>
                      <div className="grid grid-cols-3 gap-2">
                        {(['weapon', 'armor', 'accessory'] as GearSlot[]).map(slot => {
                          const equipped = getEquippedItem(hero.id, slot);
                          return (
                            <button key={slot}
                              onClick={() => {
                                if (isSelected && selectedSlot === slot) { setSelectedHero(null); setSelectedSlot(null); }
                                else { setSelectedHero(hero.id); setSelectedSlot(slot); }
                              }}
                              className={`p-2 rounded border text-center transition-all ${
                                equipped ? `${RARITY_BG[equipped.rarity]} bg-muted` : 'border-dashed border-muted-foreground/30 bg-muted/50'
                              } ${isSelected && selectedSlot === slot ? 'ring-2 ring-primary' : ''} hover:bg-muted`}>
                              {equipped ? (
                                <>
                                  <div className="text-xl">{equipped.icon}</div>
                                  <div className={`text-xs font-display truncate ${RARITY_COLORS[equipped.rarity]}`}>{t(equipped.name)}</div>
                                  <div className={`text-[9px] ${RARITY_COLORS[equipped.rarity]}`}>{t(`gear.rarity.${equipped.rarity}`)}</div>
                                </>
                              ) : (
                                <>
                                  <div className="text-xl opacity-30">{SLOT_ICONS[slot]}</div>
                                  <div className="text-xs text-muted-foreground">{t(`gear.slot.${slot}`)}</div>
                                </>
                              )}
                            </button>
                          );
                        })}
                      </div>
                      {isSelected && selectedSlot && getEquippedItem(hero.id, selectedSlot) && (
                        <button onClick={() => { unequipGear(hero.id, selectedSlot); setSelectedSlot(null); setSelectedHero(null); }}
                          className="text-xs text-accent hover:underline">{t('gear.unequip')}</button>
                      )}
                    </div>
                  )}
                  {!unlocked && <p className="mt-3 text-xs text-accent font-display">{t('heroes.locked')}</p>}
                </div>
              );
            })}
          </div>

          {/* Gear selection panel */}
          {selectedHero && selectedSlot && (
            <div className="bg-card medieval-border rounded-md p-4">
              <h3 className="font-display text-base text-foreground mb-3">
                {t('gear.selectFor', t(`gear.slot.${selectedSlot}`), t(`hero.${selectedHero}.name`))}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {inventory.filter(g => g.slot === selectedSlot && !equippedGearIds.has(g.id))
                  .sort((a, b) => RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity))
                  .map(item => (
                    <button key={item.id}
                      onClick={() => { equipGear(selectedHero, item.id); setSelectedHero(null); setSelectedSlot(null); }}
                      className={`p-3 rounded border ${RARITY_BG[item.rarity]} bg-muted hover:bg-muted/80 transition-all text-left`}>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{item.icon}</span>
                        <div>
                          <p className={`text-sm font-display ${RARITY_COLORS[item.rarity]}`}>{t(item.name)}</p>
                          <p className="text-xs text-muted-foreground capitalize">{t(`gear.rarity.${item.rarity}`)}</p>
                        </div>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1 text-xs">
                        {item.bonuses.map((b, i) => (
                          <span key={i} className="text-primary">+{b.value}% {t(`gear.stat.${b.type}`)}</span>
                        ))}
                      </div>
                    </button>
                  ))}
                {inventory.filter(g => g.slot === selectedSlot && !equippedGearIds.has(g.id)).length === 0 && (
                  <p className="col-span-full text-sm text-muted-foreground">{t('gear.noItems')}</p>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Forge Tab (Craft new gear) ── */}
      {viewMode === 'forge' && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{t('gear.forgeDesc')}</p>
          {RARITY_ORDER.map(rarity => {
            const recipes = GEAR_CRAFT_RECIPES.filter(r => r.rarity === rarity);
            if (recipes.length === 0) return null;
            return (
              <div key={rarity} className="space-y-2">
                <h3 className={`font-display text-sm ${RARITY_COLORS[rarity]}`}>
                  {t(`gear.rarity.${rarity}`)} {t('gear.tier')}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {recipes.map(recipe => {
                    const canCraft = canAffordMaterials(recipe.materials, recipe.resourceCost);
                    return (
                      <div key={recipe.gearName} className={`bg-card medieval-border rounded-md p-3 ${!canCraft ? 'opacity-60' : ''}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-2xl">{recipe.icon}</span>
                          <div>
                            <p className={`font-display text-sm ${RARITY_COLORS[recipe.rarity]}`}>{t(recipe.gearName)}</p>
                            <p className="text-[10px] text-muted-foreground">{t(`gear.slot.${recipe.slot}`)}</p>
                          </div>
                        </div>
                        <div className="text-xs space-y-1 mb-2">
                          <p className="text-muted-foreground font-display">{t('gear.matCost')}:</p>
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(recipe.materials).map(([mat, amt]) => (
                              <span key={mat} className={(materials[mat as keyof typeof materials] || 0) >= (amt || 0) ? 'text-foreground' : 'text-accent'}>
                                {CRAFTING_MATERIAL_ICONS[mat as keyof typeof CRAFTING_MATERIAL_ICONS]}{amt}
                              </span>
                            ))}
                            {Object.entries(recipe.resourceCost).map(([res, amt]) => (
                              <span key={res} className="text-muted-foreground">
                                {res === 'iron' ? '⚙️' : '💰'}{amt}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="text-xs text-primary mb-2 flex flex-wrap gap-1">
                          {recipe.bonuses.map((b, i) => (
                            <span key={i}>+{b.value}% {t(`gear.stat.${b.type}`)}</span>
                          ))}
                        </div>
                        <button onClick={() => craftGear(recipe.gearName)} disabled={!canCraft}
                          className="w-full px-3 py-1.5 bg-primary text-primary-foreground rounded text-sm font-display hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed">
                          🔨 {t('gear.craftBtn')}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Upgrade Tab ── */}
      {viewMode === 'upgrade' && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{t('gear.upgradeDesc')}</p>

          {/* Select gear to upgrade */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {inventory
              .filter(g => g.rarity !== 'mythic')
              .sort((a, b) => RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity))
              .map(item => {
                const isSelected = selectedUpgradeGear === item.id;
                return (
                  <button key={item.id} onClick={() => setSelectedUpgradeGear(isSelected ? null : item.id)}
                    className={`p-2 rounded border ${RARITY_BG[item.rarity]} bg-muted text-center transition-all ${
                      isSelected ? 'ring-2 ring-primary' : ''
                    } hover:bg-muted/80`}>
                    <div className="text-xl">{item.icon}</div>
                    <p className={`text-xs font-display truncate ${RARITY_COLORS[item.rarity]}`}>{t(item.name)}</p>
                    <p className={`text-[10px] ${RARITY_COLORS[item.rarity]}`}>{t(`gear.rarity.${item.rarity}`)}</p>
                    {equippedGearIds.has(item.id) && <p className="text-[10px] text-primary">{t('gear.equipped')}</p>}
                  </button>
                );
              })}
          </div>

          {/* Upgrade panel */}
          {selectedUpgradeGear && (() => {
            const item = inventory.find(g => g.id === selectedUpgradeGear);
            if (!item) return null;
            const recipe = GEAR_UPGRADE_RECIPES.find(r => r.fromRarity === item.rarity);
            if (!recipe) return null;
            const canUpgrade = canAffordMaterials(recipe.materials, recipe.resourceCost);
            const nextRarity = recipe.toRarity;

            return (
              <div className="bg-card medieval-border rounded-md p-4">
                <h3 className="font-display text-base text-foreground mb-3">{t('gear.upgradeTitle')}</h3>
                <div className="flex items-center gap-4 mb-3">
                  <div className="text-center">
                    <div className="text-3xl">{item.icon}</div>
                    <p className={`text-sm font-display ${RARITY_COLORS[item.rarity]}`}>{t(item.name)}</p>
                    <p className={`text-xs ${RARITY_COLORS[item.rarity]}`}>{t(`gear.rarity.${item.rarity}`)}</p>
                  </div>
                  <div className="text-2xl text-muted-foreground">→</div>
                  <div className="text-center">
                    <div className="text-3xl">{item.icon}</div>
                    <p className={`text-sm font-display ${RARITY_COLORS[nextRarity]}`}>{t(item.name)}</p>
                    <p className={`text-xs ${RARITY_COLORS[nextRarity]}`}>{t(`gear.rarity.${nextRarity}`)}</p>
                  </div>
                </div>
                <div className="text-xs space-y-1 mb-3">
                  <p className="text-muted-foreground font-display">{t('gear.upgradeCost')} (5x {t('gear.scaling')}):</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(recipe.materials).map(([mat, amt]) => (
                      <span key={mat} className={(materials[mat as keyof typeof materials] || 0) >= (amt || 0) ? 'text-foreground' : 'text-accent'}>
                        {CRAFTING_MATERIAL_ICONS[mat as keyof typeof CRAFTING_MATERIAL_ICONS]}{amt} {t(`mat.${mat}`)}
                      </span>
                    ))}
                    {Object.entries(recipe.resourceCost).map(([res, amt]) => (
                      <span key={res} className="text-muted-foreground">{res === 'iron' ? '⚙️' : '💰'}{amt}</span>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-primary mb-3">
                  {t('gear.statBoost')}: ×{recipe.statMultiplier} {t('gear.allStats')}
                </p>
                <button onClick={() => { upgradeGear(selectedUpgradeGear); setSelectedUpgradeGear(null); }} disabled={!canUpgrade}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded font-display text-sm hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed">
                  ⬆️ {t('gear.upgradeBtn')}
                </button>
              </div>
            );
          })()}

          {inventory.filter(g => g.rarity !== 'mythic').length === 0 && (
            <p className="text-sm text-muted-foreground">{t('gear.noGearToUpgrade')}</p>
          )}
        </div>
      )}

      {/* Full Inventory */}
      {inventory.length > 0 && viewMode === 'heroes' && (
        <div className="bg-card medieval-border rounded-md p-4">
          <h3 className="font-display text-base text-foreground mb-3">{t('gear.inventory')} ({inventory.length})</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {inventory
              .sort((a, b) => RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity))
              .map(item => {
                const isEquipped = equippedGearIds.has(item.id);
                return (
                  <div key={item.id}
                    className={`p-2 rounded border ${RARITY_BG[item.rarity]} ${isEquipped ? 'opacity-50' : ''} bg-muted text-center`}>
                    <div className="text-xl">{item.icon}</div>
                    <p className={`text-xs font-display truncate ${RARITY_COLORS[item.rarity]}`}>{t(item.name)}</p>
                    <p className={`text-[10px] ${RARITY_COLORS[item.rarity]}`}>{t(`gear.rarity.${item.rarity}`)}</p>
                    <div className="flex flex-wrap justify-center gap-0.5 text-[9px] text-primary mt-0.5">
                      {item.bonuses.map((b, i) => <span key={i}>+{b.value}%{t(`gear.stat.${b.type}`)}</span>)}
                    </div>
                    {isEquipped && <p className="text-[10px] text-primary">{t('gear.equipped')}</p>}
                  </div>
                );
              })}
          </div>
        </div>
      )}

      <div className="bg-card medieval-border rounded-md p-4 text-sm text-muted-foreground">
        <h3 className="font-display text-base text-foreground mb-2">{t('heroes.counterTitle')}</h3>
        <div className="space-y-1">
          <p dangerouslySetInnerHTML={{ __html: t('heroes.counterInf') }} />
          <p dangerouslySetInnerHTML={{ __html: t('heroes.counterCav') }} />
          <p dangerouslySetInnerHTML={{ __html: t('heroes.counterRng') }} />
        </div>
      </div>
    </div>
  );
}
