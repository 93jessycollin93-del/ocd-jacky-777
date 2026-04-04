import { useGame } from '@/game/GameContext';
import { useI18n } from '@/game/i18n';
import { RESEARCH, getResearchCost, getUpgradeTime, RESOURCE_ICONS } from '@/game/data';
import { ResearchCategory } from '@/game/types';
import CountdownTimer from '@/components/game/CountdownTimer';
import { useState } from 'react';

function ArcaneTreeDiagram({ state, t }: { state: any; t: (key: string, ...args: any[]) => string }) {
  const nodes = RESEARCH.filter(r => r.category === 'arcane');
  const getLevel = (id: string) => state.research.find((r: any) => r.id === id)?.level || 0;

  const nodeData = nodes.map(n => ({
    ...n,
    level: getLevel(n.id),
    unlocked: !n.requires || getLevel(n.requires.researchId) >= n.requires.level,
  }));

  // Layout: Oracle at top, Mana Weaving + Astral Navigation branch from it,
  // Rune Mastery from Mana, Arcane Fortification from Rune
  const positions: Record<string, { x: number; y: number }> = {
    oracle_attunement: { x: 50, y: 10 },
    mana_weaving: { x: 25, y: 40 },
    astral_navigation: { x: 75, y: 40 },
    rune_mastery: { x: 25, y: 70 },
    arcane_fortification: { x: 25, y: 100 },
  };

  const connections = nodes
    .filter(n => n.requires)
    .map(n => ({ from: n.requires!.researchId, to: n.id, reqLevel: n.requires!.level }));

  return (
    <div className="bg-card/50 medieval-border rounded-md p-4 mb-4">
      <h3 className="font-display text-sm text-muted-foreground mb-3 text-center">🔮 Arcane Research Tree</h3>
      <div className="relative" style={{ height: '280px' }}>
        <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 0 }}>
          {connections.map(conn => {
            const fromPos = positions[conn.from];
            const toPos = positions[conn.to];
            if (!fromPos || !toPos) return null;
            const fromNode = nodeData.find(n => n.id === conn.from);
            const isActive = fromNode && fromNode.level >= conn.reqLevel;
            return (
              <line
                key={`${conn.from}-${conn.to}`}
                x1={`${fromPos.x}%`} y1={`${fromPos.y + 12}%`}
                x2={`${toPos.x}%`} y2={`${toPos.y}%`}
                stroke={isActive ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground) / 0.3)'}
                strokeWidth={isActive ? 2 : 1}
                strokeDasharray={isActive ? 'none' : '4 4'}
              />
            );
          })}
        </svg>
        {nodeData.map(node => {
          const pos = positions[node.id];
          if (!pos) return null;
          const isActive = node.level > 0;
          const isUnlocked = node.unlocked;
          return (
            <div
              key={node.id}
              className={`absolute transform -translate-x-1/2 text-center transition-all ${
                isActive ? 'opacity-100' : isUnlocked ? 'opacity-80' : 'opacity-40'
              }`}
              style={{ left: `${pos.x}%`, top: `${pos.y}%`, zIndex: 1, width: '120px' }}
            >
              <div className={`inline-flex flex-col items-center px-2 py-1.5 rounded-lg border text-xs ${
                isActive
                  ? 'bg-primary/20 border-primary text-foreground'
                  : isUnlocked
                    ? 'bg-card border-muted-foreground/30 text-foreground'
                    : 'bg-muted/30 border-muted-foreground/20 text-muted-foreground'
              }`}>
                <span className="text-lg">{node.icon}</span>
                <span className="font-display leading-tight">{t(`research.${node.id}.name`)}</span>
                <span className={`text-[10px] ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                  Lv {node.level}/{node.maxLevel}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ResearchPage() {
  const { state, startResearch, canAfford, getBuildingLevel } = useGame();
  const { t } = useI18n();
  const [category, setCategory] = useState<ResearchCategory>('economy');
  const hasAcademy = getBuildingLevel('academy') > 0;

  const filtered = RESEARCH.filter(r => r.category === category);

  return (
    <div className="space-y-4">
      <h2 className="font-display text-2xl ink-shadow text-foreground">{t('research.title')}</h2>

      {!hasAcademy && (
        <div className="bg-accent/10 medieval-border rounded-md p-3 text-sm text-accent">
          {t('research.locked')}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {(['economy', 'military', 'arcane', 'infrastructure', 'siege', 'logistics'] as const).map(c => {
          const icons: Record<string, string> = { economy: '💰', military: '⚔️', arcane: '🔮', infrastructure: '🏗️', siege: '🪨', logistics: '📦' };
          return (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-3 py-1.5 rounded font-display text-xs transition-colors ${
                category === c ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {icons[c]} {t(`research.${c}`)}
            </button>
          );
        })}
      </div>

      {category === 'arcane' && <ArcaneTreeDiagram state={state} t={t} />}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.map(def => {
          const rs = state.research.find(r => r.id === def.id)!;
          const cost = getResearchCost(def, rs.level);
          const affordable = canAfford(cost);
          const maxed = rs.level >= def.maxLevel;
          const locked = def.requires && (state.research.find(r => r.id === def.requires!.researchId)?.level || 0) < def.requires.level;
          const time = getUpgradeTime(rs.level);

          return (
            <div key={def.id} className={`bg-card medieval-border rounded-md p-4 ${locked || !hasAcademy ? 'opacity-50' : ''}`}>
              <h3 className="font-display text-base text-foreground">
                {def.icon} {t(`research.${def.id}.name`)}
                <span className="ml-2 text-sm text-primary">{t('city.level', rs.level)}</span>
              </h3>
              <p className="text-xs text-muted-foreground mt-1">{t(`research.${def.id}.desc`)}</p>
              <p className="text-xs text-forest mt-1">
                {t(`effect.${def.effect}`)}: +{def.effectPerLevel * rs.level}%
                {rs.level < def.maxLevel && <span className="text-muted-foreground"> {t('research.next', def.effectPerLevel * (rs.level + 1))}</span>}
              </p>

              {rs.researching ? (
                <div className="mt-3 flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">{t('research.researching')}</span>
                  <CountdownTimer endTime={rs.researchEndTime!} />
                </div>
              ) : locked ? (
                <p className="mt-3 text-xs text-accent">
                  {t('research.requires', t(`research.${def.requires!.researchId}.name`), def.requires!.level)}
                </p>
              ) : maxed ? (
                <p className="mt-3 text-xs text-primary font-display">{t('research.maxLevel')}</p>
              ) : (
                <div className="mt-3">
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mb-2">
                    {Object.entries(cost).map(([k, v]) => (
                      <span key={k} className={!canAfford({ [k]: v as number }) ? 'text-accent' : ''}>
                        {RESOURCE_ICONS[k]}{Math.floor(v as number)}
                      </span>
                    ))}
                    <span>⏱️{t('city.time', Math.floor(time / 60), time % 60)}</span>
                  </div>
                  <button
                    onClick={() => startResearch(def.id)}
                    disabled={!affordable || !hasAcademy}
                    className="px-3 py-1.5 bg-primary text-primary-foreground rounded text-sm font-display hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {t('research.btn', rs.level + 1)}
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
