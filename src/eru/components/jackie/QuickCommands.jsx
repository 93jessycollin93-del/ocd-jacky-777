import { Zap, Minimize2, Sparkles, Smartphone, Wind, Bug, Layers } from 'lucide-react';

const COMMANDS = [
  { cmd: 'clean', icon: Sparkles, label: 'Clean' },
  { cmd: 'optimize', icon: Zap, label: 'Optimize' },
  { cmd: 'simplify', icon: Minimize2, label: 'Simplify' },
  { cmd: 'modularize', icon: Layers, label: 'Modularize' },
  { cmd: 'make responsive', icon: Smartphone, label: 'Responsive' },
  { cmd: 'add animations', icon: Wind, label: 'Animate' },
  { cmd: 'fix errors', icon: Bug, label: 'Fix' },
  { cmd: 'rewrite for English, Ukrainian, and Simplified Chinese', icon: Zap, label: '3-Lang Copy' },
  { cmd: 'recommend educational investing resources for this topic', icon: Sparkles, label: 'Learn More' },
  { cmd: 'prepare a preview to create a new bot for this goal', icon: Sparkles, label: 'Preview Bot' },
  { cmd: 'prepare a preview to create a new api key with the right permissions for this workflow', icon: Zap, label: 'Preview Key' },
  { cmd: 'analyze this using connected financial platforms and external data sources', icon: Layers, label: 'Integrate Data' },
];

export default function QuickCommands({ onCommand, visible }) {
  if (!visible) return null;
  return (
    <div className="relative z-[80] px-4 py-2 border-t border-border/50 bg-background/80">
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {COMMANDS.map(c => (
          <button key={c.cmd} onClick={() => onCommand(c.cmd)}
            className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-secondary border border-border text-xs text-muted-foreground hover:text-primary hover:border-primary/30 transition-all">
            <c.icon className="w-3 h-3" />{c.label}
          </button>
        ))}
      </div>
    </div>
  );
}