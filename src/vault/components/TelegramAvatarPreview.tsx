import { useState, useRef, useCallback, useEffect } from 'react';
import { ZoomIn, ZoomOut, Move, Circle, Square } from 'lucide-react';

interface TelegramAvatarPreviewProps {
  previewShape: 'square' | 'circle';
  onShapeChange: (shape: 'square' | 'circle') => void;
  outputResolution?: string;
  estimatedSize?: string;
  outputFormat?: string;
}

export function TelegramAvatarPreview({
  previewShape,
  onShapeChange,
  outputResolution = '800×800',
  estimatedSize = '~80 KB',
  outputFormat = 'image/jpeg',
}: TelegramAvatarPreviewProps) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    setDragging(true);
    dragStart.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [offset]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    const maxOffset = 60 * zoom;
    setOffset({
      x: Math.max(-maxOffset, Math.min(maxOffset, e.clientX - dragStart.current.x)),
      y: Math.max(-maxOffset, Math.min(maxOffset, e.clientY - dragStart.current.y)),
    });
  }, [dragging, zoom]);

  const handlePointerUp = useCallback(() => setDragging(false), []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
          Telegram Avatar Preview
        </h3>
        <div className="flex gap-1">
          <button
            onClick={() => onShapeChange('circle')}
            className={`p-1.5 rounded-sm min-h-[44px] min-w-[44px] flex items-center justify-center ${
              previewShape === 'circle' ? 'bg-primary/15 text-primary' : 'text-muted-foreground'
            }`}
          >
            <Circle className="w-4 h-4" />
          </button>
          <button
            onClick={() => onShapeChange('square')}
            className={`p-1.5 rounded-sm min-h-[44px] min-w-[44px] flex items-center justify-center ${
              previewShape === 'square' ? 'bg-primary/15 text-primary' : 'text-muted-foreground'
            }`}
          >
            <Square className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Preview area */}
      <div className="flex justify-center">
        <div
          ref={containerRef}
          className={`relative w-48 h-48 overflow-hidden border-2 border-primary/30 bg-secondary/50 cursor-grab active:cursor-grabbing touch-none select-none ${
            previewShape === 'circle' ? 'rounded-full' : 'rounded-sm'
          }`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {/* Simulated content — gradient placeholder */}
          <div
            className="absolute inset-0 transition-transform duration-75"
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
              background: `
                linear-gradient(135deg, hsl(150 50% 30%) 0%, hsl(200 40% 25%) 50%, hsl(250 30% 20%) 100%)
              `,
            }}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-4xl opacity-40">📷</span>
            </div>
          </div>

          {/* Crosshair */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-px h-6 bg-primary/30" />
          </div>
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="h-px w-6 bg-primary/30" />
          </div>

          {/* Drag hint */}
          {!dragging && zoom === 1 && offset.x === 0 && offset.y === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-background/60 backdrop-blur-sm px-2 py-1 rounded-sm">
                <span className="text-[9px] font-mono text-foreground/60 flex items-center gap-1">
                  <Move className="w-3 h-3" /> Drag to position
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Zoom controls */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}
          className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center border border-border rounded-sm hover:bg-secondary transition-colors"
        >
          <ZoomOut className="w-4 h-4 text-muted-foreground" />
        </button>
        <div className="w-32">
          <input
            type="range"
            min={0.5}
            max={3}
            step={0.1}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full accent-primary"
          />
        </div>
        <button
          onClick={() => setZoom(z => Math.min(3, z + 0.1))}
          className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center border border-border rounded-sm hover:bg-secondary transition-colors"
        >
          <ZoomIn className="w-4 h-4 text-muted-foreground" />
        </button>
        <span className="text-[10px] font-mono text-muted-foreground w-10 text-right">
          {Math.round(zoom * 100)}%
        </span>
      </div>

      {/* Reset */}
      <div className="flex justify-center">
        <button
          onClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }); }}
          className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors min-h-[44px]"
        >
          Reset Position
        </button>
      </div>

      {/* Output info */}
      <div className="grid grid-cols-3 gap-2 p-2 border border-border rounded-sm bg-card">
        <div className="text-center">
          <p className="text-[8px] font-mono uppercase tracking-wider text-muted-foreground">Resolution</p>
          <p className="text-[11px] font-mono text-foreground">{outputResolution}</p>
        </div>
        <div className="text-center">
          <p className="text-[8px] font-mono uppercase tracking-wider text-muted-foreground">Est. Size</p>
          <p className="text-[11px] font-mono text-foreground">{estimatedSize}</p>
        </div>
        <div className="text-center">
          <p className="text-[8px] font-mono uppercase tracking-wider text-muted-foreground">Format</p>
          <p className="text-[11px] font-mono text-foreground">{outputFormat.split('/')[1]?.toUpperCase()}</p>
        </div>
      </div>
    </div>
  );
}
