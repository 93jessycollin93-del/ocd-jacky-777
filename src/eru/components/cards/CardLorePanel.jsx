import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Radio, Activity, BookOpen, Sparkles } from 'lucide-react';
import { ensureLoreProfile, stabilityBand, distortionClassFor } from '@/eru/lib/cardLore';

/**
 * CardLorePanel
 * ------------------------------------------------------------------
 * The "Lore" tab inside a card detail view. Expandable, mobile-first,
 * dark cosmic theme, subtle signal-distortion overlay driven by the
 * card's hidden stability. Pure presentation — never touches battle.
 *
 * Props:
 *   card        — the card record (lore fields auto-derived if missing)
 *   defaultOpen — start expanded
 *   compact     — denser layout for inline use (e.g. card detail dialogs)
 */
export default function CardLorePanel({ card, defaultOpen = false, compact = false }) {
  const [open, setOpen] = useState(defaultOpen);

  const lore = useMemo(() => ensureLoreProfile(card || {}), [card]);
  const visibleBand = stabilityBand(lore.stability_visible);
  const distortion = distortionClassFor(lore.stability_hidden);
  const log = Array.isArray(lore.historical_log) ? lore.historical_log : [];

  if (!card) return null;

  return (
    <div className={`relative overflow-hidden rounded-xl border border-white/10 bg-[radial-gradient(circle_at_20%_-20%,rgba(120,80,255,0.18),transparent_60%),radial-gradient(circle_at_80%_120%,rgba(0,200,180,0.12),transparent_55%),#06070d] ${compact ? '' : 'mt-3'}`}>
      {/* Signal distortion overlay — purely cosmetic, pointer-events-none. */}
      <div className={`pointer-events-none absolute inset-0 ${distortion}`} aria-hidden="true" />

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative z-[1] flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <BookOpen className="h-3.5 w-3.5 text-cyan-300 flex-shrink-0" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-200/90">Lore</p>
          <span className={`flex items-center gap-1 text-[10px] ${visibleBand.tone} truncate`}>
            <span className={`h-1.5 w-1.5 rounded-full ${visibleBand.dot}`} />
            {visibleBand.label}
          </span>
        </div>
        <ChevronDown className={`h-3.5 w-3.5 text-white/50 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="relative z-[1] overflow-hidden"
          >
            <div className="space-y-3 border-t border-white/5 px-3 py-3">
              <LoreRow icon={Radio} label="Origin" value={lore.lore_origin} accent="text-cyan-200" />
              <StabilityBar visible={lore.stability_visible} />
              {lore.lore_tag && (
                <LoreRow icon={Sparkles} label="Tag" value={lore.lore_tag.replace(/_/g, ' ')} accent="text-violet-200" />
              )}

              <div>
                <div className="mb-1.5 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-white/50">
                  <Activity className="h-3 w-3" /> Historical log
                </div>
                {log.length === 0 ? (
                  <p className="text-[11px] text-white/40">No recorded events.</p>
                ) : (
                  <ol className="space-y-1.5">
                    {log.slice(-8).reverse().map((entry, i) => (
                      <li key={`${entry.timestamp || i}-${i}`} className="flex gap-2 text-[11px] text-white/75">
                        <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-cyan-400/70" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate">{entry.summary || entry.event_type}</p>
                          {entry.timestamp && (
                            <p className="text-[9px] text-white/35">{formatTs(entry.timestamp)}{entry.actor ? ` · ${entry.actor}` : ''}</p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function LoreRow({ icon: Icon, label, value, accent = 'text-white/80' }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-3 w-3 text-white/50 flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-[9px] uppercase tracking-[0.2em] text-white/45">{label}</p>
        <p className={`text-[12px] ${accent} truncate`}>{value || '—'}</p>
      </div>
    </div>
  );
}

function StabilityBar({ visible }) {
  const band = stabilityBand(visible);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-white/50">
        <span>Stability</span>
        <span className={band.tone}>{visible}/100 · {band.label}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
        <div
          className={`h-full ${band.dot} transition-all`}
          style={{ width: `${Math.max(2, Math.min(100, visible))}%` }}
        />
      </div>
    </div>
  );
}

function formatTs(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}