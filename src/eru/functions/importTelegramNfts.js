import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
/* global Deno */

function toNftRecord(ownerEmail, item, source) {
  return {
    owner_email: ownerEmail,
    source,
    external_id: item.external_id || `${item.collection || 'telegram'}-${item.token_id || item.name}`,
    source_message_id: item.source_message_id || '',
    name: item.name,
    collection: item.collection || 'Telegram Import',
    description: item.description || '',
    image_url: item.image_url || '',
    network: item.network || 'TON',
    contract_address: item.contract_address || '',
    token_id: item.token_id || '',
    rarity: item.rarity || '',
    metadata: item.metadata || {},
    imported_at: new Date().toISOString()
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const nfts = Array.isArray(body.nfts) ? body.nfts.filter((item) => item?.name) : [];
    const source = body.source === 'telegram_command' ? 'telegram' : 'manual';

    if (!nfts.length) {
      return Response.json({ imported: 0, items: [] });
    }

    const existing = await base44.entities.NFT.filter({ owner_email: user.email }, '-updated_date', 500);
    const existingIds = new Set((existing || []).map((item) => item.external_id).filter(Boolean));
    const fresh = nfts
      .map((item) => toNftRecord(user.email, item, source))
      .filter((item) => !existingIds.has(item.external_id));

    const created = fresh.length ? await base44.entities.NFT.bulkCreate(fresh) : [];

    const accountRows = await base44.entities.TelegramAccount.filter({ user_email: user.email }, '-updated_date', 1);
    if (accountRows?.[0]) {
      await base44.entities.TelegramAccount.update(accountRows[0].id, {
        last_sync_at: new Date().toISOString(),
        last_sync_source: body.source === 'telegram_command' ? 'telegram_command' : 'manual'
      });
    }

    return Response.json({ imported: created.length, items: created });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});