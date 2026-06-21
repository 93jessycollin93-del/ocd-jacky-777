import { useState } from 'react';
import { motion } from 'framer-motion';
import { ELEMENT_COLORS, RARITY_STYLES, ABILITY_LABELS } from './StarterCards';
import { Sword, Shield, Zap, Star } from 'lucide-react';

export default function CardDisplay({ card, size = 'md', selected, onClick, glowing, disabled }) {
  const [flipped, setFlipped] = useState(false);
  const el = ELEMENT_COLORS[card.element] || ELEMENT_COLORS.fire;
  const rar = RARITY_STYLES[card.rarity] || RARITY_STYLES.common;
  const ab = card.ability ? ABILITY_LABELS[card.ability] : null;

  const sizes = {
    sm: { w: 'w-20', h: 'h-28', name: 'text-[9px]', stat: 'text-[10px]', cost: 'text-sm', pad: 'p-1.5' },
    md: { w: 'w-28', h: 'h-40', name: 'text-xs',    stat: 'text-xs',     cost: 'text-base',pad: 'p-2' },
    lg: { w: 'w-36', h: 'h-52', name: 'text-sm',    stat: 'text-sm',     cost: 'text-lg', pad: 'p-3' },
  }[size] || sizes?.md;

  const s = sizes;

  return (
    <motion.div
      whileHover={!disabled ? { scale: 1.06, y: -4 } : {}}
      whileTap={!disabled ? { scale: 0.97 } : {}}
      onClick={() => !disabled && onClick?.(card)}
      className={`relative cursor-pointer select-none ${s.w} ${s.h} rounded-xl border-2 bg-gradient-to-b ${el.bg}
        ${selected ? `${el.border} shadow-lg ${el.glow}` : 'border-white/10'}
        ${glowing ? `shadow-xl ${el.glow} shadow-lg` : ''}
        ${disabled ? 'opacity-40 cursor-not-allowed' : ''}
        transition-all duration-200 overflow-hidden flex flex-col`}
    >
      {/* Cost bubble */}
      <div className="absolute top-1.5 left-1.5 w-6 h-6 rounded-full bg-black/60 border border-white/20 flex items-center justify-center z-10">
        <span className={`${s.cost} font-bold text-yellow-300 leading-none`} style={{ fontSize: '11px' }}>{card.cost}</span>
      </div>

      {/* Level badge — only shown for leveled cards (level > 1) */}
      {Number(card.level || 1) > 1 && (
        <div className="absolute top-7 left-1.5 z-10 flex items-center gap-0.5 rounded-full border border-amber-400/60 bg-amber-500/90 px-1.5 py-0.5 shadow-md shadow-amber-500/40">
          <span className="text-[8px] font-bold text-black leading-none">L{card.level}</span>
        </div>
      )}

      {/* Element icon */}
      <div className="absolute top-1.5 right-1.5 text-base leading-none z-10">{el.icon}</div>

      {/* Art area */}
      <div className={`flex-1 flex items-center justify-center text-3xl mt-4`}>
        {card.card_type === 'spell' ? '⚡' : card.card_type === 'relic' ? '🔮' : '⚔️'}
      </div>

      {/* Card info */}
      <div className={`${s.pad} bg-black/50 backdrop-blur-sm`}>
        <p className={`${s.name} font-bold text-white truncate leading-tight mb-0.5`}>{card.name}</p>

        {/* Stats row */}
        <div className="flex items-center gap-2 mb-0.5">
          <div className="flex items-center gap-0.5">
            <Sword className="w-2.5 h-2.5 text-red-400" />
            <span className={`${s.stat} font-bold text-red-400`}>{card.power}</span>
          </div>
          <div className="flex items-center gap-0.5">
            <Shield className="w-2.5 h-2.5 text-blue-400" />
            <span className={`${s.stat} font-bold text-blue-400`}>{card.guard}</span>
          </div>
        </div>

        {/* Ability */}
        {ab && (
          <div className={`text-[8px] font-semibold ${ab.color} flex items-center gap-0.5`}>
            <Zap className="w-2 h-2" />
            {ab.label} {card.ability_value > 0 ? `+${card.ability_value}` : ''}
          </div>
        )}

        {/* Rarity stars */}
        <div className="flex gap-0.5 mt-0.5">
          {Array.from({ length: rar.stars }).map((_, i) => (
            <Star key={i} className={`w-2 h-2 fill-current ${rar.color}`} />
          ))}
        </div>
      </div>

      {/* Selected indicator */}
      {selected && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 border-2 rounded-xl border-white/50 pointer-events-none"
        />
      )}

      {/* Legendary shimmer */}
      {(card.rarity === 'legendary' || card.rarity === 'mythic') && (
        <motion.div
          animate={{ x: ['−100%', '200%'] }}
          transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 3 }}
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 pointer-events-none"
        />
      )}
    </motion.div>
  );
}