import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { QueueRow } from '../components/QueueRow';
import { EmptyState } from '../components/EmptyState';
import { MOCK_JOBS } from '../mockData';
import type { ConversionJob } from '../types';

interface QueueScreenProps {
  onBack: () => void;
}

export function QueueScreen({ onBack }: QueueScreenProps) {
  const [jobs, setJobs] = useState<ConversionJob[]>(MOCK_JOBS);
  const [filter, setFilter] = useState<'active' | 'history'>('active');

  const activeJobs = jobs.filter(j => !['complete', 'failed', 'cancelled'].includes(j.status));
  const historyJobs = jobs.filter(j => ['complete', 'failed', 'cancelled'].includes(j.status));
  const displayJobs = filter === 'active' ? activeJobs : historyJobs;

  const handleRetry = (id: string) => {
    setJobs(prev => prev.map(j => j.id === id ? { ...j, status: 'waiting' as const, progress: 0, errorMessage: undefined } : j));
  };

  const handleCancel = (id: string) => {
    setJobs(prev => prev.map(j => j.id === id ? { ...j, status: 'cancelled' as const } : j));
  };

  return (
    <div className="space-y-4 pb-8">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 -ml-2 min-h-[44px] min-w-[44px] flex items-center justify-center">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <div>
          <h1 className="text-lg font-mono uppercase tracking-wider text-foreground">Queue</h1>
          <p className="text-[11px] text-muted-foreground">{activeJobs.length} active · {historyJobs.length} completed</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1">
        {(['active', 'history'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-2 text-[10px] font-mono uppercase tracking-wider rounded-sm transition-colors min-h-[44px] ${
              filter === f
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground'
            }`}
          >
            {f === 'active' ? `Active (${activeJobs.length})` : `History (${historyJobs.length})`}
          </button>
        ))}
      </div>

      {/* Jobs */}
      {displayJobs.length === 0 ? (
        <EmptyState
          icon={filter === 'active' ? '⏳' : '📋'}
          title={filter === 'active' ? 'No active jobs' : 'No job history'}
          description={filter === 'active' ? 'Queue a conversion from the library.' : 'Completed and failed jobs appear here.'}
        />
      ) : (
        <div className="space-y-2">
          {displayJobs.map(job => (
            <QueueRow
              key={job.id}
              job={job}
              onRetry={handleRetry}
              onCancel={handleCancel}
            />
          ))}
        </div>
      )}
    </div>
  );
}
