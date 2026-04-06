import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { haptic, telegramConfirm } from '@/lib/telegram';
import AnimatedCanvas from '@/components/backgrounds/AnimatedCanvas';
import {
  createCreature, breedCreatures, creatureToCard, SPECIES_META, RARITY_CONFIG,
  type Creature, type CreatureSpecies, type CreatureRarity
} from '@/game/creatureSystem';
import {
  ArrowLeft, Plus, Heart, Dna, Crown, Scroll, Star, Shield,
  Swords, Brain, Zap, Eye, Sparkles, Award
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const STORAGE_KEY = 'creature_lab_roster';

function loadRoster(): Creature[] {
  try { const s = localStorage.getItem(STORAGE_KEY); return s ? JSON.parse(s) : []; }
  catch { return []; }
}
function saveRoster(r: Creature[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(r)); }

function StatBar({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  const color = value >= 80 ? 'bg-amber-400' : value >= 50 ? 'bg-primary' : 'bg-muted-foreground';
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-[9px] text-muted-foreground w-12 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-muted/40 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-[9px] font-mono text-foreground w-6 text-right">{value}</span>
    </div>
  );
}

interface CreatureLabProps {
  onBack: () => void;
}

export default function CreatureLab({ onBack }: CreatureLabProps) {
  const [roster, setRoster] = useState<Creature[]>(loadRoster);
  const [selected, setSelected] = useState<Creature | null>(null);
  const [breedA, setBreedA] = useState<Creature | null>(null);
  const [breedB, setBreedB] = useState<Creature | null>(null);
  const [mode, setMode] = useState<'roster' | 'create' | 'detail' | 'breed' | 'legacy'>('roster');
  const [newName, setNewName] = useState('');
  const [newSpecies, setNewSpecies] = useState<CreatureSpecies>('dragon');

  const updateRoster = useCallback((r: Creature[]) => { setRoster(r); saveRoster(r); }, []);

  const handleCreate = () => {
    if (!newName.trim()) { toast.error('Give your creature a name'); return; }
    haptic.heavy();
    const c = createCreature(newSpecies, newName.trim());
    updateRoster([c, ...roster]);
    setSelected(c);
    setMode('detail');
    setNewName('');
    haptic.success();
    toast.success(`${c.name} has been born! Rarity: ${RARITY_CONFIG[c.rarity].label}`);
  };

  const handleBreed = () => {
    if (!breedA || !breedB) return;
    if (breedA.id === breedB.id) { toast.error('Cannot breed with self'); return; }
    haptic.heavy();
    const result = breedCreatures(breedA, breedB);
    updateRoster([result.child, ...roster]);
    setSelected(result.child);
    setMode('detail');
    setBreedA(null);
    setBreedB(null);
    haptic.success();
    const mutMsg = result.newMutations.length > 0
      ? ` with ${result.newMutations.length} new mutation(s)!`
      : '!';
    toast.success(`${result.child.name} has been bred${mutMsg} Rarity: ${RARITY_CONFIG[result.child.rarity].label}`);

    // Auto-generate matching card in Card Arena collection
    try {
      const cardDef = creatureToCard(result.child);
      const CARD_STORAGE = 'card_arena_state';
      const raw = localStorage.getItem(CARD_STORAGE);
      const cardState = raw ? JSON.parse(raw) : { ownedCards: [], dust: 200, gems: 50, eventTokens: 0, pityCounter: 0, seasonTier: 0, seasonXp: 0 };
      const alreadyOwned = cardState.ownedCards?.some((o: { cardId: string }) => o.cardId === cardDef.id);
      if (!alreadyOwned) {
        cardState.ownedCards = cardState.ownedCards || [];
        cardState.ownedCards.push({
          cardId: cardDef.id, copies: 1, foil: false, animated: false,
          firstObtained: Date.now(), source: 'battle',
        });
        const bredCards = JSON.parse(localStorage.getItem('bred_card_defs') || '[]');
        bredCards.push(cardDef);
        localStorage.setItem('bred_card_defs', JSON.stringify(bredCards));
        localStorage.setItem(CARD_STORAGE, JSON.stringify(cardState));
        toast.success(`🃏 Card "${cardDef.name}" added to your Card Arena collection!`);
      }
    } catch {}
  };

  const handleRetire = async (creature: Creature) => {
    haptic.warning();
    const ok = await telegramConfirm(
      `Retire ${creature.name} into Legacy status? This is IRREVERSIBLE. ${creature.name} will become a permanent Legacy NFT relic.`
    );
    if (!ok) return;
    haptic.heavy();
    const updated = roster.map(c =>
      c.id === creature.id ? {
        ...c,
        isRetired: true,
        retiredAt: Date.now(),
        biography: [...c.biography, `Retired with honor after a lifetime of service. Legacy preserved forever.`],
        legacyNftId: `legacy_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      } : c
    );
    updateRoster(updated);
    setSelected(updated.find(c => c.id === creature.id) ?? null);
    setMode('legacy');
    haptic.success();
    toast.success(`${creature.name} has entered Legacy status. Their story lives forever.`);
  };

  const activeCreatures = roster.filter(c => !c.isRetired);
  const legacyCreatures = roster.filter(c => c.isRetired);

  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden">
      <AnimatedCanvas theme="jade_zen" className="opacity-20" />

      {/* Header */}
      <div className="shrink-0 px-4 pt-3 pb-2 border-b border-border/30 flex items-center gap-3 relative z-10">
        <button onClick={() => mode === 'roster' ? onBack() : setMode('roster')}
          className="p-2 -ml-2 min-h-[44px] min-w-[44px] flex items-center justify-center">
          <ArrowLeft size={18} className="text-foreground" />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-bold text-foreground flex items-center gap-2">
            🐉 Creature Lab
          </h1>
          <p className="text-[10px] text-muted-foreground">
            {mode === 'roster' ? `${activeCreatures.length} active · ${legacyCreatures.length} legacy` :
             mode === 'create' ? 'Summon a new creature' :
             mode === 'breed' ? 'Select two creatures to breed' :
             mode === 'legacy' ? 'Legacy Ceremony' : selected?.name}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 relative z-10">
        <AnimatePresence mode="wait">
          {/* ── ROSTER VIEW ── */}
          {mode === 'roster' && (
            <motion.div key="roster" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              <div className="flex gap-2">
                <Button size="sm" className="flex-1 min-h-[44px]" onClick={() => setMode('create')}>
                  <Plus size={14} className="mr-1" /> Create
                </Button>
                <Button size="sm" variant="outline" className="flex-1 min-h-[44px]"
                  onClick={() => setMode('breed')} disabled={activeCreatures.length < 2}>
                  <Dna size={14} className="mr-1" /> Breed
                </Button>
              </div>

              {activeCreatures.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No creatures yet. Create your first companion!
                </div>
              )}

              {activeCreatures.map(c => (
                <motion.button key={c.id} layout
                  onClick={() => { haptic.selection(); setSelected(c); setMode('detail'); }}
                  className="w-full text-left rounded-xl border border-border/30 bg-card/60 p-3 active:scale-[0.98] transition-transform"
                  style={{ boxShadow: RARITY_CONFIG[c.rarity].glow }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{SPECIES_META[c.species].icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">{c.name}</p>
                      <p className="text-[9px] text-muted-foreground">Lv.{c.level} · Gen {c.lineage.generation} · {c.mutations.length} mutation(s)</p>
                    </div>
                    <span className="text-[9px] px-2 py-0.5 rounded-full font-bold"
                      style={{ color: RARITY_CONFIG[c.rarity].color, borderColor: RARITY_CONFIG[c.rarity].color, border: '1px solid' }}>
                      {RARITY_CONFIG[c.rarity].label}
                    </span>
                  </div>
                </motion.button>
              ))}

              {legacyCreatures.length > 0 && (
                <>
                  <p className="text-[11px] font-semibold text-foreground pt-2 flex items-center gap-1">
                    <Crown size={12} className="text-amber-400" /> Legacy Hall ({legacyCreatures.length})
                  </p>
                  {legacyCreatures.map(c => (
                    <button key={c.id}
                      onClick={() => { setSelected(c); setMode('detail'); }}
                      className="w-full text-left rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 opacity-80"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl grayscale-[30%]">{SPECIES_META[c.species].icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-foreground truncate">{c.name} <span className="text-amber-400">★</span></p>
                          <p className="text-[9px] text-muted-foreground">Legacy NFT · {c.legacyNftId?.slice(0, 16)}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </>
              )}
            </motion.div>
          )}

          {/* ── CREATE VIEW ── */}
          {mode === 'create' && (
            <motion.div key="create" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div>
                <p className="text-[11px] font-semibold text-foreground mb-2">Name Your Creature</p>
                <input
                  type="text" maxLength={24} value={newName} onChange={e => setNewName(e.target.value)}
                  placeholder="Enter a name..."
                  className="w-full rounded-lg bg-muted/30 border border-border/30 px-3 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 min-h-[44px]"
                />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-foreground mb-2">Choose Species</p>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(SPECIES_META) as CreatureSpecies[]).map(sp => (
                    <button key={sp} onClick={() => { haptic.selection(); setNewSpecies(sp); }}
                      className={`flex items-center gap-2 p-3 rounded-xl border min-h-[56px] transition-all ${
                        newSpecies === sp ? 'border-primary bg-primary/10' : 'border-border/30 bg-muted/20'
                      }`}>
                      <span className="text-xl">{SPECIES_META[sp].icon}</span>
                      <div className="text-left">
                        <p className="text-[11px] font-semibold text-foreground">{SPECIES_META[sp].label}</p>
                        <p className="text-[8px] text-muted-foreground">{SPECIES_META[sp].description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <Button className="w-full min-h-[48px]" onClick={handleCreate} disabled={!newName.trim()}>
                <Sparkles size={16} className="mr-2" /> Summon Creature
              </Button>
            </motion.div>
          )}

          {/* ── DETAIL VIEW ── */}
          {mode === 'detail' && selected && (
            <motion.div key="detail" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
              {/* Header card */}
              <div className="rounded-xl border border-border/30 bg-card/60 p-4 text-center"
                style={{ boxShadow: RARITY_CONFIG[selected.rarity].glow }}>
                <span className="text-5xl block mb-2">{SPECIES_META[selected.species].icon}</span>
                <p className="text-lg font-bold text-foreground">{selected.name}</p>
                <span className="text-[10px] px-3 py-0.5 rounded-full font-bold mt-1 inline-block"
                  style={{ color: RARITY_CONFIG[selected.rarity].color, border: `1px solid ${RARITY_CONFIG[selected.rarity].color}` }}>
                  {RARITY_CONFIG[selected.rarity].label} · Gen {selected.lineage.generation}
                </span>
                {selected.isRetired && (
                  <p className="text-amber-400 text-[10px] mt-2 flex items-center justify-center gap-1">
                    <Crown size={12} /> Legacy Status · NFT: {selected.legacyNftId?.slice(0, 12)}...
                  </p>
                )}
              </div>

              {/* Colors */}
              <div className="rounded-xl border border-border/30 bg-card/60 p-3">
                <p className="text-[10px] font-semibold text-foreground mb-2 flex items-center gap-1"><Eye size={12} /> Colors</p>
                <div className="flex gap-2">
                  {[
                    { label: 'Primary', color: selected.colors.primary },
                    { label: 'Secondary', color: selected.colors.secondary },
                    { label: 'Accent', color: selected.colors.accent },
                    { label: 'Eyes', color: selected.colors.eyeColor },
                  ].map(c => (
                    <div key={c.label} className="flex flex-col items-center gap-1">
                      <div className="w-8 h-8 rounded-full border border-border/30" style={{ background: c.color }} />
                      <span className="text-[7px] text-muted-foreground">{c.label}</span>
                    </div>
                  ))}
                  <div className="flex flex-col items-center gap-1 ml-2">
                    <div className="w-8 h-8 rounded-full border border-border/30 bg-muted/30 flex items-center justify-center text-[8px] text-foreground">
                      {selected.colors.pattern.slice(0, 3)}
                    </div>
                    <span className="text-[7px] text-muted-foreground">Pattern</span>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="rounded-xl border border-border/30 bg-card/60 p-3 space-y-1.5">
                <p className="text-[10px] font-semibold text-foreground mb-1">Stats</p>
                <StatBar label="STR" value={selected.stats.strength} icon={<Swords size={10} />} />
                <StatBar label="AGI" value={selected.stats.agility} icon={<Zap size={10} />} />
                <StatBar label="INT" value={selected.stats.intelligence} icon={<Brain size={10} />} />
                <StatBar label="END" value={selected.stats.endurance} icon={<Shield size={10} />} />
                <StatBar label="CHA" value={selected.stats.charisma} icon={<Heart size={10} />} />
                <StatBar label="LCK" value={selected.stats.luck} icon={<Star size={10} />} />
              </div>

              {/* Mutations */}
              {selected.mutations.length > 0 && (
                <div className="rounded-xl border border-border/30 bg-card/60 p-3">
                  <p className="text-[10px] font-semibold text-foreground mb-2 flex items-center gap-1"><Dna size={12} /> Mutations</p>
                  {selected.mutations.map(m => (
                    <div key={m.id} className="flex items-center gap-2 py-1">
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-bold"
                        style={{ color: RARITY_CONFIG[m.rarity].color, border: `1px solid ${RARITY_CONFIG[m.rarity].color}` }}>
                        {m.rarity.slice(0, 1).toUpperCase()}
                      </span>
                      <div>
                        <p className="text-[10px] font-medium text-foreground">{m.name}</p>
                        <p className="text-[8px] text-muted-foreground">{m.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Biography */}
              <div className="rounded-xl border border-border/30 bg-card/60 p-3">
                <p className="text-[10px] font-semibold text-foreground mb-1 flex items-center gap-1"><Scroll size={12} /> Biography</p>
                {selected.biography.map((entry, i) => (
                  <p key={i} className="text-[9px] text-muted-foreground leading-relaxed">• {entry}</p>
                ))}
              </div>

              {/* Actions */}
              {!selected.isRetired && (
                <Button variant="destructive" size="sm" className="w-full min-h-[44px]" onClick={() => handleRetire(selected)}>
                  <Crown size={14} className="mr-2" /> Retire to Legacy
                </Button>
              )}
            </motion.div>
          )}

          {/* ── BREED VIEW ── */}
          {mode === 'breed' && (
            <motion.div key="breed" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
              <p className="text-[11px] text-foreground font-semibold">Select Parent A</p>
              <div className="grid grid-cols-2 gap-2">
                {activeCreatures.map(c => (
                  <button key={c.id}
                    onClick={() => { haptic.selection(); setBreedA(c); }}
                    className={`p-2 rounded-xl border min-h-[56px] text-left ${
                      breedA?.id === c.id ? 'border-primary bg-primary/10' : 'border-border/30 bg-muted/20'
                    }`}>
                    <span className="text-lg">{SPECIES_META[c.species].icon}</span>
                    <p className="text-[9px] font-semibold text-foreground truncate">{c.name}</p>
                  </button>
                ))}
              </div>

              <p className="text-[11px] text-foreground font-semibold">Select Parent B</p>
              <div className="grid grid-cols-2 gap-2">
                {activeCreatures.filter(c => c.id !== breedA?.id).map(c => (
                  <button key={c.id}
                    onClick={() => { haptic.selection(); setBreedB(c); }}
                    className={`p-2 rounded-xl border min-h-[56px] text-left ${
                      breedB?.id === c.id ? 'border-primary bg-primary/10' : 'border-border/30 bg-muted/20'
                    }`}>
                    <span className="text-lg">{SPECIES_META[c.species].icon}</span>
                    <p className="text-[9px] font-semibold text-foreground truncate">{c.name}</p>
                  </button>
                ))}
              </div>

              <Button className="w-full min-h-[48px]" onClick={handleBreed} disabled={!breedA || !breedB}>
                <Dna size={16} className="mr-2" /> Breed Creatures
              </Button>

              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                <p className="text-[9px] text-amber-300/70 leading-relaxed">
                  ⚠️ Breeding combines stats, colors, and mutations from both parents. New mutations may appear. Results are unique and irreversible.
                </p>
              </div>
            </motion.div>
          )}

          {/* ── LEGACY CEREMONY ── */}
          {mode === 'legacy' && selected?.isRetired && (
            <motion.div key="legacy" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4 text-center py-4">
              <motion.div
                animate={{ scale: [1, 1.1, 1], opacity: [0.8, 1, 0.8] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="text-6xl"
              >
                {SPECIES_META[selected.species].icon}
              </motion.div>
              <div>
                <p className="text-lg font-bold text-amber-400">{selected.name}</p>
                <p className="text-sm text-foreground/70">has entered the Legacy Hall</p>
              </div>
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-left">
                <p className="text-xs font-semibold text-amber-300 mb-2 flex items-center gap-1"><Award size={14} /> Legacy NFT Minted</p>
                <p className="text-[9px] text-muted-foreground">ID: {selected.legacyNftId}</p>
                <p className="text-[9px] text-muted-foreground">Species: {SPECIES_META[selected.species].label}</p>
                <p className="text-[9px] text-muted-foreground">Rarity: {RARITY_CONFIG[selected.rarity].label}</p>
                <p className="text-[9px] text-muted-foreground">Generation: {selected.lineage.generation}</p>
                <p className="text-[9px] text-muted-foreground">Mutations: {selected.mutations.length}</p>
                <p className="text-[9px] text-muted-foreground">Biography entries: {selected.biography.length}</p>
                <p className="text-[9px] text-muted-foreground mt-2 italic">
                  "{selected.biography[selected.biography.length - 1]}"
                </p>
              </div>
              <p className="text-[8px] text-muted-foreground/50">
                This Legacy NFT captures the full biography, stats, lineage, mutations, and achievements as an immutable relic.
              </p>
              <Button variant="outline" className="min-h-[44px]" onClick={() => setMode('roster')}>
                Return to Roster
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
