// ═══════════════════════════════════════════════════════════════
// CARD COMBAT ENGINE — Full formula set
// Power curves, combo scaling, crit, status effects, lane system
// ═══════════════════════════════════════════════════════════════

// ── Types ──
export type CardRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';
export type CardElement = 'fire' | 'water' | 'earth' | 'air' | 'shadow' | 'light';
export type CardType = 'unit' | 'spell' | 'relic';
export type Lane = 'front' | 'mid' | 'back';
export type StatusType = 'burn' | 'frost' | 'poison' | 'shield' | 'bleed';

export interface CardDef {
  id: string;
  name: string;
  type: CardType;
  element: CardElement;
  rarity: CardRarity;
  cost: number;
  power: number;       // board presence / lane contribution
  guard: number;       // durability / armor
  ability: string;
  abilityDesc: string;
  abilityValue: number; // hidden design budget consumed by ability
  art: string;
  lane?: Lane;         // preferred lane for units
  keywords?: string[];
  faction?: string;
}

export interface BattleUnit {
  instanceId: string;
  def: CardDef;
  currentPower: number;
  currentGuard: number;
  statuses: { type: StatusType; stacks: number; turnsLeft: number }[];
  comboCount: number;
  lane: Lane;
}

export interface BoardState {
  front: BattleUnit[];
  mid: BattleUnit[];
  back: BattleUnit[];
}

export interface PlayerState {
  board: BoardState;
  hand: CardDef[];
  deck: CardDef[];
  energy: number;
  maxEnergy: number;
  life: number;
  cardsPlayedThisTurn: number;
}

export interface BattleState {
  player: PlayerState;
  enemy: PlayerState;
  turn: number;
  round: number;
  maxRounds: number;
  phase: 'draw' | 'play' | 'clash' | 'end_turn' | 'round_end' | 'game_over';
  log: string[];
  winner: 'player' | 'enemy' | null;
}

// ── Constants ──
export const BALANCE_CONSTANT = 2.5;
export const COMBO_SCALE = 0.25;
export const COMBO_CAP = 2.0;
export const BASE_CRIT_CHANCE = 0.05;
export const CRIT_DAMAGE_MULT = 1.5;
export const CRIT_CAP = 0.35;
export const STARTING_LIFE = 25;
export const STARTING_HAND = 5;
export const MAX_ENERGY = 10;
export const DECK_SIZE = 30;
export const MAX_ROUNDS = 3;

export const RARITY_BONUS: Record<CardRarity, number> = {
  common: 0, uncommon: 0.5, rare: 1.0, epic: 1.5, legendary: 2.0, mythic: 2.5,
};

export const ELEMENT_ADVANTAGE: Record<CardElement, CardElement> = {
  fire: 'air', water: 'fire', earth: 'water', air: 'earth', shadow: 'light', light: 'shadow',
};

// ── Core Formulas ──

/** Card design budget = cost × B + rarity bonus */
export function cardBudget(cost: number, rarity: CardRarity): number {
  return cost * BALANCE_CONSTANT + RARITY_BONUS[rarity];
}

/** Unit value = power + guard + ability value */
export function unitValue(card: CardDef): number {
  return card.power + card.guard + card.abilityValue;
}

/** Mana efficiency = total value / cost */
export function manaEfficiency(card: CardDef): number {
  if (card.cost === 0) return 0;
  return unitValue(card) / card.cost;
}

/** Power with diminishing returns: base + √bonus */
export function diminishingPower(base: number, bonus: number): number {
  return base + Math.sqrt(Math.max(0, bonus));
}

/** Risk-reward: attack increases as HP drops */
export function riskRewardAttack(baseAttack: number, missingHP: number, k = 1.5): number {
  return Math.round(baseAttack + missingHP * k);
}

/** Combo multiplier: 1 + 0.25 × comboCount, capped */
export function comboMultiplier(comboCount: number): number {
  return Math.min(COMBO_CAP, 1 + COMBO_SCALE * comboCount);
}

/** Combo-scaled effect value */
export function comboEffect(baseEffect: number, comboCount: number): number {
  return Math.round(baseEffect * comboMultiplier(comboCount));
}

/** Crit chance: base + 5% per support, capped at 35% */
export function critChance(supportCards: number): number {
  return Math.min(CRIT_CAP, BASE_CRIT_CHANCE + 0.05 * supportCards);
}

/** Crit damage */
export function critDamage(normalDamage: number): number {
  return Math.ceil(normalDamage * CRIT_DAMAGE_MULT);
}

