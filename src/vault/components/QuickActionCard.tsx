import type { LucideIcon } from 'lucide-react';

interface QuickActionCardProps {
  icon: LucideIcon;
  label: string;
  description: string;
  onClick: () => void;
  accent?: boolean;
}

export function QuickActionCard({ icon: Icon, label, description, onClick, accent }: QuickActionCardProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full p-4 rounded-sm border text-left transition-all duration-200 min-h-[44px] group ${
        accent
          ? 'border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50'
          : 'border-border bg-card hover:border-primary/20 hover:bg-secondary/50'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-sm flex items-center justify-center shrink-0 ${
          accent ? 'bg-primary/15' : 'bg-secondary'
        }`}>
          <Icon className={`w-5 h-5 ${accent ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="text-[11px] text-muted-foreground truncate">{description}</p>
        </div>
      </div>
    </button>
  );
}
