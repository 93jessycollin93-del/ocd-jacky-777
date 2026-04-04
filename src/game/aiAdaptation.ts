/**
 * AI Adaptation Engine
 * Tracks repeated player behavior and adjusts opposition probabilistically.
 */

import { ActionRecord, AIAdaptation, PlayerActionType } from './types';

const ACTION_WINDOW = 10;
const MAX_ADAPTATION_LEVEL = 20;
const REPEAT_THRESHOLD = 0.6;

export function recordAction(history: ActionRecord[], actionType: PlayerActionType): ActionRecord[] {
  const updated = [...history, { type: actionType, timestamp: Date.now() }];
  if (updated.length > ACTION_WINDOW) return updated.slice(updated.length - ACTION_WINDOW);
  return updated;
}

export function computeActionMetrics(history: ActionRecord[]) {
  if (history.length === 0) return { repeatRatio: 0, uniqueTypes: 0, dominantAction: null as PlayerActionType | null };
  const counts: Partial<Record<PlayerActionType, number>> = {};
  for (const a of history) counts[a.type] = (counts[a.type] || 0) + 1;
  let maxCount = 0;
  let dominantAction: PlayerActionType | null = null;
  for (const [type, count] of Object.entries(counts)) {
    if (count! > maxCount) { maxCount = count!; dominantAction = type as PlayerActionType; }
  }
  return { repeatRatio: maxCount / history.length, uniqueTypes: Object.keys(counts).length, dominantAction };
}

export function evaluateAdaptation(history: ActionRecord[], current: AIAdaptation, recentLossCount: number = 0, stabilityInvestments: number = 0): AIAdaptation {
  const metrics = computeActionMetrics(history);
  let level = current.level;
  if (metrics.repeatRatio >= REPEAT_THRESHOLD && history.length >= 5) {
    if (Math.random() < 0.3 + (metrics.repeatRatio - REPEAT_THRESHOLD) * 1.5) level += 1;
  }
  if (metrics.uniqueTypes <= 2 && history.length >= 6 && Math.random() < 0.2) level += 1;
  if (metrics.uniqueTypes >= 4 && Math.random() < 0.4) level -= 1;
  if (recentLossCount > 0 && Math.random() < Math.min(0.6, recentLossCount * 0.2)) level -= 1;
  if (stabilityInvestments > 0 && Math.random() < Math.min(0.5, stabilityInvestments * 0.15)) level -= 1;
  level = Math.max(0, Math.min(MAX_ADAPTATION_LEVEL, level));
  return { level, ...getAdaptationModifiers(level) };
}

export function getAdaptationModifiers(level: number) {
  const t = level / MAX_ADAPTATION_LEVEL;
  return {
    counterStrategyBias: Math.round(t * 0.8 * 100) / 100,
    reactionSpeed: Math.round(t * 0.6 * 100) / 100,
    aggressionModifier: Math.round(t * 0.5 * 100) / 100,
  };
}

export function applyAdaptationToCombat(basePower: number, adaptation: AIAdaptation, playerDominantAction: PlayerActionType | null) {
  if (adaptation.level === 0) return { adjustedPower: basePower, modifierDescription: '' };
  let counterBonus = 1;
  if (playerDominantAction === 'send_march') counterBonus += adaptation.counterStrategyBias * 0.15;
  const aggressionBonus = 1 + adaptation.aggressionModifier * 0.1;
  const adjustedPower = Math.floor(basePower * counterBonus * aggressionBonus);
  const pctIncrease = Math.round((adjustedPower / basePower - 1) * 100);
  return { adjustedPower, modifierDescription: pctIncrease > 0 ? `AI Adaptation Lv${adaptation.level} (+${pctIncrease}% enemy efficiency)` : '' };
}

export function countStabilityActions(history: ActionRecord[]): number {
  const stabilityTypes: PlayerActionType[] = ['gift_faction', 'start_research', 'craft_resources'];
  return history.filter(a => stabilityTypes.includes(a.type)).length;
}

export function countRecentLosses(marches: { completed: boolean; result?: { victory: boolean } }[]): number {
  return marches.filter(m => m.completed && m.result && !m.result.victory).length;
}

export function calculateVeilPressure(powerScore: number, stabilityScore: number, adaptation: AIAdaptation, guildStabilityBonus: number = 0): number {
  const imbalance = Math.max(0, powerScore - stabilityScore * 1.5);
  const rawPressure = (imbalance / Math.max(powerScore, 1)) * 50 + adaptation.level * 3.75;
  const dampened = rawPressure * (1 - Math.min(guildStabilityBonus, 0.4));
  return Math.max(0, Math.min(100, Math.round(dampened)));
}

export function createDefaultAdaptation(): AIAdaptation {
  return { level: 0, counterStrategyBias: 0, reactionSpeed: 0, aggressionModifier: 0 };
}
