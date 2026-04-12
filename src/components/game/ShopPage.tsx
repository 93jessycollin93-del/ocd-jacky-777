import { useState, useMemo } from 'react';
import { useGame } from '@/game/GameContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BagCategory, GearRarity } from '@/game/types';
import { toast } from 'sonner';

interface ShopItem {
  id: string;
  name: string;
  icon: string;
  category: BagCategory;
  rarity: GearRarity;
  description: string;
  cost: { resource: string; amount: number };
  value?: number;
  resourceType?: string;
  duration?: number;
}

// ═══════════════════════════════════════════════════════════════════
//  MASSIVE SHOP INVENTORY — 150+ Items
//  Modeled after top strategy games: Rise of Kingdoms, Lords Mobile,
//  Evony, Age of Empires Mobile, King of Avalon, Clash of Empires,
//  Total Battle, Last Shelter, State of Survival, Vikings War
// ═══════════════════════════════════════════════════════════════════

const SHOP_ITEMS: ShopItem[] = [
  // ──────────────── SPEEDUPS (24 items) ────────────────
  // Universal
  { id: 'speed_1m', name: '1-Min Speed Up', icon: '⏩', category: 'speedups', rarity: 'common', description: 'Reduce any timer by 1 min', cost: { resource: 'diamonds', amount: 1 }, duration: 60 },
  { id: 'speed_5m', name: '5-Min Speed Up', icon: '⏩', category: 'speedups', rarity: 'common', description: 'Reduce any timer by 5 min', cost: { resource: 'diamonds', amount: 5 }, duration: 300 },
  { id: 'speed_10m', name: '10-Min Speed Up', icon: '⏩', category: 'speedups', rarity: 'common', description: 'Reduce any timer by 10 min', cost: { resource: 'diamonds', amount: 8 }, duration: 600 },
  { id: 'speed_15m', name: '15-Min Speed Up', icon: '⏩', category: 'speedups', rarity: 'uncommon', description: 'Reduce any timer by 15 min', cost: { resource: 'diamonds', amount: 12 }, duration: 900 },
  { id: 'speed_30m', name: '30-Min Speed Up', icon: '⏩', category: 'speedups', rarity: 'uncommon', description: 'Reduce any timer by 30 min', cost: { resource: 'diamonds', amount: 22 }, duration: 1800 },
  { id: 'speed_1h', name: '1-Hour Speed Up', icon: '⏩', category: 'speedups', rarity: 'rare', description: 'Reduce any timer by 1 hour', cost: { resource: 'diamonds', amount: 40 }, duration: 3600 },
  { id: 'speed_3h', name: '3-Hour Speed Up', icon: '⏩', category: 'speedups', rarity: 'rare', description: 'Reduce any timer by 3 hours', cost: { resource: 'diamonds', amount: 110 }, duration: 10800 },
  { id: 'speed_8h', name: '8-Hour Speed Up', icon: '⏩', category: 'speedups', rarity: 'ultra_rare', description: 'Reduce any timer by 8 hours', cost: { resource: 'diamonds', amount: 250 }, duration: 28800 },
  { id: 'speed_15h', name: '15-Hour Speed Up', icon: '⏩', category: 'speedups', rarity: 'ultra_rare', description: 'Reduce any timer by 15 hours', cost: { resource: 'diamonds', amount: 450 }, duration: 54000 },
  { id: 'speed_24h', name: '24-Hour Speed Up', icon: '⏩', category: 'speedups', rarity: 'legendary', description: 'Reduce any timer by 24 hours', cost: { resource: 'diamonds', amount: 700 }, duration: 86400 },
  { id: 'speed_3d', name: '3-Day Speed Up', icon: '⏩✨', category: 'speedups', rarity: 'legendary', description: 'Reduce any timer by 3 days', cost: { resource: 'diamonds', amount: 1800 }, duration: 259200 },
  { id: 'speed_7d', name: '7-Day Speed Up', icon: '⏩🔥', category: 'speedups', rarity: 'mythic', description: 'Reduce any timer by 7 days', cost: { resource: 'diamonds', amount: 3800 }, duration: 604800 },
  // Construction-specific
  { id: 'build_5m', name: 'Build Speed 5m', icon: '🏗️', category: 'speedups', rarity: 'common', description: 'Construction timer -5 min', cost: { resource: 'diamonds', amount: 3 }, duration: 300 },
  { id: 'build_1h', name: 'Build Speed 1h', icon: '🏗️', category: 'speedups', rarity: 'rare', description: 'Construction timer -1 hour', cost: { resource: 'diamonds', amount: 30 }, duration: 3600 },
  { id: 'build_8h', name: 'Build Speed 8h', icon: '🏗️', category: 'speedups', rarity: 'ultra_rare', description: 'Construction timer -8 hours', cost: { resource: 'diamonds', amount: 200 }, duration: 28800 },
  { id: 'build_24h', name: 'Build Speed 24h', icon: '🏗️✨', category: 'speedups', rarity: 'legendary', description: 'Construction timer -24 hours', cost: { resource: 'diamonds', amount: 550 }, duration: 86400 },
  // Research-specific
  { id: 'research_5m', name: 'Research Speed 5m', icon: '📜', category: 'speedups', rarity: 'common', description: 'Research timer -5 min', cost: { resource: 'diamonds', amount: 3 }, duration: 300 },
  { id: 'research_1h', name: 'Research Speed 1h', icon: '📜', category: 'speedups', rarity: 'rare', description: 'Research timer -1 hour', cost: { resource: 'diamonds', amount: 30 }, duration: 3600 },
  { id: 'research_8h', name: 'Research Speed 8h', icon: '📜', category: 'speedups', rarity: 'ultra_rare', description: 'Research timer -8 hours', cost: { resource: 'diamonds', amount: 200 }, duration: 28800 },
  // Training-specific
  { id: 'train_5m', name: 'Training Speed 5m', icon: '🎖️', category: 'speedups', rarity: 'common', description: 'Training timer -5 min', cost: { resource: 'diamonds', amount: 3 }, duration: 300 },
  { id: 'train_1h', name: 'Training Speed 1h', icon: '🎖️', category: 'speedups', rarity: 'rare', description: 'Training timer -1 hour', cost: { resource: 'diamonds', amount: 30 }, duration: 3600 },
  { id: 'train_8h', name: 'Training Speed 8h', icon: '🎖️', category: 'speedups', rarity: 'ultra_rare', description: 'Training timer -8 hours', cost: { resource: 'diamonds', amount: 200 }, duration: 28800 },
  // Healing-specific
  { id: 'heal_5m', name: 'Healing Speed 5m', icon: '💊', category: 'speedups', rarity: 'common', description: 'Healing timer -5 min', cost: { resource: 'diamonds', amount: 3 }, duration: 300 },
  { id: 'heal_1h', name: 'Healing Speed 1h', icon: '💊', category: 'speedups', rarity: 'rare', description: 'Healing timer -1 hour', cost: { resource: 'diamonds', amount: 28 }, duration: 3600 },

  // ──────────────── RESOURCE PACKS (30 items) ────────────────
  // Food tiers
  { id: 'food_1k', name: 'Food Satchel (1K)', icon: '🌾', category: 'resources', rarity: 'common', description: '+1,000 food', cost: { resource: 'diamonds', amount: 2 }, value: 1000, resourceType: 'food' },
  { id: 'food_5k', name: 'Food Pack (5K)', icon: '🌾', category: 'resources', rarity: 'common', description: '+5,000 food', cost: { resource: 'diamonds', amount: 8 }, value: 5000, resourceType: 'food' },
  { id: 'food_10k', name: 'Food Crate (10K)', icon: '🌾', category: 'resources', rarity: 'uncommon', description: '+10,000 food', cost: { resource: 'diamonds', amount: 14 }, value: 10000, resourceType: 'food' },
  { id: 'food_50k', name: 'Food Wagon (50K)', icon: '🌾', category: 'resources', rarity: 'rare', description: '+50,000 food', cost: { resource: 'diamonds', amount: 60 }, value: 50000, resourceType: 'food' },
  { id: 'food_150k', name: 'Food Convoy (150K)', icon: '🌾✨', category: 'resources', rarity: 'ultra_rare', description: '+150,000 food', cost: { resource: 'diamonds', amount: 160 }, value: 150000, resourceType: 'food' },
  { id: 'food_500k', name: 'Food Stockpile (500K)', icon: '🌾🔥', category: 'resources', rarity: 'legendary', description: '+500,000 food', cost: { resource: 'diamonds', amount: 480 }, value: 500000, resourceType: 'food' },
  // Wood tiers
  { id: 'wood_1k', name: 'Wood Satchel (1K)', icon: '🪵', category: 'resources', rarity: 'common', description: '+1,000 wood', cost: { resource: 'diamonds', amount: 2 }, value: 1000, resourceType: 'wood' },
  { id: 'wood_5k', name: 'Wood Pack (5K)', icon: '🪵', category: 'resources', rarity: 'common', description: '+5,000 wood', cost: { resource: 'diamonds', amount: 8 }, value: 5000, resourceType: 'wood' },
  { id: 'wood_10k', name: 'Wood Crate (10K)', icon: '🪵', category: 'resources', rarity: 'uncommon', description: '+10,000 wood', cost: { resource: 'diamonds', amount: 14 }, value: 10000, resourceType: 'wood' },
  { id: 'wood_50k', name: 'Wood Wagon (50K)', icon: '🪵', category: 'resources', rarity: 'rare', description: '+50,000 wood', cost: { resource: 'diamonds', amount: 60 }, value: 50000, resourceType: 'wood' },
  { id: 'wood_150k', name: 'Wood Convoy (150K)', icon: '🪵✨', category: 'resources', rarity: 'ultra_rare', description: '+150,000 wood', cost: { resource: 'diamonds', amount: 160 }, value: 150000, resourceType: 'wood' },
  { id: 'wood_500k', name: 'Timber Reserve (500K)', icon: '🪵🔥', category: 'resources', rarity: 'legendary', description: '+500,000 wood', cost: { resource: 'diamonds', amount: 480 }, value: 500000, resourceType: 'wood' },
  // Stone tiers
  { id: 'stone_1k', name: 'Stone Satchel (1K)', icon: '🪨', category: 'resources', rarity: 'common', description: '+1,000 stone', cost: { resource: 'diamonds', amount: 3 }, value: 1000, resourceType: 'stone' },
  { id: 'stone_5k', name: 'Stone Pack (5K)', icon: '🪨', category: 'resources', rarity: 'common', description: '+5,000 stone', cost: { resource: 'diamonds', amount: 10 }, value: 5000, resourceType: 'stone' },
  { id: 'stone_10k', name: 'Stone Crate (10K)', icon: '🪨', category: 'resources', rarity: 'uncommon', description: '+10,000 stone', cost: { resource: 'diamonds', amount: 18 }, value: 10000, resourceType: 'stone' },
  { id: 'stone_50k', name: 'Stone Wagon (50K)', icon: '🪨', category: 'resources', rarity: 'rare', description: '+50,000 stone', cost: { resource: 'diamonds', amount: 75 }, value: 50000, resourceType: 'stone' },
  { id: 'stone_150k', name: 'Stone Convoy (150K)', icon: '🪨✨', category: 'resources', rarity: 'ultra_rare', description: '+150,000 stone', cost: { resource: 'diamonds', amount: 200 }, value: 150000, resourceType: 'stone' },
  // Iron tiers
  { id: 'iron_500', name: 'Iron Satchel (500)', icon: '⚙️', category: 'resources', rarity: 'uncommon', description: '+500 iron', cost: { resource: 'diamonds', amount: 5 }, value: 500, resourceType: 'iron' },
  { id: 'iron_2k', name: 'Iron Pack (2K)', icon: '⚙️', category: 'resources', rarity: 'uncommon', description: '+2,000 iron', cost: { resource: 'diamonds', amount: 15 }, value: 2000, resourceType: 'iron' },
  { id: 'iron_5k', name: 'Iron Crate (5K)', icon: '⚙️', category: 'resources', rarity: 'rare', description: '+5,000 iron', cost: { resource: 'diamonds', amount: 35 }, value: 5000, resourceType: 'iron' },
  { id: 'iron_20k', name: 'Iron Wagon (20K)', icon: '⚙️', category: 'resources', rarity: 'ultra_rare', description: '+20,000 iron', cost: { resource: 'diamonds', amount: 120 }, value: 20000, resourceType: 'iron' },
  { id: 'iron_50k', name: 'Iron Stockpile (50K)', icon: '⚙️✨', category: 'resources', rarity: 'legendary', description: '+50,000 iron', cost: { resource: 'diamonds', amount: 280 }, value: 50000, resourceType: 'iron' },
  // Gold tiers
  { id: 'gold_500', name: 'Gold Pouch (500)', icon: '💰', category: 'resources', rarity: 'uncommon', description: '+500 gold', cost: { resource: 'diamonds', amount: 8 }, value: 500, resourceType: 'gold' },
  { id: 'gold_2k', name: 'Gold Chest (2K)', icon: '💰', category: 'resources', rarity: 'rare', description: '+2,000 gold', cost: { resource: 'diamonds', amount: 28 }, value: 2000, resourceType: 'gold' },
  { id: 'gold_5k', name: 'Gold Hoard (5K)', icon: '💰', category: 'resources', rarity: 'ultra_rare', description: '+5,000 gold', cost: { resource: 'diamonds', amount: 60 }, value: 5000, resourceType: 'gold' },
  { id: 'gold_20k', name: 'Gold Vault (20K)', icon: '💰✨', category: 'resources', rarity: 'legendary', description: '+20,000 gold', cost: { resource: 'diamonds', amount: 220 }, value: 20000, resourceType: 'gold' },
  // Mixed mega packs
  { id: 'mixed_starter', name: 'Starter Supply Pack', icon: '📦', category: 'resources', rarity: 'rare', description: '+5K each: food, wood, stone + 1K iron', cost: { resource: 'diamonds', amount: 40 }, value: 5000, resourceType: 'food' },
  { id: 'mixed_war', name: 'War Supply Bundle', icon: '📦⚔️', category: 'resources', rarity: 'ultra_rare', description: '+20K food, 20K wood, 10K stone, 5K iron', cost: { resource: 'diamonds', amount: 150 }, value: 20000, resourceType: 'food' },
  { id: 'mixed_imperial', name: 'Imperial Supply Chest', icon: '📦👑', category: 'resources', rarity: 'legendary', description: '+100K food, 100K wood, 50K stone, 20K iron', cost: { resource: 'diamonds', amount: 600 }, value: 100000, resourceType: 'food' },

  // ──────────────── SHIELDS (10 items) ────────────────
  { id: 'shield_30m', name: 'Peace Shield (30m)', icon: '🛡️', category: 'shields', rarity: 'common', description: '30-minute protection', cost: { resource: 'diamonds', amount: 5 }, duration: 1800 },
  { id: 'shield_2h', name: 'Peace Shield (2hr)', icon: '🛡️', category: 'shields', rarity: 'uncommon', description: '2-hour protection', cost: { resource: 'diamonds', amount: 12 }, duration: 7200 },
  { id: 'shield_4h', name: 'Peace Shield (4hr)', icon: '🛡️', category: 'shields', rarity: 'uncommon', description: '4-hour protection', cost: { resource: 'diamonds', amount: 20 }, duration: 14400 },
  { id: 'shield_8h', name: 'Peace Shield (8hr)', icon: '🛡️', category: 'shields', rarity: 'rare', description: '8-hour protection', cost: { resource: 'diamonds', amount: 35 }, duration: 28800 },
  { id: 'shield_24h', name: 'Peace Shield (24hr)', icon: '🛡️✨', category: 'shields', rarity: 'ultra_rare', description: '24-hour protection', cost: { resource: 'diamonds', amount: 80 }, duration: 86400 },
  { id: 'shield_3d', name: 'Peace Shield (3 Day)', icon: '🛡️🔥', category: 'shields', rarity: 'legendary', description: '3-day protection', cost: { resource: 'diamonds', amount: 200 }, duration: 259200 },
  { id: 'shield_7d', name: 'Peace Shield (7 Day)', icon: '🛡️👑', category: 'shields', rarity: 'mythic', description: '7-day protection', cost: { resource: 'diamonds', amount: 450 }, duration: 604800 },
  { id: 'anti_scout', name: 'Anti-Scout Shield (4hr)', icon: '🕵️‍♂️🚫', category: 'shields', rarity: 'rare', description: 'Blocks scouting for 4 hours', cost: { resource: 'diamonds', amount: 25 }, duration: 14400 },
  { id: 'anti_scout_24h', name: 'Anti-Scout Shield (24hr)', icon: '🕵️‍♂️🚫', category: 'shields', rarity: 'ultra_rare', description: 'Blocks scouting for 24 hours', cost: { resource: 'diamonds', amount: 70 }, duration: 86400 },
  { id: 'relocation_shield', name: 'Migration Shield (1hr)', icon: '🛡️🏃', category: 'shields', rarity: 'rare', description: 'Shields city for 1hr after relocating', cost: { resource: 'diamonds', amount: 30 }, duration: 3600 },

  // ──────────────── BOOSTS (30 items) ────────────────
  // Attack
  { id: 'atk_10_15m', name: 'ATK Boost +10% (15m)', icon: '⚔️', category: 'boosts', rarity: 'common', description: '+10% attack for 15 min', cost: { resource: 'diamonds', amount: 5 }, duration: 900 },
  { id: 'atk_20_30m', name: 'ATK Boost +20% (30m)', icon: '⚔️', category: 'boosts', rarity: 'uncommon', description: '+20% attack for 30 min', cost: { resource: 'diamonds', amount: 15 }, duration: 1800 },
  { id: 'atk_25_1h', name: 'ATK Boost +25% (1hr)', icon: '⚔️', category: 'boosts', rarity: 'rare', description: '+25% attack for 1 hour', cost: { resource: 'diamonds', amount: 35 }, duration: 3600 },
  { id: 'atk_30_4h', name: 'ATK Boost +30% (4hr)', icon: '⚔️✨', category: 'boosts', rarity: 'ultra_rare', description: '+30% attack for 4 hours', cost: { resource: 'diamonds', amount: 100 }, duration: 14400 },
  { id: 'atk_50_1h', name: 'ATK Boost +50% (1hr)', icon: '⚔️🔥', category: 'boosts', rarity: 'legendary', description: '+50% attack for 1 hour', cost: { resource: 'diamonds', amount: 150 }, duration: 3600 },
  // Defense
  { id: 'def_10_15m', name: 'DEF Boost +10% (15m)', icon: '🛡️', category: 'boosts', rarity: 'common', description: '+10% defense for 15 min', cost: { resource: 'diamonds', amount: 5 }, duration: 900 },
  { id: 'def_20_30m', name: 'DEF Boost +20% (30m)', icon: '🛡️', category: 'boosts', rarity: 'uncommon', description: '+20% defense for 30 min', cost: { resource: 'diamonds', amount: 15 }, duration: 1800 },
  { id: 'def_25_1h', name: 'DEF Boost +25% (1hr)', icon: '🛡️', category: 'boosts', rarity: 'rare', description: '+25% defense for 1 hour', cost: { resource: 'diamonds', amount: 35 }, duration: 3600 },
  { id: 'def_50_1h', name: 'DEF Boost +50% (1hr)', icon: '🛡️🔥', category: 'boosts', rarity: 'legendary', description: '+50% defense for 1 hour', cost: { resource: 'diamonds', amount: 150 }, duration: 3600 },
  // Health
  { id: 'hp_15_30m', name: 'HP Boost +15% (30m)', icon: '❤️', category: 'boosts', rarity: 'uncommon', description: '+15% troop HP for 30 min', cost: { resource: 'diamonds', amount: 15 }, duration: 1800 },
  { id: 'hp_25_1h', name: 'HP Boost +25% (1hr)', icon: '❤️', category: 'boosts', rarity: 'rare', description: '+25% troop HP for 1 hour', cost: { resource: 'diamonds', amount: 35 }, duration: 3600 },
  // Gathering
  { id: 'gather_15_30m', name: 'Gather Boost +15% (30m)', icon: '🍀', category: 'boosts', rarity: 'common', description: '+15% gathering for 30 min', cost: { resource: 'diamonds', amount: 8 }, duration: 1800 },
  { id: 'gather_30_1h', name: 'Gather Boost +30% (1hr)', icon: '🍀', category: 'boosts', rarity: 'uncommon', description: '+30% gathering for 1 hour', cost: { resource: 'diamonds', amount: 20 }, duration: 3600 },
  { id: 'gather_50_4h', name: 'Gather Boost +50% (4hr)', icon: '🍀✨', category: 'boosts', rarity: 'rare', description: '+50% gathering for 4 hours', cost: { resource: 'diamonds', amount: 80 }, duration: 14400 },
  { id: 'gather_100_1h', name: 'Gather Boost +100% (1hr)', icon: '🍀🔥', category: 'boosts', rarity: 'legendary', description: '+100% gathering for 1 hour', cost: { resource: 'diamonds', amount: 120 }, duration: 3600 },
  // Training
  { id: 'train_20_30m', name: 'Train Speed +20% (30m)', icon: '🏋️', category: 'boosts', rarity: 'uncommon', description: '+20% training speed for 30 min', cost: { resource: 'diamonds', amount: 15 }, duration: 1800 },
  { id: 'train_50_1h', name: 'Train Speed +50% (1hr)', icon: '🏋️', category: 'boosts', rarity: 'rare', description: '+50% training speed for 1 hour', cost: { resource: 'diamonds', amount: 35 }, duration: 3600 },
  { id: 'train_100_1h', name: 'Train Speed +100% (1hr)', icon: '🏋️✨', category: 'boosts', rarity: 'ultra_rare', description: '+100% training speed for 1 hour', cost: { resource: 'diamonds', amount: 80 }, duration: 3600 },
  // Construction
  { id: 'build_20_30m', name: 'Build Speed +20% (30m)', icon: '🏗️', category: 'boosts', rarity: 'uncommon', description: '+20% construction speed 30 min', cost: { resource: 'diamonds', amount: 15 }, duration: 1800 },
  { id: 'build_50_1h', name: 'Build Speed +50% (1hr)', icon: '🏗️', category: 'boosts', rarity: 'rare', description: '+50% construction speed 1 hr', cost: { resource: 'diamonds', amount: 35 }, duration: 3600 },
  // Research
  { id: 'res_20_30m', name: 'Research Speed +20% (30m)', icon: '📜', category: 'boosts', rarity: 'uncommon', description: '+20% research speed 30 min', cost: { resource: 'diamonds', amount: 15 }, duration: 1800 },
  { id: 'res_50_1h', name: 'Research Speed +50% (1hr)', icon: '📜', category: 'boosts', rarity: 'rare', description: '+50% research speed 1 hr', cost: { resource: 'diamonds', amount: 35 }, duration: 3600 },
  // March speed
  { id: 'march_20_30m', name: 'March Speed +20% (30m)', icon: '🏃', category: 'boosts', rarity: 'uncommon', description: '+20% march speed 30 min', cost: { resource: 'diamonds', amount: 12 }, duration: 1800 },
  { id: 'march_50_1h', name: 'March Speed +50% (1hr)', icon: '🏃✨', category: 'boosts', rarity: 'rare', description: '+50% march speed 1 hr', cost: { resource: 'diamonds', amount: 30 }, duration: 3600 },
  // Production
  { id: 'prod_25_4h', name: 'Production +25% (4hr)', icon: '🏭', category: 'boosts', rarity: 'uncommon', description: '+25% resource production 4 hr', cost: { resource: 'diamonds', amount: 20 }, duration: 14400 },
  { id: 'prod_50_8h', name: 'Production +50% (8hr)', icon: '🏭✨', category: 'boosts', rarity: 'rare', description: '+50% resource production 8 hr', cost: { resource: 'diamonds', amount: 60 }, duration: 28800 },
  // XP
  { id: 'xp_50_1h', name: 'XP Boost +50% (1hr)', icon: '⭐', category: 'boosts', rarity: 'rare', description: '+50% commander XP for 1 hour', cost: { resource: 'diamonds', amount: 25 }, duration: 3600 },
  { id: 'xp_100_1h', name: 'XP Boost +100% (1hr)', icon: '⭐✨', category: 'boosts', rarity: 'ultra_rare', description: '+100% commander XP for 1 hour', cost: { resource: 'diamonds', amount: 50 }, duration: 3600 },
  // Troop load
  { id: 'load_30_1h', name: 'Troop Load +30% (1hr)', icon: '📦', category: 'boosts', rarity: 'uncommon', description: '+30% troop carrying capacity 1hr', cost: { resource: 'diamonds', amount: 15 }, duration: 3600 },
  { id: 'load_50_4h', name: 'Troop Load +50% (4hr)', icon: '📦✨', category: 'boosts', rarity: 'rare', description: '+50% troop carrying capacity 4hr', cost: { resource: 'diamonds', amount: 45 }, duration: 14400 },

  // ──────────────── HEALING ITEMS (10 items) ────────────────
  { id: 'bandage_s', name: 'Field Bandage', icon: '🩹', category: 'healing', rarity: 'common', description: 'Heals 100 troops instantly', cost: { resource: 'diamonds', amount: 3 }, value: 100 },
  { id: 'bandage_m', name: 'Medical Kit', icon: '🩹', category: 'healing', rarity: 'uncommon', description: 'Heals 500 troops instantly', cost: { resource: 'diamonds', amount: 12 }, value: 500 },
  { id: 'bandage_l', name: 'Surgeon\'s Kit', icon: '🏥', category: 'healing', rarity: 'rare', description: 'Heals 2,000 troops instantly', cost: { resource: 'diamonds', amount: 40 }, value: 2000 },
  { id: 'bandage_xl', name: 'War Hospital Supply', icon: '🏥✨', category: 'healing', rarity: 'ultra_rare', description: 'Heals 10,000 troops instantly', cost: { resource: 'diamonds', amount: 150 }, value: 10000 },
  { id: 'revive_s', name: 'Revival Scroll (100)', icon: '📜💚', category: 'healing', rarity: 'rare', description: 'Revives 100 dead troops', cost: { resource: 'diamonds', amount: 50 }, value: 100 },
  { id: 'revive_m', name: 'Revival Scroll (500)', icon: '📜💚', category: 'healing', rarity: 'ultra_rare', description: 'Revives 500 dead troops', cost: { resource: 'diamonds', amount: 200 }, value: 500 },
  { id: 'revive_l', name: 'Revival Scroll (2K)', icon: '📜💚✨', category: 'healing', rarity: 'legendary', description: 'Revives 2,000 dead troops', cost: { resource: 'diamonds', amount: 700 }, value: 2000 },
  { id: 'hospital_expand', name: 'Hospital Expansion (1hr)', icon: '🏥+', category: 'healing', rarity: 'rare', description: '+30% hospital capacity for 1hr', cost: { resource: 'diamonds', amount: 30 }, duration: 3600 },
  { id: 'heal_cost_red', name: 'Healing Cost -30% (4hr)', icon: '💊💰', category: 'healing', rarity: 'rare', description: '-30% healing cost for 4 hours', cost: { resource: 'diamonds', amount: 35 }, duration: 14400 },
  { id: 'heal_all', name: 'Heal All Troops', icon: '🏥🔥', category: 'healing', rarity: 'legendary', description: 'Instantly heal all wounded troops', cost: { resource: 'diamonds', amount: 500 } },

  // ──────────────── WAR ITEMS (12 items) ────────────────
  { id: 'rally_flag', name: 'Rally Flag', icon: '🚩', category: 'war', rarity: 'rare', description: '+1 rally slot for 4 hours', cost: { resource: 'diamonds', amount: 40 }, duration: 14400 },
  { id: 'war_horn', name: 'War Horn', icon: '📯', category: 'war', rarity: 'uncommon', description: '+10% all troop stats in next battle', cost: { resource: 'diamonds', amount: 25 } },
  { id: 'berserker', name: 'Berserker Rage', icon: '🔥💀', category: 'war', rarity: 'rare', description: '+30% ATK but -15% DEF for 30 min', cost: { resource: 'diamonds', amount: 30 }, duration: 1800 },
  { id: 'fortress', name: 'Fortress Mode', icon: '🏰🛡️', category: 'war', rarity: 'rare', description: '+40% city defense for 2 hours', cost: { resource: 'diamonds', amount: 45 }, duration: 7200 },
  { id: 'ambush_trap', name: 'Ambush Trap x10', icon: '🪤', category: 'war', rarity: 'uncommon', description: '10 hidden traps for city defense', cost: { resource: 'diamonds', amount: 20 }, value: 10 },
  { id: 'siege_bomb', name: 'Siege Bombard', icon: '💣', category: 'war', rarity: 'ultra_rare', description: 'Deals damage to enemy wall during siege', cost: { resource: 'diamonds', amount: 80 } },
  { id: 'march_recall', name: 'Instant March Recall', icon: '🔙', category: 'war', rarity: 'rare', description: 'Instantly recall any marching army', cost: { resource: 'diamonds', amount: 30 } },
  { id: 'extra_march', name: 'Extra March Slot (8hr)', icon: '🚩+', category: 'war', rarity: 'ultra_rare', description: '+1 march slot for 8 hours', cost: { resource: 'diamonds', amount: 100 }, duration: 28800 },
  { id: 'army_expand', name: 'Army Size +20% (4hr)', icon: '⚔️📈', category: 'war', rarity: 'rare', description: '+20% march capacity for 4 hours', cost: { resource: 'diamonds', amount: 50 }, duration: 14400 },
  { id: 'morale_boost', name: 'Morale Boost', icon: '💪', category: 'war', rarity: 'uncommon', description: '+15% all stats for next 2 battles', cost: { resource: 'diamonds', amount: 25 } },
  { id: 'spy_glass', name: 'Spyglass', icon: '🔭', category: 'war', rarity: 'rare', description: 'Reveal all marches within 3 tiles for 2hr', cost: { resource: 'diamonds', amount: 35 }, duration: 7200 },
  { id: 'decoy_army', name: 'Decoy Army', icon: '👻⚔️', category: 'war', rarity: 'ultra_rare', description: 'Create fake march to confuse enemies', cost: { resource: 'diamonds', amount: 60 } },

  // ──────────────── TELEPORTS & MOVEMENT (8 items) ────────────────
  { id: 'tp_random', name: 'Random Teleport', icon: '🌀', category: 'teleports', rarity: 'uncommon', description: 'Teleport to random location', cost: { resource: 'diamonds', amount: 15 } },
  { id: 'tp_targeted', name: 'Targeted Teleport', icon: '📍', category: 'teleports', rarity: 'rare', description: 'Teleport to any coordinate', cost: { resource: 'diamonds', amount: 50 } },
  { id: 'tp_alliance', name: 'Alliance Teleport', icon: '🏳️📍', category: 'teleports', rarity: 'rare', description: 'Teleport near alliance territory', cost: { resource: 'diamonds', amount: 40 } },
  { id: 'tp_kingdom', name: 'Kingdom Teleport', icon: '🌍', category: 'teleports', rarity: 'legendary', description: 'Migrate to another kingdom', cost: { resource: 'diamonds', amount: 1500 } },
  { id: 'tp_return', name: 'Return Teleport', icon: '🏠', category: 'teleports', rarity: 'uncommon', description: 'Return to original coordinates', cost: { resource: 'diamonds', amount: 20 } },
  { id: 'bookmark_slot', name: 'Bookmark Slot', icon: '📌', category: 'teleports', rarity: 'rare', description: 'Save a map location for quick teleport', cost: { resource: 'diamonds', amount: 30 } },
  { id: 'fog_reveal', name: 'Fog Reveal (Zone)', icon: '🌫️🔍', category: 'teleports', rarity: 'rare', description: 'Reveal fog of war in a 5-tile radius', cost: { resource: 'diamonds', amount: 25 } },
  { id: 'watchtower_ext', name: 'Watchtower Range +2 (8hr)', icon: '🗼', category: 'teleports', rarity: 'ultra_rare', description: 'Extends watchtower range for 8 hours', cost: { resource: 'diamonds', amount: 60 }, duration: 28800 },

  // ──────────────── SCOUTING ITEMS (6 items) ────────────────
  { id: 'scout_report', name: 'Detailed Scout Report', icon: '🔎', category: 'scouting', rarity: 'uncommon', description: 'Full report on target (troops, resources, traps)', cost: { resource: 'diamonds', amount: 10 } },
  { id: 'counter_intel', name: 'Counter Intelligence', icon: '🕵️', category: 'scouting', rarity: 'rare', description: 'Shows who scouted you in last 24hr', cost: { resource: 'diamonds', amount: 20 } },
  { id: 'scout_speed', name: 'Scout Speed +100% (1hr)', icon: '🔭💨', category: 'scouting', rarity: 'uncommon', description: 'Double scout march speed for 1 hour', cost: { resource: 'diamonds', amount: 12 }, duration: 3600 },
  { id: 'deep_scout', name: 'Deep Reconnaissance', icon: '🔭✨', category: 'scouting', rarity: 'rare', description: 'Scout shows garrison skills & buffs', cost: { resource: 'diamonds', amount: 30 } },
  { id: 'mass_scout', name: 'Mass Scout (5 targets)', icon: '🔭🔭', category: 'scouting', rarity: 'rare', description: 'Scout 5 targets simultaneously', cost: { resource: 'diamonds', amount: 35 } },
  { id: 'scout_immunity', name: 'Scout Immunity (4hr)', icon: '🔭🚫', category: 'scouting', rarity: 'ultra_rare', description: 'Enemies cannot scout you for 4 hours', cost: { resource: 'diamonds', amount: 50 }, duration: 14400 },

  // ──────────────── VIP & PRESTIGE (8 items) ────────────────
  { id: 'vip_1h', name: 'VIP Points (100)', icon: '👑', category: 'vip', rarity: 'uncommon', description: '+100 VIP points', cost: { resource: 'diamonds', amount: 10 }, value: 100 },
  { id: 'vip_500', name: 'VIP Points (500)', icon: '👑', category: 'vip', rarity: 'rare', description: '+500 VIP points', cost: { resource: 'diamonds', amount: 45 }, value: 500 },
  { id: 'vip_2k', name: 'VIP Points (2K)', icon: '👑✨', category: 'vip', rarity: 'ultra_rare', description: '+2,000 VIP points', cost: { resource: 'diamonds', amount: 160 }, value: 2000 },
  { id: 'vip_10k', name: 'VIP Points (10K)', icon: '👑🔥', category: 'vip', rarity: 'legendary', description: '+10,000 VIP points', cost: { resource: 'diamonds', amount: 700 }, value: 10000 },
  { id: 'name_change', name: 'Name Change Scroll', icon: '📝', category: 'vip', rarity: 'rare', description: 'Change your commander name', cost: { resource: 'diamonds', amount: 50 } },
  { id: 'portrait_frame', name: 'Portrait Frame (Gold)', icon: '🖼️', category: 'vip', rarity: 'ultra_rare', description: 'Exclusive gold portrait frame', cost: { resource: 'diamonds', amount: 200 } },
  { id: 'chat_bubble', name: 'Royal Chat Bubble', icon: '💬👑', category: 'vip', rarity: 'rare', description: 'Gold chat bubble for 30 days', cost: { resource: 'diamonds', amount: 100 }, duration: 2592000 },
  { id: 'title_deed', name: 'Custom Title Deed', icon: '📜👑', category: 'vip', rarity: 'legendary', description: 'Display a custom title for 7 days', cost: { resource: 'diamonds', amount: 300 }, duration: 604800 },

  // ──────────────── TALENT & SKILL (6 items) ────────────────
  { id: 'talent_reset', name: 'Talent Reset Scroll', icon: '🔄📜', category: 'talents', rarity: 'rare', description: 'Reset all talent points', cost: { resource: 'diamonds', amount: 50 } },
  { id: 'skill_reset', name: 'Skill Reset Scroll', icon: '🔄⚔️', category: 'talents', rarity: 'rare', description: 'Reset hero skill points', cost: { resource: 'diamonds', amount: 50 } },
  { id: 'exp_tome_s', name: 'EXP Tome (1K)', icon: '📕', category: 'talents', rarity: 'uncommon', description: '+1,000 hero EXP', cost: { resource: 'diamonds', amount: 10 }, value: 1000 },
  { id: 'exp_tome_m', name: 'EXP Tome (5K)', icon: '📕', category: 'talents', rarity: 'rare', description: '+5,000 hero EXP', cost: { resource: 'diamonds', amount: 40 }, value: 5000 },
  { id: 'exp_tome_l', name: 'EXP Tome (20K)', icon: '📕✨', category: 'talents', rarity: 'ultra_rare', description: '+20,000 hero EXP', cost: { resource: 'diamonds', amount: 140 }, value: 20000 },
  { id: 'star_medal', name: 'Star Medal', icon: '🌟', category: 'talents', rarity: 'legendary', description: 'Upgrade hero star level (+1 star)', cost: { resource: 'diamonds', amount: 500 } },

  // ──────────────── GUILD ITEMS (8 items) ────────────────
  { id: 'guild_gift_s', name: 'Guild Gift (Small)', icon: '🎁', category: 'guild', rarity: 'uncommon', description: 'Send small gift to all guild members', cost: { resource: 'diamonds', amount: 20 } },
  { id: 'guild_gift_l', name: 'Guild Gift (Large)', icon: '🎁✨', category: 'guild', rarity: 'rare', description: 'Send large gift to all guild members', cost: { resource: 'diamonds', amount: 100 } },
  { id: 'guild_gift_xl', name: 'Guild Gift (Royal)', icon: '🎁👑', category: 'guild', rarity: 'legendary', description: 'Send legendary gift to all guild members', cost: { resource: 'diamonds', amount: 500 } },
  { id: 'guild_help_cd', name: 'Help Cooldown Reset', icon: '🤝🔄', category: 'guild', rarity: 'uncommon', description: 'Reset guild help cooldown', cost: { resource: 'diamonds', amount: 10 } },
  { id: 'guild_tech_scroll', name: 'Guild Tech Scroll', icon: '📜🏛️', category: 'guild', rarity: 'rare', description: '+500 guild tech donation points', cost: { resource: 'diamonds', amount: 30 }, value: 500 },
  { id: 'guild_banner', name: 'Guild War Banner (24hr)', icon: '🏴', category: 'guild', rarity: 'ultra_rare', description: '+10% ATK/DEF for all guild members 24hr', cost: { resource: 'diamonds', amount: 200 }, duration: 86400 },
  { id: 'guild_fort', name: 'Guild Fort Repair Kit', icon: '🏰🔧', category: 'guild', rarity: 'rare', description: 'Repair 50% of guild fortress HP', cost: { resource: 'diamonds', amount: 60 } },
  { id: 'guild_rally_cd', name: 'Rally Cooldown Reset', icon: '🚩🔄', category: 'guild', rarity: 'rare', description: 'Reset rally cooldown for guild', cost: { resource: 'diamonds', amount: 40 } },

  // ──────────────── SPECIAL & RARE (10 items) ────────────────
  { id: 'lucky_coin', name: 'Lucky Coin', icon: '🪙', category: 'special', rarity: 'rare', description: '+10% loot drop chance for 2 hours', cost: { resource: 'diamonds', amount: 25 }, duration: 7200 },
  { id: 'peace_treaty', name: 'Peace Treaty', icon: '📜🕊️', category: 'special', rarity: 'ultra_rare', description: 'Force ceasefire with target for 24hr', cost: { resource: 'diamonds', amount: 200 }, duration: 86400 },
  { id: 'golden_key', name: 'Golden Key', icon: '🔑✨', category: 'special', rarity: 'legendary', description: 'Opens any legendary chest', cost: { resource: 'diamonds', amount: 150 } },
  { id: 'builders_hammer', name: 'Builder\'s Hammer (24hr)', icon: '🔨', category: 'special', rarity: 'ultra_rare', description: '+1 builder queue for 24 hours', cost: { resource: 'diamonds', amount: 250 }, duration: 86400 },
  { id: 'time_warp', name: 'Time Warp (2hr)', icon: '⏳', category: 'special', rarity: 'legendary', description: 'Collect 2 hours of resources instantly', cost: { resource: 'diamonds', amount: 100 } },
  { id: 'dragon_egg', name: 'Dragon Egg Fragment', icon: '🥚🐉', category: 'special', rarity: 'mythic', description: 'Collect 10 to hatch a dragon companion', cost: { resource: 'diamonds', amount: 800 } },
  { id: 'rune_box', name: 'Rune Mystery Box', icon: '🎲', category: 'special', rarity: 'rare', description: 'Random rune (common to legendary)', cost: { resource: 'diamonds', amount: 50 } },
  { id: 'starfall_shard', name: 'Starfall Shard', icon: '⭐💎', category: 'special', rarity: 'legendary', description: 'Crafting material for mythic equipment', cost: { resource: 'diamonds', amount: 300 } },
  { id: 'phoenix_feather_shop', name: 'Phoenix Feather', icon: '🪶🔥', category: 'special', rarity: 'ultra_rare', description: 'Rare crafting material', cost: { resource: 'diamonds', amount: 180 } },
  { id: 'void_crystal', name: 'Void Crystal', icon: '💜', category: 'special', rarity: 'mythic', description: 'Ultra-rare crafting material for mythic gear', cost: { resource: 'diamonds', amount: 1000 } },
];

