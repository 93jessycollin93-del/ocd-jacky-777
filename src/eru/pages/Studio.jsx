import { useState } from 'react';
import { Palette, Monitor, Layers, Save, Check, Sparkles, Grid, Columns, LayoutGrid } from 'lucide-react';

const THEMES = [
  { id: 'cyber', name: 'Cyber Green', primary: '160 100% 45%', background: '230 25% 6%', card: '230 22% 9%', preview: ['#00e676', '#0d1117', '#161b22'] },
  { id: 'aurora', name: 'Aurora', primary: '280 100% 65%', background: '250 30% 5%', card: '250 25% 8%', preview: ['#b44dff', '#0b0a14', '#13111f'] },
  { id: 'solar', name: 'Solar Flare', primary: '35 100% 55%', background: '220 20% 6%', card: '220 18% 9%', preview: ['#ff9800', '#0e1117', '#161c23'] },
  { id: 'ocean', name: 'Deep Ocean', primary: '210 100% 55%', background: '220 35% 5%', card: '220 30% 8%', preview: ['#2196f3', '#090f1a', '#0f1827'] },
  { id: 'crimson', name: 'Crimson', primary: '350 100% 60%', background: '230 25% 5%', card: '230 20% 8%', preview: ['#ff5252', '#0d0f14', '#14161c'] },
  { id: 'gold', name: 'Gold Rush', primary: '45 100% 55%', background: '30 20% 5%', card: '30 15% 8%', preview: ['#ffd700', '#130f0a', '#1c1710'] },
];

const BACKGROUNDS = [
  { id: 'none', name: 'Minimal', css: '' },
  { id: 'matrix', name: 'Matrix Rain', css: 'matrix' },
  { id: 'nebula', name: 'Nebula', css: 'nebula' },
  { id: 'grid', name: 'Grid Pulse', css: 'gridpulse' },
  { id: 'particles', name: 'Particles', css: 'particles' },
  { id: 'aurora_bg', name: 'Aurora Waves', css: 'aurora_bg' },
];

const LAYOUTS = [
  { id: 'compact', name: 'Compact', icon: Grid },
  { id: 'comfortable', name: 'Comfortable', icon: LayoutGrid },
  { id: 'spacious', name: 'Spacious', icon: Columns },
];

const FONT_SIZES = ['Small', 'Medium', 'Large'];

