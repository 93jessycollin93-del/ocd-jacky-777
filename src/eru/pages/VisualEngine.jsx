import { useState } from 'react';
import { Palette, Layers, Zap, Sliders, Lock, Unlock, RotateCcw, CheckCircle2, Battery, Sparkles, LayoutDashboard, LayoutTemplate, Brush, PanelsTopLeft } from 'lucide-react';
import { useTheme, BG_ENVS, TYPOGRAPHY_PACKS } from '../context/ThemeContext';
import PageTemplateLibrary from '../components/theme/PageTemplateLibrary';
import AdvancedThemeStudio from '../components/theme/AdvancedThemeStudio';
import SkinPicker from '../components/theme/SkinPicker';

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const THEME_CATS = {
  cyber:'Cyber', neon:'Neon', jade:'Jade', gold:'Gold', void:'Void',
  organic:'Organic', energy:'Energy', mythic:'Mythic', cool:'Cool',
  warm:'Warm', minimal:'Minimal',
};
const BG_CATS = { off:'Off', digital:'Digital', space:'Space', nature:'Nature', energy:'Energy', mythic:'Mythic', still:'Astronomical', wildlife:'Wildlife', scenery:'Scenery' };

function ColorWheel({ colors, size = 44 }) {
  const r = size / 2;
  const segments = colors.length;
  const slices = segments < 2 ? [...colors, ...colors, ...colors] : colors;
  const count = slices.length;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
      {slices.map((color, i) => {
        const startAngle = (i / count) * 2 * Math.PI - Math.PI / 2;
        const endAngle = ((i + 1) / count) * 2 * Math.PI - Math.PI / 2;
        const x1 = r + r * 0.92 * Math.cos(startAngle);
        const y1 = r + r * 0.92 * Math.sin(startAngle);
        const x2 = r + r * 0.92 * Math.cos(endAngle);
        const y2 = r + r * 0.92 * Math.sin(endAngle);
        const largeArc = (endAngle - startAngle) > Math.PI ? 1 : 0;
        return (
          <path key={i}
            d={`M ${r} ${r} L ${x1} ${y1} A ${r * 0.92} ${r * 0.92} 0 ${largeArc} 1 ${x2} ${y2} Z`}
            fill={color}
            stroke="rgba(0,0,0,0.15)"
            strokeWidth="0.5"
          />
        );
      })}
      <circle cx={r} cy={r} r={r * 0.3} fill="rgba(0,0,0,0.4)" />
    </svg>
  );
}

function SliderRow({ label, value = 0, min=0, max=2, step=0.05, onChange = () => {}, locked = false, suffix='' }) {
  const safeValue = Number.isFinite(value) ? value : min;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <div className="flex items-center gap-1.5">
          {locked && <Lock className="w-3 h-3 text-muted-foreground/50" />}
          <span className="text-xs font-mono text-foreground">{safeValue.toFixed(2)}{suffix}</span>
        </div>
      </div>
      <input type="range" min={min} max={max} step={step} value={safeValue}
        onChange={e => !locked && onChange(parseFloat(e.target.value))}
        disabled={locked}
        className="w-full accent-primary h-1.5 rounded-full disabled:opacity-40"
      />
    </div>
  );
}

