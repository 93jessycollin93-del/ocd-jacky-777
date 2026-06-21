import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
/* global Deno */

async function callTelegram(token, method, payload = {}) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok || data.ok === false) {
    throw new Error(data.description || `Telegram API request failed for ${method}`);
  }
  return data.result;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { botId, botToken, action } = await req.json();
    if (!botId || !botToken || !action) {
      return Response.json({ error: 'botId, botToken, and action are required' }, { status: 400 });
    }

    const bot = await base44.entities.TelegramBot.get(botId);
    if (!bot) {
      return Response.json({ error: 'Bot not found' }, { status: 404 });
    }

    const appBaseUrl = Deno.env.get('APP_BASE_URL');
    if (!appBaseUrl) {
      return Response.json({ error: 'APP_BASE_URL is not configured' }, { status: 500 });
    }

    if (action === 'verify') {
      const me = await callTelegram(botToken, 'getMe');
      await base44.entities.TelegramBot.update(botId, {
        bot_username: me.username || bot.bot_username || '',
        status: bot.status || 'draft',
      });
      return Response.json({ bot_username: me.username || '', ok: true });
    }

    if (action === 'activate') {
      const me = await callTelegram(botToken, 'getMe');
      const webhookUrl = `${appBaseUrl.replace(/\/$/, '')}/functions/telegramWebhook?bot_id=${botId}`;
      await callTelegram(botToken, 'setWebhook', {
        url: webhookUrl,
        allowed_updates: ['message', 'edited_message', 'channel_post', 'edited_channel_post', 'my_chat_member']
      });
      await base44.entities.TelegramBot.update(botId, {
        bot_username: me.username || bot.bot_username || '',
        webhook_url: webhookUrl,
        status: 'active',
      });
      return Response.json({ bot_username: me.username || '', webhook_url: webhookUrl, ok: true });
    }

    if (action === 'offline') {
      await callTelegram(botToken, 'deleteWebhook', { drop_pending_updates: false });
      await base44.entities.TelegramBot.update(botId, {
        status: 'offline',
      });
      return Response.json({ ok: true, offline: true });
    }

    return Response.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});