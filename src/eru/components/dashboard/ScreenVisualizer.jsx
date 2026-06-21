import { useEffect, useMemo, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { Tv2, X, Music, Film, Star, History, ChevronDown, ChevronRight, RotateCw, ExternalLink, Search, Monitor, Minimize2, Maximize2, Camera, Circle, Square, GripVertical, PictureInPicture2 } from 'lucide-react';

const QUICK_LINKS = [
  { label: 'YouTube', url: 'https://www.youtube.com/embed/jfKfPfyJRdk', icon: '▶️', category: 'Video' },
  { label: 'Lo-fi Radio', url: 'https://www.youtube.com/embed/jfKfPfyJRdk?autoplay=1', icon: '🎵', category: 'Music' },
  { label: 'Lo-fi Girl', url: 'https://www.youtube.com/embed/jfKfPfyJRdk?autoplay=1', icon: '🌙', category: 'Music' },
  { label: 'NASA Live', url: 'https://www.youtube.com/embed/21X5lGlDOfg?autoplay=1', icon: '🚀', category: 'Live' },
  { label: 'Crypto News', url: 'https://coindesk.com', icon: '📰', category: 'News' },
  { label: 'TradingView', url: 'https://www.tradingview.com/widgetembed/?symbol=BINANCE:BTCUSDT&interval=D&theme=dark', icon: '📈', category: 'Charts' },
  { label: 'Web Radio', url: 'https://www.radiooooo.com', icon: '📻', category: 'Music' },
];

const BOOKMARKS_KEY = 'screen-visualizer-bookmarks';
const HISTORY_KEY = 'screen-visualizer-history';
const ACTIVE_TAB_KEY = 'screen-visualizer-active-tab';
const TABS_KEY = 'screen-visualizer-tabs';
const DEFAULT_HOME = 'https://www.tradingview.com/widgetembed/?symbol=BINANCE:BTCUSDT&interval=D&theme=dark';

const toYouTubeEmbedUrl = (value) => {
  try {
    const parsed = new URL(value);
    const host = parsed.hostname.replace('www.', '');

    if (host === 'youtu.be') {
      const videoId = parsed.pathname.split('/').filter(Boolean)[0];
      return videoId ? `https://www.youtube.com/embed/${videoId}` : value;
    }

    if (host.includes('youtube.com')) {
      if (parsed.pathname.startsWith('/embed/')) return value;
      if (parsed.pathname === '/watch') {
        const videoId = parsed.searchParams.get('v');
        return videoId ? `https://www.youtube.com/embed/${videoId}` : value;
      }
      if (parsed.pathname.startsWith('/shorts/')) {
        const videoId = parsed.pathname.split('/')[2];
        return videoId ? `https://www.youtube.com/embed/${videoId}` : value;
      }
      if (parsed.pathname.startsWith('/live/')) {
        const videoId = parsed.pathname.split('/')[2];
        return videoId ? `https://www.youtube.com/embed/${videoId}` : value;
      }
    }

    return value;
  } catch {
    return value;
  }
};

const normalizeUrl = (value) => {
  let target = (value || '').trim();
  if (!target) return '';

  const isDirectUrl = target.startsWith('http') || target.includes('.') || target.startsWith('localhost');
  if (!isDirectUrl) {
    return `https://www.google.com/search?q=${encodeURIComponent(target)}`;
  }

  if (!target.startsWith('http')) target = `https://${target}`;
  return toYouTubeEmbedUrl(target);
};

const getHostLabel = (value) => {
  try {
    return new URL(value).hostname.replace('www.', '');
  } catch {
    return 'New Tab';
  }
};

export default function ScreenVisualizer({ prefs, updateWidget }) {
  const [url, setUrl] = useState('');
  const [activeUrl, setActiveUrl] = useState(DEFAULT_HOME);
  const [bookmarks, setBookmarks] = useState([]);
  const [historyItems, setHistoryItems] = useState([]);
  const [bookmarksCollapsed, setBookmarksCollapsed] = useState(false);
  const [historyCollapsed, setHistoryCollapsed] = useState(false);
  const [tabs, setTabs] = useState([{ id: 'home', url: DEFAULT_HOME, title: 'Markets' }]);
  const [activeTabId, setActiveTabId] = useState('home');
  const [reloadKey, setReloadKey] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedUrl, setRecordedUrl] = useState('');
  const [youtubeFallback, setYoutubeFallback] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const miniBrowserPrefs = prefs?.miniBrowser || { visible: false, x: null, y: null, floating: true };

  const activeTab = useMemo(() => tabs.find((tab) => tab.id === activeTabId) || tabs[0], [tabs, activeTabId]);

  useEffect(() => {
    const savedBookmarks = JSON.parse(localStorage.getItem(BOOKMARKS_KEY) || '[]');
    const savedHistory = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    const savedTabs = JSON.parse(localStorage.getItem(TABS_KEY) || 'null');
    const savedActiveTab = localStorage.getItem(ACTIVE_TAB_KEY);

    setBookmarks(savedBookmarks);
    setHistoryItems(savedHistory);

    if (savedTabs?.length) {
      setTabs(savedTabs);
      setActiveTabId(savedActiveTab || savedTabs[0].id);
      setActiveUrl(savedTabs.find((tab) => tab.id === (savedActiveTab || savedTabs[0].id))?.url || DEFAULT_HOME);
      setUrl(savedTabs.find((tab) => tab.id === (savedActiveTab || savedTabs[0].id))?.url || DEFAULT_HOME);
    } else {
      setUrl(DEFAULT_HOME);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(TABS_KEY, JSON.stringify(tabs));
  }, [tabs]);

  useEffect(() => {
    localStorage.setItem(ACTIVE_TAB_KEY, activeTabId);
  }, [activeTabId]);

  useEffect(() => {
    if (activeTab?.url) {
      setActiveUrl(activeTab.url);
      setUrl(activeTab.url);
    }
  }, [activeTab]);

  useEffect(() => {
    const handleToggle = () => updateWidget('miniBrowser', { visible: !miniBrowserPrefs.visible });
    window.addEventListener('toggle-mini-browser', handleToggle);
    return () => window.removeEventListener('toggle-mini-browser', handleToggle);
  }, [miniBrowserPrefs.visible, updateWidget]);

  useEffect(() => {
    const syncFullscreen = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', syncFullscreen);
    return () => document.removeEventListener('fullscreenchange', syncFullscreen);
  }, []);

  const persistBookmarks = (next) => {
    setBookmarks(next);
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(next));
  };

  const persistHistory = (next) => {
    setHistoryItems(next);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  };

  const updateActiveTab = (target) => {
    setTabs((prev) => prev.map((tab) => tab.id === activeTabId ? { ...tab, url: target, title: getHostLabel(target) } : tab));
  };

  const load = (u) => {
    const target = normalizeUrl(u || url);
    if (!target) return;
    setYoutubeFallback(false);
    setActiveUrl(target);
    setUrl(target);
    updateActiveTab(target);
    const nextHistory = [target, ...historyItems.filter((item) => item !== target)].slice(0, 8);
    persistHistory(nextHistory);
  };

  const clear = () => {
    setActiveUrl(null);
    setUrl('');
    updateActiveTab('');
  };

  const addBookmark = () => {
    const target = normalizeUrl(activeUrl || url);
    if (!target || bookmarks.includes(target)) return;
    persistBookmarks([target, ...bookmarks].slice(0, 8));
  };

  const removeBookmark = (target) => {
    persistBookmarks(bookmarks.filter((item) => item !== target));
  };

  const openNewTab = () => {
    const id = `tab-${Date.now()}`;
    const newTab = { id, url: DEFAULT_HOME, title: 'New Tab' };
    setTabs((prev) => [...prev, newTab].slice(-5));
    setActiveTabId(id);
    setActiveUrl(DEFAULT_HOME);
    setUrl(DEFAULT_HOME);
  };

  const closeTab = (id) => {
    if (tabs.length === 1) {
      clear();
      return;
    }
    const nextTabs = tabs.filter((tab) => tab.id !== id);
    setTabs(nextTabs);
    if (id === activeTabId) {
      setActiveTabId(nextTabs[nextTabs.length - 1].id);
    }
  };

  const refresh = () => setReloadKey((prev) => prev + 1);

  const handleMouseDown = (e) => {
    if (!miniBrowserPrefs.floating) return;
    setDragging(true);
    const rect = e.currentTarget.getBoundingClientRect();
    setOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleMouseMove = (e) => {
    if (!dragging || !miniBrowserPrefs.floating) return;
    const width = miniBrowserPrefs.visible ? 420 : 220;
    const newX = Math.max(0, Math.min(e.clientX - offset.x, window.innerWidth - width));
    const newY = Math.max(0, Math.min(e.clientY - offset.y, window.innerHeight - 72));
    updateWidget('miniBrowser', { x: newX, y: newY });
  };

  const handleMouseUp = () => setDragging(false);

  const toggleFloating = () => updateWidget('miniBrowser', { floating: !miniBrowserPrefs.floating, x: null, y: null });

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await containerRef.current.requestFullscreen();
    }
  };

  const captureScreenshot = async () => {
    if (!containerRef.current) return;
    const canvas = await html2canvas(containerRef.current, { backgroundColor: null, useCORS: true });
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `mini-browser-${Date.now()}.png`;
    link.click();
  };

  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
    const recorder = new MediaRecorder(stream);
    chunksRef.current = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const nextUrl = URL.createObjectURL(blob);
      setRecordedUrl(nextUrl);
      stream.getTracks().forEach((track) => track.stop());
    };
    recorder.start();
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
  };

  if (!miniBrowserPrefs.visible) {
    return (
      <button
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={() => !dragging && updateWidget('miniBrowser', { visible: true })}
        style={miniBrowserPrefs.floating && miniBrowserPrefs.x !== null && miniBrowserPrefs.y !== null ? { left: `${miniBrowserPrefs.x}px`, top: `${miniBrowserPrefs.y}px`, right: 'auto', bottom: 'auto' } : undefined}
        className="fixed bottom-36 right-4 z-40 flex items-center gap-2 rounded-2xl border border-primary/30 bg-card px-3 py-2.5 text-sm font-medium shadow-lg hover:border-primary transition-all cursor-move"
      >
        <Tv2 className="w-4 h-4 text-primary" />
        <span className="text-xs text-foreground">Mini Browser</span>
        <GripVertical className="w-3 h-3 text-muted-foreground" />
      </button>
    );
  }

  return (
    <div
      ref={containerRef}
      className={miniBrowserPrefs.floating ? "fixed z-50 w-[min(92vw,420px)]" : "w-full"}
      style={miniBrowserPrefs.floating ? { right: miniBrowserPrefs.x === null ? '1rem' : 'auto', bottom: miniBrowserPrefs.y === null ? '6rem' : 'auto', left: miniBrowserPrefs.x !== null ? `${miniBrowserPrefs.x}px` : 'auto', top: miniBrowserPrefs.y !== null ? `${miniBrowserPrefs.y}px` : 'auto' } : undefined}
    >
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-2xl">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-secondary/60 cursor-move" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
          <Tv2 className="w-3.5 h-3.5 text-primary flex-shrink-0" />
          <p className="text-xs font-semibold text-primary flex-1">Browser</p>
          <button onClick={openNewTab} className="rounded-md border border-border bg-background px-2 py-1 text-[10px] text-foreground">
            + Tab
          </button>
          <button onClick={toggleFloating} className="p-1.5 rounded hover:bg-border transition-colors" title={miniBrowserPrefs.floating ? 'Dock browser' : 'Float browser'}>
            <PictureInPicture2 className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          <button onClick={() => updateWidget('miniBrowser', { visible: false })} className="p-1.5 rounded hover:bg-border transition-colors" title="Hide browser">
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          <button onClick={captureScreenshot} className="p-1.5 rounded hover:bg-border transition-colors" title="Take screenshot">
            <Camera className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          <button onClick={toggleRecording} className="p-1.5 rounded hover:bg-border transition-colors" title={isRecording ? 'Stop recording' : 'Start recording'}>
            {isRecording ? <Square className="w-3.5 h-3.5 text-red-400" /> : <Circle className="w-3.5 h-3.5 text-muted-foreground" />}
          </button>
          <button onClick={toggleFullscreen} className="p-1.5 rounded hover:bg-border transition-colors" title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}>
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5 text-muted-foreground" /> : <Maximize2 className="w-3.5 h-3.5 text-muted-foreground" />}
          </button>
          {activeUrl && (
            <button onClick={clear} className="p-1 rounded hover:bg-border transition-colors">
              <X className="w-3 h-3 text-muted-foreground" />
            </button>
          )}
        </div>

        <div className="flex gap-2 overflow-x-auto px-3 py-2 border-b border-border bg-background/70">
          {tabs.map((tab) => (
            <div key={tab.id} className={`flex min-w-[130px] items-center gap-2 rounded-lg border px-2 py-1.5 ${tab.id === activeTabId ? 'border-primary bg-primary/10' : 'border-border bg-secondary/50'}`}>
              <button onClick={() => setActiveTabId(tab.id)} className="flex flex-1 items-center gap-2 truncate text-left">
                <Monitor className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                <span className="truncate text-[10px] text-foreground">{tab.title}</span>
              </button>
              <button onClick={() => closeTab(tab.id)} className="p-0.5 rounded hover:bg-background">
                <X className="w-3 h-3 text-muted-foreground" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 px-3 py-3 border-b border-border">
          <button onClick={refresh} className="rounded-lg border border-border bg-secondary p-2 text-muted-foreground">
            <RotateCw className="w-3.5 h-3.5" />
          </button>
          <div className="flex flex-1 items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2">
            <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <input
              ref={inputRef}
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && load()}
              placeholder="Search or enter website URL..."
              className="flex-1 bg-transparent text-xs outline-none text-foreground placeholder:text-muted-foreground font-mono"
            />
          </div>
          <button onClick={addBookmark}
            className="bg-secondary border border-border text-muted-foreground rounded-lg px-2.5 py-2 flex-shrink-0 text-xs font-semibold">
            <Star className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => window.open(activeUrl || normalizeUrl(url), '_blank', 'noopener,noreferrer')}
            className="bg-secondary border border-border text-muted-foreground rounded-lg px-2.5 py-2 flex-shrink-0 text-xs font-semibold">
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => load()}
            className="bg-primary text-primary-foreground rounded-lg px-3 py-2 flex-shrink-0 text-xs font-semibold">
            Go
          </button>
        </div>

        <div className="px-3 py-3 border-b border-border">
          <div className="flex justify-center gap-2 flex-wrap">
            {QUICK_LINKS.map(q => (
              <button key={q.label} onClick={() => load(q.url)}
                className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl bg-secondary hover:bg-border border border-transparent hover:border-primary/40 transition-all">
                <span className="text-lg leading-none">{q.icon}</span>
                <span className="text-[9px] text-muted-foreground whitespace-nowrap">{q.label}</span>
              </button>
            ))}
          </div>
        </div>

        {!miniBrowserPrefs.floating && <div className="grid gap-3 px-3 py-3 border-b border-border md:grid-cols-2">
          <div className="rounded-xl bg-secondary/50 border border-border p-3">
            <button onClick={() => setBookmarksCollapsed(!bookmarksCollapsed)} className="flex w-full items-center gap-2 mb-2 text-left">
              <Star className="w-3.5 h-3.5 text-primary" />
              <p className="text-[11px] font-semibold text-foreground flex-1">Bookmarks</p>
              {bookmarksCollapsed ? <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
            </button>
            {!bookmarksCollapsed && (
              <div className="space-y-2">
                {bookmarks.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground">No bookmarks yet.</p>
                ) : bookmarks.map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <button onClick={() => load(item)} className="flex-1 truncate rounded-lg bg-background px-2 py-1.5 text-left text-[10px] text-foreground border border-border">
                      {item}
                    </button>
                    <button onClick={() => removeBookmark(item)} className="p-1 rounded hover:bg-background">
                      <X className="w-3 h-3 text-muted-foreground" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl bg-secondary/50 border border-border p-3">
            <button onClick={() => setHistoryCollapsed(!historyCollapsed)} className="flex w-full items-center gap-2 mb-2 text-left">
              <History className="w-3.5 h-3.5 text-primary" />
              <p className="text-[11px] font-semibold text-foreground flex-1">History</p>
              {historyCollapsed ? <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
            </button>
            {!historyCollapsed && (
              <div className="space-y-2">
                {historyItems.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground">No history yet.</p>
                ) : historyItems.map((item) => (
                  <button key={item} onClick={() => load(item)} className="w-full truncate rounded-lg bg-background px-2 py-1.5 text-left text-[10px] text-foreground border border-border">
                    {item}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>}

        <div className={`relative bg-black ${miniBrowserPrefs.floating ? 'h-[18rem] sm:h-[22rem]' : 'h-[22rem] sm:h-[28rem]'}`}>
          {activeUrl ? (
            <>
              <iframe
                key={`${activeUrl}-${reloadKey}`}
                src={activeUrl}
                className="w-full h-full border-0 bg-white"
                allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                allowFullScreen
                title="Screen Visualizer"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-presentation allow-downloads"
                onError={() => setYoutubeFallback(true)}
              />
              {activeUrl.includes('youtube.com/embed/') && (
                <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-end p-2">
                  <div className="pointer-events-auto flex gap-2">
                    <button
                      onClick={() => window.open(activeUrl.replace('/embed/', '/watch?v='), '_blank', 'noopener,noreferrer')}
                      className="rounded-lg border border-white/10 bg-black/70 px-2.5 py-1.5 text-[10px] font-semibold text-white backdrop-blur"
                    >
                      Open YouTube
                    </button>
                  </div>
                </div>
              )}
              {youtubeFallback && activeUrl.includes('youtube.com/embed/') && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 px-4 text-center">
                  <div className="max-w-xs space-y-3 rounded-2xl border border-white/10 bg-black/70 p-4 backdrop-blur">
                    <p className="text-sm font-semibold text-white">This YouTube video can’t play inside the mini browser</p>
                    <p className="text-xs text-white/70">Some videos restrict embedded playback. Open it directly in YouTube to watch and interact with it.</p>
                    <button
                      onClick={() => window.open(activeUrl.replace('/embed/', '/watch?v='), '_blank', 'noopener,noreferrer')}
                      className="inline-flex rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
                    >
                      Open in YouTube
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground px-4 text-center">
              <div className="flex gap-4 mb-1">
                <Film className="w-5 h-5 opacity-40" />
                <Tv2 className="w-5 h-5 opacity-40" />
                <Music className="w-5 h-5 opacity-40" />
              </div>
              <p className="text-xs opacity-70">Use it like a mini browser: search, open tabs, save bookmarks, or launch a quick site.</p>
            </div>
          )}
        </div>
        {recordedUrl && (
          <div className="border-t border-border bg-background/80 px-3 py-2">
            <a href={recordedUrl} download={`mini-browser-${Date.now()}.webm`} className="text-[11px] text-primary underline underline-offset-2">
              Download latest recording
            </a>
          </div>
        )}
      </div>
    </div>
  );
}