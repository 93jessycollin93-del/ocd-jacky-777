import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/eru/api/base44Client';
import { fetchUserGold, awardGold } from '@/eru/lib/economyApi';
import { STARTER_CARDS, ELEMENT_COLORS } from '../components/cards/StarterCards';
import { DECK_MODE_OPTIONS, DEFAULT_DECK_MODE, buildDeckModeSummary, calculateDeckStrength, getFairMatchScore, getMinimumDeckForMode, normalizeDeckMode } from '../components/cards/deckModes';
import CardDisplay from '../components/cards/CardDisplay';
import BattleView from '../components/cards/BattleView';
import ChallengePanel from '../components/cards/ChallengePanel';
import { Sword, Trophy, Package, Layers, Coins, X, ShoppingCart, History, Radar, Bot, GraduationCap, Dumbbell, Shield, Copy, Wand2, ArrowLeftRight, BookOpen, Target } from 'lucide-react';
import { reportQuestEvent } from '@/eru/lib/dailyQuests';
import DailyQuestPanel from '../components/quests/DailyQuestPanel';
import { recordGuildBattleResult } from '@/eru/lib/guildSystem';
import Marketplace from '../components/cards/Marketplace';
import BattleHistoryPanel from '../components/cards/BattleHistoryPanel';
import CardLorePanel from '../components/cards/CardLorePanel';
import RealityPressureMeter from '../components/cards/RealityPressureMeter';
import ExcavationPackPanel from '../components/cards/ExcavationPackPanel';
import TransmutationPanel from '../components/cards/TransmutationPanel';
import ForgeRecipesPanel from '../components/cards/ForgeRecipesPanel';
import TradingPanel from '../components/cards/TradingPanel';
import LevelUpDialog from '../components/cards/LevelUpDialog';
import { ensureLoreProfile, appendLogEntry, bumpPressure, isHighPowerCard, createCardWithLore } from '@/eru/lib/cardLore';

const TOURNAMENT_ROUNDS = [
  { id: 1, name: 'Novice Challenger', difficulty: 1, faction: 'Ember Clan',    prize: { gold: 50,  discover: true } },
  { id: 2, name: 'Adept Warrior',     difficulty: 2, faction: 'Stone Legion',  prize: { gold: 100, discover: true } },
  { id: 3, name: 'Grand Master',      difficulty: 3, faction: 'Tide Order',    prize: { gold: 250, discover: true } },
];

const TABS = [
  { id: 'collection', label: 'Collection', icon: Package },
  { id: 'deck',       label: 'Deck',       icon: Layers },
  { id: 'lobby',      label: 'Lobby',      icon: Radar },
  { id: 'tournament', label: 'Tournament', icon: Trophy },
  { id: 'history',    label: 'History',    icon: History },
  { id: 'forge',      label: 'Forge',      icon: Wand2 },
  { id: 'trading',    label: 'Trading',    icon: ArrowLeftRight },
  { id: 'quests',     label: 'Quests',     icon: Target },
  { id: 'market',     label: 'Market',     icon: ShoppingCart },
];

const JACKIE_NAMES = ['Jackie Scout', 'Jackie Duelist', 'Jackie Prime', 'Jackie Oracle'];
const TUTORIAL_STEPS = [
  'Build a legal deck for the selected deck-size mode before queueing.',
  'Play your strongest tempo card first to build board pressure.',
  'Use burn and poison to finish weakened opponents.',
  'Guard and shield cards help you win close board races.'
];

const TOURNAMENT_DECK_MODES = [10, 20, 30];

