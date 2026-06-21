import { useEffect, useState } from 'react';
import { Link2, Sparkles } from 'lucide-react';
import { base44 } from '@/eru/api/base44Client';

const HUGGING_FACE_CONNECTOR_ID = '69d912f9261810057ced4675';
const HUGGING_FACE_DEFAULT_MODEL = 'mistralai/Mistral-7B-Instruct-v0.3';

const PROVIDERS = [
  { value: 'base44', label: 'Base44 AI', models: ['automatic'] },
  { value: 'openai', label: 'OpenAI', models: ['gpt-4o-mini', 'gpt-5-mini'] },
  { value: 'anthropic', label: 'Anthropic', models: ['claude-3-5-sonnet', 'claude-3-5-haiku'] },
  { value: 'huggingface_builder', label: 'Hugging Face (builder key)', models: ['mistralai/Mistral-7B-Instruct-v0.3', 'meta-llama/Meta-Llama-3-8B-Instruct'] },
  { value: 'huggingface_user', label: 'Hugging Face (user account)', models: ['mistralai/Mistral-7B-Instruct-v0.3', 'meta-llama/Meta-Llama-3-8B-Instruct'] },
];

export default function ModelProviderPanel({ value, onChange }) {
  const [authed, setAuthed] = useState(false);

  const checkConnection = async () => {
    try {
      await base44.functions.invoke('invokeExternalModel', { provider: 'huggingface_user', model: HUGGING_FACE_DEFAULT_MODEL, prompt: 'Hello' });
      setAuthed(true);
    } catch {
      setAuthed(false);
    }
  };

  useEffect(() => {
    base44.auth.isAuthenticated().then(async (isAuthenticated) => {
      if (!isAuthenticated) return;
      await checkConnection();
    });
  }, []);

  const provider = PROVIDERS.find((item) => item.value === value.model_provider) || PROVIDERS[0];

  const handleConnect = async () => {
    const url = await base44.connectors.connectAppUser(HUGGING_FACE_CONNECTOR_ID);
    const popup = window.open(url, '_blank');
    const timer = setInterval(async () => {
      if (!popup || popup.closed) {
        clearInterval(timer);
        await checkConnection();
      }
    }, 500);
  };

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <p className="text-xs font-semibold text-foreground">External AI model</p>
      </div>

      <select
        value={value.model_provider || 'base44'}
        onChange={(e) => onChange({ model_provider: e.target.value, model_name: PROVIDERS.find((item) => item.value === e.target.value)?.models?.[0] || 'automatic' })}
        className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground outline-none"
      >
        {PROVIDERS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
      </select>

      <select
        value={value.model_name || provider.models[0]}
        onChange={(e) => onChange({ ...value, model_name: e.target.value })}
        className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground outline-none"
      >
        {provider.models.map((item) => <option key={item} value={item}>{item}</option>)}
      </select>

      {value.model_provider === 'huggingface_user' && (
        <div className="rounded-xl border border-border bg-background p-3 text-xs text-muted-foreground space-y-2">
          <p>{authed ? 'Your Hugging Face account is connected.' : 'Connect your Hugging Face account to use your own models.'}</p>
          {!authed && (
            <button onClick={handleConnect} className="inline-flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary">
              <Link2 className="w-3.5 h-3.5" /> Connect Hugging Face
            </button>
          )}
        </div>
      )}
    </div>
  );
}