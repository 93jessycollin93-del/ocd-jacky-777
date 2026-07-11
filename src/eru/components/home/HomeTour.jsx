import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  X, ChevronLeft, ChevronRight, Sparkles,
  Users, BarChart2, Bot, Scale, Compass,
} from 'lucide-react';

/**
 * HomeTour — a lightweight, mobile-first interactive tour overlay for the
 * Home page. Walks first-time (and returning) visitors through the platform's
 * main pathways and how to navigate Eru. Pure presentation; no business logic.
 */
const TOUR_SEEN_KEY = 'home_tour_seen';

const STEPS = [
  {
    icon: Compass,
    accent: 'text-primary',
    title: 'Welcome to Eru',
    body: 'This quick tour shows you the main areas of the platform and how to get around. You can reopen it anytime from the “Tips & Tricks” button.',
  },
  {
    icon: Users,
    accent: 'text-fuchsia-300',
    title: 'Grow — Social & Influence',
    body: 'Join the Community feed, chat, broadcast through Telegram bots, and build your reputation with badges and rankings.',
  },
  {
    icon: BarChart2,
    accent: 'text-emerald-300',
    title: 'Trade — Markets & Assets',
    body: 'Track live markets, manage your portfolio, and trade assets, NFTs, and cards — all from one clean flow.',
  },
  {
    icon: Bot,
    accent: 'text-cyan-300',
    title: 'Automate — Bots & Integrations',
    body: 'Build and deploy AI bots in the AI Lab, automate routines, and connect tools like Slack, Notion, and Sheets.',
  },
  {
    icon: Scale,
    accent: 'text-cyan-300',
    title: 'Navigate Anywhere',
    body: 'Use the floating nav bar to jump between pages. Press and hold it to move it, tap the pencil to customize, and use Search to find anything fast.',
  },
];

export default function HomeTour({ open, onClose }) {
  const [step, setStep] = useState(0);

  // Reset to first step whenever the tour is (re)opened.
  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  if (!open) return null;

  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];
  const Icon = current.icon;

  const handleClose = () => {
    try { localStorage.setItem(TOUR_SEEN_KEY, 'true'); } catch { /* ignore */ }
    onClose?.();
  };

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="home-tour"
        className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center bg-black/70 backdrop-blur-sm px-3 pt-3"
        style={{ paddingBottom: 'max(0.75rem, calc(0.75rem + env(safe-area-inset-bottom, 0px)))' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
      >
        <motion.div
          className="eru-theme-modal relative w-full max-w-md rounded-2xl border border-border p-5 sm:p-6"
          initial={{ y: 56, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 56, opacity: 0, scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleClose}
            aria-label="Close tour"
            className="absolute right-3 top-3 inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-secondary/60 text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
            <Sparkles className="h-3 w-3" /> Tips & Tricks
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
              className="mt-4"
            >
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-secondary/50 ${current.accent}`}>
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-3 text-lg font-bold leading-tight text-foreground">
                {current.title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {current.body}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Progress dots */}
          <div className="mt-5 flex items-center justify-center gap-1.5">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? 'w-5 bg-primary' : 'w-1.5 bg-muted-foreground/30'
                }`}
              />
            ))}
          </div>

          {/* Controls */}
          <div className="mt-4 flex items-center justify-between gap-3">
            <button
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className="inline-flex min-h-[44px] items-center gap-1 rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" /> Back
            </button>

            {isLast ? (
              <button
                onClick={handleClose}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
              >
                Got it
              </button>
            ) : (
              <button
                onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}

/** Returns true if the first-time visitor hasn't seen the tour yet. */
export function hasSeenTour() {
  try { return localStorage.getItem(TOUR_SEEN_KEY) === 'true'; } catch { return false; }
}