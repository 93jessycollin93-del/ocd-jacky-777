import { useSphere } from '../SphereContext';

export default function ResourceHUD() {
  const { state } = useSphere();
  const r = state.globalResources;
  const playerPlanets = state.planets.filter(p => p.owner === 'player').length;

  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-2 bg-card/90 backdrop-blur border-b border-border text-sm">
      <span className="font-bold text-foreground">T{state.turn}</span>
      <span title="Minerals">⛏️ {Math.floor(r.minerals).toLocaleString()}</span>
      <span title="Energy">⚡ {Math.floor(r.energy).toLocaleString()}</span>
      <span title="Food">🌾 {Math.floor(r.food).toLocaleString()}</span>
      <span title="Credits">💰 {Math.floor(r.credits).toLocaleString()}</span>
      <span title="Research">🔬 {Math.floor(r.research).toLocaleString()}</span>
      <span className="ml-auto text-muted-foreground">🌍 {playerPlanets}/20</span>
      <span className="text-primary font-bold">{state.victoryProgress}%</span>
    </div>
  );
}
