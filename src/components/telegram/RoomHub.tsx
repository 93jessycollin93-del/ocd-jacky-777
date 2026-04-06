import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTelegram } from './TelegramProvider';
import { haptic } from '@/lib/telegram';
import { formatAddress } from '@/lib/ton-wallet';
import {
  Brain, Code2, TrendingUp, Store, Dices, Palette, Gem, Bug,
  Radio, FileText, Package, Music, Video, Briefcase, AppWindow,
  Scale, BarChart3, User, Archive, Trophy, Shield, Layers,
  ChevronRight, Wallet, Lock, AlertTriangle, Mail
} from 'lucide-react';

export interface RoomDef {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  description: string;
  status: 'live' | 'coming_soon' | 'beta';
  category: 'core' | 'create' | 'trade' | 'social' | 'system';
}

const ROOMS: RoomDef[] = [
  { id: 'jackie', label: 'Jackie AI', icon: <Brain size={22} />, color: 'hsl(var(--primary))', description: 'Premium AI intelligence core', status: 'live', category: 'core' },
  { id: 'dev', label: 'Dev Lab', icon: <Code2 size={22} />, color: 'hsl(200, 80%, 60%)', description: 'AI-assisted vibe coding', status: 'coming_soon', category: 'core' },
  { id: 'crypto', label: 'Markets', icon: <TrendingUp size={22} />, color: 'hsl(45, 90%, 55%)', description: 'Crypto & market intelligence', status: 'coming_soon', category: 'trade' },
  { id: 'marketplace', label: 'Marketplace', icon: <Store size={22} />, color: 'hsl(25, 85%, 55%)', description: 'Buy, sell, trade, auction', status: 'coming_soon', category: 'trade' },
  { id: 'casino', label: 'Casino', icon: <Dices size={22} />, color: 'hsl(0, 70%, 55%)', description: 'Poker tables & tournaments', status: 'coming_soon', category: 'social' },
  { id: 'customize', label: 'Themes', icon: <Palette size={22} />, color: 'hsl(280, 70%, 60%)', description: 'Deep visual customization', status: 'coming_soon', category: 'system' },
  { id: 'jade', label: 'Jade Forge', icon: <Gem size={22} />, color: 'hsl(155, 60%, 50%)', description: 'Sacred jade crafting', status: 'live', category: 'core' },
  { id: 'creatures', label: 'Creature Lab', icon: <Bug size={22} />, color: 'hsl(90, 60%, 50%)', description: 'Breed, mutate, legacy NFTs', status: 'live', category: 'create' },
  { id: 'social', label: 'Network', icon: <Radio size={22} />, color: 'hsl(210, 70%, 55%)', description: 'Chat, voice, communities', status: 'coming_soon', category: 'social' },
  { id: 'resume', label: 'Business AI', icon: <FileText size={22} />, color: 'hsl(170, 50%, 50%)', description: 'Resume, ads, sponsors', status: 'coming_soon', category: 'create' },
  { id: 'store', label: 'Vault Store', icon: <Package size={22} />, color: 'hsl(35, 90%, 55%)', description: 'Premium packs & offers', status: 'live', category: 'trade' },
  { id: 'music', label: 'Music Lab', icon: <Music size={22} />, color: 'hsl(320, 70%, 55%)', description: 'AI music creation', status: 'live', category: 'create' },
  { id: 'stream', label: 'Creator Hub', icon: <Video size={22} />, color: 'hsl(350, 65%, 55%)', description: 'Streaming & content', status: 'coming_soon', category: 'create' },
  { id: 'business', label: 'AI Engine', icon: <Briefcase size={22} />, color: 'hsl(220, 50%, 55%)', description: 'Campaign & outreach AI', status: 'coming_soon', category: 'core' },
  { id: 'appstore', label: 'App Store', icon: <AppWindow size={22} />, color: 'hsl(260, 60%, 55%)', description: 'Internal mini apps', status: 'coming_soon', category: 'system' },
  { id: 'legal', label: 'Risk & Legal', icon: <Scale size={22} />, color: 'hsl(0, 0%, 50%)', description: 'Disclaimers & compliance', status: 'live', category: 'system' },
  { id: 'analytics', label: 'Observatory', icon: <BarChart3 size={22} />, color: 'hsl(190, 60%, 55%)', description: 'Usage & insights', status: 'coming_soon', category: 'system' },
  { id: 'profile', label: 'Identity', icon: <User size={22} />, color: 'hsl(270, 50%, 60%)', description: 'Profile & achievements', status: 'coming_soon', category: 'system' },
  { id: 'vault', label: 'Archive', icon: <Archive size={22} />, color: 'hsl(40, 40%, 45%)', description: 'History & vault storage', status: 'coming_soon', category: 'system' },
  { id: 'tournament', label: 'Events', icon: <Trophy size={22} />, color: 'hsl(50, 80%, 50%)', description: 'Tournaments & showcases', status: 'coming_soon', category: 'social' },
  { id: 'security', label: 'Security', icon: <Shield size={22} />, color: 'hsl(150, 70%, 40%)', description: 'Wallet & session control', status: 'live', category: 'system' },
  { id: 'cards', label: 'Card Arena', icon: <Layers size={22} />, color: 'hsl(15, 80%, 55%)', description: 'TCG deck building', status: 'live', category: 'create' },
  { id: 'mail', label: 'Messages', icon: <Mail size={22} />, color: 'hsl(200, 60%, 50%)', description: 'Mail & campaigns', status: 'coming_soon', category: 'social' },
];

