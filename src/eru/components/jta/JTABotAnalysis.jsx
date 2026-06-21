import { useState } from 'react';
import { Bot, Loader2, Sparkles } from 'lucide-react';
import { base44 } from '@/eru/api/base44Client';

const ANALYSIS_TYPES = [
  { id: 'valuation', label: 'Valuation Guidance', prompt: (j) => `You are a JTA Jade Analyst. Analyze this Jade asset's 4-layer valuation system and provide market guidance. Do NOT invent prices — only discuss relative value, rarity tier, and demand signals.\n\nJade Data:\n- Color: ${j.color_type}\n- Purity: ${j.purity}%\n- Vividness: ${j.vividness}%\n- Size Grade: ${j.size_grade}% (${j.volume_kg}kg)\n- Texture: ${j.texture}%\n- Composite Score: ${j.composite_score}%\n- Batch: ${j.batch}\n- Form: ${j.crafted_form}\n- Masterwork: ${j.is_masterwork}\n- Resonance History Events: ${(j.resonance_history||[]).length}\n\nProvide: rarity tier, key value drivers, any weaknesses, and demand signal estimate. Keep it concise.` },
  { id: 'crafting', label: 'Crafting Optimization', prompt: (j) => `You are a JTA Master Craftsperson. Analyze this Jade and recommend the optimal crafting strategy based on JTA rules.\n\nJade: ${j.color_type}, ${j.volume_kg}kg, Composite ${j.composite_score}%, Form: ${j.crafted_form}, Fractures: ${j.fracture_count}/3\n\nRecommend: best target form, optimal intent (purpose/risk/output), energy vector strategy for maximum precision (aim for masterwork if viable). Follow JTA rules — no exploits.` },
  { id: 'socket', label: 'Socket Recommendations', prompt: (j) => `You are a JTA Socket Advisor. This Jade will be inserted into a card socket. Based on JTA rules, recommend which card archetypes (combat, defense, rarity) would best benefit from this jade.\n\nJade: ${j.color_type}, ${j.volume_kg}kg, Composite ${j.composite_score}%, Masterwork: ${j.is_masterwork}, Buff: ${j.masterwork_buff || 'none'}, Batch: ${j.batch}\n\nRecommend: 3 card archetypes, socket strategy (permanent vs temporary), and expected card power uplift. Be specific about Historical Resonance effects.` },
];

export default function JTABotAnalysis({ jade }) {
  const [selected, setSelected] = useState(null);
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const analyze = async (type) => {
    setSelected(type.id);
    setResponse('');
    setLoading(true);
    const res = await base44.integrations.Core.InvokeLLM({ prompt: type.prompt(jade) });
    setResponse(res);
    setLoading(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Bot className="w-4 h-4 text-primary" />
        <p className="text-sm font-semibold">Bot Analysis</p>
        <span className="text-[10px] text-muted-foreground ml-auto">Routes through JTA rules</span>
      </div>

      <div className="grid gap-2">
        {ANALYSIS_TYPES.map(t => (
          <button key={t.id} onClick={() => analyze(t)}
            disabled={loading}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all disabled:opacity-50 ${selected === t.id ? 'border-primary/40 bg-primary/5' : 'border-border bg-secondary hover:bg-secondary/80'}`}>
            <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
            <span className="text-sm">{t.label}</span>
            {loading && selected === t.id && <Loader2 className="w-3.5 h-3.5 animate-spin text-primary ml-auto" />}
          </button>
        ))}
      </div>

      {response && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Analysis Result</p>
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{response}</p>
        </div>
      )}
    </div>
  );
}