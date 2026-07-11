import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Waves } from 'lucide-react';
import { fetchPressure, phaseFor } from '@/eru/lib/cardLore';

/**
 * RealityPressureMeter
 * ------------------------------------------------------------------
 * Compact header pill that shows the player's current Reality Pressure
 * and its narrative phase. Reactive — listens to a global window event
 * (`reality-pressure-changed`) that lib/cardLore.js dispatches after
 * bumpPressure() so callers don't need to thread state.
 */
export default function RealityPressureMeter({ compact = true, className = '' }) {
  const [row, setRow] = useState(null);

  useEffect(() => {
    let mounted = true;
    fetchPressure().then((r) => { if (mounted) setRow(r); });
    const handler = (e) => { if (mounted && e?.detail) setRow(e.detail); };
    window.addEventListener('reality-pressure-changed', handler);
    return () => { mounted = false; window.removeEventListener('reality-pressure-changed', handler); };
  }, []);

  const pressure = Math.max(0, Math.min(100, Number(row?.pressure || 0)));
  const phase = phaseFor(pressure);

  return (
    <div className={`relative inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-1.5 text-[11px] font-medium backdrop-blur-sm ${className}`}>
      <Waves className={`h-3.5 w-3.5 ${phase.tone}`} />
      <div className="flex items-center gap-2 min-w-0">
        <div className="relative h-1.5 w-16 overflow-hidden rounded-full bg-white/5">
          <motion.div
            className={`h-full rounded-full ${phase.tone.replace('text-', 'bg-')}`}
            initial={false}
            animate={{ width: `${pressure}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
        <span className={`${phase.tone} font-semibold`}>{pressure}</span>
        {!compact && (
          <span className="text-white/60 truncate">· {phase.label}</span>
        )}
      </div>
      {/* Subtle pulse for narrative tension at high phases */}
      {pressure >= 75 && (
        <motion.span
          className={`pointer-events-none absolute inset-0 rounded-full ${phase.glow} shadow-lg`}
          animate={{ opacity: [0.25, 0.55, 0.25] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
    </div>
  );
}