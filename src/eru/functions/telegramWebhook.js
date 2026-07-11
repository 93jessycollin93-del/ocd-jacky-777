import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
/* global Deno */

function parseSyncPayload(text) {
  const raw = text.replace('/sync', '').trim();
  if (!raw) return [];
  return raw.split('\n').map((line, index) => {
    const parts = line.split('|').map((item) => item.trim());
    return {
      name: parts[0] || `Telegram NFT ${index + 1}`,
      collection: parts[1] || 'Telegram Import',
      token_id: parts[2] || '',
      image_url: parts[3] || '',
      network: parts[4] || 'TON',
      external_id: `${parts[1] || 'telegram'}-${parts[2] || parts[0] || index + 1}`,
      metadata: {
        raw_line: line
      }
    };
  }).filter((item) => item.name);
}

async function chooseExperimentVariant(base44, telegramBot) {
  const experiments = await base44.asServiceRole.entities.TelegramBotExperiment.filter({
    bot_id: telegramBot.id,
    status: 'running'
  }, '-updated_date', 1).catch(() => []);

  const experiment = experiments?.[0];
  if (!experiment || experiment.traffic_source === 'sandbox_only') {
    return null;
  }

  const runRows = await base44.asServiceRole.entities.TelegramBotExperimentRun.filter({
    experiment_id: experiment.id
  }, '-created_date', 500).catch(() => []);

  const aCount = runRows.filter((run) => run.variant === 'a').length;
  const bCount = runRows.filter((run) => run.variant === 'b').length;
  const variant = aCount <= bCount ? 'a' : 'b';

  return {
    experiment,
    variant,
    prompt: variant === 'a' ? experiment.variant_a_prompt : experiment.variant_b_prompt,
    conversionKeywords: experiment.conversion_keywords || []
  };
}

async function runTelegramSwarm({ base44, telegramBot, incomingText, userContext, sessionContext }) {
  const routerBot = telegramBot?.router_bot_id
    ? await base44.asServiceRole.entities.UserBot.get(telegramBot.router_bot_id).catch(() => null)
    : null;

  const specialistBots = telegramBot?.specialist_bot_ids?.length
    ? await Promise.all(telegramBot.specialist_bot_ids.map((id) => base44.asServiceRole.entities.UserBot.get(id).catch(() => null))).then((rows) => rows.filter(Boolean))
    : [];

  if (!telegramBot?.swarm_enabled || !routerBot || specialistBots.length === 0) {
    return null;
  }

  const maxSpecialists = Math.max(1, Math.min(Number(telegramBot?.max_specialists_per_request || 6), 24));
  const backendSwarmSize = Math.max(specialistBots.length, Number(telegramBot?.backend_swarm_size || specialistBots.length || 0));

  const experimentSelection = await chooseExperimentVariant(base44, telegramBot);
  const routingTemplate = experimentSelection?.prompt || telegramBot.swarm_goal_template || 'Route the request to the best specialists and synthesize a final reply.';

  const routerContext = `You are ${routerBot.name}, the master router bot for a Telegram front-door bot.
Router instructions: ${routerBot.instructions || ''}
Front-door role: ${telegramBot.front_door_role || 'general'}
Execution mode: ${telegramBot.swarm_execution_mode || 'targeted'}
Represented backend swarm size: ${backendSwarmSize}
Max specialists to invoke now: ${maxSpecialists}
Telegram routing template: ${routingTemplate}
Incoming Telegram message: ${incomingText}
User context: ${userContext}
Session context: ${sessionContext || 'No stored session context.'}
Specialists available: ${specialistBots.map((bot) => `${bot.id} | ${bot.name} | ${bot.role}`).join('\n')}
`;

  const routingPlan = await base44.integrations.Core.InvokeLLM({
    prompt: `${routerContext}

Return JSON with:
- selected_bot_ids: array of specialist bot ids to use
- delegation_notes: object mapping bot id to a short delegated assignment
- final_synthesis_instruction: short instruction for combining specialist results`,
    response_json_schema: {
      type: 'object',
      properties: {
        selected_bot_ids: { type: 'array', items: { type: 'string' } },
        delegation_notes: {
          type: 'object',
          additionalProperties: { type: 'string' }
        },
        final_synthesis_instruction: { type: 'string' }
      },
      required: ['selected_bot_ids', 'delegation_notes', 'final_synthesis_instruction']
    }
  });

  const selectedSpecialists = specialistBots.filter((bot) => routingPlan.selected_bot_ids.includes(bot.id)).slice(0, maxSpecialists);
  const specialistResults = [];

  for (const bot of selectedSpecialists) {
    const specialistContext = `You are ${bot.name}, a ${bot.role} specialist bot.
Instructions: ${bot.instructions || ''}
Incoming Telegram message: ${incomingText}
User context: ${userContext}
Session context: ${sessionContext || 'No stored session context.'}
Delegated assignment: ${routingPlan.delegation_notes?.[bot.id] || 'Contribute your best specialist response.'}
Provide a concise specialist contribution for the router.`;
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: specialistContext
    });
    specialistResults.push({
      bot_id: bot.id,
      bot_name: bot.name,
      delegated_assignment: routingPlan.delegation_notes?.[bot.id] || 'Contribute your best specialist response.',
      prompt_context: specialistContext,
      result
    });
  }

  const finalReply = await base44.integrations.Core.InvokeLLM({
    prompt: `You are ${routerBot.name}, the master router bot.
Incoming Telegram message: ${incomingText}
Synthesis instruction: ${routingPlan.final_synthesis_instruction}
Specialist results:
${specialistResults.map((item) => `${item.bot_name}: ${item.result}`).join('\n\n')}

Write the final Telegram reply in a clear, direct, compact format.`
  });

  return {
    reply: finalReply,
    specialists_used: specialistResults.map((item) => item.bot_name),
    trace: specialistResults,
    routing_plan: routingPlan,
    router_context: routerContext,
    represented_swarm_size: backendSwarmSize,
    invoked_specialist_count: selectedSpecialists.length,
    experiment: experimentSelection
  };
}

