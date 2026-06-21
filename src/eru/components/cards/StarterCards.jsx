// Starter card pool — used when player has no collection yet
export const ELEMENT_COLORS = {
  fire:   { bg: 'from-red-900/80 to-orange-900/80', border: 'border-red-500/60', glow: 'shadow-red-500/40',   text: 'text-red-400',    icon: '🔥' },
  water:  { bg: 'from-blue-900/80 to-cyan-900/80',  border: 'border-blue-500/60', glow: 'shadow-blue-500/40', text: 'text-blue-400',   icon: '💧' },
  earth:  { bg: 'from-green-900/80 to-lime-900/80', border: 'border-green-500/60',glow: 'shadow-green-500/40',text: 'text-green-400',  icon: '🌿' },
  wind:   { bg: 'from-purple-900/80 to-indigo-900/80',border:'border-purple-500/60',glow:'shadow-purple-500/40',text:'text-purple-400',icon: '🌪️' },
  shadow: { bg: 'from-gray-900/80 to-slate-900/80', border: 'border-gray-500/60', glow: 'shadow-gray-500/40', text: 'text-gray-400',   icon: '🌑' },
  light:  { bg: 'from-yellow-900/80 to-amber-900/80',border:'border-yellow-500/60',glow:'shadow-yellow-500/40',text:'text-yellow-400', icon: '✨' },
};

export const RARITY_STYLES = {
  common:    { label: 'Common',    color: 'text-gray-400',   border: 'border-gray-500/40',   stars: 1 },
  rare:      { label: 'Rare',      color: 'text-blue-400',   border: 'border-blue-500/60',   stars: 2 },
  epic:      { label: 'Epic',      color: 'text-purple-400', border: 'border-purple-500/60', stars: 3 },
  legendary: { label: 'Legendary', color: 'text-yellow-400', border: 'border-yellow-500/60', stars: 4 },
  mythic:    { label: 'Mythic',    color: 'text-pink-400',   border: 'border-pink-500/60',   stars: 5 },
};

export const ABILITY_LABELS = {
  burn:    { label: 'Burn',    color: 'text-orange-400', desc: 'Deals damage over time' },
  frost:   { label: 'Frost',   color: 'text-cyan-400',   desc: 'Reduces enemy power' },
  poison:  { label: 'Poison',  color: 'text-green-400',  desc: 'Scales with enemy HP' },
  shield:  { label: 'Shield',  color: 'text-blue-400',   desc: 'Blocks one damage source' },
  combo:   { label: 'Combo',   color: 'text-yellow-400', desc: '+25% per prior combo card' },
  clash:   { label: 'Clash',   color: 'text-red-400',    desc: 'Direct unit vs unit' },
  summon:  { label: 'Summon',  color: 'text-purple-400', desc: 'Creates an ally token' },
  draw:    { label: 'Draw',    color: 'text-indigo-400', desc: 'Draw extra cards' },
  heal:    { label: 'Heal',    color: 'text-pink-400',   desc: 'Restore HP' },
};

// Element advantage matrix: key beats values
export const ELEMENT_ADVANTAGE = {
  fire:   ['earth', 'wind'],
  water:  ['fire', 'shadow'],
  earth:  ['wind', 'water'],
  wind:   ['water', 'shadow'],
  shadow: ['light', 'earth'],
  light:  ['shadow', 'fire'],
};

export function getElementMultiplier(attackerEl, defenderEl) {
  if (ELEMENT_ADVANTAGE[attackerEl]?.includes(defenderEl)) return 1.5;
  if (ELEMENT_ADVANTAGE[defenderEl]?.includes(attackerEl)) return 0.7;
  return 1.0;
}

