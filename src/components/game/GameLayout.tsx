import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGame } from '@/game/GameContext';
import { useI18n } from '@/game/i18n';
import { AudioControls, useAudio } from '@/game/AudioSystem';
import ResourceBar from '@/components/game/ResourceBar';
import DashboardPage from '@/components/game/DashboardPage';
import CityPage from '@/components/game/CityPage';
import ResearchPage from '@/components/game/ResearchPage';
import ArmyPage from '@/components/game/ArmyPage';
import ExpeditionsPage from '@/components/game/ExpeditionsPage';
import HeroesPage from '@/components/game/HeroesPage';
import ShardsPage from '@/components/game/ShardsPage';
import WorldMap from '@/components/game/WorldMap';
import CraftingPage from '@/components/game/CraftingPage';
import DiplomacyPage from '@/components/game/DiplomacyPage';
import JukeboxPage from '@/components/game/JukeboxPage';
import AIPage from '@/components/game/AIPage';
import EventLogPage from '@/components/game/EventLogPage';
import QuestsPage from '@/components/game/QuestsPage';

import TradingPage from '@/components/game/TradingPage';
import GachaPage from '@/components/game/GachaPage';
import BattlePassPage from '@/components/game/BattlePassPage';
import LeaderboardPage from '@/components/game/LeaderboardPage';
import ShopPage from '@/components/game/ShopPage';
import BagPage from '@/components/game/BagPage';
import MarketplacePage from '@/components/game/MarketplacePage';
import GuildBankPage from '@/components/game/GuildBankPage';
import PremiumStorePage from '@/components/game/PremiumStorePage';
import JadeStorePage from '@/components/game/JadeStorePage';
import JadeAdminPage from '@/components/game/JadeAdminPage';
import DiamondExchangePage from '@/components/game/DiamondExchangePage';
import BotForgePage from '@/components/game/BotForgePage';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

type Tab = 'dashboard' | 'city' | 'research' | 'army' | 'expeditions' | 'heroes' | 'shards' | 'map' | 'crafting' | 'diplomacy' | 'jukebox' | 'oracle' | 'eventlog' | 'quests' | 'trading' | 'gacha' | 'battlepass' | 'leaderboard' | 'shop' | 'bag' | 'marketplace' | 'guildbank' | 'premiumstore' | 'jadestore' | 'jadeadmin' | 'diamonds' | 'botforge';

const tabVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' as const } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15, ease: 'easeIn' as const } },
};

