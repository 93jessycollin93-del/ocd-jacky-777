import { useGame } from '@/game/GameContext';
import { Card, CardContent } from '@/components/ui/card';
import { verifyStateIntegrity, computeStateChecksum } from '@/game/transactionGuard';
import { BUILDINGS } from '@/game/data';

export default function DiagnosticsPanel() {
  const { state } = useGame();

  const integrity = verifyStateIntegrity(state);
  const checksum = computeStateChecksum(state);

  // Production rates
  const productionRates: { resource: string; rate: string }[] = [];
  for (const bState of state.buildings) {
    const def = BUILDINGS.find(b => b.id === bState.id);
    if (def?.produces && bState.level > 0) {
      const rate = (def.baseProduction || 0) * Math.pow(1.12, bState.level - 1);
      productionRates.push({ resource: def.produces, rate: `${rate.toFixed(1)}/min` });
    }
  }

  // Active timers
  const activeTimers: { label: string; remaining: string }[] = [];
  const now = Date.now();
  for (const b of state.buildings.filter(b => b.upgrading && b.upgradeEndTime)) {
    const rem = Math.max(0, (b.upgradeEndTime! - now) / 1000);
    activeTimers.push({ label: `${b.id} upgrade`, remaining: `${Math.floor(rem / 60)}m ${Math.floor(rem % 60)}s` });
  }
  for (const r of state.research.filter(r => r.researching && r.researchEndTime)) {
    const rem = Math.max(0, (r.researchEndTime! - now) / 1000);
    activeTimers.push({ label: `${r.id} research`, remaining: `${Math.floor(rem / 60)}m ${Math.floor(rem % 60)}s` });
  }
  for (const t of state.troops.filter(t => t.training > 0 && t.trainingEndTime)) {
    const rem = Math.max(0, (t.trainingEndTime! - now) / 1000);
    activeTimers.push({ label: `${t.id} training (${t.training})`, remaining: `${Math.floor(rem / 60)}m ${Math.floor(rem % 60)}s` });
  }

  // localStorage size
  let storageSize = 'N/A';
  try {
    const raw = localStorage.getItem('middle_earth_strategy_save');
    if (raw) storageSize = `${(raw.length / 1024).toFixed(1)} KB`;
  } catch {}

  return (
    <div className="p-4 space-y-4">
      <h2 className="font-display text-xl text-foreground">🔧 Diagnostics</h2>

      {/* Integrity */}
      <Card className={`bg-card/80 ${integrity ? 'border-green-500/40' : 'border-red-500/40'}`}>
        <CardContent className="p-3">
          <div className="text-sm font-semibold text-foreground">State Integrity</div>
          <div className={`text-xs ${integrity ? 'text-green-400' : 'text-red-400'}`}>
            {integrity ? '✅ Checksum valid' : '⚠️ Checksum mismatch — possible tampering'}
          </div>
          <div className="text-[10px] text-muted-foreground font-mono mt-1">Hash: {checksum}</div>
        </CardContent>
      </Card>

      {/* Storage */}
      <Card className="bg-card/80 border-border/50">
        <CardContent className="p-3">
          <div className="text-sm font-semibold text-foreground">Storage</div>
          <div className="text-xs text-muted-foreground">Save size: {storageSize}</div>
          <div className="text-xs text-muted-foreground">Realm: {state.realmName}</div>
          <div className="text-xs text-muted-foreground">Last tick: {new Date(state.lastTick).toLocaleString()}</div>
        </CardContent>
      </Card>

      {/* Production */}
      <Card className="bg-card/80 border-border/50">
        <CardContent className="p-3">
          <div className="text-sm font-semibold text-foreground mb-1">📈 Production Rates</div>
          {productionRates.length === 0 ? (
            <div className="text-xs text-muted-foreground">No production buildings active</div>
          ) : (
            <div className="space-y-0.5">
              {productionRates.map((p, i) => (
                <div key={i} className="text-xs text-foreground flex justify-between">
                  <span>{p.resource}</span><span className="text-muted-foreground">{p.rate}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Timers */}
      <Card className="bg-card/80 border-border/50">
        <CardContent className="p-3">
          <div className="text-sm font-semibold text-foreground mb-1">⏱️ Active Timers ({activeTimers.length})</div>
          {activeTimers.length === 0 ? (
            <div className="text-xs text-muted-foreground">No active timers</div>
          ) : (
            <div className="space-y-0.5">
              {activeTimers.map((t, i) => (
                <div key={i} className="text-xs text-foreground flex justify-between">
                  <span>{t.label}</span><span className="text-yellow-400">{t.remaining}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Game stats */}
      <Card className="bg-card/80 border-border/50">
        <CardContent className="p-3">
          <div className="text-sm font-semibold text-foreground mb-1">📊 Stats</div>
          <div className="grid grid-cols-2 gap-1 text-xs">
            <span className="text-muted-foreground">Buildings:</span><span className="text-foreground">{state.buildings.length}</span>
            <span className="text-muted-foreground">Research:</span><span className="text-foreground">{state.research.filter(r => r.level > 0).length}</span>
            <span className="text-muted-foreground">Troops:</span><span className="text-foreground">{state.troops.reduce((s, t) => s + t.count, 0)}</span>
            <span className="text-muted-foreground">Marches:</span><span className="text-foreground">{state.marches.length}</span>
            <span className="text-muted-foreground">Gear:</span><span className="text-foreground">{(state.gearInventory || []).length}</span>
            <span className="text-muted-foreground">Bag items:</span><span className="text-foreground">{(state.bag || []).length}</span>
            <span className="text-muted-foreground">Gacha pulls:</span><span className="text-foreground">{(state.gachaHistory || []).length}</span>
            <span className="text-muted-foreground">AI events:</span><span className="text-foreground">{(state.aiEventLog || []).length}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
