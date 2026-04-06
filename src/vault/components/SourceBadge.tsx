import { SOURCE_LABELS, type SourceType } from '../types';

const SOURCE_ICONS: Record<SourceType, string> = {
  uploaded_file: '📁',
  camera_roll: '📷',
  recorded_audio: '🎙️',
  recorded_video: '🎥',
  authorized_cloud_source: '☁️',
  external_reference_only: '🔗',
};

export function SourceBadge({ sourceType, size = 'sm' }: { sourceType: SourceType; size?: 'sm' | 'md' }) {
  const isRef = sourceType === 'external_reference_only';

  return (
    <span
      className={`inline-flex items-center gap-1 font-mono rounded-sm border ${
        size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs'
      } ${
        isRef
          ? 'bg-muted/50 text-muted-foreground border-border'
          : 'bg-primary/10 text-primary border-primary/20'
      }`}
    >
      <span>{SOURCE_ICONS[sourceType]}</span>
      <span className="uppercase tracking-wider">{SOURCE_LABELS[sourceType]}</span>
    </span>
  );
}
