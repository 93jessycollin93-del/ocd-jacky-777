import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
/* global Deno */

/**
 * collaborativePlaylist — read and edit a playlist as its owner OR an invited
 * collaborator.
 *
 * Base44 RLS is owner-scoped, so collaborator-added PlaylistTrack rows are
 * invisible to the owner's normal client (and vice versa). To keep a shared
 * playlist consistent, ALL reads and writes for collaborative playlists go
 * through this service-role function, which sees every contributor's rows.
 *
 * Authorization: the caller must be the playlist owner or listed in
 * PlaylistCollaborator. Adds are restricted to the caller's own tracks.
 *
 * Body: { action: 'get'|'addTrack'|'removeTrack'|'reorder', id, ... }
 */

async function authorize(svc, id, email) {
  const playlist = await svc.Playlist.get(id).catch(() => null);
  if (!playlist) return { playlist: null, role: null };
  if (playlist.created_by === email) return { playlist, role: 'owner' };
  const rows = await svc.PlaylistCollaborator
    .filter({ playlist_id: id, user_email: email }, '-updated_date', 1)
    .catch(() => []);
  return { playlist, role: rows?.length ? 'collaborator' : null };
}

async function loadTracks(svc, id) {
  const links = await svc.PlaylistTrack.filter({ playlist_id: id }, 'position', 1000).catch(() => []);
  links.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const out = [];
  for (const link of links) {
    const t = await svc.Track.get(link.track_id).catch(() => null);
    if (!t) continue;
    out.push({
      id: t.id,
      title: t.title,
      artist: t.artist,
      album: t.album,
      duration_sec: t.duration_sec,
      file_url: t.file_url,
      format: t.format,
      kind: t.kind,
      cover_url: t.cover_url,
      _linkId: link.id,
      _position: link.position,
      added_by: link.added_by || '',
    });
  }
  return out;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const action = body?.action || 'get';
    const id = body?.id;
    if (!id) return Response.json({ error: 'Missing playlist id' }, { status: 400 });

    const svc = base44.asServiceRole.entities;
    const { playlist, role } = await authorize(svc, id, user.email);
    if (!playlist) return Response.json({ error: 'Playlist not found' }, { status: 404 });
    if (!role) {
      return Response.json({ error: 'You do not have access to this playlist' }, { status: 403 });
    }

    if (action === 'get') {
      const [tracks, collaborators] = await Promise.all([
        loadTracks(svc, id),
        svc.PlaylistCollaborator.filter({ playlist_id: id }, '-updated_date', 200).catch(() => []),
      ]);
      return Response.json({
        playlist: {
          id: playlist.id,
          name: playlist.name,
          description: playlist.description || '',
          visibility: playlist.visibility,
          owner: playlist.created_by,
        },
        role,
        tracks,
        collaborators: collaborators.map((c) => ({
          id: c.id,
          user_email: c.user_email,
          role: c.role,
        })),
      });
    }

    if (action === 'addTrack') {
      const trackId = body?.trackId;
      if (!trackId) return Response.json({ error: 'Missing trackId' }, { status: 400 });
      const track = await svc.Track.get(trackId).catch(() => null);
      if (!track) return Response.json({ error: 'Track not found' }, { status: 404 });
      if (track.created_by !== user.email) {
        return Response.json({ error: 'You can only add your own tracks' }, { status: 403 });
      }
      const links = await svc.PlaylistTrack.filter({ playlist_id: id }, 'position', 1000).catch(() => []);
      if (links.some((l) => l.track_id === trackId)) {
        return Response.json({ ok: true, duplicate: true });
      }
      await svc.PlaylistTrack.create({
        playlist_id: id,
        track_id: trackId,
        position: links.length,
        added_by: user.email,
      });
      await svc.Playlist.update(id, { track_count: links.length + 1 }).catch(() => {});
      return Response.json({ ok: true });
    }

    if (action === 'removeTrack') {
      const linkId = body?.linkId;
      if (!linkId) return Response.json({ error: 'Missing linkId' }, { status: 400 });
      await svc.PlaylistTrack.delete(linkId).catch(() => {});
      const links = await svc.PlaylistTrack.filter({ playlist_id: id }, 'position', 1000).catch(() => []);
      await svc.Playlist.update(id, { track_count: links.length }).catch(() => {});
      return Response.json({ ok: true });
    }

    if (action === 'reorder') {
      const order = Array.isArray(body?.orderedLinkIds) ? body.orderedLinkIds : [];
      for (let i = 0; i < order.length; i += 1) {
        await svc.PlaylistTrack.update(order[i], { position: i }).catch(() => {});
      }
      return Response.json({ ok: true });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
