export default function SquadWizardProgress({ step, onStepChange }) {
  const steps = [
    { id: 1, label: 'Goal analysis' },
    { id: 2, label: 'Best master' },
    { id: 3, label: 'Best members' },
    { id: 4, label: 'Pipeline fit' },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {steps.map((item) => {
        const active = step === item.id;
        const complete = step > item.id;
        return (
          <button
            key={item.id}
            onClick={() => onStepChange(item.id)}
            className={`rounded-full px-3 py-1.5 text-[10px] font-medium border ${active ? 'border-primary bg-primary/10 text-primary' : complete ? 'border-primary/20 bg-primary/5 text-primary' : 'border-border bg-background text-muted-foreground'}`}
          >
            {item.id}. {item.label}
          </button>
        );
      })}
    </div>
  );
}