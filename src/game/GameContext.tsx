import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { saveStateChecksum, verifyStateIntegrity } from './transactionGuard';
import {
  GameState, Resources, March, BattleReport, TroopClass, RareMaterials, FactionId, FactionState, AllianceLevel, GearItem, CraftingMaterialType, CreatureHunt, MarchSpeed, MarchFormation, AIEventLog, GachaItem, GachaPull, BagItem, PlayerActionType,
} from './types';
import {
  BUILDINGS, RESEARCH, TROOPS, HEROES, EXPEDITIONS,
  getBuildingCost, getResearchCost, getUpgradeTime, getProductionRate,
  getCounterMultiplier, createInitialState, getMaxMarchSize, rollGearDrop,
  GEAR_CRAFT_RECIPES, GEAR_UPGRADE_RECIPES, LEGENDARY_CREATURES, EXPEDITION_MATERIAL_DROPS, RARITY_ORDER,
} from './data';
import { generateActiveBanners, performGachaPull, FRAGMENT_RECIPES } from './gachaData';
import {
  recordAction, evaluateAdaptation, computeActionMetrics,
  applyAdaptationToCombat, countStabilityActions, countRecentLosses,
  createDefaultAdaptation,
} from './aiAdaptation';

const SAVE_KEY = 'middle_earth_strategy_save';
const TICK_INTERVAL = 1000;
const CLOUD_SAVE_INTERVAL = 30000; // Save to cloud every 30 seconds

interface GameContextType {
  state: GameState;
  started: boolean;
  startGame: (name: string) => void;
  resetGame: () => void;
  upgradeBuilding: (id: string) => boolean;
  startResearch: (id: string) => boolean;
  trainTroops: (id: string, count: number) => boolean;
  sendMarch: (expeditionId: string, troops: { troopId: string; count: number }[], heroId?: string, speed?: MarchSpeed, formation?: MarchFormation) => boolean;
  completeMarch: (marchId: string) => void;
  canAfford: (cost: Partial<Record<string, number>>) => boolean;
  getResearchBonus: (effectType: string) => number;
  getBuildingLevel: (id: string) => number;
  craftResources: (recipeId: string) => boolean;
  exchangeResources: (from: keyof Resources, to: keyof Resources, rate: number, amount: number) => boolean;
  giftFaction: (factionId: FactionId, resource: string, amount: number, standingGain: number) => boolean;
  activateTradeRoute: (factionId: FactionId) => boolean;
  spendMithrilBoost: () => boolean;
  spendDragonScaleUnlock: () => boolean;
  spendEssenceResearchBoost: () => boolean;
  equipGear: (heroId: string, gearId: string) => boolean;
  unequipGear: (heroId: string, slot: 'weapon' | 'armor' | 'accessory') => boolean;
  getHeroGearBonuses: (heroId: string) => { attack: number; defense: number; health: number; speed: number; gathering: number };
  craftGear: (gearName: string) => boolean;
  upgradeGear: (gearId: string) => boolean;
  canAffordMaterials: (materials: Partial<Record<CraftingMaterialType, number>>, resourceCost: Partial<Resources>) => boolean;
  sendCreatureHunt: (creatureId: string, troops: { troopId: string; count: number }[], heroId?: string) => boolean;
  completeCreatureHunt: (index: number) => void;
  applyAIEvent: (event: AIEventLog) => void;
  unlockSongTier: (lang: string, tier: string) => boolean;
  getUnlockedTier: (lang: string) => 'bronze' | 'silver' | 'gold' | 'platinum' | 'mythic';
  pullGacha: (bannerId: string, count: number, skipCostDeduction?: boolean) => GachaItem[];
  receiveGachaItems: (items: GachaItem[], bannerId: string, costDeducted: number, costType: string, pity: number) => void;
  useGachaItem: (itemId: string) => boolean;
  forgeFragments: (recipeId: string) => boolean;
  deductStars: (amount: number) => boolean;
  freeGachaPull: () => GachaItem[];
  addBattlePassXP: (amount: number, source: string) => void;
  setState: React.Dispatch<React.SetStateAction<GameState>>;
  saveState: (s: GameState) => void;
}

const GameContext = createContext<GameContextType | null>(null);

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be inside GameProvider');
  return ctx;
}

function loadState(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const state = JSON.parse(raw) as GameState;
    // Verify state integrity — if tampered, prefer cloud save
    if (!verifyStateIntegrity(state)) {
      console.warn('[GameContext] State integrity check failed — local state may be tampered');
      // Don't reject outright; cloud sync will reconcile
    }
    return state;
  } catch { return null; }
}

function saveState(state: GameState) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  saveStateChecksum(state);
}

// ── Cloud save/load ──
async function saveToCloud(state: GameState) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    
    await supabase.from('game_saves' as any).upsert({
      user_id: session.user.id,
      game_state: state as any,
      realm_name: state.realmName,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
  } catch (e) {
    console.warn('Cloud save failed:', e);
  }
}

