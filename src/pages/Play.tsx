import { GameProvider, useGame } from '@/game/GameContext';
import { I18nProvider } from '@/game/i18n';
import { AudioProvider } from '@/game/AudioSystem';
import GameLayout from '@/components/game/GameLayout';
import StartScreen from '@/components/game/StartScreen';

function PlayContent() {
  const { started } = useGame();
  return started ? <GameLayout /> : <StartScreen />;
}

export default function Play() {
  return (
    <I18nProvider>
      <AudioProvider>
        <GameProvider>
          <PlayContent />
        </GameProvider>
      </AudioProvider>
    </I18nProvider>
  );
}
