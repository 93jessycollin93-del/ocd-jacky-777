import { useState, useRef, useCallback, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, BarChart2, ArrowUpDown, ImageIcon, Wallet, ShoppingBag, Mail, Lightbulb, Brain, Shield, ShieldAlert, Award, Send, Bot, FlaskConical, KeyRound, Wand2, Layers, Gem, Sparkles, Sword, Dna, Store, Settings, Cpu, BarChart, GripHorizontal, Pencil, X, Check, Search, ArrowLeftRight, ArrowUpRightFromSquare, MessageSquare, BookText, Library, Eye, EyeOff, HelpCircle, Factory, Coins, FileSpreadsheet, UserCog, Maximize2, Minimize2, Plus, ArrowLeft, StickyNote, Code2, ScanLine, Plug, Users, PanelsTopLeft, Music, Compass, BarChart3 } from 'lucide-react';
import NavWalkthrough from './nav/NavWalkthrough';
import QuickActionsPopover from './nav/QuickActionsPopover';
import { playSound, VIBRATE } from '../lib/soundEngine';
import { useLanguage } from '@/eru/context/LanguageContext';

// Labels are derived from translations via t('nav.<key>') in the component.
// `labelKey` lets us swap copy when the user changes language without touching
// the rest of the nav state. `fallback` is the English copy used when a locale
// is missing the key.
const ALL_PAGES = [
  { id: 'home',         labelKey: 'nav.home',         fallback: 'Home',         icon: Home,          to: '/' },
  { id: 'dashboard',    labelKey: 'nav.dashboard',    fallback: 'Dashboard',    icon: PanelsTopLeft, to: '/dashboard' },
  { id: 'jackie',       labelKey: 'nav.jackie',       fallback: 'Jackie',       icon: Bot,           to: '/jackie' },
  { id: 'markets',      labelKey: 'nav.markets',      fallback: 'Markets',      icon: BarChart2,     to: '/markets' },
  { id: 'trade',        labelKey: 'nav.trade',        fallback: 'Trade',        icon: ArrowUpDown,   to: '/trade' },
  { id: 'nfts',         labelKey: 'nav.nfts',         fallback: 'NFTs',         icon: ImageIcon,     to: '/nfts' },
  { id: 'portfolio',    labelKey: 'nav.portfolio',    fallback: 'Portfolio',    icon: Wallet,        to: '/portfolio' },
  { id: 'collect',      labelKey: 'nav.collect',      fallback: 'Collectables', icon: ShoppingBag,   to: '/collectables' },
  { id: 'music',        labelKey: 'nav.music',        fallback: 'Library',      icon: Music,         to: '/music' },
  { id: 'playlists',    labelKey: 'nav.playlists',    fallback: 'Playlists',    icon: Library,       to: '/playlists' },
  { id: 'discover',     labelKey: 'nav.discover',     fallback: 'Discover',     icon: Compass,       to: '/discover' },
  { id: 'listening',    labelKey: 'nav.listening',    fallback: 'Listening',    icon: BarChart3,     to: '/listening' },
  { id: 'messages',     labelKey: 'nav.messages',     fallback: 'Messages',     icon: Mail,          to: '/messages' },
  { id: 'community',    labelKey: 'nav.community',    fallback: 'Community',    icon: Users,         to: '/community' },
  { id: 'botlab',       labelKey: 'nav.botlab',       fallback: 'Bot Lab',      icon: Bot,           to: '/bot-lab' },
  { id: 'creator',      labelKey: 'nav.creator',      fallback: 'Creator Hub',  icon: Lightbulb,     to: '/creator' },
  { id: 'thinkers',     labelKey: 'nav.thinkers',     fallback: 'Thinkers',     icon: Brain,         to: '/thinkers' },
  { id: 'review',       labelKey: 'nav.review',       fallback: 'App Review',   icon: Shield,        to: '/review' },
  { id: 'reputation',   labelKey: 'nav.reputation',   fallback: 'Reputation',   icon: Award,         to: '/reputation' },
  { id: 'tgapps',       labelKey: 'nav.tgapps',       fallback: 'TG Apps',      icon: Send,          to: '/tgapps' },
  { id: 'ailab',        labelKey: 'nav.ailab',        fallback: 'AI Lab',       icon: FlaskConical,  to: '/ailab' },
  { id: 'devlab',       labelKey: 'nav.devlab',       fallback: 'Dev Lab',      icon: Code2,         to: '/dev-lab' },
  { id: 'cardscan',     labelKey: 'nav.cardscan',     fallback: 'Card Scan',    icon: ScanLine,      to: '/card-scanner' },
  { id: 'integrations', labelKey: 'nav.integrations', fallback: 'Connections',  icon: Plug,          to: '/integrations' },
  { id: 'botmarket',    labelKey: 'nav.botmarket',    fallback: 'Bot Market',   icon: Cpu,           to: '/bot-marketplace' },
  { id: 'botfarm',      labelKey: 'nav.botfarm',      fallback: 'Bot Farm',     icon: Factory,       to: '/bot-farm' },
  { id: 'apikeys',      labelKey: 'nav.apikeys',      fallback: 'API Keys',     icon: KeyRound,      to: '/apikeys' },
  { id: 'builder',      labelKey: 'nav.builder',      fallback: 'ERU',          icon: Wand2,         to: '/builder' },
  { id: 'pipeline',     labelKey: 'nav.pipeline',     fallback: 'Pipeline',     icon: Layers,        to: '/pipeline' },
  { id: 'jta',          labelKey: 'nav.jta',          fallback: 'Jade Atelier', icon: Gem,           to: '/jta' },
  { id: 'visual',       labelKey: 'nav.visual',       fallback: 'Visual',       icon: Sparkles,      to: '/visual' },
  { id: 'arena',        labelKey: 'nav.arena',        fallback: 'Card Arena',   icon: Sword,         to: '/arena' },
  { id: 'creatures',    labelKey: 'nav.creatures',    fallback: 'Creatures',    icon: Dna,           to: '/creatures' },
  { id: 'storefront',   labelKey: 'nav.storefront',   fallback: 'Storefront',   icon: Store,         to: '/storefront' },
  { id: 'bazar',        labelKey: 'nav.bazar',        fallback: 'Bazar Stand',  icon: Coins,         to: '/bazar-stand' },
  { id: 'sfanalytics',  labelKey: 'nav.sfanalytics',  fallback: 'SF Analytics', icon: BarChart,      to: '/storefront-analytics' },
  { id: 'economy',      labelKey: 'nav.economy',      fallback: 'Economy',      icon: Award,         to: '/admin/economy' },
  { id: 'sheets',       labelKey: 'nav.sheets',       fallback: 'Sheets Sync',  icon: FileSpreadsheet, to: '/sheets-sync' },
  { id: 'profileprefs', labelKey: 'nav.profileprefs', fallback: 'Profile Prefs',icon: UserCog,       to: '/profile-preferences' },
  { id: 'adminreview',  labelKey: 'nav.adminreview',  fallback: 'Admin Review', icon: ShieldAlert,   to: '/admin/review' },
  { id: 'security',     labelKey: 'nav.security',     fallback: 'Security',     icon: Shield,        to: '/admin/security' },
  { id: 'settings',     labelKey: 'nav.settings',     fallback: 'Settings',     icon: Settings,      to: '/settings' },
];

