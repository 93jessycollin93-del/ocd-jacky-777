import { useState } from 'react';
import { Send, Sparkles, Loader2 } from 'lucide-react';

/**
 * DevLabPromptBar — sticky bottom prompt input. Mobile-first single-line
 * input that expands on focus. Submits on Enter (without shift). The mode
 * label sits inline so the user always knows what will happen on submit.
 */
export default function DevLabPromptBar({ mode, onSubmit, busy, disabled, hint }) {
  const [value, setValue] = useState('');

  const submit = async () => {
    if (!value.trim() || busy || disabled) return;
    const v = value.trim();
    setValue('');
    await onSubmit(v);
  };

  return (
    <div
      className="sticky bottom-0 z-20 border-t border-border bg-card/95 backdrop-blur-md"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="px-4 py-3 space-y-2">
        {hint && (
          <p className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Sparkles className="h-3 w-3 text-primary" /> {hint}
          </p>
        )}
        <div className="flex gap-2">
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            disabled={disabled || busy}
            placeholder={
              mode === 'plan'
                ? 'Describe what you want to build — Jackie will draft a plan…'
                : 'Describe the next task — Jackie will queue it…'
            }
            rows={1}
            className="flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring placeholder:text-muted-foreground disabled:opacity-50"
            style={{ minHeight: 44, maxHeight: 140 }}
          />
          <button
            type="button"
            onClick={submit}
            disabled={!value.trim() || busy || disabled}
            className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            aria-label={mode === 'plan' ? 'Draft plan' : 'Queue task'}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Mode: <span className="font-mono text-primary">{mode === 'plan' ? 'PLAN' : 'AGENT'}</span> ·
          {mode === 'plan' ? ' Output is a structured plan, not code.' : ' Output is a task queue, not auto-applied.'}
        </p>
      </div>
    </div>
  );
}