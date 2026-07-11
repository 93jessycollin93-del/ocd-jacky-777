import { useEffect, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
  ArrowLeft,
  Play,
  Pause,
  Plus,
  Loader2,
  X,
  Music2,
  Users,
  GripVertical,
  Crown,
  UserCircle2,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  getCollabPlaylist,
  collabAddTrack,
  collabRemoveTrack,
  collabReorder,
} from '@/eru/lib/mediaLibrary';
import { useMediaPlayer } from '@/eru/context/MediaPlayerContext';
import AddTracksToPlaylistSheet from '@/eru/components/media/AddTracksToPlaylistSheet';
import CollaboratorsSheet from '@/eru/components/media/CollaboratorsSheet';

function fmt(s) {
  if (!s || !Number.isFinite(s)) return '';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}

/**
 * CollabPlaylistDetail — the shared editor for a collaborative playlist at
 * /collab/:id. Both the owner and invited collaborators use it; all reads and
 * writes go through the collaborativePlaylist service-role function so everyone
 * sees the same set of tracks regardless of who added them.
 */
export default function CollabPlaylistDetail() {
  const { id } = useParams();
  const { current, isPlaying, playList, togglePlay } = useMediaPlayer();

  const [data, setData] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [managing, setManaging] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getCollabPlaylist(id);
      if (!result?.playlist) {
        setError('This playlist is unavailable or you do not have access.');
        setData(null);
        setTracks([]);
      } else {
        setData(result);
        setTracks(result.tracks || []);
      }
    } catch {
      setError('This playlist is unavailable or you do not have access.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const onPlay = (index) => {
    const track = tracks[index];
    if (current?.id === track.id) togglePlay();
    else playList(tracks, index);
  };

  async function onRemove(track) {
    setTracks((prev) => prev.filter((t) => t._linkId !== track._linkId));
    try {
      await collabRemoveTrack(id, track._linkId);
    } catch (err) {
      toast.error(err?.message || 'Could not remove track.');
      refresh();
    }
  }

  async function handleDragEnd(result) {
    const { source, destination } = result;
    if (!destination || destination.index === source.index) return;
    const next = [...tracks];
    const [moved] = next.splice(source.index, 1);
    next.splice(destination.index, 0, moved);
    setTracks(next);
    try {
      await collabReorder(id, next.map((t) => t._linkId));
    } catch (err) {
      toast.error(err?.message || 'Could not save the new order.');
      refresh();
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (error || !data?.playlist) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background p-6 text-center">
        <Users className="h-8 w-8 text-muted-foreground/60" />
        <p className="max-w-xs text-sm text-foreground">{error || 'Playlist not available.'}</p>
        <Link to="/playlists" className="text-[13px] text-primary hover:underline">
          Back to playlists
        </Link>
      </div>
    );
  }

  const { playlist, role, collaborators = [] } = data;
  const isOwner = role === 'owner';

  return (
    <div
      className="flex min-h-screen flex-col bg-background pb-40"
      style={{
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
      }}
    >
      <header className="border-b border-border bg-card/80 px-4 py-3">
        <Link
          to="/playlists"
          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> Playlists
        </Link>
        <div className="mt-1">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Collaborative
          </p>
          <h1 className="text-xl font-semibold leading-tight text-foreground">{playlist.name}</h1>
          {playlist.description && (
            <p className="mt-0.5 line-clamp-2 text-[12px] text-muted-foreground">
              {playlist.description}
            </p>
          )}
          <p className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            {isOwner ? <Crown className="h-3 w-3" /> : <UserCircle2 className="h-3 w-3" />}
            {isOwner ? 'You own this' : `Shared by ${playlist.owner}`} · {tracks.length} track
            {tracks.length === 1 ? '' : 's'} · {collaborators.length} collaborator
            {collaborators.length === 1 ? '' : 's'}
          </p>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={() => tracks.length && playList(tracks, 0)}
            disabled={tracks.length === 0}
            className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
          >
            <Play className="h-4 w-4" /> Play all
          </button>
          <button
            onClick={() => setAdding(true)}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-border px-3 text-sm font-medium text-foreground hover:bg-accent"
          >
            <Plus className="h-4 w-4" /> Add
          </button>
          {isOwner && (
            <button
              onClick={() => setManaging(true)}
              aria-label="Manage collaborators"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border text-foreground hover:bg-accent"
            >
              <Users className="h-4 w-4" />
            </button>
          )}
        </div>
        {tracks.length > 1 && (
          <p className="mt-2 text-[11px] text-muted-foreground">Drag the handle to reorder.</p>
        )}
      </header>

      <div className="mx-auto w-full max-w-3xl flex-1 space-y-2 px-4 py-4">
        {tracks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
            <Music2 className="mx-auto h-8 w-8 text-muted-foreground/60" />
            <p className="mt-3 text-sm font-medium text-foreground">No tracks yet</p>
            <p className="mt-1 text-[12px] text-muted-foreground">
              Use “Add” to contribute tracks from your library.
            </p>
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="collab-tracks">
              {(provided) => (
                <ul ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                  {tracks.map((track, index) => {
                    const active = current?.id === track.id;
                    return (
                      <Draggable key={track._linkId} draggableId={track._linkId} index={index}>
                        {(prov, snapshot) => (
                          <li
                            ref={prov.innerRef}
                            {...prov.draggableProps}
                            className={`flex items-center gap-2 rounded-2xl border p-2.5 transition-colors ${
                              active ? 'border-primary/40 bg-primary/5' : 'border-border bg-card'
                            } ${snapshot.isDragging ? 'shadow-lg' : ''}`}
                          >
                            <span
                              {...prov.dragHandleProps}
                              aria-label="Drag to reorder"
                              className="flex h-8 w-6 flex-shrink-0 cursor-grab items-center justify-center text-muted-foreground/60 active:cursor-grabbing"
                            >
                              <GripVertical className="h-4 w-4" />
                            </span>
                            <button
                              onClick={() => onPlay(index)}
                              aria-label={active && isPlaying ? 'Pause' : 'Play'}
                              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow hover:bg-primary/90"
                            >
                              {active && isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                            </button>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-foreground">{track.title}</p>
                              <p className="truncate text-[11px] text-muted-foreground">
                                {track.artist || 'Unknown artist'}
                                {track.duration_sec ? ` · ${fmt(track.duration_sec)}` : ''}
                                {track.added_by ? ` · added by ${track.added_by}` : ''}
                              </p>
                            </div>
                            <button
                              onClick={() => onRemove(track)}
                              aria-label="Remove from playlist"
                              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </li>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </ul>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </div>

      {adding && (
        <AddTracksToPlaylistSheet
          playlistId={id}
          existingTrackIds={tracks.map((t) => t.id)}
          addFn={(trackId) => collabAddTrack(id, trackId)}
          onClose={() => setAdding(false)}
          onChanged={refresh}
        />
      )}

      {managing && isOwner && (
        <CollaboratorsSheet
          playlist={playlist}
          onClose={() => setManaging(false)}
          onChanged={refresh}
        />
      )}
    </div>
  );
}
