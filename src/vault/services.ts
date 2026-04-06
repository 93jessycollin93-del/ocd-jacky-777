import type { MediaItem, ConversionJob, OutputAsset, SourceType, JobAction } from './types';

// ── Ingestion Service ──
export const ingestionService = {
  validateFile(file: File): { valid: boolean; reason?: string } {
    const MAX_SIZE = 500 * 1024 * 1024; // 500MB
    const SUPPORTED_TYPES = [
      'video/mp4', 'video/quicktime', 'video/webm', 'video/x-matroska',
      'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/x-m4a',
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    ];

    if (file.size > MAX_SIZE) return { valid: false, reason: `File too large. Maximum size is 500 MB.` };
    if (file.size === 0) return { valid: false, reason: 'File appears to be empty or corrupted.' };
    if (!SUPPORTED_TYPES.some(t => file.type.startsWith(t.split('/')[0]))) {
      return { valid: false, reason: `Unsupported file type: ${file.type || 'unknown'}` };
    }
    return { valid: true };
  },
};

// ── Policy Service ──
export const policyService = {
  classifyLink(url: string): { sourceType: SourceType; explanation: string } {
    const AUTHORIZED_DOMAINS = ['drive.google.com', 'dropbox.com', 'icloud.com'];
    try {
      const parsed = new URL(url);
      if (AUTHORIZED_DOMAINS.some(d => parsed.hostname.includes(d))) {
        return {
          sourceType: 'authorized_cloud_source',
          explanation: 'This source supports authorized direct import.',
        };
      }
      return {
        sourceType: 'external_reference_only',
        explanation: 'This link was saved as a reference. Direct conversion requires an uploaded file or an authorized source.',
      };
    } catch {
      return {
        sourceType: 'external_reference_only',
        explanation: 'Invalid URL. Saved as a reference.',
      };
    }
  },

  canProcess(sourceType: SourceType): boolean {
    return sourceType !== 'external_reference_only';
  },
};

// ── Metadata Service ──
export const metadataService = {
  async extractFromFile(file: File): Promise<Partial<MediaItem>> {
    const meta: Partial<MediaItem> = {
      originalFilename: file.name,
      mimeType: file.type,
      fileSize: file.size,
      title: file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '),
    };

    if (file.type.startsWith('video/') || file.type.startsWith('audio/')) {
      try {
        const url = URL.createObjectURL(file);
        const el = document.createElement(file.type.startsWith('video/') ? 'video' : 'audio');
        await new Promise<void>((resolve) => {
          el.onloadedmetadata = () => {
            meta.duration = el.duration;
            if ('videoWidth' in el && (el as HTMLVideoElement).videoWidth) {
              meta.resolution = `${(el as HTMLVideoElement).videoWidth}x${(el as HTMLVideoElement).videoHeight}`;
            }
            resolve();
          };
          el.onerror = () => resolve();
          el.src = url;
        });
        URL.revokeObjectURL(url);
      } catch { /* metadata extraction failed gracefully */ }
    }

    return meta;
  },
};

// ── Conversion Service (mock) ──
export const conversionService = {
  createJob(
    mediaItem: MediaItem,
    actionType: JobAction,
    presetKey: string,
    outputFormat: string,
    options?: {
      targetBitrate?: number;
      trimStart?: number;
      trimEnd?: number;
      normalizationEnabled?: boolean;
    }
  ): ConversionJob {
    return {
      id: `job-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      mediaItemId: mediaItem.id,
      mediaItemTitle: mediaItem.title,
      actionType,
      presetKey,
      outputFormat,
      targetBitrate: options?.targetBitrate,
      trimStart: options?.trimStart,
      trimEnd: options?.trimEnd,
      normalizationEnabled: options?.normalizationEnabled ?? false,
      progress: 0,
      status: 'waiting',
      createdAt: new Date().toISOString(),
    };
  },

  getOutputFilename(mediaItem: MediaItem, outputFormat: string): string {
    const baseName = mediaItem.originalFilename.replace(/\.[^/.]+$/, '');
    const ext = outputFormat === 'audio/mpeg' ? 'mp3'
      : outputFormat === 'audio/mp4' ? 'm4a'
      : outputFormat === 'audio/wav' ? 'wav'
      : outputFormat === 'image/jpeg' ? 'jpg'
      : outputFormat === 'video/mp4' ? 'mp4'
      : 'out';
    return `${baseName}_converted.${ext}`;
  },
};

// ── Library Service ──
export const libraryService = {
  filterItems(
    items: MediaItem[],
    tab: string,
    search: string,
    tags: string[]
  ): MediaItem[] {
    let filtered = [...items];

    if (tab === 'assets') filtered = filtered.filter(i => i.sourceType !== 'external_reference_only');
    if (tab === 'references') filtered = filtered.filter(i => i.sourceType === 'external_reference_only');

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(i =>
        i.title.toLowerCase().includes(q) ||
        i.originalFilename.toLowerCase().includes(q) ||
        i.tags.some(t => t.toLowerCase().includes(q)) ||
        i.notes.toLowerCase().includes(q)
      );
    }

    if (tags.length > 0) {
      filtered = filtered.filter(i => tags.some(t => i.tags.includes(t)));
    }

    return filtered;
  },
};
