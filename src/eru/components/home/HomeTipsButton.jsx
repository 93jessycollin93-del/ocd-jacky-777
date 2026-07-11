import { useState } from 'react';
import { Lightbulb } from 'lucide-react';
import HomeTour from './HomeTour';

/**
 * HomeTipsButton — the "Tips & Tricks" call-to-action shown at the top of the
 * Home page. Opens the interactive HomeTour overlay on demand.
 */
export default function HomeTipsButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary shadow-sm transition-all hover:bg-primary/20 hover:shadow-[0_0_18px_hsl(160_100%_45%/0.35)] active:scale-95"
      >
        <Lightbulb className="h-4 w-4" />
        Tips &amp; Tricks
      </button>

      <HomeTour open={open} onClose={() => setOpen(false)} />
    </>
  );
}