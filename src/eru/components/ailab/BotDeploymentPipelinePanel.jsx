import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/eru/api/base44Client';
import { GitBranch, RotateCcw, Rocket, ExternalLink, ShieldCheck, Send } from 'lucide-react';

const ENVIRONMENTS = ['draft', 'staging', 'live'];
const PAGE_OPTIONS = [
  { route: '/', label: 'Dashboard' },
  { route: '/markets', label: 'Markets' },
  { route: '/trade', label: 'Trade' },
  { route: '/nfts', label: 'NFTs' },
  { route: '/portfolio', label: 'Portfolio' },
  { route: '/collectables', label: 'Collectables' },
  { route: '/jackie', label: 'Jackie AI' },
  { route: '/ailab', label: 'AI Lab' },
  { route: '/arena', label: 'Card Arena' },
  { route: '/jta', label: 'Jade Atelier' },
  { route: '/storefront', label: 'Storefront' },
  { route: '/creator', label: 'Creator Hub' },
  { route: '/thinkers', label: 'Thinkers Club' },
];

function scoreInstructions(text = '') {
  const clean = String(text || '').trim();
  const lengthScore = clean.length >= 400 ? 50 : clean.length >= 180 ? 35 : clean.length >= 80 ? 20 : 5;
  const structureScore = [/role/i, /tone|style/i, /do not|avoid|never/i, /when/i].reduce((sum, pattern) => sum + (pattern.test(clean) ? 12.5 : 0), 0);
  const total = Math.round(lengthScore + structureScore);
  if (total >= 75) return { score: total, status: 'pass', note: 'Instructions look strong enough for deployment.' };
  if (total >= 45) return { score: total, status: 'review', note: 'Instructions are usable but should be tightened before wider release.' };
  return { score: total, status: 'fail', note: 'Instructions are too thin for public deployment.' };
}

function buildMiniAppRoute(botId) {
  return `/bot-mini-app?bot=${botId}`;
}

function buildTelegramMiniAppUrl(route) {
  return `https://t.me/share/url?url=${encodeURIComponent(`${window.location.origin}${route}`)}`;
}

