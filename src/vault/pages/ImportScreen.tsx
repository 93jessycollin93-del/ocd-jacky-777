import { useState } from 'react';
import { ArrowLeft, Mic, Video, Camera } from 'lucide-react';
import { UploadDropzone } from '../components/UploadDropzone';
import { PasteLinkField } from '../components/PasteLinkField';
import { toast } from 'sonner';

interface ImportScreenProps {
  onBack: () => void;
}

export function ImportScreen({ onBack }: ImportScreenProps) {
  const handleFilesSelected = (files: File[]) => {
    toast.success(`${files.length} file${files.length > 1 ? 's' : ''} received. Ready to convert.`);
  };

  const handleLinkSubmit = (url: string, sourceType: string, explanation: string) => {
    if (sourceType === 'external_reference_only') {
      toast.info('Saved as reference.');
    } else {
      toast.success('Source accepted. Ready to import.');
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 -ml-2 min-h-[44px] min-w-[44px] flex items-center justify-center">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <div>
          <h1 className="text-lg font-mono uppercase tracking-wider text-foreground">Import</h1>
          <p className="text-[11px] text-muted-foreground">Bring media into your vault</p>
        </div>
      </div>

      {/* Upload */}
      <div className="space-y-2">
        <h2 className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground px-1">Upload Files</h2>
        <UploadDropzone
          onFilesSelected={handleFilesSelected}
          accept="video/*,audio/*,image/*"
        />
      </div>

      {/* Capture */}
      <div className="space-y-2">
        <h2 className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground px-1">Capture</h2>
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: Camera, label: 'Photos', desc: 'Camera roll' },
            { icon: Mic, label: 'Audio', desc: 'Record now' },
            { icon: Video, label: 'Video', desc: 'Camera' },
          ].map(({ icon: Icon, label, desc }) => (
            <button
              key={label}
              onClick={() => toast.info('Recording interface will use device APIs.')}
              className="p-4 border border-border rounded-sm bg-card flex flex-col items-center gap-2 hover:border-primary/20 transition-colors min-h-[44px]"
            >
              <Icon className="w-6 h-6 text-muted-foreground" />
              <div className="text-center">
                <p className="text-xs font-medium text-foreground">{label}</p>
                <p className="text-[9px] text-muted-foreground">{desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Paste Link */}
      <div className="space-y-2">
        <h2 className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground px-1">Paste Link</h2>
        <PasteLinkField onLinkSubmit={handleLinkSubmit} />
        <p className="text-[10px] text-muted-foreground px-1 leading-relaxed">
          Supported authorized sources: Google Drive, Dropbox, iCloud.
          Other links are saved as references only.
        </p>
      </div>

      {/* Supported Formats */}
      <div className="p-3 border border-border rounded-sm bg-card/50">
        <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2">Supported Formats</p>
        <div className="flex flex-wrap gap-1.5">
          {['MP4', 'MOV', 'WebM', 'MKV', 'MP3', 'M4A', 'WAV', 'OGG', 'JPEG', 'PNG', 'WebP', 'GIF'].map(fmt => (
            <span key={fmt} className="px-2 py-0.5 text-[9px] font-mono bg-secondary text-secondary-foreground rounded-sm">
              {fmt}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
