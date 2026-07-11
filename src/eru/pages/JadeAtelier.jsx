import { useState, useEffect } from 'react';
import { Gem, Plus, ChevronRight, Hammer, Zap, Bot, FileText, Loader2 } from 'lucide-react';
import { base44 } from '@/eru/api/base44Client';
import JTAMonolith from '../components/jta/JTAMonolith';
import JTAWorkstation from '../components/jta/JTAWorkstation';
import JTAFractureEngine from '../components/jta/JTAFractureEngine';
import JTAResonanceLog from '../components/jta/JTAResonanceLog';
import JTABotAnalysis from '../components/jta/JTABotAnalysis';

const COLOR_STYLES = {
  imperial_green: 'from-emerald-700/30 to-emerald-900/50 border-emerald-600/30 text-emerald-300',
  lavender: 'from-purple-700/30 to-purple-900/50 border-purple-600/30 text-purple-300',
  ice: 'from-cyan-600/20 to-slate-700/50 border-cyan-400/20 text-cyan-300',
  russet: 'from-orange-700/30 to-amber-900/50 border-orange-500/30 text-orange-300',
  black: 'from-slate-700/50 to-slate-900/70 border-slate-500/30 text-slate-300',
};
const COLOR_LABELS = { imperial_green: 'Imperial Green', lavender: 'Lavender', ice: 'Ice White', russet: 'Russet', black: 'Black Jade' };

const LIFECYCLE_BADGE = {
  raw: 'bg-secondary text-muted-foreground',
  in_workstation: 'bg-blue-500/20 text-blue-400',
  crafted: 'bg-emerald-500/20 text-emerald-400',
  shattered: 'bg-red-500/20 text-red-400',
  socketed: 'bg-yellow-500/20 text-yellow-400',
  listed: 'bg-purple-500/20 text-purple-400',
};

function JadeCard({ jade, onSelect }) {
  const style = COLOR_STYLES[jade.color_type] || COLOR_STYLES.imperial_green;
  return (
    <button onClick={() => onSelect(jade)}
      className={`w-full text-left rounded-2xl border bg-gradient-to-br p-4 space-y-2 transition-all hover:opacity-90 ${style}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-sm">{COLOR_LABELS[jade.color_type]}</p>
          <p className="text-[10px] text-muted-foreground">Sector {jade.origin_sector} · {jade.volume_kg}kg · {jade.batch}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`text-[9px] px-1.5 py-0.5 rounded-full capitalize ${LIFECYCLE_BADGE[jade.lifecycle_state] || 'bg-secondary text-muted-foreground'}`}>
            {jade.lifecycle_state}
          </span>
          {jade.is_masterwork && <span className="text-[9px] text-yellow-400">✨ MW</span>}
        </div>
      </div>
      <div className="flex gap-1.5">
        {[jade.purity, jade.vividness, jade.size_grade, jade.texture].map((v, i) => (
          <div key={i} className="flex-1 h-1 bg-black/30 rounded-full overflow-hidden">
            <div className="h-full bg-current rounded-full opacity-80" style={{ width: `${v}%` }} />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground font-mono">Score {jade.composite_score}%</span>
        <span className="text-[10px] text-muted-foreground font-mono capitalize">{jade.crafted_form}</span>
      </div>
    </button>
  );
}

export default function JadeAtelier() {
  const [tab, setTab] = useState('vault');
  const [jades, setJades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [detailTab, setDetailTab] = useState('workstation');

  const loadJades = async () => {
    setLoading(true);
    const data = await base44.entities.JadeAsset.list('-created_date', 50);
    setJades(data);
    setLoading(false);
  };

  useEffect(() => { loadJades(); }, []);

  const totalExtracted = jades.reduce((s, j) => s + (j.volume_kg || 0), 0);

  const handleExtracted = (jade) => {
    loadJades();
    setTab('vault');
  };

  const handleActionDone = () => {
    loadJades();
    setSelected(null);
  };

  // Detail view
  if (selected) {
    return (
      <div className="flex flex-col min-h-screen bg-background pb-20">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <button onClick={() => setSelected(null)} className="text-muted-foreground text-sm">← Back</button>
          <span className="font-semibold text-sm flex-1 truncate">{COLOR_LABELS[selected.color_type]} · {selected.volume_kg}kg</span>
          <span className={`text-[9px] px-1.5 py-0.5 rounded-full capitalize ${LIFECYCLE_BADGE[selected.lifecycle_state] || ''}`}>{selected.lifecycle_state}</span>
        </div>

        <div className="flex border-b border-border overflow-x-auto">
          {[
            { id: 'workstation', label: 'Craft', Ic: Hammer },
            { id: 'fracture', label: 'Fracture', Ic: Zap },
            { id: 'resonance', label: 'History', Ic: FileText },
            { id: 'bot', label: 'Bot AI', Ic: Bot },
          ].map(({ id, label, Ic }) => (
            <button key={id} onClick={() => setDetailTab(id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium whitespace-nowrap transition-colors ${detailTab === id ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}>
              <Ic className="w-3.5 h-3.5" />{label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {detailTab === 'workstation' && (
            <JTAWorkstation jade={selected} onDone={handleActionDone} />
          )}
          {detailTab === 'fracture' && (
            <JTAFractureEngine jade={selected} onDone={handleActionDone} />
          )}
          {detailTab === 'resonance' && (
            <JTAResonanceLog jade={selected} />
          )}
          {detailTab === 'bot' && (
            <JTABotAnalysis jade={selected} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Gem className="w-5 h-5 text-emerald-400" />
          <h2 className="text-lg font-semibold">Jade Tool Atelier</h2>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">Physical Asset Reserve · Digital Materiality Ecosystem</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {[
          { id: 'vault', label: 'My Jade' },
          { id: 'monolith', label: 'Monolith' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 py-2.5 text-xs font-medium transition-colors ${tab === t.id ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {tab === 'monolith' && (
          <JTAMonolith onExtracted={handleExtracted} totalExtracted={totalExtracted} />
        )}

        {tab === 'vault' && (
          <>
            {/* Summary bar */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { label: 'Assets', value: jades.length },
                { label: 'Masterworks', value: jades.filter(j => j.is_masterwork).length },
                { label: '$JADE Minted', value: jades.reduce((s, j) => s + (j.jade_coins_minted || 0), 0) },
              ].map(({ label, value }) => (
                <div key={label} className="bg-card border border-border rounded-xl p-3 text-center">
                  <p className="text-base font-mono font-bold text-foreground">{value}</p>
                  <p className="text-[10px] text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>

            <button onClick={() => setTab('monolith')}
              className="w-full flex items-center gap-2 py-3 px-4 mb-4 bg-emerald-900/20 border border-emerald-700/30 rounded-xl text-sm text-emerald-400 hover:bg-emerald-900/40 transition-colors">
              <Plus className="w-4 h-4" /> Open Mystery Box — $20.00 USD
              <ChevronRight className="w-4 h-4 ml-auto" />
            </button>

            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : jades.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <Gem className="w-12 h-12 text-muted-foreground/20 mx-auto" />
                <p className="text-sm text-muted-foreground">No Jade assets yet</p>
                <p className="text-xs text-muted-foreground/60">Open a Mystery Box to extract your first piece</p>
              </div>
            ) : (
              <div className="space-y-3">
                {jades.map(j => (
                  <JadeCard key={j.id} jade={j} onSelect={(j) => { setSelected(j); setDetailTab('workstation'); }} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}