function SectionHeader({ icon: Icon, label, sub }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="w-4 h-4 text-primary" />
      <div>
        <p className="text-sm font-semibold">{label}</p>
        {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

// ─── TAB: THEMES (Color Wheel) ───────────────────────────────────────────────
// Quick palettes — the first six are Eru's "Cyberpunk Neon" set, derived
// from the reference images: holographic goddess / cyber geisha / neon
// skyline / crimson dystopia / masked sovereigns. Pick one and the whole
// app tints to match. The legacy palettes (Cyber Green … Arctic) remain
// below for users who prefer them.
const QUICK_PALETTES = [
  { label: 'Neon Oracle',     primaryHue: 305, bgHue: 268, cardHue: 268, borderHue: 280, primarySat: 100, primaryLight: 62, foundation: true },
  { label: 'Cyber Geisha',    primaryHue: 320, bgHue: 252, cardHue: 252, borderHue: 268, primarySat: 100, primaryLight: 70 },
  { label: 'Synth City',      primaryHue: 285, bgHue: 260, cardHue: 260, borderHue: 275, primarySat: 90,  primaryLight: 60 },
  { label: 'Crimson Veil',    primaryHue: 340, bgHue: 350, cardHue: 355, borderHue: 350, primarySat: 95,  primaryLight: 58 },
  { label: 'Eru Sovereign',   primaryHue: 295, bgHue: 262, cardHue: 264, borderHue: 278, primarySat: 100, primaryLight: 58 },
  { label: 'Hologram Cyan',   primaryHue: 192, bgHue: 270, cardHue: 270, borderHue: 285, primarySat: 100, primaryLight: 64 },
  // Legacy palettes (kept):
  { label: 'Cyber Green',     primaryHue: 160, bgHue: 230, cardHue: 230, borderHue: 230, primarySat: 100, primaryLight: 45 },
  { label: 'Neon Blue',       primaryHue: 200, bgHue: 225, cardHue: 225, borderHue: 225, primarySat: 100, primaryLight: 55 },
  { label: 'Solar Gold',      primaryHue: 45,  bgHue: 20,  cardHue: 20,  borderHue: 20,  primarySat: 100, primaryLight: 55 },
  { label: 'Plasma',          primaryHue: 290, bgHue: 280, cardHue: 280, borderHue: 280, primarySat: 100, primaryLight: 70 },
  { label: 'Ember Red',       primaryHue: 350, bgHue: 10,  cardHue: 10,  borderHue: 10,  primarySat: 100, primaryLight: 60 },
  { label: 'Arctic',          primaryHue: 195, bgHue: 210, cardHue: 210, borderHue: 210, primarySat: 80,  primaryLight: 65 },
];

function HueRing({ hue, sat = 100, light = 50, size = 36 }) {
  const segments = 36;
  const r = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {Array.from({ length: segments }, (_, i) => {
        const h = (i / segments) * 360;
        const a1 = (i / segments) * 2 * Math.PI - Math.PI / 2;
        const a2 = ((i + 1) / segments) * 2 * Math.PI - Math.PI / 2;
        const x1 = r + r * 0.9 * Math.cos(a1), y1 = r + r * 0.9 * Math.sin(a1);
        const x2 = r + r * 0.9 * Math.cos(a2), y2 = r + r * 0.9 * Math.sin(a2);
        return <path key={i} d={`M ${r} ${r} L ${x1} ${y1} A ${r*0.9} ${r*0.9} 0 0 1 ${x2} ${y2} Z`} fill={`hsl(${h},${sat}%,${light}%)`} />;
      })}
      <circle cx={r} cy={r} r={r * 0.45} fill="hsl(var(--card))" />
      {/* Indicator */}
      <circle
        cx={r + r * 0.67 * Math.cos((hue / 360) * 2 * Math.PI - Math.PI / 2)}
        cy={r + r * 0.67 * Math.sin((hue / 360) * 2 * Math.PI - Math.PI / 2)}
        r={3} fill="white" stroke="rgba(0,0,0,0.5)" strokeWidth={1}
      />
    </svg>
  );
}

function ThemesTab() {
  const theme = useTheme() || {};
  const { primaryHue = 160, updatePrimaryHue = () => {}, bgHue = 230, updateBgHue = () => {},
    cardHue = 230, updateCardHue = () => {}, borderHue = 230, updateBorderHue = () => {},
    primarySat = 100, updatePrimarySat = () => {}, primaryLight = 45, updatePrimaryLight = () => {} } = theme;

  const applyPalette = (p) => {
    updatePrimaryHue(p.primaryHue); updateBgHue(p.bgHue); updateCardHue(p.cardHue);
    updateBorderHue(p.borderHue); updatePrimarySat(p.primarySat); updatePrimaryLight(p.primaryLight);
  };

  const layers = [
    { label: 'Accent / Primary', hue: primaryHue, onChange: updatePrimaryHue, color: `hsl(${primaryHue},${primarySat}%,${primaryLight}%)` },
    { label: 'Background',       hue: bgHue,      onChange: updateBgHue,      color: `hsl(${bgHue},25%,6%)` },
    { label: 'Card Surface',     hue: cardHue,    onChange: updateCardHue,    color: `hsl(${cardHue},22%,9%)` },
    { label: 'Borders',          hue: borderHue,  onChange: updateBorderHue,  color: `hsl(${borderHue},18%,16%)` },
  ];

  return (
    <div className="space-y-4">
      <SectionHeader icon={Palette} label="Color Palette" sub="Hue-based color wheel for each app layer" />

      {/* Quick palettes — foundation palettes get a dual-tone glow ring. */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {QUICK_PALETTES.map(p => (
          <button key={p.label} onClick={() => applyPalette(p)}
            className={`flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${p.foundation ? 'eru-neon-foundation-card bg-gradient-to-br from-fuchsia-500/15 via-violet-500/10 to-cyan-500/10 border border-fuchsia-400/40 hover:border-fuchsia-300/70' : 'bg-card border border-border hover:border-primary/40'}`}>
            <div className="w-6 h-6 rounded-full border border-border/50" style={{ background: `hsl(${p.primaryHue},${p.primarySat}%,${p.primaryLight}%)`, boxShadow: p.foundation ? `0 0 10px hsl(${p.primaryHue} 100% 65% / 0.7), 0 0 20px hsl(192 100% 60% / 0.35)` : 'none' }} />
            <span className={`text-[9px] whitespace-nowrap ${p.foundation ? 'text-fuchsia-300 font-semibold' : 'text-muted-foreground'}`}>{p.label}</span>
          </button>
        ))}
      </div>

      {/* Per-layer hue wheels */}
      <div className="space-y-4">
        {layers.map(({ label, hue, onChange, color }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-3">
              <HueRing hue={hue} size={42} />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">{label}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full border border-border" style={{ background: color }} />
                    <span className="text-[10px] font-mono text-muted-foreground">{Math.round(hue)}°</span>
                  </div>
                </div>
                <input type="range" min={0} max={359} step={1} value={hue}
                  onChange={e => onChange(parseInt(e.target.value))}
                  className="w-full mt-1.5 h-2 rounded-full cursor-pointer"
                  style={{ accentColor: color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Primary sat/light fine-tune */}
      <div className="bg-card border border-border rounded-xl p-3 space-y-2">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Accent Fine-tune</p>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground w-16">Saturation</span>
            <input type="range" min={0} max={100} step={1} value={primarySat}
              onChange={e => updatePrimarySat(parseInt(e.target.value))}
              className="flex-1 h-1.5 rounded-full accent-primary" />
            <span className="text-[10px] font-mono w-8 text-right">{primarySat}%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground w-16">Lightness</span>
            <input type="range" min={20} max={80} step={1} value={primaryLight}
              onChange={e => updatePrimaryLight(parseInt(e.target.value))}
              className="flex-1 h-1.5 rounded-full accent-primary" />
            <span className="text-[10px] font-mono w-8 text-right">{primaryLight}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── TAB: BACKGROUNDS ────────────────────────────────────────────────────────
function BackgroundsTab() {
  const theme = useTheme() || {};
  const {
    bg = 'none',
    setBg = () => {},
    bgOpacity = 0.4,
    setBgOpacity = () => {},
    particleDensity = 1,
    setParticleDensity = () => {},
    lowPowerMode = false,
    setLowPowerMode = () => {},
    isLocked = () => false
  } = theme;
  const [preview, setPreview] = useState(null);
  const [cat, setCat] = useState('all');

  const filtered = Object.entries(BG_ENVS).filter(([, v]) => cat === 'all' || v.cat === cat);

  return (
    <div className="space-y-4">
      <SectionHeader icon={Layers} label="Animated Environments" sub="Choose the background effect layer; edit color layers in Themes" />

      <div className="flex items-center justify-between px-3 py-2 bg-secondary rounded-xl border border-border">
        <div className="flex items-center gap-2">
          <Battery className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Low Power Mode</span>
        </div>
        <button onClick={() => setLowPowerMode(!lowPowerMode)}
          className={`w-10 h-5 rounded-full transition-colors relative ${lowPowerMode ? 'bg-primary' : 'bg-secondary border border-border'}`}>
          <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${lowPowerMode ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
      </div>

      {/* Category filter */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <button onClick={() => setCat('all')} className={`px-2.5 py-1 rounded-lg text-[10px] font-medium whitespace-nowrap ${cat==='all'?'bg-primary text-primary-foreground':'bg-secondary text-muted-foreground'}`}>All</button>
        {Object.entries(BG_CATS).map(([k,v]) => (
          <button key={k} onClick={() => setCat(k)} className={`px-2.5 py-1 rounded-lg text-[10px] font-medium whitespace-nowrap ${cat===k?'bg-primary text-primary-foreground':'bg-secondary text-muted-foreground'}`}>{v}</button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
      {filtered.map(([key, env]) => (
        <button key={key}
          onClick={() => setBg(key)}
          className={`relative rounded-xl border overflow-hidden text-left transition-all ${bg === key ? 'border-primary ring-1 ring-primary/30' : 'border-border hover:border-primary/30'}`}
          style={env.url ? { backgroundImage: `url(${env.url})`, backgroundSize: 'cover', backgroundPosition: 'center', minHeight: 72 } : {}}>
          {env.url && <div className="absolute inset-0 bg-black/40" />}
          <div className={`relative p-3 ${env.url ? 'text-white' : ''}`}>
            {bg === key && <CheckCircle2 className="absolute top-0 right-0 w-3.5 h-3.5 text-primary" />}
            {!env.url && (
              <div className="w-6 h-6 rounded-lg bg-black/40 border border-border flex items-center justify-center mb-2">
                <span className="text-[10px]">
                  {env.cat === 'digital' ? '⬡' : env.cat === 'space' ? '✦' : env.cat === 'nature' ? '◈' : env.cat === 'energy' ? '⚡' : env.cat === 'mythic' ? '⟡' : '○'}
                </span>
              </div>
            )}
            <p className="text-[11px] font-semibold mt-6">{env.label}</p>
            <p className="text-[9px] opacity-70 capitalize">{env.cat}</p>
          </div>
        </button>
      ))}
      </div>

      <div className="space-y-3 p-3 bg-card rounded-xl border border-border">
        <div className="space-y-1">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Background Layers</p>
          <p className="text-xs text-muted-foreground">These only affect the background art — foreground UI stays crisp.</p>
        </div>
        <SliderRow label="Background Opacity / Dimmer" value={bgOpacity} min={0.15} max={1} step={0.05} onChange={setBgOpacity} />
        <SliderRow label="Particle Density" value={particleDensity} min={0.1} max={2} step={0.1} onChange={setParticleDensity} />
      </div>
    </div>
  );
}

// ─── TAB: MOTION ─────────────────────────────────────────────────────────────
function MotionTab() {
  const {
    motionIntensity = 1,
    setMotionIntensity = () => {},
    animSpeed = 1,
    setAnimSpeed = () => {},
    glowIntensity = 1,
    setGlowIntensity = () => {},
    blurLevel = 1,
    setBlurLevel = () => {},
    isLocked = () => false,
  } = useTheme() || {};
  return (
    <div className="space-y-4">
      <SectionHeader icon={Zap} label="Motion & Interaction" sub="Global animation rules and feedback" />

      <div className="space-y-3 p-3 bg-card rounded-xl border border-border">
        <SliderRow label="Motion Intensity" value={motionIntensity} min={0} max={2} onChange={setMotionIntensity} locked={isLocked('motionIntensity')} />
        <SliderRow label="Animation Speed" value={animSpeed} min={0} max={2.5} onChange={setAnimSpeed} locked={isLocked('animSpeed')} />
        <SliderRow label="Glow Intensity" value={glowIntensity} min={0} max={2} onChange={setGlowIntensity} locked={isLocked('glowIntensity')} />
        <SliderRow label="Background Blur (art only)" value={blurLevel} min={1} max={3} step={0.1} onChange={setBlurLevel} locked={isLocked('blurLevel')} />
        <p className="text-[10px] text-muted-foreground/70">Blur affects only background art. Foreground UI is never blurred.</p>
      </div>

      {/* Motion language presets */}
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">Micro-Interaction Style</p>
        {[
          { id:'ripple', label:'Ripple', desc:'Click creates expanding ring' },
          { id:'pulse', label:'Pulse', desc:'Elements breathe on hover' },
          { id:'glow', label:'Glow', desc:'Neon glow on interaction' },
          { id:'bounce', label:'Bounce', desc:'Springy element response' },
        ].map(m => (
          <div key={m.id} className="flex items-center justify-between px-3 py-2.5 bg-card border border-border rounded-xl">
            <div>
              <p className="text-sm">{m.label}</p>
              <p className="text-[10px] text-muted-foreground">{m.desc}</p>
            </div>
            <span className="text-[10px] text-muted-foreground/50 italic">Global</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── TAB: LAYOUT ─────────────────────────────────────────────────────────────
const DASH_WIDGETS = [
  { id: 'portfolio', label: 'Portfolio Summary', color: '#00e676' },
  { id: 'markets',   label: 'Live Markets',      color: '#2196f3' },
  { id: 'ideas',     label: 'My Ideas',          color: '#7c4dff' },
  { id: 'thinkers',  label: 'Thinkers Club',     color: '#ff9800' },
  { id: 'nfts',      label: 'NFT Gallery',       color: '#e91e63' },
  { id: 'ads',       label: 'My Ads',            color: '#ffeb3b' },
];

function LayoutTab() {
  const { uiScale = 1, setUiScale = () => {} } = useTheme() || {};
  const [activeWidgets, setActiveWidgets] = useState(['portfolio', 'markets', 'ideas']);

  const pct = Math.round(uiScale * 100);
  const label = pct < 90 ? 'Compact' : pct > 110 ? 'Large' : 'Default';

  return (
    <div className="space-y-5">
      <SectionHeader icon={LayoutDashboard} label="Layout & Scale" sub="UI zoom and dashboard widget visibility" />

      {/* Scale control */}
      <div className="p-4 bg-card border border-border rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-muted-foreground">UI Scale</p>
          <div className="flex items-center gap-2">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">{label}</span>
            <span className="text-xs font-mono text-foreground">{pct}%</span>
          </div>
        </div>

        {/* Quick presets */}
        <div className="grid grid-cols-4 gap-1.5">
          {[{ v: 0.85, l: '85%' }, { v: 1, l: '100%' }, { v: 1.1, l: '110%' }, { v: 1.2, l: '120%' }].map(({ v, l }) => (
            <button key={v} onClick={() => setUiScale(v)}
              className={`py-1.5 rounded-lg text-xs font-medium border transition-all ${Math.abs(uiScale - v) < 0.01 ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary border-border text-muted-foreground hover:border-primary/40'}`}>
              {l}
            </button>
          ))}
        </div>

        <input type="range" min="0.75" max="1.3" step="0.01" value={uiScale}
          onChange={e => setUiScale(parseFloat(e.target.value))}
          className="w-full accent-primary h-2 rounded-full" />

        <div className="flex justify-between text-[9px] text-muted-foreground">
          <span>75% — Compact</span>
          <span>100% — Default</span>
          <span>130% — Large</span>
        </div>

        <button onClick={() => setUiScale(1)}
          className="w-full py-2 bg-secondary border border-border rounded-xl text-xs text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all">
          Reset to 100%
        </button>
      </div>

      {/* Widgets */}
      <div className="space-y-2">
        <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Dashboard Widgets</p>
        {DASH_WIDGETS.map(w => (
          <div key={w.id} className="flex items-center justify-between bg-card border border-border rounded-xl px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: w.color }} />
              <span className="text-sm">{w.label}</span>
            </div>
            <button onClick={() => setActiveWidgets(prev => prev.includes(w.id) ? prev.filter(x => x !== w.id) : [...prev, w.id])}
              className={`w-10 h-5 rounded-full transition-colors relative ${activeWidgets.includes(w.id) ? 'bg-primary' : 'bg-secondary border border-border'}`}>
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${activeWidgets.includes(w.id) ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── TAB: DISPLAY ────────────────────────────────────────────────────────────
function DisplayTab() {
  const {
    brightness = 1,
    setBrightness = () => {},
    contrast = 1,
    setContrast = () => {},
    saturation = 1,
    setSaturation = () => {},
    typography = 'modern',
    setTypography = () => {},
    isLocked = () => false,
  } = useTheme() || {};

  return (
    <div className="space-y-4">
      <SectionHeader icon={Sliders} label="Display & Typography" sub="Color grading and font system" />

      <div className="space-y-3 p-3 bg-card rounded-xl border border-border">
        <SliderRow label="Background Brightness" value={brightness} min={0.65} max={1.4} onChange={setBrightness} locked={isLocked('brightness')} />
        <SliderRow label="Background Contrast"   value={contrast}   min={0.75} max={1.35} onChange={setContrast}   locked={isLocked('contrast')} />
        <SliderRow label="Background Saturation" value={saturation} min={0.5}  max={1.8}  onChange={setSaturation} locked={isLocked('saturation')} />
        <p className="text-[10px] text-muted-foreground/70">Color grading targets background art only — readable UI stays untouched.</p>
        <button
          onClick={() => { setBrightness(1); setContrast(1); setSaturation(1); }}
          className="w-full mt-1 py-2 text-xs rounded-lg bg-secondary border border-border text-muted-foreground hover:text-foreground"
        >
          Reset color grading
        </button>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">Typography Pack</p>
        {Object.entries(TYPOGRAPHY_PACKS).map(([key, pack]) => (
          <button key={key} onClick={() => setTypography(key)} disabled={isLocked('typography')}
            className={`w-full flex items-center justify-between px-3 py-3 rounded-xl border transition-all disabled:opacity-40 ${typography === key ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/30'}`}>
            <div>
              <p className="text-sm font-medium">{pack.label}</p>
              <p className="text-[10px] text-muted-foreground truncate">{pack.font}</p>
            </div>
            {typography === key && <CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── TAB: CONTROL ────────────────────────────────────────────────────────────
function TemplatesTab() {
  return <PageTemplateLibrary />;
}

function LayersTab() {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerScope, setPickerScope] = useState({ type: 'global' });

  const openWith = (scope) => { setPickerScope(scope); setPickerOpen(true); };

  return (
    <div className="space-y-4">
      <SectionHeader icon={Brush} label="Front Layer Skin Studio" sub="Use your own visuals as skins for app layers, pages, panels, buttons, inputs, and widgets." />

      {/* Quick-pick skin shortcuts — most common scopes one click away. */}
      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <p className="text-sm font-semibold">Apply a skin</p>
        </div>
        <p className="text-xs text-muted-foreground">Pick a background and a target — the whole app, just this page, or one specific surface (nav bar, ticker, bot widget…).</p>
        <div className="grid grid-cols-3 gap-2">
          <button onClick={() => openWith({ type: 'global' })}
            className="px-3 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold">
            Skin everywhere
          </button>
          <button onClick={() => openWith({ type: 'page' })}
            className="px-3 py-2.5 rounded-xl border border-border bg-card text-xs font-medium">
            Skin this page
          </button>
          <button onClick={() => openWith({ type: 'component', key: 'nav.floating' })}
            className="px-3 py-2.5 rounded-xl border border-border bg-card text-xs font-medium">
            Skin nav bar
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <button onClick={() => openWith({ type: 'component', key: 'ticker.bar' })}
            className="px-3 py-2 rounded-lg border border-border bg-secondary text-[11px]">
            Ticker
          </button>
          <button onClick={() => openWith({ type: 'component', key: 'widget.bot' })}
            className="px-3 py-2 rounded-lg border border-border bg-secondary text-[11px]">
            Bot widget
          </button>
          <button onClick={() => openWith({ type: 'component' })}
            className="px-3 py-2 rounded-lg border border-border bg-secondary text-[11px]">
            Other component…
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-xl border border-primary/20 bg-primary/10 p-2.5">
            <PanelsTopLeft className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Scoped inheritance</p>
            <p className="mt-1 text-xs text-muted-foreground">Global skins flow down by default. Page skins only affect that page. Layer overrides only affect the selected front layer.</p>
          </div>
        </div>
      </div>
      <AdvancedThemeStudio />

      <SkinPicker open={pickerOpen} onClose={() => setPickerOpen(false)} defaultScope={pickerScope} />
    </div>
  );
}

function ControlTab() {
  const { lockedSettings = [], setLockedSettings = () => {}, resetAll = () => {} } = useTheme() || {};
  const [showReset, setShowReset] = useState(false);

  const LOCKABLE = [
    { key: 'theme', label: 'Theme Preset' },
    { key: 'bg', label: 'Background Environment' },
    { key: 'motionIntensity', label: 'Motion Intensity' },
    { key: 'glowIntensity', label: 'Glow Intensity' },
    { key: 'blurLevel', label: 'Blur Level' },
    { key: 'animSpeed', label: 'Animation Speed' },
    { key: 'brightness', label: 'Brightness' },
    { key: 'contrast', label: 'Contrast' },
    { key: 'saturation', label: 'Saturation' },
    { key: 'typography', label: 'Typography Pack' },
  ];

  const toggle = (key) => {
    setLockedSettings(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  return (
    <div className="space-y-4">
      <SectionHeader icon={Lock} label="Lock System" sub="Restrict which settings users can adjust" />

      <div className="space-y-1">
        {LOCKABLE.map(({ key, label }) => {
          const locked = lockedSettings.includes(key);
          return (
            <button key={key} onClick={() => toggle(key)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all ${locked ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-border bg-card hover:bg-secondary'}`}>
              <span className="text-sm">{label}</span>
              {locked
                ? <Lock className="w-3.5 h-3.5 text-yellow-400" />
                : <Unlock className="w-3.5 h-3.5 text-muted-foreground" />}
            </button>
          );
        })}
      </div>

      <div className="pt-2 border-t border-border">
        {!showReset ? (
          <button onClick={() => setShowReset(true)}
            className="w-full flex items-center gap-2 px-3 py-3 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-sm">
            <RotateCcw className="w-4 h-4" /> Reset All Visual Settings
          </button>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground text-center">This will reset ALL visual settings to defaults.</p>
            <div className="flex gap-2">
              <button onClick={() => setShowReset(false)} className="flex-1 py-2.5 text-sm bg-secondary rounded-xl">Cancel</button>
              <button onClick={() => { resetAll(); setShowReset(false); }} className="flex-1 py-2.5 text-sm bg-red-500 text-white rounded-xl">Reset All</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'layers',  label: 'Layers',     Icon: Brush          },
  { id: 'themes',  label: 'Themes',     Icon: Palette        },
  { id: 'bg',      label: 'Backgrounds',Icon: Layers         },
  { id: 'motion',  label: 'Motion',     Icon: Zap            },
  { id: 'display', label: 'Display',    Icon: Sliders        },
  { id: 'layout',  label: 'Layout',     Icon: LayoutDashboard},
  { id: 'templates', label: 'Templates', Icon: LayoutTemplate },
  { id: 'control', label: 'Control',    Icon: Lock           },
];

export default function VisualEngine() {
  const [tab, setTab] = useState('layers');

  return (
    <div className="flex flex-col h-screen relative z-10" style={{ background: 'hsl(var(--background))' }}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-card/80 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Visual Engine</h2>
          <span className="ml-auto text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">LAYER STUDIO</span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">Control front-layer skins for app surfaces, pages, panels, buttons, inputs, widgets, and inherited styling.</p>
        <p className="text-[10px] text-muted-foreground/80 mt-1">Changes are saved automatically on this device.</p>
      </div>

      {/* Tab bar */}
      <div className="flex-shrink-0 overflow-x-auto border-b border-border bg-card/50">
        <div className="flex min-w-max">
          {TABS.map((tabItem) => {
            const TabIcon = tabItem.Icon;
            return (
              <button key={tabItem.id} onClick={() => setTab(tabItem.id)}
                className={`flex flex-col items-center gap-0.5 px-5 py-2.5 text-[10px] font-medium transition-colors whitespace-nowrap ${tab === tabItem.id ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                <TabIcon className="w-4 h-4" />
                {tabItem.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24">
        {tab === 'layers'  && <LayersTab />}
        {tab === 'themes'  && <ThemesTab />}
        {tab === 'bg'      && <BackgroundsTab />}
        {tab === 'motion'  && <MotionTab />}
        {tab === 'display' && <DisplayTab />}
        {tab === 'layout'  && <LayoutTab />}
        {tab === 'templates' && <TemplatesTab />}
        {tab === 'control' && <ControlTab />}
      </div>
    </div>
  );
}