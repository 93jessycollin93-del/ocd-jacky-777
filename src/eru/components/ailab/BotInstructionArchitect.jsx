import { useMemo, useState } from 'react';
import { Loader2, Sparkles, Wand2 } from 'lucide-react';
import { invokeSelectedModel } from './modelRouting';

const ARCHITECT_MODES = [
  { id: 'generate', label: 'Generate from goal' },
  { id: 'refine', label: 'Refine current bot' },
];

function parseArchitectResponse(content) {
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

  throw new Error('The model returned an invalid architect response.');
}

export default function BotInstructionArchitect({ form, selectedTemplate, onApply }) {
  const [mode, setMode] = useState('generate');
  const [goal, setGoal] = useState('');
  const [extraContext, setExtraContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState(null);

  const providerLabel = useMemo(() => {
    if (form.model_provider === 'openai') return 'OpenAI';
    if (form.model_provider === 'anthropic') return 'Anthropic';
    if (form.model_provider === 'huggingface_builder') return 'Hugging Face builder model';
    if (form.model_provider === 'huggingface_user') return 'Hugging Face user model';
    return 'Base44 AI';
  }, [form.model_provider]);

  const canRun = mode === 'generate' ? !!goal.trim() : !!(form.instructions || form.personality || form.description || form.prompt_template_name);

  const handleRun = async () => {
    if (!canRun) return;
    setLoading(true);
    setError('');
    setDraft(null);

    const prompt = `You are an AI Bot Instruction Architect helping design a bot's core directives.
Use the selected model provider and model as the stylistic and capability context for your recommendations.

Selected model provider: ${form.model_provider || 'base44'}
Selected model: ${form.model_name || 'automatic'}
Current bot role: ${form.role || 'assistant'}
Current response style: ${form.response_style || 'detailed'}
Current bot name: ${form.name || 'Untitled bot'}
Current description: ${form.description || 'None'}
Current personality: ${form.personality || 'None'}
Current instructions: ${form.instructions || 'None'}
Current prompt template name: ${form.prompt_template_name || 'None'}
Current prompt template content: ${selectedTemplate?.content || 'None'}
Current prompt template variables: ${JSON.stringify(selectedTemplate?.variables || [])}
Mode: ${mode}
High-level goal: ${goal || 'Not provided'}
Extra context: ${extraContext || 'None'}

Return ONLY JSON with this exact shape:
{
  "name": "optional improved bot name",
  "description": "concise bot description",
  "role": "assistant|trader|game_helper|social|security|custom",
  "personality": "clear personality guidance",
  "instructions": "improved core instructions",
  "prompt_template_suggestion": "improved prompt template text or empty string",
  "refinement_notes": ["short note", "short note", "short note"],
  "behavior_alignment": "one short paragraph explaining why this matches the goal and selected model"
}

Rules:
- Keep instructions practical, direct, and production-ready.
- Make the bot behavior clear, bounded, and aligned to the requested goal.
- If refining, improve clarity and effectiveness without changing intent.
- If a prompt template exists, suggest a stronger version that complements the instructions.
- Do not include markdown fences.`;

    try {
      const response = await invokeSelectedModel({
        provider: form.model_provider || 'base44',
        model: form.model_name || 'automatic',
        prompt,
      });
      setDraft(parseArchitectResponse(response));
    } catch (runError) {
      setError(runError.message || 'Unable to generate instruction architecture right now.');
    }

    setLoading(false);
  };

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <Wand2 className="w-4 h-4 text-primary" />
        <div>
          <p className="text-xs font-semibold text-foreground">AI Bot Instruction Architect</p>
          <p className="text-[10px] text-muted-foreground">Co-creates instructions, role framing, personality, and template refinements using {providerLabel}.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {ARCHITECT_MODES.map((item) => (
          <button
            key={item.id}
            onClick={() => setMode(item.id)}
            className={`rounded-full border px-3 py-1.5 text-[11px] font-medium ${mode === item.id ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-secondary text-muted-foreground'}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <textarea
        value={goal}
        onChange={(e) => setGoal(e.target.value)}
        placeholder={mode === 'generate' ? 'Describe the bot goal, ideal behavior, audience, and what success looks like...' : 'Optional: describe what you want improved about the current bot...'}
        className="min-h-[88px] w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm text-foreground outline-none"
      />

      <textarea
        value={extraContext}
        onChange={(e) => setExtraContext(e.target.value)}
        placeholder="Optional extra context, constraints, tone preferences, edge cases, or examples..."
        className="min-h-[72px] w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm text-foreground outline-none"
      />

      <button
        onClick={handleRun}
        disabled={!canRun || loading}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-40"
      >
        {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Architecting...</> : <><Sparkles className="w-4 h-4" /> Generate Instruction Draft</>}
      </button>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}

      {draft && (
        <div className="space-y-3 rounded-xl border border-border bg-background p-3">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold text-foreground">Architect draft</p>
            <p className="text-[10px] text-muted-foreground">{draft.behavior_alignment}</p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 text-[11px]">
            <div className="rounded-xl border border-border bg-card p-3">
              <p className="text-[10px] text-muted-foreground">Suggested role</p>
              <p className="mt-1 font-medium text-foreground capitalize">{draft.role || form.role}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-3">
              <p className="text-[10px] text-muted-foreground">Suggested name</p>
              <p className="mt-1 font-medium text-foreground">{draft.name || form.name || 'Keep current name'}</p>
            </div>
          </div>

          <div className="space-y-2 text-[11px]">
            <div>
              <p className="text-[10px] text-muted-foreground">Description</p>
              <p className="mt-1 text-foreground">{draft.description}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Personality</p>
              <p className="mt-1 text-foreground">{draft.personality}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Instructions</p>
              <p className="mt-1 whitespace-pre-wrap text-foreground">{draft.instructions}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Prompt template suggestion</p>
              <p className="mt-1 whitespace-pre-wrap text-foreground">{draft.prompt_template_suggestion || 'No prompt template change suggested.'}</p>
            </div>
          </div>

          {!!draft.refinement_notes?.length && (
            <div>
              <p className="text-[10px] text-muted-foreground">Refinement notes</p>
              <div className="mt-1 space-y-1">
                {draft.refinement_notes.map((note) => (
                  <p key={note} className="text-[11px] text-foreground">• {note}</p>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => onApply(draft)}
            className="w-full rounded-xl border border-primary/20 bg-primary/10 px-4 py-2.5 text-xs font-semibold text-primary"
          >
            Apply to bot builder
          </button>
        </div>
      )}
    </div>
  );
}