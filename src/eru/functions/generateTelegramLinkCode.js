import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
/* global Deno */

function makeCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const existing = await base44.entities.TelegramAccount.filter({ user_email: user.email }, '-updated_date', 1);
    const linkCode = makeCode();
    const payload = {
      user_email: user.email,
      link_code: linkCode,
      link_status: 'pending'
    };

    let account;
    if (existing?.[0]) {
      account = await base44.entities.TelegramAccount.update(existing[0].id, payload);
    } else {
      account = await base44.entities.TelegramAccount.create(payload);
    }

    return Response.json({
      link_code: linkCode,
      account
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});