export default function Studio() {
  const [activeTab, setActiveTab] = useState('themes');
  const [selectedTheme, setSelectedTheme] = useState('cyber');
  const [selectedBg, setSelectedBg] = useState('none');
  const [selectedLayout, setSelectedLayout] = useState('comfortable');
  const [fontSize, setFontSize] = useState('Medium');
  const [saved, setSaved] = useState(false);
  const [layers, setLayers] = useState([
    { id: 1, name: 'Background Layer', opacity: 80, visible: true },
    { id: 2, name: 'Accent Overlay', opacity: 30, visible: true },
    { id: 3, name: 'Content Layer', opacity: 100, visible: true },
  ]);

  const TABS = [
    { id: 'themes', label: 'Themes', icon: Palette },
    { id: 'backgrounds', label: 'Backgrounds', icon: Monitor },
    { id: 'layers', label: 'Layers', icon: Layers },
    { id: 'layout', label: 'Layout', icon: Grid },
  ];

  const handleSave = async () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggleLayer = (id) => setLayers(prev => prev.map(l => l.id === id ? { ...l, visible: !l.visible } : l));
  const setLayerOpacity = (id, val) => setLayers(prev => prev.map(l => l.id === id ? { ...l, opacity: Number(val) } : l));

  return (
    <div className="flex flex-col min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur z-10">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /> Studio</h2>
          <p className="text-xs text-muted-foreground">Your personal workspace</p>
        </div>
        <button onClick={handleSave} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold transition-all ${saved ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-primary text-primary-foreground'}`}>
          {saved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
          {saved ? 'Saved!' : 'Save'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium whitespace-nowrap transition-colors ${activeTab === id ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}>
            <Icon className="w-3.5 h-3.5" />{label}
          </button>
        ))}
      </div>

      <div className="px-4 py-4 space-y-4">

        {/* THEMES */}
        {activeTab === 'themes' && (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">Choose a color theme. Changes are applied globally across your workspace.</p>
            <div className="grid grid-cols-2 gap-3">
              {THEMES.map(theme => (
                <button key={theme.id} onClick={() => setSelectedTheme(theme.id)}
                  className={`relative bg-card border rounded-xl p-3 text-left transition-all ${selectedTheme === theme.id ? 'border-primary ring-1 ring-primary/50' : 'border-border'}`}>
                  {selectedTheme === theme.id && (
                    <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-primary-foreground" />
                    </div>
                  )}
                  <div className="flex gap-1.5 mb-2">
                    {theme.preview.map((c, i) => (
                      <div key={i} className="h-4 rounded-sm flex-1" style={{ background: c }} />
                    ))}
                  </div>
                  <p className="text-xs font-medium">{theme.name}</p>
                </button>
              ))}
            </div>

            {/* Accent Color Customizer */}
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-sm font-medium mb-3">Custom Accent Color</p>
              <div className="flex gap-2 flex-wrap">
                {['#00e676','#7c4dff','#ff5252','#ffeb3b','#2196f3','#ff9800','#e91e63','#00bcd4','#8bc34a'].map(c => (
                  <button key={c} className="w-8 h-8 rounded-full border-2 border-transparent hover:border-white/30 transition-all" style={{ background: c }} />
                ))}
              </div>
            </div>

            {/* Font Size */}
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-sm font-medium mb-3">Font Size</p>
              <div className="flex gap-2">
                {FONT_SIZES.map(s => (
                  <button key={s} onClick={() => setFontSize(s)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${fontSize === s ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* BACKGROUNDS */}
        {activeTab === 'backgrounds' && (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">Animated backgrounds add depth and personality to your workspace.</p>
            <div className="grid grid-cols-2 gap-3">
              {BACKGROUNDS.map(bg => (
                <button key={bg.id} onClick={() => setSelectedBg(bg.id)}
                  className={`relative h-24 bg-card border rounded-xl overflow-hidden transition-all ${selectedBg === bg.id ? 'border-primary ring-1 ring-primary/50' : 'border-border'}`}>
                  {/* Background Preview */}
                  <div className={`absolute inset-0 ${
                    bg.id === 'matrix' ? 'bg-gradient-to-br from-green-950 via-black to-green-950' :
                    bg.id === 'nebula' ? 'bg-gradient-to-br from-purple-950 via-blue-950 to-pink-950' :
                    bg.id === 'gridpulse' ? 'bg-[radial-gradient(ellipse_at_center,_#003322_0%,_#000_100%)]' :
                    bg.id === 'particles' ? 'bg-gradient-to-br from-slate-900 to-slate-950' :
                    bg.id === 'aurora_bg' ? 'bg-gradient-to-br from-teal-950 via-purple-950 to-blue-950' :
                    'bg-background'
                  }`} />
                  <div className="absolute inset-0 flex items-end p-2">
                    <span className="text-xs font-medium text-white/80 bg-black/40 px-2 py-0.5 rounded-md">{bg.name}</span>
                  </div>
                  {selectedBg === bg.id && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-3 h-3 text-primary-foreground" />
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Intensity */}
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex justify-between mb-2">
                <p className="text-sm font-medium">Animation Intensity</p>
                <span className="text-xs text-primary">70%</span>
              </div>
              <input type="range" min="0" max="100" defaultValue="70" className="w-full accent-primary" />
            </div>
          </div>
        )}

        {/* LAYERS */}
        {activeTab === 'layers' && (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">Control visual layers in your workspace. Adjust opacity and visibility to build depth.</p>
            <div className="space-y-3">
              {layers.map((layer) => (
                <div key={layer.id} className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium">{layer.name}</span>
                    <button onClick={() => toggleLayer(layer.id)}
                      className={`w-10 h-5 rounded-full transition-all relative ${layer.visible ? 'bg-primary' : 'bg-secondary'}`}>
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${layer.visible ? 'right-0.5' : 'left-0.5'}`} />
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-16">Opacity</span>
                    <input type="range" min="0" max="100" value={layer.opacity}
                      onChange={e => setLayerOpacity(layer.id, e.target.value)}
                      className="flex-1 accent-primary" />
                    <span className="text-xs text-primary w-8 text-right">{layer.opacity}%</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Layer */}
            <button className="w-full py-3 border border-dashed border-border rounded-xl text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors">
              + Add Custom Layer
            </button>
          </div>
        )}

        {/* LAYOUT */}
        {activeTab === 'layout' && (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">Customize how content is arranged in your workspace.</p>

            <div className="space-y-2">
              <p className="text-sm font-medium">Layout Density</p>
              <div className="grid grid-cols-3 gap-2">
                {LAYOUTS.map(({ id, name, icon: Icon }) => (
                  <button key={id} onClick={() => setSelectedLayout(id)}
                    className={`flex flex-col items-center gap-2 py-4 rounded-xl border transition-all ${selectedLayout === id ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-muted-foreground'}`}>
                    <Icon className="w-5 h-5" />
                    <span className="text-xs font-medium">{name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Workstation Widgets */}
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <p className="text-sm font-medium">Dashboard Widgets</p>
              {['Portfolio Summary', 'Market Ticker', 'Quick Actions', 'Learning Progress', 'Recent Messages', 'Thinkers Feed'].map(widget => (
                <div key={widget} className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{widget}</span>
                  <button className="w-8 h-4 rounded-full bg-primary relative">
                    <span className="absolute right-0.5 top-0.5 w-3 h-3 rounded-full bg-white" />
                  </button>
                </div>
              ))}
            </div>

            {/* Panel Sizes */}
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <p className="text-sm font-medium">Panel Sizing</p>
              {['Card Padding', 'Border Radius', 'Shadow Depth'].map(prop => (
                <div key={prop} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-24 flex-shrink-0">{prop}</span>
                  <input type="range" min="0" max="100" defaultValue="60" className="flex-1 accent-primary" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}