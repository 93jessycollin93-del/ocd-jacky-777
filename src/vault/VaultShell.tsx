import { useState } from 'react';
import { Home, Upload, FolderOpen, Layers, Settings, ArrowLeft } from 'lucide-react';
import { VaultDashboard } from './pages/VaultDashboard';
import { ImportScreen } from './pages/ImportScreen';
import { LibraryScreen } from './pages/LibraryScreen';
import { MediaDetail } from './pages/MediaDetail';
import { JobBuilder } from './pages/JobBuilder';
import { QueueScreen } from './pages/QueueScreen';
import { OutputReview } from './pages/OutputReview';
import { SettingsScreen } from './pages/SettingsScreen';
import type { MediaItem } from './types';

type VaultPage = 'dashboard' | 'import' | 'library' | 'detail' | 'convert' | 'queue' | 'output' | 'settings';

interface NavigationState {
  page: VaultPage;
  item?: MediaItem;
  jobId?: string;
}

export function VaultShell() {
  const [nav, setNav] = useState<NavigationState>({ page: 'dashboard' });

  const navigate = (page: string, data?: any) => {
    setNav({
      page: page as VaultPage,
      item: data?.item,
      jobId: data?.jobId,
    });
  };

  const goBack = () => setNav({ page: 'dashboard' });

  const renderPage = () => {
    switch (nav.page) {
      case 'dashboard':
        return <VaultDashboard onNavigate={navigate} />;
      case 'import':
        return <ImportScreen onBack={goBack} />;
      case 'library':
        return (
          <LibraryScreen
            onBack={goBack}
            onSelectItem={(item) => navigate('detail', { item })}
          />
        );
      case 'detail':
        return nav.item ? (
          <MediaDetail
            item={nav.item}
            onBack={() => navigate('library')}
            onConvert={(item) => navigate('convert', { item })}
          />
        ) : null;
      case 'convert':
        return nav.item ? (
          <JobBuilder
            item={nav.item}
            onBack={() => navigate('detail', { item: nav.item })}
            onJobCreated={() => navigate('queue')}
          />
        ) : null;
      case 'queue':
        return <QueueScreen onBack={goBack} />;
      case 'output':
        return <OutputReview jobId={nav.jobId || ''} onBack={() => navigate('queue')} />;
      case 'settings':
        return <SettingsScreen onBack={goBack} />;
      default:
        return <VaultDashboard onNavigate={navigate} />;
    }
  };

  const tabs: { key: VaultPage; icon: typeof Home; label: string }[] = [
    { key: 'dashboard', icon: Home, label: 'Home' },
    { key: 'import', icon: Upload, label: 'Import' },
    { key: 'library', icon: FolderOpen, label: 'Library' },
    { key: 'queue', icon: Layers, label: 'Queue' },
    { key: 'settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Content */}
      <main className="flex-1 overflow-y-auto px-4 pt-4 pb-20">
        {renderPage()}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border z-50 safe-area-bottom">
        <div className="flex items-center justify-around max-w-lg mx-auto">
          {tabs.map(({ key, icon: Icon, label }) => {
            const active = nav.page === key;
            return (
              <button
                key={key}
                onClick={() => setNav({ page: key })}
                className={`flex flex-col items-center gap-0.5 py-2 px-3 min-h-[52px] min-w-[52px] transition-colors ${
                  active ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[9px] font-mono uppercase tracking-wider">{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
