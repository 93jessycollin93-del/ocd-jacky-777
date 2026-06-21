import { Wand2, Bot, Zap, Route } from 'lucide-react';

const MODES = [
  {
    id: 'choice',
    title: 'Choose a mode',
    description: 'Pick how you want to build this squad.',
    icon: Route,
  },
  {
    id: 'manual',
    title: 'Manual build',
    description: 'Choose bots and configure everything yourself.',
    icon: Bot,
  },
  {
    id: 'automatic',
    title: 'Automatic setup',
    description: 'Suggest a squad from your goal and recommended specialists.',
    icon: Wand2,
  },
  {
    id: 'instant',
    title: 'Instant auto create',
    description: 'Create a ready squad in one click using the best available bots.',
    icon: Zap,
  },
  {
    id: 'wizard',
    title: 'Guided wizard',
    description: 'Analyze the goal, suggest the best master, select strong members, and optimize the pipeline.',
    icon: Route,
  },
];

export default function SquadCreationModes({ mode, onChange }) {
  return (
    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
      {MODES.filter((item) => item.id !== 'choice').map((item) => {
        const Icon = item.icon;
        const active = mode === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            className={`rounded-xl border p-3 text-left transition-all ${active ? 'border-primary bg-primary/10' : 'border-border bg-background hover:border-primary/30'}`}
          >
            <div className="flex items-center gap-2">
              <Icon className="w-4 h-4 text-primary" />
              <p className="text-xs font-semibold text-foreground">{item.title}</p>
            </div>
            <p className="mt-2 text-[10px] text-muted-foreground">{item.description}</p>
          </button>
        );
      })}
    </div>
  );
}