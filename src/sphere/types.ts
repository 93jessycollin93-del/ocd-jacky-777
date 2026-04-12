export interface Planet {
  id: string;
  name: string;
  position: [number, number, number];
  radius: number;
  color: string;
  type: 'terran' | 'desert' | 'ice' | 'gas' | 'volcanic' | 'ocean' | 'jungle' | 'barren';
  resources: PlanetResources;
  owner: 'player' | 'enemy' | 'neutral';
  population: number;
  maxPopulation: number;
  defense: number;
  buildings: PlanetBuilding[];
  orbitSpeed: number;
  orbitRadius: number;
  orbitAngle: number;
}

export interface PlanetResources {
  minerals: number;
  energy: number;
  food: number;
  credits: number;
  research: number;
}

export interface PlanetBuilding {
  id: string;
  type: BuildingType;
  level: number;
  active: boolean;
}

export type BuildingType = 
  | 'mine' | 'solar_array' | 'farm' | 'trade_hub' | 'lab'
  | 'shipyard' | 'shield_gen' | 'barracks' | 'sensor_array' | 'space_dock';

export interface Fleet {
  id: string;
  name: string;
  owner: 'player' | 'enemy';
  ships: Ship[];
  position: [number, number, number];
  destination: string | null;
  originPlanet: string;
  arrivalTime: number | null;
  status: 'idle' | 'moving' | 'combat' | 'orbiting';
}

export interface Ship {
  type: ShipType;
  count: number;
  hp: number;
  maxHp: number;
}

export type ShipType = 'scout' | 'fighter' | 'cruiser' | 'battleship' | 'carrier' | 'transport' | 'colony_ship';

export interface TechNode {
  id: string;
  name: string;
  description: string;
  category: 'military' | 'economy' | 'exploration' | 'defense';
  cost: number;
  researchTime: number;
  prerequisites: string[];
  unlocked: boolean;
  researching: boolean;
  researchEnd: number | null;
  effects: string;
  icon: string;
}

export interface LogEntry {
  id: string;
  time: number;
  type: 'combat' | 'diplomacy' | 'economy' | 'discovery' | 'research' | 'alert';
  message: string;
  planetId?: string;
}

export interface SphereGameState {
  turn: number;
  planets: Planet[];
  fleets: Fleet[];
  tech: TechNode[];
  log: LogEntry[];
  globalResources: PlanetResources;
  selectedPlanet: string | null;
  selectedFleet: string | null;
  view: 'galaxy' | 'planet' | 'tech' | 'fleets' | 'log' | 'diplomacy';
  gameSpeed: number;
  paused: boolean;
  victoryProgress: number;
  difficulty: 'easy' | 'normal' | 'hard';
}

export const SHIP_STATS: Record<ShipType, { attack: number; defense: number; speed: number; cost: number; icon: string }> = {
  scout:       { attack: 2,  defense: 1,  speed: 10, cost: 50,   icon: '🛸' },
  fighter:     { attack: 5,  defense: 3,  speed: 8,  cost: 100,  icon: '✈️' },
  cruiser:     { attack: 12, defense: 10, speed: 5,  cost: 300,  icon: '🚀' },
  battleship:  { attack: 25, defense: 20, speed: 3,  cost: 800,  icon: '⚔️' },
  carrier:     { attack: 8,  defense: 15, speed: 4,  cost: 600,  icon: '🛳️' },
  transport:   { attack: 1,  defense: 5,  speed: 6,  cost: 150,  icon: '📦' },
  colony_ship: { attack: 0,  defense: 3,  speed: 2,  cost: 500,  icon: '🏗️' },
};

export const BUILDING_INFO: Record<BuildingType, { name: string; icon: string; description: string; baseCost: number }> = {
  mine:         { name: 'Deep Mine',       icon: '⛏️', description: '+minerals/turn', baseCost: 100 },
  solar_array:  { name: 'Solar Array',     icon: '☀️', description: '+energy/turn', baseCost: 80 },
  farm:         { name: 'Hydro Farm',      icon: '🌾', description: '+food/turn', baseCost: 60 },
  trade_hub:    { name: 'Trade Hub',       icon: '💰', description: '+credits/turn', baseCost: 200 },
  lab:          { name: 'Research Lab',     icon: '🔬', description: '+research/turn', baseCost: 250 },
  shipyard:     { name: 'Orbital Shipyard', icon: '🏭', description: 'Build ships', baseCost: 400 },
  shield_gen:   { name: 'Shield Generator', icon: '🛡️', description: '+planet defense', baseCost: 300 },
  barracks:     { name: 'Barracks',        icon: '🏰', description: '+garrison troops', baseCost: 150 },
  sensor_array: { name: 'Sensor Array',    icon: '📡', description: 'Detect incoming fleets', baseCost: 180 },
  space_dock:   { name: 'Space Dock',      icon: '🔧', description: 'Repair & upgrade ships', baseCost: 350 },
};
