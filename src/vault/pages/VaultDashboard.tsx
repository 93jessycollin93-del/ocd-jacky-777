import { useState } from 'react';
import { Upload, Image, Mic, Video, Link, FolderOpen, Clock, ArrowRight, HardDrive } from 'lucide-react';
import { QuickActionCard } from '../components/QuickActionCard';
import { MediaCard } from '../components/MediaCard';
import { QueueRow } from '../components/QueueRow';
import { MOCK_MEDIA_ITEMS, MOCK_JOBS } from '../mockData';
import { formatFileSize, type MediaItem } from '../types';

interface DashboardProps {
  onNavigate: (page: string, data?: any) => void;
}

export function VaultDashboard({ onNavigate }: DashboardProps) {
  const recentItems = MOCK_MEDIA_ITEMS.slice(0, 3);
  const activeJobs = MOCK_JOBS.filter(j => j.status !== 'complete' && j.status !== 'cancelled');
  const totalSize = MOCK_MEDIA_ITEMS.reduce((a, i) => a + i.fileSize, 0);

  return (
    <div className="space-y-6 pb-8">
      {/* Hero */}
      <div className="px-1">
        <h1 className="text-lg font-mono uppercase tracking-wider text-foreground">Media Vault</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Your private media workspace. Import, convert, organize, export.
        </p>
      </div>

      {/* Stats strip */}
      <div className="flex items-center gap-4 px-1 py-2 border-y border-border">
        <div className="text-center">
          <p className="text-lg font-mono font-bold text-foreground">{MOCK_MEDIA_ITEMS.length}</p>
          <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">Items</p>
        </div>
        <div className="w-px h-8 bg-border" />
        <div className="text-center">
          <p className="text-lg font-mono font-bold text-foreground">{MOCK_JOBS.filter(j => j.status === 'complete').length}</p>
          <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">Jobs Done</p>
        </div>
        <div className="w-px h-8 bg-border" />
        <div className="text-center flex items-center gap-1.5">
          <HardDrive className="w-3.5 h-3.5 text-muted-foreground" />
          <div>
            <p className="text-lg font-mono font-bold text-foreground">{formatFileSize(totalSize)}</p>
            <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">Used</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-2">
        <h2 className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground px-1">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-2">
          <QuickActionCard icon={Upload} label="Upload File" description="From device" onClick={() => onNavigate('import')} accent />
          <QuickActionCard icon={Image} label="Photos" description="Camera roll" onClick={() => onNavigate('import')} />
          <QuickActionCard icon={Mic} label="Record Audio" description="Capture now" onClick={() => onNavigate('import')} />
          <QuickActionCard icon={Video} label="Record Video" description="Camera" onClick={() => onNavigate('import')} />
          <QuickActionCard icon={Link} label="Paste Link" description="Add reference" onClick={() => onNavigate('import')} />
          <QuickActionCard icon={FolderOpen} label="Library" description={`${MOCK_MEDIA_ITEMS.length} items`} onClick={() => onNavigate('library')} />
        </div>
      </div>

      {/* Active Jobs */}
      {activeJobs.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Active Jobs</h2>
            <button
              onClick={() => onNavigate('queue')}
              className="text-[10px] font-mono uppercase tracking-wider text-primary flex items-center gap-1 min-h-[44px]"
            >
              View All <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-2">
            {activeJobs.map(job => (
              <QueueRow key={job.id} job={job} />
            ))}
          </div>
        </div>
      )}

      {/* Recent Items */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Recent Items</h2>
          <button
            onClick={() => onNavigate('library')}
            className="text-[10px] font-mono uppercase tracking-wider text-primary flex items-center gap-1 min-h-[44px]"
          >
            All Items <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {recentItems.map(item => (
            <MediaCard
              key={item.id}
              item={item}
              onSelect={(i) => onNavigate('detail', { item: i })}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
