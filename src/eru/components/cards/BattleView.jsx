import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CardDisplay from './CardDisplay';
import { getElementMultiplier, generateAIDeck } from './StarterCards';
import { getRecommendedHp, normalizeDeckMode } from './deckModes';

function calcCardEffect(card, comboCount, opponentEl) {
  const comboMult = Math.min(2.0, 1 + 0.25 * comboCount);
  const elMult = getElementMultiplier(card.element, opponentEl);
  const basePower = (card.power + (card.guard * 0.5)) * elMult;
  const abVal = (card.ability_value || 0) * comboMult;
  return { boardPower: Math.round(basePower * comboMult), abVal: Math.round(abVal) };
}

export default function BattleView({ playerCards, opponentName, difficulty, opponentFaction, onBattleEnd, opponentDeck, mode = 'tournament', tutorialSteps = [], deckMode = 10, teamSize = 1 }) {
  const normalizedDeckMode = normalizeDeckMode(deckMode);
  const startingHp = getRecommendedHp(normalizedDeckMode, teamSize);
  const [aiDeck] = useState(() => opponentDeck?.length ? opponentDeck : generateAIDeck(difficulty, opponentFaction, normalizedDeckMode));
  const [playerHand, setPlayerHand] = useState([...playerCards].slice(0, normalizedDeckMode));
  const [aiHand, setAiHand] = useState([...(opponentDeck?.length ? opponentDeck : generateAIDeck(difficulty, opponentFaction, normalizedDeckMode))].slice(0, normalizedDeckMode));
  const [playerBoard, setPlayerBoard] = useState(0);
  const [aiBoard, setAiBoard] = useState(0);
  const [playerHP, setPlayerHP] = useState(startingHp);
  const [aiHP, setAiHP] = useState(startingHp);
  const [comboCount, setComboCount] = useState(0);
  const [turn, setTurn] = useState(1);
  const [log, setLog] = useState([]);
  const [phase, setPhase] = useState('player'); // player | ai | result
  const [lastPlayed, setLastPlayed] = useState(null);
  const [result, setResult] = useState(null);
  const [turnLog, setTurnLog] = useState([]);
  const [tutorialIndex, setTutorialIndex] = useState(0);

  const addLog = (msg, nextTurn = turn, actor = 'system', snapshot = {}) => {
    setLog(p => [msg, ...p].slice(0, 8));
    setTurnLog((prev) => ([
      ...prev,
      {
        turn: nextTurn,
        actor,
        message: msg,
        player_hp: snapshot.playerHP,
        opponent_hp: snapshot.aiHP,
        player_board: snapshot.playerBoard,
        opponent_board: snapshot.aiBoard,
      }
    ]));
  };

  const playCard = (card) => {
    if (phase !== 'player') return;
    const newHand = playerHand.filter(c => c.id !== card.id);
    setPlayerHand(newHand);
    setLastPlayed(card);

    const aiEl = aiDeck[0]?.element || 'fire';
    const { boardPower, abVal } = calcCardEffect(card, comboCount, aiEl);
    let newPlayerBoard = playerBoard + boardPower;
    let newAiHP = aiHP;
    let newPlayerHP = playerHP;
    let logMsg = `You play ${card.name} → +${boardPower} power`;

    if (card.ability === 'burn' || card.ability === 'poison') {
      newAiHP = Math.max(0, newAiHP - abVal);
      logMsg += `, ${card.ability} deals ${abVal} dmg`;
    } else if (card.ability === 'heal') {
      newPlayerHP = Math.min(startingHp, newPlayerHP + abVal);
      logMsg += `, heal ${abVal} HP`;
    } else if (card.ability === 'shield') {
      newPlayerBoard += abVal;
      logMsg += `, shield +${abVal}`;
    } else if (card.ability === 'combo') {
      const bonus = Math.round(abVal * comboCount * 0.5);
      newPlayerBoard += bonus;
      if (bonus > 0) logMsg += `, combo bonus +${bonus}`;
    }

    setPlayerBoard(newPlayerBoard);
    setAiHP(newAiHP);
    setPlayerHP(newPlayerHP);
    setComboCount(c => c + 1);
    addLog(logMsg, turn, 'player', {
      playerHP: newPlayerHP,
      aiHP: newAiHP,
      playerBoard: newPlayerBoard,
      aiBoard,
    });
    setPhase('ai');

    // Check win condition
    if (newAiHP <= 0) {
      setTimeout(() => endBattle(newPlayerBoard, aiBoard, true), 500);
      return;
    }

    // AI plays after short delay
    setTimeout(() => aiPlay(newHand.length, newPlayerBoard, newAiHP, newPlayerHP), 800);
  };

  const aiPlay = (playerCardsLeft, currentPlayerBoard, currentAiHP, currentPlayerHP) => {
    if (aiHand.length === 0) {
      setPhase('result');
      endBattle(currentPlayerBoard, aiBoard, currentPlayerBoard > aiBoard);
      return;
    }

    // AI picks highest power card
    const sorted = [...aiHand].sort((a, b) => (b.power + b.guard * 0.5) - (a.power + a.guard * 0.5));
    const aiCard = sorted[0];
    const newAiHand = aiHand.filter(c => c.id !== aiCard.id);
    setAiHand(newAiHand);

    const playerEl = playerCards[0]?.element || 'fire';
    const { boardPower, abVal } = calcCardEffect(aiCard, 0, playerEl);
    let newAiBoard = aiBoard + boardPower;
    let newPlayerHP = currentPlayerHP;

    let logMsg = `${opponentName} plays ${aiCard.name} → +${boardPower} power`;

    if (aiCard.ability === 'burn' || aiCard.ability === 'poison') {
      newPlayerHP = Math.max(0, newPlayerHP - abVal);
      logMsg += `, ${aiCard.ability} deals ${abVal} dmg to you`;
    }

    setAiBoard(newAiBoard);
    setPlayerHP(newPlayerHP);
    addLog(logMsg, turn, 'opponent', {
      playerHP: newPlayerHP,
      aiHP: currentAiHP,
      playerBoard: currentPlayerBoard,
      aiBoard: newAiBoard,
    });

    const nextTurn = turn + 1;
    setTurn(nextTurn);

    if (newPlayerHP <= 0) {
      endBattle(currentPlayerBoard, newAiBoard, false);
      return;
    }

    if (nextTurn > normalizedDeckMode || playerCardsLeft === 0) {
      setTimeout(() => {
        const won = currentPlayerBoard > newAiBoard;
        endBattle(currentPlayerBoard, newAiBoard, won);
      }, 600);
      return;
    }

    setPhase('player');
  };

  const endBattle = (pBoard, aBoard, won) => {
    setResult({ won, pBoard, aBoard });
    setPhase('result');
    setTimeout(() => onBattleEnd(won, {
      aiBoardPower: aBoard,
      aiDeck,
      opponentFaction: opponentFaction || aiDeck[0]?.faction,
      playerBoardPower: pBoard,
      turnsPlayed: turn,
      playerHP,
      aiHP,
      turnLog,
      playerDeck: playerCards,
      mode,
      deckMode: normalizedDeckMode,
      teamSize,
    }), 1200);
  };

  const playerPct = Math.round((playerHP / startingHp) * 100);
  const aiPct = Math.round((aiHP / startingHp) * 100);

  return (
    <div className="flex flex-col gap-3">
      {/* HP bars */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'You', hp: playerHP, pct: playerPct, board: playerBoard, color: 'bg-green-500' },
          { label: opponentName, hp: aiHP, pct: aiPct, board: aiBoard, color: 'bg-red-500' },
        ].map(p => (
          <div key={p.label} className="bg-card border border-border rounded-xl p-2">
            <div className="flex justify-between text-[10px] mb-1">
              <span className="text-muted-foreground font-medium">{p.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-foreground font-mono">❤️ {p.hp}</span>
                <span className="text-primary font-mono">⚡ {p.board}</span>
              </div>
            </div>
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <motion.div animate={{ width: `${p.pct}%` }} className={`h-full rounded-full ${p.color}`} />
            </div>
          </div>
        ))}
      </div>

      {/* Battle log */}
      <div className="bg-secondary/50 border border-border rounded-xl px-3 py-2 h-20 overflow-y-auto space-y-1">
        <AnimatePresence>
          {log.map((l, i) => (
            <motion.p key={i + l} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
              className="text-[10px] text-muted-foreground font-mono">{l}</motion.p>
          ))}
        </AnimatePresence>
        {log.length === 0 && <p className="text-[10px] text-muted-foreground/40 text-center mt-4">Battle begins...</p>}
      </div>

      {/* Phase indicator */}
      <div className="text-center space-y-2">
        {phase === 'player' && <p className="text-xs text-primary font-semibold animate-pulse">▶ Your Turn — Play a card (Turn {turn}/{normalizedDeckMode})</p>}
        {phase === 'ai' && <p className="text-xs text-red-400 font-semibold animate-pulse">⏳ {opponentName} is thinking...</p>}
        {mode === 'tutorial' && tutorialSteps[tutorialIndex] && (
          <button
            onClick={() => setTutorialIndex((prev) => Math.min(prev + 1, tutorialSteps.length - 1))}
            className="mx-auto block rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] text-primary"
          >
            Tutorial: {tutorialSteps[tutorialIndex]}
          </button>
        )}
        {phase === 'result' && result && (
          <motion.p initial={{ scale: 0.8 }} animate={{ scale: 1 }}
            className={`text-sm font-bold ${result.won ? 'text-green-400' : 'text-red-400'}`}>
            {result.won ? '🏆 Victory!' : '💀 Defeated'} — Board {result.pBoard} vs {result.aBoard}
          </motion.p>
        )}
      </div>

      {/* Player hand */}
      <div>
        <p className="text-[10px] text-muted-foreground mb-2">Your Hand ({playerHand.length} cards)</p>
        <div className="flex gap-2 flex-wrap justify-center">
          {playerHand.map(card => (
            <CardDisplay key={card.id} card={card} size="sm"
              onClick={playCard} disabled={phase !== 'player'}
              glowing={phase === 'player'} />
          ))}
          {playerHand.length === 0 && phase !== 'result' && (
            <p className="text-xs text-muted-foreground/40 py-4">No cards remaining</p>
          )}
        </div>
      </div>
    </div>
  );
}