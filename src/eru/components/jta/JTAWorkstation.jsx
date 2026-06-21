import { useState } from 'react';
import { Hammer, CheckCircle2, RotateCcw, Loader2 } from 'lucide-react';
import { base44 } from '@/eru/api/base44Client';

const FORMS = [
  { id: 'jewelry',   label: 'Jewelry',   minKg: 0.1,  maxKg: 2 },
  { id: 'pendant',   label: 'Pendant',   minKg: 1,    maxKg: 5 },
  { id: 'ring',      label: 'Ring',      minKg: 0.05, maxKg: 1 },
  { id: 'sculpture', label: 'Sculpture', minKg: 5,    maxKg: 50 },
  { id: 'titan',     label: 'Titan',     minKg: 100,  maxKg: 200 },
];
const RISK_LEVELS = ['safe', 'experimental', 'high_variance'];
const PURPOSES = ['combat', 'art', 'nft', 'upgrade', 'trade'];
const OUTPUT_TYPES = ['stat_boost', 'collectible', 'tradable_asset'];

function EnergyVectorTrack({ value, onChange, label }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{label}</span><span className="font-mono text-emerald-400">{value}%</span>
      </div>
      <input type="range" min={0} max={100} step={5} value={value} onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-emerald-500 h-1.5" />
    </div>
  );
}

