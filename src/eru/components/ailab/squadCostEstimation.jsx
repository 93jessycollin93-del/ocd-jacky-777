export const SQUAD_COST_THRESHOLDS = {
  typicalTokens: 18000,
  elevatedTokens: 35000,
  typicalCost: 0.18,
  elevatedCost: 0.45,
};

const INPUT_TOKEN_RATIO = 0.28;
const OUTPUT_TOKEN_RATIO = 0.22;
const BASE_PROMPT_TOKENS = 280;
const PLAN_TOKENS = 700;
const DELEGATION_TOKENS = 650;
const FEEDBACK_TOKENS = 320;
const FINAL_SYNTHESIS_TOKENS = 1100;
const COST_PER_1K_TOKENS = 0.01;

function estimateTextTokens(text = '') {
  return Math.ceil((text || '').trim().length / 4);
}

export function estimateSquadRunCost({ squad, bots = [], runGoal = '' }) {
  const selectedBotIds = Array.from(new Set([
    squad?.master_bot_id,
    ...(squad?.member_bot_ids || []),
  ].filter(Boolean)));

  const selectedBots = bots.filter((bot) => selectedBotIds.includes(bot.id));
  const pipelineSteps = squad?.pipeline_steps || [];
  const executionCount = pipelineSteps.length || Math.max(1, selectedBots.length || 1);
  const feedbackCount = Math.max(0, executionCount - 1);

  const goalTokens = estimateTextTokens(runGoal || squad?.description || squad?.name || '');
  const contextTokens = estimateTextTokens(squad?.shared_context || '');
  const pipelineTokens = pipelineSteps.reduce((sum, step) => sum + estimateTextTokens(`${step.title || ''} ${step.instruction || ''}`), 0);
  const botInstructionTokens = selectedBots.reduce((sum, bot) => sum + estimateTextTokens(bot.instructions || ''), 0);
  const groupTokens = (squad?.task_groups || []).reduce((sum, group) => sum + estimateTextTokens(`${group.name || ''} ${group.purpose || ''} ${group.task_instruction || ''}`), 0);

  const promptTokens =
    PLAN_TOKENS +
    DELEGATION_TOKENS +
    (executionCount * (BASE_PROMPT_TOKENS + Math.ceil(botInstructionTokens / Math.max(1, executionCount)) + Math.ceil(pipelineTokens / Math.max(1, executionCount)) + goalTokens + contextTokens + Math.ceil(groupTokens / Math.max(1, executionCount)))) +
    (feedbackCount * (FEEDBACK_TOKENS + goalTokens)) +
    FINAL_SYNTHESIS_TOKENS +
    contextTokens +
    goalTokens;

  const estimatedInputTokens = Math.ceil(promptTokens * INPUT_TOKEN_RATIO + promptTokens);
  const estimatedOutputTokens = Math.ceil((executionCount * 450) + (feedbackCount * 140) + 500 + (goalTokens * OUTPUT_TOKEN_RATIO));
  const totalEstimatedTokens = estimatedInputTokens + estimatedOutputTokens;
  const estimatedCost = Number(((totalEstimatedTokens / 1000) * COST_PER_1K_TOKENS).toFixed(2));

  let warningLevel = 'normal';
  let warningMessage = 'Estimated usage is within a typical squad run budget.';

  if (totalEstimatedTokens >= SQUAD_COST_THRESHOLDS.elevatedTokens || estimatedCost >= SQUAD_COST_THRESHOLDS.elevatedCost) {
    warningLevel = 'high';
    warningMessage = 'This run is likely to be expensive for a single squad cycle.';
  } else if (totalEstimatedTokens >= SQUAD_COST_THRESHOLDS.typicalTokens || estimatedCost >= SQUAD_COST_THRESHOLDS.typicalCost) {
    warningLevel = 'medium';
    warningMessage = 'This run is above a typical squad budget and may use more credits than usual.';
  }

  return {
    selectedBotCount: selectedBots.length,
    executionCount,
    feedbackCount,
    estimatedInputTokens,
    estimatedOutputTokens,
    totalEstimatedTokens,
    estimatedCost,
    warningLevel,
    warningMessage,
  };
}