export const STARTER_CARDS = [
  // FIRE — Ember Clan
  { id: 's1',  name: 'Ember Scout',     cost: 1, power: 2, guard: 1, element: 'fire',   faction: 'Ember Clan',   card_type: 'unit',  rarity: 'common',    ability: 'burn',   ability_value: 1, flavor_text: 'First to strike, last to fall.' },
  { id: 's2',  name: 'Blaze Warden',    cost: 3, power: 4, guard: 2, element: 'fire',   faction: 'Ember Clan',   card_type: 'unit',  rarity: 'rare',      ability: 'combo',  ability_value: 2, flavor_text: 'The chain ignites.' },
  { id: 's3',  name: 'Inferno Drake',   cost: 5, power: 6, guard: 3, element: 'fire',   faction: 'Ember Clan',   card_type: 'unit',  rarity: 'epic',      ability: 'burn',   ability_value: 3, flavor_text: 'Its breath forges new battlefields.' },
  { id: 's4',  name: 'Ashborn Titan',   cost: 7, power: 9, guard: 5, element: 'fire',   faction: 'Ember Clan',   card_type: 'unit',  rarity: 'legendary', ability: 'clash',  ability_value: 5, flavor_text: 'Born from the first fire.' },
  // WATER — Tide Order
  { id: 's5',  name: 'Tide Sprite',     cost: 1, power: 1, guard: 2, element: 'water',  faction: 'Tide Order',   card_type: 'unit',  rarity: 'common',    ability: 'shield', ability_value: 1, flavor_text: 'Flows around any obstacle.' },
  { id: 's6',  name: 'Coral Defender',  cost: 2, power: 2, guard: 3, element: 'water',  faction: 'Tide Order',   card_type: 'unit',  rarity: 'rare',      ability: 'heal',   ability_value: 2, flavor_text: 'The reef remembers.' },
  { id: 's7',  name: 'Storm Leviathan', cost: 4, power: 5, guard: 3, element: 'water',  faction: 'Tide Order',   card_type: 'unit',  rarity: 'epic',      ability: 'frost',  ability_value: 2, flavor_text: 'Silence precedes the surge.' },
  { id: 's8',  name: 'Abyssal Oracle',  cost: 6, power: 7, guard: 4, element: 'water',  faction: 'Tide Order',   card_type: 'unit',  rarity: 'legendary', ability: 'draw',   ability_value: 2, flavor_text: 'Reads the tides of fate.' },
  // EARTH — Stone Legion
  { id: 's9',  name: 'Rock Golem',      cost: 2, power: 2, guard: 4, element: 'earth',  faction: 'Stone Legion', card_type: 'unit',  rarity: 'common',    ability: null,     ability_value: 0, flavor_text: 'Patience is its weapon.' },
  { id: 's10', name: 'Iron Root',       cost: 3, power: 3, guard: 4, element: 'earth',  faction: 'Stone Legion', card_type: 'unit',  rarity: 'rare',      ability: 'poison', ability_value: 2, flavor_text: 'Grows stronger in darkness.' },
  { id: 's11', name: 'Granite Colossus',cost: 5, power: 5, guard: 6, element: 'earth',  faction: 'Stone Legion', card_type: 'unit',  rarity: 'epic',      ability: 'summon', ability_value: 2, flavor_text: 'Its footsteps split the earth.' },
  { id: 's12', name: 'World Shaper',    cost: 7, power: 8, guard: 7, element: 'earth',  faction: 'Stone Legion', card_type: 'unit',  rarity: 'legendary', ability: 'summon', ability_value: 4, flavor_text: 'Older than mountains.' },
  // WIND — Gale Court
  { id: 's13', name: 'Wind Dancer',     cost: 1, power: 3, guard: 1, element: 'wind',   faction: 'Gale Court',   card_type: 'unit',  rarity: 'common',    ability: 'combo',  ability_value: 1, flavor_text: 'Swift as thought.' },
  { id: 's14', name: 'Storm Hawk',      cost: 2, power: 4, guard: 1, element: 'wind',   faction: 'Gale Court',   card_type: 'unit',  rarity: 'rare',      ability: 'combo',  ability_value: 2, flavor_text: 'Precision in the chaos.' },
  { id: 's15', name: 'Cyclone Sage',    cost: 4, power: 5, guard: 2, element: 'wind',   faction: 'Gale Court',   card_type: 'spell', rarity: 'epic',      ability: 'frost',  ability_value: 3, flavor_text: 'Words cut like blades.' },
  { id: 's16', name: 'Tempest Lord',    cost: 6, power: 8, guard: 3, element: 'wind',   faction: 'Gale Court',   card_type: 'unit',  rarity: 'legendary', ability: 'combo',  ability_value: 4, flavor_text: 'Commands the sky itself.' },
  // SHADOW — Void Syndicate
  { id: 's17', name: 'Shadow Imp',      cost: 1, power: 2, guard: 1, element: 'shadow', faction: 'Void Syndicate',card_type:'unit',  rarity: 'common',    ability: 'poison', ability_value: 1, flavor_text: 'Unseen until it is too late.' },
  { id: 's18', name: 'Hex Crawler',     cost: 3, power: 3, guard: 2, element: 'shadow', faction: 'Void Syndicate',card_type:'unit',  rarity: 'rare',      ability: 'burn',   ability_value: 2, flavor_text: 'Leaves curses where it walks.' },
  { id: 's19', name: 'Void Reaper',     cost: 5, power: 6, guard: 2, element: 'shadow', faction: 'Void Syndicate',card_type:'unit',  rarity: 'epic',      ability: 'clash',  ability_value: 3, flavor_text: 'Harvests what fear plants.' },
  { id: 's20', name: 'Darkness Sovereign',cost:7,power: 8, guard: 4, element: 'shadow', faction: 'Void Syndicate',card_type:'unit',  rarity: 'legendary', ability: 'poison', ability_value: 5, flavor_text: 'The void answers to none.' },
  // LIGHT — Dawn Conclave
  { id: 's21', name: 'Luminary',        cost: 1, power: 1, guard: 2, element: 'light',  faction: 'Dawn Conclave',card_type: 'unit',  rarity: 'common',    ability: 'heal',   ability_value: 1, flavor_text: 'Hope given form.' },
  { id: 's22', name: 'Sacred Knight',   cost: 3, power: 3, guard: 3, element: 'light',  faction: 'Dawn Conclave',card_type: 'unit',  rarity: 'rare',      ability: 'shield', ability_value: 2, flavor_text: 'The shield that never breaks.' },
  { id: 's23', name: 'Radiant Seraph',  cost: 5, power: 5, guard: 4, element: 'light',  faction: 'Dawn Conclave',card_type: 'unit',  rarity: 'epic',      ability: 'heal',   ability_value: 3, flavor_text: 'Its presence alone heals wounds.' },
  { id: 's24', name: 'Celestial Arbiter',cost:6, power: 7, guard: 5, element: 'light',  faction: 'Dawn Conclave',card_type: 'unit',  rarity: 'legendary', ability: 'shield', ability_value: 4, flavor_text: 'Judge, jury, and salvation.' },
];

