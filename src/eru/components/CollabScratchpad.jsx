import { useState, useEffect, useRef } from 'react';
import { X, Code, FileText, Send, Users, Copy, CheckCheck } from 'lucide-react';

const FAKE_COLLABORATORS = [
  { name: 'Philosopher_K', color: '#7c4dff', cursor: 45 },
  { name: 'NeuralNomad', color: '#2196f3', cursor: 120 },
];

const COLLAB_CURSORS = [
  { name: 'Philosopher_K', color: '#7c4dff', active: true },
  { name: 'NeuralNomad', color: '#2196f3', active: true },
  { name: 'Stoic_Dev', color: '#ff9800', active: false },
];

const DEFAULT_TEXT = `# Collaborative Scratchpad\n\nShare your ideas here. Everyone in the channel can edit this document in real-time.\n\n## Key Points\n- \n- \n- \n\n## Open Questions\n1. \n`;
const DEFAULT_CODE = `// Collaborative Code Pad\n// Start writing your code concept here\n\nfunction concept() {\n  // Your idea...\n}\n`;

export default function CollabScratchpad({ channel, serverColor, onClose, onSubmitReview }) {
  const [mode, setMode] = useState('text');
  const [textContent, setTextContent] = useState(DEFAULT_TEXT);
  const [codeContent, setCodeContent] = useState(DEFAULT_CODE);
  const [copied, setCopied] = useState(false);
  const [typingUser, setTypingUser] = useState(null);
  const textareaRef = useRef(null);

  const content = mode === 'text' ? textContent : codeContent;
  const setContent = mode === 'text' ? setTextContent : setCodeContent;

  // Simulate another user typing occasionally
  useEffect(() => {
    const interval = setInterval(() => {
      const collab = FAKE_COLLABORATORS[Math.floor(Math.random() * FAKE_COLLABORATORS.length)];
      setTypingUser(collab.name);
      setTimeout(() => setTypingUser(null), 2000);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-3 flex-shrink-0">
        <button onClick={onClose} className="text-muted-foreground p-1">
          <X className="w-4 h-4" />
        </button>
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: serverColor }} />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">Scratchpad · {channel}</p>
          <p className="text-xs text-muted-foreground">Collaborative editor</p>
        </div>
        <button onClick={handleCopy} className="text-muted-foreground p-1.5 hover:text-foreground transition-colors">
          {copied ? <CheckCheck className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>

      {/* Collaborators bar */}
      <div className="px-4 py-2 border-b border-border flex items-center gap-2 flex-shrink-0 bg-card/60">
        <Users className="w-3.5 h-3.5 text-muted-foreground" />
        <div className="flex items-center gap-2 flex-1">
          {COLLAB_CURSORS.map(c => (
            <div key={c.name} className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ background: c.active ? c.color : '#555' }} />
              <span className="text-xs" style={{ color: c.active ? c.color : '#666' }}>{c.name.split('_')[0]}</span>
            </div>
          ))}
          <span className="text-xs text-muted-foreground">· You</span>
        </div>
        {typingUser && (
          <span className="text-xs text-muted-foreground italic animate-pulse">{typingUser} is typing…</span>
        )}
      </div>

      {/* Mode tabs */}
      <div className="flex border-b border-border flex-shrink-0">
        <button onClick={() => setMode('text')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium transition-colors ${mode==='text'?'text-primary border-b-2 border-primary':'text-muted-foreground'}`}>
          <FileText className="w-3.5 h-3.5" /> Text / Markdown
        </button>
        <button onClick={() => setMode('code')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium transition-colors ${mode==='code'?'text-primary border-b-2 border-primary':'text-muted-foreground'}`}>
          <Code className="w-3.5 h-3.5" /> Code
        </button>
      </div>

      {/* Editor area */}
      <div className="relative flex-1 overflow-hidden">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={e => setContent(e.target.value)}
          spellCheck={mode === 'text'}
          className={`w-full h-full resize-none bg-transparent text-foreground outline-none px-4 py-4 text-sm leading-relaxed ${mode==='code' ? 'font-mono' : ''}`}
          placeholder={mode === 'text' ? 'Start writing your ideas…' : '// Write your code concept…'}
        />
        {/* Fake remote cursor markers */}
        {FAKE_COLLABORATORS.map(c => (
          <div key={c.name}
            className="absolute pointer-events-none text-xs font-medium px-1 py-0.5 rounded"
            style={{
              top: `${40 + (c.cursor % 6) * 22}px`,
              left: `${16 + (c.cursor % 20) * 8}px`,
              color: c.color,
              background: `${c.color}15`,
              border: `1px solid ${c.color}30`,
              opacity: 0.7,
            }}>
            {c.name.split('_')[0]}
          </div>
        ))}
      </div>

      {/* Footer actions */}
      <div className="px-4 py-3 border-t border-border flex items-center gap-2 flex-shrink-0 bg-card/60">
        <p className="text-xs text-muted-foreground flex-1">{content.length} chars · {content.split('\n').length} lines</p>
        <button onClick={onClose}
          className="border border-border rounded-xl px-3 py-2 text-xs text-muted-foreground hover:bg-secondary/40 transition-colors">
          Done
        </button>
        <button onClick={() => onSubmitReview(content)}
          className="bg-primary text-primary-foreground rounded-xl px-3 py-2 text-xs font-semibold flex items-center gap-1.5">
          <Send className="w-3.5 h-3.5" /> Submit for Review
        </button>
      </div>
    </div>
  );
}