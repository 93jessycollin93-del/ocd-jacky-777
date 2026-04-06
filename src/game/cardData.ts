// ═══════════════════════════════════════════════════════════════
// 24-CARD STARTER SET — Balanced with Budget = Cost × 2.5 + Rarity
// 3 Factions: Ironclad (🔴), Tideweavers (🔵), Veilborn (🟣)
// ═══════════════════════════════════════════════════════════════

import type { CardDef } from './cardEngine';

export const STARTER_CARDS: CardDef[] = [
  // ════════════════ IRONCLAD FACTION (fire/earth — aggro/midrange) ════════════════

  // 1. Iron Wolf Vanguard — Cost 3 | Budget 7.5
  { id: 'ic01', name: 'Iron Wolf Vanguard', type: 'unit', element: 'fire', rarity: 'common', cost: 3, power: 4, guard: 2, ability: 'Pack Howl', abilityDesc: '+1 Power if another ally in this lane', abilityValue: 1.5, art: '🐺', lane: 'front', keywords: ['pack'], faction: 'Ironclad' },

  // 2. Forgehammer Brute — Cost 4 | Budget 10
  { id: 'ic02', name: 'Forgehammer Brute', type: 'unit', element: 'earth', rarity: 'common', cost: 4, power: 5, guard: 3, ability: 'Crush', abilityDesc: 'Clash: deal 2 bonus damage', abilityValue: 2, art: '🔨', lane: 'front', keywords: ['clash'], faction: 'Ironclad' },

  // 3. Ember Conscript — Cost 1 | Budget 2.5
  { id: 'ic03', name: 'Ember Conscript', type: 'unit', element: 'fire', rarity: 'common', cost: 1, power: 2, guard: 1, ability: 'Spark', abilityDesc: 'No ability', abilityValue: 0, art: '🔥', lane: 'front', faction: 'Ironclad' },

  // 4. Siege Ram — Cost 5 | Budget 12.5
  { id: 'ic04', name: 'Siege Ram', type: 'unit', element: 'earth', rarity: 'rare', cost: 5, power: 6, guard: 4, ability: 'Breach', abilityDesc: 'Ignore 2 Guard when clashing', abilityValue: 3.5, art: '🐏', lane: 'front', keywords: ['siege'], faction: 'Ironclad' },

  // 5. Ash Hex — Cost 4 | Spell | Budget 10
  { id: 'ic05', name: 'Ash Hex', type: 'spell', element: 'fire', rarity: 'uncommon', cost: 4, power: 0, guard: 0, ability: 'Scorch', abilityDesc: 'Deal 3 damage. If target survives, apply Burn 2.', abilityValue: 5.5, art: '💥', faction: 'Ironclad' },

  // 6. Warhorn — Cost 2 | Relic | Budget 5.5
  { id: 'ic06', name: 'Warhorn', type: 'relic', element: 'fire', rarity: 'uncommon', cost: 2, power: 0, guard: 0, ability: 'Rally', abilityDesc: 'All Frontline allies gain +1 Power', abilityValue: 5.5, art: '📯', faction: 'Ironclad' },

  // 7. Molten Berserker — Cost 6 | Budget 16.5 (legendary)
  { id: 'ic07', name: 'Molten Berserker', type: 'unit', element: 'fire', rarity: 'legendary', cost: 6, power: 7, guard: 3, ability: 'Bloodrage', abilityDesc: '+2 Power for each missing Guard', abilityValue: 4.5, art: '🌋', lane: 'front', keywords: ['berserker'], faction: 'Ironclad' },

  // 8. Crown of Thorns — Cost 5 | Relic | Budget 14 (epic)
  { id: 'ic08', name: 'Crown of Thorns', type: 'relic', element: 'earth', rarity: 'epic', cost: 5, power: 0, guard: 0, ability: 'Thorn Aura', abilityDesc: 'When a Frontline ally takes damage, +1 Power to random Midline ally', abilityValue: 14, art: '👑', faction: 'Ironclad' },

  // ════════════════ TIDEWEAVERS FACTION (water/air — control/tempo) ════════════════

  // 9. Tidecaller Adept — Cost 3 | Budget 7.5
  { id: 'tw01', name: 'Tidecaller Adept', type: 'unit', element: 'water', rarity: 'common', cost: 3, power: 3, guard: 3, ability: 'Riptide', abilityDesc: 'Apply Frost 1 to opposing lane unit', abilityValue: 1.5, art: '🌊', lane: 'mid', keywords: ['frost'], faction: 'Tideweavers' },

  // 10. Gale Scout — Cost 2 | Budget 5
  { id: 'tw02', name: 'Gale Scout', type: 'unit', element: 'air', rarity: 'common', cost: 2, power: 2, guard: 2, ability: 'Swift', abilityDesc: 'Draw 1 card when played', abilityValue: 1, art: '💨', lane: 'back', keywords: ['draw'], faction: 'Tideweavers' },

  // 11. Frost Siren — Cost 4 | Budget 10
  { id: 'tw03', name: 'Frost Siren', type: 'unit', element: 'water', rarity: 'uncommon', cost: 4, power: 3, guard: 4, ability: 'Frozen Melody', abilityDesc: 'Apply Frost 2 to strongest enemy unit', abilityValue: 3.5, art: '🧜', lane: 'mid', keywords: ['frost'], faction: 'Tideweavers' },

  // 12. Zephyr Blade — Cost 3 | Spell | Budget 7.5
  { id: 'tw04', name: 'Zephyr Blade', type: 'spell', element: 'air', rarity: 'common', cost: 3, power: 0, guard: 0, ability: 'Gust', abilityDesc: 'Deal 2 damage and move target to another lane', abilityValue: 7.5, art: '🗡️', faction: 'Tideweavers' },

  // 13. Coral Bulwark — Cost 5 | Budget 13.5 (rare)
  { id: 'tw05', name: 'Coral Bulwark', type: 'unit', element: 'water', rarity: 'rare', cost: 5, power: 4, guard: 6, ability: 'Reef Wall', abilityDesc: 'Adjacent allies gain +2 Guard', abilityValue: 4.5, art: '🪸', lane: 'front', keywords: ['guard'], faction: 'Tideweavers' },

  // 14. Tempest Oracle — Cost 7 | Budget 19.5 (legendary)
  { id: 'tw06', name: 'Tempest Oracle', type: 'unit', element: 'air', rarity: 'legendary', cost: 7, power: 5, guard: 4, ability: 'Storm Surge', abilityDesc: 'Deal 2 damage to ALL enemy units. Draw 2.', abilityValue: 8.5, art: '⛈️', lane: 'back', keywords: ['aoe', 'draw'], faction: 'Tideweavers' },

  // 15. Mist Veil — Cost 1 | Spell | Budget 2.5
  { id: 'tw07', name: 'Mist Veil', type: 'spell', element: 'water', rarity: 'common', cost: 1, power: 0, guard: 0, ability: 'Cloak', abilityDesc: 'Grant Shield to one ally', abilityValue: 2.5, art: '🌫️', faction: 'Tideweavers' },

  // 16. Whirlpool Trap — Cost 3 | Relic | Budget 8 (uncommon)
  { id: 'tw08', name: 'Whirlpool Trap', type: 'relic', element: 'water', rarity: 'uncommon', cost: 3, power: 0, guard: 0, ability: 'Drag', abilityDesc: 'Enemy units entering Frontline lose 1 Power', abilityValue: 8, art: '🌀', faction: 'Tideweavers' },

  // ════════════════ VEILBORN FACTION (shadow/light — combo/value) ════════════════

  // 17. Shade Acolyte — Cost 2 | Budget 5
  { id: 'vb01', name: 'Shade Acolyte', type: 'unit', element: 'shadow', rarity: 'common', cost: 2, power: 3, guard: 1, ability: 'Leech', abilityDesc: 'On clash: heal 1 Power', abilityValue: 1, art: '🌑', lane: 'mid', keywords: ['leech'], faction: 'Veilborn' },

  // 18. Luminary Priest — Cost 3 | Budget 7.5
  { id: 'vb02', name: 'Luminary Priest', type: 'unit', element: 'light', rarity: 'common', cost: 3, power: 2, guard: 3, ability: 'Heal Light', abilityDesc: 'Restore 2 Power to an ally', abilityValue: 2.5, art: '✨', lane: 'back', keywords: ['heal'], faction: 'Veilborn' },

  // 19. Phantom Blade — Cost 4 | Budget 11 (uncommon)
  { id: 'vb03', name: 'Phantom Blade', type: 'unit', element: 'shadow', rarity: 'uncommon', cost: 4, power: 5, guard: 2, ability: 'Combo Strike', abilityDesc: '+50% damage on 2nd+ card this turn', abilityValue: 3.5, art: '🗡️', lane: 'front', keywords: ['combo'], faction: 'Veilborn' },

  // 20. Soul Reaper — Cost 6 | Budget 16.5 (epic)
  { id: 'vb04', name: 'Soul Reaper', type: 'unit', element: 'shadow', rarity: 'epic', cost: 6, power: 6, guard: 4, ability: 'Soul Harvest', abilityDesc: 'When enemy unit dies, gain +2 Power', abilityValue: 5, art: '💀', lane: 'front', keywords: ['harvest'], faction: 'Veilborn' },

  // 21. Eclipse — Cost 5 | Spell | Budget 14 (epic)
  { id: 'vb05', name: 'Eclipse', type: 'spell', element: 'shadow', rarity: 'epic', cost: 5, power: 0, guard: 0, ability: 'Void Blast', abilityDesc: 'Destroy target with 3 or less Power. Apply Bleed 3 to another.', abilityValue: 14, art: '🌑', faction: 'Veilborn' },

  // 22. Grave Choir — Cost 7 | Budget 20 (legendary)
  { id: 'vb06', name: 'Grave Choir', type: 'unit', element: 'shadow', rarity: 'legendary', cost: 7, power: 4, guard: 3, ability: 'Risen Host', abilityDesc: 'Summon two 3/2 Shades. If a unit died this turn, they gain Rush.', abilityValue: 11, art: '👻', lane: 'mid', keywords: ['summon'], faction: 'Veilborn' },

  // 23. Radiant Aegis — Cost 4 | Relic | Budget 11.5 (rare)
  { id: 'vb07', name: 'Radiant Aegis', type: 'relic', element: 'light', rarity: 'rare', cost: 4, power: 0, guard: 0, ability: 'Holy Shield', abilityDesc: 'Grant Shield to all allies at start of each turn', abilityValue: 11.5, art: '🛡️', faction: 'Veilborn' },

  // 24. Twilight Dancer — Cost 3 | Budget 8.5 (rare)
  { id: 'vb08', name: 'Twilight Dancer', type: 'unit', element: 'light', rarity: 'rare', cost: 3, power: 3, guard: 2, ability: 'Phase Shift', abilityDesc: 'Move to any lane after each turn. +1 Power per lane change.', abilityValue: 3.5, art: '💃', lane: 'mid', keywords: ['phase'], faction: 'Veilborn' },
];

// Build faction decks by duplicating cards up to deck size
export function buildFactionDeck(faction: string): CardDef[] {
  const factionCards = STARTER_CARDS.filter(c => c.faction === faction);
  const deck: CardDef[] = [];
  // Fill with 2 copies of each (up to 16), then pad with cheapest
  for (const card of factionCards) {
    deck.push({ ...card, id: `${card.id}_1` });
    deck.push({ ...card, id: `${card.id}_2` });
  }
  // Pad remaining slots with extra copies of cheap cards
  const cheapCards = factionCards.filter(c => c.cost <= 3).sort((a, b) => a.cost - b.cost);
  let i = 0;
  while (deck.length < 30 && cheapCards.length > 0) {
    const c = cheapCards[i % cheapCards.length];
    deck.push({ ...c, id: `${c.id}_extra_${deck.length}` });
    i++;
  }
  return deck.slice(0, 30);
}

export const FACTION_ICONS: Record<string, string> = {
  Ironclad: '🔴',
  Tideweavers: '🔵',
  Veilborn: '🟣',
};

export const FACTIONS = ['Ironclad', 'Tideweavers', 'Veilborn'] as const;
