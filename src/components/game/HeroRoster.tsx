import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '@/game/GameContext';
import { useI18n } from '@/game/i18n';
import { HEROES } from '@/game/data';
import type { GearSlot, GearRarity } from '@/game/types';

const RARITY_COLORS: Record<GearRarity, string> = {
  common: 'text-muted-foreground',
  uncommon: 'text-green-400',
  rare: 'text-blue-400',
  ultra_rare: 'text-purple-400',
  legendary: 'text-yellow-400',
  mythic: 'text-red-400',
};

const SLOT_ICONS: Record<GearSlot, string> = { weapon: '⚔️', armor: '🛡️', accessory: '💍' };
const SLOTS: GearSlot[] = ['weapon', 'armor', 'accessory'];

const HERO_PORTRAITS: Record<string, string> = {
  aelindra: '👑',
  thormund: '⚒️',
  kael: '🗡️',
  mireth: '🌿',
};

export default function HeroRoster() {
  const { state, getHeroGearBonuses } = useGame();
  const { t } = useI18n();
  const [selectedHeroId, setSelectedHeroId] = useState<string | null>(null);

  const inventory = state.gearInventory || [];
  const heroEquipment = state.heroEquipment || {};

  const getEquippedItem = (heroId: string, slot: GearSlot) => {
    const gearId = heroEquipment[heroId]?.[slot];
    return gearId ? inventory.find(g => g.id === gearId) : undefined;
  };

  const selectedHero = selectedHeroId ? HEROES.find(h => h.id === selectedHeroId) : null;
  const isUnlocked = (id: string) => state.unlockedHeroes.includes(id);

  return (
    <div className="bg-card/60 backdrop-blur rounded-xl border border-border/30 p-4">
      <h3 className="text-sm font-bold text-foreground mb-3">👑 {t('heroes.title')}</h3>
      
      <div className="flex gap-4">
        {/* Portrait Grid */}
        <div className="grid grid-cols-2 gap-2 shrink-0">
          {HEROES.map(hero => {
            const unlocked = isUnlocked(hero.id);
            return (
              <button
                key={hero.id}
                onClick={() => unlocked && setSelectedHeroId(hero.id === selectedHeroId ? null : hero.id)}
                className={`w-16 h-16 rounded-lg flex flex-col items-center justify-center transition-all border ${
                  selectedHeroId === hero.id
                    ? 'border-primary bg-primary/20 ring-1 ring-primary/40'
                    : unlocked
                    ? 'border-border/30 bg-background/30 hover:border-primary/30 hover:bg-primary/10'
                    : 'border-border/10 bg-background/10 opacity-40 cursor-not-allowed'
                }`}
              >
                <span className="text-2xl">{HERO_PORTRAITS[hero.id] || hero.icon}</span>
                <span className="text-[10px] text-muted-foreground truncate w-full text-center">
                  {t(`hero.${hero.id}.name`)}
                </span>
              </button>
            );
          })}
        </div>

        {/* Detail Panel */}
        <AnimatePresence mode="wait">
          {selectedHero ? (
            <motion.div
              key={selectedHero.id}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              className="flex-1 min-w-0 space-y-3"
            >
              <div>
                <h4 className="text-sm font-bold text-foreground">
                  {HERO_PORTRAITS[selectedHero.id]} {t(`hero.${selectedHero.id}.name`)}
                </h4>
                <p className="text-xs text-muted-foreground">{t(`hero.${selectedHero.id}.desc`)}</p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-1">
                <StatRow label={t('heroes.bonus')} value={`+${selectedHero.bonus.value}% ${selectedHero.bonus.type}`} />
                {(() => {
                  const bonuses = getHeroGearBonuses(selectedHero.id);
                  return Object.entries(bonuses).filter(([, v]) => v > 0).map(([k, v]) => (
                    <StatRow key={k} label={k} value={`+${v}`} accent />
                  ));
                })()}
              </div>

              {/* Equipment Slots */}
              <div>
                <p className="text-xs font-bold text-muted-foreground mb-1">Equipment</p>
                <div className="flex gap-2">
                  {SLOTS.map(slot => {
                    const gear = getEquippedItem(selectedHero.id, slot);
                    return (
                      <div
                        key={slot}
                        className={`w-12 h-12 rounded-lg border flex items-center justify-center ${
                          gear
                            ? `border-primary/30 bg-primary/10`
                            : 'border-border/20 bg-background/20 border-dashed'
                        }`}
                        title={gear ? `${gear.name} (${gear.rarity})` : `Empty ${slot}`}
                      >
                        {gear ? (
                          <div className="text-center">
                            <span className="text-sm">{SLOT_ICONS[slot]}</span>
                            <span className={`block text-[8px] ${RARITY_COLORS[gear.rarity]}`}>
                              {gear.rarity.slice(0, 3).toUpperCase()}
                            </span>
                          </div>
                        ) : (
                          <span className="text-lg opacity-30">{SLOT_ICONS[slot]}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 flex items-center justify-center"
            >
              <p className="text-xs text-muted-foreground text-center">
                Select a hero to view details
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function StatRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-muted-foreground capitalize">{label}</span>
      <span className={accent ? 'text-primary font-bold' : 'text-foreground'}>{value}</span>
    </div>
  );
}