/** Roll crit */
export function rollCrit(chance: number): boolean {
  return Math.random() < chance;
}

/** Catch-up bonus draw chance */
export function catchupBonus(opponentPower: number, yourPower: number): number {
  return Math.min(0.30, Math.max(0, 0.05 * (opponentPower - yourPower)));
}

/** Tempo score: your swing minus enemy swing */
export function tempoScore(yourDelta: number, enemyDelta: number): number {
  return yourDelta - enemyDelta;
}

/** Card advantage value (each card ≈ 2.25 value) */
export function cardAdvantageValue(cardsGained: number): number {
  return cardsGained * 2.25;
}

/** Removal value with condition modifier */
export function removalValue(targetCost: number, conditionMod = 1.0): number {
  return targetCost * BALANCE_CONSTANT * conditionMod;
}

/** Heal value (75% of damage value) */
export function healValue(amount: number): number {
  return amount * 0.75;
}

/** Draft pick score */
export function draftPickScore(rawPower: number, synergy: number, flexibility: number): number {
  return rawPower * 0.5 + synergy * 0.3 + flexibility * 0.2;
}

/** Lane power total */
export function lanePower(units: BattleUnit[]): number {
  return units.reduce((sum, u) => {
    const frostPenalty = u.statuses.filter(s => s.type === 'frost').reduce((s, st) => s + st.stacks, 0);
    return sum + Math.max(0, u.currentPower - frostPenalty);
  }, 0);
}

/** Board score = sum of all lane powers */
export function boardScore(board: BoardState): number {
  return lanePower(board.front) + lanePower(board.mid) + lanePower(board.back);
}

/** Element advantage check */
export function hasAdvantage(attacker: CardElement, defender: CardElement): boolean {
  return ELEMENT_ADVANTAGE[attacker] === defender;
}

// ── Status Effect Resolution ──

export function resolveBurn(unit: BattleUnit): { damage: number } {
  const burnStacks = unit.statuses.filter(s => s.type === 'burn').reduce((s, st) => s + st.stacks, 0);
  return { damage: burnStacks };
}

export function resolvePoison(unit: BattleUnit): { damage: number } {
  const poisonStacks = unit.statuses.filter(s => s.type === 'poison').reduce((s, st) => s + st.stacks, 0);
  if (poisonStacks === 0) return { damage: 0 };
  return { damage: Math.max(1, Math.floor(0.25 * unit.currentPower)) };
}

export function resolveBleed(unit: BattleUnit): { damage: number } {
  const bleedStacks = unit.statuses.filter(s => s.type === 'bleed').reduce((s, st) => s + st.stacks, 0);
  if (bleedStacks === 0) return { damage: 0 };
  return { damage: 1 + Math.floor(bleedStacks / 2) };
}

export function hasShield(unit: BattleUnit): boolean {
  return unit.statuses.some(s => s.type === 'shield' && s.stacks > 0);
}

/** Apply damage through guard then power */
export function applyDamage(unit: BattleUnit, rawDamage: number): { destroyed: boolean; overkill: number } {
  if (hasShield(unit)) {
    unit.statuses = unit.statuses.map(s =>
      s.type === 'shield' ? { ...s, stacks: s.stacks - 1 } : s
    ).filter(s => s.stacks > 0);
    return { destroyed: false, overkill: 0 };
  }
  const guardAbsorb = Math.min(unit.currentGuard, rawDamage);
  unit.currentGuard -= guardAbsorb;
  const remaining = rawDamage - guardAbsorb;
  unit.currentPower -= remaining;
  if (unit.currentPower <= 0) {
    return { destroyed: true, overkill: Math.abs(unit.currentPower) };
  }
  return { destroyed: false, overkill: 0 };
}

/** Clash: mutual damage */
export function resolveClash(attacker: BattleUnit, defender: BattleUnit): {
  attackerDestroyed: boolean;
  defenderDestroyed: boolean;
  log: string[];
} {
  const log: string[] = [];
  let atkDmg = attacker.currentPower;
  let defDmg = defender.currentPower;

  // Element advantage: +25% damage
  if (hasAdvantage(attacker.def.element, defender.def.element)) {
    atkDmg = Math.ceil(atkDmg * 1.25);
    log.push(`${attacker.def.name} has elemental advantage! (+25%)`);
  }
  if (hasAdvantage(defender.def.element, attacker.def.element)) {
    defDmg = Math.ceil(defDmg * 1.25);
    log.push(`${defender.def.name} has elemental advantage! (+25%)`);
  }

  // Crit
  const atkCrit = rollCrit(critChance(0));
  const defCrit = rollCrit(critChance(0));
  if (atkCrit) { atkDmg = critDamage(atkDmg); log.push(`${attacker.def.name} crits!`); }
  if (defCrit) { defDmg = critDamage(defDmg); log.push(`${defender.def.name} crits!`); }

  const defResult = applyDamage(defender, atkDmg);
  const atkResult = applyDamage(attacker, defDmg);

  log.push(`${attacker.def.name} deals ${atkDmg} → ${defender.def.name} (${defResult.destroyed ? 'DESTROYED' : `${defender.currentPower}P/${defender.currentGuard}G`})`);
  log.push(`${defender.def.name} deals ${defDmg} → ${attacker.def.name} (${atkResult.destroyed ? 'DESTROYED' : `${attacker.currentPower}P/${attacker.currentGuard}G`})`);

  return { attackerDestroyed: atkResult.destroyed, defenderDestroyed: defResult.destroyed, log };
}

