import { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { haptic } from '@/lib/telegram';
import {
  ArrowLeft, Layers, Swords, Trophy, Star, Sparkles, Crown,
  Shield, Zap, Heart, Eye, Plus, Minus, RotateCcw, Lock
} from 'lucide-react';

// ── Types ──
type CardRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';
type CardElement = 'fire' | 'water' | 'earth' | 'air' | 'shadow' | 'light';
type ArenaTab = 'collection' | 'deck' | 'arena' | 'reveal';

interface CreatureCard {
  id: string;
  name: string;
  species: string;
  element: CardElement;
  rarity: CardRarity;
  attack: number;
  defense: number;
  health: number;
  ability: string;
  abilityDesc: string;
  art: string; // emoji art
  owned: number;
  inDeck: number;
}

interface Deck {
  id: string;
  name: string;
  cards: string[]; // card IDs
  maxSize: number;
}

interface Tournament {
  id: string;
  name: string;
  entryFee: number;
  prizePool: string;
  participants: number;
  maxParticipants: number;
  status: 'open' | 'in_progress' | 'completed';
  endsAt: number;
  tier: CardRarity;
}

// ── Constants ──
const RARITY_CONFIG: Record<CardRarity, { label: string; color: string; glow: string; bg: string }> = {
  common:    { label: 'Common',    color: 'hsl(0,0%,65%)',      glow: 'none',                                    bg: 'hsl(0,0%,20%)' },
  uncommon:  { label: 'Uncommon',  color: 'hsl(140,60%,50%)',   glow: '0 0 8px hsl(140,60%,50%,0.3)',            bg: 'hsl(140,30%,15%)' },
  rare:      { label: 'Rare',      color: 'hsl(210,80%,60%)',   glow: '0 0 12px hsl(210,80%,60%,0.4)',           bg: 'hsl(210,40%,15%)' },
  epic:      { label: 'Epic',      color: 'hsl(280,70%,60%)',   glow: '0 0 16px hsl(280,70%,60%,0.5)',           bg: 'hsl(280,35%,15%)' },
  legendary: { label: 'Legendary', color: 'hsl(45,90%,55%)',    glow: '0 0 20px hsl(45,90%,55%,0.5)',            bg: 'hsl(45,50%,12%)' },
  mythic:    { label: 'Mythic',    color: 'hsl(330,80%,60%)',   glow: '0 0 24px hsl(330,80%,60%,0.6)',           bg: 'hsl(330,40%,12%)' },
};

const ELEMENT_ICONS: Record<CardElement, string> = {
  fire: '🔥', water: '💧', earth: '🪨', air: '💨', shadow: '🌑', light: '✨',
};

const SAMPLE_CARDS: CreatureCard[] = [
  { id: 'c1', name: 'Ember Drake', species: 'Dragon', element: 'fire', rarity: 'rare', attack: 7, defense: 4, health: 6, ability: 'Inferno Breath', abilityDesc: 'Deal 3 damage to all enemies', art: '🐉', owned: 2, inDeck: 1 },
  { id: 'c2', name: 'Tidecaller', species: 'Serpent', element: 'water', rarity: 'epic', attack: 5, defense: 8, health: 7, ability: 'Tidal Shield', abilityDesc: 'Block next 2 attacks', art: '🐍', owned: 1, inDeck: 0 },
  { id: 'c3', name: 'Stone Golem', species: 'Golem', element: 'earth', rarity: 'common', attack: 3, defense: 9, health: 10, ability: 'Fortify', abilityDesc: '+2 defense for 3 turns', art: '🗿', owned: 5, inDeck: 2 },
  { id: 'c4', name: 'Zephyr Hawk', species: 'Phoenix', element: 'air', rarity: 'uncommon', attack: 6, defense: 3, health: 5, ability: 'Gale Strike', abilityDesc: 'Attack first, ignore defense', art: '🦅', owned: 3, inDeck: 1 },
  { id: 'c5', name: 'Void Wraith', species: 'Wraith', element: 'shadow', rarity: 'legendary', attack: 9, defense: 5, health: 8, ability: 'Soul Drain', abilityDesc: 'Steal 2 health on hit', art: '👻', owned: 1, inDeck: 1 },
  { id: 'c6', name: 'Radiant Stag', species: 'Beast', element: 'light', rarity: 'mythic', attack: 8, defense: 7, health: 9, ability: 'Divine Blessing', abilityDesc: 'Heal all allies 3 HP', art: '🦌', owned: 1, inDeck: 0 },
  { id: 'c7', name: 'Flame Imp', species: 'Imp', element: 'fire', rarity: 'common', attack: 4, defense: 2, health: 3, ability: 'Scorch', abilityDesc: 'Burn for 1 damage/turn', art: '😈', owned: 8, inDeck: 2 },
  { id: 'c8', name: 'Frost Wyrm', species: 'Dragon', element: 'water', rarity: 'legendary', attack: 8, defense: 6, health: 9, ability: 'Absolute Zero', abilityDesc: 'Freeze target for 2 turns', art: '🐲', owned: 1, inDeck: 1 },
  { id: 'c9', name: 'Crystal Sprite', species: 'Fae', element: 'light', rarity: 'rare', attack: 4, defense: 5, health: 4, ability: 'Prismatic Barrier', abilityDesc: 'Reflect 50% damage', art: '🧚', owned: 2, inDeck: 0 },
  { id: 'c10', name: 'Obsidian Wolf', species: 'Beast', element: 'shadow', rarity: 'epic', attack: 7, defense: 6, health: 7, ability: 'Shadow Pounce', abilityDesc: 'Double damage from stealth', art: '🐺', owned: 1, inDeck: 1 },
  { id: 'c11', name: 'Thornback Turtle', species: 'Beast', element: 'earth', rarity: 'uncommon', attack: 2, defense: 10, health: 12, ability: 'Shell Armor', abilityDesc: 'Reduce all damage by 2', art: '🐢', owned: 4, inDeck: 0 },
  { id: 'c12', name: 'Storm Roc', species: 'Phoenix', element: 'air', rarity: 'rare', attack: 6, defense: 4, health: 5, ability: 'Chain Lightning', abilityDesc: 'Hit 3 random enemies', art: '⚡', owned: 2, inDeck: 1 },
];

const SAMPLE_TOURNAMENTS: Tournament[] = [
  { id: 't1', name: 'Bronze Crucible', entryFee: 100, prizePool: '5,000 Gold', participants: 12, maxParticipants: 16, status: 'open', endsAt: Date.now() + 86400000, tier: 'common' },
  { id: 't2', name: 'Silver Gauntlet', entryFee: 500, prizePool: '25,000 Gold + Rare Pack', participants: 8, maxParticipants: 8, status: 'in_progress', endsAt: Date.now() + 43200000, tier: 'rare' },
  { id: 't3', name: 'Sovereign\'s Crown', entryFee: 2000, prizePool: 'Mythic Card + 100K Gold', participants: 3, maxParticipants: 4, status: 'open', endsAt: Date.now() + 172800000, tier: 'mythic' },
];

// ── Sub-components ──

function CreatureCardDisplay({ card, compact, onTap, selected }: { card: CreatureCard; compact?: boolean; onTap?: () => void; selected?: boolean }) {
  const rc = RARITY_CONFIG[card.rarity];
  return (
    <motion.div
      whileTap={{ scale: 0.95 }}
      onClick={() => { haptic.light(); onTap?.(); }}
      className={`relative rounded-xl overflow-hidden cursor-pointer transition-all ${selected ? 'ring-2 ring-primary' : ''}`}
      style={{ background: rc.bg, boxShadow: selected ? rc.glow : 'none', minWidth: compact ? 100 : undefined }}
    >
      <div className="p-2.5">
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: rc.color }}>{rc.label}</span>
          <span className="text-xs">{ELEMENT_ICONS[card.element]}</span>
        </div>
        {/* Art */}
        <div className="text-center text-3xl my-2" role="img" aria-label={card.name}>{card.art}</div>
        {/* Name */}
        <p className="text-xs font-bold text-foreground truncate text-center">{card.name}</p>
        {!compact && (
          <>
            <p className="text-[10px] text-muted-foreground text-center">{card.species}</p>
            {/* Stats */}
            <div className="flex justify-between mt-2 text-[10px]">
              <span className="flex items-center gap-0.5"><Swords size={10} className="text-red-400" />{card.attack}</span>
              <span className="flex items-center gap-0.5"><Shield size={10} className="text-blue-400" />{card.defense}</span>
              <span className="flex items-center gap-0.5"><Heart size={10} className="text-green-400" />{card.health}</span>
            </div>
            {/* Ability */}
            <div className="mt-2 p-1.5 rounded bg-black/30 border border-white/5">
              <p className="text-[10px] font-semibold text-foreground flex items-center gap-1"><Zap size={9} />{card.ability}</p>
              <p className="text-[9px] text-muted-foreground mt-0.5">{card.abilityDesc}</p>
            </div>
            <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
              <span>Owned: {card.owned}</span>
              <span>In deck: {card.inDeck}</span>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}

function CardRevealAnimation({ card, onDone }: { card: CreatureCard; onDone: () => void }) {
  const [phase, setPhase] = useState<'hidden' | 'flip' | 'glow' | 'done'>('hidden');
  const rc = RARITY_CONFIG[card.rarity];

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('flip'), 300);
    const t2 = setTimeout(() => setPhase('glow'), 1200);
    const t3 = setTimeout(() => setPhase('done'), 2500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={() => { if (phase === 'done') onDone(); }}>
      <AnimatePresence mode="wait">
        {phase === 'hidden' && (
          <motion.div
            key="hidden"
            className="w-48 h-64 rounded-2xl bg-gradient-to-br from-muted to-muted/50 border border-border flex items-center justify-center"
            animate={{ rotateY: [0, 10, -10, 0] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          >
            <Sparkles size={40} className="text-muted-foreground animate-pulse" />
          </motion.div>
        )}
        {phase === 'flip' && (
          <motion.div
            key="flip"
            initial={{ rotateY: 180, scale: 0.5 }}
            animate={{ rotateY: 0, scale: 1 }}
            transition={{ duration: 0.8, type: 'spring' }}
            className="w-48 h-64 rounded-2xl flex items-center justify-center"
            style={{ background: rc.bg, boxShadow: rc.glow }}
          >
            <span className="text-6xl">{card.art}</span>
          </motion.div>
        )}
        {(phase === 'glow' || phase === 'done') && (
          <motion.div
            key="reveal"
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            className="w-56"
          >
            <motion.div
              animate={{ boxShadow: [rc.glow, `0 0 40px ${rc.color}`, rc.glow] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="rounded-2xl"
            >
              <CreatureCardDisplay card={card} />
            </motion.div>
            {phase === 'done' && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-xs text-muted-foreground mt-4">Tap to continue</motion.p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main Component ──
interface CardArenaProps {
  onBack: () => void;
}

export default function CardArena({ onBack }: CardArenaProps) {
  const [tab, setTab] = useState<ArenaTab>('collection');
  const [cards, setCards] = useState<CreatureCard[]>(SAMPLE_CARDS);
  const [deck, setDeck] = useState<Deck>({ id: 'd1', name: 'Main Deck', cards: SAMPLE_CARDS.filter(c => c.inDeck > 0).map(c => c.id), maxSize: 12 });
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [revealCard, setRevealCard] = useState<CreatureCard | null>(null);
  const [filterRarity, setFilterRarity] = useState<CardRarity | 'all'>('all');
  const [filterElement, setFilterElement] = useState<CardElement | 'all'>('all');

  const filteredCards = useMemo(() => {
    return cards.filter(c => {
      if (filterRarity !== 'all' && c.rarity !== filterRarity) return false;
      if (filterElement !== 'all' && c.element !== filterElement) return false;
      return true;
    });
  }, [cards, filterRarity, filterElement]);

  const deckCards = useMemo(() => deck.cards.map(id => cards.find(c => c.id === id)!).filter(Boolean), [deck, cards]);

  const addToDeck = useCallback((cardId: string) => {
    if (deck.cards.length >= deck.maxSize) return;
    haptic.light();
    setDeck(d => ({ ...d, cards: [...d.cards, cardId] }));
    setCards(prev => prev.map(c => c.id === cardId ? { ...c, inDeck: c.inDeck + 1 } : c));
  }, [deck]);

  const removeFromDeck = useCallback((cardId: string) => {
    haptic.light();
    const idx = deck.cards.indexOf(cardId);
    if (idx === -1) return;
    setDeck(d => ({ ...d, cards: d.cards.filter((_, i) => i !== idx) }));
    setCards(prev => prev.map(c => c.id === cardId ? { ...c, inDeck: Math.max(0, c.inDeck - 1) } : c));
  }, [deck]);

  const simulateReveal = useCallback(() => {
    haptic.heavy();
    const pool = SAMPLE_CARDS;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    setRevealCard({ ...pick, id: `c_${Date.now()}`, owned: 1, inDeck: 0 });
  }, []);

  const tabs: { id: ArenaTab; label: string; icon: React.ReactNode }[] = [
    { id: 'collection', label: 'Cards', icon: <Layers size={16} /> },
    { id: 'deck', label: 'Deck', icon: <Shield size={16} /> },
    { id: 'arena', label: 'Arena', icon: <Trophy size={16} /> },
    { id: 'reveal', label: 'Open', icon: <Sparkles size={16} /> },
  ];

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Reveal Overlay */}
      {revealCard && <CardRevealAnimation card={revealCard} onDone={() => {
        setCards(prev => [...prev, revealCard]);
        setRevealCard(null);
      }} />}

      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => { haptic.light(); onBack(); }} className="h-9 w-9">
          <ArrowLeft size={18} />
        </Button>
        <div className="flex-1">
          <h1 className="text-base font-bold text-foreground flex items-center gap-2">
            <Layers size={18} className="text-orange-400" /> Card Arena
          </h1>
          <p className="text-[10px] text-muted-foreground">{cards.length} cards · {deck.cards.length}/{deck.maxSize} in deck</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => { haptic.light(); setTab(t.id); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors ${tab === t.id ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        <AnimatePresence mode="wait">
          {tab === 'collection' && (
            <motion.div key="collection" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* Filters */}
              <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
                {(['all', 'common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'] as const).map(r => (
                  <button
                    key={r}
                    onClick={() => setFilterRarity(r)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-medium whitespace-nowrap transition-colors ${filterRarity === r ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                  >
                    {r === 'all' ? 'All' : RARITY_CONFIG[r].label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
                {(['all', 'fire', 'water', 'earth', 'air', 'shadow', 'light'] as const).map(e => (
                  <button
                    key={e}
                    onClick={() => setFilterElement(e)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-medium whitespace-nowrap transition-colors ${filterElement === e ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                  >
                    {e === 'all' ? '🌀 All' : `${ELEMENT_ICONS[e]} ${e.charAt(0).toUpperCase() + e.slice(1)}`}
                  </button>
                ))}
              </div>
              {/* Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                {filteredCards.map(card => (
                  <CreatureCardDisplay
                    key={card.id}
                    card={card}
                    selected={selectedCard === card.id}
                    onTap={() => {
                      setSelectedCard(card.id === selectedCard ? null : card.id);
                    }}
                  />
                ))}
              </div>
              {filteredCards.length === 0 && (
                <div className="text-center py-12 text-muted-foreground text-sm">No cards match filters</div>
              )}
              {/* Selected card action */}
              {selectedCard && (
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="sticky bottom-0 mt-3 p-3 rounded-xl bg-card border border-border flex gap-2">
                  <Button size="sm" className="flex-1" onClick={() => addToDeck(selectedCard)} disabled={deck.cards.length >= deck.maxSize}>
                    <Plus size={14} /> Add to Deck
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => removeFromDeck(selectedCard)}>
                    <Minus size={14} /> Remove
                  </Button>
                </motion.div>
              )}
            </motion.div>
          )}

          {tab === 'deck' && (
            <motion.div key="deck" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-foreground">{deck.name}</h2>
                <Badge variant="outline">{deck.cards.length}/{deck.maxSize}</Badge>
              </div>
              {/* Deck power stats */}
              <Card className="mb-3">
                <CardContent className="p-3">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-lg font-bold text-red-400">{deckCards.reduce((s, c) => s + c.attack, 0)}</p>
                      <p className="text-[10px] text-muted-foreground">Total ATK</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-blue-400">{deckCards.reduce((s, c) => s + c.defense, 0)}</p>
                      <p className="text-[10px] text-muted-foreground">Total DEF</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-green-400">{deckCards.reduce((s, c) => s + c.health, 0)}</p>
                      <p className="text-[10px] text-muted-foreground">Total HP</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              {/* Deck cards */}
              {deckCards.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">Deck is empty — add cards from your collection</div>
              ) : (
                <div className="space-y-2">
                  {deckCards.map((card, i) => (
                    <motion.div
                      key={`${card.id}-${i}`}
                      layout
                      className="flex items-center gap-3 p-2.5 rounded-xl bg-card border border-border"
                    >
                      <span className="text-2xl">{card.art}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">{card.name}</p>
                        <div className="flex gap-2 text-[10px] text-muted-foreground">
                          <span style={{ color: RARITY_CONFIG[card.rarity].color }}>{RARITY_CONFIG[card.rarity].label}</span>
                          <span>{ELEMENT_ICONS[card.element]}</span>
                          <span>⚔{card.attack} 🛡{card.defense} ❤{card.health}</span>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeFromDeck(card.id)}>
                        <Minus size={14} />
                      </Button>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {tab === 'arena' && (
            <motion.div key="arena" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2"><Trophy size={16} className="text-yellow-400" /> Active Tournaments</h2>
              <div className="space-y-2.5">
                {SAMPLE_TOURNAMENTS.map(t => {
                  const rc = RARITY_CONFIG[t.tier];
                  const full = t.participants >= t.maxParticipants;
                  const hoursLeft = Math.max(0, Math.floor((t.endsAt - Date.now()) / 3600000));
                  return (
                    <Card key={t.id} className="overflow-hidden">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="text-sm font-bold text-foreground">{t.name}</p>
                            <p className="text-[10px]" style={{ color: rc.color }}>{rc.label} Tier</p>
                          </div>
                          <Badge variant={t.status === 'open' ? 'default' : 'secondary'} className="text-[10px]">
                            {t.status === 'open' ? 'Open' : t.status === 'in_progress' ? 'Live' : 'Ended'}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center mb-3">
                          <div className="p-1.5 rounded bg-muted">
                            <p className="text-xs font-bold text-foreground">{t.entryFee}</p>
                            <p className="text-[9px] text-muted-foreground">Entry Fee</p>
                          </div>
                          <div className="p-1.5 rounded bg-muted">
                            <p className="text-xs font-bold text-yellow-400">{t.prizePool}</p>
                            <p className="text-[9px] text-muted-foreground">Prize</p>
                          </div>
                          <div className="p-1.5 rounded bg-muted">
                            <p className="text-xs font-bold text-foreground">{t.participants}/{t.maxParticipants}</p>
                            <p className="text-[9px] text-muted-foreground">Players</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground">{hoursLeft}h remaining</span>
                          <Button size="sm" disabled={full || t.status !== 'open' || deck.cards.length < 5} onClick={() => haptic.medium()} className="h-8 text-xs">
                            {full ? <><Lock size={12} /> Full</> : <><Swords size={12} /> Enter</>}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Quick Match */}
              <div className="mt-4 p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 text-center">
                <Crown size={28} className="text-primary mx-auto mb-2" />
                <p className="text-sm font-bold text-foreground">Quick Match</p>
                <p className="text-[10px] text-muted-foreground mb-3">Battle a random opponent with your current deck</p>
                <Button size="sm" disabled={deck.cards.length < 5} onClick={() => haptic.heavy()}>
                  <Swords size={14} /> Find Opponent
                </Button>
                {deck.cards.length < 5 && <p className="text-[10px] text-destructive mt-2">Need at least 5 cards in deck</p>}
              </div>
            </motion.div>
          )}

          {tab === 'reveal' && (
            <motion.div key="reveal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center">
              <div className="py-8">
                <motion.div
                  animate={{ rotateY: [0, 360] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                  className="inline-block text-6xl mb-4"
                >
                  🃏
                </motion.div>
                <h2 className="text-lg font-bold text-foreground mb-1">Card Packs</h2>
                <p className="text-xs text-muted-foreground mb-6">Open packs to discover new creatures</p>
              </div>

              <div className="space-y-3">
                {/* Standard Pack */}
                <Card className="text-left">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="text-3xl">📦</div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-foreground">Standard Pack</p>
                      <p className="text-[10px] text-muted-foreground">1 card · Guaranteed Uncommon+</p>
                    </div>
                    <Button size="sm" onClick={simulateReveal}>
                      <Star size={14} /> 500
                    </Button>
                  </CardContent>
                </Card>

                {/* Premium Pack */}
                <Card className="text-left border-yellow-500/30">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="text-3xl">🎁</div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-foreground">Premium Pack</p>
                      <p className="text-[10px] text-muted-foreground">1 card · Guaranteed Rare+</p>
                    </div>
                    <Button size="sm" className="bg-yellow-600 hover:bg-yellow-700" onClick={simulateReveal}>
                      <Crown size={14} /> 2,000
                    </Button>
                  </CardContent>
                </Card>

                {/* Mythic Pack */}
                <Card className="text-left border-pink-500/30">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="text-3xl">💎</div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-foreground">Mythic Pack</p>
                      <p className="text-[10px] text-muted-foreground">1 card · Guaranteed Epic+ · Mythic chance</p>
                    </div>
                    <Button size="sm" className="bg-pink-600 hover:bg-pink-700" onClick={simulateReveal}>
                      <Sparkles size={14} /> 5,000
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
