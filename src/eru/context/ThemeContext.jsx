import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { base44 } from '@/eru/api/base44Client';
import { applyRootVariables, mergeThemeSettings } from '@/eru/lib/themeEngine';

// ─── BACKGROUND ENVIRONMENTS ─────────────────────────────────────────────────
export const BG_ENVS = {
  none:            { label: 'None',           cat: 'off'      },
  // Digital (animated)
  neural_mesh:     { label: 'Neural Mesh',    cat: 'digital'  },
  matrix_rain:     { label: 'Matrix Rain',    cat: 'digital'  },
  // Space (animated)
  stars:           { label: 'Star Field',     cat: 'space'    },
  nebula:          { label: 'Nebula',         cat: 'space'    },
  aurora_sky:      { label: 'Aurora Sky',     cat: 'space'    },
  // Nature (animated)
  particles:       { label: 'Floating Dust',  cat: 'nature'   },
  // Energy (animated)
  fire:            { label: 'Embers',         cat: 'energy'   },
  // Mythic (animated)
  crystal_lattice: { label: 'Crystal Lattice',cat: 'mythic'   },
  // ── Astronomical Still Backdrops ──────────────────────────────────────────
  still_milkyway:   { label: 'Milky Way Core',    cat: 'still', url: 'https://images.unsplash.com/photo-1465101162946-4377e57745c3?w=1920&q=95&fit=crop' },
  still_nebula:     { label: 'Pillars of Cosmos', cat: 'still', url: 'https://images.unsplash.com/photo-1502134249126-9f3755a50d78?w=1920&q=95&fit=crop' },
  still_galaxy:     { label: 'Spiral Galaxy',     cat: 'still', url: 'https://images.unsplash.com/photo-1444703686981-a3abbc4d4fe3?w=1920&q=95&fit=crop' },
  still_aurora:     { label: 'Aurora Borealis',   cat: 'still', url: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=1920&q=95&fit=crop' },
  still_earth:      { label: 'Earth From Orbit',  cat: 'still', url: 'https://images.unsplash.com/photo-1614730321146-b6fa6a46bcb4?w=1920&q=95&fit=crop' },
  still_moon:       { label: 'Lunar Surface',     cat: 'still', url: 'https://images.unsplash.com/photo-1522030299830-16b8d3d049fe?w=1920&q=95&fit=crop' },
  still_startrail:  { label: 'Star Trails',       cat: 'still', url: 'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=1920&q=95&fit=crop' },
  still_cosmos:     { label: 'Deep Cosmos',       cat: 'still', url: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=1920&q=95&fit=crop' },
  still_saturn:     { label: 'Ringed Planet',     cat: 'still', url: 'https://images.unsplash.com/photo-1614726365952-510103b1bdb8?w=1920&q=95&fit=crop' },
  still_stardust:   { label: 'Cosmic Stardust',   cat: 'still', url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=1920&q=95&fit=crop' },
  still_eclipse:    { label: 'Solar Eclipse',     cat: 'still', url: 'https://images.unsplash.com/photo-1532798369041-b33eb576ef16?w=1920&q=95&fit=crop' },
  still_supernova:  { label: 'Supernova',         cat: 'still', url: 'https://images.unsplash.com/photo-1543722530-d2c3201371e7?w=1920&q=95&fit=crop' },
  still_telescope:  { label: 'Observatory Night', cat: 'still', url: 'https://images.unsplash.com/photo-1537420327992-d6e192287183?w=1920&q=95&fit=crop' },
  still_darksky:    { label: 'Dark Sky Desert',   cat: 'still', url: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=1920&q=95&fit=crop' },
  still_plasma:     { label: 'Plasma Storm',      cat: 'still', url: 'https://images.unsplash.com/photo-1475274047050-1d0c0975c63e?w=1920&q=95&fit=crop' },
  still_matrix:     { label: 'Matrix Code',       cat: 'still', url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1920&q=95&fit=crop' },
  // ── Wildlife & Nature Backdrops ──────────────────────────────────────────────
  wild_lion:        { label: 'Lion Portrait',       cat: 'wildlife', url: 'https://images.unsplash.com/photo-1546182990-dffeafbe841d?w=1920&q=95&fit=crop' },
  wild_tiger:       { label: 'Bengal Tiger',        cat: 'wildlife', url: 'https://images.unsplash.com/photo-1561731216-c3a4d99437d5?w=1920&q=95&fit=crop' },
  wild_elephant:    { label: 'African Elephant',    cat: 'wildlife', url: 'https://images.unsplash.com/photo-1557050543-4d5f4e07ef46?w=1920&q=95&fit=crop' },
  wild_wolf:        { label: 'Arctic Wolf',         cat: 'wildlife', url: 'https://images.unsplash.com/photo-1474511320723-9a56873867b5?w=1920&q=95&fit=crop' },
  wild_leopard:     { label: 'Snow Leopard',        cat: 'wildlife', url: 'https://images.unsplash.com/photo-1552410260-0fd9b577afa6?w=1920&q=95&fit=crop' },
  wild_orca:        { label: 'Orca Breach',         cat: 'wildlife', url: 'https://images.unsplash.com/photo-1568430462989-44163eb1752f?w=1920&q=95&fit=crop' },
  wild_flamingo:    { label: 'Pink Flamingos',      cat: 'wildlife', url: 'https://images.unsplash.com/photo-1559827291-72ee739d0d9a?w=1920&q=95&fit=crop' },
  wild_hummingbird: { label: 'Hummingbird',         cat: 'wildlife', url: 'https://images.unsplash.com/photo-1444464666168-49d633b86797?w=1920&q=95&fit=crop' },
  wild_jellyfish:   { label: 'Jellyfish Bloom',     cat: 'wildlife', url: 'https://images.unsplash.com/photo-1545671913-b89ac1b4ac10?w=1920&q=95&fit=crop' },
  wild_turtle:      { label: 'Sea Turtle',          cat: 'wildlife', url: 'https://images.unsplash.com/photo-1591025207163-942350e47db2?w=1920&q=95&fit=crop' },
  wild_parrot:      { label: 'Scarlet Macaw',       cat: 'wildlife', url: 'https://images.unsplash.com/photo-1552728089-57bdde30beb3?w=1920&q=95&fit=crop' },
  wild_gorilla:     { label: 'Mountain Gorilla',    cat: 'wildlife', url: 'https://images.unsplash.com/photo-1540573133985-87b6da6d54a9?w=1920&q=95&fit=crop' },
  wild_bear:        { label: 'Grizzly Bear',        cat: 'wildlife', url: 'https://images.unsplash.com/photo-1589656966895-2f33e7653819?w=1920&q=95&fit=crop' },
  wild_dolphin:     { label: 'Dolphins Leaping',    cat: 'wildlife', url: 'https://images.unsplash.com/photo-1607153333879-c174d265f1d2?w=1920&q=95&fit=crop' },
  wild_fox:         { label: 'Red Fox',             cat: 'wildlife', url: 'https://images.unsplash.com/photo-1516934024742-b461fba47600?w=1920&q=95&fit=crop' },
  wild_giraffe:     { label: 'Giraffe Savanna',     cat: 'wildlife', url: 'https://images.unsplash.com/photo-1547721064-da6cfb341d50?w=1920&q=95&fit=crop' },
  wild_panda:       { label: 'Giant Panda',         cat: 'wildlife', url: 'https://images.unsplash.com/photo-1564349683136-77e08dba1ef7?w=1920&q=95&fit=crop' },
  wild_horse:       { label: 'Wild Mustangs',       cat: 'wildlife', url: 'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?w=1920&q=95&fit=crop' },
  wild_coral:       { label: 'Coral Reef World',    cat: 'wildlife', url: 'https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=1920&q=95&fit=crop' },

  // ── Pure Nature Scenery ────────────────────────────────────────────────────
  nat_waterfall:    { label: 'Angel Falls',          cat: 'scenery', url: 'https://images.unsplash.com/photo-1504701954957-2010ec3bcec1?w=1920&q=95&fit=crop' },
  nat_fjord:        { label: 'Norwegian Fjord',       cat: 'scenery', url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=95&fit=crop' },
  nat_canyon:       { label: 'Grand Canyon Sunrise',  cat: 'scenery', url: 'https://images.unsplash.com/photo-1474044159687-1ee9f3a51722?w=1920&q=95&fit=crop' },
  nat_rainforest:   { label: 'Amazon Rainforest',     cat: 'scenery', url: 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=1920&q=95&fit=crop' },
  nat_lavender:     { label: 'Lavender Fields',       cat: 'scenery', url: 'https://images.unsplash.com/photo-1499002238440-d264edd596ec?w=1920&q=95&fit=crop' },
  nat_iceland:      { label: 'Iceland Highlands',     cat: 'scenery', url: 'https://images.unsplash.com/photo-1476610182048-b716b8518aae?w=1920&q=95&fit=crop' },
  nat_tulips:       { label: 'Dutch Tulip Fields',    cat: 'scenery', url: 'https://images.unsplash.com/photo-1468581264429-2548ef9eb732?w=1920&q=95&fit=crop' },
  nat_biolum:       { label: 'Bioluminescent Shore',  cat: 'scenery', url: 'https://images.unsplash.com/photo-1508193638397-1c4234db14d8?w=1920&q=95&fit=crop' },
  nat_cherry:       { label: 'Cherry Blossom',        cat: 'scenery', url: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?w=1920&q=95&fit=crop' },
  nat_sahara:       { label: 'Sahara Dunes',          cat: 'scenery', url: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=1920&q=95&fit=crop' },
  nat_glacier:      { label: 'Blue Glacier',          cat: 'scenery', url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1920&q=95&fit=crop' },
  nat_volcano:      { label: 'Lava Flow',             cat: 'scenery', url: 'https://images.unsplash.com/photo-1560275619-4cc5fa59d3ae?w=1920&q=95&fit=crop' },
  nat_redwoods:     { label: 'Giant Redwoods',        cat: 'scenery', url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1920&q=95&fit=crop' },
  nat_overwater:    { label: 'Maldives Overwater',    cat: 'scenery', url: 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=1920&q=95&fit=crop' },
  nat_northernlake: { label: 'Mountain Mirror Lake',  cat: 'scenery', url: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1920&q=95&fit=crop' },
  nat_bamboo:       { label: 'Bamboo Forest',         cat: 'scenery', url: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=1920&q=95&fit=crop' },
  nat_arctic:       { label: 'Arctic Tundra',         cat: 'scenery', url: 'https://images.unsplash.com/photo-1520520731457-9283dd14aa66?w=1920&q=95&fit=crop' },
  nat_mushroom:     { label: 'Enchanted Forest',      cat: 'scenery', url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1920&q=95&fit=crop' },
  nat_patagonia:    { label: 'Patagonia Peaks',       cat: 'scenery', url: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1920&q=95&fit=crop' },
  nat_antelope:     { label: 'Antelope Canyon',       cat: 'scenery', url: 'https://images.unsplash.com/photo-1444076784383-69ff7bae1b0a?w=1920&q=95&fit=crop' },
  nat_newzealand:   { label: 'New Zealand Peaks',     cat: 'scenery', url: 'https://images.unsplash.com/photo-1469521669194-babb45599def?w=1920&q=95&fit=crop' },
  nat_mangrove:     { label: 'Mangrove Sunset',       cat: 'scenery', url: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=1920&q=95&fit=crop' },
  nat_lightning:    { label: 'Lightning Storm',       cat: 'scenery', url: 'https://images.unsplash.com/photo-1505533542167-8c89838bb19e?w=1920&q=95&fit=crop' },
};

// ─── MOTION PRESETS ──────────────────────────────────────────────────────────
export const MOTION_PRESETS = {
  none:    { label:'None',    speed:0,   scale:0   },
  subtle:  { label:'Subtle',  speed:0.5, scale:0.3 },
  default: { label:'Default', speed:1,   scale:1   },
  fluid:   { label:'Fluid',   speed:1.5, scale:1.2 },
  hyper:   { label:'Hyper',   speed:2.5, scale:2   },
};

// ─── TYPOGRAPHY PACKS ────────────────────────────────────────────────────────
export const TYPOGRAPHY_PACKS = {
  modern:  { label:'Modern',   font:'"Inter", sans-serif',       mono:'"JetBrains Mono", monospace' },
  cyber:   { label:'Cyber',    font:'"Share Tech Mono", monospace',mono:'"Share Tech Mono", monospace' },
  elegant: { label:'Elegant',  font:'"Playfair Display", serif',  mono:'"JetBrains Mono", monospace' },
  minimal: { label:'Minimal',  font:'"DM Sans", sans-serif',      mono:'"DM Mono", monospace' },
};

// ─── DEFAULTS — "NEON ORACLE" FOUNDATION ─────────────────────────────────────
// Eru's foundational aesthetic, derived from the cyberpunk reference palette:
// deep cosmic violet base, holographic magenta primary, electric cyan-leaning
// borders, dramatic glow + saturation. Applies on first load / after Reset.
// Existing users keep whatever they have set in localStorage.
//
// References mapped to tokens:
//   - Hot magenta hair / glowing skin → primary 305° / sat 100 / light 62
//   - Deep violet city sky           → bg / card 268° at very low lightness
//   - Cyan tech filigree             → border 280° (slight cool drift)
//   - Wet neon street reflections    → bgOpacity 0.78 + saturation 1.55
//   - Holographic bloom              → glowIntensity 1.4
const DEFAULTS = {
  colorMode: 'dark',
  bg: 'none',
  bgOpacity: 0.78,
  motionIntensity: 1.1,
  glowIntensity: 1.4,
  blurLevel: 1,
  particleDensity: 1.1,
  animSpeed: 1,
  brightness: 1.18,
  contrast: 1.12,
  saturation: 1.55,
  typography: 'modern',
  lowPowerMode: false,
  lockedSettings: [],
  uiScale: 1,
  // Color wheel: hot magenta over deep cosmic violet.
  primaryHue: 305,
  bgHue: 268,
  cardHue: 268,
  borderHue: 280,
  primarySat: 100,
  primaryLight: 62,
};

function load(key) {
  try { const v = localStorage.getItem('vse_' + key); return v !== null ? JSON.parse(v) : DEFAULTS[key]; }
  catch { return DEFAULTS[key]; }
}
function save(key, val) { localStorage.setItem('vse_' + key, JSON.stringify(val)); }

const ThemeCtx = createContext(null);

export function ThemeProvider({ children }) {
  const [colorMode,      setColorModeRaw]= useState(() => load('colorMode'));
  const [bg,             setBgRaw]       = useState(() => load('bg'));
  const [bgOpacity,      setBgOpacity]   = useState(() => load('bgOpacity'));
  const [motionIntensity,setMotionInt]   = useState(() => load('motionIntensity'));
  const [glowIntensity,  setGlowInt]     = useState(() => load('glowIntensity'));
  const [blurLevel,      setBlurLevel]   = useState(() => load('blurLevel'));
  const [particleDensity,setParticleDen] = useState(() => load('particleDensity'));
  const [animSpeed,      setAnimSpeed]   = useState(() => load('animSpeed'));
  const [brightness,     setBrightness]  = useState(() => load('brightness'));
  const [contrast,       setContrast]    = useState(() => load('contrast'));
  const [saturation,     setSaturation]  = useState(() => load('saturation'));
  const [typography,     setTypography]  = useState(() => load('typography'));
  const [lowPowerMode,   setLowPower]    = useState(() => load('lowPowerMode'));
  const [lockedSettings, setLocked]      = useState(() => load('lockedSettings'));
  const [uiScale,        setUiScaleRaw]  = useState(() => load('uiScale'));
  const [primaryHue,     setPrimaryHue]  = useState(() => load('primaryHue'));
  const [bgHue,          setBgHue]       = useState(() => load('bgHue'));
  const [cardHue,        setCardHue]     = useState(() => load('cardHue'));
  const [borderHue,      setBorderHue]   = useState(() => load('borderHue'));
  const [primarySat,     setPrimarySat]  = useState(() => load('primarySat'));
  const [primaryLight,   setPrimaryLight]= useState(() => load('primaryLight'));
  const [customThemes,   setCustomThemes]= useState([]);
  const [themeLayers,    setThemeLayers] = useState({ variables: {}, globalBackground: {}, pageBackground: {}, componentBackgrounds: {} });

  // Setters that check lock
  const isLocked = (key) => lockedSettings.includes(key);
  const setter = (key, stateSetter) => (val) => {
    if (isLocked(key)) return;
    stateSetter(val);
    save(key, val);
  };

  const setBg = setter('bg', setBgRaw);

  // Color setters
  const updatePrimaryHue   = (v) => { setPrimaryHue(v);   save('primaryHue', v); };
  const updateBgHue        = (v) => { setBgHue(v);        save('bgHue', v); };
  const updateCardHue      = (v) => { setCardHue(v);      save('cardHue', v); };
  const updateBorderHue    = (v) => { setBorderHue(v);    save('borderHue', v); };
  const updatePrimarySat   = (v) => { setPrimarySat(v);   save('primarySat', v); };
  const updatePrimaryLight = (v) => { setPrimaryLight(v); save('primaryLight', v); };

  // Apply CSS variables from color wheel
  useEffect(() => {
    const root = document.documentElement;
    const isLight = colorMode === 'light';
    root.style.setProperty('--primary', `${primaryHue} ${primarySat}% ${primaryLight}%`);
    root.style.setProperty('--accent', `${primaryHue} ${primarySat}% ${primaryLight}%`);
    root.style.setProperty('--ring', `${primaryHue} ${primarySat}% ${primaryLight}%`);
    root.style.setProperty('--background', isLight ? `${bgHue} 30% 96%` : `${bgHue} 25% 6%`);
    root.style.setProperty('--foreground', isLight ? `${bgHue} 20% 12%` : `220 20% 92%`);
    root.style.setProperty('--card', isLight ? `${cardHue} 25% 100%` : `${cardHue} 22% 9%`);
    root.style.setProperty('--card-foreground', isLight ? `${bgHue} 20% 12%` : `220 20% 92%`);
    root.style.setProperty('--popover', isLight ? `${cardHue} 25% 100%` : `${cardHue} 22% 9%`);
    root.style.setProperty('--popover-foreground', isLight ? `${bgHue} 20% 12%` : `220 20% 92%`);
    root.style.setProperty('--secondary', isLight ? `${bgHue} 22% 92%` : `230 18% 14%`);
    root.style.setProperty('--secondary-foreground', isLight ? `${bgHue} 16% 28%` : `220 15% 75%`);
    root.style.setProperty('--muted', isLight ? `${bgHue} 22% 92%` : `${bgHue} 18% 12%`);
    root.style.setProperty('--muted-foreground', isLight ? `${bgHue} 12% 42%` : `220 12% 50%`);
    root.style.setProperty('--border', isLight ? `${borderHue} 18% 84%` : `${borderHue} 18% 16%`);
    root.style.setProperty('--input', isLight ? `${borderHue} 18% 84%` : `${borderHue} 18% 16%`);
    root.style.setProperty('--sidebar-background', isLight ? `${bgHue} 30% 96%` : `${bgHue} 25% 6%`);
    root.style.setProperty('--sidebar-foreground', isLight ? `${bgHue} 20% 12%` : `220 20% 92%`);
    root.style.setProperty('--sidebar-primary', `${primaryHue} ${primarySat}% ${primaryLight}%`);
    root.style.setProperty('--sidebar-primary-foreground', isLight ? `0 0% 100%` : `0 0% 5%`);
    root.style.setProperty('--sidebar-accent', isLight ? `${bgHue} 22% 92%` : `230 18% 14%`);
    root.style.setProperty('--sidebar-accent-foreground', isLight ? `${bgHue} 20% 12%` : `220 20% 92%`);
    root.style.setProperty('--sidebar-border', isLight ? `${borderHue} 18% 84%` : `${borderHue} 18% 16%`);
  }, [colorMode, primaryHue, bgHue, cardHue, borderHue, primarySat, primaryLight]);

  const reloadCustomThemes = useCallback(async () => {
    if (!base44?.entities?.CustomThemeSetting?.list) {
      setCustomThemes([]);
      return;
    }
    const rows = await base44.entities.CustomThemeSetting.list('-updated_date', 200).catch(() => []);
    setCustomThemes(Array.isArray(rows) ? rows.filter((item) => item?.is_active !== false) : []);
  }, []);

  useEffect(() => {
    reloadCustomThemes();
  }, [reloadCustomThemes]);

  useEffect(() => {
    const pathname = window.location.pathname;
    const globalTheme = customThemes.find((item) => item.scope_type === 'global');
    const pageTheme = customThemes.find((item) => item.scope_type === 'page' && item.scope_key === pathname);
    const componentThemes = customThemes.filter((item) => item.scope_type === 'component' && item.scope_key?.startsWith(`${pathname}::`));
    const merged = mergeThemeSettings(globalTheme, pageTheme, componentThemes);
    setThemeLayers((prev) => ({ ...prev, ...merged }));
    applyRootVariables(merged.variables || {});
  }, [customThemes]);

  // Apply UI scale
  useEffect(() => {
    document.body.style.zoom = uiScale;
  }, [uiScale]);

  // Apply background-only filter effects (brightness/contrast/saturation/blur).
  // CRITICAL: these are NOT applied to <body> anymore — that would blur every
  // foreground UI element (text, icons, cards, nav). Instead we publish them
  // as CSS vars consumed by the .eru-background-layer surfaces in Layout.
  useEffect(() => {
    const root = document.documentElement;
    const lp = lowPowerMode;
    const b = lp ? 1 : Math.min(1.4, Math.max(0.65, Number(brightness) || 1));
    const c = lp ? 1 : Math.min(1.35, Math.max(0.75, Number(contrast)   || 1));
    const s = lp ? 1 : Math.min(1.8,  Math.max(0.5,  Number(saturation) || 1));
    // Background blur permanently disabled — kept the var for compatibility
    // but it no longer participates in the filter pipeline.
    root.style.setProperty('--eru-bg-brightness', String(b));
    root.style.setProperty('--eru-bg-contrast',   String(c));
    root.style.setProperty('--eru-bg-saturation', String(s));
    root.style.setProperty('--eru-bg-blur',       '0px');
    root.style.setProperty('--eru-bg-filter', `brightness(${b}) contrast(${c}) saturate(${s})`);
    // Cleanup: if a previous version applied body.style.filter, undo it.
    if (document.body.style.filter) document.body.style.filter = '';
  }, [brightness, contrast, saturation, blurLevel, lowPowerMode]);

  // Apply glow + motion + particle CSS vars (clamped to safe ranges).
  useEffect(() => {
    const root = document.documentElement;
    const g = Math.min(2, Math.max(0, Number(glowIntensity) || 0));
    const m = Math.min(2, Math.max(0, Number(motionIntensity) || 0));
    const p = Math.min(2, Math.max(0, Number(particleDensity) || 0));
    const a = Math.min(2.5, Math.max(0, Number(animSpeed) || 0));
    root.style.setProperty('--glow-intensity', String(g));
    root.style.setProperty('--eru-glow-intensity', String(g));
    root.style.setProperty('--eru-glow-strength', String(0.35 * g));
    root.style.setProperty('--eru-motion-intensity', String(m));
    root.style.setProperty('--eru-particle-density', String(p));
    root.style.setProperty('--eru-anim-speed', String(a));
  }, [glowIntensity, motionIntensity, particleDensity, animSpeed]);

  // bgOpacity drives a real dimmer overlay (--eru-bg-dim) AND the surface
  // density bucket. Higher opacity = brighter background = lower dim.
  useEffect(() => {
    const root = document.documentElement;
    const op = Math.min(1, Math.max(0.15, Number(bgOpacity) || 0.4));
    root.style.setProperty('--eru-bg-opacity', String(op));
    // Dimmer overlay: 0 (no dim) at op=1, up to 0.85 at op=0.15.
    const dim = Math.min(0.85, Math.max(0, (1 - op) * 0.85));
    root.style.setProperty('--eru-bg-dim', String(dim));
    const bucket = op <= 0.3 ? 'subtle' : op >= 0.6 ? 'intense' : 'medium';
    document.body.setAttribute('data-bg-density', bucket);
  }, [bgOpacity]);

  // Publish per-component skin styles as CSS custom properties on :root so
  // any component can opt in with a single utility class without importing
  // hooks. The SkinPicker writes componentBackgrounds entries on the active
  // CustomThemeSetting; we mirror them as `--eru-skin-<scope>-bg-image` /
  // `--eru-skin-<scope>-bg-color`. Index.css defines the consumer classes
  // (eru-skin-nav-floating, eru-skin-ticker-bar, etc.) that read these vars.
  useEffect(() => {
    const root = document.documentElement;
    const componentSkins = themeLayers.componentBackgrounds || {};
    // Clear any previously published skin vars before re-applying — avoids
    // stale skins lingering after the user removes a component override.
    const stalePrefix = '--eru-skin-';
    for (const sty of Array.from(root.style)) {
      if (sty.startsWith(stalePrefix)) root.style.removeProperty(sty);
    }
    for (const [scopeKey, styles] of Object.entries(componentSkins)) {
      if (!styles || typeof styles !== 'object') continue;
      const cssKey = scopeKey.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
      if (styles.backgroundImage) root.style.setProperty(`--eru-skin-${cssKey}-bg-image`, styles.backgroundImage);
      if (styles.background) root.style.setProperty(`--eru-skin-${cssKey}-bg`, styles.background);
      if (styles.backgroundColor) root.style.setProperty(`--eru-skin-${cssKey}-bg-color`, styles.backgroundColor);
      if (styles.backgroundSize) root.style.setProperty(`--eru-skin-${cssKey}-bg-size`, styles.backgroundSize);
      if (styles.backgroundPosition) root.style.setProperty(`--eru-skin-${cssKey}-bg-position`, styles.backgroundPosition);
    }
  }, [themeLayers.componentBackgrounds]);

  const setUiScale = (val) => { setUiScaleRaw(val); save('uiScale', val); };
  const setColorMode = (mode) => { setColorModeRaw(mode); save('colorMode', mode); };
  const toggleColorMode = () => setColorMode(colorMode === 'dark' ? 'light' : 'dark');

  const resetAll = () => {
    Object.entries(DEFAULTS).forEach(([k, v]) => save(k, v));
    setColorModeRaw(DEFAULTS.colorMode);
    setBgRaw(DEFAULTS.bg);
    setBgOpacity(DEFAULTS.bgOpacity);
    setMotionInt(DEFAULTS.motionIntensity);
    setGlowInt(DEFAULTS.glowIntensity);
    setBlurLevel(DEFAULTS.blurLevel);
    setParticleDen(DEFAULTS.particleDensity);
    setAnimSpeed(DEFAULTS.animSpeed);
    setBrightness(DEFAULTS.brightness);
    setContrast(DEFAULTS.contrast);
    setSaturation(DEFAULTS.saturation);
    setTypography(DEFAULTS.typography);
    setLowPower(DEFAULTS.lowPowerMode);
    setUiScaleRaw(DEFAULTS.uiScale);
    setPrimaryHue(DEFAULTS.primaryHue);
    setBgHue(DEFAULTS.bgHue);
    setCardHue(DEFAULTS.cardHue);
    setBorderHue(DEFAULTS.borderHue);
    setPrimarySat(DEFAULTS.primarySat);
    setPrimaryLight(DEFAULTS.primaryLight);
  };

  const getPageThemeStyles = (pathname) => {
    const globalTheme = customThemes.find((item) => item.scope_type === 'global');
    const pageTheme = customThemes.find((item) => item.scope_type === 'page' && item.scope_key === pathname);
    const componentThemes = customThemes.filter((item) => item.scope_type === 'component' && item.scope_key?.startsWith(`${pathname}::`));
    return mergeThemeSettings(globalTheme, pageTheme, componentThemes);
  };

  const getThemeRecord = (scopeType, scopeKey = '') => customThemes.find((item) => item.scope_type === scopeType && (scopeType !== 'page' ? (item.scope_key || '') === (scopeKey || '') : item.scope_key === scopeKey));

  const getScopedComponentStyles = (scopeKey) => themeLayers.componentBackgrounds?.[scopeKey] || {};

  const pageThemeMap = customThemes
    .filter((item) => item.scope_type === 'page' && item.scope_key)
    .reduce((acc, item) => {
      const merged = mergeThemeSettings(customThemes.find((theme) => theme.scope_type === 'global'), item);
      acc[item.scope_key] = {
        ...(merged.variables || {}),
        ...(merged.pageBackground || {}),
      };
      return acc;
    }, {});

  const value = {
    colorMode, setColorMode, toggleColorMode,
    // background
    bg, setBg, bgOpacity, setBgOpacity: setter('bgOpacity', setBgOpacity),
    // motion
    motionIntensity, setMotionIntensity: setter('motionIntensity', setMotionInt),
    // glow/blur
    glowIntensity, setGlowIntensity: setter('glowIntensity', setGlowInt),
    blurLevel, setBlurLevel: setter('blurLevel', setBlurLevel),
    // particles
    particleDensity, setParticleDensity: setter('particleDensity', setParticleDen),
    // animation
    animSpeed, setAnimSpeed: setter('animSpeed', setAnimSpeed),
    // display
    brightness, setBrightness: setter('brightness', setBrightness),
    contrast, setContrast: setter('contrast', setContrast),
    saturation, setSaturation: setter('saturation', setSaturation),
    // typography
    typography, setTypography: setter('typography', setTypography),
    // low power
    lowPowerMode, setLowPowerMode: setter('lowPowerMode', setLowPower),
    // lock system
    lockedSettings, setLockedSettings: setter('lockedSettings', setLocked),
    isLocked,
    // utils
    resetAll,
    // color wheel
    primaryHue, updatePrimaryHue,
    bgHue, updateBgHue,
    cardHue, updateCardHue,
    borderHue, updateBorderHue,
    primarySat, updatePrimarySat,
    primaryLight, updatePrimaryLight,
    customThemes,
    reloadCustomThemes,
    getPageThemeStyles,
    pageThemeStyles: themeLayers.pageBackground || {},
    globalThemeStyles: themeLayers.globalBackground || {},
    componentThemeStyles: themeLayers.componentBackgrounds || {},
    pageThemeMap,
    getThemeRecord,
    getScopedComponentStyles,
    // legacy compat
    uiScale, setUiScale,
    themes: {}, theme: 'custom', setTheme: () => {},
  };

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export const useTheme = () => useContext(ThemeCtx);