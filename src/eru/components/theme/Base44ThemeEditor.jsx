import { Paintbrush, Sparkles } from 'lucide-react';
import ThemeEnginePanel from '@/eru/components/theme/ThemeEnginePanel';
import AdvancedThemeStudio from '@/eru/components/theme/AdvancedThemeStudio';

export default function Base44ThemeEditor() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
            <Paintbrush className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-base font-semibold text-foreground">Theme</p>
            <p className="mt-1 text-sm text-muted-foreground">These colors and fonts make up your theme. Any changes apply everywhere.</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-xl border border-primary/20 bg-primary/10 p-2.5">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Visual editor</p>
            <p className="mt-1 text-xs text-muted-foreground">Use the quick editor for the same simple theme workflow, then fine-tune with the full visual studio below if needed.</p>
          </div>
        </div>
      </div>

      <ThemeEnginePanel />
      <AdvancedThemeStudio />
    </div>
  );
}