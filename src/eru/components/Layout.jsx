import { useState, useEffect, useCallback } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import AnimatedBackground from './AnimatedBackground';
import PageThemeLayer from '@/eru/components/theme/PageThemeLayer';
import { useTheme } from '../context/ThemeContext';
import CenteredBottomNav from './CenteredBottomNav';
import MobileTabBar from './mobile/MobileTabBar';
import TickerBar from './dashboard/TickerBar';
import GlobalSearch from './GlobalSearch';
import BotWidget from './BotWidget';
import ScreenVisualizer from './dashboard/ScreenVisualizer';
import NotesWidgetMount from './notes/NotesWidgetMount';
import PersistentPlayer from './media/PersistentPlayer';
import { playSound, getSoundPrefs, VIBRATE } from '../lib/soundEngine';

// JackieFloat / FloatingQuickActions / BazarStandDock are intentionally NOT
// mounted here anymore — their actions are now first-class items in the
// CenteredBottomNav (Jackie link, Bazar pin, "Create" Quick Actions popover).
// The components remain in the codebase to preserve their logic and so they
// can be re-enabled if a future surface needs the loose floating presentation.

const NEUTRON_STAR_BG = 'neutron_star';



function useFloatingWidgetPrefs() {
  const [prefs, setPrefs] = useState(() => {
    try {
      return {
        jackie: { visible: true, x: 16, y: 100 },
        botMarket: { visible: true, x: 16, y: 156 },
        botChat: { visible: true, x: null, y: null },
        miniBrowser: { visible: false, x: null, y: null, floating: true },
        promptLibrary: { visible: true, x: 16, y: 212 },
        conversations: { visible: true, x: 16, y: 268 },
        ...JSON.parse(localStorage.getItem('floating_widget_preferences') || '{}'),
      };
    } catch {
      return {
        jackie: { visible: true, x: 16, y: 100 },
        botMarket: { visible: true, x: 16, y: 156 },
        botChat: { visible: true, x: null, y: null },
        miniBrowser: { visible: false, x: null, y: null, floating: true },
        promptLibrary: { visible: true, x: 16, y: 212 },
        conversations: { visible: true, x: 16, y: 268 },
      };
    }
  });

  useEffect(() => {
    localStorage.setItem('floating_widget_preferences', JSON.stringify(prefs));
  }, [prefs]);

  const updateWidget = useCallback((id, next) => {
    setPrefs((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...next },
    }));
  }, []);

  return { prefs, updateWidget };
}

export default function Layout() {
  const themeCtx = useTheme();
  const bg = themeCtx?.bg || 'none';
  const bgOpacity = themeCtx?.bgOpacity ?? 0.4;
  const globalThemeStyles = themeCtx?.globalThemeStyles || {};
  const [searchOpen, setSearchOpen] = useState(false);
  const { prefs, updateWidget } = useFloatingWidgetPrefs();
  const location = useLocation();

  const handleSearchOpen = useCallback(() => setSearchOpen(true), []);

  // Global sound + haptic handler

  useEffect(() => {
    const handler = (e) => {
      const el = e.target.closest('button, a, [role="button"], input[type="range"], input[type="checkbox"]');
      if (!el) return;
      const soundPrefs = getSoundPrefs();
      if (!soundPrefs.enabled) return;
      if (el.tagName === 'INPUT') {
        playSound('toggle');
        VIBRATE.toggle?.();
      } else {
        playSound('click');
        VIBRATE.click?.();
      }
    };
    document.addEventListener('click', handler, true);
    return () => document.removeEventListener('click', handler, true);
  }, []);

  return (
    <>
      {/* Background filter wrapper — applies user's brightness/contrast/
          saturation/blur to ONLY the decorative background layers below.
          Foreground UI lives outside this wrapper so it always stays crisp. */}
      <div
        className="fixed inset-0 pointer-events-none eru-background-layer"
        style={{ filter: 'var(--eru-bg-filter)', WebkitFilter: 'var(--eru-bg-filter)' }}
      >
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(circle at 50% 26%, rgba(95,135,255,0.14) 0%, rgba(20,28,58,0.06) 28%, rgba(7,10,22,0.34) 72%, rgba(2,4,10,0.55) 100%)',
            ...globalThemeStyles,
          }}
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.015) 0%, rgba(60,96,210,0.025) 18%, rgba(7,10,22,0.04) 44%, rgba(3,4,10,0.08) 100%)' }} />
        <AnimatedBackground type={NEUTRON_STAR_BG} opacity={0.78} />
        {bg !== 'none' && bg !== NEUTRON_STAR_BG ? <AnimatedBackground type={bg} opacity={Math.min(bgOpacity, 0.35)} /> : null}
      </div>
      {/* Dimmer overlay — lives ABOVE the background filter wrapper but BELOW
          all foreground UI. Driven by --eru-bg-dim (mapped from bgOpacity). */}
      <div
        className="fixed inset-0 pointer-events-none eru-background-layer"
        style={{ background: `rgba(0,0,0,var(--eru-bg-dim,0))` }}
        aria-hidden="true"
      />

      {/* App shell — transparent so background shows through */}
      <div className="w-full max-w-screen-xl mx-auto flex flex-col relative z-10" style={{ minHeight: '100dvh' }}>

        {/* Ticker stays sticky at the top inside the centered app shell. */}
        <div
          className="sticky z-50 eru-theme-header eru-enter"
          style={{ top: 'env(safe-area-inset-top, 0px)' }}
        >
          <TickerBar />
        </div>
        <main className="flex-1 min-w-0 overflow-hidden">
          <PageThemeLayer>
            {/* Mobile-native route transition — slide-left on every route
                change. Honors prefers-reduced-motion via framer-motion. */}
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={location.pathname}
                initial={{ x: 24, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -24, opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </PageThemeLayer>
        </main>
        <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
        <BotWidget prefs={prefs} updateWidget={updateWidget} />
        <ScreenVisualizer prefs={prefs} updateWidget={updateWidget} />
        <NotesWidgetMount />
      </div>

      {/* Free-floating nav — mounted OUTSIDE the centered app shell. The
          CenteredBottomNav positions itself absolutely within this overlay
          (fully draggable on both axes), so this wrapper is a transparent,
          click-through layer covering the full viewport.
          Shown on ALL screen sizes: it's fully mobile-optimized (draggable,
          compact, exposes every page + widget + search + the editor), so it's
          the single source of navigation. The fixed MobileTabBar below gives
          phones a stationary 4-tab quick bar that's always findable. */}
      <div
        className="fixed inset-0 z-50 pointer-events-none eru-enter"
        aria-hidden="false"
      >
        <CenteredBottomNav onSearchOpen={handleSearchOpen} prefs={prefs} updateWidget={updateWidget} />
      </div>

      {/* Persistent media player — root-level singleton mounted OUTSIDE the
          route-swapping <Outlet>, so playback continues and the bar stays
          visible across navigation. Renders nothing until a track is loaded. */}
      <PersistentPlayer />

      {/* Fixed iOS-style mobile tab bar — only visible on phone-sized screens.
          Guarantees phones always have a visible, stationary nav entry point
          even if the floating nav was dragged off-screen. */}
      <MobileTabBar />
    </>
  );
}