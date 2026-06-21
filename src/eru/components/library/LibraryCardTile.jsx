import { motion } from 'framer-motion';
import { Lock, Check } from 'lucide-react';
import CardDisplay from '@/eru/components/cards/CardDisplay';
import { RARITY_STYLES, ELEMENT_COLORS } from '@/eru/components/cards/StarterCards';

/**
 * LibraryCardTile
 * --------------------------------------------------------------------------
 * A single tile in the encyclopedia grid. When the card has been discovered
 * (the player owns ≥1 copy), it renders the full CardDisplay. When it's
 * undiscovered, it shows a silhouette placeholder using the same dimensions
 * so the grid stays balanced.
 */
export default function LibraryCardTile({ entry, onClick }) {
  const { card, discovered, ownedCount, rarity, element } = entry;
  const rar = RARITY_STYLES[rarity] || RARITY_STYLES.common;
  const el = ELEMENT_COLORS[element] || ELEMENT_COLORS.fire;

  return (
    <motion.button
      layout
      whileHover={{ y: -2 }}
      transition={{ type: 'spring', stiffness: 320, damping: 24 }}
      onClick={() => onClick?.(entry)}
      className="group relative flex flex-col items-center gap-1.5 p-2 rounded-xl border border-border bg-card hover:border-primary/40 hover:shadow-[0_8px_24px_-12px_hsl(var(--primary)/0.35)] transition-colors"
    >
      {discovered ? (
        <CardDisplay card={card} size="sm" />
      ) : (
        <div className={`relative w-20 h-28 rounded-xl border-2 border-white/5 bg-gradient-to-b ${el.bg} opacity-60 flex items-center justify-center overflow-hidden`}>
          <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" />
          <Lock className="w-5 h-5 text-white/70 relative z-10" />
          <div className="absolute bottom-1 left-1 right-1 text-center text-[8px] font-semibold text-white/70 truncate relative z-10">
            ???
          </div>
        </div>
      )}

      <div className="w-full min-w-0 text-center">
        <p className={`text-[10px] font-medium truncate ${discovered ? 'text-foreground' : 'text-muted-foreground'}`}>
          {discovered ? card.name : 'Unknown'}
        </p>
        <p className={`text-[9px] ${rar.color}`}>{rar.label}</p>
      </div>

      {discovered && ownedCount > 1 && (
        <span className="absolute top-1 right-1 rounded-full bg-primary/90 text-primary-foreground text-[9px] font-bold px-1.5 py-0.5">
          ×{ownedCount}
        </span>
      )}
      {discovered && ownedCount === 1 && (
        <span className="absolute top-1 right-1 rounded-full bg-primary/15 border border-primary/30 text-primary p-0.5">
          <Check className="w-2.5 h-2.5" />
        </span>
      )}
    </motion.button>
  );
}