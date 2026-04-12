import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import { SphereGameState, Planet, Fleet, LogEntry, Ship, SHIP_STATS, PlanetResources } from './types';
import { generatePlanets, generateTechTree } from './data';

const SAVE_KEY = 'sphere_command_save';

function createInitialState(): SphereGameState {
  return {
    turn: 1,
    planets: generatePlanets(),
    fleets: [{
      id: 'fleet-1',
      name: 'Alpha Fleet',
      owner: 'player',
      ships: [
        { type: 'scout', count: 3, hp: 10, maxHp: 10 },
        { type: 'fighter', count: 5, hp: 30, maxHp: 30 },
        { type: 'cruiser', count: 2, hp: 100, maxHp: 100 },
      ],
      position: [0, 0, 0],
      destination: null,
      originPlanet: 'planet-0',
      arrivalTime: null,
      status: 'orbiting',
    }],
    tech: generateTechTree(),
    log: [{ id: 'log-0', time: Date.now(), type: 'discovery', message: 'Sphere Command initialized. 20 planets detected.' }],
    globalResources: { minerals: 500, energy: 300, food: 200, credits: 1000, research: 50 },
    selectedPlanet: 'planet-0',
    selectedFleet: null,
    view: 'galaxy',
    gameSpeed: 1,
    paused: false,
    victoryProgress: 5,
    difficulty: 'normal',
  };
}

type Action =
  | { type: 'SELECT_PLANET'; id: string | null }
  | { type: 'SELECT_FLEET'; id: string | null }
  | { type: 'SET_VIEW'; view: SphereGameState['view'] }
  | { type: 'TICK' }
  | { type: 'BUILD'; planetId: string; buildingType: string }
  | { type: 'UPGRADE_BUILDING'; planetId: string; buildingId: string }
  | { type: 'BUILD_SHIP'; planetId: string; shipType: string; count: number }
  | { type: 'SEND_FLEET'; fleetId: string; targetPlanetId: string }
  | { type: 'START_RESEARCH'; techId: string }
  | { type: 'TOGGLE_PAUSE' }
  | { type: 'SET_SPEED'; speed: number }
  | { type: 'ADD_LOG'; entry: LogEntry }
  | { type: 'COLONIZE'; planetId: string }
  | { type: 'LOAD_STATE'; state: SphereGameState };

function addResources(a: PlanetResources, b: Partial<PlanetResources>): PlanetResources {
  return {
    minerals: a.minerals + (b.minerals || 0),
    energy: a.energy + (b.energy || 0),
    food: a.food + (b.food || 0),
    credits: a.credits + (b.credits || 0),
    research: a.research + (b.research || 0),
  };
}

