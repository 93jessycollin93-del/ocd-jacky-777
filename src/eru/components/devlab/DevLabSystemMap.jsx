import { Cpu, Brain, ListChecks, BookOpen, FileDiff, ShieldCheck, Rocket } from 'lucide-react';

const LAYERS = [
  { key: 'ui',         label: 'User Interface Layer',     icon: Cpu,         desc: 'Tabs, prompt bar, inspector — what the user sees and touches.' },
  { key: 'plan',       label: 'AI Planning Layer',        icon: Brain,       desc: 'Plan mode produces structured plans (template or AI-generated).' },
  { key: 'queue',      label: 'Agent Task Queue',         icon: ListChecks,  desc: 'Sequential tasks derived from approved plans.' },
  { key: 'knowledge',  label: 'Knowledge / Memory Layer', icon: BookOpen,    desc: 'Pinned Golden Rules, project knowledge, and file references.' },
  { key: 'patches',    label: 'Generated Patch Layer',    icon: FileDiff,    desc: 'Copyable manual patches — never auto-applied without a sandbox.' },
  { key: 'tests',      label: 'Testing / Validation',     icon: ShieldCheck, desc: 'Manual checklists. No fake test runs.' },
  { key: 'deploy',     label: 'Deployment / Export',      icon: Rocket,      desc: 'Manual export today; routed through a connected provider when set.' },
];

/**
 * DevLabSystemMap — calm, performance-safe layer diagram. No heavy SVG /
 * canvas — pure CSS so it stays smooth on mobile.
 */
export default function DevLabSystemMap() {
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        How the Jackie Dev Lab pieces fit together. Each layer is honest about whether it produces planning artifacts or real changes.
      </p>
      <ol className="space-y-2">
        {LAYERS.map((layer, i) => {
          const Icon = layer.icon;
          return (
            <li key={layer.key} className="relative">
              <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-3">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/30 text-primary">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Layer {i + 1}</p>
                  <p className="text-sm font-semibold text-foreground">{layer.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{layer.desc}</p>
                </div>
              </div>
              {i < LAYERS.length - 1 && (
                <div className="ml-[26px] h-3 w-px bg-gradient-to-b from-primary/40 to-transparent" aria-hidden="true" />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}