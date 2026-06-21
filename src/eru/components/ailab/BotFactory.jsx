import { useState } from 'react';
import { Wand2, Copy, Save, Loader2, Download } from 'lucide-react';
import { base44 } from '@/eru/api/base44Client';
import ModelProviderPanel from './ModelProviderPanel';
import { invokeSelectedModel } from './modelRouting';

const TEMPLATES = [
  { label: 'Crypto Watcher', prompt: 'A bot that tracks BTC/ETH prices and sends alerts when thresholds are crossed' },
  { label: 'Support Agent', prompt: 'A customer support bot that handles FAQs, escalates complex issues, and tracks ticket status' },
  { label: 'Content Writer', prompt: 'A creative writing bot that generates posts, captions, and marketing copy on demand' },
  { label: 'Data Analyst', prompt: 'A bot that analyzes datasets, identifies trends, and generates structured reports' },
];

const downloadJson = (filename, data) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const extractJsonObject = (content) => {
  if (typeof content !== 'string') return content;
  const trimmed = content.trim();
  try {
    return JSON.parse(trimmed);
  } catch {}

  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    return JSON.parse(trimmed.slice(start, end + 1));
  }

  throw new Error(trimmed);
};

export default function BotFactory({ onSaveBot }) {
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [modelConfig, setModelConfig] = useState({ provider: 'base44', model: '', api_label: '' });

  const generate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setResult(null);
    setError('');
    setSaved(false);

    const content = await invokeSelectedModel({
      provider: modelConfig.provider,
      model: modelConfig.model,
      prompt: `You are an AI bot architect. Generate a complete bot configuration based on this request: "${prompt}".
      
Return ONLY a JSON object with these fields:
{
  "name": "bot name",
  "description": "one sentence description",
  "role": "assistant|trader|game_helper|social|custom",
  "personality": "tone and style",
  "instructions": "detailed system instructions (2-3 paragraphs)",
  "response_style": "short|detailed|strategic|creative",
  "handoff_instructions": "when to escalate or delegate",
  "suggested_pages": ["list of relevant page routes from: /, /markets, /trade, /portfolio, /arena, /jackie, /storefront"],
  "data_sources": []
}`,
    });

    try {
      const res = extractJsonObject(content);
      setResult(res);
    } catch (err) {
      setError(err.message || 'The selected model returned an invalid response.');
    }

    setLoading(false);
  };

  const saveBot = async () => {
    if (!result) return;
    await base44.entities.UserBot.create({
      name: result.name,
      description: result.description,
      role: result.role || 'assistant',
      personality: result.personality,
      instructions: result.instructions,
      response_style: result.response_style || 'detailed',
      handoff_instructions: result.handoff_instructions,
      page_assignments: result.suggested_pages || [],
      data_sources: result.data_sources || [],
      status: 'active',
      memory_enabled: true,
      model_provider: modelConfig.provider,
      model_name: modelConfig.model,
      api_label: modelConfig.api_label,
    });
    setSaved(true);
    onSaveBot?.();
  };

  return (
    <div className="space-y-4">
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
        <p className="text-xs font-semibold text-primary mb-1">🏭 AI Bot Factory</p>
        <p className="text-[10px] text-muted-foreground">Describe what you need and the system generates a complete, deployable bot configuration.</p>
      </div>

      {/* Quick templates */}
      <div className="space-y-1.5">
        <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Quick Templates</p>
        <div className="grid grid-cols-2 gap-2">
          {TEMPLATES.map(t => (
            <button key={t.label} onClick={() => setPrompt(t.prompt)}
              className="text-left px-3 py-2 rounded-xl border border-border bg-secondary hover:border-primary/30 transition-all">
              <p className="text-xs font-medium">{t.label}</p>
              <p className="text-[9px] text-muted-foreground line-clamp-1">{t.prompt.slice(0, 40)}…</p>
            </button>
          ))}
        </div>
      </div>

      <ModelProviderPanel value={{ model_provider: modelConfig.provider, model_name: modelConfig.model }} onChange={(value) => setModelConfig({ provider: value.model_provider, model: value.model_name, api_label: value.api_label || '' })} />

      {/* Input */}
      <div className="space-y-2">
        <label className="text-xs text-muted-foreground">Describe your bot</label>
        <textarea value={prompt} onChange={e => setPrompt(e.target.value)}
          placeholder="e.g. A trading assistant that monitors my portfolio, alerts on price swings, and suggests rebalancing strategies..."
          className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm outline-none resize-none min-h-[90px] text-foreground" />
        <button onClick={generate} disabled={!prompt.trim() || loading}
          className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm disabled:opacity-40">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating architecture…</> : <><Wand2 className="w-4 h-4" /> Generate Bot</>}
        </button>
        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive whitespace-pre-wrap">
            {error}
          </div>
        )}
      </div>

      {/* Result */}
      {result && (
        <div className="space-y-3">
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-bold text-sm">{result.name}</p>
                <p className="text-xs text-muted-foreground">{result.description}</p>
              </div>
              <span className="text-[9px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full capitalize">{result.role}</span>
            </div>

            <div className="space-y-2 text-xs">
              <div><span className="text-muted-foreground">Personality: </span><span>{result.personality}</span></div>
              <div><span className="text-muted-foreground">Style: </span><span className="capitalize">{result.response_style}</span></div>
              <div>
                <p className="text-muted-foreground mb-1">Instructions:</p>
                <p className="text-foreground/80 leading-relaxed bg-secondary rounded-lg p-2">{result.instructions}</p>
              </div>
              {result.suggested_pages?.length > 0 && (
                <div>
                  <span className="text-muted-foreground">Deploy to: </span>
                  <span className="text-primary">{result.suggested_pages.join(', ')}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button onClick={saveBot} disabled={saved}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${saved ? 'bg-green-400/20 text-green-400 border border-green-400/30' : 'bg-primary text-primary-foreground'}`}>
              <Save className="w-3.5 h-3.5" /> {saved ? '✓ Saved to My Bots' : 'Save & Deploy Bot'}
            </button>
            <button onClick={() => navigator.clipboard.writeText(JSON.stringify(result, null, 2))}
              className="px-3 py-2.5 rounded-xl border border-border text-muted-foreground">
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => downloadJson(`${(result.name || 'generated-bot').replace(/\s+/g, '-').toLowerCase()}.json`, result)}
              className="px-3 py-2.5 rounded-xl border border-border text-muted-foreground">
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}