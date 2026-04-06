import { RotateCcw, X, ExternalLink } from 'lucide-react';
import { JobStatusBadge } from './StatusBadge';
import type { ConversionJob } from '../types';

interface QueueRowProps {
  job: ConversionJob;
  onRetry?: (id: string) => void;
  onCancel?: (id: string) => void;
  onOpenOutput?: (id: string) => void;
}

export function QueueRow({ job, onRetry, onCancel, onOpenOutput }: QueueRowProps) {
  const isActive = job.status === 'processing' || job.status === 'validating' || job.status === 'finalizing';

  return (
    <div className="p-3 border border-border rounded-sm bg-card space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{job.mediaItemTitle}</p>
          <p className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">
            {job.presetKey.replace(/_/g, ' ')}
          </p>
        </div>
        <JobStatusBadge status={job.status} />
      </div>

      {/* Progress bar */}
      {isActive && (
        <div className="w-full h-1 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${job.progress}%` }}
          />
        </div>
      )}

      {job.errorMessage && (
        <p className="text-[11px] text-destructive font-mono">{job.errorMessage}</p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        {job.status === 'failed' && onRetry && (
          <button
            onClick={() => onRetry(job.id)}
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-primary border border-primary/20 rounded-sm hover:bg-primary/10 transition-colors min-h-[44px]"
          >
            <RotateCcw className="w-3 h-3" /> Retry
          </button>
        )}
        {(job.status === 'waiting' || isActive) && onCancel && (
          <button
            onClick={() => onCancel(job.id)}
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-muted-foreground border border-border rounded-sm hover:bg-secondary transition-colors min-h-[44px]"
          >
            <X className="w-3 h-3" /> Cancel
          </button>
        )}
        {job.status === 'complete' && onOpenOutput && (
          <button
            onClick={() => onOpenOutput(job.id)}
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-primary border border-primary/20 rounded-sm hover:bg-primary/10 transition-colors min-h-[44px]"
          >
            <ExternalLink className="w-3 h-3" /> View Output
          </button>
        )}
      </div>
    </div>
  );
}
