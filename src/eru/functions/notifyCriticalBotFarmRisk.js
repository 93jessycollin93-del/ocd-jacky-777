import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/* global Deno */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const risk = payload?.data;

    if (!risk || risk.severity !== 'critical' || risk.status !== 'open') {
      return Response.json({ skipped: true });
    }

    const title = 'Critical Bot Farm Risk Detected';
    const message = risk.details || 'A critical risk flag was opened in Bot Farm and needs immediate attention.';

    await base44.entities.AppNotification.create({
      title,
      message,
      type: 'warning',
      category: 'bot_farm',
      is_read: false,
      link: '/bot-farm'
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});