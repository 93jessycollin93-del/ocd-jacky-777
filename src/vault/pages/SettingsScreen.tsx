import { ArrowLeft, Shield, Eye, Lock, FileCheck, AlertTriangle } from 'lucide-react';

interface SettingsScreenProps {
  onBack: () => void;
}

export function SettingsScreen({ onBack }: SettingsScreenProps) {
  return (
    <div className="space-y-5 pb-8">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 -ml-2 min-h-[44px] min-w-[44px] flex items-center justify-center">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <h1 className="text-lg font-mono uppercase tracking-wider text-foreground">Settings</h1>
      </div>

      {/* Storage */}
      <div className="space-y-2">
        <h2 className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Storage</h2>
        <div className="p-3 border border-border rounded-sm bg-card space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-foreground">Used</span>
            <span className="text-sm font-mono text-primary">365 MB / 2 GB</span>
          </div>
          <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: '18%' }} />
          </div>
        </div>
      </div>

      {/* Defaults */}
      <div className="space-y-2">
        <h2 className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Defaults</h2>
        <div className="p-3 border border-border rounded-sm bg-card space-y-3">
          {[
            { label: 'Default export format', value: 'MP3 @ 192 kbps' },
            { label: 'Naming convention', value: '{original}_converted.{ext}' },
            { label: 'Auto-normalize', value: 'Off' },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between items-center">
              <span className="text-sm text-foreground">{label}</span>
              <span className="text-xs font-mono text-muted-foreground">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Privacy & Security */}
      <div className="space-y-2">
        <h2 className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Privacy & Security</h2>
        <div className="p-3 border border-border rounded-sm bg-card space-y-4">
          {[
            { icon: Shield, title: 'Encrypted Storage', desc: 'All files are encrypted at rest and in transit.' },
            { icon: Eye, title: 'Private by Default', desc: 'Your media is never shared or analyzed without consent.' },
            { icon: Lock, title: 'No Third-Party Access', desc: 'Files are stored in your private vault. No external access.' },
            { icon: FileCheck, title: 'Source Verification', desc: 'Every item shows its origin and classification clearly.' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-3">
              <Icon className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-foreground font-medium">{title}</p>
                <p className="text-[11px] text-muted-foreground">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Usage Boundaries */}
      <div className="space-y-2">
        <h2 className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Usage Boundaries</h2>
        <div className="p-3 border border-accent/20 rounded-sm bg-accent/5">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
            <div className="text-[11px] text-accent/90 space-y-2">
              <p>Jackie Media Vault is designed for media you own, record, or are authorized to access.</p>
              <p>External links from unsupported platforms are saved as <strong>references only</strong>. Direct conversion requires an uploaded file or an authorized source.</p>
              <p>Supported authorized sources: Google Drive, Dropbox, iCloud.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