async function loadFromCloud(): Promise<GameState | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    
    const { data, error } = await supabase
      .from('game_saves' as any)
      .select('game_state, updated_at')
      .eq('user_id', session.user.id)
      .maybeSingle();
    
    if (error || !data) return null;
    return (data as any).game_state as GameState;
  } catch {
    return null;
  }
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  const saved = loadState();
  const [started, setStarted] = useState(!!saved);
  const [state, setState] = useState<GameState>(saved || createInitialState('New Realm'));
  const [cloudLoaded, setCloudLoaded] = useState(false);
  const tickRef = useRef<ReturnType<typeof setInterval>>();
  const cloudSaveRef = useRef<ReturnType<typeof setInterval>>();
  const stateRef = useRef(state);
  stateRef.current = state;

  // Load from cloud on mount (prefer cloud over local if newer)
  useEffect(() => {
    if (cloudLoaded) return;
    loadFromCloud().then(cloudState => {
      setCloudLoaded(true);
      if (!cloudState) return;
      const localState = loadState();
      // Use whichever is newer
      if (!localState || cloudState.lastTick > localState.lastTick) {
        setState(cloudState);
        setStarted(true);
        saveState(cloudState);
      }
    });
  }, [cloudLoaded]);

  // Periodic cloud save + immediate sync on reconnect
  useEffect(() => {
    if (!started) return;
    cloudSaveRef.current = setInterval(() => {
      saveToCloud(stateRef.current);
    }, CLOUD_SAVE_INTERVAL);

    const handleOnline = () => {
      console.log('[Sync] Back online — saving to cloud immediately');
      saveToCloud(stateRef.current);
    };
    window.addEventListener('online', handleOnline);

    return () => {
      clearInterval(cloudSaveRef.current);
      window.removeEventListener('online', handleOnline);
    };
  }, [started]);

  // Resource tick
  useEffect(() => {
    if (!started) return;
    tickRef.current = setInterval(() => {
      setState(prev => {
        const now = Date.now();
        const dt = (now - prev.lastTick) / 1000;
        const newRes = { ...prev.resources };

        // Production
        for (const bState of prev.buildings) {
          const def = BUILDINGS.find(b => b.id === bState.id);
          if (!def?.produces || bState.level === 0) continue;
          const researchMap: Record<string, string> = { food: 'Food production', wood: 'Wood production', stone: 'Stone production', iron: 'Iron production' };
          const bonus = getResearchBonusFromState(prev, researchMap[def.produces] || '');
          const rate = getProductionRate(def, bState.level, bonus);
          newRes[def.produces] += rate * dt / 60; // per minute rate
        }

        // Gold passive
        newRes.gold += 1 * dt / 60;

        // Round and cap at 10 billion
        const MAX_RESOURCE = 10_000_000_000;
        for (const k of Object.keys(newRes) as (keyof Resources)[]) {
          newRes[k] = Math.min(MAX_RESOURCE, Math.floor(newRes[k] * 100) / 100);
        }

        // Check building upgrades
        const newBuildings = prev.buildings.map(b => {
          if (b.upgrading && b.upgradeEndTime && now >= b.upgradeEndTime) {
            return { ...b, level: b.level + 1, upgrading: false, upgradeEndTime: undefined };
          }
          return b;
        });

        // Check research
        const newResearch = prev.research.map(r => {
          if (r.researching && r.researchEndTime && now >= r.researchEndTime) {
            return { ...r, level: r.level + 1, researching: false, researchEndTime: undefined };
          }
          return r;
        });

        // Check troop training
        const newTroops = prev.troops.map(t => {
          if (t.training > 0 && t.trainingEndTime && now >= t.trainingEndTime) {
            return { ...t, count: t.count + t.training, training: 0, trainingEndTime: undefined };
          }
          return t;
        });

        // Check marches
        const newMarches = prev.marches.map(m => {
          if (!m.completed && now >= m.endTime) {
            return { ...m, completed: true };
          }
          return m;
        });

        // Check creature hunts
        const newHunts = (prev.creatureHunts || []).map(h => {
          if (!h.completed && now >= h.endTime) return { ...h, completed: true };
          return h;
        });

        const newState = { ...prev, resources: newRes, buildings: newBuildings, research: newResearch, troops: newTroops, marches: newMarches, creatureHunts: newHunts, lastTick: now };
        saveState(newState);
        return newState;
      });
    }, TICK_INTERVAL);
    return () => clearInterval(tickRef.current);
  }, [started]);

  const canAfford = useCallback((cost: Partial<Record<string, number>>) => {
    for (const [key, val] of Object.entries(cost)) {
      if ((state.resources[key as keyof Resources] || 0) < (val || 0)) return false;
    }
    return true;
  }, [state.resources]);

  const spendResources = (cost: Partial<Record<string, number>>, s: GameState): Resources => {
    const r = { ...s.resources };
    for (const [key, val] of Object.entries(cost)) {
      r[key as keyof Resources] -= val || 0;
    }
    return r;
  };

  const getBuildingLevel = useCallback((id: string) => {
    return state.buildings.find(b => b.id === id)?.level || 0;
  }, [state.buildings]);

  const getResearchBonus = useCallback((effectType: string) => {
    return getResearchBonusFromState(state, effectType);
  }, [state]);

  const startGame = useCallback((name: string) => {
    const ns = createInitialState(name);
    setState(ns);
    setStarted(true);
    saveState(ns);
    saveToCloud(ns);
  }, []);

  const resetGame = useCallback(async () => {
    localStorage.removeItem(SAVE_KEY);
    setStarted(false);
    setState(createInitialState('New Realm'));
    // Also clear cloud save
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.from('game_saves' as any).delete().eq('user_id', session.user.id);
      }
    } catch { /* ignore */ }
  }, []);

  // ── AI Adaptation: track action and re-evaluate ──
  const trackAction = useCallback((actionType: PlayerActionType) => {
    setState(prev => {
      const history = recordAction(prev.actionHistory || [], actionType);
      const losses = countRecentLosses(prev.marches);
      const stabActions = countStabilityActions(history);
      const aiAdaptation = evaluateAdaptation(
        history,
        prev.aiAdaptation || createDefaultAdaptation(),
        losses,
        stabActions
      );
      const ns = { ...prev, actionHistory: history, aiAdaptation };
      saveState(ns);
      return ns;
    });
  }, []);

  // ── Battle Pass XP helper ──
  const addBattlePassXP = useCallback((amount: number, source: string) => {
    setState(prev => {
      const bp = prev.battlePass || { season: Math.floor(Date.now() / (30 * 24 * 60 * 60 * 1000)), xp: 0, tier: 0, isPremium: false, claimedFree: [], claimedPremium: [], seasonStartedAt: Date.now() };
      const newXp = bp.xp + amount;
      const newTier = Math.min(30, Math.floor(newXp / 100));
      const newBp = { ...bp, xp: newXp, tier: newTier };
      const ns = { ...prev, battlePass: newBp };
      saveState(ns);
      return ns;
    });
  }, []);

  const upgradeBuilding = useCallback((id: string) => {
    const bState = state.buildings.find(b => b.id === id);
    const def = BUILDINGS.find(b => b.id === id);
    if (!bState || !def || bState.upgrading || bState.level >= def.maxLevel) return false;
    const cost = getBuildingCost(def, bState.level);
    if (!canAfford(cost)) return false;

    setState(prev => {
      const resources = spendResources(cost, prev);
      const time = getUpgradeTime(bState.level) * 1000;
      const buildings = prev.buildings.map(b =>
        b.id === id ? { ...b, upgrading: true, upgradeEndTime: Date.now() + time } : b
      );
      const ns = { ...prev, resources, buildings };
      saveState(ns);
      return ns;
    });
    addBattlePassXP(15 + (bState.level * 5), `Building upgrade: ${id}`);
    trackAction('upgrade_building');
    return true;
  }, [state, canAfford, addBattlePassXP]);

  const startResearch = useCallback((id: string) => {
    const rState = state.research.find(r => r.id === id);
    const def = RESEARCH.find(r => r.id === id);
    if (!rState || !def || rState.researching || rState.level >= def.maxLevel) return false;
    const cost = getResearchCost(def, rState.level);
    if (!canAfford(cost)) return false;

    // Check academy
    if (getBuildingLevel('academy') === 0) return false;

    setState(prev => {
      const resources = spendResources(cost, prev);
      const time = getUpgradeTime(rState.level) * 1000;
      const research = prev.research.map(r =>
        r.id === id ? { ...r, researching: true, researchEndTime: Date.now() + time } : r
      );
      const ns = { ...prev, resources, research };
      saveState(ns);
      return ns;
    });
    addBattlePassXP(20 + (rState.level * 8), `Research: ${id}`);
    trackAction('start_research');
    return true;
  }, [state, canAfford, getBuildingLevel, addBattlePassXP]);

  const trainTroops = useCallback((id: string, count: number) => {
    const tState = state.troops.find(t => t.id === id);
    const def = TROOPS.find(t => t.id === id);
    if (!tState || !def || tState.training > 0 || count <= 0) return false;
    if (getBuildingLevel('barracks') === 0) return false;

    const totalCost: Record<string, number> = {};
    for (const [k, v] of Object.entries(def.cost)) {
      totalCost[k] = (v as number) * count;
    }
    if (!canAfford(totalCost)) return false;

    setState(prev => {
      const resources = spendResources(totalCost, prev);
      const trainBonus = getResearchBonusFromState(prev, 'training');
      const time = def.trainTime * count * (1 - trainBonus / 100) * 1000;
      const troops = prev.troops.map(t =>
        t.id === id ? { ...t, training: count, trainingEndTime: Date.now() + time } : t
      );
      const ns = { ...prev, resources, troops };
      saveState(ns);
      return ns;
    });
    addBattlePassXP(10, `Train troops: ${id}`);
    trackAction('train_troops');
    return true;
  }, [state, canAfford, getBuildingLevel, addBattlePassXP]);

  const MARCH_SPEED_MULTIPLIERS: Record<MarchSpeed, { time: number; losses: number }> = {
    cautious: { time: 1.5, losses: 0.7 },
    standard: { time: 1, losses: 1 },
    forced: { time: 0.6, losses: 1.2 },
    sprint: { time: 0.35, losses: 1.5 },
  };

  const FORMATION_BONUSES: Record<MarchFormation, { atk: number; def: number }> = {
    line: { atk: 1.0, def: 1.0 },
    wedge: { atk: 1.15, def: 0.9 },
    shield_wall: { atk: 0.85, def: 1.2 },
    scattered: { atk: 0.95, def: 0.95 },
  };

  const sendMarch = useCallback((expeditionId: string, troops: { troopId: string; count: number }[], heroId?: string, speed: MarchSpeed = 'standard', formation: MarchFormation = 'line') => {
    const expedition = EXPEDITIONS.find(e => e.id === expeditionId);
    if (!expedition) return false;

    const totalTroops = troops.reduce((s, t) => s + t.count, 0);
    const maxSize = getMaxMarchSize(getBuildingLevel('keep'));
    if (totalTroops > maxSize || totalTroops === 0) return false;

    for (const t of troops) {
      const ts = state.troops.find(s => s.id === t.troopId);
      if (!ts || ts.count < t.count) return false;
    }

    const speedBonus = getResearchBonusFromState(state, 'March speed');
    const heroBonus = heroId ? HEROES.find(h => h.id === heroId)?.bonus : undefined;
    const speedMult = heroBonus?.type === 'speed' ? (1 - heroBonus.value / 100) : 1;
    const marchSpeedMult = MARCH_SPEED_MULTIPLIERS[speed].time;
    const duration = expedition.duration * (1 - speedBonus / 100) * speedMult * marchSpeedMult * 1000;

    const march: March = {
      id: `march_${Date.now()}`,
      expeditionId,
      heroId,
      troops,
      speed,
      formation,
      startTime: Date.now(),
      endTime: Date.now() + duration,
      completed: false,
    };

    setState(prev => {
      const newTroops = prev.troops.map(t => {
        const marchTroop = troops.find(mt => mt.troopId === t.id);
        if (marchTroop) return { ...t, count: t.count - marchTroop.count };
        return t;
      });
      const ns = { ...prev, troops: newTroops, marches: [...prev.marches, march] };
      saveState(ns);
      return ns;
    });
    trackAction('send_march');
    return true;
  }, [state, getBuildingLevel, trackAction]);

  const CRAFT_RECIPES: Record<string, { inputs: Partial<Resources>; output: { type: keyof RareMaterials; amount: number } }> = {
    essence: { inputs: { food: 200, wood: 200 }, output: { type: 'essence', amount: 1 } },
    arcane_dust: { inputs: { stone: 150, iron: 100 }, output: { type: 'arcane_dust', amount: 1 } },
    mithril: { inputs: { iron: 300, gold: 100 }, output: { type: 'mithril', amount: 1 } },
    dragon_scale: { inputs: { food: 500, iron: 200, gold: 200 }, output: { type: 'dragon_scale', amount: 1 } },
  };

  const craftResources = useCallback((recipeId: string) => {
    const recipe = CRAFT_RECIPES[recipeId];
    if (!recipe) return false;
    if (!canAfford(recipe.inputs as Partial<Record<string, number>>)) return false;

    setState(prev => {
      const resources = spendResources(recipe.inputs as Partial<Record<string, number>>, prev);
      const rareMaterials = { ...(prev.rareMaterials || { essence: 0, arcane_dust: 0, mithril: 0, dragon_scale: 0 }) };
      let outputAmount = recipe.output.amount;
      // Arcane research: Essence generation bonus
      if (recipe.output.type === 'essence') {
        const essenceBonus = getResearchBonusFromState(prev, 'Essence generation');
        outputAmount = Math.floor(outputAmount * (1 + essenceBonus / 100));
        if (outputAmount < 1) outputAmount = 1;
      }
      rareMaterials[recipe.output.type] += outputAmount;
      const ns = { ...prev, resources, rareMaterials };
      saveState(ns);
      return ns;
    });
    trackAction('craft_resources');
    return true;
  }, [canAfford, trackAction]);

  const exchangeResources = useCallback((from: keyof Resources, to: keyof Resources, rate: number, amount: number) => {
    const totalCost = rate * amount;
    if ((state.resources[from] || 0) < totalCost) return false;

    setState(prev => {
      const resources = { ...prev.resources };
      resources[from] -= totalCost;
      resources[to] += amount;
      const ns = { ...prev, resources };
      saveState(ns);
      return ns;
    });
    trackAction('exchange_resources');
    return true;
  }, [state.resources, trackAction]);

  const completeMarch = useCallback((marchId: string) => {
    setState(prev => {
      const march = prev.marches.find(m => m.id === marchId);
      if (!march || !march.completed || march.result) return prev;

      const expedition = EXPEDITIONS.find(e => e.id === march.expeditionId);
      if (!expedition) return prev;

      const report = simulateBattle(prev, march, expedition);

      const newRes = { ...prev.resources };
      if (report.victory) {
        for (const [k, v] of Object.entries(report.rewards)) {
          newRes[k as keyof Resources] += v || 0;
        }
      }

      // Gear drop on victory
      let newInventory = [...(prev.gearInventory || [])];
      let newCraftMats = { ...(prev.craftingMaterials || {}) };
      if (report.victory) {
        const exp = EXPEDITIONS.find(e => e.id === march.expeditionId);
        const gear = rollGearDrop(exp?.difficulty || 1);
        if (gear) {
          gear.sourceExpedition = march.expeditionId;
          newInventory = [...newInventory, gear];
          report.modifiers.push({ source: `Gear Drop: ${gear.icon} ${gear.name}`, value: 0 });
        }

        // Crafting material drops from expeditions
        const matDrops = EXPEDITION_MATERIAL_DROPS[march.expeditionId];
        if (matDrops) {
          for (const drop of matDrops) {
            if (Math.random() <= drop.chance) {
              newCraftMats[drop.type] = (newCraftMats[drop.type] || 0) + drop.amount;
              report.modifiers.push({ source: `Material: ${drop.type} ×${drop.amount}`, value: 0 });
            }
          }
        }
      }

      // ── Bag Loot Drops on Victory ──
      const newBag = [...(prev.bag || [])];
      if (report.victory) {
        const diff = EXPEDITIONS.find(e => e.id === march.expeditionId)?.difficulty || 1;
        const lootTable: { name: string; icon: string; category: 'speedups' | 'resources' | 'boosts'; rarity: string; chance: number; qty: number; value?: number; resourceType?: string }[] = [
          { name: '5-Min Speed Up', icon: '⏩', category: 'speedups', rarity: 'common', chance: 0.6, qty: 1 + diff },
          { name: '15-Min Speed Up', icon: '⏩', category: 'speedups', rarity: 'uncommon', chance: 0.3 + diff * 0.05, qty: 1 },
          { name: '1-Hour Speed Up', icon: '⏩', category: 'speedups', rarity: 'rare', chance: 0.1 + diff * 0.05, qty: 1 },
          { name: 'Food Pack (1K)', icon: '🌾', category: 'resources', rarity: 'common', chance: 0.5, qty: 2 + diff, value: 1000, resourceType: 'food' },
          { name: 'Wood Pack (1K)', icon: '🪵', category: 'resources', rarity: 'common', chance: 0.5, qty: 2 + diff, value: 1000, resourceType: 'wood' },
          { name: 'Iron Pack (500)', icon: '⚙️', category: 'resources', rarity: 'uncommon', chance: 0.35, qty: 1 + Math.floor(diff / 2), value: 500, resourceType: 'iron' },
          { name: 'ATK Boost (10min)', icon: '⚔️', category: 'boosts', rarity: 'uncommon', chance: 0.15 + diff * 0.03, qty: 1 },
        ];

        for (const loot of lootTable) {
          if (Math.random() <= loot.chance) {
            const existing = newBag.find(i => i.name === loot.name && i.category === loot.category);
            if (existing) {
              existing.quantity = Math.min(100_000, existing.quantity + loot.qty);
            } else {
              newBag.push({
                id: `bag_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                name: loot.name,
                icon: loot.icon,
                category: loot.category,
                rarity: loot.rarity as any,
                quantity: loot.qty,
                description: `Looted from ${march.expeditionId}`,
                value: loot.value,
                resourceType: loot.resourceType,
                obtainedAt: Date.now(),
              });
            }
            report.modifiers.push({ source: `Loot: ${loot.icon} ${loot.name} ×${loot.qty}`, value: 0 });
          }
        }
      }

      const newTroops = [...prev.troops];
      for (const mt of march.troops) {
        const loss = report.losses.find(l => l.troopId === mt.troopId);
        const surviving = mt.count - (loss?.lost || 0);
        const idx = newTroops.findIndex(t => t.id === mt.troopId);
        if (idx >= 0) {
          newTroops[idx] = { ...newTroops[idx], count: newTroops[idx].count + surviving };
        }
      }

      const newMarches = prev.marches.map(m =>
        m.id === marchId ? { ...m, result: report } : m
      );

      const ns = { ...prev, resources: newRes, troops: newTroops, marches: newMarches, gearInventory: newInventory, craftingMaterials: newCraftMats, bag: newBag };
      saveState(ns);
      // Award Battle Pass XP for expedition completion
      if (report.victory) {
        const expDef = EXPEDITIONS.find(e => e.id === march.expeditionId);
        const xpAward = 25 + (expDef?.difficulty || 1) * 10;
        setTimeout(() => addBattlePassXP(xpAward, `Expedition victory: ${march.expeditionId}`), 0);
      }
      return ns;
    });
  }, [addBattlePassXP]);

  // ── Diplomacy ──
  const getAllianceLevel = (standing: number): AllianceLevel => {
    if (standing >= 80) return 'bonded';
    if (standing >= 50) return 'allied';
    if (standing >= 25) return 'friendly';
    return 'neutral';
  };

  const giftFaction = useCallback((factionId: FactionId, resource: string, amount: number, standingGain: number) => {
    if (!canAfford({ [resource]: amount })) return false;

    setState(prev => {
      const resources = spendResources({ [resource]: amount }, prev);
      const factions = [...(prev.factions || createDefaultFactions())];
      const idx = factions.findIndex(f => f.id === factionId);
      if (idx === -1) return prev;
      const newStanding = Math.min(100, factions[idx].standing + standingGain);
      factions[idx] = { ...factions[idx], standing: newStanding, allianceLevel: getAllianceLevel(newStanding) };
      const ns = { ...prev, resources, factions };
      saveState(ns);
      return ns;
    });
    trackAction('gift_faction');
    return true;
  }, [canAfford, trackAction]);

  const activateTradeRoute = useCallback((factionId: FactionId) => {
    setState(prev => {
      const factions = [...(prev.factions || createDefaultFactions())];
      const idx = factions.findIndex(f => f.id === factionId);
      if (idx === -1 || factions[idx].standing < 50) return prev;
      factions[idx] = { ...factions[idx], tradeRouteActive: true };
      const ns = { ...prev, factions };
      saveState(ns);
      return ns;
    });
    return true;
  }, []);

  // ── Rare Material Usage ──
  const spendMithrilBoost = useCallback(() => {
    const mats = state.rareMaterials || { essence: 0, arcane_dust: 0, mithril: 0, dragon_scale: 0 };
    if (mats.mithril < 3) return false;
    setState(prev => {
      const rareMaterials = { ...(prev.rareMaterials || { essence: 0, arcane_dust: 0, mithril: 0, dragon_scale: 0 }) };
      rareMaterials.mithril -= 3;
      const mithrilBoostLevel = (prev.mithrilBoostLevel || 0) + 1;
      const ns = { ...prev, rareMaterials, mithrilBoostLevel };
      saveState(ns);
      return ns;
    });
    return true;
  }, [state.rareMaterials]);

  const spendDragonScaleUnlock = useCallback(() => {
    const mats = state.rareMaterials || { essence: 0, arcane_dust: 0, mithril: 0, dragon_scale: 0 };
    if (mats.dragon_scale < 5 || state.eliteUnlocked) return false;
    setState(prev => {
      const rareMaterials = { ...(prev.rareMaterials || { essence: 0, arcane_dust: 0, mithril: 0, dragon_scale: 0 }) };
      rareMaterials.dragon_scale -= 5;
      const ns = { ...prev, rareMaterials, eliteUnlocked: true };
      saveState(ns);
      return ns;
    });
    return true;
  }, [state.rareMaterials, state.eliteUnlocked]);

  const spendEssenceResearchBoost = useCallback(() => {
    const mats = state.rareMaterials || { essence: 0, arcane_dust: 0, mithril: 0, dragon_scale: 0 };
    if (mats.essence < 2) return false;
    setState(prev => {
      const rareMaterials = { ...(prev.rareMaterials || { essence: 0, arcane_dust: 0, mithril: 0, dragon_scale: 0 }) };
      rareMaterials.essence -= 2;
      const essenceResearchBonus = (prev.essenceResearchBonus || 0) + 10;
      const ns = { ...prev, rareMaterials, essenceResearchBonus };
      saveState(ns);
      return ns;
    });
    return true;
  }, [state.rareMaterials]);

  // ── Equipment ──
  const equipGear = useCallback((heroId: string, gearId: string) => {
    const inv = state.gearInventory || [];
    const item = inv.find(g => g.id === gearId);
    if (!item || !state.unlockedHeroes.includes(heroId)) return false;

    setState(prev => {
      const heroEquipment = { ...(prev.heroEquipment || {}) };
      const heroSlots = { ...(heroEquipment[heroId] || {}) };

      // Unequip existing item in that slot back to inventory
      const existingGearId = heroSlots[item.slot];
      heroSlots[item.slot] = gearId;
      heroEquipment[heroId] = heroSlots;

      const ns = { ...prev, heroEquipment };
      saveState(ns);
      return ns;
    });
    return true;
  }, [state.gearInventory, state.unlockedHeroes]);

  const unequipGear = useCallback((heroId: string, slot: 'weapon' | 'armor' | 'accessory') => {
    setState(prev => {
      const heroEquipment = { ...(prev.heroEquipment || {}) };
      const heroSlots = { ...(heroEquipment[heroId] || {}) };
      if (!heroSlots[slot]) return prev;
      delete heroSlots[slot];
      heroEquipment[heroId] = heroSlots;
      const ns = { ...prev, heroEquipment };
      saveState(ns);
      return ns;
    });
    return true;
  }, []);

  const getHeroGearBonuses = useCallback((heroId: string) => {
    const result = { attack: 0, defense: 0, health: 0, speed: 0, gathering: 0 };
    const equipment = state.heroEquipment?.[heroId];
    if (!equipment) return result;
    const inv = state.gearInventory || [];
    for (const gearId of Object.values(equipment)) {
      if (!gearId) continue;
      const item = inv.find(g => g.id === gearId);
      if (!item) continue;
      for (const b of item.bonuses) {
        result[b.type] += b.value;
      }
    }
    return result;
  }, [state.heroEquipment, state.gearInventory]);

  // ── Gear Crafting & Upgrading ──
  const canAffordMaterials = useCallback((materials: Partial<Record<CraftingMaterialType, number>>, resourceCost: Partial<Resources>) => {
    const cm = state.craftingMaterials || {};
    for (const [mat, amt] of Object.entries(materials)) {
      if ((cm[mat as CraftingMaterialType] || 0) < (amt || 0)) return false;
    }
    return canAfford(resourceCost as Partial<Record<string, number>>);
  }, [state.craftingMaterials, canAfford]);

  const craftGear = useCallback((gearName: string) => {
    const recipe = GEAR_CRAFT_RECIPES.find(r => r.gearName === gearName);
    if (!recipe) return false;
    if (!canAffordMaterials(recipe.materials, recipe.resourceCost)) return false;

    // Arcane research: Crafting success rate — chance to save materials
    const craftingBonus = getResearchBonusFromState(state, 'Crafting success rate');

    setState(prev => {
      const resources = spendResources(recipe.resourceCost as Partial<Record<string, number>>, prev);
      const craftingMaterials = { ...(prev.craftingMaterials || {}) };
      for (const [mat, amt] of Object.entries(recipe.materials)) {
        let cost = amt || 0;
        // Crafting success bonus: chance to refund each material
        if (craftingBonus > 0 && Math.random() * 100 < craftingBonus) {
          cost = Math.floor(cost * 0.5); // 50% material refund on proc
        }
        craftingMaterials[mat as CraftingMaterialType] = (craftingMaterials[mat as CraftingMaterialType] || 0) - cost;
      }
      const newItem: GearItem = {
        id: `gear_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: recipe.gearName,
        slot: recipe.slot,
        rarity: recipe.rarity,
        icon: recipe.icon,
        bonuses: recipe.bonuses.map(b => ({ ...b })),
      };
      const gearInventory = [...(prev.gearInventory || []), newItem];
      const ns = { ...prev, resources, craftingMaterials, gearInventory };
      saveState(ns);
      return ns;
    });
    trackAction('craft_gear');
    return true;
  }, [canAffordMaterials, state, trackAction]);

  const upgradeGear = useCallback((gearId: string) => {
    const inv = state.gearInventory || [];
    const item = inv.find(g => g.id === gearId);
    if (!item) return false;
    const recipe = GEAR_UPGRADE_RECIPES.find(r => r.fromRarity === item.rarity);
    if (!recipe) return false;
    if (!canAffordMaterials(recipe.materials, recipe.resourceCost)) return false;

    setState(prev => {
      const resources = spendResources(recipe.resourceCost as Partial<Record<string, number>>, prev);
      const craftingMaterials = { ...(prev.craftingMaterials || {}) };
      for (const [mat, amt] of Object.entries(recipe.materials)) {
        craftingMaterials[mat as CraftingMaterialType] = (craftingMaterials[mat as CraftingMaterialType] || 0) - (amt || 0);
      }
      const gearInventory = (prev.gearInventory || []).map(g => {
        if (g.id !== gearId) return g;
        return {
          ...g,
          rarity: recipe.toRarity,
          bonuses: g.bonuses.map(b => ({ ...b, value: Math.round(b.value * recipe.statMultiplier) })),
        };
      });
      const ns = { ...prev, resources, craftingMaterials, gearInventory };
      saveState(ns);
      return ns;
    });
    return true;
  }, [state.gearInventory, canAffordMaterials]);

  // ── Creature Hunts ──
  const sendCreatureHunt = useCallback((creatureId: string, troops: { troopId: string; count: number }[], heroId?: string) => {
    const creature = LEGENDARY_CREATURES.find(c => c.id === creatureId);
    if (!creature) return false;
    const totalTroops = troops.reduce((s, t) => s + t.count, 0);
    if (totalTroops === 0) return false;
    for (const t of troops) {
      const ts = state.troops.find(s => s.id === t.troopId);
      if (!ts || ts.count < t.count) return false;
    }

    const hunt: CreatureHunt = {
      creatureId,
      troops,
      heroId,
      startTime: Date.now(),
      endTime: Date.now() + creature.duration * 1000,
      completed: false,
    };

    setState(prev => {
      const newTroops = prev.troops.map(t => {
        const huntTroop = troops.find(ht => ht.troopId === t.id);
        if (huntTroop) return { ...t, count: t.count - huntTroop.count };
        return t;
      });
      const ns = { ...prev, troops: newTroops, creatureHunts: [...(prev.creatureHunts || []), hunt] };
      saveState(ns);
      return ns;
    });
    trackAction('creature_hunt');
    return true;
  }, [state.troops, trackAction]);

  const completeCreatureHunt = useCallback((index: number) => {
    setState(prev => {
      const hunts = [...(prev.creatureHunts || [])];
      const hunt = hunts[index];
      if (!hunt || !hunt.completed || hunt.result) return prev;

      const creature = LEGENDARY_CREATURES.find(c => c.id === hunt.creatureId);
      if (!creature) return prev;

      // Calculate power
      let power = 0;
      for (const mt of hunt.troops) {
        const def = TROOPS.find(t => t.id === mt.troopId);
        if (def) power += (def.attack + def.defense * 0.5 + def.health * 0.2) * mt.count;
      }
      const victory = power >= creature.power;

      // Material drops
      const materialsGained: { type: CraftingMaterialType; amount: number }[] = [];
      const newCraftMats = { ...(prev.craftingMaterials || {}) };
      if (victory) {
        for (const drop of creature.materialDrops) {
          if (Math.random() <= drop.chance) {
            materialsGained.push({ type: drop.type, amount: drop.amount });
            newCraftMats[drop.type] = (newCraftMats[drop.type] || 0) + drop.amount;
          }
        }
      }

      // Losses
      const lossRatio = victory ? Math.max(0.1, creature.power / (power * 2)) : 0.7;
      const losses = hunt.troops.map(mt => ({
        troopId: mt.troopId,
        lost: Math.floor(mt.count * lossRatio * (0.8 + Math.random() * 0.4)),
      }));

      // Return surviving troops
      const newTroops = [...prev.troops];
      for (const mt of hunt.troops) {
        const loss = losses.find(l => l.troopId === mt.troopId);
        const surviving = mt.count - (loss?.lost || 0);
        const idx = newTroops.findIndex(t => t.id === mt.troopId);
        if (idx >= 0) newTroops[idx] = { ...newTroops[idx], count: newTroops[idx].count + surviving };
      }

      hunts[index] = { ...hunt, result: { victory, materialsGained, losses } };
      const ns = { ...prev, troops: newTroops, creatureHunts: hunts, craftingMaterials: newCraftMats };
      saveState(ns);
      return ns;
    });
  }, []);

  const MUSIC_TIER_COST: Record<string, { gold: number; essence?: number }> = {
    bronze: { gold: 0 }, silver: { gold: 500 }, gold: { gold: 2000 },
    platinum: { gold: 8000, essence: 5 }, mythic: { gold: 25000, essence: 20 },
  };

  const getUnlockedTier = useCallback((lang: string): 'bronze' | 'silver' | 'gold' | 'platinum' | 'mythic' => {
    return (state.musicTiers?.[lang] as any) || 'bronze';
  }, [state.musicTiers]);

  const unlockSongTier = useCallback((lang: string, tier: string): boolean => {
    const cost = MUSIC_TIER_COST[tier];
    if (!cost) return false;
    if (!canAfford({ gold: cost.gold })) return false;
    if (cost.essence && (state.rareMaterials?.essence || 0) < cost.essence) return false;

    setState(prev => {
      const resources = { ...prev.resources, gold: prev.resources.gold - (cost.gold || 0) };
      const rareMaterials = { ...(prev.rareMaterials || { essence: 0, arcane_dust: 0, mithril: 0, dragon_scale: 0 }) };
      if (cost.essence) rareMaterials.essence -= cost.essence;
      const musicTiers = { ...(prev.musicTiers || {}), [lang]: tier };
      const ns = { ...prev, resources, rareMaterials, musicTiers };
      saveState(ns);
      return ns;
    });
    return true;
  }, [canAfford, state.rareMaterials]);

  const applyAIEvent = useCallback((event: AIEventLog) => {
    setState(prev => {
      const newRes = { ...prev.resources };
      if (event.resourceChanges) {
        for (const [k, v] of Object.entries(event.resourceChanges)) {
          newRes[k as keyof Resources] = Math.max(0, (newRes[k as keyof Resources] || 0) + (v || 0));
        }
      }
      const log = [...(prev.aiEventLog || []), event].slice(-50);
      const ns = { ...prev, resources: newRes, aiEventLog: log };
      saveState(ns);
      return ns;
    });
  }, []);

  // ── Gacha ──
  const pullGacha = useCallback((bannerId: string, count: number, skipCostDeduction: boolean = false): GachaItem[] => {
    const banners = generateActiveBanners();
    const banner = banners.find(b => b.id === bannerId);
    if (!banner) return [];

    const cost = count >= 10 ? banner.costMulti : banner.costSingle;

    // Only check/deduct cost if not already handled server-side
    if (!skipCostDeduction) {
      if (banner.costType === 'gold') {
        if (state.resources.gold < cost) return [];
      } else if (banner.costType === 'diamonds') {
        if ((state.resources.diamonds || 0) < cost) return [];
      } else if (banner.costType === 'stars') {
        if ((state.telegramStars || 0) < cost) return [];
      }
    }
    // TON cost is handled externally before calling pullGacha

    const items: GachaItem[] = [];
    let currentPity = state.gachaPity?.[bannerId] || 0;

    for (let i = 0; i < count; i++) {
      const pulled = performGachaPull(banner.pool, currentPity, banner.pityThreshold, banner.pityItem);
      const isRare = ['ultra_rare', 'legendary', 'mythic'].includes(pulled.rarity);
      currentPity = isRare ? 0 : currentPity + 1;

      const item: GachaItem = {
        id: `gacha_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: pulled.name,
        icon: pulled.icon,
        category: pulled.category,
        rarity: pulled.rarity,
        description: pulled.description,
        effect: pulled.effect,
        quantity: 1,
        obtainedAt: Date.now(),
        bannerId,
        isLimited: pulled.isLimited,
      };
      items.push(item);
    }

    setState(prev => {
      const resources = { ...prev.resources };
      let stars = prev.telegramStars || 0;
      
      // Only deduct locally if not already done server-side
      if (!skipCostDeduction) {
        if (banner.costType === 'gold') resources.gold -= cost;
        if (banner.costType === 'diamonds') resources.diamonds = (resources.diamonds || 0) - cost;
        if (banner.costType === 'stars') stars -= cost;
      }

      // Merge into inventory (stack same-name items)
      const inv = [...(prev.gachaInventory || [])];
      for (const item of items) {
        const existing = inv.find(i => i.name === item.name);
        if (existing) {
          existing.quantity += 1;
        } else {
          inv.push(item);
        }
      }

      const history: GachaPull[] = [
        ...(prev.gachaHistory || []),
        ...items.map(item => ({
          id: `pull_${Date.now()}_${Math.random().toString(36).slice(2, 4)}`,
          bannerId,
          item,
          timestamp: Date.now(),
          pityCount: currentPity,
        })),
      ].slice(-100);

      const pity = { ...(prev.gachaPity || {}), [bannerId]: currentPity };
      const ns = { ...prev, resources, telegramStars: stars, gachaInventory: inv, gachaHistory: history, gachaPity: pity };
      saveState(ns);
      return ns;
    });

    return items;
  }, [state]);

  // Receive server-generated gacha items and sync local state
  const receiveGachaItems = useCallback((items: GachaItem[], bannerId: string, costDeducted: number, costType: string, pity: number) => {
    setState(prev => {
      const resources = { ...prev.resources };
      let stars = prev.telegramStars || 0;

      if (costType === 'gold') resources.gold = Math.max(0, resources.gold - costDeducted);
      if (costType === 'diamonds') resources.diamonds = Math.max(0, (resources.diamonds || 0) - costDeducted);
      if (costType === 'stars') stars = Math.max(0, stars - costDeducted);

      // Merge into inventory
      const inv = [...(prev.gachaInventory || [])];
      for (const item of items) {
        const existing = inv.find(i => i.name === item.name);
        if (existing) {
          existing.quantity += 1;
        } else {
          inv.push(item);
        }
      }

      const history: GachaPull[] = [
        ...(prev.gachaHistory || []),
        ...items.map(item => ({
          id: `pull_${Date.now()}_${Math.random().toString(36).slice(2, 4)}`,
          bannerId,
          item,
          timestamp: Date.now(),
          pityCount: pity,
        })),
      ].slice(-100);

      const pityState = { ...(prev.gachaPity || {}), [bannerId]: pity };
      const ns = { ...prev, resources, telegramStars: stars, gachaInventory: inv, gachaHistory: history, gachaPity: pityState };
      saveState(ns);
      return ns;
    });
  }, []);

  const useGachaItem = useCallback((itemId: string): boolean => {
    const inv = state.gachaInventory || [];
    const item = inv.find(i => i.id === itemId);
    if (!item || item.category !== 'consumable' || !item.effect) return false;

    setState(prev => {
      const resources = { ...prev.resources };

      // Apply effect
      if (item.effect?.type === 'instant_resource' && item.effect.target) {
        resources[item.effect.target as keyof Resources] = (resources[item.effect.target as keyof Resources] || 0) + item.effect.value;
      } else if (item.effect?.type === 'instant_resource' && !item.effect.target) {
        // All basic resources
        resources.food += item.effect.value;
        resources.wood += item.effect.value;
        resources.stone += item.effect.value;
        resources.iron += item.effect.value;
      }
      // Buff-type items: for now just apply as resource bonus (future: proper buff system)

      // Remove or decrement from inventory
      let newInv = [...(prev.gachaInventory || [])];
      const idx = newInv.findIndex(i => i.id === itemId);
      if (idx >= 0) {
        if (newInv[idx].quantity > 1) {
          newInv[idx] = { ...newInv[idx], quantity: newInv[idx].quantity - 1 };
        } else {
          newInv.splice(idx, 1);
        }
      }

      const ns = { ...prev, resources, gachaInventory: newInv };
      saveState(ns);
      return ns;
    });
    return true;
  }, [state.gachaInventory]);

  const forgeFragments = useCallback((recipeId: string): boolean => {
    const recipe = FRAGMENT_RECIPES.find((r) => r.id === recipeId);
    if (!recipe) return false;
    if (!recipe) return false;

    const inv = state.gachaInventory || [];
    // Check all fragments are available
    for (const frag of recipe.fragments) {
      const item = inv.find((i: GachaItem) => i.name === frag.name);
      if (!item || item.quantity < frag.requiredCount) return false;
    }

    setState(prev => {
      let newInv = [...(prev.gachaInventory || [])];
      // Deduct fragments
      for (const frag of recipe.fragments) {
        const idx = newInv.findIndex((i: GachaItem) => i.name === frag.name);
        if (idx >= 0) {
          if (newInv[idx].quantity > frag.requiredCount) {
            newInv[idx] = { ...newInv[idx], quantity: newInv[idx].quantity - frag.requiredCount };
          } else {
            newInv.splice(idx, 1);
          }
        }
      }
      // Add result item
      const resultItem: GachaItem = {
        id: `forge_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: recipe.result.name,
        icon: recipe.result.icon,
        category: recipe.result.category,
        rarity: recipe.result.rarity,
        description: recipe.result.description,
        effect: recipe.result.effect,
        quantity: 1,
        obtainedAt: Date.now(),
        isLimited: true,
      };
      newInv.push(resultItem);

      const ns = { ...prev, gachaInventory: newInv };
      saveState(ns);
      return ns;
    });
    return true;
  }, [state.gachaInventory]);

  const deductStars = useCallback((amount: number): boolean => {
    const current = state.telegramStars || 0;
    if (current < amount) return false;
    setState(prev => {
      const ns = { ...prev, telegramStars: (prev.telegramStars || 0) - amount };
      saveState(ns);
      return ns;
    });
    return true;
  }, [state.telegramStars]);

  const freeGachaPull = useCallback((): GachaItem[] => {
    const results = pullGacha('standard', 1);
    if (results.length > 0) {
      setState(prev => {
        const ns = { ...prev, lastFreePull: Date.now() };
        saveState(ns);
        return ns;
      });
    }
    return results;
  }, [pullGacha]);

  return (
    <GameContext.Provider value={{
      state, started, startGame, resetGame,
      upgradeBuilding, startResearch, trainTroops,
      sendMarch, completeMarch, canAfford,
      getResearchBonus, getBuildingLevel,
      craftResources, exchangeResources,
      giftFaction, activateTradeRoute,
      spendMithrilBoost, spendDragonScaleUnlock, spendEssenceResearchBoost,
      equipGear, unequipGear, getHeroGearBonuses,
      craftGear, upgradeGear, canAffordMaterials,
      sendCreatureHunt, completeCreatureHunt,
      applyAIEvent,
      unlockSongTier, getUnlockedTier,
      pullGacha, useGachaItem, forgeFragments, deductStars, receiveGachaItems,
      freeGachaPull, addBattlePassXP, setState, saveState,
    }}>
      {children}
    </GameContext.Provider>
  );
}

function createDefaultFactions(): FactionState[] {
  return [
    { id: 'edain', standing: 0, allianceLevel: 'neutral', tradeRouteActive: false },
    { id: 'eldari', standing: 0, allianceLevel: 'neutral', tradeRouteActive: false },
    { id: 'khazari', standing: 0, allianceLevel: 'neutral', tradeRouteActive: false },
  ];
}

function getResearchBonusFromState(state: GameState, effectType: string): number {
  let bonus = 0;
  for (const rs of state.research) {
    const def = RESEARCH.find(r => r.id === rs.id);
    if (def && def.effect === effectType) {
      bonus += def.effectPerLevel * rs.level;
    }
  }
  return bonus;
}

function simulateBattle(state: GameState, march: March, expedition: { enemyPower: number; rewards: Partial<Resources> }): BattleReport {
  const modifiers: { source: string; value: number }[] = [];

  // Player power
  let totalAtk = 0, totalDef = 0, totalHp = 0;
  for (const mt of march.troops) {
    const def = TROOPS.find(t => t.id === mt.troopId);
    if (!def) continue;
    totalAtk += def.attack * mt.count;
    totalDef += def.defense * mt.count;
    totalHp += def.health * mt.count;
  }

  // Research bonuses
  const atkBonus = getResearchBonusFromState(state, 'Troop attack');
  const defBonus = getResearchBonusFromState(state, 'Troop defense');
  const hpBonus = getResearchBonusFromState(state, 'Troop health');

  if (atkBonus > 0) modifiers.push({ source: `Battle Tactics Lv${state.research.find(r => r.id === 'attack_tactics')?.level}`, value: atkBonus });
  if (defBonus > 0) modifiers.push({ source: `Heavy Armor Lv${state.research.find(r => r.id === 'armor')?.level}`, value: defBonus });
  if (hpBonus > 0) modifiers.push({ source: `Endurance Training Lv${state.research.find(r => r.id === 'endurance')?.level}`, value: hpBonus });

  totalAtk *= (1 + atkBonus / 100);
  totalDef *= (1 + defBonus / 100);
  totalHp *= (1 + hpBonus / 100);

  // Hero bonus
  if (march.heroId) {
    const hero = HEROES.find(h => h.id === march.heroId);
    if (hero) {
      modifiers.push({ source: `Hero: ${hero.id} (${hero.bonus.type} +${hero.bonus.value}%)`, value: hero.bonus.value });
      if (hero.bonus.type === 'attack') totalAtk *= (1 + hero.bonus.value / 100);
      if (hero.bonus.type === 'defense') totalDef *= (1 + hero.bonus.value / 100);
      if (hero.bonus.type === 'health') totalHp *= (1 + hero.bonus.value / 100);
    }
  }

  // Barracks bonus
  const barracksLvl = state.buildings.find(b => b.id === 'barracks')?.level || 0;
  if (barracksLvl > 1) {
    const bBonus = (barracksLvl - 1) * 3;
    modifiers.push({ source: `War Barracks Lv${barracksLvl}`, value: bBonus });
    totalAtk *= (1 + bBonus / 100);
  }

  // Arcane research: City defense bonus
  const cityDefBonus = getResearchBonusFromState(state, 'City defense bonus');
  if (cityDefBonus > 0) {
    modifiers.push({ source: `Arcane Fortification Lv${state.research.find(r => r.id === 'arcane_fortification')?.level}`, value: cityDefBonus });
    totalDef *= (1 + cityDefBonus / 100);
  }

  const playerPower = Math.floor(totalAtk + totalDef * 0.5 + totalHp * 0.2);

  // ── AI Adaptation: adjust enemy power based on player behavior ──
  const adaptation = state.aiAdaptation || createDefaultAdaptation();
  const history = state.actionHistory || [];
  const metrics = computeActionMetrics(history);
  const { adjustedPower: adaptedEnemyPower, modifierDescription } = applyAdaptationToCombat(
    expedition.enemyPower,
    adaptation,
    metrics.dominantAction
  );
  if (modifierDescription) {
    modifiers.push({ source: modifierDescription, value: adaptation.level });
  }

  const enemyPower = adaptedEnemyPower;
  const victory = playerPower >= enemyPower;

  // Calculate losses — reaction speed affects loss margins
  const reactionSpeedPenalty = adaptation.reactionSpeed * 0.1; // up to +6% more losses
  const baseLossRatio = victory ? Math.max(0.05, enemyPower / (playerPower * 2)) : 0.6;
  const lossRatio = baseLossRatio * (1 + reactionSpeedPenalty);
  const losses = march.troops.map(mt => ({
    troopId: mt.troopId,
    lost: Math.floor(mt.count * lossRatio * (0.8 + Math.random() * 0.4)),
  }));

  // Rewards with hero gathering bonus
  const rewards: Partial<Resources> = {};
  if (victory) {
    const hero = march.heroId ? HEROES.find(h => h.id === march.heroId) : undefined;
    const gatherMult = hero?.bonus.type === 'gathering' ? (1 + hero.bonus.value / 100) : 1;
    const tradeBonus = getResearchBonusFromState(state, 'Gold income');
    const expeditionRewardBonus = getResearchBonusFromState(state, 'Expedition reward bonus');
    if (expeditionRewardBonus > 0) {
      modifiers.push({ source: `Astral Navigation Lv${state.research.find(r => r.id === 'astral_navigation')?.level}`, value: expeditionRewardBonus });
    }
    for (const [k, v] of Object.entries(expedition.rewards)) {
      let amount = (v as number) * gatherMult * (1 + expeditionRewardBonus / 100);
      if (k === 'gold') amount *= (1 + tradeBonus / 100);
      rewards[k as keyof Resources] = Math.floor(amount);
    }
  }

  return { victory, playerPower, enemyPower, losses, rewards, modifiers };
}
