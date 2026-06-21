import { base44 } from '@/eru/api/base44Client';

export async function runCustomAgentTask(task, bot, globalPolicy = null) {
  const startedAt = Date.now();
  const run = await base44.entities.AgentTaskRun.create({
    task_id: task.id,
    task_name: task.name,
    bot_id: bot.id,
    bot_name: bot.name,
    trigger_type: task.trigger_type,
    action_type: task.action_type,
    status: 'running',
    result_summary: 'Task started',
    details: task.workflow_prompt || '',
  });

  const policyBlock = globalPolicy?.is_active ? `\nGlobal instructions: ${globalPolicy.shared_instructions || 'None'}\nSafety guardrails: ${globalPolicy.safety_guardrails || 'None'}\n${globalPolicy.require_human_review ? 'Recommend human review for risky actions.\n' : ''}` : '';
  const output = await base44.integrations.Core.InvokeLLM({
    prompt: `You are ${bot.name}. ${bot.instructions || ''}${policyBlock}\n\nWorkflow type: ${task.action_type}\nTrigger type: ${task.trigger_type}\nTask description: ${task.description || task.name}\nData sources: ${(task.data_sources || []).join(', ') || 'None'}\nWorkflow instructions: ${task.workflow_prompt || 'Execute safely and summarize the result.'}\n\nReturn a short execution summary plus the key action taken.`,
  });

  const duration = Date.now() - startedAt;
  await base44.entities.AgentTaskRun.update(run.id, {
    status: 'success',
    duration_ms: duration,
    result_summary: typeof output === 'string' ? output.slice(0, 280) : 'Completed successfully',
    details: typeof output === 'string' ? output : JSON.stringify(output),
  });

  const nextRunCount = (task.run_count || 0) + 1;
  const nextSuccessCount = (task.success_count || 0) + 1;
  const previousAverage = Number(task.avg_duration_ms || 0);
  const nextAverage = previousAverage === 0 ? duration : Math.round((previousAverage + duration) / 2);

  await base44.entities.AgentTask.update(task.id, {
    run_count: nextRunCount,
    success_count: nextSuccessCount,
    last_run_at: new Date().toISOString(),
    last_result: typeof output === 'string' ? output.slice(0, 280) : 'Completed successfully',
    avg_duration_ms: nextAverage,
  });

  return { output, duration };
}