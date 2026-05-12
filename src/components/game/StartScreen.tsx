import { useState } from 'react';
import { useGame } from '@/game/GameContext';
import { useI18n } from '@/game/i18n';


export default function StartScreen() {
  const { startGame } = useGame();
  const { t } = useI18n();
  const [name, setName] = useState('');

  const handleStart = () => {
    startGame(name.trim() || t('ui.defaultRealm'));
  };

  return (
    <div className="min-h-screen parchment-bg flex items-center justify-center p-4">
      <div className="bg-card medieval-border rounded-lg p-8 max-w-md w-full text-center space-y-6">
        <div className="space-y-2">
          <div className="text-5xl">🐉</div>
          <h1 className="font-display text-3xl text-foreground ink-shadow whitespace-pre-line leading-tight">
            {t('ui.title')}
          </h1>
          <p className="text-muted-foreground text-sm">{t('ui.subtitle')}</p>
        </div>

        <div className="space-y-3">
          <input
            type="text"
            placeholder={t('ui.realmPlaceholder')}
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleStart()}
            className="w-full px-4 py-3 bg-muted border border-border rounded-md font-display text-foreground placeholder:text-muted-foreground text-center focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            onClick={handleStart}
            className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-md font-display text-lg hover:opacity-90 transition-opacity gold-glow"
          >
            {t('ui.foundRealm')}
          </button>
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <p>{t('ui.tip1')}</p>
          <p>{t('ui.tip2')}</p>
          <p>{t('ui.tip3')}</p>
          <p>{t('ui.tip4')}</p>
        </div>

        <p className="text-xs text-muted-foreground font-display tracking-wide pt-2 border-t border-border">
          Created by <span className="text-primary font-bold">CT2 Zhao Yun Ash 777 King</span>
        </p>
      </div>
    </div>
  );
}
