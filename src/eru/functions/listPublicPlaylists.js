import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
/* global Deno */

/**
 * listPublicPlaylists — lists playlists marked public, across all users, for
 * community browse.
 *
 * Uses the service-role client to read past owner-scoped RLS, but only ever
 * returns playlists whose visibility is exactly "public" (unlisted and private
 * playlists are excluded). Returns lightweight metadata only — no track/file
 * URLs; those are fetched per playlist through getSharedPlaylist when a viewer
 * opens one. The caller must be authenticated.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const url = new URL(req.url);
    const q = String(body?.q ?? url.searchParams.get('q') ?? '').trim().toLowerCase();
    const limit = Number(body?.limit ?? url.searchParams.get('limit') ?? 60);

    const svc = base44.asServiceRole.entities;
    const rows = await svc.Playlist
      .filter({ visibility: 'public' }, '-updated_date', 500)
      .catch(() => []);

    const matched = q
      ? rows.filter((p) =>
          [p.name, p.description].filter(Boolean).some((v) => v.toLowerCase().includes(q)),
        )
      : rows;

    const playlists = matched.slice(0, limit).map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description || '',
      owner: p.created_by,
      track_count: p.track_count || 0,
      updated_date: p.updated_date,
    }));

    return Response.json({ playlists });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