export default function BotDeploymentPipelinePanel({ bots, trainingBot, trainingSummary, onBotsUpdated }) {
  const [deployments, setDeployments] = useState([]);
  const [versions, setVersions] = useState([]);
  const [selectedBotId, setSelectedBotId] = useState('');
  const [targetPages, setTargetPages] = useState([]);
  const [targetEnvironment, setTargetEnvironment] = useState('draft');
  const [notes, setNotes] = useState('');
  const [deploying, setDeploying] = useState(false);
  const [rollingBackId, setRollingBackId] = useState('');

  const activeBotId = trainingBot?.id || selectedBotId;
  const activeBot = useMemo(() => bots.find((bot) => bot.id === activeBotId) || null, [bots, activeBotId]);

  const load = async () => {
    const [deploymentRows, versionRows] = await Promise.all([
      base44.entities.BotDeployment.list('-created_date', 100),
      base44.entities.BotVersion.list('-created_date', 200),
    ]);
    setDeployments(deploymentRows);
    setVersions(versionRows);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (trainingBot?.id) {
      setSelectedBotId(trainingBot.id);
      setTargetPages(trainingBot.page_assignments || []);
    }
  }, [trainingBot]);

  const latestVersion = useMemo(() => versions.find((item) => item.bot_id === activeBotId), [versions, activeBotId]);
  const recentDeployments = useMemo(() => deployments.filter((item) => !activeBotId || item.bot_id === activeBotId), [deployments, activeBotId]);
  const instructionCheck = useMemo(() => scoreInstructions(activeBot?.instructions || ''), [activeBot]);
  const miniAppRoute = useMemo(() => activeBot ? buildMiniAppRoute(activeBot.id) : '', [activeBot]);
  const telegramMiniAppUrl = useMemo(() => miniAppRoute ? buildTelegramMiniAppUrl(miniAppRoute) : '', [miniAppRoute]);

  const togglePage = (route) => {
    setTargetPages((prev) => prev.includes(route) ? prev.filter((item) => item !== route) : [...prev, route]);
  };

  const deploy = async () => {
    if (!activeBot || instructionCheck.status === 'fail') return;
    setDeploying(true);

    const nextAssignments = targetPages.length > 0 ? targetPages : (activeBot.page_assignments || []);
    await base44.entities.UserBot.update(activeBot.id, {
      page_assignments: nextAssignments,
      deployment_environment: targetEnvironment,
      status: 'active',
      is_public: true,
      mini_app_route: miniAppRoute,
      deployment_state: 'deployment',
    });

    await base44.entities.BotDeployment.create({
      bot_id: activeBot.id,
      bot_name: activeBot.name,
      source_version_id: latestVersion?.id || '',
      source_version_label: latestVersion?.version_label || '',
      target_type: nextAssignments.length > 0 ? 'mixed' : 'environment',
      target_pages: nextAssignments,
      target_environment: targetEnvironment,
      deployment_status: 'deployed',
      deployment_notes: notes,
      mini_app_route: miniAppRoute,
      instruction_quality_score: instructionCheck.score,
      instruction_quality_status: instructionCheck.status,
      marketplace_ready: instructionCheck.status !== 'fail',
      triggered_from: trainingBot?.id ? 'training' : 'manual',
      test_summary: trainingSummary || '',
      candidate_instructions: activeBot.instructions || '',
      deployed_at: new Date().toISOString()
    });

    setNotes('');
    setDeploying(false);
    await load();
    onBotsUpdated?.();
  };

  const rollbackDeployment = async (deployment) => {
    if (!deployment.source_version_id || !activeBot) return;
    setRollingBackId(deployment.id);
    const version = versions.find((item) => item.id === deployment.source_version_id);
    if (!version) {
      setRollingBackId('');
      return;
    }

    await base44.entities.UserBot.update(activeBot.id, {
      instructions: version.instructions,
      personality: version.personality,
      response_style: version.response_style,
      handoff_instructions: version.handoff_instructions,
      prompt_template_id: version.prompt_template_id || '',
      prompt_template_values: version.prompt_template_values || {},
      page_assignments: deployment.target_pages || [],
      deployment_environment: deployment.target_environment || 'draft',
    });

    await base44.entities.BotDeployment.create({
      bot_id: activeBot.id,
      bot_name: activeBot.name,
      source_version_id: version.id,
      source_version_label: version.version_label || '',
      target_type: deployment.target_type || 'mixed',
      target_pages: deployment.target_pages || [],
      target_environment: deployment.target_environment || 'draft',
      deployment_status: 'rolled_back',
      deployment_notes: `Rollback from deployment ${deployment.source_version_label || deployment.id}`,
      triggered_from: 'rollback',
      rollback_version_id: version.id,
      rolled_back_at: new Date().toISOString()
    });

    setRollingBackId('');
    await load();
    onBotsUpdated?.();
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
      <div className="flex items-center gap-2">
        <GitBranch className="w-4 h-4 text-primary" />
        <div>
          <p className="text-sm font-semibold text-foreground">Deployment pipeline</p>
          <p className="text-xs text-muted-foreground">One-click deployments to selected pages, environments, or both, with rollback to the last saved version.</p>
        </div>
      </div>

      {!trainingBot && (
        <select value={selectedBotId} onChange={(e) => setSelectedBotId(e.target.value)} className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground outline-none">
          <option value="">Choose bot</option>
          {bots.map((bot) => <option key={bot.id} value={bot.id}>{bot.name}</option>)}
        </select>
      )}

      {activeBot && (
        <>
          <div className="rounded-xl border border-border bg-background p-3 space-y-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <p className="text-xs font-semibold text-foreground">Deployment checks</p>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-foreground">Instruction quality</p>
                <p className="text-[11px] text-muted-foreground">{instructionCheck.note}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-primary">{instructionCheck.score}/100</p>
                <p className={`text-[10px] uppercase ${instructionCheck.status === 'pass' ? 'text-green-400' : instructionCheck.status === 'review' ? 'text-yellow-400' : 'text-red-400'}`}>{instructionCheck.status}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-border bg-background p-3 space-y-2">
              <p className="text-xs font-semibold text-foreground">Target pages</p>
              <div className="flex flex-wrap gap-1.5">
                {PAGE_OPTIONS.map((page) => {
                  const active = targetPages.includes(page.route);
                  return (
                    <button key={page.route} onClick={() => togglePage(page.route)} className={`rounded-lg border px-2 py-1 text-[10px] font-medium ${active ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-secondary text-muted-foreground'}`}>
                      {page.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-background p-3 space-y-2">
              <p className="text-xs font-semibold text-foreground">Target environment</p>
              <div className="flex gap-2 flex-wrap">
                {ENVIRONMENTS.map((env) => (
                  <button key={env} onClick={() => setTargetEnvironment(env)} className={`rounded-lg border px-3 py-1.5 text-[10px] font-medium uppercase ${targetEnvironment === env ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-secondary text-muted-foreground'}`}>
                    {env}
                  </button>
                ))}
              </div>
              {trainingSummary && <p className="text-[10px] text-muted-foreground">Training gate: {trainingSummary}</p>}
            </div>
          </div>

          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional deployment note" className="min-h-[72px] w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground outline-none" />

          <div className="grid gap-2 md:grid-cols-3">
            <button onClick={deploy} disabled={deploying || instructionCheck.status === 'fail'} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-40">
              <Rocket className="w-3.5 h-3.5" /> {deploying ? 'Deploying...' : 'Promote to deployment'}
            </button>
            <a href={miniAppRoute || '#'} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-secondary py-2.5 text-xs font-semibold text-foreground">
              <ExternalLink className="w-3.5 h-3.5" /> Open mini-app route
            </a>
            <a href={telegramMiniAppUrl || '#'} target="_blank" rel="noreferrer" className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/10 py-2.5 text-xs font-semibold text-primary">
              <Send className="w-3.5 h-3.5" /> Launch in Telegram
            </a>
          </div>
        </>
      )}

      <div className="space-y-2">
        <p className="text-xs font-semibold text-foreground">Recent deployments</p>
        {recentDeployments.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">No deployments yet.</p>
        ) : recentDeployments.slice(0, 8).map((deployment) => (
          <div key={deployment.id} className="rounded-xl border border-border bg-background p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-foreground">{deployment.bot_name}</p>
                <p className="text-[10px] text-muted-foreground">{deployment.target_environment || 'draft'} · {(deployment.target_pages || []).join(', ') || 'No pages selected'}</p>
              </div>
              <span className="text-[10px] text-primary">{deployment.deployment_status}</span>
            </div>
            <div className="flex flex-wrap gap-2 text-[10px]">
              {deployment.instruction_quality_status && (
                <span className={`rounded-full px-2 py-1 ${deployment.instruction_quality_status === 'pass' ? 'bg-green-400/10 text-green-400' : deployment.instruction_quality_status === 'review' ? 'bg-yellow-400/10 text-yellow-400' : 'bg-red-400/10 text-red-400'}`}>
                  Instructions {deployment.instruction_quality_status}
                </span>
              )}
              {deployment.marketplace_ready && <span className="rounded-full bg-primary/10 px-2 py-1 text-primary">Marketplace ready</span>}
            </div>
            {deployment.mini_app_route && <p className="text-[11px] text-muted-foreground break-all">Mini-app: {deployment.mini_app_route}</p>}
            {deployment.deployment_notes && <p className="text-[11px] text-muted-foreground">{deployment.deployment_notes}</p>}
            <div className="flex flex-wrap gap-2">
              {deployment.mini_app_route && (
                <a href={deployment.mini_app_route} className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2 text-[11px] font-semibold text-foreground">
                  <ExternalLink className="w-3.5 h-3.5" /> Open route
                </a>
              )}
              {deployment.mini_app_route && (
                <a href={buildTelegramMiniAppUrl(deployment.mini_app_route)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/10 px-3 py-2 text-[11px] font-semibold text-primary">
                  <Send className="w-3.5 h-3.5" /> Telegram mini-app
                </a>
              )}
              {deployment.source_version_id && deployment.deployment_status === 'deployed' && activeBot?.id === deployment.bot_id && (
                <button onClick={() => rollbackDeployment(deployment)} disabled={rollingBackId === deployment.id} className="inline-flex items-center gap-2 rounded-lg border border-yellow-400/30 bg-yellow-400/10 px-3 py-2 text-[11px] font-semibold text-yellow-400 disabled:opacity-40">
                  <RotateCcw className="w-3.5 h-3.5" /> {rollingBackId === deployment.id ? 'Rolling back...' : 'Rollback'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}