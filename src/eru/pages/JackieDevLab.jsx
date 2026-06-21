import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/eru/api/base44Client';
import { useAuth } from '@/eru/lib/AuthContext';
import {
  FileText, ListChecks, BookOpen, FileCode, FileDiff, Network, ShieldCheck, Settings, History,
} from 'lucide-react';

import DevLabHeader from '@/eru/components/devlab/DevLabHeader';
import DevLabPromptBar from '@/eru/components/devlab/DevLabPromptBar';
import DevLabInspector from '@/eru/components/devlab/DevLabInspector';
import DevLabPlanTab from '@/eru/components/devlab/DevLabPlanTab';
import DevLabQueueTab from '@/eru/components/devlab/DevLabQueueTab';
import DevLabKnowledgeTab from '@/eru/components/devlab/DevLabKnowledgeTab';
import DevLabFilesTab from '@/eru/components/devlab/DevLabFilesTab';
import DevLabPatchesTab from '@/eru/components/devlab/DevLabPatchesTab';
import DevLabSystemMap from '@/eru/components/devlab/DevLabSystemMap';
import DevLabTestPlanTab from '@/eru/components/devlab/DevLabTestPlanTab';
import DevLabSettingsTab from '@/eru/components/devlab/DevLabSettingsTab';
import DevLabAuditTab from '@/eru/components/devlab/DevLabAuditTab';

import {
  GOLDEN_RULES,
  buildPlanTemplate,
  buildTasksFromPlan,
  buildManualPatch,
  logDevAudit,
  rankKnowledgeForPrompt,
  emptyProviderStatus,
} from '@/eru/lib/devLab';

const TABS = [
  { id: 'plan',       label: 'Plan',     icon: FileText },
  { id: 'queue',      label: 'Queue',    icon: ListChecks },
  { id: 'knowledge',  label: 'Knowledge',icon: BookOpen },
  { id: 'files',      label: 'Files',    icon: FileCode },
  { id: 'patches',    label: 'Patches',  icon: FileDiff },
  { id: 'system',     label: 'System Map', icon: Network },
  { id: 'tests',      label: 'Test Plan', icon: ShieldCheck },
  { id: 'settings',   label: 'Settings', icon: Settings },
  { id: 'audit',      label: 'Audit',    icon: History },
];

const DEFAULT_PROJECT = {
  title: 'ERU Core System',
  description: 'Default project for the ERU app — used as the working surface for the Jackie Dev Lab. Customize freely.',
  status: 'active',
  primary_stack: 'React + Base44 + Tailwind',
  provider_status: emptyProviderStatus(),
};

/**
 * JackieDevLab — main page.
 * - Single-project workspace with tabbed canvas + secondary inspector.
 * - Mobile-first: tabs scroll horizontally, inspector collapses below canvas
 *   on narrow screens; on lg+ it sits to the right.
 * - Honest mode: no AI calls in this baseline build. Plan/patch generation
 *   uses local templates, clearly labeled. Real provider integration plugs
 *   in later through `lib/devLab.js` without UI changes.
 */
