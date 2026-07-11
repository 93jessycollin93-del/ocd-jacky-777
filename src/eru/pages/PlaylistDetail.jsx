import { useEffect, useState, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
  ArrowLeft,
  Play,
  Pause,
  Plus,
  Loader2,
  Pencil,
  Check,
  Trash2,
  X,
  Music2,
  Lock,
  Globe,
  Link2,
  GripVertical,
  ListChecks,
  ListPlus,
  ListMusic,
  Share2,
  Download,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  getPlaylist,
  getPlaylistTracks,
  updatePlaylist,
  deletePlaylist,
  removeTrackFromPlaylist,
  reorderPlaylistTracks,
  listCollaborators,
} from '@/eru/lib/mediaLibrary';
import { useMediaPlayer } from '@/eru/context/MediaPlayerContext';
import { useAuth } from '@/eru/lib/AuthContext';
import { useSelection } from '@/eru/hooks/useSelection';
import AddTracksToPlaylistSheet from '@/eru/components/media/AddTracksToPlaylistSheet';
import AddToPlaylistSheet from '@/eru/components/media/AddToPlaylistSheet';
import SelectionBar from '@/eru/components/media/SelectionBar';
import ShareSheet from '@/eru/components/media/ShareSheet';
import PlaylistExportSheet from '@/eru/components/media/PlaylistExportSheet';
import CollaboratorsSheet from '@/eru/components/media/CollaboratorsSheet';

const VISIBILITY_BADGE = {
  private: { icon: Lock, label: 'Private' },
  unlisted: { icon: Link2, label: 'Unlisted' },
  public: { icon: Globe, label: 'Public' },
};