const WIDGET_NAV_ITEMS = [
  { id: 'botMarket', label: 'Bot Market', icon: Cpu, to: '/bot-marketplace' },
  { id: 'botChat', label: 'Bot Chat', icon: MessageSquare, widgetId: 'botChat' },
  { id: 'promptLibrary', label: 'Prompt Library', icon: BookText, to: '/jackie?panel=promptLibrary' },
  { id: 'conversations', label: 'Conversations', icon: Library, to: '/jackie?panel=conversations' },
  { id: 'notes', label: 'Notes', icon: StickyNote, widgetId: 'notes' },
];

const DEFAULT_PINNED = ['home', 'jackie', 'markets', 'bazar', 'portfolio'];
const STORAGE_KEY = 'floating_nav_pinned';
const POS_KEY = 'floating_nav_pos';
const ORIENTATION_KEY = 'floating_nav_orientation';
const EXPANDED_KEY = 'floating_nav_expanded';
const COLLAPSED_KEY = 'floating_nav_collapsed';
const NAV_MODE_KEY = 'floating_nav_mode'; // 'expanded' | 'icons' | 'controls'
const NAV_MODE_CYCLE = ['expanded', 'icons', 'controls'];
const ROWS_KEY = 'floating_nav_rows';
const NAV_WALKTHROUGH_SEEN_KEY = 'nav_walkthrough_seen';
const NAV_LOCKED_TO_TICKER_KEY = 'floating_nav_locked_to_ticker';
const TICKER_BAR_ID = 'app-ticker-bar';
// Offset between BotWidget clicker top and nav top when glued together.
const CLICKER_BLOCK = 56;

const FLOATING_WIDGETS = [
  { id: 'botMarket', label: 'Bot Market', icon: Cpu },
  { id: 'botChat', label: 'Bot Chat', icon: MessageSquare },
  { id: 'promptLibrary', label: 'Prompt Library', icon: BookText },
  { id: 'conversations', label: 'Conversations', icon: Library },
  { id: 'notes', label: 'Notes', icon: StickyNote },
];

