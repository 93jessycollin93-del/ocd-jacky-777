import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BACKGROUND_THEMES, type BackgroundTheme } from './AnimatedBackgrounds';
import { haptic } from '@/lib/telegram';
import { X } from 'lucide-react';

interface BackgroundPickerProps {
  current: BackgroundTheme;
  onChange: (theme: BackgroundTheme) => void;
  onClose: () => void;
}

const CATEGORIES = [
  { id: 'basic', label: 'Basic' },
  { id: 'tech', label: 'Tech' },
  { id: 'cosmic', label: 'Cosmic' },
  { id: 'nature', label: 'Nature' },
  { id: 'luxury', label: 'Luxury' },
];

export default function BackgroundPicker({ current, onChange, onClose }: BackgroundPickerProps) {
  const [activeTab, setActiveTab] = useState(
    BACKGROUND_THEMES.find(t => t.id === current)?.category ?? 'basic'
  );

  const filtered = BACKGROUND_THEMES.filter(t => t.category === activeTab);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border-t border-border/40 bg-card/95 backdrop-blur-xl max-h-[60vh] flex flex-col"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-border/20">
        <h3 className="text-sm font-bold text-foreground">Animated Backgrounds</h3>
        <button onClick={onClose} className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center">
          <X size={18} />
        </button>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1.5 px-4 py-2 overflow-x-auto no-scrollbar">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveTab(cat.id)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-semibold min-h-[36px] transition-all ${
              activeTab === cat.id
                ? 'bg-primary/20 text-primary'
                : 'bg-muted/30 text-muted-foreground'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Theme grid */}
      <div className="flex-1 overflow-y-auto px-4 py-2">
        <div className="grid grid-cols-3 gap-2">
          {filtered.map(theme => (
            <button
              key={theme.id}
              onClick={() => { haptic.selection(); onChange(theme.id); }}
              className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all min-h-[72px] ${
                current === theme.id
                  ? 'border-primary bg-primary/10'
                  : 'border-border/30 bg-muted/20'
              }`}
            >
              <span className="text-xl">{theme.icon}</span>
              <span className="text-[9px] font-medium text-foreground text-center leading-tight">{theme.label}</span>
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
