import { Info } from 'lucide-react';

/**
 * DemoDataBanner
 * ----------------------------------------------------------------------------
 * Honest inline banner shown on pages that currently display illustrative
 * catalog entries so the user is never misled into thinking fake prices /
 * fake ownership / fake rarity are real.
 *
 * Remove this banner from a page only after ALL data on that page is loaded
 * from real sources.
 * --------------------------------------------------------------------------*/
export default function DemoDataBanner({ message }) {
  return (
    <div className="mx-4 mt-3 flex items-start gap-2 rounded-xl border border-yellow-400/30 bg-yellow-400/5 px-3 py-2">
      <Info className="w-3.5 h-3.5 text-yellow-400 mt-0.5 flex-shrink-0" />
      <p className="text-[11px] text-yellow-300/90 leading-relaxed">
        {message || 'Some items shown here are illustrative placeholders — not live market data.'}
      </p>
    </div>
  );
}