export default function JTAWorkstation({ jade, onDone }) {
  const [intent, setIntent] = useState({ purpose: '', risk_level: 'safe', output_type: '' });
  const [targetForm, setTargetForm] = useState('jewelry');
  const [precision, setPrecision] = useState({ purity: 50, vividness: 50, size: 50, texture: 50 });
  const [phase, setPhase] = useState('intent'); // intent → vectors → result
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const avgPrecision = Math.round(Object.values(precision).reduce((a, b) => a + b, 0) / 4);
  const isHighGrade = jade.composite_score >= 70;
  const isMasterwork = avgPrecision >= 90 && isHighGrade;

  const validForm = FORMS.find(f => f.id === targetForm);
  const volumeOk = validForm && jade.volume_kg >= validForm.minKg && jade.volume_kg <= validForm.maxKg;

  const handleCraft = async () => {
    setLoading(true);
    let buff = null;
    if (isMasterwork) {
      buff = `+${Math.round(jade.composite_score * 4.15)}% attributes (Masterwork)`;
    }

    const newHistory = [...(jade.resonance_history || []), {
      event_type: 'craft',
      description: `Crafted into ${targetForm} with ${avgPrecision}% precision. Intent: ${intent.purpose}/${intent.risk_level}/${intent.output_type}`,
      timestamp: new Date().toISOString(),
      actor: 'user',
      metadata: { precision, intent, targetForm, isMasterwork },
    }];

    const updates = {
      crafted_form: targetForm,
      lifecycle_state: 'crafted',
      precision_score: avgPrecision,
      is_masterwork: isMasterwork,
      masterwork_buff: buff,
      crafting_intent: intent,
      resonance_history: newHistory,
      historical_resonance_score: (jade.historical_resonance_score || 0) + avgPrecision,
    };

    await base44.entities.JadeAsset.update(jade.id, updates);
    await base44.entities.JadeTransaction.create({
      jade_asset_id: jade.id,
      transaction_type: 'craft',
      precision_achieved: avgPrecision,
      intent_snapshot: intent,
      notes: `Crafted to ${targetForm}${isMasterwork ? ' — MASTERWORK' : ''}`,
    });

    setResult({ ...updates, isMasterwork, buff });
    setLoading(false);
    setPhase('result');
  };

  const handleBlueprint = async () => {
    setLoading(true);
    const newHistory = [...(jade.resonance_history || []), {
      event_type: 'blueprint_reset',
      description: `Reset to raw block from ${jade.crafted_form}. History preserved.`,
      timestamp: new Date().toISOString(),
      actor: 'user',
      metadata: {},
    }];
    await base44.entities.JadeAsset.update(jade.id, {
      crafted_form: 'raw_block',
      lifecycle_state: 'raw',
      precision_score: 0,
      is_masterwork: false,
      masterwork_buff: null,
      resonance_history: newHistory,
    });
    await base44.entities.JadeTransaction.create({
      jade_asset_id: jade.id,
      transaction_type: 'blueprint_reset',
      notes: 'Blueprint reset — returned to raw block',
    });
    setLoading(false);
    onDone?.();
  };

  if (phase === 'result' && result) return (
    <div className="space-y-4">
      {result.isMasterwork ? (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-5 text-center space-y-2">
          <p className="text-2xl">✨</p>
          <p className="font-bold text-yellow-400 text-base">MASTERWORK ACHIEVED</p>
          <p className="text-sm text-yellow-300">{result.buff}</p>
          <p className="text-xs text-muted-foreground">90%+ precision on grade {jade.composite_score}% jade</p>
        </div>
      ) : (
        <div className="bg-emerald-900/20 border border-emerald-700/30 rounded-2xl p-5 text-center space-y-2">
          <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
          <p className="font-semibold text-emerald-300">Craft Complete</p>
          <p className="text-xs text-muted-foreground">Precision: {avgPrecision}% · Form: {targetForm}</p>
        </div>
      )}
      <button onClick={() => onDone?.()} className="w-full py-2.5 bg-secondary border border-border rounded-xl text-sm text-muted-foreground">Done</button>
    </div>
  );

  return (
    <div className="space-y-4">
      {phase === 'intent' && (
        <>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Define Crafting Intent</p>
          <div className="grid grid-cols-3 gap-2">
            {PURPOSES.map(p => (
              <button key={p} onClick={() => setIntent(i => ({ ...i, purpose: p }))}
                className={`py-2 rounded-xl text-xs font-medium capitalize border transition-all ${intent.purpose === p ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-300' : 'bg-secondary border-border text-muted-foreground'}`}>
                {p}
              </button>
            ))}
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Risk Level</p>
            <div className="flex gap-2">
              {RISK_LEVELS.map(r => (
                <button key={r} onClick={() => setIntent(i => ({ ...i, risk_level: r }))}
                  className={`flex-1 py-2 rounded-xl text-xs capitalize border transition-all ${intent.risk_level === r ? (r === 'high_variance' ? 'bg-red-500/20 border-red-500/40 text-red-300' : r === 'experimental' ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300' : 'bg-emerald-600/20 border-emerald-500/40 text-emerald-300') : 'bg-secondary border-border text-muted-foreground'}`}>
                  {r.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Output Type</p>
            <div className="grid grid-cols-3 gap-2">
              {OUTPUT_TYPES.map(o => (
                <button key={o} onClick={() => setIntent(i => ({ ...i, output_type: o }))}
                  className={`py-2 rounded-xl text-[10px] capitalize border transition-all ${intent.output_type === o ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-300' : 'bg-secondary border-border text-muted-foreground'}`}>
                  {o.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
          <button
            disabled={!intent.purpose || !intent.output_type}
            onClick={() => setPhase('vectors')}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold disabled:opacity-40">
            Proceed to Energy Vectors →
          </button>
        </>
      )}

      {phase === 'vectors' && (
        <>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Energy Vectors — Follow the stone's grain</p>
          <div className="space-y-3 bg-card border border-border rounded-xl p-4">
            <EnergyVectorTrack label="Purity Channel" value={precision.purity} onChange={v => setPrecision(p => ({ ...p, purity: v }))} />
            <EnergyVectorTrack label="Vividness Channel" value={precision.vividness} onChange={v => setPrecision(p => ({ ...p, vividness: v }))} />
            <EnergyVectorTrack label="Mass Alignment" value={precision.size} onChange={v => setPrecision(p => ({ ...p, size: v }))} />
            <EnergyVectorTrack label="Texture / Zhong" value={precision.texture} onChange={v => setPrecision(p => ({ ...p, texture: v }))} />
          </div>

          <div className="flex items-center justify-between px-4 py-3 bg-secondary/60 rounded-xl">
            <span className="text-xs text-muted-foreground">Overall Precision</span>
            <span className={`text-sm font-mono font-bold ${avgPrecision >= 90 ? 'text-yellow-400' : avgPrecision >= 70 ? 'text-emerald-400' : 'text-foreground'}`}>
              {avgPrecision}% {isMasterwork ? '✨ Masterwork!' : ''}
            </span>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Target Form</p>
            <div className="grid grid-cols-3 gap-2">
              {FORMS.map(f => (
                <button key={f.id} onClick={() => setTargetForm(f.id)}
                  disabled={jade.volume_kg < f.minKg || jade.volume_kg > f.maxKg}
                  className={`py-2 rounded-xl text-xs border transition-all disabled:opacity-30 ${targetForm === f.id ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-300' : 'bg-secondary border-border text-muted-foreground'}`}>
                  {f.label}
                </button>
              ))}
            </div>
            {!volumeOk && <p className="text-[10px] text-red-400">Volume ({jade.volume_kg}kg) out of range for this form</p>}
          </div>

          <div className="flex gap-2">
            <button onClick={() => setPhase('intent')} className="px-4 py-2.5 bg-secondary border border-border rounded-xl text-xs text-muted-foreground">← Back</button>
            <button onClick={handleCraft} disabled={loading || !volumeOk}
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Hammer className="w-4 h-4" />} Craft
            </button>
          </div>
          <button onClick={handleBlueprint} disabled={loading || jade.crafted_form === 'raw_block'}
            className="w-full py-2 border border-border rounded-xl text-xs text-muted-foreground flex items-center justify-center gap-1.5 disabled:opacity-30">
            <RotateCcw className="w-3 h-3" /> Blueprint Reset (back to raw block)
          </button>
        </>
      )}
    </div>
  );
}