const RARITY_COLORS: Record<GearRarity, string> = {
  common: 'text-muted-foreground', uncommon: 'text-green-400', rare: 'text-blue-400',
  ultra_rare: 'text-purple-400', legendary: 'text-yellow-400', mythic: 'text-pink-400',
};

const RARITY_BORDER: Record<GearRarity, string> = {
  common: 'border-border/50', uncommon: 'border-green-500/30', rare: 'border-blue-500/30',
  ultra_rare: 'border-purple-500/30', legendary: 'border-yellow-500/30', mythic: 'border-pink-500/30',
};

const CATEGORIES = [
  { key: 'all', label: '🏪 All', count: 0 },
  { key: 'speedups', label: '⏩ Speed Ups' },
  { key: 'resources', label: '📦 Resources' },
  { key: 'shields', label: '🛡️ Shields' },
  { key: 'boosts', label: '⚡ Boosts' },
  { key: 'healing', label: '💊 Healing' },
  { key: 'war', label: '⚔️ War Items' },
  { key: 'teleports', label: '🌀 Teleports' },
  { key: 'scouting', label: '🔭 Scouting' },
  { key: 'vip', label: '👑 VIP' },
  { key: 'talents', label: '📕 Talents' },
  { key: 'guild', label: '🏛️ Guild' },
  { key: 'special', label: '✨ Special' },
];

