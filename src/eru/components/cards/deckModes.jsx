export const DECK_MODE_OPTIONS = [10, 15, 20, 25, 30, 35, 40, 45, 50];

export const DEFAULT_DECK_MODE = 10;

export function normalizeDeckMode(value) {
  const numeric = Number(value);
  return DECK_MODE_OPTIONS.includes(numeric) ? numeric : DEFAULT_DECK_MODE;
}

export function getDeckModeLabel(size) {
  return `${size}-card`;
}

export function getDeckModeBand(size) {
  if (size <= 15) return 'light';
  if (size <= 30) return 'standard';
  if (size <= 40) return 'extended';
  return 'endurance';
}

export function getModeDifficultyScale(size) {
  return 1 + ((normalizeDeckMode(size) - 10) / 40) * 0.32;
}

export function getRecommendedHp(size, teamSize = 1) {
  const base = 25 + Math.round((normalizeDeckMode(size) - 10) * 0.8);
  return base * Math.max(1, teamSize);
}

export function getMinimumDeckForMode(size) {
  return normalizeDeckMode(size);
}

export function calculateDeckStrength(deck = [], deckMode = DEFAULT_DECK_MODE) {
  const normalizedMode = normalizeDeckMode(deckMode);
  const total = deck.reduce((sum, card) => sum + Number(card.power || 0) + Number(card.guard || 0) + Number(card.cost || 0), 0);
  const average = deck.length ? total / deck.length : 0;
  return Math.round(total + average * (normalizedMode / 10));
}

export function areDeckModesCompatible(a, b) {
  return normalizeDeckMode(a) === normalizeDeckMode(b);
}

export function getFairMatchScore({ myElo = 1000, theirElo = 1000, myCollection = 0, theirCollection = 0, myDeckStrength = 0, theirDeckStrength = 0, myDeckMode = DEFAULT_DECK_MODE, theirDeckMode = DEFAULT_DECK_MODE }) {
  const deckModePenalty = areDeckModesCompatible(myDeckMode, theirDeckMode) ? 0 : 10000;
  return deckModePenalty
    + Math.abs(myElo - theirElo)
    + Math.abs(myCollection - theirCollection)
    + Math.abs(myDeckStrength - theirDeckStrength);
}

export function buildDeckModeSummary(size) {
  const normalizedMode = normalizeDeckMode(size);
  const hp = getRecommendedHp(normalizedMode);
  return {
    size: normalizedMode,
    label: getDeckModeLabel(normalizedMode),
    band: getDeckModeBand(normalizedMode),
    recommendedHp: hp,
    aiScale: getModeDifficultyScale(normalizedMode),
  };
}