function fmt(s) {
  if (!s || !Number.isFinite(s)) return '';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export default function PlaylistDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { current, isPlaying, playList, togglePlay, addManyToQueue } = useMediaPlayer();
  const selection = useSelection();

  const [playlist, setPlaylist] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftDesc, setDraftDesc] = useState('');
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [movingSelected, setMovingSelected] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [managing, setManaging] = useState(false);
  const [collaboratorCount, setCollaboratorCount] = useState(0);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [p, t, collabs] = await Promise.all([
        getPlaylist(id),
        getPlaylistTracks(id),
        listCollaborators(id).catch(() => []),
      ]);
      setPlaylist(p);
      setTracks(t);
      setCollaboratorCount(collabs.length);
    } catch {
      setPlaylist(null);
      setTracks([]);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  function startEdit() {
    setDraftName(playlist?.name || '');
    setDraftDesc(playlist?.description || '');
    setEditing(true);
  }

  async function saveEdit() {
    const name = draftName.trim();
    if (!name || saving) return;
    setSaving(true);
    try {
      await updatePlaylist(id, { name, description: draftDesc.trim() });
      setEditing(false);
      toast.success('Playlist updated.');
      refresh();
    } catch (err) {
      toast.error(err?.message || 'Could not save changes.');
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!window.confirm('Delete this playlist? Tracks stay in your library.')) return;
    try {
      await deletePlaylist(id);
      toast.success('Playlist deleted.');
      navigate('/playlists');
    } catch (err) {
      toast.error(err?.message || 'Could not delete playlist.');
    }
  }

  async function onRemoveTrack(track) {
    try {
      await removeTrackFromPlaylist(track._linkId, id);
      setTracks((prev) => prev.filter((t) => t._linkId !== track._linkId));
    } catch (err) {
      toast.error(err?.message || 'Could not remove track.');
    }
  }

  // Drag-reorder: reflect the new order locally, then persist link positions.
  async function handleDragEnd(result) {
    const { source, destination } = result;
    if (!destination || destination.index === source.index) return;
    const next = [...tracks];
    const [moved] = next.splice(source.index, 1);
    next.splice(destination.index, 0, moved);
    setTracks(next);
    try {
      await reorderPlaylistTracks(next.map((t) => t._linkId));
    } catch (err) {
      toast.error(err?.message || 'Could not save the new order.');
      refresh();
    }
  }

  const onPlay = (index) => {
    const track = tracks[index];
    if (current?.id === track.id) togglePlay();
    else playList(tracks, index);
  };

  // ---- Bulk actions (selection mode) ----
  const selectedTracks = tracks.filter((t) => selection.isSelected(t._linkId));

  function bulkQueue() {
    addManyToQueue(selectedTracks);
    toast.success(`Added ${selectedTracks.length} to the queue.`);
    selection.exit();
  }

  async function bulkRemove() {
    const toRemove = selectedTracks;
    if (toRemove.length === 0) return;
    selection.exit();
    try {
      for (const t of toRemove) {
        await removeTrackFromPlaylist(t._linkId, id);
      }
      setTracks((prev) => prev.filter((t) => !toRemove.some((r) => r._linkId === t._linkId)));
      toast.success(`Removed ${toRemove.length} from the playlist.`);
    } catch (err) {
      toast.error(err?.message || 'Could not remove tracks.');
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

  if (!playlist) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background p-6 text-center">
        <p className="text-sm text-foreground">Playlist not found.</p>
        <Link to="/playlists" className="text-[13px] text-primary hover:underline">
          Back to playlists
        </Link>
      </div>
    );
  }

  const badge = VISIBILITY_BADGE[playlist.visibility] || VISIBILITY_BADGE.private;
  const Badge = badge.icon;
  const selecting = selection.active;

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

        {editing ? (
          <div className="mt-2 space-y-2">
            <input
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              placeholder="Playlist name"
              className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm font-semibold text-foreground outline-none focus:border-primary"
            />
            <textarea
              value={draftDesc}
              onChange={(e) => setDraftDesc(e.target.value)}
              placeholder="Description (optional)"
              rows={2}
              className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-[13px] text-foreground outline-none focus:border-primary"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={saveEdit}
                disabled={!draftName.trim() || saving}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Save
              </button>
              <button
                onClick={() => setEditing(false)}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border px-3 text-sm text-foreground hover:bg-accent"
              >
                <X className="h-4 w-4" /> Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-1 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h1 className="truncate text-xl font-semibold leading-tight text-foreground">
                {playlist.name}
              </h1>
              {playlist.description && (
                <p className="mt-0.5 line-clamp-2 text-[12px] text-muted-foreground">
                  {playlist.description}
                </p>
              )}
              <p className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Badge className="h-3 w-3" /> {badge.label} · {tracks.length} track
                {tracks.length === 1 ? '' : 's'}
              </p>
            </div>
            <div className="flex flex-shrink-0 items-center gap-1">
              <button
                onClick={() => setSharing(true)}
                aria-label="Share playlist"
                className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <Share2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setManaging(true)}
                aria-label="Manage collaborators"
                className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <Users className="h-4 w-4" />
              </button>
              <button
                onClick={() => setExporting(true)}
                aria-label="Export playlist"
                className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <Download className="h-4 w-4" />
              </button>
              <button
                onClick={startEdit}
                aria-label="Edit playlist"
                className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={onDelete}
                aria-label="Delete playlist"
                className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Actions */}
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
          {tracks.length > 0 && (
            <button
              onClick={selecting ? selection.exit : selection.enter}
              aria-pressed={selecting}
              className={`inline-flex h-10 items-center gap-1.5 rounded-xl border px-3 text-sm font-medium transition-colors ${
                selecting
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'border-border text-foreground hover:bg-accent'
              }`}
            >
              <ListChecks className="h-4 w-4" /> Select
            </button>
          )}
        </div>
        {tracks.length > 1 && !selecting && (
          <p className="mt-2 text-[11px] text-muted-foreground">
            Drag the handle to reorder.
          </p>
        )}
      </header>

      <div className="mx-auto w-full max-w-3xl flex-1 space-y-2 px-4 py-4">
        {collaboratorCount > 0 && (
          <Link
            to={`/collab/${id}`}
            className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 p-3 text-[12px] text-foreground hover:bg-primary/15"
          >
            <Users className="h-4 w-4 flex-shrink-0 text-primary" />
            <span className="flex-1">
              Shared with {collaboratorCount} collaborator{collaboratorCount === 1 ? '' : 's'}. Open
              the collaborative editor to see everyone’s tracks.
            </span>
          </Link>
        )}
        {tracks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
            <Music2 className="mx-auto h-8 w-8 text-muted-foreground/60" />
            <p className="mt-3 text-sm font-medium text-foreground">No tracks yet</p>
            <p className="mt-1 text-[12px] text-muted-foreground">
              Use “Add” to pull songs from your library.
            </p>
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="playlist-tracks" isDropDisabled={selecting}>
              {(provided) => (
                <ul
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="space-y-2"
                >
                  {tracks.map((track, index) => {
                    const active = current?.id === track.id;
                    const checked = selection.isSelected(track._linkId);
                    return (
                      <Draggable
                        key={track._linkId}
                        draggableId={track._linkId}
                        index={index}
                        isDragDisabled={selecting}
                      >
                        {(prov, snapshot) => (
                          <li
                            ref={prov.innerRef}
                            {...prov.draggableProps}
                            onClick={selecting ? () => selection.toggle(track._linkId) : undefined}
                            className={`flex items-center gap-2 rounded-2xl border p-2.5 transition-colors ${
                              checked
                                ? 'border-primary bg-primary/10'
                                : active
                                ? 'border-primary/40 bg-primary/5'
                                : 'border-border bg-card'
                            } ${snapshot.isDragging ? 'shadow-lg' : ''}`}
                          >
                            {selecting ? (
                              <span
                                className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border ${
                                  checked
                                    ? 'border-primary bg-primary text-primary-foreground'
                                    : 'border-border'
                                }`}
                              >
                                {checked && <Check className="h-3.5 w-3.5" />}
                              </span>
                            ) : (
                              <span
                                {...prov.dragHandleProps}
                                aria-label="Drag to reorder"
                                className="flex h-8 w-6 flex-shrink-0 cursor-grab items-center justify-center text-muted-foreground/60 active:cursor-grabbing"
                              >
                                <GripVertical className="h-4 w-4" />
                              </span>
                            )}

                            {!selecting && (
                              <button
                                onClick={() => onPlay(index)}
                                aria-label={active && isPlaying ? 'Pause' : 'Play'}
                                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow hover:bg-primary/90"
                              >
                                {active && isPlaying ? (
                                  <Pause className="h-4 w-4" />
                                ) : (
                                  <Play className="h-4 w-4" />
                                )}
                              </button>
                            )}

                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-foreground">
                                {track.title}
                              </p>
                              <p className="truncate text-[11px] text-muted-foreground">
                                {track.artist || 'Unknown artist'}
                                {track.duration_sec ? ` · ${fmt(track.duration_sec)}` : ''}
                              </p>
                            </div>

                            {!selecting && (
                              <button
                                onClick={() => onRemoveTrack(track)}
                                aria-label="Remove from playlist"
                                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
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

      {selecting && (
        <SelectionBar
          count={selection.count}
          total={tracks.length}
          onSelectAll={() => selection.selectAll(tracks.map((t) => t._linkId))}
          onClear={selection.clear}
          onExit={selection.exit}
        >
          <button
            onClick={bulkQueue}
            disabled={selection.count === 0}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border px-2.5 text-[12px] text-foreground hover:bg-accent disabled:opacity-50"
          >
            <ListPlus className="h-4 w-4" /> Queue
          </button>
          <button
            onClick={() => selection.count && setMovingSelected(true)}
            disabled={selection.count === 0}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border px-2.5 text-[12px] text-foreground hover:bg-accent disabled:opacity-50"
          >
            <ListMusic className="h-4 w-4" /> Add to
          </button>
          <button
            onClick={bulkRemove}
            disabled={selection.count === 0}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border px-2.5 text-[12px] text-destructive hover:bg-destructive/10 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" /> Remove
          </button>
        </SelectionBar>
      )}

      {adding && (
        <AddTracksToPlaylistSheet
          playlistId={id}
          existingTrackIds={tracks.map((t) => t.id)}
          userEmail={user?.email || ''}
          onClose={() => setAdding(false)}
          onChanged={refresh}
        />
      )}

      {movingSelected && (
        <AddToPlaylistSheet
          tracks={selectedTracks}
          userEmail={user?.email || ''}
          onClose={() => {
            setMovingSelected(false);
            selection.exit();
          }}
        />
      )}

      {sharing && (
        <ShareSheet
          playlist={playlist}
          onClose={() => setSharing(false)}
          onChanged={refresh}
        />
      )}

      {exporting && (
        <PlaylistExportSheet
          playlist={playlist}
          tracks={tracks}
          onClose={() => setExporting(false)}
        />
      )}

      {managing && (
        <CollaboratorsSheet
          playlist={{ ...playlist, owner: playlist.created_by }}
          onClose={() => setManaging(false)}
          onChanged={refresh}
        />
      )}
    </div>
  );
}
