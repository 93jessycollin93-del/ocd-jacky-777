import { base44 } from '@/eru/api/base44Client';

export async function createDecisionPlan({ goal, bots, userGuidance = [] }) {
  const response = await base44.integrations.Core.InvokeLLM({
    prompt: `You are an AI orchestration director for a connected bot network.
Goal: ${goal}
Bots: ${bots.map((bot) => `${bot.id} | ${bot.name} | role=${bot.role} | personality=${bot.personality || 'none'} | instructions=${bot.instructions || 'none'} | handoff=${bot.handoff_instructions || 'none'} | connected=${(bot.connected_bot_ids || []).length}`).join('\n')}
User guidance: ${userGuidance.length ? userGuidance.join(' | ') : 'None'}

Return a JSON object with:
- selected_bot_ids: array of the best bots to involve
- delegations: array of {bot_id, assignment, reason, dependencies}
- communication_bridges: array of short strings describing which bots should exchange context and why
- conflict_risks: array of {type, bots_involved, issue, resolution}
- redundancy_risks: array of {bots_involved, issue, resolution}
- efficiency_notes: array of short notes

Rules:
- Select the smallest effective set of bots.
- Prefer bots already connected through the network when it helps.
- Avoid duplicate work unless redundancy is useful for validation.
- Keep assignments specific and complementary.`,
    response_json_schema: {
      type: 'object',
      properties: {
        selected_bot_ids: { type: 'array', items: { type: 'string' } },
        delegations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              bot_id: { type: 'string' },
              assignment: { type: 'string' },
              reason: { type: 'string' },
              dependencies: { type: 'array', items: { type: 'string' } }
            },
            required: ['bot_id', 'assignment', 'reason', 'dependencies']
          }
        },
        communication_bridges: { type: 'array', items: { type: 'string' } },
        conflict_risks: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              bots_involved: { type: 'array', items: { type: 'string' } },
              issue: { type: 'string' },
              resolution: { type: 'string' }
            },
            required: ['type', 'bots_involved', 'issue', 'resolution']
          }
        },
        redundancy_risks: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              bots_involved: { type: 'array', items: { type: 'string' } },
              issue: { type: 'string' },
              resolution: { type: 'string' }
            },
            required: ['bots_involved', 'issue', 'resolution']
          }
        },
        efficiency_notes: { type: 'array', items: { type: 'string' } }
      },
      required: ['selected_bot_ids', 'delegations', 'communication_bridges', 'conflict_risks', 'redundancy_risks', 'efficiency_notes']
    }
  });

  return response;
}

export async function resolveFindingConflicts({ goal, findings, feedback }) {
  const response = await base44.integrations.Core.InvokeLLM({
    prompt: `You are a collaboration conflict resolver.
Goal: ${goal}
Findings:\n${findings.map((item) => `${item.bot_name}: ${item.finding}`).join('\n\n')}
Feedback:\n${feedback.map((item) => `${item.reviewer_bot_name}: ${item.feedback}`).join('\n\n')}

Return JSON with:
- resolved_summary: short synthesis of conflicts and redundancies
- actions: array of short conflict-resolution actions
- winning_findings: array of strings naming the most reliable bot findings to prioritize`,
    response_json_schema: {
      type: 'object',
      properties: {
        resolved_summary: { type: 'string' },
        actions: { type: 'array', items: { type: 'string' } },
        winning_findings: { type: 'array', items: { type: 'string' } }
      },
      required: ['resolved_summary', 'actions', 'winning_findings']
    }
  });

  return response;
}

export async function analyzeNetworkImprovements({ bots, result }) {
  const response = await base44.integrations.Core.InvokeLLM({
    prompt: `You are an AI collaboration efficiency analyst.
Bots in network:\n${bots.map((bot) => `${bot.name} | role=${bot.role} | connected=${(bot.connected_bot_ids || []).join(', ') || 'none'} | handoff=${bot.handoff_instructions || 'none'}`).join('\n')}
Recent collaboration result:\n${JSON.stringify(result, null, 2)}

Return JSON with:
- efficiency_score: number 1-10
- network_improvements: array of short suggestions for bot connections or structure
- handoff_improvements: array of short suggestions for handoff instruction upgrades
- monitoring_summary: one short paragraph`,
    response_json_schema: {
      type: 'object',
      properties: {
        efficiency_score: { type: 'number' },
        network_improvements: { type: 'array', items: { type: 'string' } },
        handoff_improvements: { type: 'array', items: { type: 'string' } },
        monitoring_summary: { type: 'string' }
      },
      required: ['efficiency_score', 'network_improvements', 'handoff_improvements', 'monitoring_summary']
    }
  });

  return response;
}