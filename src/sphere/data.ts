import { Planet, TechNode } from './types';

const PLANET_NAMES = [
  'Terra Prime', 'Helios IV', 'Cryos', 'Nebula Gate', 'Pyraxis',
  'Oceanus', 'Verdantia', 'Ashfall', 'Luminara', 'Oblivion',
  'Nexus Station', 'Zephyra', 'Ironveil', 'Starholm', 'Duskworld',
  'Aurelia', 'Voidspire', 'Tempestia', 'Crystallis', 'Sovereign'
];

const PLANET_TYPES: Planet['type'][] = [
  'terran', 'desert', 'ice', 'gas', 'volcanic', 'ocean', 'jungle', 'barren',
  'terran', 'ice', 'gas', 'desert', 'volcanic', 'ocean', 'jungle', 'barren',
  'terran', 'gas', 'ice', 'desert'
];

const PLANET_COLORS = [
  '#4a90d9', '#d4a853', '#a8d8ea', '#c98fd9', '#e85d3a',
  '#2d8a9e', '#5cb85c', '#8b7355', '#f0d78c', '#4a4a4a',
  '#c9a84c', '#7dd3fc', '#718096', '#e8c07a', '#574b90',
  '#f9a8a8', '#6c5ce7', '#5cbdb9', '#a78bfa', '#e94560'
];

export function generatePlanets(): Planet[] {
  return PLANET_NAMES.map((name, i) => {
    const angle = (i / 20) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
    const ring = Math.floor(i / 5);
    const orbitRadius = 8 + ring * 6 + Math.random() * 2;
    const y = (Math.random() - 0.5) * 4;

    const owner: Planet['owner'] = i === 0 ? 'player' : i >= 17 ? 'enemy' : 'neutral';

    return {
      id: `planet-${i}`,
      name,
      position: [
        Math.cos(angle) * orbitRadius,
        y,
        Math.sin(angle) * orbitRadius
      ],
      radius: 0.6 + Math.random() * 0.5,
      color: PLANET_COLORS[i],
      type: PLANET_TYPES[i],
      resources: {
        minerals: Math.floor(50 + Math.random() * 200),
        energy: Math.floor(30 + Math.random() * 150),
        food: Math.floor(20 + Math.random() * 100),
        credits: Math.floor(100 + Math.random() * 300),
        research: Math.floor(10 + Math.random() * 50),
      },
      owner,
      population: owner === 'player' ? 1000 : owner === 'enemy' ? 800 : Math.floor(Math.random() * 200),
      maxPopulation: 5000,
      defense: owner === 'player' ? 50 : owner === 'enemy' ? 40 : 10,
      buildings: owner === 'player' ? [
        { id: 'b1', type: 'mine', level: 1, active: true },
        { id: 'b2', type: 'solar_array', level: 1, active: true },
        { id: 'b3', type: 'farm', level: 1, active: true },
      ] : [],
      orbitSpeed: 0.001 + Math.random() * 0.002,
      orbitRadius,
      orbitAngle: angle,
    };
  });
}

export function generateTechTree(): TechNode[] {
  return [
    { id: 'adv_mining', name: 'Advanced Mining', description: 'Double mineral output', category: 'economy', cost: 200, researchTime: 30000, prerequisites: [], unlocked: false, researching: false, researchEnd: null, effects: '+100% minerals', icon: '⛏️' },
    { id: 'fusion_power', name: 'Fusion Power', description: 'Triple energy output', category: 'economy', cost: 300, researchTime: 45000, prerequisites: [], unlocked: false, researching: false, researchEnd: null, effects: '+200% energy', icon: '⚡' },
    { id: 'hydroponics', name: 'Hydroponics', description: 'Double food production', category: 'economy', cost: 150, researchTime: 25000, prerequisites: [], unlocked: false, researching: false, researchEnd: null, effects: '+100% food', icon: '🌱' },
    { id: 'trade_routes', name: 'Interstellar Trade', description: 'Unlock trade between planets', category: 'economy', cost: 400, researchTime: 60000, prerequisites: ['adv_mining'], unlocked: false, researching: false, researchEnd: null, effects: '+auto trade', icon: '🔗' },
    { id: 'laser_weapons', name: 'Laser Weapons', description: 'Increase ship attack +25%', category: 'military', cost: 250, researchTime: 35000, prerequisites: [], unlocked: false, researching: false, researchEnd: null, effects: '+25% attack', icon: '💥' },
    { id: 'shield_tech', name: 'Shield Tech', description: 'Increase ship defense +25%', category: 'defense', cost: 250, researchTime: 35000, prerequisites: [], unlocked: false, researching: false, researchEnd: null, effects: '+25% defense', icon: '🛡️' },
    { id: 'warp_drive', name: 'Warp Drive', description: 'Double fleet speed', category: 'exploration', cost: 500, researchTime: 60000, prerequisites: ['fusion_power'], unlocked: false, researching: false, researchEnd: null, effects: '+100% speed', icon: '🌀' },
    { id: 'plasma_cannon', name: 'Plasma Cannon', description: 'Unlock battleships', category: 'military', cost: 600, researchTime: 80000, prerequisites: ['laser_weapons'], unlocked: false, researching: false, researchEnd: null, effects: 'Battleships', icon: '🔥' },
    { id: 'cloak', name: 'Cloaking Device', description: 'Scouts become invisible', category: 'exploration', cost: 700, researchTime: 90000, prerequisites: ['warp_drive'], unlocked: false, researching: false, researchEnd: null, effects: 'Stealth scouts', icon: '👻' },
    { id: 'dyson_sphere', name: 'Dyson Sphere', description: 'Unlimited energy on one planet', category: 'economy', cost: 1000, researchTime: 120000, prerequisites: ['fusion_power', 'trade_routes'], unlocked: false, researching: false, researchEnd: null, effects: '∞ energy', icon: '☀️' },
    { id: 'planet_shield', name: 'Planetary Shield', description: '+50% planet defense', category: 'defense', cost: 450, researchTime: 50000, prerequisites: ['shield_tech'], unlocked: false, researching: false, researchEnd: null, effects: '+50% defense', icon: '🔰' },
    { id: 'carrier_tech', name: 'Carrier Tech', description: 'Unlock carriers', category: 'military', cost: 550, researchTime: 70000, prerequisites: ['plasma_cannon'], unlocked: false, researching: false, researchEnd: null, effects: 'Carriers', icon: '🛳️' },
  ];
}