// ── End-of-turn Status Ticks ──

export function tickStatuses(unit: BattleUnit): { damage: number; log: string[] } {
  const log: string[] = [];
  let totalDmg = 0;

  const burn = resolveBurn(unit);
  if (burn.damage > 0) {
    totalDmg += burn.damage;
    log.push(`${unit.def.name} burns for ${burn.damage}`);
  }

  const poison = resolvePoison(unit);
  if (poison.damage > 0) {
    totalDmg += poison.damage;
    log.push(`${unit.def.name} takes ${poison.damage} poison`);
  }

  const bleed = resolveBleed(unit);
  if (bleed.damage > 0) {
    totalDmg += bleed.damage;
    log.push(`${unit.def.name} bleeds for ${bleed.damage}`);
  }

  // Decrement turns
  unit.statuses = unit.statuses
    .map(s => ({ ...s, turnsLeft: s.turnsLeft - 1 }))
    .filter(s => s.turnsLeft > 0 && s.stacks > 0);

  return { damage: totalDmg, log };
}

// ── Battle Initialization ──

export function shuffleDeck(deck: CardDef[]): CardDef[] {
  const arr = [...deck];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function drawCards(state: PlayerState, count: number): { drawn: CardDef[]; state: PlayerState } {
  const drawn = state.deck.slice(0, count);
  return {
    drawn,
    state: { ...state, hand: [...state.hand, ...drawn], deck: state.deck.slice(count) },
  };
}

export function createPlayerState(deckCards: CardDef[]): PlayerState {
  const shuffled = shuffleDeck(deckCards);
  const hand = shuffled.slice(0, STARTING_HAND);
  const remaining = shuffled.slice(STARTING_HAND);
  return {
    board: { front: [], mid: [], back: [] },
    hand,
    deck: remaining,
    energy: 1,
    maxEnergy: 1,
    life: STARTING_LIFE,
    cardsPlayedThisTurn: 0,
  };
}

export function createBattleState(playerDeck: CardDef[], enemyDeck: CardDef[]): BattleState {
  return {
    player: createPlayerState(playerDeck),
    enemy: createPlayerState(enemyDeck),
    turn: 1,
    round: 1,
    maxRounds: MAX_ROUNDS,
    phase: 'play',
    log: ['⚔ Battle begins!'],
    winner: null,
  };
}

// ── AI Opponent Logic ──

export function aiPlayTurn(state: PlayerState): { plays: { card: CardDef; lane: Lane }[]; clashTargets: { attackerLane: Lane; attackerIdx: number; defenderLane: Lane; defenderIdx: number }[] } {
  const plays: { card: CardDef; lane: Lane }[] = [];
  let energyLeft = state.energy;
  const playable = [...state.hand].sort((a, b) => b.cost - a.cost);

  for (const card of playable) {
    if (card.cost <= energyLeft && card.type === 'unit') {
      const lane = card.lane || (['front', 'mid', 'back'] as Lane[])[Math.floor(Math.random() * 3)];
      plays.push({ card, lane });
      energyLeft -= card.cost;
    }
    if (energyLeft <= 0) break;
  }

  // Simple clash: front vs front if both have units
  const clashTargets: { attackerLane: Lane; attackerIdx: number; defenderLane: Lane; defenderIdx: number }[] = [];

  return { plays, clashTargets };
}

// ── Score Calculation ──

export function roundWinner(playerBoard: BoardState, enemyBoard: BoardState): 'player' | 'enemy' | 'draw' {
  const ps = boardScore(playerBoard);
  const es = boardScore(enemyBoard);
  if (ps > es) return 'player';
  if (es > ps) return 'enemy';
  return 'draw';
}
