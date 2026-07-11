import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
/* global Deno */

/**
 * listCollaborativePlaylists — playlists shared WITH the caller (i.e. they are a
 * collaborator but not the owner), for the "Shared with me" list.
 *
 * Uses the service-role client to read collaborator rows and the referenced
 * playlists past owner-scoped RLS. Owners find their own playlists through the
 * normal listing, so owned playlists are excluded here.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const svc = base44.asServiceRole.entities;
    const memberships = await svc.PlaylistCollaborator
      .filter({ user_email: user.email }, '-updated_date', 200)
      .catch(() => []);

    const playlists = [];
    const seen = new Set();
    for (const m of memberships) {
      if (seen.has(m.playlist_id)) continue;
      seen.add(m.playlist_id);
      const p = await svc.Playlist.get(m.playlist_id).catch(() => null);
      if (!p || p.created_by === user.email) continue;
      playlists.push({
        id: p.id,
        name: p.name,
        description: p.description || '',
        owner: p.created_by,
        track_count: p.track_count || 0,
        role: m.role || 'editor',
      });
    }

    return Response.json({ playlists });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
