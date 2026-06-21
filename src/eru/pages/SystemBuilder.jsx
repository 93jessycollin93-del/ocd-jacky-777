import { useState } from 'react';
import { base44 } from '@/eru/api/base44Client';
import { Wand2, Bot, Loader2, CheckCircle2, Code2, Layout, Settings2, Rocket, ChevronDown, ChevronUp, Copy, Check, Zap, Globe } from 'lucide-react';
import WebsiteGeneratorPanel from '../components/builder/WebsiteGeneratorPanel';

const EXAMPLES = [
  'Make me a trading bot for BTC/USDT',
  'Build a Telegram notification bot for price alerts',
  'Create a DeFi yield farming assistant',
  'Build a social media automation bot',
  'Make an AI-powered portfolio manager',
  'Create a crypto arbitrage scanner',
];

const SYSTEM_PROMPT = `You are the Auto System Builder — an expert AI engineer. When a user describes a system they want, you return a complete blueprint as JSON with these exact fields:
- bot_name: string
- bot_description: string
- bot_role: one of [assistant, trader, game_helper, social, custom]
- bot_personality: string
- bot_instructions: string (detailed system prompt for the bot)
- bot_response_style: one of [short, detailed, strategic, creative]
- ui_layout: string (markdown description of the UI layout with sections)
- api_config: object with { endpoints: array of {name, method, url, description}, auth_type: string, rate_limit: string }
- bot_logic: string (pseudocode or step-by-step logic flow)
- deployment_steps: array of strings
- tech_stack: array of strings
- estimated_build_time: string
- complexity: one of [simple, moderate, advanced]`;

const Section = ({ icon: Icon, title, color, children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/40 transition-colors">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4" style={{ color }} />
          <span className="text-sm font-semibold">{title}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && <div className="px-4 pb-4 border-t border-border pt-3">{children}</div>}
    </div>
  );
};

const CodeBlock = ({ content }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(content); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div className="relative">
      <pre className="bg-secondary/80 border border-border rounded-xl p-3 text-[10px] font-mono text-foreground whitespace-pre-wrap overflow-x-auto leading-relaxed max-h-48 overflow-y-auto">
        {content}
      </pre>
      <button onClick={copy} className="absolute top-2 right-2 p-1.5 bg-card border border-border rounded-lg hover:bg-secondary transition-colors">
        {copied ? <Check className="w-3 h-3 text-primary" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
      </button>
    </div>
  );
};