function reducer(state: SphereGameState, action: Action): SphereGameState {
  switch (action.type) {
    case 'SELECT_PLANET':
      return { ...state, selectedPlanet: action.id };
    case 'SELECT_FLEET':
      return { ...state, selectedFleet: action.id };
    case 'SET_VIEW':
      return { ...state, view: action.view };
    case 'TOGGLE_PAUSE':
      return { ...state, paused: !state.paused };
    case 'SET_SPEED':
      return { ...state, gameSpeed: action.speed };
    case 'LOAD_STATE':
      return action.state;

    case 'TICK': {
      if (state.paused) return state;
      const now = Date.now();
      let newRes = { ...state.globalResources };
      const newLog = [...state.log];

      // Resource generation from owned planets
      const newPlanets = state.planets.map(p => {
        if (p.owner !== 'player') return p;
        const production: Partial<PlanetResources> = {};
        p.buildings.forEach(b => {
          if (!b.active) return;
          const mult = b.level;
          switch (b.type) {
            case 'mine': production.minerals = (production.minerals || 0) + 5 * mult; break;
            case 'solar_array': production.energy = (production.energy || 0) + 4 * mult; break;
            case 'farm': production.food = (production.food || 0) + 3 * mult; break;
            case 'trade_hub': production.credits = (production.credits || 0) + 8 * mult; break;
            case 'lab': production.research = (production.research || 0) + 2 * mult; break;
          }
        });
        newRes = addResources(newRes, production);
        // Population growth
        const popGrowth = Math.min(p.maxPopulation - p.population, Math.floor(p.population * 0.01));
        return { ...p, population: p.population + popGrowth };
      });

      // Fleet movement
      const newFleets = state.fleets.map(f => {
        if (f.status === 'moving' && f.arrivalTime && now >= f.arrivalTime) {
          const target = newPlanets.find(p => p.id === f.destination);
          if (target) {
            if (target.owner !== f.owner) {
              // Combat
              const attackPower = f.ships.reduce((s, ship) => s + SHIP_STATS[ship.type].attack * ship.count, 0);
              const defensePower = target.defense + (target.owner === 'enemy' ? 30 : 10);
              if (attackPower > defensePower) {
                const planetIdx = newPlanets.findIndex(p => p.id === target.id);
                newPlanets[planetIdx] = { ...target, owner: f.owner, defense: Math.floor(attackPower * 0.3) };
                newLog.push({ id: `log-${now}`, time: now, type: 'combat', message: `${f.name} conquered ${target.name}!`, planetId: target.id });
              } else {
                newLog.push({ id: `log-${now}`, time: now, type: 'combat', message: `${f.name} was repelled at ${target.name}`, planetId: target.id });
              }
            }
            return { ...f, status: 'orbiting' as const, destination: null, arrivalTime: null, position: [...target.position] as [number, number, number] };
          }
        }
        return f;
      });

      // Tech completion
      const newTech = state.tech.map(t => {
        if (t.researching && t.researchEnd && now >= t.researchEnd) {
          newLog.push({ id: `log-tech-${now}`, time: now, type: 'research', message: `Research complete: ${t.name}` });
          return { ...t, unlocked: true, researching: false, researchEnd: null };
        }
        return t;
      });

      // Victory progress
      const playerPlanets = newPlanets.filter(p => p.owner === 'player').length;
      const victoryProgress = Math.floor((playerPlanets / 20) * 100);

      return {
        ...state,
        turn: state.turn + 1,
        planets: newPlanets,
        fleets: newFleets,
        tech: newTech,
        log: newLog.slice(-100),
        globalResources: newRes,
        victoryProgress,
      };
    }

    case 'BUILD': {
      const { planetId, buildingType } = action;
      const planet = state.planets.find(p => p.id === planetId);
      if (!planet || planet.owner !== 'player') return state;
      const newBuilding = { id: `b-${Date.now()}`, type: buildingType as any, level: 1, active: true };
      return {
        ...state,
        planets: state.planets.map(p => p.id === planetId ? { ...p, buildings: [...p.buildings, newBuilding] } : p),
        globalResources: { ...state.globalResources, credits: state.globalResources.credits - 100 },
      };
    }

    case 'UPGRADE_BUILDING': {
      const { planetId, buildingId } = action;
      const cost = 150;
      if (state.globalResources.credits < cost) return state;
      return {
        ...state,
        planets: state.planets.map(p => p.id === planetId
          ? { ...p, buildings: p.buildings.map(b => b.id === buildingId ? { ...b, level: b.level + 1 } : b) }
          : p),
        globalResources: { ...state.globalResources, credits: state.globalResources.credits - cost },
      };
    }

    case 'BUILD_SHIP': {
      const { planetId, shipType, count } = action;
      const cost = SHIP_STATS[shipType as keyof typeof SHIP_STATS].cost * count;
      if (state.globalResources.credits < cost) return state;
      const fleet = state.fleets.find(f => f.owner === 'player' && f.originPlanet === planetId && f.status === 'orbiting');
      if (!fleet) return state;
      const existingShip = fleet.ships.find(s => s.type === shipType);
      const newShips = existingShip
        ? fleet.ships.map(s => s.type === shipType ? { ...s, count: s.count + count } : s)
        : [...fleet.ships, { type: shipType as any, count, hp: 100, maxHp: 100 }];
      return {
        ...state,
        fleets: state.fleets.map(f => f.id === fleet.id ? { ...f, ships: newShips } : f),
        globalResources: { ...state.globalResources, credits: state.globalResources.credits - cost },
        log: [...state.log, { id: `log-${Date.now()}`, time: Date.now(), type: 'economy' as const, message: `Built ${count}x ${shipType} at ${state.planets.find(p => p.id === planetId)?.name}` }],
      };
    }

    case 'SEND_FLEET': {
      const { fleetId, targetPlanetId } = action;
      const target = state.planets.find(p => p.id === targetPlanetId);
      if (!target) return state;
      const fleet = state.fleets.find(f => f.id === fleetId);
      if (!fleet) return state;
      const travelTime = 10000; // 10 seconds base
      return {
        ...state,
        fleets: state.fleets.map(f => f.id === fleetId ? {
          ...f, status: 'moving' as const, destination: targetPlanetId,
          arrivalTime: Date.now() + travelTime
        } : f),
        log: [...state.log, { id: `log-${Date.now()}`, time: Date.now(), type: 'alert' as const, message: `${fleet.name} dispatched to ${target.name}` }],
      };
    }

    case 'START_RESEARCH': {
      const tech = state.tech.find(t => t.id === action.techId);
      if (!tech || tech.unlocked || tech.researching) return state;
      if (state.globalResources.research < tech.cost) return state;
      const prereqsMet = tech.prerequisites.every(p => state.tech.find(t => t.id === p)?.unlocked);
      if (!prereqsMet) return state;
      return {
        ...state,
        tech: state.tech.map(t => t.id === action.techId ? { ...t, researching: true, researchEnd: Date.now() + t.researchTime } : t),
        globalResources: { ...state.globalResources, research: state.globalResources.research - tech.cost },
      };
    }

    case 'COLONIZE': {
      const planet = state.planets.find(p => p.id === action.planetId);
      if (!planet || planet.owner !== 'neutral') return state;
      if (state.globalResources.credits < 500) return state;
      return {
        ...state,
        planets: state.planets.map(p => p.id === action.planetId ? {
          ...p, owner: 'player' as const, population: 100,
          buildings: [{ id: `b-${Date.now()}`, type: 'mine' as const, level: 1, active: true }]
        } : p),
        globalResources: { ...state.globalResources, credits: state.globalResources.credits - 500 },
        log: [...state.log, { id: `log-${Date.now()}`, time: Date.now(), type: 'discovery' as const, message: `Colonized ${planet.name}!` }],
      };
    }

    case 'ADD_LOG':
      return { ...state, log: [...state.log, action.entry].slice(-100) };

    default:
      return state;
  }
}