export default function CardArena() {
  const [tab, setTab] = useState('collection');
  const [cards, setCards] = useState([]);
  const [deck, setDeck] = useState([]);
  const [gold, setGold] = useState(0);
  const [goldLoading, setGoldLoading] = useState(true);
  const [tournamentRound, setTournamentRound] = useState(0);
  const [battling, setBattling] = useState(false);
  const [currentRound, setCurrentRound] = useState(null);
  const [roundResults, setRoundResults] = useState([]);
  const [discoveredCard, setDiscoveredCard] = useState(null);
  const [battleReward, setBattleReward] = useState(null);
  const [battleHistory, setBattleHistory] = useState([]);
  const [selectedBattle, setSelectedBattle] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [playerProfile, setPlayerProfile] = useState(null);
  const [queueEntry, setQueueEntry] = useState(null);
  const [matchRoom, setMatchRoom] = useState(null);
  const [battleMode, setBattleMode] = useState('tournament');
  const [activeOpponentDeck, setActiveOpponentDeck] = useState(null);
  const [activeOpponentName, setActiveOpponentName] = useState('');
  const [activeOpponentFaction, setActiveOpponentFaction] = useState('');
  const [activeDifficulty, setActiveDifficulty] = useState(1);
  const [campaignLevel, setCampaignLevel] = useState(1);
  const [deckMode, setDeckMode] = useState(DEFAULT_DECK_MODE);
  const [teamSize, setTeamSize] = useState(1);
  const [queueMode, setQueueMode] = useState('pvp_ladder');
  const [inviteSearch, setInviteSearch] = useState('');
  const [arenaUsers, setArenaUsers] = useState([]);
  const [openChallenges, setOpenChallenges] = useState([]);
  const [copyingDeck, setCopyingDeck] = useState(false);
  const [loreCard, setLoreCard] = useState(null);
  const [levelUpCard, setLevelUpCard] = useState(null);
  const [forgeView, setForgeView] = useState('transmute'); // 'transmute' | 'recipes'

  useEffect(() => {
    loadCards();
    loadGold();
    loadBattleHistory();
    loadPlayerProfile();
    loadQueueState();
    loadArenaUsers();
  }, []);

  const loadGold = async () => {
    try {
      setGoldLoading(true);
      const balance = await fetchUserGold();
      setGold(balance);
    } catch (err) {
      console.error('Failed to load gold:', err);
    } finally {
      setGoldLoading(false);
    }
  };

  const loadCards = async () => {
    setLoading(true);
    const owned = await base44.entities.Card.list('-created_date', 100);
    const ownedIds = new Set(owned.map(c => c.name));
    const starters = STARTER_CARDS.filter(c => !ownedIds.has(c.name));
    setCards([...owned, ...starters]);
    if (owned.length === 0) setDeck(STARTER_CARDS.slice(0, 5));
    else setDeck(owned.slice(0, 5));
    setLoading(false);
  };

  const saveGold = async (amount) => {
    setGold(amount);
  };

  const loadArenaUsers = async () => {
    const users = await base44.entities.User.list().catch(() => []);
    setArenaUsers(users || []);
  };

  const normalizedDeckMode = useMemo(() => normalizeDeckMode(deckMode), [deckMode]);
  const deckModeSummary = useMemo(() => buildDeckModeSummary(normalizedDeckMode), [normalizedDeckMode]);
  const deckStrength = useMemo(() => calculateDeckStrength(deck, normalizedDeckMode), [deck, normalizedDeckMode]);
  const collectionStrength = useMemo(() => cards.reduce((sum, card) => sum + (card.power || 0) + (card.guard || 0), 0), [cards]);

  const serializeDeck = (deckCards = []) => deckCards.map((card) => ({
    name: card.name,
    element: card.element,
    rarity: card.rarity,
    cost: card.cost,
    power: card.power,
    guard: card.guard,
    ability: card.ability,
    ability_value: card.ability_value || 0,
  }));

  const hydrateDeckSnapshot = (deckCards = []) => deckCards.map((card, index) => ({
    ...card,
    id: `${card.name}-${index}-${card.rarity}`,
    card_type: card.card_type || 'unit',
  }));

  const loadPlayerProfile = async () => {
    const me = await base44.auth.me();
    const profiles = await base44.entities.CardPlayerProfile.list('-created_date', 20);
    const existing = profiles.find((profile) => profile.user_email === me.email);
    if (existing) {
      setPlayerProfile(existing);
      setCampaignLevel(existing.ai_campaign_level_unlocked || 1);
      return;
    }

    const created = await base44.entities.CardPlayerProfile.create({
      user_email: me.email,
      display_name: me.full_name || me.email.split('@')[0],
      collection_strength: collectionStrength,
      favorite_deck_power: deckStrength,
    });
    setPlayerProfile(created);
    setCampaignLevel(created.ai_campaign_level_unlocked || 1);
  };

  const loadQueueState = async () => {
    const me = await base44.auth.me();
    const queueRows = await base44.entities.CardMatchmakingQueue.list('-created_date', 100);
    const roomRows = await base44.entities.CardMatchmakingRoom.list('-created_date', 100);
    setQueueEntry(queueRows.find((row) => row.user_email === me.email && ['searching', 'open_challenge', 'invited', 'matched'].includes(row.status)) || null);
    setOpenChallenges(queueRows.filter((row) => row.status === 'open_challenge' && row.user_email !== me.email));
    setMatchRoom(roomRows.find((room) => [room.player_one_email, room.player_two_email, room.player_three_email, room.player_four_email].includes(me.email) && room.status !== 'completed') || null);
  };

  const loadBattleHistory = async () => {
    setHistoryLoading(true);
    const history = await base44.entities.CardBattleHistory.list('-created_date', 50);
    setBattleHistory(history);
    setSelectedBattle((prev) => prev || history[0] || null);
    setHistoryLoading(false);
  };

  const saveBattleHistory = async (won, round, battleData) => {
    const eloBefore = playerProfile?.elo_rating || 1000;
    const eloDelta = battleMode === 'pvp_ladder' ? (won ? 18 : -14) : battleMode === 'pvp_duo' ? (won ? 14 : -10) : battleMode === 'jackie_ai' ? (won ? 8 : -5) : 0;
    const eloAfter = Math.max(800, eloBefore + eloDelta);

    const saved = await base44.entities.CardBattleHistory.create({
      mode: battleMode,
      result: won ? 'win' : 'loss',
      opponent_name: activeOpponentName || currentRound?.name || round?.name,
      opponent_faction: battleData?.opponentFaction || activeOpponentFaction || round?.faction,
      difficulty: activeDifficulty || round?.difficulty || 1,
      round_number: tournamentRound,
      turns_played: battleData?.turnsPlayed || 0,
      player_board_power: battleData?.playerBoardPower || 0,
      opponent_board_power: battleData?.aiBoardPower || 0,
      player_hp_end: battleData?.playerHP || 0,
      opponent_hp_end: battleData?.aiHP || 0,
      deck_mode: battleData?.deckMode || normalizedDeckMode,
      team_size: battleData?.teamSize || teamSize,
      player_deck_snapshot: serializeDeck(battleData?.playerDeck || deck),
      opponent_deck_snapshot: serializeDeck(battleData?.aiDeck || []),
      turn_log: battleData?.turnLog || [],
      room_key: matchRoom?.room_key,
      player_elo_before: eloBefore,
      player_elo_after: eloAfter,
      campaign_level: battleMode === 'ai_campaign' ? campaignLevel : undefined,
      card_outcomes: (battleData?.playerDeck || deck).map((card) => ({
        card_id: card.id,
        card_name: card.name,
        result: won ? 'win' : 'loss',
        mode: battleMode,
      })),
    });

    const usageRows = (battleData?.playerDeck || deck).map((card) => ({
      card_id: card.id,
      card_name: card.name,
      battle_history_id: saved.id,
      mode: battleMode,
      result: won ? 'win' : 'loss',
      opponent_name: activeOpponentName || currentRound?.name || round?.name,
    }));

    await Promise.all([
      ...usageRows.map((row) => base44.entities.CardUsageHistory.create(row)),
      playerProfile ? base44.entities.CardPlayerProfile.update(playerProfile.id, {
        elo_rating: eloAfter,
        collection_strength: collectionStrength,
        matches_played: (playerProfile.matches_played || 0) + 1,
        wins: (playerProfile.wins || 0) + (won ? 1 : 0),
        losses: (playerProfile.losses || 0) + (won ? 0 : 1),
        training_matches_played: (playerProfile.training_matches_played || 0) + (battleMode === 'training' ? 1 : 0),
        tutorial_completed: battleMode === 'tutorial' ? true : playerProfile.tutorial_completed,
        ai_campaign_best_level: battleMode === 'ai_campaign' && won ? Math.max(playerProfile.ai_campaign_best_level || 0, campaignLevel) : (playerProfile.ai_campaign_best_level || 0),
        ai_campaign_level_unlocked: battleMode === 'ai_campaign' && won ? Math.min(100, Math.max(playerProfile.ai_campaign_level_unlocked || 1, campaignLevel + 1)) : (playerProfile.ai_campaign_level_unlocked || 1),
        favorite_deck_power: deckStrength,
      }).then(async () => {
        const refreshed = await base44.entities.CardPlayerProfile.list('-created_date', 20);
        const me = await base44.auth.me();
        const current = refreshed.find((profile) => profile.user_email === me.email) || null;
        setPlayerProfile(current);
        setCampaignLevel(current?.ai_campaign_level_unlocked || 1);
      }) : Promise.resolve(),
      matchRoom?.id ? base44.entities.CardMatchmakingRoom.update(matchRoom.id, { status: 'completed', winner_email: won ? (await base44.auth.me()).email : matchRoom.player_two_email || 'jackie_ai' }) : Promise.resolve(),
      queueEntry?.id ? base44.entities.CardMatchmakingQueue.update(queueEntry.id, { status: 'cancelled' }) : Promise.resolve(),
    ]);

    setQueueEntry(null);
    setMatchRoom(null);
    setBattleHistory((prev) => [saved, ...prev].slice(0, 50));
    setSelectedBattle(saved);
  };

  const toggleDeckCard = (card) => {
    setDeck(prev => {
      const has = prev.find(c => c.id === card.id);
      if (has) return prev.filter(c => c.id !== card.id);
      if (prev.length >= normalizedDeckMode) return [...prev.slice(1), card];
      return [...prev, card];
    });
  };

  const copyTopPlayerDeck = async () => {
    const profiles = await base44.entities.CardPlayerProfile.list('-updated_date', 100);
    const topPlayer = [...profiles].sort((a, b) => (b.elo_rating || 0) - (a.elo_rating || 0)).find((profile) => profile.user_email !== playerProfile?.user_email);
    if (!topPlayer) return;

    const history = await base44.entities.CardBattleHistory.list('-created_date', 200);
    const bestMatch = history.find((match) => match.created_by === topPlayer.user_email && (match.player_deck_snapshot || []).length > 0);
    if (!bestMatch) return;

    setCopyingDeck(true);
    const copiedDeck = hydrateDeckSnapshot((bestMatch.player_deck_snapshot || []).slice(0, normalizedDeckMode));
    setDeck(copiedDeck);
    await base44.entities.PlayerDeck.create({
      name: `${topPlayer.display_name || 'Top Player'} copied deck`,
      card_ids: copiedDeck.map((card) => card.id),
      is_active: true,
      wins: 0,
      losses: 0,
    }).catch(() => null);
    await base44.entities.SocialStrategyPost.create({
      author_email: playerProfile?.user_email || (await base44.auth.me()).email,
      author_name: playerProfile?.display_name || 'Arena Player',
      post_type: 'deck_copy',
      title: `Copied ${topPlayer.display_name || 'top player'} deck`,
      content: `Deck copied from the leaderboard for testing and practice in Card Arena.`,
      deck_name: `${topPlayer.display_name || 'Top Player'} ladder deck`,
      deck_snapshot: bestMatch.player_deck_snapshot || [],
      linked_profile_email: topPlayer.user_email,
      likes: 0,
      copy_count: 1,
    }).catch(() => null);
    setCopyingDeck(false);
  };

  const startTournament = () => {
    setBattleMode('tournament');
    setTeamSize(1);
    const firstRound = { ...TOURNAMENT_ROUNDS[0], deck_mode: TOURNAMENT_DECK_MODES[0] };
    setDeckMode(firstRound.deck_mode);
    setActiveOpponentName(firstRound.name);
    setActiveOpponentFaction(firstRound.faction);
    setActiveDifficulty(firstRound.difficulty);
    setActiveOpponentDeck(null);
    setTournamentRound(1);
    setRoundResults([]);
    setCurrentRound(firstRound);
    setBattling(true);
  };

  const startTraining = () => {
    setBattleMode('training');
    setTeamSize(1);
    setActiveOpponentName('Training Dummy');
    setActiveOpponentFaction('Stone Legion');
    setActiveDifficulty(1);
    setActiveOpponentDeck(null);
    setBattling(true);
    setTab('lobby');
  };

  const startTutorial = () => {
    setBattleMode('tutorial');
    setTeamSize(1);
    setDeckMode(DEFAULT_DECK_MODE);
    setActiveOpponentName('Coach Jackie');
    setActiveOpponentFaction('Dawn Conclave');
    setActiveDifficulty(1);
    setActiveOpponentDeck(null);
    setBattling(true);
    setTab('lobby');
  };

  const startJackieAi = (level = 1) => {
    setBattleMode(level > 1 ? 'ai_campaign' : 'jackie_ai');
    setTeamSize(1);
    setCampaignLevel(level);
    setActiveOpponentName(JACKIE_NAMES[level % JACKIE_NAMES.length]);
    setActiveOpponentFaction(level % 2 === 0 ? 'Void Syndicate' : 'Dawn Conclave');
    setActiveDifficulty(Math.min(10, Math.max(1, Math.ceil(level / 10))));
    setActiveOpponentDeck(null);
    setBattling(true);
    setTab('lobby');
  };

  const findPvpMatch = async () => {
    const me = await base44.auth.me();
    const queueRows = await base44.entities.CardMatchmakingQueue.list('-created_date', 100);
    const activeRows = queueRows.filter((row) => row.status === 'searching' && row.user_email !== me.email && normalizeDeckMode(row.deck_mode) === normalizedDeckMode && Number(row.team_size || 1) === teamSize && row.queue_mode === queueMode);
    const myElo = playerProfile?.elo_rating || 1000;
    const bestMatch = activeRows
      .map((row) => ({
        row,
        score: getFairMatchScore({
          myElo,
          theirElo: row.elo_rating || 1000,
          myCollection: collectionStrength,
          theirCollection: row.collection_strength || 0,
          myDeckStrength: deckStrength,
          theirDeckStrength: row.deck_strength || 0,
          myDeckMode: normalizedDeckMode,
          theirDeckMode: row.deck_mode || DEFAULT_DECK_MODE,
        }),
      }))
      .sort((a, b) => a.score - b.score)[0];

    const myQueue = await base44.entities.CardMatchmakingQueue.create({
      user_email: me.email,
      display_name: playerProfile?.display_name || me.full_name || me.email.split('@')[0],
      elo_rating: myElo,
      collection_strength: collectionStrength,
      deck_snapshot: serializeDeck(deck),
      deck_strength: deckStrength,
      deck_mode: normalizedDeckMode,
      team_size: teamSize,
      status: 'searching',
      queue_mode: queueMode,
    });
    setQueueEntry(myQueue);

    if (bestMatch?.row) {
      const roomKey = `room-${Date.now()}`;
      const room = await base44.entities.CardMatchmakingRoom.create({
        room_key: roomKey,
        mode: queueMode,
        status: 'ready',
        deck_mode: normalizedDeckMode,
        team_size: teamSize,
        player_one_email: me.email,
        player_one_name: playerProfile?.display_name || me.full_name || me.email.split('@')[0],
        player_two_email: bestMatch.row.user_email,
        player_two_name: bestMatch.row.display_name,
        player_one_elo: myElo,
        player_two_elo: bestMatch.row.elo_rating,
        player_one_deck_strength: deckStrength,
        player_two_deck_strength: bestMatch.row.deck_strength,
        player_one_deck_snapshot: serializeDeck(deck),
        player_two_deck_snapshot: bestMatch.row.deck_snapshot || [],
      });
      await Promise.all([
        base44.entities.CardMatchmakingQueue.update(myQueue.id, { status: 'matched', matched_opponent_email: bestMatch.row.user_email, matched_room_key: roomKey }),
        base44.entities.CardMatchmakingQueue.update(bestMatch.row.id, { status: 'matched', matched_opponent_email: me.email, matched_room_key: roomKey }),
      ]);
      setMatchRoom(room);
      setBattleMode(queueMode);
      setActiveOpponentName(bestMatch.row.display_name || 'Matched Rival');
      setActiveOpponentFaction(bestMatch.row.deck_snapshot?.[0]?.faction || 'Ember Clan');
      setActiveDifficulty(teamSize === 2 ? 3 : 2);
      setActiveOpponentDeck(hydrateDeckSnapshot(bestMatch.row.deck_snapshot || []));
      setBattling(true);
      return;
    }

    setBattleMode(queueMode);
    setActiveOpponentName(queueMode === 'pvp_duo' ? 'Jackie Duo Proxy' : 'Jackie Match Proxy');
    setActiveOpponentFaction('Void Syndicate');
    setActiveDifficulty(teamSize === 2 ? 3 : 2);
    setActiveOpponentDeck(null);
    setBattling(true);
  };

  const createOpenChallenge = async () => {
    const me = await base44.auth.me();
    const challenge = await base44.entities.CardMatchmakingQueue.create({
      user_email: me.email,
      display_name: playerProfile?.display_name || me.full_name || me.email.split('@')[0],
      elo_rating: playerProfile?.elo_rating || 1000,
      collection_strength: collectionStrength,
      deck_snapshot: serializeDeck(deck),
      deck_strength: deckStrength,
      deck_mode: normalizedDeckMode,
      team_size: teamSize,
      status: 'open_challenge',
      queue_mode: queueMode,
      challenge_visibility: 'public',
    });
    setQueueEntry(challenge);
    loadQueueState();
  };

  const inviteSpecificPlayer = async (targetUser) => {
    const me = await base44.auth.me();
    const challenge = await base44.entities.CardMatchmakingQueue.create({
      user_email: me.email,
      display_name: playerProfile?.display_name || me.full_name || me.email.split('@')[0],
      elo_rating: playerProfile?.elo_rating || 1000,
      collection_strength: collectionStrength,
      deck_snapshot: serializeDeck(deck),
      deck_strength: deckStrength,
      deck_mode: normalizedDeckMode,
      team_size: teamSize,
      status: 'invited',
      queue_mode: 'direct_challenge',
      challenge_visibility: 'direct',
      invited_player_email: targetUser.email,
    });
    setQueueEntry(challenge);
    loadQueueState();
  };

  const handleBattleEnd = async (won, battleData) => {
    const round = TOURNAMENT_ROUNDS[tournamentRound - 1];
    const newResults = [...roundResults, { round: tournamentRound, won }];
    setRoundResults(newResults);
    await saveBattleHistory(won, round, battleData);

    // Daily quest event hooks — non-blocking, errors are swallowed by the engine.
    try {
      const playedDeck = battleData?.playerDeck || deck;
      // Element plays — one increment per played card, grouped by element.
      const elementCounts = playedDeck.reduce((acc, c) => {
        if (!c?.element) return acc;
        acc[c.element] = (acc[c.element] || 0) + 1;
        return acc;
      }, {});
      Object.entries(elementCounts).forEach(([element, count]) => {
        reportQuestEvent('element_play', { element }, count);
      });
      if (won) {
        reportQuestEvent('match_win', { mode: battleMode });
        if (['pvp_ladder', 'pvp_duo', 'direct_challenge'].includes(battleMode)) {
          reportQuestEvent('pvp_win', { mode: battleMode });
        }
      }
      // Pool result into the player's guild (if any) — fire-and-forget.
      recordGuildBattleResult(won);
    } catch (_) { /* non-fatal */ }

    // Lore side-effects — never blocks battle flow, errors are swallowed.
    try {
      const playedDeck = battleData?.playerDeck || deck;
      const opponent = activeOpponentName || currentRound?.name || round?.name || 'Unknown';
      const highPowerPlays = playedDeck.filter(isHighPowerCard);
      // 1) append a battle entry to each owned card's historical log
      await Promise.all(playedDeck
        .filter((c) => c?.id && !String(c.id).startsWith('s') && !String(c.id).startsWith('ai_'))
        .map((c) => base44.entities.Card.update(c.id, {
          historical_log: appendLogEntry(c, {
            event_type: 'battle',
            summary: `${won ? 'Victory' : 'Defeat'} vs ${opponent}`,
            actor: opponent,
            result: won ? 'win' : 'loss',
            metadata: { mode: battleMode, round: tournamentRound },
          }),
        }).catch(() => null)));
      // 2) bump global Reality Pressure based on high-power activations
      if (highPowerPlays.length > 0) {
        const updated = await bumpPressure({
          amount: Math.min(10, highPowerPlays.length * 2),
          summary: `${highPowerPlays.length} high-power card${highPowerPlays.length === 1 ? '' : 's'} engaged vs ${opponent}`,
        });
        if (updated) window.dispatchEvent(new CustomEvent('reality-pressure-changed', { detail: updated }));
      }
    } catch (_) { /* non-fatal */ }

    if (battleMode === 'pvp_ladder' || battleMode === 'pvp_duo' || battleMode === 'direct_challenge' || battleMode === 'training' || battleMode === 'tutorial' || battleMode === 'jackie_ai' || battleMode === 'ai_campaign') {
      setBattling(false);
      return;
    }

    if (won) {
      // Award gold via secure backend endpoint
      try {
        const rewardGoldAmount = round.prize.gold;
        const newGold = await awardGold(rewardGoldAmount, `Tournament round ${tournamentRound} win`, {
          round: tournamentRound,
          difficulty: round.difficulty,
          opponent_faction: battleData?.opponentFaction || round.faction,
        });
        setGold(newGold);
        setBattleReward({ gold: rewardGoldAmount, faction: battleData?.opponentFaction || round.faction });
      } catch (err) {
        console.error('Failed to award gold:', err);
        return;
      }

      const discoverChance = 0.4 + (tournamentRound - 1) * 0.1;
      if (Math.random() < discoverChance && round.prize.discover) {
        const targetFaction = battleData?.opponentFaction || round.faction;
        const ownedNames = new Set(cards.map((card) => card.name));
        const factionPool = STARTER_CARDS.filter(c => c.faction === targetFaction && !ownedNames.has(c.name));
        const fallbackPool = STARTER_CARDS.filter(c => c.faction === targetFaction);
        const rewardPool = factionPool.length > 0 ? factionPool : fallbackPool;
        const discovered = rewardPool[Math.floor(Math.random() * rewardPool.length)];
        if (discovered) {
          const saved = await createCardWithLore(discovered, {
            source: 'origin',
            summary: `Discovered after defeating ${battleData?.opponentFaction || round.faction}.`,
            actor: 'tournament',
            metadata: { round: tournamentRound, faction: targetFaction },
          });
          if (saved) {
            setDiscoveredCard({ ...saved, rewardFaction: targetFaction });
            setCards(prev => [...prev, saved]);
          }
        }
      }

      if (tournamentRound >= 3) {
        setBattling(false);
        setTournamentRound(4);
      } else {
        setTimeout(() => {
          const nextRound = tournamentRound + 1;
          setTournamentRound(nextRound);
          setCurrentRound({ ...TOURNAMENT_ROUNDS[nextRound - 1], deck_mode: TOURNAMENT_DECK_MODES[nextRound - 1] || normalizedDeckMode });
          setDeckMode(TOURNAMENT_DECK_MODES[nextRound - 1] || normalizedDeckMode);
          setBattling(true);
          setDiscoveredCard(null);
          setBattleReward(null);
        }, 2200);
      }
    } else {
      setBattling(false);
      setTournamentRound(0);
    }
  };

  const resetTournament = () => {
    setTournamentRound(0);
    setBattling(false);
    setCurrentRound(null);
    setRoundResults([]);
    setDiscoveredCard(null);
    setBattleReward(null);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Sword className="w-5 h-5 text-primary" /> Card Arena
          </h2>
          <p className="text-[10px] text-muted-foreground">Deck · Battle · Tournament</p>
        </div>
        <div className="flex items-center gap-2">
          <RealityPressureMeter />
          <div className="flex items-center gap-1.5 bg-yellow-400/10 border border-yellow-400/20 rounded-xl px-3 py-1.5">
            <Coins className="w-3.5 h-3.5 text-yellow-400" />
            <span className="text-sm font-bold text-yellow-400">{gold.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="flex border-b border-border">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors border-b-2
              ${tab === t.id ? 'text-primary border-primary' : 'text-muted-foreground border-transparent'}`}>
            <t.icon className="w-3.5 h-3.5" />{t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {tab === 'collection' && (
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-3">{cards.length} Cards Owned</p>
            {loading ? (
              <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
            ) : (
              <div className="flex flex-wrap gap-2 justify-center">
                {cards.map(card => {
                  const isOwned = card?.id && !String(card.id).startsWith('s') && !String(card.id).startsWith('ai_');
                  return (
                    <div key={card.id} className="relative">
                      <CardDisplay card={card} size="md"
                        selected={deck.some(c => c.id === card.id)}
                        onClick={toggleDeckCard} />
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setLoreCard(card); }}
                        className="absolute bottom-1 right-1 z-20 inline-flex h-5 w-5 items-center justify-center rounded-full border border-cyan-400/40 bg-black/70 text-[9px] font-bold text-cyan-200 backdrop-blur-sm hover:bg-cyan-500/20"
                        title="View lore"
                        aria-label="View lore"
                      >
                        ℒ
                      </button>
                      {isOwned && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setLevelUpCard(card); }}
                          className="absolute bottom-1 left-1 z-20 inline-flex h-5 w-5 items-center justify-center rounded-full border border-amber-400/50 bg-black/70 text-[9px] font-bold text-amber-200 backdrop-blur-sm hover:bg-amber-500/20"
                          title="Level up"
                          aria-label="Level up"
                        >
                          ↑
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab === 'deck' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Active Deck <span className="text-muted-foreground font-normal text-xs">({deck.length}/{normalizedDeckMode})</span></p>
              <button onClick={() => setDeck([])} className="text-xs text-muted-foreground hover:text-foreground">Clear</button>
            </div>
            <div className="rounded-xl border border-border bg-card p-3 space-y-3">
              <div>
                <p className="text-xs font-semibold text-foreground">Deck rules</p>
                <p className="mt-1 text-[11px] text-muted-foreground">Choose a legal deck size for fair play across versus, direct challenges, tournaments, and AI.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {DECK_MODE_OPTIONS.map((size) => (
                  <button key={size} onClick={() => setDeckMode(size)} className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold ${normalizedDeckMode === size ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-secondary text-muted-foreground'}`}>
                    {size}
                  </button>
                ))}
              </div>
              <div className="rounded-xl border border-border bg-secondary/20 p-3 text-[11px] text-muted-foreground">
                Current mode: {deckModeSummary.label} · {deckModeSummary.band} · recommended HP {deckModeSummary.recommendedHp}
              </div>
            </div>

            {deck.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Layers className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Tap cards in Collection to add them</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 justify-center">
                {deck.map(card => (
                  <CardDisplay key={card.id} card={card} size="md" selected glowing
                    onClick={toggleDeckCard} />
                ))}
              </div>
            )}

            {deck.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-3">
                <p className="text-xs font-semibold mb-2">Deck Stats</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-secondary rounded-lg p-2">
                    <p className="text-sm font-bold text-red-400">{deck.reduce((s, c) => s + c.power, 0)}</p>
                    <p className="text-[9px] text-muted-foreground">Total Power</p>
                  </div>
                  <div className="bg-secondary rounded-lg p-2">
                    <p className="text-sm font-bold text-blue-400">{deck.reduce((s, c) => s + c.guard, 0)}</p>
                    <p className="text-[9px] text-muted-foreground">Total Guard</p>
                  </div>
                  <div className="bg-secondary rounded-lg p-2">
                    <p className="text-sm font-bold text-yellow-400">{(deck.reduce((s, c) => s + c.cost, 0) / deck.length).toFixed(1)}</p>
                    <p className="text-[9px] text-muted-foreground">Avg Cost</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {[...new Set(deck.map(c => c.element))].map(el => (
                    <span key={el} className={`text-[10px] px-2 py-0.5 rounded-full bg-secondary ${ELEMENT_COLORS[el]?.text}`}>
                      {ELEMENT_COLORS[el]?.icon} {el}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'lobby' && (
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-cyan-900/30 to-slate-900/20 border border-cyan-500/30 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Radar className="w-5 h-5 text-cyan-300" />
                <h3 className="text-base font-bold text-cyan-200">Match Lobby</h3>
              </div>
              <p className="text-xs text-muted-foreground">Queue for PvP by ELO and collection strength, or test your deck against Jackie AI, training, and tutorial battles.</p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-border bg-card p-3 text-center">
                <p className="text-lg font-bold text-primary">{playerProfile?.elo_rating || 1000}</p>
                <p className="text-[10px] text-muted-foreground">ELO</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-3 text-center">
                <p className="text-lg font-bold text-red-400">{deckStrength}</p>
                <p className="text-[10px] text-muted-foreground">Deck Strength</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-3 text-center">
                <p className="text-lg font-bold text-blue-400">{collectionStrength}</p>
                <p className="text-[10px] text-muted-foreground">Collection</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-3 text-center">
                <p className="text-lg font-bold text-yellow-400">{playerProfile?.ai_campaign_level_unlocked || 1}/100</p>
                <p className="text-[10px] text-muted-foreground">Campaign</p>
              </div>
            </div>

            <button onClick={copyTopPlayerDeck} disabled={copyingDeck} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm font-semibold text-primary disabled:opacity-40">
              <Copy className="w-4 h-4" /> {copyingDeck ? 'Copying top deck...' : 'Copy top-ranked player deck'}
            </button>

            {!battling && (
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-primary/30 bg-card p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" />
                    <p className="text-sm font-semibold">PvP Ladder</p>
                  </div>
                  <p className="text-[11px] text-muted-foreground">Fair pairing uses ELO, collection strength, deck strength, deck size, and team size.</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => { setQueueMode('pvp_ladder'); setTeamSize(1); }} className={`rounded-xl px-3 py-2 text-xs font-semibold ${queueMode === 'pvp_ladder' && teamSize === 1 ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>1v1</button>
                    <button onClick={() => { setQueueMode('pvp_duo'); setTeamSize(2); }} className={`rounded-xl px-3 py-2 text-xs font-semibold ${queueMode === 'pvp_duo' && teamSize === 2 ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>2v2</button>
                  </div>
                  <button onClick={findPvpMatch} disabled={deck.length < getMinimumDeckForMode(normalizedDeckMode)} className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-40">Find Match</button>
                  {queueEntry && <p className="text-[10px] text-primary">Queue active · {queueEntry.queue_mode === 'pvp_duo' ? '2v2' : '1v1'} · {queueEntry.deck_mode || normalizedDeckMode}-card</p>}
                </div>

                <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4 text-purple-300" />
                    <p className="text-sm font-semibold">Jackie AI</p>
                  </div>
                  <p className="text-[11px] text-muted-foreground">Quick AI duel, tutorial, and training sandbox for testing decks.</p>
                  <div className="grid gap-2">
                    <button onClick={() => startJackieAi(1)} className="w-full rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white">Play Jackie AI</button>
                    <button onClick={startTraining} className="w-full rounded-xl border border-border bg-secondary px-4 py-2.5 text-sm font-semibold"><Dumbbell className="w-4 h-4 inline mr-2" />Training</button>
                    <button onClick={startTutorial} className="w-full rounded-xl border border-border bg-secondary px-4 py-2.5 text-sm font-semibold"><GraduationCap className="w-4 h-4 inline mr-2" />Tutorial</button>
                  </div>
                </div>
              </div>
            )}

            <ChallengePanel
              users={arenaUsers}
              openChallenges={openChallenges}
              deckMode={normalizedDeckMode}
              selectedQueueMode={queueMode}
              onCreateOpenChallenge={createOpenChallenge}
              onInvitePlayer={inviteSpecificPlayer}
              inviteSearch={inviteSearch}
              setInviteSearch={setInviteSearch}
            />

            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-amber-200">AI Campaign</p>
                  <p className="text-[11px] text-muted-foreground">Beat 100 Jackie stages with saved progression and deck-size-aware scaling.</p>
                </div>
                <p className="text-xs text-amber-300">Unlocked: {playerProfile?.ai_campaign_level_unlocked || 1}/100</p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {Array.from({ length: Math.min(10, playerProfile?.ai_campaign_level_unlocked || 1) }).map((_, index) => {
                  const level = index + 1;
                  return (
                    <button key={level} onClick={() => startJackieAi(level)} className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold hover:border-amber-400/40">
                      Level {level}
                    </button>
                  );
                })}
              </div>
            </div>

            {battling && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-primary uppercase tracking-widest">{battleMode.replace('_', ' ')}</p>
                  <p className="text-xs text-muted-foreground">vs {activeOpponentName} · {normalizedDeckMode}-card · {teamSize === 2 ? '2v2' : '1v1'}</p>
                </div>
                <BattleView
                  playerCards={[...deck]}
                  opponentName={activeOpponentName}
                  difficulty={activeDifficulty}
                  opponentFaction={activeOpponentFaction}
                  opponentDeck={activeOpponentDeck}
                  mode={battleMode}
                  deckMode={normalizedDeckMode}
                  teamSize={teamSize}
                  tutorialSteps={battleMode === 'tutorial' ? TUTORIAL_STEPS : []}
                  onBattleEnd={handleBattleEnd}
                />
              </div>
            )}
          </div>
        )}

        {tab === 'tournament' && (
          <div className="space-y-4">
            {tournamentRound === 0 && (
              <>
                <div className="bg-gradient-to-br from-yellow-900/30 to-amber-900/20 border border-yellow-500/30 rounded-2xl p-4 text-center">
                  <Trophy className="w-10 h-10 text-yellow-400 mx-auto mb-2" />
                  <h3 className="text-base font-bold text-yellow-400">Grand Tournament</h3>
                  <p className="text-xs text-muted-foreground mt-1">Defeat 3 AI opponents in sequence. Difficulty escalates. Prizes await.</p>
                </div>

                <div className="space-y-2">
                  {TOURNAMENT_ROUNDS.map((r, i) => (
                    <div key={r.id} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-sm font-bold text-muted-foreground">{i + 1}</div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold">{r.name}</p>
                        <p className="text-[10px] text-muted-foreground">{r.faction} · Difficulty {'⭐'.repeat(r.difficulty)} · {TOURNAMENT_DECK_MODES[i]}-card</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-yellow-400 font-bold">{r.prize.gold}g</p>
                        <p className="text-[9px] text-primary">+ card discovery</p>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={startTournament}
                  disabled={deck.length < 3}
                  className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-40">
                  <Sword className="w-4 h-4" />
                  {deck.length < TOURNAMENT_DECK_MODES[0] ? `Build a deck first (${deck.length}/${TOURNAMENT_DECK_MODES[0]} min)` : 'Enter Tournament'}
                </button>
              </>
            )}

            {battling && currentRound && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-primary">Round {tournamentRound}/3</p>
                  <p className="text-xs text-muted-foreground">vs {currentRound.name} · {currentRound.deck_mode || normalizedDeckMode}-card</p>
                </div>
                <BattleView
                  playerCards={[...deck]}
                  opponentName={currentRound.name}
                  difficulty={currentRound.difficulty}
                  opponentFaction={currentRound.faction}
                  mode="tournament"
                  deckMode={currentRound.deck_mode || normalizedDeckMode}
                  teamSize={1}
                  onBattleEnd={handleBattleEnd}
                />
              </div>
            )}

            <AnimatePresence>
              {battleReward && !discoveredCard && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-center"
                >
                  <p className="text-xs uppercase tracking-widest text-yellow-400">Battle Reward</p>
                  <p className="mt-1 text-lg font-bold text-yellow-300">+{battleReward.gold} Gold</p>
                  <p className="text-[11px] text-muted-foreground mt-1">Victory over {battleReward.faction}</p>
                </motion.div>
              )}
              {discoveredCard && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center"
                  onClick={() => setDiscoveredCard(null)}>
                  <div className="bg-card border border-primary/40 rounded-2xl p-6 text-center max-w-xs mx-4" onClick={e => e.stopPropagation()}>
                    <p className="text-xs text-primary uppercase tracking-widest mb-1">Card Discovered!</p>
                    <p className="text-sm font-semibold mb-1">Added to your collection</p>
                    <p className="text-[11px] text-muted-foreground mb-4">Recovered from the {discoveredCard.rewardFaction} pool</p>
                    <div className="flex justify-center mb-4">
                      <CardDisplay card={discoveredCard} size="lg" glowing />
                    </div>
                    <button onClick={() => setDiscoveredCard(null)} className="w-full py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold">Collect</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {tournamentRound === 4 && !battling && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="text-center space-y-4">
                <div className="bg-gradient-to-br from-yellow-900/40 to-amber-900/30 border border-yellow-500/40 rounded-2xl p-6">
                  <p className="text-4xl mb-2">🏆</p>
                  <p className="text-xl font-bold text-yellow-400">Tournament Champion!</p>
                  <p className="text-sm text-muted-foreground mt-1">You conquered all 3 opponents</p>
                  <p className="text-2xl font-bold text-yellow-300 mt-3">3 wins · escalating rewards earned</p>
                </div>
                <button onClick={resetTournament} className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold">
                  Play Again
                </button>
              </motion.div>
            )}

            {tournamentRound === 0 && roundResults.length > 0 && roundResults[roundResults.length - 1]?.won === false && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="text-center space-y-4">
                <div className="bg-red-900/20 border border-red-500/30 rounded-2xl p-6">
                  <p className="text-4xl mb-2">💀</p>
                  <p className="text-xl font-bold text-red-400">Defeated</p>
                  <p className="text-sm text-muted-foreground mt-1">Reached Round {roundResults.length}</p>
                </div>
                <button onClick={resetTournament} className="w-full py-3 bg-secondary border border-border rounded-xl font-semibold text-sm">
                  Try Again
                </button>
              </motion.div>
            )}
          </div>
        )}

        {tab === 'history' && (
          <BattleHistoryPanel
            matches={battleHistory}
            selectedMatch={selectedBattle}
            onSelect={setSelectedBattle}
            loading={historyLoading}
          />
        )}

        {tab === 'forge' && (
          <div className="space-y-4">
            <div className="flex gap-1 bg-secondary rounded-xl p-1">
              {[
                { id: 'transmute', label: 'Transmute', icon: Wand2 },
                { id: 'recipes',   label: 'Recipes',   icon: BookOpen },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setForgeView(opt.id)}
                  className={`flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors
                    ${forgeView === opt.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <opt.icon className="w-3.5 h-3.5" /> {opt.label}
                </button>
              ))}
            </div>
            {forgeView === 'transmute' ? (
              <TransmutationPanel
                cards={cards.filter((c) => c?.id && !String(c.id).startsWith('s') && !String(c.id).startsWith('ai_'))}
                onCardForged={(result) => {
                  if (!result?.card) return;
                  const burned = new Set(result.card.transmuted_from_card_ids || []);
                  setCards((prev) => [result.card, ...prev.filter((c) => !burned.has(c.id))]);
                }}
              />
            ) : (
              <ForgeRecipesPanel
                cards={cards.filter((c) => c?.id && !String(c.id).startsWith('s') && !String(c.id).startsWith('ai_'))}
                onCardForged={(result) => {
                  if (!result?.card) return;
                  const consumed = new Set(result.card.transmuted_from_card_ids || []);
                  setCards((prev) => [result.card, ...prev.filter((c) => !consumed.has(c.id))]);
                }}
              />
            )}
          </div>
        )}

        {tab === 'trading' && (
          <TradingPanel gold={gold} onGoldChange={saveGold} />
        )}

        {tab === 'quests' && (
          <DailyQuestPanel onGoldChange={(newBalance) => setGold(newBalance)} />
        )}

        {tab === 'market' && (
          <div className="space-y-6">
            <ExcavationPackPanel
              gold={gold}
              onGoldChange={saveGold}
              ownedCards={cards}
              onCardsAdded={(added) => setCards((prev) => [...prev, ...added])}
            />
            <Marketplace gold={gold} onGoldChange={saveGold} />
          </div>
        )}
      </div>

      {/* Level Up dialog — opened from the ↑ badge on owned collection cards. */}
      <AnimatePresence>
        {levelUpCard && (
          <LevelUpDialog
            card={levelUpCard}
            ownedCards={cards.filter((c) => c?.id && !String(c.id).startsWith('s') && !String(c.id).startsWith('ai_'))}
            gold={gold}
            onClose={() => setLevelUpCard(null)}
            onLeveled={(result) => {
              if (!result?.card) return;
              const consumed = new Set(result.consumedIds || []);
              setCards((prev) => prev
                .filter((c) => !consumed.has(c.id))
                .map((c) => (c.id === result.card.id ? result.card : c)));
              if (result.goldSpent) setGold((prev) => Math.max(0, prev - result.goldSpent));
              setLevelUpCard(result.card);
            }}
          />
        )}
      </AnimatePresence>

      {/* Card Lore detail dialog — opened from the ℒ badge on collection cards. */}
      <AnimatePresence>
        {loreCard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setLoreCard(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 12 }}
              transition={{ duration: 0.22 }}
              className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-cyan-500/20 bg-[#06070d]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="pointer-events-none absolute inset-0 lore-distort-faint" aria-hidden="true" />
              <div className="relative max-h-[85vh] overflow-y-auto p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-300">Card Lore</p>
                    <h4 className="text-base font-semibold text-white truncate">{loreCard.name}</h4>
                    <p className="mt-0.5 text-[11px] text-white/55">{loreCard.faction} · {loreCard.rarity}</p>
                  </div>
                  <button onClick={() => setLoreCard(null)} className="rounded-full p-1.5 text-white/60 hover:bg-white/5 hover:text-white" aria-label="Close">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex justify-center mb-3">
                  <CardDisplay card={loreCard} size="lg" />
                </div>
                {loreCard.flavor_text && (
                  <p className="mb-2 text-center text-[11px] italic text-white/60">"{loreCard.flavor_text}"</p>
                )}
                <CardLorePanel card={ensureLoreProfile(loreCard)} defaultOpen />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}