// Generate AI deck for a given difficulty and deck size
export function generateAIDeck(difficulty, factionOverride = null, deckSize = 10) {
  const factions = ['Ember Clan', 'Tide Order', 'Stone Legion', 'Gale Court', 'Void Syndicate', 'Dawn Conclave'];
  const faction = factionOverride || factions[Math.floor(Math.random() * factions.length)];
  const pool = STARTER_CARDS.filter(c => c.faction === faction);
  const targetSize = Math.max(10, Number(deckSize || 10));
  const sizeScale = 1 + ((targetSize - 10) / 40) * 0.28;

  const sorted = [...pool].sort((a, b) => {
    const rarityOrder = { common: 1, rare: 2, epic: 3, legendary: 4, mythic: 5 };
    return (rarityOrder[b.rarity] * difficulty) - (rarityOrder[a.rarity] * difficulty);
  });

  const expanded = [];
  let cursor = 0;
  while (expanded.length < targetSize) {
    const source = sorted[cursor % sorted.length] || STARTER_CARDS[cursor % STARTER_CARDS.length];
    expanded.push({
      ...source,
      id: `ai_${source.id}_${cursor}_${targetSize}`,
      power: Math.max(1, Math.round(source.power * (1 + (difficulty - 1) * 0.16) * sizeScale)),
      guard: Math.max(0, Math.round(source.guard * (1 + (difficulty - 1) * 0.12) * sizeScale)),
    });
    cursor += 1;
  }

  return expanded;
}