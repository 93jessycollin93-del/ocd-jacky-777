import { ArrowLeft, Download, Share, Copy, RotateCcw, Play, HardDrive, Clock } from 'lucide-react';
import { MOCK_OUTPUTS, MOCK_JOBS } from '../mockData';
import { formatFileSize, formatDuration } from '../types';
import { toast } from 'sonner';

interface OutputReviewProps {
  jobId: string;
  onBack: () => void;
}

export function OutputReview({ jobId, onBack }: OutputReviewProps) {
  const output = MOCK_OUTPUTS.find(o => o.conversionJobId === jobId);
  const job = MOCK_JOBS.find(j => j.id === jobId);

  if (!output || !job) {
    return (
      <div className="space-y-4 pb-8">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 min-h-[44px] min-w-[44px] flex items-center justify-center">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <h1 className="text-lg font-mono uppercase tracking-wider text-foreground">Output</h1>
        </div>
        <div className="p-4 text-center text-muted-foreground text-sm">Output not found.</div>
      </div>
    );
  }

  const isAudio = output.mimeType.startsWith('audio/');

  return (
    <div className="space-y-5 pb-8">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 -ml-2 min-h-[44px] min-w-[44px] flex items-center justify-center">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <div>
          <h1 className="text-lg font-mono uppercase tracking-wider text-foreground">Output</h1>
          <p className="text-[11px] text-muted-foreground">Conversion complete</p>
        </div>
      </div>

      {/* Preview */}
      <div className="relative w-full aspect-video rounded-sm bg-secondary/50 border border-primary/20 flex items-center justify-center">
        {isAudio ? (
          <div className="flex items-end gap-1 h-12">
            {Array.from({ length: 32 }).map((_, i) => (
              <div
                key={i}
                className="w-1 bg-primary/50 rounded-full"
                style={{ height: `${20 + Math.sin(i * 0.4) * 30 + Math.random() * 25}%` }}
              />
            ))}
          </div>
        ) : (
          <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center">
            <Play className="w-6 h-6 text-primary ml-1" />
          </div>
        )}
      </div>

      {/* Success banner */}
      <div className="p-3 border border-primary/20 rounded-sm bg-primary/5 text-center">
        <p className="text-primary font-mono text-sm uppercase tracking-wider">✓ Conversion Complete</p>
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 p-3 border border-border rounded-sm bg-card">
        <div>
          <p className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">Filename</p>
          <p className="text-xs text-foreground truncate">{output.filename}</p>
        </div>
        <div>
          <p className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">Format</p>
          <p className="text-xs text-foreground">{output.mimeType}</p>
        </div>
        <div>
          <p className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">Duration</p>
          <p className="text-xs text-foreground flex items-center gap-1"><Clock className="w-3 h-3" />{formatDuration(output.duration)}</p>
        </div>
        <div>
          <p className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">File Size</p>
          <p className="text-xs text-foreground flex items-center gap-1"><HardDrive className="w-3 h-3" />{formatFileSize(output.fileSize)}</p>
        </div>
        <div>
          <p className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">Preset</p>
          <p className="text-xs text-foreground">{job.presetKey.replace(/_/g, ' ')}</p>
        </div>
        <div>
          <p className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">Bitrate</p>
          <p className="text-xs text-foreground">{job.targetBitrate ? `${job.targetBitrate} kbps` : '—'}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <button
          onClick={() => toast.success('Saved to library.')}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground font-mono text-sm uppercase tracking-wider rounded-sm hover:bg-primary/90 transition-colors min-h-[44px]"
        >
          <Download className="w-4 h-4" /> Save to Library
        </button>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => toast.info('Download started.')}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 text-[10px] font-mono uppercase tracking-wider border border-border rounded-sm text-foreground hover:bg-secondary transition-colors min-h-[44px]"
          >
            <Download className="w-3.5 h-3.5" /> Export
          </button>
          <button
            onClick={() => toast.info('Share link copied.')}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 text-[10px] font-mono uppercase tracking-wider border border-border rounded-sm text-foreground hover:bg-secondary transition-colors min-h-[44px]"
          >
            <Share className="w-3.5 h-3.5" /> Share
          </button>
          <button
            onClick={() => toast.info('Re-queued for conversion.')}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 text-[10px] font-mono uppercase tracking-wider border border-border rounded-sm text-foreground hover:bg-secondary transition-colors min-h-[44px]"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Again
          </button>
        </div>
      </div>
    </div>
  );
}
