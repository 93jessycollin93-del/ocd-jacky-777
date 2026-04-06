interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <span className="text-4xl mb-4 opacity-40">{icon}</span>
      <h3 className="text-sm font-mono uppercase tracking-wider text-foreground mb-2">{title}</h3>
      <p className="text-xs text-muted-foreground max-w-xs mb-4">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 text-xs font-mono uppercase tracking-wider bg-primary text-primary-foreground rounded-sm hover:bg-primary/90 transition-colors min-h-[44px]"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
