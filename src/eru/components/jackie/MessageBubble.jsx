import { useMemo, useState } from 'react';
import { Bot, Bookmark, Copy, PenLine, Check, Download, Loader2, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { base44 } from '@/eru/api/base44Client';
import AIEditBar from './AIEditBar';
import CodePreviewPanel from './CodePreviewPanel';
import CodeDiffPanel from './CodeDiffPanel';

export default function MessageBubble({ message, onSave, onRefine, onInject }) {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showEditBar, setShowEditBar] = useState(false);
  const [instruction, setInstruction] = useState('');
  const [busy, setBusy] = useState(false);
  const [editedCode, setEditedCode] = useState('');
  const [explanation, setExplanation] = useState('');
  const isUser = message.role === 'user';

  const copyContent = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleSave = () => {
    onSave(message.content);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const downloadContent = () => {
    const blob = new Blob([message.content || ''], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'jackie-output.txt';
    link.click();
    URL.revokeObjectURL(url);
  };

  const hasCode = message.content?.includes('```');
  const extractedCode = useMemo(() => {
    const match = message.content?.match(/```(?:\w+)?\n([\s\S]*?)```/);
    return match?.[1]?.trim() || '';
  }, [message.content]);

  const buildPrompt = (action) => {
    const templates = {
      explain: `Explain what this code does in simple terms:\n\n${extractedCode}`,
      refactor: `Refactor the following code for clarity and maintainability:\n\n${extractedCode}`,
      regenerate: `Rewrite this code from scratch while preserving functionality:\n\n${extractedCode}`,
      insert: `Insert the requested change into this code:\nInstruction: ${instruction}\n\n${extractedCode}`,
      preview: `Describe what the live UI preview of this code should look like:\n\n${extractedCode}`,
      styles: `Modify the styles in this code according to this instruction: ${instruction}\n\n${extractedCode}`,
      layout: `Change the layout in this code according to this instruction: ${instruction}\n\n${extractedCode}`,
      logic: `Add logic to this code according to this instruction: ${instruction}\n\n${extractedCode}`,
    };
    return templates[action];
  };

  const handleAIEdit = async (action) => {
    if (!extractedCode) return;
    setBusy(true);
    const response = await base44.integrations.Core.InvokeLLM({ prompt: buildPrompt(action) });
    if (action === 'explain' || action === 'preview') {
      setExplanation(response);
    } else {
      setEditedCode(response);
      onInject(response);
    }
    setBusy(false);
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} gap-2`}>
      {!isUser && (
        <div className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
          <Bot className="w-3 h-3 text-primary" />
        </div>
      )}
      <div className={`max-w-[85%] space-y-2 ${isUser ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-foreground'} rounded-2xl px-4 py-2.5`}>
        {isUser ? (
          <p className="text-sm">{message.content}</p>
        ) : (
          <ReactMarkdown
            className="text-sm prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_pre]:bg-background [&_pre]:rounded-lg [&_pre]:p-3 [&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:border [&_pre]:border-border [&_code]:text-primary/90 [&_code]:text-xs"
          >
            {message.content}
          </ReactMarkdown>
        )}
        {!isUser && (
          <>
            {hasCode && (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <button onClick={() => setShowEditBar((prev) => !prev)} className="inline-flex items-center gap-1 text-[10px] text-primary hover:opacity-80 transition-opacity">
                    <Sparkles className="w-3 h-3" /> {showEditBar ? 'Hide AI edit' : 'AI edit'}
                  </button>
                  {busy && <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />}
                </div>
                {showEditBar && (
                  <AIEditBar instruction={instruction} onInstructionChange={setInstruction} onAction={handleAIEdit} busy={busy} compact />
                )}
                {(editedCode || extractedCode) && <CodePreviewPanel code={editedCode || extractedCode} />}
                {editedCode && <CodeDiffPanel originalCode={extractedCode} updatedCode={editedCode} />}
                {explanation && (
                  <div className="rounded-xl border border-border bg-secondary/40 p-3 text-xs text-muted-foreground whitespace-pre-wrap">{explanation}</div>
                )}
              </div>
            )}
            <div className="flex items-center gap-3 mt-2 pt-1.5 border-t border-border/50">
              <button onClick={copyContent} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors">
                {copied ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
              <button onClick={handleSave} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors">
                {saved ? <Check className="w-2.5 h-2.5" /> : <Bookmark className="w-2.5 h-2.5" />}
                {saved ? 'Saved' : 'Save'}
              </button>
              <button onClick={downloadContent} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors">
                <Download className="w-2.5 h-2.5" /> Download
              </button>
              <button onClick={() => onRefine(message.content)} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors">
                <PenLine className="w-2.5 h-2.5" /> Refine
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}