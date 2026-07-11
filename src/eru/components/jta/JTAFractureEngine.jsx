import { useState } from 'react';
import { Zap, AlertTriangle, Loader2 } from 'lucide-react';
import { base44 } from '@/eru/api/base44Client';

// Fracture Rules:
// - Min volume to fracture: > 0.5 kg
// - Max fractures per asset: 3 (anti-exploit)
// - Coins minted = floor(volume_kg * composite_score * 0.1)
// - Resonance Bonus: batch_1 adds 10% to coin yield
// - After 3 fractures: asset becomes 'dust' (no further actions)
const MAX_FRACTURES = 3;
const MIN_FRACTURE_KG = 0.5;

export default function JTAFractureEngine({ jade, onDone }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  if (!jade) return null;

  const fractures = jade.fracture_count || 0;
  const canFracture = jade.volume_kg > MIN_FRACTURE_KG && fractures < MAX_FRACTURES;
  const resonanceBonus = jade.batch === 'batch_1' ? 1.1 : 1.0;
  const coinsToMint = Math.floor(jade.volume_kg * (jade.composite_score || 1) * 0.1 * resonanceBonus);

  const handleFracture = async () => {
    setLoading(true);
    const newFractureCount = fractures + 1;
    const isLast = newFractureCount >= MAX_FRACTURES;

    const newHistory = [...(jade.resonance_history || []), {
      event_type: 'fracture',
      description: `Fractured → ${coinsToMint} $JADE minted. Fracture ${newFractureCount}/${MAX_FRACTURES}.${isLast ? ' Final fracture — asset becomes dust.' : ''}`,
      timestamp: new Date().toISOString(),
      actor: 'user',
      metadata: { coins_minted: coinsToMint, fracture_number: newFractureCount, resonance_bonus: resonanceBonus },
    }];

    await base44.entities.JadeAsset.update(jade.id, {
      lifecycle_state: isLast ? 'shattered' : jade.lifecycle_state,
      crafted_form: isLast ? 'dust' : 'fragment',
      fracture_count: newFractureCount,
      jade_coins_minted: (jade.jade_coins_minted || 0) + coinsToMint,
      resonance_history: newHistory,
    });
    await base44.entities.JadeTransaction.create({
      jade_asset_id: jade.id,
      transaction_type: 'fracture',
      jade_coins_amount: coinsToMint,
      notes: `Fracture ${newFractureCount} — ${coinsToMint} $JADE minted${isLast ? ' — final fracture, asset is dust' : ''}`,
    });

    setResult({ coinsToMint, isLast, newFractureCount });
    setLoading(false);
  };

  if (result) return (
    <div className="space-y-3">
      <div className={`rounded-xl p-4 text-center border space-y-1 ${result.isLast ? 'bg-red-900/20 border-red-700/30' : 'bg-emerald-900/20 border-emerald-700/30'}`}>
        <p className="text-2xl">{result.isLast ? '💀' : '💎'}</p>
        <p className="font-semibold text-sm">{result.isLast ? 'Asset Shattered — Dust' : 'Fragment Created'}</p>
        <p className="font-mono text-emerald-400 text-base font-bold">+{result.coinsToMint} $JADE</p>
        {jade.batch === 'batch_1' && <p className="text-[10px] text-yellow-400">+10% Batch 1 Historical Resonance bonus applied</p>}
        <p className="text-xs text-muted-foreground">Fracture {result.newFractureCount}/{MAX_FRACTURES}</p>
      </div>
      <button onClick={() => onDone?.()} className="w-full py-2.5 bg-secondary border border-border rounded-xl text-sm text-muted-foreground">Done</button>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 flex gap-2">
        <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-yellow-300 space-y-1">
          <p className="font-semibold">Fracture Rule Engine</p>
          <p>Fractured assets cannot be restored. Minimum volume: {MIN_FRACTURE_KG}kg. Max fractures per asset: {MAX_FRACTURES}.</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Fractures used</span>
          <span className="font-mono text-foreground">{fractures} / {MAX_FRACTURES}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Volume</span>
          <span className="font-mono text-foreground">{jade.volume_kg} kg</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">$JADE to mint</span>
          <span className="font-mono text-emerald-400 font-bold">{coinsToMint}</span>
        </div>
        {jade.batch === 'batch_1' && (
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Batch 1 Resonance</span>
            <span className="font-mono text-yellow-400">+10%</span>
          </div>
        )}
      </div>

      {!canFracture && (
        <div className="text-center py-3 text-xs text-red-400">
          {fractures >= MAX_FRACTURES ? 'Maximum fractures reached — asset is dust.' : `Volume too small to fracture (min ${MIN_FRACTURE_KG}kg).`}
        </div>
      )}

      <button onClick={handleFracture} disabled={loading || !canFracture}
        className="w-full py-3 bg-red-600/80 hover:bg-red-600 text-white rounded-xl text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
        Fracture Asset → Mint $JADE
      </button>
    </div>
  );
}