const CATEGORIES = [
  { id: 'core', label: '🧠 Core' },
  { id: 'create', label: '🎨 Create' },
  { id: 'trade', label: '💰 Trade' },
  { id: 'social', label: '📡 Social' },
  { id: 'system', label: '⚙️ System' },
] as const;

interface RoomHubProps {
  onNavigate: (roomId: string) => void;
}

export default function RoomHub({ onNavigate }: RoomHubProps) {
  const { wallet, connectWallet, user, isTelegram } = useTelegram();
  const [activeCategory, setActiveCategory] = useState<string>('core');

  const filteredRooms = ROOMS.filter(r => r.category === activeCategory);

  const handleRoomTap = useCallback((room: RoomDef) => {
    haptic.medium();
    if (room.status === 'coming_soon') {
      haptic.warning();
      return;
    }
    onNavigate(room.id);
  }, [onNavigate]);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header bar */}
      <div className="shrink-0 px-4 pt-3 pb-2 border-b border-border/30">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-foreground tracking-tight">
              {isTelegram && user ? `Welcome, ${user.first_name}` : 'Jackie Hub'}
            </h1>
            <p className="text-[10px] text-muted-foreground">Your digital command center</p>
          </div>
          <button
            onClick={() => wallet.status === 'connected' ? onNavigate('security') : connectWallet()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/50 bg-card/80 text-xs font-medium transition-colors active:scale-95 min-h-[44px]"
          >
            <Wallet size={14} className={wallet.status === 'connected' ? 'text-primary' : 'text-muted-foreground'} />
            {wallet.status === 'connected' && wallet.address
              ? <span className="text-foreground">{formatAddress(wallet.address)}</span>
              : wallet.status === 'connecting'
              ? <span className="text-muted-foreground animate-pulse">Connecting...</span>
              : <span className="text-muted-foreground">Connect Wallet</span>
            }
          </button>
        </div>
      </div>

      {/* Security notice */}
      <div className="shrink-0 mx-4 mt-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-2">
        <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
        <p className="text-[10px] text-amber-300/80 leading-relaxed">
          Never share your seed phrase. This app will never ask for it. Verify all transactions before confirming.
        </p>
      </div>

      {/* Category tabs */}
      <div className="shrink-0 px-4 pt-3 pb-1">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => { haptic.selection(); setActiveCategory(cat.id); }}
              className={`shrink-0 px-3 py-2 rounded-lg text-xs font-semibold transition-all min-h-[44px] ${
                activeCategory === cat.id
                  ? 'bg-primary/20 text-primary border border-primary/30'
                  : 'bg-muted/30 text-muted-foreground border border-transparent'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Room grid */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCategory}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-2 gap-2.5"
          >
            {filteredRooms.map((room, i) => (
              <motion.button
                key={room.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => handleRoomTap(room)}
                className={`relative flex flex-col items-start gap-1.5 p-3 rounded-xl border transition-all min-h-[88px] text-left active:scale-[0.97] ${
                  room.status === 'live'
                    ? 'bg-card/80 border-border/40 hover:border-primary/30'
                    : 'bg-muted/20 border-border/20 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span style={{ color: room.color }}>{room.icon}</span>
                  {room.status === 'coming_soon' && (
                    <Lock size={10} className="text-muted-foreground" />
                  )}
                  {room.status === 'beta' && (
                    <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold">BETA</span>
                  )}
                  {room.status === 'live' && (
                    <ChevronRight size={12} className="text-muted-foreground" />
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground leading-tight">{room.label}</p>
                  <p className="text-[9px] text-muted-foreground leading-snug mt-0.5">{room.description}</p>
                </div>
              </motion.button>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom disclaimer */}
      <div className="shrink-0 px-4 py-2 border-t border-border/20">
        <p className="text-[8px] text-muted-foreground/50 text-center leading-relaxed">
          ⚠️ Not financial advice. Digital assets may lose value. Platform not responsible for wallet mishaps. Use at your own risk.
        </p>
      </div>
    </div>
  );
}
