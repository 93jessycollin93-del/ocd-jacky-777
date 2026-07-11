import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Hammer, CheckCircle2, AlertTriangle, Loader2, X, Sparkles, ChevronDown } from 'lucide-react';
import CardDisplay from './CardDisplay';
import { RARITY_STYLES } from './StarterCards';
import { FORGE_RECIPES, evaluateRecipe, runRecipeCraft } from '@/eru/lib/forgeRecipes';
import { reportQuestEvent } from '@/eru/lib/dailyQuests';

/**
 * ForgeRecipesPanel
 * --------------------------------------------------------------------------
 * Shows all known forge recipes with live "have / need" status against the
 * player's collection. Eligible recipes can be crafted in one click; the
 * reward card is revealed in the same animated reveal style used by the
 * transmutation forge for visual consistency.
 *
 * Pure UI — all crafting logic lives in lib/forgeRecipes.js.
 */
export default function ForgeRecipesPanel({ cards = [], onCardForged }) {
  const [crafting, setCrafting] = useState(null); // recipe.id while crafting
  const [crafted, setCrafted] = useState(null);   // { card, recipe } reveal
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(null); // recipe.id of expanded card

  const evaluations = useMemo(
    () => FORGE_RECIPES.map((r) => evaluateRecipe(r, cards)),
    [cards],
  );
  const readyCount = evaluations.filter((e) => e.ready).length;

  const handleCraft = async (recipe) => {
    setError(null);
    setCrafting(recipe.id);
    const result = await runRecipeCraft(recipe, cards);
    setCrafting(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setCrafted(result);
    onCardForged?.(result);
    reportQuestEvent('transmutation', { recipe_id: recipe.id });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-900/30 to-orange-900/20 p-4">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-amber-300" />
          <h3 className="text-base font-bold text-amber-100">Forge Recipes</h3>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Specific card combinations craft <span className="text-amber-200 font-semibold">guaranteed</span> rewards — no random rolls.
        </p>
        <p className="mt-2 text-[11px] text-amber-300">
          {readyCount}/{FORGE_RECIPES.length} recipes ready
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300 flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5" /> {error}
        </div>
      )}

      <div className="space-y-2">
        {evaluations.map((evalResult) => (
          <RecipeRow
            key={evalResult.recipe.id}
            evalResult={evalResult}
            crafting={crafting === evalResult.recipe.id}
            expanded={expanded === evalResult.recipe.id}
            onToggleExpand={() => setExpanded((id) => (id === evalResult.recipe.id ? null : evalResult.recipe.id))}
            onCraft={() => handleCraft(evalResult.recipe)}
          />
        ))}
      </div>

      <AnimatePresence>
        {crafted?.card && (
          <RecipeReveal crafted={crafted} onClose={() => setCrafted(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Recipe row ─────────────────────────────────────────────────────────────
function RecipeRow({ evalResult, crafting, expanded, onToggleExpand, onCraft }) {
  const { recipe, slots, ready } = evalResult;

  return (
    <div className={`rounded-xl border p-3 transition-colors ${ready ? 'border-amber-500/40 bg-amber-500/5' : 'border-border bg-card'}`}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-foreground truncate">{recipe.name}</p>
            <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 border ${
              ready
                ? 'text-amber-200 bg-amber-500/15 border-amber-500/40'
                : 'text-muted-foreground bg-secondary border-border'
            }`}>
              {ready ? 'Ready' : 'Locked'}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{recipe.description}</p>
          <p className="text-[10px] text-amber-300 mt-1 inline-flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Reward: {recipe.rewardLabel}
          </p>
        </div>
        <button
          onClick={onToggleExpand}
          className="text-muted-foreground hover:text-foreground p-1 -mr-1"
          aria-label={expanded ? 'Hide details' : 'Show details'}
        >
          <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Slot summary chips */}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {slots.map((s, i) => (
          <span
            key={i}
            className={`text-[10px] rounded-full px-2 py-0.5 border ${
              s.satisfied
                ? 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30'
                : 'text-muted-foreground bg-secondary border-border'
            }`}
          >
            {s.label} · {s.have}/{s.need}
          </span>
        ))}
      </div>

      {expanded && (
        <div className="mt-3 space-y-2 border-t border-border/60 pt-3">
          {slots.map((s, i) => (
            <div key={i}>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                {s.label} · {s.have}/{s.need}
              </p>
              {s.candidates.length === 0 ? (
                <p className="text-[10px] text-muted-foreground italic">No matching cards in collection.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {s.candidates.map((c) => (
                    <CardDisplay key={c.id} card={c} size="sm" />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <button
        onClick={onCraft}
        disabled={!ready || crafting}
        className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold py-2 disabled:opacity-40"
      >
        {crafting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Hammer className="w-4 h-4" />}
        {crafting ? 'Crafting…' : ready ? 'Craft Recipe' : 'Missing Cards'}
      </button>
    </div>
  );
}

// ─── Reveal modal (mirrors ForgeReveal style for visual consistency) ────────
function RecipeReveal({ crafted, onClose }) {
  const { card, recipe } = crafted;
  const rar = RARITY_STYLES[card.rarity];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.85, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 12 }}
        transition={{ type: 'spring', stiffness: 220, damping: 22 }}
        className="relative w-full max-w-xs rounded-2xl border border-amber-500/40 bg-gradient-to-br from-[#150e07] via-[#241608] to-[#0e0805] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <motion.div
          aria-hidden
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: [0, 0.7, 0.45], scale: [0.6, 1.4, 1.1] }}
          transition={{ duration: 1.4, ease: 'easeOut' }}
          className="pointer-events-none absolute inset-0 rounded-2xl"
          style={{ background: 'radial-gradient(circle at center, rgba(245,158,11,0.45), transparent 60%)' }}
        />
        <button
          onClick={onClose}
          className="absolute top-2 right-2 rounded-full p-1.5 text-white/60 hover:bg-white/10 hover:text-white"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="relative text-center">
          <p className="text-[10px] uppercase tracking-[0.2em] text-amber-300">Recipe Crafted</p>
          <p className="mt-1 text-xs text-muted-foreground">{recipe.name}</p>

          <motion.div
            initial={{ scale: 0.4, opacity: 0, rotateY: 90 }}
            animate={{ scale: 1, opacity: 1, rotateY: 0 }}
            transition={{ delay: 0.35, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="my-5 flex justify-center"
          >
            <CardDisplay card={card} size="lg" glowing />
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.85 }}
            className="text-sm font-semibold text-foreground"
          >
            {card.name}
          </motion.p>
          {rar && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.95 }}
              className={`text-[11px] mt-0.5 ${rar.color}`}
            >
              {rar.label}
            </motion.p>
          )}

          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1 }}
            onClick={onClose}
            className="mt-5 inline-flex items-center justify-center gap-2 w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold py-2.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            Continue
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}