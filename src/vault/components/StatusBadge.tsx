import { JOB_STATUS_LABELS, type JobStatus, type MediaStatus } from '../types';

const JOB_COLORS: Record<JobStatus, string> = {
  waiting: 'bg-muted text-muted-foreground',
  validating: 'bg-accent/10 text-accent',
  processing: 'bg-primary/10 text-primary',
  finalizing: 'bg-primary/20 text-primary',
  complete: 'bg-primary/15 text-primary',
  failed: 'bg-destructive/10 text-destructive',
  cancelled: 'bg-muted text-muted-foreground',
};

export function JobStatusBadge({ status }: { status: JobStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider rounded-sm border border-transparent ${JOB_COLORS[status]}`}>
      {status === 'processing' && <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
      {status === 'failed' && <span className="w-1.5 h-1.5 rounded-full bg-destructive" />}
      {status === 'complete' && <span>✓</span>}
      {JOB_STATUS_LABELS[status]}
    </span>
  );
}

export function MediaStatusBadge({ status }: { status: MediaStatus }) {
  const colors: Record<MediaStatus, string> = {
    ready: 'bg-primary/10 text-primary',
    processing: 'bg-accent/10 text-accent',
    error: 'bg-destructive/10 text-destructive',
    archived: 'bg-muted text-muted-foreground',
  };
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider rounded-sm ${colors[status]}`}>
      {status}
    </span>
  );
}
