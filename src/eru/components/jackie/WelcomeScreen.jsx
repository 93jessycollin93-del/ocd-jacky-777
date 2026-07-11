import { Sparkles, Code, Layout, Cpu } from 'lucide-react';

const SUGGESTIONS = {
  chat: [
    'Help me plan a side project',
    'Explain blockchain consensus',
    'Brainstorm app ideas',
    'Open the bot testing lab',
  ],
  code: [
    'Build a React todo component',
    'Create an API route handler',
    'Write a custom React hook',
    'Optimize this algorithm',
  ],
  visual: [
    'Design a dashboard layout',
    'Map out a user flow',
    'Create a system architecture',
    'Plan a feature structure',
  ],
  builder: [
    'Build a trading bot system',
    'Design a notification engine',
    'Create a user onboarding flow',
    'Plan a multi-module platform',
  ],
  conversion: [
    'Rewrite this landing page headline for higher conversion',
    'Turn this product pitch into English, Ukrainian, and Simplified Chinese',
    'Optimize these CTA buttons for multilingual markets',
    'Adapt this offer copy for Ukraine and China',
  ],
};

const MODE_META = {
  chat: { icon: Sparkles, title: 'Chat', desc: 'Flexible creative partner' },
  code: { icon: Code, title: 'Code Engine', desc: 'Generate, refine & ship code' },
  visual: { icon: Layout, title: 'Visual Studio', desc: 'Layouts, systems & flows' },
  builder: { icon: Cpu, title: 'System Builder', desc: 'Step-by-step creation' },
  conversion: { icon: Sparkles, title: 'Conversion Engine', desc: 'Native multilingual copy that sells' },
};

export default function WelcomeScreen({ mode, onSend }) {
  const meta = MODE_META[mode];
  const suggestions = SUGGESTIONS[mode];

  return (
    <div className="flex flex-col items-center justify-center py-6 text-center space-y-4 px-2">
      <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
        <meta.icon className="w-6 h-6 text-primary" />
      </div>
      <div>
        <p className="font-semibold text-base">{meta.title}</p>
        <p className="text-xs text-muted-foreground mt-1">{meta.desc}</p>
      </div>
      <div className="w-full space-y-2 max-w-sm pb-2">
        {suggestions.map(s => (
          <button key={s} onClick={() => onSend(s)}
            className="w-full text-left px-4 py-3 rounded-xl bg-card border border-border text-sm leading-5 text-muted-foreground hover:border-primary/40 hover:text-foreground transition-all break-words whitespace-normal">
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}