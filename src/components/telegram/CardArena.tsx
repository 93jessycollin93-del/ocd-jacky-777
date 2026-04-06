import { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { haptic } from '@/lib/telegram';
import { toast } from 'sonner';
import {
  ArrowLeft, Layers, Swords, Trophy, Star, Sparkles, Crown,
  Shield, Zap, Heart, Plus, Minus, ChevronRight, BookOpen,
  Gift, Archive, Flame, Droplets, Diamond,
} from 'lucide-react';
import { useGame } from '@/game/GameContext';
import {
  type CardDef, type CardRarity, type CardElement, type Lane, type BattleUnit, type BattleState, type BoardState,
  BALANCE_CONSTANT,
  comboMultiplier, comboEffect,
  boardScore, lanePower, createBattleState, applyDamage, resolveClash,
  tickStatuses, drawCards, roundWinner,
} from '@/game/cardEngine';
import { STARTER_CARDS, buildFactionDeck, FACTIONS, FACTION_ICONS } from '@/game/cardData';
import {
  type OwnedCard, type CollectionState, type PackResult,
  DUST_VALUES, DROP_RATES, PREMIUM_DROP_RATES, PITY_THRESHOLDS,
  CODEX_MILESTONES, CARD_SETS, SEASON_PASS, DESIGN_RULES, YEAR_ONE_ROADMAP,
  openPack, craftCost, disenchantValue, collectionProgress, checkMilestone,
  calculateBattleRewards,
} from '@/game/cardEconomy';

// ── UI Constants ──
type ArenaTab = 'collection' | 'codex' | 'battle' | 'tournament' | 'packs' | 'craft' | 'economy';

// ── Tournament ──
interface TournamentMatch {
  round: number;
  enemyFaction: string;
  difficulty: number;
  prize: { dust: number; gems: number; label: string };
  status: 'upcoming' | 'won' | 'lost' | 'active';
}

function generateTournamentBracket(playerFaction: string): TournamentMatch[] {
  const enemies = FACTIONS.filter(f => f !== playerFaction);
  const shuffled = [...enemies].sort(() => Math.random() - 0.5);
  // 3 rounds, last round is random repeat
  const foes = [shuffled[0], shuffled[1], shuffled[Math.floor(Math.random() * 2)]];
  return [
    { round: 1, enemyFaction: foes[0], difficulty: 1, prize: { dust: 30, gems: 10, label: '30 Dust + 3 💎' }, status: 'upcoming' },
    { round: 2, enemyFaction: foes[1], difficulty: 2, prize: { dust: 75, gems: 25, label: '75 Dust + 8 💎 + Card Chance' }, status: 'upcoming' },
    { round: 3, enemyFaction: foes[2], difficulty: 3, prize: { dust: 150, gems: 50, label: '150 Dust + 15 💎 + 🏆 35 💎 Champion Bonus' }, status: 'upcoming' },
  ];
}

// ── Bred card loading ──
function loadBredCards(): CardDef[] {
  try {
    const raw = localStorage.getItem('bred_card_defs');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

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

const TYPE_ICONS: Record<string, string> = { unit: '⚔', spell: '✦', relic: '◆' };

// ── Persistent State ──
const STORAGE_KEY = 'card_arena_state';

function loadState(): CollectionState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  // New player starter: give all common cards + some dust
  const starterCards: OwnedCard[] = STARTER_CARDS
    .filter(c => c.rarity === 'common')
    .map(c => ({ cardId: c.id, copies: 1, foil: false, animated: false, firstObtained: Date.now(), source: 'gift' as const }));

  return {
    ownedCards: starterCards,
    dust: 200,
    gems: 50,
    eventTokens: 0,
    archiveKeys: 0,
    pityCounters: {},
    totalPacks: 0,
    codexMilestones: [],
    wishlist: [],
    displayCards: [],
    seasonPassTier: 0,
    seasonPassPremium: false,
  };
}

function saveState(state: CollectionState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// ── Mini Card Display ──
function MiniCard({ card, owned, compact, onTap, selected, showBudget }: {
  card: CardDef; owned?: boolean; compact?: boolean; onTap?: () => void; selected?: boolean; showBudget?: boolean;
}) {
  const rc = RARITY_CONFIG[card.rarity];
  return (
    <motion.div whileTap={{ scale: 0.95 }} onClick={() => { haptic.light(); onTap?.(); }}
      className={`relative rounded-xl overflow-hidden cursor-pointer transition-all ${selected ? 'ring-2 ring-primary' : ''} ${!owned ? 'opacity-40 grayscale' : ''}`}
      style={{ background: rc.bg, boxShadow: selected ? rc.glow : 'none' }}>
      <div className="p-2.5">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: rc.color }}>{rc.label}</span>
          <span className="text-xs">{ELEMENT_ICONS[card.element]}</span>
        </div>
        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary/80 flex items-center justify-center">
          <span className="text-[9px] font-black text-primary-foreground">{card.cost}</span>
        </div>
        <div className="text-center text-3xl my-1.5">{card.art}</div>
        <p className="text-[10px] font-bold text-foreground truncate text-center">{card.name}</p>
        {!compact && card.type === 'unit' && (
          <div className="flex justify-center gap-2 mt-1 text-[9px]">
            <span className="text-red-400">{card.power}P</span>
            <span className="text-blue-400">{card.guard}G</span>
          </div>
        )}
        {!compact && (
          <div className="mt-1.5 p-1 rounded bg-black/30 border border-white/5">
            <p className="text-[9px] font-semibold text-foreground">{card.ability}</p>
            <p className="text-[8px] text-muted-foreground">{card.abilityDesc}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Board Unit ──
function BoardUnit({ unit, isEnemy, onTap, selected }: { unit: BattleUnit; isEnemy?: boolean; onTap?: () => void; selected?: boolean }) {
  const rc = RARITY_CONFIG[unit.def.rarity];
  const statuses = unit.statuses.map(s => ({ burn: '🔥', frost: '❄️', poison: '☠️', shield: '🛡️', bleed: '🩸' }[s.type] || '')).join('');
  return (
    <motion.div whileTap={{ scale: 0.9 }} onClick={() => { haptic.light(); onTap?.(); }}
      className={`p-1 rounded-lg cursor-pointer min-w-[56px] text-center ${selected ? 'ring-2 ring-yellow-400' : ''} ${isEnemy ? 'border border-red-500/30' : 'border border-green-500/30'}`}
      style={{ background: rc.bg }}>
      <span className="text-lg">{unit.def.art}</span>
      <div className="flex items-center justify-center gap-1 text-[8px]">
        <span className="text-red-400 font-bold">{unit.currentPower}</span>
        <span className="text-blue-400 font-bold">{unit.currentGuard}</span>
      </div>
      {statuses && <p className="text-[7px]">{statuses}</p>}
    </motion.div>
  );
}

// ── Lane Row ──
function LaneRow({ label, playerUnits, enemyUnits, onPlayerUnitTap, onEnemyUnitTap, selectedPlayer, selectedEnemy }: {
  label: string; playerUnits: BattleUnit[]; enemyUnits: BattleUnit[];
  onPlayerUnitTap?: (i: number) => void; onEnemyUnitTap?: (i: number) => void;
  selectedPlayer?: number; selectedEnemy?: number;
}) {
  return (
    <div className="flex items-center gap-1 mb-1">
      <span className="text-[7px] text-muted-foreground w-6 text-right shrink-0">{label}</span>
      <div className="flex-1 flex gap-1 justify-end min-h-[44px] items-center">
        {enemyUnits.map((u, i) => <BoardUnit key={u.instanceId} unit={u} isEnemy selected={selectedEnemy === i} onTap={() => onEnemyUnitTap?.(i)} />)}
        {enemyUnits.length === 0 && <div className="w-10 h-10 rounded border border-dashed border-red-500/10" />}
      </div>
      <div className="w-px h-8 bg-border mx-0.5" />
      <div className="flex-1 flex gap-1 min-h-[44px] items-center">
        {playerUnits.map((u, i) => <BoardUnit key={u.instanceId} unit={u} selected={selectedPlayer === i} onTap={() => onPlayerUnitTap?.(i)} />)}
        {playerUnits.length === 0 && <div className="w-10 h-10 rounded border border-dashed border-green-500/10" />}
      </div>
    </div>
  );
}

// ── Battle Screen ──
function BattleScreen({ playerFaction, onExit, onRewards, forcedEnemy, difficulty = 1 }: {
  playerFaction: string; onExit: () => void; onRewards: (won: boolean, rounds: number, enemyFaction: string) => void;
  forcedEnemy?: string; difficulty?: number;
}) {
  const enemyFaction = useMemo(() => {
    if (forcedEnemy) return forcedEnemy;
    const others = FACTIONS.filter(f => f !== playerFaction);
    return others[Math.floor(Math.random() * others.length)];
  }, [playerFaction, forcedEnemy]);

  const [battle, setBattle] = useState<BattleState>(() =>
    createBattleState(buildFactionDeck(playerFaction), buildFactionDeck(enemyFaction))
  );
  const [selectedHandIdx, setSelectedHandIdx] = useState<number | null>(null);
  const [selectedPlayerUnit, setSelectedPlayerUnit] = useState<{ lane: Lane; idx: number } | null>(null);
  const [selectedEnemyUnit, setSelectedEnemyUnit] = useState<{ lane: Lane; idx: number } | null>(null);
  const [roundScores, setRoundScores] = useState<{ player: number; enemy: number }>({ player: 0, enemy: 0 });
  const [battleLog, setBattleLog] = useState<string[]>(['⚔ Battle begins!']);
  const [gameEnded, setGameEnded] = useState(false);

  const addLog = (msg: string) => setBattleLog(prev => [...prev.slice(-30), msg]);
  const pScore = boardScore(battle.player.board);
  const eScore = boardScore(battle.enemy.board);

  const playCard = useCallback((handIdx: number, lane: Lane) => {
    setBattle(prev => {
      const card = prev.player.hand[handIdx];
      if (!card || card.cost > prev.player.energy) return prev;
      const newHand = [...prev.player.hand]; newHand.splice(handIdx, 1);
      const newEnergy = prev.player.energy - card.cost;
      const played = prev.player.cardsPlayedThisTurn + 1;

      if (card.type === 'unit') {
        const mult = comboMultiplier(played - 1);
        const unit: BattleUnit = {
          instanceId: `p_${Date.now()}_${Math.random()}`, def: card,
          currentPower: Math.round(card.power * mult), currentGuard: card.guard,
          statuses: [], comboCount: played - 1, lane,
        };
        if (played > 1) addLog(`${card.name} combo ×${mult.toFixed(2)} → ${unit.currentPower}P`);
        else addLog(`${card.name} → ${lane}`);

        // Ability: apply status effects on deploy
        const newEnemyBoard = { ...prev.enemy.board };
        if (card.keywords?.includes('frost')) {
          const targetLane = newEnemyBoard[lane];
          if (targetLane.length > 0) {
            const target = targetLane[0];
            target.statuses.push({ type: 'frost', stacks: 1, turnsLeft: 2 });
            addLog(`→ ${target.def.name} frosted!`);
          }
        }

        const newBoard = { ...prev.player.board }; newBoard[lane] = [...newBoard[lane], unit];
        return { ...prev, player: { ...prev.player, hand: newHand, energy: newEnergy, board: newBoard, cardsPlayedThisTurn: played }, enemy: { ...prev.enemy, board: newEnemyBoard } };
      }

      if (card.type === 'spell') {
        addLog(`${card.name} cast!`);
        const allEnemy = [...prev.enemy.board.front, ...prev.enemy.board.mid, ...prev.enemy.board.back];
        const newEnemyBoard = { ...prev.enemy.board };

        if (card.keywords?.includes('aoe') || card.abilityDesc.toLowerCase().includes('all')) {
          // AoE damage
          const dmg = Math.max(1, Math.round(card.abilityValue * 0.3));
          for (const u of allEnemy) { applyDamage(u, dmg); }
          addLog(`→ All enemies take ${dmg}`);
        } else if (allEnemy.length > 0) {
          const target = allEnemy.reduce((b, u) => u.currentPower > b.currentPower ? u : b);
          const dmg = Math.round(card.abilityValue * 0.6);
          applyDamage(target, dmg);
          addLog(`→ ${target.def.name} takes ${dmg}`);
          // Apply burn if mentioned
          if (card.abilityDesc.toLowerCase().includes('burn')) {
            target.statuses.push({ type: 'burn', stacks: 2, turnsLeft: 3 });
            addLog(`→ ${target.def.name} burning!`);
          }
          // Apply bleed if mentioned
          if (card.abilityDesc.toLowerCase().includes('bleed')) {
            target.statuses.push({ type: 'bleed', stacks: 3, turnsLeft: 3 });
          }
        }

        // Draw cards if ability says so
        if (card.keywords?.includes('draw') || card.abilityDesc.toLowerCase().includes('draw')) {
          const drawn = prev.player.deck.slice(0, 1);
          if (drawn.length) addLog(`→ Draw ${drawn[0].name}`);
          const newPlayerDeck = prev.player.deck.slice(1);
          const newPlayerHand = [...newHand, ...drawn];
          const cleanBoard = (b: BoardState): BoardState => ({
            front: b.front.filter(u => u.currentPower > 0),
            mid: b.mid.filter(u => u.currentPower > 0),
            back: b.back.filter(u => u.currentPower > 0),
          });
          return { ...prev, player: { ...prev.player, hand: newPlayerHand, deck: newPlayerDeck, energy: newEnergy, cardsPlayedThisTurn: played }, enemy: { ...prev.enemy, board: cleanBoard(newEnemyBoard) } };
        }

        const cleanBoard = (b: BoardState): BoardState => ({
          front: b.front.filter(u => u.currentPower > 0),
          mid: b.mid.filter(u => u.currentPower > 0),
          back: b.back.filter(u => u.currentPower > 0),
        });
        return { ...prev, player: { ...prev.player, hand: newHand, energy: newEnergy, cardsPlayedThisTurn: played }, enemy: { ...prev.enemy, board: cleanBoard(newEnemyBoard) } };
      }

      if (card.type === 'relic') {
        addLog(`${card.name} activated!`);
        const newBoard = { ...prev.player.board };
        // Generic relic: buff frontline
        newBoard.front = newBoard.front.map(u => ({ ...u, currentPower: u.currentPower + 1, currentGuard: u.currentGuard + 1 }));
        // Shield relic
        if (card.abilityDesc.toLowerCase().includes('shield')) {
          [...newBoard.front, ...newBoard.mid, ...newBoard.back].forEach(u => {
            if (!u.statuses.some(s => s.type === 'shield')) {
              u.statuses.push({ type: 'shield', stacks: 1, turnsLeft: 99 });
            }
          });
          addLog(`→ All allies shielded!`);
        }
        return { ...prev, player: { ...prev.player, hand: newHand, energy: newEnergy, board: newBoard, cardsPlayedThisTurn: played } };
      }
      return prev;
    });
    setSelectedHandIdx(null);
    haptic.medium();
  }, []);

  const initiateClash = useCallback(() => {
    if (!selectedPlayerUnit || !selectedEnemyUnit) return;
    setBattle(prev => {
      const attacker = prev.player.board[selectedPlayerUnit.lane][selectedPlayerUnit.idx];
      const defender = prev.enemy.board[selectedEnemyUnit.lane][selectedEnemyUnit.idx];
      if (!attacker || !defender) return prev;
      const result = resolveClash(attacker, defender);
      result.log.forEach(l => addLog(l));

      // Leech keyword
      if (attacker.def.keywords?.includes('leech') && !result.attackerDestroyed) {
        attacker.currentPower = Math.min(attacker.def.power + 3, attacker.currentPower + 1);
        addLog(`${attacker.def.name} leeches +1 Power`);
      }

      const clean = (units: BattleUnit[]) => units.filter(u => u.currentPower > 0);
      const np = { ...prev.player.board }; const ne = { ...prev.enemy.board };
      np[selectedPlayerUnit.lane] = clean(np[selectedPlayerUnit.lane]);
      ne[selectedEnemyUnit.lane] = clean(ne[selectedEnemyUnit.lane]);
      return { ...prev, player: { ...prev.player, board: np }, enemy: { ...prev.enemy, board: ne } };
    });
    setSelectedPlayerUnit(null); setSelectedEnemyUnit(null);
    haptic.heavy();
  }, [selectedPlayerUnit, selectedEnemyUnit]);

  const endTurn = useCallback(() => {
    setBattle(prev => {
      let s = { ...prev };
      addLog('── End turn ──');

      const tickBoard = (board: BoardState): BoardState => {
        const tick = (units: BattleUnit[]) => units.map(u => {
          const res = tickStatuses(u);
          if (res.damage > 0) applyDamage(u, res.damage);
          res.log.forEach(l => addLog(l));
          return u;
        }).filter(u => u.currentPower > 0);
        return { front: tick(board.front), mid: tick(board.mid), back: tick(board.back) };
      };

      s.player = { ...s.player, board: tickBoard(s.player.board) };

      // AI turn
      addLog('── Enemy ──');
      let aiE = s.enemy.energy; const aiH = [...s.enemy.hand]; const aiB = { ...s.enemy.board };
      let aiP = 0;
      const playable = aiH.filter(c => c.cost <= aiE).sort((a, b) => b.cost - a.cost);
      for (const card of playable) {
        if (card.cost > aiE) continue;
        if (card.type === 'unit') {
          const lane = card.lane || (['front', 'mid', 'back'] as Lane[])[Math.floor(Math.random() * 3)];
          aiP++;
          const unit: BattleUnit = {
            instanceId: `e_${Date.now()}_${Math.random()}`, def: card,
            currentPower: Math.round(card.power * comboMultiplier(aiP - 1)), currentGuard: card.guard,
            statuses: [], comboCount: aiP - 1, lane,
          };
          aiB[lane] = [...aiB[lane], unit]; aiE -= card.cost;
          const idx = aiH.findIndex(c => c.id === card.id); if (idx !== -1) aiH.splice(idx, 1);
          addLog(`Enemy: ${card.name} → ${lane}`);
        } else if (card.type === 'spell') {
          const targets = [...s.player.board.front, ...s.player.board.mid, ...s.player.board.back];
          if (targets.length > 0) {
            const t = targets.reduce((b, u) => u.currentPower > b.currentPower ? u : b);
            const dmg = Math.round(card.abilityValue * 0.5);
            applyDamage(t, dmg);
            addLog(`Enemy: ${card.name} → ${t.def.name} (${dmg})`);
          }
          aiE -= card.cost;
          const idx = aiH.findIndex(c => c.id === card.id); if (idx !== -1) aiH.splice(idx, 1);
        }
        if (aiE <= 0) break;
      }

      s.enemy = { ...s.enemy, hand: aiH, energy: aiE, board: aiB };
      s.player = { ...s.player, board: tickBoard(s.player.board) };
      s.enemy = { ...s.enemy, board: tickBoard(s.enemy.board) };

      const nextTurn = prev.turn + 1;
      const newMax = Math.min(10, Math.floor(nextTurn / 2) + 1);

      // Round check every 5 turns
      if (nextTurn % 6 === 0 || nextTurn > 15) {
        const w = roundWinner(s.player.board, s.enemy.board);
        addLog(`── Round ${prev.round}: ${w === 'draw' ? 'Draw' : w === 'player' ? 'You win!' : 'Enemy wins!'} ──`);
        const ns = { ...roundScores };
        if (w === 'player') ns.player++; else if (w === 'enemy') ns.enemy++;
        setRoundScores(ns);

        if (prev.round >= prev.maxRounds || ns.player >= 2 || ns.enemy >= 2) {
          const gw = ns.player > ns.enemy ? 'player' : ns.enemy > ns.player ? 'enemy' : null;
          addLog(`═══ ${gw === 'player' ? 'VICTORY!' : gw === 'enemy' ? 'DEFEAT' : 'DRAW'} ═══`);
          setGameEnded(true);
          onRewards(gw === 'player', prev.round, enemyFaction);
          return { ...s, turn: nextTurn, phase: 'game_over' as const, winner: gw, round: prev.round };
        }

        return {
          ...s, turn: nextTurn, round: prev.round + 1,
          player: { ...s.player, board: { front: [], mid: [], back: [] }, energy: newMax, maxEnergy: newMax, cardsPlayedThisTurn: 0 },
          enemy: { ...s.enemy, board: { front: [], mid: [], back: [] }, energy: newMax, maxEnergy: newMax },
        };
      }

      const pd = drawCards(s.player, 1); const ed = drawCards(s.enemy, 1);
      if (pd.drawn.length) addLog(`Draw: ${pd.drawn[0].name}`);

      return {
        ...s, turn: nextTurn,
        player: { ...pd.state, energy: newMax, maxEnergy: newMax, cardsPlayedThisTurn: 0 },
        enemy: { ...ed.state, energy: newMax, maxEnergy: newMax },
      };
    });
    haptic.medium();
  }, [roundScores, onRewards]);

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex items-center justify-between p-2 border-b border-border">
        <Button variant="ghost" size="sm" onClick={onExit} className="h-7 text-[10px]"><ArrowLeft size={12} /> Exit</Button>
        <div className="text-center">
          <p className="text-[9px] text-muted-foreground">Turn {battle.turn} · Rd {battle.round}/{battle.maxRounds}</p>
          <p className="text-xs font-bold"><span className="text-green-400">{roundScores.player}</span> — <span className="text-red-400">{roundScores.enemy}</span></p>
        </div>
        <p className="text-[10px] font-bold text-primary">{battle.player.energy}/{battle.player.maxEnergy}⚡</p>
      </div>

      <div className="flex items-center px-2 py-1 bg-muted/30 text-[9px]">
        <span className="flex-1 text-green-400 font-bold">You: {pScore}</span>
        <span className="text-muted-foreground">vs</span>
        <span className="flex-1 text-right text-red-400 font-bold">{FACTION_ICONS[enemyFaction]} {eScore}</span>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-1">
        {(['front', 'mid', 'back'] as Lane[]).map(lane => (
          <LaneRow key={lane} label={lane[0].toUpperCase()}
            playerUnits={battle.player.board[lane]} enemyUnits={battle.enemy.board[lane]}
            onPlayerUnitTap={i => setSelectedPlayerUnit(selectedPlayerUnit?.lane === lane && selectedPlayerUnit?.idx === i ? null : { lane, idx: i })}
            onEnemyUnitTap={i => setSelectedEnemyUnit(selectedEnemyUnit?.lane === lane && selectedEnemyUnit?.idx === i ? null : { lane, idx: i })}
            selectedPlayer={selectedPlayerUnit?.lane === lane ? selectedPlayerUnit.idx : undefined}
            selectedEnemy={selectedEnemyUnit?.lane === lane ? selectedEnemyUnit.idx : undefined} />
        ))}

        {selectedPlayerUnit && selectedEnemyUnit && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-center my-1">
            <Button size="sm" onClick={initiateClash} className="bg-red-600 hover:bg-red-700 text-[10px] h-7"><Swords size={12} /> Clash!</Button>
          </motion.div>
        )}

        {selectedHandIdx !== null && battle.player.hand[selectedHandIdx] && (
          <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex gap-2 justify-center my-1">
            {(['front', 'mid', 'back'] as Lane[]).map(l => (
              <Button key={l} size="sm" variant="outline" className="text-[9px] h-6" onClick={() => playCard(selectedHandIdx, l)}>→ {l}</Button>
            ))}
          </motion.div>
        )}

        <div className="mt-1 p-1.5 rounded bg-muted/20 border border-border max-h-16 overflow-y-auto">
          {battleLog.slice(-5).map((msg, i) => <p key={i} className="text-[8px] text-muted-foreground">{msg}</p>)}
        </div>
      </div>

      <div className="border-t border-border p-1.5">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[9px] text-muted-foreground">Hand ({battle.player.hand.length}) · Deck ({battle.player.deck.length})</span>
          {battle.phase !== 'game_over' ? (
            <Button size="sm" variant="outline" className="h-6 text-[9px]" onClick={endTurn}>End Turn <ChevronRight size={10} /></Button>
          ) : (
            <Button size="sm" className="h-6 text-[9px]" onClick={onExit}>{battle.winner === 'player' ? '🏆 Victory!' : '💀 Defeat'}</Button>
          )}
        </div>
        <div className="flex gap-1 overflow-x-auto pb-1">
          {battle.player.hand.map((card, i) => {
            const canPlay = card.cost <= battle.player.energy && battle.phase !== 'game_over';
            return (
              <motion.div key={`${card.id}-${i}`} whileTap={{ scale: 0.9 }}
                onClick={() => { if (!canPlay) return; haptic.light(); card.type !== 'unit' ? playCard(i, 'mid') : setSelectedHandIdx(selectedHandIdx === i ? null : i); }}
                className={`shrink-0 w-[64px] rounded-lg p-1 cursor-pointer ${selectedHandIdx === i ? 'ring-2 ring-primary -translate-y-1.5' : ''} ${!canPlay ? 'opacity-30' : ''}`}
                style={{ background: RARITY_CONFIG[card.rarity].bg }}>
                <div className="text-center">
                  <div className="text-[8px] font-bold text-primary">{card.cost}⚡</div>
                  <div className="text-lg">{card.art}</div>
                  <p className="text-[7px] font-bold text-foreground truncate">{card.name}</p>
                  {card.type === 'unit' && <p className="text-[7px] text-muted-foreground">{card.power}P {card.guard}G</p>}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Pack Reveal Animation ──
function PackReveal({ results, onDone }: { results: PackResult; onDone: () => void }) {
  const [revealIdx, setRevealIdx] = useState(0);
  const card = results.cards[revealIdx];
  const rc = RARITY_CONFIG[card.rarity];
  const isNew = results.isNewCard[revealIdx];

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-4" onClick={() => {
      if (revealIdx < results.cards.length - 1) { haptic.light(); setRevealIdx(revealIdx + 1); }
      else { haptic.medium(); onDone(); }
    }}>
      <p className="text-[10px] text-muted-foreground mb-2">{revealIdx + 1} / {results.cards.length}</p>
      <motion.div key={revealIdx} initial={{ rotateY: 180, scale: 0.5 }} animate={{ rotateY: 0, scale: 1 }}
        transition={{ duration: 0.6, type: 'spring' }} className="w-52" style={{ filter: isNew ? 'none' : 'brightness(0.7)' }}>
        <div className="rounded-2xl" style={{ boxShadow: rc.glow }}>
          <MiniCard card={card} owned />
        </div>
      </motion.div>
      {isNew && <motion.p initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-sm font-bold text-green-400 mt-3">✨ NEW!</motion.p>}
      {!isNew && <p className="text-[10px] text-muted-foreground mt-3">Duplicate · +{disenchantValue(card.rarity)} dust</p>}
      <p className="text-[9px] text-muted-foreground mt-4">Tap to {revealIdx < results.cards.length - 1 ? 'reveal next' : 'finish'}</p>
    </div>
  );
}

// ── Main Component ──
interface CardArenaProps { onBack: () => void; }

export default function CardArena({ onBack }: CardArenaProps) {
  const { setState: setGameState, addBattlePassXP } = useGame();
  const [tab, setTab] = useState<ArenaTab>('collection');
  const [state, setState] = useState<CollectionState>(loadState);
  const [filterRarity, setFilterRarity] = useState<CardRarity | 'all'>('all');
  const [filterFaction, setFilterFaction] = useState<string | 'all'>('all');
  const [deckFaction, setDeckFaction] = useState<string>('Ironclad');
  const [inBattle, setInBattle] = useState(false);
  const [packResults, setPackResults] = useState<PackResult | null>(null);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [tournament, setTournament] = useState<TournamentMatch[] | null>(null);
  const [tournamentRound, setTournamentRound] = useState(0);
  const [tournamentEnemy, setTournamentEnemy] = useState<string | null>(null);
  const [tournamentDifficulty, setTournamentDifficulty] = useState(1);
  const [lastRewardMsg, setLastRewardMsg] = useState<string | null>(null);

  // Load bred cards from Creature Lab
  const bredCards = useMemo(() => loadBredCards(), [state]);
  const allCards = useMemo(() => [...STARTER_CARDS, ...bredCards], [bredCards]);

  // Save on change
  useEffect(() => { saveState(state); }, [state]);

  const ownedIds = useMemo(() => new Set(state.ownedCards.map(o => o.cardId)), [state.ownedCards]);

  const filteredCards = useMemo(() =>
    allCards.filter(c => {
      if (filterRarity !== 'all' && c.rarity !== filterRarity) return false;
      if (filterFaction !== 'all' && c.faction !== filterFaction) return false;
      return true;
    }),
  [allCards, filterRarity, filterFaction]);

  const progress = collectionProgress(state.ownedCards, allCards.length);

  // Open pack
  const handleOpenPack = useCallback((packType: 'standard' | 'premium' | 'mythic') => {
    const pity = state.pityCounters[packType] || 0;
    const results = openPack(STARTER_CARDS, state.ownedCards, packType, pity);
    const newOwned = [...state.ownedCards];
    results.cards.forEach((card) => {
      const existing = newOwned.find(o => o.cardId === card.id);
      if (existing) { existing.copies++; }
      else { newOwned.push({ cardId: card.id, copies: 1, foil: false, animated: false, firstObtained: Date.now(), source: 'pack' }); }
    });
    setState(prev => ({
      ...prev, ownedCards: newOwned, dust: prev.dust + results.dust,
      pityCounters: { ...prev.pityCounters, [packType]: results.pityReset ? 0 : pity + 5 },
      totalPacks: prev.totalPacks + 1,
    }));
    setPackResults(results);
    haptic.heavy();
  }, [state]);

  // Craft card
  const handleCraft = useCallback((card: CardDef) => {
    const cost = craftCost(card.rarity, false, 1.0);
    if (state.dust < cost) return;
    const newOwned = [...state.ownedCards];
    const existing = newOwned.find(o => o.cardId === card.id);
    if (existing) { existing.copies++; }
    else { newOwned.push({ cardId: card.id, copies: 1, foil: false, animated: false, firstObtained: Date.now(), source: 'craft' }); }
    setState(prev => ({ ...prev, ownedCards: newOwned, dust: prev.dust - cost }));
    haptic.medium();
  }, [state]);

  // Disenchant
  const handleDisenchant = useCallback((cardId: string) => {
    const card = allCards.find(c => c.id === cardId);
    const owned = state.ownedCards.find(o => o.cardId === cardId);
    if (!card || !owned || owned.copies <= 1) return;
    owned.copies--;
    setState(prev => ({ ...prev, ownedCards: [...prev.ownedCards], dust: prev.dust + disenchantValue(card.rarity) }));
    haptic.light();
  }, [state, allCards]);

  // Diamond rewards based on difficulty: quick=1, round1=3, round2=8, round3=15, champion=50
  const DIAMOND_REWARDS = [0, 3, 8, 15]; // indexed by tournamentDifficulty (0=quick match)
  const CHAMPION_BONUS = 35;

  // Battle rewards with enemy faction card drops + diamonds
  const handleBattleRewards = useCallback((won: boolean, rounds: number, enemyFaction: string) => {
    const rewards = calculateBattleRewards(won, rounds, tournamentDifficulty);
    const msgs: string[] = [`+${rewards.dust} dust, +${rewards.xp} XP`];

    // Diamond calculation
    let diamondReward = 0;
    if (won) {
      diamondReward = tournament
        ? (DIAMOND_REWARDS[tournamentDifficulty] || 1)
        : 1; // Quick match = 1 diamond
    }

    if (diamondReward > 0) {
      msgs.push(`+${diamondReward} 💎`);
    }

    // Card drop from enemy faction
    let droppedCard: CardDef | null = null;
    if (Math.random() < rewards.cardChance) {
      const enemyPool = STARTER_CARDS.filter(c => c.faction === enemyFaction);
      if (enemyPool.length > 0) {
        droppedCard = enemyPool[Math.floor(Math.random() * enemyPool.length)];
        msgs.push(`🃏 Discovered: ${droppedCard.name}!`);
      }
    }

    setState(prev => {
      const newOwned = [...prev.ownedCards];
      if (droppedCard) {
        const existing = newOwned.find(o => o.cardId === droppedCard!.id);
        if (existing) existing.copies++;
        else newOwned.push({ cardId: droppedCard.id, copies: 1, foil: false, animated: false, firstObtained: Date.now(), source: 'battle' });
      }
      return {
        ...prev,
        ownedCards: newOwned,
        dust: prev.dust + rewards.dust,
        gems: prev.gems + (won ? Math.round(tournamentDifficulty * 5) : 0),
        seasonPassTier: prev.seasonPassTier + (won ? 1 : 0),
      };
    });

    // Grant diamonds to game state
    if (diamondReward > 0) {
      setGameState(prev => ({
        ...prev,
        resources: { ...prev.resources, diamonds: (prev.resources.diamonds || 0) + diamondReward },
      }));
    }

    // Grant battle pass XP
    if (won) {
      addBattlePassXP(rewards.xp || 25, `Card Arena ${tournament ? 'tournament' : 'quick match'}`);
    }

    setLastRewardMsg(msgs.join(' · '));

    // Update tournament state if in tournament
    if (tournament) {
      const isChampion = won && tournamentRound === 2;
      setTournament(prev => {
        if (!prev) return null;
        return prev.map((m, i) => {
          if (i === tournamentRound) return { ...m, status: won ? 'won' as const : 'lost' as const };
          if (i === tournamentRound + 1 && won) return { ...m, status: 'upcoming' as const };
          return m;
        });
      });
      if (won && tournamentRound < 2) {
        setTournamentRound(r => r + 1);
      }
      // Champion bonus
      if (isChampion) {
        setGameState(prev => ({
          ...prev,
          resources: { ...prev.resources, diamonds: (prev.resources.diamonds || 0) + CHAMPION_BONUS },
        }));
        addBattlePassXP(50, 'Tournament Champion');
        toast.success(`🏆 Tournament Champion! +${CHAMPION_BONUS} 💎 bonus!`);
      }
    }
  }, [tournament, tournamentRound, tournamentDifficulty, setGameState, addBattlePassXP]);

  // Start tournament battle
  const startTournamentBattle = useCallback((match: TournamentMatch) => {
    setTournamentEnemy(match.enemyFaction);
    setTournamentDifficulty(match.difficulty);
    setInBattle(true);
  }, []);

  if (inBattle) {
    return <BattleScreen
      playerFaction={deckFaction}
      onExit={() => { setInBattle(false); setTournamentEnemy(null); }}
      onRewards={handleBattleRewards}
      forcedEnemy={tournamentEnemy || undefined}
      difficulty={tournamentDifficulty}
    />;
  }

  const tabs: { id: ArenaTab; label: string; icon: React.ReactNode }[] = [
    { id: 'collection', label: 'Cards', icon: <Layers size={14} /> },
    { id: 'codex', label: 'Codex', icon: <BookOpen size={14} /> },
    { id: 'battle', label: 'Battle', icon: <Swords size={14} /> },
    { id: 'tournament', label: 'Tourney', icon: <Trophy size={14} /> },
    { id: 'packs', label: 'Packs', icon: <Gift size={14} /> },
    { id: 'craft', label: 'Craft', icon: <Flame size={14} /> },
    { id: 'economy', label: 'Info', icon: <Archive size={14} /> },
  ];

  return (
    <div className="flex flex-col h-full bg-background">
      {packResults && <PackReveal results={packResults} onDone={() => setPackResults(null)} />}

      {/* Header */}
      <div className="flex items-center gap-3 p-3 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => { haptic.light(); onBack(); }} className="h-8 w-8"><ArrowLeft size={16} /></Button>
        <div className="flex-1">
          <h1 className="text-sm font-bold text-foreground flex items-center gap-1.5"><Layers size={16} className="text-orange-400" /> Card Arena</h1>
          <p className="text-[9px] text-muted-foreground">{progress.owned}/{progress.total} cards · {state.dust} dust · {state.gems} gems</p>
        </div>
        <div className="text-right">
          <Progress value={progress.percent} className="w-16 h-1.5" />
          <p className="text-[8px] text-muted-foreground mt-0.5">{progress.percent}%</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border overflow-x-auto">
        {tabs.map(t => (
          <button key={t.id} onClick={() => { haptic.light(); setTab(t.id); }}
            className={`flex items-center justify-center gap-1 px-3 py-2.5 text-[10px] font-medium whitespace-nowrap ${tab === t.id ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        <AnimatePresence mode="wait">
          {/* ═══ COLLECTION ═══ */}
          {tab === 'collection' && (
            <motion.div key="col" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="flex gap-1.5 mb-2 overflow-x-auto pb-1">
                {(['all', ...FACTIONS] as const).map(f => (
                  <button key={f} onClick={() => setFilterFaction(f)}
                    className={`px-2 py-0.5 rounded-full text-[9px] font-medium whitespace-nowrap ${filterFaction === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                    {f === 'all' ? '🌀 All' : `${FACTION_ICONS[f]} ${f}`}
                  </button>
                ))}
              </div>
              <div className="flex gap-1.5 mb-2 overflow-x-auto pb-1">
                {(['all', 'common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'] as const).map(r => (
                  <button key={r} onClick={() => setFilterRarity(r)}
                    className={`px-2 py-0.5 rounded-full text-[9px] font-medium whitespace-nowrap ${filterRarity === r ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                    {r === 'all' ? 'All' : RARITY_CONFIG[r].label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {filteredCards.map(card => (
                  <div key={card.id} className="relative">
                    <MiniCard card={card} owned={ownedIds.has(card.id)} selected={selectedCard === card.id}
                      onTap={() => setSelectedCard(card.id === selectedCard ? null : card.id)} />
                    {ownedIds.has(card.id) && (
                      <span className="absolute top-1 left-1 bg-green-500 text-white text-[7px] px-1 rounded font-bold">
                        ×{state.ownedCards.find(o => o.cardId === card.id)?.copies || 1}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              {/* Card actions */}
              {selectedCard && (
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="sticky bottom-0 mt-2 p-2 rounded-xl bg-card border border-border">
                  {(() => {
                    const card = STARTER_CARDS.find(c => c.id === selectedCard);
                    const owned = state.ownedCards.find(o => o.cardId === selectedCard);
                    if (!card) return null;
                    return (
                      <div className="flex gap-2">
                        {!ownedIds.has(card.id) && (
                          <Button size="sm" className="flex-1 text-[10px]" onClick={() => handleCraft(card)}
                            disabled={state.dust < craftCost(card.rarity, false, 1.0)}>
                            <Flame size={12} /> Craft ({craftCost(card.rarity, false, 1.0)} dust)
                          </Button>
                        )}
                        {owned && owned.copies > 1 && (
                          <Button size="sm" variant="outline" className="flex-1 text-[10px]" onClick={() => handleDisenchant(card.id)}>
                            <Minus size={12} /> Disenchant (+{disenchantValue(card.rarity)} dust)
                          </Button>
                        )}
                      </div>
                    );
                  })()}
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ═══ CODEX ═══ */}
          {tab === 'codex' && (
            <motion.div key="codex" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h2 className="text-sm font-bold text-foreground mb-2 flex items-center gap-1.5"><BookOpen size={14} /> Collection Codex</h2>
              <Card className="mb-3">
                <CardContent className="p-3">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div><p className="text-lg font-bold text-foreground">{progress.owned}</p><p className="text-[9px] text-muted-foreground">Owned</p></div>
                    <div><p className="text-lg font-bold text-primary">{progress.percent}%</p><p className="text-[9px] text-muted-foreground">Complete</p></div>
                    <div><p className="text-lg font-bold text-yellow-400">{state.totalPacks}</p><p className="text-[9px] text-muted-foreground">Packs</p></div>
                  </div>
                </CardContent>
              </Card>
              <h3 className="text-xs font-bold text-foreground mb-2">Milestones</h3>
              <div className="space-y-2">
                {CODEX_MILESTONES.map(m => {
                  const done = state.codexMilestones.includes(m.id);
                  const met = checkMilestone(m, state.ownedCards, STARTER_CARDS);
                  return (
                    <Card key={m.id} className={done ? 'opacity-50' : ''}>
                      <CardContent className="p-2.5 flex items-center gap-2">
                        <span className="text-xl">{m.icon}</span>
                        <div className="flex-1">
                          <p className="text-[10px] font-bold text-foreground">{m.name}</p>
                          <p className="text-[9px] text-muted-foreground">{m.description}</p>
                          <p className="text-[8px] text-primary mt-0.5">
                            {m.reward.dust ? `${m.reward.dust} dust ` : ''}
                            {m.reward.gems ? `${m.reward.gems} gems ` : ''}
                            {m.reward.title ? `"${m.reward.title}"` : ''}
                          </p>
                        </div>
                        {done ? <Badge variant="secondary" className="text-[8px]">✓</Badge>
                          : met ? <Button size="sm" className="h-6 text-[9px]" onClick={() => {
                            setState(prev => ({
                              ...prev,
                              codexMilestones: [...prev.codexMilestones, m.id],
                              dust: prev.dust + (m.reward.dust || 0),
                              gems: prev.gems + (m.reward.gems || 0),
                              archiveKeys: prev.archiveKeys + (m.reward.archiveKeys || 0),
                            }));
                            haptic.medium();
                          }}>Claim</Button>
                          : <Badge variant="outline" className="text-[8px]">Locked</Badge>}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              <h3 className="text-xs font-bold text-foreground mt-4 mb-2">Card Sets</h3>
              <div className="space-y-2">
                {CARD_SETS.map(s => (
                  <Card key={s.id}>
                    <CardContent className="p-2.5 flex items-center gap-2">
                      <span className="text-xl">{s.icon}</span>
                      <div className="flex-1">
                        <p className="text-[10px] font-bold text-foreground">{s.name}</p>
                        <p className="text-[9px] text-muted-foreground">{s.description}</p>
                        <div className="flex gap-2 mt-0.5">
                          <Badge variant={s.isActive ? 'default' : 'secondary'} className="text-[7px]">{s.isActive ? 'Active' : 'Coming'}</Badge>
                          <Badge variant="outline" className="text-[7px]">{s.category}</Badge>
                          {s.expiresAt && <Badge variant="destructive" className="text-[7px]">Limited</Badge>}
                        </div>
                      </div>
                      <span className="text-[10px] text-muted-foreground">{s.totalCards} cards</span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </motion.div>
          )}

          {/* ═══ BATTLE ═══ */}
          {tab === 'battle' && (
            <motion.div key="battle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center">
              {lastRewardMsg && (
                <motion.div initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                  className="mb-3 p-2.5 rounded-xl bg-green-500/10 border border-green-500/20 text-[10px] text-green-400 font-medium">
                  🏆 {lastRewardMsg}
                  <button className="ml-2 text-muted-foreground underline" onClick={() => setLastRewardMsg(null)}>✕</button>
                </motion.div>
              )}
              <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 2, repeat: Infinity }} className="text-5xl mb-3">⚔</motion.div>
              <h2 className="text-base font-bold text-foreground mb-1">Quick Match</h2>
              <p className="text-[10px] text-muted-foreground mb-2">Win to earn dust, XP, and a chance to discover enemy faction cards</p>

              <div className="flex gap-2 mb-4">
                {FACTIONS.map(f => (
                  <button key={f} onClick={() => { haptic.light(); setDeckFaction(f); }}
                    className={`flex-1 p-2.5 rounded-xl text-center ${deckFaction === f ? 'bg-primary/20 border-2 border-primary' : 'bg-muted border border-border'}`}>
                    <span className="text-2xl">{FACTION_ICONS[f]}</span>
                    <p className="text-[9px] font-bold text-foreground mt-1">{f}</p>
                  </button>
                ))}
              </div>

              {bredCards.length > 0 && (
                <Card className="mb-3 text-left">
                  <CardContent className="p-2.5">
                    <p className="text-[10px] font-bold text-foreground mb-1">🐉 Bred Cards in Pool: {bredCards.length}</p>
                    <div className="flex gap-1 overflow-x-auto">
                      {bredCards.slice(0, 5).map(c => (
                        <span key={c.id} className="text-lg" title={c.name}>{c.art}</span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card className="mb-3 text-left">
                <CardContent className="p-3 text-[9px] text-muted-foreground space-y-0.5">
                  <p>⚡ Energy scales 1→10 per turn</p>
                  <p>🔥 Combo: +25% per chain, capped ×2.0</p>
                  <p>⚔ Clash: mutual Power→Guard→Power damage</p>
                  <p>💥 Crit: 5% base, ×1.5, cap 35%</p>
                  <p>🌊 Element advantage: +25%</p>
                  <p>🩸 Statuses: burn, frost, poison, bleed, shield</p>
                  <p>🃏 Win: dust + XP + chance for enemy faction card</p>
                </CardContent>
              </Card>

              <Button size="lg" onClick={() => { haptic.heavy(); setTournamentDifficulty(1); setInBattle(true); }} className="w-full">
                <Swords size={16} /> Quick Match as {FACTION_ICONS[deckFaction]} {deckFaction}
              </Button>
            </motion.div>
          )}

          {/* ═══ TOURNAMENT ═══ */}
          {tab === 'tournament' && (
            <motion.div key="tourney" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="text-center mb-4">
                <Trophy size={32} className="text-yellow-400 mx-auto mb-2" />
                <h2 className="text-base font-bold text-foreground">Tournament Bracket</h2>
                <p className="text-[10px] text-muted-foreground">3 rounds · Increasing difficulty · Escalating prizes</p>
              </div>

              {/* Faction select */}
              <div className="flex gap-2 mb-4">
                {FACTIONS.map(f => (
                  <button key={f} onClick={() => { haptic.light(); setDeckFaction(f); }}
                    className={`flex-1 p-2 rounded-xl text-center ${deckFaction === f ? 'bg-primary/20 border-2 border-primary' : 'bg-muted border border-border'}`}>
                    <span className="text-xl">{FACTION_ICONS[f]}</span>
                    <p className="text-[8px] font-bold text-foreground mt-0.5">{f}</p>
                  </button>
                ))}
              </div>

              {!tournament ? (
                <Button className="w-full mb-4" onClick={() => {
                  haptic.heavy();
                  setTournament(generateTournamentBracket(deckFaction));
                  setTournamentRound(0);
                }}>
                  <Trophy size={16} /> Start New Tournament
                </Button>
              ) : (
                <div className="space-y-3">
                  {tournament.map((match, i) => {
                    const isActive = i === tournamentRound && match.status !== 'won' && match.status !== 'lost';
                    const canFight = isActive && (i === 0 || tournament[i - 1]?.status === 'won');
                    return (
                      <Card key={i} className={`overflow-hidden ${match.status === 'won' ? 'border-green-500/30' : match.status === 'lost' ? 'border-red-500/30 opacity-50' : ''}`}>
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-bold text-foreground">R{match.round}</span>
                              <span className="text-xl">{FACTION_ICONS[match.enemyFaction]}</span>
                              <span className="text-[10px] font-bold text-foreground">{match.enemyFaction}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {Array.from({ length: match.difficulty }, (_, k) => (
                                <Star key={k} size={10} className="text-yellow-400 fill-yellow-400" />
                              ))}
                            </div>
                          </div>
                          <p className="text-[9px] text-muted-foreground mb-2">Prize: {match.prize.label}</p>
                          <div className="flex items-center justify-between">
                            {match.status === 'won' && <Badge className="bg-green-500/20 text-green-400 text-[8px]">✓ Won</Badge>}
                            {match.status === 'lost' && <Badge variant="destructive" className="text-[8px]">✕ Lost</Badge>}
                            {match.status === 'upcoming' && !canFight && <Badge variant="outline" className="text-[8px]">Locked</Badge>}
                            {canFight && (
                              <Button size="sm" className="h-7 text-[10px]" onClick={() => startTournamentBattle(match)}>
                                <Swords size={12} /> Fight!
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}

                  {/* Tournament result */}
                  {tournament.every(m => m.status === 'won') && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                      className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-center">
                      <Crown size={28} className="text-yellow-400 mx-auto mb-2" />
                      <p className="text-sm font-bold text-foreground">🏆 Tournament Champion!</p>
                      <p className="text-[10px] text-muted-foreground">All prizes claimed</p>
                    </motion.div>
                  )}
                  {tournament.some(m => m.status === 'lost') && (
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground mb-2">Tournament ended</p>
                      <Button variant="outline" size="sm" onClick={() => {
                        setTournament(null); setTournamentRound(0);
                      }}>Start New Tournament</Button>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* ═══ PACKS ═══ */}
          {tab === 'packs' && (
            <motion.div key="packs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="text-center py-4">
                <motion.div animate={{ rotateY: [0, 360] }} transition={{ duration: 3, repeat: Infinity, ease: 'linear' }} className="inline-block text-5xl mb-2">🃏</motion.div>
                <h2 className="text-base font-bold text-foreground">Card Packs</h2>
                <p className="text-[10px] text-muted-foreground">5 cards per pack · Duplicate protection · Pity system</p>
              </div>

              <div className="space-y-2.5">
                {([
                  { type: 'standard' as const, name: 'Standard', desc: 'Full rarity pool · Pity: rare at 10', cost: '100 Gold', icon: '📦', color: '' },
                  { type: 'premium' as const, name: 'Premium', desc: 'Rare+ guaranteed · Pity: epic at 20', cost: '100 Gems', icon: '🎁', color: 'border-yellow-500/30' },
                  { type: 'mythic' as const, name: 'Mythic', desc: 'Epic+ pool · Pity: legendary at 30', cost: '300 Gems', icon: '💎', color: 'border-pink-500/30' },
                ] as const).map(p => (
                  <Card key={p.type} className={`text-left ${p.color}`}>
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className="text-3xl">{p.icon}</div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-foreground">{p.name} Pack</p>
                        <p className="text-[9px] text-muted-foreground">{p.desc}</p>
                        <p className="text-[8px] text-muted-foreground">Pity: {state.pityCounters[p.type] || 0}/{PITY_THRESHOLDS[p.type].pulls}</p>
                      </div>
                      <Button size="sm" onClick={() => handleOpenPack(p.type)} className="text-[10px]">
                        <Star size={12} /> {p.cost}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card className="mt-4">
                <CardContent className="p-3">
                  <h3 className="text-[10px] font-bold text-foreground mb-1">Drop Rates (Standard)</h3>
                  <div className="grid grid-cols-3 gap-1 text-[8px]">
                    {(Object.entries(DROP_RATES) as [CardRarity, number][]).map(([r, rate]) => (
                      <div key={r} className="text-center p-1 rounded bg-muted">
                        <span style={{ color: RARITY_CONFIG[r].color }}>{RARITY_CONFIG[r].label}</span>
                        <p className="font-bold">{(rate * 100).toFixed(1)}%</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ═══ CRAFT ═══ */}
          {tab === 'craft' && (
            <motion.div key="craft" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5"><Flame size={14} /> Crafting Forge</h2>
                <Badge variant="outline" className="text-[9px]">{state.dust} ✨ Dust</Badge>
              </div>

              <Card className="mb-3">
                <CardContent className="p-3">
                  <h3 className="text-[10px] font-bold text-foreground mb-1.5">Craft Costs / Disenchant Values</h3>
                  <div className="space-y-1">
                    {(Object.entries(DUST_VALUES) as [CardRarity, { disenchant: number; craft: number }][]).map(([r, v]) => (
                      <div key={r} className="flex items-center justify-between text-[9px]">
                        <span style={{ color: RARITY_CONFIG[r].color }} className="font-medium">{RARITY_CONFIG[r].label}</span>
                        <span className="text-muted-foreground">Craft: {v.craft} · DE: {v.disenchant}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <h3 className="text-xs font-bold text-foreground mb-2">Craftable Cards</h3>
              <div className="space-y-1.5">
                {STARTER_CARDS.filter(c => !ownedIds.has(c.id)).map(card => {
                  const cost = craftCost(card.rarity, false, 1.0);
                  return (
                    <Card key={card.id}>
                      <CardContent className="p-2 flex items-center gap-2">
                        <span className="text-xl">{card.art}</span>
                        <div className="flex-1">
                          <p className="text-[10px] font-bold text-foreground">{card.name}</p>
                          <span className="text-[8px]" style={{ color: RARITY_CONFIG[card.rarity].color }}>{RARITY_CONFIG[card.rarity].label}</span>
                        </div>
                        <Button size="sm" className="h-6 text-[9px]" disabled={state.dust < cost}
                          onClick={() => handleCraft(card)}>
                          <Flame size={10} /> {cost}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
                {STARTER_CARDS.filter(c => !ownedIds.has(c.id)).length === 0 && (
                  <p className="text-center text-[10px] text-muted-foreground py-4">🎉 All cards crafted!</p>
                )}
              </div>

              {/* Disenchant excess */}
              {state.ownedCards.filter(o => o.copies > 1).length > 0 && (
                <>
                  <h3 className="text-xs font-bold text-foreground mt-4 mb-2">Disenchant Extras</h3>
                  <div className="space-y-1.5">
                    {state.ownedCards.filter(o => o.copies > 1).map(o => {
                      const card = STARTER_CARDS.find(c => c.id === o.cardId);
                      if (!card) return null;
                      return (
                        <Card key={o.cardId}>
                          <CardContent className="p-2 flex items-center gap-2">
                            <span className="text-xl">{card.art}</span>
                            <div className="flex-1">
                              <p className="text-[10px] font-bold text-foreground">{card.name} <span className="text-muted-foreground">×{o.copies}</span></p>
                            </div>
                            <Button size="sm" variant="outline" className="h-6 text-[9px]" onClick={() => handleDisenchant(o.cardId)}>
                              +{disenchantValue(card.rarity)} ✨
                            </Button>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* ═══ ECONOMY INFO ═══ */}
          {tab === 'economy' && (
            <motion.div key="econ" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h2 className="text-sm font-bold text-foreground mb-2 flex items-center gap-1.5"><Archive size={14} /> System Info</h2>

              <Card className="mb-3">
                <CardContent className="p-3">
                  <h3 className="text-[10px] font-bold text-foreground mb-1">Design Rules</h3>
                  <div className="space-y-0.5">
                    {DESIGN_RULES.map((r, i) => <p key={i} className="text-[8px] text-muted-foreground">{r}</p>)}
                  </div>
                </CardContent>
              </Card>

              <Card className="mb-3">
                <CardContent className="p-3">
                  <h3 className="text-[10px] font-bold text-foreground mb-1">Year-One Roadmap</h3>
                  <div className="space-y-1">
                    {YEAR_ONE_ROADMAP.map((e, i) => (
                      <div key={i} className="flex gap-2 text-[9px]">
                        <span className="text-primary font-bold w-8 shrink-0">M{e.month}</span>
                        <span className="text-muted-foreground">{e.event}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="mb-3">
                <CardContent className="p-3">
                  <h3 className="text-[10px] font-bold text-foreground mb-1">Season Pass</h3>
                  <p className="text-[9px] text-muted-foreground mb-1">Tier {state.seasonPassTier}/30 · {state.seasonPassPremium ? '👑 Premium' : 'Free'}</p>
                  <Progress value={(state.seasonPassTier / 30) * 100} className="h-1.5" />
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
