// ── Source Classification ──
export type SourceType =
  | 'uploaded_file'
  | 'camera_roll'
  | 'recorded_audio'
  | 'recorded_video'
  | 'authorized_cloud_source'
  | 'external_reference_only';

export type MediaStatus = 'ready' | 'processing' | 'error' | 'archived';

export type JobStatus = 'waiting' | 'validating' | 'processing' | 'finalizing' | 'complete' | 'failed' | 'cancelled';

export type JobAction =
  | 'convert_mp3'
  | 'convert_m4a'
  | 'convert_wav'
  | 'convert_video'
  | 'compress_mobile'
  | 'trim_clip'
  | 'extract_thumbnail'
  | 'normalize_audio'
  | 'strip_audio'
  | 'lower_bitrate'
  | 'telegram_profile_photo'
  | 'telegram_profile_video'
  | 'telegram_share_optimize';

export type LibraryTab = 'all' | 'assets' | 'references' | 'outputs' | 'jobs';

// ── Core Data Models ──
export interface MediaItem {
  id: string;
  title: string;
  originalFilename: string;
  sourceType: SourceType;
  sourceUrlReference?: string;
  importMethod: string;
  mimeType: string;
  duration?: number;
  fileSize: number;
  resolution?: string;
  audioCodec?: string;
  videoCodec?: string;
  status: MediaStatus;
  thumbnailUrl?: string;
  tags: string[];
  notes: string;
  projectId?: string;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ConversionJob {
  id: string;
  mediaItemId: string;
  mediaItemTitle: string;
  actionType: JobAction;
  presetKey: string;
  outputFormat: string;
  targetBitrate?: number;
  trimStart?: number;
  trimEnd?: number;
  normalizationEnabled: boolean;
  progress: number;
  status: JobStatus;
  errorMessage?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface OutputAsset {
  id: string;
  sourceMediaItemId: string;
  conversionJobId: string;
  filename: string;
  mimeType: string;
  duration?: number;
  fileSize: number;
  storagePath: string;
  previewUrl?: string;
  createdAt: string;
}

export interface VaultProject {
  id: string;
  name: string;
  description: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

// ── Conversion Presets ──
export interface ConversionPreset {
  key: string;
  label: string;
  description: string;
  icon: string;
  actionType: JobAction;
  outputFormat: string;
  defaultBitrate?: number;
  supportedInputTypes: string[];
  category?: 'general' | 'telegram';
  telegramMeta?: {
    outputResolution?: string;
    estimatedSize?: string;
    muteAudio?: boolean;
    maxDuration?: number;
    cropShape?: 'square' | 'circle';
  };
}

export const CONVERSION_PRESETS: ConversionPreset[] = [
  {
    key: 'video_to_mp3',
    label: 'Video → MP3',
    description: 'Extract audio as high-quality MP3',
    icon: '🎵',
    actionType: 'convert_mp3',
    outputFormat: 'audio/mpeg',
    defaultBitrate: 192,
    supportedInputTypes: ['video/'],
  },
  {
    key: 'video_to_m4a',
    label: 'Video → M4A',
    description: 'Extract AAC audio for Apple devices',
    icon: '🍎',
    actionType: 'convert_m4a',
    outputFormat: 'audio/mp4',
    defaultBitrate: 256,
    supportedInputTypes: ['video/'],
  },
  {
    key: 'audio_cleanup',
    label: 'Audio Cleanup',
    description: 'Normalize volume and reduce noise',
    icon: '✨',
    actionType: 'normalize_audio',
    outputFormat: 'audio/mpeg',
    supportedInputTypes: ['audio/'],
  },
  {
    key: 'compress_chat',
    label: 'Compress for Sharing',
    description: 'Reduce size for messaging apps',
    icon: '💬',
    actionType: 'compress_mobile',
    outputFormat: 'video/mp4',
    defaultBitrate: 1000,
    supportedInputTypes: ['video/'],
  },
  {
    key: 'compress_storage',
    label: 'Compress for Storage',
    description: 'Balance quality and file size',
    icon: '📦',
    actionType: 'compress_mobile',
    outputFormat: 'video/mp4',
    defaultBitrate: 2000,
    supportedInputTypes: ['video/'],
  },
  {
    key: 'extract_thumb',
    label: 'Extract Thumbnail',
    description: 'Get a still frame from video',
    icon: '🖼️',
    actionType: 'extract_thumbnail',
    outputFormat: 'image/jpeg',
    supportedInputTypes: ['video/'],
  },
  {
    key: 'quick_trim',
    label: 'Quick Trim',
    description: 'Cut start and end points',
    icon: '✂️',
    actionType: 'trim_clip',
    outputFormat: 'same',
    supportedInputTypes: ['video/', 'audio/'],
  },
  {
    key: 'voice_cleanup',
    label: 'Voice Note Cleanup',
    description: 'Clean and normalize voice recordings',
    icon: '🎙️',
    actionType: 'normalize_audio',
    outputFormat: 'audio/mpeg',
    defaultBitrate: 128,
    supportedInputTypes: ['audio/'],
  },
  {
    key: 'strip_audio',
    label: 'Remove Audio Track',
    description: 'Silent video output',
    icon: '🔇',
    actionType: 'strip_audio',
    outputFormat: 'video/mp4',
    supportedInputTypes: ['video/'],
  },
  {
    key: 'lower_quality',
    label: 'Lower Bitrate',
    description: 'Create a lighter version',
    icon: '⬇️',
    actionType: 'lower_bitrate',
    outputFormat: 'same',
    defaultBitrate: 500,
    supportedInputTypes: ['video/', 'audio/'],
  },
  // ── Telegram Presets ──
  {
    key: 'tg_profile_photo',
    label: 'Telegram Profile Photo',
    description: 'Square avatar, optimized for clarity at small sizes',
    icon: '✈️',
    actionType: 'telegram_profile_photo',
    outputFormat: 'image/jpeg',
    supportedInputTypes: ['image/', 'video/'],
    category: 'telegram',
    telegramMeta: {
      outputResolution: '800×800',
      estimatedSize: '~80 KB',
      cropShape: 'circle',
    },
  },
  {
    key: 'tg_profile_video',
    label: 'Telegram Profile Video',
    description: 'Short square clip, muted, H.264 MP4',
    icon: '🎬',
    actionType: 'telegram_profile_video',
    outputFormat: 'video/mp4',
    supportedInputTypes: ['video/'],
    category: 'telegram',
    telegramMeta: {
      outputResolution: '800×800',
      estimatedSize: '~2 MB',
      muteAudio: true,
      maxDuration: 10,
      cropShape: 'circle',
    },
  },
  {
    key: 'tg_share_optimize',
    label: 'Telegram Share Optimized',
    description: 'Compress for fast Telegram sharing',
    icon: '📨',
    actionType: 'telegram_share_optimize',
    outputFormat: 'video/mp4',
    defaultBitrate: 800,
    supportedInputTypes: ['video/', 'audio/', 'image/'],
    category: 'telegram',
    telegramMeta: {
      estimatedSize: '~5 MB',
    },
  },
];

// ── Helpers ──
export const SOURCE_LABELS: Record<SourceType, string> = {
  uploaded_file: 'Uploaded',
  camera_roll: 'Camera Roll',
  recorded_audio: 'Recorded Audio',
  recorded_video: 'Recorded Video',
  authorized_cloud_source: 'Cloud Source',
  external_reference_only: 'Reference Only',
};

export const SOURCE_COLORS: Record<SourceType, string> = {
  uploaded_file: 'hsl(150 100% 50%)',
  camera_roll: 'hsl(200 80% 55%)',
  recorded_audio: 'hsl(280 70% 60%)',
  recorded_video: 'hsl(320 70% 55%)',
  authorized_cloud_source: 'hsl(45 90% 55%)',
  external_reference_only: 'hsl(220 10% 50%)',
};

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  waiting: 'Waiting',
  validating: 'Validating',
  processing: 'Processing',
  finalizing: 'Finalizing',
  complete: 'Complete',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

export function formatDuration(seconds?: number): string {
  if (!seconds) return '--:--';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function isProcessableSource(sourceType: SourceType): boolean {
  return sourceType !== 'external_reference_only';
}

export function getPresetForMedia(item: MediaItem): ConversionPreset[] {
  return CONVERSION_PRESETS.filter(p =>
    p.supportedInputTypes.some(t => item.mimeType.startsWith(t))
  );
}