export default function FloatingNav({ onSearchOpen, prefs, updateWidget }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const clickerPos = prefs?.botChat;
  const isAttachedToClicker =
    !!clickerPos && clickerPos.x !== null && clickerPos.x !== undefined &&
    clickerPos.y !== null && clickerPos.y !== undefined;

  const [pinned, setPinned] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || DEFAULT_PINNED; } catch { return DEFAULT_PINNED; }
  });
  const [editMode, setEditMode] = useState(false);
  const [orientation, setOrientation] = useState(() => {
    try { return localStorage.getItem(ORIENTATION_KEY) || 'horizontal'; } catch { return 'horizontal'; }
  });
  const [isExpanded, setIsExpanded] = useState(() => {
    try { return JSON.parse(localStorage.getItem(EXPANDED_KEY)) || false; } catch { return false; }
  });
  const [rows, setRows] = useState(() => {
    try { return JSON.parse(localStorage.getItem(ROWS_KEY)) || 1; } catch { return 1; }
  });
  // Three-stage nav mode: 'expanded' (full labels) → 'icons' (icon-only)
  // → 'controls' (ultra-compact, only the manipulation strip).
  // Reads the new key first; falls back to the legacy boolean `collapsed`
  // for users who already persisted icon-only mode.
  const [navMode, setNavMode] = useState(() => {
    try {
      const saved = localStorage.getItem(NAV_MODE_KEY);
      if (saved && NAV_MODE_CYCLE.includes(saved)) return saved;
      const legacy = JSON.parse(localStorage.getItem(COLLAPSED_KEY) || 'false');
      return legacy ? 'icons' : 'expanded';
    } catch { return 'expanded'; }
  });
  const collapsed = navMode === 'icons'; // preserve icon-only padding/label logic
  const isControlsOnly = navMode === 'controls';
  // Free-float position: x AND y are user-draggable. Defaults to null →
  // anchored just below the ticker on first paint. Once the user drags,
  // we store viewport coords (in px) and switch to fixed positioning.
  const [pos, setPos] = useState(() => {
    try { return JSON.parse(localStorage.getItem(POS_KEY)) || { x: null, y: null }; } catch { return { x: null, y: null }; }
  });
  // Measured ticker height — used as the default top offset so the nav
  // never overlaps the ticker regardless of its current rendered height.
  const [tickerOffset, setTickerOffset] = useState(0);
  useEffect(() => {
    const measure = () => {
      const el = document.getElementById(TICKER_BAR_ID);
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setTickerOffset(Math.ceil(rect.bottom));
    };
    measure();
    window.addEventListener('resize', measure);
    const id = window.setInterval(measure, 1000); // catch font/data-driven height changes
    return () => { window.removeEventListener('resize', measure); window.clearInterval(id); };
  }, []);

  // Safety net: clamp saved x/y inside the viewport AND below the ticker
  // so the nav can never collide with the ticker on mount/resize.
  useEffect(() => {
    const clamp = () => {
      const navEl = navRef.current;
      if (!navEl) return;
      const w = navEl.offsetWidth;
      const h = navEl.offsetHeight;
      const tickerEl = document.getElementById(TICKER_BAR_ID);
      const minY = (tickerEl ? Math.ceil(tickerEl.getBoundingClientRect().bottom) : 0) + 4;
      const maxX = Math.max(0, window.innerWidth - w - 8);
      const maxY = Math.max(minY, window.innerHeight - h - 8);
      setPos((prev) => {
        if (prev?.x == null && prev?.y == null) return prev;
        const nx = prev.x == null ? null : Math.max(8, Math.min(prev.x, maxX));
        const ny = prev.y == null ? null : Math.max(minY, Math.min(prev.y, maxY));
        if (nx === prev.x && ny === prev.y) return prev;
        const next = { x: nx, y: ny };
        try { localStorage.setItem(POS_KEY, JSON.stringify(next)); } catch {}
        return next;
      });
    };
    clamp();
    window.addEventListener('resize', clamp);
    return () => window.removeEventListener('resize', clamp);
  }, []);

  // Reset to default snap (single horizontal row under the ticker).
  // Restores position, orientation, and row count to the canonical layout
  // shown in the design reference — one tap to recover from any drift.
  const resetPosition = useCallback(() => {
    const nextPos = { x: null, y: null };
    setPos(nextPos);
    setOrientation('horizontal');
    setRows(1);
    try {
      localStorage.setItem(POS_KEY, JSON.stringify(nextPos));
      localStorage.setItem(ORIENTATION_KEY, 'horizontal');
      localStorage.setItem(ROWS_KEY, JSON.stringify(1));
    } catch {}
  }, []);
  // Floating-widget visibility is owned by Layout via the `prefs`/`updateWidget`
  // props (the same source the on-screen widgets like BotWidget read). The nav
  // used to keep its OWN `floatingWidgets` state backed by the same
  // localStorage key, so the editor toggle updated the nav's copy but never the
  // real widget — and Layout's persist effect clobbered it. Reading/writing
  // `prefs` directly keeps the editor, the nav attachment, and the widgets in
  // sync. A widget counts as visible unless explicitly set to false (matching
  // BotWidget's own `visible === false` check).
  const widgetVisible = useCallback((id) => prefs?.[id]?.visible !== false, [prefs]);

  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const navRef = useRef(null);
  const didDrag = useRef(false);
  const holdTimer = useRef(null);
  const holdStart = useRef({ x: 0, y: 0, pointerId: null });
  const [isHoldReady, setIsHoldReady] = useState(false);
  const HOLD_MS = 500;
  const [unavailableWidget, setUnavailableWidget] = useState(null);
  const [walkthroughOpen, setWalkthroughOpen] = useState(false);
  const [walkthroughStep, setWalkthroughStep] = useState(0);
  const [lockedToTicker, setLockedToTicker] = useState(() => {
    try { return JSON.parse(localStorage.getItem(NAV_LOCKED_TO_TICKER_KEY)) || false; } catch { return false; }
  });

  useEffect(() => {
    const handleUnavailable = () => {
      setUnavailableWidget('botChat');
      window.setTimeout(() => setUnavailableWidget(null), 1800);
    };

    window.addEventListener('bot-chat-unavailable', handleUnavailable);
    return () => window.removeEventListener('bot-chat-unavailable', handleUnavailable);
  }, []);

  // Auto-open walkthrough disabled — was blocking mobile users who couldn't close it.

  // Resolve translated labels — falls back to English when a locale is missing.
  const pinnedPages = ALL_PAGES
    .filter(p => pinned.includes(p.id))
    .map(p => ({ ...p, label: t(p.labelKey, undefined, p.fallback) }));
  const attachedWidgets = WIDGET_NAV_ITEMS.filter((item) => widgetVisible(item.id));
  const navItems = [...pinnedPages, ...attachedWidgets];

  const savePinned = (next) => {
    setPinned(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const togglePin = (id) => {
    playSound('toggle');
    VIBRATE.toggle();
    savePinned(pinned.includes(id) ? pinned.filter(p => p !== id) : [...pinned, id]);
  };

  const toggleFloatingWidget = (id) => {
    playSound('toggle');
    VIBRATE.toggle();
    // Write through the shared prefs so the on-screen widget AND the nav
    // attachment both update from one source of truth.
    updateWidget?.(id, { visible: !widgetVisible(id) });
  };

  const toggleOrientation = () => {
    const newOrientation = orientation === 'horizontal' ? 'vertical' : 'horizontal';
    setOrientation(newOrientation);
    localStorage.setItem(ORIENTATION_KEY, newOrientation);
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
    localStorage.setItem(EXPANDED_KEY, JSON.stringify(!isExpanded));
  };

  const cycleRows = () => {
    const newRows = rows === 1 ? 2 : rows === 2 ? 3 : rows === 3 ? 4 : 1;
    setRows(newRows);
    localStorage.setItem(ROWS_KEY, JSON.stringify(newRows));
  };

  const cycleNavMode = () => {
    const idx = NAV_MODE_CYCLE.indexOf(navMode);
    const next = NAV_MODE_CYCLE[(idx + 1) % NAV_MODE_CYCLE.length];
    setNavMode(next);
    try {
      localStorage.setItem(NAV_MODE_KEY, next);
      // Keep legacy key in sync for any other readers.
      localStorage.setItem(COLLAPSED_KEY, JSON.stringify(next === 'icons'));
    } catch {}
  };

  const nextModeLabel = navMode === 'expanded'
    ? 'Collapse to icons'
    : navMode === 'icons'
      ? 'Collapse to control bar'
      : 'Expand navigation';

  // Distribute pinned pages across rows
  const getPagesByRow = () => {
    const pages = navItems.length;
    const perRow = Math.ceil(pages / rows);
    const rowArray = [];
    for (let i = 0; i < rows; i++) {
      rowArray.push(navItems.slice(i * perRow, (i + 1) * perRow));
    }
    return rowArray;
  };

  const clearHold = useCallback(() => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  }, []);

  const onPointerDown = useCallback((e) => {
    if (lockedToTicker) return;
    // Hold anywhere on the bar (including buttons/links) to start dragging.
    const rect = navRef.current.getBoundingClientRect();
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    holdStart.current = { x: e.clientX, y: e.clientY, pointerId: e.pointerId };
    didDrag.current = false;
    clearHold();
    holdTimer.current = setTimeout(() => {
      dragging.current = true;
      setIsHoldReady(true);
      try { navRef.current?.setPointerCapture(holdStart.current.pointerId); } catch {}
      VIBRATE.toggle?.();
      playSound('toggle');
    }, HOLD_MS);
  }, [lockedToTicker, clearHold]);

  const onPointerMove = useCallback((e) => {
    // Cancel hold if the user moves too far before the timer fires (it's a scroll/tap, not a hold).
    if (!dragging.current && holdTimer.current) {
      const dx = e.clientX - holdStart.current.x;
      const dy = e.clientY - holdStart.current.y;
      if (Math.hypot(dx, dy) > 8) clearHold();
      return;
    }
    if (!dragging.current) return;
    if (!didDrag.current) {
      playSound('whoosh');
      VIBRATE.click();
    }
    didDrag.current = true;
    // Free-float: drag on both X and Y, clamped to viewport with an 8px gutter.
    const navEl = navRef.current;
    const w = navEl.offsetWidth;
    const h = navEl.offsetHeight;
    const x = e.clientX - dragOffset.current.x;
    const y = e.clientY - dragOffset.current.y;
    const maxX = Math.max(0, window.innerWidth - w - 8);
    const maxY = Math.max(0, window.innerHeight - h - 8);
    const newPos = {
      x: Math.max(8, Math.min(x, maxX)),
      y: Math.max(8, Math.min(y, maxY)),
    };
    setPos(newPos);
    localStorage.setItem(POS_KEY, JSON.stringify(newPos));
  }, [clearHold]);

  const onPointerUp = useCallback(() => {
    clearHold();
    dragging.current = false;
    setIsHoldReady(false);
  }, [clearHold]);

  // If a drag happened, swallow the click so the link/button underneath doesn't fire.
  const onClickCapture = useCallback((e) => {
    if (didDrag.current) {
      e.preventDefault();
      e.stopPropagation();
      didDrag.current = false;
    }
  }, []);

  // NOTE: The Layout shell already pins ticker + nav together as a single
  // sticky unit, so the legacy "lock to ticker" rAF loop is no longer needed
  // (it ran every frame indefinitely, draining mobile battery and fighting
  // the parent sticky). Kept the toggle for backwards-compat but stopped
  // the per-frame sync — position simply stays where the user dropped it.

  const toggleTickerLock = () => {
    const next = !lockedToTicker;
    setLockedToTicker(next);
    localStorage.setItem(NAV_LOCKED_TO_TICKER_KEY, JSON.stringify(next));
    if (!next) {
      setPos((prev) => ({ ...prev, y: prev?.y ?? 12 }));
    }
  };

  // Free-floating: nav is absolutely positioned inside the Layout's
  // full-viewport overlay. Default (x/y null) anchors bottom-center; once
  // the user drags, we pin it to the dragged coords. Pointer events are
  // re-enabled only on the nav itself so the rest of the overlay stays
  // click-through.
  const isFloating = pos?.x != null && pos?.y != null;
  const innerStyle = isFloating
    ? {
        position: 'absolute',
        left: pos.x,
        top: pos.y,
        width: 'fit-content',
        pointerEvents: 'auto',
        touchAction: 'none',
        userSelect: 'none',
      }
    : {
        // Default snap: directly under the live ticker bar. Uses the
        // measured ticker height so it never collides regardless of the
        // ticker's current rendered size.
        position: 'absolute',
        left: '50%',
        top: (tickerOffset || 48) + 6,
        transform: 'translateX(-50%)',
        width: 'fit-content',
        pointerEvents: 'auto',
        touchAction: 'none',
        userSelect: 'none',
      };

  return (
    <>
      {/* Free-floating nav: positioned absolutely inside the Layout's
          full-viewport overlay so the user can drag it anywhere on screen
          (both X and Y). Default state anchors bottom-center. */}
      <div
        ref={navRef}
        style={innerStyle}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClickCapture={onClickCapture}
        title={lockedToTicker ? '' : 'Press and hold to move'}
        className={`eru-skin-nav-floating bg-card/95 text-foreground backdrop-blur-md border border-border rounded-2xl px-2 py-1.5 shadow-2xl transition-shadow ${lockedToTicker ? 'cursor-default' : isHoldReady ? 'cursor-grabbing ring-2 ring-primary/60 shadow-primary/20' : 'cursor-pointer'} ${orientation === 'horizontal' ? 'flex items-center gap-0.5' : 'flex flex-col gap-0.5'}`}
      >
        {/* Drag handle + orientation toggle + rows toggle + edit */}
        {/* Handle strip: always flex-row so the icon grid can start right
            beneath it instead of leaving an empty column beside a vertical
            stack of handle buttons. */}
        {/* Compacted handle strip — micro-controls (icons ~10px, gap ~2px,
            buttons 14px). Opt-out of the global 44×44 min touch target via
            data-no-min-touch since this strip is intentionally dense.
            Layout flips opposite to the nav: when nav is HORIZONTAL the
            handle stacks VERTICALLY (saves width); when nav is VERTICAL
            the handle stacks HORIZONTALLY (saves height). */}
        <div className={`flex items-center gap-[2px] text-muted-foreground/40 ${orientation === 'vertical' ? 'flex-row pb-0.5 justify-start' : 'flex-col pr-0.5 justify-center'}`}>
          {/* Back — leftmost; uses router history, falls back to Home if there's nothing to pop */}
          <button
            data-no-min-touch
            onClick={() => {
              playSound('click');
              VIBRATE.click();
              if (typeof window !== 'undefined' && window.history && window.history.length > 1) {
                navigate(-1);
              } else {
                navigate('/');
              }
            }}
            aria-label={t('nav.back', undefined, 'Go back')}
            title={t('nav.back', undefined, 'Back')}
            className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full border border-border bg-secondary/60 text-muted-foreground transition-all hover:scale-110 hover:text-primary hover:border-primary/40 hover:bg-primary/10 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          >
            <ArrowLeft style={{ width: 8, height: 8 }} />
          </button>
          {!isControlsOnly && !collapsed && !lockedToTicker && (
            <span className="text-[7px] font-medium leading-none text-muted-foreground/50 text-center whitespace-nowrap">
              hold to snap
            </span>
          )}
          <GripHorizontal style={{ width: 10, height: 10 }} className={lockedToTicker ? 'opacity-40' : ''} />
          <button
            data-no-min-touch
            onClick={() => {
              playSound('toggle');
              VIBRATE.toggle();
              toggleOrientation();
            }}
            className="inline-flex items-center justify-center w-3.5 h-3.5 transition-colors hover:text-primary"
            title={orientation === 'horizontal' ? 'Switch to Vertical' : 'Switch to Horizontal'}
          >
            {orientation === 'horizontal' ? (
              <ArrowUpRightFromSquare style={{ width: 10, height: 10 }} />
            ) : (
              <ArrowLeftRight style={{ width: 10, height: 10 }} />
            )}
          </button>
          <button
            data-no-min-touch
            onClick={() => {
              playSound('toggle');
              VIBRATE.toggle();
              cycleRows();
            }}
            className="transition-colors hover:text-primary text-[9px] font-bold w-3 h-3 flex items-center justify-center"
            title={`${rows} row${rows > 1 ? 's' : ''} (click to cycle)`}
          >
            {rows}
          </button>
          <button
            data-no-min-touch
            onClick={() => {
              playSound('toggle');
              VIBRATE.toggle();
              toggleTickerLock();
            }}
            className={`inline-flex items-center justify-center w-3.5 h-3.5 transition-colors hover:text-primary ${lockedToTicker ? 'text-primary' : ''}`}
            title={lockedToTicker ? 'Unlock from Ticker' : 'Lock to Ticker'}
          >
            <ArrowUpRightFromSquare style={{ width: 10, height: 10 }} />
          </button>
          <button
            data-no-min-touch
            onClick={() => {
              playSound('click');
              VIBRATE.click();
              // Cancel any in-progress hold/drag and release pointer capture so
              // the editor modal reliably receives taps (mobile fix).
              clearHold();
              dragging.current = false;
              didDrag.current = false;
              setIsHoldReady(false);
              try { navRef.current?.releasePointerCapture?.(holdStart.current.pointerId); } catch {}
              setEditMode(true);
            }}
            className="inline-flex items-center justify-center w-3.5 h-3.5 transition-colors hover:text-primary"
            title="Edit"
          >
            <Pencil style={{ width: 10, height: 10 }} />
          </button>
          {/* Cycle nav mode: expanded → icons → controls-only → expanded */}
          <button
            data-no-min-touch
            onClick={() => {
              playSound('toggle');
              VIBRATE.toggle();
              cycleNavMode();
            }}
            aria-label={nextModeLabel}
            title={nextModeLabel}
            className={`ml-px inline-flex items-center justify-center w-3.5 h-3.5 rounded-full border border-primary/30 bg-primary/10 text-primary shadow-[0_0_8px_hsl(160_100%_45%/0.25)] transition-all hover:scale-110 hover:bg-primary/20 hover:shadow-[0_0_12px_hsl(160_100%_45%/0.55)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60`}
          >
            {navMode === 'expanded' ? (
              <Minimize2 style={{ width: 8, height: 8 }} />
            ) : navMode === 'icons' ? (
              <Minimize2 style={{ width: 8, height: 8 }} className="opacity-70" />
            ) : (
              <Maximize2 style={{ width: 8, height: 8 }} />
            )}
          </button>
          {/* Tiny mode pip — three dots indicating current stage. Purely cosmetic, mobile-safe. */}
          <span
            aria-hidden="true"
            className="ml-px hidden sm:inline-flex items-center gap-[1px]"
            title={`Mode: ${navMode}`}
          >
            {NAV_MODE_CYCLE.map((m) => (
              <span
                key={m}
                className={`block w-[3px] h-[3px] rounded-full transition-colors ${m === navMode ? 'bg-primary shadow-[0_0_3px_hsl(160_100%_45%/0.8)]' : 'bg-muted-foreground/30'}`}
              />
            ))}
          </span>
        </div>

        {!isControlsOnly && (() => {
          const itemPad = collapsed ? 'px-1.5 py-1' : 'px-2.5 py-1.5';
          const renderNavItem = ({ id, label, icon: Icon, to, widgetId }) => {
            const active = to ? (to.startsWith('/jackie?panel=') ? pathname === '/jackie' : pathname === to || (to !== '/' && pathname.startsWith(to))) : false;
            const isJackiePanelLink = to?.startsWith('/jackie?panel=');
            const handleWidgetClick = () => {
              if (!widgetId) return;
              playSound('click');
              VIBRATE.click();
              if (widgetId === 'botChat') {
                window.dispatchEvent(new CustomEvent('open-bot-chat'));
              } else {
                window.dispatchEvent(new CustomEvent('toggle-widget-visibility', { detail: { widgetId } }));
              }
            };
            const handlePanelNavigation = () => {
              if (!isJackiePanelLink) return;
              playSound('click');
              VIBRATE.click();
              navigate(to);
            };
            if (to) {
              if (isJackiePanelLink) {
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={handlePanelNavigation}
                    title={label}
                    className={`eru-nav-item flex flex-col items-center gap-0.5 ${itemPad} rounded-xl ${
                      active ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                    }`}
                  >
                    <Icon className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} />
                    {!collapsed && <span className="text-[8px] font-medium leading-none">{label}</span>}
                  </button>
                );
              }
              return (
                <Link
                  key={id}
                  to={to}
                  title={label}
                  className={`eru-nav-item flex flex-col items-center gap-0.5 ${itemPad} rounded-xl ${
                    active ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                  }`}
                >
                  <Icon className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} />
                  {!collapsed && <span className="text-[8px] font-medium leading-none">{label}</span>}
                </Link>
              );
            }
            return (
              <button
                key={id}
                type="button"
                onClick={handleWidgetClick}
                title={label}
                className={`eru-nav-item flex flex-col items-center gap-0.5 ${itemPad} rounded-xl ${unavailableWidget === id ? 'text-destructive bg-destructive/10' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'}`}
              >
                <Icon className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} />
                {!collapsed && <span className="text-[8px] font-medium leading-none">{label}</span>}
              </button>
            );
          };
          // Horizontal: `rows` chunks stack vertically, items flow left→right within each row.
          // Vertical:   `rows` chunks stack horizontally, items flow top→bottom within each column.
          const isHorizontal = orientation === 'horizontal';
          return (
            <div className={`flex gap-0.5 ${isHorizontal ? 'flex-col' : 'flex-row'}`}>
              {getPagesByRow().map((chunk, chunkIdx) => (
                <div key={chunkIdx} className={`flex gap-0.5 ${isHorizontal ? 'flex-row' : 'flex-col'}`}>
                  {chunk.map(renderNavItem)}
                </div>
              ))}
            </div>
          );
        })()}

        {/* Quick Actions — replaces former floating Plus bubble */}
        {!isControlsOnly && <QuickActionsPopover
          trigger={({ onClick, open }) => (
            <button
              onClick={() => { playSound('click'); VIBRATE.click(); onClick(); }}
              className={`eru-nav-item flex flex-col items-center gap-0.5 ${collapsed ? 'px-1.5 py-1' : 'px-2.5 py-1.5'} rounded-xl text-muted-foreground hover:text-primary hover:bg-secondary/60`}
              title={t('nav.create', undefined, 'Quick Actions')}
              aria-label={t('nav.create', undefined, 'Quick Actions')}
            >
              <Plus style={{ width: 18, height: 18 }} className={`transition-transform ${open ? 'rotate-45 text-primary' : ''}`} />
              {!collapsed && <span className="text-[8px] font-medium leading-none">{t('nav.create', undefined, 'Create')}</span>}
            </button>
          )}
        />}

        {/* Search button */}
        {!isControlsOnly && <button
          onClick={() => {
            playSound('click');
            VIBRATE.click();
            const result = onSearchOpen?.();
            if (result && typeof result.catch === 'function') {
              result.catch(() => {});
            }
          }}
          className={`eru-nav-item flex flex-col items-center gap-0.5 ${collapsed ? 'px-1.5 py-1' : 'px-2.5 py-1.5'} rounded-xl text-muted-foreground hover:text-primary hover:bg-secondary/60`}
          title={t('nav.search', undefined, 'Search')}
          aria-label={t('nav.search', undefined, 'Search')}
        >
          <Search style={{ width: 18, height: 18 }} />
          {!collapsed && <span className="text-[8px] font-medium leading-none">{t('nav.search', undefined, 'Search')}</span>}
        </button>}
      </div>

      {/* Edit modal — rendered OUTSIDE the draggable nav container so the nav's
          press-and-hold drag handlers (pointerdown/move/up + onClickCapture +
          touchAction:none) can't swallow taps inside the editor. */}
      {editMode && (
        <div
          className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end justify-center"
          style={{ pointerEvents: 'auto', touchAction: 'auto' }}
          onPointerDown={e => e.stopPropagation()}
          onClick={() => setEditMode(false)}
        >
          <div
            className="w-full max-w-md md:max-w-2xl bg-card text-foreground border-t border-border rounded-t-2xl max-h-[75dvh] flex flex-col"
            style={{ pointerEvents: 'auto', touchAction: 'auto' }}
            onPointerDown={e => e.stopPropagation()}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
              <p className="font-semibold text-sm">Customize Nav Bar</p>
              <button onClick={() => {
                playSound('click');
                VIBRATE.click();
                setEditMode(false);
              }} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground px-4 py-2 border-b border-border">Tap to add or remove pages and floating widgets.</p>
            <div className="overflow-y-auto overscroll-contain touch-pan-y [-webkit-overflow-scrolling:touch] flex-1 min-h-0 px-4 py-3 space-y-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-3">Pages</p>
                <div className="grid grid-cols-4 gap-3">
                  {ALL_PAGES.map(({ id, labelKey, fallback, icon: Icon }) => {
                    const label = t(labelKey, undefined, fallback);
                    const isPinned = pinned.includes(id);
                    return (
                      <button
                        key={id}
                        onClick={() => togglePin(id)}
                        className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all ${
                          isPinned ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-secondary text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <div className="relative">
                          <Icon style={{ width: 20, height: 20 }} />
                          {isPinned && (
                            <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-primary rounded-full flex items-center justify-center">
                              <Check className="w-2 h-2 text-primary-foreground" />
                            </div>
                          )}
                        </div>
                        <span className="text-[9px] font-medium text-center leading-tight">{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Floating Widgets</p>
                  <button
                    onClick={() => {
                      playSound('click');
                      VIBRATE.click();
                      setWalkthroughStep(0);
                      setWalkthroughOpen(true);
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground"
                  >
                    <HelpCircle className="w-3 h-3" /> Guide
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {FLOATING_WIDGETS.map(({ id, label, icon: Icon }) => {
                    const isVisible = widgetVisible(id);
                    return (
                      <button
                        key={id}
                        onClick={() => toggleFloatingWidget(id)}
                        className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                          isVisible ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-secondary text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <div className="relative">
                          <Icon style={{ width: 20, height: 20 }} />
                          <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center bg-background border border-border">
                            {isVisible ? <Eye className="w-2 h-2 text-primary" /> : <EyeOff className="w-2 h-2 text-muted-foreground" />}
                          </div>
                        </div>
                        <span className="text-[9px] font-medium text-center leading-tight">{label}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-[10px] text-muted-foreground">These items attach directly to the nav bar when enabled here. Jackie stays as its own separate round widget.</p>
              </div>
            </div>
            <div className="px-4 py-3 border-t border-border flex-shrink-0 space-y-2">
              <div className="flex gap-2">
                <button onClick={() => {
                  playSound('click');
                  VIBRATE.click();
                  setEditMode(false);
                }} className="flex-1 bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold">
                  Done
                </button>
                <div className="flex gap-1 bg-secondary rounded-xl p-1">
                  {[1, 2, 3, 4].map(r => (
                    <button
                      key={r}
                      onClick={() => {
                          playSound('toggle');
                          VIBRATE.toggle();
                          setRows(r);
                          localStorage.setItem(ROWS_KEY, JSON.stringify(r));
                        }}
                      className={`w-8 h-8 rounded text-xs font-medium transition-colors ${
                        rows === r ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground text-center">Pages: {pinned.length} · Widgets: {FLOATING_WIDGETS.filter(({ id }) => widgetVisible(id)).length}</p>
            </div>
          </div>
        </div>
      )}

      <NavWalkthrough
        open={walkthroughOpen}
        step={walkthroughStep}
        setStep={setWalkthroughStep}
        onClose={() => {
          playSound('click');
          VIBRATE.click();
          setWalkthroughOpen(false);
          setWalkthroughStep(0);
        }}
      />
    </>
  );
}