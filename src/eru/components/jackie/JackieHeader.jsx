import { Bot, RotateCcw, FolderOpen, Sparkles } from 'lucide-react';

const MODES = [
  { id: 'chat', label: 'Chat', icon: Sparkles },
  { id: 'code', label: 'Code', icon: Bot },
  { id: 'visual', label: 'Visual', icon: Bot },
  { id: 'builder', label: 'Builder', icon: Bot },
  { id: 'conversion', label: 'Convert', icon: Sparkles },
];

export default function JackieHeader({ mode, setMode, tab, setTab, onClear, projectName }) {
  return (
    <div className="border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-10">
      <div className="px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
            <Bot className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-sm leading-none">Jackie AI</p>
            <p className="text-[10px] text-primary/80 mt-0.5">
              {projectName ? `Working on: ${projectName}` : '● Ready'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setTab(tab === 'assets' ? 'main' : 'assets')}
            className={`text-xs px-2 py-1 rounded-lg border transition-all ${tab === 'assets' ? 'bg-primary/10 text-primary border-primary/30' : 'bg-secondary text-muted-foreground border-border'}`}>
            <FolderOpen className="w-3 h-3 inline mr-1" />Assets
          </button>
          <button onClick={onClear}
            className="text-xs text-muted-foreground px-2 py-1 rounded-lg bg-secondary border border-border">
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
      </div>
      {tab === 'main' && (
        <div className="flex px-4 pb-2 gap-1.5 overflow-x-auto">
          {MODES.map(m => (
            <button key={m.id} onClick={() => setMode(m.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${mode === m.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary text-muted-foreground border-border hover:border-primary/30'}`}>
              {m.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}