function shouldHandleGroupMessage({ telegramBot, message, text }) {
  const chatType = message?.chat?.type || '';
  const isChannel = chatType === 'channel';
  const isGroupLike = ['group', 'supergroup'].includes(chatType);
  const botUsername = telegramBot?.bot_username ? `@${String(telegramBot.bot_username).toLowerCase()}` : '';
  const normalizedText = String(text || '');
  const lowerText = normalizedText.toLowerCase();
  const isCommand = normalizedText.trim().startsWith('/');
  const isMentioned = botUsername ? lowerText.includes(botUsername) : false;

  if (isChannel) {
    if (!telegramBot?.channel_post_responses_enabled) return false;
  }

  if (isGroupLike) {
    if (!telegramBot?.group_responses_enabled) return false;
  }

  const mode = telegramBot?.group_response_mode || 'commands_only';
  if (mode === 'always_reply') return true;
  if (mode === 'mention_only') return isMentioned;
  return isCommand;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);
    const targetBotId = url.searchParams.get('bot_id') || '';
    const body = await req.json().catch(() => ({}));
    const message = body.message || body.edited_message || body.channel_post || body.edited_channel_post;
    const text = message?.text || message?.caption || '';

    if (!message) {
      return Response.json({ ok: true, ignored: true });
    }

    const telegramUserId = String(message?.from?.id || '');
    const telegramUsername = message?.from?.username || '';
    const telegramDisplayName = [message?.from?.first_name, message?.from?.last_name].filter(Boolean).join(' ').trim();
    const botUsername = body?.message?.via_bot?.username || body?.my_chat_member?.from?.username || body?.message?.chat?.username || '';

    if (!text.startsWith('/link') && !text.startsWith('/sync')) {
      const availableBots = await base44.asServiceRole.entities.TelegramBot.list('-updated_date', 100).catch(() => []);
      const activeTelegramBot = availableBots.find((bot) => bot.id === targetBotId) || availableBots.find((bot) => bot.status === 'active' && (!botUsername || bot.bot_username === botUsername)) || availableBots.find((bot) => bot.status === 'active' && bot.swarm_enabled);

      if (activeTelegramBot?.swarm_enabled && shouldHandleGroupMessage({ telegramBot: activeTelegramBot, message, text })) {
        const existingSessions = await base44.asServiceRole.entities.TelegramBotSession.filter({
          bot_id: activeTelegramBot.id,
          telegram_chat_id: String(message?.chat?.id || '')
        }, '-updated_date', 1).catch(() => []);
        const existingSession = existingSessions?.[0] || null;

        const swarmResult = await runTelegramSwarm({
          base44,
          telegramBot: activeTelegramBot,
          incomingText: text,
          userContext: `Telegram user: ${telegramDisplayName || telegramUsername || telegramUserId}`,
          sessionContext: existingSession?.context_override || existingSession?.memory_summary || ''
        });

        if (swarmResult) {
          const nextHistory = [
            ...((existingSession?.swarm_history || []).slice(-9)),
            {
              created_at: new Date().toISOString(),
              user_message: text,
              router_context: swarmResult.router_context,
              routing_plan: swarmResult.routing_plan,
              router_bot_name: activeTelegramBot.name,
              specialist_contexts: swarmResult.trace,
              final_reply: swarmResult.reply
            }
          ];

          const updatedSession = existingSession
            ? await base44.asServiceRole.entities.TelegramBotSession.update(existingSession.id, {
                telegram_user_id: telegramUserId,
                telegram_username: telegramUsername,
                last_user_message: text,
                last_bot_response: swarmResult.reply,
                last_message_at: new Date().toISOString(),
                message_count: Number(existingSession.message_count || 0) + 1,
                swarm_history: nextHistory
              })
            : await base44.asServiceRole.entities.TelegramBotSession.create({
                bot_id: activeTelegramBot.id,
                telegram_chat_id: String(message?.chat?.id || ''),
                telegram_user_id: telegramUserId,
                telegram_username: telegramUsername,
                last_user_message: text,
                last_bot_response: swarmResult.reply,
                memory_summary: '',
                message_count: 1,
                last_message_at: new Date().toISOString(),
                swarm_history: nextHistory
              });

          if (swarmResult.experiment?.experiment?.id && swarmResult.experiment?.variant) {
            const conversionKeywords = (swarmResult.experiment.conversionKeywords || []).map((item) => String(item).toLowerCase());
            const replyLower = String(swarmResult.reply || '').toLowerCase();
            const converted = conversionKeywords.some((keyword) => keyword && replyLower.includes(keyword));
            const engaged = Number(updatedSession?.message_count || existingSession?.message_count || 0) >= Number(swarmResult.experiment.experiment.engagement_threshold_messages || 2);

            await base44.asServiceRole.entities.TelegramBotExperimentRun.create({
              experiment_id: swarmResult.experiment.experiment.id,
              bot_id: activeTelegramBot.id,
              variant: swarmResult.experiment.variant,
              source: 'live',
              session_id: updatedSession.id,
              input_message: text,
              output_message: swarmResult.reply,
              engaged,
              converted,
              score_snapshot: {
                specialists_used: swarmResult.specialists_used,
                invoked_specialist_count: swarmResult.invoked_specialist_count
              }
            });
          }

          return Response.json({ ok: true, swarm: true, reply: swarmResult.reply, specialists_used: swarmResult.specialists_used, trace: swarmResult.trace, represented_swarm_size: swarmResult.represented_swarm_size, invoked_specialist_count: swarmResult.invoked_specialist_count });
        }
      }

      return Response.json({ ok: true, ignored: true });
    }

    if (text.startsWith('/link')) {
      const code = text.replace('/link', '').trim().toUpperCase();
      if (!code) {
        return Response.json({ ok: true, message: 'Missing link code' });
      }

      const matches = await base44.asServiceRole.entities.TelegramAccount.filter({ link_code: code }, '-updated_date', 1);
      const account = matches?.[0];
      if (!account) {
        return Response.json({ ok: true, message: 'Invalid link code' });
      }

      await base44.asServiceRole.entities.TelegramAccount.update(account.id, {
        telegram_user_id: telegramUserId,
        telegram_username: telegramUsername,
        telegram_display_name: telegramDisplayName,
        link_status: 'linked',
        linked_at: new Date().toISOString()
      });

      return Response.json({ ok: true, linked: true });
    }

    if (text.startsWith('/sync')) {
      const accounts = await base44.asServiceRole.entities.TelegramAccount.filter({ telegram_user_id: telegramUserId }, '-updated_date', 1);
      const account = accounts?.[0];
      if (!account?.user_email) {
        return Response.json({ ok: true, message: 'Account not linked' });
      }

      const payload = parseSyncPayload(text);
      if (!payload.length) {
        return Response.json({ ok: true, message: 'No NFT payload found' });
      }

      const existing = await base44.asServiceRole.entities.NFT.filter({ owner_email: account.user_email }, '-updated_date', 500);
      const existingIds = new Set((existing || []).map((item) => item.external_id).filter(Boolean));
      const fresh = payload
        .filter((item) => !existingIds.has(item.external_id))
        .map((item) => ({
          owner_email: account.user_email,
          source: 'telegram',
          source_message_id: String(message?.message_id || ''),
          name: item.name,
          collection: item.collection,
          image_url: item.image_url,
          network: item.network,
          token_id: item.token_id,
          external_id: item.external_id,
          metadata: item.metadata,
          imported_at: new Date().toISOString()
        }));

      if (fresh.length) {
        await base44.asServiceRole.entities.NFT.bulkCreate(fresh);
      }

      await base44.asServiceRole.entities.TelegramAccount.update(account.id, {
        last_sync_at: new Date().toISOString(),
        last_sync_source: 'telegram_command'
      });

      return Response.json({ ok: true, imported: fresh.length });
    }

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});