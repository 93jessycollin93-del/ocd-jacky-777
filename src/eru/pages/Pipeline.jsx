import { useState, useEffect } from 'react';
import { base44 } from '@/eru/api/base44Client';
import { useAuth } from '@/eru/lib/AuthContext';
import { Hammer, Rocket, Star, Globe, Zap, ArrowRight, Circle } from 'lucide-react';

const STAGES = [
  { id: 'build',    label: 'Build',    emoji: '🔨', icon: Hammer,  color: 'text-blue-400',   bg: 'bg-blue-400/10',   border: 'border-blue-400/30',  desc: 'Create bots, code & assets' },
  { id: 'deploy',   label: 'Deploy',   emoji: '🚀', icon: Rocket,  color: 'text-primary',    bg: 'bg-primary/10',    border: 'border-primary/30',   desc: 'Activate inside the app' },
  { id: 'showcase', label: 'Showcase', emoji: '⭐', icon: Star,    color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/30', desc: 'Publish to the community' },
];

const getStage = (item) => {
  if (item.is_public) return 'showcase';
  if (item.status === 'active') return 'deploy';
  return 'build';
};

const stageOrder = { build: 0, deploy: 1, showcase: 2 };

function StageHeader({ stage, count }) {
  const Icon = stage.icon;
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${stage.bg} border ${stage.border}`}>
      <Icon className={`w-4 h-4 ${stage.color}`} />
      <span className={`text-xs font-bold ${stage.color}`}>{stage.label}</span>
      <span className="text-xs text-muted-foreground ml-auto">{count}</span>
    </div>
  );
}

function BotCard({ bot, onAdvance, onRetract }) {
  const stage = getStage(bot);
  const stageIdx = stageOrder[stage];
  const canAdvance = stageIdx < 2;
  const canRetract = stageIdx > 0;

  const advanceLabel = stage === 'build' ? 'Deploy' : 'Showcase';
  const retractLabel = stage === 'showcase' ? 'Un-showcase' : 'Deactivate';

  return (
    <div className="bg-card border border-border rounded-xl p-3">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-lg flex-shrink-0">
          🤖
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{bot.name}</p>
          <p className="text-[10px] text-muted-foreground">{bot.description || bot.role}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          {bot.is_public
            ? <Globe className="w-3 h-3 text-yellow-400" />
            : bot.status === 'active'
            ? <Zap className="w-3 h-3 text-primary" />
            : <Circle className="w-3 h-3 text-muted-foreground" />}
        </div>
      </div>

      <div className="flex gap-1.5 mt-2.5">
        {canAdvance && (
          <button onClick={() => onAdvance(bot, stage)}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-primary text-primary-foreground rounded-lg text-[10px] font-bold">
            <Rocket className="w-3 h-3" /> {advanceLabel}
          </button>
        )}
        {canRetract && (
          <button onClick={() => onRetract(bot, stage)}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-secondary border border-border rounded-lg text-[10px] text-muted-foreground">
            {retractLabel}
          </button>
        )}
        {!canAdvance && (
          <div className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-yellow-400/10 border border-yellow-400/30 rounded-lg text-[10px] text-yellow-400 font-bold">
            <Star className="w-3 h-3" /> Live on Marketplace
          </div>
        )}
      </div>
    </div>
  );
}

function AssetCard({ asset, onAdvance }) {
  return (
    <div className="bg-card border border-border rounded-xl p-3">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-blue-400/10 border border-blue-400/20 flex items-center justify-center text-lg flex-shrink-0">
          {asset.asset_type === 'code' ? '💾' : asset.asset_type === 'visual' ? '🎨' : '📄'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{asset.title || 'Untitled'}</p>
          <p className="text-[10px] text-muted-foreground capitalize">{asset.tag} · {asset.asset_type}</p>
        </div>
        <span className="text-[9px] bg-secondary border border-border px-2 py-0.5 rounded-full text-muted-foreground">Saved</span>
      </div>
      <button onClick={() => onAdvance(asset)}
        className="w-full mt-2.5 flex items-center justify-center gap-1 py-1.5 bg-blue-400/10 border border-blue-400/30 text-blue-400 rounded-lg text-[10px] font-bold">
        <Rocket className="w-3 h-3" /> Use in App
      </button>
    </div>
  );
}

export default function Pipeline() {
  const { currentUser } = useAuth();
  const [bots, setBots] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeStage, setActiveStage] = useState(null); // null = all

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const [b, a] = await Promise.all([
      base44.entities.UserBot.list('-created_date', 50),
      base44.entities.JackieSaved.list('-created_date', 30),
    ]);
    setBots(b);
    setAssets(a);
    setLoading(false);
  };

  const advanceBot = async (bot, currentStage) => {
    if (currentStage === 'build') {
      await base44.entities.UserBot.update(bot.id, { status: 'active' });
    } else if (currentStage === 'deploy') {
      await base44.entities.UserBot.update(bot.id, { is_public: true });
    }
    load();
  };

  const retractBot = async (bot, currentStage) => {
    if (currentStage === 'showcase') {
      await base44.entities.UserBot.update(bot.id, { is_public: false });
    } else if (currentStage === 'deploy') {
      await base44.entities.UserBot.update(bot.id, { status: 'inactive' });
    }
    load();
  };

  const buildBots    = bots.filter(b => getStage(b) === 'build');
  const deployBots   = bots.filter(b => getStage(b) === 'deploy');
  const showcaseBots = bots.filter(b => getStage(b) === 'showcase');

  const stats = [
    { label: 'Built', value: bots.length + assets.length, emoji: '🔨' },
    { label: 'Deployed', value: deployBots.length + showcaseBots.length, emoji: '🚀' },
    { label: 'Showcased', value: showcaseBots.length, emoji: '⭐' },
    { label: 'Assets', value: assets.length, emoji: '💾' },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-border">
        <h1 className="text-lg font-bold">Creator Pipeline</h1>
        <div className="flex items-center gap-1.5 mt-1">
          {STAGES.map((s, i) => (
            <div key={s.id} className="flex items-center gap-1.5">
              <span className="text-xs font-semibold" style={{ color: 'inherit' }}>
                <span className={s.color}>{s.emoji} {s.label}</span>
              </span>
              {i < STAGES.length - 1 && <ArrowRight className="w-3 h-3 text-muted-foreground" />}
            </div>
          ))}
        </div>
      </div>

      {/* Stats strip */}
      <div className="flex border-b border-border">
        {stats.map(s => (
          <div key={s.label} className="flex-1 flex flex-col items-center py-3 border-r border-border last:border-r-0">
            <span className="text-xl leading-none">{s.emoji}</span>
            <span className="text-lg font-bold mt-1">{s.value}</span>
            <span className="text-[9px] text-muted-foreground">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Stage filter */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto border-b border-border">
        <button onClick={() => setActiveStage(null)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap ${!activeStage ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary border-border text-muted-foreground'}`}>
          All
        </button>
        {STAGES.map(s => (
          <button key={s.id} onClick={() => setActiveStage(s.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap ${activeStage === s.id ? `${s.bg} ${s.color} ${s.border}` : 'bg-secondary border-border text-muted-foreground'}`}>
            {s.emoji} {s.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="px-4 py-4 space-y-6">

          {/* BUILD stage */}
          {(!activeStage || activeStage === 'build') && (
            <section className="space-y-2">
              <StageHeader stage={STAGES[0]} count={buildBots.length + assets.length} />
              {buildBots.map(bot => (
                <BotCard key={bot.id} bot={bot} onAdvance={advanceBot} onRetract={retractBot} />
              ))}
              {assets.map(asset => (
                <AssetCard key={asset.id} asset={asset} onAdvance={() => {}} />
              ))}
              {buildBots.length === 0 && assets.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">Nothing in Build yet — head to AI Lab or Jackie to create</p>
              )}
            </section>
          )}

          {/* DEPLOY stage */}
          {(!activeStage || activeStage === 'deploy') && (
            <section className="space-y-2">
              <StageHeader stage={STAGES[1]} count={deployBots.length} />
              {deployBots.map(bot => (
                <BotCard key={bot.id} bot={bot} onAdvance={advanceBot} onRetract={retractBot} />
              ))}
              {deployBots.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">Activate bots from the Build stage to deploy them</p>
              )}
            </section>
          )}

          {/* SHOWCASE stage */}
          {(!activeStage || activeStage === 'showcase') && (
            <section className="space-y-2">
              <StageHeader stage={STAGES[2]} count={showcaseBots.length} />
              {showcaseBots.map(bot => (
                <BotCard key={bot.id} bot={bot} onAdvance={advanceBot} onRetract={retractBot} />
              ))}
              {showcaseBots.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">Make deployed bots public to showcase them</p>
              )}
            </section>
          )}

        </div>
      )}
    </div>
  );
}