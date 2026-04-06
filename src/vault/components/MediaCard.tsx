import { Heart, Play, Clock, HardDrive, MoreVertical } from 'lucide-react';
import { SourceBadge } from './SourceBadge';
import { formatDuration, formatFileSize, type MediaItem } from '../types';

interface MediaCardProps {
  item: MediaItem;
  onSelect: (item: MediaItem) => void;
  onFavorite?: (id: string) => void;
}

export function MediaCard({ item, onSelect, onFavorite }: MediaCardProps) {
  const isRef = item.sourceType === 'external_reference_only';
  const isVideo = item.mimeType.startsWith('video/');
  const isAudio = item.mimeType.startsWith('audio/');

  return (
    <button
      onClick={() => onSelect(item)}
      className="w-full text-left group relative rounded-sm border border-border bg-card hover:border-primary/30 transition-colors duration-200 overflow-hidden"
    >
      {/* Thumbnail area */}
      <div className={`relative w-full aspect-video flex items-center justify-center ${
        isRef ? 'bg-muted/30' : 'bg-secondary/50'
      }`}>
        {isVideo && (
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
            <Play className="w-4 h-4 text-primary ml-0.5" />
          </div>
        )}
        {isAudio && (
          <div className="flex items-end gap-[3px] h-8">
            {[0.4, 0.7, 1, 0.6, 0.8, 0.5, 0.9, 0.3].map((h, i) => (
              <div key={i} className="w-1 bg-primary/40 rounded-full" style={{ height: `${h * 100}%` }} />
            ))}
          </div>
        )}
        {isRef && <span className="text-2xl opacity-40">🔗</span>}
        {!isVideo && !isAudio && !isRef && <span className="text-2xl opacity-40">📄</span>}

        {item.duration && (
          <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 text-[10px] font-mono bg-background/80 text-foreground rounded-sm backdrop-blur-sm">
            {formatDuration(item.duration)}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-medium text-foreground leading-tight line-clamp-2">{item.title}</h3>
          {onFavorite && (
            <button
              onClick={(e) => { e.stopPropagation(); onFavorite(item.id); }}
              className="shrink-0 p-1 -m-1"
            >
              <Heart className={`w-3.5 h-3.5 ${item.isFavorite ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
            </button>
          )}
        </div>

        <SourceBadge sourceType={item.sourceType} />

        <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground">
          {item.fileSize > 0 && (
            <span className="flex items-center gap-1">
              <HardDrive className="w-2.5 h-2.5" />
              {formatFileSize(item.fileSize)}
            </span>
          )}
          {item.resolution && <span>{item.resolution}</span>}
        </div>

        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.tags.slice(0, 3).map(t => (
              <span key={t} className="px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider bg-secondary text-secondary-foreground rounded-sm">
                {t}
              </span>
            ))}
            {item.tags.length > 3 && (
              <span className="text-[9px] font-mono text-muted-foreground">+{item.tags.length - 3}</span>
            )}
          </div>
        )}
      </div>
    </button>
  );
}
