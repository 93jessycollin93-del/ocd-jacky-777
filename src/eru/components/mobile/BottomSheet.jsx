import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

/**
 * BottomSheet — mobile-native modal anchored to the bottom of the screen.
 * Lightweight: uses framer-motion (already installed). Honors safe-area inset
 * and locks body scroll while open. Use as a primitive for native-style menus,
 * pickers, and confirmations on Android/iOS.
 *
 * Props:
 *   open        — boolean, visibility
 *   onClose     — () => void, dismiss handler (backdrop tap, ESC, X button)
 *   title       — optional header text
 *   children    — sheet content
 *   maxHeight   — optional CSS height cap (default: 80dvh)
 */
export default function BottomSheet({ open, onClose, title, children, maxHeight = '80dvh' }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/55"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="w-full max-w-md rounded-t-2xl border-t border-border bg-card text-foreground shadow-2xl"
            style={{ maxHeight, paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-2.5 pb-1">
              <div className="h-1.5 w-10 rounded-full bg-border" aria-hidden="true" />
            </div>
            {(title || onClose) && (
              <div className="flex items-center justify-between px-4 pb-2">
                <p className="text-sm font-semibold">{title}</p>
                {onClose && (
                  <button
                    onClick={onClose}
                    aria-label="Close"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}
            <div className="overflow-y-auto px-4 pb-4" style={{ maxHeight: `calc(${maxHeight} - 64px)` }}>
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}