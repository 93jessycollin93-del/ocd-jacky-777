import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
/* global Deno */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [bots, messages, logs, sessions, comparisons] = await Promise.all([
      base44.entities.TelegramBot.list('-updated_date', 100),
      base44.entities.TelegramBotMessage.list('-created_date', 500).catch(() => []),
      base44.entities.TelegramBotLog.list('-created_date', 500).catch(() => []),
      base44.entities.TelegramBotSession.list('-updated_date', 200).catch(() => []),
      base44.entities.BotVersionComparison.list('-created_date', 100).catch(() => []),
    ]);

    return Response.json({ bots, messages, logs, sessions, comparisons });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});