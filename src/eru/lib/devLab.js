// Jackie Dev Lab — pure helpers for plan/task/patch templates and audit logging.
// IMPORTANT: This module never claims AI generation. Templates are clearly
// labeled `source: "template"` so the UI can be honest about origin. Once a
// real provider is connected, callers can swap in AI-sourced text and set
// `source: "ai_generated"` on the resulting record.

import { base44 } from '@/eru/api/base44Client';

export const GOLDEN_RULES = [
  {
    title: 'Never fabricate live data',
    body: 'Crypto prices, portfolio values, balances, and AI outputs must never be invented. Show "Not Connected" or empty states when a real source is unavailable.',
    category: 'golden_rule',
    importance: 'pinned',
  },
  {
    title: 'Never expose secrets client-side',
    body: 'API keys, tokens, and provider credentials only live in server-side functions and platform secret stores. Frontend code must never read them.',
    category: 'golden_rule',
    importance: 'pinned',
  },
  {
    title: 'Never claim deployment or code changes happened unless verified',
    body: 'If no real execution sandbox or repo connector is configured, output is "Manual Export Available" — copyable patch instructions, not pretend file writes.',
    category: 'golden_rule',
    importance: 'pinned',
  },
  {
    title: 'Use empty states when integrations are unavailable',
    body: 'Provider not connected? Show a clear setup-required state with the exact next step instead of fake data or silent failure.',
    category: 'golden_rule',
    importance: 'pinned',
  },
  {
    title: 'Require confirmation for destructive actions',
    body: 'Delete, archive, clear-queue, and patch-approval (when high or critical risk) must go through ConfirmDialog with a clear summary of consequences.',
    category: 'golden_rule',
    importance: 'pinned',
  },
  {
    title: 'ERU prefers modular rooms and never breaks existing navigation',
    body: 'New modules attach to the existing nav system as additional rooms. They do not replace, rename, or rewire the nav.',
    category: 'business_logic',
    importance: 'high',
  },
  {
    title: 'Jackie is the assistant identity',
    body: 'All in-app development support is presented under the Jackie identity. Keep tone helpful, technical, and honest about limits.',
    category: 'business_logic',
    importance: 'high',
  },
  {
    title: 'Mobile-first UI with deep customization',
    body: 'Every screen must work on a phone first, then scale up. Surfaces respect safe-area insets. Customization is layered, never destructive.',
    category: 'design_system',
    importance: 'high',
  },
];

/**
 * Build a structured plan template from a user prompt. This is intentionally
 * a deterministic local template — the UI labels it "Template" until a real
 * AI provider is connected. The shape matches the DevPlan entity 1:1.
 */
export function buildPlanTemplate({ prompt, projectTitle }) {
  const goal = prompt?.trim() || 'Describe the goal of this change in one or two sentences.';
  const title = goal.length > 80 ? goal.slice(0, 77) + '…' : goal;

  const assumptions = [
    'The existing app shell, auth, and entity system continue to work unchanged.',
    'No live AI provider is assumed — output is treated as a planning artifact.',
    'Mobile-first behavior and safe-area insets must be preserved.',
  ].map((line) => `- ${line}`).join('\n');

  const requiredFiles = [
    '# Replace with real paths the change will touch',
    'pages/<Page>.jsx',
    'components/<Folder>/<Component>.jsx',
  ].join('\n');

  const dataModels = '# List entity changes here. State if no entity changes are needed.';
  const uiChanges = '# Describe each visible UI change — component by component.';
  const backendChanges = '# List new functions, automations, or SDK calls. State "None" if frontend-only.';
  const securityRisks = [
    '- Verify no new secrets are exposed client-side.',
    '- Confirm RLS rules cover any new entity reads/writes.',
    '- Check destructive actions require ConfirmDialog.',
  ].join('\n');
  const testingPlan = [
    '- Manual: walk the new flow on a phone-sized viewport.',
    '- Manual: confirm safe-area insets render correctly.',
    '- Manual: verify empty/error states show when providers are not connected.',
  ].join('\n');
  const rollbackPlan = 'Revert the patch by restoring the previous version of every file listed under Required Files. Audit log entries can be archived but not deleted.';

  const rawMarkdown = [
    `# ${title}`,
    `_Project: ${projectTitle || 'Untitled'} — Source: Template (no AI provider connected)_`,
    '',
    '## Goal',
    goal,
    '',
    '## Assumptions',
    assumptions,
    '',
    '## Required Files',
    requiredFiles,
    '',
    '## Data Models',
    dataModels,
    '',
    '## UI Changes',
    uiChanges,
    '',
    '## Backend Changes',
    backendChanges,
    '',
    '## Security Risks',
    securityRisks,
    '',
    '## Testing Plan',
    testingPlan,
    '',
    '## Rollback Plan',
    rollbackPlan,
  ].join('\n');

  return {
    title,
    goal,
    assumptions,
    required_files: requiredFiles,
    data_models: dataModels,
    ui_changes: uiChanges,
    backend_changes: backendChanges,
    security_risks: securityRisks,
    testing_plan: testingPlan,
    rollback_plan: rollbackPlan,
    raw_markdown: rawMarkdown,
    source: 'template',
  };
}