export default function ShopPage() {
  const { state, canAfford, setState, saveState } = useGame();
  const [category, setCategory] = useState('all');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'price_asc' | 'price_desc' | 'rarity'>('name');

  const filtered = useMemo(() => {
    let items = category === 'all' ? SHOP_ITEMS : SHOP_ITEMS.filter(i => i.category === category);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(i => i.name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q));
    }
    switch (sortBy) {
      case 'price_asc': return [...items].sort((a, b) => a.cost.amount - b.cost.amount);
      case 'price_desc': return [...items].sort((a, b) => b.cost.amount - a.cost.amount);
      case 'rarity': {
        const order: Record<string, number> = { common: 0, uncommon: 1, rare: 2, ultra_rare: 3, legendary: 4, mythic: 5 };
        return [...items].sort((a, b) => (order[b.rarity] || 0) - (order[a.rarity] || 0));
      }
      default: return items;
    }
  }, [category, searchQuery, sortBy]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: SHOP_ITEMS.length };
    SHOP_ITEMS.forEach(i => { counts[i.category] = (counts[i.category] || 0) + 1; });
    return counts;
  }, []);

  const buyItem = (item: ShopItem) => {
    const qty = quantities[item.id] || 1;
    const totalCost = item.cost.amount * qty;
    if (!canAfford({ [item.cost.resource]: totalCost })) {
      toast.error('Not enough 💎 diamonds');
      return;
    }

    setState(prev => {
      const resources = { ...prev.resources };
      resources[item.cost.resource as keyof typeof resources] -= totalCost;

      // For mixed packs, give multiple resources
      if (item.id === 'mixed_starter') {
        resources.food += 5000 * qty; resources.wood += 5000 * qty;
        resources.stone += 5000 * qty; resources.iron += 1000 * qty;
      } else if (item.id === 'mixed_war') {
        resources.food += 20000 * qty; resources.wood += 20000 * qty;
        resources.stone += 10000 * qty; resources.iron += 5000 * qty;
      } else if (item.id === 'mixed_imperial') {
        resources.food += 100000 * qty; resources.wood += 100000 * qty;
        resources.stone += 50000 * qty; resources.iron += 20000 * qty;
      }

      const bag = [...(prev.bag || [])];
      // Don't add mixed packs to bag (resources go directly)
      if (!item.id.startsWith('mixed_')) {
        const existing = bag.find(b => b.name === item.name);
        if (existing) {
          existing.quantity = Math.min(100_000, existing.quantity + qty);
        } else {
          bag.push({
            id: `bag_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            name: item.name, icon: item.icon, category: item.category,
            rarity: item.rarity, quantity: qty, description: item.description,
            value: item.value, resourceType: item.resourceType, duration: item.duration,
            obtainedAt: Date.now(),
          });
        }
      }
      const ns = { ...prev, resources, bag };
      saveState(ns);
      return ns;
    });
    toast.success(`Bought ${qty}x ${item.icon} ${item.name}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="font-display text-xl text-foreground">🏪 Dragon Chaos Shop</h2>
          <p className="text-xs text-muted-foreground">{SHOP_ITEMS.length} items available · All purchases use 💎 diamonds</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-display text-foreground">💎 {state.resources.diamonds.toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground">Your Diamonds</p>
        </div>
      </div>

      {/* Search + Sort */}
      <div className="flex gap-2 flex-wrap">
        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="🔍 Search items..."
          className="flex-1 min-w-[140px] bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as typeof sortBy)}
          className="bg-background border border-border rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="name">Sort: Name</option>
          <option value="price_asc">Price: Low→High</option>
          <option value="price_desc">Price: High→Low</option>
          <option value="rarity">Rarity</option>
        </select>
      </div>

      {/* Category tabs - scrollable */}
      <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
        {CATEGORIES.map(c => (
          <button
            key={c.key}
            onClick={() => setCategory(c.key)}
            className={`flex-shrink-0 px-2.5 py-1.5 rounded-lg text-[10px] font-display transition-colors whitespace-nowrap ${
              category === c.key
                ? 'bg-primary/20 text-primary ring-1 ring-primary/40'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted'
            }`}
          >
            {c.label} <span className="opacity-60">({categoryCounts[c.key] || 0})</span>
          </button>
        ))}
      </div>

      {/* Results count */}
      <p className="text-[10px] text-muted-foreground">{filtered.length} items shown</p>

      {/* Item grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {filtered.map(item => {
          const qty = quantities[item.id] || 1;
          const totalCost = item.cost.amount * qty;
          const affordable = canAfford({ [item.cost.resource]: totalCost });

          return (
            <Card key={item.id} className={`bg-card/80 ${RARITY_BORDER[item.rarity]}`}>
              <CardContent className="p-3">
                <div className="flex items-start gap-2.5">
                  <span className="text-xl flex-shrink-0">{item.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className={`text-xs font-semibold ${RARITY_COLORS[item.rarity]} truncate`}>{item.name}</div>
                    <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{item.description}</p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <div className="flex items-center gap-0.5">
                        <button className="w-5 h-5 rounded bg-muted text-foreground text-[10px] hover:bg-muted/80" onClick={() => setQuantities(p => ({ ...p, [item.id]: Math.max(1, (p[item.id] || 1) - 1) }))}>-</button>
                        <span className="text-[10px] w-5 text-center text-foreground">{qty}</span>
                        <button className="w-5 h-5 rounded bg-muted text-foreground text-[10px] hover:bg-muted/80" onClick={() => setQuantities(p => ({ ...p, [item.id]: Math.min(99, (p[item.id] || 1) + 1) }))}>+</button>
                      </div>
                      <Button size="sm" className="h-6 text-[10px] px-2" disabled={!affordable} onClick={() => buyItem(item)}>
                        {totalCost.toLocaleString()} 💎
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-8">
          <p className="text-2xl mb-2">🔍</p>
          <p className="text-sm text-muted-foreground">No items found. Try a different search or category.</p>
        </div>
      )}
    </div>
  );
}