export default function JackieDevLab() {
  const { user, currentUser } = useAuth();
  const me = user || currentUser;
  const userEmail = me?.email || '';
  const isAdmin = me?.role === 'admin';

  const [tab, setTab] = useState('plan');
  const [mode, setMode] = useState('plan'); // plan | agent

  const [projects, setProjects] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [session, setSession] = useState(null);
  const [plans, setPlans] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [docs, setDocs] = useState([]);
  const [files, setFiles] = useState([]);
  const [patches, setPatches] = useState([]);
  const [audit, setAudit] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [patchBusyId, setPatchBusyId] = useState(null);
  const [lastPrompt, setLastPrompt] = useState('');

  const activeProject = useMemo(
    () => projects.find((p) => p.id === activeProjectId) || projects[0] || null,
    [projects, activeProjectId],
  );
  const isOwner = !!activeProject && (activeProject.owner_email === userEmail || isAdmin);
  const currentPlan = useMemo(
    () => plans.find((p) => p.id === session?.current_plan_id) || plans[0] || null,
    [plans, session],
  );
  const currentTasks = useMemo(
    () => tasks
      .filter((t) => t.plan_id === currentPlan?.id)
      .sort((a, b) => (a.queue_index || 0) - (b.queue_index || 0)),
    [tasks, currentPlan],
  );
  const currentPatches = useMemo(
    () => patches.filter((p) => !currentPlan || p.plan_id === currentPlan.id),
    [patches, currentPlan],
  );

  // ---- bootstrap ---------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);

      // Load projects (or seed a default one)
      let projectRows = await base44.entities.DevProject.list('-updated_date', 50).catch(() => []);
      if (!projectRows || projectRows.length === 0) {
        const created = await base44.entities.DevProject.create({
          ...DEFAULT_PROJECT,
          owner_email: userEmail,
          owner_role: isAdmin ? 'admin' : 'user',
          last_updated: new Date().toISOString(),
        }).catch(() => null);
        if (created) projectRows = [created];
      }
      if (cancelled) return;
      setProjects(projectRows || []);
      const initialProject = (projectRows && projectRows[0]) || null;
      setActiveProjectId(initialProject?.id || null);

      if (!initialProject) { setLoading(false); return; }

      // Seed Golden Rules if missing
      const seedDocs = await base44.entities.DevKnowledgeDoc
        .filter({ project_id: initialProject.id }, '-created_date', 200)
        .catch(() => []);
      if (!seedDocs || seedDocs.length === 0) {
        await base44.entities.DevKnowledgeDoc.bulkCreate(
          GOLDEN_RULES.map((r) => ({
            ...r,
            project_id: initialProject.id,
            owner_email: userEmail,
            source_type: 'seeded',
          })),
        ).catch(() => null);
      }

      await reloadProjectScope(initialProject.id);
      if (!cancelled) setLoading(false);
    };
    run();
    return () => { cancelled = true; };
     
  }, [userEmail]);

  const reloadProjectScope = async (projectId) => {
    if (!projectId) return;
    const [docRows, fileRows, patchRows, auditRows, sessionRows] = await Promise.all([
      base44.entities.DevKnowledgeDoc.filter({ project_id: projectId }, '-updated_date', 200).catch(() => []),
      base44.entities.DevFileReference.filter({ project_id: projectId }, '-updated_date', 200).catch(() => []),
      base44.entities.DevPatch.filter({ project_id: projectId }, '-updated_date', 200).catch(() => []),
      base44.entities.DevAuditLog.filter({ owner_email: userEmail }, '-created_date', 100).catch(() => []),
      base44.entities.DevSession.filter({ project_id: projectId, status: 'active' }, '-updated_date', 1).catch(() => []),
    ]);
    setDocs(docRows || []);
    setFiles(fileRows || []);
    setPatches(patchRows || []);
    setAudit(auditRows || []);

    let activeSession = (sessionRows && sessionRows[0]) || null;
    if (!activeSession) {
      activeSession = await base44.entities.DevSession.create({
        project_id: projectId,
        title: 'Working session',
        mode: 'plan',
        status: 'active',
        owner_email: userEmail,
      }).catch(() => null);
    }
    setSession(activeSession);

    if (activeSession) {
      const planRows = await base44.entities.DevPlan
        .filter({ session_id: activeSession.id }, '-version_number', 50)
        .catch(() => []);
      setPlans(planRows || []);
      const allTasks = await base44.entities.DevAgentTask
        .filter({ session_id: activeSession.id }, '-queue_index', 200)
        .catch(() => []);
      setTasks(allTasks || []);
    } else {
      setPlans([]);
      setTasks([]);
    }
  };

  // ---- project actions ---------------------------------------------------
  const handleSelectProject = async (p) => {
    setActiveProjectId(p.id);
    await reloadProjectScope(p.id);
  };

  const handleCreateProject = async () => {
    const title = window.prompt('Name your new project');
    if (!title?.trim()) return;
    const created = await base44.entities.DevProject.create({
      title: title.trim(),
      status: 'active',
      owner_email: userEmail,
      owner_role: isAdmin ? 'admin' : 'user',
      provider_status: emptyProviderStatus(),
      last_updated: new Date().toISOString(),
    }).catch(() => null);
    if (created) {
      setProjects((prev) => [created, ...prev]);
      setActiveProjectId(created.id);
      await reloadProjectScope(created.id);
      logDevAudit({ actor: userEmail, action: 'project.created', targetType: 'project', targetId: created.id, details: created.title });
    }
  };

  // ---- plan actions ------------------------------------------------------
  const handleSubmitPrompt = async (prompt) => {
    setLastPrompt(prompt);
    if (!session || !activeProject) return;
    setBusy(true);
    try {
      if (mode === 'plan') {
        const tpl = buildPlanTemplate({ prompt, projectTitle: activeProject.title });
        const created = await base44.entities.DevPlan.create({
          ...tpl,
          session_id: session.id,
          project_id: activeProject.id,
          owner_email: userEmail,
          approval_status: 'draft',
          version_number: (plans[0]?.version_number || 0) + 1,
        });
        if (created) {
          setPlans((prev) => [created, ...prev]);
          await base44.entities.DevSession.update(session.id, { current_plan_id: created.id, mode: 'plan' });
          setSession((s) => ({ ...s, current_plan_id: created.id, mode: 'plan' }));
          setTab('plan');
          logDevAudit({ actor: userEmail, action: 'plan.drafted', targetType: 'plan', targetId: created.id, details: created.title });
        }
      } else {
        // Agent mode without a current plan → create a single ad-hoc task.
        if (!currentPlan) {
          alert('Approve a plan before queueing agent tasks. Switch to Plan mode and draft a plan first.');
          return;
        }
        if (currentPlan.approval_status !== 'approved') {
          alert('Approve the current plan before queueing agent tasks.');
          return;
        }
        const created = await base44.entities.DevAgentTask.create({
          plan_id: currentPlan.id,
          session_id: session.id,
          project_id: activeProject.id,
          owner_email: userEmail,
          title: prompt.length > 80 ? prompt.slice(0, 77) + '…' : prompt,
          description: prompt,
          task_type: 'manual',
          status: 'queued',
          queue_index: (currentTasks[currentTasks.length - 1]?.queue_index ?? -1) + 1,
        });
        if (created) {
          setTasks((prev) => [...prev, created]);
          setTab('queue');
          logDevAudit({ actor: userEmail, action: 'task.queued', targetType: 'task', targetId: created.id, details: created.title });
        }
      }
    } finally {
      setBusy(false);
    }
  };

  const handleApprovePlan = async (plan) => {
    const updated = await base44.entities.DevPlan.update(plan.id, { approval_status: 'approved' });
    setPlans((prev) => prev.map((p) => (p.id === plan.id ? { ...p, ...updated } : p)));
    logDevAudit({ actor: userEmail, action: 'plan.approved', targetType: 'plan', targetId: plan.id, details: plan.title, severity: 'warning' });
  };

  const handleArchivePlan = async (plan) => {
    const updated = await base44.entities.DevPlan.update(plan.id, { approval_status: 'archived' });
    setPlans((prev) => prev.map((p) => (p.id === plan.id ? { ...p, ...updated } : p)));
    logDevAudit({ actor: userEmail, action: 'plan.archived', targetType: 'plan', targetId: plan.id, details: plan.title });
  };

  const handleUpdatePlanField = async (plan, field, value) => {
    const updated = await base44.entities.DevPlan.update(plan.id, { [field]: value });
    setPlans((prev) => prev.map((p) => (p.id === plan.id ? { ...p, ...updated } : p)));
  };

  const handleSelectPlan = async (plan) => {
    if (!session) return;
    await base44.entities.DevSession.update(session.id, { current_plan_id: plan.id });
    setSession((s) => ({ ...s, current_plan_id: plan.id }));
  };

  const handleConvertToTasks = async (plan) => {
    const seeds = buildTasksFromPlan(plan);
    if (!seeds.length) return;
    const created = await base44.entities.DevAgentTask.bulkCreate(seeds).catch(() => []);
    if (created?.length) {
      setTasks((prev) => [...prev.filter((t) => t.plan_id !== plan.id), ...created]);
      setMode('agent');
      setTab('queue');
      logDevAudit({ actor: userEmail, action: 'plan.converted_to_tasks', targetType: 'plan', targetId: plan.id, details: `${created.length} tasks queued` });
    }
  };

  // ---- task / patch actions ---------------------------------------------
  const handleAdvanceTask = async (task, nextStatus) => {
    const updated = await base44.entities.DevAgentTask.update(task.id, {
      status: nextStatus,
      completed_at: nextStatus === 'completed' ? new Date().toISOString() : task.completed_at,
    });
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, ...updated } : t)));
    logDevAudit({ actor: userEmail, action: `task.${nextStatus}`, targetType: 'task', targetId: task.id, details: task.title });
  };

  const handleDeleteTask = async (task) => {
    await base44.entities.DevAgentTask.delete(task.id).catch(() => null);
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    logDevAudit({ actor: userEmail, action: 'task.deleted', targetType: 'task', targetId: task.id, details: task.title });
  };

  const handleClearQueue = async () => {
    if (!currentPlan) return;
    const ids = currentTasks.map((t) => t.id);
    await Promise.all(ids.map((id) => base44.entities.DevAgentTask.delete(id).catch(() => null)));
    setTasks((prev) => prev.filter((t) => t.plan_id !== currentPlan.id));
    logDevAudit({ actor: userEmail, action: 'queue.cleared', targetType: 'plan', targetId: currentPlan.id, details: `${ids.length} tasks` , severity: 'warning' });
  };

  const handleExportPatch = async (task) => {
    setPatchBusyId(task.id);
    try {
      const patchData = buildManualPatch({ task, plan: currentPlan });
      const created = await base44.entities.DevPatch.create({
        ...patchData,
        task_id: task.id,
        plan_id: currentPlan?.id,
        project_id: activeProject?.id,
        owner_email: userEmail,
      });
      if (created) {
        setPatches((prev) => [created, ...prev]);
        await base44.entities.DevAgentTask.update(task.id, { status: 'manually_exported', output_summary: `Patch ready: ${created.title}` });
        setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: 'manually_exported', output_summary: `Patch ready: ${created.title}` } : t)));
        setTab('patches');
        logDevAudit({ actor: userEmail, action: 'patch.exported', targetType: 'patch', targetId: created.id, details: created.title });
      }
    } finally {
      setPatchBusyId(null);
    }
  };

  const handleUpdatePatchStatus = async (patch, nextStatus) => {
    const updated = await base44.entities.DevPatch.update(patch.id, { status: nextStatus });
    setPatches((prev) => prev.map((p) => (p.id === patch.id ? { ...p, ...updated } : p)));
    logDevAudit({
      actor: userEmail,
      action: `patch.${nextStatus}`,
      targetType: 'patch',
      targetId: patch.id,
      details: patch.title,
      severity: nextStatus === 'approved' && ['high', 'critical'].includes(patch.risk_level) ? 'critical' : 'info',
    });
  };

  // ---- knowledge / files -------------------------------------------------
  const handleCreateDoc = async (doc) => {
    if (!activeProject) return;
    const created = await base44.entities.DevKnowledgeDoc.create({
      ...doc,
      project_id: activeProject.id,
      owner_email: userEmail,
      source_type: 'manual',
    });
    if (created) setDocs((prev) => [created, ...prev]);
  };
  const handleUpdateDoc = async (id, next) => {
    const updated = await base44.entities.DevKnowledgeDoc.update(id, next);
    setDocs((prev) => prev.map((d) => (d.id === id ? { ...d, ...updated } : d)));
  };
  const handleDeleteDoc = async (doc) => {
    await base44.entities.DevKnowledgeDoc.delete(doc.id).catch(() => null);
    setDocs((prev) => prev.filter((d) => d.id !== doc.id));
  };

  const handleCreateFile = async (file) => {
    if (!activeProject) return;
    const created = await base44.entities.DevFileReference.create({
      ...file,
      project_id: activeProject.id,
      owner_email: userEmail,
      last_seen_at: new Date().toISOString(),
    });
    if (created) setFiles((prev) => [created, ...prev]);
  };
  const handleDeleteFile = async (file) => {
    await base44.entities.DevFileReference.delete(file.id).catch(() => null);
    setFiles((prev) => prev.filter((f) => f.id !== file.id));
  };

  // ---- settings ----------------------------------------------------------
  const handleToggleProviderStatus = async (key, nextValue) => {
    if (!activeProject) return;
    const next = { ...(activeProject.provider_status || emptyProviderStatus()), [key]: nextValue };
    const updated = await base44.entities.DevProject.update(activeProject.id, { provider_status: next });
    setProjects((prev) => prev.map((p) => (p.id === activeProject.id ? { ...p, ...updated } : p)));
    logDevAudit({ actor: userEmail, action: 'settings.provider_status', targetType: 'settings', targetId: activeProject.id, details: `${key} → ${nextValue}` });
  };

  // ---- derived ----------------------------------------------------------
  const rankedKnowledge = useMemo(() => rankKnowledgeForPrompt(docs, lastPrompt), [docs, lastPrompt]);
  const promptHint = useMemo(() => {
    if (mode === 'plan') return 'Plan Mode produces a structured plan, not code.';
    if (!currentPlan) return 'Approve a plan first to enable Agent Mode.';
    if (currentPlan.approval_status !== 'approved') return 'Current plan needs approval before queuing tasks.';
    return 'Agent Mode queues a task. Tasks export as manual patches.';
  }, [mode, currentPlan]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-primary" />
      </div>
    );
  }

  return (
    <div
      className="flex min-h-screen flex-col bg-background"
      style={{
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
      }}
    >
      <DevLabHeader
        projects={projects}
        activeProject={activeProject}
        onSelectProject={handleSelectProject}
        onCreateProject={handleCreateProject}
        mode={mode}
        onChangeMode={setMode}
      />

      {/* Tabs */}
      <nav className="sticky top-[64px] z-10 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="flex overflow-x-auto px-2">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                data-no-min-touch
                className={`flex flex-shrink-0 items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                  active
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Body: canvas + inspector */}
      <div className="flex-1 px-4 py-4 pb-32 lg:pb-4">
        <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 space-y-3">
            {tab === 'plan' && (
              <DevLabPlanTab
                plan={currentPlan}
                plans={plans}
                onSelectPlan={handleSelectPlan}
                onApprove={handleApprovePlan}
                onConvertToTasks={handleConvertToTasks}
                onArchive={handleArchivePlan}
                onUpdateField={handleUpdatePlanField}
                isOwner={isOwner}
              />
            )}
            {tab === 'queue' && (
              <DevLabQueueTab
                tasks={currentTasks}
                onAdvance={handleAdvanceTask}
                onDelete={handleDeleteTask}
                onExportPatch={handleExportPatch}
                onClearQueue={handleClearQueue}
                isOwner={isOwner}
                patchBusyId={patchBusyId}
              />
            )}
            {tab === 'knowledge' && (
              <DevLabKnowledgeTab
                docs={docs}
                onCreate={handleCreateDoc}
                onUpdate={handleUpdateDoc}
                onDelete={handleDeleteDoc}
                isOwner={isOwner}
              />
            )}
            {tab === 'files' && (
              <DevLabFilesTab
                files={files}
                onCreate={handleCreateFile}
                onDelete={handleDeleteFile}
                isOwner={isOwner}
              />
            )}
            {tab === 'patches' && (
              <DevLabPatchesTab
                patches={currentPatches}
                onUpdateStatus={handleUpdatePatchStatus}
                isOwner={isOwner}
              />
            )}
            {tab === 'system' && <DevLabSystemMap />}
            {tab === 'tests' && <DevLabTestPlanTab projectId={activeProject?.id} />}
            {tab === 'settings' && (
              <DevLabSettingsTab
                project={activeProject}
                onToggleStatus={handleToggleProviderStatus}
                isOwner={isOwner}
              />
            )}
            {tab === 'audit' && <DevLabAuditTab entries={audit} />}
          </div>

          <div className="lg:sticky lg:top-[120px] lg:self-start">
            <DevLabInspector
              rankedKnowledge={rankedKnowledge}
              files={files}
              providerStatus={activeProject?.provider_status || {}}
              currentPrompt={lastPrompt}
            />
          </div>
        </div>
      </div>

      <DevLabPromptBar
        mode={mode}
        onSubmit={handleSubmitPrompt}
        busy={busy}
        disabled={!session || !activeProject}
        hint={promptHint}
      />
    </div>
  );
}