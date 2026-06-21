import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, MousePointerClick, Save } from 'lucide-react';
import { base44 } from '@/eru/api/base44Client';
import AIEditBar from './AIEditBar';
import CodeDiffPanel from './CodeDiffPanel';
import CodePreviewPanel from './CodePreviewPanel';
import EditorSwitcher from './EditorSwitcher';
import LanguageMemorySelector from './LanguageMemorySelector';
import RealtimeSuggestionPanel from './RealtimeSuggestionPanel';

const TEMPLATES = {
  explain: ({ code }) => `Explain what this code does in simple terms:\n\n${code}`,
  refactor: ({ code }) => `Refactor the following code for clarity and maintainability:\n\n${code}`,
  regenerate: ({ code }) => `Rewrite this code from scratch while preserving functionality:\n\n${code}`,
  insert: ({ code, instruction }) => `Modify the code according to this instruction: ${instruction}\n\n${code}`,
  preview: ({ code }) => `Describe the expected UI preview for this code:\n\n${code}`,
  styles: ({ code, instruction }) => `Modify the styles in this code according to this instruction: ${instruction}\n\n${code}`,
  layout: ({ code, instruction }) => `Change the layout in this code according to this instruction: ${instruction}\n\n${code}`,
  logic: ({ code, instruction }) => `Add logic to this code according to this instruction: ${instruction}\n\n${code}`,
};

export default function CodeWorkspace({ content = '', onInject, onSave }) {
  const [code, setCode] = useState(content);
  const [editor, setEditor] = useState('monaco');
  const [instruction, setInstruction] = useState('');
  const [selectedCode, setSelectedCode] = useState('');
  const [updatedCode, setUpdatedCode] = useState('');
  const [explanation, setExplanation] = useState('');
  const [busy, setBusy] = useState(false);
  const [selectedMemoryId, setSelectedMemoryId] = useState('');
  const [selectedMemory, setSelectedMemory] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const textareaRef = useRef(null);

  const activeCode = useMemo(() => selectedCode || code, [selectedCode, code]);

  useEffect(() => {
    setCode(content || '');
  }, [content]);

  useEffect(() => {
    if (!selectedMemoryId) {
      setSelectedMemory(null);
      setSuggestions([]);
      return;
    }
    base44.entities.ProgrammingLanguageMemory.get?.(selectedMemoryId)
      ?.then(setSelectedMemory)
      .catch(() => {});
  }, [selectedMemoryId]);

  useEffect(() => {
    if (!selectedMemory || !code.trim()) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSuggestionsLoading(true);
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a code assistant using a selected programming knowledge reference.
Selected reference: ${selectedMemory.name}
Summary: ${selectedMemory.summary}
Core concepts: ${(selectedMemory.core_concepts || []).join(', ')}
Strengths: ${(selectedMemory.strengths || []).join(', ')}
Best for: ${(selectedMemory.best_for || []).join(', ')}

Analyze this code and provide 3 short real-time suggestions grounded in the selected reference and Jackie's master programming memory.

Code:\n${code}`,
        response_json_schema: {
          type: 'object',
          properties: {
            suggestions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string' },
                  example: { type: 'string' }
                },
                required: ['title', 'description']
              }
            }
          },
          required: ['suggestions']
        }
      });
      setSuggestions(response.suggestions || []);
      setSuggestionsLoading(false);
    }, 700);

    return () => clearTimeout(timer);
  }, [code, selectedMemory]);

  const detectSelection = () => {
    const selection = window.getSelection?.()?.toString()?.trim() || '';
    setSelectedCode(selection);
  };

  const handleAction = async (action) => {
    const targetCode = activeCode || code;
    if (!targetCode) return;
    setBusy(true);
    const referenceBlock = selectedMemory ? `\n\nSelected programming memory reference:\nName: ${selectedMemory.name}\nSummary: ${selectedMemory.summary}\nCore concepts: ${(selectedMemory.core_concepts || []).join(', ')}\nStrengths: ${(selectedMemory.strengths || []).join(', ')}\nBest for: ${(selectedMemory.best_for || []).join(', ')}` : '';
    const response = await base44.functions.invoke('jackieCodeEdit', {
      action,
      instruction,
      code: targetCode,
      fullCode: code,
      prompt: `${TEMPLATES[action]?.({ code: targetCode, instruction }) || `Modify this code: ${instruction}\n\n${targetCode}`}${referenceBlock}`,
    });

    if (action === 'explain' || action === 'preview') {
      setExplanation(response.data?.content || '');
    } else {
      const nextCode = response.data?.updatedCode || '';
      setUpdatedCode(nextCode);
      setCode(nextCode);
      onInject?.(nextCode);
    }
    setBusy(false);
  };

  const handleApplyReference = (memory) => {
    setSelectedMemory(memory);
    setInstruction(`Use ${memory.name} memory as the main reference for this code.`);
  };

  return (
    <div className="space-y-3">
      <LanguageMemorySelector
        selectedMemoryId={selectedMemoryId}
        onSelect={setSelectedMemoryId}
        onApplyReference={handleApplyReference}
      />
      <div className="rounded-xl border border-border bg-card p-3 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-foreground">Code editor</p>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <button onClick={detectSelection} className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2 py-1">
              <MousePointerClick className="w-3 h-3" /> Detect selected code
            </button>
            <button onClick={() => onSave?.(code)} className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2 py-1">
              <Save className="w-3 h-3" /> Save file
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          {['monaco', 'codemirror', 'ace'].map((item) => (
            <button
              key={item}
              onClick={() => setEditor(item)}
              className={`rounded-lg border px-2 py-1 capitalize ${editor === item ? 'border-primary/30 bg-primary/10 text-primary' : 'border-border bg-background'}`}
            >
              {item}
            </button>
          ))}
        </div>
        <div ref={textareaRef} onMouseUp={detectSelection} onKeyUp={detectSelection}>
          <EditorSwitcher editor={editor} code={code} onChange={setCode} />
        </div>
        {selectedCode && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-[11px] text-primary">
            <span className="inline-flex items-center gap-1"><Check className="w-3 h-3" /> Selected code detected</span>
          </div>
        )}
      </div>

      <AIEditBar instruction={instruction} onInstructionChange={setInstruction} onAction={handleAction} busy={busy} />
      <RealtimeSuggestionPanel
        suggestions={suggestions}
        loading={suggestionsLoading}
        selectedMemoryName={selectedMemory?.name}
      />
      <CodePreviewPanel code={updatedCode || code} />
      <CodeDiffPanel originalCode={content} updatedCode={updatedCode} />
      {explanation && <div className="rounded-xl border border-border bg-card p-3 text-xs text-muted-foreground whitespace-pre-wrap">{explanation}</div>}
    </div>
  );
}