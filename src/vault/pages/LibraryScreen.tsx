import { useState } from 'react';
import { ArrowLeft, Search, Grid3X3, List, Heart } from 'lucide-react';
import { MediaCard } from '../components/MediaCard';
import { EmptyState } from '../components/EmptyState';
import { MOCK_MEDIA_ITEMS } from '../mockData';
import { libraryService } from '../services';
import type { MediaItem, LibraryTab } from '../types';

interface LibraryScreenProps {
  onBack: () => void;
  onSelectItem: (item: MediaItem) => void;
}

const TABS: { key: LibraryTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'assets', label: 'Assets' },
  { key: 'references', label: 'Refs' },
  { key: 'outputs', label: 'Outputs' },
  { key: 'jobs', label: 'Jobs' },
];

export function LibraryScreen({ onBack, onSelectItem }: LibraryScreenProps) {
  const [tab, setTab] = useState<LibraryTab>('all');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [items, setItems] = useState(MOCK_MEDIA_ITEMS);

  const filtered = libraryService.filterItems(items, tab, search, []);

  const toggleFavorite = (id: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, isFavorite: !i.isFavorite } : i));
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 -ml-2 min-h-[44px] min-w-[44px] flex items-center justify-center">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-mono uppercase tracking-wider text-foreground">Library</h1>
          <p className="text-[11px] text-muted-foreground">{filtered.length} items</p>
        </div>
        <button
          onClick={() => setViewMode(v => v === 'grid' ? 'list' : 'grid')}
          className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          {viewMode === 'grid' ? <List className="w-4 h-4 text-muted-foreground" /> : <Grid3X3 className="w-4 h-4 text-muted-foreground" />}
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search files, tags, notes..."
          className="w-full pl-9 pr-3 py-2.5 text-sm font-mono bg-input border border-border rounded-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 min-h-[44px]"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto no-scrollbar">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-2 text-[10px] font-mono uppercase tracking-wider whitespace-nowrap rounded-sm transition-colors min-h-[44px] ${
              tab === t.key
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Items */}
      {filtered.length === 0 ? (
        <EmptyState
          icon="📂"
          title="No items found"
          description={search ? 'Try a different search term.' : 'Import media to get started.'}
        />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 gap-2">
          {filtered.map(item => (
            <MediaCard
              key={item.id}
              item={item}
              onSelect={onSelectItem}
              onFavorite={toggleFavorite}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-1">
          {filtered.map(item => (
            <button
              key={item.id}
              onClick={() => onSelectItem(item)}
              className="w-full flex items-center gap-3 p-3 rounded-sm border border-border bg-card hover:border-primary/20 transition-colors text-left min-h-[44px]"
            >
              <div className="w-10 h-10 rounded-sm bg-secondary flex items-center justify-center shrink-0">
                {item.mimeType.startsWith('video/') ? '🎬' : item.mimeType.startsWith('audio/') ? '🎵' : item.sourceType === 'external_reference_only' ? '🔗' : '📄'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-foreground truncate">{item.title}</p>
                <p className="text-[10px] font-mono text-muted-foreground">{item.mimeType}</p>
              </div>
              {item.isFavorite && <Heart className="w-3.5 h-3.5 fill-primary text-primary shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