export default function SystemBuilder() {
  const [module, setModule] = useState('builder');
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [system, setSystem] = useState(null);
  const [botCreated, setBotCreated] = useState(false);
  const [creatingBot, setCreatingBot] = useState(false);
  const [stage, setStage] = useState('');

  const STAGES = [
    'Analyzing your request...',
    'Designing bot logic...',
    'Generating UI layout...',
    'Configuring API endpoints...',
    'Building deployment steps...',
    'Finalizing system blueprint...',
  ];

  const build = async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setSystem(null);
    setBotCreated(false);
    let s = 0;
    setStage(STAGES[0]);
    const interval = setInterval(() => {
      s = Math.min(s + 1, STAGES.length - 1);
      setStage(STAGES[s]);
    }, 900);

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `${SYSTEM_PROMPT}\n\nUser request: "${prompt}"\n\nReturn ONLY valid JSON, no markdown, no explanation.`,
      response_json_schema: {
        type: 'object',
        properties: {
          bot_name: { type: 'string' },
          bot_description: { type: 'string' },
          bot_role: { type: 'string' },
          bot_personality: { type: 'string' },
          bot_instructions: { type: 'string' },
          bot_response_style: { type: 'string' },
          ui_layout: { type: 'string' },
          api_config: { type: 'object' },
          bot_logic: { type: 'string' },
          deployment_steps: { type: 'array', items: { type: 'string' } },
          tech_stack: { type: 'array', items: { type: 'string' } },
          estimated_build_time: { type: 'string' },
          complexity: { type: 'string' },
        }
      }
    });

    clearInterval(interval);
    setSystem(result);
    setLoading(false);
    setStage('');
  };

  const createBotInLab = async () => {
    if (!system) return;
    setCreatingBot(true);
    await base44.entities.UserBot.create({
      name: system.bot_name,
      description: system.bot_description,
      role: system.bot_role || 'custom',
      personality: system.bot_personality,
      instructions: system.bot_instructions,
      response_style: system.bot_response_style || 'detailed',
      memory_enabled: true,
      status: 'active',
      is_public: false,
    });
    setBotCreated(true);
    setCreatingBot(false);
  };

  const complexityColor = { simple: 'text-green-400', moderate: 'text-yellow-400', advanced: 'text-red-400' };

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="px-4 py-4 border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
            <Wand2 className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Auto System Builder</h2>
            <p className="text-[10px] text-muted-foreground">One prompt → full system generated</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        <div className="flex gap-2 overflow-x-auto">
          <button onClick={() => setModule('builder')} className={`rounded-xl px-3 py-2 text-xs font-semibold ${module === 'builder' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
            <Wand2 className="mr-1 inline w-3.5 h-3.5" /> System Builder
          </button>
          <button onClick={() => setModule('website-generator')} className={`rounded-xl px-3 py-2 text-xs font-semibold ${module === 'website-generator' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
            <Globe className="mr-1 inline w-3.5 h-3.5" /> Website Generator App
          </button>
        </div>

        {module === 'website-generator' ? <WebsiteGeneratorPanel /> : <>
        {/* Prompt input */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-3 pt-3 pb-2">
            <p className="text-xs text-muted-foreground mb-2 font-medium">Describe what you want to build</p>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) build(); }}
              placeholder='e.g. "Make me a trading bot that monitors BTC price and sends alerts"'
              className="w-full bg-secondary/60 border border-border rounded-xl px-3 py-3 text-sm outline-none text-foreground placeholder:text-muted-foreground resize-none min-h-[80px]"
            />
          </div>
          <div className="flex items-center justify-between px-3 pb-3 gap-3">
            <div className="flex gap-1.5 overflow-x-auto">
              {EXAMPLES.slice(0, 3).map(ex => (
                <button key={ex} onClick={() => setPrompt(ex)}
                  className="whitespace-nowrap text-[9px] bg-primary/10 text-primary border border-primary/20 px-2 py-1 rounded-full hover:bg-primary/20 transition-colors flex-shrink-0">
                  {ex.replace('Make me a ', '').replace('Build a ', '').replace('Create a ', '')}
                </button>
              ))}
            </div>
            <button onClick={build} disabled={!prompt.trim() || loading}
              className="flex-shrink-0 bg-primary text-primary-foreground rounded-xl px-4 py-2.5 font-semibold text-sm disabled:opacity-50 flex items-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              {loading ? 'Building...' : 'Build'}
            </button>
          </div>
        </div>

        {/* Loading stages */}
        {loading && (
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin flex-shrink-0" />
              <p className="text-sm font-medium text-primary">{stage}</p>
            </div>
            <div className="space-y-1.5">
              {STAGES.map((s, i) => (
                <div key={s} className={`flex items-center gap-2 text-xs transition-all ${STAGES.indexOf(stage) >= i ? 'text-primary' : 'text-muted-foreground/40'}`}>
                  {STAGES.indexOf(stage) > i ? <CheckCircle2 className="w-3 h-3 flex-shrink-0" /> : <div className="w-3 h-3 rounded-full border border-current flex-shrink-0" />}
                  {s}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* System output */}
        {system && !loading && (
          <div className="space-y-3">
            {/* Summary card */}
            <div className="bg-gradient-to-br from-primary/10 to-transparent border border-primary/20 rounded-2xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-base">{system.bot_name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{system.bot_description}</p>
                </div>
                <span className={`text-[9px] font-semibold px-2 py-1 rounded-full bg-secondary border border-border ${complexityColor[system.complexity] || 'text-muted-foreground'}`}>
                  {system.complexity}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(system.tech_stack || []).map(t => (
                  <span key={t} className="text-[9px] bg-secondary border border-border px-2 py-0.5 rounded-full text-muted-foreground">{t}</span>
                ))}
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/50 pt-2">
                <span>Est. build time: <span className="text-foreground font-medium">{system.estimated_build_time}</span></span>
                <span>Role: <span className="text-primary font-medium">{system.bot_role}</span></span>
              </div>
            </div>

            {/* Auto-create button */}
            {!botCreated ? (
              <button onClick={createBotInLab} disabled={creatingBot}
                className="w-full bg-primary text-primary-foreground rounded-2xl py-3.5 font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-60">
                {creatingBot ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating in AI Lab...</> : <><Bot className="w-4 h-4" /> Auto-Create Bot in AI Lab</>}
              </button>
            ) : (
              <div className="flex items-center gap-3 bg-green-400/10 border border-green-400/20 rounded-2xl px-4 py-3">
                <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-green-400">Bot created in AI Lab!</p>
                  <p className="text-[10px] text-muted-foreground">Find "{system.bot_name}" in your AI Lab → My Bots</p>
                </div>
              </div>
            )}

            {/* Sections */}
            <Section icon={Code2} title="Bot Logic" color="hsl(160,100%,45%)" defaultOpen>
              <CodeBlock content={system.bot_logic || 'No logic generated'} />
            </Section>

            <Section icon={Layout} title="UI Layout" color="hsl(210,100%,60%)">
              <div className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">{system.ui_layout}</div>
            </Section>

            <Section icon={Settings2} title="API Configuration" color="hsl(280,80%,65%)">
              <div className="space-y-2">
                <div className="flex gap-3 text-[10px] text-muted-foreground">
                  <span>Auth: <span className="text-foreground font-medium">{system.api_config?.auth_type || 'Bearer Token'}</span></span>
                  <span>Rate Limit: <span className="text-foreground font-medium">{system.api_config?.rate_limit || '100 req/min'}</span></span>
                </div>
                {(system.api_config?.endpoints || []).map((ep, i) => (
                  <div key={i} className="bg-secondary/60 border border-border rounded-xl px-3 py-2 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono ${ep.method === 'GET' ? 'bg-green-400/10 text-green-400' : ep.method === 'POST' ? 'bg-blue-400/10 text-blue-400' : 'bg-yellow-400/10 text-yellow-400'}`}>{ep.method}</span>
                      <code className="text-[10px] text-primary font-mono">{ep.url}</code>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{ep.description}</p>
                  </div>
                ))}
              </div>
            </Section>

            <Section icon={Rocket} title="Deployment Steps" color="hsl(45,100%,55%)">
              <div className="space-y-2">
                {(system.deployment_steps || []).map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                    <p className="text-xs text-foreground leading-relaxed">{step}</p>
                  </div>
                ))}
              </div>
            </Section>
          </div>
        )}

        {/* Examples when empty */}
        {!system && !loading && (
          <div className="space-y-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Try these examples</p>
            {EXAMPLES.map(ex => (
              <button key={ex} onClick={() => setPrompt(ex)}
                className="w-full text-left bg-card border border-border rounded-xl px-4 py-3 text-sm text-foreground hover:border-primary/40 hover:bg-primary/5 transition-all flex items-center gap-3">
                <Zap className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                {ex}
              </button>
            ))}
          </div>
        )}
        </>}
      </div>
    </div>
  );
}