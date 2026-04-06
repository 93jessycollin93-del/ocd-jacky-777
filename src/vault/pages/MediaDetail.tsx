import { useState } from 'react';
import { ArrowLeft, Play, Clock, HardDrive, Tag, Pencil, Trash2, ArrowRight, AlertCircle } from 'lucide-react';
import { SourceBadge } from '../components/SourceBadge';
import { MediaStatusBadge } from '../components/StatusBadge';
import { formatDuration, formatFileSize, isProcessableSource, type MediaItem } from '../types';

interface MediaDetailProps {
  item: MediaItem;
  onBack: () => void;
  onConvert: (item: MediaItem) => void;
}

export function MediaDetail({ item, onBack, onConvert }: MediaDetailProps) {
  const [notes, setNotes] = useState(item.notes);
  const canProcess = isProcessableSource(item.sourceType);
  const isVideo = item.mimeType.startsWith('video/');
  const isAudio = item.mimeType.startsWith('audio/');

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 -ml-2 min-h-[44px] min-w-[44px] flex items-center justify-center">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-medium text-foreground truncate">{item.title}</h1>
          <p className="text-[11px] font-mono text-muted-foreground truncate">{item.originalFilename || 'No file'}</p>
        </div>
      </div>

      {/* Preview */}
      <div className="relative w-full aspect-video rounded-sm bg-secondary/50 border border-border flex items-center justify-center overflow-hidden">
        {isVideo && (
          <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center">
            <Play className="w-6 h-6 text-primary ml-1" />
          </div>
        )}
        {isAudio && (
          <div className="flex items-end gap-1 h-12">
            {Array.from({ length: 24 }).map((_, i) => (
              <div
                key={i}
                className="w-1 bg-primary/30 rounded-full"
                style={{ height: `${20 + Math.sin(i * 0.5) * 30 + Math.random() * 20}%` }}
              />
            ))}
          </div>
        )}
        {!isVideo && !isAudio && (
          <span className="text-3xl opacity-30">
            {item.sourceType === 'external_reference_only' ? '🔗' : '📄'}
          </span>
        )}

        {item.duration && (
          <span className="absolute bottom-2 right-2 px-2 py-1 text-xs font-mono bg-background/80 text-foreground rounded-sm backdrop-blur-sm">
            {formatDuration(item.duration)}
          </span>
        )}
      </div>

      {/* Classification */}
      <div className="flex items-center gap-2 flex-wrap">
        <SourceBadge sourceType={item.sourceType} size="md" />
        <MediaStatusBadge status={item.status} />
      </div>

      {/* Reference warning */}
      {!canProcess && (
        <div className="flex items-start gap-2 p-3 rounded-sm bg-accent/5 border border-accent/20">
          <AlertCircle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-accent font-medium">Reference Only</p>
            <p className="text-[11px] text-accent/80 mt-1">
              This link was saved as a reference. Direct conversion requires an uploaded file or an authorized source.
            </p>
            {item.sourceUrlReference && (
              <a
                href={item.sourceUrlReference}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-primary underline mt-1 inline-block"
              >
                {item.sourceUrlReference}
              </a>
            )}
          </div>
        </div>
      )}

      {/* Metadata */}
      <div className="space-y-1">
        <h2 className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Metadata</h2>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 p-3 border border-border rounded-sm bg-card">
          {[
            { label: 'Type', value: item.mimeType },
            { label: 'Size', value: item.fileSize ? formatFileSize(item.fileSize) : '—' },
            { label: 'Duration', value: formatDuration(item.duration) },
            { label: 'Resolution', value: item.resolution || '—' },
            { label: 'Audio', value: item.audioCodec || '—' },
            { label: 'Video', value: item.videoCodec || '—' },
            { label: 'Imported', value: new Date(item.createdAt).toLocaleDateString() },
            { label: 'Method', value: item.importMethod.replace(/_/g, ' ') },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">{label}</p>
              <p className="text-xs text-foreground">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tags */}
      {item.tags.length > 0 && (
        <div className="space-y-1">
          <h2 className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Tags</h2>
          <div className="flex flex-wrap gap-1.5">
            {item.tags.map(t => (
              <span key={t} className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider bg-secondary text-secondary-foreground rounded-sm">
                <Tag className="w-2.5 h-2.5 inline mr-1" />{t}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      <div className="space-y-1">
        <h2 className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Notes</h2>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 text-sm bg-input border border-border rounded-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 resize-none"
          placeholder="Add notes..."
        />
      </div>

      {/* Actions */}
      <div className="space-y-2">
        {canProcess && (
          <button
            onClick={() => onConvert(item)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground font-mono text-sm uppercase tracking-wider rounded-sm hover:bg-primary/90 transition-colors min-h-[44px]"
          >
            Convert <ArrowRight className="w-4 h-4" />
          </button>
        )}
        <div className="grid grid-cols-2 gap-2">
          <button className="flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-mono uppercase tracking-wider border border-border rounded-sm text-foreground hover:bg-secondary transition-colors min-h-[44px]">
            <Pencil className="w-3.5 h-3.5" /> Rename
          </button>
          <button className="flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-mono uppercase tracking-wider border border-destructive/30 rounded-sm text-destructive hover:bg-destructive/10 transition-colors min-h-[44px]">
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
        </div>
      </div>
    </div>
  );
}
