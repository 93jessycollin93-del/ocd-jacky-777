import NeuralMesh from '@/components/visualizers/NeuralMesh';
import OrbitField from '@/components/visualizers/OrbitField';
import PulseTimeline from '@/components/visualizers/PulseTimeline';
import EruPageShell from './EruPageShell';

const Tile = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="rounded-lg border border-border bg-card/60 p-3 backdrop-blur">
    <div className="mb-2 text-xs font-mono uppercase tracking-wider text-muted-foreground">{title}</div>
    <div className="h-48 w-full overflow-hidden rounded-md border border-border bg-background">
      {children}
    </div>
  </div>
);

/** Vibe-code lab so both Jackies can preview the shared visualizers. */
export default function VisualizerLab() {
  return (
    <EruPageShell title="Visualizer Lab" badge="LIVE" banner="Shared visual primitives used across Jackie + Eru.">
      <div className="mx-auto grid max-w-6xl gap-4 p-6 md:grid-cols-2 lg:grid-cols-3">
        <Tile title="Neural Mesh"><NeuralMesh /></Tile>
        <Tile title="Orbit Field"><OrbitField /></Tile>
        <Tile title="Pulse Timeline"><PulseTimeline /></Tile>
        <Tile title="Neural · dense"><NeuralMesh density={50} accent="hsl(200 90% 60%)" /></Tile>
        <Tile title="Orbit · fast"><OrbitField speed={3} color="hsl(280 90% 70%)" /></Tile>
        <Tile title="Pulse · calm"><PulseTimeline color="hsl(160 80% 55%)" /></Tile>
      </div>
    </EruPageShell>
  );
}
