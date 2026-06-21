import { Sparkles, GripHorizontal, Pencil, Pin, MousePointerClick, ArrowRight, X } from 'lucide-react';

const STEPS = [
  {
    icon: Sparkles,
    title: 'Welcome to your nav bar',
    text: 'This bar gives quick access to your pinned pages and attached widgets.',
  },
  {
    icon: Pencil,
    title: 'Customize it anytime',
    text: 'Tap the pencil icon to open the editor and choose what appears in your nav.',
  },
  {
    icon: Pin,
    title: 'Pin your favorite pages',
    text: 'Inside the editor, tap page cards to add or remove them from the nav bar.',
  },
  {
    icon: MousePointerClick,
    title: 'Use floating widgets',
    text: 'Enable widget cards to attach Bot Market, Bot Chat, Prompt Library, and Conversations to the nav.',
  },
  {
    icon: GripHorizontal,
    title: 'Drag and arrange',
    text: 'Press and drag the nav bar to move it around your screen on mobile.',
  },
];

export default function NavWalkthrough({ open, step, setStep, onClose }) {
  if (!open) return null;

  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-end justify-center sm:items-center px-4 pt-4"
      style={{ paddingBottom: 'max(1rem, calc(1rem + env(safe-area-inset-bottom, 0px)))' }}
      onClick={onClose}
    >
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <Icon className="w-5 h-5" />
          </div>
          <button onClick={onClose} aria-label="Close" className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4">
          <p className="text-xs font-semibold text-primary">Step {step + 1} of {STEPS.length}</p>
          <h3 className="mt-1 text-lg font-semibold text-foreground">{current.title}</h3>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{current.text}</p>
        </div>

        <div className="mt-4 flex gap-1.5">
          {STEPS.map((_, index) => (
            <div
              key={index}
              className={`h-1.5 flex-1 rounded-full ${index === step ? 'bg-primary' : 'bg-secondary'}`}
            />
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            onClick={() => setStep((prev) => Math.max(0, prev - 1))}
            disabled={step === 0}
            className="inline-flex min-h-[44px] items-center rounded-xl border border-border px-4 py-2 text-sm text-muted-foreground disabled:opacity-40"
          >
            Back
          </button>
          <button
            onClick={() => {
              if (isLast) onClose();
              else setStep((prev) => prev + 1);
            }}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            {isLast ? 'Finish' : 'Next'}
            {!isLast && <ArrowRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}