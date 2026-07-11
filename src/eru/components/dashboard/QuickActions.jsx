import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpDown, ImageIcon, BarChart2, ShoppingBag, Lightbulb, Brain, Shield, Award, Send, Cpu, Wallet, Settings, GripVertical, Check, Pencil } from 'lucide-react';

const ALL_ACTIONS = [
  { label: 'Trade',    icon: ArrowUpDown, to: '/trade',        color: 'text-green-400' },
  { label: 'Markets',  icon: BarChart2,   to: '/markets',      color: 'text-blue-400' },
  { label: 'NFTs',     icon: ImageIcon,   to: '/nfts',         color: 'text-purple-400' },
  { label: 'Shop',     icon: ShoppingBag, to: '/collectables', color: 'text-yellow-400' },
  { label: 'Portfolio',icon: Wallet,      to: '/portfolio',    color: 'text-cyan-400' },
  { label: 'Creator',  icon: Lightbulb,   to: '/creator',      color: 'text-orange-400' },
  { label: 'Thinkers', icon: Brain,       to: '/thinkers',     color: 'text-pink-400' },
  { label: 'Review',   icon: Shield,      to: '/review',       color: 'text-red-400' },
  { label: 'Rank',     icon: Award,       to: '/reputation',   color: 'text-amber-400' },
  { label: 'TG Apps',  icon: Send,        to: '/tgapps',       color: 'text-sky-400' },
  { label: 'Station',  icon: Cpu,         to: '/workstation',  color: 'text-emerald-400' },
  { label: 'Settings', icon: Settings,    to: '/settings',     color: 'text-slate-400' },
];

const DEFAULT_PINNED = ['Trade', 'Markets', 'NFTs', 'Shop'];

export default function QuickActions() {
  const [pinned, setPinned] = useState(DEFAULT_PINNED);
  const [editing, setEditing] = useState(false);
  const [dragLabel, setDragLabel] = useState(null);
  const [dragOverLabel, setDragOverLabel] = useState(null);

  const pinnedActions = pinned.map(l => ALL_ACTIONS.find(a => a.label === l)).filter(Boolean);

  const toggle = (label) => {
    setPinned(prev =>
      prev.includes(label)
        ? prev.filter(l => l !== label)
        : prev.length < 4 ? [...prev, label] : [...prev.slice(1), label]
    );
  };

  const onDragStart = (label) => setDragLabel(label);
  const onDragOver = (e, label) => { e.preventDefault(); setDragOverLabel(label); };
  const onDrop = (targetLabel) => {
    if (!dragLabel || dragLabel === targetLabel) { setDragLabel(null); setDragOverLabel(null); return; }
    setPinned(prev => {
      const arr = [...prev];
      const fi = arr.indexOf(dragLabel), ti = arr.indexOf(targetLabel);
      if (fi < 0 || ti < 0) return arr;
      arr.splice(fi, 1); arr.splice(ti, 0, dragLabel);
      return arr;
    });
    setDragLabel(null); setDragOverLabel(null);
  };

  return (
    <div className="mx-4 mt-3">
      {/* Pinned row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {pinnedActions.map(a => (
          <div key={a.label}
            draggable={editing}
            onDragStart={() => onDragStart(a.label)}
            onDragOver={e => onDragOver(e, a.label)}
            onDrop={() => onDrop(a.label)}
            className={`relative transition-all ${dragOverLabel === a.label ? 'scale-105 opacity-70' : ''}`}>
            {editing ? (
              <div className="bg-card border border-primary/40 rounded-xl p-3 flex flex-col items-center gap-1.5 cursor-grab active:cursor-grabbing">
                <GripVertical className="w-3.5 h-3.5 text-muted-foreground absolute top-1 right-1" />
                <a.icon className={`w-5 h-5 ${a.color}`} />
                <span className="text-xs text-muted-foreground">{a.label}</span>
              </div>
            ) : (
              <Link to={a.to} className="bg-card border border-border rounded-xl p-3 flex flex-col items-center gap-1.5 hover:border-primary/50 transition-colors">
                <a.icon className={`w-5 h-5 ${a.color}`} />
                <span className="text-xs text-muted-foreground">{a.label}</span>
              </Link>
            )}
          </div>
        ))}
      </div>

      {/* Edit toggle */}
      <button onClick={() => setEditing(p => !p)}
        className="mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-[10px] text-muted-foreground hover:text-primary transition-colors">
        {editing ? <><Check className="w-3 h-3" /> Done</> : <><Pencil className="w-3 h-3" /> Customise</>}
      </button>

      {/* Picker when editing */}
      {editing && (
        <div className="mt-2 bg-card border border-border rounded-2xl p-3">
          <p className="text-[9px] text-muted-foreground uppercase tracking-widest mb-2">Tap to add / remove (max 4)</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {ALL_ACTIONS.map(a => {
              const active = pinned.includes(a.label);
              return (
                <button key={a.label} onClick={() => toggle(a.label)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all ${active ? 'border-primary bg-primary/10' : 'border-border bg-secondary'}`}>
                  <a.icon className={`w-4 h-4 ${a.color}`} />
                  <span className="text-[9px] text-muted-foreground">{a.label}</span>
                  {active && <div className="w-1 h-1 rounded-full bg-primary" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}