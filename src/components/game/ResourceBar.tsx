import { useGame } from '@/game/GameContext';
import { useI18n } from '@/game/i18n';
import { RESOURCE_ICONS } from '@/game/data';
import { Resources } from '@/game/types';

export default function ResourceBar() {
  const { state } = useGame();
  const { t } = useI18n();
  const resources: (keyof Resources)[] = ['food', 'wood', 'stone', 'iron', 'gold', 'diamonds'];

  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-2 bg-card medieval-border rounded-md">
      {resources.map(r => (
        <div key={r} className="flex items-center gap-1.5 text-sm">
          <span>{RESOURCE_ICONS[r]}</span>
          <span className="font-display text-xs uppercase tracking-wider text-muted-foreground">{t(`resource.${r}`)}</span>
          <span className="font-bold text-foreground">{Math.floor(state.resources[r]).toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}
