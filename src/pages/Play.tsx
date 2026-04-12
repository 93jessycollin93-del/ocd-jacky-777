import React from 'react';
import { GameProvider, useGame } from '@/game/GameContext';
import { I18nProvider } from '@/game/i18n';
import { AudioProvider } from '@/game/AudioSystem';
import GameLayout from '@/components/game/GameLayout';
import StartScreen from '@/components/game/StartScreen';

class GameErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch() { setTimeout(() => this.setState({ hasError: false }), 100); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center space-y-4">
            <span className="text-4xl">🐉</span>
            <p className="text-muted-foreground">Reloading realm...</p>
            <button onClick={() => window.location.reload()} className="text-primary underline text-sm">
              Refresh
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function PlayContent() {
  const { started } = useGame();
  return started ? <GameLayout /> : <StartScreen />;
}

export default function Play() {
  return (
    <I18nProvider>
      <AudioProvider>
        <GameProvider>
          <GameErrorBoundary>
            <PlayContent />
          </GameErrorBoundary>
        </GameProvider>
      </AudioProvider>
    </I18nProvider>
  );
}
