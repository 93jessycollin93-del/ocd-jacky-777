import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
/* global Deno */

/**
 * getSharedPlaylist — resolves a playlist + its tracks for a viewer who may not
 * be the owner.
 *
 * Base44 row-level security is owner-scoped, so a non-owner cannot read another
 * user's playlist with the normal client. This function runs server-side and
 * uses the service-role client to read the playlist, but only RETURNS it when it
 * is shared (public/unlisted) or the caller is the owner. Private playlists are
 * never exposed to non-owners — privacy is enforced here, not on the client.
 *
 * A public/unlisted playlist shares its tracks' audio file URLs (the current
 * sharing model). The caller must be authenticated.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    let id = url.searchParams.get('id');
    if (!id) {
      const body = await req.json().catch(() => ({}));
      id = body?.id;
    }
    if (!id) {
      return Response.json({ error: 'Missing playlist id' }, { status: 400 });
    }

    const svc = base44.asServiceRole.entities;

    const playlist = await svc.Playlist.get(id).catch(() => null);
    if (!playlist) {
      return Response.json({ error: 'Playlist not found' }, { status: 404 });
    }

    const isShared = playlist.visibility === 'public' || playlist.visibility === 'unlisted';
    const isOwner = playlist.created_by === user.email;
    if (!isShared && !isOwner) {
      return Response.json({ error: 'This playlist is private' }, { status: 403 });
    }

    const links = await svc.PlaylistTrack
      .filter({ playlist_id: id }, 'position', 1000)
      .catch(() => []);
    links.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

    const tracks = [];
    for (const link of links) {
      const t = await svc.Track.get(link.track_id).catch(() => null);
      if (!t) continue;
      tracks.push({
        id: t.id,
        title: t.title,
        artist: t.artist,
        album: t.album,
        duration_sec: t.duration_sec,
        file_url: t.file_url, // audio files are shared in the current model
        format: t.format,
        kind: t.kind,
        cover_url: t.cover_url,
      });
    }

    return Response.json({
      playlist: {
        id: playlist.id,
        name: playlist.name,
        description: playlist.description || '',
        visibility: playlist.visibility,
        owner: playlist.created_by,
        is_owner: isOwner,
        track_count: tracks.length,
      },
      tracks,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