/**
 * Convert an approved plan into a default sequential task queue. These are
 * planning placeholders — the user fills in real implementation details or,
 * once a provider is wired, the agent regenerates each task with real output.
 */
export function buildTasksFromPlan(plan) {
  if (!plan?.id) return [];
  const base = {
    plan_id: plan.id,
    session_id: plan.session_id,
    project_id: plan.project_id,
    status: 'queued',
    priority: 'medium',
    owner_email: plan.owner_email,
  };

  return [
    { ...base, title: 'Confirm required files exist', task_type: 'manual', queue_index: 0,
      description: 'Walk the Required Files list. Add missing entries to the Files tab and flag risk.' },
    { ...base, title: 'Apply data model changes', task_type: 'data_model', queue_index: 1,
      description: 'Create or update entity JSON schemas. Re-deploy.' },
    { ...base, title: 'Apply backend changes', task_type: 'backend', queue_index: 2,
      description: 'Add or modify backend functions / automations described in the plan.' },
    { ...base, title: 'Apply UI changes', task_type: 'ui', queue_index: 3,
      description: 'Make UI edits component-by-component. Verify mobile-first behavior.' },
    { ...base, title: 'Run testing checklist', task_type: 'test', queue_index: 4,
      description: 'Walk the Testing Plan. Mark items as pass/fail. Do not claim auto-tests passed.' },
    { ...base, title: 'Document & export patch', task_type: 'doc', queue_index: 5,
      description: 'Generate a copyable patch in the Patches tab summarizing the change.' },
  ];
}

/**
 * Build a copyable manual patch description from a task. Honest output: lists
 * what the user should do, not a fake auto-applied diff.
 */
export function buildManualPatch({ task, plan }) {
  const affectedFiles = (plan?.required_files || '').split('\n')
    .map((line) => line.replace(/^[-*#\s]+/, '').trim())
    .filter((line) => line && !line.startsWith('#'));

  const diffText = [
    `# Manual implementation pack — ${task.title}`,
    '',
    `_Source: Template. No AI provider connected — apply by hand._`,
    '',
    '## Affected files',
    affectedFiles.length ? affectedFiles.map((f) => `- ${f}`).join('\n') : '- (none listed yet — add via Files tab)',
    '',
    '## What this task changes',
    task.description || '(no description)',
    '',
    '## Instructions',
    '1. Open each affected file in the editor.',
    '2. Apply the change described above following Golden Rules.',
    '3. Test on a phone-sized viewport.',
    '4. Mark this task as `manually_exported`.',
  ].join('\n');

  const instructions = 'Copy this block into your editor or chat with Jackie to refine each file.';

  // Heuristic risk: backend / data_model touches default to medium, others safe.
  const risk = ['backend', 'data_model'].includes(task.task_type) ? 'medium' : 'safe';

  return {
    title: `Patch: ${task.title}`,
    affected_files: affectedFiles,
    diff_text: diffText,
    instructions,
    risk_level: risk,
    status: 'ready',
  };
}

/**
 * Lightweight audit logger. Best-effort — failures are swallowed so they
 * never break the parent flow.
 */
export async function logDevAudit({ actor, action, targetType, targetId, details, severity = 'info' }) {
  try {
    await base44.entities.DevAuditLog.create({
      actor: actor || 'unknown',
      action,
      target_type: targetType,
      target_id: targetId,
      details: details || '',
      severity,
      owner_email: actor,
    });
  } catch {
    /* audit failure must never block the user */
  }
}

/**
 * Filter Knowledge docs that look relevant to a prompt. Pure substring
 * scoring — no AI. Used by the inspector panel.
 */
export function rankKnowledgeForPrompt(docs, prompt) {
  if (!prompt || !docs?.length) {
    return [...(docs || [])]
      .sort((a, b) => (b.importance === 'pinned' ? 1 : 0) - (a.importance === 'pinned' ? 1 : 0))
      .slice(0, 6);
  }
  const tokens = prompt.toLowerCase().split(/\W+/).filter((t) => t.length > 3);
  return [...docs]
    .map((doc) => {
      const haystack = `${doc.title} ${doc.body} ${(doc.tags || []).join(' ')}`.toLowerCase();
      const score = tokens.reduce((sum, t) => sum + (haystack.includes(t) ? 1 : 0), 0)
        + (doc.importance === 'pinned' ? 2 : 0)
        + (doc.importance === 'high' ? 1 : 0);
      return { doc, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((x) => x.doc);
}

export const PROVIDER_KEYS = ['openai', 'anthropic', 'gemini', 'github', 'deployment'];

export function emptyProviderStatus() {
  return PROVIDER_KEYS.reduce((acc, k) => { acc[k] = 'not_connected'; return acc; }, {});
}