export default function GameLayout() {
  const { resetGame } = useGame();
  const { t } = useI18n();
  const { playSfx } = useAudio();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [menuOpen, setMenuOpen] = useState(false);

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: 'dashboard', label: t('nav.dashboard'), icon: '📊' },
    { id: 'map', label: t('nav.map'), icon: '🗺️' },
    { id: 'city', label: t('nav.city'), icon: '🏰' },
    { id: 'research', label: t('nav.research'), icon: '📜' },
    { id: 'army', label: t('nav.army'), icon: '⚔️' },
    { id: 'expeditions', label: t('nav.expeditions'), icon: '🚩' },
    { id: 'heroes', label: t('nav.heroes'), icon: '👑' },
    { id: 'shards', label: t('nav.shards'), icon: '🔮' },
    { id: 'crafting', label: t('nav.crafting'), icon: '⚗️' },
    { id: 'diplomacy', label: t('nav.diplomacy'), icon: '🤝' },
    { id: 'jukebox', label: 'Jukebox', icon: '🎶' },
    { id: 'oracle', label: t('nav.oracle'), icon: '🔮' },
    { id: 'eventlog', label: t('nav.eventLog'), icon: '📜' },
    { id: 'quests', label: 'Quests', icon: '📋' },
    { id: 'trading', label: 'Trading', icon: '🏪' },
    { id: 'gacha', label: 'Lootcrates', icon: '🎰' },
    { id: 'battlepass', label: 'Battle Pass', icon: '⚔️' },
    { id: 'leaderboard', label: 'Leaderboard', icon: '🏅' },
    { id: 'shop', label: 'Shop', icon: '🏪' },
    { id: 'bag', label: 'Bag', icon: '🎒' },
    { id: 'marketplace', label: 'Market', icon: '🏬' },
    { id: 'guildbank', label: t('nav.guildBank') || 'Guild Bank', icon: '🏦' },
    { id: 'premiumstore', label: 'Premium Store', icon: '💎' },
    { id: 'diamonds', label: 'Diamond Exchange', icon: '💠' },
    { id: 'jadestore', label: 'Jade Vault', icon: '🏛️' },
    { id: 'jadeadmin', label: 'Admin Curation', icon: '⚙️' },
    { id: 'botforge', label: 'Bot Forge', icon: '🤖' },
  ];

  const handleTabChange = (tab: Tab) => {
    playSfx('click');
    setActiveTab(tab);
    setMenuOpen(false);
  };

  const renderTab = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardPage />;
      case 'map': return <WorldMap />;
      case 'city': return <CityPage />;
      case 'research': return <ResearchPage />;
      case 'army': return <ArmyPage />;
      case 'expeditions': return <ExpeditionsPage />;
      case 'heroes': return <HeroesPage />;
      case 'shards': return <ShardsPage />;
      case 'crafting': return <CraftingPage />;
      case 'diplomacy': return <DiplomacyPage />;
      case 'jukebox': return <JukeboxPage />;
      case 'oracle': return <AIPage />;
      case 'eventlog': return <EventLogPage />;
      case 'quests': return <QuestsPage />;
      case 'trading': return <TradingPage />;
      case 'gacha': return <GachaPage />;
      case 'battlepass': return <BattlePassPage />;
      case 'leaderboard': return <LeaderboardPage />;
      case 'shop': return <ShopPage />;
      case 'bag': return <BagPage />;
      case 'marketplace': return <MarketplacePage />;
      case 'guildbank': return <GuildBankPage />;
      case 'premiumstore': return <PremiumStorePage />;
      case 'diamonds': return <DiamondExchangePage />;
      case 'jadestore': return <JadeStorePage />;
      case 'jadeadmin': return <JadeAdminPage />;
      case 'botforge': return <BotForgePage />;
    }
  };

  const currentTab = TABS.find(t => t.id === activeTab);

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card/80 backdrop-blur-sm border-b border-border sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <h1 className="font-display text-lg text-foreground">🐉 Dragon Chaos Wars</h1>
              <span className="text-xs text-muted-foreground">{currentTab?.icon} {currentTab?.label}</span>
            </div>
            <div className="flex items-center gap-2">
              
              <AudioControls />
              <Link to="/" className="text-xs text-muted-foreground hover:text-primary transition-colors">💬 Jackie</Link>
              <button onClick={resetGame} className="text-xs text-muted-foreground hover:text-accent transition-colors">{t('ui.resetRealm')}</button>
              <button onClick={() => supabase.auth.signOut()} className="text-xs text-muted-foreground hover:text-accent transition-colors">🚪</button>
            </div>
          </div>
          <ResourceBar />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} variants={tabVariants} initial="initial" animate="animate" exit="exit">
            {renderTab()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Floating nav button */}
      <button
        onClick={() => { setMenuOpen(true); playSfx('click'); }}
        className="fixed right-4 top-1/2 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex flex-col items-center justify-center gap-0.5 hover:scale-110 transition-transform"
      >
        <span className="text-lg">{currentTab?.icon}</span>
        <span className="text-[9px] font-display leading-none">{currentTab?.label}</span>
      </button>

      {/* Nav overlay */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 backdrop-blur-md" onClick={() => setMenuOpen(false)}>
            <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.85, opacity: 0 }} className="bg-card border border-border rounded-xl p-4 max-w-lg w-[90vw] max-h-[70vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display text-foreground text-sm">⚜️ Navigate</h2>
                <button onClick={() => setMenuOpen(false)} className="text-muted-foreground hover:text-foreground text-lg">✕</button>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                {TABS.map(tab => (
                  <button key={tab.id} onClick={() => handleTabChange(tab.id)} className={`flex flex-col items-center gap-1 px-2 py-3 rounded-lg text-center transition-colors ${activeTab === tab.id ? 'bg-primary/20 text-primary ring-1 ring-primary/40' : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                    <span className="text-xl">{tab.icon}</span>
                    <span className="text-[10px] font-display leading-tight">{tab.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="border-t border-border bg-card/50 py-3 mt-8">
        <p className="text-center text-xs text-muted-foreground font-display">Created by <span className="text-primary">CT2 Zhao Yun Ash 777 King</span></p>
      </footer>
    </div>
  );
}