interface SphereContextType {
  state: SphereGameState;
  dispatch: React.Dispatch<Action>;
  selectPlanet: (id: string | null) => void;
  selectFleet: (id: string | null) => void;
  setView: (v: SphereGameState['view']) => void;
}

const SphereContext = createContext<SphereContextType | null>(null);

export function SphereProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, null, () => {
    try {
      const saved = localStorage.getItem(SAVE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return createInitialState();
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  // Auto-save
  useEffect(() => {
    const interval = setInterval(() => {
      localStorage.setItem(SAVE_KEY, JSON.stringify(stateRef.current));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Game tick
  useEffect(() => {
    const interval = setInterval(() => {
      dispatch({ type: 'TICK' });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const selectPlanet = useCallback((id: string | null) => dispatch({ type: 'SELECT_PLANET', id }), []);
  const selectFleet = useCallback((id: string | null) => dispatch({ type: 'SELECT_FLEET', id }), []);
  const setView = useCallback((v: SphereGameState['view']) => dispatch({ type: 'SET_VIEW', view: v }), []);

  return (
    <SphereContext.Provider value={{ state, dispatch, selectPlanet, selectFleet, setView }}>
      {children}
    </SphereContext.Provider>
  );
}

export function useSphere() {
  const ctx = useContext(SphereContext);
  if (!ctx) throw new Error('useSphere must be used within SphereProvider');
  return ctx;
}
